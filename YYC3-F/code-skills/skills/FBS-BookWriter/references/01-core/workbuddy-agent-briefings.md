# WorkBuddy 多智能体委派话术（S3 / S5）

> **适用场景（高级可选）**：本文件适用于有 [Agent Teams](https://www.codebuddy.cn/docs/cli/agent-teams) 宿主能力、且明确需要多 Writer 并行的高级场景（如企业大型手册、多人协同写书）。**普通单用户推荐使用「单智能体串行模式」**：成文期间分块推送（每小节即推）+ 章内结构化自审卡，token 消耗约为并行模式的 20–40%，且无平台并发限流风险（14003 根因之一）。  
> **宿主上下文**：Skill 与任务旅程的全局对齐见 [`references/05-ops/workbuddy-skill-foundation.md`](../05-ops/workbuddy-skill-foundation.md)（[WorkBuddy 官方简介](https://www.codebuddy.cn/docs/workbuddy/Overview)）。  
> **用途**：复制到 WorkBuddy 任务描述或通过自然语言创建团队时使用。本文件为最小技能包组成部分，**非**可执行 API。  
> **增效提示**：在支持 Agent Teams 的宿主上，可要求成员 **段落级交付 + `@` 互通**；主编仍负责合并与门禁（见 `section-3-workflow.md` S5）。  
> **测试报告对齐**：`test-reports` 要求 **默认启用** 协调角色话术、Writer 质量红线、磁盘台账与 CLI 巡检 — 下文 **P0** 块请整段复制到 team-lead 任务。

---

## 随包 CLI 速查（多路并行 P0）

| 用途 | 命令 |
|------|------|
| 初始化 `.fbs/` 全套（含 `GLOSSARY.md`、`chapter-dependencies.json`、心跳与任务队列文件） | `node scripts/init-fbs-multiagent-artifacts.mjs --book-root <本书根>` |
| 扫描磁盘章节 vs 依赖声明 | `node scripts/sync-book-chapter-index.mjs --book-root <本书根> --json-out .fbs/chapter-scan-result.json` |
| 依赖满足后的派发提示 | `node scripts/chapter-scheduler-hint.mjs --book-root <本书根>` |
| 引用禁止格式启发式 | `node scripts/citation-format-check.mjs --skill-root <技能根> --chapter-file <章.md>` |
| 多义缩写出现提示 / `--strict` 对照 GLOSSARY | `node scripts/terminology-gate.mjs --skill-root <技能根> --book-root <本书根> --chapter-file <章.md>` |
| 心跳超时巡检 | `node scripts/heartbeat-monitor.mjs --book-root <本书根> --emit-actions`（按 2m 预警 / 5m ping / 10m shutdown / 15m critical / shutdown后30s强制终止） |
| 失败后任务队列 | 在 `.fbs/task-queue.json` 中查看失败任务；人工或宿主重派 |
| 宿主误报失败时核对落盘稿 | `node scripts/verify-expected-artifacts.mjs --book-root <本书根>`（可加 `--expect-s0` / `--expect-chapter N`、`--since-minutes`、`--strict`） |

---

## S3 启动前（team-lead）：并行包初始化

请先在本项目本书根目录约定工作区，并执行（路径按本机调整）：

`node scripts/init-fbs-multiagent-artifacts.mjs --book-root <本书根>`

确认已存在：`.fbs/chapter-status.md`、`chapter-status.md`（本书根快照）、`chapter-dependencies.json`、`GLOSSARY.md`、`book-context-brief.md`、`search-ledger.jsonl`、`project-config.json`、`member-heartbeats.json`、`task-queue.json`、`rate-budget.json`、`high-quality-domains.json`、`material-library.md`、`author-meta.md`、`insight-cards.md`、`术语锁定记录.md`、`规范执行状态.md`、`esm-state.md`、`writing-notes/pending-verification.md`（共17个工件；缺项可加 `--force` 重建）。

随后执行扫描（**避免 MEMORY 与磁盘脱节**，测试报告 01）：

`node scripts/sync-book-chapter-index.mjs --book-root <本书根> --json-out .fbs/chapter-scan-result.json`

---

## 协调角色（P0，测试报告 07 — 并行团队 **默认应启用**）

在 **≥3 名并行成员** 时，team-lead **应**固定增设（可由同一宿主会话轮换，但职责分离）；仅当用户书面确认「极简成员数」时可裁剪，并须在 `.fbs/project-config.json` 留痕说明。

1. **术语联络（Glossary liaison）**：维护 `.fbs/GLOSSARY.md`；响应他章对缩写含义的 `@` 询问；与 `terminology-gate.mjs` 结果对齐。  
2. **数据联络（Data / citation liaison）**：维护 `book-context-brief.md` 数据点表；抽查 `citation-format-check.mjs` 报告。  

二者经 `send_message` 答复其他 Writer，**不必**经 team-lead 中转每一条，但 **team-lead 仍保留合并与台账最终裁量权**。

---

## S3 多 Writer 并行：任务批次与依赖（复制给 team-lead）

请按 **S2 目录** 与 `.fbs/chapter-dependencies.json` 中的 **dependsOn** / **batch** 派发；并用 `chapter-scheduler-hint.mjs` 复核「依赖已齐、本稿仍缺」的章节。

1. **批次 1**：无依赖或可并行的章节可同时启动。  
2. **批次 2+**：仅当前置章节在 **磁盘上已有成稿** 且 `chapter-status.md` 为 **已完成** 后再启动下游章。  
3. 每位 Writer 的任务描述中 **必须** 附带：  
   - 下文 **「Writer 质量红线（强制）」** 整块；  
   - `citation-format.md` 摘要或路径；  
   - `.fbs/GLOSSARY.md` 路径；  
   - **本章写完后** 须更新 `chapter-status.md` + `book-context-brief.md` 并向 team-lead 汇报。

**完成通知模板**（成员 → team-lead）（测试报告 09：增加质量字段）：

```text
[章节完成]
章节：
文件路径：
字数（约）：
chapter-status.md 已更新：是/否
book-context-brief.md 已更新：是/否
质量自检（折算/10，自评）：
S层禁词/标点：已扫 / 未扫
本章数据来源索引：已附 / 未附
易多义缩写（OPC 等）：已对照 GLOSSARY / 不适用
去AI味自检（quality-AI-scan 模板）：已填 / 未填（未填须说明原因）
```

---

## Writer 质量红线（强制粘贴进每个 Writer 任务）

> **测试报告 09**：team-lead 须在任务描述 **靠前位置** 包含下列整块；模型 **不得**在未收到本块时假装已遵守全书红线。

```markdown
## 质量红线（写作前读，交稿前自检）

1. **S 层（逐条自检，交稿前必做）**  
   - **禁用词**：A/B/C 类见 `quality-S.md` — 全文扫描，B 类 buzzword **须为 0**。  
   - **S6 破折号**：全文检索 `——`；若估算密度 **>1 次/千字**，逐条按 `quality-S.md` S6「AI 典型滥用模式」与替换速查改写（禁止只批量「——→，」糊弄）。  
   - **句长**：单句超 40 字须拆分；超 40 字句占比 **≤10%**（估算即可，须诚实）。  
   - **留痕**：建议填 `references/02-quality/quality-AI-scan.md` 表格贴到任务回复或章末。  
2. **数据**：`quality-PLC.md` §C4 — 禁止无来源的「精确」数字与整数百分比堆砌；无来源须写「待核实」。  
3. **引用**：`citation-format.md` — A 级行内括注 + 章末 **## 本章数据来源索引**；提交前团队可跑 `citation-format-check.mjs`。  
4. **术语**：`.fbs/GLOSSARY.md` — 多义缩写须与表一致；可 `@` 术语联络确认。  
5. **检索**：本书已初始化 `.fbs/` 时，`enforce-search-policy.mjs` 门槛须过（每章 ≥2 次等，以 `search-policy.json` 为准）。  
6. **落盘与宿主 UI**：交稿前确认 **`[S3-Ch…]`** 本章 md 已在本书根 **非空保存**；若 WorkBuddy 仅显示「生成失败 unknown」等，**仍以磁盘文件为准**，必要时请主编运行 `node scripts/verify-expected-artifacts.mjs --book-root <本书根> --expect-chapter <N> --strict`。
```

---

## S3 三审并行（单章审校）

请为当前书籍项目创建一个用于「阶段 S3 三审」的工作安排（可用 WorkBuddy 多成员并行）：

1. **成员 A（合规 / G 层）**：按 `references/02-quality/quality-S.md` 中与合规重叠部分及项目关键词配置，对正文做学术与合规扫描；**多路并行全书**时 **G4 默认启用**（数据来源与 `citation-format.md` 对齐）。  
2. **成员 B（段落 / P 层）**：按 `references/02-quality/quality-PLC.md` §P 做逐段检查。  
3. **成员 C（章节 / C 层）**：按 `references/02-quality/quality-PLC.md` §C 做章级结构检查（含 **C5 衔接**）。

三成员并行输出各自问题清单，最后由主编合并结论。**建议**成员 A/B/C 在发现跨章冲突时 **互相 `@` 或抄送术语/数据联络**，不仅汇总到 team-lead。

---

## 横向协作（测试报告 07 — **默认应** 开启轻量横向）

在保持 **台账以 `.fbs/` 为准** 的前提下，**应**安排成员经 `send_message` 做数据点/术语的快速对齐，减少「多路 Writer、零横向通信」的孤岛写作。**禁止**仅以口头结论覆盖 `chapter-status.md` 未更新的状态。

---

## 心跳与超时 SOP（宿主无自动监控时）

成员或宿主应将心跳写入 `.fbs/member-heartbeats.json`；team-lead 定时检查该文件中各成员的 `lastHeartbeat` 时间戳，对超时成员按下表 SOP 处理：

| 无响应时长 | team-lead 动作 |
|------------|----------------|
| ~2 min | 预警（WARN）：记录状态并提示成员回报 |
| ~5 min | `send_message` 催更（PING） |
| ~10 min | 发送 `shutdown_request`，准备改派 |
| ~15 min | 标记 CRITICAL：停止等待，立即改派 |
| `shutdown_request` 后 30s 仍无响应 | 强制终止（force terminate）并记录到台账 |

审查任务禁止「单成员全量扫描超大稿」；须按章节 / 抽样 / 字数上限拆分。

---

## 数据引用格式广播块（粘贴进每个 Writer 任务）

```markdown
## 数据引用（强制）

- 正文数字主张：使用 `citation-format.md` **A 级**行内括注（机构，《报告》，日期；尽量带 URL）。  
- 每章末尾须有 **## 本章数据来源索引**（C 级表）。  
- 检索痕迹：`## 检索执行记录` 或 frontmatter `fbs_search_queries: N` 或 `.fbs/search-ledger.jsonl`（与 `enforce-search-policy.mjs` 对齐）。  
- 全书禁止混用多种互不兼容格式（如无定义的 `[1]`、`【来源】`、与正文无关的孤立脚注）。
```

---

## S5 终审并行

请为当前书籍项目安排「阶段 S5 终审」并行核对：

1. **成员 A（篇级 B 层）**：按 `references/02-quality/quality-PLC.md` §B 做篇级质量终审。  
2. **成员 B（视觉×内容）**：按 [`08-visual.md`](../03-product/08-visual.md) §3 做插图/图表与正文相关性检查。  
3. **成员 C（全书 C0 + CX）**：按 [`book-level-consistency.md`](../02-quality/book-level-consistency.md) 执行 **C0-1 / C0-2 / C0-4**；**多路并行合稿**时须先完成或并行完成 [`cross-chapter-consistency.md`](../02-quality/cross-chapter-consistency.md) 全书 **CX** 报告（提示词模板见 [`book-auditor-prompt.md`](../03-product/book-auditor-prompt.md)）。

并行完成后输出合并终审报告；**C0 未通过不得等同终稿通过**（与 `quality-check.md` C0、`section-3-workflow` **S5-G5** 一致）。
