# 🌐 环境配置指南

## 📋 概述

本文档详细说明了 YanYu Cloud³ AI 管理平台的环境变量配置，包括开发、测试和生产环境的设置要求。

## 🚀 快速开始

### 1. 复制配置文件

```bash
cp .env.example .env.local
```

### 2. 编辑配置文件

根据您的环境修改 `.env.local` 中的配置值。

### 3. 验证配置

```bash
npm run env:validate
```

## 📚 配置分类详解

### 🌐 前端公共变量

这些变量会暴露给客户端，请勿包含敏感信息。

| 变量名                     | 描述               | 示例值                  | 必需 |
| -------------------------- | ------------------ | ----------------------- | ---- |
| `NEXT_PUBLIC_API_BASE_URL` | API 基础 URL       | `http://localhost:3001` | ✅   |
| `NEXT_PUBLIC_ENV`          | 环境标识           | `development`           | ✅   |
| `NEXT_PUBLIC_WS_URL`       | WebSocket 连接 URL | `ws://localhost:3001`   | ✅   |
| `NEXT_PUBLIC_BRAND_NAME`   | 品牌名称           | `YanYu Cloud³`          | ✅   |
| `NEXT_PUBLIC_VERSION`      | 应用版本           | `v1.0.0`                | ✅   |

### 🗄️ 数据库配置

PostgreSQL 数据库连接配置。

| 变量名        | 描述       | 示例值            | 必需 |
| ------------- | ---------- | ----------------- | ---- |
| `DB_HOST`     | 数据库主机 | `localhost`       | ✅   |
| `DB_PORT`     | 数据库端口 | `5432`            | ✅   |
| `DB_NAME`     | 数据库名称 | `yyc3_management` | ✅   |
| `DB_USER`     | 数据库用户 | `yyc3_admin`      | ✅   |
| `DB_PASSWORD` | 数据库密码 | `secure_password` | ✅   |
| `DB_POOL_MAX` | 最大连接数 | `20`              | ❌   |
| `DB_POOL_MIN` | 最小连接数 | `5`               | ❌   |
| `DB_SSL`      | 启用 SSL   | `false`           | ❌   |

### 📦 Redis 配置

缓存和会话存储配置。

| 变量名             | 描述             | 示例值           | 必需 |
| ------------------ | ---------------- | ---------------- | ---- |
| `REDIS_HOST`       | Redis 主机       | `127.0.0.1`      | ✅   |
| `REDIS_PORT`       | Redis 端口       | `6379`           | ✅   |
| `REDIS_PASSWORD`   | Redis 密码       | `redis_password` | 🔒   |
| `REDIS_DB`         | Redis 数据库索引 | `0`              | ❌   |
| `REDIS_KEY_PREFIX` | 键前缀           | `yyc3:`          | ❌   |

### 🔐 OpenAI 配置

AI 功能相关配置。

| 变量名                | 描述            | 示例值    | 必需 |
| --------------------- | --------------- | --------- | ---- |
| `OPENAI_API_KEY`      | OpenAI API 密钥 | `sk-...`  | ✅   |
| `OPENAI_MODEL`        | 默认模型        | `gpt-4o`  | ❌   |
| `OPENAI_ORGANIZATION` | 组织 ID         | `org-...` | ❌   |
| `OPENAI_MAX_TOKENS`   | 最大令牌数      | `4000`    | ❌   |
| `OPENAI_TEMPERATURE`  | 温度参数        | `0.7`     | ❌   |

### 🔑 认证与安全

JWT 和安全相关配置。

| 变量名                   | 描述             | 示例值                  | 必需 |
| ------------------------ | ---------------- | ----------------------- | ---- |
| `JWT_SECRET`             | JWT 密钥         | `32位以上随机字符串`    | ✅   |
| `JWT_EXPIRES_IN`         | 访问令牌过期时间 | `24h`                   | ❌   |
| `JWT_REFRESH_EXPIRES_IN` | 刷新令牌过期时间 | `7d`                    | ❌   |
| `BCRYPT_ROUNDS`          | 密码加密轮数     | `12`                    | ❌   |
| `CORS_ORIGIN`            | 跨域来源         | `http://localhost:3000` | ❌   |

### 📧 邮件服务

SMTP 邮件发送配置。

