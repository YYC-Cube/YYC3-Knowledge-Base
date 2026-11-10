import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseConfig } from "../src/config.ts";
import { registerWarmup } from "../src/extension/features/warmup.ts";
import { KyrnRuntime } from "../src/extension/runtime.ts";
import { Judge } from "../src/judge.ts";
import { MockJudgeProvider } from "../src/providers/mock.ts";

type Handler = (event: unknown, ctx: ExtensionContext) => unknown;

/** Just enough of pi to register handlers and fire events. */
function fakePi() {
	const handlers = new Map<string, Handler[]>();
	const pi = {
		on: (event: string, handler: Handler) => {
			handlers.set(event, [...(handlers.get(event) ?? []), handler]);
		},
		appendEntry: () => {},
		getCommands: () => [],
	} as unknown as ExtensionAPI;
	const emit = async (event: string) => {
		for (const handler of handlers.get(event) ?? []) await handler({ type: event }, {} as ExtensionContext);
	};
	return { pi, emit };
}

describe("judge warm-up", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("asks one trivial question every interval while the session is in use, and stops when it goes quiet or ends", async () => {
		vi.useFakeTimers();
		const { pi, emit } = fakePi();
		const provider = new MockJudgeProvider();
		const runtime = new KyrnRuntime(pi, parseConfig({}), new Judge({ provider }));
		registerWarmup(runtime);
		await emit("session_start");

		await vi.advanceTimersByTimeAsync(50_000);
		expect(provider.calls).toHaveLength(1);
		// A ping, not a decision: nothing counted, nothing recorded.
		expect(Object.keys(provider.calls[0].questions)).toEqual(["ready"]);
		expect(runtime.engine.stats.calls).toBe(0);
		expect(runtime.memory.records).toHaveLength(0);

		await vi.advanceTimersByTimeAsync(50_000);
		expect(provider.calls).toHaveLength(2);

		// Quiet for longer than the idle limit: the connection is left to go cold.
		runtime.lastActivityAt = Date.now() - 900_001;
		await vi.advanceTimersByTimeAsync(100_000);
		expect(provider.calls).toHaveLength(2);

		// Any event reaching a feature is activity.
		runtime.touch({} as ExtensionContext);
		await vi.advanceTimersByTimeAsync(50_000);
		expect(provider.calls).toHaveLength(3);

		await emit("session_shutdown");
		await vi.advanceTimersByTimeAsync(200_000);
		expect(provider.calls).toHaveLength(3);
	});

	it("does nothing for a local judge: there is no connection worth keeping warm", async () => {
		vi.useFakeTimers();
		const { pi, emit } = fakePi();
		const provider = new MockJudgeProvider();
		const runtime = new KyrnRuntime(pi, parseConfig({ tiers: ["laya"] }), new Judge({ provider }));
		registerWarmup(runtime);
		await emit("session_start");
		await vi.advanceTimersByTimeAsync(200_000);
		expect(provider.calls).toHaveLength(0);
	});
});
