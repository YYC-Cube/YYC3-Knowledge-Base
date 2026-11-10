import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { DecisionEngine } from "../src/decision.ts";
import { type DiagnosticsDeliveryInput, diagnosticsDelivery } from "../src/decisions/diagnostics-delivery.ts";
import { Judge } from "../src/judge.ts";
import { isExecutableFile, LspManager } from "../src/lsp/manager.ts";
import { mergeServers } from "../src/lsp/servers.ts";
import { MockJudgeProvider } from "../src/providers/mock.ts";
import type { Answer } from "../src/types.ts";

const FAKE_SERVER = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "fake-lsp-server.mjs");

describe("lsp manager", () => {
	const managers: LspManager[] = [];
	const dirs: string[] = [];
	afterEach(async () => {
		await Promise.all(managers.splice(0).map((manager) => manager.stopAll()));
		for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
	});

	function setup(maxServers = 4) {
		const cwd = mkdtempSync(join(tmpdir(), "mu-lsp-manager-"));
		dirs.push(cwd);
		const manager = new LspManager({ quietMs: 40, baselineMs: 2000, maxServers, onTextChange: () => {} });
		managers.push(manager);
		const { servers } = mergeServers(
			[
				{
					origin: "user",
					servers: {
						fake: {
							command: process.execPath,
							args: [FAKE_SERVER, "{}"],
							extensions: [".fake"],
							rootMarkers: ["root.marker"],
						},
						absent: { command: join(cwd, "not-installed"), extensions: [".absent"] },
					},
				},
				{
					origin: "project",
					servers: { theirs: { command: process.execPath, args: [FAKE_SERVER, "{}"], extensions: [".proj"] } },
				},
			],
			[],
		);
		return { cwd, manager, servers };
	}

	it("says per server whether it is used, missing or waiting for trust, and what runs where", async () => {
		const { cwd, manager, servers } = setup();
		expect(manager.status(servers, false).map((server) => [server.id, server.use])).toEqual([
			["fake", "used"],
			["absent", "missing"],
			["theirs", "untrusted"],
		]);
		expect(manager.serving(join(cwd, "x.proj"), servers, false)).toEqual([]);
		expect(manager.serving(join(cwd, "x.proj"), servers, true)).toHaveLength(1);
		expect(manager.serving(join(cwd, "x.absent"), servers, true)).toEqual([]);

		const file = join(cwd, "a.fake");
		manager.beforeEdit(file, "fine", manager.serving(file, servers, false), cwd);
		await manager.waitSettled(3000);
		expect(manager.status(servers, false)[0].running).toMatchObject([
			{ root: cwd, state: "running", documents: 1, starts: 1, lastError: undefined },
		]);

		manager.beforeEdit(file, "fine", manager.serving(file, servers, false), cwd);
		manager.afterEdit(file, "boom !crash");
		await expect.poll(() => manager.status(servers, false)[0].running[0].state).toBe("failed");
		expect(manager.status(servers, false)[0].running[0].lastError).toContain("code 7");
	});

	it("runs one server per workspace root and stops the least recently used one beyond the limit", async () => {
		const { cwd, manager, servers } = setup(1);
		for (const name of ["one", "two"]) {
			mkdirSync(join(cwd, name));
			writeFileSync(join(cwd, name, "root.marker"), "");
		}
		const first = join(cwd, "one", "a.fake");
		const second = join(cwd, "two", "b.fake");
		manager.beforeEdit(first, "x", manager.serving(first, servers, false), cwd);
		await manager.waitSettled(3000);
		manager.beforeEdit(second, "y", manager.serving(second, servers, false), cwd);
		await manager.waitSettled(3000);
		await expect
			.poll(() => manager.status(servers, false)[0].running.map((run) => [run.root, run.state]))
			.toEqual([[join(cwd, "two"), "running"]]);
	});

	it("only calls a file a server when it may be executed", () => {
		if (process.platform === "win32") return;
		const dir = mkdtempSync(join(tmpdir(), "mu-lsp-bin-"));
		dirs.push(dir);
		writeFileSync(join(dir, "plain"), "");
		writeFileSync(join(dir, "tool"), "#!/bin/sh\n");
		chmodSync(join(dir, "tool"), 0o755);
		expect(isExecutableFile(join(dir, "tool"))).toBe(true);
		expect(isExecutableFile(join(dir, "plain"))).toBe(false);
		expect(isExecutableFile(dir)).toBe(false);
		expect(isExecutableFile(join(dir, "missing"))).toBe(false);
		// Windows has no execute bit: the file name's ending is what PATHEXT already checked.
		expect(isExecutableFile(join(dir, "plain"), "win32")).toBe(true);
	});
});

