---
name: learning-aggregator
description: "[Beta] Cross-session analysis of accumulated .learnings/ files. Reads all entries, groups by pattern_key, computes recurrence across sessions, and outputs ranked promotion candidates. This is the outer loop's inspect step — it turns raw learning data into actionable gap reports. Use on a regular cadence (weekly, before major tasks, or at session start for critical projects). Can be invoked manually or scheduled."
user-invocable: true
argument-hint: "[--since YYYY-MM-DD] [--min-recurrence N] [--area AREA]"
---

# Learning Aggregator

Reads accumulated `.learnings/` files across all sessions, finds patterns, and produces a ranked list of promotion candidates. This is the outer loop's **inspect** step.

Without this skill, `.learnings/` is a write-only log. Patterns accumulate but nobody synthesizes them. The same gap resurfaces two weeks later because no one looked.

## When to Use

- **Weekly cadence** — scheduled or manual, review accumulated learnings
- **Before major tasks** — check if the task area has known patterns
- **After a burst of sessions** — consolidate findings from a sprint or incident
- **When self-improvement flags `promotion_ready`** — verify the flag with full context

## What It Produces

A **gap report** — a ranked list of patterns that have crossed (or are approaching) the promotion threshold, with evidence and recommended actions.

## Step 1: Read All Learning Files

Read these files in `.learnings/`:

| File | Contains |
|------|----------|
| `LEARNINGS.md` | Corrections, knowledge gaps, best practices, recurring patterns |
| `ERRORS.md` | Command failures, API errors, exceptions |
| `FEATURE_REQUESTS.md` | Missing capabilities |

Parse each entry's metadata:
- `Pattern-Key` — the stable deduplication key
- `Recurrence-Count` — how many times this pattern has been seen
- `First-Seen` / `Last-Seen` — date range
- `Priority` — low / medium / high / critical
- `Status` — pending / promotion_ready / promoted / dismissed
- `Area` — frontend / backend / infra / tests / docs / config
- `Related Files` — which parts of the codebase are affected
- `Source` — conversation / error / user_feedback / simplify-and-harden
- `Tags` — free-form labels

## Step 2: Group and Aggregate

Group entries by `Pattern-Key`. For each group:

1. **Sum recurrences** across all entries with the same key
2. **Count distinct tasks** — how many different sessions/tasks encountered this
3. **Compute time window** — days between First-Seen and Last-Seen
4. **Collect all related files** — union of all entries' file references
5. **Take highest priority** across entries in the group
6. **Collect evidence** — the Summary and Details from each entry

For entries without a `Pattern-Key`, use conservative grouping only:
- **Exact match**: Same `Area` AND at least 2 identical `Tags`
- **File overlap**: Same `Related Files` path (exact path match, not substring)
- **Do NOT fuzzy-match** on Summary text — false groupings are worse than ungrouped entries

Flag ungrouped entries separately with a recommendation to assign a `Pattern-Key`. Ungrouped entries are common and expected — they may be one-off issues or genuinely novel problems.

## Step 3: Rank and Classify

### Promotion Threshold
An entry is **promotion-ready** when:
- `Recurrence-Count >= 3` across the group
- Seen in `>= 2 distinct tasks`
- Within a `30-day window`

### Approaching Threshold
An entry is **approaching** when:
- `Recurrence-Count >= 2` or
- `Priority: high/critical` with any recurrence

### Classification
For each promotion candidate, classify the gap type:

| Gap Type | Signal | Fix Target |
|----------|--------|------------|
| **Knowledge gap** | Agent didn't know X | Update CLAUDE.md or skill instructions |
| **Tool gap** | Agent improvised around missing capability | Add or update MCP tool / script |
| **Skill gap** | Same behavior pattern keeps failing | Create or update a skill (use `/skill-creator`, validate with `quick_validate.py`, register `skill-check` eval) |
| **Ambiguity** | Conflicting interpretations of spec/prompt | Tighten instructions or add examples |
| **Reasoning failure** | Agent had the knowledge but reasoned wrong | Add explicit decision rules or constraints |

## Step 4: Produce Gap Report

Output a structured report:

```markdown
## Learning Aggregator: Gap Report

**Scan date:** YYYY-MM-DD
**Period:** [since date] to [now]
**Entries scanned:** N
**Patterns found:** N
**Promotion-ready:** N
**Approaching threshold:** N

### Promotion-Ready Patterns

#### 1. [Pattern-Key] — [Summary]

- **Recurrence:** N times across M tasks
- **Window:** First-Seen → Last-Seen
- **Priority:** high
- **Gap type:** knowledge gap
- **Area:** backend
- **Related files:** path/to/file.ext
- **Evidence:**
  - [LRN-YYYYMMDD-001] Summary of first occurrence
  - [LRN-YYYYMMDD-002] Summary of second occurrence
  - [ERR-YYYYMMDD-001] Summary of related error
- **Recommended action:** Add rule to CLAUDE.md: "[concise prevention rule]"
- **Eval candidate:** Yes — [description of what to test]

#### 2. ...

### Approaching Threshold

#### 1. [Pattern-Key] — [Summary]
- **Recurrence:** 2 times across 1 task
- **Needs:** 1 more recurrence or 1 more distinct task
- ...

### Ungrouped Entries (no Pattern-Key)

- [LRN-YYYYMMDD-005] "Summary" — needs pattern_key assignment
- ...

### Dismissed / Stale

- Entries with Last-Seen > 90 days ago and Status: pending → recommend dismissal
```

## Step 5: Handoff

The gap report feeds into:

1. **harness-updater agent** — takes promotion-ready patterns and applies them to CLAUDE.md / AGENTS.md
2. **eval-creator skill** — takes eval candidates and creates permanent test cases
3. **Human review** — for patterns classified as "reasoning failure" or "ambiguity" (these need human judgment)

