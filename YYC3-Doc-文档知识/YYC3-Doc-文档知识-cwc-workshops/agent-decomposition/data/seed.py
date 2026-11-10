# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
"""Deterministic seed data for the StockPilot workshop.

Generates CSVs sized so the before-agent's `list_low_stock` tool returns enough
rows to crowd context, plus engineered SKUs that exercise the failure-mode tasks.
"""
from __future__ import annotations
import csv
import json
import random
from datetime import date, timedelta
from pathlib import Path

from agents.anchor import SNAPSHOT_DATE  # noqa: E402

HERE = Path(__file__).parent
WAREHOUSES = ["WH-EAST", "WH-WEST", "WH-CENTRAL"]
TODAY = date.fromisoformat(SNAPSHOT_DATE)

CATEGORIES = [
    "Tents & Shelter", "Sleeping", "Packs", "Apparel", "Footwear",
    "Climbing", "Water", "Cooking", "Electronics", "Bike",
]
SUPPLIER_NAMES = [
    "Cascade Distribution", "Alpine Wholesale", "Backcountry Supply Co", "Sierra Outfitters",
    "Granite Gear Partners", "Northface Logistics", "Ridgecrest Imports", "Timberline Traders",
    "Summit Source", "High Country Goods", "Pinnacle Distribution", "Trailhead Mercantile",
]

