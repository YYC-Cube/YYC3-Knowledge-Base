# 测试套件

这是一套完整的自动化测试套件，用于验证运维系统的功能正确性。

## 测试结构

```
tests/
├── common/                        # 测试公共模块
│   └── mod.rs                    # 测试工具函数
├── password_tests.rs             # 密码哈希功能单元测试
├── jwt_tests.rs                  # JWT 服务单元测试
├── audit_service_tests.rs        # 审计服务单元测试
├── permission_service_tests.rs   # 权限服务单元测试
├── model_validation_tests.rs     # 模型验证单元测试
├── error_tests.rs                # 错误处理单元测试
├── api_tests.rs                  # API 集成测试
└── repository_tests.rs           # 仓库层集成测试 (需要数据库)
```

## 测试覆盖范围

### 1. 密码哈希测试 (`password_tests.rs`)

- ✅ 密码哈希和验证
- ✅ 错误密码验证失败
- ✅ 每次哈希结果不同 (盐值)
- ✅ 空密码和长密码处理
- ✅ Unicode 密码支持
- ✅ 密码策略验证 (长度、大写、数字)
- ✅ 默认端口和状态值
- ✅ 密码哈希器默认实现
- ✅ 无效哈希格式处理

**测试数量**: 18

### 2. JWT 服务测试 (`jwt_tests.rs`)

- ✅ JWT 服务创建
- ✅ 密钥长度验证
- ✅ Access Token 生成和验证
- ✅ Refresh Token 生成和验证
- ✅ Token 类型验证 (access vs refresh)
- ✅ TokenPair 生成
- ✅ 多角色和权限的 Token
- ✅ Token 过期时间验证
- ✅ Unicode 用户名支持
- ✅ Token 篡改检测

**测试数量**: 17

### 3. 审计服务测试 (`audit_service_tests.rs`)

- ✅ 审计操作显示字符串
- ✅ 审计操作覆盖范围
- ✅ 审计操作分类
- ✅ 审计日志参数结构
- ✅ 带错误的审计日志
- ✅ 最小化审计日志参数
- ✅ JSON 变更记录
- ✅ Unicode 支持审计日志
- ✅ 审计操作名称一致性
- ✅ 审计操作多样性验证

**测试数量**: 11

### 4. 权限服务测试 (`permission_service_tests.rs`)

- ✅ 全局范围匹配
- ✅ 组范围匹配
- ✅ 环境范围匹配
- ✅ 组范围无值情况
- ✅ 环境范围无值情况
- ✅ 未知范围类型
- ✅ 角色绑定结构
- ✅ 多个范围类型的角色绑定
- ✅ 不同组/环境的范围
- ✅ 空范围值处理
- ✅ 角色名称
- ✅ 权限表示格式 (resource:action)
- ✅ 通配符权限

**测试数量**: 16

### 5. 模型验证测试 (`model_validation_tests.rs`)

- ✅ 用户状态转换
- ✅ 创建/更新用户请求反序列化
- ✅ 登录/刷新令牌请求
- ✅ 角色相关请求
- ✅ 主机请求 (默认值、所有字段)
- ✅ 组请求
- ✅ UUID 验证
- ✅ Unicode 字符支持
- ✅ 特殊字符处理
- ✅ 空值和边界测试

**测试数量**: 31

### 6. 错误处理测试 (`error_tests.rs`)

- ✅ 错误状态码映射
- ✅ 用户消息 (无敏感信息)
- ✅ 错误码
- ✅ 便捷方法 (not_found, validation, etc.)
- ✅ 错误显示
- ✅ From 转换
- ✅ 错误序列化
- ✅ 错误传播
- ✅ 错误匹配
- ✅ 特殊错误场景

**测试数量**: 26

### 7. API 集成测试 (`api_tests.rs`)

- ✅ 健康检查端点 `/health`
- ✅ 404 错误处理
- ✅ 方法不允许 (405)
- ✅ 响应结构验证
- ✅ 空请求体
- ✅ 无效 URI
- ✅ 响应头验证
- ✅ 查询参数处理
- ✅ 并发请求
- ⏭️ 登录凭证验证 (需要数据库)
- ⏭️ 空凭证登录 (需要数据库)

**测试数量**: 15 (13 运行 + 2 忽略)

### 8. 仓库层集成测试 (`repository_tests.rs`)

