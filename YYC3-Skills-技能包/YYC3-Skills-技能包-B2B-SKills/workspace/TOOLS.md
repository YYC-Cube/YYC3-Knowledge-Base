# TOOLS.md — 工具配置

## CRM（唯一真实来源）
根据您的 CRM 选择配置：Google Sheets、Notion、Airtable 或任何 REST API。

### Google Sheets 模式
通过 gws CLI 访问：
```bash
# 读取线索
gws sheets spreadsheets.values get --params '{"spreadsheetId":"{{sheets_id}}","range":"{{sheet_name}}!A:Q"}'

# 追加新线索
gws sheets spreadsheets.values append --params '{"spreadsheetId":"{{sheets_id}}","range":"{{sheet_name}}!A:Q","valueInputOption":"USER_ENTERED"}' --body '{"values":[["..."]]}'
```
仅使用 append 和 update — 绝不覆盖整行。

## WhatsApp Business App（主要对话渠道）
AI 直接回复客户咨询 — 无需人工中转。
渠道策略：`dmPolicy: "open"`，`allowFrom: ["*"]` — 接受所有联系人。
管理员白名单控制系统命令；所有其他联系人正常销售对话。

### 流式控制（OpenClaw 2026.4.5+）
默认情况下，OpenClaw 在 WhatsApp 上逐 token 流式输出响应。部分 WhatsApp Business 账号可能遇到流式消息的送达问题。使用 `blockStreaming: true` 改为发送完整消息：

```yaml
channels:
  whatsapp:
    blockStreaming: true   # 一次性发送完整回复，而非流式
```

此选项在 v2026.4.5 中恢复，之前曾被意外移除。

### WhatsApp 表情回应（OpenClaw 2026.4.2+）
使用 `reactionLevel` 控制代理何时对客户消息做出回应：
- `"none"` — 无回应（默认，商业账号最安全）
- `"selective"` — 对关键消息做出回应（确认、订单、询价）
- `"active"` — 对所有消息做出回应（高参与度，可能显得刷屏）

B2B SDR 推荐：`"selective"` — 对报价确认回应 ✅，对新询价回应 👀，在不显过度自动化的前提下传递响应信号。

### 72小时窗口处理
WhatsApp 在客户不活跃72小时后限制外发消息：
1. 发送前检查：`now() - last_customer_message < 72h`
2. 已过期：**自动切换至 Telegram**（无窗口限制）或 Email。参见 HEARTBEAT #13。
3. 消息实际送达失败时绝不将 CRM 标记为"已联系"
4. 实现送达回执验证 — 检查 sent/delivered/read 状态

## 控制面板
用于监控机器人状态、对话和定时任务的 Web UI。
访问地址：`http://SERVER_IP:{{gateway_port}}/?token=<参见 openclaw.json>`
网关绑定：`lan`（网络可访问）。改为 `loopback` 则仅限本机访问。
> **安全**：面板凭据存储在 `/root/.openclaw/openclaw.json` — 绝不在对话上下文或客户消息中暴露。

## Telegram（战略渠道 — 无窗口限制）
Telegram **零消息限制** — 不同于 WhatsApp 的72小时窗口，你可以随时主动联系任何客户。这使其成为跟进、培育和 Telegram 占主导地位的市场的最佳渠道。

### 渠道优势
- **无72小时窗口**：随时主动触达（培育、跟进、唤醒停滞线索）
- **最大2GB文件**：完整产品目录、认证文件、测试报告、视频演示
- **机器人命令**：客户结构化自助服务（`/catalog`、`/quote`、`/status`）
- **内联键盘**：一键 BANT 资质评估，比打字更快
- **基于用户名**：客户无需暴露手机号 — 连接门槛更低
- **免费 API**：无按消息计费，不同于 WhatsApp Business API

### 多账号 Telegram 配置
若运营多个 Telegram 机器人（如按市场或按产品线），每个账号可有独立的操作配置。按账号设置正确限定每个机器人可用的功能：

```yaml
# workspace/config 示例
channels:
  telegram:
    botToken: "tok-default"          # 默认账号
    actions:
      reactions: false
      poll: true
    accounts:
      russia_sales:                   # 按账号覆盖
        botToken: "tok-ru"
        actions:
          reactions: true             # 仅此账号启用
          poll: false
```

账号级 `actions` 完全覆盖该账号的顶层默认值 — 不做合并。配置时验证各账号的门控设置。

