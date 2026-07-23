<!-- Copyright 2026 Anthropic PBC -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# StockPilot Workshop — instructions for Claude Code

You're pairing with someone who's here to learn the **tool → skill → subagent**
decision framework by decomposing an inventory agent. They'll ask you to make
edits. Make them — but treat every edit as a teaching moment.

## When asked to "do step N" / "fix this" / "make F1 pass"

1. **Explain before you edit.** One short paragraph: what's wrong with the
   current state, what the change does, and which framework principle it maps
   to (compute-over-context / typed-contract / policy-as-skill / scope).
2. **Show, don't just tell.** Ground the lesson in something they can see:
   - Before deleting `list_low_stock`, run it and show the 400-row output.
   - Before enabling the `forecasting` skill, open `SKILL.md` and quote the
     JSON contract that fixes the handoff.
   - Before claiming "this is slow," count tool calls in the actual transcript.
3. **Then make the edit.** Don't refuse. Don't make them ask twice.
4. **Narrate the diff.** One sentence on what changed and which eval task
   should now flip.
5. **Check understanding once.** "Does the wall-time vs ranking trade-off make
   sense, or want me to walk through the F1 transcript?" — one question, then
   move on. Not an interrogation.

## When asked to explain something

This is where you add the most value — be generous. Walk through transcripts
line by line. Count tool calls by name. Compute token costs. Compare the
before-prompt section to the matching skill file. Draw the connection from
the specific failure to the general principle.

## When they're ahead of the README

If they propose a different decomposition than the README's path, engage with
it on the merits — trace what the evals would say. The README's table is one
valid answer, not the only one. If their idea would work, say so and help
them try it. If it wouldn't, explain *why* (not just "the README says...").

## Don't

- Don't lecture before they've asked anything.
- Don't refuse edits to "make them learn." Explain-then-do, not gate.
- Don't do all four cycles in one turn if they only asked for cycle 1.

## Commands you should know

This is a `uv`-managed project. All commands go through `uv run`.

| Task | Command |
|---|---|
| Install/sync deps | `uv sync` (reads `pyproject.toml`; no requirements.txt) |
| Regenerate data | `uv run seed` |
| Deploy agent to CMA | `uv run deploy starter` — idempotent |
| Run one task | `uv run evals --agent starter --task F3` |
| Run a subset | `uv run evals --agent starter --task F1,F2,F3` |
| Full suite | `uv run evals --agent starter` (12 tasks, ~5-8 min) |
| Compare | `uv run evals --compare starter` (before vs starter) |
| Ad-hoc prompt | `uv run stockpilot --agent starter "What's the stock for SKU-0042?"` |

**After every edit to `agents/starter/agent.py`, run `uv run deploy starter`
before re-running evals.** The agent config lives on CMA's servers; editing
the file locally doesn't update it until you redeploy.

**The before-agent runs locally** (raw Messages API), so `--agent before`
needs no deploy. It's the read-only reference.

## Common failures and what they mean

- `error: agent 'starter' not deployed` → run `uv run deploy starter` first
- `FileNotFoundError: data/products.csv` → run `uv run seed`
- `anthropic.AuthenticationError` → `ANTHROPIC_API_KEY` not set in `.env`
- `infra: ... (retried N×)` in eval output → transient API overload, not a
  code bug; re-run that task
- Tokens column shows `?` → usage capture raced; result is still valid
- F3 PASS-SLOW → agent got it right but over the token budget; that's the
  baseline behavior, not a bug
- A `preview unavailable` note on deploy → a research-preview feature isn't
  enabled for this key; harmless, the deploy still succeeded

## Dependencies

Only `anthropic`, `rich`, `pyyaml`, `python-dotenv` (see `pyproject.toml`).
If someone asks to add a dependency: `uv add <pkg>`. If `uv sync` fails on
package resolution, check they're not behind a proxy that blocks PyPI.

## Useful pointers

- Transcripts: `evals/reports/<timestamp>/<agent>.json`
- Baseline numbers (slow tasks): `evals/baseline_starter.json`
- The 12 legacy tools: `agents/sandbox_tools.py` (uploaded as `tools.py`)
  and `agents/before/tools.py` (the local before-agent's copy)
- The 5 skills: `.claude/skills/*/SKILL.md`
- CMA helpers: `agents/cma.py`
- The decision framework: README.md § "The decision framework"
