#!/usr/bin/env node

// Merges the update feed files that electron-builder writes beside the desktop installers (latest-mac.yml,
// latest.yml, latest-linux.yml, latest-linux-arm64.yml) into the one file a release attaches.
//
// Problem: the desktop app updates itself with electron-updater, which reads one feed file per system from the newest
// release and picks its own architecture's file from the list in it. Each build job writes a feed that lists only its
// own files, and the two macOS jobs (x64, arm64) both write latest-mac.yml, the two Windows jobs both write
// latest.yml. Attaching either one would send every Mac, or every Windows PC, the other job's architecture.
// Solution: one file that lists the files of both jobs.
//
//   node scripts/merge-update-info.mjs --out updates/latest-mac.yml [--assets dist] \
//     macos-x64/latest-mac.yml macos-arm64/latest-mac.yml
//
// - The first feed's other fields (path, sha512, releaseDate, ...) are kept, so pass the x64 feed first: an old
//   updater that reads only `path` then gets the build that runs on both architectures.
// - With --assets, every listed file must be among the release's files in that folder, and its sha512 and size come
//   from that copy: the macOS job signs and staples the disk image after electron-builder wrote the feed. A file that
//   changed also loses its blockMapSize, and its .blockmap beside --out is deleted, since it no longer matches. A file
//   listed without a size (electron-builder writes none for the Windows installer) gets one: the app shows it before
//   it asks to download.
//
// The feed files are YAML, but only what electron-builder writes is read (top-level scalars, block scalars such as
// releaseNotes, and the `files` list of flat mappings); anything else is an error rather than a guess. Values pass
// through as written, so a single feed comes out byte for byte as it went in.

import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";

const TOP_FIELD = /^([A-Za-z_][\w-]*):(?: (.*))?$/;
const ITEM_START = /^ {2}- ([A-Za-z_][\w-]*): (.*)$/;
const ITEM_FIELD = /^ {4}([A-Za-z_][\w-]*): (.*)$/;
const BLOCK_SCALAR = /^[|>](?:[1-9]?[-+]?|[-+][1-9])$/;

/**
 * Reads a feed file into its top-level fields, in order: `{ key, raw }` for a value (the YAML text after the key,
 * with the lines that follow for a block scalar), and `{ key: "files", entries }` for the list, each entry a list of
 * `{ key, raw }`.
 */
export function parseUpdateInfo(text, name = "feed") {
	const lines = text.replace(/\r\n/g, "\n").split("\n");
	const fields = [];
	let index = 0;
	const fail = (message) => {
		throw new Error(`${name}:${index + 1}: ${message}`);
	};
	while (index < lines.length) {
		const line = lines[index];
		if (line.trim() === "" || line.startsWith("#")) {
			index++;
			continue;
		}
		const match = TOP_FIELD.exec(line);
		if (!match) fail(`unexpected line: ${line}`);
		const [, key, raw = ""] = match;
		if (fields.some((field) => field.key === key)) fail(`"${key}" appears twice`);
		index++;
		if (raw === "") {
			if (key !== "files") fail(`only "files" may hold a list, not "${key}"`);
			const entries = [];
			while (index < lines.length && lines[index].startsWith("  ")) {
				const start = ITEM_START.exec(lines[index]);
				const field = start ? null : ITEM_FIELD.exec(lines[index]);
				if (start) entries.push([{ key: start[1], raw: start[2] }]);
				else if (field && entries.length > 0) entries.at(-1).push({ key: field[1], raw: field[2] });
				else fail(`unexpected line in files: ${lines[index]}`);
				index++;
			}
			fields.push({ key, entries });
			continue;
		}
		if (BLOCK_SCALAR.test(raw)) {
			const block = [raw];
			while (index < lines.length && (lines[index].startsWith("  ") || lines[index].trim() === "")) {
				block.push(lines[index]);
				index++;
			}
			// Blank lines after the block end it, unless its chomping keeps them (+).
			if (!raw.includes("+")) while (block.length > 1 && block.at(-1).trim() === "") block.pop();
			fields.push({ key, raw: block.join("\n") });
			continue;
		}
		fields.push({ key, raw });
	}
	return fields;
}

/** Writes fields read by parseUpdateInfo back as YAML, in the layout electron-builder uses. */
export function formatUpdateInfo(fields) {
	const lines = [];
	for (const field of fields) {
		if (!field.entries) {
			lines.push(`${field.key}: ${field.raw}`);
			continue;
		}
		lines.push(`${field.key}:`);
		for (const entry of field.entries) {
			for (const [position, item] of entry.entries()) {
				lines.push(`${position === 0 ? "  - " : "    "}${item.key}: ${item.raw}`);
			}
		}
	}
	return `${lines.join("\n")}\n`;
}

/** The value of a one-line YAML scalar: plain, 'single-quoted' or "double-quoted". */
export function scalarValue(raw) {
	const text = raw.trim();
	if (text.startsWith("'")) {
		if (text.length < 2 || !text.endsWith("'")) throw new Error(`unterminated quoted value: ${raw}`);
		return text.slice(1, -1).replaceAll("''", "'");
	}
	if (text.startsWith('"')) return JSON.parse(text);
	return text;
}

