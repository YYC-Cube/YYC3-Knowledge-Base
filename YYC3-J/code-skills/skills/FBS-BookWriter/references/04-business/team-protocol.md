# FBS-BookWriter 协同机制（精简版）

> **架构**：单Agent叙事层（执行层见SKILL.md §6.4）
> **说明**：本文件保留叙事化阶段规范。多 Agent 协作（如 S1-B 并行研究）由宿主按 `SKILL.md` 与 `references/05-ops/heartbeat-protocol.md` 执行。

---

## §1 协作角色与工作流映射

> 与 [`persona.md`](../03-product/03-persona.md)、[`brand-outputs.md`](../05-ops/brand-outputs.md) 一致：对外使用**岗位与产品叙事**，不使用历史或虚构人名。

| 工作流角色 | 说明 |
|------------|------|
| **researcher** | 检索、事实与数据核对 |
| **writer** | 主笔与结构落地 |
| **illustrator** | 封面、插图、图表与视觉清单 |
| **critic-***（S/L1/L2/L3） | 分层审校 |
| **proofer** | 通读与排版底线 |

**执行时不向用户暴露内部路由名或任务 ID**；进度用语见 `SKILL.md` 与 `section-3-workflow.md`。

---

## §2 阶段执行规范

见 `SKILL.md` **§3 工作流**；阶段划分、审批点与产出物编号以 [`section-3-workflow.md`](../01-core/section-3-workflow.md) 为准（S0–S6，非「五阶段」旧称）。

---

## §3 短指令

见 `SKILL.md` **§4 短指令**（[`section-4-commands.md`](../01-core/section-4-commands.md) 为扩展列表）。

---

## §4 知识文件索引

见 `SKILL.md` **规范与文档索引**表，及 [`skill-index.md`](../01-core/skill-index.md)。

---

## §5 附录

当前架构为单体精简版；CH01-CH05消息协议、静默待命规则、按需spawn协议已不适用，多 Agent 协作由宿主平台 Agent Teams 功能承载。


