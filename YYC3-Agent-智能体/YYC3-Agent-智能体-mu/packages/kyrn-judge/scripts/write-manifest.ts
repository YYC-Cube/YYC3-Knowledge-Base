/**
 * Writes `manifest.json` from `src/manifest.ts`, with the translations in `i18n/manifest.json` that still
 * match their English (src/manifest-locales.ts). Run with Node 24: `node packages/kyrn-judge/scripts/write-manifest.ts`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFEST } from "../src/manifest.ts";
import { localizeManifest, type ManifestTranslations } from "../src/manifest-locales.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const translations = JSON.parse(readFileSync(join(root, "i18n", "manifest.json"), "utf8")) as ManifestTranslations;
const { manifest, stale, untranslated, unused } = localizeManifest(MANIFEST, translations);
const target = join(root, "manifest.json");
writeFileSync(target, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`wrote ${target} (${translations.locales.length} more languages)`);
for (const path of stale) console.warn(`  in English until translated again (its English changed): ${path}`);
if (untranslated.length > 0) console.warn(`  not translated yet: ${untranslated.join(", ")}`);
if (unused.length > 0) console.warn(`  translations for texts that are gone: ${unused.join(", ")}`);
