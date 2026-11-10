import {
	type AcceptanceItem,
	type Constraint,
	type Frame,
	flat,
	MAX_ACCEPTANCE,
	MAX_OPEN_QUESTIONS,
	type UserText,
	verbatimConstraint,
} from "./frame.ts";

/**
 * The contract with the writer model. A judge cannot write, so a generative
 * model produces the new frame, and this file is what keeps it honest: its
 * reply is parsed strictly, and a hard constraint only gets in when it is the
 * user's own words. A paraphrase is swapped for the sentence it paraphrases.
 */
export const WRITER_SYSTEM = `You maintain the task frame of a coding agent: a short, exact record of what the user wants. You get the current frame and what the user just said. Reply with the new frame as one JSON object and nothing else:
{"goal": string, "constraints": string[], "current_subgoal": string | null, "acceptance": [{"id": string, "text": string}], "open_questions": string[]}

- goal: one or two sentences. Keep the current goal unless the user replaced the task.
- constraints: hard limits the user set, such as "do not touch the database". Copy each one WORD FOR WORD from the user's message, in the user's language. Never translate, shorten or rephrase one. Keep every existing constraint exactly as it is, unless the user withdrew it or it only concerned a task that was replaced.
- current_subgoal: what the user wants done right now, or null.
- acceptance: what must be true for the task to be finished, as the user said or clearly implied. Keep existing items with their "id"; leave "id" out of new ones. At most 8.
- open_questions: what is still undecided. If you cannot tell whether the message replaces the task or adds to it, keep the goal and put that question here.`;

export interface WriterFrame {
	readonly goal: string;
	readonly constraints: readonly string[];
	readonly currentSubgoal?: string;
	readonly acceptance: readonly { readonly id?: string; readonly text: string }[];
	readonly openQuestions: readonly string[];
}

export function writerRequest(frame: Frame, said: readonly UserText[]): { system: string; user: string } {
	const current = {
		goal: frame.goal,
		constraints: frame.constraints.map((constraint) => constraint.text),
		current_subgoal: frame.currentSubgoal ?? null,
		acceptance: frame.acceptance.map((item) => ({ id: item.id, text: item.text, done: item.done })),
		open_questions: frame.openQuestions,
	};
	const messages = said.map(
		(each) => `USER MESSAGE (turn ${each.turn}, read by the judge as: ${each.change ?? "unclear"}):\n${each.text}`,
	);
	return {
		system: WRITER_SYSTEM,
		user: `CURRENT FRAME:\n${JSON.stringify(current, null, 1)}\n\n${messages.join("\n\n")}`,
	};
}

const isText = (value: unknown): value is string => typeof value === "string";

