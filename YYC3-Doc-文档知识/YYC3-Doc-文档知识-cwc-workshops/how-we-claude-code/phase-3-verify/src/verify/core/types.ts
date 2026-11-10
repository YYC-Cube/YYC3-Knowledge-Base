// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * Core types for the verification framework.
 *
 * Design principles:
 *  - Verification is runtime observation at the SURFACE (rendered DOM), not
 *    static analysis or unit tests.
 *  - Verdicts follow the PASS / FAIL / BLOCKED / SKIP taxonomy. BLOCKED means
 *    "couldn't observe", which is distinct from FAIL ("observed and wrong").
 *  - Every verifiable unit declares FIXTURES: named, reproducible states.
 *    Fixtures marked `probe: true` are off-happy-path stress cases (🔍).
 *  - Verifiers are pluggable. Each one inspects a mounted unit and returns
 *    structured Check results. New verifier kinds can be added without
 *    touching any component code.
 *  - Output is machine-readable JSON first, human-readable dashboard second.
 */

import type { ReactElement } from "react";
import type { ZodTypeAny } from "zod";

/* -------------------------------------------------------------------------- */
/* Verdicts & checks                                                          */
/* -------------------------------------------------------------------------- */

export type Verdict = "PASS" | "FAIL" | "BLOCKED" | "SKIP";

/**
 * One observation a verifier made. Statuses follow a four-way taxonomy:
 *  ok    (✅) — confirmed
 *  fail  (❌) — observed and wrong
 *  warn  (⚠️) — concerning, didn't fail outright
 *  probe (🔍) — off-happy-path stress case that held
 */
export type CheckStatus = "ok" | "fail" | "warn" | "probe";

export interface Check {
  /** Which verifier produced this check (e.g. "schema", "invariants"). */
  verifier: string;
  status: CheckStatus;
  /** Short label — what was checked. */
  label: string;
  /** Optional longer detail, e.g. the actual vs expected values. */
  detail?: string;
  /** Optional raw evidence (serializable). Captured output IS the evidence. */
  evidence?: unknown;
}

