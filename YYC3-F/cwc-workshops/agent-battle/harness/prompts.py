# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""System prompt + state rendering + RunContext.

Plain text everywhere — Claude reads this directly. No JSON, no markdown
ceremony beyond what improves scannability.

The conversation is reset between tasks (see agent.play_task), so anything
that needs to carry across tasks lives in RunContext and is re-rendered at
the top of each task's first user message.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .client import GameState


_BASE_PROMPT = """\
You are playing Minecraft (Java edition, survival, peaceful) via a bot. Your \
goal is to progress through the tech tree: wood tools → stone tools → \
furnace → iron → diamond.

Each turn you see your inventory, position, health, and a small list of \
nearby blocks. Pick exactly ONE tool call. The bot executes it and you'll \
see the result on the next turn.

Key mechanics you must respect:
- 2x2 recipes (planks, sticks, crafting_table) work from inventory alone, \
regardless of which species of plank you have (oak, jungle, spruce, etc).
- 3x3 recipes (any pickaxe, furnace, etc.) need a placed crafting_table \
within 32 blocks. The bot will pathfind to it automatically.
- Crafting tables and furnaces only exist where YOU placed them this run. \
There are no pre-existing villages or structures with crafting_tables — if \
you need one, craft it (4 planks of any species) and place it.
- Smelting needs a placed furnace within 32 blocks plus a fuel item.
- You can only mine what's actually in the world near you. If a block \
isn't visible, use go_near or mine_block (which scans 64 blocks) — but if \
nothing of that type exists nearby, you'll get a clean error. If \
mine_block keeps timing out with "Took to long to decide path to goal", \
use go_near to a closer waypoint first instead of repeating the same call.
- Stone and ores drop NOTHING unless you equip a pickaxe in your hand \
first. Always equip the right tool before mining.

Be efficient — don't over-gather. If an action fails, read the error \
carefully and try something genuinely different. Repeating the same \
failing call is the worst thing you can do.
"""


_NARRATE_TAIL = """\

DEMO MODE: a live audience is watching you play. Before any \
non-trivial action (mining, crafting, placing, exploring), call \
chat() with a one-sentence plain-English plan in present tense, like \
"chopping down a jungle tree for wood" or "placing a crafting table to \
make a pickaxe". The chat tool is free — it doesn't count toward your \
turn budget. Skip chat for cheap actions like equip and drop.
"""


SYSTEM_PROMPT = _BASE_PROMPT


def build_system_prompt(narrate: bool = False) -> str:
    """Return the active system prompt. With narrate=True, append a demo-mode
    instruction telling Claude to chat() a one-line plan before each action."""
    return _BASE_PROMPT + (_NARRATE_TAIL if narrate else "")


REFLECTION_PROMPT = (
    "You just completed a task: {outcome}\n"
    "Your previous strategy notes were:\n"
    "{previous_notes}\n\n"
    "In ≤3 sentences, rewrite your strategy notes for your future self. "
    "Replace the old notes entirely — reconcile them with what you learned, "
    "don't just append. Focus on tactics that worked and pitfalls to avoid. "
    "Plain prose, no markdown, no list."
)


@dataclass
class RunContext:
    """Carries across tasks within one run() invocation.

    facts:    harness-computed snapshot of where we are right now
              (inventory summary, position, milestone reached). Updated
              every turn by summarize_facts() in agent.py.
    outcomes: short rolling history of the last ~5 task results, e.g.
              "wooden_pickaxe: ok in 7 turns".
    notes:    Claude-authored, rewritten end-of-task by reflect(). One
              short paragraph of evolving strategy.
    """

    facts: dict
    outcomes: list[str]
    notes: str = ""

    def render(self) -> str:
        lines = ["RUN CONTEXT"]
        if self.outcomes:
            lines.append("Recent task outcomes:")
            for o in self.outcomes:
                lines.append(f"  - {o}")
        if self.notes:
            lines.append(f"Your strategy notes from prior tasks: {self.notes}")
        if not self.outcomes and not self.notes:
            lines.append("(this is your first task — no prior context yet)")
        return "\n".join(lines)


def _format_inventory(gs: GameState) -> str:
    if not gs.inventory:
        return "(empty)"
    # Sum across slots so we get one entry per item type.
    counts: dict[str, int] = {}
    for it in gs.inventory:
        counts[it.name] = counts.get(it.name, 0) + it.count
    return ", ".join(f"{n}x {name}" for name, n in sorted(counts.items()))


def _format_nearby_blocks(gs: GameState, max_n: int = 12) -> str:
    if not gs.nearby_blocks:
        return "(none visible)"
    parts = []
    for b in gs.nearby_blocks[:max_n]:
        parts.append(f"{b.name} ({b.distance:.1f}m)")
    return ", ".join(parts)


def _format_position(gs: GameState) -> str:
    x, y, z = gs.position
    return f"x={x:.1f} y={y:.1f} z={z:.1f}"


def _format_equipped(gs: GameState) -> str:
    eq = gs.equipped or {}
    hand = eq.get("hand") or "(empty hand)"
    return f"in hand: {hand}"


def render_state(gs: GameState, run_ctx: RunContext, task: str) -> str:
    """Full first-turn render: run context + state + current task."""
    return "\n".join([
        run_ctx.render(),
        "",
        "CURRENT STATE",
        f"Position: {_format_position(gs)}",
        f"Health: {gs.health:.0f}/20    Food: {gs.food:.0f}/20",
        f"Inventory: {_format_inventory(gs)}",
        f"Equipped: {_format_equipped(gs)}",
        f"Nearby blocks: {_format_nearby_blocks(gs)}",
        "",
        f"CURRENT TASK: obtain {task}",
        "Pick exactly one tool to call.",
    ])


def render_state_delta(gs: GameState, task: str) -> str:
    """Compact subsequent-turn render: just current state + task line.

    No RunContext header — that's already in the conversation history. The
    goal is to keep the per-turn user message short so the conversation
    doesn't balloon over 20+ turns.
    """
    return "\n".join([
        f"Inventory: {_format_inventory(gs)}",
        f"Equipped: {_format_equipped(gs)}    Position: {_format_position(gs)}",
        f"Nearby blocks: {_format_nearby_blocks(gs)}",
        f"Still working toward: {task}",
    ])
