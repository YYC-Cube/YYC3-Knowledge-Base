---
name: FBS-BookWriter 文档索引
description: FBS-BookWriter 完整文档导航与分类索引
---

> **版本**：1.59D（与 SKILL.md frontmatter version 对齐）

# FBS-BookWriter 文档索引

> **索引范围**：`references/` 各子目录 + 根目录 `SKILL.md`

---

## 🤖 AI 与宿主：技能快速学习路径（优先入口）

> **适用**：用户说「读取你自己 skill 的文档」「先学习技能」「技能能力概览」「规范在哪」等。  
> **禁止**：无导航时随机只打开某一深章（如仅 `section-3-workflow`）代替对技能包的整体理解。

| 顺序 | 文档 | 目的 |
|------|------|------|
| 1 | [`SKILL.md`](../../SKILL.md)（**技能加载后的行为约定** + L0 指针；长条文见 [`skill-authoritative-supplement.md`](./skill-authoritative-supplement.md)） | 触发词首响、身份自述、路径自认知 |
| 1b | [WorkBuddy × 本 Skill 全局洞察](../05-ops/workbuddy-skill-foundation.md) | **宿主优先**：官方用户旅程与本书工作流对齐；助手与朋友式终局验收 |
| 1c | [承诺与实践对照](../05-ops/promise-code-user-alignment.md) | 文档承诺、用户建议、可用工具 **一张表**；避免「读了规范以为全自动」 |
| 2 | 本页 **快速导航 → 核心规范** | 一次看清 P0 文件清单 |
| 3 | [工作流设计](./section-3-workflow.md)（**v1.7.0 执行状态机 ESM** 8 状态 × 3 体裁、体裁分流速查、调研收束力场、产出驱动螺旋；**§3.0.55** 阶段顺序、**§3.0.5** 检索、**S2→S3 硬性门禁**） | ESM 自检 + 流程门禁 + 大纲确认 |
| 4 | [联网检索策略](../05-ops/search-policy.json) | 阶段与每章最少检索次数 |
| 5 | 按需 | [质量检查](../02-quality/quality-check.md)、[引用格式](../02-quality/citation-format.md)、[跨章一致性](../02-quality/cross-chapter-consistency.md)、[指令系统](./section-nlu.md)、[策略矩阵](../04-business/strategy.md) |

---

## 📋 快速导航

### 🔴 写作者 / 成书主编（核心）

