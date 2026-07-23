# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Facilitator verification of a run's JSONL trace.

For the workshop top-3 prize check: replays a run log and reconstructs
which achievements *should* have fired from the recorded game state, so
a facilitator can compare against what the leaderboard shows. Not
cryptographic — participants own bot.js and can patch the logger — but
catches the easy fakes (curl-posting achievements that never happened).

CLI:
    python -m harness.verify logs/latest.jsonl
"""

from __future__ import annotations

import argparse
import json
import sys

MILESTONES = [
    "wooden_pickaxe", "stone_pickaxe", "furnace",
    "iron_ingot", "iron_pickaxe", "diamond",
]


def verify(path: str) -> int:
    items_seen: set[str] = set()
    max_diamonds_inv = 0
    max_diamonds_collected = 0
    min_y: float | None = None
    model = tick_rate = None
    total_tokens = total_turns = None

    with open(path, encoding="utf-8") as fh:
        for line in fh:
            try:
                ev = json.loads(line)
            except json.JSONDecodeError:
                continue
            kind = ev.get("event")
            if kind == "run_start":
                model = ev.get("model")
            elif kind == "turn":
                state = ev.get("state") or {}
                inv_diamonds = 0
                for it in state.get("inventory") or []:
                    name = it.get("name")
                    items_seen.add(name)
                    if name == "diamond":
                        inv_diamonds += int(it.get("count", 0) or 0)
                max_diamonds_inv = max(max_diamonds_inv, inv_diamonds)
                dc = state.get("diamonds_collected")
                if isinstance(dc, int):
                    max_diamonds_collected = max(max_diamonds_collected, dc)
                pos = state.get("position") or {}
                y = pos.get("y")
                if y is not None:
                    min_y = y if min_y is None else min(min_y, y)
                if tick_rate is None:
                    tick_rate = state.get("tick_rate")
            elif kind == "run_end":
                total_tokens = ev.get("total_tokens")
                total_turns = ev.get("total_turns")

    # Source of truth is the bot's diamonds_collected counter (survives
    # crafting/dropping). Fall back to peak inventory count for older
    # traces that lack the field.
    diamonds = max_diamonds_collected or max_diamonds_inv

    print(f"trace:           {path}")
    print(f"model:           {model}")
    print(f"tick_rate:       {tick_rate if tick_rate is not None else '(not in trace)'}")
    if total_tokens is not None:
        print(f"tokens/turns:    {total_tokens} / {total_turns}")
    print(f"min_y:           {min_y:.1f}" if min_y is not None else "min_y:           (none)")
    print()
    print("─── Agent Battle scoring ───")
    print(f"diamonds:        {diamonds}  (collected={max_diamonds_collected}, peak-inv={max_diamonds_inv})")
    print(f"tiebreak tokens: {total_tokens if total_tokens is not None else '(not in trace)'}")
    print()
    print("─── progression sanity (audit only, does not affect rank) ───")
    for m in MILESTONES:
        mark = "✓" if m in items_seen else "·"
        print(f"  {mark} {m}")
    if min_y is not None:
        print(f"  {'✓' if min_y < 16 else '·'} reached diamond depth (y<16)")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("jsonl", help="path to a run_*.jsonl trace")
    args = ap.parse_args()
    return verify(args.jsonl)


if __name__ == "__main__":
    sys.exit(main())