### 机器人命令（自动注册）
| 命令 | 操作 |
|------|------|
| `/start` | 欢迎消息 + 语言检测 + 创建 CRM 记录 |
| `/catalog` | 发送产品目录 PDF 或产品线概览 |
| `/quote` | 启动报价流程 → 通过内联键盘收集 BANT |
| `/status` | 从 CRM 查询订单/报价状态 |
| `/contact` | 请求人工销售代表 → 通知所有者 |
| `/language` | 切换对话语言 |

### 内联键盘模板
使用内联键盘进行结构化资质评估 — 比自由文本 BANT 快3-5倍：

**订单量：**
```
[< 100台] [100-500] [500-1000] [1000+]
```

**时间线：**
```
[本月] [1-3个月] [3-6个月] [仅了解]
```

**产品兴趣：**
```
[{{product_1}}] [{{product_2}}]
[{{product_3}}] [查看完整目录]
```

### 大文件策略
| 文件类型 | 大小 | 渠道 |
|---------|------|------|
| 快速报价（1-2页） | < 10MB | WhatsApp 或 Telegram |
| 完整产品目录 | 10-100MB | **仅 Telegram** |
| 认证文件 | 10-50MB | **仅 Telegram** |
| 视频演示 | 50MB-2GB | **仅 Telegram** |
| 合同 / 形式发票 | < 10MB | Email（正式）+ Telegram（快速副本） |

发送大文件时："I'll share the full catalog on Telegram — it's [X]MB, too large for WhatsApp."

### 市场优先级
Telegram 在以下市场中是**主要**渠道（而非次要）：
- **俄罗斯 / 独联体**：Telegram 就是通讯应用
- **伊朗**：Telegram 在商务中占主导
- **东欧**：Telegram 使用率高
- **全球科技型买家**：许多人在商务中偏好 Telegram

参见 AGENTS.md 第10阶段的市场自适应渠道优先级规则。

## Gmail（邮件外发 + 收件箱监控）
通过 gws CLI 访问：
```bash
# 读取收件箱
gws gmail users messages list --params '{"userId":"me","maxResults":10}'

# 读取特定消息
gws gmail users messages get --params '{"userId":"me","id":"MESSAGE_ID"}'

# 发送邮件
gws gmail users messages send --params '{"userId":"me"}' --body '{"raw":"BASE64_ENCODED_EMAIL"}'
```
用途：冷邮件序列、收件箱回复监控、正式文件投递。

## Jina AI（网络搜索 + 内容提取）
用于主动线索发现和企业调研。

### 搜索（发现潜在买家）
```bash
curl -s 'https://s.jina.ai/QUERY_URL_ENCODED' \
  -H 'Authorization: Bearer $JINA_API_KEY' \
  -H 'Accept: application/json'
```

### 读取网页（深度企业调研）
```bash
curl -s 'https://r.jina.ai/https://target-company.com' \
  -H 'Authorization: Bearer $JINA_API_KEY' \
  -H 'Accept: application/json'
```

API Key 通过环境变量 `JINA_API_KEY` 注入。免费申请：https://jina.ai/

### 安全约束
- **屏蔽 URL**：绝不读取 localhost、127.0.0.1、10.*、192.168.*、172.16-31.*（内网地址）
- **频率限制**：每日最多20次 API 调用（搜索 + 阅读器合计）
- **查询清洗**：对所有搜索查询进行 URL 编码，去除 HTML 标签和 shell 元字符

## Supermemory（调研存储 — L1 补充）
用于研究笔记、竞品情报和市场洞察的语义记忆。
- 自动存储调研发现并附带适当标签
- 每次触达前查询相关上下文
- 标签：customer_fact、competitor_intel、effective_tactic、market_signal
- 命令：`memory:add`、`memory:search`、`memory:list`、`memory:stats`

## AI 模型提供商（LLM 后端）
OpenClaw 支持多种 AI 模型提供商。推荐使用 Claude（Anthropic），以下也完全支持作为直接替代：

