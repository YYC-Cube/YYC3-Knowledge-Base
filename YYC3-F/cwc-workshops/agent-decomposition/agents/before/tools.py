# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
"""The 12 tools the 2025-era StockPilot agent exposes to the model.

These hit the CSVs directly (no MCP layer). Each was a reasonable choice in
isolation; the aggregate is what causes the failure modes.
"""
from __future__ import annotations
import csv
import io
import json
from datetime import datetime
from pathlib import Path

from agents.before import subagents

DATA = Path(__file__).resolve().parents[2] / "data"


def _read_csv(name: str) -> list[dict]:
    with open(DATA / name, newline="") as f:
        return list(csv.DictReader(f))


def _append_jsonl(name: str, record: dict) -> None:
    from agents.common import sink_path
    record = {"ts": datetime.utcnow().isoformat(timespec="seconds"), **record}
    p = sink_path(name)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "a") as f:
        f.write(json.dumps(record) + "\n")


def _latest_stock() -> list[dict]:
    rows = _read_csv("stock_levels.csv")
    latest = max(r["date"] for r in rows)
    return [r for r in rows if r["date"] == latest]


# ─── tool implementations ──────────────────────────────────────────────────────


def get_stock_level(sku: str, warehouse: str) -> str:
    for r in _latest_stock():
        if r["sku"] == sku and r["warehouse"] == warehouse:
            return json.dumps({"sku": sku, "warehouse": warehouse, "on_hand": int(r["on_hand"]), "as_of": r["date"]})
    return json.dumps({"error": f"no record for {sku} at {warehouse}"})


def list_low_stock() -> str:
    """Every (sku, warehouse) currently below its reorder point.

    Returns the full CSV so the model "has all the context" — the 2025-era
    instinct that turns out to be the F1 context-bloat trigger.
    """
    reorder = {p["sku"]: int(p["reorder_point"]) for p in _read_csv("products.csv")}
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["sku", "warehouse", "on_hand", "reorder_point", "as_of"])
    for r in _latest_stock():
        rp = reorder.get(r["sku"], 0)
        if int(r["on_hand"]) < rp:
            w.writerow([r["sku"], r["warehouse"], r["on_hand"], rp, r["date"]])
    return out.getvalue()


def get_sales_velocity(sku: str, days: int = 14) -> str:
    rows = sorted(
        (r for r in _read_csv("sales_history.csv") if r["sku"] == sku),
        key=lambda r: r["date"],
    )[-days:]
    total = sum(int(r["units_sold"]) for r in rows)
    return json.dumps({"sku": sku, "window_days": days, "total_units": total, "daily_avg": round(total / max(days, 1), 2)})


def forecast_demand(sku: str, note: str = "") -> str:
    """Delegates to the forecasting subagent and returns its prose reply."""
    return subagents.forecasting_subagent(sku, context_note=note)


def get_supplier_catalog(sku: str) -> str:
    suppliers = {s["supplier_id"]: s for s in _read_csv("suppliers.csv")}
    out = []
    for row in _read_csv("supplier_catalog.csv"):
        if row["sku"] != sku:
            continue
        sup = suppliers.get(row["supplier_id"], {})
        out.append({
            "supplier_id": row["supplier_id"],
            "name": sup.get("name", ""),
            "unit_price": float(row["unit_price"]),
            "min_order_qty": int(row["min_order_qty"]),
            "lead_time_days": int(sup.get("lead_time_days", 0)),
            "reliability": float(sup.get("reliability", 0)),
        })
    return json.dumps(out)


def compare_supplier_quotes(sku: str) -> str:
    """Delegates to the procurement subagent and returns its prose recommendation."""
    quotes = json.loads(get_supplier_catalog(sku))
    return subagents.procurement_subagent(sku, quotes)


def create_purchase_order(sku: str, supplier_id: str, qty: int) -> str:
    rec = {"sku": sku, "supplier_id": supplier_id, "qty": int(qty)}
    _append_jsonl("purchase_orders.jsonl", rec)
    return json.dumps({"status": "created", **rec})


def update_erp_record(sku: str, field: str, value: str) -> str:
    rec = {"sku": sku, "field": field, "value": value}
    _append_jsonl("erp_writes.jsonl", rec)
    return json.dumps({"status": "ok", **rec})


def send_slack_alert(sku: str, summary: str) -> str:
    text = subagents.writing_subagent("slack", {"sku": sku, "summary": summary})
    _append_jsonl("outbox.jsonl", {"channel": "#ops-inventory", "sku": sku, "message": text})
    return json.dumps({"status": "sent", "channel": "#ops-inventory", "preview": text[:120]})