const fieldOf = (fields, key) => fields.find((field) => field.key === key);

function requiredValue(fields, key, where) {
	const field = fieldOf(fields, key);
	if (!field || field.entries) throw new Error(`${where} has no ${key}`);
	return scalarValue(field.raw);
}

/**
 * One feed from several feeds of the same release: the first feed's fields, with the files of all of them in the
 * order given. `feeds` is a list of `{ name, fields }`.
 */
export function mergeUpdateInfo(feeds) {
	if (feeds.length === 0) throw new Error("no feed to merge");
	const version = requiredValue(feeds[0].fields, "version", feeds[0].name);
	const files = [];
	const byUrl = new Map();
	for (const { name, fields } of feeds) {
		const own = requiredValue(fields, "version", name);
		if (own !== version) throw new Error(`${name} is for version ${own}, ${feeds[0].name} for ${version}`);
		const list = fieldOf(fields, "files");
		if (!list?.entries?.length) throw new Error(`${name} lists no files`);
		for (const entry of list.entries) {
			const url = requiredValue(entry, "url", `a file in ${name}`);
			const sha512 = requiredValue(entry, "sha512", `${url} in ${name}`);
			const known = byUrl.get(url);
			if (known && known.sha512 !== sha512) {
				throw new Error(`${url} has different checksums in ${known.name} and ${name}`);
			}
			if (known) continue;
			byUrl.set(url, { name, sha512 });
			files.push(entry.map((item) => ({ ...item })));
		}
	}
	return feeds[0].fields.map((field) => (field.entries ? { key: field.key, entries: files } : { ...field }));
}

async function digest(file) {
	const hash = createHash("sha512");
	await pipeline(createReadStream(file), hash);
	return { sha512: hash.digest("base64"), size: statSync(file).size };
}

/**
 * Checks every listed file against the release's copy in `assetsDir` and takes its sha512 and size from that copy.
 * Answers with the files that differed.
 */
export async function refreshFromAssets(fields, assetsDir) {
	const refreshed = [];
	const entries = fieldOf(fields, "files")?.entries ?? [];
	for (const entry of entries) {
		const url = requiredValue(entry, "url", "a file");
		const file = join(assetsDir, url);
		if (basename(url) !== url || !existsSync(file)) {
			throw new Error(`${url} is in the feed but not among the release's files in ${assetsDir}`);
		}
		const actual = await digest(file);
		const shaField = fieldOf(entry, "sha512");
		const sizeField = fieldOf(entry, "size");
		if (!sizeField) entry.splice(entry.indexOf(shaField) + 1, 0, { key: "size", raw: String(actual.size) });
		const sameSize = !sizeField || Number(scalarValue(sizeField.raw)) === actual.size;
		if (scalarValue(shaField.raw) === actual.sha512 && sameSize) continue;
		shaField.raw = actual.sha512;
		if (sizeField) sizeField.raw = String(actual.size);
		const blockMapSize = entry.findIndex((item) => item.key === "blockMapSize");
		if (blockMapSize >= 0) entry.splice(blockMapSize, 1);
		refreshed.push(url);
	}
	// The legacy top-level path and sha512 describe one of the files.
	const pathField = fieldOf(fields, "path");
	const topSha = fieldOf(fields, "sha512");
	const named =
		pathField && entries.find((entry) => requiredValue(entry, "url", "a file") === scalarValue(pathField.raw));
	if (named && topSha) topSha.raw = fieldOf(named, "sha512").raw;
	return refreshed;
}

function parseArgs(argv) {
	const options = { out: undefined, assets: undefined, inputs: [] };
	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index];
		if (arg === "--out" || arg === "--assets") {
			const value = argv[++index];
			if (!value) throw new Error(`${arg} needs a path`);
			options[arg.slice(2)] = value;
		} else if (arg.startsWith("--")) {
			throw new Error(`unknown option ${arg}`);
		} else {
			options.inputs.push(arg);
		}
	}
	if (!options.out) throw new Error("--out is required");
	if (options.inputs.length === 0) throw new Error("no feed file given");
	return options;
}

async function main(argv) {
	const { out, assets, inputs } = parseArgs(argv);
	const feeds = inputs.map((name) => ({ name, fields: parseUpdateInfo(readFileSync(name, "utf8"), name) }));
	const merged = mergeUpdateInfo(feeds);
	const refreshed = assets ? await refreshFromAssets(merged, assets) : [];
	mkdirSync(dirname(out), { recursive: true });
	writeFileSync(out, formatUpdateInfo(merged));
	for (const url of refreshed) {
		rmSync(join(dirname(out), `${url}.blockmap`), { force: true });
		console.log(`${url} changed after the feed was written: its checksum and size now come from the release's copy`);
	}
	const urls = fieldOf(merged, "files").entries.map((entry) => requiredValue(entry, "url", "a file"));
	console.log(`${out}: ${urls.join(", ")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main(process.argv.slice(2)).catch((error) => {
		console.error(`merge-update-info: ${error.message}`);
		process.exitCode = 1;
	});
}
