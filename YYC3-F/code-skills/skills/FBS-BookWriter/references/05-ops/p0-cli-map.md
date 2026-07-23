# P0 规则 → CLI / 工件映射（综合审计 P1-2）

**版本**：1.59D · **维护**：与 `search-policy.json`、脚本头注释同步更新

> 目标：把「写在规范里的 P0」落到**可执行命令**与**磁盘真值**，降低「仅靠模型自觉」的缺口。

## 总览

| 审计维度 / 主题 | 规范锚点 | CLI 或工件 | 默认阻断 |
|-----------------|----------|------------|----------|
| 状态追踪 | `esmExecutionTracking` | `init-fbs` → `规范执行状态.md`；`fbs-record-esm-transition.mjs` | 否 |
| ESM 机读 | 同上 | `esm-state.md` + 上列脚本 | 否 |
| 时间标签 | `yearSourceLedger` / `temporalAccuracy` | `audit-temporal-accuracy.mjs`；**S3 门禁内嵌**（有 `[S3]*.md` 时）`--scan-book-s3` | 可选 `--audit-temporal-enforce` |
| 概念锁定 | `termConsistencyTracking` | `术语锁定记录.md`；`audit-term-consistency.mjs`；**S3 门禁内嵌** `--scan-book-s3` | 可选 `--audit-term-enforce` |
| 检索自评 | `queryOptimizationAudit` + `searchEnhancement.selfImprovingStrategy` | `audit-query-optimization.mjs`；**S3 门禁内嵌**（有 `[S3]*.md` 且 `search-ledger.jsonl` 存在时） | 可选 `--audit-query-opt-enforce` |
| 待核实台账 | `pendingVerificationTracking` | `.fbs/writing-notes/pending-verification.md`；`audit-pending-verification.mjs` | S5 建议 `--enforce` |
| S2.5 核销 | `section-3-workflow` | `s3-start-gate.mjs` 读 `[S2.5]*.md` | 是 |
| S3 一键守卫 | `s3-guard.mjs` 头注释 | `scripts/s3-guard.mjs`（内嵌 `s3-start-gate` + 心跳 + 台账真值） | `npm run guard:s3:full -- --skill-root . --book-root <书>` |
| 体裁 / 检索阶段 | `chapterWriting.genreCheckPolicy` | `s3-start-gate.mjs`（genreLevel、账本阶段） | 是 |
| 检索次数 / 原子性 | `search-policy` | `scripts/enforce-search-policy.mjs` | 可选 |
| 引用格式 G4 | `citation-format.md` | `scripts/citation-format-check.mjs` | 章提交前 |
| HTML 档位 | `html-deliverable-gate.md` | `scripts/html-delivery-smoke.mjs` | `--strict` |
| 全书质检 | `quality-check.md` | `scripts/quality-auditor.mjs` | `--enforce` |
| VCR 启发式（P2） | `vcr-heuristic-brief.md` | `quality-auditor.mjs` `--vcr-heuristic-warn` | 可选 |
| s0Dimension 短码归一 | `s0DimensionCanonical` | `scripts/normalize-ledger-dimensions.mjs` | 可选 `--write` |
| 磁盘阶段验收 | SKILL §宿主误报 | `scripts/verify-expected-artifacts.mjs` | 可选 `--strict` |

## 推荐命令链（主编 / CI）

```bash
# 1) 初始化
node scripts/init-fbs-multiagent-artifacts.mjs --book-root <本书根>

# 2) 进 S3 前（含时间/术语/检索自评子审计；可加 --audit-*-enforce）
node scripts/s3-start-gate.mjs --skill-root <技能根> --book-root <本书根>

# 或一键三门禁（preflight + 心跳 + 台账真值）
npm run guard:s3:full -- --skill-root <技能根> --book-root <本书根>

# 3) S5 前（单项或一键）
npm run audit:all -- --skill-root <技能根> --book-root <本书根> --strict
# 等价于 temporal + terms + pending 均带 --enforce
```

## npm 快捷（`package.json` scripts）

| npm 命令 | 说明 |
|----------|------|
| `npm run audit:all -- --skill-root . --book-root <书> [--strict]` | 串跑时间 / 术语 / 待核实（`scripts/run-p0-audits.mjs`） |
| `npm run guard:s3:full -- --skill-root . --book-root <书>` | `s3-guard.mjs --verify-stages`（完整 preflight） |
| `npm run gate:s3 -- --skill-root . --book-root <书>` | 仅 `s3-start-gate` |
| `npm run audit:query-opt -- --skill-root . --book-root <书> [--enforce]` | 仅检索自评字段 |

## `p0AutomationIndex` 机读键对照（`search-policy.json`）

维护新 CLI 时**须同时**改下表与 JSON，避免审计「索引与文档脱节」。

| 键 | 含义 |
|----|------|
| `markdownMap` | 本文件路径 |
| `s3StartGateCli` | S2→S3 门禁 |
| `s3GuardCli` | 一键三守卫 |
| `standardExecutionChainCli` | 初始化 + 门禁 + 章节策略 |
| `p0AuditBundleCli` | S5 前三项串跑 |
| `pendingVerificationCli` / `pendingVerificationNote` | 待核实清单 |
| `s3GateIntegratedAudits` | S3 门禁内嵌子审计清单（含 queryOptimization） |
| `ledgerDimensionNormalizeCli` | s0Dimension 短码归一 |
| `queryOptimizationAuditCli` | 检索自评审计 |
| `multiagentOrchestratorCli` | 多智能体编排模板（`scripts/multiagent-orchestrator.mjs`） |

## 未脚本化（仍依赖宿主 / 模型）

- 对话内 ESM 宣告文本（可对照 `esm-state.md` 抽查）；多 Writer **磁盘清单协议**见 [`multi-agent-horizontal-sync.md`](./multi-agent-horizontal-sync.md)
- **全文** VCR 语义与部分 B 层篇级规则仍须人工；机读三条启发式见 [`vcr-heuristic-brief.md`](./vcr-heuristic-brief.md)
- WorkBuddy **会话内横向 `send_message` 类 API** 仍属宿主 P2；磁盘协同见 [`multi-agent-horizontal-sync.md`](./multi-agent-horizontal-sync.md)

详见 [`promise-code-user-alignment.md`](./promise-code-user-alignment.md)。
