# CB Teams Marketplace

CodeBuddy Teams Marketplace - 团队协作、文档处理、金融分析与开发工具插件集合

## 插件列表

共 **27 个插件**，覆盖 6 大类别：

### 生产力工具 (Productivity)

| 插件名 | 版本 | 描述 |
|--------|------|------|
| **internal-comms** | 1.0.0 | 内部沟通文档编写工具（3P 更新、状态报告、FAQ、事故报告等） |
| **executing-marketing-campaigns** | 1.0.0 | 营销活动策划与执行（内容策略、社媒、邮件营销） |
| **document-skills** | 1.0.0 | 文档处理套件（Excel、Word、PPT、PDF） |
| **data-analysis** | 1.0.0 | 数据分析插件（Excel 表格创建、编辑、分析） |
| **ppt-implement** | 1.0.13 | 智能 PPT 生成助手（10 种演示风格、丰富模板库） |
| **data** | 1.0.0 | 数据分析（SQL 查询、数据探索、可视化、仪表板） |
| **finance** | 1.0.0 | 财务与会计（月末结账、日记账、账户核对、财务报表） |
| **product-management** | 1.0.0 | 产品管理（功能规格、路线图、用户研究、竞品分析） |

### 金融工具 (Finance)

| 插件名 | 版本 | 描述 |
|--------|------|------|
| **financial-analysis** | 1.0.0 | 金融分析（DCF 估值、可比公司分析、LBO 模型、三张表） |
| **investment-banking** | 1.0.0 | 投资银行（CIM 撰写、并购模型、买方名单、Pitch Deck） |
| **equity-research** | 1.0.0 | 股票研究（财报分析、覆盖报告、晨会纪要、选股筛选） |
| **private-equity** | 1.0.0 | 私募股权（Deal Sourcing、尽调、IC Memo、投后管理） |
| **wealth-management** | 1.0.0 | 财富管理（客户回顾、财务规划、投资组合再平衡） |
| **lseg** | 1.0.0 | LSEG 金融数据（债券分析、外汇套利、期权波动率） |
| **spglobal** | 1.0.0 | S&P Global 数据（公司 Tearsheet、财报预览、交易摘要） |
| **finance-data** | 1.0.0 | 金融数据检索（209 个 API 接口，覆盖 15 大类数据） |
| **trading-assistant** | 1.0.0 | 交易分析助手（多角色辩论方法论，BUY/SELL/HOLD 建议） |

### 开发工具 (Development)

| 插件名 | 版本 | 描述 |
|--------|------|------|
| **modern-webapp** | 1.0.0 | 现代 Web 应用开发（React、TypeScript、Vite、Tailwind） |
| **design-to-code** | 1.0.0 | Figma 设计转代码（React、Svelte、Vue） |
| **codebuddy-chat-web** | 1.0.0 | CodeBuddy Agent SDK Web 聊天应用 |
| **webapp-testing** | 1.0.0 | Web 应用测试助手 |
| **dockerfile-gen** | 1.0.0 | 自动化 Dockerfile 生成 |
| **agent-sdk-dev** | 1.0.0 | CodeBuddy Agent SDK 应用开发（Python & TypeScript） |

### 研究工具 (Research)

| 插件名 | 版本 | 描述 |
|--------|------|------|
| **deep-research** | 1.0.0 | 深度研究（网络调研、信息综合、微信文章检索） |

### 通用工具 (Utility)

| 插件名 | 版本 | 描述 |
|--------|------|------|
| **general-skills** | 1.0.0 | 通用技能集合（文档转换、UI/UX 设计、前端开发） |

### 内容创作 (Content Creation)

| 插件名 | 版本 | 描述 |
|--------|------|------|
| **remotion-video-generator** | 1.0.0 | Remotion 视频生成（讲解视频、产品演示、社媒内容） |

### 其他

| 插件名 | 描述 |
|--------|------|
| **skill-creator** | 技能创建指南 |

## 快速开始

### 方式一：团队配置自动安装（推荐）

在项目的 `.codebuddy/settings.json` 中添加：

```json
{
  "extraKnownMarketplaces": {
    "cb_teams_marketplace": {
      "source": {
        "source": "github",
        "repo": "codebuddy/cbteamsmarketplace"
      }
    }
  },
  "enabledPlugins": {
    "internal-comms@cb_teams_marketplace": true,
    "document-skills@cb_teams_marketplace": true,
    "ppt-implement@cb_teams_marketplace": true,
    "finance-data@cb_teams_marketplace": true
  }
}
```

团队成员启动 CodeBuddy 时会自动安装这些插件。

