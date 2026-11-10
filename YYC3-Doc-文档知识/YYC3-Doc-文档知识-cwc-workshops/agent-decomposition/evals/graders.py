# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
"""Graders for StockPilot evals. Each returns (status, why) where status ∈ {pass, fail, pass-slow}."""
from __future__ import annotations
import csv
import os
import re
from pathlib import Path
from collections import defaultdict

import anthropic

DATA = Path(__file__).parent.parent / "data"
SKU_RE = re.compile(r"SKU-\d{4}")
SUP_RE = re.compile(r"SUP-\d{2}")
NUM_RE = re.compile(r"(\d[\d,]*\.?\d*)")


def _nums(text: str) -> list[float]:
    out = []
    for m in NUM_RE.findall(text):
        try:
            out.append(float(m.replace(",", "").rstrip(".")))
        except ValueError:
            pass
    return out

PASS, FAIL, SLOW = "pass", "fail", "pass-slow"


# ---------- ground truth helpers (computed from seed CSVs) ----------

def _latest_stock() -> dict[tuple[str, str], int]:
    out: dict[tuple[str, str], int] = {}
    latest_date = ""
    with open(DATA / "stock_levels.csv") as f:
        for row in csv.DictReader(f):
            if row["date"] > latest_date:
                latest_date = row["date"]
    with open(DATA / "stock_levels.csv") as f:
        for row in csv.DictReader(f):
            if row["date"] == latest_date:
                out[(row["sku"], row["warehouse"])] = int(row["on_hand"])
    return out


def _products() -> dict[str, dict]:
    with open(DATA / "products.csv") as f:
        return {r["sku"]: r for r in csv.DictReader(f)}


def _sales_mean(sku: str, days: int = 90) -> float:
    total = n = 0
    with open(DATA / "sales_history.csv") as f:
        for row in csv.DictReader(f):
            if row["sku"] == sku:
                total += int(row["units_sold"])
                n += 1
    return total / max(n, 1)


def _expected_value(spec: dict) -> float | int | set[str]:
    src = spec.get("source")
    if src == "computed_low_stock":
        stock = _latest_stock()
        prods = _products()
        agg: dict[str, int] = defaultdict(int)
        for (sku, _wh), qty in stock.items():
            agg[sku] += qty
        return {s for s, q in agg.items() if q < int(prods[s]["reorder_point"])}
    if src == "suppliers_for":
        out = set()
        with open(DATA / "supplier_catalog.csv") as f:
            for r in csv.DictReader(f):
                if r["sku"] == spec["sku"]:
                    out.add(r["supplier_id"])
        return out
    if src == "reorder_qty":
        mean = _sales_mean(spec["sku"])
        stock = _latest_stock()
        on_hand = sum(q for (s, _wh), q in stock.items() if s == spec["sku"])
        lead = 7
        qty = int(mean * 30 + 1.5 * mean * lead - on_hand)
        return max(50, qty)
    if src == "forecast":
        return int(_sales_mean(spec["sku"]) * spec["days"])
    if src == "forecast_promo":
        return int(_sales_mean(spec["sku"]) * spec["days"] * 2.5)  # promo uplift
    if "field" in spec and spec["field"] == "on_hand":
        return _latest_stock()[(spec["sku"], spec["warehouse"])]
    raise ValueError(f"unknown expected spec: {spec}")


# ---------- graders ----------

def exact_match(result, spec) -> tuple[str, str]:
    target = _expected_value(spec)
    nums = [int(n) for n in _nums(result.final_text) if n == int(n)]
    if target in nums:
        return PASS, ""
    return FAIL, f"expected {target}, got {nums[:3] or 'none'}"


def set_match(result, spec) -> tuple[str, str]:
    target = _expected_value(spec)
    pattern = SUP_RE if spec.get("source") == "suppliers_for" else SKU_RE
    found = set(pattern.findall(result.final_text))
    missing = target - found
    extra = found - target
    if not missing:
        return PASS, "" if not extra else f"{len(extra)} extra"
    return FAIL, f"missing {sorted(missing)[:2]}{'…' if len(missing) > 2 else ''}"


def numeric_tolerance(result, spec) -> tuple[str, str]:
    target = float(_expected_value(spec))
    tol = spec.get("tolerance_pct", 20) / 100
    nums = [n for n in _nums(result.final_text) if n > 5]
    if not nums:
        return FAIL, "no quantity found"
    # take the number closest to target's magnitude
    best = min(nums, key=lambda n: abs(n - target))
    delta_pct = (best - target) / target * 100
    must = spec.get("must_mention", [])
    if must and not all(m.lower() in result.final_text.lower() for m in must):
        return FAIL, f"{delta_pct:+.0f}% vs target, didn't cite {must[0]}"
    if abs(delta_pct) <= tol * 100:
        return PASS, ""
    return FAIL, f"{delta_pct:+.0f}% vs target (anchored on mean?)"


