# OpenClaw v2026.4.10：主动记忆、Codex 模型与 Teams 消息动作全面升级

OpenClaw 于 2026 年 4 月 11 日正式发布 **v2026.4.10**，这是一次对 B2B 销售团队 AI 智能体影响深远的功能版本。本次更新带来了**主动记忆插件**（每次回复前自动检索上下文）、**内置 Codex 供应商**（支持 GPT-5 系列模型）、**Microsoft Teams 消息动作**，以及全平台 126 项安全与稳定性修复。

> **一键安装 / 升级：**
> ```bash
> curl -fsSL https://raw.githubusercontent.com/iPythoning/b2b-sdr-agent-template/main/install.sh | bash
> ```
> 或执行：`npm install -g openclaw@latest`

---

## v2026.4.10 重点新功能

### 主动记忆插件 — 对外贸 SDR 意义最重大的升级

本次版本的核心亮点是**主动记忆（Active Memory）**插件（[文档](https://docs.openclaw.ai/concepts/active-memory)）：这是一个可选插件，在每次主回复之前自动执行一个专用记忆子智能体。该子智能体无需用户手动说"记住这个"或"先搜索记忆"，便会主动检索相关上下文——客户偏好、历史询盘、谈判价格区间、上次跟进时间——并自动注入到回复窗口中。

**对于管理数十个并行商机、历时数周的 B2B 外贸 SDR 智能体而言，这一特性具有变革性意义。**

**实际效果对比：**
- **v2026.4.10 之前：** 买家发来"我的订单状态如何？"，智能体需要手动调用 `/remember` 或在提示词中明确写入记忆搜索指令，才能将该消息与客户的 CRM 记录和历史对话关联。
- **v2026.4.10 之后：** 主动记忆子智能体在回复前静默查询记忆库，自动提取匹配的客户档案、最近发送的报价和偏好付款方式，主智能体则凭借完整上下文直接作答——无需额外提示。

**三种可配置的上下文模式：**

| 模式 | 行为 | 适用场景 |
|------|------|----------|
| `message` | 仅当前消息触发记忆搜索 | 简单 FAQ、优先低延迟 |
| `recent` | 最近 N 条消息作为查询 | **推荐** — 捕获对话线程上下文 |
| `full` | 完整对话历史作为查询 | 最高召回率，Token 消耗较高 |

**在 `openclaw.json` 中启用：**
```yaml
plugins:
  active-memory:
    enabled: true
    mode: "recent"
    verbose: false
```

调试时可在对话中输入 `/verbose`，查看每轮回复前检索到的记忆内容。

---

### 内置 Codex 供应商 — GPT-5 系列的托管认证

v2026.4.10 新增**内置 `codex` 供应商**，所有 `codex/gpt-*` 模型路由均通过该供应商处理，支持 Codex 托管认证、原生线程管理、模型发现和自动对话压缩。原有 `openai/gpt-*` 路径不受影响。

如果您目前通过 `openai` 供应商使用 GPT-5 或 GPT-5.4，建议迁移模型 ID 以获得托管认证和更高效的压缩：

```yaml
model:
  id: "codex/gpt-5"        # 原为通过 openai 供应商的 "gpt-5"
  provider: "codex"
```

---

### Microsoft Teams — 五项新消息动作

Teams 频道新增五项消息动作：

| 动作 | 功能说明 |
|------|----------|
| `pin` | 在 Teams 对话中置顶消息 |
| `unpin` | 取消置顶 |
| `read` | 标记消息已读 |
| `react` | 添加 Emoji 表情回应 |
| `listReactions` | 获取消息的所有回应列表 |

对于以 Teams 为主要企业沟通渠道的 B2B 销售团队，**置顶功能**立即可用：将确认的报价、SLA 承诺或付款条款直接置顶在 Teams 对话中，买卖双方随时可见。**表情回应**则可在不打断对话节奏的情况下确认消息收悉。

---

### `openclaw exec-policy` CLI — 命令行管理安全策略

全新 `exec-policy` 命令无需手动编辑 JSON 配置文件即可查看和修改执行审批策略：

```bash
openclaw exec-policy show                 # 查看当前策略
openclaw exec-policy preset secure        # 应用安全加固预设
openclaw exec-policy set security=ask     # 精细化覆盖单个配置项
```

内置回滚安全机制和同步冲突检测，适合在多客户部署场景下审计和统一安全策略。

---

### Gateway `commands.list` RPC — 动态能力发现

远程 Gateway 客户端现可通过 `commands.list` 枚举所有可用命令——运行时原生命令、文本命令、技能和插件——并附带表面感知名称和序列化参数元数据。适用于：

- 实时展示智能体能力的外部管理面板
- n8n/Zapier 自动化流程动态选择可用命令
- 多智能体编排场景下的能力协商

---

### 126 项安全与稳定性修复

修复范围涵盖多渠道安全边界加固、浏览器/沙箱安全、WhatsApp 媒体处理、Microsoft Teams 还原、Gateway 稳定性、会话绑定规范化、iMessage 自聊天区分、Telegram 安全验证、智能体超时扩展、Cron 调度修正等多个方向。

---

## 这次发布对外贸 B2B 销售团队意味着什么

外贸 B2B 销售周期长（数周到数月）、每个账户涉及多个联系人，通讯跨越 WhatsApp、Telegram 和 Microsoft Teams。AI 销售智能体面临的核心问题是**上下文遗忘**：智能体知道如何回应，却每次都需要被重新告知客户历史。

**主动记忆从根本上解决了这个问题。** 结合 v2026.4.9 引入的记忆/REM 回填功能，现在您拥有：
1. 跨历史交互积累的长期记忆（REM 回填）
2. 每次回复前自动检索最相关的上下文（主动记忆）
3. 销售团队和买家均无需手动触发任何指令

这正是 PulseAgent 选择以 OpenClaw 为核心构建多渠道 SDR 平台的原因——每次发布都在推进"自主"在 B2B 外贸场景中的真实边界。

---

## PulseAgent 如何为您的销售团队落地

[PulseAgent](https://pulseagent.io/app/login?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.10) 将 OpenClaw v2026.4.10 以托管、生产就绪的 AI SDR 智能体形式部署于 WhatsApp、Telegram、Microsoft Teams、Slack 和邮件渠道——预配置主动记忆、B2B SDR 技能栈和 CRM 集成，开箱即用。

您获得的是 OpenClaw 引擎，而无需承担 DevOps 运维成本。

### PulseAgent vs. 自托管 OpenClaw

| | PulseAgent | 自托管 OpenClaw |
|---|---|---|
| **上手时间** | < 30 分钟 | 2–8 小时 |
| **版本升级** | 自动更新 | 手动 `npm install` + 配置迁移 |
| **主动记忆** | 预配置启用 | 手动配置插件 |
| **CRM 集成** | 内置（Sheets、Notion、Airtable）| 自行实现 |
| **WhatsApp + Telegram + Teams** | 多渠道开箱即用 | 手动配置各渠道 |
| **安全补丁** | 自动应用 | 手动升级周期 |
| **B2B SDR 技能** | 内置（线索发现、BANT、报价）| 仅模板 |
| **定价** | [查看套餐](https://pulseagent.io/pricing?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.10) | 基础设施 + 人力成本 |

---

## 相关解决方案

- [WhatsApp B2B 销售自动化](/solutions/whatsapp-sales-automation)
- [外贸 B2B AI SDR](/solutions/ai-sdr-for-b2b-export)
- [Telegram 线索获取](/solutions/telegram-lead-generation)
- [多渠道销售管线](/solutions/multi-channel-sales-pipeline)
- [制造业 AI 销售智能体](/solutions/ai-sales-agent-for-manufacturing)

---

## 常见问题

**主动记忆支持哪些模型供应商？**
所有供应商均支持。主动记忆是模型层之上的插件层，兼容 Claude、GPT-5/Codex、Gemma 4、Mistral、通义千问等任意 OpenClaw 支持的供应商。子智能体使用您配置的默认模型。

**主动记忆是默认开启的吗？**
否，需要手动启用：在 `openclaw.json` 中添加 `plugins.active-memory.enabled: true`。PulseAgent 托管部署默认为所有实例启用。

**应该从 `openai/gpt-5` 迁移到 `codex/gpt-5` 吗？**
是的，如果您在生产环境使用 GPT-5。Codex 供应商在认证和压缩方面更高效。`openai/gpt-*` 路径继续支持，但不会获得 Codex 专有优化。

**126 项修复会在升级后自动生效吗？**
是的。执行 `npm install -g openclaw@latest` 并重启 Gateway 即可，安全修复无需任何配置变更。

**`openclaw exec-policy` 如何用于加固部署？**
安装完成后执行 `openclaw exec-policy preset secure`，应用推荐的生产安全策略并写入本地审批文件。使用 `openclaw exec-policy show` 验证结果。

---

## 立即开始

部署预配置主动记忆、多渠道支持和自动版本更新的 AI SDR 智能体：

**[免费试用 PulseAgent →](https://pulseagent.io/app/login?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.10)**

或使用开源模板自托管：
```bash
curl -fsSL https://raw.githubusercontent.com/iPythoning/b2b-sdr-agent-template/main/install.sh | bash
```

[查看定价](https://pulseagent.io/pricing?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.10) · [WhatsApp 销售自动化](/solutions/whatsapp-sales-automation) · [外贸 AI SDR](/solutions/ai-sdr-for-b2b-export)
