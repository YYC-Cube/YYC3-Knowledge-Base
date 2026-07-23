// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { Grader } from "../types.js";

export const slidesWithImage: Grader = {
    name: "Slides with image",
    kind: "code",
    description: "Share of slides containing at least one picture.",
    scale: { min: 0, max: 1, good: "high" },
    format: (v) => `${(v * 100).toFixed(0)}%`,
    async grade(ctx) {
        const s = ctx.parsedPptx.perSlide;
        return s.length > 0
            ? s.filter((x) => x.pictureCount > 0).length / s.length
            : 0;
    },
};
