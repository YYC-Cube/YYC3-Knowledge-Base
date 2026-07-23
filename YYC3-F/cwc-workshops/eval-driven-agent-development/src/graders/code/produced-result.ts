// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { Grader } from "../types.js";

export const producedResult: Grader = {
    name: "Produced result",
    kind: "code",
    description: "Did the agent produce a valid .pptx at all?",
    async grade(ctx) {
        const p = ctx.parsedPptx;
        if (!p.exists) {
            return "missing";
        }
        if (!p.validZip) {
            return "invalid";
        }
        return "ok";
    },
};
