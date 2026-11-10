# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Fast eval probes for `my_agent.py --eval`.

Each probe is a synthetic game state + a rubric. We send the state to
the participant's actual CMA agent (same system/skills/MCP/model),
capture the first action it would take, and score it. ~10s per probe,
no Minecraft side-effects that matter (we interrupt before results
land). The point: validate "does my config make good decisions?"
without a noisy 5-minute run.
"""
from __future__ import annotations

import concurrent.futures
import json
import os
import textwrap
from dataclasses import dataclass
from typing import Callable


GOOD, OK, POOR = "✓", "⚠", "✗"


@dataclass
class Probe:
    key: str
    title: str
    state: dict
    score: Callable[[str, dict], tuple[str, str]]
    # Most probes skip lookup/read so a skill or wiki call doesn't
    # consume the captured slot. The uses-lookup probe inverts that:
    # calling lookup IS the right answer, so capture it.
    capture_lookup: bool = False
    # Optional extra context lines prepended to the synthetic-state
    # message — for probes where the scenario isn't fully expressible
    # in the state JSON (e.g. "your last 3 actions were chat()").
    preamble: str = ""


def _state(**kw) -> dict:
    """Build a minimal /state-shaped dict with sensible defaults."""
    base = {
        "connected": True,
        "position": {"x": 10, "y": -55, "z": 320},
        "health": 20, "food": 20,
        "inventory": [{"name": "iron_pickaxe", "count": 1}],
        "equipped": {"hand": "iron_pickaxe"},
        "nearby_blocks": [],
        "nearby_entities": [],
        "diamonds_collected": 0,
    }
    base.update(kw)
    return base


def _score_equip(name, args):
    if name == "equip" and "iron_pickaxe" in str(args.get("name", "")):
        return GOOD, "equips the iron pickaxe"
    if name == "mine_block":
        return POOR, "mines with the stone pick — diamond ore drops nothing"
    return OK, f"{name} — should equip iron_pickaxe first"


def _score_iron_required(name, args):
    # Stone pick in hand, materials for iron in inventory, diamond ore
    # right there. Mining it with stone yields nothing — must craft first.
    if name == "place_block" and "crafting_table" in str(args.get("name", "")):
        return GOOD, "places table to craft iron_pickaxe — knows stone won't work"
    if name == "craft_item" and "iron_pickaxe" in str(args.get("name", "")):
        return GOOD, "crafts iron_pickaxe — knows stone won't work on diamond"
    if name == "craft_item":
        return OK, f"crafts {args.get('name')} — on the path to iron_pickaxe"
    if name == "mine_block" and "diamond" in str(args.get("name", "")):
        return POOR, "mines diamond ore with STONE pick — drops nothing"
    if name == "equip" and "stone" in str(args.get("name", "")):
        return POOR, "equips stone_pickaxe for diamond — won't work"
    return OK, f"{name} — need an iron_pickaxe before mining diamond"


def _score_variant(name, args):
    target = str(args.get("name", ""))
    if name == "mine_block" and "deepslate_diamond_ore" in target:
        return GOOD, "mines the variant that's actually here"
    if name == "mine_block" and target == "diamond_ore":
        return POOR, "wrong variant — only deepslate_diamond_ore is nearby"
    if name == "go_near" and "deepslate_diamond_ore" in str(args):
        return OK, "moves toward it — fine, but could mine directly"
    return POOR, f"{name} — diamond ore is right there, mine it"


def _score_depth(name, args):
    if name == "go_near":
        y = (args.get("pos") or {}).get("y")
        if isinstance(y, (int, float)) and y <= -40:
            return GOOD, f"descends toward y={y}"
        if isinstance(y, (int, float)) and y < 5:
            return OK, f"descends to y={y} — right direction, not deep enough"
        return POOR, "moves but not toward diamond depth"
    if name == "mine_block" and "diamond" in str(args.get("name", "")):
        return GOOD, "searches for diamond ore directly (mine_block scans 64 blocks)"
    if name == "mine_block":
        return POOR, "digs at y=10 — diamonds are far below; use go_near to descend"
    return OK, f"{name} — should descend (go_near to a deep y) or search for ore"


def _score_relocate(name, args):
    if name == "go_near":
        pos = args.get("pos") or {}
        if pos and (abs(pos.get("x", 10) - 10) >= 20
                    or abs(pos.get("z", 320) - 320) >= 20):
            return GOOD, "relocates 20+ blocks — fresh territory"
        if args.get("block_name", "").endswith("diamond_ore"):
            return OK, "searches for ore by name — reasonable"
        return OK, "moves, but not far"
    if name == "mine_block" and "diamond" in str(args.get("name", "")):
        return OK, "re-searches for ore — works, but go_near relocate is faster"
    if name == "mine_block":
        return POOR, "tunnels the exhausted area — veins don't cluster"
    return OK, f"{name}"


def _score_durability(name, args):
    if name == "craft_item" and "iron_pickaxe" in str(args.get("name", "")):
        return GOOD, "crafts a replacement before the current one breaks"
    if name == "place_block" and "crafting_table" in str(args.get("name", "")):
        return GOOD, "places table to craft — on the right path"
    if name == "mine_block" and "diamond" in str(args.get("name", "")):
        return OK, "keeps mining — risky, pick may break mid-vein"
    return OK, f"{name} — pick is nearly broken; consider crafting a spare"


def _score_discipline(name, args):
    if name == "mine_block" and "diamond" in str(args.get("name", "")):
        return GOOD, "keeps mining — ore is right there"
    if name == "get_state":
        return POOR, "wastes a turn — state hasn't changed since last action"
    if name == "chat":
        return POOR, "burns tokens narrating instead of mining"
    return OK, f"{name}"


def _score_restraint(name, args):
    # The probe message says the agent has chatted 3 times in a row.
    if name == "chat":
        return POOR, "fourth chat in a row — tokens are the tiebreaker"
    if name == "mine_block" and "diamond" in str(args.get("name", "")):
        return GOOD, "stops narrating and mines"
    if name in ("go_near", "equip", "mine_block"):
        return OK, f"{name} — at least it's not another chat"
    if name == "get_state":
        return POOR, "you have the state; act on it"
    return OK, f"{name}"


def _score_uses_lookup(name, args):
    # ✓ only if the agent calls lookup() — which is only available if
    # the participant attached MCP_MINECRAFT_WIKI. This probe is the
    # MCP lever's home; the skill doesn't mention tuff/basalt.
    if name == "lookup":
        return GOOD, "consults the wiki on the unfamiliar block before acting"
    if name == "mine_block" and args.get("name") in ("tuff", "smooth_basalt"):
        return POOR, "mines tuff/basalt — neither drops anything useful"
    if name in ("go_near", "mine_block"):
        return OK, f"{name} — acts without checking; if you have lookup(), use it first"
    return OK, f"{name} — a lookup tool may be available; try it when uncertain"


def _score_prioritizes(name, args):
    # Two veins: one at 3 blocks, one at 35. ~2 min on the clock.
    # Pickaxe at 100/250 — durability is NOT the constraint, time is.
    if name == "mine_block" and "diamond" in str(args.get("name", "")):
        return GOOD, "mines the near vein — time is the constraint"
    if name == "go_near":
        pos = args.get("pos") or {}
        if pos and abs(pos.get("x", 10) - 10) > 15:
            return POOR, "heads for the far vein — won't reach it in time"
        return OK, "moves — but the near ore is mineable now"
    if name in ("craft_item", "place_block"):
        return POOR, "manages durability — but the pick has 100 uses left and 2 min on the clock"
    return OK, f"{name}"


PROBES: list[Probe] = [
    Probe(
        "iron-required", "stone_pickaxe in hand, materials for iron, diamond ore at 3 blocks",
        _state(
            position={"x": 10, "y": -40, "z": 320},
            inventory=[
                {"name": "stone_pickaxe", "count": 1},
                {"name": "iron_ingot", "count": 3},
                {"name": "stick", "count": 4},
                {"name": "crafting_table", "count": 1},
                {"name": "torch", "count": 12},
            ],
            equipped={"hand": "stone_pickaxe"},
            nearby_blocks=[
                {"name": "deepslate_diamond_ore", "distance": 3.2},
                {"name": "deepslate", "distance": 1.0},
            ],
        ),
        _score_iron_required,
    ),
    Probe(
        "equip", "iron_pickaxe in inventory, stone_pickaxe in hand",
        _state(
            inventory=[
                {"name": "stone_pickaxe", "count": 1},
                {"name": "iron_pickaxe", "count": 1},
                {"name": "torch", "count": 12},
            ],
            equipped={"hand": "stone_pickaxe"},
            nearby_blocks=[
                {"name": "deepslate_diamond_ore", "distance": 2.4},
                {"name": "deepslate", "distance": 1.0},
            ],
        ),
        _score_equip,
    ),
    Probe(
        "ore-variant", "deepslate_diamond_ore at 3 blocks (not plain diamond_ore)",
        _state(
            nearby_blocks=[
                {"name": "deepslate", "distance": 1.0},
                {"name": "deepslate_diamond_ore", "distance": 3.1},
                {"name": "tuff", "distance": 4.2},
            ],
        ),
        _score_variant,
    ),
    Probe(
        "depth", "at y=10, stone layer, no ore — how do you get to diamond depth?",
        _state(
            position={"x": 10, "y": 10, "z": 320},
            nearby_blocks=[
                {"name": "stone", "distance": 1.0},
                {"name": "andesite", "distance": 2.4},
                {"name": "dirt", "distance": 5.0},
            ],
        ),
        _score_depth,
        preamble=(
            "You've called mine_block({'name':'stone'}) four times in a "
            "row and only dropped 6 y-levels. There may be a faster way "
            "to descend."
        ),
    ),
    Probe(
        "relocate", "at y=-58, vein just exhausted — no ore within 64 blocks",
        _state(
            position={"x": 10, "y": -58, "z": 320},
            inventory=[
                {"name": "iron_pickaxe", "count": 1},
                {"name": "diamond", "count": 7},
                {"name": "torch", "count": 8},
            ],
            diamonds_collected=7,
            nearby_blocks=[
                {"name": "deepslate", "distance": 1.0},
                {"name": "tuff", "distance": 2.0},
                {"name": "cobbled_deepslate", "distance": 1.4},
            ],
        ),
        _score_relocate,
    ),
    Probe(
        "durability", "iron_pickaxe nearly broken; have ingots + table",
        _state(
            inventory=[
                {"name": "iron_pickaxe", "count": 1, "durability": 9, "max_durability": 250},
                {"name": "iron_ingot", "count": 3},
                {"name": "stick", "count": 4},
                {"name": "crafting_table", "count": 1},
                {"name": "diamond", "count": 12},
            ],
            nearby_blocks=[
                {"name": "deepslate_diamond_ore", "distance": 4.0},
                {"name": "deepslate", "distance": 1.0},
            ],
            diamonds_collected=12,
        ),
        _score_durability,
    ),
    Probe(
        "discipline", "just mined ore; more ore at 2 blocks; nothing else changed",
        _state(
            inventory=[
                {"name": "iron_pickaxe", "count": 1},
                {"name": "diamond", "count": 4},
            ],
            diamonds_collected=4,
            nearby_blocks=[
                {"name": "deepslate_diamond_ore", "distance": 2.1},
                {"name": "deepslate", "distance": 1.0},
            ],
        ),
        _score_discipline,
    ),
    Probe(
        "restraint", "you've called chat() 3 turns in a row; ore is at 5 blocks",
        _state(
            inventory=[
                {"name": "iron_pickaxe", "count": 1},
                {"name": "diamond", "count": 9},
            ],
            diamonds_collected=9,
            nearby_blocks=[
                {"name": "deepslate_diamond_ore", "distance": 5.2},
                {"name": "deepslate", "distance": 1.0},
            ],
        ),
        _score_restraint,
        preamble=(
            "Your last three actions were chat() narrating progress. "
            "Tokens are the leaderboard tiebreaker."
        ),
    ),
    Probe(
        "uses-lookup", "unfamiliar block 'tuff' everywhere — worth mining? consult reference",
        _state(
            position={"x": 10, "y": -42, "z": 320},
            nearby_blocks=[
                {"name": "tuff", "distance": 1.0},
                {"name": "tuff", "distance": 1.4},
                {"name": "deepslate", "distance": 3.0},
                {"name": "smooth_basalt", "distance": 4.5},
            ],
        ),
        _score_uses_lookup,
        capture_lookup=True,
        preamble=(
            "You're surrounded by 'tuff' and 'smooth_basalt' — blocks "
            "you don't have notes on. Are these worth mining, or should "
            "you tunnel through? You don't know. If a lookup() tool is "
            "available, call it BEFORE deciding."
        ),
    ),
    Probe(
        "prioritizes", "~2 min left; ore at 3 blocks AND 35 blocks; pick at 100/250",
        _state(
            inventory=[
                {"name": "iron_pickaxe", "count": 1, "durability": 100, "max_durability": 250},
                {"name": "diamond", "count": 18},
                {"name": "iron_ingot", "count": 3},
                {"name": "stick", "count": 4},
            ],
            diamonds_collected=18,
            nearby_blocks=[
                {"name": "deepslate_diamond_ore", "distance": 3.0},
                {"name": "deepslate_diamond_ore", "distance": 35.4,
                 "pos": {"x": 45, "y": -57, "z": 320}},
                {"name": "deepslate", "distance": 1.0},
            ],
        ),
        _score_prioritizes,
        preamble="Roughly 2 minutes remain on the timer.",
    ),
]


def run(client, agent_id: str, env_id: str) -> int:
    """Run all probes against the given CMA agent. Returns count of GOODs.
    Probes execute concurrently (each is an independent CMA session) so
    wall-clock is ~max(probe) not sum(probes)."""
    n = len(PROBES)
    workers = max(1, min(n, int(os.environ.get("EVAL_WORKERS", "4"))))
    print(f"Evaluating agent {agent_id} — {n} probes, "
          f"{workers} concurrent\n", flush=True)
    results: dict[int, tuple] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(_probe_one, client, agent_id, env_id, p): (i, p)
                for i, p in enumerate(PROBES, 1)}
        for fut in concurrent.futures.as_completed(futs):
            i, p = futs[fut]
            try:
                name, args = fut.result()
            except Exception as e:  # noqa: BLE001
                name, args = None, {"_error": str(e)}
            results[i] = (p, name, args)
            print(f"  · {p.key} done", flush=True)
    print()
    goods = 0
    for i in range(1, n + 1):
        p, name, args = results[i]
        if name is None:
            mark, why = POOR, f"no tool call captured ({(args or {}).get('_error','timed out')})"
        else:
            mark, why = p.score(name, args or {})
        if mark == GOOD:
            goods += 1
        call_str = f"{name}({_short(args)})" if name else "—"
        print(f"[{i}/{n}] {p.key:<12} {p.title}")
        print(f"              → {call_str}")
        print(f"              {mark} {why}\n")
    print(f"Score: {goods}/{n} ✓")
    if goods < n:
        print(textwrap.fill(
            "No single lever solves all of these. Some probes test facts "
            "(depth, ore names) — a skill or your system prompt can supply "
            "those. Some test behavior (relocate, restraint, prioritize) — "
            "only your prompt shapes that. One tests whether your agent "
            "consults a reference tool — that needs an MCP server attached "
            "AND a prompt that tells the agent to use it. Look at the EDIT "
            "block in my_agent.py.",
            width=72, initial_indent="  ", subsequent_indent="  ",
        ))
    return goods


def _probe_one(client, agent_id, env_id, probe: Probe):
    """One session, one synthetic state, capture first non-get_state tool."""
    sess = client.beta.sessions.create(
        agent=agent_id, environment_id=env_id, title=f"eval:{probe.key}",
    )
    parts = ["[EVAL PROBE] If you have any skills attached, read them first."]
    if probe.preamble:
        parts.append(probe.preamble)
    parts.append(
        "You already called get_state and received the JSON below. Based "
        "ONLY on this state, choose exactly ONE next action (do not call "
        "get_state again).\n\n" + json.dumps(probe.state, indent=2)
    )
    msg = "\n\n".join(parts)
    captured = (None, None)
    try:
        with client.beta.sessions.events.stream(sess.id) as stream:
            client.beta.sessions.events.send(
                sess.id,
                events=[{"type": "user.message",
                         "content": [{"type": "text", "text": msg}]}],
            )
            skipped = 0
            for ev in stream:
                et = ev.type
                nm = getattr(ev, "name", "")
                # Skip skill reads and at most one stray get_state so the
                # agent can load attached skills before we score its action.
                if et in ("agent.mcp_tool_use", "agent.tool_use"):
                    inp = getattr(ev, "input", {}) or {}
                    skip_set = {"read", "get_state"}
                    if not probe.capture_lookup:
                        skip_set.add("lookup")
                    if nm in skip_set and skipped < 3:
                        skipped += 1
                        continue
                    captured = (nm, inp)
                    break
                if et in ("session.status_idle", "session.status_terminated"):
                    break
    finally:
        try:
            client.beta.sessions.events.send(
                sess.id, events=[{"type": "user.interrupt"}]
            )
        except Exception:
            pass
        try:
            client.beta.sessions.archive(sess.id)
        except Exception:
            pass
    return captured


def _short(args) -> str:
    if not args:
        return ""
    keep = {k: v for k, v in args.items() if k != "reasoning"}
    s = json.dumps(keep, separators=(",", ":"))
    return s if len(s) <= 60 else s[:57] + "…"
