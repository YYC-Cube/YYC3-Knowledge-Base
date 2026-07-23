---
@file: README-LOCAL-DEV.md
@description: YYC3 AI Code 本地衔接开发指南 — 从 Figma Make 导出后的完整开发文档
@author: YanYuCloudCube Team <admin@0379.email>
@version: v4.8.0
@created: 2026-03-18
@updated: 2026-03-18
@status: stable
@license: MIT
@tags: readme,local-dev,handoff,guide
---

# YYC3 AI Code — 本地衔接开发指南

> **v4.8.0** | YanYuCloudCube | 言启象限 | 语枢未来

---

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/YY-Nexus/YanYuCloud.git
cd YanYuCloud

# 2. 安装依赖
pnpm install

# 3. 启动开发服务器
pnpm dev

# 4. 构建生产版本
pnpm build

# 5. 类型检查
pnpm tsc --noEmit
```

---

## 项目结构

```
src/app/
├── App.tsx                          # 入口 (RouterProvider)
├── components/                      # 46 个 React 组件
│   ├── IDEMode.tsx                  # 主 IDE 界面 (~1900 行)
│   ├── IDELeftPanel.tsx             # ★ 左侧 6 子面板导航
│   ├── IDEStatusBar.tsx             # ★ 底部状态栏 (从 IDEMode 提取)
│   ├── TaskBoard.tsx                # ★ 5 列看板 (含 blocked)
│   ├── QuickActionsPanel.tsx        # ★ 拖拽浮动工具栏
│   ├── SettingsPanel.tsx            # 设置面板 (~2000 行, 待拆分)
│   ├── CyberEditor.tsx              # Monaco 代码编辑器
│   ├── ModelSettings.tsx            # AI 模型管理
│   ├── FloatingWidget.tsx           # 浮窗模式
│   ├── FullscreenMode.tsx           # 全屏模式
│   └── ...                          # 其余 36 个组件
├── store/                           # 20 个 useSyncExternalStore Store
│   ├── task-store.ts                # ★ v2.0.0 AI推理/子任务/依赖/提醒
│   ├── theme-store.ts               # 双主题 tk tokens
│   ├── model-store.tsx              # AI 模型管理
│   ├── settings-store.ts            # 设置与 AI 规则
│   ├── ide-store.ts                 # IDE 布局状态
│   ├── quick-actions-store.ts       # 18 种 Quick Action
│   ├── file-store.ts                # VFS 文件管理
│   ├── panel-dnd-store.ts           # 面板拖拽
│   └── ...                          # 其余 12 个 Store
├── i18n/
│   ├── translations.ts              # 中英双语翻译 (~950+ 键)
│   └── context.tsx                  # I18n Context Provider
└── styles/
    ├── theme.css                    # Tailwind v4 主题 tokens
    └── fonts.css                    # 字体导入
```

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | React | 18.x |
| 类型 | TypeScript | 5.x |
| 构建 | Vite | 5.x |
| 样式 | Tailwind CSS | v4.0 |
| 状态管理 | useSyncExternalStore | 原生 (零依赖) |
| 编辑器 | Monaco Editor | 0.45.x |
| 图标 | Lucide React | 0.312.0 |
| 动画 | Motion (Framer Motion) | Latest |
| 主题 | 双主题 (Cyberpunk / Clean Modern) | tk tokens |
| 国际化 | 自建 i18n | 中/英 |

---

## 核心架构

### Store 架构 (零依赖)

所有 20 个 Store 使用 `useSyncExternalStore` 原生 React API：

```ts
// 模式
let state = initialState
const listeners = new Set<() => void>()
function subscribe(l) { listeners.add(l); return () => listeners.delete(l) }
function getSnapshot() { return state }

// Hook
export function useXxxStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot)
  return { ...snapshot, ...actions }
}
```

### 主题系统

```ts
const { tokens: tk, isCyberpunk } = useThemeStore()

// 使用
style={{ color: tk.primary, background: tk.panelBg }}
```

### i18n 系统

```ts
const { t, locale } = useI18n()
t("namespace", "key")  // → 自动根据 locale 返回中/英文
```

---

## 本阶段新增功能 (★)

### 1. Task Store v2.0.0

```ts
import { useTaskStore } from './store/task-store'

