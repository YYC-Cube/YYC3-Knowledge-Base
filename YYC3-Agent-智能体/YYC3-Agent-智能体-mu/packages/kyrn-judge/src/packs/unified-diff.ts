/**
 * A parser for what `git diff` prints, and the reverse: a patch made of some of
 * the hunks, which `git apply --cached` accepts.
 *
 * Every line is kept exactly as it came, so a diff read as latin1 (one
 * character per byte) goes back out byte for byte, whatever the encoding or the
 * line endings of the files in it. Hunk bodies are read by the line counts of
 * their header and never by what a line looks like: a removed line `-- a/x`
 * prints as `--- a/x`, and a diff of a patch file is full of such lines.
 */
export interface DiffHunk {
	/** Position among the hunks of its file. */
	readonly index: number;
	readonly oldStart: number;
	readonly oldLines: number;
	readonly newStart: number;
	readonly newLines: number;
	/** What follows the second `@@`: usually the enclosing function. */
	readonly section: string;
	/** Body lines with their prefix character, `\ No newline at end of file` markers included. */
	readonly lines: readonly string[];
	readonly added: number;
	readonly removed: number;
}

export type DiffStatus = "modified" | "added" | "deleted" | "renamed" | "copied";

export interface DiffFile {
	/** Undefined for a file that is new. */
	readonly oldPath: string | undefined;
	/** Undefined for a file that is deleted. */
	readonly newPath: string | undefined;
	readonly status: DiffStatus;
	readonly oldMode: string | undefined;
	readonly newMode: string | undefined;
	readonly binary: boolean;
	/** A merge in progress prints `diff --cc`, which no patch can be built from. */
	readonly combined: boolean;
	/** Every line before the first hunk, as printed. */
	readonly header: readonly string[];
	/** `GIT binary patch` and what follows it, or the `Binary files ... differ` line. */
	readonly binaryLines: readonly string[];
	readonly hunks: readonly DiffHunk[];
}

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?: ?(.*))?$/;
const FILE_START = ["diff --git ", "diff --cc ", "diff --combined "];

const ESCAPES: Readonly<Record<string, number>> = { a: 7, b: 8, f: 12, n: 10, r: 13, t: 9, v: 11, "\\": 92, '"': 34 };

/** Reads one path as git prints it: bare, or C-quoted with octal escapes for the bytes of anything unusual. */
export function unquotePath(token: string): string {
	if (!token.startsWith('"') || !token.endsWith('"') || token.length < 2) return token;
	const bytes: number[] = [];
	const inner = token.slice(1, -1);
	for (let at = 0; at < inner.length; at++) {
		const char = inner[at];
		if (char !== "\\") {
			const code = inner.charCodeAt(at);
			if (code <= 0xff) bytes.push(code);
			else bytes.push(...Buffer.from(char, "utf8"));
			continue;
		}
		const octal = /^[0-7]{1,3}/.exec(inner.slice(at + 1));
		if (octal) {
			bytes.push(Number.parseInt(octal[0], 8) & 0xff);
			at += octal[0].length;
		} else {
			const next = inner[at + 1] ?? "\\";
			bytes.push(ESCAPES[next] ?? next.charCodeAt(0));
			at++;
		}
	}
	return Buffer.from(bytes).toString("utf8");
}

/** The end of a C-quoted token that starts at `from`, or -1. */
function quotedEnd(text: string, from: number): number {
	for (let at = from + 1; at < text.length; at++) {
		if (text[at] === "\\") at++;
		else if (text[at] === '"') return at;
	}
	return -1;
}

function stripPrefix(path: string): string {
	return path.startsWith("a/") || path.startsWith("b/") ? path.slice(2) : path;
}

/** The path of a `--- ` or `+++ ` line. Git ends a bare name that contains a space with a tab. */
function markerPath(rest: string): string | undefined {
	const token = rest.startsWith('"') ? rest.slice(0, quotedEnd(rest, 0) + 1) : rest.split("\t")[0];
	if (token === "/dev/null") return undefined;
	return stripPrefix(unquotePath(token));
}

/** Both paths of a `diff --git` line. Bare names may hold spaces, so an unrenamed pair is found as two equal halves. */
function gitLinePaths(rest: string): [string, string] | undefined {
	if (rest.startsWith('"')) {
		const end = quotedEnd(rest, 0);
		if (end < 0) return undefined;
		return [stripPrefix(unquotePath(rest.slice(0, end + 1))), stripPrefix(unquotePath(rest.slice(end + 2)))];
	}
	for (let at = rest.indexOf(" "); at >= 0; at = rest.indexOf(" ", at + 1)) {
		const left = rest.slice(0, at);
		const right = rest.slice(at + 1);
		if (right.startsWith('"')) return [stripPrefix(left), stripPrefix(unquotePath(right))];
		if (stripPrefix(left) === stripPrefix(right)) return [stripPrefix(left), stripPrefix(right)];
	}
	return undefined;
}

