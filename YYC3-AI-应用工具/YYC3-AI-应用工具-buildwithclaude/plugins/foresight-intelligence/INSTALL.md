# Foresight Engine — Installation Guide

Two prediction modes. Two installation paths. Pick the one that fits your setup.

---

## SOFT PREDICT FUTURE

**What it is:** A Claude-native skill. No Python. No tools. Just ask any future question.
**Works on:** Claude Code · Claude for Work · claude.ai (manual paste)
**Requires:** Web search enabled

---

### Option A — Claude Code (Plugin Install)

```bash
/plugin install https://github.com/isanthoshgandhi/foresight-engine
```

That's it. The skill auto-loads. Ask any future question:

```
Will India become the global AI leader by 2050?
```

Claude recognizes prediction intent and runs the Soft Predict Future pipeline automatically.

To invoke explicitly:

```
/foresight-engine:soft-predict-future Will OpenAI or Anthropic win by 2030?
```

---

### Option B — Claude for Work / claude.ai (Manual Paste)

Claude for Work and claude.ai Projects do not support plugin installs. Use Project Instructions instead:

1. Go to **claude.ai** → **Projects** → open or create a project
2. Click **Project instructions** (top of the left panel)
3. Open the file below and copy its entire contents:
   [`skills/soft-predict-future/SKILL.md`](https://github.com/isanthoshgandhi/foresight-engine/blob/main/skills/soft-predict-future/SKILL.md)
4. Paste into the Project instructions box → **Save**

Every conversation in that project now runs Soft Predict Future automatically when you ask a future question.

**Note:** Web search must be enabled in the project for signal collection to work. If Claude says web search is unavailable, enable it in project settings.

---

## HARD PREDICT FUTURE

**What it is:** A 12-step deterministic agent. Claude handles intelligence; Python handles all arithmetic. Every number is computed — nothing estimated.
**Works on:** Claude Code only
**Requires:** Bash tool · Python 3.8+ · Plugin installed

**Does NOT work on claude.ai or Claude for Work** — those environments have no Bash access or filesystem. Use Soft Predict Future on those platforms.

---

### Install (Claude Code)

```bash
/plugin install https://github.com/isanthoshgandhi/foresight-engine
```

**Verify Python is available:**

```bash
python --version
```

Must return Python 3.8 or higher. If not installed, download from python.org.

**Run a Hard Predict:**

```
/foresight-engine:hard-predict-future Will EVs dominate Indian roads by 2035?
```

Or tell Claude directly:

```
Run hard predict: Will EVs dominate Indian roads by 2035?
```

The agent launches, runs all 12 steps, and outputs the full report with VERDICT, STEEEP matrix, historical analogues, probability split, and decision guidance.

---

## Feature Comparison

| Feature | Soft Predict Future | Hard Predict Future |
|---|---|---|
| Platform | Claude Code, claude.ai, Claude for Work | Claude Code only |
| Speed | ~30 seconds | ~3–5 minutes |
| Numbers computed | Claude-estimated | Python-computed, auditable |
| Confidence score | Yes | Yes (formula-based) |
| STEEEP matrix | Yes | Yes (Python-built) |
| Structural drivers | Yes | Yes (signal-weighted) |
| Historical analogues | Yes | Yes (similarity-scored) |
| Probability split | Yes | Yes (normalized formula) |
| VERDICT line | Yes | Yes |
| Decision guidance | Yes | Yes (rule-based) |
| Regional lens | Yes | Yes (multiplier tables) |
| Backcasting | Yes | Yes |

---

## Uninstall

```bash
/plugin uninstall foresight-engine
```

For claude.ai: delete or clear the Project instructions.

---

## Troubleshooting

**"Web search unavailable"** — Enable web search in claude.ai project settings or Claude Code settings.

**"Python not found" / Script fails** — Install Python 3.8+ and ensure it's on your PATH. Run `python --version` in a terminal to confirm.

**"CLAUDE_PLUGIN_ROOT not set"** — This variable is set automatically by Claude Code when the plugin is installed. If it's missing, reinstall the plugin: `/plugin uninstall foresight-engine` then `/plugin install https://github.com/isanthoshgandhi/foresight-engine`.

**Partial output / missing sections** — The agent is instructed never to produce partial reports. If you see one, say "continue the report" — Claude will resume from where it stopped.

---

*Plugin by Santhosh Gandhi · github.com/isanthoshgandhi/foresight-engine · MIT License*
