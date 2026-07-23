// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * DOM-contract verifier — checks that the mounted unit actually emits its
 * `data-verify-*` contract, and that the contract identifies the unit.
 *
 * The DOM is the surface. If a unit doesn't emit a contract, an agent has
 * nothing reliable to read — that's a FAIL, not a warning.
 */

import type { Check, Verifier } from "../core/types";
import { registerVerifier } from "../core/registry";
import { readAllContracts } from "../core/contract";

export const domContractVerifier: Verifier = registerVerifier({
  id: "dom-contract",
  description:
    "Checks the unit emits a machine-readable data-verify-* contract.",
  run({ unit, fixture, root, contract }) {
    const checks: Check[] = [];

    if (Object.keys(contract).length === 0) {
      return [
        {
          verifier: "dom-contract",
          status: "fail",
          label: "No DOM contract emitted",
          detail:
            "No element with data-verify-* attributes found. The surface is not machine-readable.",
        },
      ];
    }

    checks.push({
      verifier: "dom-contract",
      status: fixture.probe ? "probe" : "ok",
      label: `Contract present (${Object.keys(contract).length} attrs)`,
      evidence: contract,
    });

    if (contract.unit) {
      checks.push({
        verifier: "dom-contract",
        status: "ok",
        label: `Contract self-identifies as "${contract.unit}"`,
      });
    } else {
      checks.push({
        verifier: "dom-contract",
        status: "warn",
        label: "Contract missing data-verify-unit",
        detail: "Agents can't confirm they're observing the right component.",
      });
    }

    // Uniqueness: for component-kind units, we expect exactly one root
    // contract node unless the fixture says otherwise.
    const all = readAllContracts(root);
    if (unit.kind === "component" && all.length > 1) {
      checks.push({
        verifier: "dom-contract",
        status: "warn",
        label: `Multiple contract nodes found (${all.length})`,
        detail:
          "A component-kind unit emitted more than one data-verify-unit node.",
      });
    }

    return checks;
  },
});
