# P7: Custom Hooks Extraction + Overlay Panel Consolidation

## Summary

IDEMode.tsx reduced from **~520 lines** (P6) to **~442 lines** (P7) — a further **15% reduction**, now well below 450.

## New Files Created (in `/src/app/components/ide/`)

| File | Lines | Purpose |
|------|-------|---------|
| `useOverlayPanels.ts` | ~90 | Consolidates 10 overlay panel visibility `useState` calls into a single `Record<OverlayPanelKey, boolean>` + `show`/`hide`/`toggle`/`setter` API |
| `useIDEKeyboard.ts` | ~100 | All IDE-level keyboard shortcuts (Escape, Ctrl+1/2, Ctrl+B, Ctrl+J, Ctrl+W, Ctrl+E, Ctrl+Shift+F/P, tab switching) |
| `useIDEPanelResize.ts` | ~140 | Terminal resize + 3-column panel drag logic (mouse handlers, refs, state) |

## Architecture Changes

### Before (P6 — 520 lines in IDEMode.tsx)
- 10 individual `useState(false)` for overlay panels
- ~25 lines of keyboard shortcut effect
- ~40 lines of terminal resize logic
- ~25 lines of panel column resize logic

### After (P7 — 442 lines in IDEMode.tsx)
- `const overlayPanels = useOverlayPanels()` — single call replaces 10 states
- `useIDEKeyboard({...})` — single call replaces keyboard effect
- `const resize = useIDEPanelResize({...})` — single call replaces resize logic + state

### Consumer Changes

| Component | Change |
|-----------|--------|
| **IDEHeader** | Props simplified: removed 10 individual `set*Visible` props, replaced with single `overlayPanels: OverlayPanelsAPI` prop. Uses `overlayPanels.show(key)` |
| **IDEOverlays** | Props simplified: removed 10 individual visibility/setter pairs, replaced with `panels: OverlayPanelState` + `hide: (key) => void` |
| **IDEMode** | Uses `resize.leftWidth`, `resize.startPanelDrag()`, `resize.startTerminalResize()` etc. |

### Panel Event Bus Integration

`EVENT_TO_PANEL_KEY` map (exported from `useOverlayPanels.ts`) converts `yyc3:open-panel` custom event detail strings to `OverlayPanelKey`:

```ts
{ git: "gitPanel", performance: "perfDash", diagnostics: "diagPanel",
  taskBoard: "taskBoard", snippets: "snippetMgr", activityLog: "activityLog",
  multiInstance: "multiInstance" }
```

External store panels (database, plugins, security, offline) still dispatch directly to their respective store actions.

## Total `ide/` Module Files: 11

```
ide/
  FileTreeNode.tsx
  IDEChatPanel.tsx
  IDECodeEditorPanel.tsx
  IDEFileExplorer.tsx
  IDELayoutContext.tsx
  IDEOverlays.tsx
  IDETerminal.tsx
  ide-mock-data.ts
  useIDEKeyboard.ts      ← NEW
  useIDEPanelResize.ts   ← NEW
  useOverlayPanels.ts    ← NEW
```

## Verification Checklist

```bash
pnpm tsc --noEmit    # Zero TS errors
pnpm lint            # ESLint clean
pnpm test            # All tests pass
pnpm build           # Production build OK
```
