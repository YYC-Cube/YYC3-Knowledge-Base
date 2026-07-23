# 智能体接口契约

**版本**: 1.59D  
**最后更新**: 2026-04-02

---

## 一、智能体基类接口

所有智能体必须实现 `AgentBase` 接口。

### 1.1 构造函数

```typescript
constructor(config: {
  agentId?: string;
  agentName: string;
  agentType: string;
  capabilities: string[];
  eventBus?: EventBus;
  maxConcurrentTasks?: number;
})
```

**参数说明**:
- `agentId`: 智能体唯一标识(可选,自动生成)
- `agentName`: 智能体名称(必填)
- `agentType`: 智能体类型(必填)
- `capabilities`: 智能体能力列表(必填)
- `eventBus`: 事件总线实例(可选,自动创建)
- `maxConcurrentTasks`: 最大并发任务数(可选,默认1)

### 1.2 公开方法

#### start()
**描述**: 启动智能体
**返回**: `void`

```typescript
start(): void
```

#### stop()
**描述**: 停止智能体
**返回**: `void`

```typescript
stop(): void
```

#### assignTask()
**描述**: 分配任务
**参数**:
- `task`: 任务对象

**返回**: `Promise<object>` - 任务结果

```typescript
assignTask(task: {
  taskId: string;
  state: string;
  payload: any;
}): Promise<object>
```

#### executeTask()
**描述**: 执行任务(子类必须实现)
**参数**:
- `task`: 任务对象

**返回**: `Promise<object>` - 任务结果

```typescript
executeTask(task: {
  taskId: string;
  state: string;
  payload: any;
}): Promise<object>
```

#### handleMessage()
**描述**: 处理消息
**参数**:
- `topic`: 消息主题
- `message`: 消息对象

**返回**: `Promise<void>`

```typescript
handleMessage(topic: string, message: object): Promise<void>
```

#### publishEvent()
**描述**: 发布事件
**参数**:
- `topic`: 事件主题
- `payload`: 事件负载

**返回**: `void`

```typescript
publishEvent(topic: string, payload: object): void
```

#### getMetrics()
**描述**: 获取性能指标
**返回**: 性能指标对象

```typescript
getMetrics(): {
  tasksCompleted: number;
  tasksFailed: number;
  avgDurationMs: number;
  totalDurationMs: number;
  successRate: number;
  state: string;
  currentTask: object | null;
  queueLength: number;
}
```

---

## 二、编排器接口

编排器用于管理工作流和协调智能体。

### 2.1 ESMOrchestrator 接口

#### startWorkflow()
**描述**: 启动工作流
**参数**:
- `request`: 工作流请求

**返回**: `Promise<object>` - 工作流结果

```typescript
startWorkflow(request: {
  chapterId: string;
  bookRoot: string;
  topic?: string;
  reader?: string;
  genre?: string;
  mode?: 'parallel_writing' | 'single_writer';
}): Promise<object>
```

#### transitionTo()
**描述**: 状态转换
**参数**:
- `chapterId`: 章节ID
- `targetState`: 目标状态
- `payload`: 转换负载

**返回**: `Promise<void>`

```typescript
transitionTo(
  chapterId: string,
  targetState: string,
  payload?: object
): Promise<void>
```

#### getCurrentState()
**描述**: 获取当前状态
**参数**:
- `chapterId`: 章节ID

**返回**: `string` - 当前状态

```typescript
getCurrentState(chapterId: string): string
```

#### getStateHistory()
**描述**: 获取状态历史
**参数**:
- `chapterId`: 章节ID

**返回**: `array` - 状态历史

```typescript
getStateHistory(chapterId: string): array
```

### 2.2 ParallelOrchestrator 接口

#### startParallelWorkflow()
**描述**: 启动并行工作流
**参数**:
- `chapters`: 章节列表

**返回**: `Promise<object>` - 工作流结果

```typescript
startParallelWorkflow(chapters: Array<{
  chapterId: string;
  bookRoot: string;
  topic?: string;
  reader?: string;
  genre?: string;
}>): Promise<object>
```

#### getWorkflowStatus()
**描述**: 获取工作流状态
**参数**:
- `workflowId`: 工作流ID

**返回**: `object` - 工作流状态

```typescript
getWorkflowStatus(workflowId: string): object
```

#### stopWorkflow()
**描述**: 停止工作流
**参数**:
- `workflowId`: 工作流ID

**返回**: `void`

```typescript
stopWorkflow(workflowId: string): void
```

#### getAllWorkflows()
**描述**: 获取所有工作流
**返回**: `array` - 工作流列表

```typescript
getAllWorkflows(): array
```

### 2.3 PipelineOrchestrator 接口

#### start()
**描述**: 启动流水线
**返回**: `void`

```typescript
start(): void
```

#### stop()
**描述**: 停止流水线
**返回**: `void`

```typescript
stop(): void
```

#### submitTask()
**描述**: 提交任务
**参数**:
- `task`: 任务对象

**返回**: `Promise<object>` - 任务结果

```typescript
submitTask(task: object): Promise<object>
```

#### getStatus()
**描述**: 获取流水线状态
**返回**: `object` - 流水线状态

```typescript
getStatus(): {
  pipelineId: string;
  isRunning: boolean;
  inputQueue: number;
  outputQueue: number;
  stages: array;
  stats: object;
  throughput: number;
}
```

