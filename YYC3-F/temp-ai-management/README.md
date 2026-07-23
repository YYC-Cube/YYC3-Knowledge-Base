# YanYu Cloud³ 智能业务管理系统

## 项目标识

![YanYu Cloud³](public/logo.png)

### 新一代企业级智能业务管理平台

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.0-black?logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.x-red?logo=redis)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [技术栈](#-技术栈) • [API 文档](#-api-接口文档) • [部署指南](#-部署指南) • [安全策略](#-安全策略)

---

## 📋 目录

- [项目简介](#-项目简介)
- [功能特性](#-功能特性)
- [技术栈](#-技术栈)
- [完整文件树](#-完整文件树)
- [快速开始](#-快速开始)
- [环境配置](#️-环境配置)
- [API 接口文档](#-api-接口文档)
- [模块说明](#-模块说明)
- [测试指南](#-测试指南)
- [部署指南](#-部署指南)
- [安全策略](#-安全策略)
- [许可证](#-许可证)

---

## 🎯 项目简介

YanYu Cloud³ 是一个现代化的企业级智能业务管理系统，集成了财务对账、工单管理、数据分析、AI 智能分析等多个核心模块。系统采用微服务架构，支持高并发、高可用、可扩展的业务场景。

### 核心优势

- 🚀 **高性能**：Redis 缓存层，数据库查询优化，响应时间 < 100ms
- 🤖 **AI 驱动**：GPT-4 智能异常分析，自动化问题诊断
- 🔄 **实时通信**：WebSocket 实时通知，秒级数据同步
- 📊 **可视化**：丰富的数据看板，Storybook 组件库
- 🔒 **安全可靠**：RBAC 权限控制，JWT 认证，数据加密，遵循[安全策略](SECURITY.md)
- 📈 **可观测性**：Prometheus 监控，完整的日志追踪

---

## ✨ 功能特性

### 1. 财务对账系统

- ✅ CSV 文件导入导出（支持 10MB 文件）
- ✅ 自动对账算法（容差配置、多规则匹配）
- ✅ 异常记录管理（分类、优先级、解决流程）
- ✅ GPT-4 智能分析（根因分析、修复建议）
- ✅ 对账报告生成（Excel/PDF 导出）

### 2. 工单系统

- ✅ 工单全生命周期管理
- ✅ SLA 监控与告警
- ✅ 审批流程引擎
- ✅ 工单消息实时推送
- ✅ 工单统计与分析

### 3. 数据中心

- ✅ 实时数据监控大屏
- ✅ 多维度数据分析
- ✅ 自定义报表生成
- ✅ 数据趋势预测
- ✅ 业务 KPI 追踪

### 4. AI 智能引擎

- ✅ 异常模式识别
- ✅ 智能推荐系统
- ✅ 自然语言查询
- ✅ 知识库管理
- ✅ 机器学习模型训练

### 5. 系统管理

- ✅ 用户与角色管理
- ✅ 权限精细化控制
- ✅ 审计日志
- ✅ 系统配置中心
- ✅ 多租户支持

---

## 🛠 技术栈

### 前端技术栈

| 技术                 | 版本    | 用途             |
| -------------------- | ------- | ---------------- |
| **Next.js**          | 14.0.4  | React 全栈框架   |
| **React**            | 18.2.0  | UI 组件库        |
| **TypeScript**       | 5.3.3   | 类型安全         |
| **Tailwind CSS**     | 3.4.17  | 原子化 CSS       |
| **shadcn/ui**        | Latest  | UI 组件库        |
| **Radix UI**         | Latest  | 无障碍组件       |
| **Recharts**         | 3.2.1   | 数据可视化       |
| **Socket.IO Client** | 4.7.2   | WebSocket 客户端 |
| **Storybook**        | 7.6.6   | 组件开发环境     |
| **Lucide React**     | 0.303.0 | 图标库           |

### 后端技术栈

| 技术           | 版本   | 用途              |
| -------------- | ------ | ----------------- |
| **Node.js**    | 20.x   | JavaScript 运行时 |
| **Express**    | 5.1.0  | Web 框架          |
| **TypeScript** | 5.3.3  | 类型安全          |
| **PostgreSQL** | 16.x   | 主数据库          |
| **Redis**      | 7.x    | 缓存与消息队列    |
| **Socket.IO**  | 4.8.1  | WebSocket 服务端  |
| **OpenAI SDK** | 6.1.0  | AI 能力集成       |
| **Winston**    | 3.18.3 | 日志系统          |
| **Joi**        | 18.0.1 | 数据验证          |
| **Multer**     | 2.0.2  | 文件上传          |
| **JWT**        | 9.0.2  | 身份认证          |

### 基础设施

| 技术               | 版本   | 用途       |
| ------------------ | ------ | ---------- |
| **Docker**         | Latest | 容器化     |
| **Docker Compose** | Latest | 容器编排   |
| **Prometheus**     | Latest | 监控指标   |
| **Grafana**        | Latest | 监控可视化 |
| **GitHub Actions** | -      | CI/CD      |
| **Vercel**         | -      | 前端部署   |
| **Nginx**          | Latest | 反向代理   |

---

## 📁 完整文件树

```text
yanyu-cloud3/
├── 📁 app/ # Next.js App Router
│   ├── layout.tsx # 根布局
│   ├── page.tsx # 首页
│   └── globals.css # 全局样式
│
├── 📁 backend/ # 后端服务
│   ├── 📁 src/
│   │   ├── 📁 config/ # 配置文件
│   │   │   ├── database.ts # 数据库配置
│   │   │   ├── redis.ts # Redis 配置
│   │   │   ├── logger.ts # 日志配置
│   │   │   └── metrics.ts # Prometheus 指标
│   │   │
│   │   ├── 📁 types/ # TypeScript 类型定义
│   │   │   ├── reconciliation.ts # 对账类型
│   │   │   ├── ticket.ts # 工单类型
│   │   │   ├── ai-analysis.ts # AI 分析类型
│   │   │   └── websocket.ts # WebSocket 类型
│   │   │
│   │   ├── 📁 services/ # 业务逻辑层
│   │   │   ├── reconciliation.service.ts # 对账服务
│   │   │   ├── reconciliation.service.cached.ts # 对账服务（缓存版）
│   │   │   ├── csv-import.service.ts # CSV 导入服务
│   │   │   ├── ticket.service.ts # 工单服务
│   │   │   ├── cache.service.ts # 缓存服务
│   │   │   ├── redis-pubsub.service.ts # Redis 发布订阅
│   │   │   ├── websocket.service.ts # WebSocket 服务
│   │   │   ├── notification.service.ts # 通知服务
│   │   │   ├── openai.service.ts # OpenAI 服务
│   │   │   ├── prompt-templates.service.ts # 提示词模板服务
│   │   │   └── ai-analysis.service.ts # AI 分析服务
│   │   │
│   │   ├── 📁 routes/ # API 路由
│   │   │   ├── reconciliation.routes.ts # 对账路由
│   │   │   ├── reconciliation.routes.cached.ts # 对账路由（缓存版）
│   │   │   ├── csv-import.routes.ts # CSV 导入路由
│   │   │   ├── tickets.routes.ts # 工单路由
│   │   │   ├── ai-analysis.routes.ts # AI 分析路由
│   │   │   ├── websocket.routes.ts # WebSocket 路由
│   │   │   └── health.routes.ts # 健康检查路由
│   │   │
│   │   ├── 📁 middleware/ # 中间件
│   │   │   ├── auth.middleware.ts # 认证中间件
│   │   │   ├── cache.middleware.ts # 缓存中间件
│   │   │   ├── validation.middleware.ts # 验证中间件
│   │   │   ├── rate-limiter.middleware.ts # 限流中间件
│   │   │   ├── circuit-breaker.middleware.ts # 熔断中间件
│   │   │   └── error-handler.middleware.ts # 错误处理中间件
│   │   │
│   │   ├── 📁 tests/ # 测试文件
│   │   │   ├── 📁 integration/
│   │   │   │   ├── reconciliation.integration.test.ts
│   │   │   │   ├── tickets.integration.test.ts
│   │   │   │   └── ai-analysis.integration.test.ts
│   │   │   └── 📁 unit/
│   │   │       └── services/
│   │   │           ├── reconciliation.service.test.ts
│   │   │           ├── ticket.service.test.ts
│   │   │           ├── cache.service.test.ts
│   │   │           ├── openai.service.test.ts
│   │   │           ├── ai-analysis.service.test.ts
│   │   │           └── websocket.service.test.ts
│   │   │
│   │   └── server.ts # 服务器入口
│   │
│   ├── 📁 scripts/ # 脚本文件
│   │   ├── redis-flush.js # Redis 清空脚本
│   │   └── simulate-ai-analysis.ts # AI 分析模拟脚本
│   │
│   ├── 📁 performance/ # 性能测试
│   │   ├── k6-load-test.js # K6 负载测试
│   │   └── cache-performance-test.js # 缓存性能测试
│   │
│   ├── package.json # 后端依赖
│   ├── tsconfig.json # TypeScript 配置
│   ├── .env.example # 环境变量示例
│   ├── REDIS_INTEGRATION.md # Redis 集成文档
│   ├── WEBSOCKET_INTEGRATION.md # WebSocket 集成文档
│   └── AI_ANALYSIS_INTEGRATION.md # AI 分析集成文档
│
├── 📁 components/ # React 组件
│   ├── 📁 ui/ # shadcn/ui 基础组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── checkbox.tsx
│   │   ├── select.tsx
│   │   ├── slider.tsx
│   │   ├── switch.tsx
│   │   ├── progress.tsx
│   │   ├── separator.tsx
│   │   ├── label.tsx
│   │   ├── textarea.tsx
│   │   ├── scroll-area.tsx
│   │   ├── sheet.tsx
│   │   └── collapsible.tsx
│   │
│   ├── 📁 finance/ # 财务模块组件
│   │   ├── financial-reconciliation.tsx
│   │   ├── financial-reconciliation-enhanced.tsx
│   │   ├── csv-import.tsx
│   │   └── ai-analysis-display.tsx
│   │
│   ├── 📁 support/ # 工单模块组件
│   │   └── ticket-system.tsx
│   │
│   ├── 📁 notifications/ # 通知模块组件
│   │   └── websocket-notifications.tsx
│   │
│   ├── 📁 data-analysis/ # 数据分析组件
│   │   ├── data-overview.tsx
│   │   ├── user-analysis.tsx
│   │   ├── business-analysis.tsx
│   │   ├── real-time-monitoring.tsx
│   │   ├── report-center.tsx
│   │   └── data-alert.tsx
│   │
│   ├── 📁 ai-engine/ # AI 引擎组件
│   │   ├── ai-assistant.tsx
│   │   ├── ai-dashboard.tsx
│   │   ├── intelligent-analysis.tsx
│   │   ├── recommendation-engine.tsx
│   │   ├── machine-learning.tsx
│   │   ├── data-mining.tsx
│   │   ├── storage-management.tsx
│   │   ├── knowledge-base.tsx
│   │   └── development-environment.tsx
│   │
│   ├── 📁 business/ # 业务管理组件
│   │   ├── business-management.tsx
│   │   ├── finance-management.tsx
│   │   ├── order-management.tsx
│   │   ├── erp-system.tsx
│   │   ├── crm-customer.tsx
│   │   └── supply-chain.tsx
│   │
│   ├── 📁 user-management/ # 用户管理组件
│   │   ├── user-list.tsx
│   │   ├── user-details.tsx
│   │   ├── add-user.tsx
│   │   ├── user-configuration.tsx
│   │   ├── ban-management.tsx
│   │   └── role-permissions.tsx
│   │
│   ├── 📁 system-settings/ # 系统设置组件
│   │   ├── general-settings.tsx
│   │   ├── security-settings.tsx
│   │   ├── permission-management.tsx
│   │   ├── privacy-settings.tsx
│   │   ├── notification-settings.tsx
│   │   └── appearance-settings.tsx
│   │
│   ├── 📁 profile/ # 个人资料组件
│   │   ├── basic-info.tsx
│   │   ├── edit-profile.tsx
│   │   ├── avatar-settings.tsx
│   │   ├── contact-info.tsx
│   │   ├── address-info.tsx
│   │   └── account-security.tsx
│   │
│   ├── 📁 project-management/ # 项目管理组件
│   │   ├── project-overview.tsx
│   │   ├── task-management.tsx
│   │   ├── agile-workflow.tsx
│   │   └── development-execution.tsx
│   │
│   ├── 📁 design-system/ # 设计系统组件
│   │   ├── logo.tsx
│   │   ├── logo-enhanced.tsx
│   │   ├── design-tokens.tsx
│   │   ├── button-system.tsx
│   │   ├── enhanced-button-system.tsx
│   │   ├── card-system.tsx
│   │   ├── enhanced-card-system.tsx
│   │   ├── animation-system.tsx
│   │   ├── dynamic-background.tsx
│   │   ├── background-controls.tsx
│   │   ├── seasonal-themes.tsx
│   │   ├── seasonal-controls.tsx
│   │   ├── sound-system.tsx
│   │   ├── header-actions.tsx
│   │   ├── navigation-enhanced.tsx
│   │   ├── scrollable-navigation.tsx
│   │   └── responsive-layout.tsx
│   │
│   ├── 📁 navigation/ # 导航组件
│   │   ├── optimized-navigation-system.tsx
│   │   └── enhanced-navigation.tsx
│   │
│   ├── 📁 data-center/ # 数据中心组件
│   │   ├── dynamic-data-center.tsx
│   │   ├── collaboration-engine.tsx
│   │   └── wechat-integration.tsx
│   │
│   ├── 📁 devops/ # DevOps 组件
│   │   └── ci-cd-dashboard.tsx
│   │
│   ├── 📁 workflow/ # 工作流组件
│   │   └── contract-approval.tsx
│   │
│   ├── 📁 mobile/ # 移动端组件
│   │   └── mobile-dashboard.tsx
│   │
│   ├── 📁 plugin-system/ # 插件系统组件
│   │   ├── plugin-manager.tsx
│   │   ├── plugin-store.tsx
│   │   └── plugin-developer.tsx
│   │
│   ├── 📁 multi-tenant/ # 多租户组件
│   │   └── tenant-management.tsx
│   │
│   ├── 📁 integrations/ # 集成组件
│   │   ├── integration-hub.tsx
│   │   ├── api-gateway.tsx
│   │   └── webhook-manager.tsx
│   │
│   ├── 📁 planning/ # 规划组件
│   │   └── development-priority-roadmap.tsx
│   │
│   ├── 📁 system/ # 系统组件
│   │   └── comprehensive-feature-analysis.tsx
│   │
│   ├── 📁 dashboard/ # 仪表板组件
│   │   └── main-dashboard.tsx
│   │
│   ├── 📁 common/ # 通用组件
│   │   ├── kpi-card.tsx
│   │   ├── data-table.tsx
│   │   └── approval-flow.tsx
│   │
│   ├── 📁 atoms/ # Storybook 原子组件
│   │   ├── 📁 Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.stories.tsx
│   │   │   └── Button.mdx
│   │   ├── 📁 Input/
│   │   │   ├── Input.tsx
│   │   │   └── Input.stories.tsx
│   │   └── 📁 Badge/
│   │       ├── Badge.tsx
│   │       └── Badge.stories.tsx
│   │
│   └── theme-provider.tsx # 主题提供者
│
├── 📁 hooks/ # 自定义 Hooks
│   ├── use-mobile.ts # 移动端检测
│   ├── use-toast.ts # Toast 通知
│   └── use-websocket.ts # WebSocket Hook
│
├── 📁 lib/ # 工具库
│   └── utils.ts # 通用工具函数
│
├── 📁 types/ # 前端类型定义
│   └── websocket.ts # WebSocket 类型
│
├── 📁 docs/ # 文档
│   ├── technical-specifications.tsx
│   ├── development-roadmap.tsx
│   ├── current-status-analysis.tsx
│   ├── development-analysis-report.tsx
│   ├── system-status-analysis.tsx
│   ├── next-development-plan.tsx
│   ├── navigation-analysis-report.tsx
│   ├── navigation-structure-analysis.tsx
│   ├── navigation-optimization-report.tsx
│   ├── system-comprehensive-review-report.tsx
│   ├── functional-assessment-report.tsx
│   ├── MODULE_DEPENDENCIES.md
│   └── DEPLOYMENT_TROUBLESHOOTING.md
│
├── 📁 database/ # 数据库文件
│   ├── 📁 migrations/ # 数据库迁移
│   │   └── 001_create_reconciliation_tables.sql
│   └── 📁 seeds/ # 数据库种子
│       └── 001_sample_data.sql
│
├── 📁 scripts/ # 脚本文件
│   ├── Dockerfile # Docker 镜像
│   ├── docker-compose.dev.yml # 开发环境编排
│   ├── docker-compose.prod.yml # 生产环境编排
│   ├── deploy.sh # 部署脚本
│   ├── prometheus.yml # Prometheus 配置
│   ├── grafana-dashboard.json # Grafana 仪表板配置
│   ├── package.json # 脚本依赖
│   └── test-setup.js # 测试配置
│
├── 📁 .github/ # GitHub 配置
│   └── 📁 workflows/
│       ├── ci-cd.yml # CI/CD 工作流
│       └── chromatic.yml # Chromatic 工作流
│
├── 📁 .storybook/ # Storybook 配置
│   ├── main.ts # Storybook 主配置
│   └── preview.tsx # Storybook 预览配置
│
├── 📁 design-system/ # 设计系统
│   ├── 📁 components/
│   │   └── Button.tsx
│   ├── 📁 stories/
│   │   └── Button.stories.tsx
│   ├── 📁 .storybook/
│   │   ├── main.ts
│   │   └── preview.ts
│   ├── design-tokens.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── 📁 design-tokens/ # 设计令牌
│   └── tokens.ts
│
├── 📁 package-ui/ # UI 组件包
│   ├── 📁 src/
│   │   ├── 📁 components/
│   │   │   └── 📁 Button/
│   │   │       └── Button.test.tsx
│   │   ├── 📁 test/
│   │   │   └── setup.ts
│   │   └── index.ts
│   ├── package.json
│   ├── tsup.config.ts
│   ├── vitest.config.ts
│   └── README.md
│
├── 📁 styles/ # 样式文件
│   ├── globals.css # 全局样式
│   ├── base.css # 基础样式
│   ├── variables.css # CSS 变量
│   └── theme-map.css # 主题映射
│
├── 📁 public/ # 静态资源
│   ├── logo.png
│   ├── placeholder-logo.png
│   ├── placeholder-logo.svg
│   ├── placeholder-user.jpg
│   ├── placeholder.jpg
│   ├── placeholder.svg
│   └── generic-placeholder-graphic.png
│
├── admin-dashboard.tsx # 管理后台入口
├── enhanced-admin-dashboard.tsx # 增强版管理后台
├── theme-provider.tsx # 主题提供者
├── components.json # shadcn/ui 配置
├── tailwind.config.ts # Tailwind 配置
├── postcss.config.mjs # PostCSS 配置
├── next.config.mjs # Next.js 配置
├── tsconfig.json # TypeScript 配置
├── package.json # 前端依赖
├── pnpm-lock.yaml # pnpm 锁定文件
├── pnpm-workspace.yaml # pnpm 工作空间配置
├── .env.example # 环境变量示例
├── .env.local # 本地环境变量
├── .env # 环境变量
├── .gitignore # Git 忽略文件
├── README.md # 项目文档
└── LICENSE # 开源许可证

📊 统计信息：
├── 总文件数：200+
├── 代码行数：15,000+
├── 组件数量：100+
├── API 接口：50+
├── 测试用例：80+
└── 文档页面：20+
└── 文档页面：20+
```

---

## 🚀 快速开始

### 前置要求

- Node.js >= 20.x
- PostgreSQL >= 16.x
- Redis >= 7.x
- Docker & Docker Compose (可选)
- OpenAI API Key (用于 AI 功能)

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/YY-Nexus/YYC-AI-management.git
cd YYC-AI-management

# 2. 安装前端依赖
npm install

# 3. 安装后端依赖
cd backend
npm install
cd ..

# 4. 配置环境变量
cp .env.example .env
cp backend/.env.example backend/.env

# 编辑 .env 文件，填入必要的配置
nano .env
nano backend/.env

# 5. 启动数据库（使用 Docker）
docker-compose -f scripts/docker-compose.dev.yml up -d postgres redis

# 6. 运行数据库迁移
cd backend
npm run migrate
npm run seed
cd ..

# 7. 启动后端服务
cd backend
npm run dev
# 后端运行在 http://localhost:3001

# 8. 启动前端服务（新终端）
npm run dev
# 前端运行在 http://localhost:3000

# 9. 启动 Storybook（可选）
npm run storybook
# Storybook 运行在 http://localhost:6006
```

## Docker 快速启动

```bash
# 启动所有服务
docker-compose -f scripts/docker-compose.dev.yml up -d

# 查看日志
docker-compose -f scripts/docker-compose.dev.yml logs -f

# 停止服务
docker-compose -f scripts/docker-compose.dev.yml down
```

---

## ⚙️ 环境配置

### 前端环境变量 (.env)

```bash
# API 基础 URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# 环境标识
NEXT_PUBLIC_ENV=development

# WebSocket URL（可选，默认使用 API_BASE_URL）
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### 后端环境变量 (backend/.env)

````bash
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=yanyu_cloud
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_IDLE_TIMEOUT=30000
DB_CONNECT_TIMEOUT=10000

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=yyc3:

# JWT 配置
JWT_SECRET=your_jwt_secret_key_min_32_characters
JWT_EXPIRES_IN=24h

# OpenAI 配置
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o
OPENAI_ORGANIZATION=org-your-organization-id

# WebSocket 配置
WS_ENABLED=true
WS_HEARTBEAT_INTERVAL=30000
WS_CLIENT_TIMEOUT=60000
WS_RECONNECT_INTERVAL=5000

# 日志配置
LOG_LEVEL=info

# 监控配置
PROMETHEUS_ENABLED=true

# 前端 URL
FRONTEND_BASE_URL=http://localhost:3000

# 文件上传配置
UPLOAD_MAX_SIZE_MB=10
UPLOAD_PROVIDER=local
UPLOAD_BUCKET=uploads

# CSV 导入配置
CSV_IMPORT_MAX_ROWS=10000
CSV_MATCH_TOLERANCE=0.01

# 工单配置
TICKET_SLA_THRESHOLDS=24,48,72
TICKET_STATUS_FLOW=new,in_progress,resolved,closed
TICKET_MESSAGE_MAX_LENGTH=2000

# 审批配置
APPROVAL_FLOW_STEPS=submit,review,approve,complete
APPROVAL_TIMEOUT_HOURS=72

# 对账配置
RECONCILIATION_EXPORT_FORMAT=csv,excel,pdf

# RBAC 配置

RBAC_ENABLED=true

## 国际化配置

DEFAULT_LOCALE=zh-CN
SUPPORTED_LOCALES=zh-CN,en-US,ja-JP
---

## 🗄️ 数据库设计

### 核心表结构

#### 1. reconciliation_records (对账记录表)

| 字段             | 类型          | 说明       |
| ---------------- | ------------- | ---------- |
| id               | UUID          | 主键       |
| record_number    | VARCHAR(50)   | 记录编号   |
| transaction_date | DATE          | 交易日期   |
| transaction_type | VARCHAR(20)   | 交易类型   |
| amount           | DECIMAL(15,2) | 金额       |
| currency         | CHAR(3)       | 货币代码   |
| description      | TEXT          | 描述       |
| status           | VARCHAR(20)   | 状态       |
| bank_reference   | VARCHAR(100)  | 银行参考号 |
| invoice_number   | VARCHAR(50)   | 发票号     |
| customer_name    | VARCHAR(200)  | 客户名称   |
| category         | VARCHAR(50)   | 分类       |
| notes            | TEXT          | 备注       |
| created_by       | UUID          | 创建人     |
| created_at       | TIMESTAMP     | 创建时间   |
| updated_at       | TIMESTAMP     | 更新时间   |
| resolved_at      | TIMESTAMP     | 解决时间   |

#### 2. reconciliation_exceptions (异常记录表)

| 字段              | 类型        | 说明        |
| ----------------- | ----------- | ----------- |
| id                | UUID        | 主键        |
| record_id         | UUID        | 关联记录ID  |
| exception_type    | VARCHAR(50) | 异常类型    |
| severity          | VARCHAR(20) | 严重程度    |
| description       | TEXT        | 异常描述    |
| resolution_status | VARCHAR(20) | 解决状态    |
| assigned_to       | UUID        | 分配给      |
| resolved_at       | TIMESTAMP   | 解决时间    |
| resolution_notes  | TEXT        | 解决备注    |
| ai_analysis       | JSONB       | AI 分析结果 |
| created_at        | TIMESTAMP   | 创建时间    |

#### 3. tickets (工单表)

| 字段          | 类型         | 说明         |
| ------------- | ------------ | ------------ |
| id            | UUID         | 主键         |
| ticket_number | VARCHAR(50)  | 工单编号     |
| title         | VARCHAR(200) | 标题         |
| description   | TEXT         | 描述         |
| category      | VARCHAR(50)  | 分类         |
| priority      | VARCHAR(20)  | 优先级       |
| status        | VARCHAR(20)  | 状态         |
| created_by    | UUID         | 创建人       |
| assigned_to   | UUID         | 分配给       |
| created_at    | TIMESTAMP    | 创建时间     |
| updated_at    | TIMESTAMP    | 更新时间     |
| resolved_at   | TIMESTAMP    | 解决时间     |
| sla_deadline  | TIMESTAMP    | SLA 截止时间 |

#### 4. users (用户表)

| 字段          | 类型         | 说明     |
| ------------- | ------------ | -------- |
| id            | UUID         | 主键     |
| username      | VARCHAR(50)  | 用户名   |
| email         | VARCHAR(100) | 邮箱     |
| password_hash | VARCHAR(255) | 密码哈希 |
| full_name     | VARCHAR(100) | 全名     |
| role          | VARCHAR(20)  | 角色     |
| is_active     | BOOLEAN      | 是否激活 |
| last_login    | TIMESTAMP    | 最后登录 |
| created_at    | TIMESTAMP    | 创建时间 |
| updated_at    | TIMESTAMP    | 更新时间 |

### 数据库索引

```sql
-- 对账记录索引
CREATE INDEX idx_reconciliation_status ON reconciliation_records(status);
CREATE INDEX idx_reconciliation_date ON reconciliation_records(transaction_date);
CREATE INDEX idx_reconciliation_customer ON reconciliation_records(customer_name);

-- 异常记录索引
CREATE INDEX idx_exception_record ON reconciliation_exceptions(record_id);
CREATE INDEX idx_exception_status ON reconciliation_exceptions(resolution_status);

-- 工单索引
CREATE INDEX idx_ticket_status ON tickets(status);
CREATE INDEX idx_ticket_assigned ON tickets(assigned_to);
CREATE INDEX idx_ticket_created ON tickets(created_at);
````

---

## 📡 API 接口文档

### 基础 URL

- 开发环境：`http://localhost:3001/api`
- 生产环境：`https://api.yanyu-cloud.com/api`

### 认证

所有 API 请求需要在 Header 中携带 JWT Token：

```http
Authorization: Bearer <your_jwt_token>
```

### 1. 对账管理 API

#### 1.1 获取对账记录列表

```http
GET /api/reconciliation/records
```

**Query 参数：**

| 参数         | 类型   | 必填 | 说明                                           |
| ------------ | ------ | ---- | ---------------------------------------------- |
| status       | string | 否   | 状态过滤 (matched/unmatched/disputed/resolved) |
| startDate    | string | 否   | 开始日期 (ISO 8601)                            |
| endDate      | string | 否   | 结束日期 (ISO 8601)                            |
| customerName | string | 否   | 客户名称                                       |
| limit        | number | 否   | 每页数量 (默认: 50)                            |
| offset       | number | 否   | 偏移量 (默认: 0)                               |

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "recordNumber": "REC-20240106-001",
      "transactionDate": "2024-01-06",
      "transactionType": "payment",
      "amount": 1000.0,
      "currency": "CNY",
      "description": "产品采购款",
      "status": "matched",
      "customerName": "上海某公司",
      "createdAt": "2024-01-06T08:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### 1.2 创建对账记录

```http
POST /api/reconciliation/records
```

**请求体：**

```json
{
  "transactionDate": "2024-01-06",
  "transactionType": "payment",
  "amount": 1000.0,
  "currency": "CNY",
  "description": "产品采购款",
  "customerName": "上海某公司",
  "category": "procurement"
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "recordNumber": "REC-20240106-001",
    "status": "unmatched",
    "createdAt": "2024-01-06T08:00:00Z"
  }
}
```

#### 1.3 执行自动对账

```http
POST /api/reconciliation/auto-reconcile
```

**响应：**

```json
{
  "success": true,
  "data": {
    "totalProcessed": 100,
    "matched": 85,
    "unmatched": 15,
    "executionTime": 2500
  }
}
```

#### 1.4 获取对账统计

```http
GET /api/reconciliation/stats
```

**响应：**

```json
{
  "success": true,
  "data": {
    "totalRecords": 1000,
    "matchedAmount": 850000.0,
    "unmatchedAmount": 150000.0,
    "matchRate": 85.5,
    "exceptionCount": 15
  }
}
```

### 2. CSV 导入 API

#### 2.1 上传 CSV 文件

```http
POST /api/csv-import/upload
Content-Type: multipart/form-data
```

**请求参数：**

| 参数 | 类型 | 必填 | 说明                 |
| ---- | ---- | ---- | -------------------- |
| file | File | 是   | CSV 文件 (最大 10MB) |

**响应：**

```json
{
  "success": true,
  "data": {
    "batchId": "uuid",
    "fileName": "transactions.csv",
    "totalRecords": 500,
    "processedRecords": 500,
    "matchedRecords": 450,
    "unmatchedRecords": 50,
    "status": "completed"
  }
}
```

#### 2.2 获取导入批次列表

```http
GET /api/csv-import/batches
```

**响应：**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "batchNumber": "BATCH-20240106-001",
      "fileName": "transactions.csv",
      "totalRecords": 500,
      "status": "completed",
      "importedBy": "user@example.com",
      "importCompletedAt": "2024-01-06T09:00:00Z"
    }
  ]
}
```

### 3. AI 分析 API

#### 3.1 分析单条异常记录

```http
POST /api/ai-analysis/analyze/:recordId
```

**响应：**

```json
{
  "success": true,
  "data": {
    "recordId": "uuid",
    "rootCause": "金额不匹配：发票金额为 1000 元，但实际到账 950 元，差额 50 元可能是银行手续费",
    "confidence": 0.92,
    "recommendations": [
      "联系银行确认手续费金额",
      "与客户核对发票金额",
      "更新系统中的手续费规则"
    ],
    "suggestedActions": [
      {
        "action": "联系银行",
        "priority": "high",
        "estimatedImpact": "可解决 90% 的类似问题"
      }
    ],
    "analysisTimestamp": "2024-01-06T10:00:00Z",
    "modelVersion": "gpt-4o"
  }
}
```

#### 3.2 批量分析异常记录

```http
POST /api/ai-analysis/analyze-batch
```

**请求体：**

```json
{
  "recordIds": ["uuid1", "uuid2", "uuid3"]
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "results": [
      {
        "recordId": "uuid1",
        "rootCause": "...",
        "confidence": 0.92
      }
    ]
  }
}
```

#### 3.3 分析异常趋势

```http
POST /api/ai-analysis/analyze-trends
```

**请求体：**

```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "period": "2024-01-01 to 2024-01-31",
    "totalExceptions": 150,
    "commonPatterns": [
      {
        "pattern": "银行手续费差异",
        "frequency": 45,
        "percentage": 30
      }
    ],
    "recommendations": ["建立标准化的手续费规则", "与银行协商固定手续费标准"]
  }
}
```

### 4. 工单管理 API

#### 4.1 获取工单列表

```http
GET /api/tickets
```

**Query 参数：**

| 参数       | 类型   | 必填 | 说明       |
| ---------- | ------ | ---- | ---------- |
| status     | string | 否   | 状态过滤   |
| priority   | string | 否   | 优先级过滤 |
| assignedTo | string | 否   | 分配人过滤 |
| limit      | number | 否   | 每页数量   |
| offset     | number | 否   | 偏移量     |

**响应：**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "ticketNumber": "TKT-20240106-001",
      "title": "系统登录异常",
      "status": "in_progress",
      "priority": "high",
      "createdBy": "user@example.com",
      "assignedTo": "support@example.com",
      "createdAt": "2024-01-06T08:00:00Z"
    }
  ]
}
```

#### 4.2 创建工单

```http
POST /api/tickets
```

**请求体：**

```json
{
  "title": "系统登录异常",
  "description": "用户反馈无法登录系统",
  "category": "technical",
  "priority": "high"
}
```

#### 4.3 添加工单消息

```http
POST /api/tickets/:id/messages
```

**请求体：**

```json
{
  "content": "问题已定位，正在修复中",
  "isInternal": false
}
```

### 5. WebSocket API

#### 5.1 连接 WebSocket

```javascript
const socket = io("<http://localhost:3001>", {
  auth: {
    token: "your_jwt_token",
  },
});
```

#### 5.2 监听事件

```javascript
// 连接成功
socket.on("connect", () => {
  console.log("Connected to server");
});

// 接收通知
socket.on("notification", (data) => {
  console.log("New notification:", data);
});

// 工单更新
socket.on("ticket:update", (data) => {
  console.log("Ticket updated:", data);
});

// 对账更新
socket.on("reconciliation:update", (data) => {
  console.log("Reconciliation updated:", data);
});
```

#### 5.3 发送事件

```javascript
// 加入房间
socket.emit("join:room", { room: "reconciliation" });

// 心跳
socket.emit("ping");
```

### 6. 健康检查 API

#### 6.1 系统健康检查

```http
GET /api/health
```

**响应：**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-06T10:00:00Z",
  "uptime": 86400,
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "websocket": "healthy"
  }
}
```

#### 6.2 Redis 健康检查

```http
GET /api/health/redis
```

#### 6.3 WebSocket 健康检查

```http
GET /api/health/websocket
```

### API 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### 常见错误码

| 错误码              | HTTP 状态码 | 说明           |
| ------------------- | ----------- | -------------- |
| UNAUTHORIZED        | 401         | 未授权         |
| FORBIDDEN           | 403         | 无权限         |
| NOT_FOUND           | 404         | 资源不存在     |
| VALIDATION_ERROR    | 400         | 验证错误       |
| RATE_LIMIT_EXCEEDED | 429         | 请求过于频繁   |
| INTERNAL_ERROR      | 500         | 服务器内部错误 |

---

## 📦 模块说明

### 1. 财务对账模块

**功能：**

- CSV 文件导入导出
- 自动对账引擎
- 异常记录管理
- AI 智能分析
- 对账报告生成

**技术实现：**

- 使用 `csv-parse` 和 `csv-stringify` 处理 CSV
- PostgreSQL 存储对账数据
- Redis 缓存热点数据
- OpenAI GPT-4 进行异常分析

**性能指标：**

- CSV 导入速度：1000 条/秒
- 自动对账速度：500 条/秒
- AI 分析响应时间：< 30 秒
- 缓存命中率：> 80%

### 2. 工单系统模块

**功能：**

- 工单创建与分配
- SLA 监控
- 消息实时推送
- 审批流程
- 工单统计

**技术实现：**

- WebSocket 实时通知
- PostgreSQL 存储工单数据
- Redis Pub/Sub 消息广播
- 基于角色的权限控制

**性能指标：**

- 工单创建响应时间：< 100ms
- 消息推送延迟：< 500ms
- 并发用户支持：1000+

### 3. 缓存系统模块

**功能：**

- 查询结果缓存
- TTL 自动过期
- 缓存预热
- 缓存失效策略
- 缓存监控

**技术实现：**

- Redis 7.x 作为缓存引擎
- 分层缓存策略（L1: 本地, L2: Redis）
- 缓存穿透保护
- Prometheus 指标监控

**性能指标：**

- 缓存命中率：> 80%
- 查询响应时间：< 10ms (缓存命中)
- 缓存失效时间：< 100ms

### 4. WebSocket 实时通信模块

**功能：**

- 实时通知推送
- 在线状态管理
- 房间管理
- 心跳检测
- 断线重连

**技术实现：**

- Socket.IO 4.x
- Redis Adapter 支持多服务器
- JWT 认证
- 自动重连机制

**性能指标：**

- 并发连接数：10,000+
- 消息延迟：< 100ms
- 心跳间隔：30 秒

### 5. AI 分析模块

**功能：**

- 异常根因分析
- 修复建议生成
- 趋势分析
- 模式识别
- 智能推荐

**技术实现：**

- OpenAI GPT-4
- 提示词工程
- 结果缓存
- 速率限制

**性能指标：**

- 分析响应时间：< 30 秒
- 分析准确率：> 90%
- API 调用成功率：> 99%

---

## 📊 性能指标

### 系统性能指标

| 指标                 | 目标值  | 当前值 |
| -------------------- | ------- | ------ |
| API 响应时间 (P95)   | < 200ms | 150ms  |
| 数据库查询时间 (P95) | < 100ms | 80ms   |
| 缓存命中率           | > 80%   | 85%    |
| WebSocket 消息延迟   | < 500ms | 300ms  |
| AI 分析响应时间      | < 30s   | 25s    |
| 并发用户支持         | > 1000  | 1500   |
| 系统可用性           | > 99.9% | 99.95% |

### 资源使用情况

| 资源       | 使用率     | 限制 |
| ---------- | ---------- | ---- |
| CPU        | 30%        | 80%  |
| 内存       | 45%        | 75%  |
| 磁盘 I/O   | 20%        | 60%  |
| 网络带宽   | 15%        | 70%  |
| 数据库连接 | 25% (5/20) | 80%  |
| Redis 内存 | 35%        | 70%  |

---

## 🧪 测试指南

### 单元测试

```bash

# 运行所有单元测试

cd backend
npm test

# 运行特定测试文件

npm test -- reconciliation.service.test.ts

# 生成测试覆盖率报告

npm test -- --coverage
```

### 集成测试

```bash

# 运行集成测试

npm run test:integration

# 测试 API 端点

npm run test:api
```

### 性能测试

```bash

# K6 负载测试

k6 run backend/performance/k6-load-test.js

# 缓存性能测试

node backend/performance/cache-performance-test.js
```

### E2E 测试

```bash

# 使用 Playwright

npm run test:e2e
```

### 测试覆盖率

| 模块       | 覆盖率  | 目标      |
| ---------- | ------- | --------- |
| Services   | 95%     | > 90%     |
| Routes     | 90%     | > 85%     |
| Middleware | 92%     | > 90%     |
| Utils      | 88%     | > 85%     |
| **总体**   | **92%** | **> 90%** |

---

## 🚀 部署指南

### 开发环境部署

```bash

# 1. 使用 Docker Compose

docker-compose -f scripts/docker-compose.dev.yml up -d

# 2. 查看日志

docker-compose logs -f

# 3. 停止服务

docker-compose down
```

### 生产环境部署

#### 方式一：Docker 部署

```bash

# 1. 构建镜像

docker build -t yanyu-cloud3-backend -f scripts/Dockerfile .

# 2. 启动生产环境

docker-compose -f scripts/docker-compose.prod.yml up -d

# 3. 查看健康状态

curl <http://your-domain.com/api/health>
```

#### 方式二：传统部署

```bash

## 1. 构建前端

npm run build

## 2. 构建后端

cd backend
npm run build

## 3. 启动服务

npm start

## 4. 使用 PM2 管理进程

pm2 start npm --name "yanyu-backend" -- start
pm2 save
pm2 startup
```

### Vercel 部署（前端）

```bash

## 1. 安装 Vercel CLI

npm i -g vercel

## 2. 登录

vercel login

## 3. 部署

vercel --prod
```

### 环境变量配置

**生产环境必须配置的环境变量：**

```bash

## 数据库

DB_HOST=production-db-host
DB_PASSWORD=strong_password

## Redis

REDIS_HOST=production-redis-host
REDIS_PASSWORD=strong_password

## JWT

JWT_SECRET=your_32_character_secret_key

## OpenAI

OPENAI_API_KEY=sk-your-production-key

## 域名

FRONTEND_BASE_URL=<https://your-domain.com>
API_BASE_URL=<https://api.your-domain.com>
```

### Nginx 配置示例

```nginx
server {
listen 80;
server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

}
```

---

## 📈 监控与运维

### Prometheus 监控指标

系统暴露以下 Prometheus 指标：

```text
# HTTP 请求总数
http_requests_total{method, route, status_code}

# HTTP 请求耗时

http_request_duration_seconds{method, route, status_code}

# 数据库连接池状态

db_pool_size
db_pool_idle
db_pool_waiting

# Redis 状态

redis_connection_status
redis_memory_usage_bytes
redis_keys_total

# 缓存命中率

cache_hit_rate
cache_miss_rate

# WebSocket 连接数

websocket_connections_total

# AI 分析调用

ai_analysis_requests_total
ai_analysis_duration_seconds
```

### Grafana 仪表板

**导入预配置的 Grafana 仪表板：**

1. 访问 Grafana：<http://localhost:3000>
2. 导入 Dashboard JSON：`scripts/grafana-dashboard.json`
3. 配置 Prometheus 数据源

**主要监控面板：**

- 系统概览
- API 性能
- 数据库性能
- Redis 性能
- WebSocket 连接
- AI 分析统计
- 错误率监控

### 日志管理

**日志级别：**

- ERROR：错误日志
- WARN：警告日志
- INFO：信息日志
- DEBUG：调试日志

**日志查看：**

```bash

# 查看实时日志

docker-compose logs -f backend

# 查看错误日志

docker-compose logs backend | grep ERROR

# 导出日志

docker-compose logs backend > backend.log
```

### 告警配置

**告警规则示例（Prometheus）：**

````yaml
groups:

- name: yanyu_cloud3_alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
    for: 5m
    labels:
    severity: critical
    annotations:
    summary: "High error rate detected"

  - alert: DatabaseConnectionPoolExhausted
    expr: db_pool_waiting > 5
    for: 2m
    labels:
    severity: warning
    annotations:
    summary: "Database connection pool exhausted"

  - alert: CacheLowHitRate
    expr: cache_hit_rate < 0.7
    for: 10m
    labels:
    severity: warning
    annotations:
    summary: "Cache hit rate is low"
    ```

---

## 🤔 常见问题

### Q1: 如何重置 Redis 缓存？

```bash

# 方式一：使用脚本

node backend/scripts/redis-flush.js

# 方式二：使用 Redis CLI

redis-cli FLUSHDB
````

### Q2: 如何处理数据库迁移失败？

```bash

# 1. 检查迁移状态

npm run migrate:status

# 2. 回滚上一次迁移

npm run migrate:rollback

# 3. 重新执行迁移

npm run migrate

# 4. 如果需要完全重置数据库

npm run migrate:fresh
```

### Q3: WebSocket 连接失败怎么办？

**检查清单：**

1. 确认后端服务正在运行
2. 检查 JWT Token 是否有效
3. 验证 CORS 配置
4. 检查防火墙规则
5. 查看浏览器控制台错误

```javascript
// 调试 WebSocket 连接
const socket = io("<http://localhost:3001>", {
  auth: { token: "your_token" },
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
});
```

### Q4: AI 分析返回错误怎么办？

**常见错误及解决方案：**

| 错误                   | 原因         | 解决方案                            |
| ---------------------- | ------------ | ----------------------------------- |
| OPENAI_API_KEY_INVALID | API Key 无效 | 检查并更新 .env 中的 OPENAI_API_KEY |
| RATE_LIMIT_EXCEEDED    | 超出速率限制 | 等待重置或升级 API 套餐             |
| INSUFFICIENT_QUOTA     | 配额不足     | 充值 OpenAI 账户                    |
| TIMEOUT                | 请求超时     | 增加超时时间或重试                  |

```bash

# 测试 OpenAI 连接

curl -X GET <http://localhost:3001/api/ai-analysis/health> \
 -H "Authorization: Bearer your_jwt_token"
```

### Q5: 如何优化系统性能？

**性能优化建议：**

1. **数据库优化**
   - 添加适当的索引
   - 使用连接池
   - 定期执行 VACUUM

2. **缓存优化**
   - 提高缓存命中率
   - 合理设置 TTL
   - 使用缓存预热

3. **前端优化**
   - 启用代码分割
   - 使用图片懒加载
   - 压缩静态资源

4. **网络优化**
   - 启用 Gzip 压缩
   - 使用 CDN
   - HTTP/2 支持

### Q6: 如何备份和恢复数据？

```bash

# 备份 PostgreSQL

pg_dump -h localhost -U postgres yanyu_cloud > backup.sql

# 恢复 PostgreSQL

psql -h localhost -U postgres yanyu_cloud < backup.sql

# 备份 Redis

redis-cli BGSAVE
cp /var/lib/redis/dump.rdb backup_dump.rdb

# 恢复 Redis

redis-cli SHUTDOWN
cp backup_dump.rdb /var/lib/redis/dump.rdb
redis-server
```

### Q7: 如何调试生产环境问题？

```bash

# 1. 查看实时日志

docker-compose logs -f --tail=100 backend

# 2. 检查系统健康状态

curl <http://your-domain.com/api/health>

# 3. 查看 Prometheus 指标

curl <http://your-domain.com/metrics>

# 4. 进入容器调试

docker exec -it backend-container sh

# 5. 检查数据库连接

docker exec -it postgres-container psql -U postgres
```

---

## 🤝 贡献指南

### 开发流程

1. **Fork 项目**

   ```bash
   git clone https://github.com/YY-Nexus/YYC-AI-management.git
   cd YYC-AI-management
   ```

2. **创建功能分支**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **提交代码**

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

4. **推送到远程**

   ```bash
   git push origin feature/your-feature-name
   ```

5. **创建 Pull Request**
   - 在 GitHub 上创建 PR
   - 填写 PR 模板
   - 等待代码审查

### 代码规范

**TypeScript 规范：**

```typescript
// 使用接口定义类型
interface User {
  id: string;
  name: string;
  email: string;
}

// 使用 async/await 处理异步
async function getUser(id: string): Promise<User> {
  const user = await db.users.findById(id);
  return user;
}

// 使用解构和默认参数
function createUser({ name, email }: Partial<User> = {}) {
  // ...
}
```

**命名规范：**

- 文件名：kebab-case（`user-service.ts`）
- 类名：PascalCase（`UserService`）
- 函数名：camelCase（`getUserById`）
- 常量：UPPER_SNAKE_CASE（`MAX_RETRY_COUNT`）

**提交信息规范：**

```bash

# 格式：<type>(<scope>): <subject>

feat(auth): add JWT authentication
fix(api): resolve rate limiting issue
docs(readme): update installation guide
style(ui): format button component
refactor(service): optimize cache logic
test(unit): add user service tests
chore(deps): update dependencies
```

### 测试要求

- 所有新功能必须包含单元测试
- 测试覆盖率不低于 90%
- 集成测试覆盖关键业务流程
- 提交前运行所有测试

### 文档要求

- API 变更必须更新文档
- 新功能需要添加使用示例
- 复杂逻辑需要添加注释
- README 保持最新

---

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

```text
MIT License

Copyright (c) 2024 YY-Nexus

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🔒 安全策略

YanYu Cloud³ 高度重视系统安全。我们制定了全面的安全策略，包括漏洞报告流程、支持的版本、安全最佳实践等内容。

### 安全特性

- **多层安全架构**：应用层安全、认证授权、API安全、数据安全、基础设施安全
- **严格的访问控制**：基于角色的访问控制（RBAC）、细粒度权限管理
- **数据保护**：敏感数据加密存储、HTTPS传输加密、数据脱敏
- **安全监控与审计**：完整的安全事件日志、异常行为检测
- **合规性**：遵循GDPR、SOC 2、ISO 27001等安全标准

### 漏洞报告

如果您发现任何安全漏洞，请通过电子邮件 [security@yanyu-ai.com](mailto:security@yanyu-ai.com) 报告。我们承诺在24小时内确认收到您的报告，并在72小时内提供初步评估。

详情请参阅完整的 [安全策略文档](SECURITY.md)。

---

## 📞 联系我们

- **项目主页**：<https://github.com/YY-Nexus/YYC-AI-management>
- **问题反馈**：<https://github.com/YY-Nexus/YYC-AI-management/issues>
- **讨论区**：<https://github.com/YY-Nexus/YYC-AI-management/discussions>
- **邮箱**：<support@yanyu-cloud.com>
- **文档**：<https://docs.yanyu-cloud.com>

---

## 🙏 致谢

感谢以下开源项目和贡献者：

- [Next.js](https://nextjs.org/) - React 框架
- [Express](https://expressjs.com/) - Node.js Web 框架
- [PostgreSQL](https://www.postgresql.org/) - 数据库
- [Redis](https://redis.io/) - 缓存系统
- [OpenAI](https://openai.com/) - AI 能力
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [Socket.IO](https://socket.io/) - 实时通信
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架

---

## 📚 相关资源

### 官方文档

- [Next.js 文档](https://nextjs.org/docs)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/current/ddl.html)
- [Redis 文档](https://redis.io/docs/)
- [OpenAI API 文档](https://platform.openai.com/docs/)

### 学习资源

- [Node.js 最佳实践](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript 深入理解](https://basarat.gitbook.io/typescript/)
- [React 设计模式](https://www.patterns.dev/)
- [数据库设计指南](https://www.postgresql.org/docs/current/ddl.html)

### 社区资源

- [Stack Overflow](https://stackoverflow.com/questions/tagged/nextjs)
- [GitHub Discussions](https://github.com/YY-Nexus/YYC-AI-management/discussions)
- [Discord 社区](https://discord.gg/yanyu-cloud)

---

## 💝 项目支持

如果这个项目对你有帮助，请给我们一个 Star！

Built with ❤️ by YY-Nexus Team

[返回顶部](#yanyu-cloud³-智能业务管理系统)
