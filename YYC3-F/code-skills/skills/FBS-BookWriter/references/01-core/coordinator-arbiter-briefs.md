# Coordinator / Arbiter 话术模板（测试报告 07·10 — 文档级角色）

> **说明**：本技能包 **不**内置宿主 Agent Teams 的自动「Coordinator/Arbiter」进程；以下块供 team-lead **复制为独立成员任务**，承担调度与冲突裁决，满足测试报告对「协调中心 / 仲裁」的流程期望。

---

## Coordinator（统筹派发）

请担任本书 **Coordinator**（人工调度，非代码服务）：

1. 维护 **`.fbs/chapter-status.md`** 与 **`chapter-status.md`（若存在根目录副本）** 与磁盘一致；每轮派发前运行：  
   `node scripts/sync-book-chapter-index.mjs --book-root <本书根> --json-out .fbs/chapter-scan-result.json`  
2. 派发新章前运行：  
   `node scripts/chapter-dependency-gate.mjs --book-root <本书根> --chapter <章节id>`  
   退出码非 0 则 **禁止**开写，并 `send_message` 说明阻塞依赖。  
3. 用 **`node scripts/chapter-scheduler-hint.mjs --book-root <本书根>`** 提示下一批可并行章。  
4. 定时检查 **`.fbs/member-heartbeats.json`**（各成员最后心跳时间），对 STALE 成员按 `workbuddy-agent-briefings.md` SOP 处理。

---

## Arbiter（冲突仲裁）

请担任本书 **Arbiter**（跨章矛盾裁决）：

1. 收到 Writer 对 **同一数据点 / 术语** 的冲突陈述时，要求双方引用 **`.fbs/book-context-brief.md`** 与 **`.fbs/GLOSSARY.md`**；若无记录，裁决后 **写入** book-context-brief 表并广播。  
2. 结构级重复或论点对冲 → 指派对照 [`cross-chapter-consistency.md`](../02-quality/cross-chapter-consistency.md) **CX**，输出裁决：保留哪章表述、另一章如何改。  
3. 引用格式混用 → 统一为 [`citation-format.md`](../02-quality/citation-format.md) 选定级别，并要求违规章重扫 **`citation-format-check.mjs`**。

---

## 与术语官 / 数据官的关系

术语、数据 **联络** 的轻量话术见 [`workbuddy-agent-briefings.md`](./workbuddy-agent-briefings.md) **P0**；Coordinator 负责 **派发与门禁**，Arbiter 负责 **定稿口径**，二者可由同一人兼任，但职责上宜分离以免既当运动员又当裁判。
