# 三省六部 · Edict 项目使用及部署分析

## 一、项目概述

三省六部 · Edict 是一个基于 OpenClaw 的 AI 多 Agent 协作系统，采用中国古代三省六部制度设计，包含 12 个 AI Agent（11 个业务角色 + 1 个兼容角色）。系统比传统 Multi-Agent 框架多一层制度性审核和实时看板功能，实现了真正的分权制衡。

## 二、部署方式

### 1. Docker 快速体验

**适用场景**：快速体验看板功能，无需完整安装 OpenClaw

```bash
# 启动演示容器
docker run -p 7891:7891 cft0808/sansheng-demo

# 对于 x86/amd64 机器（如 Ubuntu、WSL2）
docker run --platform linux/amd64 -p 7891:7891 cft0808/sansheng-demo

# 或使用 docker-compose
docker compose up
```

**优势**：
- 一键启动，无需配置
- 包含预构建的 React 前端
- 预置模拟数据，可直接体验完整功能

### 2. 完整安装部署

**前置条件**：
- OpenClaw 已安装
- Python 3.9+
- macOS / Linux

**安装步骤**：
```bash
# 克隆仓库
git clone https://github.com/cft0808/edict.git
cd edict

# 执行安装脚本
chmod +x install.sh && ./install.sh
```

**安装脚本自动完成**：
- 创建全量 Agent Workspace（含太子/吏部/早朝，兼容历史 main）
- 写入各省部 SOUL.md（角色人格 + 工作流规则 + 数据清洗规范）
- 注册 Agent 及权限矩阵到 `openclaw.json`
- 符号链接统一数据（各 Workspace 的 data/scripts → 项目目录，确保数据一致）
- 设置 Agent 间通信可见性（`sessions.visibility all`）
- 同步 API Key 到所有 Agent
- 构建 React 前端（需 Node.js 18+）
- 初始化数据目录 + 首次数据同步
- 重启 Gateway 使配置生效

### 3. 生产环境部署

**使用 systemd 服务**：
```bash
# 安装 systemd 服务
sudo cp edict.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable edict
sudo systemctl start edict

# 或使用管理脚本
bash edict.sh start    # 启动
bash edict.sh status   # 查看状态
bash edict.sh restart  # 重启
bash edict.sh stop     # 停止
```

## 三、启动方式

### 1. 一键启动（推荐）

```bash
chmod +x start.sh && ./start.sh
```

**功能**：
- 同时启动看板服务器和数据刷新循环
- 自动初始化必需的数据文件
- 尝试自动打开浏览器
- 支持 Ctrl+C 关闭所有服务

### 2. 分别启动

```bash
# 启动数据刷新循环（后台）
bash scripts/run_loop.sh &

# 启动看板服务器
python3 dashboard/server.py

# 打开浏览器
open http://127.0.0.1:7891
```

## 四、使用方式

### 1. 向 AI 下旨

通过 Feishu / Telegram / Signal 给中书省发消息：
```
给我设计一个用户注册系统，要求：
1. RESTful API（FastAPI）
2. PostgreSQL 数据库
3. JWT 鉴权
4. 完整测试用例
5. 部署文档
```

**任务流转**：
1. 📜 中书省接旨，规划子任务分配方案
2. 🔍 门下省审议，通过 / 封驳打回重规划
3. 📮 尚书省准奏，派发给兵部 + 工部 + 礼部
4. ⚔️ 各部并行执行，进度实时可见
5. 📮 尚书省汇总结果，回奏给你

### 2. 使用圣旨模板

**操作路径**：看板 → 📜 旨库 → 选模板 → 填参数 → 下旨

**预设模板**：
- 周报生成
- 代码审查
- API 设计
- 竞品分析
- 数据报告
- 博客文章
- 部署方案
- 邮件文案
- 站会摘要

### 3. 自定义 Agent

编辑 `agents/<id>/SOUL.md` 即可修改 Agent 的人格、职责和输出规范。

### 4. 增补 Skills

**三种方式添加 Skills**：

#### 1. 看板 UI（最简单）
- 看板 → 🔧 技能配置 → ➕ 添加远程 Skill
- 输入 Agent + Skill 名称 + GitHub URL
- 确认 → ✅ 完成

#### 2. CLI 命令（最灵活）
```bash
# 从 GitHub 添加 code_review skill 到中书省
python3 scripts/skill_manager.py add-remote \
  --agent zhongshu \
  --name code_review \
  --source https://raw.githubusercontent.com/openclaw-ai/skills-hub/main/code_review/SKILL.md \
  --description "代码审查技能"

# 一键导入官方 skills 库到指定 agents
python3 scripts/skill_manager.py import-official-hub \
  --agents zhongshu,menxia,shangshu,bingbu,xingbu
```

#### 3. API 请求（自动化集成）
```bash
# 添加远程 skill
curl -X POST http://localhost:7891/api/add-remote-skill \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "zhongshu",
    "skillName": "code_review",
    "sourceUrl": "https://raw.githubusercontent.com/...",
    "description": "代码审查"
  }'
```

## 五、技术架构

### 1. 系统架构

