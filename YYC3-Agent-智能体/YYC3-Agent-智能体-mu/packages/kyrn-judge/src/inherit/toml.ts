/**
 * A reader for one shape of TOML: the `[mcp_servers.<name>]` tables of
 * Codex's `config.toml`, with their `env` and header sub-tables, dotted keys
 * and inline tables. It is not a TOML parser and does not want to be one: the
 * rest of the file is walked over (so that a `[mcp_servers.x]` inside somebody's
 * multi-line string is not taken for a table) and thrown away.
 */
export type TomlValue = string | number | boolean | TomlValue[] | { [key: string]: TomlValue };

const ROOT = "mcp_servers";

class Cursor {
	readonly text: string;
	pos = 0;

	constructor(text: string) {
		this.text = text;
	}

	get done(): boolean {
		return this.pos >= this.text.length;
	}

	peek(length = 1): string {
		return this.text.slice(this.pos, this.pos + length);
	}

	line(): number {
		return this.text.slice(0, this.pos).split("\n").length;
	}

	fail(message: string): never {
		throw new Error(`line ${this.line()}: ${message}`);
	}

	/** Spaces and tabs; with `newlines` also line ends and comments, which arrays and inline tables allow between items. */
	skipSpace(newlines: boolean): void {
		while (!this.done) {
			const char = this.text[this.pos];
			if (char === " " || char === "\t" || (newlines && (char === "\n" || char === "\r"))) this.pos++;
			else if (newlines && char === "#") this.skipLine();
			else break;
		}
	}

	skipLine(): void {
		const end = this.text.indexOf("\n", this.pos);
		this.pos = end === -1 ? this.text.length : end + 1;
	}
}

const ESCAPES: Readonly<Record<string, string>> = {
	b: "\b",
	t: "\t",
	n: "\n",
	f: "\f",
	r: "\r",
	'"': '"',
	"\\": "\\",
};

function readBasicString(cursor: Cursor, multiline: boolean): string {
	const close = multiline ? '"""' : '"';
	cursor.pos += close.length;
	// A newline right after the opening delimiter is not part of the string.
	if (multiline && cursor.peek() === "\n") cursor.pos++;
	let value = "";
	while (!cursor.done) {
		if (cursor.peek(close.length) === close) {
			cursor.pos += close.length;
			return value;
		}
		// Checked before stepping over it, so that the message names the line the string started on.
		if (cursor.peek() === "\n" && !multiline) cursor.fail("a string is not closed");
		const char = cursor.text[cursor.pos++];
		if (char !== "\\") {
			value += char;
			continue;
		}
		const escaped = cursor.text[cursor.pos++];
		if (escaped === "u" || escaped === "U") {
			const length = escaped === "u" ? 4 : 8;
			const code = Number.parseInt(cursor.text.slice(cursor.pos, cursor.pos + length), 16);
			if (Number.isNaN(code)) cursor.fail("a unicode escape is malformed");
			value += String.fromCodePoint(code);
			cursor.pos += length;
		} else if (multiline && (escaped === "\n" || escaped === " " || escaped === "\r")) {
			// A backslash at the end of a line swallows the line break and the indentation after it.
			while (!cursor.done && /\s/.test(cursor.peek())) cursor.pos++;
		} else {
			value += ESCAPES[escaped] ?? escaped;
		}
	}
	return cursor.fail("a string is not closed");
}

function readLiteralString(cursor: Cursor, multiline: boolean): string {
	const close = multiline ? "'''" : "'";
	cursor.pos += close.length;
	if (multiline && cursor.peek() === "\n") cursor.pos++;
	const end = cursor.text.indexOf(close, cursor.pos);
	if (end === -1) cursor.fail("a string is not closed");
	const value = cursor.text.slice(cursor.pos, end);
	if (!multiline && value.includes("\n")) cursor.fail("a string is not closed");
	cursor.pos = end + close.length;
	return value;
}

function readString(cursor: Cursor): string {
	if (cursor.peek(3) === '"""') return readBasicString(cursor, true);
	if (cursor.peek(3) === "'''") return readLiteralString(cursor, true);
	return cursor.peek() === '"' ? readBasicString(cursor, false) : readLiteralString(cursor, false);
}