function parseHunk(
	lines: readonly string[],
	start: number,
	index: number,
): { hunk: DiffHunk; next: number } | undefined {
	const match = HUNK_HEADER.exec(lines[start]);
	if (!match) return undefined;
	const oldLines = match[2] === undefined ? 1 : Number(match[2]);
	const newLines = match[4] === undefined ? 1 : Number(match[4]);
	let oldLeft = oldLines;
	let newLeft = newLines;
	let added = 0;
	let removed = 0;
	const body: string[] = [];
	let at = start + 1;
	while (at < lines.length && (oldLeft > 0 || newLeft > 0)) {
		const line = lines[at];
		const kind = line[0];
		// A mail client or an editor may have stripped the single space of an empty context line.
		if (kind === " " || line === "") {
			oldLeft--;
			newLeft--;
		} else if (kind === "-") {
			oldLeft--;
			removed++;
		} else if (kind === "+") {
			newLeft--;
			added++;
		} else if (kind !== "\\") {
			break;
		}
		body.push(line);
		at++;
	}
	while (at < lines.length && lines[at].startsWith("\\")) body.push(lines[at++]);
	return {
		hunk: {
			index,
			oldStart: Number(match[1]),
			oldLines,
			newStart: Number(match[3]),
			newLines,
			section: match[5] ?? "",
			lines: body,
			added,
			removed,
		},
		next: at,
	};
}

export function parseDiff(text: string): DiffFile[] {
	const lines = text.split("\n");
	if (lines[lines.length - 1] === "") lines.pop();
	const files: DiffFile[] = [];
	let at = 0;
	while (at < lines.length) {
		if (!FILE_START.some((start) => lines[at].startsWith(start))) {
			at++;
			continue;
		}
		const combined = !lines[at].startsWith("diff --git ");
		const header: string[] = [lines[at++]];
		const binaryLines: string[] = [];
		const hunks: DiffHunk[] = [];
		while (at < lines.length && !FILE_START.some((start) => lines[at].startsWith(start))) {
			const line = lines[at];
			if (combined) {
				// Nothing of a combined diff is used: skip to the next file.
				at++;
			} else if (line === "GIT binary patch") {
				// Base85 lines begin with a length letter, so none of them can look like the start of a file.
				while (at < lines.length && !lines[at].startsWith("diff --git ")) binaryLines.push(lines[at++]);
			} else if (line.startsWith("Binary files ") && line.endsWith(" differ")) {
				binaryLines.push(lines[at++]);
			} else if (line.startsWith("@@ -")) {
				const parsed = parseHunk(lines, at, hunks.length);
				if (!parsed) {
					at++;
					continue;
				}
				hunks.push(parsed.hunk);
				at = parsed.next;
			} else if (hunks.length === 0 && binaryLines.length === 0) {
				header.push(lines[at++]);
			} else {
				// Text between hunks that belongs to nothing, such as a warning git printed.
				at++;
			}
		}

		const value = (prefix: string) => header.find((line) => line.startsWith(prefix))?.slice(prefix.length);
		const renamedFrom = value("rename from ");
		const copiedFrom = value("copy from ");
		const added = value("new file mode ");
		const deleted = value("deleted file mode ");
		const fromGitLine = combined ? undefined : gitLinePaths(header[0].slice("diff --git ".length));
		const oldMarker = value("--- ");
		const newMarker = value("+++ ");
		let oldPath = oldMarker === undefined ? fromGitLine?.[0] : markerPath(oldMarker);
		let newPath = newMarker === undefined ? fromGitLine?.[1] : markerPath(newMarker);
		if (renamedFrom !== undefined || copiedFrom !== undefined) {
			oldPath = unquotePath(renamedFrom ?? copiedFrom ?? "");
			newPath = unquotePath(value("rename to ") ?? value("copy to ") ?? "");
		}
		if (added !== undefined) oldPath = undefined;
		if (deleted !== undefined) newPath = undefined;
		files.push({
			oldPath,
			newPath,
			status:
				added !== undefined
					? "added"
					: deleted !== undefined
						? "deleted"
						: renamedFrom !== undefined
							? "renamed"
							: copiedFrom !== undefined
								? "copied"
								: "modified",
			oldMode: value("old mode ") ?? deleted,
			newMode: value("new mode ") ?? added,
			binary: binaryLines.length > 0,
			combined,
			header,
			binaryLines,
			hunks,
		});
	}
	return files;
}

