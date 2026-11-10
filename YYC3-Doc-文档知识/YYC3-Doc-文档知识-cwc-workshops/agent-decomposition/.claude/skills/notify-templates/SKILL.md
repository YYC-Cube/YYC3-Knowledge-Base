---
name: notify-templates
description: Fixed-format templates for Slack alerts, supplier emails, and escalations. Load this whenever the task is "notify", "alert", "email", or "tell ops".
---
<!-- Copyright 2026 Anthropic PBC -->
<!-- SPDX-License-Identifier: Apache-2.0 -->


# Notification Templates

Notifications are template fills, not creative writing. **Do not spawn a subagent for this.** Fill the slots from data you already have, then append the result to the outbox.

## Low-stock Slack alert

```
:warning: *Low stock* — {{sku}} ({{product_name}})
On hand: {{on_hand}} · Reorder point: {{reorder_point}} · Days of cover: {{days_cover}}
{{action_line}}
```

`action_line` is either `PO {{po_id}} placed for {{qty}} units (ETA {{eta}})` or `Awaiting review — {{reason}}`.

## Supplier email

```
Subject: PO {{po_id}} — {{qty}} × {{sku}}

Hi {{supplier_name}},

Please confirm PO {{po_id}} for {{qty}} units of {{sku}} ({{product_name}}) at ${{unit_price}}/unit.
Requested delivery: {{requested_date}}. {{expedite_note}}

Thanks,
StockPilot
```

## Escalation (human review needed)

```
:octagonal_sign: *Review needed* — {{sku}}
Recommended qty: {{qty}} (confidence {{confidence}})
Flags: {{flags_csv}}
Reason: {{reason}}
```

## Routing (who gets what)

| Audience | When | Example |
|---|---|---|
| `ops` channel (default) | Low-stock alerts, reorder recs, cycle-count adjustments, weekly reports. | Almost everything. |
| `ops` with `@here` | Active or imminent stockout on a top-100 SKU, or a supplier delay that causes a stockout within 7 days. | "0 on hand at WH-EAST, network out in <1d" |
| Purchasing lead (DM/email, not channel) | Single PO > $25k, deviation from the scored supplier, or new-supplier consideration. | |
| Finance | Only if open-PO balance for one supplier would exceed $100k, or suspected duplicate POs. Nothing routine. | |

When you escalate beyond the default channel, add one line saying which
threshold was crossed.

## Batch, don't spam

For sweeps and daily checks, send **one summary notification**, not one per
SKU. The low-stock template above is for a single-SKU task; for a sweep,
compose a single message listing the actioned SKUs (and any deferred) and
send it once at the end.

**When the task explicitly asks for one alert per SKU** (e.g. "send a
personalized alert for each of the top 10"): fill the template once per SKU
and write all lines to the outbox in one Bash heredoc, like:

```bash
python -c '
import json
rows = [...top-10 from batch_days_of_cover.py...]
with open("/mnt/user/sinks/outbox.jsonl", "a") as f:
    for r in rows:
        f.write(json.dumps({"channel": "ops", "sku": r["sku"],
                            "message": f":warning: Low stock — {r[\"sku\"]} ..."}) + "\n")
'
```

Do **not** call `send_slack_alert` (or any subagent) once per SKU — that's
N model round-trips for template-filling.

After sending a batch, your final response should be a **brief confirmation**
("✓ 10 alerts sent to ops — see outbox") plus a compact table of SKU + on-hand
+ days-of-cover. Do not echo the full alert text in your reply; it's already
in the outbox.

## How to send

Append directly to `/mnt/user/sinks/outbox.jsonl` via Bash — one JSON object
per line, e.g.:

```bash
python -c 'import json; print(json.dumps({"channel": "ops", "sku": "SKU-0012", "message": "..."}))' \
  >> /mnt/user/sinks/outbox.jsonl
```

Use `json.dumps` so newlines in the message are escaped (raw `echo` would
break the JSONL). That's the whole job: one read for the data you need (if
you don't have it), one append. If you're making more than two calls to send
a notification, you've over-engineered it.
