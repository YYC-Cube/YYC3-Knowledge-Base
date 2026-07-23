# YanYu Cloud³ 模块依赖关系说明

## 📊 架构概览

\`\`\`
┌─────────────────────────────────────────────────────────┐
│ Frontend (Next.js) │
│ ┌────────────┐ ┌────────────┐ ┌─────────────────┐ │
│ │ UI Components│ │ WebSocket │ │ AI Analysis UI │ │
│ │ (shadcn) │ │ Client │ │ Display │ │
│ └────────────┘ └────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
↓ HTTP/WS
┌─────────────────────────────────────────────────────────┐
│ Backend (Express) │
│ ┌────────────┐ ┌────────────┐ ┌─────────────────┐ │
│ │ Redis │←→│ WebSocket │←→│ Notification │ │
│ │ Pub/Sub │ │ Service │ │ Service │ │
│ └────────────┘ └────────────┘ └─────────────────┘ │
│ ↓ ↓ ↑ │
│ ┌────────────┐ ┌────────────┐ ┌─────────────────┐ │
│ │ Cache │ │ AI │ │ Reconciliation │ │
│ │ Service │ │ Analysis │ │ Service │ │
│ └────────────┘ └────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
↓ ↓ ↓
┌─────────────┐ ┌────────────┐ ┌─────────────────────┐
│ Redis │ │ OpenAI │ │ PostgreSQL │
│ Cache │ │ API │ │ Database │
└─────────────┘ └────────────┘ └─────────────────────┘
\`\`\`

## 🔗 核心依赖关系

### 1. Redis 与 WebSocket 连接共享

**连接共享策略：**

- 使用单例模式共享 Redis 连接池
- WebSocket 通过 Redis Pub/Sub 实现跨服务器通信
- 缓存服务和通知服务共用同一 Redis 实例

**实现位置：**

- `backend/src/config/redis.ts` - Redis 连接池配置
- `backend/src/services/redis-pubsub.service.ts` - Pub/Sub 服务
- `backend/src/services/websocket.service.ts` - WebSocket 订阅

**数据流：**
\`\`\`
AI Analysis Result → Redis Pub/Sub → WebSocket → Frontend
↓
Cache Service
\`\`\`

### 2. GPT-4 异常分析触发通知

**触发流程：**

1. 用户上传对账文件
2. 系统检测到异常记录
3. 调用 GPT-4 分析异常原因
4. 分析完成后发布消息到 Redis
5. 通知服务接收消息
6. WebSocket 推送到前端
7. 前端展示实时通知

**实现位置：**

- `backend/src/services/ai-analysis.service.ts` - AI 分析服务
- `backend/src/services/notification.service.ts` - 通知服务
- `components/finance/ai-analysis-display.tsx` - 前端展示

**事件类型：**
\`\`\`typescript
export enum NotificationEvent {
AI_ANALYSIS_STARTED = 'ai:analysis:started',
AI_ANALYSIS_COMPLETED = 'ai:analysis:completed',
AI_ANALYSIS_FAILED = 'ai:analysis:failed',
RECONCILIATION_MATCHED = 'reconciliation:matched',
RECONCILIATION_UNMATCHED = 'reconciliation:unmatched'
}
\`\`\`

### 3. UI 系统集成 AI 分析

**组件架构：**
\`\`\`
financial-reconciliation-enhanced.tsx (父组件)
↓
ai-analysis-display.tsx (AI 结果展示)
↓
websocket-notifications.tsx (实时通知)
\`\`\`

**数据流：**

1. 用户触发分析请求
2. 后端返回任务 ID
3. WebSocket 监听分析进度
4. 实时更新 UI 状态
5. 分析完成后展示结果

## 📦 依赖安装顺序

### Backend

\`\`\`bash
npm install express
npm install ioredis
npm install socket.io
npm install openai
npm install pg
npm install winston
npm install dotenv
\`\`\`

### Frontend

\`\`\`bash
npm install socket.io-client
npm install @radix-ui/react-dialog
npm install @radix-ui/react-tabs
npm install lucide-react
npm install recharts
\`\`\`

## 🔧 配置要点

### 环境变量

\`\`\`env

# Redis 配置

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0

# WebSocket 配置

WS_ENABLED=true
WS_HEARTBEAT_INTERVAL=30000

# OpenAI 配置

OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
\`\`\`

### 启动顺序

1. PostgreSQL
2. Redis
3. Backend Server
4. Frontend Server

## 🧪 测试检查点

- [ ] Redis 连接池正常
- [ ] WebSocket 心跳机制工作
- [ ] AI 分析可以触发通知
- [ ] 前端可以接收实时消息
- [ ] 缓存命中率 > 80%

## 📈 性能指标

| 指标           | 目标值  | 监控方式    |
| -------------- | ------- | ----------- |
| Redis 响应时间 | < 10ms  | Prometheus  |
| WebSocket 延迟 | < 100ms | 自定义日志  |
| AI 分析时间    | < 30s   | OpenAI 回调 |
| 缓存命中率     | > 80%   | Redis INFO  |

## 🚨 故障排查

### Redis 连接失败

\`\`\`bash

# 检查 Redis 状态

redis-cli ping

# 检查连接数

redis-cli info clients
\`\`\`

### WebSocket 连接断开

\`\`\`bash

# 检查 WebSocket 服务

curl <http://localhost:3001/api/websocket/health>
\`\`\`

### AI 分析超时

\`\`\`bash

# 检查 OpenAI API

curl <https://api.openai.com/v1/models> \
 -H "Authorization: Bearer $OPENAI_API_KEY"
\`\`\`

## 📚 相关文档

- [Redis 集成文档](../backend/REDIS_INTEGRATION.md)
- [WebSocket 集成文档](../backend/WEBSOCKET_INTEGRATION.md)
- [AI 分析文档](../backend/AI_ANALYSIS_INTEGRATION.md)
  \`\`\`

## 🔄 Redis Pub/Sub 服务
