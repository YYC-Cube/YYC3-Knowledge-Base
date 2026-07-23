# 规范分层与「等效减量」策略（P2）

**版本**：1.59D

## 目标

在**不删减规范义务**的前提下，通过**加载策略**降低默认上下文体积与首包延迟——审计中所述「等效约 −87% token」指：**默认轮次不注入全文长规范**，而非删除仓库内文档。

## 分层（与 SKILL 对齐）

| 层级 | 内容 | 默认是否注入 |
|------|------|----------------|
| **L0** | `SKILL.md` Frontmatter、规范索引表、§3–§8 指针 | 是 |
| **L0'** | 本文件、`execution-contract-brief.md`、宿主侧 WorkBuddy  foundation（按需一句指向） | 推荐与 L0 同轮或次轮 |
| **L1** | `skill-authoritative-supplement.md`（§0/§1/§2/§5 等） | 按需 Read |
| **NLU** | `section-4-commands.md` **禁止全文**默认加载；按用户短指令再展开 | 否（默认） |

## 实践规则

1. **同轮 Read ≤ 3 份长规范**（SKILL 已述）；优先 `FBS_CONTEXT_INDEX.md` 与单路径 `@`。
2. **P0 义务**仍以 JSON + 被点名的条文为准；未加载某 Markdown **不免除**磁盘台账与门禁。
3. **维护者**改规范时同步 `skill-index`、`p0-cli-map`、脚本头注释，避免「条文与工具脱节」。

## 与脚本的关系

机读配置优先 `search-policy.json`；CLI 列表见 `p0-cli-map.md` 与 `p0AutomationIndex`。
