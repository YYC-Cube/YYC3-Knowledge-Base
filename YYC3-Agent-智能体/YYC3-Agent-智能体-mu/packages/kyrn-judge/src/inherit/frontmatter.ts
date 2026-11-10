/**
 * A lenient reader for the frontmatter of rule files.
 *
 * Cursor writes `globs: *.ts,*.tsx`, which is not YAML (a value that starts
 * with `*` is an alias), so a YAML parser rejects the very files this is for.
 * Only what rule files use is understood: `key: value` lines, quoted strings,
 * booleans, `[a, b]` lists and `- item` lists. Anything else is kept as text.
 */
export type FrontmatterValue = string | boolean | readonly string[];

export interface Frontmatter {
	readonly fields: Readonly<Record<string, FrontmatterValue>>;
	readonly body: string;
}

function unquote(value: string): string {
	const trimmed = value.trim();
	const quote = trimmed[0];
	if ((quote === '"' || quote === "'") && trimmed.length >= 2 && trimmed.endsWith(quote)) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

/** Splits on commas, except the ones inside braces: `src/**\/*.{ts,tsx}` is one pattern. */
export function splitList(text: string): string[] {
	const items: string[] = [];
	let depth = 0;
	let current = "";
	for (const char of text) {
		if (char === "{") depth++;
		if (char === "}") depth = Math.max(0, depth - 1);
		if (char === "," && depth === 0) {
			items.push(current);
			current = "";
		} else {
			current += char;
		}
	}
	items.push(current);
	return items.map(unquote).filter((item) => item.length > 0);
}

function readScalar(raw: string): FrontmatterValue {
	const value = raw.trim();
	if (value === "true") return true;
	if (value === "false") return false;
	if (value.startsWith("[") && value.endsWith("]")) return splitList(value.slice(1, -1));
	return unquote(value);
}

export function readFrontmatter(text: string): Frontmatter {
	const normalized = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");
	if (!normalized.startsWith("---\n")) return { fields: {}, body: normalized };
	const end = normalized.indexOf("\n---", 3);
	if (end === -1) return { fields: {}, body: normalized };
	const fields: Record<string, FrontmatterValue> = {};
	let listKey: string | undefined;
	for (const line of normalized.slice(4, end).split("\n")) {
		const item = line.match(/^\s*-\s+(.*)$/);
		if (item && listKey) {
			const current = fields[listKey];
			fields[listKey] = [...(Array.isArray(current) ? current : []), unquote(item[1])];
			continue;
		}
		const pair = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
		if (!pair) continue;
		const [, key, raw] = pair;
		if (raw.trim() === "") {
			// `globs:` followed by `- item` lines.
			listKey = key;
			fields[key] = [];
			continue;
		}
		listKey = undefined;
		fields[key] = readScalar(raw);
	}
	const rest = normalized.slice(end + 4);
	return { fields, body: rest.startsWith("\n") ? rest.slice(1) : rest };
}

/** `a, b`, `[a, b]` and a `- item` list all mean the same list of patterns. */
export function listOf(value: FrontmatterValue | undefined): string[] {
	if (value === undefined || typeof value === "boolean") return [];
	if (typeof value === "string") return splitList(value);
	return value.map(unquote).filter((item) => item.length > 0);
}
