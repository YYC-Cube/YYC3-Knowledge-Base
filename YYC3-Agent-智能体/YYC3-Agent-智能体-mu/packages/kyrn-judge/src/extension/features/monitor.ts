import { turnDrift } from "../../decisions/turn-drift.ts";
import { failOpen, type KyrnRuntime } from "../runtime.ts";
import { describeCall } from "./admission.ts";

/**
 * B5: a loop is a fact (the same call with the same result, three times), so a
 * rule catches it. Drift is a judgment, asked in the background every few
 * tool rounds. Either one earns the agent a single line, not a lecture.
 */
export function registerMonitor(runtime: KyrnRuntime): void {
	const options = runtime.options("monitor", { enabled: true, every: 6, repeats: 3, window: 8 });
	if (!options.enabled) return;
	const { pi } = runtime;
	let actions: string[] = [];
	let warnedLoops = new Set<string>();
	let sinceCheck = 0;

	const steer = (content: string) => {
		pi.sendMessage({ customType: "kyrn.steer", content, display: true }, { deliverAs: "steer" });
	};

	pi.on(
		"input",
		failOpen((event) => {
			if (event.source !== "extension" && !event.streamingBehavior) {
				actions = [];
				warnedLoops = new Set();
				sinceCheck = 0;
			}
			return undefined;
		}),
	);

	pi.on(
		"tool_result",
		failOpen((event, ctx) => {
			runtime.touch(ctx);
			const toolName = "toolName" in event ? String(event.toolName) : "tool";
			const action = `${describeCall(toolName, event.input)} -> ${event.isError ? "error" : "ok"}`;
			actions.push(action);
			sinceCheck++;

			const tail = actions.slice(-options.repeats);
			const looping = tail.length === options.repeats && tail.every((entry) => entry === action);
			if (looping && !warnedLoops.has(action)) {
				warnedLoops.add(action);
				pi.appendEntry("kyrn.monitor", { kind: "loop", action });
				runtime.trouble("loop", action);
				steer(
					`The same call has now run ${options.repeats} times with the same outcome (${action}). Say what it told you and try a different approach.`,
				);
				return undefined;
			}

			const goal = runtime.taskFrame()?.goal;
			if (sinceCheck < options.every || !goal) return undefined;
			sinceCheck = 0;
			void runtime.engine
				.decide(turnDrift, { goal, recentActions: actions.slice(-options.window) }, { signal: ctx.signal })
				.then((decision) => {
					if (decision.source !== "judge") return;
					if (decision.outcome === "drift") {
						runtime.trouble("drift", "the recent steps look unrelated to the goal");
						steer(
							`Check your course: the recent steps look unrelated to the goal ("${goal}"). Return to it or say why the detour is needed.`,
						);
					}
				})
				.catch(() => {});
			return undefined;
		}),
	);
}
