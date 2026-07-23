# WorkBuddy × FBS-BookWriter：任务旅程对齐

**版本**：1.59D · **官方宿主说明**：[WorkBuddy 简介](https://www.codebuddy.cn/docs/workbuddy/Overview)

## 旅程映射

| WorkBuddy 步骤 | 本 Skill 对应 |
|----------------|---------------|
| 创建任务、选用技能 | 触发词 / 品牌首响 → **INTAKE**（见 `section-3-workflow` ESM） |
| 任务对话 | S0–S6 + 检索账本 + Chapter Brief |
| 结果验收 | 磁盘 `[S0]`–`[S6]`、`verify-expected-artifacts.mjs`；勿仅信 UI「unknown」 |

## 姿态

- **助手与朋友**：长步骤先摘要后展开（`skill-authoritative-supplement` §1），与首响「≤20 字合并收集」并存。
- **任务优先**：品牌触发时禁止任务锁定前采集称呼/城市（SKILL「入口偏移防治」）。

## 深读

- 主流程：[`section-3-workflow.md`](../01-core/section-3-workflow.md)  
- 多成员话术：[`workbuddy-agent-briefings.md`](../01-core/workbuddy-agent-briefings.md)
