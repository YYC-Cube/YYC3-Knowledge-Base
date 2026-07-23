# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Cost reporting to the workshop leaderboard.

bot.js reports achievements (it can observe game state). Only the harness
knows API token usage, so it reports cost separately to /api/cost. The
leaderboard joins both per participant and computes
  score = SUM(achievement_points) - tokens/100 - turns*2

All four env vars are shared with bot.js so participants set them once:
  LEADERBOARD_URL     base API url, e.g. https://<deploy>.netlify.app/api
  LEADERBOARD_KEY     legacy shared secret (x-workshop-key header) — optional
  PARTICIPANT_TOKEN   per-participant JWT minted by the facilitator; scopes
                      POSTs to just this participant's row. Preferred over
                      LEADERBOARD_KEY.
  PARTICIPANT         display name on the board (must match the token)

If LEADERBOARD_URL is unset, every call is a silent no-op — local dev and
tests run unchanged. If PARTICIPANT_TOKEN is unset, falls back to the
legacy LEADERBOARD_KEY path so existing dev workflows keep working.
"""

from __future__ import annotations

import os
import time

import httpx

_BASE = os.environ.get("LEADERBOARD_URL", "").rstrip("/")
_KEY = os.environ.get("LEADERBOARD_KEY", "")
_TOKEN = os.environ.get("PARTICIPANT_TOKEN", "")
_PARTICIPANT = os.environ.get("PARTICIPANT") or "unknown"
_RUN_ID = os.environ.get("RUN_ID") or time.strftime("%Y%m%d-%H%M%S")
# Bot HTTP root for reading /state (diamonds_collected). Independent of
# BOT_MCP_URL since the harness may run alongside the bot locally even
# when the agent reaches it through a tunnel.
_BOT_BASE = os.environ.get("BOT_STATE_URL", "http://localhost:8088").rstrip("/")
# Free-form metadata attached to every cost POST (model name, etc.) so
# facilitators can spot anomalies during top-3 verification. Set via
# set_meta() once the agent knows its model.
_META: dict = {}

REPORT_EVERY = 2


def _headers() -> dict:
    """Headers for webhook POSTs. Prefers PARTICIPANT_TOKEN (bearer JWT);
    falls back to the legacy LEADERBOARD_KEY shared secret. Both may be
    sent — the server accepts either."""
    h: dict = {}
    if _TOKEN:
        h["Authorization"] = f"Bearer {_TOKEN}"
    if _KEY:
        h["x-workshop-key"] = _KEY
    return h


def set_meta(**kw) -> None:
    _META.update(kw)


def disable() -> None:
    """Suppress all leaderboard POSTs from this process (practice mode).
    The bot's own achievement POSTs are gated separately via reset_run."""
    global _BASE
    _BASE = ""


def _fetch_diamonds() -> int:
    """Read the bot's running diamond counter for this run. Best-effort;
    returns 0 on any failure so cost reporting never blocks on the bot."""
    try:
        r = httpx.get(f"{_BOT_BASE}/state", timeout=3)
        r.raise_for_status()
        return int(r.json().get("diamonds_collected", 0) or 0)
    except Exception:  # noqa: BLE001
        return 0


def report_narration(kind: str, text: str) -> None:
    """POST a narration line for the cast-view chat ticker. Use kind='thought'
    for Claude's pre-tool reasoning so the UI can render it dimmed."""
    if not _BASE:
        return
    try:
        httpx.post(
            f"{_BASE}/narration",
            json={"participant": _PARTICIPANT, "kind": kind, "text": text},
            headers=_headers(),
            timeout=5,
        )
    except Exception as e:  # noqa: BLE001
        print(f"[leaderboard] narration post failed: {e}")


def report_cost(tokens: int, turns: int, *, final: bool = False) -> None:
    """POST current token+turn totals. Fire-and-forget; never raises."""
    if not _BASE:
        return
    try:
        httpx.post(
            f"{_BASE}/cost",
            json={
                "participant": _PARTICIPANT,
                "tokens": int(tokens),
                "turns": int(turns),
                "diamonds": _fetch_diamonds(),
                "run_id": _RUN_ID,
                "final": final,
                "meta": _META,
            },
            headers=_headers(),
            timeout=5,
        )
    except Exception as e:  # noqa: BLE001
        print(f"[leaderboard] cost post failed: {e}")


def maybe_report_cost(tokens: int, turns: int) -> None:
    """Report only on every Nth turn, for use inside agent loops."""
    if turns % REPORT_EVERY == 0:
        report_cost(tokens, turns)


class CostTracker:
    """Accumulates tokens+turns across an agent run and reports periodically.

    Use when the agent loop doesn't already have running totals handy
    (agent.py delegates token tracking to an optional RunLogger; this
    tracks independently so cost reporting works without --log-dir).
    """

    def __init__(self) -> None:
        self.tokens = 0
        self.turns = 0

    def note_usage(self, usage) -> None:
        if usage is None:
            return
        self.tokens += int(getattr(usage, "input_tokens", 0) or 0)
        self.tokens += int(getattr(usage, "output_tokens", 0) or 0)

    def tick(self) -> None:
        self.turns += 1
        maybe_report_cost(self.tokens, self.turns)

    def final(self) -> None:
        # Skip if nothing happened — avoids {tokens:0,turns:0} noise from
        # processes that import harness.agent without running it (tests,
        # mcp_smoke, etc.) while LEADERBOARD_URL happens to be set.
        if self.turns == 0 and self.tokens == 0:
            return
        report_cost(self.tokens, self.turns, final=True)