| 文档 | 主题 | 用途 | 优先级 |
|------|------|------|--------|
| [SKILL.md](../../SKILL.md) | FBS-BookWriter 完整规范 | 总纲和核心定义 | **P0** |
| [质量检查体系](../02-quality/quality-check.md) | 四层检查单 + 评分公式 | 质量标准参考 | **P0** |
| [引用格式](../02-quality/citation-format.md) | A/B/C 标注与并行写作约定 | 多 Writer 统一引用 | **P0** |
| [跨章一致性](../02-quality/cross-chapter-consistency.md) | 全书 **CX** 审查清单 | 多路并行合稿 | **P0** |
| [Book Auditor 模板](../03-product/book-auditor-prompt.md) | CX 审校提示词（可复制） | 多路并行 | **P0** |
| [架构模式说明](../05-ops/architecture-modes.md) | 单智能体 vs 多成员并行边界 | 主编决策 | **P1** |
| [产品框架](../03-product/05-product-framework.md) | 产品定位与质量门禁 | 战略决策依据 | **P0** |
| [工作流设计](./section-3-workflow.md) | **ESM 执行状态机（v1.8.0）** + 七阶段执行流程 | 状态机调度 + 项目管理 | **P0** |
| [技术实现](./section-6-tech.md) | 环境预检 + 心跳协议 + 变现执行 | 技术方案参考 | **P0** |
| [WorkBuddy × 本 Skill（全局洞察）](../05-ops/workbuddy-skill-foundation.md) | 官方用户旅程 × S0–S6；助手与朋友 | WorkBuddy 用户入手必读 | **P0** |
| [多智能体委派话术](./workbuddy-agent-briefings.md) | S3/S5 自然语言模板（WorkBuddy 等） | 宿主侧并行审查 | **P0** |
| [Coordinator / Arbiter 话术](./coordinator-arbiter-briefs.md) | 调度门禁与冲突仲裁 | team-lead | **P1** |
| [联网检索策略](../05-ops/search-policy.json) | 强制检索阶段与每章次数 | 质量门禁配置 | **P0** |
| [主题一致性门禁](../05-ops/topic-consistency-gate.md) | 防上下文跳变；与 `topicLock`、C0-4、NLU 对齐 | 长会话 / 多书并行 | **P0** |
| [HTML 交付门禁](../05-ops/html-deliverable-gate.md) | **D1/D2/D3**、`build.mjs` 脚注、`html-delivery-smoke.mjs` | S4 / 主编验收 | **P0** |
| [WorkBuddy 用户记忆策略](../05-ops/workbuddy-user-memory-strategy.md) | 记忆演进下的 opt-in 摄取、CLI、与主题锁关系 | WorkBuddy 深度用户 | **P1** |
| [首次使用与环境迭代（分级策略）](../05-ops/workbuddy-first-use-environment-tiered-strategy.md) | 冷启动 + 环境指纹（Tier 0–2） | 主编首次配置 | **P1** |
| [承诺与实践对照](../05-ops/promise-code-user-alignment.md) | 文档承诺、用户建议、可用工具一张表 | 入手必读 | **P0** |
| [P0→CLI 映射表](../05-ops/p0-cli-map.md) | 规则与脚本/工件对照；综合审计 P1-2 | 维护者 / CI | **P1** |
| [执行契约简报](./execution-contract-brief.md) | 宿主×模型×磁盘 SoT、P2 补充 | 合稿 / 多智能体 | **P1** |
| [规范分层与等效减量](../05-ops/spec-layering-strategy.md) | L0/L1、token 策略说明 | 宿主配置 | **P2** |
| [VCR 启发式简报](../05-ops/vcr-heuristic-brief.md) | 三条机读规则 + quality-auditor 开关 | S5 / CI 可选 | **P2** |
| [多智能体横向协同](../05-ops/multi-agent-horizontal-sync.md) | 磁盘清单、冲突上升 | 并行写作 | **P2** |
| [品牌克制露出](../05-ops/brand-outputs.md) | 版权页/页脚等品牌露出约束 | 对外发布必读 | **P1** |
| [国家标准与编校清单](../05-ops/national-standards-editorial-checklist.md) | CY/T 266、GB/T 15834/35、7714 | Proofer 专项参考 | **P1** |
| [Task 角色别名表](./task-role-alias.md) | Critic-* / Researcher 与用户话术 | 多智能体编排对齐 | **P1** |
| [记忆与本书项目（CodeBuddy）](../05-ops/codebuddy-memory-workbuddy-integration.md) | `CODEBUDDY.md`、条件规则、按需 `@` | 降 token、与 Skill 协同 | **P1** |

---

### 🟠 质量体系文档（检查与评分）

| 文档 | 内容 | 何时使用 | 相关章节 |
|------|------|---------|---------|
| [质量检查](../02-quality/quality-check.md) | S/P/C/B/V1 检查单 + **C0 全书门禁** + 评分公式 | 全阶段 / **S5 终稿前** | §1-§4、C0 |
| [全书级一致性](../02-quality/book-level-consistency.md) | 破折号全书总账、术语表、Writer↔S6 闭环 | **合稿 / 多路并行汇编 / S5** | C0-1—C0-3 |
| [S层规则](../02-quality/quality-S.md) | 句级自扫描规则（6条） | S3阶段 Critic-S任务 | 6条规则 |
| [去AI味自检报告模板](../02-quality/quality-AI-scan.md) | S 层表格化留痕（破折号/禁用词等） | Writer 交稿前 / 并行留档 | 对齐实战复盘 |
| [P/C/B层规则](../02-quality/quality-PLC.md) | 段级(4条) + 章级(4条) + 篇级(5条) | S3阶段 Critic-L1/L2/L3 | §P §C §B |
| [指标体系](../02-quality/metrics.md) | 20分模型 → 10分折算 + 指标追踪 | 评分计算时 | 7个维度 |
| [L3语义接口](../02-quality/L3-semantic-interface.md) | B2B语义相关性评分规范 | 企业对接场景 | 接口标准 |
| [缩写审计词表](../02-quality/abbreviation-audit-lexicon.json) | 多义缩写条目（与 terminology-gate.mjs 联动） | C0-2 术语审计 | C0-2 |
| [S5流行词词表](../02-quality/s5-buzzword-lexicon.json) | B类禁用词列表（与 quality-auditor.mjs 联动） | S5 文风审计 | S5 B类词 |

---

### 🎨 Mermaid 图表模板（视觉密度 V1 支撑）

> **V1 达标**：每 5000 字 ≥ 1 个 Mermaid/表格/流程块（`quality-check.md §V1`）。下列模板可直接复制使用。

