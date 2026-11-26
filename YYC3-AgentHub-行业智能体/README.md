---
file: README.md
title: YYC³ AgentHub 行业智能体 — 开源智能体行业分类总索引
description: 15 类行业/职能 + 5 项历史留存、105 项开源仓库的总索引：命名依据、分类定位、仓库映射、文件树与跨类去重溯源
author: YYC³ Team <admin@0379.email>
version: v2.0.0
created: 2026-11-26
updated: 2026-11-26
status: stable
tags: [总索引, 行业智能体, 开源多行业库, AgentHub, 导航]
category: general
language: zh-CN
audience: developers,researchers,managers
complexity: intermediate
---

# YYC³ AgentHub 行业智能体 — 开源智能体行业分类总索引

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 核心理念

**五高架构**：高可用 | 高性能 | 高安全 | 高扩展 | 高智能
**五标体系**：标准化 | 规范化 | 自动化 | 可视化 | 智能化
**五化转型**：流程化 | 数字化 | 生态化 | 工具化 | 服务化
**五维评估**：时间维 | 空间维 | 属性维 | 事件维 | 关联维

---

## 一、总览

本工作区按「**一行业一分类、一分类一闭环**」组织：**15 个行业/职能分类**收录 **100 个开源仓库**，另有 **5 项历史留存项目**，合计 **105 项**、**270,100 个文件**、**5.41 GB**。每个分类目录含独立 `README.md`（分类定位 + 仓库映射 + 文件树索引），本总索引实现全库导航与去重溯源。

### 1.1 命名依据（v2.0.0 更名）

| 项 | 内容 |
| --- | --- |
| 原目录名 | `YYC3-GitHub-学习汇集/` |
| 现行目录名 | `YYC3-AgentHub-行业智能体/` |
| 更名依据 | 目录内容并非「GitHub 学习资料」，而是 **15 类行业/职能场景下的开源 AI 智能体与技能工程仓库**（通用底座 → 智能编程 → 外呼 → 营销 → 企业管理 → 获客 → 餐饮 → 电商 → 教育 → 短剧 → 文档 → 音乐 → 医疗合规 → RAG → 创意技能），故以 `AgentHub-行业智能体`（英中双段，与 `YYC3-AI-应用工具` / `YYC3-Skills-技能包` 等既有分类同族）定名 |
| 目录内层级 | `{NN-行业分类}/{开源仓库原名}`，仓库名保持上游原名，不做 ASCII 前缀改写 |
| 治理口径 | 本目录为**本地留档**（体积过大不入库），仓库内仅同步 `docs/` 摘要文档与 Pages 看板 |

### 1.2 拉取与去重口径

> **拉取方式**：浅克隆（`--depth 1 --single-branch --no-tags`），仓库内不含 `.git` 历史。
> **跨类去重**：与知识库既有分类重复的 8 项按「**保留完整版**」规则，以**新版本合并覆盖**至既有分类目录（保留旧目录独有文件，既有分类 README 路径不变），本汇集内不再留存副本 —— 详见「四、跨类去重说明」。

---

## 二、分类导航与定位

