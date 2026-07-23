# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
"""Shared types and the agent runner interface that before/starter satisfy."""
from __future__ import annotations
import json
import os
import threading
import time
import uuid
from dataclasses import dataclass, field, asdict
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

DATA_DIR = Path(__file__).parent.parent / "data"
MODEL = os.environ.get("STOCKPILOT_MODEL", "claude-sonnet-4-6")


@dataclass
class AgentResult:
    final_text: str
    actions: list[dict] = field(default_factory=list)  # POs created, notifications sent, ERP writes
    turns: int = 0
    tokens_in: int = 0
    tokens_out: int = 0
    wall_ms: int = 0
    transcript: list[dict] = field(default_factory=list)
    error: str | None = None

    @property
    def total_tokens(self) -> int:
        return self.tokens_in + self.tokens_out

    def to_dict(self) -> dict:
        return asdict(self)


# ─── per-run sink isolation ────────────────────────────────────────────────
# Each run_agent() call gets its own data/.runs/<run_id>/ directory so
# parallel eval tasks never see each other's actions.

SINKS = ("purchase_orders.jsonl", "outbox.jsonl", "erp_writes.jsonl")
_run_local = threading.local()


def current_run_id() -> str:
    """Thread-local first (in-process before-agent), then env (subprocess), then default."""
    return getattr(_run_local, "run_id", None) or os.environ.get("STOCKPILOT_RUN_ID", "default")


import re as _re
_RUN_ID_RE = _re.compile(r"[A-Za-z0-9_-]{1,32}")


def sink_dir(run_id: str | None = None) -> Path:
    rid = run_id or current_run_id()
    if not _RUN_ID_RE.fullmatch(rid):
        raise ValueError(f"Invalid run_id: {rid!r}")
    return DATA_DIR / ".runs" / rid


def sink_path(name: str, run_id: str | None = None) -> Path:
    return sink_dir(run_id) / name


def reset_sinks(run_id: str) -> None:
    d = sink_dir(run_id)
    d.mkdir(parents=True, exist_ok=True)
    for name in SINKS:
        (d / name).write_text("")


def read_sink(name: str, run_id: str | None = None) -> list[dict]:
    path = sink_path(name, run_id)
    if not path.exists():
        return []
    out = []
    for line in path.read_text().splitlines():
        if not line.strip():
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            pass  # agent-written line with unescaped newlines; skip
    return out


def collect_actions(run_id: str) -> list[dict]:
    actions = []
    for sink, kind in [("purchase_orders.jsonl", "po"), ("outbox.jsonl", "notify"), ("erp_writes.jsonl", "erp")]:
        for rec in read_sink(sink, run_id):
            actions.append({**rec, "kind": kind})
    return actions


_RUNNERS = {
    "before": "agents.before.stockpilot",
    "starter": "agents.starter.run",
}


def run_agent(agent_name: str, prompt: str, max_turns: int = 15) -> AgentResult:
    """Dispatch to before (local Messages API) or starter (CMA session)."""
    if agent_name not in _RUNNERS:
        raise ValueError(f"unknown agent: {agent_name}")
    run_id = uuid.uuid4().hex[:12]
    _run_local.run_id = run_id
    os.environ["STOCKPILOT_RUN_ID"] = run_id
    reset_sinks(run_id)
    t0 = time.time()
    mod = __import__(_RUNNERS[agent_name], fromlist=["run"])
    result = mod.run(prompt, max_turns=max_turns)
    result.wall_ms = int((time.time() - t0) * 1000)
    result.actions = collect_actions(run_id)
    return result
