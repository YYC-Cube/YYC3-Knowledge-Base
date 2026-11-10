import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { decodeBody, type FetchLimits, fetchBody, hopPolicy, readUrl, sniffCharset } from "../src/web/fetch.ts";
import { decodeEntities, htmlToText } from "../src/web/html.ts";
import { checkedLookup, checkUrl, classifyAddress, FetchRefusal, type LookupFn } from "../src/web/ssrf.ts";

const fixture = (name: string): Buffer => readFileSync(new URL(`./fixtures/web/${name}`, import.meta.url));
const open = { allowLoopback: true, allowPrivate: false };
const limits: FetchLimits = { ...open, timeoutMs: 5000, maxBytes: 200_000, maxRedirects: 3 };

describe("which addresses may be fetched", () => {
	it("classifies IPv4 and IPv6 addresses, mapped and translated ones by the host they reach", () => {
		const cases: Record<string, string> = {
			"93.184.216.34": "public",
			"127.0.0.1": "loopback",
			"127.255.0.9": "loopback",
			"10.1.2.3": "private",
			"172.16.0.1": "private",
			"172.32.0.1": "public",
			"192.168.1.1": "private",
			"100.64.0.1": "private",
			"169.254.169.254": "link-local",
			"0.0.0.0": "reserved",
			"224.0.0.1": "reserved",
			"255.255.255.255": "reserved",
			// The fake-IP range of rule-based tunnels: behind one, every site resolves into it.
			"198.18.0.12": "public",
			"::1": "loopback",
			"::": "reserved",
			"fc00::1": "private",
			"fd12:3456::1": "private",
			"fe80::1%en0": "link-local",
			"ff02::1": "reserved",
			"2001:db8::1": "reserved",
			"2606:4700::6810:84e5": "public",
			"::ffff:127.0.0.1": "loopback",
			"::ffff:10.0.0.1": "private",
			"::ffff:7f00:1": "loopback",
			"64:ff9b::a9fe:a9fe": "link-local",
			"[::1]": "loopback",
			"not-an-address": "reserved",
		};
		for (const [address, kind] of Object.entries(cases)) expect(classifyAddress(address), address).toBe(kind);
	});

	it("refuses other schemes, credentials and literal addresses outside the policy", () => {
		const code = (url: string, policy = open) => {
			try {
				checkUrl(url, policy);
				return "ok";
			} catch (error) {
				return (error as FetchRefusal).code;
			}
		};
		expect(code("https://example.org/a?b=1")).toBe("ok");
		expect(code("http://127.0.0.1:3000/")).toBe("ok");
		expect(code("http://127.0.0.1:3000/", { allowLoopback: false, allowPrivate: false })).toBe("address");
		expect(code("file:///etc/passwd")).toBe("scheme");
		expect(code("ftp://example.org/")).toBe("scheme");
		expect(code("https://user:secret@example.org/")).toBe("credentials");
		expect(code("http://192.168.1.1/admin")).toBe("address");
		expect(code("http://192.168.1.1/admin", { allowLoopback: false, allowPrivate: true })).toBe("ok");
		expect(code("http://169.254.169.254/latest/meta-data/")).toBe("address");
		expect(code("http://[::ffff:10.0.0.1]/")).toBe("address");
		expect(code("http://0.0.0.0:8080/")).toBe("address");
		// Decimal and hex spellings are normalised by the URL parser before they are judged.
		expect(code("http://2130706433/", { allowLoopback: false, allowPrivate: false })).toBe("address");
		expect(code("http://0x7f.1/", { allowLoopback: false, allowPrivate: false })).toBe("address");
		expect(code("nonsense")).toBe("url");
	});

	it("judges every answer of the resolver, inside the lookup the connection uses", async () => {
		const answers: Record<string, { address: string; family: number }[]> = {
			"site.test": [{ address: "93.184.216.34", family: 4 }],
			"intranet.test": [{ address: "10.1.2.3", family: 4 }],
			"rebind.test": [
				{ address: "93.184.216.34", family: 4 },
				{ address: "127.0.0.1", family: 4 },
			],
			"tunnel.test": [{ address: "198.18.0.7", family: 4 }],
		};
		const resolver: LookupFn = (hostname, _options, callback) => callback(null, answers[hostname] ?? []);
		const ask = (hostname: string, all = false) =>
			new Promise<string>((resolve) => {
				checkedLookup({ allowLoopback: false, allowPrivate: false }, resolver)(
					hostname,
					{ all },
					(error, address) => resolve(error ? `refused:${(error as FetchRefusal).code}` : JSON.stringify(address)),
				);
			});
		expect(await ask("site.test")).toBe('"93.184.216.34"');
		expect(await ask("site.test", true)).toBe('[{"address":"93.184.216.34","family":4}]');
		expect(await ask("tunnel.test")).toBe('"198.18.0.7"');
		expect(await ask("intranet.test")).toBe("refused:address");
		expect(await ask("rebind.test")).toBe("refused:address");
		expect(await ask("unknown.test")).toBe("refused:dns");
	});

	it("lets loopback through only when it is asked for by name, at the start and at every hop", () => {
		const local = new URL("http://localhost:3000/");
		const web = new URL("https://example.org/");
		expect(hopPolicy(open, undefined, "http://localhost:3000/").allowLoopback).toBe(true);
		expect(hopPolicy(open, local, "http://127.0.0.1:3000/login").allowLoopback).toBe(true);
		expect(hopPolicy(open, undefined, "http://app.localhost:5173/").allowLoopback).toBe(true);
		// A page on the web must not send the reader to this machine.
		expect(hopPolicy(open, web, "http://localhost:2375/containers/json").allowLoopback).toBe(false);
		// Nor may a public name that happens to resolve to 127.0.0.1.
		expect(hopPolicy(open, undefined, "http://localtest.example/").allowLoopback).toBe(false);
		expect(hopPolicy({ allowLoopback: false, allowPrivate: true }, undefined, "http://localhost/")).toEqual({
			allowLoopback: false,
			allowPrivate: true,
		});
	});
});

