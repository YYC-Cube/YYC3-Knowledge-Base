# OpenClaw v2026.4.11: Teams OAuth, Feishu & Memory Import

OpenClaw shipped **v2026.4.11** on April 12, 2026 — a release that opens two major enterprise channels for B2B AI sales agents: **Microsoft Teams delegated OAuth** (enabling enterprise SSO-based Teams deployments without IT-managed service accounts) and a significant **Feishu upgrade** for the hundreds of millions of professionals in China and Southeast Asia who rely on it daily. Also landing: ChatGPT conversation import into the Memory Palace, webchat rich output bubbles, and plugin auth/setup descriptors that make CRM integrations dramatically easier to configure.

> **Quick install / upgrade:**
> ```bash
> curl -fsSL https://raw.githubusercontent.com/iPythoning/b2b-sdr-agent-template/main/install.sh | bash
> ```
> Or: `npm install -g openclaw@latest`

---

## What's New in v2026.4.11

### Microsoft Teams — Delegated OAuth & Reaction Enhancements

v2026.4.11 completes the Teams integration story started in v2026.4.10. The new **delegated OAuth setup** means Teams channels can now authenticate via a user's Microsoft 365 identity (standard SSO flow) rather than requiring a service account. This is how most enterprise deployments work — IT teams create OAuth app registrations, not shared service accounts.

Combined with the **Graph pagination** fix, Teams channels now reliably paginate large reaction lists and message batches — critical when monitoring multi-person threads in enterprise sales accounts.

**What this means for B2B sales teams:**
- Deploy Teams SDR agents inside Microsoft 365 enterprise tenants without IT creating dedicated service accounts
- Use the full `react` / `listReactions` action set in environments that require delegated auth
- Standard OAuth consent flows make it easier to pass IT security review

---

### Feishu — Richer Sales Conversations in China & Southeast Asia

Feishu (飞书) is the enterprise collaboration platform used by ByteDance and hundreds of thousands of companies across Mainland China and Southeast Asia. For B2B export teams selling into Chinese manufacturers, tech companies, or Southeast Asian enterprises, Feishu is often the primary channel buyers use for internal coordination — and increasingly for external supplier communication.

v2026.4.11 upgrades the Feishu integration with:
- **Richer context parsing in document comment sessions** — the agent now sees thread history, document title, and commenter context before composing a reply
- **Comment reactions** — the agent can acknowledge Feishu comments with reactions (the interaction pattern Feishu users expect) without breaking the conversation flow
- **Typing feedback** — displays a typing indicator in Feishu while the agent composes a reply, closing the UX gap with more consumer-oriented apps

For SDR agents targeting Chinese B2B buyers who coordinate on Feishu, these upgrades make conversations feel native — not like talking to a bot on an unsupported channel.

---

### Memory Palace + ChatGPT Import — Carry Over Your Sales History

The dreaming/memory-wiki system now supports **ChatGPT conversation import**. New "Imported Insights" and "Memory Palace" subtabs in the diary UI let you directly inspect imported chats and wiki pages.

**The B2B SDR migration use case:** If your sales team has been using ChatGPT for prospect research, draft outreach emails, or qualification notes, you can now import those conversations into OpenClaw's persistent memory system. The agent will reference that historical context when handling future inbound messages from the same leads — closing the "memory starts from zero" gap that slows migration from ChatGPT to autonomous agents.

3 numbers that matter:
- **Weeks to months**: typical B2B export cycle length — that's a lot of historical context to preserve
- **0**: manual memory entries required after import — the agent indexes and retrieves automatically
- **1 export file**: that's all it takes from ChatGPT's Settings → Data Controls → Export

---

### Plugin Auth & Setup Descriptors — Faster CRM Integration

Plugin manifests in v2026.4.11 now declare **activation and setup descriptors** — structured metadata specifying what authentication and configuration steps a plugin needs before it can run.

For B2B deployment templates, this matters when wiring up CRM plugins (HubSpot, Airtable, Notion, Google Sheets connectors). Previously, plugin auth required manual config file editing and reading provider-specific docs. With setup descriptors, the runtime — and managed platforms like PulseAgent — can walk users through a step-by-step auth flow automatically.

Result: a CRM plugin that previously took 45 minutes of config troubleshooting now takes 3 clicks.

---

### Webchat Rich Output — Professional Embedded Sales Chatbots

The control UI now renders assistant **media, reply, and voice directives as structured chat bubbles**, with support for the new `[embed ...]` rich output tag (gated behind `allow_external_embeds: true` for security).

For teams using OpenClaw's built-in webchat as an embedded sales widget on a B2B product website:
- Product images and media display inline — not as raw links that break conversation flow
- Reply buttons and structured response options render as interactive bubbles with one-tap selection
- Voice message directives display as playable audio widgets

This matters for manufacturers and exporters who want their website chat to match the quality of WhatsApp and Telegram interactions.

