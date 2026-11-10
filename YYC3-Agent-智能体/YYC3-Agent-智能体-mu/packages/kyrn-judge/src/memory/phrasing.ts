import type { LessonText } from "../decisions/memory.ts";
import { flat } from "../frame/frame.ts";

export const TRIGGER_CHARS = 200;
export const LESSON_CHARS = 300;

/** A lesson as it is kept: one line each, cut to length. */
export function lessonText(trigger: string, lesson: string): LessonText {
	return { trigger: flat(trigger, TRIGGER_CHARS), lesson: flat(lesson, LESSON_CHARS) };
}

/** `Lesson:`, also as a list item or in bold, as models like to write it. */
const LESSON_LINE = /^\s*(?:[-*]\s+)?(?:\*\*|__)?lesson(?:\*\*|__)?\s*[:：]\s*(?:\*\*|__)?\s*(.+?)\s*$/i;
const ARROW = /\s+(?:->|→|=>)\s+/;

/**
 * The `Lesson:` lines of a sub-agent's report. `Lesson: <when this comes up> -> <what to do>` gives
 * both halves; a line without the arrow is kept whole, as the situation and as what to do.
 */
export function lessonLinesOf(report: string, limit = 8): LessonText[] {
	const found: LessonText[] = [];
	for (const line of report.split("\n")) {
		if (found.length >= limit) break;
		const said = LESSON_LINE.exec(line)?.[1]
			?.replace(/(?:\*\*|__)$/, "")
			.trim();
		if (!said) continue;
		const arrow = ARROW.exec(said);
		const trigger = arrow ? said.slice(0, arrow.index) : said;
		const lesson = arrow ? said.slice(arrow.index + arrow[0].length) : said;
		if (trigger.trim() && lesson.trim()) found.push(lessonText(trigger, lesson));
	}
	return found;
}

/** `{"trigger": …, "lesson": …}` out of a writer model's reply, or undefined when it did not answer as asked. */
export function parsePhrase(reply: string): LessonText | undefined {
	const start = reply.indexOf("{");
	const end = reply.lastIndexOf("}");
	if (start < 0 || end <= start) return undefined;
	try {
		const parsed = JSON.parse(reply.slice(start, end + 1)) as { trigger?: unknown; lesson?: unknown };
		if (typeof parsed.trigger !== "string" || typeof parsed.lesson !== "string") return undefined;
		if (!parsed.trigger.trim() || !parsed.lesson.trim()) return undefined;
		return lessonText(parsed.trigger, parsed.lesson);
	} catch {
		return undefined;
	}
}

/** Steps shown from the start of a turn, and from its end. */
const HEAD_STEPS = 6;
const TAIL_STEPS = 14;

/**
 * One user turn as the judge and the writer read it: the request, the first steps (what the agent
 * started with), the latest ones (what it ended with) and its closing message. Steps read like
 * `bash: npm test -> error`.
 */
export function turnDigest(turn: {
	readonly request: string;
	readonly steps: readonly string[];
	/** Steps that happened but are not in `steps` any more. */
	readonly dropped?: number;
	readonly finalMessage: string;
}): string {
	const head = turn.steps.slice(0, HEAD_STEPS);
	const tail = turn.steps.slice(HEAD_STEPS).slice(-TAIL_STEPS);
	const skipped = turn.steps.length - head.length - tail.length + (turn.dropped ?? 0);
	return [
		`user: ${flat(turn.request, 400)}`,
		...head.map((step) => `step: ${flat(step, 200)}`),
		...(skipped > 0 ? [`(${skipped} more steps)`] : []),
		...tail.map((step) => `step: ${flat(step, 200)}`),
		`assistant: ${flat(turn.finalMessage, 800) || "(nothing)"}`,
	].join("\n");
}
