#!/usr/bin/env python3
# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
"""Days-of-cover for every SKU, ranked by urgency. The F1 helper.

Reads stock_levels.csv + sales_history.csv + products.csv, computes
days_of_cover = on_hand / avg_daily_sales for each SKU, prints the
top-N most urgent as JSON. This is what replaces 100+ get_stock_level
+ get_sales_velocity tool calls.

Usage: python .claude/skills/forecasting/batch_days_of_cover.py [top_n]
"""
import csv
import json
import sys
from collections import defaultdict

DATA = "/mnt/user/data"
top_n = int(sys.argv[1]) if len(sys.argv) > 1 else 20

products = {r["sku"]: r for r in csv.DictReader(open(f"{DATA}/products.csv"))}

latest = ""
for r in csv.DictReader(open(f"{DATA}/stock_levels.csv")):
    if r["date"] > latest:
        latest = r["date"]
on_hand = defaultdict(int)
for r in csv.DictReader(open(f"{DATA}/stock_levels.csv")):
    if r["date"] == latest:
        on_hand[r["sku"]] += int(r["on_hand"])

sales = defaultdict(list)
for r in csv.DictReader(open(f"{DATA}/sales_history.csv")):
    sales[r["sku"]].append(int(r["units_sold"]))

rows = []
for sku, p in products.items():
    ads = sum(sales[sku][-14:]) / max(len(sales[sku][-14:]), 1)
    cover = on_hand[sku] / ads if ads > 0 else 999
    rows.append({
        "sku": sku,
        "name": p["name"],
        "on_hand": on_hand[sku],
        "reorder_point": int(p["reorder_point"]),
        "avg_daily_sales": round(ads, 2),
        "days_of_cover": round(cover, 1),
        "below_reorder": on_hand[sku] < int(p["reorder_point"]),
    })

rows.sort(key=lambda r: r["days_of_cover"])
print(json.dumps(rows[:top_n], indent=2))
