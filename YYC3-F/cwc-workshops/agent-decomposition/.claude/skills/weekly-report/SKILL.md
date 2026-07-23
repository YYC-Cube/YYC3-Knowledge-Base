---
name: weekly-report
description: Structure and data sources for the weekly inventory report. Load this when the task is "weekly report", "Monday report", or "summarize inventory status".
---
<!-- Copyright 2026 Anthropic PBC -->
<!-- SPDX-License-Identifier: Apache-2.0 -->


# Weekly Inventory Report

Generate the report by **writing one Python script via code execution** that reads the CSVs and emits markdown. Do not make per-SKU tool calls.

## Structure

```markdown
# Inventory Report — {{warehouse or "All Warehouses"}} — week of {{date}}

## Stockouts (on_hand = 0)
| SKU | Product | Warehouse | Days out |
...

## Low Stock (below reorder point)
| SKU | On hand | Reorder pt | Days cover | Action |
...top 15 by urgency (lowest days_cover first)...

## Open POs
| PO | SKU | Qty | Supplier | ETA |
...from /mnt/user/sinks/purchase_orders.jsonl...

## Forecast Risk
SKUs where promo_next_month=1 or is_seasonal=1 and on_hand < 14d cover.
One line each: SKU, reason, recommended action.
```

## Operating cadence (which report is being asked for)

| Cadence | Trigger phrasing | Contents |
|---|---|---|
| **Daily** | "run the check", "the sweep" | Low-stock list with action taken per SKU; one summary notification at the end. |
| **Weekly** (Mon) | "the report", "weekly review" | Per-warehouse: top concerns, **open POs aging past their lead time**, SKUs below reorder for >5 business days. |
| **Monthly** | "supplier review" | Suppliers whose on-time rate slipped; SKUs whose primary supplier may need changing. |
| **Ad hoc** | anything else | Scope to what was asked. |

If the request doesn't say which, infer from wording. The structure below is
the **weekly** format; for daily, drop the Open-POs and Forecast-Risk sections
and lead with the actions taken.

## Aging-PO check (weekly only)

For each open PO, compare days-since-placed to the supplier's `lead_time_days`.
List any PO where elapsed > lead_time as **aging** and include supplier + days
overdue so ops can follow up.

## Data sources

- Stockouts & low stock: latest-date rows from `/mnt/user/data/stock_levels.csv` joined with `/mnt/user/data/products.csv`
- Days of cover: `on_hand / avg_daily_sales` (last 14d from `/mnt/user/data/sales_history.csv`)
- Open POs: `/mnt/user/sinks/purchase_orders.jsonl`
- Forecast risk: `/mnt/user/data/products.csv` flags + days-of-cover from above

## Do this in code

The CSVs are large (stock_levels is ~67k rows). Write a single script that loads them once, computes everything, and prints the markdown. Don't page through the data with tool calls — that's exactly the pattern this skill replaces.