# (category, name template, variants, (cost_lo, cost_hi))
PRODUCT_TEMPLATES: list[tuple[str, str, list[str], tuple[float, float]]] = [
    ("Tents & Shelter", "Trailhead {} Tent",          ["2P", "3P", "4P"],             (120, 380)),
    ("Tents & Shelter", "Alpine Bivy {}",             ["Solo", "Duo"],                (140, 260)),
    ("Tents & Shelter", "Ridgeline {} Tarp",          ["8x10", "10x12", "12x14"],     (45, 110)),
    ("Tents & Shelter", "Basecamp Dome {}",           ["4P", "6P", "8P"],             (220, 480)),
    ("Tents & Shelter", "Stormshield Footprint {}",   ["2P", "3P", "4P"],             (25, 55)),
    ("Sleeping",        "Summit Down Bag {}",         ["0F", "15F", "30F"],           (180, 420)),
    ("Sleeping",        "Drift Synthetic Bag {}",     ["20F", "35F", "50F"],          (70, 160)),
    ("Sleeping",        "CloudRest Pad {}",           ["R", "L", "XL"],               (60, 140)),
    ("Sleeping",        "Feather Camp Pillow {}",     ["Std", "Compact"],             (18, 34)),
    ("Sleeping",        "Thermal Liner {}",           ["Silk", "Fleece"],             (30, 55)),
    ("Sleeping",        "Hammock {}",                 ["Single", "Double"],           (40, 85)),
    ("Packs",           "Ridge {} Pack",              ["45L", "65L", "80L"],          (140, 320)),
    ("Packs",           "Daybreak {} Pack",           ["18L", "24L", "32L"],          (55, 120)),
    ("Packs",           "Trek Duffel {}",             ["60L", "90L", "120L"],         (70, 160)),
    ("Packs",           "Hydro Vest {}",              ["5L", "10L"],                  (60, 120)),
    ("Packs",           "Summit Haul Bag {}",         ["70L", "100L"],                (110, 200)),
    ("Packs",           "Compression Sack {}",        ["8L", "14L", "20L"],           (14, 30)),
    ("Apparel",         "Summit Down Jacket {}",      ["S", "M", "L", "XL"],          (160, 320)),
    ("Apparel",         "Windveil Shell {}",          ["S", "M", "L", "XL"],          (90, 180)),
    ("Apparel",         "Stratus Rain Jacket {}",     ["S", "M", "L", "XL"],          (110, 220)),
    ("Apparel",         "Alpine Fleece {}",           ["S", "M", "L", "XL"],          (55, 110)),
    ("Apparel",         "Thermal Base Top {}",        ["S", "M", "L", "XL"],          (35, 70)),
    ("Apparel",         "Thermal Base Bottom {}",     ["S", "M", "L", "XL"],          (35, 70)),
    ("Apparel",         "Trail Pant {}",              ["30", "32", "34", "36"],       (60, 120)),
    ("Apparel",         "Crag Short {}",              ["S", "M", "L", "XL"],          (40, 75)),
    ("Apparel",         "Ridge Beanie {}",            ["Charcoal", "Moss", "Rust"],   (16, 28)),
    ("Apparel",         "Glacier Glove {}",           ["S", "M", "L", "XL"],          (30, 65)),
    ("Apparel",         "Sun Hoody {}",               ["S", "M", "L", "XL"],          (45, 85)),
    ("Footwear",        "Granite Approach Shoe {}",   ["8", "9", "10", "11", "12"],   (95, 160)),
    ("Footwear",        "Switchback Hiking Boot {}",  ["8", "9", "10", "11", "12"],   (130, 240)),
    ("Footwear",        "Scramble Trail Runner {}",   ["8", "9", "10", "11", "12"],   (90, 160)),
    ("Footwear",        "Alpine Mountaineering Boot {}", ["9", "10", "11", "12"],     (260, 480)),
    ("Footwear",        "River Sandal {}",            ["S", "M", "L", "XL"],          (40, 85)),
    ("Footwear",        "Camp Slipper {}",            ["S", "M", "L"],                (28, 55)),
    ("Footwear",        "Gaiters {}",                 ["S/M", "L/XL"],                (30, 60)),
    ("Footwear",        "Merino Hiker Sock {}",       ["S", "M", "L"],                (14, 24)),
    ("Climbing",        "Crux Harness {}",            ["S", "M", "L"],                (55, 110)),
    ("Climbing",        "Vertex Helmet {}",           ["S/M", "L/XL"],                (50, 95)),
    ("Climbing",        "Edge Climbing Shoe {}",      ["38", "39", "40", "41", "42", "43"], (95, 170)),
    ("Climbing",        "Quickdraw Set {}",           ["6-Pack", "12-Pack"],          (75, 160)),
    ("Climbing",        "Chalk Bag {}",               ["Std", "Large"],               (14, 26)),
    ("Climbing",        "Dynamic Rope {}",            ["60m", "70m", "80m"],          (160, 280)),
    ("Climbing",        "Locking Carabiner {}",       ["Screw", "Auto"],              (10, 22)),
    ("Climbing",        "Crash Pad {}",               ["Std", "XL"],                  (160, 320)),
    ("Water",           "Rapids Dry Bag {}",          ["10L", "20L", "35L"],          (18, 45)),
    ("Water",           "Flow Water Filter {}",       ["Squeeze", "Pump", "Gravity"], (30, 110)),
    ("Water",           "Hydro Bottle {}",            ["20oz", "32oz", "48oz"],       (12, 30)),
    ("Water",           "Paddle Jacket {}",           ["S", "M", "L", "XL"],          (90, 180)),
    ("Water",           "Inflatable Kayak {}",        ["1P", "2P"],                   (320, 620)),
    ("Water",           "PFD Vest {}",                ["S", "M", "L", "XL"],          (60, 130)),
    ("Cooking",         "Basecamp Stove {}",          ["Solo", "Duo"],                (40, 110)),
    ("Cooking",         "Trail Cookset {}",           ["1P", "2P", "4P"],             (30, 90)),
    ("Cooking",         "Ember Fuel Canister {}",     ["4oz", "8oz", "16oz"],         (5, 14)),
    ("Cooking",         "Camp Mug {}",                ["12oz", "16oz"],               (10, 22)),
    ("Cooking",         "Bear Canister {}",           ["Sm", "Lg"],                   (55, 95)),
    ("Cooking",         "Utensil Set {}",             ["Ti", "Alloy"],                (12, 30)),
    ("Cooking",         "Gravity Water Bag {}",       ["4L", "6L", "10L"],            (25, 55)),
    ("Electronics",     "Alpine Headlamp {}",         ["200lm", "400lm", "600lm"],    (22, 65)),
    ("Electronics",     "Solar Panel {}",             ["10W", "20W", "28W"],          (45, 130)),
    ("Electronics",     "Trail GPS {}",               ["Basic", "Topo"],              (140, 320)),
    ("Electronics",     "Power Bank {}",              ["10k mAh", "20k mAh"],         (28, 60)),
    ("Electronics",     "Two-Way Radio {}",           ["2-Pack", "4-Pack"],           (45, 110)),
    ("Electronics",     "Satellite Messenger {}",     ["Mini", "Plus"],               (200, 380)),
    ("Electronics",     "Action Camera {}",           ["1080p", "4K"],                (120, 320)),
    ("Bike",            "Ridgeline MTB Helmet {}",    ["S", "M", "L"],                (60, 140)),
    ("Bike",            "Trail Glove {}",             ["S", "M", "L", "XL"],          (20, 45)),
    ("Bike",            "Tubeless Tire {}",           ["27.5x2.4", "29x2.4", "29x2.6"], (40, 80)),
    ("Bike",            "Multi-Tool {}",              ["12-fn", "18-fn"],             (16, 38)),
    ("Bike",            "Bike Light {}",              ["Front", "Rear", "Combo"],     (22, 70)),
    ("Bike",            "Saddle Bag {}",              ["Sm", "Med", "Lg"],            (14, 32)),
    ("Bike",            "Floor Pump {}",              ["Std", "HV"],                  (30, 65)),
    ("Bike",            "Bike Rack {}",               ["Hitch 2", "Hitch 4"],         (180, 420)),
    ("Bike",            "Chain Lube {}",              ["Wet", "Dry"],                 (8, 16)),
    ("Bike",            "Handlebar Bag {}",           ["3L", "6L"],                   (28, 55)),
]


