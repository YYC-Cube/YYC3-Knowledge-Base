# 部署故障排查指南

## GitHub 推送失败

### 问题 1: 认证失败

**症状：** "Failed to commit and push files"

**解决方案：**

1. 检查 GitHub Token
   \`\`\`bash

# 生成新的 Personal Access Token

# Settings → Developer settings → Personal access tokens → Fine-grained tokens

# 确保 Token 具有以下权限

- Contents: Read and write
- Pull requests: Read and write
- Workflows: Read and write
  \`\`\`

2. 配置 Git 认证
   \`\`\`bash
   git config --global user.name "YY-Nexus"
   git config --global user.email "<your-email@example.com>"

# 使用 Token 作为密码

git remote set-url origin https://YOUR_TOKEN@github.com/YY-Nexus/YYC-AI-management.git
\`\`\`

### 问题 2: 分支保护

**症状：** 无法直接推送到 main 分支

**解决方案：**

1. 创建新分支
   \`\`\`bash
   git checkout -b feature/deployment-fix
   git add .
   git commit -m "feat: add deployment configuration"
   git push origin feature/deployment-fix
   \`\`\`

2. 创建 Pull Request 并合并

### 问题 3: 文件冲突

**症状：** "Your local changes would be overwritten"

**解决方案：**

\`\`\`bash

# 拉取最新代码

git pull origin main --rebase

# 解决冲突后

git add .
git rebase --continue
git push origin main
\`\`\`

## 环境变量问题

### 缺少必需的环境变量

**检查清单：**

\`\`\`bash

# 验证所有必需的环境变量

cat > check-env.sh << 'EOF'

# !/bin/bash

required_vars=(
"DB_HOST"
"DB_PORT"
"DB_NAME"
"DB_USER"
"DB_PASSWORD"
"REDIS_HOST"
"REDIS_PORT"
"JWT_SECRET"
"OPENAI_API_KEY"
)

missing=()
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
missing+=("$var")
fi
done

if [ ${#missing[@]} -gt 0 ]; then
echo "❌ 缺少环境变量: ${missing[*]}"
exit 1
else
echo "✅ 所有环境变量已配置"
fi
EOF

chmod +x check-env.sh
./check-env.sh
\`\`\`

## Docker 部署问题

### 容器无法启动

\`\`\`bash

# 查看容器日志

docker-compose logs -f app

# 检查容器状态

docker-compose ps

# 重新构建

docker-compose build --no-cache
docker-compose up -d
\`\`\`

### 数据库连接失败

\`\`\`bash

# 测试数据库连接

docker-compose exec postgres psql -U postgres -c "SELECT 1"

# 检查网络

docker network ls
docker network inspect yanyu-network
\`\`\`

### Redis 连接失败

\`\`\`bash

# 测试 Redis

docker-compose exec redis redis-cli ping

# 检查 Redis 配置

docker-compose exec redis redis-cli CONFIG GET "\*"
\`\`\`

## WebSocket 连接问题

### 无法建立 WebSocket 连接

**检查清单：**

1. 验证 WebSocket 服务
   \`\`\`bash
   curl <http://localhost:3001/api/websocket/health>
   \`\`\`

2. 检查防火墙规则
   \`\`\`bash

# 确保端口 3001 开放

sudo ufw allow 3001/tcp
\`\`\`

3. 检查 Nginx 配置（如果使用反向代理）
   \`\`\`nginx
   location /socket.io {
   proxy_pass <http://backend>;
   proxy_http_version 1.1;
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   proxy_set_header Host $host;
   }
   \`\`\`

## 性能问题

### Redis 内存不足

\`\`\`bash

# 检查内存使用

redis-cli INFO memory

# 配置最大内存

redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
\`\`\`

### 数据库连接池耗尽

\`\`\`env

# 调整连接池配置

DB_POOL_MAX=20
DB_POOL_MIN=5
DB_IDLE_TIMEOUT=30000
\`\`\`

## 监控和日志

### 查看应用日志

\`\`\`bash

# Docker 日志

docker-compose logs -f app

# 应用日志

tail -f /var/log/yanyu-cloud/app.log

# 错误日志

tail -f /var/log/yanyu-cloud/error.log
\`\`\`

### Prometheus 指标

\`\`\`bash

# 查看 Prometheus 指标

curl <http://localhost:3001/metrics>

# 查看 Redis 指标

curl <http://localhost:9121/metrics>
\`\`\`

## 紧急回滚

\`\`\`bash

# 停止当前版本

docker-compose down

# 回滚到上一个版本

docker-compose -f docker-compose.prod.yml \
 --env-file .env.backup \
 up -d

# 恢复数据库

cat /opt/backups/latest-backup.sql | \
 docker-compose exec -T postgres psql -U postgres yanyu_cloud
\`\`\`

## 联系支持

如果问题仍未解决：

1. 收集日志
   \`\`\`bash
   ./scripts/collect-logs.sh
   \`\`\`

2. 创建 GitHub Issue
   - 包含错误日志
   - 环境信息
   - 复现步骤

3. 紧急联系方式
   - Email: <support@yanyucloud.com>
   - Slack: #yanyu-cloud-support
