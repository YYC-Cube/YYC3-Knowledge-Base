# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Pretty-print a run JSONL.

CLI:
    python -m harness.replay logs/run_xxx.jsonl
    python -m harness.replay logs/run_xxx.jsonl --task stone_pickaxe
    python -m harness.replay logs/run_xxx.jsonl --grep mine_block
    python -m harness.replay logs/run_xxx.jsonl --grep "no oak_log"

Output is plain text — no rich/textual dependency, runs in any terminal.
Tolerant of missing fields so logs from older agent.py revisions still
read cleanly.

Filters:
  --task NAME   show only events for one task
  --grep NEEDLE show only turns whose action name OR error string
                contains NEEDLE (substring match, case-insensitive)
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any, Iterator, Optional


def _iter_events(path: str) -> Iterator[dict]:
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as e:
                print(f"  [bad line] {e}: {line[:120]}", file=sys.stderr)


def _format_inv_delta(delta: dict[str, int]) -> str:
    if not delta:
        return ""
    parts = []
    for k in sorted(delta):
        v = delta[k]
        parts.append(f"{'+' if v >= 0 else ''}{v} {k}")
    return "inv: " + ", ".join(parts)


def _format_action(action: dict) -> str:
    name = action.get("name", "?")
    args = action.get("args") or {}
    args_str = ", ".join(f"{k}={v!r}" for k, v in args.items())
    return f"{name}({args_str})"


def _format_result(result: dict) -> str:
    if result.get("ok"):
        return "ok"
    return f"error: {result.get('error', '?')}"


def _matches_grep(turn: dict, grep: str) -> bool:
    needle = grep.lower()
    action = turn.get("action") or {}
    result = turn.get("result") or {}
    haystack = " ".join([
        str(action.get("name", "")),
        str(action.get("args", "")),
        str(action.get("reasoning", "")),
        str(result.get("error", "")),
    ]).lower()
    return needle in haystack


def replay(path: str, *, task_filter: Optional[str] = None, grep: Optional[str] = None) -> int:
    current_task: Optional[str] = None
    current_task_printed_header = False
    any_output = False
    run_start: dict = {}

    for ev in _iter_events(path):
        etype = ev.get("event")

        if etype == "run_start":
            run_start = ev
            print(f"== run: target={ev.get('target')} model={ev.get('model')} ==")
            any_output = True
            continue

        if etype == "turn":
            task = ev.get("task")
            if task_filter and task != task_filter:
                continue
            if grep and not _matches_grep(ev, grep):
                continue

            if task != current_task:
                current_task = task
                current_task_printed_header = False

            if not current_task_printed_header:
                print(f"\n── task: {task} ──")
                current_task_printed_header = True

            turn_n = ev.get("turn", "?")
            action = ev.get("action") or {}
            result = ev.get("result") or {}
            inv_delta = ev.get("inventory_delta") or {}
            reasoning = action.get("reasoning") or ""

            line1 = f"  [{turn_n:>2}] {_format_action(action):<40} {_format_result(result)}"
            inv_str = _format_inv_delta(inv_delta)
            if inv_str:
                line1 += f"   {inv_str}"
            print(line1)
            if reasoning:
                print(f"       \"{reasoning}\"")
            any_output = True
            continue

        if etype == "task_end":
            task = ev.get("task")
            if task_filter and task != task_filter:
                continue
            mark = "✓" if ev.get("ok") else "✗"
            print(f"  {mark} {ev.get('turns')} turns — {ev.get('summary', '')}")
            any_output = True
            continue

        if etype == "task_notes_after":
            task = ev.get("task")
            if task_filter and task != task_filter:
                continue
            notes = (ev.get("notes") or "").strip()
            if notes:
                print(f"  notes after: \"{notes}\"")
            any_output = True
            continue

        if etype == "run_end":
            if task_filter or grep:
                # Don't print the global summary in filtered mode — it's
                # not about the filtered subset.
                continue
            print("\n== run end ==")
            print(f"  reached:    {ev.get('reached')}")
            print(f"  failed_at:  {ev.get('failed_at')}")
            print(f"  reason:     {ev.get('reason')}")
            print(f"  wall time:  {ev.get('wall_time_s')}s")
            print(f"  total turns: {ev.get('total_turns')}")
            print(
                f"  total tokens: {ev.get('total_tokens')} "
                f"(in={ev.get('total_input_tokens')} out={ev.get('total_output_tokens')})"
            )
            any_output = True
            continue

    if not any_output:
        print("(no events matched filter)")
        return 1
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Pretty-print a run JSONL")
    ap.add_argument("path", help="path to logs/run_*.jsonl")
    ap.add_argument("--task", default=None, help="filter to one task name")
    ap.add_argument("--grep", default=None, help="substring match on action name / args / error")
    args = ap.parse_args()
    return replay(args.path, task_filter=args.task, grep=args.grep)


if __name__ == "__main__":
    sys.exit(main())