def draft_email_to_supplier(supplier_id: str, sku: str, qty: int) -> str:
    text = subagents.writing_subagent("email", {"supplier_id": supplier_id, "sku": sku, "qty": qty})
    _append_jsonl("outbox.jsonl", {"channel": f"email:{supplier_id}", "message": text})
    return json.dumps({"status": "drafted", "to": supplier_id, "preview": text[:120]})


def generate_weekly_report(warehouse: str) -> str:
    low = [r for r in _latest_stock() if r["warehouse"] == warehouse]
    reorder = {p["sku"]: int(p["reorder_point"]) for p in _read_csv("products.csv")}
    below = [r for r in low if int(r["on_hand"]) < reorder.get(r["sku"], 0)]
    lines = [
        f"Weekly Inventory Report — {warehouse}",
        f"As of {low[0]['date'] if low else 'n/a'}",
        f"SKUs tracked: {len(low)}",
        f"Below reorder point: {len(below)}",
        "",
        "Top concerns:",
    ]
    for r in sorted(below, key=lambda r: int(r["on_hand"]))[:10]:
        lines.append(f"  - {r['sku']}: {r['on_hand']} on hand (reorder at {reorder[r['sku']]})")
    return "\n".join(lines)


def search_web_for_disruptions(query: str) -> str:
    return (
        "Recent supply-chain headlines (cached 2026-04-26):\n"
        "- Port of Long Beach reports 3-day berth delays amid labor talks\n"
        "- Trans-Pacific spot rates up 6% week-over-week\n"
        "- Semiconductor lead times stabilizing after Q1 shortages\n"
        "- No major weather disruptions forecast for North American corridors\n"
    )


# ─── dispatch + Anthropic tool schemas ─────────────────────────────────────────

TOOL_IMPLS = {
    "get_stock_level": get_stock_level,
    "list_low_stock": list_low_stock,
    "get_sales_velocity": get_sales_velocity,
    "forecast_demand": forecast_demand,
    "get_supplier_catalog": get_supplier_catalog,
    "compare_supplier_quotes": compare_supplier_quotes,
    "create_purchase_order": create_purchase_order,
    "update_erp_record": update_erp_record,
    "send_slack_alert": send_slack_alert,
    "draft_email_to_supplier": draft_email_to_supplier,
    "generate_weekly_report": generate_weekly_report,
    "search_web_for_disruptions": search_web_for_disruptions,
}


def _t(name: str, desc: str, props: dict, required: list[str]) -> dict:
    return {
        "name": name,
        "description": desc,
        "input_schema": {"type": "object", "properties": props, "required": required},
    }


_S = {"type": "string"}
_I = {"type": "integer"}

TOOL_DEFS: list[dict] = [
    _t("get_stock_level", "Current on-hand quantity for a SKU at one warehouse.",
       {"sku": _S, "warehouse": _S}, ["sku", "warehouse"]),
    _t("list_low_stock", "List every SKU/warehouse currently below its reorder point. Returns CSV.",
       {}, []),
    _t("get_sales_velocity", "Trailing-window sales total and daily average for a SKU.",
       {"sku": _S, "days": _I}, ["sku"]),
    _t("forecast_demand", "Ask the forecasting analyst for a 30-day demand estimate for a SKU.",
       {"sku": _S, "note": _S}, ["sku"]),
    _t("get_supplier_catalog", "Suppliers, prices, MOQ, lead times, and reliability for a SKU.",
       {"sku": _S}, ["sku"]),
    _t("compare_supplier_quotes", "Ask the procurement specialist to recommend a supplier for a SKU.",
       {"sku": _S}, ["sku"]),
    _t("create_purchase_order", "Create a purchase order.",
       {"sku": _S, "supplier_id": _S, "qty": _I}, ["sku", "supplier_id", "qty"]),
    _t("update_erp_record", "Update a field on a SKU's ERP record.",
       {"sku": _S, "field": _S, "value": _S}, ["sku", "field", "value"]),
    _t("send_slack_alert", "Send a low-stock or status alert to #ops-inventory.",
       {"sku": _S, "summary": _S}, ["sku", "summary"]),
    _t("draft_email_to_supplier", "Draft and send a purchase-request email to a supplier.",
       {"supplier_id": _S, "sku": _S, "qty": _I}, ["supplier_id", "sku", "qty"]),
    _t("generate_weekly_report", "Generate the weekly inventory summary for a warehouse.",
       {"warehouse": _S}, ["warehouse"]),
    _t("search_web_for_disruptions", "Check recent news for supply-chain disruptions relevant to a query.",
       {"query": _S}, ["query"]),
]


def dispatch(name: str, args: dict) -> str:
    fn = TOOL_IMPLS.get(name)
    if fn is None:
        return json.dumps({"error": f"unknown tool {name}"})
    try:
        return fn(**args)
    except Exception as e:  # noqa: BLE001
        return json.dumps({"error": f"{type(e).__name__}: {e}"})
