// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * Pure .pptx parsing — no model calls, no scoring policy.
 * Walks the zip, parses each slide's XML, returns per-slide structural
 * facts (shape/picture counts, text runs, font sizes, title/body split).
 * Everything a code-check needs to compute a metric lives on ParsedPptx.
 */

import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
import * as fs from "node:fs/promises";

/**
 * Structural counts for one slide, pulled directly from the OOXML — what the
 * code-based graders read. No model calls.
 */
export interface SlideMetrics {
    /** 1-based slide number. */
    index: number;
    /** Top-level shapes of any kind (sp, pic, graphicFrame, grpSp, cxnSp). */
    shapeCount: number;
    /** Embedded raster images (`<p:pic>`) — what `img%` counts. */
    pictureCount: number;
    /** Total characters across all text runs (titles + headers + body). */
    textChars: number;
    /** Distinct font sizes (pt) used on the slide, ascending. */
    fontSizesPt: number[];
    /** Unicode emoji codepoints in the text. */
    emojiCount: number;
}

/**
 * One slide's title and body text, separated by the placeholder/largest-font
 * heuristic. Feeds the coherence judge.
 */
export interface SlideTexts {
    index: number;
    title: string;
    body: string;
}

/**
 * Result of {@link parsePptx}: file-level validity plus per-slide metrics and
 * extracted texts. `exists`/`validZip` are false if the agent failed to write
 * a usable file — every grader can short-circuit on those.
 */
export interface ParsedPptx {
    exists: boolean;
    validZip: boolean;
    slideCount: number;
    perSlide: SlideMetrics[];
    slideTexts: SlideTexts[];
}

const EMOJI_RE = /\p{Extended_Pictographic}/gu;

const EMPTY = (exists: boolean, validZip: boolean): ParsedPptx => ({
    exists,
    validZip,
    slideCount: 0,
    perSlide: [],
    slideTexts: [],
});

export async function parsePptx(pptxPath: string): Promise<ParsedPptx> {
    // Read the deck off disk. If it's missing the agent never produced one —
    // return EMPTY(false, …) so the `exec` grader can report MIS.
    let buf: Buffer;
    try {
        buf = await fs.readFile(pptxPath);
    } catch {
        return EMPTY(false, false);
    }

    // A .pptx is a zip archive of XML parts. If it doesn't unzip, the agent
    // wrote something but it's corrupt — `exec` grader reports INV.
    let zip: JSZip;
    try {
        zip = await JSZip.loadAsync(buf);
    } catch {
        return EMPTY(true, false);
    }

    // Slides live at ppt/slides/slideN.xml. Find them all and sort by N so
    // perSlide[0] is slide 1 regardless of zip entry order.
    const slideEntries = Object.keys(zip.files)
        .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
        .sort((a, b) => slideIndex(a) - slideIndex(b));

    // Keep XML attributes (ignoreAttributes: false) — they carry the data we
    // need, like font size (a:rPr@sz) and placeholder type (p:ph@type).
    // Prefixing them with @_ keeps them distinguishable from child elements.
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
    });

    // Parse each slide's XML once and run both extractors over the same DOM:
    // structural counts for the code graders, title/body for the coherence judge.
    const perSlide: SlideMetrics[] = [];
    const slideTexts: SlideTexts[] = [];
    for (let i = 0; i < slideEntries.length; i++) {
        const xml = await zip.files[slideEntries[i]]!.async("string");
        const doc = parser.parse(xml);
        perSlide.push(analyzeSlide(i + 1, doc));
        slideTexts.push(extractSlideTexts(i + 1, doc));
    }

    return {
        exists: true,
        validZip: true,
        slideCount: perSlide.length,
        perSlide,
        slideTexts,
    };
}

function slideIndex(name: string): number {
    return Number(name.match(/slide(\d+)/)![1]);
}

function analyzeSlide(index: number, doc: unknown): SlideMetrics {
    // Every visible thing on a slide hangs off p:sld → p:cSld → p:spTree.
    // Count the five top-level shape kinds OOXML defines (text shapes,
    // pictures, charts/tables, groups, connectors) for the clutter metric,
    // and pictures separately for the img% metric.
    const spTree = pluck(doc, ["p:sld", "p:cSld", "p:spTree"]) ?? {};
    const shapeCount =
        countShapes(spTree, "p:sp") +
        countShapes(spTree, "p:pic") +
        countShapes(spTree, "p:graphicFrame") +
        countShapes(spTree, "p:grpSp") +
        countShapes(spTree, "p:cxnSp");
    const pictureCount = countShapes(spTree, "p:pic");

    // Collect every text run (<a:r>) on the slide along with its font size,
    // then concatenate to get total text — feeds the dense and emoji graders.
    const runs: { text: string; sizePt?: number }[] = [];
    walkRuns(doc, runs);
    const text = runs.map((r) => r.text).join("");

    // Distinct font sizes used, ascending — the font<14 grader looks at the
    // smallest one to check the readability floor.
    const fontSizesPt = Array.from(
        new Set(runs.map((r) => r.sizePt).filter((s): s is number => typeof s === "number")),
    ).sort((a, b) => a - b);

    return {
        index,
        shapeCount,
        pictureCount,
        textChars: text.length,
        fontSizesPt,
        emojiCount: (text.match(EMOJI_RE) ?? []).length,
    };
}

