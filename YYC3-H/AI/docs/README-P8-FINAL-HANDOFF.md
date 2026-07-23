# P8: AutoSave Hook + Global Audit + Local Development Handoff

> YYC3 AI Code v4.8.3 | 2026-03-18

---

## Summary

IDEMode.tsx reduced from original **~2100 lines** (P5) to **~423 lines** (P8) — **80% total reduction** across phases P6-P8.

### Line Count Progression

| Phase | Lines | Delta | Key Change |
|-------|-------|-------|------------|
| P5 (pre-split) | ~2100 | — | Monolithic |
| P6 (context split) | ~520 | -75% | IDELayoutContext + 5 sub-components |
| P7 (hooks extraction) | ~442 | -15% | useIDEKeyboard + useIDEPanelResize + useOverlayPanels |
| **P8 (autoSave + cleanup)** | **~423** | **-4%** | useAutoSave + unused import cleanup |

---

## P8 Changes

### New File: `useAutoSave.ts` (~80 lines)

- Extracted periodic interval save (10s) + debounced dirty-save (3s) logic
- Internally reads `useEditorPrefs()` and `useI18n()` — IDEMode no longer needs these for autoSave
- Returns `{ lastAutoSave }` — replaces `useState<string | null>(null)` in IDEMode
- Creates file versions via `fileStoreActions.createVersion()` on debounced save

### Import Cleanup (IDEMode.tsx)

| Removed Import | Reason |
|---------------|--------|
| `useEditorPrefs` | Moved into `useAutoSave` |
| `ideStore as ideStoreDirect` | Moved into `useIDEKeyboard` |
| `locale` from `useI18n()` | Moved into `useAutoSave` |
| `lastAutoSave` / `setLastAutoSave` state | Replaced by `useAutoSave` return value |

### IDEHeader Props Consolidation

Old (10 individual setter props):
```ts
setAiAssistVisible, setCodeGenVisible, setCollabPanelVisible,
setGitPanelVisible, setPerfDashVisible, setDiagPanelVisible,
setTaskBoardVisible, setSnippetMgrVisible, setActivityLogVisible,
setMultiInstanceVisible
```

New (single prop):
```ts
overlayPanels: OverlayPanelsAPI  // { panels, show, hide, toggle, setter }
```

### IDEOverlays Props Consolidation

Old (10 visibility + 10 setter pairs = 20 props):
```ts
aiAssistVisible, setAiAssistVisible, codeGenVisible, setCodeGenVisible, ...
```

New (2 props):
```ts
panels: OverlayPanelState       // Record<OverlayPanelKey, boolean>
hide: (key: OverlayPanelKey) => void
```

---

## Global Audit Results

### Files Audited

| File | Status | Issues Found |
|------|--------|-------------|
| `IDEMode.tsx` | OK | Unused imports cleaned |
| `IDEHeader.tsx` | OK | Props interface updated to `OverlayPanelsAPI` |
| `ide/IDEOverlays.tsx` | OK | Props interface updated to consolidated model |
| `ide/useOverlayPanels.ts` | OK | New — 10 states consolidated |
| `ide/useIDEKeyboard.ts` | OK | New — keyboard shortcuts extracted |
| `ide/useIDEPanelResize.ts` | OK | New — resize logic extracted |
| `ide/useAutoSave.ts` | OK | New — autoSave logic extracted |
| `ide/IDEChatPanel.tsx` | OK | No changes needed |
| `ide/IDECodeEditorPanel.tsx` | OK | No changes needed |
| `ide/IDEFileExplorer.tsx` | OK | No changes needed |
| `ide/IDELayoutContext.tsx` | OK | No changes needed |
| `ide/IDETerminal.tsx` | OK | No changes needed |

### Cross-Reference Check

- No stale references to old individual setter names (`setAiAssistVisible` etc.) in any `.tsx` file (except mock diff string in `GitPanel.tsx`)
- `yyc3:open-panel` event bus correctly maps to new `overlayPanels.show(key)` via `EVENT_TO_PANEL_KEY`
- External store panels (database, plugins, security, offline) still dispatch directly to their respective store actions

---

## Complete `ide/` Module Structure (12 files)