| 分类 | 目录 | 仓库数 | 主题 | 场景/行业定位 |
| ---- | ---- | ------ | ---- | -------------- |
| 🧠 通用底座 | `00-common/` | 11 | 智能体通用框架 · 官方 Skills · 编排底座 | 面向全行业智能体研发的公共地基：框架层（LangChain / crewAI / Mastra / AutoGPT / OpenAI Agents）提供编排与工具调用底座，官方 Skills 层沉淀可复用能力，是其余十四个行业分类共同依赖的元层 |
| 💻 智能编程 | `01-coding/` | 6 | 编码智能体 · 工程编排 · 程序员技能集 | 面向软件工程全流程的智能编程阵营：通用编码智能体（OpenHands、opencode）负责端到端开发，编排器（agent-orchestrator、ECC）负责多任务协同，技能集补齐程序员工作流 |
| 📞 智能外呼 | `02-outbound/` | 5 | 实时语音 · 电话外呼 · 呼叫中心 | 面向电话语音场景的实时交互阵营：pipecat 提供实时语音多模态框架底座，呼叫中心与外呼智能体（ai-native-callcenter、amber-openclaw-voice-agent）落地业务，WhoBot 技能集打通话术与工具 |
| 📣 内容营销 | `03-content-marketing/` | 6 | 营销自动化 · SEO/GTM · Agentic CMO | 面向内容生产与营销增长阵营：以 Agentic CMO 重构营销负责人角色，营销/SEO 工作流技能（marketing-skills、sandbase-skills）与投放智能体（adclaw、Vibe-Marketer）形成内容增长闭环 |
| 🏢 企业管理 | `04-enterprise/` | 6 | 企业级智能体平台 · 多 Agent 组织 · PM/办公技能 | 面向企业运营与组织协同阵营：MetaGPT 树立「多智能体软件公司」范式，agno 与 paperclip 提供企业级智能体平台，agent-skills 系列与 pm-skills 覆盖职能技能与项目管理 |
| 🎯 智能获客 | `05-lead-gen/` | 5 | 销售开发 · 私域拓客 · GTM 自动化 | 面向获客增长的智能销售阵营：GTM 智能体自动化销售开发流程，国产私域拓客系统（HiveMtk、拓客智能体）落地微信生态，Sumble 数据技能注入情报能力 |
| 🍽️ 餐饮门店 | `06-restaurant/` | 7 | 餐饮经营 · 点餐收银 · 门店营销 | 面向餐饮门店数字化经营阵营：覆盖经营顾问（数字化诊断）、门店智能体组（restaurant-agent）、点餐收银与营销技能（QRMasa、restaurant-marketing-skills） |
| 🛒 电商协同 | `07-ecommerce/` | 7 | 电商运营 · 多 Agent 商务 · 平台技能 | 面向电商全链路协同阵营：Anthropic 官方 Commerce Agents 确立商务智能体范式，多 Agent 电商系统（multi-agent-ecommerce-system）串联选品·运营·客服，Amazon 与商用技能集补齐平台规则 |
| 🎓 智能教育 | `08-education/` | 4 | AI 辅导 · 教育智能体 · 多智能体教学 | 面向教育教学的智能辅导阵营：DeepTutor 提供深度学科辅导，清华 OpenMAIC 探索多智能体互动课堂，教育技能集沉淀教研工作流 |
| 🎬 视频短剧漫剧 | `09-short-drama/` | 7 | 短剧生成 · 剧本创作 · 视频流水线 | 面向 AI 短剧/漫剧内容工业阵营：从剧本创作与评估（screen-creative-skills）到生成平台（huobao-drama、ViMax、waoowaoo），再到短剧技能集（drama-skills、shuohao-skills） |
| 📜 文档闭环 | `10-doc-loop/` | 6 | 文档治理 · 法律合规文书 · 文档技能 | 面向文档全生命周期闭环阵营：以「文档即资产」理念覆盖编排式知识管理、法律文书与合规审查（claude-legal-skill、legal-mcp-agent）与文档技能工具链 |
| 🎵 AI 智能音乐 | `11-music/` | 5 | 音乐生成 · 音视频技能 · 陪伴智能体 | 面向 AI 音乐与音视频创作阵营：YuE 开源音乐大模型支撑词曲生成，music-skill 沉淀音视频技能，ATRI_AGENT 与 hermes-agent 探索情感陪伴式交互 |
| 🏥 医疗合规 | `12-medical-compliance/` | 5 | 医疗 AI · 临床决策 · 治理风险合规（GRC） | 面向医疗健康与合规风控阵营：临床辅助决策多智能体系统与 HippocratAI 覆盖医疗场景，EthicsBoard 与 GRC 技能集负责伦理、治理与合规审计 |
| 🧭 RAG 知识中枢 | `13-rag-hub/` | 11 | RAG 框架 · LLMOps 平台 · 知识库问答 · RAG 评测 | 面向企业知识中枢阵营：框架层（Haystack / LightRAG）支撑检索增强生成，平台层（AnythingLLM / RuoYi-AI / Yuxi）落地开箱知识库，评测层（RAGAS / TruLens）度量质量，技能工程贯通技能与知识 |
| 🎨 花叔创意技能 | `14-huashu/` | 9 | 花叔开源 Skills 全家桶 · 设计·动效·文档·贴纸 | 面向创意内容生产的花叔（alchaincyf）技能矩阵：总目录 huashu-skills 统领设计、动效、文档、表格、报告与贴纸等垂直技能 |

