# 数据库快速设置指南

## 🎯 选择你的部署方式

### 🐳 方式一：Docker 部署（推荐）

**适合场景**：快速部署、生产环境、不想手动安装依赖

```bash
# 1. 启动服务（自动运行迁移和加载种子数据）
docker-compose up -d

# 2. 查看日志确认启动成功
docker-compose logs api

# 3. 访问应用
curl http://localhost/health
```

**完成！** 现在你可以：
- 访问 http://localhost 使用系统
- 默认账户：`admin` / `Admin123!`
- 查看下方"常用命令"了解如何管理

#### Docker 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 进入数据库
docker-compose exec postgres psql -U ops_user -d ops_service
```

#### 在 Docker 中查看数据

```bash
# 进入数据库容器
docker-compose exec postgres psql -U ops_user -d ops_service

# 然后运行SQL查询（参考下方的"快速验证"）
```

---

### 🔧 方式二：Native 部署

**适合场景**：开发环境、需要定制化、已有 PostgreSQL

#### 步骤 1：安装依赖

```bash
# 安装 PostgreSQL（Ubuntu/Debian）
sudo apt-get update
sudo apt-get install postgresql postgresql-client

# 或使用 sqlx-cli（可选，用于迁移管理）
cargo install sqlx-cli --no-default-features --features rustls,postgres
```

#### 步骤 2：创建数据库

```bash
# 创建数据库
sudo -u postgres createdb ops_service

# 或使用 psql
sudo -u postgres psql
CREATE DATABASE ops_service;
\q
```

#### 步骤 3：运行迁移

```bash
# 方法 A：使用迁移管理脚本（推荐）
cd ops-service
./scripts/migrate.sh migrate

# 方法 B：使用 sqlx-cli
export DATABASE_URL="postgresql://postgres:password@localhost:5432/ops_service"
sqlx migrate run --source migrations
```

#### 步骤 4：加载种子数据（可选）

```bash
# 使用脚本加载示例数据
./scripts/migrate.sh seed

# 或手动加载
psql -U postgres -d ops_service -f migrations/000003_seed_data.sql
```

#### 步骤 5：启动应用

```bash
# 设置环境变量
export OPS_DATABASE__URL="postgresql://postgres:password@localhost:5432/ops_service"
export OPS_SECURITY__JWT_SECRET="your-secret-key-min-32-characters-long"

# 启动服务
cargo run

# 或使用编译后的二进制文件
./target/release/ops-system
```

#### Native 常用命令

```bash
# 查看迁移状态
./scripts/migrate.sh status

# 进入数据库
./scripts/migrate.sh shell

# 备份数据库
./scripts/migrate.sh backup

# 创建新迁移
./scripts/migrate.sh create add_new_feature
```

---

## ✅ 快速验证

### Docker 用户

```bash
# 进入数据库
docker-compose exec postgres psql -U ops_user -d ops_service

# 然后运行下方的 SQL 查询
```

### Native 用户

```bash
# 进入数据库
./scripts/migrate.sh shell

# 或使用 psql
psql -U postgres -d ops_service
```

### SQL 查询（两种方式通用）

```sql
-- 1. 查看所有表
\dt

-- 2. 查看用户
SELECT username, email, full_name, status FROM users;

-- 3. 查看主机统计
SELECT * FROM v_host_stats;

-- 4. 查看最近活动
SELECT * FROM v_recent_activity LIMIT 10;

-- 5. 退出
\q
```

---

## 📊 初始数据说明

### 默认账户

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | Admin123! | 管理员 | 首次登录需修改密码 |
| demo | Demo123! | 操作员 | 演示账户 |

### 测试账户（密码均为 Demo123!）

- john.doe - 工程师
- jane.smith - 运维人员
- bob.wilson - QA

### 示例资产

**生产环境**（5台主机）：
- prod-web-01, prod-web-02 (Web服务器)
- prod-api-01 (API服务器)
- prod-db-01, prod-db-02 (数据库主从)

**开发环境**（3台主机）：
- dev-web-01, dev-api-01, dev-db-01

---

## 🎓 下一步

### 我想...

**了解系统架构**
- 查看 [README.md](README.md) - 完整迁移指南
- 查看 [CHEATSHEET.md](CHEATSHEET.md) - SQL速查表

**管理数据库**
- Docker: 使用 `docker-compose exec postgres psql ...`
- Native: 使用 `./scripts/migrate.sh shell`
- 参考 [CHEATSHEET.md](CHEATSHEET.md) 学习常用SQL

**创建新迁移**
- Docker: 建议切换到 Native 环境开发
- Native: `./scripts/migrate.sh create add_feature`

**生产部署**
- 修改默认密码！
- 删除测试账户和示例数据
- 配置定期备份

---

## ❓ 常见问题

### Docker 部署

**Q: 如何查看数据库内容？**
```bash
docker-compose exec postgres psql -U ops_user -d ops_service
```

**Q: 如何重置数据库？**
```bash
docker-compose down -v    # 删除数据卷
docker-compose up -d       # 重新创建
```

**Q: 数据存储在哪里？**
```bash
docker volume ls          # 查看卷
docker volume inspect ops-system_postgres_data  # 查看路径
```

### Native 部署

**Q: 数据库连接失败？**
```bash
# 检查 PostgreSQL 是否运行
sudo systemctl status postgresql

# 检查数据库是否存在
psql -U postgres -l | grep ops_service
```

**Q: 忘记密码？**
```sql
-- 在数据库中重置管理员密码
UPDATE users SET
    password_hash = '$argon2id$v=19$m=65536,t=3,p=2$...',
    must_change_password = TRUE
WHERE username = 'admin';
```

**Q: 想删除所有数据重新开始？**
```bash
./scripts/migrate.sh reset   # 危险操作！会删除所有数据
```

---

## 🔐 安全提醒

⚠️ **生产环境必做**：

1. 修改默认管理员密码
2. 删除测试账户（demo, john.doe, jane.smith, bob.wilson）
3. 删除示例主机资产
4. 配置强密码策略
5. 启用 HTTPS
6. 配置防火墙

```sql
-- 删除测试用户
DELETE FROM users WHERE username IN ('demo', 'john.doe', 'jane.smith', 'bob.wilson');

-- 删除示例资产
DELETE FROM assets_hosts WHERE identifier LIKE 'prod-%' OR identifier LIKE 'dev-%';
```

---

## 📞 获取帮助

- **文档**: [README.md](README.md) | [CHEATSHEET.md](CHEATSHEET.md)
- **管理脚本**: `./scripts/migrate.sh help`
- **API文档**: 启动服务后访问 http://localhost:3000/docs

---

## 🎯 选择建议

- **快速体验/学习**: → Docker 部署
- **生产部署**: → Docker 部署
- **深度定制/开发**: → Native 部署
- **已有 PostgreSQL**: → Native 部署

**推荐**: 大多数用户应该选择 Docker 部署 🐳
