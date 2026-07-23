# YYC3 变量-配置参数

## 文档信息

| 字段 | 内容 |
|------|------|
| @file | 变量词库/YYC3-变量-配置参数.md |
| @description | 配置参数变量定义，包含应用配置、API配置、存储配置等 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @created | 2026-03-14 |
| @status | stable |

---

## 变量分类

### 1. 应用配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `{{APP_NAME}}` | YYC3 AI Code | 应用名称 |
| `{{APP_VERSION}}` | 1.0.0 | 应用版本号 |
| `{{APP_ENVIRONMENT}}` | development | 运行环境 |
| `{{APP_DEBUG}}` | true | 调试模式 |

### 2. 服务器配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `{{SERVER_PORT}}` | 3201 | 服务器端口 |
| `{{SERVER_HOST}}` | localhost | 服务器主机 |
| `{{SERVER_PROTOCOL}}` | http | 服务器协议 |
| `{{SERVER_URL}}` | http://localhost:3201 | 服务器完整 URL |

### 3. API 配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `{{API_BASE_URL}}` | http://localhost:3201/api | API 基础 URL |
| `{{API_TIMEOUT}}` | 30000 | API 请求超时时间(ms) |
| `{{API_RETRY_ATTEMPTS}}` | 3 | API 重试次数 |
| `{{API_RETRY_DELAY}}` | 1000 | API 重试延迟(ms) |
| `{{API_RATE_LIMIT}}` | 100 | API 速率限制(请求/分钟) |

### 4. WebSocket 配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `{{WS_URL}}` | ws://localhost:3201 | WebSocket URL |
| `{{WS_RECONNECT_INTERVAL}}` | 5000 | 重连间隔(ms) |
| `{{WS_MAX_RECONNECT_ATTEMPTS}}` | 5 | 最大重连次数 |
| `{{WS_HEARTBEAT_INTERVAL}}` | 30000 | 心跳间隔(ms) |

### 5. 数据库配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `{{DB_TYPE}}` | indexeddb | 数据库类型 |
| `{{DB_NAME}}` | yyc3-ai-code | 数据库名称 |
| `{{DB_VERSION}}` | 1 | 数据库版本 |
| `{{DB_MAX_SIZE}}` | 500 | 最大大小(MB) |

### 6. 存储配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `{{STORAGE_AUTO_SAVE}}` | true | 是否自动保存 |
| `{{STORAGE_AUTO_SAVE_INTERVAL}}` | 30000 | 自动保存间隔(ms) |
| `{{STORAGE_CACHE_TTL}}` | 3600000 | 缓存过期时间(ms) |
| `{{STORAGE_CACHE_MAX_SIZE}}` | 100 | 缓存最大条目数 |

### 7. 编辑器配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `{{EDITOR_DEFAULT_TYPE}}` | richtext | 默认编辑器类型 |
| `{{EDITOR_FONT_SIZE}}` | 14 | 编辑器字体大小 |
| `{{EDITOR_TAB_SIZE}}` | 2 | Tab 大小 |
| `{{EDITOR_LINE_NUMBERS}}` | true | 是否显示行号 |
| `{{EDITOR_WORD_WRAP}}` | true | 是否自动换行 |
| `{{EDITOR_AUTOCOMPLETE}}` | true | 是否启用自动补全 |

### 8. AI 配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `{{AI_DEFAULT_PROVIDER}}` | openai | 默认 AI 提供商 |
| `{{AI_DEFAULT_MODEL}}` | gpt-4 | 默认 AI 模型 |
| `{{AI_TEMPERATURE}}` | 0.7 | AI 温度参数 |
| `{{AI_MAX_TOKENS}}` | 4096 | AI 最大 tokens 数 |
| `{{AI_STREAM_ENABLED}}` | true | 是否启用流式输出 |
| `{{AI_TIMEOUT}}` | 60000 | AI 请求超时时间(ms) |

### 9. 安全配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `{{SECURITY_ENCRYPTION_ENABLED}}` | true | 是否启用加密 |
| `{{SECURITY_ENCRYPTION_ALGORITHM}}` | AES-GCM | 加密算法 |
| `{{SECURITY_KEY_LENGTH}}` | 256 | 密钥长度(位) |
| `{{SECURITY_SALT_LENGTH}}` | 16 | 盐长度(字节) |

### 10. UI 配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `{{UI_THEME}}` | dark | 默认主题 |
| `{{UI_LANGUAGE}}` | zh-CN | 默认语言 |
| `{{UI_ANIMATION_ENABLED}}` | true | 是否启用动画 |
| `{{UI_ANIMATION_DURATION}}` | 300 | 动画持续时间(ms) |

### 11. 日志配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `{{LOG_LEVEL}}` | info | 日志级别 |
| `{{LOG_ENABLED}}` | true | 是否启用日志 |
| `{{LOG_MAX_SIZE}}` | 10 | 日志最大大小(MB) |
| `{{LOG_RETENTION_DAYS}}` | 7 | 日志保留天数 |
