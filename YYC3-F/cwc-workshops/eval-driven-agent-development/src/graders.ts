// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * The eval, declaratively.
 *
 * Each scorecard column is a `Grader` object: a name, a kind (code-grader
 * vs LLM-judge), a one-line description, and a `grade` method that turns a
 * prepared GraderContext into one number (or short string) for the table.
 *
 * The harness (eval-runner.ts) builds the context once per deck — parsed pptx,
 * rendered JPGs, memoized judge calls — and runs every check against it.
 * Adding a metric = appending one object to GRADERS.
 */

export type { Grader, GraderContext } from "./graders/types.js";
import type { Grader } from "./graders/types.js";

export const GRADERS: Grader[] = [
    {
        name: "Produced result",
        kind: "code",
        description: "Did the agent produce a valid .pptx at all?",
        grade(ctx) {
            if (!ctx.parsedPptx.exists) {
                return "missing";
            }
            if (!ctx.parsedPptx.validZip) {
                return "invalid";
            }
            return "ok";
        },
    },

    // more graders...
];
