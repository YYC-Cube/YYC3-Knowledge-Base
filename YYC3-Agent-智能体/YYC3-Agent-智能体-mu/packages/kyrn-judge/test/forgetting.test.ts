import { fauxAssistantMessage, type Message } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHarness, type Harness } from "../../coding-agent/test/suite/harness.ts";
import { createTestExtensionsResult, createTestResourceLoader } from "../../coding-agent/test/utilities.ts";
import { parseConfig } from "../src/config.ts";
import { registerForgetting } from "../src/extension/features/forgetting.ts";
import { KyrnRuntime } from "../src/extension/runtime.ts";
import { Judge } from "../src/judge.ts";
import { MockJudgeProvider, type MockResponder } from "../src/providers/mock.ts";

const bulky = `start\n${"old listing line\n".repeat(500)}end`;

function history(count = 4): Message[] {
	return [
		{ role: "user", content: "List the files.", timestamp: 1 },
		...Array.from({ length: count }, (_, index): Message[] => [
			fauxAssistantMessage(
				[{ type: "toolCall", id: `call-${index}`, name: "list", arguments: { path: `dir-${index}` } }],
				{ stopReason: "toolUse" },
			),
			{
				role: "toolResult",
				toolName: "list",
				toolCallId: `call-${index}`,
				content: [{ type: "text", text: bulky }],
				isError: false,
				timestamp: index + 2,
			},
		]).flat(),
		{ role: "user", content: "Now examine something else.", timestamp: 20 },
		{ role: "user", content: "Continue.", timestamp: 21 },
	];
}

