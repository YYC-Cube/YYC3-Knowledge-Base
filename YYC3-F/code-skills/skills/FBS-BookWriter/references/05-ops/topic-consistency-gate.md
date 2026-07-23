# 主题一致性门禁（C0-4）

**版本**：1.59D · **机读配置**：[`search-policy.json`](./search-policy.json) → `topicLock`

## P0 要点

- S0 及后续阶段产出首行须含 **`**主题**：…**`，与 `topicLock.s0Output.mustInclude` 一致。
- 读取 WorkBuddy 记忆摘要、切换书稿、并行 Writer 开写前，须核对主题与当前本书一致；漂移时 **ASK_CONFIRMATION**，禁止静默切换语境。
- 与 [`book-level-consistency.md`](../02-quality/book-level-consistency.md) C0-4、[`section-nlu.md`](../01-core/section-nlu.md) 首响优先级协同。

## 与记忆摘要

`userMemoryIntegration.mustPassGatesBeforeUse` 含 `topic-consistency-gate` 与 `C0-4`：注入 `workbuddy-memory-digest.json` 前须通过本书主题锁。
