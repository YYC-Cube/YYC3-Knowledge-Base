# 首次写书与环境迭代（Tier 0–2）

**版本**：1.59D · **关联**：SKILL「首次写书（冷启动）」

## Tier 0（必达）

- 触发词首响、主题合并收集、进入 S0 或用户跳过路径。

## Tier 1（强烈建议）

- `node scripts/init-fbs-multiagent-artifacts.mjs --book-root <本书根>`
- 可选：`init-project-memory.mjs --with-workbuddy-hint`

## Tier 2（建议）

**说明**: 环境指纹功能需宿主支持，具体配置请参考宿主文档。

环境指纹应记录 `.fbs/workbuddy-environment.json`（路径存在性 + `search-policy` 版本，**不含**记忆内容 hash）。

## Tier 3

视宿主后续能力扩展；以当期 WorkBuddy 文档为准。
