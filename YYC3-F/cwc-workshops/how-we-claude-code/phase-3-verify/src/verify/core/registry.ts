// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * Central registries for units and verifiers.
 *
 * Specs live in `src/verify/specs/` and register themselves here. Verifiers
 * live in `src/verify/verifiers/` and do the same. The harness discovers
 * everything through this registry — no magic globs, no build-time codegen.
 */

import type { VerifiableUnit, Verifier, VerifyManifestEntry } from "./types";

const units = new Map<string, VerifiableUnit<any>>();
const verifiers = new Map<string, Verifier>();

export function registerUnit<P>(unit: VerifiableUnit<P>): VerifiableUnit<P> {
  if (units.has(unit.id)) {
    // Hot-reload friendly: replace rather than throw.
    units.delete(unit.id);
  }
  units.set(unit.id, unit);
  return unit;
}

export function registerVerifier(verifier: Verifier): Verifier {
  if (verifiers.has(verifier.id)) verifiers.delete(verifier.id);
  verifiers.set(verifier.id, verifier);
  return verifier;
}

export function getUnit(id: string): VerifiableUnit<any> | undefined {
  return units.get(id);
}

export function getVerifier(id: string): Verifier | undefined {
  return verifiers.get(id);
}

export function allUnits(): VerifiableUnit<any>[] {
  return Array.from(units.values());
}

export function allVerifiers(): Verifier[] {
  return Array.from(verifiers.values());
}

/** Resolve which verifiers apply to a unit (all by default, or the declared
 *  subset). Unknown IDs are silently skipped — that surfaces as BLOCKED in
 *  the runner if it leaves zero verifiers. */
export function verifiersFor(unit: VerifiableUnit<any>): Verifier[] {
  if (!unit.verifiers) return allVerifiers();
  return unit.verifiers
    .map((id) => verifiers.get(id))
    .filter((v): v is Verifier => Boolean(v));
}

export function buildManifest(): VerifyManifestEntry[] {
  return allUnits().map((u) => ({
    unitId: u.id,
    title: u.title,
    kind: u.kind,
    fixtures: u.fixtures.map((f) => ({
      id: f.id,
      description: f.description,
      probe: Boolean(f.probe),
    })),
    verifiers: verifiersFor(u).map((v) => v.id),
    invariants: u.invariants.map((i) => ({
      id: i.id,
      description: i.description,
    })),
    route: (fixtureId: string) =>
      `/verify/${encodeURIComponent(u.id)}/${encodeURIComponent(fixtureId)}`,
  }));
}
