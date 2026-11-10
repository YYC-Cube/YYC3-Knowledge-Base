# ADR-086: Wire @ruvector/ruvllm as Intelligence Coordinator

## Status: Implemented

## Date: 2026-04-07

## Context

The claude-flow intelligence pipeline (ReasoningBank, EWC++, LoRA, SONA, cosine similarity) is implemented in pure JavaScript using Float32Array operations. `@ruvector/ruvllm@2.5.4` is installed and provides structured ML components.

### API Testing Results (2026-04-07)

| Component | ruvllm Status | Keep JS? | Rationale |
|-----------|--------------|----------|-----------|
| `cosineSimilarity` | Works but same speed as JS (38ms vs 36ms / 100k) | **Yes** | No perf gain |
| `ReasoningBank.store/getByType` | Works | Partial | Use for type-based storage, keep JS HNSW for search |
| `ReasoningBank.findSimilar` | **Broken** (returns 0 always) | **Yes** | ruvllm bug |
| `EwcManager.computePenalty` | **Returns NaN** | **Yes** | ruvllm bug |
| `LoraAdapter.forward` | Works but same speed, different output dims | **Yes** | API mismatch |
| `SonaCoordinator` | Works: trajectory recording + background loop | **Use** | Real learning pipeline |
| `ContrastiveTrainer` | Works: triplet training, epoch tracking | **Use** | Agent embedding learning |
| `TrainingPipeline` | Works: checkpoint save/load, LoRA training | **Use** | Model training infrastructure |
| `SessionManager` | Works: session create/export/import | **Use** | Session coordination |

### What ruvllm IS

A well-structured JS library with SIMD support flag. NOT native Rust/NAPI for most operations. Value is in the **coordination framework**, not raw speed.

### ESM/CJS Import Resolution

`@ruvector/ruvllm` exports CJS only (`dist/cjs/index.js`). ESM `await import()` fails due to broken ESM export path. Resolution: use `createRequire(import.meta.url)` pattern (same as `diskann-backend.ts`, `ruvector-training.ts`).

## Decision

Selectively integrate `@ruvector/ruvllm` as the intelligence **coordinator**, not a wholesale replacement:

### USE ruvllm for (coordination & learning):
1. **`SonaCoordinator`** — Trajectory-based learning pipeline in `intelligence.ts`
2. **`ContrastiveTrainer`** — Agent embedding improvement in `sona-optimizer.ts`
3. **`TrainingPipeline`** — LoRA training with checkpoints in `lora-adapter.ts`
4. **`ReasoningBank`** (store/getByType) — Type-based pattern storage alongside JS HNSW

### KEEP pure JS for (proven, working):
1. **Cosine similarity** — Same speed, proven correct
2. **EWC++** — ruvllm returns NaN, our JS version works
3. **LoRA forward/backward** — API dimensions match our callers
4. **MoE Router** — No ruvllm equivalent
5. **HNSW search** — ruvllm `findSimilar` broken, our HNSW works

### Files modified

#### Core integration (CJS import via `createRequire`):
1. **`cli/src/memory/intelligence.ts`** — `loadRuvllmCoordinator()` lazily loads `SonaCoordinator`, eagerly loaded during `initializeIntelligence()`. Trajectories forwarded via `recordTrajectory()`. Background learning via `runBackgroundLearning()`. Stats expose `_ruvllmBackend` and `_ruvllmTrajectories`.
2. **`cli/src/memory/sona-optimizer.ts`** — `loadContrastiveTrainer()` lazily loads `ContrastiveTrainer`, eagerly loaded during `SONAOptimizer.initialize()`. Exposes `trainAgentEmbeddings()` and `_contrastiveTrainer` in stats.
3. **`cli/src/ruvector/lora-adapter.ts`** — `loadTrainingPipeline()` lazily loads `TrainingPipeline`. `initBackend()` for eager loading. `saveCheckpoint()`/`loadCheckpoint()` with ruvllm primary + JSON fallback. Stats expose `_trainingBackend`.

#### CLI command wiring:
4. **`cli/src/commands/neural.ts` (status)** — Three new rows in status table: ruvllm Coordinator, Contrastive Trainer, Training Pipeline.
5. **`cli/src/commands/neural.ts` (train)** — Auto-saves LoRA checkpoint after training completes via `adapter.saveCheckpoint()`.
6. **`cli/src/commands/neural.ts` (optimize)** — Triggers `runBackgroundLearning()` during optimization pass.

#### MCP tool wiring:
7. **`cli/src/mcp-tools/hooks-tools.ts` (intelligence)** — Three new components in `hooks_intelligence` response: `ruvllmCoordinator`, `contrastiveTrainer`, `trainingPipeline`. Added to `implementationStatus.working`.
8. **`cli/src/mcp-tools/hooks-tools.ts` (intelligence stats)** — New `ruvllm` stats object with coordinator/contrastiveTrainer/trainingBackend status.
9. **`cli/src/mcp-tools/hooks-tools.ts` (trajectory-end)** — Calls `runBackgroundLearning()` after trajectory end for automatic learning.
10. **`cli/src/mcp-tools/ruvllm-tools.ts` (ruvllm_status)** — Returns both WASM and native CJS backend status: `{ wasm: {...}, native: {...} }`.

### Non-goals

- Not replacing cosine/EWC/LoRA forward (JS is equal or better)
- Not replacing graph layer (graph-node, gnn) — separate ADR
- Not modifying MCP tool interfaces (backward compatible)

## Consequences

### Positive
- Real trajectory-based SONA learning (not keyword heuristic)
- Contrastive training improves agent routing over time
- Checkpoint infrastructure for LoRA persistence across sessions
- Transparent `_backend` reporting for all components via CLI and MCP
- Background learning triggers automatically on trajectory-end
- All 3 backends report status in `neural status`, `hooks intelligence`, and `ruvllm_status`

### Negative
- Two code paths for pattern storage (ruvllm + JS)
- ruvllm API quirks require adapter wrappers
- Cross-module stats require async fetches in MCP tools

### Risks
- ruvllm `findSimilar` bug means we can't use it for search — mitigated by keeping JS HNSW
- ruvllm EWC `NaN` bug means we can't use it for consolidation — mitigated by keeping JS EWC++
- CJS-only package requires `createRequire` bridge — standard pattern in codebase

### Test Coverage
- `__tests__/ruvllm-integration.test.ts` — 11 tests covering all 3 backends, CJS import pattern, and graceful degradation
- `__tests__/ruvllm-tools.test.ts` — Updated status test for `{ wasm, native, graph }` response shape
- `__tests__/graph-backend.test.ts` — 9 tests for graph-node backend (ADR-087)
- Full suite: 32 files, 1762 tests passing

### Related ADRs
- **ADR-087** — `@ruvector/graph-node` native graph database backend (companion integration)
- Other `@ruvector` packages evaluated but not integrated: `@ruvector/gnn` (NAPI broken), `@ruvector/rvf` (backend missing)
