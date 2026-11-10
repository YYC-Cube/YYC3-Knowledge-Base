/**
 * The manifest's texts in more languages than the two `src/manifest.ts` is written in. The translations live
 * in `i18n/manifest.json`, each under the path of its text, together with the English it was made from:
 *
 *   { version: 1, locales: ["zh-TW", "ja-JP", ...], texts: { "<path>": { en, "zh-TW": ..., ... } } }
 *
 * A path walks the manifest: every {zh, en} object is one text, an object key adds `.key`, and an array item
 * adds `[name=…]`, `[id=…]`, `[key=…]` or `[value=…]` (the first of these it has) or else its index, e.g.
 * `features[name=preflight].options[key=thinking].label` or `modes[value=shadow].help`.
 *
 * `manifest.json` gets the locale keys beside zh and en. A translation whose English is no longer the English
 * of its text is left out, so the English shows until it is translated again: an English change can never
 * leave a stale translation behind.
 */

export interface ManifestTranslations {
	readonly version: 1;
	readonly locales: readonly string[];
	readonly texts: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

export interface LocalizedManifest {
	/** The manifest as data, with the translations that still match their English. */
	readonly manifest: unknown;
	/** Paths whose English changed since they were translated: left in English. */
	readonly stale: readonly string[];
	/** Texts nobody has translated yet. */
	readonly untranslated: readonly string[];
	/** Translations whose path is no longer in the manifest. */
	readonly unused: readonly string[];
}

function identity(item: unknown): string | undefined {
	if (typeof item !== "object" || item === null) return undefined;
	for (const key of ["name", "id", "key", "value"]) {
		const value = (item as Record<string, unknown>)[key];
		if (typeof value === "string" || (typeof value === "number" && Number.isInteger(value))) return `${key}=${value}`;
	}
	return undefined;
}

function isLocalized(value: unknown): value is { zh: string; en: string } {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as Record<string, unknown>).zh === "string" &&
		typeof (value as Record<string, unknown>).en === "string"
	);
}

/** Every text of the manifest by its path, in the order it appears. */
export function manifestTexts(manifest: unknown): Map<string, { zh: string; en: string }> {
	const texts = new Map<string, { zh: string; en: string }>();
	const walk = (node: unknown, path: string): void => {
		if (isLocalized(node)) {
			texts.set(path, node);
			return;
		}
		if (Array.isArray(node)) {
			for (const [index, item] of node.entries()) walk(item, `${path}[${identity(item) ?? index}]`);
			return;
		}
		if (typeof node === "object" && node !== null) {
			for (const [key, value] of Object.entries(node)) walk(value, path ? `${path}.${key}` : key);
		}
	};
	walk(manifest, "");
	return texts;
}

/** A copy of the manifest with every translation that still matches its English. The input is not changed. */
export function localizeManifest(manifest: unknown, translations: ManifestTranslations): LocalizedManifest {
	const copy = JSON.parse(JSON.stringify(manifest)) as unknown;
	const stale: string[] = [];
	const untranslated: string[] = [];
	for (const [path, text] of manifestTexts(copy)) {
		const translated = translations.texts[path];
		if (!translated) {
			untranslated.push(path);
			continue;
		}
		if (translated.en !== text.en) {
			stale.push(path);
			continue;
		}
		for (const locale of translations.locales) {
			const value = translated[locale];
			if (typeof value === "string" && value.trim()) (text as Record<string, string>)[locale] = value;
		}
	}
	const known = new Set(manifestTexts(manifest).keys());
	const unused = Object.keys(translations.texts).filter((path) => !known.has(path));
	return { manifest: copy, stale, untranslated, unused };
}
