// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * Invariant verifier — runs every invariant predicate the unit declares
 * against the mounted DOM.
 *
 * Invariants are runtime assertions: they hold for every fixture (unless
 * scoped via `onlyFixtures`). This is the design-by-contract half.
 */

import type { Check, Verifier } from "../core/types";
import { registerVerifier } from "../core/registry";

export const invariantVerifier: Verifier = registerVerifier({
  id: "invariants",
  description: "Runs the unit's declared invariant predicates against the DOM.",
  run({ unit, fixture, root, contract }) {
    const checks: Check[] = [];
    for (const inv of unit.invariants) {
      if (inv.onlyFixtures && !inv.onlyFixtures.includes(fixture.id)) continue;
      let outcome: boolean | string;
      try {
        outcome = inv.check({ root, props: fixture.props, fixture, contract });
      } catch (err) {
        checks.push({
          verifier: "invariants",
          status: "fail",
          label: inv.description,
          detail: `Invariant "${inv.id}" threw: ${String(err)}`,
        });
        continue;
      }
      if (outcome === true) {
        checks.push({
          verifier: "invariants",
          status: fixture.probe ? "probe" : "ok",
          label: inv.description,
        });
      } else {
        checks.push({
          verifier: "invariants",
          status: "fail",
          label: inv.description,
          detail:
            typeof outcome === "string"
              ? outcome
              : `Invariant "${inv.id}" returned false.`,
        });
      }
    }
    if (checks.length === 0) {
      checks.push({
        verifier: "invariants",
        status: "warn",
        label: "No invariants ran",
        detail:
          "Unit declares no invariants for this fixture. A surface with zero invariants is unverified.",
      });
    }
    return checks;
  },
});
