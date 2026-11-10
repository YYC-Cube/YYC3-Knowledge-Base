import type { Runner } from "./exec.ts";

/**
 * ast-grep behind two tools. Its JSON stream is the interface: one match per
 * line, with byte offsets. Checked against ast-grep 0.44:
 *
 * - `--json` makes every run a dry run, even with `--update-all`, so a rewrite
 *   is applied here, from the offsets, and never by ast-grep itself;
 * - offsets count bytes, not characters;
 * - a match inside another match is reported as well, and ast-grep's own
 *   `--update-all` keeps the outer one and skips the inner one;
 * - no match is exit code 1 with nothing on stderr;
 * - a value that begins with a dash needs the `--flag=value` spelling.
 */
export interface SgMatch {
	readonly file: string;
	/** First and last line of the match, counted from 1. */
	readonly line: number;
	readonly endLine: number;
	readonly text: string;
	/** Byte range that `replacement` replaces. Only present on a rewrite. */
	readonly start: number;
	readonly end: number;
	readonly replacement: string | undefined;
}

export interface SgQuery {
	readonly pattern: string;
	readonly language: string;
	readonly rewrite?: string;
	readonly paths?: readonly string[];
}

export function sgArgs(query: SgQuery): string[] {
	const args = ["run", `--pattern=${query.pattern}`, `--lang=${query.language}`];
	if (query.rewrite !== undefined) args.push(`--rewrite=${query.rewrite}`);
	const paths = (query.paths ?? []).filter((path) => path.trim());
	// After `--` a path that begins with a dash is still a path.
	return [...args, "--json=stream", "--color=never", "--", ...(paths.length > 0 ? paths : ["."])];
}

interface RawRange {
	byteOffset?: { start?: unknown; end?: unknown };
	start?: { line?: unknown };
	end?: { line?: unknown };
}

export function parseSgLine(line: string): SgMatch | undefined {
	if (!line.trim()) return undefined;
	let raw: { text?: unknown; file?: unknown; range?: RawRange; replacement?: unknown; replacementOffsets?: unknown };
	try {
		raw = JSON.parse(line);
	} catch {
		return undefined;
	}
	const offsets = (raw.replacementOffsets ?? raw.range?.byteOffset) as { start?: unknown; end?: unknown } | undefined;
	const startLine = raw.range?.start?.line;
	const endLine = raw.range?.end?.line;
	if (typeof raw.file !== "string" || typeof raw.text !== "string") return undefined;
	if (typeof offsets?.start !== "number" || typeof offsets.end !== "number") return undefined;
	if (typeof startLine !== "number" || typeof endLine !== "number") return undefined;
	return {
		file: raw.file,
		line: startLine + 1,
		endLine: endLine + 1,
		text: raw.text,
		start: offsets.start,
		end: offsets.end,
		replacement: typeof raw.replacement === "string" ? raw.replacement : undefined,
	};
}

export interface AstGrepBinary {
	readonly command: string;
	readonly version: string;
}

/**
 * `ast-grep`, or its short name `sg`. On some Linux systems `sg` is the
 * shadow-utils program that runs a command under another group, so a binary
 * only counts when its `--version` says it is ast-grep.
 */
export async function findAstGrep(
	runner: Runner,
	options: { command?: string; cwd?: string } = {},
): Promise<AstGrepBinary | undefined> {
	for (const command of options.command ? [options.command] : ["ast-grep", "sg"]) {
		const result = await runner(command, ["--version"], { cwd: options.cwd, timeoutMs: 5000 });
		const version = /^ast-grep\s+(\S+)/m.exec(result.stdout);
		if (result.code === 0 && version) return { command, version: version[1] };
	}
	return undefined;
}

export interface SgRun {
	readonly matches: readonly SgMatch[];
	/** How many matches were seen. `more` says counting stopped before the end. */
	readonly total: number;
	readonly more: boolean;
	/** What ast-grep said when it failed, e.g. an unknown language. */
	readonly problem: string | undefined;
}