function readValue(cursor: Cursor): TomlValue {
	const char = cursor.peek();
	if (char === '"' || char === "'") return readString(cursor);
	if (char === "[") {
		cursor.pos++;
		const items: TomlValue[] = [];
		for (;;) {
			cursor.skipSpace(true);
			if (cursor.done) cursor.fail("an array is not closed");
			if (cursor.peek() === "]") break;
			items.push(readValue(cursor));
			cursor.skipSpace(true);
			if (cursor.peek() === ",") cursor.pos++;
			else if (cursor.peek() !== "]") cursor.fail("an array is malformed");
		}
		cursor.pos++;
		return items;
	}
	if (char === "{") {
		cursor.pos++;
		const table: { [key: string]: TomlValue } = {};
		for (;;) {
			cursor.skipSpace(true);
			if (cursor.done) cursor.fail("an inline table is not closed");
			if (cursor.peek() === "}") break;
			const path = readKeyPath(cursor);
			cursor.skipSpace(false);
			if (cursor.peek() !== "=") cursor.fail("an inline table is malformed");
			cursor.pos++;
			cursor.skipSpace(false);
			assign(table, path, readValue(cursor));
			cursor.skipSpace(true);
			if (cursor.peek() === ",") cursor.pos++;
			else if (cursor.peek() !== "}") cursor.fail("an inline table is malformed");
		}
		cursor.pos++;
		return table;
	}
	// Booleans, numbers and everything this reader has no use for (dates): up to the end of the value.
	const match = /^[^,\]}#\n\r]*/.exec(cursor.text.slice(cursor.pos));
	const token = (match?.[0] ?? "").trim();
	cursor.pos += match?.[0].length ?? 0;
	if (!token) cursor.fail("a value is missing");
	if (token === "true") return true;
	if (token === "false") return false;
	const number = Number(token.replace(/_/g, ""));
	return Number.isNaN(number) ? token : number;
}

/** `a.b."c d"`: bare, quoted and dotted keys. */
function readKeyPath(cursor: Cursor): string[] {
	const path: string[] = [];
	for (;;) {
		cursor.skipSpace(false);
		const char = cursor.peek();
		if (char === '"' || char === "'") {
			path.push(readString(cursor));
		} else {
			const match = /^[A-Za-z0-9_-]+/.exec(cursor.text.slice(cursor.pos));
			if (!match) cursor.fail("a key is malformed");
			path.push(match[0]);
			cursor.pos += match[0].length;
		}
		cursor.skipSpace(false);
		if (cursor.peek() !== ".") return path;
		cursor.pos++;
	}
}

function assign(target: { [key: string]: TomlValue }, path: readonly string[], value: TomlValue): void {
	let table = target;
	for (const key of path.slice(0, -1)) {
		const next = table[key];
		if (typeof next !== "object" || next === null || Array.isArray(next)) table[key] = {};
		table = table[key] as { [key: string]: TomlValue };
	}
	const last = path[path.length - 1];
	const existing = table[last];
	const mergeable = (entry: TomlValue | undefined): entry is { [key: string]: TomlValue } =>
		typeof entry === "object" && entry !== null && !Array.isArray(entry);
	// `[mcp_servers.x.env]` may come before or after `[mcp_servers.x]`: tables merge, they do not replace.
	table[last] = mergeable(existing) && mergeable(value) ? { ...existing, ...value } : value;
}

/**
 * The `mcp_servers` tables of a TOML document, keyed by server name.
 * Throws with a line number when a string, array or inline table never closes;
 * any other line it cannot read is skipped.
 */
export function readMcpServerTables(text: string): Record<string, { [key: string]: TomlValue }> {
	const cursor = new Cursor(text.replace(/^﻿/, "").replace(/\r\n/g, "\n"));
	const root: { [key: string]: TomlValue } = {};
	let table: string[] = [];
	/** Array-of-tables (`[[x]]`) never hold server definitions: their keys are read and dropped. */
	let ignored = false;
	while (!cursor.done) {
		cursor.skipSpace(true);
		if (cursor.done) break;
		if (cursor.peek() === "[") {
			ignored = cursor.peek(2) === "[[";
			cursor.pos += ignored ? 2 : 1;
			try {
				table = readKeyPath(cursor);
			} catch {
				table = [];
				ignored = true;
			}
			cursor.skipLine();
			if (!ignored && table[0] === ROOT && table.length >= 2) assign(root, table, {});
			continue;
		}
		const wanted = !ignored && table[0] === ROOT;
		let path: string[];
		try {
			path = readKeyPath(cursor);
			cursor.skipSpace(false);
			if (cursor.peek() !== "=") throw new Error("not a key");
		} catch {
			cursor.skipLine();
			continue;
		}
		cursor.pos++;
		cursor.skipSpace(false);
		// Values outside the tables of interest are still read, so that their strings and arrays are stepped over whole.
		const value = readValue(cursor);
		cursor.skipLine();
		const full = [...table, ...path];
		if ((wanted || (table.length === 0 && full[0] === ROOT)) && full.length >= 2) assign(root, full, value);
	}
	const servers = root[ROOT];
	if (typeof servers !== "object" || servers === null || Array.isArray(servers)) return {};
	const tables: Record<string, { [key: string]: TomlValue }> = {};
	for (const [name, definition] of Object.entries(servers)) {
		if (typeof definition === "object" && definition !== null && !Array.isArray(definition)) {
			tables[name] = definition;
		}
	}
	return tables;
}
