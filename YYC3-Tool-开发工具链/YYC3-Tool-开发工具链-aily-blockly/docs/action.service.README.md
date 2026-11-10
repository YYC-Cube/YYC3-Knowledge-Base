# ActionService 使用说明

这是一个增强的Angular动作服务，支持发送动作并接收反馈。

## 功能特性

- ✅ 发送动作（支持有/无反馈）
- ✅ 监听动作
- ✅ 自动反馈处理
- ✅ 超时控制
- ✅ 错误处理
- ✅ 类型安全

## 基本用法

### 1. 发送简单动作（无需反馈）

```typescript
// 发送一个不需要反馈的动作
this.actionService.dispatch('USER_LOGIN', { username: 'john', password: '***' });
```

### 2. 发送需要反馈的动作（使用回调函数）

```typescript
// 方式1: 使用回调函数
this.actionService.dispatch(
  'SAVE_FILE',
  { filename: 'test.txt', content: 'Hello World' },
  (feedback) => {
    if (feedback.success) {
      console.log('保存成功:', feedback.data);
    } else {
      console.error('保存失败:', feedback.error);
    }
  },
  5000 // 5秒超时
);

// 方式2: 使用 dispatchWithFeedback 返回 Observable
const feedback = await this.actionService.dispatchWithFeedback(
  'SAVE_FILE',
  { filename: 'test.txt', content: 'Hello World' },
  5000
).toPromise();

if (feedback.success) {
  console.log('保存成功:', feedback.data);
} else {
  console.error('保存失败:', feedback.error);
}
```

### 3. 监听动作并处理

```typescript
// 方式1: 使用监听器ID（推荐）
this.actionService.listen(
  'SAVE_FILE',
  async (action) => {
    const { filename, content } = action.payload;
    await this.fileService.save(filename, content);
    return { savedAt: new Date().toISOString() };
  },
  'file-saver' // 监听器ID，便于后续取消
);

// 方式2: 使用返回的取消函数
const unsubscribe = this.actionService.listen(
  'VALIDATE_DATA',
  (action) => {
    return this.validateData(action.payload);
  }
);

// 稍后取消监听
unsubscribe();
```

### 4. 取消监听 (unlisten)

```typescript
// 方式1: 取消指定ID的监听器
this.actionService.unlisten('file-saver');

// 方式2: 取消所有监听器（推荐在组件销毁时使用）
this.actionService.unlistenAll();

// 方式3: 检查监听器是否存在
if (this.actionService.hasListener('file-saver')) {
  this.actionService.unlisten('file-saver');
}

// 获取监听器信息
console.log('监听器数量:', this.actionService.getListenerCount());
console.log('监听器ID列表:', this.actionService.getListenerIds());
```

### 5. 一次性监听

```typescript
// 只监听一次就自动取消订阅
this.actionService.once('INIT_APP', (action) => {
  console.log('应用初始化:', action.payload);
  return { initialized: true };
});
```

### 6. 组件生命周期管理

```typescript
export class MyComponent implements OnDestroy {
  ngOnInit() {
    // 设置监听器时使用ID
    this.actionService.listen('SAVE_FILE', this.handleSave, 'save-handler');
    this.actionService.listen('DELETE_FILE', this.handleDelete, 'delete-handler');
  }

  ngOnDestroy() {
    // 一次性清理所有监听器
    this.actionService.unlistenAll();
  }

  // 或者单独管理
  startFileWatcher() {
    if (!this.actionService.hasListener('file-watcher')) {
      this.actionService.listen('FILE_CHANGE', this.handleFileChange, 'file-watcher');
    }
  }

  stopFileWatcher() {
    this.actionService.unlisten('file-watcher');
  }
}
```

## 接口定义

### Action 接口

```typescript
interface Action<T = any> {
  type: string;           // 动作类型
  payload?: T;           // 动作数据
  timestamp?: number;    // 时间戳
  id?: string;          // 动作ID（用于反馈）
  requireFeedback?: boolean; // 是否需要反馈
}
```