/** Strict: anything that is not exactly the asked-for shape is refused, and the caller keeps the last valid frame. */
export function parseWriterReply(reply: string): { ok: true; value: WriterFrame } | { ok: false; problem: string } {
	const start = reply.indexOf("{");
	const end = reply.lastIndexOf("}");
	if (start === -1 || end <= start) return { ok: false, problem: "no JSON object in the reply" };
	let parsed: unknown;
	try {
		parsed = JSON.parse(reply.slice(start, end + 1));
	} catch {
		return { ok: false, problem: "the reply is not valid JSON" };
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		return { ok: false, problem: "the reply is not an object" };
	}
	const record = parsed as Record<string, unknown>;
	if (!isText(record.goal) || !record.goal.trim()) return { ok: false, problem: "goal is missing" };
	if (!Array.isArray(record.constraints) || !record.constraints.every(isText)) {
		return { ok: false, problem: "constraints is not a list of strings" };
	}
	if (record.current_subgoal !== undefined && record.current_subgoal !== null && !isText(record.current_subgoal)) {
		return { ok: false, problem: "current_subgoal is not a string or null" };
	}
	if (!Array.isArray(record.acceptance)) return { ok: false, problem: "acceptance is not a list" };
	const acceptance: { id?: string; text: string }[] = [];
	for (const item of record.acceptance) {
		// A bare string is an item without an id; anything else must be the asked-for object.
		if (isText(item)) acceptance.push({ text: item });
		else if (typeof item === "object" && item !== null && isText((item as { text?: unknown }).text)) {
			const id = (item as { id?: unknown }).id;
			if (id !== undefined && id !== null && !isText(id))
				return { ok: false, problem: "an acceptance id is not a string" };
			acceptance.push({ id: isText(id) ? id : undefined, text: (item as { text: string }).text });
		} else return { ok: false, problem: "an acceptance item has no text" };
	}
	if (!Array.isArray(record.open_questions) || !record.open_questions.every(isText)) {
		return { ok: false, problem: "open_questions is not a list of strings" };
	}
	return {
		ok: true,
		value: {
			goal: record.goal,
			constraints: record.constraints,
			currentSubgoal: isText(record.current_subgoal) ? record.current_subgoal : undefined,
			acceptance,
			openQuestions: record.open_questions,
		},
	};
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Where `needle` stands in `haystack`, as the haystack spells it. Line breaks,
 * runs of spaces, wrapping quotes and a closing full stop do not count as a
 * difference; any other difference does.
 */
export function findVerbatim(haystack: string, needle: string): string | undefined {
	const core = needle
		.trim()
		.replace(/^["'“”‘’「『]+|["'“”‘’」』]+$/g, "")
		.replace(/[.。!！]+$/, "")
		.trim();
	if (!core) return undefined;
	const words = core.split(/\s+/).map(escapeRegExp);
	return new RegExp(words.join("\\s+")).exec(haystack)?.[0];
}

/** Sentences as the user wrote them. A dot inside a path or a version number does not end one. */
export function sentencesOf(text: string): string[] {
	return text
		.split(/(?<=[。！？；])|(?<=[.!?;])\s+|\n+/)
		.map((sentence) => sentence.trim())
		.filter((sentence) => sentence.length > 1);
}

function bigrams(text: string): Map<string, number> {
	const letters = text.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
	const counts = new Map<string, number>();
	for (let at = 0; at + 1 < letters.length; at++) {
		const pair = letters.slice(at, at + 2);
		counts.set(pair, (counts.get(pair) ?? 0) + 1);
	}
	return counts;
}

/** Dice coefficient over character pairs: works for Chinese and English alike, needs no tokenizer. */
export function similarity(a: string, b: string): number {
	const left = bigrams(a);
	const right = bigrams(b);
	let shared = 0;
	let total = 0;
	for (const [pair, count] of left) {
		shared += Math.min(count, right.get(pair) ?? 0);
		total += count;
	}
	for (const count of right.values()) total += count;
	return total === 0 ? 0 : (2 * shared) / total;
}

/** Below this a sentence is not "the one that was paraphrased", just a sentence. */
const PARAPHRASE_FLOOR = 0.12;

interface Found {
	readonly text: string;
	readonly from: UserText;
}

function closestSentence(said: readonly UserText[], paraphrase: string): Found | undefined {
	let best: (Found & { score: number }) | undefined;
	for (const from of said) {
		for (const text of sentencesOf(from.text)) {
			const score = similarity(text, paraphrase);
			if (score >= PARAPHRASE_FLOOR && (!best || score > best.score)) best = { text, from, score };
		}
	}
	return best;
}

const sameWords = (a: string, b: string) => a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();

/**
 * The writer's reply merged over the last valid frame.
 *
 * What the code guarantees, whatever the model wrote:
 * - every constraint is an existing one, or a piece of what the user just said;
 * - a constraint or an acceptance item only disappears when the user replaced
 *   the task or corrected the approach, never as a side effect of another update;
 * - a message the judge read as a constraint or a correction leaves at least
 *   one constraint in the user's own words;
 * - done flags and evidence survive, and a rewritten item has to be met again.
 */
export function mergeWriterFrame(frame: Frame, reply: WriterFrame, said: readonly UserText[]): Frame {
	const latest = said.at(-1);
	const mayDrop = said.some((each) => each.change === "new_task" || each.change === "correction");
	const questions = reply.openQuestions.map((question) => flat(question, 300)).filter(Boolean);

	const kept = new Set<Constraint>();
	const added: Constraint[] = [];
	for (const wanted of reply.constraints) {
		const existing = frame.constraints.find((constraint) => sameWords(constraint.text, wanted));
		if (existing) {
			kept.add(existing);
			continue;
		}
		let found: Found | undefined;
		for (const from of said) {
			const text = findVerbatim(from.text, wanted);
			if (text) {
				found = { text, from };
				break;
			}
		}
		found ??= closestSentence(said, wanted);
		if (!found) {
			questions.push(`Not the user's words, so not recorded as a constraint: "${flat(wanted, 200)}"`);
			continue;
		}
		const constraint = verbatimConstraint({ ...found.from, text: found.text });
		const known = [...frame.constraints, ...added].some((each) => each.text === constraint.text);
		if (!known) added.push(constraint);
	}
	for (const each of said) {
		if (each.change !== "constraint" && each.change !== "correction") continue;
		if (added.some((constraint) => constraint.source.turn === each.turn && each.text.includes(constraint.text)))
			continue;
		const whole = verbatimConstraint(each);
		if (![...frame.constraints, ...added].some((constraint) => constraint.text === whole.text)) added.push(whole);
	}
	const constraints = [...frame.constraints.filter((constraint) => kept.has(constraint) || !mayDrop), ...added];

	let nextItem = frame.nextItem;
	const seen = new Set<string>();
	const acceptance: AcceptanceItem[] = [];
	for (const wanted of reply.acceptance.slice(0, MAX_ACCEPTANCE)) {
		const text = flat(wanted.text, 300);
		if (!text) continue;
		const existing = frame.acceptance.find((item) => item.id === wanted.id?.trim().toLowerCase());
		if (existing && !seen.has(existing.id)) {
			seen.add(existing.id);
			// Reworded means the old tick was for something else.
			acceptance.push(
				existing.text === text ? existing : { id: existing.id, text, done: false, addedBy: existing.addedBy },
			);
		} else if (!acceptance.some((item) => item.text === text)) {
			acceptance.push({ id: `a${nextItem++}`, text, done: false, addedBy: "writer" });
		}
	}
	if (!mayDrop) acceptance.unshift(...frame.acceptance.filter((item) => !seen.has(item.id)));

	return {
		version: frame.version + 1,
		goal: flat(reply.goal, 600),
		constraints,
		currentSubgoal: reply.currentSubgoal ? flat(reply.currentSubgoal, 300) : undefined,
		acceptance,
		openQuestions: [...new Set(questions)].slice(0, MAX_OPEN_QUESTIONS),
		updatedTurn: latest?.turn ?? frame.updatedTurn,
		source: "writer",
		change: latest?.change,
		nextItem,
	};
}
