# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice
**Areas**: frontend | backend | infra | tests | docs | config
**Statuses**: pending | in_progress | resolved | wont_fix | promoted

---

## 2026-02-22 — DX Data: snapshot_team_id vs team_id FK confusion

- **Category**: correction | **Area**: docs | **Status**: resolved
- **Context**: `dx_snapshot_team_scores` has two team FK columns: `snapshot_team_id` (FK to `dx_snapshot_teams.id`) and `team_id` (FK to `dx_teams.id`). All survey score queries that join to `dx_snapshot_teams` must use `snapshot_team_id`, not `team_id`.
- **Resolution**: Fixed all JOINs in SKILL.md and `references/developer-experience.md` to use `ts.snapshot_team_id = st.id`.

## 2026-02-22 — DX MCP server tool name

- **Category**: correction | **Area**: docs | **Status**: resolved
- **Context**: The DX Data MCP server tool is `mcp__dx-mcp-server__queryData`, not `mcp__DX_Data__queryData`. MCP tool names use the server name from config, which may differ from what you'd guess.
- **Resolution**: Updated SKILL.md tool references.

## [LRN-20260412-001] verify-gate caught a real test assumption bug on first real-world use

- **Category**: best_practice | **Area**: tests | **Status**: resolved
- **Priority**: high
- **Pattern-Key**: `verify-gate.real-world-validation`
- **First-Seen**: 2026-04-12 | **Last-Seen**: 2026-04-12 | **Recurrence-Count**: 1

### Summary
First real-world end-to-end run of the verify-gate → simplify-and-harden pipeline on an external project (pmx-canvas). Pipeline worked as designed.

### Details
In a separate session working on pmx-canvas, the agent classified a test-gap task as Small and followed the verify-gate → simplify-and-harden route manually (the runtime did not register the pipeline skills via the skill tool, so the agent read the SKILL.md files and executed the steps directly).

The verify-gate caught a real bug: a newly added test expected viewport shape `{ x, y, zoom }` but the actual API returns `{ x, y, scale }`. Without verify-gate, this test would have been committed wrong and debugged later. The fix loop executed exactly once, re-verified green, and the bounded simplify-and-harden pass on the diff found nothing to change (correct call — the new tests were clean and direct).

**This validates the inner-loop design.** The detect → verify → recover cycle worked on first contact with real code. The fix loop didn't spiral. simplify-and-harden's "refactor is exceptional, not default" posture held.

### Source
Real session feedback from pmx-canvas project, reported back to pskoett-skills session.

### Related Files
- skills/verify-gate/SKILL.md
- plugin/skills/verify-gate/SKILL.md

### Suggested Actions
1. **Log as ground-truth evidence** that verify-gate closes the standard-pipeline verify gap (done by this entry)
2. **Add bun/pnpm/yarn/deno to verify-gate's command discovery list** — pmx-canvas uses bun, and the current discovery list only mentions package.json, not the package manager variant. (✓ done in this session — see commit after this learning)
3. **Known gap:** runtime loader registration — skills in `.agents/skills/` and `.opencode/skills/` were present but not invokable via the skill tool. Agent had to read SKILL.md files manually. This is a distribution/install-surface issue, not a skill design issue. Document in README that skills may need to be installed differently depending on runtime.

---

## [LRN-20260412-002] verify-gate command discovery missed package manager variants

- **Category**: knowledge_gap | **Area**: docs | **Status**: resolved
- **Priority**: medium
- **Pattern-Key**: `verify-gate.package-manager-discovery`
- **First-Seen**: 2026-04-12 | **Last-Seen**: 2026-04-12 | **Recurrence-Count**: 1

### Summary
verify-gate's Step 1 command discovery listed `package.json` scripts but did not mention that the correct command runner depends on which package manager the project uses (bun, pnpm, yarn, npm).

### Details
On first real use in pmx-canvas (a bun project), the agent ran `bun run test`, `bun run build`, `bun run test:all`. This worked because the agent already knew pmx-canvas uses bun. But a colder-start session might default to `npm run` and get slower resolution. The skill should detect lockfile presence as a package-manager hint.

### Resolution
Updated verify-gate Step 1 to list:
- `bun.lock` / `bun.lockb` → prefer `bun run <script>`
- `pnpm-lock.yaml` → prefer `pnpm run`
- `yarn.lock` → prefer `yarn`
- Added `deno.json` / `deno.jsonc` as a separate source for `deno task`

Updated in both `skills/verify-gate/SKILL.md` and `plugin/skills/verify-gate/SKILL.md`.

### Promotion candidate
This is a small, concrete improvement — not worth promoting to CLAUDE.md. Already captured in the skill itself.

---

