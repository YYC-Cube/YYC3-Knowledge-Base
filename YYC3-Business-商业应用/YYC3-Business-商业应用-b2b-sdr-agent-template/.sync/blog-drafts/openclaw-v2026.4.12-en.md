# OpenClaw v2026.4.12: Active Memory, LM Studio & Critical Security Fixes

*Released April 13, 2026 · 35 contributors · 18+ fixes · 3 security patches*

OpenClaw shipped **v2026.4.12** today — its largest memory and provider update of the 2026 cycle. The headline is **Active Memory**: a new optional plugin that gives every OpenClaw agent a dedicated memory sub-agent that fires automatically before each reply, pulling in relevant preferences, past commitments, and conversation context without users ever having to type "remember this." Combined with a new **LM Studio provider** for local/self-hosted AI, three security fixes, and a long-requested fix for silently dropped WhatsApp messages, this is one of the most impactful releases for B2B SDR deployments to date.

> **Quick install / upgrade:**
> ```bash
> curl -fsSL https://raw.githubusercontent.com/iPythoning/b2b-sdr-agent-template/main/install.sh | bash
> ```
> Or: `npm install -g openclaw@latest`

---

## What's New in v2026.4.12

### Active Memory — The SDR Agent That Remembers Everything

Active Memory is a new optional plugin that runs a dedicated memory sub-agent *right before* the main agent reply. Instead of waiting for users to manually invoke memory search, it automatically scans for relevant context — preferences, past product discussions, outstanding commitments, objections — and surfaces that context before the agent composes its response.

3 numbers that matter:

- **0** manual "remember this" commands needed — Active Memory builds context automatically
- **3 configurable context modes**: `message` (current message only), `recent` (last N turns), `full` (entire session)
- **1 command** for live debugging: `/verbose` shows exactly what Active Memory surfaced for each reply

**What this means for B2B SDR agents:**

A buyer who asked about 500-unit pricing three weeks ago gets a reply that references that conversation naturally — not because you told the agent to remember it, but because Active Memory automatically surfaced it. For export sales cycles that run 8–16 weeks across dozens of messages, this eliminates the "the agent forgot who I am" problem that causes leads to disengage.