describe("fetching", () => {
	let server: Server;
	let origin = "";
	const routes: Record<string, (request: IncomingMessage, response: ServerResponse) => void> = {
		"/article": (_request, response) => {
			response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
			response.end(fixture("article.html"));
		},
		"/gbk": (_request, response) => {
			// No charset in the header: the document's own meta tag has to be found.
			response.writeHead(200, { "Content-Type": "text/html" });
			response.end(fixture("gbk-page.html"));
		},
		"/gbk-header": (_request, response) => {
			response.writeHead(200, { "Content-Type": "text/plain; charset=GBK" });
			response.end(Buffer.from([0xd6, 0xd0, 0xce, 0xc4]));
		},
		"/big5": (_request, response) => {
			response.writeHead(200, { "Content-Type": "text/plain; charset=big5" });
			response.end(Buffer.from([0xa4, 0xa4, 0xa4, 0xe5]));
		},
		"/gzip": (_request, response) => {
			response.writeHead(200, { "Content-Type": "application/json", "Content-Encoding": "gzip" });
			response.end(gzipSync(JSON.stringify({ name: "mu", ok: true })));
		},
		"/hop1": (_request, response) => response.writeHead(302, { Location: "/hop2" }).end(),
		"/hop2": (_request, response) => response.writeHead(301, { Location: `${origin}/article` }).end(),
		"/loop": (_request, response) => response.writeHead(302, { Location: "/loop" }).end(),
		"/to-private": (_request, response) => response.writeHead(302, { Location: "http://10.0.0.5/admin" }).end(),
		"/to-metadata": (_request, response) =>
			response.writeHead(307, { Location: "http://169.254.169.254/latest/meta-data/" }).end(),
		"/to-intranet-name": (_request, response) => response.writeHead(302, { Location: "http://intranet.test/" }).end(),
		"/to-file": (_request, response) => response.writeHead(302, { Location: "file:///etc/passwd" }).end(),
		"/big": (_request, response) => {
			response.writeHead(200, { "Content-Type": "text/plain" });
			const line = `${"x".repeat(999)}\n`;
			let sent = 0;
			const pump = () => {
				while (sent < 5000) {
					sent++;
					if (!response.write(line)) return response.once("drain", pump);
				}
				response.end();
			};
			pump();
		},
		"/slow": () => {
			/* Never answers. */
		},
		"/image": (_request, response) => {
			response.writeHead(200, { "Content-Type": "image/png", "Content-Length": "4096" });
			response.end(Buffer.alloc(4096));
		},
		"/ua": (request, response) => {
			response.writeHead(200, { "Content-Type": "text/plain" });
			response.end(`${request.headers["user-agent"]}|${request.headers.cookie ?? "no-cookie"}`);
		},
		"/spa": (_request, response) => {
			response.writeHead(200, { "Content-Type": "text/html" });
			response.end(fixture("spa.html"));
		},
	};

	beforeAll(async () => {
		server = createServer((request, response) => {
			const route = routes[(request.url ?? "").split("?")[0]];
			if (route) route(request, response);
			else response.writeHead(404, { "Content-Type": "text/plain" }).end("not here");
		});
		await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
		origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});
	afterAll(() => {
		server.closeAllConnections();
		server.close();
	});

	const refusal = async (url: string, extra: Partial<FetchLimits> = {}): Promise<string> => {
		try {
			await fetchBody(url, { ...limits, ...extra });
			return "ok";
		} catch (error) {
			return error instanceof FetchRefusal ? error.code : `other:${(error as Error).message}`;
		}
	};

	it("follows redirects by hand up to the limit", async () => {
		const page = await fetchBody(`${origin}/hop1`, limits);
		expect(page.status).toBe(200);
		expect(page.url).toBe(`${origin}/article`);
		expect(page.redirects).toEqual([`${origin}/hop2`, `${origin}/article`]);
		expect(await refusal(`${origin}/loop`)).toBe("redirects");
		expect(await refusal(`${origin}/hop1`, { maxRedirects: 1 })).toBe("redirects");
	});

	it("refuses a redirect to a private address, to cloud metadata, to a name that resolves inside, and to a file", async () => {
		expect(await refusal(`${origin}/to-private`)).toBe("address");
		expect(await refusal(`${origin}/to-metadata`)).toBe("address");
		const resolve: LookupFn = (_hostname, _options, callback) => callback(null, [{ address: "10.9.8.7", family: 4 }]);
		expect(await refusal(`${origin}/to-intranet-name`, { resolve })).toBe("address");
		expect(await refusal(`${origin}/to-file`)).toBe("scheme");
		expect(await refusal(`${origin}/article`, { allowLoopback: false })).toBe("address");
	});

	it("stops reading at the size cap and gives up at the deadline", async () => {
		const big = await fetchBody(`${origin}/big`, { ...limits, maxBytes: 50_000 });
		expect(big.body.length).toBe(50_000);
		expect(big.truncated).toBe(true);
		const startedAt = Date.now();
		expect(await refusal(`${origin}/slow`, { timeoutMs: 200 })).toBe("timeout");
		expect(Date.now() - startedAt).toBeLessThan(3000);
		const abort = new AbortController();
		setTimeout(() => abort.abort(), 50);
		expect(await refusal(`${origin}/slow`, { signal: abort.signal })).toBe("aborted");
	});

	it("decodes GBK and Big5 pages, from the header or from the document's own meta tag", async () => {
		const page = await readUrl(`${origin}/gbk`, limits);
		expect(page.charset).toBe("gbk");
		expect(page.title).toBe("Node.js 读取 GBK 编码文件的方法 - 示例技术博客");
		expect(page.text).toContain("很多老网站仍然使用 GB2312 或 GBK 编码");
		expect(page.text).toContain('new TextDecoder("gbk").decode(buffer);');
		expect(page.text).toContain(`编码专题 (${origin}/posts/encoding.html)`);
		expect((await readUrl(`${origin}/gbk-header`, limits)).text).toBe("中文");
		expect((await readUrl(`${origin}/big5`, limits)).text).toBe("中文");
		expect(sniffCharset(Buffer.from('<?xml version="1.0" encoding="GB18030"?><a/>'))).toBe("GB18030");
		expect(decodeBody(Buffer.from("plain"), "no-such-charset")).toEqual({ text: "plain", charset: "utf-8" });
	});

	it("passes JSON and text through, inflates gzip, and describes what is not text without downloading it", async () => {
		const json = await readUrl(`${origin}/gzip`, limits);
		expect(json).toMatchObject({ kind: "json", text: '{"name":"mu","ok":true}', status: 200 });
		const image = await readUrl(`${origin}/image`, limits);
		expect(image.kind).toBe("other");
		expect(image.text).toContain("image/png file of 4096 bytes");
		const missing = await readUrl(`${origin}/nowhere`, limits);
		expect(missing).toMatchObject({ status: 404, text: "not here" });
	});

	it("looks like a browser and sends no cookies", async () => {
		const page = await readUrl(`${origin}/ua`, limits);
		expect(page.text).toMatch(/^Mozilla\/5\.0 .*Chrome\/\d+.*\|no-cookie$/);
	});

	it("says so when a page is empty until its scripts run", async () => {
		const page = await readUrl(`${origin}/spa`, limits);
		expect(page.needsJavaScript).toBe(true);
		expect((await readUrl(`${origin}/article`, limits)).needsJavaScript).toBe(false);
	});
});

