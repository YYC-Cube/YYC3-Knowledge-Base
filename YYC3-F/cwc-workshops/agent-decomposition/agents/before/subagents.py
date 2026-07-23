# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
"""Three subagents the 2025-era StockPilot orchestrator delegates to.

Each is its own Messages API call with its own system prompt and returns prose.
The orchestrator parses what it needs out of the text — structured outputs
weren't the default pattern yet.
"""
from __future__ import annotations
import csv
from pathlib import Path

import anthropic

from agents.common import MODEL

DATA = Path(__file__).resolve().parents[2] / "data"
_client = anthropic.Anthropic()

# Module-level token accounting so the eval harness can attribute subagent cost.
token_counter = {"input": 0, "output": 0, "calls": 0}


def reset_counter() -> None:
    token_counter.update(input=0, output=0, calls=0)


def _call(system: str, user: str, max_tokens: int = 1024) -> str:
    msg = _client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    token_counter["input"] += msg.usage.input_tokens
    token_counter["output"] += msg.usage.output_tokens
    token_counter["calls"] += 1
    return "".join(b.text for b in msg.content if b.type == "text")


_FORECASTING_SYSTEM = """\
You are the Demand Forecasting Analyst for a mid-size retail operation. You
receive daily sales history for a single SKU and produce a 30-day forward
demand estimate.

Method:
1. Compute the trailing 14-day and 90-day daily averages.
2. Look for trend: is the 14-day average meaningfully above or below the 90-day?
3. Look for seasonality or one-off spikes (promos, holidays). If a spike is
   present and not expected to recur, discount it. If a similar event is
   upcoming, factor in uplift.
4. State your 30-day total estimate, your confidence (low / medium / high),
   and any caveats the planner should know.

Be concise but show your reasoning. The planner reads your full reply, so
write naturally — you don't need to follow a rigid format. End with a clear
sentence containing the number, e.g. "I'd estimate roughly 2,100 units over
the next 30 days, medium confidence."
"""


def forecasting_subagent(sku: str, context_note: str = "") -> str:
    """Return a prose forecast for the next 30 days of demand for `sku`."""
    rows = [r for r in csv.DictReader(open(DATA / "sales_history.csv")) if r["sku"] == sku]
    rows.sort(key=lambda r: r["date"])
    history_lines = "\n".join(f"{r['date']}: {r['units_sold']} units" for r in rows)
    prod = next(
        (p for p in csv.DictReader(open(DATA / "products.csv")) if p["sku"] == sku),
        {},
    )
    flags = []
    if prod.get("is_seasonal") == "1":
        flags.append("seasonal item")
    if prod.get("promo_next_month") == "1":
        flags.append("promo scheduled next month")
    user = (
        f"SKU: {sku}\n"
        f"Product flags: {', '.join(flags) or 'none'}\n"
        f"{f'Planner note: {context_note}' if context_note else ''}\n\n"
        f"90-day daily sales history:\n{history_lines}\n\n"
        f"Please provide your 30-day forward demand estimate."
    )
    return _call(_FORECASTING_SYSTEM, user, max_tokens=900)


_PROCUREMENT_SYSTEM = """\
You are the Procurement Specialist. You receive a set of supplier quotes for a
SKU and recommend which supplier to order from.

Weigh unit price, lead time, minimum order quantity, and reliability. Cheapest
isn't always best — a 30-day lead time can cause a stockout. Explain your
reasoning in a short paragraph and end with a clear recommendation naming the
supplier_id.
"""


def procurement_subagent(sku: str, quotes: list[dict]) -> str:
    """Return a prose recommendation comparing supplier quotes."""
    lines = "\n".join(
        f"- {q['supplier_id']} ({q.get('name','')}): "
        f"${q['unit_price']:.2f}/unit, MOQ {q['min_order_qty']}, "
        f"lead time {q['lead_time_days']}d, reliability {q['reliability']:.2f}"
        for q in quotes
    )
    user = f"SKU: {sku}\nQuotes:\n{lines}\n\nWhich supplier should we order from, and why?"
    return _call(_PROCUREMENT_SYSTEM, user, max_tokens=600)


_WRITING_SYSTEM = """\
You are the Communications Writer for the inventory operations team. You draft
clear, professional Slack messages and supplier emails.

For Slack alerts: keep it under 3 sentences, lead with the SKU and the issue,
include the key number, and tag urgency if relevant.

For supplier emails: use a brief greeting, state the request plainly (SKU,
quantity, desired delivery window), and close politely. No fluff.

Return only the message body — no preamble, no commentary about what you wrote.
"""


def writing_subagent(kind: str, payload: dict) -> str:
    """Draft a Slack alert or supplier email. `kind` is 'slack' or 'email'."""
    if kind == "slack":
        user = (
            "Draft a Slack alert for the #ops-inventory channel.\n"
            f"Details: {payload}"
        )
    else:
        user = (
            "Draft an email to a supplier requesting a purchase.\n"
            f"Details: {payload}"
        )
    return _call(_WRITING_SYSTEM, user, max_tokens=500)
