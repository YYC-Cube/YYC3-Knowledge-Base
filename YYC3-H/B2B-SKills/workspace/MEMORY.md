# MEMORY.md — 四层防遗忘运营协议

## 记忆架构（四层 — 永不遗忘）

```
消息进入 → L1 MemOS 自动回唤
         → L3 chroma:store（每轮存储）
         → L2 双阈值（50% 后台保存 → 65% 压缩）
         → L4 CRM 快照（每日 12:00 容灾）
```

| 层级 | 引擎 | 工作方式 | 你的操作 |
|------|------|---------|---------|
| **L1：MemOS** | 结构化记忆 | 对话开始时自动注入过往记忆，对话结束时自动捕获 BANT/承诺/异议 | 读取它提供的内容 |
| **L2：主动摘要** | 双阈值监控 | **50%**：后台保存关键事实至 ChromaDB（非阻塞）。**65%**：通过 haiku 级模型全面压缩。数字/报价/承诺零信息丢失 | 超过20轮时嵌入关键数据摘要 |
| **L3：ChromaDB** | 逐轮存储 | 每轮存储，含客户 ID 隔离 + 自动标记。搜索使用时效加权排序 | 触达前使用 `chroma:search` |
| **L4：CRM 快照** | 每日备份 | 每日 12:00 管线快照至 ChromaDB 作为灾备 | 无需操作 — 自动执行 |

### 降级链路（当某层不可用时）
| 故障层级 | 降级行为 |
|---------|---------|
| **L1 MemOS 宕机** | 读取 CRM 获取客户上下文 + `chroma:recall` 获取近期轮次。通知所有者："MemOS 不可用，正在使用 CRM + ChromaDB 运行" |
| **L3 ChromaDB 宕机** | 使用 L1 MemOS 数据继续对话。记录至 Supermemory（`memory:add`）作为临时存储。通知所有者："ChromaDB 不可用" |
| **L1 + L3 同时宕机** | 以 CRM 作为唯一真实来源。回访客户时请其简要回顾："It's been a while — could you remind me where we left off?" |
| **Supermemory 宕机** | 跳过调研记忆存储。使用 CRM + ChromaDB 继续。调研发现仅写入 CRM 备注字段 |
| **所有记忆层宕机** | 以无状态模式运行。立即告知所有者。每次交互从 CRM 读取 |

## 运营规则（每次对话）

1. **对话开始**：读取 MemOS 快照。自然地引用上次话题以确保连贯性。
2. **触达前**：`chroma:search` + `memory:search` 回唤客户历史和调研。
3. **每轮结束**：L3 自动存储该轮。提取 BANT 变化、新承诺、异议。
4. **调研后**：`memory:add` 将发现存入 Supermemory（公司情报、竞品数据）。
5. **超过20轮**：在消息中嵌入简要关键数据摘要（防止 L2 压缩丢失）。
6. **客户引用过往**：回复前始终执行 `chroma:search` + `memory:search`。
7. **回访客户（间隔7天+）**：`chroma:recall <customer_id>` 获取完整历史上下文。

## 命令参考

### Supermemory（调研与洞察）
```
memory:add "迪拜的 Ahmed 每季度采购50台，偏好 FOB" --type customer_fact
memory:add "竞品 X 在西非降价15%" --type competitor_intel
memory:add "WhatsApp 语音消息在中东回复率翻倍" --type effective_tactic
memory:search "迪拜客户偏好" --limit 5
memory:list --type customer_fact
memory:stats
```

### ChromaDB（对话历史）
```
chroma:store --customer "+971501234567" --turn 5 --user "price?" --agent "let me quote..." --stage qualifying --topic pricing
chroma:search "迪拜价格讨论" --customer "+971501234567" --limit 5
chroma:recall "+971501234567" --limit 10
chroma:expand <turn_id>   -- 查看已压缩/归档轮次的完整原文
chroma:snapshot
chroma:stats
```

