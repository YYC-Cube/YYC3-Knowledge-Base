---
name: reorder-policy
description: How to decide whether and how much to reorder a SKU. Load this whenever a task involves reorder recommendations, purchase orders, or "should we restock" questions.
---
<!-- Copyright 2026 Anthropic PBC -->
<!-- SPDX-License-Identifier: Apache-2.0 -->


# Reorder Policy

This skill encodes StockPilot's reorder rules. Use it whenever you need to decide **whether** to reorder a SKU and **how many units** to order.

## Inputs you need

| Value | Where to get it |
|---|---|
| `on_hand` | Latest row for the SKU in `/mnt/user/data/stock_levels.csv` (sum across warehouses unless the task is warehouse-specific) |
| `reorder_point` | `/mnt/user/data/products.csv` |
| `avg_daily_sales` | Mean of `units_sold` over the last 14 days in `/mnt/user/data/sales_history.csv` |
| `lead_time_days` | From the chosen supplier (see the supplier-selection skill) |
| `forecast_qty`, `confidence`, `flags` | From the forecasting skill, **only if** the task looks forward more than 14 days or mentions a promo/season |

## Decision rules

1. **Do we reorder at all?** Reorder if `on_hand < reorder_point`. If `on_hand ≥ reorder_point`, the answer is "no reorder needed" — stop here.

2. **How much?** The target order quantity is **30 days of cover** plus safety stock, minus what's already on hand:

   ```
   safety_stock = 1.5 × avg_daily_sales × lead_time_days
   order_qty    = (avg_daily_sales × 30) + safety_stock − on_hand
   ```

   Round up to the supplier's `min_order_qty` multiple.

3. **Confidence guard.** If you obtained a forecast and `confidence < 0.6`, **do not place a PO automatically.** Instead:
   - Write an escalation to `/mnt/user/sinks/outbox.jsonl` using the notify-templates skill (escalation template), including the `flags` from the forecast.
   - In your final answer, state the recommended quantity and that it requires human review, with the reason.

4. **Expedite?** If `on_hand / avg_daily_sales < lead_time_days` (you'll stock out before the order arrives), pick the supplier with the shortest lead time even if it's not the cheapest, and note "expedited" in the PO.

## Worked example

SKU-0057: `on_hand = 38`, `reorder_point = 120`, `avg_daily_sales = 18.2`, chosen supplier `lead_time_days = 7`, `min_order_qty = 50`.

- 38 < 120 → reorder.
- safety_stock = 1.5 × 18.2 × 7 = **191.1**
- order_qty = (18.2 × 30) + 191.1 − 38 = 546 + 191.1 − 38 = **699.1** → round up to next 50 → **700**
- 38 / 18.2 = 2.1 days of cover, lead time is 7 → **expedite**.

## Prioritization (when many SKUs are at risk)

Sort by tier, then by days-of-cover ascending within a tier:

1. **Stockouts** — `on_hand = 0` at any warehouse. Always first.
2. **Will stock out before PO arrives** — `days_of_cover < lead_time_days`. Expedite or transfer.
3. **High-velocity below reorder** — top-100 sellers below reorder point.
4. **Routine replenishment** — everything else below reorder point.
5. **Trending toward reorder** — note only, no action.

If you can't action every SKU in one pass, say how many you handled, how many
remain, and list the remaining SKU IDs so the next run picks them up.

## Transfer vs reorder

When one warehouse is low and another has surplus:

- **Transfer** when the surplus warehouse has >30 days cover for itself, the
  3–5 day transfer beats the best supplier lead, and the qty needed is ≲200
  units. WH-CENTRAL is the default source.
- **Reorder** when no warehouse has surplus, the qty is large, or supplier lead
  is comparable to transfer lead anyway.
- **Both** when the shortage is urgent and large — transfer a bridge qty now,
  PO the remainder.

State which path you chose and why.

## Compliance

- Any single PO over **$10,000** needs a one-line rationale included with the
  PO so ops can copy it into the ERP.
- If you place **more than five POs** in one task, end with a one-line total
  committed spend.
- Do not place a second PO for a SKU that already has an open PO covering the
  need.

## Output

When you act, append to `/mnt/user/sinks/purchase_orders.jsonl`:
```json
{"sku": "SKU-0057", "supplier_id": "SUP-03", "qty": 700, "expedite": true, "reason": "below reorder point; 2.1d cover"}
```

When you only recommend (no side-effect requested), return a structured `ReorderDecision`:
```json
{"sku": "...", "reorder": true, "qty": 700, "supplier_id": "SUP-03", "expedite": true, "confidence": 0.85, "notes": "..."}
```
