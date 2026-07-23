# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Layer 3: Claude tool-use loop.

This is the workshop teaching artifact — read top to bottom.

Architecture:

  run(target)                — outer loop over MILESTONES (e.g. wooden_pickaxe,
                               stone_pickaxe, ...). Stops at the target.
  play_task(task)            — inner loop. Sends Claude one tool at a time
                               until the bot's inventory contains `task` or
                               we run out of turns.
  reflect(...)               — between tasks, ask Claude to rewrite its
                               strategy notes in ≤3 sentences. Notes carry
                               into the next task via RunContext.

Conversation reset between tasks: each task is a fresh `messages` list. The
only thing that carries across tasks is the RunContext block (notes +
recent outcomes), re-rendered at the top of the new task's first user
message.

Loop guard: if Claude calls the same action with the same args and that
action fails 3 times in a row, we stop the task and surface the loop. This
catches prompt/tool-description bugs cheaply.

CLI:
    python -m harness.agent --target wooden_pickaxe
    python -m harness.agent --target stone_pickaxe --max-turns 30
"""

from __future__ import annotations

import argparse
import atexit
import json
import os
import signal
import subprocess
import sys
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Optional

import anthropic

from .client import BotError, GameState, MinecraftClient, DEFAULT_BASE_URL
from .leaderboard import CostTracker, set_meta as _set_lb_meta
from .prompts import REFLECTION_PROMPT, SYSTEM_PROMPT, RunContext, build_system_prompt, render_state, render_state_delta
from .tools import TOOLS

if TYPE_CHECKING:
    from .logging_ import RunLogger

# Per-process cost tracker for the workshop leaderboard. Reports
# tokens+turns to LEADERBOARD_URL/cost every 5 turns and on exit. No-op
# if LEADERBOARD_URL is unset, so local dev runs unchanged.
_cost = CostTracker()
atexit.register(_cost.final)


# Tech-tree milestones, in order. run() walks this list and stops at --target.
MILESTONES = [
    "wooden_pickaxe",
    "stone_pickaxe",
    "furnace",
    "iron_ingot",
    "iron_pickaxe",
    "diamond",
]

DEFAULT_MODEL = "claude-sonnet-4-5"
MAX_TOKENS = 1024


# ─── Result types ──────────────────────────────────────────────────────────
@dataclass
class TaskResult:
    ok: bool
    task: str
    turns: int
    summary: str  # one-line outcome shown back to Claude in the next task


@dataclass
class RunResult:
    reached: Optional[str]      # last milestone successfully completed
    failed_at: Optional[str]    # task that didn't finish (None on full success)
    reason: str
    task_results: list[TaskResult] = field(default_factory=list)


# ─── Helpers ────────────────────────────────────────────────────────────────
def summarize_facts(gs: GameState) -> dict:
    """Snapshot of the bot used by RunContext.facts. Plain dict for logging."""
    counts: dict[str, int] = {}
    for it in gs.inventory:
        counts[it.name] = counts.get(it.name, 0) + it.count
    return {
        "position": list(gs.position),
        "health": gs.health,
        "food": gs.food,
        "inventory": counts,
    }


def _strip_reasoning(args: dict) -> dict:
    """The `reasoning` field is for logs only; bot.js doesn't accept it."""
    return {k: v for k, v in args.items() if k != "reasoning"}


def _format_tool_result(result: dict) -> str:
    """Compact text for the tool_result content block."""
    if result.get("ok"):
        # Surface action-specific extras (collected count, crafted name, etc.)
        extras = {k: v for k, v in result.items() if k != "ok"}
        return "ok" + (f"  {extras}" if extras else "")
    return f"error: {result.get('error', 'unknown')}"


def _action_signature(name: str, args: dict) -> str:
    return name + ":" + json.dumps(args, sort_keys=True, default=str)


def _inventory_delta(before: GameState, after: GameState) -> dict[str, int]:
    """{item: delta_count}, only items that changed."""
    def _counts(gs: GameState) -> dict[str, int]:
        d: dict[str, int] = {}
        for it in gs.inventory:
            d[it.name] = d.get(it.name, 0) + it.count
        return d
    a, b = _counts(before), _counts(after)
    keys = set(a) | set(b)
    return {k: b.get(k, 0) - a.get(k, 0) for k in keys if b.get(k, 0) - a.get(k, 0) != 0}


