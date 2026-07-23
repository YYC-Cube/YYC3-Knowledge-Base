# YYC3 AI Code — P5 Multi-Instance + IDE Split + Type Safety

> **Phase**: P5
> **Date**: 2026-03-18
> **Version**: v4.8.2
> **Author**: YanYuCloudCube Team &lt;admin@0379.email&gt;

---

## Deliverables

### 1. MultiInstancePanel Lazy-Load Integration

- **`IDEMode.tsx`**: Added `React.lazy(() => import("./MultiInstancePanel"))` for code-split lazy loading
- **`IDEHeader.tsx`**: Added `Layers` icon button in the right toolbar group, gated by `setMultiInstanceVisible` prop
- **Event bus**: Added `multiInstance` to the `yyc3:open-panel` custom event map for command palette / shortcut access
- **State**: `multiInstanceVisible` boolean state in IDEMode with Suspense wrapper

### 2. Type Safety — Eliminated 4 `any` in WorkspaceTabs

**File**: `src/app/components/settings/WorkspaceTabs.tsx`

| Line | Before | After |
|------|--------|-------|
| 316 | `(l: any)` | `(l: LayoutSnapshot)` |
| 318 | `(c: any)` | `(c: LayoutSyncConflict)` |
| 411 | `(conflict: any)` | `(conflict: LayoutSyncConflict)` |
| 432 | `(layout: any, i: number)` | `(layout: LayoutSnapshot, i: number)` |

**Imported types from**: `../../store/panel-dnd-store` (`LayoutSnapshot`, `LayoutSyncConflict`)

### 3. IDEMode Continuous Split — 1863 → 1419 Lines (24% Reduction)

**Extracted modules**:

| New File | Lines | Responsibility |
|----------|-------|----------------|
| `components/ide/ide-mock-data.ts` | ~165 | Mock file tree, sample code, terminal history, VFS types + helpers |
| `components/ide/IDETerminal.tsx` | ~225 | Integrated terminal panel (VFS CRUD, input/output, resize, expand) |
| `components/ide/FileTreeNode.tsx` | ~85 | File tree recursive node component + filterFileTree utility |

**Removed from IDEMode.tsx**:
- Inline `MOCK_FILE_TREE` (40 lines) → aliased from `ide-mock-data.ts`
- Inline `SAMPLE_CODE` (30 lines) → aliased from `ide-mock-data.ts`
- Inline `TERMINAL_HISTORY` (15 lines) → aliased from `ide-mock-data.ts`
- Inline `MOCK_PROJECTS` (6 lines) → aliased from `ide-mock-data.ts`
- Inline `VFSNode` + `INITIAL_VFS` + 4 VFS helpers (50 lines) → moved to `ide-mock-data.ts`
- Inline `FileTreeNode` component (52 lines) → moved to `ide/FileTreeNode.tsx`
- Inline `filterFileTree` utility (18 lines) → moved to `ide/FileTreeNode.tsx`
- Inline `handleTerminalSend` function (160 lines) → encapsulated in `IDETerminal.tsx`
- Inline terminal state (`terminalInput`, `terminalLines`, `terminalCwd`, `vfs`) → encapsulated in `IDETerminal.tsx`
- Inline terminal JSX (120 lines) → replaced with `<IDETerminal />` component (12 lines)
- Cleaned unused icon imports (`Layers`, `ChevronsLeftRight`, `ChevronsRightLeft`, `File`, `Folder`, `ChevronDown`, `Minus`, `Maximize2`)

---

## Local Development Handoff

### Prerequisites

```bash
pnpm install
```

### Validation Commands

```bash
# TypeScript type check (zero errors target)
pnpm tsc --noEmit

# Linting
pnpm lint

# Tests
pnpm test

# Build
pnpm build
```

### Husky Activation (from P4)

If not yet activated locally:
```bash
pnpm add -D husky lint-staged
npx husky init
```

### Next Steps — Path to < 800 Lines

IDEMode.tsx is currently **1419 lines**. To reach < 800, the following refactoring is recommended:

1. **Extract `renderAIChatBody`** (~130 lines) → `ide/IDEChatBody.tsx`
   - Requires lifting chat state (`messages`, `chatInput`, `aiLoading`, `chatToolbarOpen`) into a shared context or store
   - Depends on: `useModelStore`, `settingsActions`, `enabledMCPTools`, `recentProjects`

2. **Extract `renderCodeEditorBody`** (~85 lines) → `ide/IDEEditorBody.tsx`
   - Requires: `CyberEditor` ref, split state, preview state, collab state

3. **Extract `renderFileExplorerBody`** (~35 lines) → `ide/IDEFileExplorer.tsx`

4. **Extract preview mode JSX** (~65 lines) → `ide/IDEPreviewMode.tsx`

5. **Create `IDELayoutContext`** to share state between extracted sub-components without excessive prop drilling

6. **Move overlay modals** into `ide/IDEOverlays.tsx` wrapper component (~60 lines)

**Estimated final IDEMode.tsx**: ~650-700 lines after all extractions.

### File Structure After P5

```
src/app/components/
├── ide/
│   ├── ide-mock-data.ts          # Mock data + VFS helpers
│   ├── IDETerminal.tsx            # Integrated terminal panel
│   └── FileTreeNode.tsx           # File tree component + filter
├── IDEMode.tsx                    # Main IDE (1419 lines, down from 1863)
├── IDEHeader.tsx                  # Top nav + toolbar (Layers icon added)
├── IDELeftPanel.tsx               # Left panel navigation
├── IDEStatusBar.tsx               # Bottom status bar
├── MultiInstancePanel.tsx         # Multi-instance management (Store #21)
└── settings/
    └── WorkspaceTabs.tsx          # Type-safe (0 `any` remaining)
```

### Known Remaining `any` Count

After this phase: **0 known `any` types** in the codebase settings/workspace/panel-dnd layer.

---

> **YanYuCloudCube** — 言启象限 | 语枢未来
