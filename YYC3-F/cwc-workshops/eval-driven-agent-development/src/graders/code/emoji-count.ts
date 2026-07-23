// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { Grader } from "../types.js";

export const emojiCount: Grader = {
    name: "Emoji count",
    kind: "code",
    description: "Total emoji glyphs across the deck.",
    scale: { min: 0, max: 20, good: "low" },
    async grade(ctx) {
        return ctx.parsedPptx.perSlide.reduce((a, s) => a + s.emojiCount, 0);
    },
};