const {
  tasks, reminders,
  add, update, remove, moveStatus, reorder,
  addSubtask, toggleSubtask, removeSubtask,
  addDependency, removeDependency,
  addReminder, markReminderRead, checkReminders,
  inferTasksFromChat, inferTasksFromCode, importInferredTasks,
  archive, unarchive, getStats,
} = useTaskStore()
```

### 2. IDELeftPanel (6 子面板)

```tsx
<IDELeftPanel
  renderFileExplorer={() => <FileExplorerContent />}
  renderAIChat={() => <AIChatContent />}
  defaultTab="file-explorer"
/>
```

子面板: `file-explorer` | `ai-assistant` | `task-manager` | `global-search` | `quick-access` | `git-integration`

### 3. IDEStatusBar

```tsx
<IDEStatusBar
  selectedFile="App.tsx"
  viewMode="edit"
  fullscreenPreview={false}
  lastAutoSave="12:30"
  onApplyPreset={(presetId) => { ... }}
/>
```

---

## 优先待办

### P0 — 必须完成

| 任务 | 说明 |
|------|------|
| 补充测试 | Store + 组件测试，目标覆盖率 >60% |
| CI/CD | 移动 `workflows/ci.yml` → `.github/workflows/ci.yml` |
| 类型安全 | 消除所有 `any` 类型 |
| SettingsPanel 拆分 | ~2000 行 → 多个 SettingsTab 组件 |

### P1 — 应该完成

| 任务 | 说明 |
|------|------|
| AI 推理对接 | `inferTasksFromChat` 对接真实 `model-store.sendToActiveModel` |
| 全局搜索增强 | 对接 Monaco `editor.findModel` API |
| Git 对接 | `GitMiniPanel` 使用 git-store 真实状态 |
| IDEMode 继续拆分 | 提取 Header (~200 行) + Terminal (~150 行) |

### P2 — 可选改进

| 任务 | 说明 |
|------|------|
| React.lazy 代码分割 | IDEMode / SettingsPanel 懒加载 |
| xterm.js 真实终端 | 替换模拟终端 |
| y.js 实时协作 | 替换模拟协作状态 |
| Tauri 桥接实现 | fs.* / db.* / backup.* Rust 命令 |

---

## 开发规范

### 文件头规范

```ts
/**
 * @file filename.tsx
 * @description 描述
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created YYYY-MM-DD
 * @updated YYYY-MM-DD
 * @status stable
 * @license MIT
 * @tags tag1,tag2
 */
```

### 新增 Store

1. 在 `store/` 目录创建 `xxx-store.ts`
2. 使用 `useSyncExternalStore` 模式
3. 用 `localStorage` 做持久化
4. 导出 `useXxxStore()` Hook 和 `xxxStore` 静态对象

### 新增组件

1. 在 `components/` 目录创建 `ComponentName.tsx`
2. 使用 `useThemeStore()` 获取 `tk` tokens
3. 使用 `useI18n()` 获取 `t()` 翻译函数
4. 添加 `translations.ts` 对应命名空间

### 新增翻译

```ts
// i18n/translations.ts
myNamespace: {
  myKey: { zh: "中文", en: "English" },
},
```

---

## 关键文件说明

| 文件 | 行数 | 说明 |
|------|------|------|
| IDEMode.tsx | ~1900 | 主 IDE 界面 (已提取 StatusBar/LeftPanel) |
| SettingsPanel.tsx | ~2000+ | 设置面板 (待拆分) |
| translations.ts | ~950+ | 全部翻译键 |
| task-store.ts | ~300 | v2.0.0 任务管理核心 |
| IDELeftPanel.tsx | ~500 | 6 子面板导航 |
| theme-store.ts | ~400 | 双主题系统 |

---

## 参考文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 主规范 | `guidelines/Guidelines.md` | 完整提示词系统 |
| 审核报告 | `guidelines/FULL-AUDIT-REPORT.md` | 综合对齐度审核 |
| Task Board 审核 | `guidelines/P1-TASK-BOARD-AUDIT.md` | Task 增强审核 |
| P5 收尾总结 | `docs/YYC3-P5-Closing-Review-Summary.md` | 十二类闭环报告 |
| 设置规范 | `guidelines/YYC3-P1-Settings.md` | 设置面板设计 |
| Quick Actions 规范 | `guidelines/YYC3-P1-AI-quick-actions.md` | Quick Actions 设计 |
| Task Board 规范 | `guidelines/YYC3-P1-AI-task-board.md` | 任务看板设计 |
| Left Panel 规范 | `guidelines/YYC3-P1-left-panel.md` | 左侧面板设计 |

---

> **YanYuCloudCube** | 万象归元于云枢 | 深栈智启新纪元
> **All things converge in cloud pivot; Deep stacks ignite a new era of intelligence**
