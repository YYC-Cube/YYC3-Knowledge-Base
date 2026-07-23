# 文档承诺 × 用户动作 × 可用工具（对照表）

**版本**：1.59D · **背景**：二十维综合审计结论——「规范设计极其完善但执行严重依赖模型自觉」；本表降低**承诺误解**。

## 主表

| 文档/横幅承诺 | 实际依赖 | 用户/主编 P0 动作 | 推荐 CLI / 宿主能力 |
|---------------|----------|-------------------|---------------------|
| 快速大纲 / S0 | 检索维度、宿主 WebSearch | 接受 S0 时间预算；勿假设「无检索 3 分钟成书」 | 查 `section-3-workflow` S0、**s0DimensionCompleteness** |
| 强制联网查证 | 模型调用工具 | 宿主须开放检索；失败时按 policy 降级标注 | `enforce-search-policy.mjs` |
| 断点续写 / 台账 | `.fbs/` 工件存在 | **S2→S3 前**运行 `init-fbs-multiagent-artifacts.mjs` | 同左 |
| ESM 可验证 | 对话 + 磁盘一致 | 每次切换跑 `fbs-record-esm-transition.mjs`（有 Node） | `npm run fbs:esm -- --book-root …` |
| 时间标签（有成稿时） | `s3-start-gate` 内嵌调用 | 默认随门禁**自动**跑 `audit-temporal-accuracy --scan-book-s3`（警告）；严格 CI 加 `--audit-temporal-enforce` | 见 `s3-start-gate.mjs` 头注释 |
| 术语禁用变体（有成稿时） | 同上 | 自动跑 `audit-term-consistency --scan-book-s3`；阻断加 `--audit-term-enforce` | 同上 |
| 待核实台账（S5） | `writing-notes/pending-verification.md` | S5 前 `audit-pending-verification.mjs --enforce` | `search-policy` **pendingVerificationTracking** |
| P0 总览 | — | 查阅 [`p0-cli-map.md`](./p0-cli-map.md)（含 **`p0AutomationIndex` 键对照**） | 综合审计 P1-2 |
| S5 前三项串跑 | — | `npm run audit:all -- --skill-root . --book-root <书> --strict` | `run-p0-audits.mjs` |
| S3 三守卫 | — | `npm run guard:s3:full -- --skill-root . --book-root <书>` | `s3-guard.mjs` |
| HTML 终稿 D1 | `build.mjs` + 依赖 | `npm install`、脚注链完整 | `html-delivery-smoke.mjs --strict --fail-on-warn` |
| 质量门禁自动化 | 部分规则可脚本 | 其余依赖主编与模型自觉 | `quality-auditor.mjs`（含 `--vcr-heuristic-warn`）、`audit-query-optimization.mjs`、`normalize-ledger-dimensions.mjs`、`gate:s3` |

## 评级提示

- **P0**：不满足不得对外宣称阶段完成（见各章 `quality-check.md`）。
- **P1/P2**：体验与长期治理项，见综合审计报告改进路线图。
