#!/usr/bin/env node
/**
 * A language server for tests. It speaks the real framing over stdio and
 * derives diagnostics from markers in the document text, so a test scripts
 * every document version by writing the file it wants:
 *
 *   !error CODE message    an error on that line (also !warn, !info, !hint)
 *   !needs NAME            an error unless some open document has "!provides NAME"
 *   !crash                 the process exits with code 7 on reading the document
 *
 * Behaviour comes from a JSON object in argv[2]:
 *   pull          advertise diagnosticProvider and answer textDocument/diagnostic instead of publishing
 *   versioned     put the document version into publishDiagnostics (default true)
 *   delayMs       wait before publishing or answering a pull
 *   quietWhenClean  say nothing about a document that has and had no diagnostics
 *   progressMs    report work-done progress for this long after `initialized`
 *   hang          a method that is never answered
 *   log           a file that gets one line per start and per received method
 *   stderr        text written to stderr at start
 */
import { appendFileSync } from "node:fs";

const config = JSON.parse(process.argv[2] ?? "{}");
const log = (line) => config.log && appendFileSync(config.log, `${line}\n`);
log(`start ${process.pid}`);
if (config.stderr) process.stderr.write(config.stderr);

const SEVERITY = { error: 1, warn: 2, info: 3, hint: 4 };
const documents = new Map();
const published = new Map();
let nextRequestId = 1000;

function send(message) {
	const body = Buffer.from(JSON.stringify({ jsonrpc: "2.0", ...message }), "utf8");
	process.stdout.write(Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`), body]));
}

function diagnosticsOf(uri) {
	const provided = new Set();
	for (const { text } of documents.values()) {
		for (const match of text.matchAll(/!provides (\S+)/g)) provided.add(match[1]);
	}
	const diagnostics = [];
	(documents.get(uri)?.text ?? "").split("\n").forEach((content, line) => {
		const marker = /!(error|warn|info|hint) (\S+) (.*)$/.exec(content);
		const range = (index, length) => ({ start: { line, character: index }, end: { line, character: index + length } });
		if (marker) {
			diagnostics.push({
				range: range(marker.index, marker[0].length),
				severity: SEVERITY[marker[1]],
				code: marker[2],
				source: "fake",
				message: marker[3],
			});
		}
		const needs = /!needs (\S+)/.exec(content);
		if (needs && !provided.has(needs[1])) {
			diagnostics.push({
				range: range(needs.index, needs[0].length),
				severity: 1,
				code: "E_NEEDS",
				source: "fake",
				message: `Missing ${needs[1]}`,
			});
		}
	});
	return diagnostics;
}

function publishAll() {
	for (const [uri, document] of documents) {
		const diagnostics = diagnosticsOf(uri);
		const serialized = JSON.stringify(diagnostics);
		const before = published.get(uri);
		if (config.quietWhenClean && diagnostics.length === 0 && (before === undefined || before === "[]")) continue;
		// Like most servers: a document whose diagnostics did not change is not published again, the changed one always is.
		if (before === serialized && !document.dirty) continue;
		document.dirty = false;
		published.set(uri, serialized);
		const version = document.version;
		setTimeout(() => {
			send({
				method: "textDocument/publishDiagnostics",
				params: { uri, diagnostics, ...(config.versioned === false ? {} : { version }) },
			});
		}, config.delayMs ?? 0);
	}
}

function changed(uri, text, version) {
	if (text.includes("!crash")) process.exit(7);
	documents.set(uri, { text, version, dirty: true });
	if (!config.pull) publishAll();
}

function handle(message) {
	const { id, method, params } = message;
	if (method === undefined) return log(`response ${JSON.stringify(message.result ?? message.error ?? null)}`);
	log(method);
	if (method === config.hang) return;
	const reply = (result) => id !== undefined && send({ id, result });
	switch (method) {
		case "initialize":
			return reply({
				capabilities: {
					textDocumentSync: { openClose: true, change: 1, save: { includeText: false } },
					...(config.pull ? { diagnosticProvider: { interFileDependencies: true, workspaceDiagnostics: false } } : {}),
				},
				serverInfo: { name: "fake-lsp", version: "1" },
			});
		case "initialized":
			send({ id: nextRequestId++, method: "workspace/configuration", params: { items: [{ section: "fake" }] } });
			if (config.progressMs) {
				send({ id: nextRequestId++, method: "window/workDoneProgress/create", params: { token: "index" } });
				send({ method: "$/progress", params: { token: "index", value: { kind: "begin", title: "Indexing" } } });
				setTimeout(
					() => send({ method: "$/progress", params: { token: "index", value: { kind: "end" } } }),
					config.progressMs,
				);
			}
			return;
		case "textDocument/didOpen":
			return changed(params.textDocument.uri, params.textDocument.text, params.textDocument.version);
		case "textDocument/didChange":
			return changed(params.textDocument.uri, params.contentChanges.at(-1).text, params.textDocument.version);
		case "textDocument/didClose":
			documents.delete(params.textDocument.uri);
			published.delete(params.textDocument.uri);
			return;
		case "textDocument/diagnostic": {
			const items = diagnosticsOf(params.textDocument.uri);
			const resultId = JSON.stringify(items);
			const report =
				params.previousResultId === resultId ? { kind: "unchanged", resultId } : { kind: "full", resultId, items };
			return setTimeout(() => reply(report), config.delayMs ?? 0);
		}
		case "shutdown":
			return reply(null);
		case "exit":
			return process.exit(0);
		default:
			if (id !== undefined) send({ id, error: { code: -32601, message: `Unknown method ${method}` } });
	}
}

let buffer = Buffer.alloc(0);
process.stdin.on("data", (chunk) => {
	buffer = Buffer.concat([buffer, chunk]);
	while (true) {
		const headerEnd = buffer.indexOf("\r\n\r\n");
		if (headerEnd < 0) return;
		const length = Number(/content-length: *(\d+)/i.exec(buffer.subarray(0, headerEnd).toString("ascii"))?.[1]);
		if (buffer.length < headerEnd + 4 + length) return;
		const body = buffer.subarray(headerEnd + 4, headerEnd + 4 + length).toString("utf8");
		buffer = buffer.subarray(headerEnd + 4 + length);
		handle(JSON.parse(body));
	}
});
process.stdin.on("end", () => process.exit(0));