```
                           ┌───────────────────────────────────┐
                           │          👑 皇上（你）              │
                           │     Feishu · Telegram · Signal     │
                           └─────────────────┬─────────────────┘
                                             │ 下旨
                           ┌─────────────────▼─────────────────┐
                           │          � 太子 (taizi)            │
                           │    分拣：闲聊直接回 / 旨意建任务      │
                           └─────────────────┬─────────────────┘
                                             │ 传旨
                           ┌─────────────────▼─────────────────┐
                           │          📜 中书省 (zhongshu)       │
                           │       接旨 → 规划 → 拆解子任务       │
                           └─────────────────┬─────────────────┘
                                             │ 提交审核
                           ┌─────────────────▼─────────────────┐
                           │          🔍 门下省 (menxia)         │
                           │       审议方案 → 准奏 / 封驳 🚫      │
                           └─────────────────┬─────────────────┘
                                             │ 准奏 ✅
                           ┌─────────────────▼─────────────────┐
                           │          📮 尚书省 (shangshu)       │
                           │     派发任务 → 协调六部 → 汇总回奏    │
                           └───┬──────┬──────┬──────┬──────┬───┘
                               │      │      │      │      │
                         ┌─────▼┐ ┌───▼───┐ ┌▼─────┐ ┌───▼─┐ ┌▼─────┐
                         │💰 户部│ │📝 礼部│ │⚔️ 兵部│ │⚖️ 刑部│ │🔧 工部│
                         │ 数据  │ │ 文档  │ │ 工程  │ │ 合规  │ │ 基建  │
                         └──────┘ └──────┘ └──────┘ └─────┘ └──────┘
                                                               ┌──────┐
                                                               │📋 吏部│
                                                               │ 人事  │
                                                               └──────┘
```

### 2. 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 前端 | React 18 + TypeScript + Vite | 13 个功能组件，状态管理使用 Zustand |
| 后端 | Python 标准库 | `server.py` 基于 `http.server`，零依赖 |
| 事件总线 | Redis Streams | 服务间解耦通信 |
| 数据存储 | JSON 文件 | 位于 `data/` 目录 |
| 依赖 | OpenClaw | 提供 Agent 运行环境 |

### 3. 核心功能

- **实时看板**：10 个功能面板，包括旨意看板、省部调度、奏折阁等
- **任务管理**：支持任务的创建、执行、审核、叫停、取消、恢复
- **技能管理**：从 GitHub/URL 一键导入能力，支持版本管理
- **模型管理**：每个 Agent 独立切换 LLM，应用后自动重启 Gateway
- **官员总览**：Token 消耗排行榜、活跃度、完成数、会话统计
- **天下要闻**：每日自动采集科技/财经资讯，支持分类订阅管理

## 六、项目结构

```
edict/
├── agents/                     # 12 个 Agent 的人格模板
├── dashboard/                  # 军机处看板
│   ├── dashboard.html          # 单文件看板（零依赖）
│   ├── dist/                   # React 前端构建产物
│   └── server.py               # API 服务器
├── edict/backend/              # 异步后端服务
│   ├── app/models/             # 数据模型
│   ├── app/services/           # 服务层
│   └── app/workers/            # 工作线程
├── scripts/                    # 工具脚本
│   ├── run_loop.sh             # 数据刷新循环
│   ├── kanban_update.py        # 看板 CLI
│   └── skill_manager.py        # Skill 管理工具
├── data/                       # 运行时数据（gitignored）
├── docs/                       # 文档
├── install.sh                  # 一键安装脚本
├── start.sh                    # 一键启动脚本
└── edict.service               # systemd 服务配置
```

## 七、常见问题排查

### 1. 任务总超时 / 下属完成了但无法传回太子

**排查步骤**：
1. 检查 Agent 注册状态：`curl -s http://127.0.0.1:7891/api/agents-status | python3 -m json.tool`
2. 检查 Gateway 日志：`grep -i "error\|fail\|unknown" /tmp/openclaw/openclaw-*.log | tail -20`
3. 常见原因：Agent ID 不匹配、LLM provider 超时、僵尸 Agent 进程
4. 强制重试：`curl -X POST http://127.0.0.1:7891/api/scheduler-scan -H 'Content-Type: application/json' -d '{"thresholdSec":60}'`

### 2. Docker: exec format error

**原因**：镜像架构（arm64）与主机架构（amd64）不匹配

**解决**：
```bash
# 方法 1：指定平台
docker run --platform linux/amd64 -p 7891:7891 cft0808/sansheng-demo

# 方法 2：使用 docker-compose（已内置 platform）
docker compose up
```

### 3. Skill 下载失败

**排查**：
```bash
# 测试网络连通性
curl -I https://raw.githubusercontent.com/openclaw-ai/skills-hub/main/code_review/SKILL.md

# 如果超时，使用代理
export https_proxy=http://your-proxy:port
python3 scripts/skill_manager.py import-official-hub --agents zhongshu
```

**常见原因**：
- 中国大陆访问 GitHub raw 资源需要代理
- 网络超时（已增加到 30 秒 + 自动重试 3 次）
- 官方 Skills Hub 仓库维护中

## 八、总结

三省六部 · Edict 项目采用中国古代三省六部制度设计 AI 多 Agent 协作架构，通过制度化的审核机制和实时看板，实现了比传统 Multi-Agent 框架更可靠、更可观测的协作系统。

**部署方式灵活**：支持 Docker 快速体验、完整安装部署和生产环境 systemd 部署。
**使用方式多样**：支持通过聊天工具下旨、使用圣旨模板、自定义 Agent 和增补 Skills。
**技术架构先进**：采用 React 18 前端、Python 标准库后端、Redis Streams 事件总线，实现了高可靠性和可扩展性。

该项目不仅是一个技术实现，更是对 AI 多 Agent 协作模式的创新探索，通过借鉴古代制度智慧，为现代 AI 系统设计提供了新的思路。