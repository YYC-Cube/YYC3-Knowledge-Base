import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import type { Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import { htmlToText } from "./html.ts";
import { type AddressPolicy, checkedLookup, checkUrl, FetchRefusal, isLoopbackUrl, type LookupFn } from "./ssrf.ts";

/**
 * One GET, read like a careful person would: http and https only, no credentials
 * in the URL, every hop resolved and its address judged (see `ssrf.ts`),
 * redirects followed by hand up to a limit, one deadline for the whole exchange,
 * and the body read as a stream that stops at the size cap.
 *
 * Loopback is allowed only when the caller asked for it directly. A coding agent
 * legitimately reads `http://localhost:3000`, and it could reach that with `bash`
 * anyway; what must not happen is a page on the web sending the reader there, so
 * a redirect from a public address to a local one is always refused.
 */
export const BROWSER_USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export interface FetchLimits extends AddressPolicy {
	readonly timeoutMs: number;
	/** Decoded bytes. Reading stops here and the result says so. */
	readonly maxBytes: number;
	readonly maxRedirects: number;
	readonly userAgent?: string;
	readonly signal?: AbortSignal;
	readonly headers?: Readonly<Record<string, string>>;
	/** Whether a body of this media type is worth reading. Default: every body. */
	readonly wants?: (mediaType: string) => boolean;
	/** For tests: the resolver behind the address check. */
	readonly resolve?: LookupFn;
}

export interface FetchedBody {
	readonly url: string;
	readonly status: number;
	readonly contentType: string;
	/** From the header only; the document may name another one. */
	readonly headerCharset: string | undefined;
	readonly body: Buffer;
	/** The Content-Length header, for a body that was not read. */
	readonly declaredBytes: number | undefined;
	readonly truncated: boolean;
	readonly redirects: readonly string[];
}

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

function decompressed(response: IncomingMessage): Readable {
	const encoding = String(response.headers["content-encoding"] ?? "").toLowerCase();
	const through =
		encoding === "gzip" || encoding === "x-gzip"
			? createGunzip()
			: encoding === "br"
				? createBrotliDecompress()
				: encoding === "deflate"
					? createInflate()
					: undefined;
	if (!through) return response;
	response.on("error", (error) => through.destroy(error));
	return response.pipe(through);
}

function once(url: URL, limits: FetchLimits, policy: AddressPolicy, signal: AbortSignal): Promise<IncomingMessage> {
	return new Promise((resolve, reject) => {
		const send = url.protocol === "https:" ? httpsRequest : httpRequest;
		const request = send(
			url,
			{
				method: "GET",
				signal,
				lookup: checkedLookup(policy, limits.resolve) as never,
				headers: {
					"User-Agent": limits.userAgent ?? BROWSER_USER_AGENT,
					Accept: "text/html,application/xhtml+xml,application/json;q=0.9,text/plain;q=0.9,*/*;q=0.5",
					"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
					"Accept-Encoding": "gzip, deflate, br",
					...limits.headers,
				},
			},
			resolve,
		);
		request.on("error", reject);
		request.end();
	});
}

/**
 * Loopback has to be asked for by name, `localhost` or a loopback literal, at the start and at every hop.
 * So a public name that resolves to 127.0.0.1 is refused, and so is a redirect from the web to this machine.
 */
export function hopPolicy(limits: AddressPolicy, start: URL | undefined, hop: string): AddressPolicy {
	let local = false;
	try {
		local = isLoopbackUrl(new URL(hop)) && (start === undefined || isLoopbackUrl(start));
	} catch {
		/* Not a URL: checkUrl says so. */
	}
	return { allowLoopback: limits.allowLoopback && local, allowPrivate: limits.allowPrivate };
}

export async function fetchBody(rawUrl: string, limits: FetchLimits): Promise<FetchedBody> {
	const start = checkUrl(rawUrl, hopPolicy(limits, undefined, rawUrl));
	let url = start;

	const deadline = new AbortController();
	const timer = setTimeout(
		() => deadline.abort(new FetchRefusal("timeout", `Timed out after ${limits.timeoutMs} ms`)),
		limits.timeoutMs,
	);
	const onAbort = () => deadline.abort(new FetchRefusal("aborted", "The fetch was interrupted"));
	if (limits.signal?.aborted) onAbort();
	limits.signal?.addEventListener("abort", onAbort, { once: true });
	const redirects: string[] = [];
	try {
		for (;;) {
			const policy = hopPolicy(limits, start, url.href);
			let response: IncomingMessage;
			try {
				response = await once(url, limits, policy, deadline.signal);
			} catch (error) {
				throw deadline.signal.aborted && deadline.signal.reason instanceof Error ? deadline.signal.reason : error;
			}
			const status = response.statusCode ?? 0;
			const location = response.headers.location;
			if (REDIRECTS.has(status) && location) {
				response.resume();
				if (redirects.length >= limits.maxRedirects) {
					throw new FetchRefusal(
						"redirects",
						`Gave up after ${limits.maxRedirects} redirects, the last one to ${location}`,
					);
				}
				let next: URL;
				try {
					next = new URL(location, url);
				} catch {
					throw new FetchRefusal(
						"url",
						`The server redirected to something that is not a URL: ${location.slice(0, 200)}`,
					);
				}
				url = checkUrl(next.href, hopPolicy(limits, start, next.href));
				redirects.push(url.href);
				continue;
			}

			const contentType = String(response.headers["content-type"] ?? "");
			const mediaType = contentType.split(";")[0].trim().toLowerCase();
			const chunks: Buffer[] = [];
			let size = 0;
			let truncated = false;
			// What will only be described is not downloaded.
			const wanted = limits.wants?.(mediaType) ?? true;
			if (!wanted) response.destroy();
			const stream = wanted ? decompressed(response) : [];
			try {
				for await (const chunk of stream) {
					const buffer = chunk as Buffer;
					if (size + buffer.length > limits.maxBytes) {
						chunks.push(buffer.subarray(0, limits.maxBytes - size));
						size = limits.maxBytes;
						truncated = true;
						break;
					}
					chunks.push(buffer);
					size += buffer.length;
				}
			} catch (error) {
				if (deadline.signal.aborted && deadline.signal.reason instanceof Error) throw deadline.signal.reason;
				// A body cut short is still worth what arrived.
				if (size === 0) throw error;
				truncated = true;
			}
			response.destroy();
			return {
				url: url.href,
				status,
				contentType: mediaType,
				declaredBytes: Number(response.headers["content-length"]) || undefined,
				headerCharset: /charset\s*=\s*["']?([^\s;"']+)/i.exec(contentType)?.[1],
				body: Buffer.concat(chunks),
				truncated,
				redirects,
			};
		}
	} finally {
		clearTimeout(timer);
		limits.signal?.removeEventListener("abort", onAbort);
	}
}

/** The charset a document declares about itself, read from its first bytes as Latin-1. */
export function sniffCharset(body: Buffer): string | undefined {
	if (body[0] === 0xef && body[1] === 0xbb && body[2] === 0xbf) return "utf-8";
	if (body[0] === 0xff && body[1] === 0xfe) return "utf-16le";
	if (body[0] === 0xfe && body[1] === 0xff) return "utf-16be";
	const head = body.subarray(0, 4096).toString("latin1");
	return (
		/<meta[^>]+charset\s*=\s*["']?\s*([\w-]+)/i.exec(head)?.[1] ??
		/<\?xml[^>]+encoding\s*=\s*["']([\w-]+)/i.exec(head)?.[1]
	);
}

/** Bytes to text with the declared charset (GBK, GB2312, GB18030, Big5 and the rest of the WHATWG labels), UTF-8 otherwise. */
export function decodeBody(body: Buffer, headerCharset?: string): { text: string; charset: string } {
	for (const label of [headerCharset, sniffCharset(body)]) {
		if (!label) continue;
		try {
			const decoder = new TextDecoder(label.toLowerCase());
			return { text: decoder.decode(body), charset: decoder.encoding };
		} catch {
			/* An unknown label: try the next source. */
		}
	}
	return { text: new TextDecoder("utf-8").decode(body), charset: "utf-8" };
}

export interface ReadPage {
	readonly url: string;
	readonly status: number;
	readonly contentType: string;
	readonly charset: string;
	readonly bytes: number;
	readonly truncated: boolean;
	readonly redirects: readonly string[];
	readonly title: string;
	/** What the model reads. Page text is untrusted; the caller labels it. */
	readonly text: string;
	readonly kind: "html" | "json" | "text" | "other";
	readonly needsJavaScript: boolean;
}

const HTML = new Set(["text/html", "application/xhtml+xml"]);
const TEXTUAL =
	/^(?:text\/|application\/(?:json|xml|javascript|x-ndjson|yaml|x-yaml|toml|x-sh|sql|graphql)|[\w.-]+\/[\w.-]*\+(?:json|xml))/;

/** Fetches and reduces: HTML to readable text, JSON and plain text as they are, anything else described. */
export async function readUrl(rawUrl: string, limits: FetchLimits): Promise<ReadPage> {
	const fetched = await fetchBody(rawUrl, {
		...limits,
		wants: (type) => type === "" || HTML.has(type) || TEXTUAL.test(type),
	});
	const base = {
		url: fetched.url,
		status: fetched.status,
		contentType: fetched.contentType,
		bytes: fetched.body.length || (fetched.declaredBytes ?? 0),
		truncated: fetched.truncated,
		redirects: fetched.redirects,
	};
	const looksHtml =
		fetched.contentType === "" &&
		/^\s*(?:<!doctype html|<html)/i.test(fetched.body.subarray(0, 200).toString("latin1"));
	if (HTML.has(fetched.contentType) || looksHtml) {
		const { text: html, charset } = decodeBody(fetched.body, fetched.headerCharset);
		const page = htmlToText(html, fetched.url);
		return {
			...base,
			charset,
			kind: "html",
			title: page.title,
			text: page.text,
			needsJavaScript: page.needsJavaScript,
		};
	}
	if (TEXTUAL.test(fetched.contentType) || fetched.contentType === "") {
		const { text, charset } = decodeBody(fetched.body, fetched.headerCharset);
		const kind = /json/.test(fetched.contentType) ? "json" : "text";
		return { ...base, charset, kind, title: "", text, needsJavaScript: false };
	}
	return {
		...base,
		charset: "",
		kind: "other",
		title: "",
		text: `A ${fetched.contentType} file${fetched.declaredBytes ? ` of ${fetched.declaredBytes} bytes` : ""}. It is not text, so it was not read. Download it with a shell command if its content is needed.`,
		needsJavaScript: false,
	};
}
