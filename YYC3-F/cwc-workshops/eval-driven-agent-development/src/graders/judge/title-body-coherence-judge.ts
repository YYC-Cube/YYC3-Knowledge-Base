// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { avg, ScoreSchema } from "./judge.js";
import type { Grader } from "../types.js";

export const titleBodyCoherenceJudge: Grader = {
    name: "Title-body coherence",
    kind: "judge",
    description: "Does each slide's body deliver on its title? Mean 0-5.",
    scale: { min: 0, max: 5, good: "high" },
    format: (v) => `${v.toFixed(1)}/5`,
    async grade(ctx) {
        // One text-only judge call per slide using the title/body pairs the
        // parser already split out, then average. Same structured-output
        // pattern as the vision judge, no image attached. Only this grader
        // reads these calls, so no cross-grader memoization.
        const results = await Promise.all(
            ctx.parsedPptx.slideTexts.map(async ({ title, body }) => {
                const resp = await ctx.client.messages.parse(
                    {
                        model: "claude-opus-4-7",
                        max_tokens: 256,
                        system: `Score 0-5 how well this slide's body content delivers on what its title promises.
0 = title and body are on entirely different topics.
5 = body squarely answers / supports the title.`,
                        output_config: {
                            format: zodOutputFormat(
                                z.object({
                                    coherence: ScoreSchema,
                                    comment: z.string(),
                                }),
                            ),
                        },
                        messages: [
                            {
                                role: "user",
                                content: `Title: ${title || "(empty)"}\n\nBody:\n${body || "(empty)"}`,
                            },
                        ],
                    },
                    { maxRetries: 10 },
                );
                return resp.parsed_output?.coherence ?? null;
            }),
        );
        const scored = results.filter((r) => r !== null);
        return scored.length > 0 ? avg(scored) : "-";
    },
};
