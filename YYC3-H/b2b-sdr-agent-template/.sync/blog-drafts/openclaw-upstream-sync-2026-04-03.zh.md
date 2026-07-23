# OpenClaw 上游同步 — 2026 年 4 月 3 日

今天上游合并了两个对 B2B 外贸 SDR 部署有直接影响的修复：一个修复了 Telegram 多账号动作配置的识别问题，另一个为 Mistral AI 模型提供商提供了完整的兼容性支持。两项变更均已适配并更新至本模板。

## 上游变更内容

- **Telegram：每个账号的动作配置现在能正确生效**（`fb8048a1`）
  在之前的版本中，当配置了多个 Telegram 机器人账号（例如为不同市场分别配置一个 bot）时，在"发现可用动作"阶段，只会读取顶层的频道配置，而会忽略账号级别的覆盖设置。这导致即使在账号级别启用了 `reactions: true`，如果顶层默认值为 `false`，该账号仍然无法使用回复反应功能。此次修复引入了账号范围的动作发现逻辑，确保每个 bot 只展示自己被授权的功能。

- **Mistral AI 提供商：OpenAI 兼容传输层修复**（`6ac5806a`）
  OpenClaw 通过 OpenAI 兼容的传输层支持多种 LLM 后端。Mistral 提供了类似的 API，但与 OpenAI 存在细微差异：不支持 `max_completion_tokens`（使用 `max_tokens`），也不支持 `store` 和 `reasoning_effort` 参数。此次修复会自动检测 Mistral（通过 `provider: mistral` 或 `baseUrl` 指向 `api.mistral.ai`），并自动应用正确的默认值，无需手动配置。

## 我们更新了什么

- **`workspace/TOOLS.md`**：新增"多账号 Telegram 配置"章节，附带 YAML 配置示例，展示如何为不同市场的机器人分别配置独立的动作权限（回应、投票、内联按钮）。

- **`workspace/TOOLS.md`**：新增"AI 模型提供商"参考表，涵盖 Claude（默认）、OpenAI、Mistral、Groq 及自定义部署选项，并包含 Mistral 相关的传输修复说明。

- **`CHANGELOG.md`**：新建该文件，后续将用于记录所有上游适配变更。

## 对 B2B 外贸业务的影响

**多市场 Telegram 运营者** — 如果你针对不同地区运营独立的 Telegram 机器人（例如针对俄罗斯/独联体市场启用投票功能，针对东南亚市场仅使用内联按钮），每个机器人现在能够正确地仅向用户展示其自身配置的功能，避免展示错误的交互选项。

**考虑使用 Mistral 作为 LLM 的团队** — Mistral 在多语言方面表现出色，尤其擅长阿拉伯语、法语、西班牙语和俄语——这些正是 B2B 外贸中常见的语言。随着此次修复，将 `mistral-large-latest` 或 `mistral-small-latest` 作为 AI 大脑已成为完全受支持的选项，无需任何额外的变通处理。

---

*同步时间：2026-04-03 | 来源：[openclaw/openclaw](https://github.com/openclaw/openclaw) | 模板：[iPythoning/b2b-sdr-agent-template](https://github.com/iPythoning/b2b-sdr-agent-template)*
