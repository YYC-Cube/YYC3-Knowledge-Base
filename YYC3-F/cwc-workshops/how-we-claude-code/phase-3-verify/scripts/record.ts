// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * Scriptable replay recorder.
 *
 *   bun run record               # records full replay → recordings/replay-<ts>.webm
 *   bun run record --dwell 1200  # tune dwell
 *   bun run record --url http://localhost:5199/verify/replay?key=80
 *
 * Requires:  bunx playwright install chromium   (one-time)
 * Requires:  dev server running on :5199        (bun run dev)
 *
 * How it works: launches headed Chromium with Playwright's built-in
 * recordVideo, navigates to /verify/replay, polls window.__verify_replay.done,
 * then closes the context (which finalizes the .webm) and renames it.
 */

import { chromium } from "playwright";
import { mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";

const args = parseArgs(process.argv.slice(2));
const DWELL = Number(args.dwell ?? 1500);
const KEY = Number(args.key ?? 60);
const BASE = String(args.base ?? "http://localhost:5199");
const URL =
  String(
    args.url ??
      `${BASE}/verify/replay?dwell=${DWELL}&key=${KEY}&auto=1`
  );
const OUT_DIR = "recordings";
const SIZE = { width: 1280, height: 900 };

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const before = new Set(safeLs(OUT_DIR));

  console.log(`▶ launching chromium → ${URL}`);
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: OUT_DIR, size: SIZE },
  });
  const page = await context.newPage();

  await page.goto(URL, { waitUntil: "networkidle" });

  // Wait for the replay to finish.
  console.log("⏺ recording — waiting for window.__verify_replay.done …");
  await page.waitForFunction(
    () =>
      (window as unknown as { __verify_replay?: { done: boolean } })
        .__verify_replay?.done === true,
    null,
    { timeout: 10 * 60_000 }
  );
  // Let the summary screen sit for a beat so it's in the video.
  await page.waitForTimeout(1200);

  // Grab the structured results before closing.
  const results = await page.evaluate(
    () =>
      (window as unknown as { __verify_replay?: { results: unknown[] } })
        .__verify_replay?.results ?? []
  );

  // Closing the context finalizes the video file.
  await context.close();
  await browser.close();

  // Find the new file Playwright wrote and rename it.
  const after = safeLs(OUT_DIR).filter((f) => !before.has(f));
  const newest =
    after.sort(
      (a, b) =>
        statSync(join(OUT_DIR, b)).mtimeMs - statSync(join(OUT_DIR, a)).mtimeMs
    )[0] ?? null;
  if (!newest) {
    console.error("✖ no video file produced — is chromium installed?");
    process.exit(1);
  }
  const finalName = `replay-${stamp()}.webm`;
  renameSync(join(OUT_DIR, newest), join(OUT_DIR, finalName));

  const summary = summarize(results as Array<{ verdict: string }>);
  console.log(
    `✔ saved ${join(OUT_DIR, finalName)}  (${summary.pass} pass / ${summary.fail} fail / ${summary.blocked} blocked of ${summary.total})`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/* helpers */

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      out[key] = val;
    }
  }
  return out;
}

function safeLs(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
    d.getHours()
  )}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function summarize(results: Array<{ verdict: string }>) {
  return {
    total: results.length,
    pass: results.filter((r) => r.verdict === "PASS").length,
    fail: results.filter((r) => r.verdict === "FAIL").length,
    blocked: results.filter((r) => r.verdict === "BLOCKED").length,
  };
}
