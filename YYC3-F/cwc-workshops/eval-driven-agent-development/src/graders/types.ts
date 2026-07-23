// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type Anthropic from "@anthropic-ai/sdk";
import type { ParsedPptx } from "../parse-pptx.js";

/**
 * One column in the scorecard. The harness runs every grader against every
 * task's output and prints the result as a table cell.
 *
 * Adding a metric to the eval = appending one of these to {@link GRADERS}.
 */
export interface Grader {
    /** Column header in the scorecard, e.g. "Slides with image", "Layout judge". */
    name: string;

    /** "code" = deterministic, "judge" = model call. Matches intro-deck vocabulary. */
    kind: "code" | "judge";

    /** One-line explanation for the room. */
    description: string;

    /** Compute the metric. String results are printed verbatim; numbers go through `format`. */
    grade(ctx: GraderContext): Promise<number | string> | number | string;

    /** Optional display formatter for numeric results (default: String(v)). */
    format?(v: number): string;

    /**
     * Optional: enables red→yellow→green coloring of the cell based on where
     * the value falls in [min, max]. `good: "low"` flips the spectrum; a
     * numeric `good` means that exact value is greenest and distance from it
     * grades toward red.
     */
    scale?: { min: number; max: number; good: "high" | "low" | number };
}

/**
 * Everything a {@link Grader.grade} needs about one task's output. Built
 * once per task by the harness — pure data, completely grader-agnostic.
 */
export interface GraderContext {
    taskId: string;

    /**
     * The Managed Agents session that produced this deck (read from
     * `session.json` written by create-slides). Undefined if that record
     * doesn't exist (e.g., decks copied in from runs-batch/).
     */
    sessionId?: string;

    /** Parsed pptx structure: per-slide shapes, text, fonts, title/body. */
    parsedPptx: ParsedPptx;

    /** Rendered per-slide JPG paths (empty if pptx missing/invalid). */
    jpgPaths: string[];

    client: Anthropic;
}
