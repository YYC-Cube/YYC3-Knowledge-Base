# WorkBuddy 用户记忆：稳妥摄取

**版本**：1.59D · **机读配置**：[`search-policy.json`](./search-policy.json) → `userMemoryIntegration`

## 原则

- **opt-in**：默认不静默把宿主记忆当本书事实。
- **写入本书**：摘要 → `<本书根>/.fbs/workbuddy-memory-digest.json`（由 CLI 生成）。
- **注入前**：须通过 **topic-consistency-gate** / **C0-4**（与 policy 字段一致）。

## CLI

**说明**: WorkBuddy 记忆摘要功能需宿主支持，具体配置请参考宿主文档。宿主提供相关 CLI 工具时可执行相应命令生成记忆摘要。

路径探测（`workspaceMemory`、`userProfileDir`）以 `search-policy.json` 为准；宿主升级后建议参考环境指纹相关配置。
