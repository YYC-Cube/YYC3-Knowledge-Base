## 🛠️ 技术实现规范

### 技术栈规范

#### 前端框架

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型系统 |
| Vite | 5.x | 构建工具 |

#### 状态管理

| 技术 | 版本 | 用途 |
|------|------|------|
| Zustand | 4.x | 全局状态管理 |
| Immer | 10.x | 不可变状态更新 |
| React Query | 5.x | 服务端状态管理 |

#### 布局引擎

| 技术 | 版本 | 用途 |
|------|------|------|
| react-grid-layout | 1.x | 网格布局 |
| react-dnd | 16.x | 拖拽功能 |

#### 实时协同

| 技术 | 版本 | 用途 |
|------|------|------|
| yjs | 13.x | CRDT 数据结构 |
| y-websocket | 2.x | WebSocket 传输 |

#### 表单验证

| 技术 | 版本 | 用途 |
|------|------|------|
| react-hook-form | 7.x | 表单管理 |
| zod | 3.x | Schema 验证 |

#### AI 集成

| 技术 | 版本 | 用途 |
|------|------|------|
| OpenAI API | Latest | AI 服务 |

#### 代码编辑

| 技术 | 版本 | 用途 |
|------|------|------|
| monaco-editor | 0.45.x | 代码编辑器 |

#### 样式系统

| 技术 | 版本 | 用途 |
|------|------|------|
| Tailwind CSS | 3.x | 样式框架 |

### 代码规范

#### 命名规范

**文件命名**：
- 组件文件：PascalCase（如 `PanelManager.tsx`）
- 工具文件：camelCase（如 `utils.ts`）
- 类型文件：PascalCase（如 `types.ts`）

**变量命名**：
- 常量：UPPER_SNAKE_CASE（如 `MAX_PANELS`）
- 变量：camelCase（如 `panelCount`）
- 类型/接口：PascalCase（如 `PanelSpec`）

**函数命名**：
- 普通函数：camelCase（如 `calculateLayout`）
- 事件处理：handleXxx（如 `handleDrag`）
- 异步函数：async + camelCase（如 `fetchData`）

#### 代码组织

**组件结构**：
```typescript
// 1. 导入
import { useState, useEffect } from 'react';
import { usePanelStore } from '@/stores/panel';

// 2. 类型定义
interface PanelProps {
  id: string;
  title: string;
}

// 3. 组件定义
export function Panel({ id, title }: PanelProps) {
  // 4. Hooks
  const [isOpen, setIsOpen] = useState(false);
  const { updatePanel } = usePanelStore();

  // 5. 事件处理
  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // 6. 渲染
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={handleToggle}>
        {isOpen ? 'Close' : 'Open'}
      </button>
    </div>
  );
}
```