**小计**：15 类 · 100 项 · 另有 5 项历史留存（见「五、历史留存项说明」）· 合计 **105 项**

---

## 三、主核心文件树（图标可视化 · 含子项目）

```text
📁 YYC3-AgentHub-行业智能体/            （105 项 · 270,100 文件 · 5.41 GB）
├─ 📁 00-common/  🧠 通用底座（11）
│  └─ AutoGPT · agentskills · andrej-karpathy-skills · crewAI · impeccable · langchain · mastra · openai-agents-python · security-audit-skill · skills · taste-skill
├─ 📁 01-coding/  💻 智能编程（6）
│  └─ ECC · OpenHands · agent-orchestrator · opencode · ponytail · skills
├─ 📁 02-outbound/  📞 智能外呼（5）
│  └─ ai-native-callcenter · amber-openclaw-voice-agent · dograh-skills · pipecat · skills
├─ 📁 03-content-marketing/  📣 内容营销（6）
│  └─ Vibe-Marketer · adclaw · claude-skills · marketing-skills · open-agentic-cmo · sandbase-skills
├─ 📁 04-enterprise/  🏢 企业管理（6）
│  └─ MetaGPT · agent-skills · agent-skills-professional · agno · paperclip · pm-skills
├─ 📁 05-lead-gen/  🎯 智能获客（5）
│  └─ agents · claude-skills · gtm-agents · hivemtk · tuoke-agent
├─ 📁 06-restaurant/  🍽️ 餐饮门店（7）
│  └─ McArena · QRMasa · ai-restaurant-claude · hospitality-skills · restaurant-agent · restaurant-marketing-skills · restaurant-operation-digital-advisor
├─ 📁 07-ecommerce/  🛒 电商协同（7）
│  └─ Amazon-Skills · commerce-agents · e-commerce-agents · ecommerce-agents · multi-agent-ecommerce-system · skill · skill-ecommercial
├─ 📁 08-education/  🎓 智能教育（4）
│  └─ DeepTutor · OpenMAIC · education-agent-skills · hermes-edu-skills
├─ 📁 09-short-drama/  🎬 视频短剧漫剧（7）
│  └─ ViMax · awesome-short-drama-skills · drama-skills · huobao-drama · screen-creative-skills · shuohao-skills · waoowaoo
├─ 📁 10-doc-loop/  📜 文档闭环（6）
│  └─ 2026_AllThingsAI_OrchestrateAgenticAI · DocGov · claude-legal-skill · lavern · legal-mcp-agent · my-doc-skills
├─ 📁 11-music/  🎵 AI 智能音乐（5）
│  └─ ATRI_AGENT · YuE · hermes-agent · music-skill · skills
├─ 📁 12-medical-compliance/  🏥 医疗合规（5）
│  └─ Claude-Skills-Governance-Risk-and-Compliance · ethicsboard-ai · hippocrat-ai · medical-multi-agent-system · rote-compliance-skills
├─ 📁 13-rag-hub/  🧭 RAG 知识中枢（11）
│  └─ LightRAG · Skill-First-Hybrid-RAG · Vex-Skillgit · Yuxi · anything-llm · garden-skills · haystack · ragas · ruoyi-ai · skill_seekers · trulens
├─ 📁 14-huashu/  🎨 花叔创意技能（9）
│  └─ huashu-art-motion · huashu-bird-sticker · huashu-bookwriter · huashu-design · huashu-excel · huashu-md-html · huashu-motion · huashu-report · huashu-skills
├─ 📁 amis/  🧩 历史留存（1）· 低代码前端框架
├─ 📁 AngularCollections/  🧩 历史留存（1）· Angular 资源合集
├─ 📁 Dswjcms/  🧩 历史留存（1）· PHP CMS 系统
├─ 📁 nginx-book/  🧩 历史留存（1）· Nginx 源码与运维书籍
└─ 📁 Unlimited-OCR/  🧩 历史留存（1）· 无限制 OCR 推理工程
```

