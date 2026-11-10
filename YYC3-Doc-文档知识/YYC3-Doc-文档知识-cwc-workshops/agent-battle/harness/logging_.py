# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Per-run JSONL logger.

Wired into agent.py via an explicit `logger=` parameter — no monkeypatching,
no globals. One JSONL file per run, one line per event:

  {"event":"turn", "ts","task","turn","state","run_ctx",
   "messages_tail","action","result","inventory_delta"}
  {"event":"task_end", "task","ok","turns","summary"}
  {"event":"task_notes_after", "task","notes"}
  {"event":"run_end", "reached","wall_time_s","total_turns","total_tokens"}

Each line is self-contained JSON. Replay just iterates and dispatches by
`event`. Tokens are summed across all messages.create() responses via
`note_usage()` — workshop participants will want to know what a run cost.
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from typing import Any, Optional

from .prompts import RunContext


def _now() -> float:
    return time.time()


def _serialize_messages_tail(messages: list[Any]) -> list[Any]:
    """The assistant content from the Anthropic SDK is a list of typed
    blocks (TextBlock, ToolUseBlock). Convert them to plain dicts so JSON
    can encode them. User messages are already plain dicts."""
    out = []
    for m in messages:
        role = m.get("role")
        content = m.get("content")
        if isinstance(content, list):
            blocks = []
            for b in content:
                if isinstance(b, dict):
                    blocks.append(b)
                else:
                    # Anthropic SDK content block — duck-type it
                    btype = getattr(b, "type", None)
                    if btype == "text":
                        blocks.append({"type": "text", "text": getattr(b, "text", "")})
                    elif btype == "tool_use":
                        blocks.append({
                            "type": "tool_use",
                            "id": getattr(b, "id", None),
                            "name": getattr(b, "name", None),
                            "input": getattr(b, "input", {}),
                        })
                    else:
                        blocks.append({"type": btype or "unknown"})
            out.append({"role": role, "content": blocks})
        else:
            out.append({"role": role, "content": content})
    return out


