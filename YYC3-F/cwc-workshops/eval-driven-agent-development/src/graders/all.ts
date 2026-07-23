// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { Grader } from "./types.js";

import { producedResult } from "./code/produced-result.js";
import { slideCount } from "./code/slide-count.js";
import { slidesWithImage } from "./code/slides-with-image.js";
import { textHeavySlides } from "./code/text-heavy-slides.js";
import { clutteredSlides } from "./code/cluttered-slides.js";
import { smallFontSlides } from "./code/small-font-slides.js";
import { emojiCount } from "./code/emoji-count.js";
import { textJudge } from "./judge/text-judge.js";
import { imageJudge } from "./judge/image-judge.js";
import { layoutJudge } from "./judge/layout-judge.js";
import { colorJudge } from "./judge/color-judge.js";
import { titleBodyCoherenceJudge } from "./judge/title-body-coherence-judge.js";

/** All code-based (deterministic) graders, in scorecard order. */
export const allCodeGraders: Grader[] = [
    producedResult,
    slideCount,
    slidesWithImage,
    textHeavySlides,
    clutteredSlides,
    smallFontSlides,
    emojiCount,
];

/** All model-as-a-judge graders, in scorecard order. */
export const allModelJudgeEvals: Grader[] = [
    textJudge,
    imageJudge,
    layoutJudge,
    colorJudge,
    titleBodyCoherenceJudge,
];
