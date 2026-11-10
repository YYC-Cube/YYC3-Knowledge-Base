// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/**
 * The isolated mount: /verify/:unitId/:fixtureId
 *
 * Mounts exactly one unit × fixture, visibly, runs verifiers against the
 * *visible* mount, and exposes the result at window.__verify.current().
 * This is the isolated render target: no app shell, no noise. An agent
 * navigates here, observes, reads the structured result, screenshots.
 *
 * Query params:
 *   ?chrome=0  — hide the harness UI (header/report) for clean screenshots.
 *
 * Implementation note: the unit is rendered into a *nested* React root inside
 * a host div. All inner-root lifecycle (create/render/unmount) is deferred to
 * a task so it never runs while the outer React tree is mid-commit.
 */

import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getUnit } from "../core/registry";
import { makeActContext, runFixture } from "../core/runner";
import type { ActContext, VerifyResult } from "../core/types";
import { setCurrentResult } from "./handle";
import { Report } from "./Report";
import { makeVisibleActContext } from "./visibleAct";

export function UnitPage() {
  const { unitId = "", fixtureId = "" } = useParams();
  const [params] = useSearchParams();
  const chromeless = params.get("chrome") === "0";
  const slow = params.get("slow") === "1";
  const mountRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<{ root: Root; container: HTMLElement } | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [runKey, setRunKey] = useState(0);

  const unit = getUnit(unitId);
  const fixture = unit?.fixtures.find((f) => f.id === fixtureId);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setCurrentResult(null);

    if (!unit || !fixture || !mountRef.current) return;
    const host = mountRef.current;

    (async () => {
      await task(); // escape outer commit
      if (cancelled) return;

      const container = document.createElement("div");
      host.appendChild(container);
      const root = createRoot(container);
      const inner = { root, container };
      innerRef.current = inner;
      root.render(unit.render(fixture.props));
      await raf();
      if (cancelled) return disposeInner(inner);

      if (fixture.act) {
        try {
          const ctx: ActContext = slow
            ? makeVisibleActContext(container, { isCancelled: () => cancelled })
            : makeActContext(container);
          await fixture.act(ctx);
        } catch {
          /* verifiers will report whatever state we're in */
        }
        await raf();
        if (cancelled) return disposeInner(inner);
      }

      const res = await runFixture(unit, fixture, {
        container,
        alreadyMounted: true,
      });
      if (cancelled) return disposeInner(inner);
      setResult(res);
      setCurrentResult(res);
    })();

    return () => {
      cancelled = true;
      const inner = innerRef.current;
      innerRef.current = null;
      if (inner) queueMicrotask(() => disposeInner(inner));
      setCurrentResult(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, fixtureId, runKey, slow]);

  if (!unit) {
    return (
      <div className="verify-page" data-verify-page="error">
        <p>Unknown unit: {unitId}</p>
        <Link to="/verify">Back to dashboard</Link>
      </div>
    );
  }
  if (!fixture) {
    return (
      <div className="verify-page" data-verify-page="error">
        <p>
          Unknown fixture "{fixtureId}" for unit "{unitId}"
        </p>
        <Link to="/verify">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div
      className="verify-page"
      data-verify-page="unit"
      data-verify-unit-id={unitId}
      data-verify-fixture-id={fixtureId}
    >
      {!chromeless && (
        <header className="verify-unit-header">
          <Link to="/verify">← dashboard</Link>
          <h1>
            {unit.title}{" "}
            <span className="fixture-id">
              / {fixture.id} {fixture.probe && "🔍"}
            </span>
          </h1>
          <p className="fixture-desc">{fixture.description}</p>
          <nav className="fixture-nav">
            {unit.fixtures.map((f) => (
              <Link
                key={f.id}
                to={`/verify/${unitId}/${f.id}`}
                className={f.id === fixtureId ? "active" : ""}
              >
                {f.probe && "🔍 "}
                {f.id}
              </Link>
            ))}
          </nav>
          <button className="rerun" onClick={() => setRunKey((k) => k + 1)}>
            Re-run
          </button>
        </header>
      )}

      <div className="verify-stage">
        <div className="verify-mount" ref={mountRef} data-verify-mount="true" />
      </div>

      {!chromeless && (result ? <Report result={result} /> : <p>Running…</p>)}

      {/* Machine-readable sink for agents that can only read the DOM.
          Populated via textContent in handle.ts#setCurrentResult. */}
      <script id="verify-result-json" type="application/json" />
    </div>
  );
}

/* helpers */

function task() {
  return new Promise<void>((r) => setTimeout(r, 0));
}
function raf() {
  return new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r()))
  );
}
function disposeInner(inner: { root: Root; container: HTMLElement }) {
  try {
    inner.root.unmount();
  } catch {
    /* already unmounted */
  }
  inner.container.remove();
}