### 方式二：交互式安装

```bash
# 1. 添加市场
/plugin marketplace add codebuddy/cbteamsmarketplace

# 2. 浏览并安装插件
/plugin

# 或直接安装
/plugin install internal-comms@cb_teams_marketplace
```

### 方式三：命令行安装

```bash
# 添加市场
codebuddy plugin marketplace add https://cnb.cool/codebuddy/cbteamsmarketplace

# 安装插件
codebuddy plugin install internal-comms@cb_teams_marketplace
```

## 插件详情

### internal-comms

内部沟通文档编写工具，支持多种企业内部沟通格式。

**包含功能：** 3P 更新、公司通讯、FAQ 回复、状态报告、领导汇报、事故报告

---

### executing-marketing-campaigns

营销活动策划与执行工具，包含完整的营销工作流。

**包含功能：** 活动策划框架、内容创作指南、社交媒体策略、邮件营销模板、数据分析与 KPI、品牌指南

---

### document-skills

文档处理套件，支持主流办公文档格式的创建、编辑和分析。

| 技能 | 功能 |
|------|------|
| **xlsx** | Excel 电子表格创建、编辑、公式、数据分析、可视化 |
| **docx** | Word 文档创建、编辑、格式化、追踪修改、批注 |
| **pptx** | PowerPoint 演示文稿创建和编辑 |
| **pdf** | PDF 文档处理、表单填写、文本提取、表格提取 |

---

### general-skills

通用技能集合，包含文档转换、设计和开发辅助功能。

**包含技能：** markitdown（文档格式转换）、find-skills（技能发现）、ui-ux-pro-max（UI/UX 设计）、frontend-design（前端设计）

---

### data-analysis

数据分析插件，专注于 Excel 表格的创建、编辑和数据分析，同时支持微信公众号文章检索。

---

### modern-webapp

现代 Web 应用开发插件，集成主流前端技术栈。

**技术栈：** React + TypeScript、Vite、Tailwind CSS、shadcn/ui

**包含技能：** modern-web-app（项目初始化和开发）、ui-ux-pro-max（UI/UX 设计）、lucide-icons（图标管理）、agent-browser（浏览器测试）

---

### ppt-implement

智能 PPT 生成助手，支持 10 种演示风格。

**风格：** 极简、中国风、商务、几何、文艺、黑金、卡通、科技、扁平、手绘

---

### deep-research

深度研究插件，支持全面的网络调研和信息综合。

**包含组件：** research-subagent（研究代理）、wechat-article-search（微信文章检索）

---

### data

数据分析插件，支持完整的数据分析工作流程。

**包含技能：** sql-queries、data-exploration、data-visualization、statistical-analysis、data-validation、interactive-dashboard-builder、data-analysis-workflows、data-context-extractor

---

### finance

财务与会计插件，支持完整的财务工作流。

**包含技能：** journal-entry-prep（日记账）、reconciliation（账户核对）、financial-statements（财务报表）、variance-analysis（差异分析）、close-management（月末结账）、audit-support（审计支持）

---

### product-management

产品管理插件，支持产品全生命周期管理。

**包含技能：** feature-spec（功能规格）、roadmap-management（路线图）、stakeholder-comms（利益相关者沟通）、user-research-synthesis（用户研究）、competitive-analysis（竞品分析）、metrics-tracking（指标追踪）

---

### design-to-code

将 Figma 设计和截图转换为生产就绪的代码组件，支持 React、Svelte、Vue 三种框架，内置无障碍性支持。

---

### codebuddy-chat-web

初始化基于 CodeBuddy Agent SDK 的 Web 聊天应用，包含 React 前端和 Express 后端。

---

### webapp-testing

Web 应用测试助手，引导用户启动、配置和测试 Web 应用。

---

### dockerfile-gen

自动化 Dockerfile 生成工具，遵循容器化最佳实践。

---

### remotion-video-generator

使用 Remotion 自动生成视频，支持讲解视频、产品演示、社交媒体内容和演示文稿。

**包含技能：** video-generator、scene-planner、environment-setup、remotion-best-practices、lucide-icons、bgm-library

---

### agent-sdk-dev

CodeBuddy Agent SDK 应用开发插件，支持 Python 和 TypeScript 项目脚手架与最佳实践验证。

---

### financial-analysis

金融分析核心工具。

**包含技能：** dcf-model（DCF 估值）、comps-analysis（可比公司分析）、lbo-model（LBO 模型）、3-statements（三张表模型）、competitive-analysis（竞争分析）、check-deck（PPT 质检）、check-model（模型质检）

