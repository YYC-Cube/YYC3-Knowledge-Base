# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
"""StockPilot starter — your working copy.

This is the original 2025-era agent's configuration, expressed as a Claude
Managed Agents config. Same 402-line prompt, same 12 tools (uploaded as
./tools.py in the sandbox), same subagent calls. The CMA runtime gives you
Bash, Read, Task, and skill loading — the primitives you need to refactor it.

Edit this file. After each change:

    uv run deploy starter
    uv run evals --agent starter --task F1

The TODO comments below are QUESTIONS, not instructions. For each tool,
decide: keep / replace with code-exec / replace with a skill / delete.
"""
from __future__ import annotations

from agents.anchor import DATE_ANCHOR
from agents.before.prompts import SYSTEM_PROMPT as LEGACY_PROMPT
from agents.cma import agent_name_for
from agents.common import MODEL


# ──────────────────────────────────────────────────────────────────────────
# The 12 legacy tools, available in the sandbox as ./tools.py.
# As you refactor, DELETE entries from this list.
# ──────────────────────────────────────────────────────────────────────────

LEGACY_TOOLS = [
    "get_stock_level",
    "list_low_stock",            # Returns ~400 rows raw into context. Is there a way to compute the answer instead of dumping the data?
    "get_sales_velocity",        # It's a mean. Does this need to be a tool?
    "forecast_demand",           # Calls a subagent that returns prose. What gets lost when the orchestrator parses prose?
    "get_supplier_catalog",
    "compare_supplier_quotes",   # Calls a subagent to do what is essentially a sort.
    "create_purchase_order",
    "update_erp_record",
    "send_slack_alert",          # Calls a writing subagent to fill what is essentially a template.
    "draft_email_to_supplier",   # Same question.
    "generate_weekly_report",    # Is the report structure a skill or a tool?
    "search_web_for_disruptions",  # Does this belong in this agent at all?
]


# ──────────────────────────────────────────────────────────────────────────
# Five skills are available in .claude/skills/. Read each SKILL.md, decide
# which ones earn their place, and enable them here by name. The README
# suggests one path; the evals will tell you if yours works.
# ──────────────────────────────────────────────────────────────────────────

SKILLS: list[str] = [
    # "notify-templates",
    # "weekly-report",
    # "reorder-policy",
    # "supplier-selection",
    # "forecasting",
]


# ──────────────────────────────────────────────────────────────────────────
# Once any skills are enabled (cycle 1), swap LEGACY_PROMPT → SHORT_PROMPT.
# ──────────────────────────────────────────────────────────────────────────

SHORT_PROMPT = f"""You are StockPilot, an inventory management agent for a mid-size
outdoor-gear retailer. {DATE_ANCHOR}

First, run: `mkdir -p /mnt/user/sinks && ln -sfn /mnt/session/uploads/data /mnt/user/data`
so the paths in skills resolve. Data lives as CSVs under /mnt/user/data/
(products, stock_levels ~67k rows, sales_history 90d, supplier_catalog,
suppliers). Write sinks (purchase_orders.jsonl, outbox.jsonl, erp_writes.jsonl)
go to /mnt/user/sinks/ — append one JSON object per line, with a `sku` and
`qty` field where applicable.

For any operation touching >5 SKUs, write a Python script via Bash that
reads the CSVs and prints compact JSON — don't page through tool calls.
Business policies (reorder, supplier selection, forecasting, notifications,
reports) live in skills — load the relevant one before applying a policy.
You can delegate to the `forecaster` agent for demand estimates that need
full-history analysis — see the forecasting skill for when.

End with a direct answer, a `ReorderDecision` block, or a `StockReport`.
"""


def _legacy_tools_note() -> str:
    if not LEGACY_TOOLS:
        return ""
    names = ", ".join(LEGACY_TOOLS)
    return (
        "\n\n## Legacy tools (uploaded as /mnt/session/uploads/tools.py)\n"
        "These are the original implementations. Call via Bash, e.g.:\n"
        "    python -c 'import sys; sys.path.insert(0,\"/mnt/session/uploads\"); "
        "import tools; print(tools.get_stock_level(\"SKU-0042\", \"WH-EAST\"))'\n"
        f"Available: {names}\n"
    )


def build_config(skill_ids: dict[str, str]) -> dict:
    tools: list[dict] = [{"type": "agent_toolset_20260401"}]

    # ──────────────────────────────────────────────────────────────────────
    # CYCLE 3 — subagents. The before-agent's `forecast_demand` hides a
    # subagent call inside a Python tool. That's not a thing on CMA — there's
    # no nested API call inside the sandbox.
    #
    # F2 needs a forecast with a numeric `confidence`. The forecasting skill
    # tells the agent WHAT contract to require ({forecast_qty, confidence,
    # method, flags}); it doesn't tell you HOW to get a second agent involved.
    #
    # That's your call. CMA gives you a few primitives. What would you reach
    # for, and why?
    # ──────────────────────────────────────────────────────────────────────

    return {
        "name": agent_name_for("stockpilot-starter"),
        "model": MODEL,
        "system": LEGACY_PROMPT + _legacy_tools_note(),  # ← swap LEGACY_PROMPT to SHORT_PROMPT (cycle 1)
        "tools": tools,
        "skills": [
            {"type": "custom", "skill_id": skill_ids[n], "version": "latest"}
            for n in SKILLS if n in skill_ids
        ],
    }