- ⏭️ UserRepository - 创建、查找、更新、删除用户
- ⏭️ UserRepository - 失败登录次数管理
- ⏭️ RoleRepository - 角色操作和权限分配
- ⏭️ AssetRepository - 资产组和主机管理
- ⏭️ AuditRepository - 审计日志记录和查询

**测试数量**: 12 (全部需要数据库连接)

## 运行测试

### 前置条件

#### 单元测试 (无需数据库)
大部分单元测试可以直接运行，不需要数据库连接：

```bash
# 运行所有无需数据库的单元测试
cargo test --test password_tests \
             --test jwt_tests \
             --test audit_service_tests \
             --test permission_service_tests \
             --test model_validation_tests \
             --test error_tests \
             --test api_tests
```

#### 集成测试 (需要数据库)
仓库层测试需要 PostgreSQL 数据库连接：

```bash
# 1. 确保 PostgreSQL 正在运行
sudo systemctl start postgresql

# 2. 创建测试数据库
createdb ops_service_test

# 3. 设置环境变量 (可选，有默认值)
export TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ops_service_test"

# 4. 运行仓库层测试
cargo test --test repository_tests
```

### 运行所有测试

```bash
# 运行所有测试 (跳过需要数据库的测试)
cargo test

# 运行测试并显示输出
cargo test -- --nocapture

# 运行测试并显示详细信息
cargo test -- --show-output

# 只运行单元测试 (不运行集成测试)
cargo test --lib
```

### 运行特定测试

```bash
# 密码相关测试
cargo test --test password_tests

# JWT 测试
cargo test --test jwt_tests

# 错误处理测试
cargo test --test error_tests

# 模型验证测试
cargo test test_user_status
cargo test test_password_hash

# 运行特定测试函数
cargo test test_password_hash_and_verify
```

### 运行被忽略的测试

```bash
# 包含被标记为 #[ignore] 的测试
cargo test -- --ignored

# 包含需要数据库连接的测试
cargo test --test repository_tests --test api_tests
```

## 测试分类

| 类型 | 文件 | 需要数据库 | 测试数量 |
|------|------|------------|----------|
| 单元测试 | password_tests.rs | ❌ | 18 |
| 单元测试 | jwt_tests.rs | ❌ | 17 |
| 单元测试 | audit_service_tests.rs | ❌ | 11 |
| 单元测试 | permission_service_tests.rs | ❌ | 16 |
| 单元测试 | model_validation_tests.rs | ❌ | 31 |
| 单元测试 | error_tests.rs | ❌ | 26 |
| 集成测试 | api_tests.rs | 部分 | 15 |
| 集成测试 | repository_tests.rs | ✅ | 12 |
| **总计** | - | - | **146+** |

## 代码覆盖率

安装 tarpaulin 来生成覆盖率报告：

```bash
cargo install cargo-tarpaulin

# 生成覆盖率报告
cargo tarpaulin --out Html --output-dir coverage

# 查看报告
open coverage/index.html
```

## 最佳实践

1. **隔离性**: 每个测试独立运行，不依赖其他测试的状态
2. **快速**: 单元测试应该快速执行，不需要外部依赖
3. **明确**: 测试名称应该清楚描述测试内容
4. **幂等性**: 多次运行同一测试应该得到相同结果
5. **覆盖**: 测试应覆盖正常路径和边界情况

## 添加新测试

### 单元测试示例

```rust
#[test]
fn test_password_hash_and_verify() {
    let hasher = PasswordHasher::new();
    let password = "TestPassword123!";

    let hash = hasher.hash(password).expect("Hashing should succeed");
    hasher.verify(password, &hash).expect("Verification should succeed");
}
```

### 集成测试示例

```rust
#[tokio::test]
#[ignore = "需要数据库连接"]
async fn test_user_repository_create() {
    let pool = setup_test_db().await;
    let repo = UserRepository::new(pool);

    let req = CreateUserRequest { /* ... */ };
    let user = repo.create(&req, &password_hash, user_id).await.unwrap();

    assert_eq!(user.username, "testuser");
}
```

## 故障排查

### 测试失败: "Connection refused"

确保 PostgreSQL 正在运行:
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
```

### 测试失败: "Database does not exist"

创建测试数据库:
```bash
createdb ops_service_test
```

### 编译错误

确保所有依赖已安装:
```bash
cargo build
```

## 贡献指南

提交代码前请确保:
1. 所有单元测试通过
2. 新功能包含对应的测试
3. 代码覆盖率没有降低
4. 遵循项目的编码规范
