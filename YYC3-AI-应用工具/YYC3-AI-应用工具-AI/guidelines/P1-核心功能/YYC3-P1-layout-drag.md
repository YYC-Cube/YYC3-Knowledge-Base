# YYC3 P1-布局-拖拽交互

## 文档信息
| 字段 | 内容 |
|------|------|
| @file | P1-核心功能/YYC3-P1-布局-拖拽交互.md |
| @description | 拖拽交互系统 - 面板拖拽/调整大小/网格吸附/布局持久化 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @status | stable |
| @tags | P1,layout,drag,drop |

---

## 功能目标

1. 面板拖拽：自由拖拽
2. 调整大小：8 方向调整 (n/s/e/w/ne/nw/se/sw)
3. 网格吸附：可配置网格大小
4. 布局保存：localStorage 持久化
5. 响应式布局
6. 快捷键支持

## 核心状态 (useLayoutStore)

```typescript
interface LayoutState {
  layout: LayoutConfig;
  panels: Panel[];
  selectedPanelId: string | null;
  dragging: {
    panelId: string | null;
    startX: number; startY: number;
    offsetX: number; offsetY: number;
  };
  resizing: {
    panelId: string | null;
    direction: 'n'|'s'|'e'|'w'|'ne'|'nw'|'se'|'sw' | null;
    startX: number; startY: number;
    startWidth: number; startHeight: number;
    startLeft: number; startTop: number;
  };
}
```

## Actions

- `startDrag(panelId, MouseEvent)` → 记录起始位置和偏移
- `onDrag(MouseEvent)` → 计算新位置，网格吸附，边界检查
- `endDrag()` → 重置拖拽状态
- `startResize(panelId, direction, MouseEvent)` → 记录初始尺寸
- `onResize(MouseEvent)` → 按方向计算 delta，最小尺寸限制，网格吸附
- `endResize()` → 重置调整状态
- `saveLayout()` / `restoreLayout()` / `resetLayout()`

## 网格吸附算法

```typescript
if (layout.snapToGrid) {
  newX = Math.round(newX / layout.gridSize) * layout.gridSize;
  newY = Math.round(newY / layout.gridSize) * layout.gridSize;
}
```

## DraggablePanel 组件

```typescript
// 绝对定位，监听 mousemove/mouseup
// 面板头部 cursor: move
// 调整手柄: resize-e (右), resize-s (下), resize-se (右下角三角)
// 支持最小化(只显示头部)、最大化(全屏)
```

## LayoutGrid 组件

```typescript
// 可选网格线背景 (1px solid #3c3c3c)
// backgroundSize: gridSize x gridSize
```

## 样式

- 面板: `#252526` 背景, `1px solid #3c3c3c` 边框
- 选中: `#667eea` 边框 + `box-shadow`
- 调整手柄: 悬停显示 `#667eea`
- 右下角三角: `linear-gradient(135deg, transparent 50%, #667eea 50%)`

## 验收标准

- 拖拽流畅 60fps、调整大小平滑
- 网格吸附/布局保存恢复正常
- 最小尺寸限制、边界检查
