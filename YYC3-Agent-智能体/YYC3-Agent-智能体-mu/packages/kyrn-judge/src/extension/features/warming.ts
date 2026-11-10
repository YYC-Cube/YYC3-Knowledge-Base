import { cacheWarming } from "../../decisions/cache-warming.ts";
import { clip, failOpen, type KyrnRuntime } from "../runtime.ts";

/** E2: replace pi's fixed continuation probability with a reading of how the last exchange ended. */
export function registerWarming(runtime: KyrnRuntime): void {
	const options = runtime.options("warming", { enabled: true });
	if (!options.enabled) return;

	runtime.pi.on(
		"cache_warming_decision",
		failOpen(async (_event, ctx) => {
			runtime.touch(ctx);
			if (!runtime.turn.userMessage) return undefined;
			const decision = await runtime.engine.decide(cacheWarming, {
				lastUserMessage: clip(runtime.turn.userMessage, 300),
				lastAssistantMessage: clip(runtime.lastAssistantText.slice(-600), 600),
			});
			if (decision.source !== "judge" || decision.outcome === "default") return undefined;
			return { action: decision.outcome };
		}),
	);
}
