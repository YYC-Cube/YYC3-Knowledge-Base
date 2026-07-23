# YanYu Cloud³ 安全实施指南

## 安全架构概览

### 多层防护策略

\`\`\`
┌─────────────────────────────────────┐
│ 应用层安全 (HTTPS, CSP, CORS) │
├─────────────────────────────────────┤
│ 认证授权 (JWT, RBAC, MFA) │
├─────────────────────────────────────┤
│ API安全 (签名, 限流, 加密) │
├─────────────────────────────────────┤
│ 数据安全 (加密存储, 传输加密) │
├─────────────────────────────────────┤
│ 基础设施 (防火墙, DDoS防护) │
└─────────────────────────────────────┘
\`\`\`

## JWT增强安全机制

### Token结构

\`\`\`typescript
// Access Token (15分钟)
{
"sub": "user-id",
"email": "<user@example.com>",
"role": "admin",
"permissions": ["read", "write"],
"deviceId": "device-fingerprint",
"iat": 1234567890,
"exp": 1234568790,
"type": "access"
}

// Refresh Token (7天)
{
"sub": "user-id",
"tokenId": "unique-token-id",
"iat": 1234567890,
"exp": 1235172690,
"type": "refresh"
}
\`\`\`

### Token刷新流程

\`\`\`typescript
// 1. 客户端检测Access Token即将过期
if (isTokenExpiring(accessToken)) {
// 2. 使用Refresh Token获取新Token
const newTokens = await refreshTokens(refreshToken)

// 3. 更新本地存储
setTokens(newTokens)
}

// 服务端验证
async function refreshTokens(refreshToken: string) {
// 1. 验证Refresh Token
const decoded = jwt.verify(refreshToken, SECRET)

// 2. 检查黑名单
const isBlacklisted = await redis.get(`blacklist:${decoded.tokenId}`)
if (isBlacklisted) throw new Error('Token revoked')

// 3. 生成新Token
return {
accessToken: generateAccessToken(user),
refreshToken: generateRefreshToken(user)
}
}
\`\`\`

### Token黑名单

\`\`\`typescript
// 添加到黑名单 (用户登出时)
async function revokeToken(tokenId: string, expiresIn: number) {
await redis.setex(`blacklist:${tokenId}`, expiresIn, '1')
}

// 验证Token时检查黑名单
async function isTokenBlacklisted(tokenId: string): Promise<boolean> {
const result = await redis.get(`blacklist:${tokenId}`)
return result !== null
}
\`\`\`

## 数据加密

### 敏感字段加密

\`\`\`typescript
// 用户表设计
CREATE TABLE users (
id UUID PRIMARY KEY,
email VARCHAR(255) UNIQUE NOT NULL,
password_hash TEXT NOT NULL, -- bcrypt
phone_encrypted TEXT, -- AES-256-GCM
ssn_encrypted TEXT, -- AES-256-GCM
created_at TIMESTAMP DEFAULT NOW()
);

// 财务数据表
CREATE TABLE financial_records (
id UUID PRIMARY KEY,
record_number VARCHAR(50) NOT NULL,
amount_encrypted TEXT NOT NULL, -- 金额加密
account_encrypted TEXT NOT NULL, -- 账号加密
created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### 加密实现

\`\`\`typescript
import { encrypt, decrypt } from './utils/encryption'

// 存储时加密
async function createUser(data: CreateUserInput) {
return await db.users.create({
email: data.email,
password_hash: await hashPassword(data.password),
phone_encrypted: encrypt(data.phone),
ssn_encrypted: encrypt(data.ssn),
})
}

// 读取时解密
async function getUser(id: string) {
const user = await db.users.findById(id)
return {
...user,
phone: decrypt(user.phone_encrypted),
ssn: decrypt(user.ssn_encrypted),
}
}
\`\`\`

## API请求签名

### 签名生成

\`\`\`typescript
// 客户端
function generateSignature(request: Request): string {
const apiSecret = getApiSecret()
const timestamp = Date.now().toString()
const nonce = generateNonce()

const data = [
request.method,
request.path,
timestamp,
nonce,
JSON.stringify(request.body)
].join('')

const signature = crypto
.createHmac('sha256', apiSecret)
.update(data)
.digest('hex')

return signature
}

// 发送请求
fetch('/api/endpoint', {
method: 'POST',
headers: {
'X-Signature': signature,
'X-Timestamp': timestamp,
'X-Nonce': nonce,
},
body: JSON.stringify(data)
})
\`\`\`

### 签名验证

\`\`\`typescript
// 服务端中间件
function verifySignature(req: Request, res: Response, next: NextFunction) {
const { signature, timestamp, nonce } = req.headers

// 1. 验证时间戳 (5分钟内有效)
if (Math.abs(Date.now() - parseInt(timestamp)) > 5 _60_ 1000) {
return res.status(401).json({ error: 'Request expired' })
}

// 2. 验证nonce (防重放)
const nonceKey = `nonce:${nonce}`
if (await redis.exists(nonceKey)) {
return res.status(401).json({ error: 'Duplicate request' })
}
await redis.setex(nonceKey, 300, '1')

// 3. 验证签名
const expectedSignature = generateSignature(req)
if (signature !== expectedSignature) {
return res.status(401).json({ error: 'Invalid signature' })
}

next()
}
\`
return res.status(401).json({ error: 'Invalid signature' })
}

next()
}
\`\`\`

## SQL注入防护

### 参数化查询

\`\`\`typescript
// ❌ 错误示例 - SQL注入风险
const userId = req.params.id
const query = `SELECT * FROM users WHERE id = '${userId}'`
await pool.query(query)

// ✅ 正确示例 - 参数化查询
const userId = req.params.id
const query = 'SELECT \* FROM users WHERE id = $1'
await pool.query(query, [userId])

// ✅ 复杂查询示例
const filters = {
status: req.query.status,
startDate: req.query.startDate,
endDate: req.query.endDate,
}

let query = 'SELECT \* FROM records WHERE 1=1'
const params: any[] = []
let paramIndex = 1

if (filters.status) {
query += `AND status = $${paramIndex}`
params.push(filters.status)
paramIndex++
}

if (filters.startDate) {
query += `AND created_at >= $${paramIndex}`
params.push(filters.startDate)
paramIndex++
}

await pool.query(query, params)
\`\`\`

### 输入验证

\`\`\`typescript
import Joi from 'joi'

// 定义验证模式
const userSchema = Joi.object({
email: Joi.string().email().required(),
password: Joi.string().min(8).pattern(/^(?=._[a-z])(?=._[A-Z])(?=.\*\d)/).required(),
age: Joi.number().integer().min(18).max(120),
})

// 验证输入
function validateInput(data: any) {
const { error, value } = userSchema.validate(data, {
abortEarly: false,
stripUnknown: true,
})

if (error) {
throw new ValidationError(error.details)
}

return value
}
\`\`\`

## CORS安全配置

\`\`\`typescript
import cors from 'cors'

// 生产环境严格配置
const corsOptions = {
origin: function (origin, callback) {
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',')

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }

},
credentials: true,
optionsSuccessStatus: 200,
maxAge: 86400, // 24小时
methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
allowedHeaders: ['Content-Type', 'Authorization', 'X-Signature', 'X-Timestamp', 'X-Nonce'],
}

app.use(cors(corsOptions))
\`\`\`

## CSP内容安全策略

\`\`\`typescript
// Helmet配置
app.use(helmet({
contentSecurityPolicy: {
directives: {
defaultSrc: ["'self'"],
scriptSrc: ["'self'", "'unsafe-inline'"],
styleSrc: ["'self'", "'unsafe-inline'"],
imgSrc: ["'self'", "data:", "https:", "blob:"],
connectSrc: ["'self'", "https://api.openai.com", "wss://"],
fontSrc: ["'self'"],
objectSrc: ["'none'"],
mediaSrc: ["'self'"],
frameSrc: ["'none'"],
formAction: ["'self'"],
upgradeInsecureRequests: [],
},
},
hsts: {
maxAge: 31536000,
includeSubDomains: true,
preload: true,
},
noSniff: true,
referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}))
\`\`\`

## 安全审计日志

\`\`\`typescript
interface SecurityAuditLog {
timestamp: Date
userId: string
action: string
resource: string
ipAddress: string
userAgent: string
result: 'success' | 'failure'
details?: any
}

async function logSecurityEvent(event: SecurityAuditLog) {
// 1. 记录到数据库
await db.security_audit_logs.create(event)

// 2. 发送到日志聚合系统
logger.security({
...event,
severity: event.result === 'failure' ? 'high' : 'info',
})

// 3. 异常行为检测
if (event.result === 'failure') {
await detectAnomalies(event)
}
}

// 使用示例
app.post('/api/login', async (req, res) => {
try {
const user = await authenticate(req.body)

    await logSecurityEvent({
      timestamp: new Date(),
      userId: user.id,
      action: 'login',
      resource: '/api/login',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'success',
    })

    res.json({ success: true, token: generateToken(user) })

} catch (error) {
await logSecurityEvent({
timestamp: new Date(),
userId: req.body.email,
action: 'login',
resource: '/api/login',
ipAddress: req.ip,
userAgent: req.headers['user-agent'],
result: 'failure',
details: { error: error.message },
})

    res.status(401).json({ error: 'Authentication failed' })

}
})
\`\`\`

## 异常行为检测

\`\`\`typescript
async function detectAnomalies(event: SecurityAuditLog) {
const windowMs = 15 _60_ 1000 // 15分钟

// 1. 检测短时间内多次失败登录
const failedAttempts = await redis.incr(`failed:${event.userId}:${event.ipAddress}`)
await redis.expire(`failed:${event.userId}:${event.ipAddress}`, windowMs / 1000)

if (failedAttempts >= 5) {
await sendSecurityAlert({
type: 'brute_force_attempt',
userId: event.userId,
ipAddress: event.ipAddress,
attempts: failedAttempts,
})

    // 暂时封禁IP
    await redis.setex(`blocked:${event.ipAddress}`, 3600, '1')

}

// 2. 检测异常地理位置
const lastLocation = await redis.get(`location:${event.userId}`)
const currentLocation = await getLocationFromIP(event.ipAddress)

if (lastLocation && isLocationAnomalous(lastLocation, currentLocation)) {
await sendSecurityAlert({
type: 'suspicious_location',
userId: event.userId,
lastLocation,
currentLocation,
})
}

await redis.setex(`location:${event.userId}`, 86400, currentLocation)

// 3. 检测异常访问模式
const accessPattern = await analyzeAccessPattern(event.userId)
if (accessPattern.anomalyScore > 0.8) {
await sendSecurityAlert({
type: 'unusual_access_pattern',
userId: event.userId,
anomalyScore: accessPattern.anomalyScore,
})
}
}
\`\`\`

## 安全测试清单

### 1. 认证授权测试

- [ ] JWT token过期验证
- [ ] Token黑名单机制
- [ ] 权限边界测试
- [ ] 会话固定攻击防护
- [ ] CSRF防护

### 2. 输入验证测试

- [ ] SQL注入测试
- [ ] XSS攻击测试
- [ ] 命令注入测试
- [ ] 路径遍历测试
- [ ] XML外部实体(XXE)测试

### 3. API安全测试

- [ ] 速率限制验证
- [ ] 请求签名验证
- [ ] CORS配置测试
- [ ] API密钥安全性
- [ ] 响应头安全性

### 4. 数据保护测试

- [ ] 传输加密(HTTPS)
- [ ] 存储加密验证
- [ ] 敏感数据脱敏
- [ ] 备份加密
- [ ] 密钥管理

### 5. 业务逻辑测试

- [ ] 价格篡改测试
- [ ] 权限提升测试
- [ ] 业务流程绕过
- [ ] 并发竞态条件
- [ ] 批量操作滥用

## 安全监控指标

\`\`\`typescript
// Prometheus指标
const securityMetrics = {
authFailures: new Counter({
name: 'auth_failures_total',
help: 'Total authentication failures',
labelNames: ['reason', 'ip'],
}),

suspiciousActivity: new Counter({
name: 'suspicious_activity_total',
help: 'Total suspicious activities detected',
labelNames: ['type', 'severity'],
}),

blockedRequests: new Counter({
name: 'blocked_requests_total',
help: 'Total blocked requests',
labelNames: ['reason'],
}),

securityAlerts: new Gauge({
name: 'security_alerts_active',
help: 'Number of active security alerts',
}),
}

// 监控示例
securityMetrics.authFailures.inc({ reason: 'invalid_password', ip: req.ip })
securityMetrics.suspiciousActivity.inc({ type: 'brute_force', severity: 'high' })
\`\`\`

## 安全响应流程

### 1. 发现安全事件

\`\`\`typescript
async function handleSecurityIncident(incident: SecurityIncident) {
// 1. 记录事件
await logIncident(incident)

// 2. 评估严重程度
const severity = assessSeverity(incident)

// 3. 自动响应
if (severity === 'critical') {
await emergencyResponse(incident)
}

// 4. 通知相关人员
await notifySecurityTeam(incident, severity)

// 5. 启动调查
await initiateInvestigation(incident)
}
\`\`\`

### 2. 紧急响应

\`\`\`typescript
async function emergencyResponse(incident: SecurityIncident) {
// 1. 隔离受影响系统
await isolateAffectedSystems(incident)

// 2. 撤销可疑token
await revokeCompromisedTokens(incident)

// 3. 封禁攻击源
await blockAttackSources(incident)

// 4. 启用备份系统
await activateBackupSystems()

// 5. 保存证据
await preserveEvidence(incident)
}
\`\`\`

## 定期安全审计

\`\`\`bash

# 依赖漏洞扫描

npm audit
npm audit fix

# 代码安全扫描

npm install -g snyk
snyk test
snyk monitor

# Docker镜像扫描

trivy image your-image:latest

# 渗透测试

# 使用OWASP ZAP或Burp Suite进行定期测试

\`\`\`

## 安全合规检查

- [ ] GDPR合规性
- [ ] SOC 2合规性
- [ ] PCI DSS合规性(如涉及支付)
- [ ] ISO 27001标准
- [ ] 中国网络安全法合规

## 最佳实践总结

1. **最小权限原则**: 用户和服务仅获得必需的最小权限
2. **纵深防御**: 多层安全防护，不依赖单一防线
3. **默认安全**: 安全配置作为默认选项
4. **持续监控**: 实时监控和告警机制
5. **定期更新**: 及时更新依赖和安全补丁
6. **安全培训**: 开发团队定期安全培训
7. **应急预案**: 制定并定期演练安全事件响应预案
