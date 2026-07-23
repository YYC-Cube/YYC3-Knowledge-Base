# YanYu Cloud³ 性能优化指南

## 性能目标

| 指标              | 当前值 | 目标值 | 优先级 |
| ----------------- | ------ | ------ | ------ |
| API响应时间(P95)  | 800ms  | 400ms  | 高     |
| API响应时间(平均) | 300ms  | 150ms  | 高     |
| 首屏加载时间(FCP) | 3.5s   | 1.8s   | 高     |
| 最大内容绘制(LCP) | 4.2s   | 2.5s   | 高     |
| 累积布局偏移(CLS) | 0.15   | <0.1   | 中     |
| 首次输入延迟(FID) | 150ms  | <100ms | 中     |
| 缓存命中率        | 70%    | 85%+   | 高     |
| 数据库查询时间    | 200ms  | <100ms | 高     |

## 数据库优化

### 1. 索引优化

\`\`\`sql
-- 分析慢查询
SELECT
query,
calls,
mean_exec_time,
total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 添加复合索引示例
CREATE INDEX CONCURRENTLY idx_reconciliation_status_date
ON reconciliation_records(status, transaction_date DESC);

CREATE INDEX CONCURRENTLY idx_reconciliation_customer
ON reconciliation_records(customer_name)
WHERE status = 'unmatched';

-- 覆盖索引
CREATE INDEX CONCURRENTLY idx_tickets_status_priority_cover
ON tickets(status, priority)
INCLUDE (title, created_at, assigned_to);
\`\`\`

### 2. 查询优化

\`\`\`typescript
// ❌ N+1查询问题
async function getTicketsWithUsers() {
const tickets = await db.tickets.findMany()

for (const ticket of tickets) {
ticket.user = await db.users.findById(ticket.userId)
}

return tickets
}

// ✅ 使用JOIN优化
async function getTicketsWithUsers() {
return await db.query(`SELECT
      t.*,
      u.name as user_name,
      u.email as user_email
    FROM tickets t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE t.status = $1
 `, ['open'])
}

// ✅ 使用DataLoader批量加载
import DataLoader from 'dataloader'

const userLoader = new DataLoader(async (userIds: string[]) => {
const users = await db.users.findByIds(userIds)
return userIds.map(id => users.find(u => u.id === id))
})

async function getTicketsWithUsers() {
const tickets = await db.tickets.findMany()

await Promise.all(
tickets.map(async (ticket) => {
ticket.user = await userLoader.load(ticket.userId)
})
)

return tickets
}
\`\`\`

### 3. 连接池优化

\`\`\`typescript
// 优化配置
const poolConfig = {
max: 50, // 最大连接数
min: 10, // 最小连接数
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 10000,

// 连接检查
allowExitOnIdle: false,

// 语句超时
statement_timeout: 30000,

// 连接池监控
log: (msg) => logger.debug('Pool:', msg),
}
\`\`\`

### 4. 查询缓存

\`\`\`typescript
// 使用Redis缓存查询结果
async function getStats(filters?: any): Promise<Stats> {
const cacheKey = `stats:${JSON.stringify(filters || {})}`

// 尝试从缓存获取
const cached = await cacheService.get<Stats>(cacheKey, {
prefix: 'query',
})

if (cached) {
return cached
}

// 从数据库查询
const stats = await db.query(/_..._/)

// 缓存结果(60秒)
await cacheService.set(cacheKey, stats, {
prefix: 'query',
ttl: 60,
})

return stats
}
\`\`\`

## 缓存策略优化

### 1. 多级缓存

\`\`\`typescript
class MultiLevelCache {
private l1Cache = new Map<string, any>() // 内存缓存
private l1MaxSize = 1000
private l1TTL = 60 \* 1000 // 1分钟

async get<T>(key: string): Promise<T | null> {
// L1: 内存缓存
const l1Value = this.l1Cache.get(key)
if (l1Value && l1Value.expires > Date.now()) {
return l1Value.data
}

    // L2: Redis缓存
    const l2Value = await cacheService.get<T>(key)
    if (l2Value) {
      this.setL1(key, l2Value)
      return l2Value
    }

    return null

}

async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
// 同时写入L1和L2
this.setL1(key, value)
await cacheService.set(key, value, { ttl })
}

private setL1(key: string, value: any): void {
// LRU淘汰
if (this.l1Cache.size >= this.l1MaxSize) {
const firstKey = this.l1Cache.keys().next().value
this.l1Cache.delete(firstKey)
}

    this.l1Cache.set(key, {
      data: value,
      expires: Date.now() + this.l1TTL,
    })

}
}
\`\`\`

### 2. 缓存预热

\`\`\`typescript
// 应用启动时预热缓存
async function warmupCache() {
logger.info('Starting cache warmup...')

// 预热常用数据
const commonQueries = [
() => reconciliationService.getStats(),
() => ticketService.getStats(),
() => userService.getActiveUsers(),
]

await Promise.all(commonQueries.map(query => query()))

logger.info('Cache warmup completed')
}

// 在服务器启动时调用
app.listen(PORT, async () => {
await warmupCache()
logger.info(`Server running on port ${PORT}`)
})
\`\`\`

### 3. 缓存穿透防护

\`\`\`typescript
// 使用布隆过滤器
import { BloomFilter } from 'bloom-filters'

const recordsBloomFilter = new BloomFilter(10000, 4)

async function getRecordById(id: string): Promise<Record | null> {
// 检查记录是否可能存在
if (!recordsBloomFilter.has(id)) {
return null // 确定不存在,直接返回
}

// 尝试从缓存获取
const cached = await cacheService.get(`record:${id}`)
if (cached) return cached

// 从数据库查询
const record = await db.records.findById(id)

if (record) {
await cacheService.set(`record:${id}`, record, { ttl: 300 })
} else {
// 缓存空结果防止穿透
await cacheService.set(`record:${id}`, null, { ttl: 60 })
}

return record
}
\`\`\`

### 4. 缓存击穿防护

\`\`\`typescript
// 使用分布式锁
import Redis from 'ioredis'

class CacheService {
async getOrCompute<T>(
key: string,
fetcher: () => Promise<T>,
ttl: number = 300
): Promise<T> {
// 尝试从缓存获取
const cached = await this.get<T>(key)
if (cached) return cached

    // 获取分布式锁
    const lockKey = `lock:${key}`
    const lockValue = crypto.randomUUID()
    const lockAcquired = await redis.set(
      lockKey,
      lockValue,
      'EX',
      10,
      'NX'
    )

    if (lockAcquired) {
      try {
        // 成功获取锁,执行查询
        const data = await fetcher()
        await this.set(key, data, { ttl })
        return data
      } finally {
        // 释放锁
        await redis.eval(
          `if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end`,
          1,
          lockKey,
          lockValue
        )
      }
    } else {
      // 未获取到锁,等待后重试
      await new Promise(resolve => setTimeout(resolve, 50))
      return this.getOrCompute(key, fetcher, ttl)
    }

}
}
\`\`\`

## 前端性能优化

### 1. 代码分割

\`\`\`typescript
// 路由级别代码分割
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Reconciliation = lazy(() => import('./pages/Reconciliation'))
const Tickets = lazy(() => import('./pages/Tickets'))

function App() {
return (
<Suspense fallback={<LoadingSpinner />}>
<Routes>
<Route path="/dashboard" element={<Dashboard />} />
<Route path="/reconciliation" element={<Reconciliation />} />
<Route path="/tickets" element={<Tickets />} />
</Routes>
</Suspense>
)
}

// 组件级别代码分割
const HeavyChart = lazy(() => import('./components/HeavyChart'))

function DashboardPage() {
return (
<div>
<Suspense fallback={<ChartSkeleton />}>
<HeavyChart data={data} />
</Suspense>
</div>
)
}
\`\`\`

### 2. 虚拟滚动

\`\`\`typescript
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualList({ items }: { items: any[] }) {
const parentRef = useRef<HTMLDivElement>(null)

const virtualizer = useVirtualizer({
count: items.length,
getScrollElement: () => parentRef.current,
estimateSize: () => 50,
overscan: 5,
})

return (
<div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
<div
style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }} >
{virtualizer.getVirtualItems().map((virtualItem) => (
<div
key={virtualItem.index}
style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }} >
{items[virtualItem.index].name}
</div>
))}
</div>
</div>
)
}
\`\`\`

### 3. 图片优化

\`\`\`typescript
// Next.js Image组件优化
import Image from 'next/image'

function OptimizedImage() {
return (
<Image
src="/hero.jpg"
alt="Hero image"
width={1200}
height={600}
priority // 优先加载
quality={85} // 质量
placeholder="blur" // 模糊占位符
blurDataURL="data:image/..." // 预览图
/>
)
}

// 懒加载图片
function LazyImage({ src, alt }: { src: string; alt: string }) {
return (
<img
src={src || "/placeholder.svg"}
alt={alt}
loading="lazy"
decoding="async"
/>
)
}
\`\`\`

### 4. 预加载和预取

\`\`\`typescript
// 预加载关键资源

<link rel="preload" href="/fonts/custom.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
<link rel="preload" href="/critical.css" as="style" />

// 预取下一页面
function NavigationLink() {
return (
<Link
href="/dashboard"
prefetch={true} // Next.js自动预取 >
Dashboard
</Link>
)
}

// 预连接到外部域

<link rel="preconnect" href="https://api.openai.com" />
<link rel="dns-prefetch" href="https://api.openai.com" />
\`\`\`

## APM监控实施

\`\`\`typescript
// Prometheus指标
export const performanceMetrics = {
apiDuration: new Histogram({
name: 'api_request_duration_seconds',
help: 'API request duration in seconds',
labelNames: ['method', 'route', 'status_code'],
buckets: [0.1, 0.3, 0.5, 0.7, 1, 2, 5],
}),

dbQueryDuration: new Histogram({
name: 'db_query_duration_seconds',
help: 'Database query duration in seconds',
labelNames: ['operation', 'table'],
buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1],
}),

cacheOperations: new Counter({
name: 'cache_operations_total',
help: 'Total cache operations',
labelNames: ['operation', 'result'],
}),

activeConnections: new Gauge({
name: 'active_connections',
help: 'Number of active connections',
labelNames: ['type'],
}),
}

// 使用示例
app.use((req, res, next) => {
const start = Date.now()

res.on('finish', () => {
const duration = (Date.now() - start) / 1000
performanceMetrics.apiDuration.observe(
{
method: req.method,
route: req.route?.path || req.path,
status_code: res.statusCode,
},
duration
)
})

next()
})
\`\`\`

## 性能测试

\`\`\`bash

# 压力测试

k6 run --vus 100 --duration 5m backend/performance/k6-load-test.js

# 基准测试

npx autocannon -c 100 -d 60 <http://localhost:3001/api/health>

# 前端性能测试

npx lighthouse <http://localhost:3000> --view

# Web Vitals

npx @web/test-runner --playwright --browsers chromium
\`\`\`

## 优化清单

- [ ] 数据库查询添加索引
- [ ] 解决N+1查询问题
- [ ] 实施多级缓存策略
- [ ] 缓存预热机制
- [ ] 前端代码分割
- [ ] 图片懒加载和优化
- [ ] 虚拟滚动长列表
- [ ] API响应压缩
- [ ] CDN配置
- [ ] HTTP/2启用
- [ ] 资源预加载
- [ ] Service Worker缓存
- [ ] 数据库连接池优化
- [ ] 静态资源压缩
- [ ] 关键CSS内联
