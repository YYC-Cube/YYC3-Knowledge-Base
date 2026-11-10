import { type NotifyFn, notifyRouting } from "../../decisions/notify-routing.ts";
import { clip, failOpen, type KyrnRuntime } from "../runtime.ts";

/**
 * B8: events from outside the conversation go through one router, which
 * decides whether the model hears about them now, at the next turn, or never.
 * The first source is the context budget; file watchers and background tasks
 * plug in through `notify`.
 */
export function registerNotify(runtime: KyrnRuntime): NotifyFn {
	const options = runtime.options("notify", { enabled: true, budgetThresholds: [70, 85] });
	const { pi } = runtime;
	const announced = new Set<number>();

	const notify: NotifyFn = async (event, extra = {}) => {
		if (!options.enabled) return "drop";
		const decision = await runtime.engine.decide(notifyRouting, {
			event,
			goal: runtime.taskFrame()?.goal ?? "",
			currentAction: clip(runtime.lastAssistantText, 300),
		});
		const outcome = decision.source === "judge" ? decision.outcome : (extra.unjudged ?? "drop");
		if (outcome === "drop") return outcome;
		const message = { customType: "kyrn.notice", content: extra.content ?? event, display: true };
		if (outcome === "next_turn") pi.sendMessage(message, { deliverAs: "nextTurn" });
		// Steering an idle agent only appends the message; waking it is for the source to allow.
		else if (extra.wake && (runtime.ctx?.isIdle() ?? false)) pi.sendMessage(message, { triggerTurn: true });
		else pi.sendMessage(message, { deliverAs: "steer" });
		return outcome;
	};
	// Background jobs, file watchers and the like plug in here.
	runtime.notify = notify;

	if (options.enabled) {
		pi.on(
			"turn_end",
			failOpen((_event, ctx) => {
				runtime.touch(ctx);
				const usage = ctx.getContextUsage();
				if (!usage || usage.percent === null || usage.tokens === null) return undefined;
				const crossed = options.budgetThresholds.find(
					(level) => usage.percent !== null && usage.percent >= level && !announced.has(level),
				);
				if (crossed === undefined) return undefined;
				for (const level of options.budgetThresholds) if (level <= crossed) announced.add(level);
				void notify(
					`The context window is ${Math.round(usage.percent)}% full (${usage.tokens} of ${usage.contextWindow} tokens). Prefer targeted reads and short outputs; finish the current subgoal before starting another.`,
				).catch(() => {});
				return undefined;
			}),
		);
	}
	return notify;
}
