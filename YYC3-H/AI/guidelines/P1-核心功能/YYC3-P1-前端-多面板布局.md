# YYC3 P1-前端-多面板布局

## 文档信息
| 字段 | 内容 |
|------|------|
| @file | P1-核心功能/YYC3-P1-前端-多面板布局.md |
| @description | 多面板布局系统 - 面板创建/删除/拖拽/调整/合并/拆分/Tab |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @status | stable |
| @tags | P1,frontend,multi-panel-layout |

---

## 功能目标

实现灵活、高效、用户友好的多面板布局系统。

## 面板类型

```typescript
export type PanelType =
  | 'code-editor' | 'file-browser' | 'preview'
  | 'terminal' | 'debug' | 'output'
  | 'search' | 'ai-chat' | 'database' | 'version-control';
```

## 核心数据结构

```typescript
export interface Panel {
  id: string; type: PanelType; title: string;
  content: React.ReactNode;
  position: { x: number; y: number; w: number; h: number };
  minW?: number; minH?: number;
  isLocked: boolean; isMinimized: boolean; isMaximized: boolean;
  zIndex: number; tabs: Tab[]; activeTabId: string;
}

export interface Tab {
  id: string; panelId: string; title: string;
  content: React.ReactNode; isPinned: boolean;
  isModified: boolean; isUnsaved: boolean;
  hasError: boolean; isActive: boolean;
}

export interface LayoutConfig {
  panels: Panel[]; layout: 'grid' | 'split' | 'tabs' | 'custom';
  theme: 'light' | 'dark' | 'auto';
  showGridLines: boolean; snapToGrid: boolean; gridSize: number;
}
```

## 组件架构

```
MultiPanel/
├── LayoutProvider.tsx      # Context 全局状态
├── Workspace.tsx           # 主工作区 (12x12 Grid)
├── PanelContainer.tsx      # 面板容器 (react-dnd 拖拽)
├── Panel.tsx               # 面板组件
├── PanelHeader.tsx         # 面板头 (Lock/Min/Max/Close)
├── PanelContent.tsx        # 面板内容
├── TabBar.tsx              # 标签栏
├── PanelResizeHandle.tsx   # 调整大小手柄
├── PanelToolbar.tsx        # 面板工具栏 (添加/保存/重置)
└── styles.css
```

## LayoutProvider (核心 Context)

```typescript
interface LayoutContextType {
  panels: Panel[]; activePanelId: string | null; layoutConfig: LayoutConfig;
  // Panel operations
  addPanel, removePanel, updatePanel, movePanel, resizePanel,
  lockPanel, minimizePanel, maximizePanel;
  // Tab operations
  addTab, removeTab, switchTab, updateTab;
  // Layout operations
  setActivePanel, updateLayoutConfig, saveLayout, loadLayout, resetLayout;
}
```

## 默认布局

```json
{
  "panels": [
    { "type": "file-browser", "title": "文件浏览器", "position": { "x":0,"y":0,"w":3,"h":12 } },
    { "type": "code-editor", "title": "代码编辑器", "position": { "x":3,"y":0,"w":6,"h":12 } },
    { "type": "preview", "title": "实时预览", "position": { "x":9,"y":0,"w":3,"h":12 } }
  ]
}
```

## 样式规范

- 赛博朋克深色: `#0f172a` → `#1e293b` 渐变
- 激活面板: `2px solid #6366f1` + `box-shadow: 0 0 20px rgba(99,102,241,0.3)`
- 面板头: 激活 `rgba(99,102,241,0.2)`，悬停 `rgba(99,102,241,0.3)`
- 标签: 激活 `rgba(99,102,241,0.3)` + 底部 `2px solid #6366f1`
- 滚动条: 轨道 `rgba(15,23,42,0.5)`，滑块 `rgba(99,102,241,0.5)`

## 依赖

- react-grid-layout, react-dnd, react-dnd-html5-backend
- react-resizable, react-split-pane, react-tabs

## 验收标准

- 面板 CRUD、拖拽移动、调整大小正常
- 锁定/最小化/最大化正常
- 标签页 CRUD/切换正常
- 布局保存/加载/重置正常
- 面板操作响应 <100ms，拖拽 60fps
