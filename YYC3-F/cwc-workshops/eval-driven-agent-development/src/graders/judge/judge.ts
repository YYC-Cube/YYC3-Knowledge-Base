// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * Shared plumbing for the four aesthetic-judge graders (text/image/layout/
 * color). Each one reads from the same memoized batch of vision calls and
 * averages a different criterion.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import memoize from "lodash/memoize.js";
import * as fs from "node:fs/promises";
import { z } from "zod";
import type { GraderContext } from "../types.js";

export const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

// Reusable Zod schema for a single 0-5 rubric score; both judges use it.
export const ScoreSchema = z.number().int().min(0).max(5);

/**
 * One slide's scores from the aesthetic vision judge — four criteria, each
 * 0-5, plus a free-text comment.
 */
export interface JudgeScoresPerSlide {
    /** 0-5 score, higher is better */
    index: number;

    /** 0-5 score, higher is better */
    text: number;

    /** 0-5 score, higher is better */
    image: number;

    /** 0-5 score, higher is better */
    layout: number;

    /** 0-5 score, higher is better */
    color: number;

    comment: string;
}

/**
 * One vision call per slide returning all four aesthetic criteria. Memoized
 * on the context object so the four "* judge" graders share a single batch
 * of model calls per deck.
 */
export const judgeAll = memoize(
    async (ctx: GraderContext): Promise<JudgeScoresPerSlide[]> => {
        const results = await Promise.all(
            ctx.jpgPaths.map((jpg, i) =>
                judgeSlideImage(ctx.client, i + 1, jpg),
            ),
        );
        return results.filter((r) => r !== null);
    },
);

async function judgeSlideImage(
    client: Anthropic,
    index: number,
    jpgPath: string,
): Promise<JudgeScoresPerSlide | null> {
    // Read the rendered slide JPG and base64-encode it for the vision input.
    const data = (await fs.readFile(jpgPath)).toString("base64");

    // Ask Opus to score the slide image on the four aesthetic criteria.
    // `messages.parse` + `zodOutputFormat` = structured outputs: the schema
    // is enforced server-side and the result lands in `resp.parsed_output`
    // already typed, with no manual JSON parsing or null-field guards needed.
    const resp = await client.messages.parse(
        {
            model: "claude-opus-4-7",
            max_tokens: 256,
            system: `Please evaluate the slide based on each of the following criteria:

text: The title should be simple and clear to indicate the main point. For main content, avoid too many texts and keep words concise. Use a consistent and readable font size, style, and color.

image: Use high-quality images with a reasonable proportion. Do not penalize the slide if no image is involved.

layout: Elements should be aligned, do not overlap, and have sufficient margins to each other. All elements should not exceed the page.

color: Use high-contrast color especially between the text and the background. Avoid using high-glaring colors.

For each criterion, give an integer score between 0 and 5 (higher = better). Give scores across the full spectrum (0-5) instead of only good ones (3-5).`,
            output_config: {
                format: zodOutputFormat(
                    z.object({
                        text: ScoreSchema,
                        image: ScoreSchema,
                        layout: ScoreSchema,
                        color: ScoreSchema,
                        comment: z.string(),
                    }),
                ),
            },
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: "image/jpeg",
                                data,
                            },
                        },
                        {
                            type: "text",
                            text: "Score this slide on the four criteria.",
                        },
                    ],
                },
            ],
        },
        { maxRetries: 10 },
    );

    // Tag the typed result with the slide index. parsed_output is null only
    // if the model produced no structured block at all (rare).
    return resp.parsed_output ? { index, ...resp.parsed_output } : null;
}
