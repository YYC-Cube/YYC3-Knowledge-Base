# Ops-Service 数据库迁移脚本

本目录包含 Ops-Service 项目的 PostgreSQL 数据库迁移脚本。

## 目录结构

```
migrations/
├── README.md                           # 本文件
├── 000001_init_baseline.sql            # 基线表结构（健康检查）
├── 000002_identity_and_audit.sql       # 身份、权限、资产、审计系统
├── 000003_seed_data.sql                # 初始化示例数据
├── 000004_job_system.sql               # 作业系统（SSH执行）和构建系统
├── 000005_approval_system.sql          # 审批流系统
├── 000006_security_enhancements.sql    # 安全增强功能
├── 000007_host_credentials.sql         # 主机SSH凭据字段
├── 000008_build_system.sql         # 构建系统P2.1更新
└── 000009_runner_docker_config.sql     # Runner Docker配置管理
```

## 快速开始

### 方式一：使用 psql 逐个执行

```bash
# 设置数据库连接信息
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGDATABASE=ops_service

# 逐个执行迁移脚本（按文件名顺序）
psql -f migrations/000001_init_baseline.sql
psql -f migrations/000002_identity_and_audit.sql
psql -f migrations/000003_seed_data.sql
psql -f migrations/000004_job_system.sql
psql -f migrations/000005_approval_system.sql
psql -f migrations/000006_security_enhancements.sql
psql -f migrations/000007_host_credentials.sql
psql -f migrations/000008_build_system.sql
psql -f migrations/000009_runner_docker_config.sql
```

### 方式二：一次性执行所有迁移

```bash
# 合并所有迁移文件并执行
cat migrations/0*.sql | psql
```

### 方式三：使用应用内置迁移

如果应用配置了数据库迁移功能，启动服务时会自动执行：

```bash
cd /home/ikaros/ops-system/ops-service
cargo run --bin ops-service
```

## 脚本说明

### 000001_init_baseline.sql
**P0 阶段：基线表结构**

创建基础的健康检查表，用于验证数据库连接。

| 表名 | 说明 |
|------|------|
| `health_check` | 健康检查测试表 |

### 000002_identity_and_audit.sql
**P1 阶段：身份、权限、资产与审计**

创建核心的身份认证、RBAC权限管理、资产管理和审计日志系统。

| 域 | 表名 | 说明 |
|------|------|------|
| 身份 | `users` | 用户表（含状态机、安全策略） |
| 身份 | `roles` | 角色表 |
| 身份 | `permissions` | 权限表（资源+操作） |
| 身份 | `role_permissions` | 角色-权限关联表 |
| 身份 | `role_bindings` | 用户-角色绑定（支持范围） |
| 身份 | `api_keys` | API密钥表 |
| 身份 | `refresh_tokens` | 刷新令牌表 |
| 资产 | `assets_groups` | 资产组（层级、环境感知） |
| 资产 | `assets_hosts` | 主机资产 |
| 审计 | `audit_logs` | 审计日志 |
| 审计 | `login_events` | 登录事件 |

**默认账户：**
- 用户名: `admin`
- 密码: `Admin123!`
- 首次登录后需修改密码

### 000003_seed_data.sql
**初始化示例数据**

提供快速开始所需的示例数据，包括测试用户、资产组、示例主机等。

**默认账户：**
| 用户名 | 密码 | 角色 |
|--------|------|------|
| `admin` | `Admin123!` | 管理员 |
| `demo` | `Demo123!` | 操作员 |
| `john.doe` | `Demo123!` | 测试用户 |
| `jane.smith` | `Demo123!` | 测试用户 |
| `bob.wilson` | `Demo123!` | 测试用户 |

### 000004_job_system.sql
**P2 阶段：作业系统与构建系统**

创建作业执行和CI/CD构建相关的表结构。

| 域 | 表名 | 说明 |
|------|------|------|
| 作业 | `jobs` | 顶层作业概念 |
| 作业 | `tasks` | 单主机执行任务 |
| 构建 | `build_jobs` | 构建作业 |
| 构建 | `build_steps` | 构建步骤 |
| 构建 | `build_artifacts` | 构建产物 |
| 构建 | `artifact_downloads` | 产物下载记录 |
| 执行器 | `runners` | 构建执行器 |

**自定义类型：**
- `job_type`: `command`, `script`, `build`
- `job_status`: `pending`, `running`, `completed`, `failed`, `cancelled`, `partially_succeeded`
- `task_status`: `pending`, `running`, `succeeded`, `failed`, `timeout`, `cancelled`
- `build_type`: `node`, `java`, `rust`, `frontend`, `other`