# ─── Inner loop: one task ───────────────────────────────────────────────────
def play_task(
    client: MinecraftClient,
    anthropic_client: anthropic.Anthropic,
    task: str,
    run_ctx: RunContext,
    max_turns: int,
    model: str = DEFAULT_MODEL,
    logger: "RunLogger | None" = None,
    system_prompt: str = SYSTEM_PROMPT,
) -> TaskResult:
    """Send Claude one turn at a time until the bot has `task` in its inventory.

    Counts only non-chat actions toward max_turns. Aborts if the same
    action+args fails 3 times in a row.

    A single Anthropic response can contain MULTIPLE tool_use blocks (this
    happens regularly in --narrate mode where Claude packages chat() plus
    the next action together). We execute every tool_use in order and
    bundle every corresponding tool_result into the next user message —
    the API is strict about every tool_use needing a matching tool_result
    in the very next user message.
    """
    messages: list[dict] = []
    pending_tool_results: list[dict] = []   # carries from last assistant response
    fail_signature: Optional[str] = None
    fail_streak = 0
    productive_turns = 0       # non-chat tool calls
    chat_turns = 0

    print(f"\n=== TASK: obtain {task} (max {max_turns} productive turns) ===")

    while productive_turns < max_turns:
        # Refresh state. wait_until_idle is also our nudge that any prior
        # action has fully settled before we read inventory.
        gs = client.wait_until_idle()
        run_ctx.facts = summarize_facts(gs)

        if gs.has(task):
            summary = f"reached {task} in {productive_turns} turn(s) ({chat_turns} chat)"
            print(f"  ✓ {summary}")
            return TaskResult(ok=True, task=task, turns=productive_turns, summary=summary)

        # Build the user message for this turn.
        if not pending_tool_results:
            content = render_state(gs, run_ctx, task)
        else:
            # All pending tool_results in order, then a compact state delta.
            # Anthropic API requires every tool_use to have a tool_result in
            # the very next user message; we bundle them all together.
            content = list(pending_tool_results) + [
                {"type": "text", "text": render_state_delta(gs, task)},
            ]
            pending_tool_results = []
        messages.append({"role": "user", "content": content})

        # Ask Claude.
        resp = anthropic_client.messages.create(
            model=model,
            system=system_prompt,
            tools=TOOLS,
            messages=messages,
            max_tokens=MAX_TOKENS,
        )
        _cost.note_usage(resp.usage)
        if logger is not None:
            logger.note_usage(resp.usage)
        messages.append({"role": "assistant", "content": resp.content})

        # Collect ALL tool_use blocks. Claude often emits multiple in one
        # response — especially in --narrate mode, where it packages chat()
        # with the next action.
        tool_uses = [b for b in resp.content if b.type == "tool_use"]
        if not tool_uses:
            # Claude refused/forgot to call a tool. Nudge and retry.
            text_blocks = [b.text for b in resp.content if hasattr(b, "text")]
            print(f"  no tool call (text: {text_blocks!r}). Nudging.")
            if logger is not None:
                logger.turn(
                    task=task,
                    turn=productive_turns,
                    state=gs.raw,
                    run_ctx=run_ctx,
                    messages_tail=messages[-2:],
                    action={"name": "(no tool)", "args": {}, "reasoning": " ".join(text_blocks)[:500]},
                    result={"ok": False, "error": "no tool_use block; nudged"},
                    inventory_delta={},
                )
            messages.append({"role": "user", "content": "You must call exactly one tool. Pick the next action."})
            continue

        # Execute each tool_use in order. Track delta against the snapshot
        # we took at the top of the iteration; refresh between tool calls
        # so consecutive actions in the same response see fresh state.
        loop_aborted = False
        running_pre_state = gs
        for tu in tool_uses:
            args_with_reasoning = dict(tu.input)
            reasoning = args_with_reasoning.get("reasoning", "")
            args = _strip_reasoning(args_with_reasoning)

            label = f"turn {productive_turns + 1:>2}"
            if tu.name == "chat":
                label = f"chat ({chat_turns + 1})"
            print(f"  [{label}] {tu.name}({args}){' — ' + reasoning if reasoning else ''}")

            try:
                result = client.act(tu.name, **args)
            except BotError as e:
                result = {"ok": False, "error": f"transport: {e}"}
            except Exception as e:
                result = {"ok": False, "error": f"harness: {e.__class__.__name__}: {e}"}

            # Compute delta + log BEFORE the loop guard so a final failing
            # turn still gets recorded.
            try:
                post_state = client.state()
            except Exception as e:
                post_state = running_pre_state  # bot dead; reuse for delta = {}
            inv_delta = _inventory_delta(running_pre_state, post_state)

            if logger is not None:
                logger.turn(
                    task=task,
                    turn=productive_turns + (0 if tu.name == "chat" else 1),
                    state=post_state.raw,
                    run_ctx=run_ctx,
                    messages_tail=messages[-2:],
                    action={"name": tu.name, "args": args, "reasoning": reasoning},
                    result=result,
                    inventory_delta=inv_delta,
                )

            # ALWAYS append the tool_result, even on failure or loop abort.
            # If we don't, the next API call will reject the conversation.
            pending_tool_results.append({
                "type": "tool_result",
                "tool_use_id": tu.id,
                "content": _format_tool_result(result),
            })

            print(f"      → {_format_tool_result(result)}")

            # Loop guard: same call failing repeatedly.
            sig = _action_signature(tu.name, args)
            if not result.get("ok"):
                if sig == fail_signature:
                    fail_streak += 1
                else:
                    fail_signature = sig
                    fail_streak = 1
                if fail_streak >= 3:
                    print(
                        f"\n  LOOP DETECTED: {tu.name}({args}) failed "
                        f"{fail_streak} times in a row. Last error: {result.get('error')}"
                    )
                    print("  Stopping task. This is likely a prompt or tool-description bug.")
                    loop_aborted = True
                    # Need to keep filling tool_results for any remaining
                    # tool_uses in this batch, otherwise the conversation
                    # is malformed if the caller resumes.
                    # But we're returning, so the malformed state is
                    # discarded.
                    break
            else:
                fail_signature = None
                fail_streak = 0

            if tu.name == "chat":
                chat_turns += 1
            else:
                productive_turns += 1
                _cost.tick()
                if productive_turns >= max_turns:
                    break

            running_pre_state = post_state

        if loop_aborted:
            return TaskResult(
                ok=False,
                task=task,
                turns=productive_turns,
                summary=f"looped on a failing action",
            )

    return TaskResult(
        ok=False,
        task=task,
        turns=productive_turns,
        summary=f"hit max_turns={max_turns} without reaching {task}",
    )