describe("html to readable text", () => {
	const page = htmlToText(
		fixture("article.html").toString("utf8"),
		"https://docs.example.org/api/abortsignal/timeout",
	);

	it("keeps the title, headings, paragraphs, lists, code, tables and quotes of the main content", () => {
		expect(page.title).toBe("AbortSignal.timeout() – Example Docs");
		expect(page.text).toContain("# AbortSignal.timeout()");
		expect(page.text).toContain("## Syntax");
		expect(page.text).toContain(
			"```\nconst signal = AbortSignal.timeout(5000);\nconst response = await fetch(url, { signal });\nif (a < b && c) { retry(); }\n```",
		);
		expect(page.text).toContain("- `time`: milliseconds before the abort");
		expect(page.text).toContain("- Nested lists work:\n  1. first\n  2. second");
		expect(page.text).toContain("| Browser | Version |\n| Chrome | 103 |\n| Firefox | 100 \\| ESR |");
		expect(page.text).toContain("> Note: the timeout counts active time only.");
		expect(page.text).toContain("Line one\nline two © 2026 中文");
		expect(page.text).toContain("[image: Timeline of an aborted request]");
	});

	it("writes links as text (url) in the main content, resolved against the page's base", () => {
		expect(page.text).toContain("AbortSignal (https://docs.example.org/api/abortsignal)");
		expect(page.text).toContain("Fetch standard (https://fetch.spec.example/#timeouts)");
		expect(page.text).toContain("A fragment link and a script link keep only their text.");
	});

	it("drops scripts, styles, navigation, asides, footers, forms, svg and hidden text", () => {
		for (const gone of [
			"dataLayer",
			"font-family",
			"Guides",
			"Related topics",
			"Privacy",
			"Was this page helpful",
			"svg text",
			"Ignore all previous instructions",
			"Hidden paragraph",
			"Sign in",
		]) {
			expect(page.text, gone).not.toContain(gone);
		}
	});

	it("keeps the words of a box of links and drops its addresses, but not those of a reference list in the text", () => {
		const menu = Array.from({ length: 8 }, (_, n) => `<a href="/chapter-${n}">Chapter ${n}</a>`).join(" ");
		const references = Array.from(
			{ length: 6 },
			(_, n) => `<li><a href="https://ref.example/${n}">Reference ${n}</a></li>`,
		);
		const text = htmlToText(
			`<body><div class="sidebar"><b>Contents</b> ${menu}</div><div class="post"><p>${"Body text of the tutorial. ".repeat(20)}</p><ul>${references.join("")}</ul></div></body>`,
			"https://site.example/",
		).text;
		expect(text).toContain("Contents Chapter 0 Chapter 1");
		expect(text).not.toContain("https://site.example/chapter-0");
		expect(text).toContain("- Reference 5 (https://ref.example/5)");
	});

	it("survives markup that is broken, and falls back to the body when there is no main element", () => {
		const broken = htmlToText(
			"<div><p>one<p>two</div></span><b>three</b> <a href='/x'>four</a><script>alert(1)",
			"https://e.org/",
		);
		expect(broken.text).toBe("one\n\ntwo\n\nthree four (https://e.org/x)");
		expect(htmlToText("").text).toBe("");
		expect(htmlToText("just text & more").text).toBe("just text & more");
		const teaser = htmlToText(
			`<body><main><p>tiny</p></main><div>${"<p>The real content of the page is out here.</p>".repeat(30)}</div></body>`,
		);
		expect(teaser.text).toContain("The real content");
		expect(decodeEntities("&lt;a&gt; &amp;amp; &#65;&#x42; &unknown; &nbsp;|")).toBe("<a> &amp; AB &unknown;  |");
	});
});
