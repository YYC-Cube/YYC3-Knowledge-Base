import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Git, splitZ, text } from "./git.ts";

/**
 * Conflicts of a merge, rebase, cherry-pick or revert that stopped: which
 * files, what each side wanted, and the replacement of conflict blocks by
 * their resolution. Nothing here commits or continues the operation: that is
 * the user's step.
 */
export interface ConflictBlock {
	/** 1-based, in the order of the file. */
	readonly number: number;
	/** 1-based line numbers of the `<<<<<<<` and `>>>>>>>` lines. */
	readonly startLine: number;
	readonly endLine: number;
	readonly ours: readonly string[];
	/** Present when the file was written with base sections (diff3 or zdiff3 style). */
	readonly base: readonly string[] | undefined;
	readonly theirs: readonly string[];
	readonly oursLabel: string;
	readonly theirsLabel: string;
}

export interface ParsedConflicts {
	readonly lines: readonly string[];
	readonly eol: "\n" | "\r\n";
	/** Whether the text ended with a line ending. */
	readonly finalEol: boolean;
	readonly blocks: readonly ConflictBlock[];
	/** Set when the markers do not nest the way git writes them; nothing is replaced then. */
	readonly problem?: string;
}

const START = /^<{7}(?: (.*))?$/;
const BASE = /^\|{7}(?: .*)?$/;
const MIDDLE = /^={7}$/;
const END = /^>{7}(?: (.*))?$/;

export function parseConflicts(content: string): ParsedConflicts {
	const eol = content.includes("\r\n") ? "\r\n" : "\n";
	const finalEol = content.endsWith("\n");
	const lines = (finalEol ? content.slice(0, content.endsWith("\r\n") ? -2 : -1) : content).split(/\r?\n/);
	const blocks: ConflictBlock[] = [];
	let state: "outside" | "ours" | "base" | "theirs" = "outside";
	let start = 0;
	let label = "";
	let ours: string[] = [];
	let base: string[] | undefined;
	let theirs: string[] = [];
	for (const [index, line] of lines.entries()) {
		const start_ = START.exec(line);
		const end_ = END.exec(line);
		if (state === "outside") {
			if (start_) {
				state = "ours";
				start = index + 1;
				label = start_[1] ?? "";
				ours = [];
				base = undefined;
				theirs = [];
			} else if (end_ || MIDDLE.test(line)) {
				return { lines, eol, finalEol, blocks, problem: `line ${index + 1}: a marker outside a conflict block` };
			}
			continue;
		}
		if (start_)
			return { lines, eol, finalEol, blocks, problem: `line ${index + 1}: a conflict block inside another` };
		if (state === "ours" && BASE.test(line)) {
			state = "base";
			base = [];
		} else if ((state === "ours" || state === "base") && MIDDLE.test(line)) {
			state = "theirs";
		} else if (state === "theirs" && end_) {
			blocks.push({
				number: blocks.length + 1,
				startLine: start,
				endLine: index + 1,
				ours,
				base,
				theirs,
				oursLabel: label,
				theirsLabel: end_[1] ?? "",
			});
			state = "outside";
		} else if (state === "ours") {
			ours.push(line);
		} else if (state === "base") {
			base?.push(line);
		} else {
			theirs.push(line);
		}
	}
	if (state !== "outside")
		return { lines, eol, finalEol, blocks, problem: `a conflict block from line ${start} is not closed` };
	return { lines, eol, finalEol, blocks };
}

/** The file with the given blocks replaced by their resolution; the others stay as they are, markers and all. */
export function replaceBlocks(parsed: ParsedConflicts, resolutions: ReadonlyMap<number, string>): string {
	const out: string[] = [];
	let at = 0;
	for (const block of parsed.blocks) {
		out.push(...parsed.lines.slice(at, block.startLine - 1));
		const resolution = resolutions.get(block.number);
		if (resolution === undefined) out.push(...parsed.lines.slice(block.startLine - 1, block.endLine));
		else if (resolution !== "") out.push(...resolution.replace(/\r?\n$/, "").split(/\r?\n/));
		at = block.endLine;
	}
	out.push(...parsed.lines.slice(at));
	return `${out.join(parsed.eol)}${parsed.finalEol ? parsed.eol : ""}`;
}