# ─── Reflection: rewrite notes between tasks ────────────────────────────────
def reflect(
    anthropic_client: anthropic.Anthropic,
    run_ctx: RunContext,
    result: TaskResult,
    model: str = DEFAULT_MODEL,
    logger: "RunLogger | None" = None,
    system_prompt: str = SYSTEM_PROMPT,
) -> str:
    """Ask Claude to rewrite its strategy notes after a task. Plain text reply,
    no tools — fast and cheap. On API failure, leave notes unchanged."""
    prompt = REFLECTION_PROMPT.format(
        outcome=result.summary,
        previous_notes=run_ctx.notes or "(none yet)",
    )
    try:
        resp = anthropic_client.messages.create(
            model=model,
            system=system_prompt,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
        )
        _cost.note_usage(resp.usage)
        if logger is not None:
            logger.note_usage(resp.usage)
        text = "".join(b.text for b in resp.content if hasattr(b, "text")).strip()
        return text or run_ctx.notes
    except Exception as e:
        print(f"  reflect failed: {e}; keeping previous notes")
        return run_ctx.notes


# ─── Outer loop: walk the milestones ───────────────────────────────────────
def run(
    client: MinecraftClient,
    anthropic_client: anthropic.Anthropic,
    target_milestone: str = "wooden_pickaxe",
    max_turns_per_task: int = 25,
    model: str = DEFAULT_MODEL,
    logger: "RunLogger | None" = None,
    narrate: bool = False,
) -> RunResult:
    if target_milestone not in MILESTONES:
        raise ValueError(f"target_milestone must be one of {MILESTONES}, got {target_milestone!r}")

    system_prompt = build_system_prompt(narrate=narrate)
    run_ctx = RunContext(facts={}, outcomes=[])
    last_ok: Optional[str] = None
    task_results: list[TaskResult] = []

    for task in MILESTONES:
        if logger is not None:
            logger.thinking_note(f"\n── task: {task} ──")
        result = play_task(
            client, anthropic_client, task, run_ctx, max_turns_per_task,
            model=model, logger=logger, system_prompt=system_prompt,
        )
        task_results.append(result)
        run_ctx.outcomes.append(f"{task}: {result.summary}")
        run_ctx.outcomes = run_ctx.outcomes[-5:]

        if logger is not None:
            logger.task_end(task, result, run_ctx.notes)
            logger.thinking_note(f"  {'✓' if result.ok else '✗'} {result.summary}")

        if not result.ok:
            return RunResult(
                reached=last_ok,
                failed_at=task,
                reason=result.summary,
                task_results=task_results,
            )

        last_ok = task
        run_ctx.notes = reflect(
            anthropic_client, run_ctx, result, model=model, logger=logger,
            system_prompt=system_prompt,
        )
        print(f"  notes after {task}: {run_ctx.notes}")
        if logger is not None:
            logger.task_notes_after(task, run_ctx.notes)
            logger.thinking_note(f"  notes: {run_ctx.notes}")

        if task == target_milestone:
            return RunResult(reached=task, failed_at=None, reason="target reached", task_results=task_results)

    return RunResult(reached=last_ok, failed_at=None, reason="all milestones complete", task_results=task_results)


