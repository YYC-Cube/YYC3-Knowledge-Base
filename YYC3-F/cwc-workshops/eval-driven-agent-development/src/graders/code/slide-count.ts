// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { Grader } from "../types.js";

export const slideCount: Grader = {
    name: "Slide count",
    kind: "code",
    description: "Slide count in the deck.",
    // Every task asks for 5 slides — exact match is green, drift is red.
    scale: { min: 0, max: 10, good: 5 },
    async grade(ctx) {
        return ctx.parsedPptx.slideCount;
    },
};
