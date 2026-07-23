# OpenClaw v2026.4.14：GPT-5.4-Pro 前向适配、Telegram 话题优化与 80 项质量修复

*2026 年 4 月 14 日发布 · 44+ 位贡献者 · 80+ 项修复 · 多项安全加固*

OpenClaw 今日发布 **v2026.4.14**，这是一次以**模型提供商兼容性**和**渠道稳定性**为核心的质量版本。核心亮点是对 **GPT-5.4-Pro** 的前向兼容支持——包含定价、限额与可见性配置——以及 Telegram 论坛话题的人类可读名称上下文注入。配合全面的安全增强（Slack 交互白名单、SSRF 策略、本地附件路径规范化）和 80+ 项跨平台问题修复，本次发布是 v2026.4.12 之后对 B2B 多渠道 SDR 部署影响最深远的版本。

> **一键安装 / 升级：**
> ```bash
> curl -fsSL https://raw.githubusercontent.com/iPythoning/b2b-sdr-agent-template/main/install.sh | bash
> ```
> 或执行：`npm install -g openclaw@latest`

---

## v2026.4.14 核心新功能

### GPT-5.4-Pro 前向兼容 — 为下一代模型做好准备

v2026.4.14 为 `gpt-5.4-pro` 添加了完整的前向兼容支持，涵盖：

- **定价与限额配置**：模型注册表中预置 gpt-5.4-pro 的 token 单价和速率限额，避免超出配额时出现静默失败
- **模型可见性**：提供商目录中的 gpt-5.4-pro 对用户正确展示，支持在配置向导中直接选用
- **Codex 提供商 apiKey 校验**：Codex 提供商目录现在包含 `apiKey` 字段，确保正确完成验证流程，防止因缺少凭据配置而导致的 404 错误

**对 B2B SDR 智能体的实际意义：**

已将 SDR 智能体部署在 OpenAI 体系上的团队可直接切换至 gpt-5.4-pro，无需修改任何模板文件或提供商配置。限额和定价在运行时自动生效。

---

### Telegram 论坛话题 — 智能体上下文感知升级

OpenClaw SDR 智能体在 Telegram 超级群（Supergroup）的话题（Forum Topic）频道中运作时，此前只能看到数字 topic_id，无法感知所处话题的业务含义。

v2026.4.14 修复了这一问题：

- **话题名称注入**：智能体上下文和消息元数据现在包含人类可读的话题名称（如"采购询盘"、"售后支持"、"VIP 客户"）
- **话题名称持久化**：已学习到的话题名称写入 session store，跨轮次保持一致
- **精准路由**：基于话题名称的条件路由逻辑（而非脆弱的 topic_id 硬编码）成为可能

**三个关键数字：**

- **0** 次 topic_id 硬编码——话题名称动态注入
- **1 次** 部署更新即可获得全部话题路由能力
- **N 个话题**，每个均对应独立的智能体上下文与意图分类

---

### 安全增强 — 建议立即升级

v2026.4.14 修复了多个安全问题，生产环境应立即升级：

| 漏洞类型 | 修复内容 | 影响范围 |
|---------|---------|---------|
| Slack 交互白名单 | `block_action` 事件应用 `allowFrom` 白名单校验 | Slack SDR 渠道 |
| 本地附件路径穿越 | 附件路径通过 `realpath` 规范化，防止路径遍历 | 所有本地文件工具 |
| 网关配置注入 | 拒绝通过工具调用修改安全标志的配置变更 | 自托管网关 |
| 浏览器 SSRF 策略 | 正常导航的 SSRF 策略恢复正确状态 | 浏览器工具智能体 |

升级后建议执行：`openclaw doctor --fix` 进行安全检查。

---

### 模型与提供商修复

**Ollama 超时配置：** 流式操作现在正确继承 Ollama 的超时配置，修复了长文档分析任务中途超时断连的问题。对于使用本地 Ollama 模型处理产品手册 PDF、采购合同 OCR 等场景的团队，此修复显著提升了生产稳定性。

**图片 / PDF 工具模型引用：** Image 和 PDF 工具现在为 Ollama 视觉模型规范化模型引用格式，解决了本地视觉模型在解析产品图片附件时因模型名称不匹配而失败的问题。

**Google Gemini API 路径修复：** 移除 Gemini API 端点末尾错误追加的 `/openai` 后缀，修复了 Gemini 提供商调用的 404 错误。

**记忆嵌入提供商前缀：** 记忆搜索嵌入现在保留非 OpenAI 提供商的前缀（如 `cohere/embed-v4.0`），确保跨提供商记忆向量不产生混用错误。

---

### 渠道与平台修复

#### WhatsApp
- 媒体加密逻辑重构，修复特定格式媒体消息的加密失败问题
- 出站消息队列持久化改善，防止网关重启时消息丢失