# ─── CLI ────────────────────────────────────────────────────────────────────
def _kill_orphan_bot_actions(base_url: str) -> None:
    """If the agent crashed mid-action, the bot keeps pathfinding/mining
    forever. Best-effort: send the bot a cheap chat() to wake it (no-op
    if already idle), then leave it alone — we don't kill the bot here
    because in standalone mode the user might want to inspect it."""
    try:
        import os
        cmd = ["curl", "-s", "-XPOST", f"{base_url.rstrip('/')}/action",
               "-H", "content-type: application/json"]
        tok = os.environ.get("BOT_TOKEN", "")
        if tok:
            cmd += ["-H", f"authorization: Bearer {tok}"]
        cmd += ["-d", '{"name":"chat","args":{"text":"agent finished"}}']
        subprocess.run(cmd, timeout=5, check=False, capture_output=True)
    except Exception:
        pass


def main() -> int:
    ap = argparse.ArgumentParser(description="Layer 3: Claude plays Minecraft via tool use")
    ap.add_argument("--target", default="wooden_pickaxe", choices=MILESTONES)
    ap.add_argument("--max-turns", type=int, default=25, help="max productive turns per task")
    ap.add_argument("--base-url", default=DEFAULT_BASE_URL)
    ap.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Anthropic model name. Default: {DEFAULT_MODEL}. Try claude-opus-4-5 for the closer.",
    )
    ap.add_argument(
        "--log-dir",
        default=None,
        help="Write a JSONL trace to <log-dir>/run_<ts>.jsonl. Default: no logging.",
    )
    ap.add_argument(
        "--narrate",
        action="store_true",
        help="Demo mode: bias Claude to chat() a one-line plan before each action.",
    )
    args = ap.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY is not set", file=sys.stderr)
        return 2

    # Make sure SIGTERM/SIGINT exit cleanly so the orphan-cleanup helper
    # below has a chance to run.
    def _signal_exit(signum, frame):
        print(f"\n[agent] received signal {signum}, exiting", file=sys.stderr)
        sys.exit(130)
    signal.signal(signal.SIGTERM, _signal_exit)
    signal.signal(signal.SIGINT, _signal_exit)
    atexit.register(_kill_orphan_bot_actions, args.base_url)

    client = MinecraftClient(base_url=args.base_url)
    # max_retries bumped from the SDK default (2): workshop participants
    # share an org rate limit, and a transient 429 should back off and
    # recover, not crash the run mid-task.
    anthropic_client = anthropic.Anthropic(api_key=api_key, max_retries=10)
    _set_lb_meta(model=args.model)

    logger = None
    if args.log_dir:
        from .logging_ import RunLogger
        logger = RunLogger.open(args.log_dir, target=args.target, model=args.model)

    print(f"target={args.target} max_turns_per_task={args.max_turns} base={args.base_url} model={args.model} narrate={args.narrate}")
    if logger:
        print(f"logging to {logger.path}")
        print(f"thinking log: {logger.thinking_path}")
    result = run(
        client,
        anthropic_client,
        target_milestone=args.target,
        max_turns_per_task=args.max_turns,
        model=args.model,
        logger=logger,
        narrate=args.narrate,
    )
    if logger is not None:
        logger.run_end(result)
        logger.close()

    print("\n=== RUN RESULT ===")
    print(f"reached:    {result.reached}")
    print(f"failed_at:  {result.failed_at}")
    print(f"reason:     {result.reason}")
    print("per-task:")
    for tr in result.task_results:
        marker = "✓" if tr.ok else "✗"
        print(f"  {marker} {tr.task:<16} {tr.turns:>2} turns — {tr.summary}")

    if result.failed_at:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