| 提供商 | API 类型 | 说明 |
|--------|---------|------|
| Anthropic（Claude） | 原生 | 默认 — 推荐 |
| OpenAI | openai-responses | GPT-4o、o3 等 |
| Mistral | openai-completions | 自 2026-04-03 起完全兼容 — 使用 `api: openai-completions`、`provider: mistral` |
| Groq | openai-completions | 快速推理 |
| Qwen（阿里） | openai-completions | v2026.4.5 新增 — 推荐用于中国部署 |
| MiniMax | openai-completions | v2026.4.5 新增 — 中国提供商，适合多语言任务 |
| Fireworks AI | openai-completions | v2026.4.5 新增 — 快速推理、开源模型 |
| StepFun | openai-completions | v2026.4.5 新增 — 中国提供商 |
| Gemma 4（Google） | openai-completions | v2026.4.7 新增 — 使用 `thinkingOff: true` 获取快速非推理响应 |
| Arcee AI | openai-completions | v2026.4.7 新增 — Trinity 目录；面向特定工作流的专业化模型 |
| 自定义 / 自托管 | openai-completions | 将 `baseUrl` 指向您的端点 |

**Mistral 专属说明：** OpenClaw 现已正确使用 `max_tokens`（而非 `max_completion_tokens`），并在提供商为 Mistral 或 `baseUrl` 指向 `api.mistral.ai` 时禁用不支持的 OpenAI 专属参数（`store`、`reasoning_effort`）。此修复自动生效 — 无需手动配置。

在 OpenClaw 工作区配置中设置模型：
```yaml
model:
  id: "mistral-large-latest"
  provider: "mistral"
  api: "openai-completions"
```

## Webhook 入站插件（入站自动化 — OpenClaw 2026.4.7+）
允许外部系统（CRM、n8n、Zapier、自定义服务）通过 HTTP POST 向 OpenClaw 网关创建和驱动 TaskFlow。适合在新线索事件时触发触达序列。

### 配置
```yaml
# 在 openclaw.json 中
plugins:
  webhook-ingress:
    enabled: true
    secret: "{{WEBHOOK_SECRET}}"   # HMAC-SHA256 共享密钥
    endpoint: "/webhooks/crm"      # 网关路径（网关必须绑定 LAN）
```

### 在新线索时触发触达 TaskFlow
```bash
# 从您的 CRM / 自动化工具发送
curl -s -X POST "http://SERVER_IP:{{gateway_port}}/webhooks/crm" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
  -d '{
    "event": "lead.created",
    "flow": "outreach-sequence",
    "data": {
      "name": "Li Wei",
      "company": "Shenzhen MFG Co",
      "phone": "+8613800138000",
      "source": "alibaba",
      "product_interest": "Industrial bearings"
    }
  }'
```

### 安全
- 生产环境始终使用 HTTPS（将网关置于 nginx + TLS 之后）
- `secret` 字段执行 HMAC-SHA256 验证 — 不匹配的请求将被拒绝
- 网关必须绑定 `lan`（而非 `loopback`）才能接收外部 webhook 调用

## Graphify（知识图谱 — 销售智能）
基于产品目录、客户对话和市场研究构建可查询的知识图谱。
- **产品图谱**：映射 product-kb → 交叉销售路径、产品家族、规格关系
- **客户图谱**：映射 CRM + 对话 → 采购模式、引荐路径、停滞线索
- **市场图谱**：映射研究笔记 → 竞争格局、市场机会

### 图谱查询（运行时）
```bash
# 获取某主题的广泛上下文
python3 -m graphify query "液压挖掘机认证" --budget 1500

# 追踪特定关系链
python3 -m graphify query "迪拜车队客户" --dfs --budget 1000
```

### 图谱输出
- `graphify-out/GRAPH_REPORT.md` — 关键节点、社区、知识盲区
- `graphify-out/graph.json` — 机器可读图谱（用于 CRM、报表）
- `graphify-out/graph.html` — 交互式可视化（分享给所有者）

### 查询时机
- 报价前 → 查找交叉销售产品
- 陌生开发前 → 了解潜在客户的市场背景
- BANT 评估中 → 从图谱关系检查产品匹配
- 每周管线回顾 → 可视化客户聚类

## ChromaDB（对话历史 — L3 + L4）
带客户 ID 隔离和自动标记的逐轮向量存储。
- L3：每轮对话自动存储，附带报价/承诺/异议标签
- L4：每日 CRM 快照作为灾备恢复兜底
- 命令：`chroma:store`、`chroma:search`、`chroma:recall`、`chroma:snapshot`、`chroma:stats`
- 客户隔离：所有查询按 customer_id（手机号）限定范围