| 变量名       | 描述       | 示例值                | 必需 |
| ------------ | ---------- | --------------------- | ---- |
| `SMTP_HOST`  | SMTP 主机  | `smtp.gmail.com`      | 📧   |
| `SMTP_PORT`  | SMTP 端口  | `587`                 | 📧   |
| `SMTP_USER`  | SMTP 用户  | `your@email.com`      | 📧   |
| `SMTP_PASS`  | SMTP 密码  | `app_password`        | 📧   |
| `EMAIL_FROM` | 发件人地址 | `noreply@yanyu.cloud` | 📧   |

### 📁 文件存储

文件上传和存储配置。

| 变量名                 | 描述               | 示例值                    | 必需 |
| ---------------------- | ------------------ | ------------------------- | ---- |
| `UPLOAD_MAX_SIZE`      | 最大文件大小(字节) | `10485760`                | ❌   |
| `UPLOAD_ALLOWED_TYPES` | 允许的文件类型     | `jpg,png,pdf`             | ❌   |
| `UPLOAD_PATH`          | 本地存储路径       | `./uploads`               | ❌   |
| `UPLOAD_PROVIDER`      | 存储提供商         | `local`                   | ❌   |
| `CDN_URL`              | CDN 地址           | `https://cdn.yanyu.cloud` | ❌   |

### 📊 监控与日志

系统监控和日志配置。

| 变量名            | 描述            | 示例值        | 必需 |
| ----------------- | --------------- | ------------- | ---- |
| `LOG_LEVEL`       | 日志级别        | `info`        | ❌   |
| `LOG_FILE_PATH`   | 日志文件路径    | `./logs`      | ❌   |
| `PROMETHEUS_PORT` | Prometheus 端口 | `9090`        | ❌   |
| `SENTRY_DSN`      | Sentry DSN      | `https://...` | ❌   |
| `ENABLE_METRICS`  | 启用指标收集    | `true`        | ❌   |

### 🔄 WebSocket 配置

实时通信配置。

| 变量名               | 描述           | 示例值 | 必需 |
| -------------------- | -------------- | ------ | ---- |
| `WS_ENABLED`         | 启用 WebSocket | `true` | ❌   |
| `WS_PORT`            | WebSocket 端口 | `3001` | ❌   |
| `WS_MAX_CONNECTIONS` | 最大连接数     | `1000` | ❌   |
| `WS_PING_TIMEOUT`    | Ping 超时时间  | `5000` | ❌   |

## 🌍 环境特定配置

### 🔧 开发环境 (development)

```bash
NODE_ENV=development
LOG_LEVEL=debug
DB_SSL=false
HTTPS_ONLY=false
ENABLE_METRICS=false
```

### 🧪 测试环境 (test)

```bash
NODE_ENV=test
LOG_LEVEL=warn
DB_NAME=yyc3_test
REDIS_DB=1
```

### 🚀 生产环境 (production)

```bash
NODE_ENV=production
LOG_LEVEL=info
DB_SSL=true
HTTPS_ONLY=true
ENABLE_METRICS=true
HELMET_ENABLED=true
```

## 🔒 安全最佳实践

### 1. 密钥安全

- JWT 密钥至少 32 位，生产环境建议 64 位
- 使用强密码策略
- 定期轮换 API 密钥

### 2. 环境隔离

- 不同环境使用不同的数据库
- 生产环境启用 SSL/TLS
- 使用环境变量而非硬编码

### 3. 访问控制

- 配置适当的 CORS 策略
- 启用速率限制
- 使用安全头部

## 🛠️ 故障排查

### 常见问题

1. **数据库连接失败**

   - 检查 DB_HOST、DB_PORT 是否正确
   - 确认数据库服务正在运行
   - 验证用户权限

2. **Redis 连接失败**

   - 检查 REDIS_HOST、REDIS_PORT
   - 确认 Redis 服务状态
   - 验证密码配置

3. **OpenAI API 错误**

   - 检查 API 密钥是否有效
   - 确认账户余额
   - 验证模型可用性

4. **WebSocket 连接问题**
   - 检查 WS_URL 配置
   - 确认端口是否开放
   - 验证 CORS 设置

### 验证工具

```bash
# 验证环境配置
npm run env:validate

# 检查数据库连接
npm run db:test

# 测试Redis连接
npm run redis:test

# 验证OpenAI连接
npm run ai:test
```

## 📞 支持

如需帮助，请联系：

- 📧 技术支持: tech-support@yanyu.cloud
- 📖 文档: https://docs.yanyu.cloud
- 🐛 问题反馈: https://github.com/YY-Nexus/YYC-AI-management/issues

---

**注意**: 请勿将包含敏感信息的 `.env.local` 文件提交到版本控制系统。
