# OpenClaw v2026.4.12：主动记忆插件、LM Studio 本地 AI 与三项安全修复

*2026 年 4 月 13 日发布 · 35 位贡献者 · 18+ 项修复 · 3 项安全补丁*

OpenClaw 今日发布 **v2026.4.12**，这是 2026 年周期内最重要的记忆与模型提供商更新。核心亮点是**主动记忆（Active Memory）插件**：一个全新的可选插件，让每个 OpenClaw 智能体在生成正式回复前，自动运行一个专属记忆子智能体，无需用户手动输入"记住这个"即可自动调取相关偏好、历史承诺和对话背景。配合支持本地/自托管 AI 的 **LM Studio 提供商**、三项安全漏洞修复，以及长期呼声最高的 WhatsApp 消息静默丢失修复，本次发布是迄今为止对 B2B SDR 部署影响最大的版本之一。

> **一键安装 / 升级：**
> ```bash
> curl -fsSL https://raw.githubusercontent.com/iPythoning/b2b-sdr-agent-template/main/install.sh | bash
> ```
> 或执行：`npm install -g openclaw@latest`

---

## v2026.4.12 核心新功能

### 主动记忆插件 — 真正"不会忘事"的 SDR 智能体

主动记忆（Active Memory）是一个全新的可选插件，在主智能体生成回复**之前**自动运行一个专属记忆子智能体。无需等待用户手动触发记忆搜索，它会主动扫描相关背景——偏好设置、历史产品沟通、未完成承诺、客户异议——并在智能体组织回复前将这些上下文送达。

三个关键数字：

- **0** 次手动"记住这个"指令——主动记忆自动构建上下文
- **3 种可配置上下文模式**：`message`（仅当前消息）、`recent`（最近 N 轮）、`full`（整个会话）
- **1 条命令**实时调试：`/verbose` 实时展示每次回复前主动记忆召回了哪些内容

**对 B2B SDR 智能体的实际意义：**

三周前咨询过 500 件报价的买家，再次发来询盘时，智能体能自然地引用那段对话——不是因为你告诉它要记住，而是主动记忆自动调取了相关信息。对于历时 8–16 周、跨越数十条消息的外贸销售周期，这彻底消除了"智能体忘记了我是谁"这一导致客户流失的核心痛点。

该插件支持可配置的提示词和推理覆写以调整召回行为，并提供可选的对话记录持久化功能用于生产环境调试。

