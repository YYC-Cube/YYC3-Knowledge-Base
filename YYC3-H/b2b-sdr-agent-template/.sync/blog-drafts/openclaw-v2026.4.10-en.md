# OpenClaw v2026.4.10: Active Memory, Codex & Teams Actions

OpenClaw shipped **v2026.4.10** on April 11, 2026 — a significant feature release that every B2B sales team running AI agents should know about. This version introduces the **Active Memory plugin** (automatic context retrieval before every reply), a **bundled Codex provider** for GPT-5 family models, **Microsoft Teams message actions**, and closes 126 security and stability issues across the platform.

> **Quick install / upgrade:**
> ```bash
> curl -fsSL https://raw.githubusercontent.com/iPythoning/b2b-sdr-agent-template/main/install.sh | bash
> ```
> Or: `npm install -g openclaw@latest`

---

## What's New in v2026.4.10

### Active Memory Plugin — The Biggest SDR Upgrade Yet

The headlining feature is **Active Memory** ([docs](https://docs.openclaw.ai/concepts/active-memory)): an optional plugin that inserts a dedicated memory sub-agent step _before_ each main reply. Instead of waiting for users to manually say "remember this" or "search memory first," the agent proactively fetches relevant context — lead history, preferred shipping port, negotiated price tier, last touchpoint date — and injects it into the reply window automatically.

For B2B SDR agents handling dozens of concurrent leads across weeks-long sales cycles, this is transformative. Here's what it looks like in practice:

- **Before v2026.4.10:** A buyer messages "What's my order status?" The agent needs a manual `/remember` call or an explicit memory search instruction in the prompt to connect that message to the lead's CRM record and previous conversation.
- **After v2026.4.10:** The Active Memory sub-agent silently queries memory before the reply, surfaces the matching lead record, last quote sent, and preferred payment terms, then the main agent answers with full context — zero extra prompting.

**Three configurable context modes:**

| Mode | Behavior | Best For |
|------|----------|----------|
| `message` | Current message triggers search | Simple FAQs, low latency priority |
| `recent` | Last N messages used as query | Recommended — captures thread context |
| `full` | Full conversation history | Maximum recall, higher token cost |

**Enable it in `openclaw.json`:**
```yaml
plugins:
  active-memory:
    enabled: true
    mode: "recent"
    verbose: false
```

Use `/verbose` in chat to inspect what memory was retrieved on each turn during testing.

---

### Bundled Codex Provider — GPT-5 Family with Managed Auth

v2026.4.10 ships a new **bundled `codex` provider** that handles all `codex/gpt-*` model routes with Codex-managed authentication, native thread management, model discovery, and automatic conversation compaction. The existing `openai/gpt-*` path is unchanged.

If you're running GPT-5 or GPT-5.4 through the `openai` provider today, migrate your model ID to get managed auth and smarter compaction:

```yaml
model:
  id: "codex/gpt-5"        # was: "gpt-5" via openai provider
  provider: "codex"
```

The Codex provider also powers the `docs i18n` translation pipeline (chunked translation with truncation detection), which is why multilingual sales agents will see more reliable doc translation in this release.

---

### Microsoft Teams — Five New Message Actions

Five new actions are now available for Microsoft Teams channels:

| Action | What It Does |
|--------|-------------|
| `pin` | Pin a message in the Teams thread |
| `unpin` | Unpin a previously pinned message |
| `read` | Mark messages as read |
| `react` | Add an emoji reaction to a message |
| `listReactions` | Retrieve all reactions on a message |

For B2B sales teams using Teams as their primary enterprise channel, **pinning** is immediately useful: pin the confirmed quote, SLA commitment, or agreed payment terms directly in the thread so both parties always have the reference visible. Use **react** to acknowledge follow-ups without breaking the conversation flow.

---

### `openclaw exec-policy` — Manage Security Policy from the CLI

New `exec-policy` command lets you view and modify execution approval policy without editing JSON config files manually:

```bash
openclaw exec-policy show                 # view current policy
openclaw exec-policy preset secure        # apply hardened preset
openclaw exec-policy set security=ask     # granular override
```

Includes rollback safety and sync conflict detection. Useful when onboarding new deployments or auditing policy across multiple client instances.

---

### Gateway `commands.list` RPC — Dynamic Capability Discovery

Remote gateway clients can now call `commands.list` to enumerate all available commands — runtime-native, text, skill, and plugin — with surface-aware names and serialized argument metadata. This unlocks:

- External dashboards that show what the agent can do in real time
- n8n/Zapier automation flows that dynamically select commands based on what's available
- Multi-agent orchestration where one agent queries another's capability set

---

### 126 Security & Stability Fixes

The fixes section spans security boundary enforcement across multiple channels, browser/sandbox hardening, WhatsApp media handling, Microsoft Teams restoration, gateway stability, conversation binding normalization, iMessage self-chat distinction, Telegram security validation, agent timeout extensions, cron scheduling corrections, and more.

Notable areas:
- **WhatsApp media**: media handling hardened across upload and delivery paths
- **Gateway stability**: connection binding and session normalization improved
- **Telegram validation**: additional security checks on inbound message handling
- **Cron scheduling**: scheduling edge cases corrected for long-running SDR agents
- **Agent timeouts**: timeout extension for complex multi-step agentic runs

---

## Why This Release Matters for B2B Export Sales Teams

B2B export sales involves long cycles (weeks to months), multiple contacts per account, and high-stakes communication across WhatsApp, Telegram, and increasingly Microsoft Teams. The core problem AI sales agents faced before v2026.4.10 was **context amnesia**: the agent knew how to respond but had to be reminded of the lead's history on every session.

**Active Memory eliminates that problem.** Combined with the Memory/REM backfill introduced in v2026.4.9, you now have:
1. Long-term memory accumulated across all past interactions (REM backfill)
2. Automatic retrieval of the most relevant context before every reply (Active Memory)
3. No manual prompting required from either the sales team or the buyer

This is why PulseAgent built its multi-channel SDR platform on OpenClaw — every release moves the needle on what "autonomous" actually means in a B2B context.

---

## How PulseAgent Delivers This to Your Sales Team

[PulseAgent](https://pulseagent.io/app/login?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.10) deploys OpenClaw v2026.4.10 as a managed, production-ready AI SDR agent across WhatsApp, Telegram, Microsoft Teams, Slack, and email — fully preconfigured with Active Memory enabled, the B2B SDR skill stack installed, and CRM integration wired.

You get the OpenClaw engine without the DevOps overhead.

### PulseAgent vs. Self-Hosting OpenClaw

| | PulseAgent | Self-Hosting OpenClaw |
|---|---|---|
| **Setup time** | < 30 minutes | 2–8 hours |
| **Version upgrades** | Automatic | Manual `npm install` + config migration |
| **Active Memory** | Pre-configured | Manual plugin config |
| **CRM integration** | Built-in (Sheets, Notion, Airtable) | Custom implementation |
| **WhatsApp + Telegram + Teams** | Multi-channel out of box | Manual channel config |
| **Security patches** | Applied automatically | Manual upgrade cycle |
| **B2B SDR skills** | Included (lead discovery, BANT, quoting) | Template-only |
| **Pricing** | [See plans](https://pulseagent.io/pricing?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.10) | Infrastructure + time cost |

---

## Related Solutions

- [WhatsApp Sales Automation for B2B Export](/solutions/whatsapp-sales-automation)
- [AI SDR for B2B Export Teams](/solutions/ai-sdr-for-b2b-export)
- [Telegram Lead Generation](/solutions/telegram-lead-generation)
- [Multi-Channel Sales Pipeline](/solutions/multi-channel-sales-pipeline)
- [AI Sales Agent for Manufacturing](/solutions/ai-sales-agent-for-manufacturing)

---

## Frequently Asked Questions

**Does Active Memory work with all model providers?**
Yes. Active Memory is a plugin layer above the model — it works with Claude, GPT-5/Codex, Gemma 4, Mistral, Qwen, and any other provider OpenClaw supports. The sub-agent uses your configured default model.

**Is Active Memory enabled by default?**
No — it's opt-in. Add `plugins.active-memory.enabled: true` to your `openclaw.json`. PulseAgent enables it by default for all managed deployments.

**Should I migrate from `openai/gpt-5` to `codex/gpt-5`?**
Yes, if you're using GPT-5 in production. The Codex provider handles auth and compaction more efficiently. The `openai/gpt-*` path remains supported but won't receive Codex-specific optimizations.

**Are the 126 fixes applied automatically on upgrade?**
Yes. Run `npm install -g openclaw@latest` and restart your gateway. No config changes required for the security fixes.

**What channels support the new Teams message actions?**
Microsoft Teams only. WhatsApp, Telegram, Slack, and other channels are not affected by this change.

**How do I use `openclaw exec-policy` for hardened deployments?**
Run `openclaw exec-policy preset secure` after install. This applies the recommended production policy and writes it to the local approvals file. Use `openclaw exec-policy show` to verify.

---

## Get Started

Deploy a fully-configured AI SDR agent with Active Memory, multi-channel support, and automatic version updates:

**[Start free on PulseAgent →](https://pulseagent.io/app/login?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.10)**

Or self-host with the open-source template:
```bash
curl -fsSL https://raw.githubusercontent.com/iPythoning/b2b-sdr-agent-template/main/install.sh | bash
```

[View pricing](https://pulseagent.io/pricing?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.10) · [WhatsApp Sales Automation](/solutions/whatsapp-sales-automation) · [AI SDR for B2B Export](/solutions/ai-sdr-for-b2b-export)