/** Runs one query. Keeps the first `keep` matches, counts up to `ceiling`, then stops the program. */
export async function runSg(
	runner: Runner,
	binary: AstGrepBinary,
	query: SgQuery,
	options: { cwd: string; keep: number; ceiling: number; signal?: AbortSignal; timeoutMs?: number },
): Promise<SgRun> {
	const matches: SgMatch[] = [];
	let total = 0;
	let more = false;
	const result = await runner(binary.command, sgArgs(query), {
		cwd: options.cwd,
		signal: options.signal,
		timeoutMs: options.timeoutMs ?? 120_000,
		onLine: (line) => {
			const match = parseSgLine(line);
			if (!match) return undefined;
			total++;
			if (matches.length < options.keep) matches.push(match);
			if (total < options.ceiling) return undefined;
			more = true;
			return false;
		},
	});
	const failed = !result.stopped && result.code !== 0 && total === 0 && result.stderr.trim() !== "";
	// A pattern that does not parse is only a warning to ast-grep, and then it matches nothing.
	const warned = total === 0 && /ERROR node|not supported|Cannot parse/i.test(result.stderr);
	return {
		matches,
		total,
		more,
		problem: result.missing
			? "ast-grep could not be started."
			: failed || warned
				? result.stderr.trim().split("\n").slice(0, 3).join(" ")
				: undefined,
	};
}

function firstLine(text: string, length: number): string {
	const lines = text.split("\n");
	const head = lines[0].trim();
	const clipped = head.length > length ? `${head.slice(0, length - 1)}…` : head;
	return lines.length > 1 ? `${clipped} …(+${lines.length - 1} lines)` : clipped;
}

/** Matches grouped by file: the path once, then `line: text` rows. */
export function formatSearch(run: SgRun): string {
	if (run.problem) return `ast-grep: ${run.problem}`;
	if (run.total === 0) return "No matches.";
	const byFile = new Map<string, SgMatch[]>();
	for (const match of run.matches) byFile.set(match.file, [...(byFile.get(match.file) ?? []), match]);
	const shown = run.matches.length;
	const count = `${run.total}${run.more ? "+" : ""}`;
	const head =
		shown < run.total
			? `Showing ${shown} of ${count} matches. Narrow the pattern or the paths to see the rest.`
			: `${count} ${run.total === 1 ? "match" : "matches"} in ${byFile.size} ${byFile.size === 1 ? "file" : "files"}`;
	const rows = [...byFile].flatMap(([file, matches]) => [
		file,
		...matches.map((match) => {
			const where = match.endLine > match.line ? `${match.line}-${match.endLine}` : String(match.line);
			return `  ${where}: ${firstLine(match.text, 160)}`;
		}),
	]);
	return [head, ...rows].join("\n");
}

/** Per file, the edits to make: in order, and without the ones that lie inside an earlier one. */
export function planRewrite(matches: readonly SgMatch[]): Map<string, SgMatch[]> {
	const byFile = new Map<string, SgMatch[]>();
	for (const match of matches) {
		if (match.replacement === undefined) continue;
		byFile.set(match.file, [...(byFile.get(match.file) ?? []), match]);
	}
	for (const [file, edits] of byFile) {
		edits.sort((a, b) => a.start - b.start || b.end - a.end);
		let covered = -1;
		byFile.set(
			file,
			edits.filter((edit) => {
				if (edit.start < covered) return false;
				covered = edit.end;
				return true;
			}),
		);
	}
	return byFile;
}

/** The file with the edits made, or undefined when it no longer holds the text the edits were found in. */
export function applyEdits(source: Buffer, edits: readonly SgMatch[]): Buffer | undefined {
	const parts: Buffer[] = [];
	let at = 0;
	for (const edit of edits) {
		if (edit.start < at || edit.end > source.length) return undefined;
		if (source.subarray(edit.start, edit.end).toString("utf8") !== edit.text) return undefined;
		parts.push(source.subarray(at, edit.start), Buffer.from(edit.replacement ?? "", "utf8"));
		at = edit.end;
	}
	parts.push(source.subarray(at));
	return Buffer.concat(parts);
}

function lineStarts(source: Buffer): number[] {
	const starts = [0];
	for (let at = 0; at < source.length; at++) if (source[at] === 10 && at + 1 < source.length) starts.push(at + 1);
	return starts;
}

