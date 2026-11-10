# telegram-toolkit — Telegram SDR 最佳实践与模板

> 机器人命令、内联键盘、大文件处理和 Telegram 渠道专属 B2B SDR 销售策略。

## 为什么选择 Telegram 做 B2B 销售

| 优势 | 影响 |
|------|------|
| **无72小时窗口限制** | 可随时主动触达 — 培育、跟进、唤醒停滞线索 |
| **2GB 文件限制** | 完整产品目录、认证文件、视频演示 |
| **机器人命令** | 结构化自助服务（`/catalog`、`/quote`、`/status`） |
| **内联键盘** | 一键 BANT 资质评估，比自由文本快3-5倍 |
| **基于用户名** | 门槛更低 — 客户无需暴露手机号 |
| **免费 API** | 无按消息计费 |
| **无账号封禁风险** | Bot API 稳定，不像 WhatsApp 有严格的反自动化策略 |

## 机器人命令

通过 @BotFather 使用 `/setcommands` 注册以下命令：

```
start - 欢迎消息与产品概览
catalog - 浏览产品目录
quote - 请求报价
status - 查询订单或报价状态
contact - 联系人工客服
language - 切换对话语言
```

### 命令行为

#### `/start`
1. 从 Telegram 用户资料检测语言
2. 发送欢迎消息和公司简介（最多2-3句）
3. 创建 CRM 记录：来源 = `telegram_organic`，状态 = `new`
4. 通过内联键盘展示产品分类
5. 自然地开始 BANT 资质评估

#### `/catalog`
1. 检查 CRM 中客户的产品兴趣（如为回访客户）
2. 已知兴趣：发送相关产品板块 + 完整目录链接
3. 未知兴趣：发送产品分类内联键盘
4. 始终包含：规格、起订量、常规交货期
5. 文件格式：优先 PDF，单个文件不超过 20MB

#### `/quote`
1. 检查记忆中是否已有 BANT 数据
2. 不完整：触发内联键盘资质评估流程
3. 已完整：生成报价草稿 → 发送给所有者审批
4. 向客户确认："我正在为您准备报价，稍后即可提供。"

#### `/status`
1. 读取 CRM 中客户的活跃记录
2. 返回：最新状态、待办事项、下次跟进日期
3. 如为 quote_sent："您的报价已于 [日期] 发送。是否需要讨论？"
4. 如无记录："暂无您的活跃订单。是否需要开始一个？"

## 内联键盘流程

### 快速 BANT 资质评估

**第一步 — 需求（产品）：**
```json
{
  "text": "您对哪些产品感兴趣？",
  "reply_markup": {
    "inline_keyboard": [
      [{"text": "{{product_1}}", "callback_data": "product_1"}],
      [{"text": "{{product_2}}", "callback_data": "product_2"}],
      [{"text": "{{product_3}}", "callback_data": "product_3"}],
      [{"text": "📋 完整目录", "callback_data": "full_catalog"}]
    ]
  }
}
```

**第二步 — 预算（数量）：**
```json
{
  "text": "您的预估订单量是多少？",
  "reply_markup": {
    "inline_keyboard": [
      [{"text": "< 100台", "callback_data": "qty_small"}],
      [{"text": "100-500", "callback_data": "qty_medium"}],
      [{"text": "500-1000", "callback_data": "qty_large"}],
      [{"text": "1000+", "callback_data": "qty_bulk"}]
    ]
  }
}
```

**第三步 — 时间线：**
```json
{
  "text": "您何时需要交货？",
  "reply_markup": {
    "inline_keyboard": [
      [{"text": "本月", "callback_data": "timeline_urgent"}],
      [{"text": "1-3个月", "callback_data": "timeline_soon"}],
      [{"text": "3-6个月", "callback_data": "timeline_planning"}],
      [{"text": "仅了解", "callback_data": "timeline_exploring"}]
    ]
  }
}
```

**第四步 — 权限：**
经过3次键盘交互后，在对话中自然地问：
"您是采购决策者，还是需要我为您的团队准备材料？"
（此步骤不要使用键盘 — 显得过于交易化。）

### 快捷操作键盘
资质评估完成后发送：
```json
{
  "text": "接下来需要什么帮助？",
  "reply_markup": {
    "inline_keyboard": [
      [{"text": "📋 获取报价", "callback_data": "action_quote"}],
      [{"text": "📦 产品规格", "callback_data": "action_specs"}],
      [{"text": "🏭 工厂信息", "callback_data": "action_factory"}],
      [{"text": "👤 联系销售代表", "callback_data": "action_human"}]
    ]
  }
}
```

## 大文件策略

Telegram 的 2GB 限制使其成为发送大文件的最佳渠道：

| 使用场景 | 文件 | 操作 |
|----------|------|------|
| 产品目录 | PDF，10-100MB | 直接通过 Telegram 发送 |
| 认证文件（ISO、CE 等） | PDF，1-20MB | 按需发送 |
| 产品视频 / 工厂参观 | MP4，50MB-2GB | 通过 Telegram 发送，WhatsApp 提供链接 |
| 测试报告 | PDF，1-10MB | 按需发送 |
| 形式发票 | PDF，< 5MB | 此处发送 + 邮件留存正式记录 |

**跨渠道文件路由：**
当客户在 WhatsApp 上需要大文件时：
> "完整目录有85MB — 我通过 Telegram 发给您。请问您的 Telegram 用户名是？"

## Telegram 优先市场

以下市场中，将 Telegram 作为**主要**渠道：

| 市场 | Telegram 优先原因 |
|------|-------------------|
| 俄罗斯 / 独联体 | 80%+ 商务沟通在 Telegram 上进行 |
| 伊朗 | Telegram 是主导平台 |
| 东欧 | B2B 场景 Telegram 使用率高 |
| 中亚 | Telegram 优于 WhatsApp |
| 科技/加密行业 | 全球偏好 Telegram |

**检测方式：** 检查 CRM 的 `country` 字段。如为俄罗斯/独联体/伊朗/东欧，默认采用 Telegram 优先策略。

## 通过 Telegram 培育

Telegram 无消息窗口限制 — 适合长期培育：

### 培育节奏（Telegram）
| 时间 | 内容 |
|------|------|
| 第0天 | 初次联系 + 产品概览 |
| 第3天 | 相关案例或行业洞察 |
| 第7天 | 基于其兴趣的具体产品推荐 |
| 第14天 | 新产品发布或限时优惠 |
| 第30天 | 市场更新或展会邀请 |
| 第60天+ | 季度回访，附带个性化行业资讯 |

### Telegram 频道（一对多）
针对关注品牌频道的客户：
- 每周：行业新闻、市场趋势
- 双周：新产品公告
- 每月：案例研究、客户成功故事
- 绝不：直接销售话术（留在私信中）

## 安全说明

- Bot Token 存储在 `secrets.sh` 中，绝不写入 config.sh 或工作区文件
- `dmPolicy: "pairing"` 需要配对码 — 用于专属/VIP 访问
- `dmPolicy: "open"`（并非所有 OpenClaw 版本支持） — 接受所有私信
- 管理员命令限白名单访问（与 WhatsApp 一致）
- 频率限制：与 WhatsApp 相同的反滥用措施（5分钟15条、1小时50条）
