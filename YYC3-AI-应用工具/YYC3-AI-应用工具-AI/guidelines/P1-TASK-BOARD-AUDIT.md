---
@file: P1-TASK-BOARD-AUDIT.md
@description: P1 AI Task Board + Quick Actions 增强 + IDEMode 代码分割 实施审核报告
@author: YanYuCloudCube Team <admin@0379.email>
@version: v1.0.0
@created: 2026-03-17
@updated: 2026-03-17
@status: stable
@tags: audit,task-board,quick-actions,code-split,p1
---

# P1 AI Task Board + 增强 实施审核报告

## 1. 实施总览

| 任务 | 状态 | 文件 |
|------|------|------|
| task-store 增强 (AI 推理/子任务/依赖/提醒) | **完成** | `store/task-store.ts` |
| TaskBoard 看板 blocked 列 + 归档过滤 | **完成** | `components/TaskBoard.tsx` |
| QuickActions 拖拽定位 | **完成** | `components/QuickActionsPanel.tsx` |
| IDEMode 代码分割 (StatusBar 提取) | **完成** | `components/IDEStatusBar.tsx` |
| i18n 扩展 (任务看板 + 快捷操作) | **完成** | `i18n/translations.ts` |

## 2. Task Store 增强 (v2.0.0)

### 2.1 新增类型

| 类型 | 说明 |
|------|------|
| `TaskType` | `feature \| bug \| refactor \| test \| documentation \| other` |
| `TaskSource` | `manual \| ai-inferred \| imported` |
| `SubTask` | `{ id, title, isCompleted, createdAt }` |
| `Reminder` | `{ id, taskId, type, message, remindAt, isTriggered, isRead }` |
| `TaskInference` | AI 推理结果 `{ task, confidence, reasoning, context }` |
| `TaskStoreState` | `{ tasks: Task[], reminders: Reminder[] }` |

### 2.2 Task 接口新增字段

```
+ type: TaskType
+ dueDate?: number
+ estimatedHours?: number
+ actualHours?: number
+ subtasks: SubTask[]
+ dependencies: string[]
+ blocking: string[]
+ relatedFiles: string[]
+ relatedMessageId?: string
+ source: TaskSource
+ confidence?: number
+ isArchived: boolean
```

### 2.3 新增 Actions

| Action | 说明 |
|--------|------|
| `addSubtask(taskId, title)` | 添加子任务 |
| `toggleSubtask(taskId, subtaskId)` | 切换子任务完成状态 |
| `removeSubtask(taskId, subtaskId)` | 删除子任务 |
| `addDependency(taskId, depId)` | 添加依赖关系 (双向) |
| `removeDependency(taskId, depId)` | 移除依赖关系 |
| `addReminder(taskId, msg, time, type)` | 添加提醒 |
| `markReminderRead(reminderId)` | 标记已读 |
| `checkReminders()` | 检查到期提醒 |
| `inferTasksFromChat(msgs, sendFn)` | AI 从对话推理任务 |
| `inferTasksFromCode(code, lang, sendFn)` | AI 从代码 TODO 推理 |
| `importInferredTasks(inferences)` | 批量导入推理任务 |
| `archive(id)` / `unarchive(id)` | 归档/取消归档 |
| `getStats()` | 获取看板统计 |

### 2.4 向后兼容

- `migrateTask()` 函数自动为旧格式 Task 填充默认值
- `useTaskStore()` 返回 `{ tasks, reminders, ...actions }` — 解构方式不变
- `add()` 签名扩展为可选 `opts` 参数 — 原有 `add(title, desc, priority, tags)` 调用无需修改

## 3. QuickActions 拖拽定位

### 实现方式

- 内部 `panelPos` state 管理实际位置
- `handleDragStart` 在 header `onMouseDown` 触发
- 通过 `document.addEventListener('mousemove/mouseup')` 实现平滑拖拽
- 边界限制: `Math.max(0, Math.min(window.innerWidth - 200, ...))`
- 拖拽期间 `document.body.style.userSelect = 'none'` 防止文本选中干扰

### 定位同步

- `position` prop 变化时自动同步到 `panelPos`
- 仅在 `visible` 为 true 时同步 (避免隐藏时重置)

## 4. IDEMode 代码分割

### 已提取组件

| 组件 | 行数 | 说明 |
|------|------|------|
| `IDEStatusBar.tsx` | ~155 行 | 底部状态栏 (连接状态/预设选择器/模型状态/DB/插件/离线) |

### IDEMode 精简

- 移除 `presetMenuOpen` state (已移入 IDEStatusBar)
- 替换 ~130 行 footer JSX 为 `<IDEStatusBar ... />`
- 通过 `onApplyPreset` 回调保持布局预设切换功能

### 下一步可分割的区域

| 区域 | 预估行数 | 复杂度 |
|------|----------|--------|
| Header (顶部工具栏) | ~200 行 | 中 (需要传递多个 panel 切换函数) |
| Left Panel (文件树 + AI 聊天) | ~400 行 | 高 (涉及大量 state 交互) |
| Terminal | ~150 行 | 低 (相对独立) |

## 5. TaskBoard 看板增强

### 新增 blocked 列

- `COLUMNS` 数组新增 `{ status: 'blocked', labelKey: 'blocked', color: tk.error }`
- `DEFAULT_COLUMN_ORDER` 扩展为 5 列
- 归档过滤: `tasks.filter(task => task.status === col.status && !task.isArchived)`

### i18n 新增翻译键 (tasks 命名空间)

| Key | 中文 | English |
|-----|------|---------|
| blocked | 已阻塞 | BLOCKED |
| inferFromChat | 从对话提取任务 | Infer from Chat |
| inferring | 推理中... | Inferring... |
| noInferred | 未发现可提取的任务 | No tasks found |
| acceptTask | 接受 | Accept |
| rejectTask | 忽略 | Dismiss |
| confidence | 置信度 | Confidence |
| subtasks | 子任务 | Subtasks |
| dependencies | 依赖 | Dependencies |
| dueDate | 截止日期 | Due Date |
| overdue | 已过期 | Overdue |
| aiInferred | AI 推理 | AI Inferred |
| archive | 归档 | Archive |

## 6. 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `store/task-store.ts` | **重写** | v2.0.0 — AI 推理 + 子任务 + 依赖 + 提醒 |
| `components/TaskBoard.tsx` | **修改** | blocked 列 + 归档过滤 |
| `components/QuickActionsPanel.tsx` | **修改** | 拖拽定位 |
| `components/IDEStatusBar.tsx` | **新建** | 从 IDEMode 提取的状态栏 |
| `components/IDEMode.tsx` | **修改** | StatusBar 提取 + presetMenuOpen 移除 |
| `i18n/translations.ts` | **修改** | 13 个新翻译键 |

## 7. AI 任务推理闭环

```
用户与 AI 对话
    ↓ "从对话提取任务" 按钮
taskStore.inferTasksFromChat(messages, sendToActiveModel)
    ↓ AI 分析对话内容
返回 TaskInference[] — 包含置信度、推理依据
    ↓ 用户确认
taskStore.importInferredTasks(inferences, messageId)
    ↓ 任务创建
TaskBoard 看板显示 (source: 'ai-inferred', confidence badge)
```

## 8. 提醒系统

```
addReminder(taskId, "代码审查截止", dueDate, 'deadline')
    ↓ 定时 checkReminders()
到期触发 → isTriggered: true
    ↓ 通知系统
getUnreadReminderCount() → 未读计数 badge
    ↓ 用户点击
markReminderRead(reminderId)
```

---

> **YanYuCloudCube** | 言启象限 | 语枢未来
