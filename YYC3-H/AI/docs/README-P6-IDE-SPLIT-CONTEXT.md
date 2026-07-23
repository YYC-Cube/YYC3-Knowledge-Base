# P6: IDEMode Deep Split + IDELayoutContext

## Summary

IDEMode.tsx reduced from **1419 lines** (P5) to **~520 lines** (P6) — a **63% reduction**, well below the 650 target.

## Architecture Changes

### New Files Created (in `/src/app/components/ide/`)

| File | Lines | Purpose |
|------|-------|---------|
| `IDELayoutContext.tsx` | ~55 | React Context for shared editor/file state across IDE sub-components |
| `IDEChatPanel.tsx` | ~230 | Self-contained AI chat panel with own state (messages, input, streaming, MCP tools, recent projects) |
| `IDECodeEditorPanel.tsx` | ~110 | Monaco code editor body (tabs, split view, inline preview, collab status) |
| `IDEFileExplorer.tsx` | ~55 | File explorer body (search, file tree) |
| `IDEOverlays.tsx` | ~150 | All 10 lazy-loaded modal/overlay panels + FileContextMenu + VersionHistory + RecentFiles + Database + System |

### Context Design

`IDELayoutContext` provides shared state consumed by `IDECodeEditorPanel`, `IDEFileExplorer`, and `IDEOverlays`:

- **Editor state**: `selectedFile`, `editorCode`, `editorDirty`, `fileContentMap` + setters
- **File explorer**: `searchQuery`, `filteredFileTree`, `fileContextMenu` + setters
- **Layout helpers**: `borderColor`, `panelBg`, `terminalVisible`, `cyberEditorRef`
- **Quick Actions**: context/position/visibility setters

`IDEChatPanel` is fully self-contained — owns its own chat messages, input, streaming logic, MCP tool detection, and project list. Reads directly from Zustand stores (`useModelStore`, `useThemeStore`, `useProjectStore`).

### What Remained in IDEMode.tsx

- Panel visibility states (10 overlay toggles)
- View/layout state (viewMode, fullscreenPreview, leftWidth, middleRatio)
- Terminal state + resize logic
- Panel column resize logic
- Keyboard shortcuts
- Event bus listeners (`yyc3:open-panel`)
- AutoSave effects
- Slot header/body renderers (lightweight dispatchers)
- Context value construction
- Three-column layout JSX

### Verification Checklist

```bash
pnpm tsc --noEmit    # Zero TS errors
pnpm lint            # ESLint clean
pnpm test            # All tests pass
pnpm build           # Production build OK
```

### Previously Extracted (P5)

- `ide/ide-mock-data.ts` — mock file tree, sample code, projects, terminal history
- `ide/IDETerminal.tsx` — terminal panel component
- `ide/FileTreeNode.tsx` — recursive file tree node + `filterFileTree` utility

### Total `ide/` Module Files: 8

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
```