文档：[主动记忆插件](https://docs.openclaw.ai/concepts/active-memory)

---

### WhatsApp 媒体发送 & 对话轮次防丢失

v2026.4.12 针对 WhatsApp SDR 智能体的生产可靠性修复了两个关键问题：

**媒体发送兜底：** 当 `mediaUrl` 为空但 `mediaUrls` 数组中已有解析好的条目时，OpenClaw 现在会自动回退到 `mediaUrls` 第一条。此前，产品图片和目录附件在此情况下会被静默丢弃，买家收到的消息没有附件。此修复无需改动现有模板，开箱即用。

**消息防静默丢失：** 当智能体正在处理上一条消息时，用户发来的新消息此前会被静默丢弃。v2026.4.12 现在会将这些"孤立"消息携带进下一个处理轮次。对于买家在处理过程中连续发来追问的 WhatsApp 对话，这一修复消除了让智能体显得"没有回应"的静默丢失问题。

---

### LM Studio 提供商 — 隐私敏感 B2B 部署的本地 AI 方案

v2026.4.12 内置了完整的 **LM Studio 提供商**，支持引导式配置、运行时模型发现、流式预加载，以及适用于本地和自托管 OpenAI 兼容模型的记忆搜索嵌入。

**对 B2B 外贸团队的实际意义：**

许多制造商和外贸企业需要遵守区域数据监管要求——尤其是在中国大陆、欧盟和东南亚地区。运行本地 LM Studio 模型意味着：
- 对话数据不离开本地服务器
- 兼容任何 OpenAI 兼容的本地模型（Llama 3、Qwen 2.5、DeepSeek-V3 等）
- 记忆搜索嵌入在本地完成——无需调用云端 API 即可实现客户历史召回

该提供商使用 `models.providers.lm-studio.*` 配置键，支持与云端提供商相同的引导式配置向导。

---

### Codex 提供商 — OpenAI 原生线程管理

v2026.4.12 内置了 **Codex 提供商**，将 `codex/gpt-*` 模型调用路由至 Codex 托管认证、原生线程、模型发现和上下文压缩，而 `openai/gpt-*` 继续走标准 OpenAI 提供商路径。使用 GPT-5.4 via Codex 的 SDR 智能体可获得原生线程管理和更好的 token 压缩，无需修改现有 OpenAI API Key 配置。

---

### 三项安全修复 — 建议立即升级

v2026.4.12 修复了三个安全漏洞，自托管 OpenClaw 部署应立即升级：

| 漏洞类型 | 修复内容 |
|---------|---------|
| 解释器注入 | 从安全二进制名单中移除 `busybox`/`toybox` |
| 审批授权绕过 | 防止空审批人列表授予显式授权 |
| Shell 包装注入 | 扩大 shell 包装检测范围；阻断 `env`-argv 赋值注入 |

此外，`.env.example` 中的网关凭据已置空，若检测到仍在使用复制自示例文件的占位令牌，**OpenClaw 将拒绝启动**。升级后请执行 `openclaw doctor --fix` 生成新凭据。

---

### 网关与 WebSocket 可靠性

- **WebSocket 保活**：Tick 广播不再被标记为可丢弃，慢速或背压连接的客户端在长时间智能体运行期间不会因 `tick timeout` 自行断连
- **插件子智能体幂等性**：网关现在始终发送非空 `idempotencyKey`，防止 dreaming 任务因 schema 校验失败
- **启动时序**：调度服务延迟到 sidecar 完成后再启动，防止 Sandbox 唤醒时的竞态条件

---

### B2B 渠道重要修复汇总

| 修复内容 | 渠道 | 实际影响 |
|---------|------|---------|
| 审批按钮死锁 | Telegram | 插件审批点击可立即响应，不再被阻塞的智能体轮次卡住 |
| 规划内容泄漏 | Telegram | Codex 规划输出不再泄漏到 Telegram DM 中 |
| 僵尸网关回调 | Discord | 重连前清除过期心跳计时器，防止进程崩溃 |
| 房间提及门控 | Matrix | `requireMention` 对非 OpenClaw Matrix 客户端恢复正常工作 |
| 临时启动失败 | iMessage | 在拆除监控前重试 `watch.subscribe` 临时失败 |
| 多账号重连漂移 | WhatsApp | 集中化每账号连接所有权，重连和出站就绪状态绑定到活跃 socket |

---

## 现在的记忆架构

v2026.4.12 之后，OpenClaw 的记忆栈拥有三个可配置层次：

| 层次 | 机制 | 适用场景 |
|------|------|---------|
| **主动记忆**（新） | 回复前自动子智能体召回 | 高上下文 B2B 对话的常态开启 |
| **Memory Wiki / QMD** | 结构化知识 + 搜索 | 产品目录、买家画像、公司信息 |
| **Chroma/向量** | 长期语义检索 | 跨月全量对话历史 |

B2B SDR 反失忆模板（ANTI-AMNESIA.md）使用全部三层——主动记忆现在原生处理了此前需要 MemOS 手动集成才能实现的 L1 功能。

---

## PulseAgent 如何为您的销售团队交付这些能力

[PulseAgent](https://pulseagent.io/app/login?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.12) 已完成 OpenClaw v2026.4.12 部署，主动记忆预配置、安全补丁已应用、WhatsApp 媒体可靠性已内置——无需服务器管理。

### PulseAgent vs. 自托管 OpenClaw

| | PulseAgent | 自托管 OpenClaw |
|---|---|---|
| **部署时间** | < 30 分钟 | 2–8 小时 |
| **主动记忆** | 预配置（全部 3 种模式） | 手动安装插件 + 配置 |
| **安全补丁** | 自动应用 | 手动 `npm install` + 重启 |
| **WhatsApp 可靠性** | 托管连接 + 自动重试 | 自行维护网关 |
| **本地 LM Studio** | 自带端点接入 | 需完整服务器配置 |
| **版本升级** | 自动 | 手动迁移 |
| **B2B SDR 技能包** | 已包含 | 仅模板 |
| **定价** | [查看方案](https://pulseagent.io/pricing?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.12) | 基础设施 + 人力成本 |

---

## 相关解决方案

- [WhatsApp B2B 外贸销售自动化](/solutions/whatsapp-sales-automation)
- [B2B 外贸 AI SDR 解决方案](/solutions/ai-sdr-for-b2b-export)
- [Telegram 线索获取](/solutions/telegram-lead-generation)
- [多渠道销售管道](/solutions/multi-channel-sales-pipeline)
- [制造业 AI 销售智能体](/solutions/ai-sales-agent-for-manufacturing)

---

## 常见问题

**主动记忆与 Memory Wiki / QMD 是同一个东西吗？**
不是。主动记忆是在每次回复前实时运行的召回子智能体；Memory Wiki / QMD 是您填充了产品信息、买家画像和公司事实的结构化知识库。两者协同工作：主动记忆在召回扫描时可以调用 Memory Wiki 的内容。

**安全修复会影响我的自托管安装吗？**
会。如果您曾使用 `.env.example` 中的示例凭据启动，且未轮换过，v2026.4.12 将拒绝启动。执行 `openclaw doctor --fix` 生成新凭据后重启即可。

**LM Studio 提供商支持用量化本地模型做记忆搜索嵌入吗？**
支持。该提供商兼容任何 OpenAI 兼容的 `/v1/embeddings` 端点。量化模型（Q4_K_M、Q8_0）完全满足嵌入使用场景。

**WhatsApp 媒体发送兜底修复需要我修改现有模板吗？**
无需改动。该修复在网关层实现，现有 `mediaUrl` + `mediaUrls` 组合写法自动获得兜底保护。

---

*想让您的外贸销售团队今天就用上 OpenClaw v2026.4.12 的主动记忆和 LM Studio？*

**[免费开始使用 PulseAgent →](https://pulseagent.io/app/login?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.12)**
