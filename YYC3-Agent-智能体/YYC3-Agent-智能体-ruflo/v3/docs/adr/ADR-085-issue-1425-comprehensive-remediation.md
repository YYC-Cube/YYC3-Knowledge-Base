# ADR-085: Comprehensive Remediation of Issue #1425

## Status
Accepted

## Context

Issue [#1425](https://github.com/ruvnet/ruflo/issues/1425) identified systemic quality problems in the codebase, independently confirmed by an external audit. After initial fixes in v3.5.43 (PR #1435, ADR-067) and v3.5.69, the following items remain unresolved in v3:

1. **~19 `any` types in v3 CLI commands** — TypeScript type safety gaps
2. **3 websocket implementations** — CLI, hooks, and MCP bridge each have separate WS logic with different auth and reconnection behavior
3. **3 agent management systems** — AgentManager, WorkerPool, and MCP agent tools don't share code or coordinate state
4. **Providers `list`/`test` static catalog** — Returns hardcoded provider list, ignores user configuration
5. **Security validators on only 2 of 43 endpoints** — `validate-input.ts` wired to `agent_spawn` and `memory_store` only
6. **Token Optimizer `sleep(352)` baseline** — Benchmark uses artificial delay as timing baseline
7. **Intelligence layer processes ~5,706 entries with ~20 unique** — No dedup/compaction on session start

## Decision

Address all 7 items in a single release (v3.5.70):

### 1. Eliminate `any` types in v3 commands
Replace all 19 `any` casts in `v3/@claude-flow/cli/src/commands/` with proper types. Use `unknown` + narrowing where the actual type is unclear.

### 2. Consolidate websocket implementations
Create `v3/@claude-flow/shared/src/ws/` shared websocket module with unified auth, reconnection logic, and heartbeat. CLI, hooks, and MCP bridge import from shared module.

### 3. Unify agent management state
Create shared `AgentRegistry` in `@claude-flow/shared` that AgentManager, WorkerPool, and MCP agent tools all use. Single source of truth for agent lifecycle.

### 4. Wire providers to config
`providers list` reads from `claude-flow.config.json` or environment. `providers test` makes real API health check calls (with timeout).

### 5. Expand input validation to all command handlers
Add `validateIdentifier`/`validatePath`/`validateText` calls to all 43 command handlers that accept user input. Focus on boundary inputs: file paths, identifiers, command arguments.

### 6. Fix Token Optimizer benchmark
Remove `sleep(352)` artificial baseline. Benchmark against actual no-op timing. Remove hardcoded `+= 100` token savings — measure real token counts or remove the claim.

### 7. Intelligence layer dedup on session start
Add compaction pass in `session-start` hook that deduplicates entries by content hash before building the graph. Skip entries with identical content, keeping highest confidence version.

## Consequences

- All critical items from #1425 and the independent audit are resolved
- v3 CLI has proper type safety, consolidated infrastructure, and honest metrics
- Input validation covers all user-facing entry points
- Larger architectural items (#2 WS, #3 agent management) get shared modules that benefit future development
