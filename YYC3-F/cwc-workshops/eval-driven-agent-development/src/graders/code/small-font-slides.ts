// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { Grader } from "../types.js";

export const smallFontSlides: Grader = {
    name: "Small-font slides",
    kind: "code",
    description: "Slides with any font run under 14pt (readability floor).",
    scale: { min: 0, max: 5, good: "low" },
    async grade(ctx) {
        return ctx.parsedPptx.perSlide.filter(
            (s) => s.fontSizesPt.length > 0 && s.fontSizesPt[0]! < 14,
        ).length;
    },
};
