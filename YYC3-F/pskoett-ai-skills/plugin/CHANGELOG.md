# Changelog

## 2.0.0 — 2026-04-11

### Added — Two Loops Implementation
- **verify-gate**: Machine verification gate (compile, test, lint) between implementation and quality review with fix loop
- **learning-aggregator**: Cross-session analysis of .learnings/ files — finds patterns, ranks promotion candidates
- **pre-flight-check**: Session-start scan that surfaces relevant learnings, errors, and eval status
- **eval-creator**: Creates permanent eval cases from promoted learnings and runs regression checks

### Agents
- **harness-updater**: Applies promotion candidates to CLAUDE.md, AGENTS.md, copilot-instructions.md

### Hooks
- SessionStart: pre-flight-check surfaces accumulated learning signals

### Changed
- Moved self-improvement and context-surfing hooks from plugin-level hooks.json into SKILL.md frontmatter
- Updated skill-pipeline with full two-loop routing (inner loop + outer loop)
- Updated pipeline depth table to include verify-gate and pre-flight-check at all levels

---

## 1.0.0 — 2025-03-16

### Added
- **plan-interview**: Structured interview before implementation planning
- **intent-framed-agent**: Intent capture and scope drift monitoring during execution
- **context-surfing**: Context window health monitoring with clean handoff on drift
- **simplify-and-harden**: Post-completion simplify, harden, and micro-documentation passes
- **self-improvement**: Learning capture with hook-based activation and error detection
- **agent-teams-simplify-and-harden**: Parallel implementation and audit loop using agent teams

### Agents
- simplify-auditor, harden-auditor, spec-auditor, context-monitor, self-improvement-logger

### Hooks
- UserPromptSubmit: self-improvement activator reminder
- PostToolUse (Bash): automatic error detection
- SessionStart: context-surfing handoff file checker
