// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * Schema verifier — validates fixture props against the unit's Zod schema.
 *
 * This is the "static shape" half of the contract. It catches drift between
 * what a fixture claims to render and what the component actually expects.
 */

import type { Check, Verifier } from "../core/types";
import { registerVerifier } from "../core/registry";

export const schemaVerifier: Verifier = registerVerifier({
  id: "schema",
  description: "Validates fixture props against the unit's Zod propsSchema.",
  run({ unit, fixture }) {
    if (!unit.propsSchema) {
      return [
        {
          verifier: "schema",
          status: "warn",
          label: "No propsSchema declared",
          detail:
            "Unit has no Zod schema — fixtures are unvalidated. Consider declaring one.",
        },
      ];
    }
    const result = unit.propsSchema.safeParse(fixture.props);
    if (result.success) {
      const check: Check = {
        verifier: "schema",
        status: fixture.probe ? "probe" : "ok",
        label: "Props match schema",
      };
      return [check];
    }
    return [
      {
        verifier: "schema",
        status: "fail",
        label: "Props violate schema",
        detail: result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
        evidence: result.error.issues,
      },
    ];
  },
});
