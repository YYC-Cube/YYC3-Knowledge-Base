# 执行契约简报（宿主 × 模型 × 磁盘）

**版本**：1.59D · **层级**：L0' 补充（与 `SKILL.md`「分层加载」同读）

## 1. 各方职责边界

| 角色 | 必须保证 |
|------|----------|
| **宿主（IDE / WorkBuddy 等）** | 提供可验证的磁盘写入、可选 CLI（Node）、网络检索能力声明；不虚构「已跑过某脚本」 unless 实际执行。 |
| **模型（本 Skill 驱动）** | 按 ESM 与 `search-policy.json` 输出宣告与台账；落盘路径与字段名以规范为准，不依赖对话内易失记忆。 |
| **用户 / 主编** | 指定本书根目录、触发门禁与合稿；对豁免项书面确认（文体豁免、时间范围约定等）。 |

## 2. 磁盘真值（SoT）

以下路径为**跨会话、可审计**真值；对话摘要不可替代：

- `.fbs/search-ledger.jsonl` — 检索与维度、年份来源、`queryOptimization` 自评等。
- `.fbs/esm-state.md` / `.fbs/规范执行状态.md` — ESM 状态与切换日志。
- `.fbs/writing-notes/pending-verification.md` — 待核实清单（S5 前须清零或 `--enforce` 接受风险）。
- 各章 `[S3]*.md`、成稿 Markdown — 与时间标签、术语、引用格式门禁对应。

## 3. 原子性与宣告

- 状态切换须满足 `search-policy.json` → `esmAnnouncementAtomicity`（旧→新、原因、自检出口、下一步同次输出）。
- P0 阻断条件见 `p0-cli-map.md` 与 `p0AutomationIndex`；脚本存在 ≠ 已执行，以实际命令与退出码为准。

## 4. 相关条文

- 分层与 token：`references/05-ops/spec-layering-strategy.md`
- 多 Writer 磁盘协同：`references/05-ops/multi-agent-horizontal-sync.md`
- 承诺与工具对照：`references/05-ops/promise-code-user-alignment.md`
