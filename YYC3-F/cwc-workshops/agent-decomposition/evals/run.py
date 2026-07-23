# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
"""StockPilot eval CLI — self-contained"""
from __future__ import annotations
import argparse
import asyncio
import json
import sys
import time
from collections import Counter
from pathlib import Path

import yaml
from rich.console import Console
from rich.table import Table

from agents.common import run_agent, MODEL
from evals.graders import grade, PASS, FAIL, SLOW

HERE = Path(__file__).parent
console = Console()

DOT = {PASS: "[green]●[/] PASS", FAIL: "[red]○[/] FAIL", SLOW: "[yellow]◐[/] PASS-SLOW"}
DELTA = {(FAIL, PASS): "[green]→PASS[/]", (FAIL, SLOW): "[green]→PASS-SLOW[/]",
         (SLOW, PASS): "[green]→PASS[/]", (PASS, FAIL): "[red]→FAIL[/]",
         (SLOW, FAIL): "[red]→FAIL[/]", (PASS, SLOW): "[yellow]→SLOW[/]"}


def load_tasks(task_filter: str | None = None) -> list[dict]:
    tasks = yaml.safe_load((HERE / "tasks.yaml").read_text())["tasks"]
    if task_filter:
        ids = set(task_filter.split(","))
        tasks = [t for t in tasks if t["id"] in ids]
    return tasks


def score(results: list[dict]) -> float:
    c = Counter(r["status"] for r in results)
    return (c[PASS] + 0.5 * c[SLOW]) / max(len(results), 1)


def ref_range(agent: str) -> tuple[float, float] | None:
    path = HERE / "reference_scores.json"
    if not path.exists():
        return None
    data = json.loads(path.read_text())
    runs = data.get(agent, [])
    return (min(runs), max(runs)) if runs else None


async def run_one(agent: str, task: dict, sem: asyncio.Semaphore) -> dict:
    async with sem:
        try:
            result = await asyncio.to_thread(run_agent, agent, task["prompt"])
        except Exception as e:  # noqa: BLE001
            from agents.common import AgentResult
            result = AgentResult(final_text="", error=str(e))
        status, why = grade(task, result)
        print(f"  {task['id']}: {status:9s} {result.turns:2d}tn {result.total_tokens:6d}tk {result.wall_ms/1000:5.1f}s  {why[:60]}", file=sys.stderr, flush=True)
        return {
            "id": task["id"], "name": task["name"], "status": status, "why": why,
            "turns": result.turns, "tokens": result.total_tokens,
            "tokens_out": result.tokens_out, "wall_ms": result.wall_ms,
            "transcript": result.transcript, "actions": result.actions,
            "final_text": result.final_text,
        }


async def run_suite(agent: str, tasks: list[dict], trials: int, parallel: int) -> list[dict]:
    sem = asyncio.Semaphore(parallel)
    if trials == 1:
        return await asyncio.gather(*(run_one(agent, t, sem) for t in tasks))
    # majority vote across trials
    out = []
    for t in tasks:
        runs = await asyncio.gather(*(run_one(agent, t, sem) for _ in range(trials)))
        vote = Counter(r["status"] for r in runs).most_common(1)[0][0]
        pick = next(r for r in runs if r["status"] == vote)
        pick["trials"] = trials
        out.append(pick)
    return out


