// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * Starts a session against the slide-generation agent for one task (or --all)
 * and downloads the produced .pptx into runs/<task-id>/.
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import pRetry from "p-retry";
import { RUNS_DIR, selectTasks, type Task } from "./lib.js";

// Paste the IDs returned by `ant beta:environments create` /
// `ant beta:agents create` here. The underlying definitions live in
// resources/*.yaml; iterate via `ant beta:agents update < file.yaml`.
const ENVIRONMENT_ID = "";
const AGENT_ID = "";
const WORKSPACE_ID = "default";

async function runTask(
    client: Anthropic,
    task: Task,
    verbose: boolean,
): Promise<string | null> {
    // In --all mode many tasks run concurrently, so prefix every line with
    // the task id to keep the interleaved output readable.
    const log = (msg: string) => console.log(`[${task.id}] ${msg}`);

    if (verbose) {
        console.log(`\n=== ${task.id} ===`);
        console.log(`prompt: ${task.prompt}`);
    }

    // Start a Managed Agents session. The model, system prompt, and tools all
    // live on the agent object (created from YAML via the `ant` CLI); the
    // session just points at it plus an environment to run in.
    const session = await client.beta.sessions.create({
        agent: { type: "agent", id: AGENT_ID },
        environment_id: ENVIRONMENT_ID,
        title: `workshop-${task.id}`,
    });
    // Build a clickable Console trace URL so we can watch the agent's
    // reasoning and tool calls in the browser.
    const consoleUrl = `https://platform.claude.com/workspaces/${WORKSPACE_ID}/sessions/${session.id}`;
    if (verbose) {
        console.log(`session: ${session.id}`);
        console.log(`console: ${consoleUrl}`);
    } else {
        log(`started ${session.id} → ${consoleUrl}`);
    }

    // Open the SSE event stream BEFORE sending the user message — the stream
    // only delivers events that occur after it's opened, so stream-first
    // avoids missing the agent's early thinking/tool events.
    const stream = await client.beta.sessions.events.stream(session.id);
    await client.beta.sessions.events.send(session.id, {
        events: [
            {
                type: "user.message",
                content: [{ type: "text", text: task.prompt }],
            },
        ],
    });

    // Consume events until the session goes idle for real. We surface the
    // agent's text and tool calls in verbose mode so you can watch it work,
    // and capture the full event log for the on-disk session record.
    const events: unknown[] = [];
    streamLoop: for await (const event of stream) {
        events.push(event);
        switch (event.type) {
            case "agent.message":
                // The agent's final natural-language reply (often a summary
                // of what it built). Stream it through to stdout.
                if (!verbose) break;
                for (const block of event.content) {
                    if (block.type === "text") process.stdout.write(block.text);
                }
                break;
            case "agent.tool_use":
                // A bash / file-write / etc. tool call inside the container.
                // Just print the tool name as a progress indicator.
                if (verbose) process.stdout.write(`\n[tool] ${event.name}\n`);
                break;
            case "session.status_idle":
                // requires_action = transient idle waiting on tool confirmation; keep streaming.
                if (event.stop_reason.type === "requires_action") break;
                // Any other stop_reason (end_turn, retries_exhausted) means
                // the agent is genuinely finished — exit the stream loop.
                if (verbose) {
                    console.log(`\n--- done (${event.stop_reason.type}) ---`);
                }
                break streamLoop;
            case "session.status_terminated":
                // Irrecoverable — the session is gone, no outputs to fetch.
                (verbose ? console.log : log)("terminated");
                return null;
        }
    }

    // List the agent's output files (it writes them to /mnt/session/outputs/
    // in the container; the Files API indexes them under the session id).
    // Retry briefly — there's a 1-3s indexing lag after the session goes idle.
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

    // Persist the session id, console URL, and full event log next to the
    // outputs so the grader (and you) can trace back to the exact run.
    const outDir = path.join(RUNS_DIR, task.id);
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(
        path.join(outDir, "session.json"),
        JSON.stringify({ sessionId: session.id, consoleUrl, events }, null, 2),
    );

    if (files.length === 0) {
        (verbose ? console.log : log)("no output files indexed");
        return null;
    }

    // Download every output file to runs/<task-id>/. The agent typically
    // writes output.pptx plus the python script it ran; we save both.
    const saved = await Promise.all(
        files.map(async (f) => {
            const local = path.join(outDir, path.basename(f.filename));
            const resp = await client.beta.files.download(f.id);
            await fs.writeFile(local, Buffer.from(await resp.arrayBuffer()));
            console.log(`saved: ${local}`);
            return local;
        }),
    );
    // Return the .pptx path specifically — that's the artifact the eval grades.
    const pptx = saved.find((p) => p.endsWith(".pptx")) ?? null;
    if (!verbose)
        log(
            pptx
                ? `done → ${path.relative(process.cwd(), pptx)}`
                : "done (no pptx)",
        );
    return pptx;
}

// ---------------------------------------------------------------- CLI entry

// Accept any number of task ids (`create-slides technology food`) or `--all`
// for the full task set.
const { values, positionals } = parseArgs({
    options: { all: { type: "boolean" } },
    allowPositionals: true,
});
const selected = selectTasks(
    "src/create-slides.ts",
    positionals,
    values.all ?? false,
);

// One SDK client shared across all tasks. It reads ANTHROPIC_API_KEY from env.
const client = new Anthropic();
if (selected.length === 1) {
    // Single task: stream the agent's text and tool calls live so you can
    // watch it work.
    await runTask(client, selected[0]!, true);
} else {
    // Multiple tasks are independent CMA sessions; run them concurrently.
    // Per-task streaming is suppressed so the interleaved output stays
    // readable — one start line and one done line each. Use allSettled so
    // one task throwing doesn't abort the rest.
    const results = await Promise.allSettled(
        selected.map((task) => runTask(client, task, false)),
    );
    for (const [i, r] of results.entries()) {
        if (r.status === "rejected") {
            console.error(
                `[${selected[i]!.id}] FAILED: ${r.reason?.message ?? r.reason}`,
            );
        }
    }
}