export type ConflictKind =
	| "both modified"
	| "both added"
	| "deleted by them"
	| "deleted by us"
	| "added by us"
	| "added by them";

export interface ConflictedFile {
	readonly path: string;
	readonly kind: ConflictKind;
	/** The index stages present: 1 base, 2 ours, 3 theirs. */
	readonly stages: readonly number[];
}

function kindOf(stages: ReadonlySet<number>): ConflictKind {
	if (stages.has(2) && stages.has(3)) return stages.has(1) ? "both modified" : "both added";
	if (stages.has(1) && stages.has(2)) return "deleted by them";
	if (stages.has(1) && stages.has(3)) return "deleted by us";
	return stages.has(2) ? "added by us" : "added by them";
}

/** Every unmerged path of the index, from `git ls-files -u`. */
export async function listConflicted(git: Git, cwd: string): Promise<ConflictedFile[]> {
	const listed = await git(["ls-files", "-u", "-z"], { cwd });
	if (listed.code !== 0) return [];
	const stages = new Map<string, Set<number>>();
	for (const entry of splitZ(listed)) {
		const tab = entry.indexOf("\t");
		if (tab < 0) continue;
		const stage = Number(entry.slice(0, tab).split(" ")[2]);
		const path = entry.slice(tab + 1);
		stages.set(path, new Set([...(stages.get(path) ?? []), stage]));
	}
	return [...stages].map(([path, set]) => ({ path, kind: kindOf(set), stages: [...set].sort() }));
}

/** One line on what is being merged: the commit on the other side and its subject. */
export async function describeOperation(git: Git, cwd: string, operation: string): Promise<string> {
	const ref = { merge: "MERGE_HEAD", rebase: "REBASE_HEAD", "cherry-pick": "CHERRY_PICK_HEAD", revert: "REVERT_HEAD" }[
		operation
	];
	if (!ref) return `A ${operation} is in progress.`;
	const shown = await git(["log", "-1", "--format=%h %s", ref], { cwd });
	const what = shown.code === 0 ? text(shown).trim() : "";
	const verb = { merge: "merging", rebase: "applying", "cherry-pick": "picking", revert: "reverting" }[operation];
	return `A ${operation} is in progress${what ? `: ${verb} ${what}` : ""}.`;
}

/**
 * The three sides of a file merged again with base sections, whatever conflict style the user has
 * set, so every block can show what both sides started from. Undefined when a side is missing or
 * git cannot produce it; the working tree is not touched.
 */
export async function diff3Of(git: Git, cwd: string, path: string): Promise<ParsedConflicts | undefined> {
	const sides: Buffer[] = [];
	for (const stage of [2, 1, 3]) {
		const shown = await git(["show", `:${stage}:${path}`], { cwd });
		if (shown.code !== 0) return undefined;
		sides.push(shown.stdout);
	}
	const dir = await mkdtemp(join(tmpdir(), "mu-conflict-"));
	try {
		const files = ["ours", "base", "theirs"].map((name) => join(dir, name));
		await Promise.all(files.map((file, index) => writeFile(file, sides[index])));
		const merged = await git(["merge-file", "-p", "--diff3", "-L", "ours", "-L", "base", "-L", "theirs", ...files], {
			cwd,
		});
		// The exit code is the number of conflicts; below zero is an error.
		if (merged.code < 0 || merged.code > 127 || merged.missing) return undefined;
		return parseConflicts(text(merged));
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

/** A file of bytes rather than text: a NUL in its first 8000 bytes, as git decides. */
export function looksBinary(content: Buffer): boolean {
	return content.subarray(0, 8000).includes(0);
}
