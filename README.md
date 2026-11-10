<p align="center">
  <img src="public/Family-002.png" alt="YYC3 Knowledge Base" width="100%" style="max-width: 1000px; border-radius: 12px;" />
</p>

<p align="center">
  <strong>言启千行代码 · 语枢万物智能</strong>
</p>

<p align="center">
  下一代 AI 知识库与智能技能管理平台 — 五维驱动 · 全链路闭环
</p>

<p align="center">
  <a href="#-项目概览"><img src="https://img.shields.io/badge/📖-项目概览-8B5CF6?style=flat-square" alt="项目概览" /></a>
  <a href="#-架构全景"><img src="https://img.shields.io/badge/🏗️-架构全景-10B981?style=flat-square" alt="架构全景" /></a>
  <a href="#-核心生态"><img src="https://img.shields.io/badge/🧩-核心生态-3B82F6?style=flat-square" alt="核心生态" /></a>
  <a href="#-五维驱动"><img src="https://img.shields.io/badge/📊-五维驱动-F59E0B?style=flat-square" alt="五维驱动" /></a>
  <a href="#-快速开始"><img src="https://img.shields.io/badge/🚀-快速开始-EF4444?style=flat-square" alt="快速开始" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/状态-活跃开发-success?style=flat-square" alt="状态" />
  <img src="https://img.shields.io/badge/版本-3.0.0-blue?style=flat-square" alt="版本" />
  <img src="https://img.shields.io/badge/许可证-MIT-yellow?style=flat-square" alt="许可证" />
  <img src="https://img.shields.io/badge/架构-五维驱动-8B5CF6?style=flat-square" alt="架构" />
  <img src="https://img.shields.io/badge/生态-NVIDIA%20AI-76B900?style=flat-square" alt="生态" />
  <img src="https://img.shields.io/badge/指南-40+-orange?style=flat-square" alt="指南" />
  <img src="https://img.shields.io/badge/步骤-200+-green?style=flat-square" alt="步骤" />
  <img src="https://img.shields.io/badge/分类-9-06B6D4?style=flat-square" alt="分类" />
  <img src="https://img.shields.io/badge/运行时-纯前端-FF6B6B?style=flat-square" alt="运行时" />
  <img src="https://img.shields.io/badge/存储-localStorage-F97316?style=flat-square" alt="存储" />
  <img src="https://img.shields.io/badge/📊-工作区展示-F97316?style=flat-square" alt="工作区展示" />
  <img src="https://img.shields.io/badge/项目-54个-8B5CF6?style=flat-square" alt="项目数" />
  <img src="https://img.shields.io/badge/领域-16个-06B6D4?style=flat-square" alt="领域数" />
  <img src="https://img.shields.io/badge/PR-欢迎-2EA043?style=flat-square" alt="PR" />
</p>

---

## 📖 项目概览

**YYC3 Knowledge Base** 是一个面向 NVIDIA AI 全栈生态的下一代智能知识库与技能管理平台。以"五维驱动"为核心理念，覆盖从 **RAG 检索增强生成**、**NemoClaw 沙箱安全**、**Dynamo 推理服务编排**、**Megatron-Bridge 分布式训练** 到 **NeMo 全链路模型自动化** 的完整 AI 基础设施知识体系。

### 核心特性

| 特性 | 说明 |
|------|------|
| 🎯 **全栈覆盖** | NVIDIA AI 生态 9 大分类、40+ 实践指南、200+ 操作步骤 |
| 🎨 **卡片化看板** | 可视化仪表盘，进度追踪、分类筛选、难度标记一目了然 |
| 🔗 **步骤级深度链接** | 支持直达任意步骤的 URL 哈希路由，分享与导航精准高效 |
| 💾 **离线持久化** | 基于 localStorage 的进度管理，断网可用，隐私安全 |
| 🌓 **暗亮双主题** | 自适应主题系统，持久化用户偏好 |
| 📋 **进度可视化** | 全局进度条 + 卡片级步骤计数器，学习路径清晰可控 |
| 📤 **导出/导入** | 进度数据可导出备份或跨设备迁移 |
| 🗂️ **工作区总览** | [YYC3-KNOWLEDGE-BASE.html](docs/YYC3-KNOWLEDGE-BASE.html) 展示 **24 个分类、386 个项目、670,941 个文件** 的全量资产看板 |
| 🧭 **分类架构索引** | [docs/YYC3-Knowledge-Base/index.html](docs/YYC3-Knowledge-Base/index.html) 逐类可视化架构（技术构成 / 迁移来源 / 项目清单） |
| 🗺️ **全局汇总映射** | [docs/YYC3-项目治理-全局汇总映射.md](docs/YYC3-项目治理-全局汇总映射.md) 386 个项目的「当前目录 ↔ 原始路径」全量对照 |

