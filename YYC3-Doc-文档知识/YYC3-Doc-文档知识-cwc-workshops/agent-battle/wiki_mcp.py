#!/usr/bin/env python3
# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""mcp_minecraft_wiki — a tiny MCP server with one tool, `lookup(query)`,
that returns Minecraft facts relevant to diamond mining.

This is the facilitator-provided knowledge source participants can
*elect* to attach via EXTRA_MCP in my_agent.py. The agent then has to
*choose* to call lookup() — it's not in context unless asked for.

Run:   python3 wiki_mcp.py            # serves on :8077/mcp
Then:  EXTRA_MCP = [MCP_MINECRAFT_WIKI]  in my_agent.py
"""
import difflib
import os

from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

PORT = int(os.environ.get("WIKI_MCP_PORT", "8077"))

FACTS = {
    "diamond depth": (
        "In Minecraft 1.18+, diamond ore generation peaks around y=-58. "
        "It generates between y=-64 and y=16, with frequency increasing "
        "as you go deeper. Both 'diamond_ore' (in stone) and "
        "'deepslate_diamond_ore' (in deepslate, below y=0) drop diamonds; "
        "search for both names."
    ),
    "ore requirements": (
        "Diamond ore requires an iron_pickaxe or better to drop diamonds. "
        "Mining it with wood or stone yields nothing. A diamond_pickaxe "
        "is NOT required — iron is sufficient. Iron ore needs a "
        "stone_pickaxe or better; coal and stone need wooden or better."
    ),
    "tech tree": (
        "From-scratch path to diamonds: punch logs → craft planks → "
        "crafting_table + sticks → wooden_pickaxe → mine cobblestone → "
        "stone_pickaxe → mine iron_ore → place furnace + fuel → smelt to "
        "iron_ingot → iron_pickaxe → descend below y=0 → mine diamond_ore."
    ),
    "smelting fuel": (
        "Coal smelts 8 items per piece. A wooden plank or stick smelts "
        "1.5 and 0.5 items respectively — they often burn out before "
        "iron finishes. Mine coal_ore before smelting iron."
    ),
    "tool durability": (
        "Pickaxe durability: wooden 59, stone 131, iron 250, diamond 1561. "
        "An iron pickaxe will break partway through a long mining session; "
        "craft a spare or bring materials to craft one at depth."
    ),
    "strip mining": (
        "After exhausting a diamond vein, move 30+ blocks horizontally "
        "before searching again — diamond veins do not cluster. Mining "
        "the same tunnel repeatedly wastes turns."
    ),
    "underground supplies": (
        "There are no trees below y≈50. Bring spare logs and a "
        "crafting_table when descending so you can craft replacement "
        "tools without returning to the surface."
    ),
    "crafting table": (
        "3×3 recipes (any pickaxe, furnace) require a placed "
        "crafting_table within reach. 2×2 recipes (planks, sticks, "
        "crafting_table itself) work from inventory."
    ),
    "tuff": (
        "Tuff is a decorative deepslate-layer block. It drops only "
        "itself and has no crafting use for diamond mining. Tunnel "
        "through it; don't farm it. Same for smooth_basalt and calcite "
        "(amethyst-geode shells)."
    ),
    "go_near descent": (
        "To descend many y-levels quickly, call go_near with your "
        "current x/z and a deep y (e.g. y=-55). The pathfinder digs "
        "straight down in one action. Mining stone block-by-block to "
        "descend wastes turns and pickaxe durability."
    ),
}

# DNS-rebinding protection rejects any Host header that isn't localhost,
# which breaks access through a public tunnel (cloudflared forwards the
# original trycloudflare.com Host). This server is intentionally exposed
# behind a tunnel for CMA to reach — the protection is for browser-based
# attacks against a developer's localhost, which isn't this use case.
mcp = FastMCP(
    "minecraft-wiki",
    port=PORT,
    transport_security=TransportSecuritySettings(
        enable_dns_rebinding_protection=False,
    ),
)


_STOP = {"the", "a", "an", "is", "are", "do", "does", "where", "what",
         "how", "in", "of", "for", "to", "i", "my", "me", "and", "or"}


def _score(query_words: set, topic: str, body: str) -> int:
    # Topic-word hits dominate; body-word hits break ties. Prefix-match
    # so "smelt" hits "smelting", "break" hits "breaks", etc.
    def hits(words):
        return sum(1 for q in query_words for w in words
                   if q == w or (len(q) > 3 and (q.startswith(w) or w.startswith(q))))
    return 10 * hits(topic.split()) + hits(set(body.lower().split()))


@mcp.tool()
def lookup(query: str) -> str:
    """Look up a Minecraft fact. Pass a short question or topic like
    'where do diamonds spawn', 'tool durability', 'smelting fuel', or
    'tech tree'. Returns the best-matching wiki entry, or the list of
    available topics if nothing matches."""
    qw = {w.strip(".,?!") for w in query.lower().split()} - _STOP
    if not qw:
        return "Available topics: " + ", ".join(sorted(FACTS.keys()))
    ranked = sorted(FACTS.items(), key=lambda kv: -_score(qw, kv[0], kv[1]))
    best_k, best_v = ranked[0]
    if _score(qw, best_k, best_v) > 0:
        return f"[{best_k}] {best_v}"
    close = difflib.get_close_matches(" ".join(qw), FACTS.keys(), n=1, cutoff=0.4)
    if close:
        k = close[0]
        return f"[{k}] {FACTS[k]}"
    return f"No entry for '{query}'. Available topics: " + ", ".join(sorted(FACTS.keys()))


if __name__ == "__main__":
    print(f"[wiki-mcp] serving {len(FACTS)} topics on :{PORT}/mcp", flush=True)
    mcp.run(transport="streamable-http")