```
src/app/components/ide/
  FileTreeNode.tsx          # File tree node component + filterFileTree util
  IDEChatPanel.tsx          # AI chat panel (extracted from IDEMode)
  IDECodeEditorPanel.tsx    # Code editor panel (extracted from IDEMode)
  IDEFileExplorer.tsx       # File explorer panel (extracted from IDEMode)
  IDELayoutContext.tsx      # Shared layout context provider
  IDEOverlays.tsx           # All lazy-loaded overlay panels
  IDETerminal.tsx           # Terminal panel component
  ide-mock-data.ts          # Mock file tree + sample code
  useAutoSave.ts            # AutoSave hook (periodic + debounced)       [NEW P8]
  useIDEKeyboard.ts         # Global keyboard shortcuts hook              [NEW P7]
  useIDEPanelResize.ts      # Terminal + column resize logic hook         [NEW P7]
  useOverlayPanels.ts       # Consolidated overlay panel visibility hook  [NEW P7]
```

---

## Local Development Handoff Guide

### Prerequisites

```bash
node -v   # >= 20.x
pnpm -v   # >= 8.x
```

### Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/YY-Nexus/YanYuCloud.git
cd YanYuCloud

# 2. Install dependencies
pnpm install

# 3. Full verification pipeline
pnpm tsc --noEmit       # TypeScript type check (expect 0 errors)
pnpm lint                # ESLint check (expect 0 warnings)
pnpm test                # Vitest test suite
pnpm build               # Production build

# 4. Development server
pnpm dev
```

### Git Workflow

```bash
# Create feature branch from current state
git checkout -b feat/p8-hooks-autosave

# Stage all changes
git add -A

# Commit with conventional commit format
git commit -m "refactor(ide): extract useAutoSave hook, consolidate overlay panels, cleanup imports

- Extract AutoSave logic into useAutoSave.ts custom hook
- Consolidate 10 overlay panel useState calls into useOverlayPanels
- Extract keyboard shortcuts into useIDEKeyboard
- Extract panel resize logic into useIDEPanelResize
- Update IDEHeader and IDEOverlays props to consolidated interfaces
- Remove unused imports (useEditorPrefs, ideStoreDirect, locale)
- IDEMode.tsx: 2100 -> 423 lines (80% reduction across P6-P8)"

# Push and create PR
git push origin feat/p8-hooks-autosave
```

### Verification Checklist

Before pushing, ensure all pass:

- [ ] `pnpm tsc --noEmit` — 0 TypeScript errors
- [ ] `pnpm lint` — 0 ESLint errors/warnings
- [ ] `pnpm test` — All tests pass
- [ ] `pnpm build` — Production build succeeds
- [ ] Manual test: IDE mode renders correctly
- [ ] Manual test: Keyboard shortcuts work (Ctrl+B, Ctrl+J, Ctrl+1/2, Ctrl+W)
- [ ] Manual test: Panel resize handles work
- [ ] Manual test: Overlay panels open/close correctly
- [ ] Manual test: AutoSave triggers and status bar shows timestamp
- [ ] Manual test: Theme switching works
- [ ] Manual test: Language switching works

### Known Lint Warnings (Expected)

| Warning | Location | Reason |
|---------|----------|--------|
| `locale` unused | `useI18n()` in some components | Destructured but only `t` used; harmless |
| Missing deps in `useEffect` | Various | Intentional — some effects should not re-fire on every dep change |

### Architecture Notes for Future Development

1. **Hook Dependencies**: Custom hooks (`useAutoSave`, `useIDEKeyboard`, `useIDEPanelResize`, `useOverlayPanels`) are self-contained. They read their own stores internally, minimizing prop drilling.

2. **Event Bus Pattern**: `yyc3:open-panel` custom events map through `EVENT_TO_PANEL_KEY` in `useOverlayPanels.ts`. To add a new panel:
   - Add key to `OverlayPanelKey` type
   - Add to `INITIAL_STATE`
   - Add mapping in `EVENT_TO_PANEL_KEY` (if dispatched via event bus)
   - Add lazy import + render in `IDEOverlays.tsx`

3. **Context Boundary**: `IDELayoutContext` shares editor/file state with sub-components. Add new shared state there rather than prop-drilling through IDEMode.

4. **Next Steps** (suggested):
   - Add unit tests for the 4 new hooks
   - Consider extracting slot renderers (`renderSlotBody`, `renderSlotHeaderContent`) into their own component
   - Continue CI/CD pipeline setup per Guidelines

---

## Contact

- **Team**: YanYuCloudCube Team
- **Email**: admin@0379.email
- **Repo**: https://github.com/YY-Nexus/YanYuCloud.git

---

> **YanYuCloudCube** | Words Initiate Quadrants, Language Serves as Core for Future
