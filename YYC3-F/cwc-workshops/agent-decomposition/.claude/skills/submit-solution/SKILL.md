---
name: submit-solution
description: Guide a workshop attendee through committing their starter-agent decomposition and opening a PR with their solution + workshop feedback. Invoke when the user says "submit", "I'm done", "open a PR", or asks how to share their solution.
---
<!-- Copyright 2026 Anthropic PBC -->
<!-- SPDX-License-Identifier: Apache-2.0 -->


# Submit your StockPilot solution

You're helping a workshop attendee package up their `agents/starter/agent.py`
decomposition and open a PR. The PR is how facilitators see what approaches
people took, and the description doubles as the workshop feedback form.

## Step 1 — Ask about their experience first

Before touching git, ask these three questions (use AskUserQuestion or just
conversational):

1. **Which subagent approach did you go with for cycle 3?**
   (callable_agents / spawn_subagent / inline / something else)
2. **What was the hardest part of the workshop?**
   (a specific cycle, a concept, the tooling, the timing)
3. **One thing you'd change about it?**

Hold onto their answers — they go in the PR body.

## Step 2 — Show them what they're submitting

```bash
git diff main -- agent-decomposition/agents/starter/agent.py
```

Walk through the diff briefly: which tools they dropped, which skills they
enabled, which subagent approach they wired. If the diff is empty, they
haven't edited starter — ask if they worked in a different file.

Also grab their final eval score:

```bash
ls -t evals/reports/*/starter.json | head -1 | xargs cat | python -c "import json,sys; d=json.load(sys.stdin); print(f'{d[\"score\"]:.0%}')"
```

## Step 3 — Commit and push

```bash
git checkout -b solution/<their-name-or-handle>
git add agent-decomposition/agents/starter/agent.py
git commit -m "Workshop solution: <subagent approach>, <score>%"
git push -u origin solution/<their-name-or-handle>
```

Ask for their name/handle if you don't have it. If they don't have push
rights to `anthropics/cwc-workshops`, have them fork first
(`gh repo fork --clone=false`) and push to their fork.

## Step 4 — Open the PR with feedback in the body

```bash
gh pr create --title "Workshop solution — <name>" --body-file -
```

PR body template (fill from step 1 + step 2):

```markdown
## My decomposition

- Subagent approach: <callable_agents | spawn_subagent | inline | other>
- Final eval score: <NN>%
- Tools I dropped: <list>
- Skills I enabled: <list>

## Workshop feedback

**Hardest part:** <their answer>

**One thing I'd change:** <their answer>

**Anything else:** <free text — leave blank if nothing>
```

## Step 5 — Confirm

Give them the PR URL and thank them. Mention that facilitators read every
PR and the feedback directly shapes the next run of this workshop.

## Don't

- Don't open the PR before they've seen the diff and the body
- Don't skip the feedback questions to "save time" — that's the point
- Don't include `evals/reports/` or `.stockpilot_ids.json` in the commit