---

## 🏗️ 架构全景

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          YYC3 KNOWLEDGE BASE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │                     FRONTEND LAYER                            │           │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐  │           │
│  │  │ THEME    │  │ SIDEBAR      │  │ DASHBOARD              │  │           │
│  │  │  ├─暗/亮  │  │  ├─分组导航   │  │  ├─统计汇总            │  │           │
│  │  │  └─持久化 │  │  ├─搜索过滤   │  │  ├─过滤栏(分类/难度)   │  │           │
│  │  │          │  │  ├─进度条     │  │  └─卡片网格            │  │           │
│  │  │ ROUTER   │  │  └─导出/导入  │  │    ├─进度徽章          │  │           │
│  │  │  ├─hash  │  │              │  │    ├─步骤预览条         │  │           │
│  │  │  └─解析   │  │ DETAIL      │  │    └─模态框触发器       │  │           │
│  │  │          │  │  ├─概述表格   │  │                      │  │           │
│  │  │ STORAGE  │  │  ├─步骤列表   │  │ MODAL               │  │           │
│  │  │  ├─guide │  │  ├─代码块    │  │  ├─全部步骤列表       │  │           │
│  │  │  ├─step  │  │  └─完成勾选  │  │  └─逐项跳转          │  │           │
│  │  │  └─theme │  │              │  │                      │  │           │
│  │  └──────────┘  └──────────────┘  └────────────────────────┘  │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                    │                                        │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │                     DATA LAYER                                │           │
│  │  ┌────────────────────────────────────────────────────────┐  │           │
│  │  │              GUIDES (40 guides, 200+ steps)            │  │           │
│  │  │  RAG │ NemoClaw │ Dynamo │ Megatron │ NeMo │ Earth2   │  │           │
│  │  └────────────────────────────────────────────────────────┘  │           │
│  │  ┌────────────────────────────────────────────────────────┐  │           │
│  │  │              STORAGE (localStorage)                     │  │           │
│  │  │  guide-done-{id} │ step-done-{id}-{n} │ theme          │  │           │
│  │  └────────────────────────────────────────────────────────┘  │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                    │                                        │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │                 KNOWLEDGE BASE · 24 分类目录                 │           │
│  │ AI-应用工具  AI-模型服务  Agent-智能体                       │           │
│  │ UI-界面组件  Frontend-前端框架  Desktop-桌面应用             │           │
│  │ IDE-编辑器内核  Editor-编辑器扩展  Syntax-语法高亮           │           │
│  │ LSP-语言服务  TypeDef-类型定义  Tool-开发工具链              │           │
│  │ Shell-终端  Cloud-云原生  Data-数据存储                      │           │
│  │ Security-安全合规  Finance-金融量化  WebSpec-Web标准         │           │
│  │ Runtime-标准库  Skills-技能包  Plugin-插件协议               │           │
│  │ Design-设计资源  Business-商业应用  Doc-文档知识             │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 🎨 **UI** | HTML5 + CSS3 (CSS Variables) | 纯原生渲染，零依赖 |
| ⚡ **逻辑** | Vanilla JavaScript (ES6+) | ~25KB 核心引擎 + ~80KB 数据 |
| 🔗 **路由** | Hash-based Router | `#guide-{id}[-step-{n}]` 深度链接 |
| 💾 **存储** | Web localStorage | 40篇指南约4KB，远未触及5MB上限 |
| 🔤 **字体** | Google Fonts (Inter) | 按需加载，~15KB |
| 📦 **总大小** | ~120KB | 首次加载3个HTTP请求 |

---

## 🧩 核心生态

### 知识体系模块

