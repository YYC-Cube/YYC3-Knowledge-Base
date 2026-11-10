// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { Grader } from "../types.js";

export const clutteredSlides: Grader = {
    name: "Cluttered slides",
    kind: "code",
    description: "Slides with > 20 shapes (clutter risk).",
    scale: { min: 0, max: 5, good: "low" },
    async grade(ctx) {
        return ctx.parsedPptx.perSlide.filter((s) => s.shapeCount > 20).length;
    },
};