The plugin ships with configurable prompt and thinking overrides for tuning recall behavior, and opt-in transcript persistence for production debugging. Docs: [Active Memory plugin](https://docs.openclaw.ai/concepts/active-memory)

---

### WhatsApp Media & Drop-Proof Agent Turns

Two fixes in v2026.4.12 directly address production reliability for SDR agents running on WhatsApp:

**Media send fallback:** When `mediaUrl` is empty but the `mediaUrls` array has a resolved entry, OpenClaw now falls back to the first `mediaUrls` item. Previously, product photos and catalogs sent via multi-media responses were silently delivered without their attachments. This fix is automatic — no template changes required.

**Drop-proof follow-up messages:** When a user sends a message while the agent is mid-run processing a previous one, that "orphaned" message was previously silently dropped. v2026.4.12 now carries orphaned user text into the next prompt before repairing transcript ordering. For active WhatsApp conversations where buyers send follow-up questions mid-processing, this eliminates the silent drops that made the agent appear unresponsive.

---

### LM Studio Provider — Private Local AI for Sensitive B2B Deployments

v2026.4.12 ships a bundled **LM Studio provider** with onboarding, runtime model discovery, stream preload support, and memory-search embeddings for local and self-hosted OpenAI-compatible models.

**Why this matters for B2B export teams:**

Many manufacturers and exporters deal with buyer data subject to regional data regulations — especially in China, the EU, and Southeast Asia. Running a local LM Studio model means:
- No conversation data leaves the on-premise server
- Compatible with any OpenAI-compatible local model (Llama 3, Qwen 2.5, DeepSeek-V3, etc.)
- Memory-search embeddings work locally — customer history recall without cloud API calls

The provider uses `models.providers.lm-studio.*` config keys and supports the same onboarding wizard as cloud providers.

---

### Codex Provider — Native OpenAI Thread Management

v2026.4.12 ships a bundled **Codex provider** that routes `codex/gpt-*` model calls through Codex-managed auth, native threads, model discovery, and compaction — while `openai/gpt-*` stays on the standard OpenAI provider path. SDR agents using GPT-5.4 via Codex get native thread management and better token compaction, without touching the existing OpenAI API key setup.

---

### 3 Security Fixes — Update Required

v2026.4.12 addresses three security vulnerabilities. Self-hosted deployments should upgrade immediately:

| CVE Area | Fix |
|----------|-----|
| Interpreter injection | Removed `busybox`/`toybox` from interpreter-like safe bins |
| Approval auth bypass | Prevented empty approver list from granting explicit authorization |
| Shell wrapper injection | Broadened shell-wrapper detection; blocked `env`-argv assignment injection |

Additionally, `.env.example` now ships with the gateway credential blanked, and OpenClaw will **fail startup** if a placeholder token copied from `.env.example` is still in place. Run `openclaw doctor --fix` to generate fresh credentials if upgrading from an example config.

---

### Gateway & WebSocket Reliability

- **WebSocket keepalive**: Tick broadcasts are no longer marked as droppable — clients on slow or backpressured connections won't self-disconnect with `tick timeout` during long-running agent turns
- **Plugin subagent idempotency**: Gateway now always sends a non-empty `idempotencyKey` for plugin subagent runs, preventing dreaming narrative jobs from failing schema validation
- **Startup sequencing**: Scheduled services defer until sidecars finish, preventing race conditions on Sandbox wake

---

### Notable Fixes for B2B Channels

| Fix | Channel | Impact |
|-----|---------|--------|
| Approval button deadlock | Telegram | Plugin approval clicks now resolve immediately instead of deadlocking behind a blocked agent turn |
| Planning chatter leak | Telegram | Codex planning output no longer leaks into Telegram DMs when run has no `final_answer` |
| Zombie gateway callback | Discord | Stale heartbeat timers cleared before reconnect — prevents process crash |
| Room mention gating | Matrix | `requireMention` works again for non-OpenClaw Matrix clients |
| Startup failure retry | iMessage | Retry transient `watch.subscribe` failures before tearing down the monitor |
| Multi-account reconnect drift | WhatsApp | Centralized per-account connection ownership stays attached to live socket |

---

## The Memory Architecture Now

With v2026.4.12, OpenClaw's memory stack has three configurable layers:

| Layer | Mechanism | When to Use |
|-------|-----------|-------------|
| **Active Memory** (new) | Automatic pre-reply sub-agent recall | Always-on for high-context B2B conversations |
| **Memory Wiki / QMD** | Structured knowledge + search | Product catalog, buyer profiles, company facts |
| **Chroma/Vector** | Long-term semantic retrieval | Full conversation history across months |

The B2B SDR Anti-Amnesia template (`ANTI-AMNESIA.md`) uses all three layers — Active Memory now handles what previously required manual MemOS integration at L1.

---

## How PulseAgent Delivers This to Your Sales Team

[PulseAgent](https://pulseagent.io/app/login?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.12) deploys OpenClaw v2026.4.12 with Active Memory pre-configured, security fixes applied, and WhatsApp media reliability built in — zero server management required.

### PulseAgent vs. Self-Hosting OpenClaw

| | PulseAgent | Self-Hosting OpenClaw |
|---|---|---|
| **Setup time** | < 30 minutes | 2–8 hours |
| **Active Memory** | Pre-configured (all 3 modes) | Manual plugin install + config |
| **Security patches** | Auto-applied | Manual `npm install` + restart |
| **WhatsApp reliability** | Managed connection + auto-retry | DIY gateway management |
| **Local LM Studio** | Bring-your-own endpoint | Full server setup required |
| **Version upgrades** | Automatic | Manual migration |
| **B2B SDR skills** | Included | Template-only |
| **Pricing** | [See plans](https://pulseagent.io/pricing?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.12) | Infrastructure + time cost |

---

## Related Solutions

- [WhatsApp Sales Automation for B2B Export](/solutions/whatsapp-sales-automation)
- [AI SDR for B2B Export Teams](/solutions/ai-sdr-for-b2b-export)
- [Telegram Lead Generation](/solutions/telegram-lead-generation)
- [Multi-Channel Sales Pipeline](/solutions/multi-channel-sales-pipeline)
- [AI Sales Agent for Manufacturing](/solutions/ai-sales-agent-for-manufacturing)

---

## Frequently Asked Questions

**Is Active Memory the same as the Memory Wiki / QMD?**
No. Active Memory is a real-time recall sub-agent that fires before every reply. Memory Wiki / QMD is a structured knowledge base you populate with product info, buyer profiles, and facts. They work together: Active Memory can draw from the Memory Wiki as part of its recall sweep.

**Do the security fixes affect my self-hosted install?**
Yes. If you launched with the example `.env.example` credentials and haven't rotated them, v2026.4.12 will refuse to start. Run `openclaw doctor --fix` to generate fresh credentials, then restart.

**Can LM Studio provider use quantized local models for memory search embeddings?**
Yes. The provider supports any OpenAI-compatible `/v1/embeddings` endpoint. Quantized models (Q4_K_M, Q8_0) work fine for embedding use cases.

**Will the WhatsApp media send fallback affect my existing template?**
No changes needed. The fix is at the gateway level — existing `mediaUrl` + `mediaUrls` patterns continue to work, but now with automatic fallback so attachments aren't silently dropped.

---

*Want your B2B export team running Active Memory and LM Studio on OpenClaw v2026.4.12 today?*

**[Start free on PulseAgent →](https://pulseagent.io/app/login?ref=blog&utm_source=blog&utm_medium=release-post&utm_campaign=openclaw-v2026.4.12)**