---

## 四、跨类去重说明（8 项）

以下 8 项与知识库既有分类重复。为避免改动全部既有分类 README，统一采取「**新版本合并覆盖旧目录、保留旧目录独有文件**」的处置：内容归位至既有分类目录，本汇集不再留存副本，既有路径与 README 均保持不变。

| 汇集内原位置 | 归位既有分类 | 仓库 | 处置结果 |
| ------------ | ------------ | ---- | -------- |
| `00-common/superpowers` | `YYC3-Tool-开发工具链/` | Superpowers 编码方法论技能集 | 已合并覆盖（146 → 276 文件） |
| `00-common/awesome-openclaw-skills` | `YYC3-Skills-技能包/` | OpenClaw 技能清单 | 已合并覆盖（32 → 35 文件） |
| `05-lead-gen/b2b-sdr-agent-template` | `YYC3-Business-商业应用/` | B2B SDR 智能体模板 | 已合并覆盖（82 → 176 文件） |
| `09-short-drama/Toonflow-app` | `YYC3-AI-应用工具/` | Toonflow 短剧生成应用 | 已合并覆盖（830 → 2,488 文件） |
| `13-rag-hub/dify` | `YYC3-AI-应用工具/` | Dify LLMOps 平台 | 已合并覆盖（14,087 → 20,160 文件） |
| `13-rag-hub/langgraph` | `YYC3-Agent-智能体/` | LangGraph 图式编排 | 已合并覆盖（673 → 710 文件） |
| `13-rag-hub/llama_index` | `YYC3-AI-模型服务/` | LlamaIndex 数据索引框架 | 已合并覆盖（9,796 → 9,802 文件） |
| `13-rag-hub/ragflow` | `YYC3-AI-模型服务/` | RAGFlow 深度文档 RAG 引擎 | 已合并覆盖（6,265 → 8,369 文件） |

> **同名非同源（不做去重）**：`skills`（00-common / 01-coding / 02-outbound / 11-music 四处）与 `claude-skills`（03 / 05 两处）经 README 与目录结构比对确认来自**不同上游仓库**，仅目录名相同，全部保留。

---

## 五、历史留存项说明

| 目录 | 说明 |
| ---- | ---- |
| `amis/` | 百度 amis 低代码前端框架（早期个人项目留存，不属行业智能体分类） |
| `AngularCollections/` | Angular 生态资源合集（早期留存） |
| `Dswjcms/` | 德尚微 CMS（PHP 建站系统，早期留存） |
| `nginx-book/` | 《Nginx 开发从入门到精通》源码与文档（早期留存） |
| `Unlimited-OCR/` | 无限制 OCR 推理工程（早期留存） |

---

## 六、闭环追溯

- **需求 → 设计 → 实现 → 验收**：各分类 README 即该分类的「需求-设计」入口，各仓库 README 为「实现」详情，本总索引为「验收」出口
- **五维可溯**：时间维（v1.0.0 建库 → v2.0.0 更名 + 去重）；空间维（15 类覆盖 14 个行业/职能场景 + 1 个元层）；属性维（每仓库含概述与定位）；事件维（拉取·去重·更名事件见变更历史）；关联维（分类 ↔ 仓库 ↔ 总索引 ↔ `docs/` 看板双向映射）
- **文档出口**：[资产看板](../docs/YYC3-KNOWLEDGE-BASE.html) · [分类架构索引](../docs/YYC3-Knowledge-Base/index.html) · [全局汇总映射](../docs/YYC3-项目治理-全局汇总映射.md)（均已同步本分类 105 项）

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v2.0.0 | 2026-11-26 | 目录更名 `YYC3-GitHub-学习汇集` → `YYC3-AgentHub-行业智能体`；跨类去重 8 项（合并覆盖至既有分类）；计数校准为 15 类 / 100 项 + 5 项历史留存 = 105 项；同步 `docs/` 看板、分类架构页与全局映射（27 类 / 547 项） | YYC³ Team |
| v1.0.0 | 2026-11-26 | 新建总索引：15 分类 / 108 仓库导航、文件树可视化与闭环追溯说明 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