/** The name to show for a file: where it is now, or where it was when it is gone. */
export function displayPath(file: DiffFile): string {
	return file.newPath ?? file.oldPath ?? "(unknown)";
}

function range(start: number, count: number): string {
	return count === 1 ? String(start) : `${start},${count}`;
}

/**
 * A patch holding some hunks of one file, for an index that already has
 * `applied` of its other hunks.
 *
 * Line numbers are recomputed instead of being left to the fuzzy search of
 * `git apply`: in a file with repeated code, a hunk that lands a few lines off
 * can land on the wrong copy without anyone noticing.
 */
export function filePatch(file: DiffFile, selected: ReadonlySet<number>, applied: ReadonlySet<number>): string {
	const whole = file.hunks.every((hunk) => selected.has(hunk.index)) && applied.size === 0;
	if (whole) return `${[...file.header, ...file.binaryLines, ...wholeHunks(file)].join("\n")}\n`;

	const lines: string[] = [];
	if (applied.size === 0) {
		// The first patch to touch the file carries its rename or mode change. The blob ids of the
		// `index` line describe the whole change, which this patch is only a part of.
		lines.push(...file.header.filter((line) => !line.startsWith("index ")));
	} else {
		// By now the file has its new name and mode: what is left is a plain modification of it.
		const marker = file.header.find((line) => line.startsWith("+++ "))?.slice(4) ?? "";
		const quoted = marker.startsWith('"');
		const name = quoted ? marker.slice(3, quotedEnd(marker, 0)) : marker.split("\t")[0].slice(2);
		const side = (prefix: string) => (quoted ? `"${prefix}/${name}"` : `${prefix}/${name}`);
		const tab = !quoted && marker.includes("\t") ? "\t" : "";
		lines.push(`diff --git ${side("a")} ${side("b")}`, `--- ${side("a")}${tab}`, `+++ ${side("b")}${tab}`);
	}
	for (const hunk of file.hunks) {
		if (!selected.has(hunk.index)) continue;
		let oldShift = 0;
		let newShift = 0;
		for (const earlier of file.hunks) {
			if (earlier.index >= hunk.index) break;
			const delta = earlier.newLines - earlier.oldLines;
			if (applied.has(earlier.index)) oldShift += delta;
			else if (!selected.has(earlier.index)) newShift -= delta;
		}
		const section = hunk.section ? ` ${hunk.section}` : "";
		lines.push(
			`@@ -${range(hunk.oldStart + oldShift, hunk.oldLines)} +${range(hunk.newStart + newShift, hunk.newLines)} @@${section}`,
			...hunk.lines,
		);
	}
	return `${lines.join("\n")}\n`;
}

function wholeHunks(file: DiffFile): string[] {
	return file.hunks.flatMap((hunk) => {
		const section = hunk.section ? ` ${hunk.section}` : "";
		return [
			`@@ -${range(hunk.oldStart, hunk.oldLines)} +${range(hunk.newStart, hunk.newLines)} @@${section}`,
			...hunk.lines,
		];
	});
}

/** The hunk of `path` that covers the given lines of the new version, or the nearest one. */
export function hunkAt(
	files: readonly DiffFile[],
	path: string,
	startLine: number,
	endLine: number,
): { file: DiffFile; hunk: DiffHunk } | undefined {
	const normal = path.replaceAll("\\", "/").replace(/^\.\//, "");
	const file = files.find((candidate) => candidate.newPath === normal || candidate.oldPath === normal);
	if (!file || file.hunks.length === 0) return undefined;
	let best: DiffHunk | undefined;
	let bestDistance = Number.POSITIVE_INFINITY;
	for (const hunk of file.hunks) {
		const first = hunk.newStart;
		const last = hunk.newStart + Math.max(hunk.newLines, 1) - 1;
		const distance = endLine < first ? first - endLine : startLine > last ? startLine - last : 0;
		if (distance < bestDistance) {
			best = hunk;
			bestDistance = distance;
		}
	}
	return best ? { file, hunk: best } : undefined;
}

/** A hunk as text: its header and body. */
export function hunkText(hunk: DiffHunk): string {
	const section = hunk.section ? ` ${hunk.section}` : "";
	return [
		`@@ -${range(hunk.oldStart, hunk.oldLines)} +${range(hunk.newStart, hunk.newLines)} @@${section}`,
		...hunk.lines,
	].join("\n");
}
