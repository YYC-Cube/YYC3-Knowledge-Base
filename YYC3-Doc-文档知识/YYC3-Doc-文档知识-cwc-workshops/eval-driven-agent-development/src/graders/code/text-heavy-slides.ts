// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { Grader } from "../types.js";

export const textHeavySlides: Grader = {
    name: "Text-heavy slides",
    kind: "code",
    description: "Slides with > 300 text chars (wall-of-text risk).",
    scale: { min: 0, max: 5, good: "low" },
    async grade(ctx) {
        return ctx.parsedPptx.perSlide.filter((s) => s.textChars > 300).length;
    },
};
