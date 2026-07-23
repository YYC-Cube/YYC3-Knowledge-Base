# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
"""StockPilot v1 — hand-rolled agentic loop on the Messages API."""
from __future__ import annotations
import json
import anthropic
from agents.common import AgentResult, MODEL
from agents.before.prompts import SYSTEM_PROMPT
from agents.before.tools import TOOL_DEFS, dispatch
from agents.before import subagents


def run(prompt: str, max_turns: int = 25) -> AgentResult:
    client = anthropic.Anthropic()
    messages: list = [{"role": "user", "content": prompt}]
    transcript: list = [{"role": "user", "content": prompt}]
    tokens_in = tokens_out = turns = 0
    subagents.reset_counter()
    final_text = ""

    while turns < max_turns:
        turns += 1
        resp = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOL_DEFS,
            messages=messages,
        )
        tokens_in += resp.usage.input_tokens
        tokens_out += resp.usage.output_tokens
        transcript.append({"role": "assistant", "content": [b.model_dump() for b in resp.content]})

        if resp.stop_reason == "end_turn":
            final_text = "".join(b.text for b in resp.content if b.type == "text")
            break

        tool_results = []
        for block in resp.content:
            if block.type == "tool_use":
                try:
                    result = dispatch(block.name, block.input)
                except Exception as e:
                    result = f"Error: {e}"
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": str(result),
                })
        if not tool_results:
            final_text = "".join(b.text for b in resp.content if b.type == "text")
            break

        messages.append({"role": "assistant", "content": resp.content})
        messages.append({"role": "user", "content": tool_results})
        transcript.append({"role": "user", "content": tool_results})

    sub_in = subagents.token_counter["input"]
    sub_out = subagents.token_counter["output"]
    return AgentResult(
        final_text=final_text,
        turns=turns,
        tokens_in=tokens_in + sub_in,
        tokens_out=tokens_out + sub_out,
        transcript=transcript,
    )