def render_single(agent: str, results: list[dict], wall_s: float) -> None:
    table = Table(show_edge=False, box=None, padding=(0, 2))
    for col in ("ID", "Task", "Result", "Turns", "Tokens", "Time", "Why"):
        table.add_column(col, justify="right" if col in ("Turns", "Tokens", "Time") else "left")
    for r in results:
        tk = r["tokens"]
        table.add_row(
            r["id"], r["name"], DOT[r["status"]],
            str(r["turns"]), ("     ?" if tk < 0 else f"{tk:>6,}"),
            f"{r['wall_ms']/1000:>5.1f}s",
            f"[dim]{r['why']}[/]" if r["why"] else "",
        )
    c = Counter(r["status"] for r in results)
    s = score(results)
    tok = sum(r["tokens"] for r in results if r["tokens"] > 0)
    cost = tok / 1e6 * 9  # rough blended $/MTok
    rr = ref_range(agent)
    rr_txt = ""
    if rr:
        if s < rr[0]:
            mark = "[yellow]⚠ below range[/]"
        elif s > rr[1] and agent in ("starter", "before"):
            mark = "[green]↑ above baseline[/]"
        else:
            mark = "[green]✓ in range[/]"
        rr_txt = f"ref range: {agent} {rr[0]:.0%}–{rr[1]:.0%}  {mark}"

    console.print(f"\n  [bold]StockPilot evals[/] · agent=[cyan]{agent}[/] · model={MODEL} · {results[0].get('trials', 1)} trial\n")
    console.print(table)
    console.print("  " + "─" * 90)
    console.print(f"  {c[PASS]}/{len(results)} correct · {c[SLOW]} over-budget · [bold]{s:.0%} score[/]          {rr_txt}")
    console.print(f"  {tok/1000:.1f}k tokens · {wall_s:.0f}s wall                          cost ≈ ${cost:.2f}\n")


def render_compare(before: list[dict], after: list[dict], wall_s: float) -> None:
    by_id = {r["id"]: r for r in after}
    table = Table(show_edge=False, box=None, padding=(0, 2))
    for col in ("ID", "Task", "Before", "After", "Δ", "Tok B→A"):
        table.add_column(col)
    for b in before:
        a = by_id[b["id"]]
        d = DELTA.get((b["status"], a["status"]), "[dim]=[/]")
        table.add_row(b["id"], b["name"], DOT[b["status"]], DOT[a["status"]], d,
                      f"[dim]{b['tokens']:,}→{a['tokens']:,}[/]")
    sb, sa = score(before), score(after)
    tb, ta = sum(r["tokens"] for r in before), sum(r["tokens"] for r in after)
    console.print(f"\n  [bold]StockPilot evals — compare[/] · model={MODEL}\n")
    console.print(table)
    console.print("  " + "─" * 90)
    console.print(f"  before [bold]{sb:.0%}[/] → after [bold]{sa:.0%}[/]   ·   tokens {tb/1000:.0f}k → {ta/1000:.0f}k ({(ta-tb)/tb:+.0%})   ·   {wall_s:.0f}s\n")


def save_results(run_id: str, agent: str, results: list[dict]) -> Path:
    out = HERE / "reports" / run_id
    out.mkdir(parents=True, exist_ok=True)
    path = out / f"{agent}.json"
    path.write_text(json.dumps({"agent": agent, "score": score(results), "results": results}, indent=2, default=str))
    return path


def main() -> None:
    p = argparse.ArgumentParser(prog="evals")
    p.add_argument("--agent", choices=["before", "starter"], default="starter")
    p.add_argument("--task", help="comma-separated task IDs (e.g. F1,F2)")
    p.add_argument("--compare", nargs="?", const="starter", default=None,
                   help="run before vs AGENT (default: starter) and show delta")
    p.add_argument("--trials", type=int, default=1)
    p.add_argument("--parallel", type=int, default=4)
    p.add_argument("--html", action="store_true")
    args = p.parse_args()

    tasks = load_tasks(args.task)
    if not tasks:
        print(f"No tasks match {args.task!r}")
        return
    run_id = time.strftime("%Y%m%d-%H%M%S")
    t0 = time.time()

    if args.compare:
        a, b = ("before", args.compare)
        before = asyncio.run(run_suite(a, tasks, args.trials, args.parallel))
        after = asyncio.run(run_suite(b, tasks, args.trials, args.parallel))
        render_compare(before, after, time.time() - t0)
        save_results(run_id, "before", before)
        save_results(run_id, "after", after)
        if args.html:
            from evals.report import write_html
            write_html(before, after, HERE / "reports" / run_id / "compare.html")
            console.print(f"  → evals/reports/{run_id}/compare.html\n")
    else:
        results = asyncio.run(run_suite(args.agent, tasks, args.trials, args.parallel))
        render_single(args.agent, results, time.time() - t0)
        save_results(run_id, args.agent, results)
        if args.html:
            from evals.report import write_html
            write_html(results, None, HERE / "reports" / run_id / "compare.html")


if __name__ == "__main__":
    main()
