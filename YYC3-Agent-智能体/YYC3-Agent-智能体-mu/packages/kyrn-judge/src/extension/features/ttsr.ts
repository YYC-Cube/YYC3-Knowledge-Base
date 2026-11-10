import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { outputDrift } from "../../decisions/output-drift.ts";
import { clip, failOpen, type KyrnRuntime } from "../runtime.ts";

export const TTSR_MESSAGE = "kyrn.ttsr";

/** How much of the output's end the judge reads. Enough for a sentence or two of context, small enough to be quick. */
const TAIL_CHARS = 900;
const RULE_LENGTH = 300;

/**
 * The experiment described in `output-drift.ts`: watch the model's output while
 * it streams, and when the judge is sure it goes against one of the user's
 * instructions, cut it, say which instruction, and let the model carry on from
 * where it stopped.
 *
 * The stream is never held: a judgment runs beside it, one at a time, and a
 * verdict that arrives after the message has ended is dropped (what the
 * message then does is the constraint gate's and the completion check's
 * business). At most `maxInterrupts` cuts between two messages of the user, so
 * a rule the model cannot satisfy does not become a loop.
 */
export function registerTtsr(runtime: KyrnRuntime): void {
	const options = runtime.options("ttsr", {
		enabled: false,
		segmentChars: 600,
		maxRules: 4,
		maxInterrupts: 2,
		rules: [] as string[],
	});
	if (!options.enabled) return;
	const { pi } = runtime;

	let written = "";
	let judgedUpTo = 0;
	/** Counts assistant messages, so a verdict knows whether the message it read is still the one being written. */
	let message = 0;
	let streaming = false;
	let judging = false;
	let interrupts = 0;
	let cutFor: string | undefined;

	const rules = (): string[] => {
		const said = (runtime.frame?.constraints ?? []).map((constraint) => constraint.text);
		const configured = Array.isArray(options.rules)
			? options.rules.filter((rule): rule is string => typeof rule === "string")
			: [];
		const all = [...new Set([...configured, ...said].map((rule) => rule.trim()).filter(Boolean))];
		// When there are too many, what the user said last stays: it is the most likely to be forgotten.
		return all.slice(-Math.max(1, options.maxRules));
	};

	const judge = async (ctx: ExtensionContext, tail: string, list: readonly string[], about: number) => {
		const decision = await runtime.engine.decide(outputDrift, { recentOutput: tail, rules: list });
		if (decision.mode !== "active" || decision.source !== "judge") return;
		const broken = decision.outcome.broken[0];
		if (broken === undefined) return;
		// Too late to stop what has already been said.
		if (!streaming || message !== about || cutFor !== undefined) return;
		cutFor = list[broken];
		interrupts++;
		runtime.harnessAbort = true;
		runtime.present("ttsr.interrupted", { rule: clip(cutFor, RULE_LENGTH), written: written.length });
		ctx.abort();
	};

	pi.on(
		"input",
		failOpen((event) => {
			if (event.source !== "extension" && event.text.trim() && !event.streamingBehavior) interrupts = 0;
			return undefined;
		}),
	);
	pi.on(
		"agent_start",
		failOpen(() => {
			runtime.harnessAbort = false;
			return undefined;
		}),
	);
	pi.on(
		"message_start",
		failOpen((event) => {
			if (event.message.role !== "assistant") return undefined;
			message++;
			streaming = true;
			written = "";
			judgedUpTo = 0;
			return undefined;
		}),
	);
	pi.on(
		"message_end",
		failOpen((event) => {
			if (event.message.role === "assistant") streaming = false;
			return undefined;
		}),
	);
	pi.on(
		"message_update",
		failOpen((event, ctx) => {
			const update = event.assistantMessageEvent;
			// Thinking is not output: nobody is told anything by it, and it may well weigh what the user ruled out.
			if (update.type !== "text_delta" && update.type !== "toolcall_delta") return undefined;
			written += update.delta;
			if (judging || cutFor !== undefined || interrupts >= options.maxInterrupts) return undefined;
			if (written.length - judgedUpTo < options.segmentChars) return undefined;
			const list = rules();
			if (list.length === 0) return undefined;
			runtime.touch(ctx);
			judgedUpTo = written.length;
			judging = true;
			// Beside the stream, never in its way.
			void judge(ctx, written.slice(-TAIL_CHARS), list, message)
				.catch(() => undefined)
				.finally(() => {
					judging = false;
				});
			return undefined;
		}),
	);
	// Not at `agent_end`: the run is still winding down there, a message sent then is queued as a steer, and an
	// aborted run drops its queue. Once it has settled, the message starts the next run by itself.
	pi.on(
		"agent_settled",
		failOpen(() => {
			const rule = cutFor;
			cutFor = undefined;
			streaming = false;
			if (rule === undefined) return undefined;
			pi.sendMessage(
				{
					customType: TTSR_MESSAGE,
					content: [
						`Your output was cut because it goes against an instruction from the user: "${clip(rule, RULE_LENGTH)}"`,
						"Carry on from where you stopped, keeping to that instruction. Do not repeat what you already wrote; if the part already written breaks the instruction, say so in one line and redo it.",
					].join("\n"),
					display: true,
					details: { rule: clip(rule, RULE_LENGTH) },
				},
				{ triggerTurn: true },
			);
			return undefined;
		}),
	);
}
