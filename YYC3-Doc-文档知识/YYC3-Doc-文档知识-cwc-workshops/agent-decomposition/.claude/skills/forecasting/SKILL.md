---
name: forecasting
description: How to produce a demand forecast for a SKU, and when to delegate that to a subagent vs. compute it yourself. Load this for any task involving "forecast", "how much will we sell", "next month", promos, or seasonal SKUs.
---
<!-- Copyright 2026 Anthropic PBC -->
<!-- SPDX-License-Identifier: Apache-2.0 -->


# Demand Forecasting

Forecasting has two paths. Pick the right one — using a subagent when you don't need one wastes turns; skipping it when you do gives you a bad number.

## Path A — compute it yourself (code execution)

Use this when **all** of the following hold:
- horizon ≤ 14 days
- the product's `is_seasonal` flag is 0
- the product's `promo_next_month` flag is 0
- the task doesn't mention a promo, holiday, or trend change

Then the forecast is just a rolling mean. This skill ships a script for it:

```bash
python .claude/skills/forecasting/rolling_mean.py SKU-0057 14
```

That's it — one Bash call, ~200 tokens, no subagent. Read the script if you
want to adapt it (it's ~20 lines).

**Batch variant for sweeps:** if you need days-of-cover for *many* SKUs at
once (e.g., the daily low-stock check), don't loop tool calls — run the
batch script:

```bash
python .claude/skills/forecasting/batch_days_of_cover.py 20
```

Returns the 20 most urgent SKUs as JSON, ranked by days-of-cover. This is
what replaces the 100+ `get_stock_level` / `get_sales_velocity` calls the
old agent made on F1.

## Path B — spawn a forecaster subagent

Use this when **any** of the following hold:
- horizon > 14 days
- `is_seasonal` is 1
- `promo_next_month` is 1, or the task mentions a promo
- recent sales show a visible trend break

**Why a subagent:** the forecaster needs the full 90-day history in context to spot seasonality and promo effects. That's ~90 rows × however many SKUs. Loading that into *your* context crowds out the rest of the task. A subagent gets its own context window, does the analysis there, and hands back a small JSON.

**How:** Delegate to the `forecaster` callable agent. Send it just the SKU,
product flags, and horizon — **not the history rows**. The forecaster has
Bash access to the same `/mnt/user/data/` and will compute over the full
history in its own context (that's the point: the 90 rows live there, not
here). It returns `{forecast_qty, confidence, method, flags}` JSON —
**parse it strictly**; if the JSON is malformed that's an error, not
something to guess around.

If `callable_agents` isn't available (it's a research-preview feature),
fall back to computing the rolling-mean inline yourself and set
`confidence ≤ 0.55` so the reorder-policy skill escalates to human review
instead of auto-ordering on a number you couldn't validate.

## Seasonal calendar (sanity-check your numbers)

Outdoor gear is highly seasonal. When the horizon crosses a boundary, the
rolling mean lags the turn — lean on Path B and mention the season.

| Window | Categories that lift | Expect vs baseline |
|---|---|---|
| Mar–May | Footwear, packs, rain shells, trekking poles | 1.3–1.6× |
| Jun–Aug | Tents, sleeping, stoves, water filtration | 1.5–2.0× (peak quarter) |
| Sep–Oct | Insulated apparel, optics, headlamps | lift; tents/footwear taper |
| Nov–Dec | Giftable price points; heaviest promo | confirm promo flags |
| Jan–Feb | Reset — lowest volume | good for cycle counts |

## Promotional handling

Promos are the most common cause of under-ordering. When `promo_next_month=1`
or the task mentions a promo:

- **Do not** rely on rolling-mean alone — that's pre-promo demand.
- Look for a historical analog (same SKU, comparable promo in the last 12
  months) and use *that* uplift. If none exists, the subagent should set
  `flags: ["promo_uplift_uncertain"]` and a confidence well under 0.6.
- Default to flag-for-review over auto-order when lift is uncertain.
  Over-ordering on a promo is recoverable; under-ordering is a stockout
  during peak attention.
- If the promo end date is known, account for the post-promo dip — don't
  leave the channel overstocked the week after.

**The failure mode to avoid:** stating the lift in prose ("could be ~3×")
while the `forecast_qty` you return is still the un-lifted baseline mean.
Anchor the *number*, not just the narrative.

## What to do with the result

Feed `{forecast_qty, confidence, flags}` into the reorder-policy skill. In particular: **if `confidence < 0.6`, reorder-policy says escalate, don't auto-order.** Do not drop the confidence or flags on the floor — they're part of the contract.

## Worked example (Path B)

Task: "Reorder SKU-0091 for next month's promo." → `promo_next_month=1`, horizon=30 → Path B.

Subagent returns: `{"forecast_qty": 2100, "confidence": 0.41, "method": "baseline_mean_no_comparable_promo", "flags": ["promo_uplift_uncertain"]}`

confidence 0.41 < 0.6 → per reorder-policy, **do not** create a PO. Escalate via notify-templates with the flags, recommend ~2,100 baseline + note that promo uplift could be 2-3× and needs a human call.