---

## 三、事件契约

### 3.1 事件主题规范

#### 任务事件

| 事件 | 参数 | 说明 |
|------|------|------|
| `task.assign` | `{ taskId, state, payload }` | 任务分配 |
| `task.complete` | `{ taskId, result, duration }` | 任务完成 |
| `task.failure` | `{ taskId, error }` | 任务失败 |

#### 验证事件

| 事件 | 参数 | 说明 |
|------|------|------|
| `validation.result` | `{ validationType, passed, report, errors }` | 验证结果 |

#### 审计事件

| 事件 | 参数 | 说明 |
|------|------|------|
| `audit.result` | `{ auditType, passed, report, errors }` | 审计结果 |

#### 智能体事件

| 事件 | 参数 | 说明 |
|------|------|------|
| `agent.started` | `{ agentId, agentName }` | 智能体启动 |
| `agent.stopped` | `{ agentId, agentName }` | 智能体停止 |
| `agent.error` | `{ agentId, agentName, error }` | 智能体错误 |

#### 状态事件

| 事件 | 参数 | 说明 |
|------|------|------|
| `esm.transition.start` | `{ chapterId, fromState, targetState, payload }` | ESM转换开始 |
| `esm.transition.complete` | `{ chapterId, fromState, targetState, payload }` | ESM转换完成 |
| `esm.state.announce` | `{ chapterId, currentState, fromState }` | 状态宣告 |

---

## 四、配置契约

### 4.1 智能体配置

```typescript
interface AgentConfig {
  agentId?: string;
  agentName: string;
  agentType: string;
  capabilities: string[];
  eventBus?: EventBus;
  maxConcurrentTasks?: number;
}
```

### 4.2 编排器配置

```typescript
interface OrchestratorConfig {
  maxConcurrency?: number;
  maxConcurrencyPerStage?: number;
  queueSize?: number;
  bookRoot?: string;
  mode?: 'serial' | 'parallel' | 'pipeline';
}
```

### 4.3 事件总线配置

```typescript
interface EventBusConfig {
  enablePersistence?: boolean;
  enableDeduplication?: boolean;
  persistencePath?: string | null;
  maxListeners?: number;
}
```

---

## 五、返回值契约

### 5.1 任务结果

```typescript
interface TaskResult {
  taskId: string;
  status: 'success' | 'failure' | 'partial';
  result: any;
  errors?: string[];
  warnings?: string[];
  metrics?: {
    durationMs: number;
    tokensUsed?: number;
  };
}
```

### 5.2 验证结果

```typescript
interface ValidationResult {
  validationType: string;
  passed: boolean;
  report: string;
  errors?: string[];
  validatedAt: string;
}
```

### 5.3 工作流结果

```typescript
interface WorkflowResult {
  workflowId?: string;
  status: 'completed' | 'partial' | 'failed' | 'stopped';
  startTime: number;
  endTime?: number;
  duration?: number;
  chapters?: {
    total: number;
    completed: number;
    failed: number;
    details?: any[];
  };
  successRate?: number;
}
```

---

## 六、错误处理契约

### 6.1 错误类型

| 错误类型 | 说明 | 处理策略 |
|---------|------|---------|
| `ValidationError` | 验证失败 | 记录日志,返回错误结果 |
| `TaskTimeoutError` | 任务超时 | 重试或降级 |
| `AgentUnavailableError` | 智能体不可用 | 等待或使用其他智能体 |
| `WorkflowAbortedError` | 工作流中止 | 清理资源,返回错误 |

### 6.2 重试策略

| 错误类型 | 最大重试次数 | 重试延迟 | 降级策略 |
|---------|------------|---------|---------|
| `ValidationError` | 0 | - | 不重试 |
| `TaskTimeoutError` | 3 | 1秒,2秒,4秒 | 跳过 |
| `AgentUnavailableError` | 3 | 1秒,2秒,4秒 | 等待 |
| `WorkflowAbortedError` | 0 | - | 不重试 |

---

## 七、性能契约

### 7.1 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 任务平均耗时 | < 30秒 | 单个任务执行时间 |
| 智能体启动时间 | < 1秒 | 智能体初始化时间 |
| 事件处理延迟 | < 100ms | 事件处理延迟 |
| 内存占用 | < 500MB | 单个智能体内存占用 |
| CPU占用 | < 50% | 单个智能体CPU占用 |

### 7.2 并发限制

| 智能体类型 | 最大并发 | 说明 |
|-----------|---------|------|
| ResearchAgent | 2 | 限制并发数 |
| WritingAgent | 3 | 可配置 |
| ReviewAgent | 2 | 限制并发数 |
| AuditAgent | 2 | 限制并发数 |
| ValidationAgent | 3 | 可配置 |
| DeployAgent | 2 | 限制并发数 |

---

## 八、版本契约

所有组件必须遵循以下版本契约:

1. **版本号格式**: `major.minor.patch`
2. **版本兼容**: 主版本号不一致时不兼容
3. **版本升级**: 必须更新版本号和CHANGELOG
4. **版本回退**: 不支持主版本号回退

---

**文档版本**: 1.59D  
**最后更新**: 2026-04-02  
**维护者**: AI Coding Assistant
