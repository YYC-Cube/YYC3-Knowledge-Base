import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { InheritProblem } from "./types.ts";

/** Rule and config files are small. Anything larger is not what it claims to be. */
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

/**
 * The project's folders, nearest first: the session's directory and its
 * parents up to the repository root. Without a repository it is the session's
 * directory alone, and the home folder is never treated as a project.
 */
export function projectChain(projectDir: string, home: string): string[] {
	const start = resolve(projectDir);
	const homeDir = resolve(home);
	const chain: string[] = [];
	let current = start;
	for (let depth = 0; depth < 32; depth++) {
		if (current === homeDir) break;
		chain.push(current);
		if (existsSync(join(current, ".git"))) return chain;
		const parent = dirname(current);
		if (parent === current) break;
		current = parent;
	}
	return start === homeDir ? [] : [start];
}

/** The bytes of a file, `undefined` when it does not exist. Other failures are reported and skipped. */
export function readBytes(path: string, problems: InheritProblem[], maxBytes = MAX_FILE_BYTES): Buffer | undefined {
	try {
		const stats = statSync(path);
		if (!stats.isFile()) return undefined;
		if (stats.size > maxBytes) {
			problems.push({ source: path, message: `skipped: larger than ${maxBytes} bytes` });
			return undefined;
		}
		return readFileSync(path);
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === "ENOENT" || code === "ENOTDIR") return undefined;
		problems.push({ source: path, message: `could not be read (${code ?? "error"})` });
		return undefined;
	}
}

/** The text of a file without a byte order mark, `undefined` when it does not exist, as with `readBytes`. */
export function readText(path: string, problems: InheritProblem[], maxBytes = MAX_FILE_BYTES): string | undefined {
	return readBytes(path, problems, maxBytes)?.toString("utf8").replace(/^﻿/, "");
}

/** Files below `dir` with one of the extensions, sorted, symlinks followed once. Missing folders are empty. */
export function listFiles(dir: string, extensions: readonly string[], depth = 4): string[] {
	const found: string[] = [];
	let names: string[];
	try {
		names = readdirSync(dir).sort();
	} catch {
		return found;
	}
	for (const name of names) {
		if (name.startsWith(".") || name === "node_modules") continue;
		const path = join(dir, name);
		let stats: ReturnType<typeof statSync>;
		try {
			stats = statSync(path);
		} catch {
			continue;
		}
		if (stats.isDirectory()) {
			if (depth > 0) found.push(...listFiles(path, extensions, depth - 1));
		} else if (stats.isFile() && extensions.some((extension) => name.endsWith(extension))) {
			found.push(path);
		}
	}
	return found;
}

/** The path with symlinks resolved, or the path itself when that fails. */
export function canonical(path: string): string {
	try {
		return realpathSync(path);
	} catch {
		return resolve(path);
	}
}