## Filtering

- `--since YYYY-MM-DD` — only scan entries after this date
- `--min-recurrence N` — raise the promotion threshold
- `--area AREA` — filter to a specific area (frontend, backend, etc.)
- `--deep` — also analyze session traces via Entire (see Session Trace Analysis below)

## Session Trace Analysis

Two-source outer loop: `.learnings/` (hot path, every session) + Entire session traces (cold path, cadenced).

| Source | What it captures | Cadence | Cost |
|--------|-----------------|---------|------|
| `.learnings/` | Claude's explicit self-reflections during sessions (what it noticed and logged) | Every session | Near-zero |
| Entire traces | Full session transcripts — prompts, tool calls, retries, corrections, token usage | Weekly or on-demand | Expensive |

The default mode reads `.learnings/` only. The `--deep` mode adds trace analysis and merges findings.

### Why both sources matter

`.learnings/` captures what Claude **chose to log** — a curated subset. Entire captures **everything that happened**. Patterns visible in traces but missed in `.learnings/`:

- **Retry loops** — same tool call repeated 3+ times with small variations
- **Silent user corrections** — user said "no, that's wrong" mid-flow, Claude corrected without logging
- **Worked-around failures** — test failed, Claude changed approach, original failure forgotten
- **Context handoff triggers** — which drift signals actually fired, not just that handoffs happened
- **Token/time anomalies** — disproportionate cost vs output

These are high-value because Claude can't self-report them — it doesn't know they're failures.

### When to trigger --deep

Trace analysis is cadenced, never per-session:

- **Weekly** (recommended minimum)
- **Post-incident** — investigate what actually happened
- **Pre-promotion** — verify a pattern really recurs in real sessions
- **Manual** — `/learning-aggregator --deep --since 7d`

Per-session reads would burn tokens without new signal. Cross-session patterns only emerge over multiple sessions.

### Reading traces with Entire

```bash
# Availability check
entire --version

# List checkpoints as JSON
entire rewind --list

# Read a checkpoint's transcript
entire explain --checkpoint <id> --full --no-pager

# Raw JSONL
entire explain --checkpoint <id> --raw-transcript --no-pager

# Filter by session
entire explain --session <session-id-prefix>
```

If `entire` is missing or the repo doesn't have Entire enabled, `--deep` falls back to `.learnings/`-only mode and reports the limitation.

### Trace extraction targets

For each checkpoint in the window:

1. **Tool call repetition** → `retry-loop.<tool>`
2. **User correction markers** ("no", "wrong", "actually", "instead" after agent action) → `correction.<area>`
3. **Error patterns in tool output** (same regex set as error-detector.sh) → `error.<category>`
4. **Drift signals from context-surfing exits** → `drift.<signal>`
5. **Approach changes mid-task** → `approach-switch.<domain>`
6. **Token anomalies** (>2x median for task type) → `cost.<task-type>`

Findings are normalized to the self-improvement taxonomy (`harden.input_validation`, `simplify.dead_code`, etc.) where possible.

### Merged gap report format

```yaml
promotion_ready:
  - pattern_key: "harden.input_validation"
    recurrence_count: 5
    sources:
      - .learnings/LEARNINGS.md (3 entries)
      - entire:traces (5 occurrences across 4 sessions)
    confidence: high  # in both sources
    evidence:
      - "LRN-20260401-001: Missing bounds check on pagination"
      - "entire:1ca16f9b: Retry loop on /api/search — pageSize rejected 4x"
      - "entire:8bf2e4cd: User correction 'validate before DB query'"
    entire_checkpoints:
      - 1ca16f9bb3801ee2a02f2384f31355a54b81ea00
      - 8bf2e4cd63d01040b38df07c43f73e0f15d05ac9
```

Patterns in both sources are highest confidence. Patterns only in `.learnings/` may be over-logged. Patterns only in traces may be noise. The overlap is where the signal is strongest.

### Compatibility

Default target: Entire v0.5.4+ via `entire rewind --list` and `entire explain`. The concept is source-agnostic — any tool exposing checkpoint lists and transcript reads can serve as a trace source. Custom adapters can live in `scripts/` or via gh-aw `mcp-scripts`.

## Persistence

Reads `.learnings/` from the working directory. The interactive skill does not integrate with external memory backends — `.learnings/` is the source of truth.

**The promotion path is already wired up**: when harness-updater acts on this skill's gap report, it writes rules to `CLAUDE.md` (or `AGENTS.md` / `.claude/rules/`). Claude Code **auto-loads those files at every session start**, so a promoted rule becomes part of the agent's context on the next session without any additional surfacing. No hook or pre-load needed — the target files are already in the auto-load set.

For CI-side durable storage across workflow runs, see `learning-aggregator-ci`, which can optionally back its state with gh-aw's `repo-memory`. The resulting `learnings/default` branch is a normal git branch and can be fetched locally if desired, but this skill itself only reads local files.

### Tracker-id in gap reports

Each promotion candidate in the gap report includes a `tracker` field set to the pattern-key. This tracker propagates through the full chain: harness-updater embeds it as a comment in CLAUDE.md, eval-creator references it in eval cases. To audit the full lifecycle of a pattern, search for `tracker:[pattern-key]` across the repo and GitHub.

## What This Skill Does NOT Do

- Does not modify `.learnings/` files (read-only analysis)
- Does not apply promotions (that's harness-updater)
- Does not create evals (that's eval-creator)
- Does not fix code or run tests
- Does not replace human judgment for ambiguous patterns
- Does not run `--deep` trace analysis per-session — only on cadence or explicit invocation
- Does not require Entire — falls back to `.learnings/`-only mode when trace source is unavailable
