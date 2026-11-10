// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * Grader harness.
 *
 * For each task: build a GraderContext (parse the .pptx, render JPGs,
 * wire up memoized judge calls), run every check in GRADERS against it,
 * write runs/<task>/score.json, and print the scorecard table.
 *
 * The metrics themselves live in graders.ts — this file is just the runner.
 */

import Anthropic from "@anthropic-ai/sdk";
import chalk from "chalk";
import * as fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { GRADERS, type Grader, type GraderContext } from "./graders.js";
import { RUNS_DIR, selectTasks, type Task } from "./lib.js";
import { parsePptx } from "./parse-pptx.js";
import { renderPptx } from "./render.js";

/** One row of the scorecard — a task id and its value for every grader. */
interface TaskResult {
    taskId: string;
    /** Parallel to {@link GRADERS} — `values[i]` is the result of `GRADERS[i]`. */
    values: (number | string)[];
    /** Prior run's values (read from score.json before overwrite), for deltas. */
    previous?: Record<string, number | string>;
    ctx: GraderContext;
}

/**
 * Prepare everything the graders need for one task — pure data, no scoring.
 * The harness has no idea what the individual graders measure; it just hands
 * each one this context and collects the result.
 */
async function buildContext(
    client: Anthropic,
    task: Task,
): Promise<GraderContext> {
    const taskDir = path.join(RUNS_DIR, task.id);
    const pptxPath = path.join(taskDir, "output.pptx");

    // Crack open the .pptx (it's a zip of XML) and pull out per-slide
    // structural facts: shape counts, text length, font sizes, etc.
    const parsed = await parsePptx(pptxPath);

    // Load the session record written by create-slides so graders can
    // reference (or link back to) the exact run that produced this deck.
    const sessionId: string | undefined = await fs
        .readFile(path.join(taskDir, "session.json"), "utf8")
        .then((txt) => JSON.parse(txt).sessionId)
        .catch(() => undefined);

    // Render the deck to one JPG per slide via the local Docker image, so
    // the vision-judge graders have pixels to look at.
    let jpgs: string[] = [];
    if (parsed.exists && parsed.validZip) {
        const renderDir = path.join(taskDir, "render");
        // Always re-render — a stale render/ from a previous output.pptx would
        // mean the judge scores the old deck.
        await fs.rm(renderDir, { recursive: true, force: true });
        console.log("rendering...");
        jpgs = await renderPptx(pptxPath, renderDir);
    }

    return { taskId: task.id, sessionId, parsedPptx: parsed, jpgPaths: jpgs, client };
}

async function gradeTask(
    client: Anthropic,
    task: Task,
    pinBaseline: boolean,
): Promise<TaskResult> {
    console.log(`\n=== grading ${task.id} ===`);
    const taskDir = path.join(RUNS_DIR, task.id);
    const scorePath = path.join(taskDir, "score.json");
    const baselinePath = path.join(taskDir, "baseline.score.json");

    // Deltas always compare against the pinned baseline (recorded with
    // `--baseline`), not the immediately-previous run — so re-running the
    // same round shows movement vs. the naive starting point, not noise.
    const previous: Record<string, number | string> | undefined = await fs
        .readFile(baselinePath, "utf8")
        .then((txt) => JSON.parse(txt).results)
        .catch(() => undefined);

    const ctx = await buildContext(client, task);

    // Run every grader against the same context. They're independent, so
    // fan out — judge-kind graders make model calls, code-kind ones don't.
    const values = await Promise.all(GRADERS.map((c) => c.grade(ctx)));

    // Persist a machine-readable record next to the deck: the headline value
    // per grader plus the raw per-slide structural data behind it.
    const score = {
        taskId: task.id,
        results: Object.fromEntries(GRADERS.map((c, i) => [c.name, values[i]])),
        perSlide: ctx.parsedPptx.perSlide,
        slideTexts: ctx.parsedPptx.slideTexts,
    };
    const json = JSON.stringify(score, null, 2);
    await fs.writeFile(scorePath, json);
    if (pinBaseline) {
        // Record (or overwrite) the baseline this and future runs diff against.
        await fs.writeFile(baselinePath, json);
    }

    return { taskId: task.id, values, previous: pinBaseline ? undefined : previous, ctx };
}

/**
 * Reconstruct a TaskResult from a saved baseline.score.json without re-running
 * any graders — for re-printing the baseline scorecard on demand.
 */
async function loadBaseline(task: Task): Promise<TaskResult | null> {
    const baselinePath = path.join(RUNS_DIR, task.id, "baseline.score.json");
    const saved = await fs
        .readFile(baselinePath, "utf8")
        .then((txt) => JSON.parse(txt) as { results: Record<string, number | string> })
        .catch(() => null);
    if (!saved) return null;
    return {
        taskId: task.id,
        values: GRADERS.map((g) => saved.results[g.name] ?? "-"),
        previous: undefined,
        // Placeholder — summarize() doesn't read ctx.
        ctx: undefined as unknown as GraderContext,
    };
}

/**
 * Map a value within [min, max] to a red→yellow→green RGB color. `good: "low"`
 * flips the spectrum so smaller is greener.
 */
function heat(v: number, scale: NonNullable<Grader["scale"]>) {
    const span = scale.max - scale.min;
    let t =
        typeof scale.good === "number"
            ? 1 - Math.abs(v - scale.good) / span
            : (v - scale.min) / span;
    t = Math.max(0, Math.min(1, t));
    if (scale.good === "low") t = 1 - t;
    // 0 → red (255,0,0), 0.5 → yellow (255,255,0), 1 → green (0,255,0)
    let r = t < 0.5 ? 255 : Math.round(255 * (1 - t) * 2);
    let g = t > 0.5 ? 255 : Math.round(255 * t * 2);
    // White text on the red/orange end; on that end, also darken the background
    // a bit so white clears VS Code's default minimumContrastRatio guard. The
    // yellow/green end keeps full brightness with black text.
    const whiteText = g < 220;
    if (whiteText) {
        r = Math.round(r * 0.75);
        g = Math.round(g * 0.75);
    }
    const fg = whiteText ? 255 : 0;
    return chalk.bgRgb(r, g, 0).rgb(fg, fg, fg).bold;
}