/** The result of running all verifiers against one unit × fixture. */
export interface VerifyResult {
  unitId: string;
  fixtureId: string;
  verdict: Verdict;
  checks: Check[];
  /** Machine-readable snapshot of the DOM contract at time of run. */
  domSnapshot: Record<string, string>;
  /** Wall-clock timing for the run, ms. */
  durationMs: number;
  /** If BLOCKED, why we couldn't observe. */
  blockedReason?: string;
  timestamp: string;
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A Fixture is a named, reproducible rendering configuration.
 * `probe: true` marks an adversarial / edge-case fixture — the 🔍 steps.
 * A spec with zero probe fixtures has only replayed the happy path.
 */
export interface Fixture<P = unknown> {
  id: string;
  /** One-line human description of the scenario. */
  description: string;
  /** Props to mount the unit with. */
  props: P;
  /** Mark as an off-happy-path / stress fixture. */
  probe?: boolean;
  /**
   * Optional imperative actions to run after mount, before verification.
   * Lets a fixture express "render, then click X, then verify."
   * Receives the root element and a small driver with helpers.
   */
  act?: (ctx: ActContext) => void | Promise<void>;
}

export interface ActContext {
  /** The root DOM element the unit is mounted into. */
  root: HTMLElement;
  /** Click an element matching a selector inside the root. Throws if missing.
   *  May be async (visible driver animates a highlight) — always await. */
  click: (selector: string) => void | Promise<void>;
  /** Type into an input matching a selector. Throws if missing.
   *  May be async (visible driver types char-by-char) — always await. */
  type: (selector: string, text: string) => void | Promise<void>;
  /** Wait n ms — for transitions / async state to settle. */
  wait: (ms: number) => Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* Invariants                                                                 */
/* -------------------------------------------------------------------------- */

/** What an invariant predicate sees: the mounted DOM + the fixture's props. */
export interface InvariantContext<P = unknown> {
  root: HTMLElement;
  props: P;
  fixture: Fixture<P>;
  /** Convenience: read the DOM contract (`data-verify-*` attrs) as a map. */
  contract: Record<string, string>;
}

/**
 * An Invariant is a named predicate over the mounted unit.
 * It returns `true` (holds), `false` (violated), or a string (violated, with
 * a human-readable explanation).
 */
export interface Invariant<P = unknown> {
  id: string;
  description: string;
  check: (ctx: InvariantContext<P>) => boolean | string;
  /** Optionally restrict to specific fixtures. Default: all. */
  onlyFixtures?: string[];
}

/* -------------------------------------------------------------------------- */
/* Verifiers (pluggable)                                                      */
/* -------------------------------------------------------------------------- */

/** What every Verifier receives. */
export interface VerifierContext<P = unknown> {
  unit: VerifiableUnit<P>;
  fixture: Fixture<P>;
  root: HTMLElement;
  contract: Record<string, string>;
}

/**
 * A Verifier is a pluggable check. It inspects a mounted unit and returns
 * zero or more Checks. Verifiers are independent of components — you can
 * attach new kinds (a11y, perf, visual) without touching any component.
 */
export interface Verifier {
  id: string;
  description: string;
  run: (ctx: VerifierContext) => Check[] | Promise<Check[]>;
}

/* -------------------------------------------------------------------------- */
/* Verifiable unit                                                            */
/* -------------------------------------------------------------------------- */

/**
 * A VerifiableUnit is the unit of modularity. It can be a single component
 * or a whole feature slice. It declares:
 *  - how to render itself in isolation (render + fixtures)
 *  - what its props must look like (propsSchema)
 *  - what must always be true when rendered (invariants)
 *  - which pluggable verifiers to run (verifiers — default: all registered)
 */
export interface VerifiableUnit<P = unknown> {
  id: string;
  title: string;
  description: string;
  /** "component" for a leaf, "feature" for a slice with its own state. */
  kind: "component" | "feature";
  /** Render the unit in isolation for a given fixture. */
  render: (props: P) => ReactElement;
  /** Zod schema validating the props shape. */
  propsSchema?: ZodTypeAny;
  fixtures: Fixture<P>[];
  invariants: Invariant<P>[];
  /**
   * Which verifier IDs to run. Omit to run all registered verifiers.
   * This is how verifiers are pluggable per unit.
   */
  verifiers?: string[];
}

/* -------------------------------------------------------------------------- */
/* The global agent handle: window.__verify                                   */
/* -------------------------------------------------------------------------- */

export interface VerifyManifestEntry {
  unitId: string;
  title: string;
  kind: "component" | "feature";
  fixtures: Array<{ id: string; description: string; probe: boolean }>;
  verifiers: string[];
  invariants: Array<{ id: string; description: string }>;
  /** Deep-link to the isolated mount. */
  route: (fixtureId: string) => string;
}

/**
 * The agent-facing handle. Exposed on `window.__verify`. An AI agent (or
 * Playwright) can:
 *   - `window.__verify.manifest()` → discover every unit × fixture
 *   - navigate to `/verify/:unit/:fixture` → isolated mount
 *   - `window.__verify.current()` → structured VerifyResult for what's mounted
 *   - `window.__verify.runAll()` → run the full matrix headlessly
 */
export interface VerifyHandle {
  manifest: () => VerifyManifestEntry[];
  /** Result for whatever unit/fixture is currently mounted (null if none). */
  current: () => VerifyResult | null;
  /** Run every unit × fixture and return the full matrix. */
  runAll: () => Promise<VerifyResult[]>;
  /** Version of the verify protocol — lets agents know what to expect. */
  version: string;
}

declare global {
  interface Window {
    __verify?: VerifyHandle;
  }
}