describe("forgetting cache boundaries", () => {
	const harnesses: Harness[] = [];
	afterEach(() => {
		while (harnesses.length > 0) harnesses.pop()?.cleanup();
		vi.restoreAllMocks();
	});

	async function start(
		mode: "active" | "shadow" = "active",
		responder: MockResponder = () => ({ still_needed: { type: "boolean", probability: 0.01 } }),
		forgetting: Record<string, unknown> = {},
	) {
		const provider = new MockJudgeProvider(responder);
		const factory = (pi: ConstructorParameters<typeof KyrnRuntime>[0]) => {
			const runtime = new KyrnRuntime(
				pi,
				parseConfig({ modes: { default: mode }, features: { forgetting: { maxPerBatch: 1, ...forgetting } } }),
				new Judge({ provider }),
			);
			registerForgetting(runtime);
		};
		let extensions = await createTestExtensionsResult([factory]);
		const resourceLoader = createTestResourceLoader();
		resourceLoader.getExtensions = () => extensions;
		resourceLoader.reload = async () => {
			extensions = await createTestExtensionsResult([factory]);
		};
		const harness = await createHarness({ resourceLoader, settings: { compaction: { enabled: false } } });
		harnesses.push(harness);
		await harness.session.bindExtensions({
			onError: (error) => {
				throw new Error(error.error);
			},
		});
		let percent = 90;
		vi.spyOn(harness.session, "getContextUsage").mockImplementation(() => ({
			tokens: percent * 100,
			contextWindow: 10000,
			percent,
		}));
		const messages = history();
		for (const message of messages) harness.sessionManager.appendMessage(message);
		const project = () => harness.session.extensionRunner.emitContext(messages);
		return {
			harness,
			provider,
			messages,
			project,
			setPercent: (value: number) => {
				percent = value;
			},
		};
	}

	it("spends every already-crossed threshold in one batch, keeping later requests identical", async () => {
		const { provider, messages, project } = await start();
		const first = await project();
		expect(first).not.toEqual(messages);
		expect(await project()).toEqual(first);
		expect(await project()).toEqual(first);
		expect(provider.calls).toHaveLength(1);
		expect(JSON.stringify(messages)).not.toContain("chars of old output");
	});

	it("does not hold a request for a slow verdict, and applies it to the next one", async () => {
		let release: () => void = () => {};
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		const { provider, messages, project } = await start(
			"active",
			async () => {
				await held;
				return { still_needed: { type: "boolean", probability: 0.01 } };
			},
			{ waitMs: 40 },
		);
		// The request goes out unchanged rather than waiting; the verdict is asked once.
		expect(await project()).toEqual(messages);
		expect(await project()).toEqual(messages);
		expect(provider.calls).toHaveLength(1);
		release();
		await new Promise((resolve) => setTimeout(resolve, 20));
		const shrunk = await project();
		expect(shrunk).not.toEqual(messages);
		expect(await project()).toEqual(shrunk);
		expect(provider.calls).toHaveLength(1);
	});

	it("keeps a higher, not-yet-crossed threshold armed", async () => {
		const { provider, project, setPercent } = await start();
		setPercent(55);
		const first = await project();
		expect(await project()).toEqual(first);
		setPercent(75);
		const second = await project();
		expect(second).not.toEqual(first);
		expect(await project()).toEqual(second);
		expect(provider.calls).toHaveLength(2);
	});

	it("restores the exact outgoing projection after a fresh extension instance is loaded", async () => {
		const { harness, provider, project, setPercent } = await start();
		const before = await project();
		setPercent(10);
		await harness.session.reload();
		expect(await project()).toEqual(before);
		expect(provider.calls).toHaveLength(1);
		const entries = harness.sessionManager.getEntries();
		expect(entries.some((entry) => entry.type === "custom" && entry.customType === "kyrn.forgetting.state")).toBe(
			true,
		);
		// State is metadata; it never becomes a model message, and original results remain intact.
		const stored = harness.sessionManager.buildSessionContext().messages;
		expect(JSON.stringify(stored)).not.toContain("kyrn.forgetting.state");
		for (const message of stored) {
			if (message.role === "toolResult") expect(message.content).toEqual([{ type: "text", text: bulky }]);
		}
	});

	it("restores only the active branch's decisions when navigating the tree", async () => {
		const { harness, messages, project, setPercent } = await start();
		const beforeLeaf = harness.sessionManager.getLeafId();
		const shrunk = await project();
		const afterLeaf = harness.sessionManager.getLeafId();
		setPercent(10);
		harness.sessionManager.branch(beforeLeaf!);
		await harness.session.extensionRunner.emit({ type: "session_tree", oldLeafId: afterLeaf, newLeafId: beforeLeaf });
		expect(await project()).toEqual(messages);
		harness.sessionManager.branch(afterLeaf!);
		await harness.session.extensionRunner.emit({ type: "session_tree", oldLeafId: beforeLeaf, newLeafId: afterLeaf });
		expect(await project()).toEqual(shrunk);
	});

	it("rearms thresholds only after successful compaction, including across reload", async () => {
		const { harness, provider, project } = await start();
		const first = await project();
		await harness.session.extensionRunner.emit({
			type: "session_compact_failed",
			reason: "manual",
			aborted: true,
			willRetry: false,
			fromExtension: false,
		});
		expect(await project()).toEqual(first);
		expect(provider.calls).toHaveLength(1);
		const firstKept = harness.sessionManager.getEntries().find((entry) => entry.type === "message")!;
		const id = harness.sessionManager.appendCompaction("summary", firstKept.id, 9000);
		const entry = harness.sessionManager.getEntry(id);
		if (entry?.type !== "compaction") throw new Error("Missing compaction");
		await harness.session.extensionRunner.emit({
			type: "session_compact",
			compactionEntry: entry,
			fromExtension: true,
			reason: "manual",
			willRetry: false,
		});
		const after = await project();
		expect(provider.calls).toHaveLength(2);
		await harness.session.reload();
		expect(await project()).toEqual(after);
		expect(provider.calls).toHaveLength(2);
	});

	it.each(["reload", "tree", "shutdown"] as const)("discards a verdict that arrives after %s", async (transition) => {
		let finish: (() => void) | undefined;
		const waiting = new Promise<void>((resolve) => {
			finish = resolve;
		});
		const { harness, provider, messages, project } = await start("active", async () => {
			await waiting;
			return { still_needed: { type: "boolean", probability: 0.01 } };
		});
		const pending = project();
		await vi.waitFor(() => expect(provider.calls).toHaveLength(1));
		if (transition === "reload") {
			await harness.session.reload();
		} else if (transition === "tree") {
			await harness.session.extensionRunner.emit({ type: "session_tree", oldLeafId: null, newLeafId: null });
		} else {
			await harness.session.extensionRunner.emit({ type: "session_shutdown", reason: "quit" });
		}
		finish?.();
		expect(await pending).toEqual(messages);
		expect(
			harness.sessionManager
				.getEntries()
				.some((entry) => entry.type === "custom" && entry.customType === "kyrn.forgetting.state"),
		).toBe(false);
	});

	it("does not spend an empty crossing before results become old enough", async () => {
		const { harness, provider, project } = await start();
		const young = history().slice(0, -2);
		expect(await harness.session.extensionRunner.emitContext(young)).toEqual(young);
		expect(provider.calls).toHaveLength(0);
		await project();
		expect(provider.calls).toHaveLength(1);
	});

	it("shadow mode persists decisions without changing outgoing messages", async () => {
		const { harness, provider, messages, project } = await start("shadow");
		expect(await project()).toEqual(messages);
		await harness.session.reload();
		expect(await project()).toEqual(messages);
		expect(provider.calls).toHaveLength(1);
	});
});