/**
 * Format one cell using the grader's own formatter (e.g. "100%", "4.2/5"),
 * appending a signed delta vs the previous run when both values are numeric.
 * Coloring is applied separately, after padding, so widths stay aligned.
 */
function display(
    g: Grader,
    v: number | string,
    prev?: number | string,
): string {
    let cell = typeof v === "number" ? (g.format?.(v) ?? String(v)) : v;
    if (typeof v === "number" && typeof prev === "number" && v !== prev) {
        const d = v - prev;
        cell = `${cell} (${d > 0 ? "+" : ""}${Number(d.toFixed(2))})`;
    }
    return cell;
}

function summarize(results: TaskResult[]): string {
    // Render every value to its display string first, then size each column
    // to the widest cell so the table aligns regardless of value lengths.
    const cells = results.map((r) =>
        GRADERS.map((c, i) => display(c, r.values[i]!, r.previous?.[c.name])),
    );
    // Wrap headers at spaces so wide names don't blow out the table width;
    // the column then only needs to fit the longest single word.
    const headerWords = GRADERS.map((c) => c.name.split(" "));
    const headerRows = Math.max(...headerWords.map((w) => w.length));
    const widths = GRADERS.map((c, i) =>
        Math.max(
            ...headerWords[i]!.map((w) => w.length),
            ...cells.map((row) => row[i]!.length),
        ),
    );
    const taskW = Math.max(4, ...results.map((r) => r.taskId.length));

    // Each cell carries its own one-space gutter so colored backgrounds fill
    // edge to edge; rows then join on a bare "|".
    const lines: string[] = ["", "=== scorecard ==="];
    for (let h = 0; h < headerRows; h++) {
        lines.push(
            [
                (h === 0 ? "task" : "").padEnd(taskW) + " ",
                ...GRADERS.map(
                    (_, i) => ` ${(headerWords[i]![h] ?? "").padStart(widths[i]!)} `,
                ),
            ].join("|"),
        );
    }
    lines.push(
        ["-".repeat(taskW + 1), ...widths.map((w) => "-".repeat(w + 2))].join("+"),
    );
    for (let r = 0; r < results.length; r++) {
        // Row must start with `${taskId} ` — batch shell loops grep for that.
        lines.push(
            [
                results[r]!.taskId.padEnd(taskW) + " ",
                ...cells[r]!.map((text, i) => {
                    // Pad to column width, add the gutter, then color the lot
                    // so the background spans the full cell.
                    const padded = ` ${text.padStart(widths[i]!)} `;
                    const v = results[r]!.values[i];
                    const scale = GRADERS[i]!.scale;
                    return typeof v === "number" && scale
                        ? heat(v, scale)(padded)
                        : padded;
                }),
            ].join("|"),
        );
    }

    // Footer: average each judge-kind grader across all tasks, so the noisy
    // model scores get a single headline number alongside the per-task rows.
    const judgeAvgs = GRADERS.flatMap((c, i) => {
        if (c.kind !== "judge") return [];
        const nums = results
            .map((r) => r.values[i])
            .filter((v): v is number => typeof v === "number");
        if (nums.length === 0) return [];
        return [
            `${c.name}=${(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)}`,
        ];
    });
    if (judgeAvgs.length > 0) {
        lines.push("");
        lines.push(`overall judge avg: ${judgeAvgs.join(" ")}`);
    }
    return lines.join("\n");
}

// ------------------------------------------------------------------- CLI

// Any number of task ids, or `--all` for the full set. Unlike create-slides
// (where an accidental --all costs 5 cloud sessions), grading is cheap and
// local — so no args defaults to grading everything in runs/.
// `--baseline` records this run as the reference point all future deltas
// compare against (writes baseline.score.json alongside score.json).
// `--show-baseline` re-prints the saved baseline scorecard without re-grading.
const { values, positionals } = parseArgs({
    options: {
        all: { type: "boolean" },
        baseline: { type: "boolean" },
        "show-baseline": { type: "boolean" },
    },
    allowPositionals: true,
});
const selected = selectTasks(
    "src/eval-runner.ts",
    positionals,
    (values.all ?? false) || positionals.length === 0,
);

if (values["show-baseline"]) {
    const loaded = await Promise.all(selected.map(loadBaseline));
    const results = loaded.filter((r): r is TaskResult => r !== null);
    if (results.length === 0) {
        console.error("No baseline.score.json found — run `npm run eval -- --baseline` first.");
        process.exit(1);
    }
    console.log(summarize(results));
} else {
    const client = new Anthropic();
    // Render + judge per task is independent — fan out across tasks. Each
    // task spawns its own render and parallel judge calls; total wall time
    // is roughly max(per-task), not sum. Use allSettled so one task failing
    // doesn't abort the others; the scorecard then shows whatever succeeded.
    const settled = await Promise.allSettled(
        selected.map((task) => gradeTask(client, task, values.baseline ?? false)),
    );
    const results: TaskResult[] = [];
    for (const [i, r] of settled.entries()) {
        if (r.status === "fulfilled") {
            results.push(r.value);
        } else {
            console.error(
                `[${selected[i]!.id}] FAILED: ${r.reason?.message ?? r.reason}`,
            );
        }
    }
    console.log(summarize(results));
}