@dataclass
class RunLogger:
    path: str
    fh: Any
    thinking_path: str = ""
    thinking_fh: Any = None
    started_at: float = field(default_factory=_now)
    total_turns: int = 0
    total_input_tokens: int = 0
    total_output_tokens: int = 0

    @classmethod
    def open(cls, log_dir: str, *, target: str, model: str) -> "RunLogger":
        os.makedirs(log_dir, exist_ok=True)
        ts = time.strftime("%Y%m%d-%H%M%S")
        path = os.path.join(log_dir, f"run_{ts}.jsonl")
        thinking_path = os.path.join(log_dir, f"run_{ts}.thinking.txt")
        # line-buffered so a crashed run still has flushed events
        fh = open(path, "w", buffering=1, encoding="utf-8")
        thinking_fh = open(thinking_path, "w", buffering=1, encoding="utf-8")

        # Maintain stable "latest" symlinks so a demo presenter can run
        # `tail -F logs/latest.thinking.txt` once and watch every attempt
        # in sequence without needing to rename the path each time. tail -F
        # follows recreated/replaced files transparently.
        for stable, target_path in (
            ("latest.thinking.txt", os.path.basename(thinking_path)),
            ("latest.jsonl", os.path.basename(path)),
        ):
            stable_path = os.path.join(log_dir, stable)
            try:
                if os.path.islink(stable_path) or os.path.exists(stable_path):
                    os.unlink(stable_path)
                os.symlink(target_path, stable_path)
            except OSError:
                # symlinks not supported (some FS) — fall back to a copy
                # we'll keep updating via _write/turn calls below.
                pass

        logger = cls(path=path, fh=fh, thinking_path=thinking_path, thinking_fh=thinking_fh)
        logger._write({
            "event": "run_start",
            "ts": logger.started_at,
            "target": target,
            "model": model,
        })
        thinking_fh.write(
            f"# run target={target} model={model} "
            f"started={time.strftime('%Y-%m-%d %H:%M:%S')}\n"
        )
        return logger

    def _write(self, obj: dict) -> None:
        try:
            self.fh.write(json.dumps(obj, default=str) + "\n")
        except Exception as e:
            # Logging must never crash a run.
            try:
                self.fh.write(json.dumps({"event": "log_error", "error": str(e)}) + "\n")
            except Exception:
                pass

    def note_usage(self, usage: Any) -> None:
        if usage is None:
            return
        self.total_input_tokens += int(getattr(usage, "input_tokens", 0) or 0)
        self.total_output_tokens += int(getattr(usage, "output_tokens", 0) or 0)

    def turn(
        self,
        *,
        task: str,
        turn: int,
        state: dict,
        run_ctx: RunContext,
        messages_tail: list[Any],
        action: dict,
        result: dict,
        inventory_delta: dict[str, int],
    ) -> None:
        self.total_turns += 1
        self._write({
            "event": "turn",
            "ts": _now(),
            "task": task,
            "turn": turn,
            "state": state,
            "run_ctx": {
                "facts": run_ctx.facts,
                "outcomes": list(run_ctx.outcomes),
                "notes": run_ctx.notes,
            },
            "messages_tail": _serialize_messages_tail(messages_tail),
            "action": action,
            "result": result,
            "inventory_delta": inventory_delta,
        })
        # Also append a one-line human-readable trace to the thinking log,
        # so a person can `tail -f run_*.thinking.txt` and watch what
        # Claude is doing in real time without parsing JSONL.
        self._thinking_line(task, turn, action, result, inventory_delta)

    def _thinking_line(
        self,
        task: str,
        turn: int,
        action: dict,
        result: dict,
        inventory_delta: dict[str, int],
    ) -> None:
        if self.thinking_fh is None:
            return
        try:
            args = action.get("args") or {}
            args_str = ", ".join(f"{k}={v!r}" for k, v in args.items())
            reasoning = (action.get("reasoning") or "").strip()
            ok = result.get("ok")
            if ok:
                outcome = "ok"
                extras = {k: v for k, v in result.items() if k != "ok"}
                if extras:
                    outcome += f" {extras}"
            else:
                outcome = f"error: {result.get('error', '?')}"
            delta_parts = []
            for k in sorted(inventory_delta or {}):
                v = inventory_delta[k]
                delta_parts.append(f"{'+' if v >= 0 else ''}{v} {k}")
            delta_str = ("  inv: " + ", ".join(delta_parts)) if delta_parts else ""
            line = f"[{task}][{turn:>2}] {action.get('name','?')}({args_str})  →  {outcome}{delta_str}\n"
            self.thinking_fh.write(line)
            if reasoning:
                self.thinking_fh.write(f"            ↑ {reasoning}\n")
        except Exception as e:
            try:
                self.thinking_fh.write(f"[thinking-write-error] {e}\n")
            except Exception:
                pass

    def thinking_note(self, line: str) -> None:
        """Free-form line for the thinking log only — task boundaries, notes, etc."""
        if self.thinking_fh is None:
            return
        try:
            self.thinking_fh.write(line.rstrip() + "\n")
        except Exception:
            pass

    def task_end(self, task: str, result: Any, notes_before: str) -> None:
        self._write({
            "event": "task_end",
            "ts": _now(),
            "task": task,
            "ok": bool(getattr(result, "ok", False)),
            "turns": int(getattr(result, "turns", 0)),
            "summary": getattr(result, "summary", ""),
            "notes_before": notes_before,
        })

    def task_notes_after(self, task: str, notes: str) -> None:
        self._write({
            "event": "task_notes_after",
            "ts": _now(),
            "task": task,
            "notes": notes,
        })

    def run_end(self, result: Any) -> None:
        self._write({
            "event": "run_end",
            "ts": _now(),
            "reached": getattr(result, "reached", None),
            "failed_at": getattr(result, "failed_at", None),
            "reason": getattr(result, "reason", ""),
            "wall_time_s": round(_now() - self.started_at, 2),
            "total_turns": self.total_turns,
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
            "total_tokens": self.total_input_tokens + self.total_output_tokens,
        })

    def close(self) -> None:
        for h in (self.fh, self.thinking_fh):
            try:
                if h is not None:
                    h.flush()
                    h.close()
            except Exception:
                pass