---

## 18 Bug Fixes — Key Highlights for B2B Channels

| Fix | Impact |
|-----|--------|
| Codex OAuth scope rewriting | GPT-5 / GPT-5.4 auth now works correctly across all scope configurations |
| WhatsApp account configuration | Resolves a misconfiguration edge case on fresh installs |
| Telegram session topic initialization | Fixes topic threading in group-based SDR bots |
| macOS Talk Mode microphone permission | Fixes voice agent setup on macOS deployments |
| Google Veo unsupported fields | Removes unsupported fields that caused video generation failures |
| Feishu / Teams / MiniMax platform fixes | Platform-specific stability improvements across B2B-relevant channels |

---

## The Channel Completeness Picture

The last three OpenClaw releases together form a coherent enterprise-channel rollout:

| Release | Channel Milestone |
|---------|------------------|
| v2026.4.9 | REM memory backfill — long-term context across all channels |
| v2026.4.10 | Teams message actions (pin, react, read) + Active Memory |
| **v2026.4.11** | **Teams delegated OAuth + Feishu + ChatGPT Memory Import** |

The trajectory: OpenClaw is systematically closing the gap between "AI agent that works in demos" and "production-ready enterprise sales tool that runs inside real corporate environments."

---

## How PulseAgent Delivers This to Your Sales Team

[PulseAgent](https://pulseagent.io/app/login?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.11) deploys OpenClaw v2026.4.11 with Teams OAuth, Feishu, and Memory Palace pre-configured — no Azure app registration, no Feishu developer account setup, no manual import pipeline.

### PulseAgent vs. Self-Hosting OpenClaw

| | PulseAgent | Self-Hosting OpenClaw |
|---|---|---|
| **Setup time** | < 30 minutes | 2–8 hours |
| **Teams OAuth** | Pre-registered (delegated auth ready) | Manual Azure app registration |
| **Feishu integration** | Configured (China/SEA ready) | Manual Feishu app + channel setup |
| **Memory Palace** | Enabled + ChatGPT import supported | Manual plugin config + import flow |
| **Version upgrades** | Automatic | Manual `npm install` + config migration |
| **CRM integration** | Built-in (Sheets, Notion, Airtable) | Custom implementation |
| **B2B SDR skills** | Included (lead discovery, BANT, quoting) | Template-only |
| **Pricing** | [See plans](https://pulseagent.io/pricing?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.11) | Infrastructure + time cost |

---

## Related Solutions

- [WhatsApp Sales Automation for B2B Export](/solutions/whatsapp-sales-automation)
- [AI SDR for B2B Export Teams](/solutions/ai-sdr-for-b2b-export)
- [Telegram Lead Generation](/solutions/telegram-lead-generation)
- [Multi-Channel Sales Pipeline](/solutions/multi-channel-sales-pipeline)
- [AI Sales Agent for Manufacturing](/solutions/ai-sales-agent-for-manufacturing)

---

## Frequently Asked Questions

**Does Teams delegated OAuth replace service account auth?**
It's an alternative, not a replacement. You can use either delegated (user OAuth) or application (service account) auth. Delegated is required in Microsoft 365 tenants where IT policy prohibits unattended service accounts — which covers most large enterprises.

**Which Feishu features are available for SDR agents?**
Document comment sessions (with thread context), comment reactions, and typing feedback. For B2B SDR use cases, comment thread handling covers the majority of Feishu supplier-buyer interactions.

**How do I import ChatGPT conversations into Memory Palace?**
Export your ChatGPT conversations via Settings → Data Controls → Export. Then use the memory-wiki import flow in the OpenClaw diary UI — the "Imported Insights" subtab shows imported chats and "Memory Palace" shows wiki pages. PulseAgent surfaces this in the agent dashboard.

**Are plugin setup descriptors backward compatible?**
Yes. Plugins without descriptors continue to work. Setup descriptors are additive metadata — existing plugin configs are unaffected.

**Does webchat rich output require config changes?**
`[embed ...]` requires `allow_external_embeds: true` in your webchat config. Media bubbles and reply buttons work out of the box.

**Are the 18 fixes applied automatically on upgrade?**
Yes. Run `npm install -g openclaw@latest` and restart. No config changes required for the bug fixes.

---

## Get Started

Deploy a fully-configured AI SDR agent with Teams OAuth, Feishu support, Memory Palace, and automatic version updates:

**[Start free on PulseAgent →](https://pulseagent.io/app/login?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.11)**

Or self-host with the open-source template:
```bash
curl -fsSL https://raw.githubusercontent.com/iPythoning/b2b-sdr-agent-template/main/install.sh | bash
```

[View pricing](https://pulseagent.io/pricing?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.11) · [WhatsApp Sales Automation](/solutions/whatsapp-sales-automation) · [AI SDR for B2B Export](/solutions/ai-sdr-for-b2b-export)
