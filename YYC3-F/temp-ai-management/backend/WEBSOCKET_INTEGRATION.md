# WebSocket 实时通知系统

## 概述

YanYu Cloud³ WebSocket 实时通知系统提供了一个高性能、可扩展的实时消息推送解决方案。基于 Socket.io 构建，支持工单状态变更、系统通知等实时推送功能。

## 功能特性

### ✅ 核心功能

- **实时连接管理**: 自动连接、断线重连
- **心跳检测**: 30秒心跳间隔，60秒超时断开
- **RBAC 权限控制**: 基于角色和部门的频道订阅权限
- **频道订阅**: 支持用户、角色、部门频道
- **消息广播**: 单用户、角色组、全局广播
- **连接状态追踪**: 实时在线用户统计

### 📡 支持的事件类型

- `ticket_created`: 工单创建
- `ticket_updated`: 工单更新
- `ticket_assigned`: 工单分配
- `ticket_message`: 工单消息
- `notification`: 系统通知

## 快速开始

### 1. 服务端设置

\`\`\`typescript
import { WebSocketService } from './services/websocket.service'

// 初始化 WebSocket 服务
const wsService = new WebSocketService(httpServer)

// 发送通知
wsService.sendNotificationToUser('user-123', {
id: 'notif-1',
title: '新工单通知',
message: '您有一个新的工单待处理',
type: 'info',
priority: 'high',
})

// 广播工单创建
wsService.broadcastTicketCreated({
id: 'ticket-123',
ticketNumber: 'TKT-2024-001',
title: '系统故障',
priority: 'high',
status: 'open',
})
\`\`\`

### 2. 客户端连接

\`\`\`typescript
import { useWebSocket } from '@/hooks/use-websocket'

function MyComponent() {
const {
isConnected,
notifications,
lastMessage,
subscribe
} = useWebSocket({
autoConnect: true,
onConnected: () => console.log('Connected'),
})

useEffect(() => {
// 订阅频道
subscribe(['role:admin', 'department:tech'])
}, [])

return (

<div>
{isConnected ? '已连接' : '未连接'}
{notifications.map(n => (
<div key={n.id}>{n.message}</div>
))}
</div>
)
}
\`\`\`

## API 参考

### 服务端 API

#### `WebSocketService.sendNotificationToUser(userId, notification)`

发送通知给特定用户

\`\`\`typescript
wsService.sendNotificationToUser('user-123', {
id: 'notif-1',
title: '标题',
message: '消息内容',
type: 'info',
priority: 'medium',
})
\`\`\`

#### `WebSocketService.broadcastToRole(role, message)`

广播消息给特定角色

\`\`\`typescript
wsService.broadcastToRole('admin', {
type: 'notification',
payload: { /_..._/ },
timestamp: new Date().toISOString(),
})
\`\`\`

#### `WebSocketService.getOnlineClientsCount()`

获取在线客户端数量

\`\`\`typescript
const count = wsService.getOnlineClientsCount()
\`\`\`

### 客户端 API

#### `useWebSocket(options)`

React Hook for WebSocket connection

\`\`\`typescript
const {
isConnected, // 连接状态
socket, // Socket.io 客户端实例
subscribe, // 订阅频道
unsubscribe, // 取消订阅
sendMessage, // 发送消息
lastMessage, // 最后一条消息
notifications, // 通知列表
clearNotifications // 清除通知
} = useWebSocket(options)
\`\`\`

## 频道系统

### 频道类型

1. **用户频道**: `user:{userId}`
   - 每个用户自动订阅自己的频道
   - 用于发送个人通知

2. **角色频道**: `role:{roleName}`
   - 需要 RBAC 权限验证
   - 用于角色组广播

3. **部门频道**: `department:{deptName}`
   - 需要部门权限验证
   - 用于部门内通知

4. **工单频道**: `ticket:{ticketId}`
   - 动态订阅
   - 用于工单相关更新

### 频道权限

- 所有用户可订阅自己的用户频道
- 角色频道需要用户拥有对应角色
- 部门频道需要用户属于对应部门
- 管理员可订阅所有频道

## 心跳机制

### 服务端配置

\`\`\`typescript
const HEARTBEAT_INTERVAL = 30000 // 30 秒
const CLIENT_TIMEOUT = 60000 // 60 秒
\`\`\`

### 客户端配置

\`\`\`typescript
const { heartbeatInterval = 30000 } = options
\`\`\`

### 流程

1. 客户端每30秒发送心跳
2. 服务端更新最后心跳时间
3. 服务端每30秒检查超时客户端
4. 超过60秒未心跳则断开连接

## 错误处理

### 连接错误

\`\`\`typescript
socket.on('connect_error', (error) => {
console.error('Connection error:', error)
// 自动重连
})
\`\`\`

### 订阅错误

\`\`\`typescript
socket.on('subscription_error', (data) => {
console.error('Subscription denied:', data.channel)
})
\`\`\`

## 性能优化

### 连接池管理

- 自动清理超时连接
- 内存高效的客户端存储
- 房间（Room）机制减少广播开销

### 消息优化

- 消息批量处理
- 限流机制
- 优先级队列

## 监控指标

### Prometheus 指标

\`\`\`typescript
// WebSocket 连接数
websocket_connections_total

// 消息发送数
websocket_messages_sent_total

// 消息接收数
websocket_messages_received_total

// 订阅数
websocket_subscriptions_total
\`\`\`

### 日志记录

- 连接/断开日志
- 订阅/取消订阅日志
- 错误日志
- 性能日志

## 安全性

### 认证

- JWT Token 验证
- Token 黑名单检查
- 自动 Token 刷新

### 授权

- RBAC 权限控制
- 频道级别权限验证
- 消息过滤

### 传输安全

- WSS (WebSocket Secure)
- CORS 配置
- Helmet 安全头

## 测试

### 单元测试

\`\`\`bash
npm run test:ws
\`\`\`

### 集成测试

\`\`\`bash
npm run test:e2e
\`\`\`

### 手动测试

\`\`\`bash

# 启动服务

npm run dev

# 发送测试通知

curl -X POST <http://localhost:3001/api/websocket/test-notification> \
 -H "Authorization: Bearer YOUR_TOKEN" \
 -H "Content-Type: application/json" \
 -d '{
"userId": "user-123",
"title": "测试通知",
"message": "这是一条测试消息",
"type": "info",
"priority": "medium"
}'
\`\`\`

## 故障排查

### 连接失败

1. 检查 JWT Token 是否有效
2. 检查 CORS 配置
3. 检查防火墙设置
4. 查看服务端日志

### 消息未接收

1. 检查频道订阅状态
2. 检查 RBAC 权限
3. 检查心跳状态
4. 查看客户端日志

### 性能问题

1. 检查连接数
2. 检查消息频率
3. 启用 Redis 适配器（集群模式）
4. 优化消息负载

## 最佳实践

1. **使用房间机制**: 减少不必要的广播
2. **实现重连逻辑**: 处理网络波动
3. **消息去重**: 防止重复通知
4. **限流保护**: 防止消息风暴
5. **监控告警**: 及时发现问题

## 部署建议

### 单机部署

\`\`\`yaml

# docker-compose.yml

services:
app:
image: yanyu-cloud:latest
ports: - "3001:3001"
environment: - WS_ENABLED=true
\`\`\`

### 集群部署

\`\`\`yaml
services:
app:
image: yanyu-cloud:latest
deploy:
replicas: 3
environment: - WS_ENABLED=true - REDIS_HOST=redis - REDIS_PORT=6379

redis:
image: redis:7-alpine
\`\`\`

### 负载均衡

使用 Redis 适配器实现多实例 WebSocket：

\`\`\`typescript
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

const pubClient = createClient({ url: 'redis://localhost:6379' })
const subClient = pubClient.duplicate()

io.adapter(createAdapter(pubClient, subClient))
\`\`\`

## 总结

WebSocket 实时通知系统为 YanYu Cloud³ 提供了强大的实时通信能力，支持工单系统、通知中心等多个业务场景。通过合理的架构设计和优化，确保了系统的高性能和可扩展性。
\`\`\`

### 11. 更新 CI/CD
