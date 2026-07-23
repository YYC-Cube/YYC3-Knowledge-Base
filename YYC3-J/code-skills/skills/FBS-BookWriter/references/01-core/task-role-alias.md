# Task 角色与对外话术别名（单一映射表）

> **目的**：消除审计「角色命名不一致」；宿主调度名以本表为准，用户侧仍**不暴露**内部角色名（见 `SKILL.md` §1）。

| 内部 Task 名 | 职责摘要 | 规范加载（canonical） | 用户可见话术（示例） |
|--------------|----------|----------------------|----------------------|
| **Researcher** | 联网检索、事实与数据核对 | `search-policy.json` + §3.0.5 | 「检索中」「核对来源」 |
| **Writer** | 成文与改稿 | `03-product/04-templates.md` + 风格档案 | 「写作中」「已更新本章」 |
| **Illustrator** | 封面、Mermaid、插图标记 | `03-product/08-visual.md` | 「配图与图表处理中」 |
| **Critic-S** | **S 层去 AI 味** + 与合规重叠的句级扫描 | `02-quality/quality-S.md` + G 层条款 | 「语言与合规初扫」 |
| **Critic-L1** | P 层段级 | `02-quality/quality-PLC.md` §P | 「段落审阅」 |
| **Critic-L2** | C 层章级 | `02-quality/quality-PLC.md` §C | 「章节审阅」 |
| **Critic-L3** | B 层篇级 + 视觉×正文相关性 | `02-quality/quality-PLC.md` §B + `08-visual.md` §3 | 「全书结构与图表核对」 |
| **Proofer** | 三校合一、排版底线、通读、国标编校对照 | `02-quality/quality-check.md` + `06-typography.md` + `05-ops/national-standards-editorial-checklist.md` | 「终校与排版检查」 |

**说明**：WorkBuddy 话术中的「成员 A/B/C」与 Critic-L* 的对应关系见 [`workbuddy-agent-briefings.md`](./workbuddy-agent-briefings.md)；合并结论一律由**主编/主会话**输出，避免多成员各写一份定稿。