/** Safe nested-property lookup through the parsed XML object tree. */
function pluck(node: unknown, keys: string[]): unknown {
    let cur: unknown = node;
    for (const k of keys) {
        if (cur == null || typeof cur !== "object") return undefined;
        cur = (cur as Record<string, unknown>)[k];
    }
    return cur;
}

/**
 * Count direct children of `key` under spTree. fast-xml-parser returns a
 * single child as an object and multiple children as an array, so normalise.
 */
function countShapes(spTree: unknown, key: string): number {
    if (spTree == null || typeof spTree !== "object") return 0;
    const v = (spTree as Record<string, unknown>)[key];
    if (v == null) return 0;
    return Array.isArray(v) ? v.length : 1;
}

/**
 * Recursively collect every DrawingML text run (<a:r>) under `node`.
 * Each run contributes its literal text (<a:t>) and optional font size
 * (<a:rPr sz="…">, in hundredths of a point — divide by 100).
 */
function walkRuns(node: unknown, out: { text: string; sizePt?: number }[]): void {
    if (node == null || typeof node !== "object") return;
    if (Array.isArray(node)) {
        for (const v of node) walkRuns(v, out);
        return;
    }
    const obj = node as Record<string, unknown>;
    // Extract this element's own runs, if any.
    const r = obj["a:r"];
    if (r != null) {
        const arr = Array.isArray(r) ? r : [r];
        for (const run of arr) {
            if (run == null || typeof run !== "object") continue;
            const runObj = run as Record<string, unknown>;
            const t = runObj["a:t"];
            const text = typeof t === "string" ? t : t == null ? "" : String(t);
            const rPr = runObj["a:rPr"];
            const sizeAttr =
                rPr && typeof rPr === "object" ? (rPr as Record<string, unknown>)["@_sz"] : undefined;
            const sizePt = sizeAttr != null ? Number(sizeAttr) / 100 : undefined;
            out.push({ text, sizePt });
        }
    }
    // Recurse into child elements (skip XML attributes and the runs we just handled).
    for (const k of Object.keys(obj)) {
        if (k.startsWith("@_") || k === "a:r") continue;
        walkRuns(obj[k], out);
    }
}

// Title/body extraction for the title-content alignment judge.
//
// Heuristic for picking the title text on a slide, in priority order:
//   1. The first shape whose placeholder type is "title" or "ctrTitle"
//      (that's how python-pptx and Office mark title placeholders).
//   2. Otherwise, the shape with the largest font run (max sz attribute).
//   3. Otherwise, the first shape with non-empty text.
// Body = concatenation of every other shape's text on the slide.
interface SlideShape {
    phType?: string;
    text: string;
    maxSizePt: number;
}

/**
 * Flatten each text shape (<p:sp>) on the slide to {placeholder type, full
 * text, largest font size} — the three signals the title heuristic needs.
 */
function collectShapes(spTree: unknown): SlideShape[] {
    const out: SlideShape[] = [];
    if (spTree == null || typeof spTree !== "object") return out;
    const sps = (spTree as Record<string, unknown>)["p:sp"];
    if (sps == null) return out;
    const arr = Array.isArray(sps) ? sps : [sps];
    for (const sp of arr) {
        if (sp == null || typeof sp !== "object") continue;
        // Placeholder type ("title", "ctrTitle", "body", …) is buried under
        // the shape's non-visual properties at p:nvSpPr → p:nvPr → p:ph@type.
        const ph = pluck(sp, ["p:nvSpPr", "p:nvPr", "p:ph"]);
        const phType =
            ph && typeof ph === "object" ? (ph as Record<string, unknown>)["@_type"] : undefined;
        // Gather this shape's text runs and their sizes from its <p:txBody>.
        const runs: { text: string; sizePt?: number }[] = [];
        walkRuns((sp as Record<string, unknown>)["p:txBody"], runs);
        const text = runs
            .map((r) => r.text)
            .join("")
            .trim();
        const sizes = runs.map((r) => r.sizePt).filter((s): s is number => typeof s === "number");
        out.push({
            phType: phType != null ? String(phType) : undefined,
            text,
            maxSizePt: sizes.length > 0 ? Math.max(...sizes) : 0,
        });
    }
    return out;
}

function extractSlideTexts(index: number, doc: unknown): SlideTexts {
    const spTree = pluck(doc, ["p:sld", "p:cSld", "p:spTree"]) ?? {};
    const shapes = collectShapes(spTree).filter((s) => s.text.length > 0);

    // Apply the heuristic documented above: explicit title placeholder first,
    // else the shape with the biggest font, else whatever comes first.
    let titleShape: SlideShape | undefined = shapes.find(
        (s) => s.phType === "title" || s.phType === "ctrTitle",
    );
    if (!titleShape) {
        const byFont = [...shapes].sort((a, b) => b.maxSizePt - a.maxSizePt);
        titleShape = byFont[0];
    }
    // Title = that shape's text; body = everything else, newline-joined.
    const title = titleShape?.text ?? "";
    const body = shapes
        .filter((s) => s !== titleShape)
        .map((s) => s.text)
        .join("\n");
    return { index, title, body };
}
