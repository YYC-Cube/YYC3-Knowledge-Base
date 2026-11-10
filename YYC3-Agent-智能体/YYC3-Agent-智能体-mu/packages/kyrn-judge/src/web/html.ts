/**
 * HTML to readable text, without a dependency: a tolerant tag scanner builds a
 * light tree, the page chrome is dropped (script, style, nav, footer, aside,
 * forms, svg), and what is left is written as plain text with Markdown-like
 * marks for headings, lists, code, tables and quotes. Links keep their address
 * only inside the main content, where following one is a plausible next step.
 *
 * This is a reader, not a browser: nothing is executed. A page that is empty
 * until its scripts run is reported as such, so the caller can say "use browse".
 */
export interface ElementNode {
	readonly tag: string;
	readonly attrs: Readonly<Record<string, string>>;
	readonly children: HtmlNode[];
}
export type HtmlNode = ElementNode | string;

export interface ReadablePage {
	readonly title: string;
	readonly text: string;
	/** True when the markup is large and the text next to nothing: the content is rendered by scripts. */
	readonly needsJavaScript: boolean;
}

const VOID = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"source",
	"track",
	"wbr",
]);
const RAW_TEXT = new Set(["script", "style", "textarea", "title", "noscript", "template"]);
const DROPPED = new Set([
	"script",
	"style",
	"noscript",
	"template",
	"svg",
	"nav",
	"footer",
	"aside",
	"form",
	"iframe",
	"button",
	"select",
	"canvas",
	"object",
	"dialog",
	"head",
]);
const BLOCK = new Set([
	"address",
	"article",
	"body",
	"details",
	"div",
	"dl",
	"dd",
	"dt",
	"fieldset",
	"figcaption",
	"figure",
	"header",
	"html",
	"main",
	"p",
	"section",
	"summary",
	"tbody",
	"thead",
	"tfoot",
]);
/** An open element of the first kind is closed by the start of one of the second. */
const IMPLIED_END: Readonly<Record<string, readonly string[]>> = {
	li: ["li"],
	p: ["p", "div", "ul", "ol", "table", "pre", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6", "section", "article"],
	tr: ["tr", "tbody", "tfoot"],
	td: ["td", "th", "tr"],
	th: ["td", "th", "tr"],
	dt: ["dt", "dd"],
	dd: ["dt", "dd"],
	option: ["option"],
};
const ENTITIES: Readonly<Record<string, string>> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
	ensp: " ",
	emsp: " ",
	thinsp: " ",
	copy: "©",
	reg: "®",
	trade: "™",
	mdash: "—",
	ndash: "–",
	hellip: "…",
	laquo: "«",
	raquo: "»",
	lsquo: "‘",
	rsquo: "’",
	ldquo: "“",
	rdquo: "”",
	middot: "·",
	bull: "•",
	times: "×",
	deg: "°",
	yen: "¥",
	euro: "€",
	pound: "£",
	cent: "¢",
	rarr: "→",
	larr: "←",
};

export function decodeEntities(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);?/gi, (whole, body: string) => {
		if (body[0] !== "#") return ENTITIES[body] ?? ENTITIES[body.toLowerCase()] ?? whole;
		const code = body[1] === "x" || body[1] === "X" ? Number.parseInt(body.slice(2), 16) : Number(body.slice(1));
		return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
	});
}