```
YYC3 Knowledge Base
│
├── 🤖 YYC3-Agent-智能体 — 自主任务编排、编码智能体与多智能体框架
├── 🧠 YYC3-AI-模型服务 — LLM 网关、推理、训练/蒸馏、RAG
├── ✨ YYC3-AI-应用工具 — 面向终端用户的 AI 应用与提示词工程
├── 🎨 YYC3-UI-界面组件 — 组件库、设计系统、主题包
├── 🧱 YYC3-Frontend-前端框架 — 应用级前端框架与模板站
├── 🖥️ YYC3-Desktop-桌面应用 — Electron / Flutter 桌面端成品
├── 🛠️ YYC3-IDE-编辑器内核 — 编辑器/IDE 主体实现与发行版
├── 🧩 YYC3-Editor-编辑器扩展 — 编辑器插件、语言扩展与主题 UI
├── 🎨 YYC3-Syntax-语法高亮 — TextMate bundle、tmLanguage 语法定义
├── 🗣️ YYC3-LSP-语言服务 — 语言服务器、语言工具链与代码分析
├── 📐 YYC3-TypeDef-类型定义 — TypeScript 类型声明与类型仓库
├── 🔧 YYC3-Tool-开发工具链 — 格式化、构建、CLI、包管理、文档工具
├── ⌨️ YYC3-Shell-终端 — Shell 实现、终端增强与命令补全
├── ☁️ YYC3-Cloud-云原生 — 容器、Kubernetes、Serverless、CI/CD
├── 🗄️ YYC3-Data-数据存储 — 数据库、存储引擎、数据处理
├── 🛡️ YYC3-Security-安全合规 — 安全扫描、规则库、攻防与合规
├── 📈 YYC3-Finance-金融量化 — 量化交易、风控与金融数据建模
├── 🌐 YYC3-WebSpec-Web标准 — WHATWG/W3C 规范与配套工具链
├── 🐍 YYC3-Runtime-标准库 — 语言运行时与标准库实现
├── 🧰 YYC3-Skills-技能包 — Agent Skill 集合与技能市场
├── 🔌 YYC3-Plugin-插件协议 — MCP 协议、插件宿主与注册表
├── 🖼️ YYC3-Design-设计资源 — 图标、主题、视觉素材与设计规范
├── 💼 YYC3-Business-商业应用 — 商业场景应用与行业模板
├── 📚 YYC3-Doc-文档知识 — 书籍、课程与规范解读
│
└── 📚 docs — 项目文档
    ├── YYC3-KNOWLEDGE-BASE.html — 资产看板（24 类 / 386 项目，可脱机分享）
    ├── YYC3-Knowledge-Base/ — 24 类可视化架构索引（index.html + 24 张分类页）
    ├── YYC3-项目治理-全局汇总映射.md — 386 项目「当前目录 ↔ 原始路径」全量对照
    ├── YYC3-项目治理-资产盘点 — 全局资产扫描、重复项与版本裁决
    ├── DGX-SPARK-HUB.html — DGX Spark 操作中心（在线版）
    ├── DGX-SPARK-HUB-OFFLINE.html — DGX Spark 操作中心（离线版）
    ├── 技术实现边界.md — 架构设计与延伸路径
    ├── 卡片信息.md — 卡片数据规范
    └── 命令信息.md — CLI 命令索引
```

### AI 实践指南体系

| # | 生态域 | 指南数 | 核心能力 |
|---|--------|:------:|----------|
| 1 | 🔒 **NemoClaw** — 沙箱安全与管理 | 16 | 安全配置、策略管理、沙箱部署、监控 |
| 2 | 🔍 **RAG** — 检索增强生成 | 12 | 蓝图部署、性能基准、质量评估、检索配方 |
| 3 | ⚡ **Dynamo** — 推理服务编排 | 11 | 路由器、配方部署、互联检查、故障排除 |
| 4 | 🚀 **Megatron-Bridge** — 分布式训练 | 30 | 多节点 Slurm、MoE 优化、FSDP、并行策略 |
| 5 | 🤖 **NeMo AutoModel** — 模型自动化 | 6 | 启动配置、分布式训练、模型接入 |
| 6 | 🎯 **NeMo-RL** — 强化学习 | 6 | 自动研究、启动部署、会话内存 |
| 7 | 🗣️ **Nemotron** — 语音与定制化 | 4 | 语音 Riva、定制化服务 |
| 8 | 🌤️ **Earth2Studio** — 天气气候 AI | 7 | 气候模型、地球系统模拟 |
| 9 | 📊 **其他生态** | — | 性能优化、部署运维、最佳实践 |

---

## 📊 五维驱动

### 五高架构

