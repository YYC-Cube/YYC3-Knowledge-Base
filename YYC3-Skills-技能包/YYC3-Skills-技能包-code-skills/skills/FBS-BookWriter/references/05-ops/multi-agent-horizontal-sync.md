# 多智能体横向协同（磁盘清单协议）

**版本**：1.59D · **优先级**：P2（宿主层；不替代主编仲裁）

## 原则

多 Writer **不以对话为 SoT**，以**本书根下磁盘文件**为唯一可合并真值。Coordinator 只分发路径与门禁，不假设其他成员「已读过同一段对话」。

## 写入边界

| 工件 | 约定 |
|------|------|
| 章成稿 | 每人仅写分配章节路径；禁止覆盖他人文件除非走合稿分支流程。 |
| `.fbs/search-ledger.jsonl` | **追加** JSONL；冲突字段用新行说明更正，不原地篡改历史行（便于审计）。 |
| `术语锁定记录.md` | 主编或单一「术语 Owner」合并；Writer 只追加「建议」或 PR 式说明节。 |
| `pending-verification.md` | 各 Writer 可追加 `- [ ]` 项；清零责任在主编或 S5 前 CLI。 |

## 最小同步清单（每轮并行写前）

1. 本书 `FBS_CONTEXT_INDEX.md` 或主编指定的 Brief 路径已更新。  
2. `search-policy.json` 当前体裁与检索阶段无异议。  
3. 本章 `[S3]*.md`（若存在）与 `Chapter Brief` 文件名、章节 ID 一致。  
4. 引用格式与数据源索引约定与 `citation-format.md` 一致（避免合稿时双轨脚注）。

## 冲突处理

- **内容冲突**：上升 Critic / Arbiter（见 `coordinator-arbiter-briefs.md`），**输出落盘**到 `writing-notes/` 决议摘要，再改正文。  
- **工具未跑**：以 `p0-cli-map.md` 为准；声称「已过门禁」须对应命令与退出码 0。

## 与执行契约关系

见 `references/01-core/execution-contract-brief.md`（宿主职责与磁盘 SoT）。
