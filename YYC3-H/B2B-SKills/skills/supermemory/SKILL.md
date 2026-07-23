# supermemory — AI 记忆引擎

基于向量搜索的语义记忆层。存储、回唤和关联跨所有客户交互的对话洞察。

## 架构
```
对话 → 提取洞察 → 向量化 → 存储（向量数据库）
                                    ↓
查询 → 语义搜索 → 相关记忆 → 注入上下文
```

## 记忆类型
| 类型 | 保留期限 | 示例 |
|------|----------|------|
| 客户事实 | 永久 | "迪拜的 Ahmed，每季度采购50台" |
| 对话洞察 | 90天 | "对 Model X 批量价格感兴趣" |
| 市场信号 | 30天 | "东非对产品 Y 需求激增" |
| 有效话术 | 永久 | "以本地市场数据开场 → 回复率提升3倍" |

## 命令
- `memory:add <text>` — 手动添加记忆
- `memory:search <query>` — 跨所有记忆进行语义搜索
- `memory:list [type]` — 按类型列出近期记忆
- `memory:forget <id>` — 删除指定记忆
- `memory:stats` — 记忆使用统计

## 自动捕获
启用后，引擎自动提取并存储：
1. 客户偏好和需求
2. 价格敏感度信号
3. 竞品提及
4. 采购时间线指标
5. 关系上下文（引荐、历史交互）

## 配置
```json
{
  "provider": "lancedb",
  "embedding_model": "{{embedding_model}}",
  "auto_capture": true,
  "capture_strategy": "last_turn",
  "recall_top_k": 5,
  "ttl_days": {
    "customer_fact": null,
    "conversation_insight": 90,
    "market_signal": 30,
    "effective_script": null
  }
}
```

## 集成
支持以下后端：
- **LanceDB**（本地，无外部依赖）
- **Supermemory Cloud**（托管服务，需 API Key）
- **Memos**（自托管笔记工具）