---

### investment-banking

投资银行生产力工具。

**包含技能：** pitch-deck（Pitch Deck）、merger-model（并购模型）、cim-builder（CIM 撰写）、buyer-list（买方名单）、deal-tracker（交易追踪）、teaser（项目摘要）、datapack-builder（数据包）、process-letter（流程函）、strip-profile（Strip Profile）

---

### equity-research

股票研究工具。

**包含技能：** initiating-coverage（首次覆盖）、earnings-analysis（财报分析）、earnings-preview（盘前预览）、catalyst-calendar（催化日历）、idea-generation（选股）、model-update（模型更新）、morning-note（晨会纪要）、sector-overview（行业概览）、thesis-tracker（投资论点追踪）

---

### private-equity

私募股权工具。

**包含技能：** deal-sourcing（项目发掘）、deal-screening（项目筛选）、dd-checklist（尽调清单）、dd-meeting-prep（尽调会议准备）、ic-memo（IC Memo）、portfolio-monitoring（投后管理）、returns-analysis（回报分析）、unit-economics（单位经济学）、value-creation-plan（价值创造计划）

---

### wealth-management

财富管理与理财顾问工具。

**包含技能：** client-review（客户回顾）、client-report（客户报告）、financial-plan（财务规划）、investment-proposal（投资提案）、portfolio-rebalance（组合再平衡）、tax-loss-harvesting（税损收割）

---

### lseg

LSEG 金融数据与分析工具。

**包含技能：** bond-futures-basis、bond-relative-value、equity-research、fixed-income-portfolio、fx-carry-trade、macro-rates-monitor、option-vol-analysis、swap-curve-strategy

---

### spglobal

S&P Global 金融数据与分析。

**包含技能：** tear-sheet（公司概况）、earnings-preview-beta（财报预览）、funding-digest（融资摘要）

---

### finance-data

金融数据智能检索插件，通过自然语言自动查找并调用 209 个金融数据 API 接口，涵盖股票、指数、期货、债券、基金、宏观经济等 15 大类数据。

---

### trading-assistant

交易分析助手，基于多角色辩论方法论进行系统性投资分析。通过市场技术分析、基本面分析、新闻情绪分析、多空辩论、交易决策和三方风险评估，输出 BUY/SELL/HOLD 建议。

---

### skill-creator

提供创建高效技能的指南，通过专业知识、工作流程和工具集成来扩展 AI 助手的能力。

## 目录结构

```
cbteamsmarketplace/
├── .codebuddy-plugin/
│   └── marketplace.json              # 市场配置文件
├── plugins/
│   ├── internal-comms/               # 内部沟通
│   ├── executing-marketing-campaigns/ # 营销活动
│   ├── document-skills/              # 文档处理套件
│   ├── general-skills/               # 通用技能集合
│   ├── data-analysis/                # 数据分析（Excel）
│   ├── modern-webapp/                # 现代 Web 应用开发
│   ├── ppt-implement/                # PPT 生成
│   ├── deep-research/                # 深度研究
│   ├── data/                         # 数据分析（SQL、可视化）
│   ├── finance/                      # 财务与会计
│   ├── product-management/           # 产品管理
│   ├── design-to-code/               # 设计转代码
│   ├── codebuddy-chat-web/           # Chat Web 应用
│   ├── webapp-testing/               # Web 应用测试
│   ├── dockerfile-gen/               # Dockerfile 生成
│   ├── remotion-video-generator/     # 视频生成
│   ├── agent-sdk-dev/                # Agent SDK 开发
│   ├── skill-creator/                # 技能创建指南
│   ├── financial-analysis/           # 金融分析
│   ├── investment-banking/           # 投资银行
│   ├── equity-research/              # 股票研究
│   ├── private-equity/               # 私募股权
│   ├── wealth-management/            # 财富管理
│   ├── lseg/                         # LSEG 金融数据
│   ├── spglobal/                     # S&P Global 数据
│   ├── finance-data/                 # 金融数据检索
│   └── trading-assistant/            # 交易分析助手
├── CODEBUDDY.md                      # 项目开发规范
├── plugin-marketplaces.md            # 插件市场文档
├── plugins-reference.md              # 插件参考文档
├── scenes.json                       # 场景定义（中文）
├── scenes-en.json                    # 场景定义（英文）
└── README.md                         # 本文件
```

## 参考文档

- [插件市场文档](./plugin-marketplaces.md)
- [插件参考文档](./plugins-reference.md)

## 维护者

- Laurent Zhou (laurentzhou@tencent.com)