function lineOf(starts: readonly number[], offset: number): number {
	let low = 0;
	let high = starts.length - 1;
	while (low < high) {
		const middle = (low + high + 1) >> 1;
		if (starts[middle] <= offset) low = middle;
		else high = middle - 1;
	}
	return low;
}

/**
 * A unified diff without context lines, made from the edits themselves: they
 * say exactly which lines change, so no diff algorithm is needed.
 */
export function editsDiff(path: string, source: Buffer, edits: readonly SgMatch[]): string {
	const starts = lineStarts(source);
	const endOfLine = (line: number) => (line + 1 < starts.length ? starts[line + 1] : source.length);
	const groups: { first: number; last: number; edits: SgMatch[] }[] = [];
	for (const edit of edits) {
		const first = lineOf(starts, edit.start);
		const last = lineOf(starts, Math.max(edit.start, edit.end - 1));
		const open = groups[groups.length - 1];
		// Edits on the same or on neighbouring lines read best as one hunk.
		if (open && first <= open.last + 1) {
			open.last = Math.max(open.last, last);
			open.edits.push(edit);
		} else {
			groups.push({ first, last, edits: [edit] });
		}
	}
	const out = [`--- a/${path}`, `+++ b/${path}`];
	let shift = 0;
	for (const group of groups) {
		const from = starts[group.first];
		const before = source.subarray(from, endOfLine(group.last));
		const after = applyEdits(
			before,
			group.edits.map((edit) => ({ ...edit, start: edit.start - from, end: edit.end - from })),
		);
		const rows = (buffer: Buffer) => {
			const text = buffer.toString("utf8");
			return text === "" ? [] : text.replace(/\n$/, "").split("\n");
		};
		const oldRows = rows(before);
		const newRows = rows(after ?? before);
		out.push(
			`@@ -${group.first + 1},${oldRows.length} +${group.first + 1 + shift},${newRows.length} @@`,
			...oldRows.map((row) => `-${row.replace(/\r$/, "")}`),
			...newRows.map((row) => `+${row.replace(/\r$/, "")}`),
		);
		shift += newRows.length - oldRows.length;
	}
	return out.join("\n");
}

export interface RewriteFiles {
	read(path: string): Promise<Buffer>;
	write(path: string, data: Buffer): Promise<void>;
	/** Runs `work` while nothing else writes `path`: pi's own edit and write tools queue on the same lock. */
	locked<T>(path: string, work: () => Promise<T>): Promise<T>;
	resolve(file: string): string;
}

export interface RewriteOutcome {
	readonly files: number;
	readonly edits: number;
	readonly diff: string;
	/** Files left alone because they changed after ast-grep read them. */
	readonly stale: readonly string[];
	readonly written: boolean;
}

/** The diff of a rewrite, and the rewrite itself when `apply` is set. */
export async function rewrite(
	plan: ReadonlyMap<string, readonly SgMatch[]>,
	files: RewriteFiles,
	options: { apply: boolean; maxDiffChars: number },
): Promise<RewriteOutcome> {
	const diffs: string[] = [];
	const stale: string[] = [];
	let changed = 0;
	let edits = 0;
	for (const [file, fileEdits] of plan) {
		const path = files.resolve(file);
		const done = await files.locked(path, async () => {
			const source = await files.read(path);
			const result = applyEdits(source, fileEdits);
			if (!result) return undefined;
			if (options.apply) await files.write(path, result);
			return editsDiff(file, source, fileEdits);
		});
		if (done === undefined) {
			stale.push(file);
			continue;
		}
		changed++;
		edits += fileEdits.length;
		diffs.push(done);
	}
	let diff = diffs.join("\n");
	if (diff.length > options.maxDiffChars) {
		const cut = diff.slice(0, options.maxDiffChars);
		diff = `${cut.slice(0, cut.lastIndexOf("\n"))}\n[the rest of the diff is not shown: ${diff.length - options.maxDiffChars} more characters]`;
	}
	return { files: changed, edits, diff, stale, written: options.apply };
}