## 记忆优先级矩阵

| 信息类型 | L1 MemOS | L2 摘要 | L3 ChromaDB | L4 CRM | 保留期限 |
|---------|----------|---------|-------------|--------|---------|
| 客户 BANT / 承诺 | 自动捕获 | 逐字保留 | 逐轮存储 | — | 永久 |
| 报价 / 价格讨论 | 自动捕获 | 逐字保留 | 自动标记 `has_quote` | — | 永久 |
| 客户异议 | 自动捕获 | 逐字保留 | 自动标记 `has_objection` | — | 永久 |
| 公司调研 / 竞品情报 | — | — | — | — | 永久（Supermemory） |
| 有效话术 / 模式 | — | — | — | — | 永久（Supermemory） |
| 市场信号 / 趋势 | — | — | — | — | 30天（Supermemory） |
| 管线状态 | — | — | — | 每日快照 | 永久 |
| 原始对话轮次 | — | 压缩 | 全文存储 | — | 永久（ChromaDB） |

## 跨会话连续性规则

1. **绝不冷启动**：若 MemOS 注入了记忆，自然引用（"Following up on our discussion about X..."）
2. **追踪所有承诺**：己方和客户的。己方逾期 → 先道歉 + 补救。
3. **识别回访客户**：CRM 有历史交互 → 回复前 `chroma:recall`。
4. **交接保护**：会话结束前确保 CRM 已更新 + 关键调研已存入 Supermemory。
5. **每周记忆卫生**：周一心跳 → `memory:stats` + `chroma:stats`。归档过时信号。

## 自动标记（L3 ChromaDB）

每轮存储的对话自动分析并打标：

| 标签 | 触发条件 |
|------|---------|
| `has_quote` | Price、cost、FOB、CIF、$、€、discount |
| `has_commitment` | "I will"、"we'll send"、"by Monday"、各类承诺 |
| `has_objection` | "too expensive"、"not interested"、"competitor cheaper" |
| `has_order` | "place order"、"confirm purchase"、"deposit" |
| `has_sample` | "sample"、"trial"、"prototype" |

## L2 双阈值压缩

**50% token 使用时**（BACKGROUND_SAVE）：
- 非阻塞后台提取关键事实
- 事实存储至 ChromaDB — 不压缩对话
- 提前保护关键数据，防止意外上下文丢失

**65% token 使用时**（COMPRESS）：
1. 先更新 MemOS（安全网）
2. 使用 haiku 级模型压缩（快速、低成本）
3. **逐字保留**：所有数字、报价、承诺、BANT 数据
4. **压缩**：寒暄、重复介绍、多轮确认
5. 将压缩摘要存储至 ChromaDB
6. 保留最近3轮原文不压缩

**恢复压缩轮次**：使用 `chroma:expand <turn_id>` 查看完整原文。

## CRM 列映射
> 详见 USER.md → CRM 配置

来源值：ctwa_facebook / ctwa_instagram / organic_whatsapp / referral / exhibition / website / web_discovery / outbound_email
状态值：new / contacted / interested / quote_sent / negotiating / meeting_set / closed_won / closed_lost / nurture / email_sent / email_replied

## 产品快速参考
> 详见 USER.md → 产品线

## SDR 效能原则
- 提及潜在客户的近期动态（融资、招聘、新项目）可大幅提升回复率
- WhatsApp 最佳长度：3-5句话、100词以内（参见 SOUL.md 消息长度规则）
- 跟进节奏：首触 → 3天 → 5天 → 长期培育
- 停滞阈值：5个工作日无互动
- CTWA 线索黄金窗口：首条回复在5分钟内
- 冷邮件最佳时段：周二/周三上午（收件人当地时间）
- 多渠道（WhatsApp + Email）回复率是单渠道的2倍

## 学习日志
（通过 `memory:add --type effective_tactic` 保存已验证的模式）
