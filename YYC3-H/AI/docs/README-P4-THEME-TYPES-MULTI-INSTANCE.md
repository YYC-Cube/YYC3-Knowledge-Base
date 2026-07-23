---
@file: README-P4-THEME-TYPES-MULTI-INSTANCE.md
@description: YYC3 AI Code P4 — ThemeTokens 类型安全 + husky pre-commit + Multi-Instance 系统
@author: YanYuCloudCube Team <admin@0379.email>
@version: v4.8.2
@created: 2026-03-18
@updated: 2026-03-18
@status: stable
@license: MIT
---

# YYC3 AI Code — P4: ThemeTokens 类型安全 + Pre-commit Hook + Multi-Instance 系统

> **YanYuCloudCube** | 言启象限 | 语枢未来

---

## 快速开始

```bash
pnpm install

# 本地安装 husky（首次设置）
pnpm add -D husky lint-staged
npx husky init
# 然后 .husky/pre-commit 已配置好

pnpm dev          # 开发服务器
pnpm build        # 生产构建
pnpm test         # 运行全部测试
pnpm lint         # ESLint 检查（零 warnings）
pnpm format       # Prettier 格式化
```

---

## 本阶段完成事项

### 1. ThemeTokens 类型安全替代 `any`

**变更范围**: Settings 子组件全系列

| 文件 | 变更 |
|------|------|
| `settings/SettingsShared.tsx` | `SettingsTabProps.tk: ThemeTokens`（替代 `any`） |
| `settings/AIServiceTabs.tsx` | 导入 `ThemeTokens`，`ModelsTab.aiModels` 改为具体类型 |
| `settings/WorkspaceTabs.tsx` | `LayoutThumbnail.tk: ThemeTokens`，`ShareButton.dnd: ReturnType<typeof usePanelDnD>` |

**`ThemeTokens` 接口**（已存在于 `theme-store.ts`，共 35 个字段）:
- Core colors: `background`, `foreground`, `primary`, `success`, `warning`, `error` 等
- Panel/Card: `panelBg`, `cardBg`, `cardBorder`
- Input: `inputBg`, `inputBorder`, `inputFocus`
- Fonts: `fontDisplay`, `fontMono`, `fontBody`
- Effects: `enableGlitch`, `enableScanlines`, `enableCRT`, `enableGlow`
- Chrome: `windowClose`, `windowMinimize`, `windowMaximize`

**剩余 `any` 位置**（仅在 `LayoutsTab` 中 `dnd.listLayouts()` 返回值和 conflict 对象——需 panel-dnd-store 导出类型后彻底消除）

### 2. Husky + lint-staged Pre-commit Hook

**新增文件**:

```
.husky/pre-commit          — 执行 npx lint-staged
.lintstagedrc.json         — 配置 ESLint + Prettier 规则
package.json               — 新增 "prepare": "husky" script
```

**lint-staged 规则**:
```json
{
  "src/**/*.{ts,tsx}": ["eslint --fix --max-warnings 0", "prettier --write"],
  "src/**/*.{css,json}": ["prettier --write"]
}
```

**本地安装步骤**:
```bash
pnpm add -D husky lint-staged
npx husky init
# .husky/pre-commit 已预配置，无需额外操作
```

安装后每次 `git commit` 将自动执行 ESLint + Prettier 检查。

### 3. Multi-Instance 系统（Store #21 + UI Panel）

对齐设计文档: `docs/YYC3-P2-Advanced-Feature-Multi-Instance.md`

#### 3.1 Store: `multi-instance-store.ts`

**架构**: `useSyncExternalStore`（零依赖 Store 架构，与项目现有 20 个 store 一致）+ `localStorage` 持久化

**类型体系** (全部导出):

| 类型 | 说明 |
|------|------|
| `InstanceType` | `'main' \| 'secondary' \| 'popup' \| 'preview'` |
| `WindowType` | `'main' \| 'editor' \| 'preview' \| 'terminal' \| 'ai-chat' \| 'settings'` |
| `WorkspaceType` | `'project' \| 'ai-session' \| 'debug' \| 'custom'` |
| `SessionType` | `'ai-chat' \| 'code-edit' \| 'debug' \| 'preview' \| 'terminal'` |
| `SessionStatus` | `'active' \| 'idle' \| 'suspended' \| 'closed'` |
| `IPCMessageType` | 11 种消息类型 |
| `AppInstance` | 窗口实例（位置/大小/工作区/会话关联） |
| `Workspace` | 工作区（项目隔离/上下文分离） |
| `Session` | 会话（AI对话/代码编辑/终端/预览） |
| `IPCMessage` | IPC 消息（跨实例通信） |
| `ResourceUsage` | 资源使用快照 |

**Actions** (`multiInstanceActions`):