def sku(i: int) -> str:
    return f"SKU-{i:04d}"


def _catalog(n: int) -> list[tuple[str, str, tuple[float, float]]]:
    """Expand templates × variants, then cycle if needed to reach n items."""
    items: list[tuple[str, str, tuple[float, float]]] = []
    for cat, fmt, variants, cost in PRODUCT_TEMPLATES:
        for v in variants:
            items.append((cat, fmt.format(v), cost))
    out = []
    i = 0
    while len(out) < n:
        cat, name, cost = items[i % len(items)]
        if i >= len(items):
            name = f"{name} (Series II)"
        out.append((cat, name, cost))
        i += 1
    return out


def gen_products(n: int = 250) -> list[dict]:
    rows = []
    for i, (cat, name, (lo, hi)) in enumerate(_catalog(n), start=1):
        rows.append({
            "sku": sku(i),
            "name": name,
            "category": cat,
            "unit_cost": round(random.uniform(lo, hi), 2),
            "reorder_point": random.randint(40, 200),
            "is_seasonal": 1 if i % 17 == 0 else 0,
            "promo_next_month": 0,
        })
    by_sku = {r["sku"]: r for r in rows}
    # Engineered SKUs for the failure-mode tasks:
    #   F1 critical: SKU-0183 (top seller, 0 on hand)
    #   F2 promo:    SKU-0091
    #   F3 trivial:  SKU-0012
    #   R7 steady:   SKU-0057
    #   R8 promo-hist: SKU-0116
    by_sku["SKU-0091"]["promo_next_month"] = 1
    by_sku["SKU-0116"]["promo_next_month"] = 1
    by_sku["SKU-0183"]["reorder_point"] = 150
    by_sku["SKU-0012"]["reorder_point"] = 80
    return rows


def gen_suppliers() -> list[dict]:
    rows = []
    for i, name in enumerate(SUPPLIER_NAMES, start=1):
        rows.append({
            "supplier_id": f"SUP-{i:02d}",
            "name": name,
            "lead_time_days": random.choice([3, 5, 7, 10, 14, 21, 30]),
            "reliability": round(random.uniform(0.85, 0.99), 2),
        })
    return rows


