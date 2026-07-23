// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * The agent handle: window.__verify.
 *
 * This is the "surface for the verifier." An AI agent or Playwright script
 * can eval `window.__verify.manifest()` to discover every unit × fixture,
 * navigate to the isolated route, and read `window.__verify.current()` to
 * get a structured VerifyResult — no DOM scraping heuristics required.
 */

import { allUnits, buildManifest } from "../core/registry";
import { runUnit } from "../core/runner";
import type { VerifyHandle, VerifyResult } from "../core/types";

let currentResult: VerifyResult | null = null;

export function setCurrentResult(r: VerifyResult | null) {
  currentResult = r;
  // Also stash in a discoverable spot for agents that can only read DOM.
  const host = document.getElementById("verify-result-json");
  if (host) host.textContent = r ? JSON.stringify(r, null, 2) : "";
}

export function installVerifyHandle() {
  const handle: VerifyHandle = {
    version: "1.0",
    manifest: () => buildManifest(),
    current: () => currentResult,
    runAll: async () => {
      const out: VerifyResult[] = [];
      for (const unit of allUnits()) {
        out.push(...(await runUnit(unit)));
      }
      return out;
    },
  };
  window.__verify = handle;
  return handle;
}