| 模板 | 适用场景 | 相关规范 |
|------|---------|---------|
| [流程图](../03-product/mermaid-templates/flowchart.md) | 操作流程/决策树 | V1 视觉密度 |
| [甘特图](../03-product/mermaid-templates/gantt.md) | 项目计划/时间线 | V1 视觉密度 |
| [思维导图](../03-product/mermaid-templates/mindmap.md) | 概念结构/知识图谱 | V1 视觉密度 |
| [时序图](../03-product/mermaid-templates/sequence.md) | 系统交互/角色协作 | V1 视觉密度 |
| [状态图](../03-product/mermaid-templates/state.md) | 状态机/ESM 流程 | V1 视觉密度 |
| [时间线](../03-product/mermaid-templates/timeline.md) | 历史沿革/版本演进 | V1 视觉密度 |

---

### 🟡 执行流程文档（工作规范）

| 文档 | 主题 | 适用阶段 | 关键内容 |
|------|------|---------|----------|
| [工作流设计](./section-3-workflow.md) | **ESM 状态机** + S0前置调研 + 七阶段流程 | 全流程 | ESM 自检 + S0–S6 执行步骤 |
| [策略矩阵](../04-business/strategy.md) | 联网搜索策略 + 运行经验 | S1阶段 + 全流程 | 三大铁律 |
| [前置调研](../05-ops/S0-research-module.md) | S0调研模块设计 | S0阶段 | 需求分析 |
| [指令系统](./section-nlu.md) | 核心意图 + 66 条短指令分类 | 任意阶段 | 指令参考 |
| [心跳协议](../05-ops/heartbeat-protocol.md) | Task心跳 + 阶段播报 | 全流程监控 | 心跳机制 |

---

### 🟢 产品与交付文档（用户侧）

| 文档 | 主题 | 文档类型 | 面向对象 |
|------|------|---------|----------|
| [UX设计](../03-product/07-ux-design.md) | 等待体验 + 透明度设计 | 用户体验 | 产品团队 |
| [交付体系](../05-ops/delivery.md) | 一键导出 + 4种交付选项 | 产品功能 | 最终用户 |
| [交付指南](../05-ops/delivery-guide.md) | 从MD/HTML到多格式输出 | 用户指南 | 最终用户 |
| [用户安装指南](../03-product/01-user-install-guide.md) | 可选依赖安装说明 | 安装指南 | 按需使用 |
| [内容模板](../03-product/04-templates.md) | Markdown模板系统 | 内容参考 | 内容创作者 |

---

### 🔵 架构与配置文档（系统侧）

| 文档 | 主题 | 层级 | 用途 |
|------|------|------|------|
| [协同机制](../04-business/team-protocol.md) | 协作角色映射 + 多Agent协作 | 系统架构 | 多Agent编排 |
| [拟人化配置](../03-product/03-persona.md) | 组织/成员/风格切换 | 系统配置 | 定制化设置 |
| [风格预设](../03-product/02-presets.md) | 千书千面 - 五个快捷预设 | 配置样板 | 快速开始 |
| [排版规范](../03-product/06-typography.md) | 中文排版底线规范 | 文档规范 | 质量检查 |
| [视觉资产](../03-product/08-visual.md) | 封面 + 插图 + 图表生成策略 | 美学规范 | 视觉生成 |
| [构建系统](../05-ops/build.md) | 构建流程 + 降级策略 | 技术规范 | 部署实施 |
| [CodeBuddy 书项目模板](../05-ops/templates/codebuddy-book-project/CODEBUDDY.snippet.md) | CODEBUDDY.md 片段模板（含规则 + 快捷方式） | 配置模板 | CodeBuddy 用户首次配置 |
| [CodeBuddy 书项目 README](../05-ops/templates/codebuddy-book-project/README.md) | 模板使用说明 | 文档 | CodeBuddy 配置向导 |
| [FBS 按需规则模板](../05-ops/templates/codebuddy-book-project/rules/fbs-bookwriter-on-demand.md.template) | `requested` 型规则模板（与 skill-index 联动） | 规则模板 | 主编按需加载规则 |

---

### 🟣 商业与策略文档

| 文档 | 主题 | 决策类型 |
|------|------|----------|
| [策略矩阵](../04-business/strategy.md) | 联网搜索三大铁律 + 运营经验 | 执行指引 |
| [用户画像模板](../03-product/09-user-profile-template.md) | 自动生成模板 | 用户分析 |

---

### ⚪ 专项参考文档

| 文档 | 内容 | 何时查阅 |
|------|------|---------|
| [案例库](../03-product/10-case-library.md) | 真实写作素材库 | 需要参考案例时 |
| [关键词库](../02-quality/keywords.md) | 学术风险关键词 | S1阶段扫描配置 |
| [新手引导](./section-8-onboarding.md) | 新用户学习路径 | 用户成长阶段 |
| [新手指令](./section-4-commands.md) | 66 条指令完整列表 | 指令查询时 |
| [大规模写作策略](../05-ops/large-scale-book-strategy.md) | M1/M2/M3 分规模增强机制 | ≥20万字项目规划 |

