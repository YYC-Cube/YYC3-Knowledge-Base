# OpenClaw Upstream Sync — April 3, 2026

Two upstream fixes landed today that B2B export SDR deployments should know about: one improves Telegram's per-account action handling, the other adds proper Mistral AI provider support. Both are adapted and documented in the template.

## What Changed Upstream

- **Telegram: per-account action gates now honored during discovery** (`fb8048a1`)
  Previously, when multiple Telegram bot accounts were configured (e.g., one per market), the action gate evaluation at "discover available actions" time only read from the top-level channel config — it ignored account-level overrides. This meant a bot configured with `reactions: true` at the account level would still report reactions as disabled if the top-level default said `false`. The fix introduces account-scoped discovery resolution so each bot surfaces only its own authorized actions.

- **Mistral AI provider: OpenAI-compat transport fixed** (`6ac5806a`)
  OpenClaw supports multiple LLM backends via an OpenAI-compatible transport layer. Mistral exposes such an API but has subtle differences from OpenAI: it doesn't support `max_completion_tokens` (uses `max_tokens`), nor does it honor `store` or `reasoning_effort` params. The fix auto-detects Mistral (by `provider: mistral` or by `baseUrl` matching `api.mistral.ai`) and applies the correct defaults — no manual config required.

## What We Updated

- **`workspace/TOOLS.md`**: Added a _Multi-Account Telegram Setup_ section with a YAML config example showing how to configure per-market bots with independent action gates (reactions, polls, inline buttons).

- **`workspace/TOOLS.md`**: Added an _AI Model Provider_ reference table documenting Claude (default), OpenAI, Mistral, Groq, and custom/self-hosted options — including Mistral-specific notes on the transport fix.

- **`CHANGELOG.md`**: Created; will track upstream adaptations going forward.

## Impact for B2B Export Businesses

**Telegram multi-market operators** — if you run separate Telegram bots for different regions (e.g., a Russia/CIS bot with polls enabled, and a Southeast Asia bot with inline buttons only), each bot now correctly exposes only its configured actions to customers. This prevents confusion where the wrong set of interaction options appear.

**Teams considering Mistral as their LLM** — Mistral offers strong multilingual performance, particularly for Arabic, French, Spanish, and Russian — languages common in B2B export. With this fix, using `mistral-large-latest` or `mistral-small-latest` as your agent brain is now a fully supported option without workarounds.

---

*Sync performed: 2026-04-03 | Source: [openclaw/openclaw](https://github.com/openclaw/openclaw) | Template: [iPythoning/b2b-sdr-agent-template](https://github.com/iPythoning/b2b-sdr-agent-template)*
