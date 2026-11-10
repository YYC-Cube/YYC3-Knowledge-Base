import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { describeSummary, type GitRun, type PatchFile, type PatchSummary, splitZ } from "./worktree.ts";

/**
 * What isolated sub-agents handed back, and the one way it gets into the
 * user's working tree. Bringing work back is a separate, explicit step: the
 * parent model looks at a patch, then applies it, or does not.
 */
export interface PatchRecord {
	/** What the model types to refer to it, e.g. "p-3f9a2c". */
	id: string;
	/** Title of the task it came from, and the role that did it. */
	task: string;
	role?: string;
	repoRoot: string;
	/** The patch file. Bytes, not text: it may hold any encoding and binary files. */
	path: string;
	summary: PatchSummary;
	createdAt: number;
	status: "ready" | "applied" | "applied-with-conflicts";
	/** E.g. that the sub-agent was stopped before it finished. */
	note?: string;
}

/** Patches of one session, newest last. Each is a `.patch` file with a `.json` beside it, under the run's temp directory. */
export class PatchStore {
	private readonly records = new Map<string, PatchRecord>();

	save(dir: string, patch: Buffer, details: Omit<PatchRecord, "id" | "path" | "createdAt" | "status">): PatchRecord {
		let id = "";
		do id = `p-${randomBytes(3).toString("hex")}`;
		while (this.records.has(id));
		mkdirSync(dir, { recursive: true, mode: 0o700 });
		const record: PatchRecord = {
			...details,
			id,
			path: join(dir, `${id}.patch`),
			createdAt: Date.now(),
			status: "ready",
		};
		writeFileSync(record.path, patch, { mode: 0o600 });
		this.records.set(id, record);
		this.persist(record);
		return record;
	}

	get(id: string): PatchRecord | undefined {
		return this.records.get(id.trim());
	}

	list(): PatchRecord[] {
		return [...this.records.values()];
	}

	setStatus(id: string, status: PatchRecord["status"]): void {
		const record = this.records.get(id);
		if (!record) return;
		record.status = status;
		this.persist(record);
	}

	private persist(record: PatchRecord): void {
		try {
			writeFileSync(record.path.replace(/\.patch$/, ".json"), JSON.stringify(record, null, "\t"), { mode: 0o600 });
		} catch {
			// The file beside the patch is for people and for the desktop app; the session works from memory.
		}
	}
}

const LETTER: Readonly<Record<PatchFile["status"], string>> = {
	added: "A",
	modified: "M",
	deleted: "D",
	renamed: "R",
	copied: "C",
	"type-changed": "T",
};

/** "M src/a.ts +10 -2", one line per file. */
export function statLines(summary: PatchSummary, limit = 40): string[] {
	const lines = summary.files.slice(0, limit).map((file) => {
		const name = file.from ? `${file.from} -> ${file.path}` : file.path;
		return `${LETTER[file.status]} ${name} ${file.binary ? "(binary)" : `+${file.insertions} -${file.deletions}`}`;
	});
	if (summary.files.length > limit) lines.push(`… and ${summary.files.length - limit} more files`);
	return lines;
}

/** One line for a list: "p-3f9a2c ready · rename-cnt (worker) · 3 files changed, +40 -2". */
export function describeRecord(record: PatchRecord): string {
	const who = record.role ? `${record.task} (${record.role})` : record.task;
	return `${record.id} ${record.status} · ${who} · ${describeSummary(record.summary)}${record.note ? ` · ${record.note}` : ""}`;
}

const HEADER = "diff --git ";

