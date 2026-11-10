/**
 * The small part of glob syntax rule files use: `*`, `**`, `?`, `{a,b}` and
 * `[abc]`. Paths are relative to the folder the rule belongs to and use `/`.
 * A pattern without a slash matches a file name at any depth, as in gitignore.
 */
const SPECIAL = /[.+^$()|\\{}]/;

function bracesBalance(pattern: string): boolean {
	let depth = 0;
	for (const char of pattern) {
		if (char === "{") depth++;
		if (char === "}" && --depth < 0) return false;
	}
	return depth === 0;
}

function translate(pattern: string): string {
	// An unbalanced brace is a literal character, not a broken expression.
	const alternation = bracesBalance(pattern);
	let source = "";
	let depth = 0;
	for (let index = 0; index < pattern.length; index++) {
		const char = pattern[index];
		if (char === "*") {
			if (pattern[index + 1] === "*") {
				// `**/` also matches no directory at all: `src/**/a.ts` covers `src/a.ts`.
				const slash = pattern[index + 2] === "/";
				source += slash ? "(?:.*/)?" : ".*";
				index += slash ? 2 : 1;
			} else {
				source += "[^/]*";
			}
		} else if (char === "?") {
			source += "[^/]";
		} else if (alternation && char === "{") {
			depth++;
			source += "(?:";
		} else if (alternation && char === "}") {
			depth--;
			source += ")";
		} else if (alternation && char === "," && depth > 0) {
			source += "|";
		} else if (char === "[" && pattern.indexOf("]", index + 2) !== -1) {
			const close = pattern.indexOf("]", index + 2);
			const body = pattern.slice(index + 1, close).replace(/\\/g, "\\\\");
			source += `[${body.startsWith("!") ? `^${body.slice(1)}` : body}]`;
			index = close;
		} else {
			source += SPECIAL.test(char) || char === "[" || char === "]" ? `\\${char}` : char;
		}
	}
	return source;
}

export function globToRegExp(glob: string): RegExp | undefined {
	let pattern = glob.trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\//, "");
	if (!pattern) return undefined;
	if (pattern.endsWith("/")) pattern += "**";
	const anywhere = !pattern.includes("/");
	try {
		return new RegExp(`^${anywhere ? "(?:.*/)?" : ""}${translate(pattern)}$`);
	} catch {
		return undefined;
	}
}

/** True when `relativePath` (with `/` separators) matches any of the patterns. Broken patterns match nothing. */
export function matchesAnyGlob(relativePath: string, globs: readonly string[]): boolean {
	const path = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
	return globs.some((glob) => globToRegExp(glob)?.test(path) === true);
}
