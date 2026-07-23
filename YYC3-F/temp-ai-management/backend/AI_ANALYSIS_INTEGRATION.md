# YanYu Cloud³ GPT-4 异常分析集成文档

## 概览

本文档描述了 YanYu Cloud³ 财务对账模块的 GPT-4 异常分析功能集成。该功能使用 OpenAI GPT-4 模型自动分析未匹配的财务记录，识别根本原因并提供解决建议。

## 架构设计

### 核心组件

1. **OpenAIService**: OpenAI API 客户端封装
2. **PromptTemplatesService**: Prompt 模板管理
3. **AiAnalysisService**: AI 分析业务逻辑
4. **AI Analysis Routes**: RESTful API 端点

### 数据流

\`\`\`
用户请求 → API 路由 → AI 分析服务 → Prompt 构建 → OpenAI API → 响应解析 → 结果返回
\`\`\`

## 功能特性

### 1. 单记录分析

分析单条未匹配的对账记录，提供：

- 根本原因分析
- 置信度评分 (0-100)
- 具体建议列表
- 优先级排序的行动项
- 相关模式识别

### 2. 批量分析

支持批量处理多条记录：

- 自动分批处理（每批 5 条）
- 失败重试机制
- 部分失败容错
- 速率限制保护

### 3. 趋势分析

分析整体异常趋势：

- 异常类型分布
- 严重程度统计
- 时间序列模式
- 风险领域识别

## API 端点

### POST /api/ai-analysis/analyze/:recordId

分析单条异常记录

**请求参数:**
\`\`\`json
{
"recordId": "uuid"
}
\`\`\`

**响应示例:**
\`\`\`json
{
"success": true,
"data": {
"recordId": "550e8400-e29b-41d4-a716-446655440000",
"rootCause": "金额不匹配：银行记录显示 $1,000.00，但发票记录显示 $1,005.00，差异 $5.00 可能是手续费",
"confidence": 85,
"recommendations": [
"检查银行手续费政策",
"更新对账规则以容忍 0.5% 的金额差异",
"联系客户确认支付金额"
],
"suggestedActions": [
{
"action": "在对账规则中添加 0.5% 的金额容差",
"priority": "high",
"estimatedImpact": "预计可减少 30% 的手动对账工作量"
}
],
"relatedPatterns": ["手续费差异", "四舍五入误差"],
"analysisTimestamp": "2024-01-15T10:30:00Z",
"modelVersion": "gpt-4o"
}
}
\`\`\`

### POST /api/ai-analysis/analyze-batch

批量分析多条记录

**请求体:**
\`\`\`json
{
"recordIds": [
"uuid1",
"uuid2",
"uuid3"
]
}
\`\`\`

**响应示例:**
\`\`\`json
{
"success": true,
"data": {
"total": 3,
"successful": 3,
"failed": 0,
"results": [...]
}
}
\`\`\`

### POST /api/ai-analysis/analyze-trends

分析异常趋势

**请求体:**
\`\`\`json
{
"startDate": "2024-01-01",
"endDate": "2024-01-31"
}
\`\`\`

### GET /api/ai-analysis/rate-limit

获取 API 速率限制信息

**响应示例:**
\`\`\`json
{
"success": true,
"data": {
"requestsPerMinute": 60,
"tokensPerMinute": 90000,
"currentRequests": 15,
"currentTokens": 12500,
"resetTime": "2024-01-15T10:31:00Z"
}
}
\`\`\`

### GET /api/ai-analysis/health

检查 OpenAI 连接健康状态

## 配置

### 环境变量

\`\`\`bash

# OpenAI 配置

OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o
OPENAI_ORGANIZATION=org-your-org-id
OPENAI_MAX_RETRIES=3
OPENAI_TIMEOUT=30000

# AI 分析配置

AI_ANALYSIS_ENABLED=true
AI_ANALYSIS_AUTO_RUN=false
AI_ANALYSIS_BATCH_SIZE=5
AI_ANALYSIS_RATE_LIMIT_PER_MINUTE=20
\`\`\`

### 速率限制

- **请求速率**: 20 请求/分钟
- **Token 速率**: 90,000 tokens/分钟
- **批量分析**: 5 请求/5分钟
- **趋势分析**: 10 请求/分钟

## Prompt 工程

### 系统提示词结构

系统提示词定义了 AI 的角色和输出格式：

\`\`\`
你是 YanYu Cloud³ 财务系统的高级数据分析专家...

分析维度：

- 金额差异（汇率、四舍五入、手续费）
- 时间差异（记账延迟、时区问题）
- 描述不匹配（命名规范、编码问题）
  ...

输出 JSON 格式：
{
"rootCause": "...",
"confidence": 85,
"recommendations": [...],
...
}
\`\`\`

### 用户提示词模板

用户提示词包含具体的交易数据和上下文：

\`\`\`
请分析以下未匹配的财务交易记录：

## 交易信息

- 日期：2024-01-15
- 金额：1000.00 USD
- 类型：payment
- 描述：Payment for Invoice INV-001
  ...

## 匹配尝试历史

1. 相似度 75% - 金额相差 $5.00
   ...

## 历史上下文

- 相似交易数量：45
- 平均交易金额：985.00
  ...
  \`\`\`

## 测试

### 单元测试

\`\`\`bash
npm run test:ai
\`\`\`

测试覆盖：

- OpenAI 服务连接
- Prompt 模板生成
- 响应解析验证
- 错误处理
- 速率限制

### 集成测试

\`\`\`bash
npm run test:e2e
\`\`\`

测试场景：

- 端到端分析流程
- 批量处理
- API 错误处理
- 速率限制触发

### 模拟测试

\`\`\`bash
npm run simulate:ai
\`\`\`

运行模拟脚本测试三个典型场景：

1. 金额不匹配
2. 描述不匹配
3. 时间延迟

## 监控指标

### Prometheus Metrics

- `ai_analysis_total`: 总分析请求数
  - Labels: status, confidence_level
- `ai_analysis_errors_total`: 分析错误总数
  - Labels: error_type
- `ai_analysis_duration_seconds`: 分析耗时
  - Buckets: 1, 2, 5, 10, 15, 30, 60 秒
- `ai_tokens_used_total`: 使用的 Token 总数
  - Labels: model

### 日志

所有 AI 分析操作都会记录到日志：

\`\`\`json
{
"level": "info",
"message": "AI analysis completed",
"recordId": "...",
"confidence": 85,
"duration": 3.2,
"timestamp": "2024-01-15T10:30:00Z"
}
\`\`\`

## 安全措施

### 1. API 密钥保护

- 环境变量存储
- 不在日志中输出
- 定期轮换

### 2. 速率限制

- 请求级别限制
- Token 级别限制
- 自动重置机制

### 3. 输入验证

- 记录 ID 格式验证
- 批量大小限制
- 日期范围验证

### 4. 输出清理

- JSON 格式验证
- 置信度范围校验
- 优先级枚举检查

## 最佳实践

### 1. 成本优化

- 使用批量分析减少请求
- 缓存分析结果
- 设置合理的 temperature 值 (0.3-0.4)
- 限制 max_tokens (1000-2000)

### 2. 准确性提升

- 提供完整的历史上下文
- 包含匹配尝试详情
- 使用结构化 Prompt
- 要求 JSON 格式输出

### 3. 性能优化

- 异步处理批量请求
- 实现请求队列
- 添加超时控制
- 使用连接池

## 故障排查

### 常见问题

**1. API 密钥无效**
\`\`\`
错误: Invalid OpenAI API key
解决: 检查 OPENAI_API_KEY 环境变量
\`\`\`

**2. 速率限制超出**
\`\`\`
错误: OpenAI rate limit exceeded
解决: 等待速率限制重置，或升级 API 计划
\`\`\`

**3. 响应格式错误**
\`\`\`
错误: Failed to parse AI response
解决: 检查 Prompt 模板中的 JSON 格式要求
\`\`\`

**4. 连接超时**
\`\`\`
错误: OpenAI API timeout
解决: 增加 OPENAI_TIMEOUT 值或检查网络连接
\`\`\`

### 健康检查

\`\`\`bash
curl <http://localhost:3001/api/ai-analysis/health>
\`\`\`

## 未来改进

1. **多模型支持**: 集成 Claude、Gemini 等模型
2. **Fine-tuning**: 基于历史数据微调模型
3. **实时流式输出**: 支持 SSE 流式响应
4. **自动学习**: 从人工审核中学习改进
5. **多语言支持**: 支持多国语言分析

## 示例用例

### 场景 1: 手续费差异

\`\`\`typescript
const request = {
recordId: "test-1",
transactionData: {
date: "2024-01-15",
amount: 1000.00,
currency: "USD",
description: "Payment for Invoice INV-001",
type: "payment",
},
matchingAttempts: [{
candidateId: "candidate-1",
similarity: 75,
reason: "金额相差 $5.00 (0.5%)"
}]
}

// AI 分析结果
{
"rootCause": "银行手续费导致的金额差异",
"confidence": 85,
"recommendations": [
"在对账规则中添加 0.5% 的金额容差",
"创建手续费专用记账科目"
]
}
\`\`\`

### 场景 2: 时区问题

\`\`\`typescript
const request = {
recordId: "test-2",
transactionData: {
date: "2024-01-10",
amount: 2500.00,
currency: "GBP",
description: "Quarterly Service Fee",
type: "payment",
},
matchingAttempts: [{
candidateId: "candidate-2",
similarity: 70,
reason: "日期相差 1 天"
}]
}

// AI 分析结果
{
"rootCause": "时区差异导致的日期记录不一致",
"confidence": 80,
"recommendations": [
"统一使用 UTC 时间记录交易",
"增加日期匹配容差为 ±1 天"
]
}
\`\`\`

## 联系支持

如有问题，请联系：

- 技术支持: <support@yanyucloud.com>
- 文档: <https://docs.yanyucloud.com>
- Issue 跟踪: <https://github.com/yanyucloud/issues>