describe("diagnostics.delivery", () => {
	const yes: Answer = { type: "boolean", probability: 0.92 };
	const no: Answer = { type: "boolean", probability: 0.05 };
	const unsure: Answer = { type: "boolean", probability: 0.5 };
	const input: DiagnosticsDeliveryInput = {
		newErrors: ["src/a.ts:3 TS2304 Cannot find name 'x'."],
		newWarnings: ["src/a.ts:9 6133 'y' is declared but never used."],
		errorCount: 1,
		warningCount: 1,
		elsewhereCount: 0,
		inEditedFileCount: 2,
		statedIntent: "Now I will update the callers.",
		editedFile: "src/a.ts",
		filesEditedThisTurn: 2,
		sameFileEditedRepeatedly: false,
	};
	const decide = async (answers: Record<string, Answer>, change: Partial<DiagnosticsDeliveryInput> = {}) => {
		const provider = new MockJudgeProvider(() => answers);
		const engine = new DecisionEngine({ judge: new Judge({ provider }), defaultMode: "active" });
		const decision = await engine.decide(diagnosticsDelivery, { ...input, ...change });
		return { decision, asked: Object.keys(provider.calls[0].questions), state: provider.calls[0].state };
	};

	it("tells now when no more edits are coming, holds when they are, and drops style warnings either way", async () => {
		expect((await decide({ more_edits_coming: no, warnings_are_style: no })).decision.outcome).toEqual({
			errors: "now",
			warnings: "now",
		});
		expect((await decide({ more_edits_coming: yes, warnings_are_style: no })).decision.outcome).toEqual({
			errors: "hold",
			warnings: "hold",
		});
		expect((await decide({ more_edits_coming: yes, warnings_are_style: yes })).decision.outcome).toEqual({
			errors: "hold",
			warnings: "drop",
		});
		// Warnings the judge cannot place wait for the pause instead of riding along.
		expect((await decide({ more_edits_coming: no, warnings_are_style: unsure })).decision.outcome).toEqual({
			errors: "now",
			warnings: "hold",
		});
	});

	it("tells a model that keeps breaking the file it keeps editing, whatever it says comes next", async () => {
		const { decision } = await decide(
			{ more_edits_coming: yes, warnings_are_style: no },
			{ sameFileEditedRepeatedly: true },
		);
		expect(decision.outcome).toEqual({ errors: "now", warnings: "now" });
		const elsewhere = await decide(
			{ more_edits_coming: yes, warnings_are_style: no },
			{ sameFileEditedRepeatedly: true, inEditedFileCount: 0 },
		);
		expect(elsewhere.decision.outcome.errors).toBe("hold");
	});

	it("falls back to holding errors and not telling warnings when the judge is unsure", async () => {
		const { decision } = await decide({ more_edits_coming: unsure, warnings_are_style: no });
		expect(decision).toMatchObject({
			source: "fallback",
			reason: "abstain",
			outcome: { errors: "hold", warnings: "drop" },
		});
	});

	it("asks about warnings only when there are some, and sends summaries, not files", async () => {
		const { asked, state } = await decide({ more_edits_coming: no }, { warningCount: 0, newWarnings: [] });
		expect(asked).toEqual(["more_edits_coming"]);
		expect(state).toMatchObject({ stated_intent: input.statedIntent, error_count: 1, new_errors: input.newErrors });
	});
});
