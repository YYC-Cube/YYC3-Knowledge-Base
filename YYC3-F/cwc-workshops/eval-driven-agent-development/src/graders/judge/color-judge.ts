// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { avg, judgeAll } from "./judge.js";
import type { Grader } from "../types.js";

export const colorJudge: Grader = {
    name: "Color judge",
    kind: "judge",
    description: "Model judge — color/contrast, mean 0-5.",
    scale: { min: 0, max: 5, good: "high" },
    format: (v) => `${v.toFixed(1)}/5`,
    async grade(ctx) {
        const scored = await judgeAll(ctx);
        return scored.length > 0 ? avg(scored.map((s) => s.color)) : "-";
    },
};