### ActionFeedback 接口

```typescript
interface ActionFeedback<T = any> {
  actionId: string;     // 对应的动作ID
  success: boolean;     // 是否成功
  data?: T;            // 反馈数据
  error?: string;      // 错误信息
  timestamp: number;   // 反馈时间戳
}
```

## 方法说明

### 发送动作

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `dispatch(type, payload?, feedbackCallback?, timeoutMs?)` | 发送动作，如果提供回调函数则等待反馈 | `void` |
| `dispatchWithFeedback(type, payload?, timeoutMs?)` | 发送需要反馈的动作 | `Observable<ActionFeedback>` |

### 监听动作

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `listen<T,R>(actionType, handler, id?)` | 监听动作并处理（自动反馈） | `() => void` |
| `listenMultiple<T,R>(actionTypes, handler, id?)` | 监听多个动作类型 | `() => void` |
| `listenAll<R>(handler, id?)` | 监听所有动作 | `() => void` |
| `once<T,R>(actionType, handler)` | 一次性监听 | `() => void` |

### 监听器管理

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `unlisten(id)` | 取消指定ID的监听器 | `boolean` |
| `unlistenAll()` | 取消所有监听器 | `void` |
| `hasListener(id)` | 检查监听器是否存在 | `boolean` |
| `getListenerCount()` | 获取监听器数量 | `number` |
| `getListenerIds()` | 获取所有监听器ID | `string[]` |

### 反馈处理

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `sendFeedback(actionId, success, data?, error?)` | 发送反馈 | `void` |
| `getFeedbackStream()` | 获取反馈流 | `Observable<ActionFeedback>` |

## 使用场景

### 1. 组件间通信
```typescript
// 组件A请求数据（使用回调）
this.actionService.dispatch('GET_USER_DATA', { userId: 123 }, (feedback) => {
  if (feedback.success) {
    console.log('用户数据:', feedback.data);
  }
});

// 或使用Observable方式
const userFeedback = await this.actionService.dispatchWithFeedback('GET_USER_DATA', { userId: 123 }).toPromise();

// 组件B处理请求
this.actionService.listen('GET_USER_DATA', async (action) => {
  return await this.userService.getUser(action.payload.userId);
});
```

### 2. 异步操作确认
```typescript
// 保存数据并等待确认（使用回调）
this.actionService.dispatch('SAVE_SETTINGS', settings, (feedback) => {
  if (feedback.success) {
    this.showSuccessMessage('设置已保存');
  } else {
    this.showErrorMessage(feedback.error || '保存失败');
  }
});
```

### 3. 权限验证
```typescript
// 检查权限（使用Observable）
const permissionFeedback = await this.actionService.dispatchWithFeedback(
  'CHECK_PERMISSION', 
  { action: 'delete', resource: 'file' }
).toPromise();

if (permissionFeedback.success) {
  // 执行删除操作
} else {
  this.showErrorMessage('没有权限执行此操作');
}
```

## 注意事项

1. **内存泄漏防护**: 记得在组件销毁时取消订阅
2. **超时处理**: 为需要反馈的动作设置合理的超时时间
3. **错误处理**: 在处理函数中要妥善处理异常
4. **类型安全**: 使用泛型确保类型安全

## 最佳实践

1. 为不同的业务场景定义清晰的动作类型常量
2. 使用有意义的错误消息
3. 对于长时间运行的操作，考虑发送进度反馈
4. 在开发环境下监听反馈流进行调试

```typescript
// 定义动作类型常量
export const ActionTypes = {
  SAVE_FILE: 'SAVE_FILE',
  DELETE_FILE: 'DELETE_FILE',
  VALIDATE_DATA: 'VALIDATE_DATA',
  // ...
} as const;

// 在开发环境下监听反馈
if (!environment.production) {
  this.actionService.getFeedbackStream().subscribe(feedback => {
    console.log('Action feedback:', feedback);
  });
}
```