const ATTRIBUTE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function parseAttributes(source: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	for (const match of source.matchAll(ATTRIBUTE)) {
		const name = match[1].toLowerCase();
		if (!(name in attrs)) attrs[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
	}
	return attrs;
}

/** Never throws: markup it cannot make sense of becomes text or is skipped. */
export function parseHtml(html: string): ElementNode {
	const root: ElementNode = { tag: "#root", attrs: {}, children: [] };
	const stack: ElementNode[] = [root];
	const top = () => stack[stack.length - 1];
	let index = 0;
	while (index < html.length) {
		const open = html.indexOf("<", index);
		if (open < 0) {
			top().children.push(html.slice(index));
			break;
		}
		if (open > index) top().children.push(html.slice(index, open));
		if (html.startsWith("<!--", open)) {
			const end = html.indexOf("-->", open + 4);
			index = end < 0 ? html.length : end + 3;
			continue;
		}
		const close = html.indexOf(">", open + 1);
		if (close < 0) break;
		const inner = html.slice(open + 1, close);
		index = close + 1;
		if (inner[0] === "!" || inner[0] === "?") continue;
		if (inner[0] === "/") {
			const name = inner.slice(1).trim().toLowerCase();
			let at = stack.length - 1;
			while (at > 0 && stack[at].tag !== name) at--;
			// An end tag nobody opened is noise, not a reason to close everything.
			if (at > 0) stack.length = at;
			continue;
		}
		const nameMatch = /^[a-zA-Z][^\s/>]*/.exec(inner);
		if (!nameMatch) {
			top().children.push("<");
			index = open + 1;
			continue;
		}
		const tag = nameMatch[0].toLowerCase();
		for (let depth = stack.length - 1; depth > 0; depth--) {
			const closes = IMPLIED_END[stack[depth].tag];
			if (closes?.includes(tag)) {
				stack.length = depth;
				break;
			}
			// A list item does not reach out of its own list, a cell not out of its table.
			if (["ul", "ol", "table", "dl"].includes(stack[depth].tag)) break;
		}
		const node: ElementNode = { tag, attrs: parseAttributes(inner.slice(nameMatch[0].length)), children: [] };
		top().children.push(node);
		if (VOID.has(tag) || inner.endsWith("/")) continue;
		if (RAW_TEXT.has(tag)) {
			const endTag = new RegExp(`</${tag}\\s*>`, "i");
			const rest = html.slice(index);
			const end = endTag.exec(rest);
			node.children.push(end ? rest.slice(0, end.index) : rest);
			index = end ? index + end.index + end[0].length : html.length;
			continue;
		}
		stack.push(node);
	}
	return root;
}

function isHidden(node: ElementNode): boolean {
	if ("hidden" in node.attrs || node.attrs["aria-hidden"] === "true") return true;
	return /display\s*:\s*none|visibility\s*:\s*hidden/i.test(node.attrs.style ?? "");
}

function find(node: ElementNode, test: (node: ElementNode) => boolean, found: ElementNode[] = []): ElementNode[] {
	for (const child of node.children) {
		if (typeof child === "string") continue;
		if (test(child)) found.push(child);
		find(child, test, found);
	}
	return found;
}

function plainText(node: HtmlNode): string {
	if (typeof node === "string") return decodeEntities(node);
	if (DROPPED.has(node.tag) || isHidden(node)) return "";
	if (node.tag === "br") return "\n";
	return node.children.map(plainText).join("");
}

const squash = (text: string): string => text.replace(/\s+/g, " ").trim();

interface RenderContext {
	readonly base: string | undefined;
	readonly links: boolean;
}

function absolute(href: string, base: string | undefined): string | undefined {
	try {
		const url = new URL(href, base);
		return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
	} catch {
		return undefined;
	}
}

/** Inline content: text with links, inline code and line breaks. */
function inline(node: HtmlNode, context: RenderContext): string {
	if (typeof node === "string") return decodeEntities(node).replace(/\s+/g, " ");
	if (DROPPED.has(node.tag) || isHidden(node)) return "";
	if (node.tag === "br") return "\n";
	if (node.tag === "img") return node.attrs.alt?.trim() ? `[image: ${squash(node.attrs.alt)}]` : "";
	const body = node.children.map((child) => inline(child, context)).join("");
	if (node.tag === "code" || node.tag === "kbd" || node.tag === "samp") return body.trim() ? `\`${body.trim()}\`` : "";
	if (node.tag === "a" && context.links) {
		const label = squash(body);
		const href =
			node.attrs.href && !node.attrs.href.startsWith("#") ? absolute(node.attrs.href, context.base) : undefined;
		if (!label) return "";
		return href && href !== label ? `${label} (${href})` : label;
	}
	return body;
}

function tidyInline(text: string): string {
	return text
		.split("\n")
		.map((line) => line.replace(/[ \t]+/g, " ").trim())
		.join("\n")
		.trim();
}

function renderTable(table: ElementNode, context: RenderContext): string {
	const rows: ElementNode[] = [];
	// Rows of this table only: a nested table is rendered inside the cell that holds it.
	const collect = (node: ElementNode): void => {
		for (const child of node.children) {
			if (typeof child === "string") continue;
			if (child.tag === "tr") rows.push(child);
			else if (child.tag !== "table") collect(child);
		}
	};
	collect(table);
	return rows
		.map((row) => {
			const cells = row.children.filter(
				(child): child is ElementNode => typeof child !== "string" && (child.tag === "td" || child.tag === "th"),
			);
			return cells.map((cell) => squash(inline(cell, context)).replace(/\|/g, "\\|")).join(" | ");
		})
		.filter((line) => line.replace(/[| ]/g, ""))
		.map((line) => `| ${line} |`)
		.join("\n");
}

/** Many links and hardly a word between them: a menu, a sidebar, a tag cloud. Sites in the wild rarely say <nav>. */
function isLinkList(node: ElementNode): boolean {
	const links = find(node, (child) => child.tag === "a");
	if (links.length < 5) return false;
	const linked = links.reduce((sum, link) => sum + squash(plainText(link)).length, 0);
	return linked >= squash(plainText(node)).length * 0.7;
}

/** Block content. Each returned piece is one block; the caller separates them with a blank line. */
function blocks(node: ElementNode, context: RenderContext, depth = 0): string[] {
	const out: string[] = [];
	let run = "";
	const flush = () => {
		const text = tidyInline(run);
		if (text) out.push(text);
		run = "";
	};
	for (const child of node.children) {
		if (typeof child === "string") {
			run += inline(child, context);
			continue;
		}
		if (DROPPED.has(child.tag) || isHidden(child)) continue;
		const heading = /^h([1-6])$/.exec(child.tag);
		if (heading) {
			flush();
			const text = squash(inline(child, { ...context, links: false }));
			if (text) out.push(`${"#".repeat(Number(heading[1]))} ${text}`);
		} else if (child.tag === "pre") {
			flush();
			const code = plainText(child).replace(/^\n+|\s+$/g, "");
			if (code) out.push(`\`\`\`\n${code}\n\`\`\``);
		} else if (child.tag === "ul" || child.tag === "ol") {
			flush();
			const items = child.children.filter(
				(item): item is ElementNode => typeof item !== "string" && item.tag === "li",
			);
			const lines = items.map((item, position) => {
				const mark = child.tag === "ol" ? `${position + 1}.` : "-";
				const body = blocks(item, context, depth + 1).join("\n");
				// A nested list indents itself; the item only contributes its mark.
				return `${"  ".repeat(depth)}${mark} ${body}`;
			});
			if (lines.length > 0) out.push(lines.join("\n"));
		} else if (child.tag === "table") {
			flush();
			const table = renderTable(child, context);
			if (table) out.push(table);
		} else if (child.tag === "blockquote") {
			flush();
			const quoted = blocks(child, context, depth).join("\n\n");
			if (quoted) out.push(quoted.replace(/^/gm, "> "));
		} else if (child.tag === "hr") {
			flush();
			out.push("---");
		} else if (BLOCK.has(child.tag) || child.tag === "li") {
			flush();
			// A page header is navigation in all but name, and so is a box of nothing but links, whatever
			// its tag: their links keep their text and lose their address.
			const chrome = context.links && (child.tag === "header" || isLinkList(child));
			out.push(...blocks(child, chrome ? { ...context, links: false } : context, depth));
		} else {
			run += inline(child, context);
		}
	}
	flush();
	return out;
}

function mainRegion(body: ElementNode): ElementNode {
	const whole = squash(plainText(body)).length;
	const candidates = [
		...find(body, (node) => node.tag === "main" || node.attrs.role === "main"),
		...find(body, (node) => node.tag === "article"),
	];
	let best: ElementNode | undefined;
	let bestLength = 0;
	for (const candidate of candidates) {
		const length = squash(plainText(candidate)).length;
		if (length > bestLength) {
			best = candidate;
			bestLength = length;
		}
	}
	// A <main> that holds a fraction of the page is a teaser or a wrapper around one card, not the content.
	return best && bestLength >= Math.min(500, whole * 0.4) ? best : body;
}

export function htmlToText(html: string, baseUrl?: string): ReadablePage {
	const root = parseHtml(html);
	const titleNode = find(root, (node) => node.tag === "title")[0];
	const title = titleNode
		? squash(decodeEntities(titleNode.children.filter((child) => typeof child === "string").join("")))
		: "";
	const baseHref = find(root, (node) => node.tag === "base" && Boolean(node.attrs.href))[0]?.attrs.href;
	const base = baseHref ? (absolute(baseHref, baseUrl) ?? baseUrl) : baseUrl;
	const body = find(root, (node) => node.tag === "body")[0] ?? root;
	const text = blocks(mainRegion(body), { base, links: true })
		.join("\n\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
	const scripts = find(root, (node) => node.tag === "script").length;
	const needsJavaScript = text.length < 200 && scripts > 0 && html.length > 2000;
	return { title, text, needsJavaScript };
}

/** For callers that read structure instead of text, such as the search result parsers. */
export const findElements = find;
export const elementText = (node: HtmlNode): string => squash(plainText(node));
