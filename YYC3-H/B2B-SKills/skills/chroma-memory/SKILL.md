# chroma-memory — 基于 ChromaDB 的逐轮对话记忆

> 面向客户对话的长期向量记忆。存储每轮对话并按客户隔离，自动标记报价与承诺，支持跨会话语义检索。

## 命令

| 命令                          | 说明                                |
| ----------------------------- | ----------------------------------- |
| `chroma:store`                | 存储一轮对话（每轮结束后自动调用）  |
| `chroma:search <query>`       | 对话历史语义搜索                    |
| `chroma:recall <customer_id>` | 回唤回访客户的近期历史              |
| `chroma:snapshot`             | 存储每日 CRM 快照作为容灾备份（L4） |
| `chroma:stats`                | 显示存储统计信息                    |

## 使用方法

```bash
# 存储一轮对话（通常由钩子自动触发）
chroma:store --customer "+971501234567" --turn 5 --user "500台的价格是多少？" --agent "我来为您准备一份详细报价……" --stage qualifying --topic pricing

# 搜索历史
chroma:search "迪拜客户价格讨论" --customer "+971501234567" --limit 5

# 回唤回访客户（间隔超过7天时自动触发）
chroma:recall "+971501234567" --limit 10

# 每日 CRM 快照（由 HEARTBEAT #12 触发）
chroma:snapshot

# 统计信息
chroma:stats
```

## 架构

本技能实现四层防遗忘系统的 **第三层（L3）** 和 **第四层（L4）**：

- **L3**：每轮对话 → ChromaDB，含客户 ID 隔离 + 自动标记
- **L4**：每日 CRM 快照 → ChromaDB，作为灾备恢复兜底

## 自动标记

对话轮次根据内容分析自动打标：

| 标签             | 触发条件           |
| ---------------- | ------------------ |
| `has_quote`      | 涉及价格/成本/报价 |
| `has_commitment` | 任意一方做出承诺   |
| `has_objection`  | 检测到客户异议     |
| `has_order`      | 订单/采购已确认    |
| `has_sample`     | 涉及样品请求       |

## 客户隔离

所有数据按 `customer_id`（手机号）分区。查询始终包含 `where={"customer_id": ...}`，确保严格的租户隔离。

## 依赖

- `chromadb` 技能（向量数据库，通过 ClawHub 安装）
- 已启用 session-memory 钩子的 OpenClaw Gateway