| 维度 | 实现 | 标准 |
|------|------|------|
| **高可用** | 纯前端离线运行，零服务端依赖 | 99.9% 可用性 |
| **高性能** | 单页面应用，~120KB 全量加载 | <500ms 首屏渲染 |
| **高安全** | 无服务端通信，全量本地存储 | 数据不出设备 |
| **高可扩展** | 模块化数据架构，支持渐进增强 | 40+ 指南持续增长 |
| **高智能** | 步骤级深度链接、模糊搜索增强 | 精准知识导航 |

### 五化标准

```
标准化 ─── 统一的卡片/步骤/分类数据规范
规范化 ─── 一致的命名、编码、存储模式
自动化 ─── 进度追踪、状态同步、导出导入全自动
可视化 ─── 看板仪表盘、进度条、分类色标体系
智能化 ─── 深度链接路由、自适应主题、智能过滤
```

### 五维评价

```
时间维度 ─── 开发效率 → 构建速度 → 加载优化
空间维度 ─── 代码组织 → 组件架构 → 资源效率
属性维度 ─── 性能 → 安全 → 可维护 → 可复用
事件维度 ─── 交互处理 → 状态管理 → 错误处理
关联维度 ─── 组件依赖 → API 集成 → 生态连接
```

---

## 🚀 快速开始

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/YYC-Cube/YYC3-Knowledge-Base.git

# 工作区总览（推荐入口）
open docs/YYC3-KNOWLEDGE-BASE.html

# DGX Spark 操作中心
open docs/DGX-SPARK-HUB.html

# 或使用本地服务器
python3 -m http.server 8080
# 访问 http://localhost:8080/docs/YYC3-KNOWLEDGE-BASE.html
```

### 使用场景

```
�️ 浏览工作区总览 → 通过 YYC3-KNOWLEDGE-BASE.html 查看全部 386 个项目卡片
🧭 按分类查看架构 → 通过 docs/YYC3-Knowledge-Base/index.html 进入 24 类可视化架构页
🗺️ 追溯项目来源 → 通过「全局汇总映射」查看当前目录与迁移前原始路径
� 学习 NVIDIA AI 全栈技术 → 通过 DGX-SPARK-HUB 看板浏览 40+ 实践指南
🎯 按步骤操作 AI 基础设施 → 利用深度链接直达任意步骤
📊 追踪学习进度 → 自动保存每一步的完成状态
🔍 快速检索知识 → 通过分类/难度过滤 + 搜索定位
📤 迁移工作进度 → 导出/导入进度数据跨设备同步
```

### 自定义扩展

```javascript
// 添加新的指南
const newGuide = {
  id: "custom-001",
  category: "custom",
  title: "自定义指南",
  difficulty: "⭐",
  time: "30 min",
  tags: ["自定义"],
  steps: [
    { n: 1, title: "第一步", meta: "10 min" },
    { n: 2, title: "第二步", meta: "20 min" }
  ]
};
GUIDES.push(newGuide);
```

---

## 🔗 相关资源

| 资源 | 链接 |
|------|------|
| 📦 GitHub 仓库 | [YYC3-Knowledge-Base](https://github.com/YYC-Cube/YYC3-Knowledge-Base.git) |
| 🗂️ 工作区总览 | [docs/YYC3-KNOWLEDGE-BASE.html](docs/YYC3-KNOWLEDGE-BASE.html) |
| 🧭 分类架构索引 | [docs/YYC3-Knowledge-Base/index.html](docs/YYC3-Knowledge-Base/index.html) |
| 🗺️ 全局汇总映射 | [docs/YYC3-项目治理-全局汇总映射.md](docs/YYC3-项目治理-全局汇总映射.md) |
| 🧾 治理报告 | [docs/YYC3-项目治理-资产盘点/README.md](docs/YYC3-项目治理-资产盘点/README.md) |
| 🚀 DGX Spark 操作中心 | [docs/DGX-SPARK-HUB.html](docs/DGX-SPARK-HUB.html) |
| 📖 项目文档 | [docs/](docs/) |
| 🖼️ 品牌资源 | [public/](public/) |
| 📋 卡片规范 | [docs/卡片信息.md](docs/卡片信息.md) |
| 🏗️ 技术架构 | [docs/技术实现边界.md](docs/技术实现边界.md) |
| 📟 命令索引 | [docs/命令信息.md](docs/命令信息.md) |

---

<p align="center">
  <sub>Built with ❤️ by the YYC3 Team · 五维驱动 · 智能赋能</sub>
  <br />
  <sub>言启千行代码，语枢万物智能</sub>
</p>