def action_taken(result, spec) -> tuple[str, str]:
    kind = spec.get("kind")
    not_kind = spec.get("not_kind")
    if not_kind:
        bad = [a for a in result.actions if a["kind"] == not_kind]
        if bad:
            return FAIL, f"took {not_kind} action ({bad[0].get('sku', '')}), expected escalate"
    matches = [a for a in result.actions if a["kind"] == kind]
    if "sku" in spec:
        matches = [a for a in matches
                   if a.get("sku") == spec["sku"] or spec["sku"] in str(a.get("message", ""))]
    if "min_count" in spec:
        skus = {a.get("sku") or (SKU_RE.search(str(a.get("message", ""))) or [None])[0] for a in matches}
        skus.discard(None)
        if len(skus) >= spec["min_count"]:
            return PASS, ""
        return FAIL, f"only {len(skus)} distinct {kind} (need ≥{spec['min_count']})"
    if not matches:
        if "must_mention" in spec:
            txt = (result.final_text + " " + str(result.actions)).lower()
            if any(m in txt for m in spec["must_mention"]):
                return PASS, ""
        return FAIL, f"no {kind} for {spec.get('sku', 'target')}"
    a = matches[0]
    qty = a.get("qty") or a.get("order_qty") or a.get("quantity")
    if "qty" in spec and qty != spec["qty"]:
        return FAIL, f"qty {qty} ≠ {spec['qty']}"
    if "min_qty" in spec and (qty or 0) < spec["min_qty"]:
        return FAIL, f"{spec['sku']} qty {qty} < {spec['min_qty']}"
    return PASS, ""


def efficiency(result, spec, task) -> tuple[str, str]:
    inner_status, inner_why = action_taken(result, spec)
    if inner_status == FAIL:
        return FAIL, inner_why
    bt, bk = task.get("budget_turns", 99), task.get("budget_tokens", 10**9)
    if result.turns > bt:
        return SLOW, f"correct, but {result.turns} turns (budget {bt})"
    if result.tokens_out > bk:
        return SLOW, f"correct, but {result.tokens_out} out-tokens (budget {bk})"
    return PASS, ""


def regex_present(result, spec) -> tuple[str, str]:
    pat = re.compile(spec["pattern"], re.IGNORECASE)
    if pat.search(result.final_text):
        return PASS, ""
    return FAIL, spec.get("why", f"pattern not found: {spec['pattern'][:30]}")


def wall_budget(result, spec) -> tuple[str, str]:
    budget_ms = spec["budget_ms"]
    if result.wall_ms <= budget_ms:
        return PASS, ""
    return FAIL, f"{result.wall_ms/1000:.0f}s wall (budget {budget_ms/1000:.0f}s)"


def ranked_mention(result, spec) -> tuple[str, str]:
    """Check that target SKU appears in the first N body rows of the first markdown table."""
    sku, top_n = spec["sku"], spec.get("top", 3)
    lines = [ln for ln in result.final_text.splitlines() if ln.strip().startswith("|")]
    body = [ln for ln in lines if not re.match(r"^\s*\|[\s:|-]+\|\s*$", ln)][1:]  # skip header
    head = body[:top_n]
    if any(sku in row for row in head):
        return PASS, ""
    return FAIL, f"{sku} not in top-{top_n} of ranked output"


def composite(result, spec, task) -> tuple[str, str]:
    """AND a list of sub-graders. FAIL if any sub fails; SLOW if any is SLOW."""
    worst = PASS
    whys = []
    for sub in spec["checks"]:
        fn = GRADERS[sub["grader"]]
        status, why = fn(result, sub, task)
        if status == FAIL:
            return FAIL, why
        if status == SLOW:
            worst = SLOW
            whys.append(why)
    return worst, "; ".join(whys)


def llm_judge(result, spec) -> tuple[str, str]:
    client = anthropic.Anthropic()
    rubric = spec["rubric"]
    msg = client.messages.create(
        model=os.environ.get("STOCKPILOT_MODEL", "claude-sonnet-4-6"),
        max_tokens=200,
        messages=[{
            "role": "user",
            "content": f"You are grading an agent's response.\n\nRUBRIC: {rubric}\n\nRESPONSE:\n{result.final_text[:4000]}\n\nReply with exactly: PASS: <one-line reason>  or  FAIL: <one-line reason>",
        }],
    )
    text = msg.content[0].text.strip()
    if text.upper().startswith("PASS"):
        return PASS, ""
    return FAIL, text.split(":", 1)[-1].strip()[:40]


GRADERS = {
    "exact_match": lambda r, s, t: exact_match(r, s),
    "set_match": lambda r, s, t: set_match(r, s),
    "numeric_tolerance": lambda r, s, t: numeric_tolerance(r, s),
    "action_taken": lambda r, s, t: action_taken(r, s),
    "efficiency": efficiency,
    "llm_judge": lambda r, s, t: llm_judge(r, s),
    "regex_present": lambda r, s, t: regex_present(r, s),
    "wall_budget": lambda r, s, t: wall_budget(r, s),
    "ranked_mention": lambda r, s, t: ranked_mention(r, s),
    "composite": composite,
}


def grade(task: dict, result) -> tuple[str, str]:
    if result.error:
        return FAIL, f"error: {result.error[:40]}"
    fn = GRADERS[task["grader"]]
    return fn(result, task["expected"], task)
