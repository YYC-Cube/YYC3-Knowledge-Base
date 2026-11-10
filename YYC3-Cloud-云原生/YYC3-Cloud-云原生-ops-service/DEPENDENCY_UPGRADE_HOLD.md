# 依赖升级暂缓记录

本文档记录了当前暂缓升级的依赖，包括当前版本、目标版本、暂缓原因和相关影响。

---

## 1. jsonwebtoken

| 项目 | 版本 |
|------|------|
| 当前版本 | 9.3 |
| 目标版本 | 10.2 |
| 升级跨度 | Major (破坏性变更) |

### 暂缓原因

**核心认证功能，API 变化较大**

`jsonwebtoken` 10.x 引入了重大 API 变更：

1. **加密后端必须显式选择**
   - v9.3: 使用默认加密实现
   - v10: 必须在 `Cargo.toml` 中选择加密后端 feature（`aws_lc_rs` 或 `rust_crypto`）

2. **API 结构变化**
   - `EncodingKey` 和 `DecodingKey` 构造方式可能变化
   - 需要更新所有 JWT 编码/解码调用

### 影响范围

```
src/ops-service/src/auth/jwt.rs  - 完整的 JWT 服务实现
├── JwtService 结构体
├── generate_access_token()
├── generate_refresh_token()
├── validate_token()
└── TokenPair 响应结构
```

### 迁移预估

- **代码改动**: 约 10-20 处
- **测试工作**: 需要完整回归测试认证流程
- **风险等级**: 高（认证是核心安全功能）

### 升级时机建议

1. 等待 v10.x 在社区更广泛使用，稳定性得到验证
2. 安排专门的安全认证测试周期
3. 准备回滚方案

### 参考链接

- [jsonwebtoken CHANGELOG](https://github.com/Keats/jsonwebtoken/blob/master/CHANGELOG.md)
- [jsonwebtoken v10.0.0 发布说明](https://crates.io/crates/jsonwebtoken/10.0.0)

---

## 2. lapin

| 项目 | 版本 |
|------|------|
| 当前版本 | 2.3 |
| 目标版本 | 3.7 |
| 升级跨度 | Major (破坏性变更) |

### 暂缓原因

**核心消息队列功能，API 和连接机制有重大变更**

`lapin` 3.x 引入了多项重大变更：

1. **认证机制变更**
   - v2.x: 通过 `ConnectionProperties` 配置
   - v3.x: 认证机制通过 AMQPUri 查询参数配置

2. **Executor Trait 变化**
   - 异步执行器 trait 重新设计
   - 与 tokio 的集成方式可能有变化

3. **协议类型使用增加**
   - 更多使用 `ShortString` 和 `LongString` 协议类型
   - API 返回类型可能变化

### 影响范围

```
src/ops-runner/src/worker.rs      - RabbitMQ 消费者
├── Connection::connect()
├── Channel 创建
├── Queue 声明和绑定
└── basic_consume 消息处理

src/ops-runner/src/publisher.rs   - RabbitMQ 发布者
├── exchange_declare()
├── basic_publish()
└── MessagePublisher 结构体
```

### 当前代码示例

```rust
// worker.rs:34-39
let conn = Connection::connect(
    &config.message_queue.amqp_url,
    ConnectionProperties::default(),
).await
```

### 迁移预估

- **代码改动**: 约 20-30 处
- **测试工作**: 需要完整的消息队列集成测试
- **风险等级**: 高（消息队列是 Runner 与控制面通信的核心）

### 升级时机建议

1. 等待项目有专门的时间窗口进行 AMQP 集成测试
2. 准备 RabbitMQ 测试环境
3. 参考 lapin 3.x 迁移指南进行逐步迁移

### 参考链接

- [lapin CHANGELOG](https://github.com/amqp-rs/lapin/blob/main/CHANGELOG.md)
- [lapin GitHub](https://github.com/amqp-rs/lapin)

---

## 升级计划

### 短期（1-2 个迭代）

暂无计划，优先完成其他功能开发。

### 中期（3-6 个月）

根据以下条件评估升级时机：

1. **jsonwebtoken**
   - v10.x 在社区广泛使用且稳定
   - 安排专门的安全测试周期

2. **lapin**
   - 项目有充足的时间窗口进行集成测试
   - 准备完整的测试环境和回滚方案

### 长期（6-12 个月）

- 完成所有暂缓依赖的升级
- 保持依赖库在合理的新版本范围内

---

## 更新记录

| 日期 | 操作 | 操作人 |
|------|------|--------|
| 2026-01-09 | 初始创建，记录 jsonwebtoken 和 lapin 暂缓原因 | Claude |

---

*本文档应在依赖升级完成或策略变更时及时更新。*
