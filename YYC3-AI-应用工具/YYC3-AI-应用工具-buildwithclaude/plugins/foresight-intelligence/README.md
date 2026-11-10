# Foresight Intelligence

> Strategic foresight engine using IFTF methodology. Two modes: **Soft Predict Future** (Claude-native skill, instant, works on claude.ai) and **Hard Predict Future** (deterministic 12-step pipeline, Python-computed, auditable — requires Claude Code). Structural drivers, cross-impact analysis, IFTF backcasting, four independent futures with per-stakeholder conditional analysis. **Year is optional** — ask any future question and the engine infers the right time horizon.
>
> **Author:** Santhosh Gandhi · **Version:** 2.2.0

---

## Try Asking

Year is optional. The engine infers the right horizon from your question.

```
■ Who will win — Google or Perplexity?
■ Will OpenAI or Anthropic dominate the AI race?
■ Will India become the global AI leader?
■ Will crypto replace banks?
■ Will remote work become permanent?
■ Will EVs dominate Indian cities by 2032?
■ Will UPI become Southeast Asia's default payment rail by 2028?
■ Will Europe lead the green energy transition by 2035?
```

---

## Two Modes

| | Soft Predict Future | Hard Predict Future |
|---|---|---|
| **How** | Claude-native skill — just ask a question | Say "run hard predict: [question]" |
| **Platform** | Claude Code, claude.ai, Claude for Work | Claude Code only (needs Python + Bash) |
| **Scoring** | Claude estimates using the formula | Python computes deterministically |
| **Reproducibility** | ±2–5% variance per run | Identical every run |
| **Audit trail** | Claude reasoning (implicit) | JSON files for every step |
| **Best for** | Exploration, quick reads, content | VC memos, high-stakes decisions |

---

## Install on Claude Code

```bash
# Step 1 — Add the marketplace (one-time setup)
claude plugin marketplace add isanthoshgandhi/foresight-intelligence

# Step 2 — Install the plugin
claude plugin install foresight-intelligence
```

Then just ask any future question — Soft Predict activates automatically.

For Hard Predict Future say:
```
Run hard predict: Will India become the global AI leader by 2050?
```

To invoke explicitly by name:
```
/foresight-intelligence:hard-predict-future Will OpenAI or Anthropic win by 2030?
```

---

## What You Get

Every run — both modes — always outputs the same complete report:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[SOFT / HARD] PREDICT FUTURE · FORESIGHT INTELLIGENCE
[Query]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PREDICTIONS
■ Probable  [X/100] [████████████░░░░░░░░] — most likely trajectory
■ Plausible [X/100] [████████░░░░░░░░░░░░] — credible alternative
■ Possible  [X/100] [████░░░░░░░░░░░░░░░░] — low-probability but real
■ Preferable         [stakeholder analysis below]

Confidence: [X]/100 | Signals: [N] | Horizon: [YYYY–YYYY] | [Date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SIGNAL PULSE         — supporting / opposing / wildcard counts + visual bars
STEEEP MATRIX        — 6×3 grid with ★ hot  ● warm  ✗ blind indicators
STRUCTURAL DRIVERS   — D1, D2, D3 with stability rating
CROSS-IMPACT         — convergence and friction across time horizons
HISTORICAL MATCH     — best analogue + similarity score
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ PROBABLE  scenario  — narrative + PROOF + IF + BUT + DRIVER
■ PLAUSIBLE scenario  — narrative + PROOF + IF + BUT + DRIVER
■ POSSIBLE  scenario  — narrative + PROOF + IF + BUT + DRIVER
■ PREFERABLE          — IFTF backcasting from desired future to today
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PREFERABLE FUTURES · Per stakeholder
  [Player A]: Wins IF → [condition]  BUT ONLY → [constraint]  ONLY THEN → [outcome]
  [Player B]: Wins IF → [condition]  BUT ONLY → [constraint]  ONLY THEN → [outcome]
  Users:      Wins IF → [condition]  BUT ONLY → [constraint]  ONLY THEN → [outcome]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE ONE THING        — the single variable that determines which scenario activates
DECISION GUIDANCE    — recommended stance, low-regret move, risk trigger
REGIONAL LENS        — India / USA / Europe / China multipliers
METHODOLOGY KEY      — one-line explanation of every score and formula
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## How It Works

**9-step pipeline (Soft Predict — Claude runs all steps natively):**

1. **Validate** — 5-rule check: entity real, system observable, time horizon set, signals available, question specific
2. **Collect signals** — 6 web searches, minimum 18 signals, all classified by STEEEP + temporal + type
3. **Score signals** — 4-factor formula: recency × reliability × type × evidence, regional multipliers applied
4. **Extract drivers** — top 3 structural forces behind the signal clusters, ranked by score sum
5. **Build STEEEP matrix** — 18-cell grid: 6 categories × 3 time horizons
6. **Cross-impact analysis** — convergence and friction points across temporal layers
7. **Find analogues** — 3 real historical cases, similarity scored, mapped to drivers
8. **Compute predictions + confidence** — 3 independent scores (0–100 each, do NOT sum to 100); confidence penalizes blind spots
9. **Write scenarios + report** — PROBABLE / PLAUSIBLE / POSSIBLE + PREFERABLE with IFTF backcasting

**Hard Predict** extends to 12 steps with Python handling steps 1, 3, 5, 8, 9, 10, 12 deterministically (confidence, decision guidance, and report formatting each get their own dedicated step).

---

## IFTF Methodology

This plugin implements the [Institute for the Future](https://www.iftf.org) futures research framework:

| IFTF Concept | Implementation |
|---|---|
| Futures Cone | PROBABLE / PLAUSIBLE / POSSIBLE / PREFERABLE |
| Three Horizons | Operational (0–3yr) / Strategic (3–10yr) / Civilizational (10+yr) |
| STEEEP Scan | 6-category signal collection and matrix |
| Signals → Drivers | Step 4: extract structural forces from signal clusters |
| Backcasting | PREFERABLE scenario works backwards from desired future |
| Action Implications | DECISION GUIDANCE: stance, low-regret move, risk trigger |

---

## License

MIT