def gen_supplier_catalog(products: list[dict], suppliers: list[dict]) -> list[dict]:
    rows = []
    for p in products:
        n_suppliers = random.randint(2, 4)
        for s in random.sample(suppliers, n_suppliers):
            rows.append({
                "sku": p["sku"],
                "supplier_id": s["supplier_id"],
                "unit_price": round(p["unit_cost"] * random.uniform(1.05, 1.6), 2),
                "min_order_qty": random.choice([10, 25, 50, 100]),
            })
    return rows


def gen_sales_history(products: list[dict], days: int = 90) -> list[dict]:
    rows = []
    base = {p["sku"]: random.uniform(2, 40) for p in products}
    base["SKU-0183"] = 95.0   # top seller (F1)
    base["SKU-0057"] = 18.0   # steady (R7)
    base["SKU-0116"] = 12.0   # promo-history (R8)
    base["SKU-0091"] = 14.0   # promo-next-month (F2)
    base["SKU-0012"] = 6.0    # trivial (F3)
    for d in range(days):
        day = TODAY - timedelta(days=days - 1 - d)
        for p in products:
            mu = base[p["sku"]]
            if p["is_seasonal"]:
                mu *= 1 + 0.4 * ((d % 30) / 30 - 0.5)
            if p["sku"] == "SKU-0116" and 25 <= d <= 35:
                mu *= 3.2  # historical promo spike ~60d ago
            sigma = mu * 0.25
            if p["sku"] == "SKU-0091":
                sigma = mu * 1.1  # F2: erratic history → low forecast confidence
            qty = max(0, int(random.gauss(mu, sigma)))
            rows.append({"date": day.isoformat(), "sku": p["sku"], "units_sold": qty})
    return rows


def gen_stock_levels(products: list[dict], days: int = 90) -> list[dict]:
    """SKU × warehouse × day. ~250 × 3 × 90 ≈ 67k rows."""
    rows = []
    rp = {p["sku"]: p["reorder_point"] for p in products}
    # ~55% of (sku, wh) pairs sit below reorder point so list_low_stock returns ~400 rows
    current = {}
    for p in products:
        for wh in WAREHOUSES:
            if random.random() < 0.55:
                current[(p["sku"], wh)] = random.randint(5, max(6, rp[p["sku"]] - 1))
            else:
                current[(p["sku"], wh)] = random.randint(rp[p["sku"]] + 20, rp[p["sku"]] + 400)
    current[("SKU-0183", "WH-EAST")] = 0
    current[("SKU-0183", "WH-WEST")] = 4
    current[("SKU-0183", "WH-CENTRAL")] = 8
    current[("SKU-0012", "WH-EAST")] = 22
    current[("SKU-0091", "WH-CENTRAL")] = 60
    current[("SKU-0042", "WH-EAST")] = 312   # R1 known answer
    for d in range(days):
        day = TODAY - timedelta(days=days - 1 - d)
        for (s, wh), qty in current.items():
            on_hand = qty if d == days - 1 else max(0, qty + random.randint(-15, 40))
            rows.append({"date": day.isoformat(), "sku": s, "warehouse": wh, "on_hand": on_hand})
    return rows


def write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        path.write_text("")
        return
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


def main() -> None:
    random.seed(42)
    products = gen_products()
    suppliers = gen_suppliers()
    write_csv(HERE / "products.csv", products)
    write_csv(HERE / "suppliers.csv", suppliers)
    write_csv(HERE / "supplier_catalog.csv", gen_supplier_catalog(products, suppliers))
    write_csv(HERE / "sales_history.csv", gen_sales_history(products))
    write_csv(HERE / "stock_levels.csv", gen_stock_levels(products))
    for sink in ("purchase_orders.jsonl", "outbox.jsonl", "erp_writes.jsonl"):
        (HERE / sink).write_text("")
    sizes = {p.name: p.stat().st_size for p in HERE.glob("*.csv")}
    print(json.dumps({"generated": sizes, "engineered_skus": {
        "F1_stockout": "SKU-0183", "F2_promo": "SKU-0091", "F3_trivial": "SKU-0012",
        "R7_steady": "SKU-0057", "R8_promo_hist": "SKU-0116",
    }}, indent=2))


if __name__ == "__main__":
    main()
