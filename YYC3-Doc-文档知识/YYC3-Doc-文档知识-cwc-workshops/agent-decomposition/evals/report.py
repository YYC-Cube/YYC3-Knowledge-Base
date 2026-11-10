# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
"""Single-file HTML eval report — hero numbers + 12-cell grid + transcript modals."""
from __future__ import annotations
import html
import json
from pathlib import Path

COLOR = {"pass": "#2e7d32", "fail": "#c62828", "pass-slow": "#f9a825"}


def _score(results: list[dict]) -> float:
    p = sum(1 for r in results if r["status"] == "pass")
    s = sum(1 for r in results if r["status"] == "pass-slow")
    return (p + 0.5 * s) / max(len(results), 1)


def _cell(r: dict, agent: str) -> str:
    border = "border:2px dashed #999;" if r["id"].startswith("F") else "border:1px solid #ddd;"
    why = html.escape(r.get("why", ""))
    return f"""
    <div class="cell" style="{border}" onclick="show('{agent}-{r['id']}')">
      <div class="dot" style="background:{COLOR[r['status']]}"></div>
      <div class="cid">{r['id']}</div>
      <div class="cname">{html.escape(r['name'])}</div>
      <div class="cmeta">{r['turns']}t · {r['tokens']//1000}k</div>
      <div class="cwhy">{why}</div>
    </div>"""


def _modal(r: dict, agent: str) -> str:
    transcript = json.dumps(r.get("transcript", []), indent=2)
    final = html.escape(r.get("final_text", ""))
    actions = json.dumps(r.get("actions", []), indent=2)
    return f"""
    <div class="modal" id="{agent}-{r['id']}">
      <div class="modal-inner">
        <span class="close" onclick="hide('{agent}-{r['id']}')">×</span>
        <h3>{r['id']} · {html.escape(r['name'])} · <span style="color:{COLOR[r['status']]}">{r['status'].upper()}</span></h3>
        <p><b>Why:</b> {html.escape(r.get('why') or '—')}</p>
        <p><b>Turns:</b> {r['turns']} · <b>Tokens:</b> {r['tokens']:,} · <b>Wall:</b> {r['wall_ms']/1000:.1f}s</p>
        <h4>Final response</h4><pre>{final}</pre>
        <h4>Actions</h4><pre>{html.escape(actions)}</pre>
        <details><summary>Transcript ({len(r.get('transcript', []))} msgs)</summary><pre>{html.escape(transcript)}</pre></details>
      </div>
    </div>"""


def write_html(before: list[dict], after: list[dict] | None, path: Path) -> None:
    sb = _score(before)
    tb = sum(r["tokens"] for r in before)
    if after:
        sa = _score(after)
        ta = sum(r["tokens"] for r in after)
        hero = f"""
        <div class="hero">
          <div><div class="num">{sb:.0%}</div><div class="lbl">before</div></div>
          <div class="arrow">→</div>
          <div><div class="num">{sa:.0%}</div><div class="lbl">after</div></div>
          <div class="tokbar"><div>tokens {tb//1000}k → {ta//1000}k ({(ta-tb)/tb:+.0%})</div></div>
        </div>"""
        grids = f"""
        <h2>before</h2><div class="grid">{''.join(_cell(r, 'b') for r in before)}</div>
        <h2>after</h2><div class="grid">{''.join(_cell(r, 'a') for r in after)}</div>"""
        modals = "".join(_modal(r, "b") for r in before) + "".join(_modal(r, "a") for r in after)
    else:
        hero = f'<div class="hero"><div><div class="num">{sb:.0%}</div><div class="lbl">score</div></div></div>'
        grids = f'<div class="grid">{"".join(_cell(r, "b") for r in before)}</div>'
        modals = "".join(_modal(r, "b") for r in before)

    doc = f"""<!doctype html><html><head><meta charset="utf-8">
<title>StockPilot evals</title>
<style>
  body {{ font-family: -apple-system, system-ui, sans-serif; max-width: 1100px; margin: 40px auto; color: #222; }}
  .hero {{ display: flex; align-items: center; gap: 40px; margin: 30px 0 50px; }}
  .num {{ font-size: 72px; font-weight: 600; }}
  .lbl {{ font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #888; }}
  .arrow {{ font-size: 40px; color: #888; }}
  .tokbar {{ margin-left: auto; font-size: 18px; color: #555; }}
  .grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 40px; }}
  .cell {{ padding: 14px; border-radius: 8px; cursor: pointer; position: relative; min-height: 90px; }}
  .cell:hover {{ background: #fafafa; }}
  .dot {{ width: 14px; height: 14px; border-radius: 50%; position: absolute; top: 14px; right: 14px; }}
  .cid {{ font-weight: 600; font-size: 13px; color: #666; }}
  .cname {{ font-size: 15px; margin: 4px 0; }}
  .cmeta {{ font-size: 12px; color: #999; }}
  .cwhy {{ font-size: 12px; color: #c62828; margin-top: 6px; }}
  .modal {{ display: none; position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 10; }}
  .modal-inner {{ background: #fff; max-width: 800px; margin: 60px auto; padding: 30px; border-radius: 10px; max-height: 80vh; overflow: auto; }}
  .close {{ float: right; font-size: 28px; cursor: pointer; }}
  pre {{ background: #f5f5f5; padding: 12px; border-radius: 6px; overflow: auto; font-size: 12px; }}
  h2 {{ font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #888; }}
</style></head><body>
<h1>StockPilot evals</h1>
{hero}
{grids}
{modals}
<script>
  function show(id) {{ document.getElementById(id).style.display = 'block'; }}
  function hide(id) {{ document.getElementById(id).style.display = 'none'; }}
</script>
</body></html>"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(doc)
