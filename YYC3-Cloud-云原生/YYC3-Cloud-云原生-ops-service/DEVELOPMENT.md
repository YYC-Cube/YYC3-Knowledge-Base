# 开发环境设置指南

## 环境变量配置

本项目使用 `dotenv` 加载环境变量，支持多环境配置。

### 环境变量加载优先级

应用程序按以下优先级加载环境变量文件：

1. `.env.local` - 本地覆盖配置（不提交到版本控制）
2. `.env.development` - 开发环境配置
3. `.env` - 默认配置

### 环境变量命名规则

配置使用 `OPS_` 前缀，嵌套字段使用双下划线 `__` 分隔：

```bash
# 服务器配置
OPS_SERVER__ADDR=127.0.0.1:3000

# 数据库配置
OPS_DATABASE__URL=postgresql://user:pass@localhost/db
OPS_DATABASE__MAX_CONNECTIONS=10

# 日志配置
OPS_LOGGING__LEVEL=debug
OPS_LOGGING__FORMAT=pretty

# 安全配置
OPS_SECURITY__JWT_SECRET=your-secret-key-min-32-chars
OPS_SECURITY__RATE_LIMIT_RPS=100
```

## 快速开始

### 1. 启动 Docker 数据库（推荐）

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 2. 运行应用

```bash
# 开发模式（自动加载 .env.development）
cargo run

# 或指定环境
OPS_ENV=development cargo run
```

### 3. 运行测试

```bash
cargo test
```

## 开发环境配置文件

### `.env.development` - 开发环境

```bash
# 使用本地数据库
OPS_DATABASE__URL=postgresql://ops_user:dev_password@localhost:5432/ops_service
OPS_LOGGING__LEVEL=debug
OPS_LOGGING__FORMAT=pretty
OPS_SECURITY__RATE_LIMIT_RPS=1000  # 开发环境不限制速率
```

### `.env.production` - 生产环境（参考）

```bash
# 使用生产数据库
OPS_DATABASE__URL=postgresql://ops_user:strong_password@postgres:5432/ops_service
OPS_LOGGING__LEVEL=info
OPS_LOGGING__FORMAT=json  # 生产环境使用 JSON 格式
OPS_SECURITY__RATE_LIMIT_RPS=100
OPS_SECURITY__JWT_SECRET=<强密码至少32字符>
```

## 生产环境部署

在生产环境中，**不依赖** `.env` 文件，直接设置环境变量：

```bash
# 方式 1: 直接设置环境变量
export OPS_DATABASE__URL="postgresql://..."
export OPS_LOGGING__LEVEL="info"
./ops-system

# 方式 2: 使用 systemd 服务文件
# 在 /etc/systemd/system/ops-system.service 中配置 Environment=...

# 方式 3: 使用 Docker
docker run -e OPS_DATABASE__URL="..." ops-system
```

## 常见问题

### Q: 为什么环境变量使用双下划线？

A: 配置库使用 `__` 作为嵌套字段的分隔符。例如 `OPS_DATABASE__URL` 会被解析为 `database.url`。

### Q: 开发环境无法连接数据库？

A: 确保数据库容器正在运行：
```bash
docker ps | grep ops-postgres-dev
docker-compose -f docker-compose.dev.yml ps
```

### Q: 如何不使用 Docker 运行？

A: 设置 `OPS_DATABASE__URL` 连接到系统的 PostgreSQL：
```bash
export OPS_DATABASE__URL="postgresql://user:pass@localhost/ops_db"
cargo run
```

## 环境变量完整列表

参见 [.env.example](.env.example) 文件获取所有可配置项。
