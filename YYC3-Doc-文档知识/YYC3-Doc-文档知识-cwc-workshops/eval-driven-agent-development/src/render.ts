// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * Renders a .pptx to per-slide JPGs locally via Docker (libreoffice +
 * poppler-utils in a debian:bookworm-slim image). The image must be
 * pre-built — see WORKSHOP.md for the one-line `docker build` command.
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

// Docker image tag — built once from this repo's Dockerfile (LibreOffice +
// poppler-utils + metric-compatible fonts on debian-slim).
const IMAGE = "cwc-pptx-render";

export async function renderPptx(pptxPath: string, outDir: string): Promise<string[]> {
  // Resolve to absolute host paths for the bind mounts, and split out the
  // basename / stem so the in-container shell can reference them.
  const absPptx = path.resolve(pptxPath);
  const absOut = path.resolve(outDir);
  const inputDir = path.dirname(absPptx);
  const basename = path.basename(absPptx);
  const stem = path.basename(absPptx, path.extname(absPptx));

  await fs.mkdir(absOut, { recursive: true });

  // Run a throwaway container with the deck's directory mounted read-only at
  // /in and the output directory mounted at /out. Inside it, LibreOffice
  // headless converts pptx→pdf, then pdftoppm rasterises one JPG per page.
  // --pull=never makes a missing image fail fast instead of trying Docker Hub.
  // Filenames are passed as positional args ($1, $2) rather than interpolated
  // into the sh -c script, so shell metacharacters in paths can't break out.
  await execFileP("docker", [
    "run",
    "--rm",
    "--pull=never",
    "-v",
    `${inputDir}:/in:ro`,
    "-v",
    `${absOut}:/out`,
    IMAGE,
    "sh",
    "-c",
    'soffice --headless --convert-to pdf --outdir /tmp "/in/$1" && pdftoppm -jpeg -r 120 "/tmp/$2.pdf" /out/slide',
    "sh",
    basename,
    stem,
  ]);

  // Collect the produced slide-N.jpg files and return them in slide order
  // (numeric collation so slide-10 comes after slide-9, not after slide-1).
  const entries = await fs.readdir(absOut);
  return entries
    .filter((n) => /\.jpe?g$/i.test(n))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((n) => path.join(absOut, n));
}

// Standalone CLI: `npm run render -- <task_id>` renders runs/<task>/output.pptx
// without grading, so attendees can flip through JPGs in any image viewer.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { RUNS_DIR, tasks } = await import("./lib.js");
  const taskId = process.argv[2];
  if (!taskId || !tasks.some((t) => t.id === taskId)) {
    console.error(`usage: tsx src/render.ts <task_id>`);
    console.error(`available: ${tasks.map((t) => t.id).join(", ")}`);
    process.exit(1);
  }
  const dir = path.join(RUNS_DIR, taskId);
  const out = await renderPptx(path.join(dir, "output.pptx"), path.join(dir, "render"));
  console.log(`rendered ${out.length} slides → ${path.join(dir, "render")}`);
}
