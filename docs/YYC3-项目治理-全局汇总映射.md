---
file: YYC3-项目治理-全局汇总映射.md
title: YYC³ 全局汇总映射 — 24 分类 · 386 项目全量对照
description: YYC³ 知识库全量资产映射：分类统计、迁移来源、当前目录与迁移前原始路径一一对照
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-10
updated: 2026-11-10
status: stable
tags: [mapping, inventory, taxonomy, governance]
category: governance
language: zh-CN
audience: developers,managers,architects
complexity: intermediate
---

# YYC³ 全局汇总映射 — 24 分类 · 386 项目全量对照

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

| 指标 | 值 |
| --- | --- |
| 分类目录 | **24** |
| 项目总数 | **386** |
| 文件总量 | **670,941** |
| 资产体积 | **9.53 GB** |
| 命名规范 | `YYC3-{分类名称}-{项目原名}`（ASCII 前缀） |
| 迁移基线 | `pre-governance-20261110` |

> 本表为治理后的**唯一权威映射**：左侧编号用于检索，`当前目录` 为磁盘真实名称，`原始路径` 为迁移前路径（追溯与回滚依据）。

## 二、分类统计

| 分类 | 项目数 | 文件数 | 体积 | 平均体积 | 来源桶数 | 分类定位 |
| --- | --- | --- | --- | --- | --- | --- |
| AI-模型服务 | 16 | 38,861 | 1.46 GB | 93.5 MB | 4 | LLM 网关、推理服务、模型训练/蒸馏、RAG 与向量检索 |
| Tool-开发工具链 | 45 | 95,998 | 1010.6 MB | 22.5 MB | 10 | 格式化、构建、CLI、包管理、文档工具 |
| Agent-智能体 | 21 | 28,240 | 969.2 MB | 46.2 MB | 8 | 自主任务编排、编码智能体与多智能体协作框架 |
| IDE-编辑器内核 | 13 | 49,604 | 702.1 MB | 54.0 MB | 3 | 编辑器/IDE 主体实现与发行版 |
| AI-应用工具 | 22 | 45,108 | 692.5 MB | 31.5 MB | 7 | 面向终端用户的 AI 应用、AI 编程助手与提示词工程 |
| WebSpec-Web标准 | 35 | 16,012 | 621.2 MB | 17.7 MB | 2 | WHATWG/W3C 规范与配套工具链 |
| Doc-文档知识 | 8 | 7,511 | 605.2 MB | 75.7 MB | 4 | 书籍、课程与规范解读 |
| Data-数据存储 | 5 | 54,094 | 588.8 MB | 117.8 MB | 3 | 数据库、存储引擎与数据处理 |
| TypeDef-类型定义 | 2 | 125,256 | 530.8 MB | 265.4 MB | 1 | TypeScript 类型声明与类型仓库 |
| Design-设计资源 | 10 | 17,386 | 360.4 MB | 36.0 MB | 4 | 图标、主题、视觉素材与设计规范 |
| UI-界面组件 | 10 | 44,736 | 338.0 MB | 33.8 MB | 2 | 组件库、设计系统与主题包 |
| Skills-技能包 | 22 | 21,489 | 279.4 MB | 12.7 MB | 6 | Agent Skill 集合与技能市场 |
| Cloud-云原生 | 8 | 31,572 | 255.9 MB | 32.0 MB | 3 | 容器、Kubernetes、Serverless、CI/CD |
| Frontend-前端框架 | 9 | 13,619 | 253.5 MB | 28.2 MB | 2 | 应用级前端框架、模板站与交互库 |
| Shell-终端 | 5 | 10,322 | 181.1 MB | 36.2 MB | 1 | Shell 实现、终端增强与命令补全 |
| LSP-语言服务 | 16 | 22,379 | 174.9 MB | 10.9 MB | 1 | 语言服务器、语言工具链与代码分析 |
| Plugin-插件协议 | 17 | 6,911 | 165.6 MB | 9.7 MB | 7 | MCP 协议、插件宿主与注册表 |
| Syntax-语法高亮 | 56 | 16,034 | 151.3 MB | 2.7 MB | 7 | TextMate bundle、tmLanguage 语法定义 |
| Editor-编辑器扩展 | 14 | 8,664 | 111.5 MB | 8.0 MB | 5 | 编辑器插件、语言扩展与主题 UI |
| Desktop-桌面应用 | 3 | 4,745 | 100.1 MB | 33.4 MB | 3 | Electron / Flutter 桌面端成品应用 |
| Runtime-标准库 | 36 | 8,506 | 98.6 MB | 2.7 MB | 2 | 语言运行时与标准库实现 |
| Business-商业应用 | 5 | 3,397 | 49.6 MB | 9.9 MB | 1 | 商业场景应用与行业模板 |
| Finance-金融量化 | 4 | 365 | 23.7 MB | 5.9 MB | 1 | 量化交易、风控与金融数据建模 |
| Security-安全合规 | 4 | 132 | 2.4 MB | 0.6 MB | 1 | 安全扫描、规则库、攻防与合规 |
| **合计** | **386** | **670,941** | **9.53 GB** | — | — | — |

## 三、迁移来源分布

| 原桶 | 项目数 |
| --- | --- |
| YYC3-Tool-开发工具 | 40 || YYC3-Python-Python标准库 | 35 || YYC3-WebSpec-Web标准 | 34 || YYC3-AI-人工智能 | 25 || YYC3-Syntax-语法定义 | 24 || YYC3-G | 22 || YYC3-D | 19 || YYC3-LSP-语言服务 | 17 || YYC3-H | 16 || YYC3-J | 15 || YYC3-Skills-技能包 | 15 || YYC3-Agent-智能体 | 13 || YYC3-I | 12 || YYC3-B | 12 || YYC3-C | 12 || YYC3-UI-用户界面 | 10 || YYC3-MCP-MCP协议 | 7 || YYC3-Cloud-云原生 | 6 || YYC3-Business-商业 | 6 || YYC3-Design-设计资源 | 6 || YYC3-Shell-终端 | 5 || YYC3-A | 5 || YYC3-Finance-金融量化 | 4 || YYC3-Plugin-插件体系 | 4 || YYC3-Security-安全 | 4 || YYC3-Data-数据存储 | 3 || YYC3-F | 2 || YYC3-Icon-图标资源 | 2 || YYC3-Doc-文档资源 | 2 || YYC3-Editor-编辑器 | 2 || YYC3-Spec-规范工具 | 2 || YYC3-TypeDef-类型定义 | 2 || YYC3-N | 1 || YYC3-E | 1 || YYC3-Framework-框架 | 1 |

## 四、全量映射表（386 项）

