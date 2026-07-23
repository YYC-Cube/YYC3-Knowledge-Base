# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Anthropic tool schemas — one per Layer 1 action.

All tools are exposed every turn (no gating). Illegal calls return clean
errors which get fed back to Claude as the next tool_result. Each tool gets
an optional `reasoning` field that the harness logs but never sends to
bot.js — it's purely for replay readability.
"""

# A `reasoning` slot dropped into every tool's properties so Claude can
# narrate WHY it picked this action. The harness strips it before
# forwarding the call to bot.js (see agent.py).
_REASONING = {
    "type": "string",
    "description": "One sentence: why this action, right now. Logged but not executed.",
}


TOOLS = [
    {
        "name": "mine_block",
        "description": (
            "Walk to and mine the nearest blocks of the given type. "
            "Use this to gather raw materials (logs, stone, ores). "
            "The block must exist within ~64 blocks of the bot, ideally one "
            "you can see in nearby_blocks. Returns 'no <name> within 64 "
            "blocks' if none found."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Block name, e.g. 'oak_log', 'stone', 'iron_ore', 'coal_ore'.",
                },
                "max": {
                    "type": "integer",
                    "description": "How many to collect. Default 1. Don't over-gather.",
                    "default": 1,
                },
                "reasoning": _REASONING,
            },
            "required": ["name"],
        },
    },
    {
        "name": "craft_item",
        "description": (
            "Craft an item using inventory ingredients. 2x2 recipes (planks, "
            "sticks, crafting_table) work from inventory. 3x3 recipes "
            "(any pickaxe, furnace, etc.) require a placed crafting_table "
            "within 32 blocks — the bot will pathfind to it automatically."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Item name, e.g. 'oak_planks', 'stick', 'wooden_pickaxe'.",
                },
                "count": {
                    "type": "integer",
                    "description": "Number of times to apply the recipe. Default 1.",
                    "default": 1,
                },
                "reasoning": _REASONING,
            },
            "required": ["name"],
        },
    },
    {
        "name": "smelt",
        "description": (
            "Smelt one item type in a placed furnace within 32 blocks, using "
            "a fuel item from inventory (e.g. coal, oak_planks). Place the "
            "furnace first if there isn't one nearby."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "input": {"type": "string", "description": "Item to smelt, e.g. 'raw_iron'."},
                "fuel": {"type": "string", "description": "Fuel item, e.g. 'coal' or 'oak_planks'."},
                "count": {"type": "integer", "default": 1},
                "reasoning": _REASONING,
            },
            "required": ["input", "fuel"],
        },
    },
    {
        "name": "place_block",
        "description": (
            "Place a block from inventory next to the bot. Use this to put "
            "down a crafting_table or furnace before crafting items that "
            "need them."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Block name in inventory."},
                "reasoning": _REASONING,
            },
            "required": ["name"],
        },
    },
    {
        "name": "equip",
        "description": (
            "Equip an item to a slot. Use destination='hand' before mining "
            "stone or ores so the pickaxe is in hand and the drops aren't "
            "lost."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Item name in inventory."},
                "destination": {
                    "type": "string",
                    "description": "Slot: 'hand', 'head', 'torso', 'legs', 'feet'. Default 'hand'.",
                    "default": "hand",
                },
                "reasoning": _REASONING,
            },
            "required": ["name"],
        },
    },
    {
        "name": "go_near",
        "description": (
            "Walk near a target. Provide ONE of: block_name (nearest of "
            "that type within 64), entity_name (nearest entity matching), "
            "or pos {x,y,z}. Use this to reposition before mining a block "
            "the bot can't currently see."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "block_name": {"type": "string"},
                "entity_name": {"type": "string"},
                "pos": {
                    "type": "object",
                    "properties": {
                        "x": {"type": "number"},
                        "y": {"type": "number"},
                        "z": {"type": "number"},
                    },
                },
                "reasoning": _REASONING,
            },
        },
    },
    {
        "name": "drop",
        "description": "Drop items from inventory onto the ground. Use to discard junk.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "count": {"type": "integer", "default": 1},
                "reasoning": _REASONING,
            },
            "required": ["name"],
        },
    },
    {
        "name": "chat",
        "description": (
            "Say something in-game chat. Use to narrate what you're doing — "
            "this shows up in the demo viewer for the audience. Cheap and "
            "doesn't count toward your turn budget."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {"type": "string"},
                "reasoning": _REASONING,
            },
            "required": ["text"],
        },
    },
]
