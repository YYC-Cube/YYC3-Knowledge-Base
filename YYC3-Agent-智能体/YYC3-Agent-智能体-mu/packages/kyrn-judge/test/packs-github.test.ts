import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it } from "vitest";
import { loadSkillsFromDir } from "../../coding-agent/src/core/skills.ts";
import type { Harness } from "../../coding-agent/test/suite/harness.ts";
import { GITHUB_SKILL_PATH } from "../src/extension/features/packs/github.ts";
import { installHint } from "../src/packs/exec.ts";
import { active, call, disclosing, registered, startPacks, toolResults } from "./packs-helpers.ts";

const temporary: string[] = [];
function tempDir(): string {
	const dir = mkdtempSync(join(tmpdir(), "mu-packs-gh-"));
	temporary.push(dir);
	return dir;
}

/** A `gh` that only knows how to say its version, which is all the pack asks of it. */
function fakeGh(dir: string): string {
	const command = join(dir, "fake-gh");
	writeFileSync(command, '#!/bin/sh\necho "gh version 2.88.1 (2026-03-12)"\n', { mode: 0o755 });
	return command;
}

afterEach(() => {
	while (temporary.length > 0) rmSync(temporary.pop() as string, { recursive: true, force: true });
});

describe("the mu-github skill", () => {
	it("is a valid pi skill that says when it applies, and never teaches token handling", () => {
		const { skills, diagnostics } = loadSkillsFromDir({ dir: dirname(GITHUB_SKILL_PATH), source: "test" });
		expect(diagnostics).toEqual([]);
		expect(skills.map((skill) => skill.name)).toEqual(["mu-github"]);
		expect(skills[0].description).toMatch(/pull request/i);
		const body = readFileSync(GITHUB_SKILL_PATH, "utf8");
		for (const must of [
			"gh auth login",
			"GH_PROMPT_DISABLED",
			"--jq",
			"--log-failed",
			"--body-file",
			"winget",
			"brew install gh",
		]) {
			expect(body).toContain(must);
		}
		// Every mention of a token is a prohibition, never a recipe.
		for (const line of body.split("\n").filter((line) => /token/i.test(line))) {
			expect(line, line).toMatch(/never|not /i);
		}
	});

	it("gives an install hint per platform that ends with logging in", () => {
		expect(installHint("gh", "darwin")).toContain("brew install gh");
		expect(installHint("gh", "win32")).toContain("winget install --id GitHub.cli");
		expect(installHint("gh", "linux")).toContain("install_linux.md");
		expect(installHint("gh", "linux")).toContain("gh auth login");
	});
});

describe.skipIf(process.platform === "win32")("pack:github in the catalog", () => {
	const harnesses: Harness[] = [];
	afterEach(() => {
		while (harnesses.length > 0) harnesses.pop()?.cleanup();
	});

	it("contributes its skill at discovery and is listed, hidden, with no tools", async () => {
		const { harness } = await startPacks(harnesses, { packs: { ghCommand: fakeGh(tempDir()) } });
		const found = await harness.session.extensionRunner.emitResourcesDiscover(harness.tempDir, "startup");
		expect(found.skillPaths.map((entry) => entry.path)).toContain(GITHUB_SKILL_PATH);

		harness.setResponses([call("find_capability", { query: "github" }), fauxAssistantMessage("Listed.")]);
		await harness.session.prompt("What can you do with GitHub?");
		expect(toolResults(harness)[0]).toContain("pack:github");
		expect(active(harness).filter((name) => name.startsWith("gh_"))).toEqual([]);
	});

	it("opens when the judge is sure the task is about GitHub, and tells the model it adds no tools", async () => {
		const { harness } = await startPacks(harnesses, {
			responder: disclosing("GitHub"),
			packs: { ghCommand: fakeGh(tempDir()) },
		});
		harness.setResponses([fauxAssistantMessage("Looking at the PR.")]);
		await harness.session.prompt("Why is the CI check on PR 42 failing?");
		harness.setResponses([call("find_capability", { open: "pack:github" }), fauxAssistantMessage("Already open.")]);
		await harness.session.prompt("And PR 43?");
		// The first turn opened it; the second request finds it open, which find_capability reports as unknown-or-open.
		expect(toolResults(harness)[0]).toMatch(/is open|already open/);
		expect(registered(harness)).not.toContain("gh");
	});

	it("stays closed with the install hint when gh is missing, and can be opened once it is there", async () => {
		const dir = tempDir();
		const missing = join(dir, "absent-gh");
		const { harness } = await startPacks(harnesses, { packs: { ghCommand: missing } });
		harness.setResponses([call("find_capability", { open: "pack:github" }), fauxAssistantMessage("Not installed.")]);
		await harness.session.prompt("Open a PR for this.");
		expect(toolResults(harness)[0]).toContain("gh (the GitHub CLI) is not installed");

		// Installed in the meantime: the next attempt looks again instead of remembering the failure.
		writeFileSync(missing, '#!/bin/sh\necho "gh version 2.88.1"\n', { mode: 0o755 });
		harness.setResponses([call("find_capability", { open: "pack:github" }), fauxAssistantMessage("Now open.")]);
		await harness.session.prompt("Try again.");
		expect(toolResults(harness)[1]).toContain("GitHub through gh is open. It adds no tools");
	});
});
