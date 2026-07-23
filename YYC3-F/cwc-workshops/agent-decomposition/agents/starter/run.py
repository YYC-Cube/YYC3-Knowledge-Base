# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
from agents import cma
from agents.common import AgentResult


def run(prompt: str, max_turns: int = 15) -> AgentResult:
    return cma.run_session("starter", prompt, max_turns=max_turns)
