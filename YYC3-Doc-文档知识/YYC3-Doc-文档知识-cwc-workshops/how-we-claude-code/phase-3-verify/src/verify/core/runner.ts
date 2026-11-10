// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * The runner: mount a unit × fixture off-screen, run all applicable
 * verifiers, compute a verdict, return a structured VerifyResult.
 *
 * Verdict rules:
 *  - BLOCKED if we couldn't mount / had no verifiers / threw during setup.
 *  - FAIL if any check is "fail".
 *  - PASS otherwise (warn and probe don't fail the run).
 *  - SKIP if the unit declares zero fixtures — nothing to observe.
 *
 * "When in doubt, FAIL." Exceptions during a verifier become a "fail" check
 * with the error as evidence — we do not swallow.
 */

import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type {
  ActContext,
  Check,
  Fixture,
  VerifiableUnit,
  Verdict,
  VerifyResult,
} from "./types";
import { readContract } from "./contract";
import { verifiersFor } from "./registry";

export interface RunOptions {
  /** Mount into this element instead of an off-screen container. Lets the
   *  harness verify the *visible* mount, not a hidden clone. */
  container?: HTMLElement;
  /** Already-mounted: skip mounting, just read + verify `container`. */
  alreadyMounted?: boolean;
}

export async function runFixture<P>(
  unit: VerifiableUnit<P>,
  fixture: Fixture<P>,
  opts: RunOptions = {}
): Promise<VerifyResult> {
  const started = performance.now();
  const base = {
    unitId: unit.id,
    fixtureId: fixture.id,
    timestamp: new Date().toISOString(),
  };

  const applicable = verifiersFor(unit);
  if (applicable.length === 0) {
    return {
      ...base,
      verdict: "BLOCKED",
      checks: [],
      domSnapshot: {},
      durationMs: ms(started),
      blockedReason: `No verifiers registered for unit "${unit.id}".`,
    };
  }

  let container = opts.container ?? null;
  let ownRoot: Root | null = null;
  let ownContainer: HTMLElement | null = null;

  try {
    if (!opts.alreadyMounted) {
      if (!container) {
        ownContainer = document.createElement("div");
        ownContainer.setAttribute("data-verify-sandbox", "true");
        // Off-screen but in the DOM so layout/a11y queries work.
        ownContainer.style.position = "fixed";
        ownContainer.style.left = "-10000px";
        ownContainer.style.top = "0";
        ownContainer.style.width = "800px";
        document.body.appendChild(ownContainer);
        container = ownContainer;
      }
      ownRoot = createRoot(container);
      flushSync(() => {
        ownRoot!.render(unit.render(fixture.props));
      });
      // Let effects run.
      await tick();
      if (fixture.act) {
        await fixture.act(makeActContext(container));
        await tick();
      }
    }

    if (!container) {
      return {
        ...base,
        verdict: "BLOCKED",
        checks: [],
        domSnapshot: {},
        durationMs: ms(started),
        blockedReason: "No container to observe.",
      };
    }

    const contract = readContract(container);
    const checks: Check[] = [];

    for (const v of applicable) {
      try {
        const produced = await v.run({
          unit: unit as VerifiableUnit<unknown>,
          fixture: fixture as Fixture<unknown>,
          root: container,
          contract,
        });
        checks.push(...produced);
      } catch (err) {
        checks.push({
          verifier: v.id,
          status: "fail",
          label: `Verifier "${v.id}" threw`,
          detail: String(err),
          evidence: err instanceof Error ? err.stack : err,
        });
      }
    }

    return {
      ...base,
      verdict: verdictOf(checks),
      checks,
      domSnapshot: contract,
      durationMs: ms(started),
    };
  } catch (err) {
    return {
      ...base,
      verdict: "BLOCKED",
      checks: [],
      domSnapshot: {},
      durationMs: ms(started),
      blockedReason: `Mount failed: ${String(err)}`,
    };
  } finally {
    if (ownRoot) ownRoot.unmount();
    if (ownContainer) ownContainer.remove();
  }
}

export async function runUnit<P>(
  unit: VerifiableUnit<P>
): Promise<VerifyResult[]> {
  if (unit.fixtures.length === 0) {
    return [
      {
        unitId: unit.id,
        fixtureId: "(none)",
        verdict: "SKIP",
        checks: [],
        domSnapshot: {},
        durationMs: 0,
        blockedReason: "Unit declares no fixtures — nothing to observe.",
        timestamp: new Date().toISOString(),
      },
    ];
  }
  const out: VerifyResult[] = [];
  for (const f of unit.fixtures) {
    out.push(await runFixture(unit, f));
  }
  return out;
}

export function verdictOf(checks: Check[]): Verdict {
  if (checks.some((c) => c.status === "fail")) return "FAIL";
  return "PASS";
}

/* ----------------------------- helpers ----------------------------- */

function ms(since: number) {
  return Math.round(performance.now() - since);
}

function tick() {
  return new Promise<void>((r) => setTimeout(r, 0));
}

export function makeActContext(root: HTMLElement): ActContext {
  return {
    root,
    click(selector) {
      const el = root.querySelector<HTMLElement>(selector);
      if (!el) throw new Error(`act.click: no element matching "${selector}"`);
      el.click();
    },
    type(selector, text) {
      const el = root.querySelector<HTMLInputElement>(selector);
      if (!el) throw new Error(`act.type: no element matching "${selector}"`);
      // React 18: set via native setter so React's onChange fires.
      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      setter?.call(el, text);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    wait(msAmt) {
      return new Promise((r) => setTimeout(r, msAmt));
    },
  };
}
