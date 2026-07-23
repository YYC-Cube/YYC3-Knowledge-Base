// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import { fileURLToPath } from "node:url";
import tasksJson from "../tasks.json" with { type: "json" };

export const ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
);
export const RUNS_DIR = path.join(ROOT, "runs");

/**
 * One scenario in the eval's test set — a short id and the one-line prompt
 * sent to the agent. Loaded from `tasks.json`.
 */
export interface Task {
    id: string;
    prompt: string;
}

export const tasks: Task[] = tasksJson;

/**
 * Resolve task ids from the CLI. Accepts any number of ids, or `--all` for
 * the full set. Exits with usage if none given or any id is unknown.
 */
export function selectTasks(script: string, ids: string[], all: boolean): Task[] {
    if (all) return tasks;
    const available = tasks.map((t) => t.id).join(", ");
    if (ids.length === 0) {
        console.error(`usage: tsx ${script} <task_id> [<task_id> ...] | --all`);
        console.error(`available: ${available}`);
        process.exit(1);
    }
    return ids.map((id) => {
        const found = tasks.find((t) => t.id === id);
        if (!found) {
            console.error(`unknown task: ${id}\navailable: ${available}`);
            process.exit(1);
        }
        return found;
    });
}
