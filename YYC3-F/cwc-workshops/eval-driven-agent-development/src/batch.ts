// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * Full sweep: every agent variant × every task. Rounds run sequentially
 * (5 tasks parallel within a round) to avoid hammering CMA with 25
 * simultaneous sessions. After each round, decks are rendered + graded
 * in place so partial results survive if the run is interrupted.
 *
 * Output: runs-batch/<round>/<task>/{output.pptx, render/, score.json}
 * plus runs-batch/SUMMARY.md with the full scorecard table.
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "node:fs/promises";
import path from "node:path";
import pRetry from "p-retry";
import { ROOT, tasks } from "./lib.js";
import { renderPptx } from "./render.js";

const ENVIRONMENT_ID = "env_01PSAtKYnL8cp5iFKw19bVyC";

const ROUNDS = [
    { key: "00-naive", agent: "agent_011CakWtiBj8RBnEintfAudo" },
    { key: "01-polish", agent: "agent_011CamBhoctNW8KhhZodJUwT" },
    { key: "02-diagram", agent: "agent_011CamBhqAerHbpN9S4UJvin" },
    { key: "03-qa-loop", agent: "agent_011CamAdtU7Cqinh12FmWizt" },
    { key: "04-model-swap", agent: "agent_011CamAdujX6pjePDccWQytu" },
];

const BATCH_DIR = path.join(ROOT, "runs-batch");
const client = new Anthropic();

async function runOne(roundKey: string, agentId: string, taskId: string, prompt: string) {
    const tag = `[${roundKey}/${taskId}]`;
    const dir = path.join(BATCH_DIR, roundKey, taskId);
    // Skip if already produced (resume support).
    try {
        await fs.access(path.join(dir, "output.pptx"));
        console.log(`${tag} cached`);
        return;
    } catch {}
    const session = await client.beta.sessions.create({
        agent: { type: "agent", id: agentId },
        environment_id: ENVIRONMENT_ID,
        title: `batch-${roundKey}-${taskId}`,
    });
    console.log(`${tag} ${session.id}`);

    const stream = await client.beta.sessions.events.stream(session.id);
    await client.beta.sessions.events.send(session.id, {
        events: [{ type: "user.message", content: [{ type: "text", text: prompt }] }],
    });
    for await (const ev of stream) {
        if (ev.type === "session.status_idle") {
            if (ev.stop_reason.type === "requires_action") continue;
            break;
        }
        if (ev.type === "session.status_terminated") {
            console.log(`${tag} terminated`);
            return;
        }
    }

    const files = await pRetry(
        async () => {
            const { data } = await client.beta.files.list({
                scope_id: session.id,
                betas: ["managed-agents-2026-04-01"],
            });
            if (!data.some((f) => f.filename.endsWith(".pptx"))) {
                throw new Error("not indexed yet");
            }
            return data;
        },
        { retries: 10, minTimeout: 1000, factor: 2, maxTimeout: 10000 },
    ).catch(() => []);

    await fs.mkdir(dir, { recursive: true });
    for (const f of files) {
        const local = path.join(dir, path.basename(f.filename));
        const resp = await client.beta.files.download(f.id);
        await fs.writeFile(local, Buffer.from(await resp.arrayBuffer()));
    }
    const pptx = path.join(dir, "output.pptx");
    try {
        await renderPptx(pptx, path.join(dir, "render"));
    } catch (e) {
        console.log(`${tag} render failed: ${(e as Error).message}`);
    }
    console.log(`${tag} done`);
}

for (const round of ROUNDS) {
    console.log(`\n=== ${round.key} ===`);
    const results = await Promise.allSettled(
        tasks.map((t) => runOne(round.key, round.agent, t.id, t.prompt)),
    );
    for (const [i, r] of results.entries()) {
        if (r.status === "rejected") {
            console.log(`[${round.key}/${tasks[i]!.id}] FAILED: ${r.reason?.message ?? r.reason}`);
        }
    }
}

// Clean up any leftover dirs from earlier structures.
for (const stale of ["01-visual", "02-polish", "02-typography", "03-palette", "04-density", "05-qa-loop"]) {
    await fs.rm(path.join(BATCH_DIR, stale), { recursive: true, force: true });
}

console.log("\nAll rounds complete. Decks + renders in runs-batch/<round>/<task>/.");
console.log("Grade with: for each round, copy to runs/ and run grader --all.");