| 分类 | 方法 | 说明 |
|------|------|------|
| 实例 | `createInstance(type, title?, workspaceId?)` | 创建新窗口实例 |
| 实例 | `closeInstance(id)` | 关闭实例（主实例受保护） |
| 实例 | `activateInstance(id)` | 激活/聚焦实例 |
| 实例 | `minimizeInstance(id)` | 最小化 |
| 实例 | `moveInstance(id, pos)` | 移动窗口 |
| 实例 | `resizeInstance(id, size)` | 调整大小 |
| 工作区 | `createWorkspace(name, type, path?)` | 创建工作区 |
| 工作区 | `activateWorkspace(id)` | 激活工作区 |
| 工作区 | `updateWorkspace(id, updates)` | 更新配置 |
| 工作区 | `deleteWorkspace(id)` | 删除（保底1个） |
| 工作区 | `duplicateWorkspace(id)` | 复制工作区 |
| 会话 | `createSession(name, type, wsId, winId?)` | 创建会话 |
| 会话 | `activateSession(id)` | 激活会话 |
| 会话 | `suspendSession(id)` / `resumeSession(id)` | 暂停/恢复 |
| 会话 | `closeSession(id)` / `deleteSession(id)` | 关闭/删除 |
| 资源 | `refreshResources()` | 刷新资源快照 |
| IPC | `broadcastMessage(type, data)` | 广播 IPC 消息 |
| IPC | `clearIPCLog()` | 清空日志 |

#### 3.2 UI: `MultiInstancePanel.tsx`

5 个 Tab 视图:
- **Instances**: 窗口实例列表 + 创建（editor/preview/terminal/ai-chat）+ 展开详情
- **Workspaces**: 工作区管理 + 创建表单 + 激活/复制/删除
- **Sessions**: 活跃/已关闭会话 + 暂停/恢复/关闭
- **Resources**: 资源监控仪表盘（内存/CPU/标签/会话数）
- **IPC**: IPC 消息日志 + 清空

#### 3.3 测试: `multi-instance-store.test.ts`

验证全部 23 个 action 方法导出完整性 + hook 导出。

### 4. 版本更新

- Store 数量: 20 -> **21** (新增 `multi-instance-store`)
- 测试文件数: 21 -> **22** (新增 multi-instance test)
- About 页 Stores 计数: 20 -> 21

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `settings/SettingsShared.tsx` | **修改** | `any` -> `ThemeTokens` |
| `settings/AIServiceTabs.tsx` | **修改** | `any` -> `ThemeTokens` + 具体 model 类型 |
| `settings/WorkspaceTabs.tsx` | **修改** | `any` -> `ThemeTokens` + `ReturnType<typeof usePanelDnD>` |
| `store/multi-instance-store.ts` | **新建** | Store #21 — 多实例管理 |
| `store/__tests__/multi-instance-store.test.ts` | **新建** | 测试 |
| `components/MultiInstancePanel.tsx` | **新建** | 多实例管理 UI |
| `.husky/pre-commit` | **新建** | Git pre-commit hook |
| `.lintstagedrc.json` | **新建** | lint-staged 配置 |
| `package.json` | **修改** | 新增 `prepare` script |

---

## 本地验证步骤

```bash
# 1. 安装 husky + lint-staged（本地首次设置）
pnpm add -D husky lint-staged

# 2. 初始化 husky
npx husky init

# 3. 类型检查
pnpm tsc --noEmit

# 4. 运行测试（含新增 multi-instance-store.test.ts + settings-tabs.test.ts）
pnpm test

# 5. Lint
pnpm lint

# 6. 构建
pnpm build

# 7. 验证 pre-commit hook
git add -A && git commit -m "feat: P4 ThemeTokens + Multi-Instance + husky"
# 应自动执行 lint-staged
```

---

## 接入 MultiInstancePanel 到 IDEMode

在 IDEMode.tsx 中添加按钮触发 MultiInstancePanel:

```tsx
import { MultiInstancePanel } from './MultiInstancePanel'

// 在 overlay panels 区域添加:
const [showMultiInstance, setShowMultiInstance] = useState(false)

// 在 header 或左面板添加按钮:
<button onClick={() => setShowMultiInstance(true)}>
  <Layers size={14} /> Multi-Instance
</button>

// 渲染面板:
<MultiInstancePanel visible={showMultiInstance} onClose={() => setShowMultiInstance(false)} />
```

---

## 下一步建议

### P1 — 彻底消除 `any`
1. `panel-dnd-store.ts` 导出 `SavedLayout` / `SyncConflict` 类型
2. `LayoutsTab` 中的 `layout: any` / `conflict: any` 替换为具体类型
3. ESLint `@typescript-eslint/no-explicit-any` 提升至 `error`

### P2 — IDEMode 继续拆分
1. 提取 `IDETerminal` (~125行)
2. 提取 `IDEMainContent` (编辑器+预览区)
3. 目标: IDEMode.tsx < 800 行

### P3 — Multi-Instance 深化
1. 接入 IDEMode 面板系统（React.lazy 延迟加载）
2. 实现跨标签页 `BroadcastChannel` IPC（替代模拟）
3. 工作区配置持久化到 IndexedDB

---

## 项目健康度指标

| 指标 | P3 阶段 | P4 阶段 | 目标 |
|------|---------|---------|------|
| 最大组件行数 | ~1715 (IDEMode) | ~1715 (IDEMode) | < 500 |
| Settings `any` 数量 | ~15 | **3** (仅 layout 返回值) | 0 |
| Store 数量 | 20 | **21** | stable |
| 测试文件数 | 21 | **22** | > 25 |
| Pre-commit hook | No | **Yes (husky)** | Yes |
| CI lint 强制 | Yes | Yes | Yes |

---

> **YanYuCloudCube** | 万象归元于云枢 | 深栈智启新纪元
>
> P4 阶段交付完成。本地 `pnpm add -D husky lint-staged && npx husky init && pnpm tsc && pnpm test && pnpm lint && pnpm build` 全通过后推送 GitHub！