---

## 🔗 文档关系网络

### 质量保障链路

```
质量检查.md (总体规范)
    ├── S层规则.md (句级检查)
    ├── P/C/B层规则.md (段篇章级)
    ├── 指标体系.md (评分计算)
    └── L3语义接口.md (B2B对接)
```

### 执行流程链路

```
SKILL.md §3 (工作流总纲)
    ├── 前置调研.md (S0阶段)
    ├── 策略矩阵.md (搜索策略)
    ├── 工作流设计.md (七阶段详解)
    ├── 心跳协议.md (过程监控)
    └── 交付体系.md (最终输出)
```

### 产品配置链路

```
产品框架.md (产品总定位)
    ├── 协同机制.md (Agent配置)
    ├── 拟人化配置.md (组织配置)
    ├── 风格预设.md (快速模板)
    ├── 内容模板.md (文档模板)
    └── 排版规范.md (质量规范)
```

---

## 🎯 使用指南

### 按角色查找文档

**✍️ 写作者 / 主编**
- [工作流设计](./section-3-workflow.md) - 执行流程
- [质量检查](../02-quality/quality-check.md) - 自检清单
- [引用格式](../02-quality/citation-format.md) - 规范引用

**🔧 有 Node.js 环境的用户**
- [技术实现](./section-6-tech.md) - 技术架构
- [联网检索策略 JSON](../05-ops/search-policy.json) - 门禁配置
- [心跳协议](../05-ops/heartbeat-protocol.md) - 监控机制

**🎨 内容创作者**
- [内容模板](../03-product/04-templates.md) - 创作模板
- [排版规范](../03-product/06-typography.md) - 排版标准
- [视觉资产](../03-product/08-visual.md) - 美学指南

### 按场景查找文档

**🚀 项目启动**
1. [产品框架](../03-product/05-product-framework.md) - 理解产品定位
2. [工作流设计](./section-3-workflow.md) - 了解执行流程
3. [协同机制](../04-business/team-protocol.md) - 配置协作机制

**✨ 内容创作**
1. [内容模板](../03-product/04-templates.md) - 选择合适模板
2. [排版规范](../03-product/06-typography.md) - 遵循排版规则
3. [质量检查](../02-quality/quality-check.md) - 自检内容质量

**📊 质量评审**
1. [质量检查](../02-quality/quality-check.md) - 查看检查清单
2. [S层规则](../02-quality/quality-S.md) & [质量PLC](../02-quality/quality-PLC.md) - 具体检查规则
3. [指标体系](../02-quality/metrics.md) - 评分计算方法

---

## 🔍 索引快速查询

**"质量"** → [质量检查](../02-quality/quality-check.md) | [指标体系](../02-quality/metrics.md) | [质量PLC](../02-quality/quality-PLC.md)

**"执行"** → [工作流设计](./section-3-workflow.md) | [策略矩阵](../04-business/strategy.md) | [前置调研](../05-ops/S0-research-module.md)

**"ESM" / "状态机"** → [工作流设计 · ESM 执行状态机](./section-3-workflow.md)（8 状态 × 3 体裁、运行时自检、状态转换宣告）

**"体裁" / "体裁分级" / "Report Brief"** → [工作流设计 · 体裁分流快速参照](./section-3-workflow.md) | [工作流设计 · Report Brief](./section-3-workflow.md)

**"调研收束" / "起稿门槛"** → [工作流设计 · 调研收束力场](./section-3-workflow.md)

**"用户"** → [UX设计](../03-product/07-ux-design.md) | [新手引导](./section-8-onboarding.md) | [用户画像](../03-product/09-user-profile-template.md)

**"配置"** → [协同机制](../04-business/team-protocol.md) | [拟人化配置](../03-product/03-persona.md) | [风格预设](../03-product/02-presets.md)

**"商业"** → [策略矩阵](../04-business/strategy.md)

**"技术"** → [技术实现](./section-6-tech.md) | [构建系统](../05-ops/build.md) | [协同机制](../04-business/team-protocol.md)

**"部署"** → [构建系统](../05-ops/build.md) | [用户安装指南](../03-product/01-user-install-guide.md) | [交付体系](../05-ops/delivery.md)

---

## ✅ 快速开始检查清单

- [ ] 已阅读 [SKILL.md](../../SKILL.md) 主文档
- [ ] 理解了[产品框架](../03-product/05-product-framework.md) 的定位
- [ ] 熟悉了[工作流设计](./section-3-workflow.md) 的执行流程
- [ ] 了解了[质量检查](../02-quality/quality-check.md) 的评分体系
