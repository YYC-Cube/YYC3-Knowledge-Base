# YYC3 P1-前端-实时预览

## 文档信息
| 字段 | 内容 |
|------|------|
| @file | P1-核心功能/YYC3-P1-前端-实时预览.md |
| @description | 实时预览功能 - 多设备预览/热更新/错误处理 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @status | stable |
| @tags | P1,frontend,preview,real-time |

---

## 功能目标

1. 实时预览：编辑器内容实时渲染
2. 多设备预览：Desktop/Tablet/Mobile
3. 热更新：代码修改自动刷新
4. 错误处理：友好错误提示

## 组件架构

```
PreviewPanel/
├── PreviewToolbar.tsx     # 工具栏 (刷新/自动刷新/全屏)
├── PreviewContainer.tsx   # 预览容器
├── DeviceSelector.tsx     # 设备选择 (Monitor/Tablet/Smartphone)
├── PreviewFrame.tsx       # iframe 预览框架
├── PreviewError.tsx       # 错误提示
└── PreviewLoading.tsx     # 加载状态
```

## 预览状态管理

```typescript
// src/stores/usePreviewStore.ts
export type DeviceType = 'desktop' | 'tablet' | 'mobile' | 'custom';

export interface PreviewState {
  content: string; device: DeviceType;
  customDevice: { width: number; height: number };
  isFullscreen: boolean; showDeviceBorder: boolean;
  autoRefresh: boolean; autoRefreshInterval: number;
  error: string | null; loading: boolean;
}

// Actions: setContent, setDevice, setCustomDevice, toggleFullscreen,
// toggleAutoRefresh, refresh, clearError
```

## 设备配置

```typescript
export const DEVICES: DeviceConfig[] = [
  { type: 'desktop', name: 'Desktop (1920x1080)', width: 1920, height: 1080, dpr: 1 },
  { type: 'desktop', name: 'Desktop (1366x768)', width: 1366, height: 768, dpr: 1 },
  { type: 'tablet', name: 'iPad Pro (1024x768)', width: 1024, height: 768, dpr: 2 },
  { type: 'tablet', name: 'iPad Mini (768x1024)', width: 768, height: 1024, dpr: 2 },
  { type: 'mobile', name: 'iPhone 14 Pro (393x852)', width: 393, height: 852, dpr: 3 },
  { type: 'mobile', name: 'iPhone SE (375x667)', width: 375, height: 667, dpr: 2 },
  { type: 'mobile', name: 'Samsung Galaxy S21 (360x800)', width: 360, height: 800, dpr: 3 },
];
```

## PreviewFrame 核心

```typescript
// iframe sandbox="allow-scripts allow-same-origin"
// 通过 doc.open()/write()/close() 注入 HTML 内容
// 自动注入 viewport meta 和 reset CSS
```

## 样式

- 容器: `#f5f5f5` 背景，全屏固定 `z-index: 9999`
- 设备选择器: 280px 宽侧栏，激活 `#667eea`
- iframe: 白色背景 + `box-shadow`
- 工具栏按钮: 激活 `#667eea` 高亮

## 验收标准

- 实时预览/多设备/热更新正常
- 错误处理/性能优化到位
- 响应速度快、操作流畅