| # | 分类 | 当前目录 | 原始路径 | 文件数 | 体积 | 主要技术 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | AI-应用工具 | `YYC3-AI-应用工具-AI` | `YYC3-AI-人工智能/AI` | 270 | 3.1 MB | tsx, md, ts |  |
| 2 | AI-应用工具 | `YYC3-AI-应用工具-ai_completion` | `YYC3-AI-人工智能/ai_completion` | 4 | 19.9 MB | db, json, 0-10-aarch64-apple-darwin |  |
| 3 | AI-应用工具 | `YYC3-AI-应用工具-buildwithclaude` | `YYC3-AI-人工智能/buildwithclaude` | 1,459 | 17.7 MB | md, json, py |  |
| 4 | AI-应用工具 | `YYC3-AI-应用工具-cc-switch` | `YYC3-Tool-开发工具/cc-switch` | 1,002 | 31.1 MB | rs, tsx, ts |  |
| 5 | AI-应用工具 | `YYC3-AI-应用工具-Cherry-Studio` | `YYC3-Agent-智能体/Cherry-Studio` | 2,154 | 27.4 MB | ts, tsx, png |  |
| 6 | AI-应用工具 | `YYC3-AI-应用工具-claude-code-templates-main` | `YYC3-AI-人工智能/claude-code-templates-main` | 5,515 | 72.5 MB | md, py, patch |  |
| 7 | AI-应用工具 | `YYC3-AI-应用工具-claude-howto` | `YYC3-AI-人工智能/claude-howto` | 660 | 14.6 MB | md, sh, json |  |
| 8 | AI-应用工具 | `YYC3-AI-应用工具-claude-mem-main` | `YYC3-AI-人工智能/claude-mem-main` | 593 | 10.5 MB | ts, md, json |  |
| 9 | AI-应用工具 | `YYC3-AI-应用工具-claude-plugins-official` | `YYC3-AI-人工智能/claude-plugins-official` | 326 | 3.4 MB | md, json, py |  |
| 10 | AI-应用工具 | `YYC3-AI-应用工具-claude-prompts-mcp` | `YYC3-AI-人工智能/claude-prompts-mcp` | 521 | 27.6 MB | ts, md, json |  |
| 11 | AI-应用工具 | `YYC3-AI-应用工具-dify` | `YYC3-G/dify` | 14,089 | 125.8 MB | tsx, py, ts |  |
| 12 | AI-应用工具 | `YYC3-AI-应用工具-Everything-claude-code` | `YYC3-I/everything-claude-code` | 2,386 | 37.2 MB | md, js, json |  |
| 13 | AI-应用工具 | `YYC3-AI-应用工具-free-claude-code` | `YYC3-AI-人工智能/free-claude-code` | 308 | 3.2 MB | py, md, png |  |
| 14 | AI-应用工具 | `YYC3-AI-应用工具-gstack` | `YYC3-Agent-智能体/gstack` | 1,082 | 42.1 MB | ts, md, tmpl |  |
| 15 | AI-应用工具 | `YYC3-AI-应用工具-khoj` | `YYC3-AI-人工智能/khoj` | 701 | 81.1 MB | py, tsx, png |  |
| 16 | AI-应用工具 | `YYC3-AI-应用工具-lobehub` | `YYC3-AI-人工智能/lobehub` | 9,602 | 82.7 MB | ts, tsx, json |  |
| 17 | AI-应用工具 | `YYC3-AI-应用工具-Open-AI-studio` | `YYC3-F/Open-AI-studio` | 2,132 | 27.3 MB | ts, tsx, png |  |
| 18 | AI-应用工具 | `YYC3-AI-应用工具-screenshot-to-code` | `YYC3-H/screenshot-to-code` | 316 | 2.5 MB | py, tsx, ts |  |
| 19 | AI-应用工具 | `YYC3-AI-应用工具-system_prompts_leaks` | `YYC3-AI-人工智能/system_prompts_leaks` | 250 | 6.8 MB | md, yml, json |  |
| 20 | AI-应用工具 | `YYC3-AI-应用工具-temp-ai-management` | `YYC3-AI-人工智能/temp-ai-management` | 496 | 8.8 MB | tsx, ts, html |  |
| 21 | AI-应用工具 | `YYC3-AI-应用工具-Toonflow-app` | `YYC3-I/Toonflow-app` | 830 | 21.6 MB | ts, json, vue |  |
| 22 | AI-应用工具 | `YYC3-AI-应用工具-Understand-Anything` | `YYC3-AI-人工智能/Understand-Anything` | 412 | 25.6 MB | ts, md, tsx |  |
| 23 | AI-模型服务 | `YYC3-AI-模型服务-gateway` | `YYC3-I/gateway` | 766 | 37.4 MB | ts, ipynb, json |  |
| 24 | AI-模型服务 | `YYC3-AI-模型服务-GenerativeAI-Starter-Kit` | `YYC3-AI-人工智能/GenerativeAI-Starter-Kit` | 151 | 0.6 MB | md, py, sh |  |
| 25 | AI-模型服务 | `YYC3-AI-模型服务-GenerativeAIExamples` | `YYC3-AI-人工智能/GenerativeAIExamples` | 66 | 0.2 MB | md, py, txt |  |
| 26 | AI-模型服务 | `YYC3-AI-模型服务-litellm` | `YYC3-I/litellm` | 10,789 | 183.4 MB | py, tsx, ts |  |
| 27 | AI-模型服务 | `YYC3-AI-模型服务-llama_index` | `YYC3-I/llama_index` | 9,795 | 728.1 MB | py, md, ipynb |  |
| 28 | AI-模型服务 | `YYC3-AI-模型服务-ms-swift` | `YYC3-AI-人工智能/ms-swift` | 1,546 | 25.0 MB | py, sh, md |  |
| 29 | AI-模型服务 | `YYC3-AI-模型服务-nanobot` | `YYC3-AI-人工智能/nanobot` | 284 | 33.6 MB | py, md, sh |  |
| 30 | AI-模型服务 | `YYC3-AI-模型服务-new-api` | `YYC3-G/new-api` | 2,219 | 20.4 MB | go, tsx, jsx |  |
| 31 | AI-模型服务 | `YYC3-AI-模型服务-ollama` | `YYC3-I/ollama` | 1,350 | 45.4 MB | go, png, tsx |  |
| 32 | AI-模型服务 | `YYC3-AI-模型服务-ollama-llm-platform` | `YYC3-AI-人工智能/ollama-llm-platform` | 41 | 0.4 MB | ts, tsx, sh |  |
| 33 | AI-模型服务 | `YYC3-AI-模型服务-one-api` | `YYC3-AI-人工智能/one-api` | 563 | 2.5 MB | js, go, svg |  |
| 34 | AI-模型服务 | `YYC3-AI-模型服务-ragflow` | `YYC3-G/ragflow` | 6,267 | 68.5 MB | go, py, tsx |  |
| 35 | AI-模型服务 | `YYC3-AI-模型服务-server-main` | `YYC3-AI-人工智能/server-main` | 1,667 | 16.4 MB | pbtxt, py, sh |  |
| 36 | AI-模型服务 | `YYC3-AI-模型服务-shannon` | `YYC3-AI-人工智能/shannon` | 191 | 25.5 MB | ts, txt, md |  |
| 37 | AI-模型服务 | `YYC3-AI-模型服务-trt-samples-for-hackathon-cn` | `YYC3-AI-人工智能/trt-samples-for-hackathon-cn` | 1,806 | 258.9 MB | py, log, md |  |
| 38 | AI-模型服务 | `YYC3-AI-模型服务-zeroclaw` | `YYC3-Tool-开发工具/zeroclaw` | 1,360 | 49.6 MB | rs, md, png |  |
| 39 | Agent-智能体 | `YYC3-Agent-智能体-agent` | `YYC3-Agent-智能体/agent` | 45 | 0.4 MB | rs |  |
| 40 | Agent-智能体 | `YYC3-Agent-智能体-agent-browser` | `YYC3-Agent-智能体/agent-browser` | 219 | 4.0 MB | tsx, rs, mdx |  |
| 41 | Agent-智能体 | `YYC3-Agent-智能体-agent-team-agile-workflow` | `YYC3-Agent-智能体/agent-team-agile-workflow` | 9 | 0.1 MB | md, json |  |
| 42 | Agent-智能体 | `YYC3-Agent-智能体-AgentBench-main` | `YYC3-Agent-智能体/AgentBench-main` | 395 | 33.1 MB | py, sh, json |  |
| 43 | Agent-智能体 | `YYC3-Agent-智能体-agents` | `YYC3-Agent-智能体/agents` | 697 | 5.9 MB | md, json, py |  |
| 44 | Agent-智能体 | `YYC3-Agent-智能体-agents-v3` | `YYC3-B/agents` | 9 | 0.0 MB | ts, json | 版本变体 |
| 45 | Agent-智能体 | `YYC3-Agent-智能体-ai-agent` | `YYC3-Agent-智能体/ai-agent` | 110 | 0.8 MB | tsx, ts, json |  |
| 46 | Agent-智能体 | `YYC3-Agent-智能体-amazon-q-developer-cli` | `YYC3-Cloud-云原生/amazon-q-developer-cli` | 2,046 | 13.2 MB | rs, toml, md |  |
| 47 | Agent-智能体 | `YYC3-Agent-智能体-chatAgentTools` | `YYC3-Agent-智能体/chatAgentTools` | 76 | 0.8 MB | ts |  |
| 48 | Agent-智能体 | `YYC3-Agent-智能体-CowAgent` | `YYC3-Agent-智能体/CowAgent` | 488 | 3.3 MB | py, mdx, md |  |
| 49 | Agent-智能体 | `YYC3-Agent-智能体-edict` | `YYC3-Tool-开发工具/edict` | 215 | 20.4 MB | py, md, png |  |
| 50 | Agent-智能体 | `YYC3-Agent-智能体-goose` | `YYC3-Agent-智能体/goose` | 2,349 | 346.7 MB | rs, tsx, md |  |
| 51 | Agent-智能体 | `YYC3-Agent-智能体-langgraph` | `YYC3-I/langgraph` | 673 | 13.2 MB | py, ipynb, json |  |
| 52 | Agent-智能体 | `YYC3-Agent-智能体-mu` | `YYC3-J/mu` | 5,069 | 69.9 MB | ts, tsx, json |  |
| 53 | Agent-智能体 | `YYC3-Agent-智能体-openclaude` | `YYC3-AI-人工智能/openclaude` | 2,222 | 18.9 MB | ts, tsx, js |  |
| 54 | Agent-智能体 | `YYC3-Agent-智能体-pi` | `YYC3-Tool-开发工具/pi` | 829 | 14.1 MB | ts, md, json |  |
| 55 | Agent-智能体 | `YYC3-Agent-智能体-pydantic-ai` | `YYC3-G/pydantic-ai` | 1,772 | 225.0 MB | yaml, py, md |  |
| 56 | Agent-智能体 | `YYC3-Agent-智能体-Qwen-Agent` | `YYC3-AI-人工智能/Qwen-Agent` | 345 | 23.6 MB | py, md, png |  |
| 57 | Agent-智能体 | `YYC3-Agent-智能体-ruflo` | `YYC3-J/ruflo` | 9,987 | 169.6 MB | json, md, ts |  |
| 58 | Agent-智能体 | `YYC3-Agent-智能体-self-improving-agent` | `YYC3-Agent-智能体/self-improving-agent` | 15 | 0.1 MB | md, sh, js |  |
| 59 | Agent-智能体 | `YYC3-Agent-智能体-serena` | `YYC3-Agent-智能体/serena` | 670 | 6.1 MB | py, md, yml |  |
| 60 | Business-商业应用 | `YYC3-Business-商业应用-acc-marketplace` | `YYC3-Business-商业/acc-marketplace` | 1,473 | 8.1 MB | tpl, md, tsx |  |
| 61 | Business-商业应用 | `YYC3-Business-商业应用-b2b-sdr-agent-template` | `YYC3-Business-商业/b2b-sdr-agent-template` | 82 | 1.1 MB | md, sh, json |  |
| 62 | Business-商业应用 | `YYC3-Business-商业应用-career-ops` | `YYC3-Business-商业/career-ops` | 166 | 28.8 MB | md, yml, mjs |  |
| 63 | Business-商业应用 | `YYC3-Business-商业应用-cb_teams_marketplace` | `YYC3-Business-商业/cb_teams_marketplace` | 1,660 | 11.4 MB | tpl, md, xsd |  |
| 64 | Business-商业应用 | `YYC3-Business-商业应用-The-Deconstructors` | `YYC3-Business-商业/The-Deconstructors` | 16 | 0.2 MB | md |  |
| 65 | Cloud-云原生 | `YYC3-Cloud-云原生-cloud-init` | `YYC3-H/cloud-init` | 1,381 | 8.1 MB | py, yaml, rst |  |
| 66 | Cloud-云原生 | `YYC3-Cloud-云原生-cloudbase` | `YYC3-Cloud-云原生/cloudbase` | 44 | 0.4 MB | md, json |  |
| 67 | Cloud-云原生 | `YYC3-Cloud-云原生-containers` | `YYC3-Cloud-云原生/containers` | 3,163 | 26.5 MB | go, golden, md |  |
| 68 | Cloud-云原生 | `YYC3-Cloud-云原生-firebase` | `YYC3-Cloud-云原生/firebase` | 2 | 0.0 MB | json |  |
| 69 | Cloud-云原生 | `YYC3-Cloud-云原生-gitlab` | `YYC3-Cloud-云原生/gitlab` | 2 | 0.0 MB | json |  |
| 70 | Cloud-云原生 | `YYC3-Cloud-云原生-kubernetes` | `YYC3-H/kubernetes` | 23,692 | 193.2 MB | go, yaml, json |  |
| 71 | Cloud-云原生 | `YYC3-Cloud-云原生-moby` | `YYC3-Cloud-云原生/moby` | 3,160 | 26.4 MB | go, golden, md |  |
| 72 | Cloud-云原生 | `YYC3-Cloud-云原生-ops-service` | `YYC3-G/ops-service` | 128 | 1.3 MB | rs, sql, md |  |
| 73 | Data-数据存储 | `YYC3-Data-数据存储-Accumulo-3.0.0` | `YYC3-Data-数据存储/Accumulo 3.0.0` | 3 | 0.1 MB | md |  |
| 74 | Data-数据存储 | `YYC3-Data-数据存储-apollo` | `YYC3-J/apollo` | 1,478 | 23.0 MB | java, png, sql |  |
| 75 | Data-数据存储 | `YYC3-Data-数据存储-ClickHouse` | `YYC3-Data-数据存储/ClickHouse` | 38,360 | 295.6 MB | reference, sql, cpp |  |
| 76 | Data-数据存储 | `YYC3-Data-数据存储-dqlite` | `YYC3-H/dqlite` | 352 | 2.3 MB | c, h, m4 |  |
| 77 | Data-数据存储 | `YYC3-Data-数据存储-icu` | `YYC3-Data-数据存储/icu` | 13,901 | 267.8 MB | txt, res, java |  |
| 78 | Design-设计资源 | `YYC3-Design-设计资源-algorithmic-art` | `YYC3-Design-设计资源/algorithmic-art` | 5 | 0.1 MB | md, txt, json |  |
| 79 | Design-设计资源 | `YYC3-Design-设计资源-app-ideas` | `YYC3-Design-设计资源/app-ideas` | 101 | 0.4 MB | md, png, jpg |  |
| 80 | Design-设计资源 | `YYC3-Design-设计资源-awesome-design-md` | `YYC3-Design-设计资源/awesome-design-md` | 151 | 2.0 MB | md, yml |  |
| 81 | Design-设计资源 | `YYC3-Design-设计资源-Clone-Wars` | `YYC3-Design-设计资源/Clone-Wars` | 6 | 0.3 MB | yml, md, png |  |
| 82 | Design-设计资源 | `YYC3-Design-设计资源-Colorsublime-Themes` | `YYC3-Design-设计资源/Colorsublime-Themes` | 393 | 5.5 MB | tmtheme, json, js |  |
| 83 | Design-设计资源 | `YYC3-Design-设计资源-figures` | `YYC3-Icon-图标资源/figures` | 36 | 1.5 MB | png, jpg, html |  |
| 84 | Design-设计资源 | `YYC3-Design-设计资源-frontend-design` | `YYC3-UI-用户界面/frontend-design` | 3 | 0.0 MB | md, txt, json |  |
| 85 | Design-设计资源 | `YYC3-Design-设计资源-logohero-carouse` | `YYC3-Design-设计资源/logohero-carouse` | 8 | 12.8 MB | png, zip |  |
| 86 | Design-设计资源 | `YYC3-Design-设计资源-lucide` | `YYC3-Icon-图标资源/lucide` | 4,213 | 6.0 MB | svg, json, ts |  |
| 87 | Design-设计资源 | `YYC3-Design-设计资源-open-design` | `YYC3-H/open-design` | 12,470 | 331.8 MB | ts, html, md |  |
| 88 | Desktop-桌面应用 | `YYC3-Desktop-桌面应用-electron` | `YYC3-H/electron` | 2,940 | 32.5 MB | js, h, cc |  |
| 89 | Desktop-桌面应用 | `YYC3-Desktop-桌面应用-spotube` | `YYC3-G/spotube` | 985 | 44.7 MB | dart, png, json |  |
| 90 | Desktop-桌面应用 | `YYC3-Desktop-桌面应用-YYC3-Music-Desktop` | `YYC3-I/YYC3-Music-Desktop` | 820 | 22.9 MB | ts, js, vue |  |
| 91 | Doc-文档知识 | `YYC3-Doc-文档知识-30-seconds-of-code` | `YYC3-I/30-seconds-of-code` | 3,300 | 394.6 MB | webp, md, jpg |  |
| 92 | Doc-文档知识 | `YYC3-Doc-文档知识-books` | `YYC3-Doc-文档资源/books` | 3 | 0.2 MB | html |  |
| 93 | Doc-文档知识 | `YYC3-Doc-文档知识-cwc-workshops` | `YYC3-Tool-开发工具/cwc-workshops` | 321 | 1.4 MB | ts, tsx, py |  |
| 94 | Doc-文档知识 | `YYC3-Doc-文档知识-ionic-site` | `YYC3-Tool-开发工具/ionic-site` | 3,784 | 207.6 MB | svg, png, scss |  |
| 95 | Doc-文档知识 | `YYC3-Doc-文档知识-participant-data` | `YYC3-Tool-开发工具/participant-data` | 4 | 0.2 MB | json, md |  |
| 96 | Doc-文档知识 | `YYC3-Doc-文档知识-sg` | `YYC3-Doc-文档资源/sg` | 22 | 0.2 MB | md, txt, yml |  |
| 97 | Doc-文档知识 | `YYC3-Doc-文档知识-web-history` | `YYC3-Tool-开发工具/web-history` | 2 | 0.0 MB | md |  |
| 98 | Doc-文档知识 | `YYC3-Doc-文档知识-YYC3-Yunshu-Multidimensional-Intelligent-Document` | `YYC3-J/YYC3-Yunshu Multidimensional Intelligent Document` | 75 | 1.0 MB | md |  |
| 99 | Editor-编辑器扩展 | `YYC3-Editor-编辑器扩展-EditorSyntax` | `YYC3-Syntax-语法定义/EditorSyntax` | 24 | 0.2 MB | ps1, md, json |  |
| 100 | Editor-编辑器扩展 | `YYC3-Editor-编辑器扩展-LaTeX-Workshop` | `YYC3-Editor-编辑器/LaTeX-Workshop` | 5,197 | 51.8 MB | json, ts, tex |  |
| 101 | Editor-编辑器扩展 | `YYC3-Editor-编辑器扩展-seti-ui` | `YYC3-D/seti-ui` | 447 | 4.6 MB | svg, less, ttf |  |
| 102 | Editor-编辑器扩展 | `YYC3-Editor-编辑器扩展-vscode-codicons` | `YYC3-B/vscode-codicons` | 592 | 1.2 MB | svg, json, js |  |
| 103 | Editor-编辑器扩展 | `YYC3-Editor-编辑器扩展-vscode-css` | `YYC3-C/vscode-css` | 15 | 0.6 MB | md, json, mjs |  |
| 104 | Editor-编辑器扩展 | `YYC3-Editor-编辑器扩展-vscode-java` | `YYC3-D/vscode-java` | 209 | 4.0 MB | ts, json, png |  |
| 105 | Editor-编辑器扩展 | `YYC3-Editor-编辑器扩展-vscode-latex-basics` | `YYC3-C/vscode-latex-basics` | 105 | 2.1 MB | json, tex, yaml |  |
| 106 | Editor-编辑器扩展 | `YYC3-Editor-编辑器扩展-vscode-logfile-highlighter` | `YYC3-B/vscode-logfile-highlighter` | 62 | 1.5 MB | ts, json, png |  |
| 107 | Editor-编辑器扩展 | `YYC3-Editor-编辑器扩展-vscode-mssql` | `YYC3-C/vscode-mssql` | 1,664 | 38.5 MB | ts, svg, tsx |  |
| 108 | Editor-编辑器扩展 | `YYC3-Editor-编辑器扩展-vscode-R` | `YYC3-D/vscode-R` | 128 | 2.6 MB | ts, json, r |  |
| 109 | Editor-编辑器扩展 | `YYC3-Editor-编辑器扩展-vscode-rst` | `YYC3-D/vscode-rst` | 26 | 0.7 MB | rst, json, md |  |
| 110 | Editor-编辑器扩展 | `YYC3-Editor-编辑器扩展-vscode-ruby` | `YYC3-D/vscode-ruby` | 158 | 3.4 MB | ts, json, md |  |
| 111 | Editor-编辑器扩展 | `YYC3-Editor-编辑器扩展-vscode-swift` | `YYC3-Editor-编辑器/vscode-swift` | 20 | 0.2 MB | json, ts, md |  |
| 112 | Editor-编辑器扩展 | `YYC3-Editor-编辑器扩展-vscode-win32-app-container-tokens` | `YYC3-B/vscode-win32-app-container-tokens` | 17 | 0.1 MB | md, toml, rs |  |
| 113 | Finance-金融量化 | `YYC3-Finance-金融量化-ai-model-distillation-for-financial-data` | `YYC3-Finance-金融量化/ai-model-distillation-for-financial-data` | 215 | 4.8 MB | py, md, yaml |  |
| 114 | Finance-金融量化 | `YYC3-Finance-金融量化-cuFOLIO` | `YYC3-Finance-金融量化/cuFOLIO` | 81 | 16.5 MB | py, md, yml |  |
| 115 | Finance-金融量化 | `YYC3-Finance-金融量化-financial-fraud-detection` | `YYC3-Finance-金融量化/financial-fraud-detection` | 39 | 1.2 MB | md, yml, png |  |
| 116 | Finance-金融量化 | `YYC3-Finance-金融量化-quantitative-signal-discovery-agent` | `YYC3-Finance-金融量化/quantitative-signal-discovery-agent` | 30 | 1.2 MB | py, md, ipynb |  |
| 117 | Frontend-前端框架 | `YYC3-Frontend-前端框架-bootstrap` | `YYC3-H/bootstrap` | 686 | 9.2 MB | scss, png, mdx |  |
| 118 | Frontend-前端框架 | `YYC3-Frontend-前端框架-d3` | `YYC3-H/d3` | 175 | 1.7 MB | md, vue, js |  |
| 119 | Frontend-前端框架 | `YYC3-Frontend-前端框架-framework7` | `YYC3-H/framework7` | 1,558 | 9.9 MB | js, less, jsx |  |
| 120 | Frontend-前端框架 | `YYC3-Frontend-前端框架-html5-boilerplate` | `YYC3-H/html5-boilerplate` | 60 | 0.3 MB | md, yml, json |  |
| 121 | Frontend-前端框架 | `YYC3-Frontend-前端框架-htmx` | `YYC3-H/htmx` | 635 | 90.4 MB | md, html, js |  |
| 122 | Frontend-前端框架 | `YYC3-Frontend-前端框架-ionic-framework` | `YYC3-H/ionic-framework` | 9,607 | 102.6 MB | png, ts, html |  |
| 123 | Frontend-前端框架 | `YYC3-Frontend-前端框架-redux` | `YYC3-J/redux` | 476 | 32.0 MB | js, md, png |  |
| 124 | Frontend-前端框架 | `YYC3-Frontend-前端框架-reveal.js` | `YYC3-H/reveal.js` | 183 | 6.4 MB | js, ts, html |  |
| 125 | Frontend-前端框架 | `YYC3-Frontend-前端框架-vuex` | `YYC3-J/vuex` | 239 | 1.0 MB | js, md, vue |  |
| 126 | IDE-编辑器内核 | `YYC3-IDE-编辑器内核-arduino-ide` | `YYC3-G/arduino-ide` | 1,646 | 18.4 MB | yml, ts, json |  |
| 127 | IDE-编辑器内核 | `YYC3-IDE-编辑器内核-code-server` | `YYC3-G/code-server` | 242 | 1.6 MB | ts, diff, md |  |
| 128 | IDE-编辑器内核 | `YYC3-IDE-编辑器内核-ide` | `YYC3-G/ide` | 406 | 4.8 MB | ts, tsx, md |  |
| 129 | IDE-编辑器内核 | `YYC3-IDE-编辑器内核-lapce` | `YYC3-G/lapce` | 382 | 5.9 MB | svg, rs, toml |  |
| 130 | IDE-编辑器内核 | `YYC3-IDE-编辑器内核-liteide` | `YYC3-G/liteide` | 1,877 | 12.3 MB | h, cpp, png |  |
| 131 | IDE-编辑器内核 | `YYC3-IDE-编辑器内核-openvscode-server` | `YYC3-G/openvscode-server` | 9,138 | 128.9 MB | ts, json, css |  |
| 132 | IDE-编辑器内核 | `YYC3-IDE-编辑器内核-RedPanda-CPP` | `YYC3-G/RedPanda-CPP` | 1,929 | 16.3 MB | png, svg, cpp |  |
| 133 | IDE-编辑器内核 | `YYC3-IDE-编辑器内核-spyder` | `YYC3-G/spyder` | 2,440 | 46.4 MB | js, py, svg |  |
| 134 | IDE-编辑器内核 | `YYC3-IDE-编辑器内核-theia` | `YYC3-G/theia` | 4,043 | 39.5 MB | ts, json, tsx |  |
| 135 | IDE-编辑器内核 | `YYC3-IDE-编辑器内核-void` | `YYC3-Tool-开发工具/void` | 7,844 | 126.5 MB | ts, json, css |  |
| 136 | IDE-编辑器内核 | `YYC3-IDE-编辑器内核-vscode` | `YYC3-D/vscode` | 15,102 | 197.1 MB | ts, json, css |  |
| 137 | IDE-编辑器内核 | `YYC3-IDE-编辑器内核-vscodium` | `YYC3-G/vscodium` | 354 | 29.2 MB | patch, ico, icns |  |
| 138 | IDE-编辑器内核 | `YYC3-IDE-编辑器内核-zed` | `YYC3-G/zed` | 4,201 | 75.2 MB | rs, svg, json |  |
| 139 | LSP-语言服务 | `YYC3-LSP-语言服务-clangd-lsp` | `YYC3-LSP-语言服务/clangd-lsp` | 4 | 0.0 MB | json, md |  |
| 140 | LSP-语言服务 | `YYC3-LSP-语言服务-csharp-language-server` | `YYC3-LSP-语言服务/csharp-language-server` | 135 | 0.5 MB | fs, cs, csproj |  |
| 141 | LSP-语言服务 | `YYC3-LSP-语言服务-csharp-lsp` | `YYC3-LSP-语言服务/csharp-lsp` | 4 | 0.0 MB | json, md |  |
| 142 | LSP-语言服务 | `YYC3-LSP-语言服务-gopls-lsp` | `YYC3-LSP-语言服务/gopls-lsp` | 4 | 0.0 MB | json, md |  |
| 143 | LSP-语言服务 | `YYC3-LSP-语言服务-jdtls-lsp` | `YYC3-LSP-语言服务/jdtls-lsp` | 4 | 0.0 MB | json, md |  |
| 144 | LSP-语言服务 | `YYC3-LSP-语言服务-lsp` | `YYC3-LSP-语言服务/lsp` | 10,881 | 71.7 MB | pyi, rs, py |  |
| 145 | LSP-语言服务 | `YYC3-LSP-语言服务-lsp-integration` | `YYC3-LSP-语言服务/lsp-integration` | 6 | 0.0 MB | ts, json |  |
| 146 | LSP-语言服务 | `YYC3-LSP-语言服务-lua-language-server` | `YYC3-LSP-语言服务/lua-language-server` | 520 | 31.4 MB | lua, txt, json |  |
| 147 | LSP-语言服务 | `YYC3-LSP-语言服务-lua-lsp` | `YYC3-LSP-语言服务/lua-lsp` | 4 | 0.0 MB | json, md |  |
| 148 | LSP-语言服务 | `YYC3-LSP-语言服务-pyright` | `YYC3-LSP-语言服务/pyright` | 7,184 | 23.0 MB | pyi, py, ts |  |
| 149 | LSP-语言服务 | `YYC3-LSP-语言服务-pyright-lsp` | `YYC3-LSP-语言服务/pyright-lsp` | 4 | 0.0 MB | json, md |  |
| 150 | LSP-语言服务 | `YYC3-LSP-语言服务-ruby-lsp` | `YYC3-LSP-语言服务/ruby-lsp` | 859 | 24.5 MB | rb, json, rbi |  |
| 151 | LSP-语言服务 | `YYC3-LSP-语言服务-rust-analyzer` | `YYC3-LSP-语言服务/rust-analyzer` | 2,259 | 19.8 MB | rs, rast, txt |  |
| 152 | LSP-语言服务 | `YYC3-LSP-语言服务-rust-analyzer-lsp` | `YYC3-LSP-语言服务/rust-analyzer-lsp` | 4 | 0.0 MB | json, md |  |
| 153 | LSP-语言服务 | `YYC3-LSP-语言服务-sourcekit-lsp` | `YYC3-LSP-语言服务/sourcekit-lsp` | 503 | 4.0 MB | swift, md, txt |  |
| 154 | LSP-语言服务 | `YYC3-LSP-语言服务-swift-lsp` | `YYC3-LSP-语言服务/swift-lsp` | 4 | 0.0 MB | json, md |  |
| 155 | Plugin-插件协议 | `YYC3-Plugin-插件协议-context7` | `YYC3-MCP-MCP协议/context7` | 2 | 0.0 MB | json |  |
| 156 | Plugin-插件协议 | `YYC3-Plugin-插件协议-core` | `YYC3-Tool-开发工具/core` | 1,573 | 98.3 MB | ts, png, yml |  |
| 157 | Plugin-插件协议 | `YYC3-Plugin-插件协议-core-sdk` | `YYC3-B/core` | 46 | 0.1 MB | ts, map, js |  |
| 158 | Plugin-插件协议 | `YYC3-Plugin-插件协议-extensions` | `YYC3-B/extensions` | 803 | 25.8 MB | json, svg, md |  |
| 159 | Plugin-插件协议 | `YYC3-Plugin-插件协议-external_plugins` | `YYC3-Plugin-插件体系/external_plugins` | 2,511 | 25.3 MB | md, py, json |  |
| 160 | Plugin-插件协议 | `YYC3-Plugin-插件协议-hookify` | `YYC3-Skills-技能包/hookify` | 24 | 0.1 MB | md, py, json |  |
| 161 | Plugin-插件协议 | `YYC3-Plugin-插件协议-lexiang-knowledge-plugins` | `YYC3-Plugin-插件体系/lexiang-knowledge-plugins` | 25 | 0.2 MB | md, json, ts |  |
| 162 | Plugin-插件协议 | `YYC3-Plugin-插件协议-mcp` | `YYC3-MCP-MCP协议/mcp` | 23 | 0.3 MB | ts |  |
| 163 | Plugin-插件协议 | `YYC3-Plugin-插件协议-mcp-client` | `YYC3-MCP-MCP协议/mcp-client` | 7 | 0.0 MB | ts, json |  |
| 164 | Plugin-插件协议 | `YYC3-Plugin-插件协议-mcp-server` | `YYC3-MCP-MCP协议/mcp-server` | 8 | 0.0 MB | ts, json |  |
| 165 | Plugin-插件协议 | `YYC3-Plugin-插件协议-meta` | `YYC3-Spec-规范工具/meta` | 12 | 0.1 MB | md, py, json |  |
| 166 | Plugin-插件协议 | `YYC3-Plugin-插件协议-misc-server` | `YYC3-MCP-MCP协议/misc-server` | 109 | 0.6 MB | conf, mjs, md |  |
| 167 | Plugin-插件协议 | `YYC3-Plugin-插件协议-playwright-mcp` | `YYC3-MCP-MCP协议/playwright-mcp` | 66 | 0.4 MB | ts, json, md |  |
| 168 | Plugin-插件协议 | `YYC3-Plugin-插件协议-plugin-dev` | `YYC3-MCP-MCP协议/plugin-dev` | 61 | 0.5 MB | md, sh, json |  |
| 169 | Plugin-插件协议 | `YYC3-Plugin-插件协议-plugin-finder` | `YYC3-Plugin-插件体系/plugin-finder` | 21 | 0.2 MB | md, json, sh |  |
| 170 | Plugin-插件协议 | `YYC3-Plugin-插件协议-plugins` | `YYC3-Plugin-插件体系/plugins` | 1,028 | 8.6 MB | md, html, xsd |  |
| 171 | Plugin-插件协议 | `YYC3-Plugin-插件协议-plugins-claude` | `YYC3-H/plugins` | 592 | 5.1 MB | md, json, yaml |  |
| 172 | Runtime-标准库 | `YYC3-Runtime-标准库-__phello__` | `YYC3-Python-Python标准库/__phello__` | 2 | 0.0 MB | py |  |
| 173 | Runtime-标准库 | `YYC3-Runtime-标准库-_pyrepl` | `YYC3-Python-Python标准库/_pyrepl` | 26 | 0.2 MB | py, ini |  |
| 174 | Runtime-标准库 | `YYC3-Runtime-标准库-asyncio` | `YYC3-Python-Python标准库/asyncio` | 33 | 0.5 MB | py |  |
| 175 | Runtime-标准库 | `YYC3-Runtime-标准库-collections` | `YYC3-Python-Python标准库/collections` | 1 | 0.1 MB | py |  |
| 176 | Runtime-标准库 | `YYC3-Runtime-标准库-concurrent` | `YYC3-Python-Python标准库/concurrent` | 5 | 0.1 MB | py |  |
| 177 | Runtime-标准库 | `YYC3-Runtime-标准库-config-3.13-darwin` | `YYC3-Python-Python标准库/config-3.13-darwin` | 11 | 0.3 MB | py, in, stdlib |  |
| 178 | Runtime-标准库 | `YYC3-Runtime-标准库-ctypes` | `YYC3-Python-Python标准库/ctypes` | 12 | 0.1 MB | py, ctypes, bat |  |
| 179 | Runtime-标准库 | `YYC3-Runtime-标准库-curses` | `YYC3-Python-Python标准库/curses` | 5 | 0.0 MB | py |  |
| 180 | Runtime-标准库 | `YYC3-Runtime-标准库-dbm` | `YYC3-Python-Python标准库/dbm` | 5 | 0.0 MB | py |  |
| 181 | Runtime-标准库 | `YYC3-Runtime-标准库-email` | `YYC3-Python-Python标准库/email` | 30 | 0.4 MB | py, rst |  |
| 182 | Runtime-标准库 | `YYC3-Runtime-标准库-encodings` | `YYC3-Python-Python标准库/encodings` | 122 | 1.4 MB | py |  |
| 183 | Runtime-标准库 | `YYC3-Runtime-标准库-ensurepip` | `YYC3-Python-Python标准库/ensurepip` | 4 | 1.7 MB | py, whl |  |
| 184 | Runtime-标准库 | `YYC3-Runtime-标准库-http` | `YYC3-Python-Python标准库/http` | 5 | 0.2 MB | py |  |
| 185 | Runtime-标准库 | `YYC3-Runtime-标准库-idlelib` | `YYC3-Python-Python标准库/idlelib` | 158 | 1.6 MB | py, txt, gif |  |
| 186 | Runtime-标准库 | `YYC3-Runtime-标准库-importlib` | `YYC3-Python-Python标准库/importlib` | 25 | 0.2 MB | py |  |
| 187 | Runtime-标准库 | `YYC3-Runtime-标准库-json` | `YYC3-Python-Python标准库/json` | 5 | 0.0 MB | py |  |
| 188 | Runtime-标准库 | `YYC3-Runtime-标准库-lib-dynload` | `YYC3-Python-Python标准库/lib-dynload` | 78 | 8.3 MB | so |  |
| 189 | Runtime-标准库 | `YYC3-Runtime-标准库-logging` | `YYC3-Python-Python标准库/logging` | 3 | 0.2 MB | py |  |
| 190 | Runtime-标准库 | `YYC3-Runtime-标准库-multiprocessing` | `YYC3-Python-Python标准库/multiprocessing` | 23 | 0.3 MB | py |  |
| 191 | Runtime-标准库 | `YYC3-Runtime-标准库-NVIDIA` | `YYC3-N/NVIDA` | 157 | 4.4 MB | py, txt, orig |  |
| 192 | Runtime-标准库 | `YYC3-Runtime-标准库-pathlib` | `YYC3-Python-Python标准库/pathlib` | 3 | 0.1 MB | py |  |
| 193 | Runtime-标准库 | `YYC3-Runtime-标准库-pydoc_data` | `YYC3-Python-Python标准库/pydoc_data` | 3 | 0.5 MB | py, css |  |
| 194 | Runtime-标准库 | `YYC3-Runtime-标准库-re` | `YYC3-Python-Python标准库/re` | 5 | 0.1 MB | py |  |
| 195 | Runtime-标准库 | `YYC3-Runtime-标准库-site-packages` | `YYC3-Python-Python标准库/site-packages` | 7,656 | 76.3 MB | py, json, gz |  |
| 196 | Runtime-标准库 | `YYC3-Runtime-标准库-sqlite3` | `YYC3-Python-Python标准库/sqlite3` | 4 | 0.0 MB | py |  |
| 197 | Runtime-标准库 | `YYC3-Runtime-标准库-sysconfig` | `YYC3-Python-Python标准库/sysconfig` | 2 | 0.0 MB | py |  |
| 198 | Runtime-标准库 | `YYC3-Runtime-标准库-test` | `YYC3-Python-Python标准库/test` | 31 | 0.3 MB | py |  |
| 199 | Runtime-标准库 | `YYC3-Runtime-标准库-tkinter` | `YYC3-Python-Python标准库/tkinter` | 13 | 0.3 MB | py |  |
| 200 | Runtime-标准库 | `YYC3-Runtime-标准库-tomllib` | `YYC3-Python-Python标准库/tomllib` | 5 | 0.0 MB | py, ini |  |
| 201 | Runtime-标准库 | `YYC3-Runtime-标准库-turtledemo` | `YYC3-Python-Python标准库/turtledemo` | 22 | 0.1 MB | py, cfg |  |
| 202 | Runtime-标准库 | `YYC3-Runtime-标准库-unittest` | `YYC3-Python-Python标准库/unittest` | 13 | 0.2 MB | py |  |
| 203 | Runtime-标准库 | `YYC3-Runtime-标准库-urllib` | `YYC3-Python-Python标准库/urllib` | 6 | 0.2 MB | py |  |
| 204 | Runtime-标准库 | `YYC3-Runtime-标准库-xml` | `YYC3-Python-Python标准库/xml` | 22 | 0.3 MB | py |  |
| 205 | Runtime-标准库 | `YYC3-Runtime-标准库-xmlrpc` | `YYC3-Python-Python标准库/xmlrpc` | 3 | 0.1 MB | py |  |
| 206 | Runtime-标准库 | `YYC3-Runtime-标准库-zipfile` | `YYC3-Python-Python标准库/zipfile` | 4 | 0.1 MB | py |  |
| 207 | Runtime-标准库 | `YYC3-Runtime-标准库-zoneinfo` | `YYC3-Python-Python标准库/zoneinfo` | 4 | 0.0 MB | py |  |
| 208 | Security-安全合规 | `YYC3-Security-安全合规-practicalEthicalHacking` | `YYC3-Security-安全/practicalEthicalHacking` | 71 | 1.9 MB | md, py, png |  |
| 209 | Security-安全合规 | `YYC3-Security-安全合规-security-guidance` | `YYC3-Security-安全/security-guidance` | 3 | 0.0 MB | json, py |  |
| 210 | Security-安全合规 | `YYC3-Security-安全合规-security-rules` | `YYC3-Security-安全/security-rules` | 5 | 0.0 MB | md, json |  |
| 211 | Security-安全合规 | `YYC3-Security-安全合规-security-scan` | `YYC3-Security-安全/security-scan` | 53 | 0.5 MB | md, yaml, py |  |
| 212 | Shell-终端 | `YYC3-Shell-终端-atuin` | `YYC3-Shell-终端/atuin` | 4 | 0.0 MB | md, json |  |
| 213 | Shell-终端 | `YYC3-Shell-终端-autocomplete-specs` | `YYC3-Shell-终端/autocomplete-specs` | 1,476 | 98.0 MB | ts |  |
| 214 | Shell-终端 | `YYC3-Shell-终端-fish-shell` | `YYC3-Shell-终端/fish-shell` | 2,144 | 25.5 MB | fish, rs, rst |  |
| 215 | Shell-终端 | `YYC3-Shell-终端-shell` | `YYC3-Shell-终端/shell` | 4,958 | 44.3 MB | go, fish, txt |  |
| 216 | Shell-终端 | `YYC3-Shell-终端-zsh` | `YYC3-Shell-终端/zsh` | 1,740 | 13.3 MB | yo, c, ztst |  |
| 217 | Skills-技能包 | `YYC3-Skills-技能包-Agent` | `YYC3-B/Agent` | 61 | 0.3 MB | md, ts, sh |  |
| 218 | Skills-技能包 | `YYC3-Skills-技能包-Agent-Skills` | `YYC3-J/Agent-Skills` | 922 | 11.0 MB | md, js, py |  |
| 219 | Skills-技能包 | `YYC3-Skills-技能包-agent-skills-framework` | `YYC3-F/agent-skills` | 76 | 0.5 MB | md, toml, sh |  |
| 220 | Skills-技能包 | `YYC3-Skills-技能包-all-skills` | `YYC3-Skills-技能包/all-skills` | 394 | 9.2 MB | md, xsd, py |  |
| 221 | Skills-技能包 | `YYC3-Skills-技能包-antigravity-awesome-skills` | `YYC3-Skills-技能包/antigravity-awesome-skills` | 13,152 | 170.7 MB | md, py, patch |  |
| 222 | Skills-技能包 | `YYC3-Skills-技能包-awesome-openclaw-skills` | `YYC3-Skills-技能包/awesome-openclaw-skills` | 32 | 0.8 MB | md, json, yml |  |
| 223 | Skills-技能包 | `YYC3-Skills-技能包-B2B-SKills` | `YYC3-Skills-技能包/B2B-SKills` | 18 | 0.1 MB | md, mjs, sh |  |
| 224 | Skills-技能包 | `YYC3-Skills-技能包-caveman` | `YYC3-J/caveman` | 103 | 0.4 MB | md, py, json |  |
| 225 | Skills-技能包 | `YYC3-Skills-技能包-code-skills` | `YYC3-Skills-技能包/code-skills` | 2,644 | 25.3 MB | md, js, json |  |
| 226 | Skills-技能包 | `YYC3-Skills-技能包-GLM-skills` | `YYC3-Skills-技能包/GLM-skills` | 63 | 0.6 MB | py, md, yaml |  |
| 227 | Skills-技能包 | `YYC3-Skills-技能包-hot-skills` | `YYC3-Skills-技能包/hot-skills` | 72 | 0.2 MB | md, sh, py |  |
| 228 | Skills-技能包 | `YYC3-Skills-技能包-last30days-skill` | `YYC3-Skills-技能包/last30days-skill` | 179 | 15.3 MB | py, md, json |  |
| 229 | Skills-技能包 | `YYC3-Skills-技能包-marketingskills` | `YYC3-Skills-技能包/marketingskills` | 364 | 2.6 MB | md, js, json |  |
| 230 | Skills-技能包 | `YYC3-Skills-技能包-nim-go-release` | `YYC3-I/nim-go-release` | 41 | 4.3 MB | png, md, jpg |  |
| 231 | Skills-技能包 | `YYC3-Skills-技能包-pskoett-ai-skills` | `YYC3-Skills-技能包/pskoett-ai-skills` | 116 | 0.7 MB | md, sh, json |  |
| 232 | Skills-技能包 | `YYC3-Skills-技能包-skills` | `YYC3-Skills-技能包/skills` | 2,448 | 16.3 MB | md, json, py |  |
| 233 | Skills-技能包 | `YYC3-Skills-技能包-skills-registry` | `YYC3-Skills-技能包/skills-registry` | 8 | 0.0 MB | ts, json |  |
| 234 | Skills-技能包 | `YYC3-Skills-技能包-skills-v3` | `YYC3-I/skills` | 393 | 9.8 MB | xsd, md, py | 版本变体 |
| 235 | Skills-技能包 | `YYC3-Skills-技能包-skills-v4` | `YYC3-H/skills` | 56 | 0.5 MB | py, md, txt | 版本变体 |
| 236 | Skills-技能包 | `YYC3-Skills-技能包-skills-v5` | `YYC3-B/skills` | 10 | 0.0 MB | ts, json |  |
| 237 | Skills-技能包 | `YYC3-Skills-技能包-ui-ux-pro-max-skill` | `YYC3-Skills-技能包/ui-ux-pro-max-skill` | 324 | 10.6 MB | csv, md, ttf |  |
| 238 | Skills-技能包 | `YYC3-Skills-技能包-YYC3-SKILL` | `YYC3-Skills-技能包/YYC3-SKILL` | 13 | 0.2 MB | md, json |  |
| 239 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-asp.vb.net.tmbundle` | `YYC3-B/asp.vb.net.tmbundle` | 38 | 0.1 MB | plist, tmpreferences, mdown |  |
| 240 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-atom-language-julia` | `YYC3-Syntax-语法定义/atom-language-julia` | 20 | 0.3 MB | json, cson, md |  |
| 241 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-better-c-syntax` | `YYC3-J/better-c-syntax` | 256 | 2.5 MB | sh, yaml, c |  |
| 242 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-better-cpp-syntax` | `YYC3-J/better-cpp-syntax` | 582 | 13.2 MB | yaml, cpp, sh |  |
| 243 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-Better-Less` | `YYC3-Syntax-语法定义/Better-Less` | 32 | 2.6 MB | less, tmpreferences, md |  |
| 244 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-better-objc-syntax` | `YYC3-J/better-objc-syntax` | 194 | 2.3 MB | sh, nix, rb |  |
| 245 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-better-objcpp-syntax` | `YYC3-J/better-objcpp-syntax` | 196 | 2.5 MB | sh, yaml, nix |  |
| 246 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-better-shell-syntax` | `YYC3-J/better-shell-syntax` | 292 | 4.9 MB | sh, yaml, md |  |
| 247 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-better-snippet-syntax` | `YYC3-J/better-snippet-syntax` | 207 | 5.5 MB | sh, yaml, jsonc |  |
| 248 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-better-syntax` | `YYC3-Syntax-语法定义/better-syntax` | 1,728 | 32.1 MB | sh, yaml, cpp |  |
| 249 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-c.tmbundle` | `YYC3-D/c.tmbundle` | 66 | 1.8 MB | plist, tmpreferences, tmcommand |  |
| 250 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-coffee-script-tmbundle` | `YYC3-A/coffee-script-tmbundle` | 41 | 0.1 MB | tmsnippet, tmcommand, tmpreferences |  |
| 251 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-csharp-tmLanguage` | `YYC3-Syntax-语法定义/csharp-tmLanguage` | 58 | 1.4 MB | ts, json, md |  |
| 252 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-css.tmbundle` | `YYC3-C/css.tmbundle` | 119 | 0.2 MB | plist, tmpreferences, tmsnippet |  |
| 253 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-cuda-cpp-grammar` | `YYC3-Syntax-语法定义/cuda-cpp-grammar` | 3 | 0.8 MB | md, json |  |
| 254 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-dart-syntax-highlight` | `YYC3-Syntax-语法定义/dart-syntax-highlight` | 51 | 0.2 MB | dart, golden, md |  |
| 255 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-diff.tmbundle` | `YYC3-D/diff.tmbundle` | 31 | 0.0 MB | plist, css, tmmacro |  |
| 256 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-git-tmbundle` | `YYC3-C/git-tmbundle` | 172 | 0.5 MB | rb, tmcommand, erb |  |
| 257 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-git.tmbundle` | `YYC3-D/git.tmbundle` | 177 | 0.6 MB | rb, tmcommand, erb |  |
| 258 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-go-syntax` | `YYC3-Syntax-语法定义/go-syntax` | 22 | 8.8 MB | png, json, md |  |
| 259 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-groovy.tmbundle` | `YYC3-D/groovy.tmbundle` | 121 | 0.2 MB | tmsnippet, tmcommand, tmpreferences |  |
| 260 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-html.tmbundle` | `YYC3-D/html.tmbundle` | 106 | 1.1 MB | tmsnippet, plist, tmcommand |  |
| 261 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-ini.tmbundle` | `YYC3-D/ini.tmbundle` | 6 | 0.0 MB | tmpreferences, plist, mdown |  |
| 262 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-ionide-fsgrammar` | `YYC3-Syntax-语法定义/ionide-fsgrammar` | 33 | 0.2 MB | json, md, fs |  |
| 263 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-java.tmbundle` | `YYC3-D/java.tmbundle` | 74 | 0.2 MB | tmsnippet, tmpreferences, tmcommand |  |
| 264 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-javascript.tmbundle` | `YYC3-D/javascript.tmbundle` | 91 | 0.6 MB | py, tmsnippet, plist |  |
| 265 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-language-batchfile` | `YYC3-Syntax-语法定义/language-batchfile` | 26 | 0.0 MB | bat, md, cson |  |
| 266 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-language-clojure` | `YYC3-Syntax-语法定义/language-clojure` | 14 | 0.0 MB | md, cson, json |  |
| 267 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-language-coffee-script` | `YYC3-Syntax-语法定义/language-coffee-script` | 17 | 0.2 MB | md, cson, json |  |
| 268 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-language-php` | `YYC3-Syntax-语法定义/language-php` | 18 | 0.6 MB | md, cson, json |  |
| 269 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-language-ruby` | `YYC3-Syntax-语法定义/language-ruby` | 23 | 0.2 MB | cson, md, yml |  |
| 270 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-language-sass` | `YYC3-Syntax-语法定义/language-sass` | 20 | 0.3 MB | md, cson, json |  |
| 271 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-language-xml` | `YYC3-Syntax-语法定义/language-xml` | 16 | 0.0 MB | md, cson, json |  |
| 272 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-latex.tmbundle` | `YYC3-C/latex.tmbundle` | 269 | 3.5 MB | plist, tex, tmcommand |  |
| 273 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-lua.tmbundle` | `YYC3-D/lua.tmbundle` | 24 | 0.0 MB | plist, tmsnippet, tmpreferences |  |
| 274 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-lua.tmbundle-v2` | `YYC3-C/lua.tmbundle` | 8 | 0.1 MB | json, md, tmbundle | 版本变体 |
| 275 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-lua.tmbundle-v3` | `YYC3-J/lua.tmbundle` | 7 | 0.1 MB | json, md, plist | 版本变体 |
| 276 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-MagicPython` | `YYC3-Syntax-语法定义/MagicPython` | 336 | 2.4 MB | py, re, sublime-snippet |  |
| 277 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-make.tmbundle` | `YYC3-C/make.tmbundle` | 11 | 0.0 MB | plist, tmcommand, tmpreferences |  |
| 278 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-markdown.tmbundle` | `YYC3-D/markdown.tmbundle` | 39 | 0.1 MB | plist, tmcommand, tmpreferences |  |
| 279 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-perl.tmbundle` | `YYC3-D/perl.tmbundle` | 40 | 0.2 MB | plist, pm, tmsnippet |  |
| 280 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-php.tmbundle` | `YYC3-C/php.tmbundle` | 110 | 2.6 MB | tmsnippet, tmcommand, tmpreferences |  |
| 281 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-pug-tmbundle` | `YYC3-A/pug-tmbundle` | 20 | 0.1 MB | pug, tmpreferences, tmcommand |  |
| 282 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-ruby.tmbundle` | `YYC3-D/ruby.tmbundle` | 254 | 0.4 MB | plist, tmsnippet, rb |  |
| 283 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-rust-syntax` | `YYC3-Syntax-语法定义/rust-syntax` | 17 | 0.3 MB | json, md, rs |  |
| 284 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-SASS.tmbundle` | `YYC3-A/SASS.tmbundle` | 174 | 0.3 MB | tmsnippet, tmcommand, tmpreferences |  |
| 285 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-shaders-tmLanguage` | `YYC3-Syntax-语法定义/shaders-tmLanguage` | 3 | 0.0 MB | json |  |
| 286 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-swift-tmlanguage` | `YYC3-Syntax-语法定义/swift-tmlanguage` | 35 | 0.7 MB | ts, json, md |  |
| 287 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-syntax` | `YYC3-LSP-语言服务/syntax` | 5,727 | 27.4 MB | svg, json, py |  |
| 288 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-textmate-clojure` | `YYC3-A/textmate-clojure` | 5 | 0.0 MB | md, plist, tmpreferences |  |
| 289 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-tmBundle` | `YYC3-Syntax-语法定义/tmBundle` | 2,969 | 20.2 MB | txt, tmsnippet, plist |  |
| 290 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-TypeScript-TmLanguage` | `YYC3-C/TypeScript-TmLanguage` | 960 | 7.5 MB | txt, ts, tsx |  |
| 291 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-vscode-JSON.tmLanguage` | `YYC3-C/vscode-JSON.tmLanguage` | 5 | 0.0 MB | md, txt, tmlanguage |  |
| 292 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-vscode-markdown-tm-grammar` | `YYC3-C/vscode-markdown-tm-grammar` | 133 | 1.3 MB | md, json, yaml |  |
| 293 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-xml.tmbundle` | `YYC3-D/xml.tmbundle` | 20 | 0.0 MB | plist, tmsnippet, mdown |  |
| 294 | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-YAML-Syntax-Highlighter` | `YYC3-Syntax-语法定义/YAML-Syntax-Highlighter` | 18 | 0.1 MB | json, md, yml |  |
| 295 | Tool-开发工具链 | `YYC3-Tool-开发工具链-aily-blockly` | `YYC3-G/aily-blockly` | 1,002 | 105.5 MB | ts, scss, html |  |
| 296 | Tool-开发工具链 | `YYC3-Tool-开发工具链-aily-blockly-libraries` | `YYC3-G/aily-blockly-libraries` | 7,616 | 92.3 MB | json, md, js |  |
| 297 | Tool-开发工具链 | `YYC3-Tool-开发工具链-archify` | `YYC3-G/archify` | 514 | 42.9 MB | mjs, md, json |  |
| 298 | Tool-开发工具链 | `YYC3-Tool-开发工具链-assert` | `YYC3-Tool-开发工具/assert` | 7 | 0.0 MB | js, json, html |  |
| 299 | Tool-开发工具链 | `YYC3-Tool-开发工具链-autocomplete` | `YYC3-Tool-开发工具/autocomplete` | 1,566 | 98.3 MB | ts, png, yml |  |
| 300 | Tool-开发工具链 | `YYC3-Tool-开发工具链-autocomplete-tools` | `YYC3-Tool-开发工具/autocomplete-tools` | 417 | 2.0 MB | ts, json, md |  |
| 301 | Tool-开发工具链 | `YYC3-Tool-开发工具链-build_tools` | `YYC3-Tool-开发工具/build_tools` | 25 | 0.1 MB | sh, fish, xml |  |
| 302 | Tool-开发工具链 | `YYC3-Tool-开发工具链-cn-optimizer` | `YYC3-Tool-开发工具/cn-optimizer` | 9 | 0.0 MB | ts, json |  |
| 303 | Tool-开发工具链 | `YYC3-Tool-开发工具链-code-simplifier` | `YYC3-Tool-开发工具/code-simplifier` | 2 | 0.0 MB | md, json |  |
| 304 | Tool-开发工具链 | `YYC3-Tool-开发工具链-commit-commands` | `YYC3-Tool-开发工具/commit-commands` | 6 | 0.0 MB | md, json |  |
| 305 | Tool-开发工具链 | `YYC3-Tool-开发工具链-content` | `YYC3-Tool-开发工具/content` | 4,524 | 212.2 MB | svg, png, js |  |
| 306 | Tool-开发工具链 | `YYC3-Tool-开发工具链-Core-files` | `YYC3-Tool-开发工具/Core-files` | 7,474 | 60.2 MB | json, tsx, ts |  |
| 307 | Tool-开发工具链 | `YYC3-Tool-开发工具链-development-essentials` | `YYC3-Tool-开发工具/development-essentials` | 18 | 0.0 MB | md, json |  |
| 308 | Tool-开发工具链 | `YYC3-Tool-开发工具链-dotnet` | `YYC3-E/dotnet` | 13,710 | 34.1 MB | txt, cs, cshtml |  |
| 309 | Tool-开发工具链 | `YYC3-Tool-开发工具链-EasySpider` | `YYC3-Tool-开发工具/EasySpider` | 1,721 | 90.4 MB | json, png, js |  |
| 310 | Tool-开发工具链 | `YYC3-Tool-开发工具链-emmet` | `YYC3-Tool-开发工具/emmet` | 106 | 0.7 MB | ts, json, js |  |
| 311 | Tool-开发工具链 | `YYC3-Tool-开发工具链-examples` | `YYC3-Tool-开发工具/examples` | 2 | 0.0 MB | tsx, ts |  |
| 312 | Tool-开发工具链 | `YYC3-Tool-开发工具链-expand-abbreviation` | `YYC3-Syntax-语法定义/expand-abbreviation` | 18 | 0.0 MB | js, json, md |  |
| 313 | Tool-开发工具链 | `YYC3-Tool-开发工具链-feature-dev` | `YYC3-Tool-开发工具/feature-dev` | 7 | 0.0 MB | md, json |  |
| 314 | Tool-开发工具链 | `YYC3-Tool-开发工具链-git-commit-message-plus` | `YYC3-Tool-开发工具/git-commit-message-plus` | 44 | 3.5 MB | ts, json, js |  |
| 315 | Tool-开发工具链 | `YYC3-Tool-开发工具链-graphify` | `YYC3-Business-商业/graphify` | 131 | 1.5 MB | py, md, json |  |
| 316 | Tool-开发工具链 | `YYC3-Tool-开发工具链-Handlebars` | `YYC3-Tool-开发工具/Handlebars` | 23 | 0.1 MB | sublime-snippet, json, md |  |
| 317 | Tool-开发工具链 | `YYC3-Tool-开发工具链-js-beautify` | `YYC3-Tool-开发工具/js-beautify` | 192 | 2.7 MB | js, py, md |  |
| 318 | Tool-开发工具链 | `YYC3-Tool-开发工具链-json-server` | `YYC3-Tool-开发工具/json-server` | 33 | 0.1 MB | ts, json, yml |  |
| 319 | Tool-开发工具链 | `YYC3-Tool-开发工具链-markdown-it-katex` | `YYC3-Tool-开发工具/markdown-it-katex` | 19 | 0.2 MB | json, txt, md |  |
| 320 | Tool-开发工具链 | `YYC3-Tool-开发工具链-marked` | `YYC3-Tool-开发工具/marked` | 419 | 1.2 MB | md, html, js |  |
| 321 | Tool-开发工具链 | `YYC3-Tool-开发工具链-node-semver` | `YYC3-Tool-开发工具/node-semver` | 151 | 0.3 MB | js, yml, md |  |
| 322 | Tool-开发工具链 | `YYC3-Tool-开发工具链-platformio-core` | `YYC3-G/platformio-core` | 353 | 1.5 MB | py, tpl, yml |  |
| 323 | Tool-开发工具链 | `YYC3-Tool-开发工具链-ppt-writer` | `YYC3-Tool-开发工具/ppt-writer` | 6 | 0.0 MB | md, json |  |
| 324 | Tool-开发工具链 | `YYC3-Tool-开发工具链-pr-review-toolkit` | `YYC3-Tool-开发工具/pr-review-toolkit` | 10 | 0.1 MB | md, json |  |
| 325 | Tool-开发工具链 | `YYC3-Tool-开发工具链-prettier` | `YYC3-Tool-开发工具/prettier` | 9,255 | 22.1 MB | js, snap, ts |  |
| 326 | Tool-开发工具链 | `YYC3-Tool-开发工具链-ralph-loop` | `YYC3-Tool-开发工具/ralph-loop` | 9 | 0.0 MB | md, json, sh |  |
| 327 | Tool-开发工具链 | `YYC3-Tool-开发工具链-Raphael-Publish` | `YYC3-Tool-开发工具/Raphael-Publish` | 48 | 16.3 MB | ts, tsx, json |  |
| 328 | Tool-开发工具链 | `YYC3-Tool-开发工具链-razor` | `YYC3-Framework-框架/razor` | 13,154 | 32.0 MB | txt, cs, cshtml |  |
| 329 | Tool-开发工具链 | `YYC3-Tool-开发工具链-razor-v2` | `YYC3-B/razor` | 13,710 | 34.1 MB | txt, cs, cshtml | 版本变体 |
| 330 | Tool-开发工具链 | `YYC3-Tool-开发工具链-repomix` | `YYC3-Tool-开发工具/repomix` | 1,054 | 7.1 MB | md, ts, json |  |
| 331 | Tool-开发工具链 | `YYC3-Tool-开发工具链-ruff` | `YYC3-Tool-开发工具/ruff` | 9,824 | 73.5 MB | snap, py, rs |  |
| 332 | Tool-开发工具链 | `YYC3-Tool-开发工具链-spec-factory` | `YYC3-Spec-规范工具/spec-factory` | 19 | 0.0 MB | template, py, template-part |  |
| 333 | Tool-开发工具链 | `YYC3-Tool-开发工具链-superpowers` | `YYC3-I/superpowers` | 147 | 0.9 MB | md, sh, txt |  |
| 334 | Tool-开发工具链 | `YYC3-Tool-开发工具链-superpowers-chrome` | `YYC3-B/superpowers-chrome` | 32 | 0.2 MB | md, sh, json |  |
| 335 | Tool-开发工具链 | `YYC3-Tool-开发工具链-superpowers-v3` | `YYC3-B/superpowers` | 48 | 0.3 MB | md, json, sh | 版本变体 |
| 336 | Tool-开发工具链 | `YYC3-Tool-开发工具链-swagger-ui` | `YYC3-H/swagger-ui` | 961 | 5.4 MB | js, jsx, yaml |  |
| 337 | Tool-开发工具链 | `YYC3-Tool-开发工具链-tools` | `YYC3-Tool-开发工具/tools` | 2,814 | 18.8 MB | go, txt, golden |  |
| 338 | Tool-开发工具链 | `YYC3-Tool-开发工具链-version` | `YYC3-Tool-开发工具/version` | 151 | 0.3 MB | js, yml, md |  |
| 339 | Tool-开发工具链 | `YYC3-Tool-开发工具链-vize` | `YYC3-G/vize` | 4,647 | 49.7 MB | rs, snap, ts |  |
| 340 | TypeDef-类型定义 | `YYC3-TypeDef-类型定义-DefinitelyTyped` | `YYC3-TypeDef-类型定义/DefinitelyTyped` | 62,618 | 265.4 MB | ts, json, tsx |  |
| 341 | TypeDef-类型定义 | `YYC3-TypeDef-类型定义-types` | `YYC3-TypeDef-类型定义/types` | 62,638 | 265.4 MB | ts, json, tsx |  |
| 342 | UI-界面组件 | `YYC3-UI-界面组件-ant-design` | `YYC3-UI-用户界面/ant-design` | 4,770 | 48.9 MB | tsx, md, ts |  |
| 343 | UI-界面组件 | `YYC3-UI-界面组件-archived-components` | `YYC3-UI-用户界面/archived-components` | 9 | 0.1 MB | tsx |  |
| 344 | UI-界面组件 | `YYC3-UI-界面组件-Button` | `YYC3-UI-用户界面/Button` | 103 | 0.6 MB | tsx, ts, md |  |
| 345 | UI-界面组件 | `YYC3-UI-界面组件-mui-x` | `YYC3-UI-用户界面/mui-x` | 9,604 | 38.2 MB | ts, tsx, js |  |
| 346 | UI-界面组件 | `YYC3-UI-界面组件-onlook` | `YYC3-UI-用户界面/onlook` | 1,551 | 25.5 MB | ts, tsx, json |  |
| 347 | UI-界面组件 | `YYC3-UI-界面组件-shadcn-ui` | `YYC3-UI-用户界面/shadcn-ui` | 8,584 | 68.6 MB | json, tsx, ts |  |
| 348 | UI-界面组件 | `YYC3-UI-界面组件-shadcn-ui.tnasdownload` | `YYC3-A/shadcn-ui.tnasdownload` | 8,581 | 68.6 MB | json, tsx, ts |  |
| 349 | UI-界面组件 | `YYC3-UI-界面组件-tdesign-vue-next` | `YYC3-UI-用户界面/tdesign-vue-next` | 2,900 | 18.9 MB | vue, ts, tsx |  |
| 350 | UI-界面组件 | `YYC3-UI-界面组件-ui` | `YYC3-UI-用户界面/ui` | 8,579 | 68.5 MB | json, tsx, ts |  |
| 351 | UI-界面组件 | `YYC3-UI-界面组件-web-ui` | `YYC3-UI-用户界面/web-ui` | 55 | 0.1 MB | ts, map, js |  |
| 352 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-background-sync` | `YYC3-WebSpec-Web标准/background-sync` | 16 | 0.4 MB | md, html, json |  |
| 353 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-blog.whatwg.org` | `YYC3-WebSpec-Web标准/blog.whatwg.org` | 33 | 0.3 MB | php, jpg, css |  |
| 354 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-build.whatwg.org` | `YYC3-WebSpec-Web标准/build.whatwg.org` | 12 | 0.1 MB | json, yml, md |  |
| 355 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-compat` | `YYC3-WebSpec-Web标准/compat` | 40 | 0.4 MB | md, bs, yml |  |
| 356 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-compression` | `YYC3-WebSpec-Web标准/compression` | 18 | 0.1 MB | md, bs, yml |  |
| 357 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-console` | `YYC3-WebSpec-Web标准/console` | 36 | 0.5 MB | png, bs, md |  |
| 358 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-cookiestore` | `YYC3-WebSpec-Web标准/cookiestore` | 17 | 0.2 MB | md, yml, bs |  |
| 359 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-dom` | `YYC3-WebSpec-Web标准/dom` | 30 | 6.9 MB | bs, yml, md |  |
| 360 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-domparsing` | `YYC3-WebSpec-Web标准/domparsing` | 30 | 0.2 MB | html, xhtml, js |  |
| 361 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-encoding` | `YYC3-WebSpec-Web标准/encoding` | 69 | 4.9 MB | txt, bs, py |  |
| 362 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-fetch` | `YYC3-WebSpec-Web标准/fetch` | 30 | 5.7 MB | bs, yml, md |  |
| 363 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-fs` | `YYC3-WebSpec-Web标准/fs` | 23 | 0.5 MB | md, bs, yml |  |
| 364 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-fullscreen` | `YYC3-WebSpec-Web标准/fullscreen` | 26 | 0.4 MB | bs, yml, md |  |
| 365 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-html` | `YYC3-WebSpec-Web标准/html` | 128 | 109.4 MB | png, js, wattsi |  |
| 366 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-html-build` | `YYC3-WebSpec-Web标准/html-build` | 42 | 0.8 MB | rs, sh, md |  |
| 367 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-i18n` | `YYC3-WebSpec-Web标准/i18n` | 13,901 | 267.9 MB | txt, res, java |  |
| 368 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-infra` | `YYC3-WebSpec-Web标准/infra` | 28 | 1.3 MB | bs, yml, md |  |
| 369 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-loader` | `YYC3-WebSpec-Web标准/loader` | 10 | 0.1 MB | md, js, bs |  |
| 370 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-mimesniff` | `YYC3-WebSpec-Web标准/mimesniff` | 25 | 0.9 MB | bs, yml, md |  |
| 371 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-notifications` | `YYC3-WebSpec-Web标准/notifications` | 24 | 0.5 MB | bs, yml, md |  |
| 372 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-old-google-code-html5` | `YYC3-Syntax-语法定义/old-google-code-html5` | 127 | 0.4 MB | py, tmpl, dat |  |
| 373 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-participate.whatwg.org` | `YYC3-WebSpec-Web标准/participate.whatwg.org` | 65 | 0.4 MB | mjs, json, hbs |  |
| 374 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-platform.html5.org` | `YYC3-WebSpec-Web标准/platform.html5.org` | 71 | 60.5 MB | png, html, inc |  |
| 375 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-quirks` | `YYC3-WebSpec-Web标准/quirks` | 19 | 0.2 MB | bs, yml, md |  |
| 376 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-standards` | `YYC3-WebSpec-Web标准/standards` | 853 | 144.4 MB | bs, md, yml |  |
| 377 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-storage` | `YYC3-WebSpec-Web标准/storage` | 28 | 0.3 MB | bs, yml, md |  |
| 378 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-streams` | `YYC3-WebSpec-Web标准/streams` | 115 | 7.1 MB | js, webidl, bs |  |
| 379 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-testutils` | `YYC3-WebSpec-Web标准/testutils` | 16 | 0.0 MB | yml, md, bs |  |
| 380 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-url` | `YYC3-WebSpec-Web标准/url` | 31 | 2.3 MB | bs, md, yml |  |
| 381 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-urlpattern` | `YYC3-WebSpec-Web标准/urlpattern` | 24 | 0.6 MB | md, bs, yml |  |
| 382 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-wattsi` | `YYC3-WebSpec-Web标准/wattsi` | 70 | 2.4 MB | pas, json, md |  |
| 383 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-websockets` | `YYC3-WebSpec-Web标准/websockets` | 17 | 0.2 MB | bs, yml, md |  |
| 384 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-whattweetbot-keys` | `YYC3-WebSpec-Web标准/whattweetbot-keys` | 7 | 0.0 MB | json, md, js |  |
| 385 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-wiki.whatwg.org` | `YYC3-WebSpec-Web标准/wiki.whatwg.org` | 6 | 0.0 MB | php, md, sh |  |
| 386 | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-xhr` | `YYC3-WebSpec-Web标准/xhr` | 25 | 0.9 MB | bs, yml, md |  |

## 五、命名与追溯规则

1. **当前目录** = `YYC3-{分类名称}-{项目原名}`，原名中的空格归一为 `-`。
2. **原始路径** 记录迁移前的字母桶/领域桶位置，用于回溯；`YYC3-A`~`YYC3-N` 已全部废弃。
3. **版本变体**：同名但内容存在真实差异的项目保留 `-v2/-v3` 后缀；内容完全被覆盖的变体已清除。
4. **回滚**：`git checkout pre-governance-20261110 -- <原始路径>` 可恢复任一迁移前副本。
5. **机器可读清单**：[YYC3-项目治理-回滚清单.csv](./YYC3-项目治理-资产盘点/YYC3-项目治理-回滚清单.csv)。

## 六、关联文档

| 文档 | 说明 |
| --- | --- |
| [资产看板](../docs/YYC3-KNOWLEDGE-BASE.html) | 可交互看板：搜索、过滤、归档、详情 |
| [分类架构索引](./YYC3-Knowledge-Base/index.html) | 24 个分类的可视化架构入口 |
| [治理报告](./YYC3-项目治理-资产盘点/README.md) | 扫描方法、去重明细、版本裁决记录 |
| [分类映射 CSV](./YYC3-项目治理-资产盘点/YYC3-项目治理-分类映射.csv) | 机器可读映射（含首次扫描口径） |

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| --- | --- | --- | --- |
| v1.0.0 | 2026-11-10 | 首次生成全量映射：24 类、386 项目、670,941 文件逐项对照 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