#### Discord
- 原生命令（`/` 斜杠命令）现在正确返回状态卡片，而非空响应
- 重连前清除过期心跳计时器，防止进程崩溃

#### Telegram
- 论坛话题名称持久化（详见上方核心功能）
- 规划输出不再泄漏到 Telegram DM

#### BlueBubbles（iMessage）
- 服务器信息缓存改为懒加载刷新，避免启动时的竞态条件

---

### 性能与稳定性

| 改进项目 | 说明 |
|---------|------|
| 插件目录缓存 | `preferOver` 查找在自动启用过程中缓存，减少 CPU 开销 |
| 上下文引擎会话压缩 | 会话压缩逻辑优化，长对话 token 使用更高效 |
| Cron 调度逻辑 | 修复边缘条件下的调度漂移问题 |
| 交付队列持久化 | 消息交付队列持久化改善，重启后消息不丢失 |
| 媒体限额强制执行 | 媒体大小限额在所有提供商渠道一致执行 |

---

## B2B SDR 渠道重要修复汇总

| 修复内容 | 渠道 | 实际影响 |
|---------|------|---------|
| 话题名称上下文注入 | Telegram | 基于话题名称的精准业务路由 |
| block_action 白名单 | Slack | 防止未授权 Slack 交互触发智能体操作 |
| 本地附件路径规范化 | 所有工具 | 防止文件路径遍历安全风险 |
| Ollama 流超时 | 本地模型 | 长文档处理任务不再中途断连 |
| 媒体加密修复 | WhatsApp | 产品图片、目录 PDF 正确加密发送 |
| Discord 原生命令 | Discord | `/` 命令正确响应，不再返回空白 |
| Gemini 路径修复 | Gemini | Gemini 提供商调用不再 404 失败 |
| 会话压缩优化 | 全部渠道 | 长周期 B2B 对话 token 成本降低 |

---

## PulseAgent 如何为您的销售团队交付这些能力

[PulseAgent](https://pulseagent.io/app/login?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.14) 已完成 OpenClaw v2026.4.14 部署，GPT-5.4-Pro 支持预配置、安全补丁已应用、全渠道修复已内置——无需服务器管理。

### PulseAgent vs. 自托管 OpenClaw v2026.4.14

| | PulseAgent | 自托管 OpenClaw |
|---|---|---|
| **部署时间** | < 30 分钟 | 2–8 小时 |
| **GPT-5.4-Pro 支持** | 预配置（定价 + 限额） | 手动更新提供商配置 |
| **安全补丁** | 自动应用 | 手动 `npm install` + 重启 |
| **Telegram 话题路由** | 开箱即用 | 手动配置话题名称映射 |
| **多渠道可靠性** | 托管连接 + 自动重试 | 自行维护各渠道网关 |
| **版本升级** | 自动 | 手动迁移 |
| **B2B SDR 技能包** | 已包含 | 仅模板 |
| **定价** | [查看方案](https://pulseagent.io/pricing?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.14) | 基础设施 + 人力成本 |

---

## 相关解决方案

- [WhatsApp B2B 外贸销售自动化](/solutions/whatsapp-sales-automation)
- [B2B 外贸 AI SDR 解决方案](/solutions/ai-sdr-for-b2b-export)
- [Telegram 线索获取](/solutions/telegram-lead-generation)
- [多渠道销售管道](/solutions/multi-channel-sales-pipeline)
- [制造业 AI 销售智能体](/solutions/ai-sales-agent-for-manufacturing)

---

## 常见问题

**GPT-5.4-Pro 支持是否需要修改现有智能体配置？**
无需改动。v2026.4.14 的前向兼容支持通过模型注册表实现，在提供商配置中选择 `gpt-5.4-pro` 即可，无需修改智能体模板文件。

**Telegram 论坛话题功能需要额外配置吗？**
无需配置。升级到 v2026.4.14 后，智能体上下文自动包含话题名称。如需基于话题名称做业务路由，在智能体指令中引用 `{{topic_name}}` 变量即可。

**本次安全修复会影响我的自托管安装吗？**
会。Slack `allowFrom` 白名单和本地附件路径修复是关键安全补丁，建议所有自托管用户立即升级并执行 `openclaw doctor --fix`。

**Ollama 超时修复是否需要修改配置文件？**
无需修改。该修复在运行时层面实现，现有 `models.providers.ollama.timeout` 配置值将被正确应用于流式操作。

**此次发布对 B2B 外贸 SDR 场景的最重要改进是什么？**
对于 Telegram 重度用户：话题名称上下文注入让智能体能够区分"采购询盘"和"售后支持"话题并给出针对性回复。对于本地模型用户：Ollama 超时修复和视觉模型引用修复意味着产品图片和 PDF 处理不再中途失败。

---

*想让您的外贸销售团队今天就用上 OpenClaw v2026.4.14？*

**[免费开始使用 PulseAgent →](https://pulseagent.io/app/login?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.14)**
