// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * Visible act driver — same `ActContext` shape as the fast one in runner.ts,
 * but slowed down and instrumented so a human watching the replay can SEE the
 * actions happen:
 *
 *  - type()  → char-by-char with a per-keystroke delay
 *  - click() → flash a highlight ring on the target, then click
 *  - both report what they're doing via onAction(), so the harness can show
 *    a live "⌨ typing …" / "👆 click …" caption under the stage
 *
 * Only the visible harness uses this. CI / runAll / dashboard "Run all" keep
 * the instant driver — speed matters there, theatrics don't.
 */

import type { ActContext } from "../core/types";

export interface VisibleActOptions {
  /** ms per typed character. */
  keystrokeMs?: number;
  /** ms to hold the highlight ring before clicking. */
  clickHoldMs?: number;
  /** Called whenever an action starts/ends. `null` clears the caption. */
  onAction?: (label: string | null) => void;
  /** Called between awaits — return true to abort early (step was cancelled). */
  isCancelled?: () => boolean;
}

export function makeVisibleActContext(
  root: HTMLElement,
  opts: VisibleActOptions = {}
): ActContext {
  const keystrokeMs = opts.keystrokeMs ?? 60;
  const clickHoldMs = opts.clickHoldMs ?? 220;
  const onAction = opts.onAction ?? (() => {});
  const isCancelled = opts.isCancelled ?? (() => false);

  return {
    root,

    async click(selector) {
      const el = root.querySelector<HTMLElement>(selector);
      if (!el) throw new Error(`act.click: no element matching "${selector}"`);
      onAction(`👆 click ${shorten(selector)}`);
      el.scrollIntoView({ block: "nearest" });
      const ring = highlight(el);
      await wait(clickHoldMs);
      ring.remove();
      if (isCancelled()) return onAction(null);
      el.click();
      await wait(80);
      onAction(null);
    },

    async type(selector, text) {
      const el = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        selector
      );
      if (!el) throw new Error(`act.type: no element matching "${selector}"`);
      onAction(`⌨ typing "${truncate(text, 40)}"`);
      el.scrollIntoView({ block: "nearest" });
      el.focus();
      const ring = highlight(el, true);
      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      let acc = "";
      for (const ch of text) {
        if (isCancelled()) break;
        acc += ch;
        setter?.call(el, acc);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        await wait(keystrokeMs);
      }
      ring.remove();
      onAction(null);
    },

    wait(ms) {
      onAction(`⏳ wait ${ms}ms`);
      return wait(ms).then(() => onAction(null));
    },
  };
}

/* ----------------------------- helpers ----------------------------- */

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function shorten(selector: string) {
  return selector.length > 40 ? selector.slice(0, 37) + "…" : selector;
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/**
 * Draw a highlight ring over `el`. Returned element should be `.remove()`d
 * by the caller. The ring is `position: fixed` so it floats above the stage
 * regardless of overflow/scroll.
 */
function highlight(el: HTMLElement, soft = false): HTMLElement {
  const rect = el.getBoundingClientRect();
  const ring = document.createElement("div");
  ring.className = `verify-act-ring${soft ? " soft" : ""}`;
  ring.style.position = "fixed";
  ring.style.left = `${rect.left - 4}px`;
  ring.style.top = `${rect.top - 4}px`;
  ring.style.width = `${rect.width + 8}px`;
  ring.style.height = `${rect.height + 8}px`;
  ring.style.pointerEvents = "none";
  ring.style.zIndex = "9999";
  document.body.appendChild(ring);
  // force a reflow so the CSS transition fires
  void ring.offsetWidth;
  ring.classList.add("on");
  return ring;
}
