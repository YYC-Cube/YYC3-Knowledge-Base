# Changelog

All notable changes to Foresight Engine are documented here.

---

## [2.2.0] — 2026-03-16

### Fixed
- **Probability scoring**: Replaced normalization (scores summing to 100%) with independent exponential curve scoring per future type. Each of Probable, Plausible, and Possible now scores 0–100 independently, consistent with IFTF futures cone methodology where futures are not mutually exclusive.
- **Signal taxonomy**: Added alias normalization layer to handle variant category names (e.g. "Tech" → "Technological", "short-term" → "Operational", "positive" → "SUPPORTING"). Previously, unrecognized variants silently fell through to the default bucket, producing incorrect STEEEP classifications.
- **Confidence blind spot penalty**: Confidence score now deducts up to 15 points for uncovered STEEEP × Temporal matrix cells. Previously, analyses with large gaps in signal coverage could return inflated confidence values.

### Changed
- **Output template**: Replaced `VERDICT` section with `PREDICTIONS` block showing all four futures with ASCII bar charts and independent scores.
- **STEEEP matrix**: Added visual 18-cell grid to output (6 categories × 3 time horizons) with hot/warm/blind indicators.
- **PREFERABLE futures**: Replaced single generic preference with per-stakeholder conditional analysis using `Wins IF → … BUT ONLY → … ONLY THEN →` structure.
- **Methodology key**: Updated to reflect independent scoring, blind spot penalty, and exponential curve formula.

### Removed
- GitHub Releases section from README (redundant with this changelog).

---

## [2.1.0] — 2026-02

### Fixed
- `VERDICT` block placement corrected in Hard Predict output (was appearing before signal analysis).
- Removed dead code paths from probability calculation pipeline.

### Changed
- Folder structure renamed for clarity:
  - `skills/hard-predict/` → `skills/hard-predict-future/`
  - `skills/soft-predict/` → `skills/soft-predict-future/`
- Plugin metadata updated to match new paths.

---

## [2.0.0] — 2026-01

### Changed
- Renamed prediction modes to **Soft Predict Future** and **Hard Predict Future** for clarity.
- Overhauled plugin file structure to conform to Claude plugin specification (`plugin.json`, `marketplace.json`, SKILL.md, agent .md files).
- Hard Predict pipeline expanded to 12 deterministic steps with JSON audit trail per step.
- STEEEP signal collection standardized: minimum 18 signals across all 6 categories required before scoring.

---

## [1.0.0] — 2025

### Added
- Initial release.
- **Soft Predict Future**: Claude-native skill. Works on claude.ai and Claude Code. Instant, no scripts required.
- **Hard Predict Future**: Deterministic agent. Python-computed scoring. Claude Code only.
- 9-step pipeline: validate → collect signals → score → extract drivers → STEEEP matrix → cross-impact → find analogues → compute predictions → write scenarios.
- Four futures output: Probable, Plausible, Possible, Preferable.
- IFTF methodology: Futures Cone, Three Horizons, STEEEP scan, backcasting.
- Regional multipliers: India / USA / Europe / China.
- Decision guidance: recommended stance, low-regret move, risk trigger.