/** The part of a patch that is about one file, as text. Binary payloads are named, not shown. */
export function fileSection(patch: Buffer, file: Pick<PatchFile, "path" | "from">): string | undefined {
	// latin1 keeps every byte; the section is decoded properly once it is cut out.
	const raw = patch.toString("latin1");
	const wanted = Buffer.from(` b/${file.path}`, "utf8").toString("latin1");
	let start = raw.startsWith(HEADER) ? 0 : raw.indexOf(`\n${HEADER}`) + 1;
	while (start >= 0 && start < raw.length) {
		const next = raw.indexOf(`\n${HEADER}`, start);
		const end = next < 0 ? raw.length : next + 1;
		const headerEnd = raw.indexOf("\n", start);
		const header = raw.slice(start, headerEnd < 0 ? end : headerEnd).replace(/"/g, "");
		if (header.endsWith(wanted)) {
			const section = Buffer.from(raw.slice(start, end), "latin1").toString("utf8");
			const binary = section.indexOf("\nGIT binary patch\n");
			return binary < 0 ? section : `${section.slice(0, binary)}\n(binary content, not shown)\n`;
		}
		if (next < 0) break;
		start = next + 1;
	}
	return undefined;
}

/** The beginning of a patch for a first look: text hunks only, long lines cut. */
export function patchPreview(patch: Buffer, files: readonly PatchFile[], maxLines = 40): string {
	const lines: string[] = [];
	for (const file of files) {
		if (lines.length >= maxLines) break;
		const section = fileSection(patch, file);
		if (section) lines.push(...section.replace(/\n$/, "").split("\n"));
	}
	const total = lines.length;
	const shown = lines.slice(0, maxLines).map((line) => (line.length > 200 ? `${line.slice(0, 199)}…` : line));
	if (total > maxLines) shown.push(`… (${total - maxLines}+ more lines)`);
	return shown.join("\n");
}

export type ApplyResult =
	/** Everything is in the working tree. */
	| { status: "applied"; files: string[] }
	/** The working tree already holds what the patch would make. Nothing was changed. */
	| { status: "already-applied" }
	/** Both sides changed the same lines of these files. Nothing was changed. */
	| { status: "conflicts"; files: string[] }
	/** Asked for: the clean files are in, and these hold conflict markers to resolve by hand. */
	| { status: "applied-with-conflicts"; conflicted: string[]; clean: string[] }
	/** It cannot be applied at all (a file it changes is gone, for one). Nothing was changed. */
	| { status: "failed"; reasons: string[] };

export interface ApplyOptions {
	repoRoot: string;
	patchPath: string;
	files: readonly PatchFile[];
	/** `abort`: all or nothing. `markers`: apply what merges and leave conflict markers in the rest. */
	onConflict: "abort" | "markers";
	/** Where the scratch index may live. Never inside the repository. */
	scratchDir: string;
	signal?: AbortSignal;
}

/** What git said was wrong, file by file: its `error:` lines, which are English because the locale is pinned. */
function errorLines(stderr: string): string[] {
	const lines = stderr
		.split("\n")
		.filter((line) => line.startsWith("error: "))
		.map((line) => line.slice(7).trim());
	return lines.length > 0 ? [...new Set(lines)].slice(0, 20) : [stderr.trim().split("\n").pop() ?? "git apply failed"];
}

/**
 * `git apply --3way` into the working tree, without ever touching the user's index.
 *
 * `--3way` works through an index: it wants the touched files to match it, and it stages what it applies.
 * The user's own index may hold half of tomorrow's commit, so the merge runs against a scratch index
 * (`GIT_INDEX_FILE`) that is first made to mirror the working tree for the touched paths only. Run with
 * `--cached` on that scratch index it changes no file at all, which makes it a true dry run: `--check`
 * cannot be used for that, because to `--check` a three-way conflict is not a failure.
 */
export async function applyPatch(run: GitRun, options: ApplyOptions): Promise<ApplyResult> {
	const { repoRoot: cwd, patchPath, signal } = options;
	const shape = ["--3way", "--whitespace=nowarn"];
	const reversed = await run(["apply", "--check", "--reverse", "--whitespace=nowarn", patchPath], { cwd, signal });
	if (reversed.code === 0) return { status: "already-applied" };

	const touched = [...new Set(options.files.flatMap((file) => (file.from ? [file.from, file.path] : [file.path])))];
	const scratch: string[] = [];
	const attempt = async (cached: boolean) => {
		const index = join(options.scratchDir, `index-${randomBytes(4).toString("hex")}`);
		scratch.push(index, `${index}.lock`);
		const env = { GIT_INDEX_FILE: index };
		const input = Buffer.from(touched.map((path) => `${path}\0`).join(""), "utf8");
		const synced = await run(["update-index", "--add", "--remove", "-z", "--stdin"], { cwd, env, input, signal });
		if (synced.code !== 0) return { code: synced.code, stderr: synced.stderr, unmerged: [] as string[] };
		const applied = await run(["apply", ...shape, ...(cached ? ["--cached"] : []), patchPath], { cwd, env, signal });
		const unmerged = await run(["ls-files", "-u", "-z"], { cwd, env, signal });
		// "<mode> <blob> <stage>\t<path>", three rows per conflicted path.
		const paths = splitZ(unmerged.stdout).map((row) => row.slice(row.indexOf("\t") + 1));
		return { code: applied.code, stderr: applied.stderr, unmerged: [...new Set(paths)] };
	};

	try {
		mkdirSync(options.scratchDir, { recursive: true, mode: 0o700 });
		const dry = await attempt(true);
		if (dry.code !== 0 && dry.unmerged.length === 0) return { status: "failed", reasons: errorLines(dry.stderr) };
		if (dry.unmerged.length > 0 && options.onConflict === "abort")
			return { status: "conflicts", files: dry.unmerged };

		const real = await attempt(false);
		if (real.code !== 0 && real.unmerged.length === 0) return { status: "failed", reasons: errorLines(real.stderr) };
		const all = options.files.map((file) => file.path);
		if (real.unmerged.length === 0) return { status: "applied", files: all };
		const conflicted = new Set(real.unmerged);
		return {
			status: "applied-with-conflicts",
			conflicted: real.unmerged,
			clean: all.filter((path) => !conflicted.has(path)),
		};
	} finally {
		for (const path of scratch) await rm(path, { force: true }).catch(() => undefined);
	}
}

/** Reads a stored patch back. Undefined when the temp directory was cleaned in the meantime. */
export function readPatch(record: PatchRecord): Buffer | undefined {
	try {
		return readFileSync(record.path);
	} catch {
		return undefined;
	}
}
