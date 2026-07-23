// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * The DOM contract: `data-verify-*` attributes.
 *
 * Components emit `data-verify-*` attributes so that the rendered DOM itself
 * is machine-readable ground truth. The principle: the surface is where you
 * observe — and for a React app, the DOM is the surface.
 *
 * Example: <li data-verify-unit="TodoItem" data-verify-done="true" ...>
 *
 * Verifiers and agents read this contract instead of reaching into React
 * internals, which keeps the surface stable across refactors.
 */

export const VERIFY_PREFIX = "data-verify-";

/** Build a `data-verify-*` props object from a plain record. */
export function verifyAttrs(
  attrs: Record<string, string | number | boolean | null | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) continue;
    out[`${VERIFY_PREFIX}${key}`] = String(value);
  }
  return out;
}

/** Read all `data-verify-*` attributes from the first contract-bearing
 *  element inside `root` (or `root` itself). Returns a flat map. */
export function readContract(root: HTMLElement): Record<string, string> {
  const el = findContractRoot(root);
  if (!el) return {};
  const out: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith(VERIFY_PREFIX)) {
      out[attr.name.slice(VERIFY_PREFIX.length)] = attr.value;
    }
  }
  return out;
}

/** Read contracts from ALL contract-bearing elements (for lists/features). */
export function readAllContracts(root: HTMLElement): Record<string, string>[] {
  const els = root.querySelectorAll<HTMLElement>(`[${VERIFY_PREFIX}unit]`);
  return Array.from(els).map((el) => {
    const out: Record<string, string> = {};
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith(VERIFY_PREFIX)) {
        out[attr.name.slice(VERIFY_PREFIX.length)] = attr.value;
      }
    }
    return out;
  });
}

function findContractRoot(root: HTMLElement): HTMLElement | null {
  if (root.hasAttribute(`${VERIFY_PREFIX}unit`)) return root;
  return root.querySelector<HTMLElement>(`[${VERIFY_PREFIX}unit]`);
}