### 000005_approval_system.sql
**P3 阶段：审批流系统**

实现作业审批流程管理。

| 表名 | 说明 |
|------|------|
| `approval_groups` | 审批组 |
| `approval_requests` | 审批请求 |
| `approval_records` | 审批记录 |
| `job_templates` | 作业模板 |

### 000006_security_enhancements.sql
**P3 阶段：安全增强**

为资产组添加关键分组标记，关键分组的作业操作需要审批。

### 000007_host_credentials.sql
**主机SSH凭据**

为主机表添加SSH认证凭据字段，支持密码和私钥认证。

### 000008_build_system.sql
**P2.1 阶段：构建系统更新**

更新构建系统表结构，支持独立构建任务和更多配置选项。

### 000009_runner_docker_config.sql
**Runner Docker配置管理**

创建Docker配置管理表，支持通过Web界面管理Runner的Docker配置。

| 表名 | 说明 |
|------|------|
| `runner_docker_configs` | Docker配置 |
| `runner_config_history` | 配置变更历史 |

## 验证安装

### 检查表是否创建成功

```sql
-- 查看所有表
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 检查默认用户

```sql
-- 查看用户列表
SELECT username, email, status, full_name
FROM users
ORDER BY created_at;
```

### 检查资产统计

```sql
-- 查看主机统计视图
SELECT * FROM v_host_stats;
```

## 常用查询

### 获取用户权限

```sql
-- 获取指定用户的所有权限
SELECT * FROM get_user_permissions('<user_id>');
```

### 检查用户权限

```sql
-- 检查用户是否有特定权限
SELECT check_permission('<user_id>', 'asset', 'read');
```

### 查看最近活动

```sql
-- 查看最近50条审计记录
SELECT * FROM v_recent_activity;
```

## 回滚

如需回滚数据库，请按以下顺序删除表（注意外键依赖）：

```sql
-- P3 阶段
DROP TABLE IF EXISTS runner_config_history CASCADE;
DROP TABLE IF EXISTS runner_docker_configs CASCADE;
DROP TABLE IF EXISTS job_templates CASCADE;
DROP TABLE IF EXISTS approval_records CASCADE;
DROP TABLE IF EXISTS approval_requests CASCADE;
DROP TABLE IF EXISTS approval_groups CASCADE;

-- P2 阶段
DROP TABLE IF EXISTS artifact_downloads CASCADE;
DROP TABLE IF EXISTS build_artifacts CASCADE;
DROP TABLE IF EXISTS build_steps CASCADE;
DROP TABLE IF EXISTS build_jobs CASCADE;
DROP TABLE IF EXISTS runners CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;

-- P1 阶段
DROP TABLE IF EXISTS login_events CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS assets_hosts CASCADE;
DROP TABLE IF EXISTS assets_groups CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS role_bindings CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- P0 阶段
DROP TABLE IF EXISTS health_check CASCADE;

-- 删除自定义类型
DROP TYPE IF EXISTS approval_status CASCADE;
DROP TYPE IF EXISTS failure_reason CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS job_status CASCADE;
DROP TYPE IF EXISTS job_type CASCADE;
DROP TYPE IF EXISTS step_status CASCADE;
DROP TYPE IF EXISTS build_type CASCADE;
DROP TYPE IF EXISTS runner_capability CASCADE;
```

## 故障排查

### 问题：迁移脚本执行失败

**可能原因：**
1. 数据库连接配置错误
2. 数据库用户权限不足
3. 脚本执行顺序错误

**解决方案：**
```bash
# 检查数据库连接
psql -h localhost -U postgres -d postgres -c "SELECT version();"

# 确保按数字顺序执行脚本
ls migrations/*.sql | sort
```

### 问题：表或类型已存在

脚本使用 `IF NOT EXISTS` 语法，重复执行是安全的。如需重新初始化：

```bash
# 先执行回滚操作，再重新执行迁移
```

## 注意事项

1. **生产环境部署前：**
   - 修改默认管理员密码
   - 根据需要调整示例数据
   - 配置适当的数据库备份

2. **密码哈希：**
   - 默认密码使用 Argon2id 哈希
   - 生产环境建议使用更强的哈希参数

3. **权限设置：**
   - 确保数据库用户有创建表、索引、函数的权限
   - 生产环境应使用最小权限原则
