# 工作流系统测试文档

本目录包含工作流系统的所有测试用例，使用Jest作为测试框架。测试涵盖了工作流系统的核心功能和组件。

## 测试目录结构

```
tests/workflow/
├── components/           # React组件测试
│   ├── approval-tasks.test.tsx       # 审批任务组件测试
│   └── workflow-designer.test.tsx    # 工作流设计器组件测试
├── utils/                # 服务和工具函数测试
│   └── workflow-engine.service.test.ts  # 工作流引擎服务测试
└── README.md             # 测试说明文档
```

## 测试覆盖范围

### 组件测试
- **ApprovalTasks组件**：测试任务列表展示、筛选功能、任务审批/拒绝流程、评论功能以及错误处理
- **WorkflowDesigner组件**：测试节点拖拽、连接、工作流保存、清空画布等功能

### 服务测试
- **WorkflowEngineService**：测试所有API调用函数，包括任务获取、审批/拒绝、工作流实例管理、统计数据获取等

## 运行测试

### 安装依赖

确保已安装所有项目依赖：

```bash
npm install
# 或者使用pnpm
pnpm install
```

### 运行所有工作流测试

```bash
npm run test -- -t "workflow" --coverage
# 或者
pnpm run test -- -t "workflow" --coverage
```

### 运行特定测试文件

```bash
# 运行组件测试
npm run test tests/workflow/components/approval-tasks.test.tsx
npm run test tests/workflow/components/workflow-designer.test.tsx

# 运行服务测试
npm run test tests/workflow/utils/workflow-engine.service.test.ts
```

### 监视模式运行

在开发过程中，可以使用监视模式实时查看测试结果：

```bash
npm run test:watch -- -t "workflow"
# 或者
pnpm run test:watch -- -t "workflow"
```

## 测试覆盖率报告

运行测试时添加`--coverage`参数可以生成测试覆盖率报告：

```bash
npm run test -- -t "workflow" --coverage
```

覆盖率报告将在`coverage`目录下生成，打开`coverage/lcov-report/index.html`可以查看详细的覆盖率信息。

## 测试最佳实践

1. **测试命名规范**：使用清晰的描述性名称，格式为`should [期望行为] when [条件]`
2. **测试隔离**：每个测试用例应测试一个具体的功能点
3. **模拟外部依赖**：使用Jest的mock功能模拟API调用和外部依赖
4. **测试边缘情况**：包括空数据、错误状态、边界条件等
5. **代码覆盖率**：争取达到较高的代码覆盖率，但更注重测试关键业务逻辑

## 注意事项

1. 测试文件应与被测试文件保持相同的目录结构
2. 测试数据应使用mock数据，避免依赖真实数据库
3. 运行测试前确保开发服务器已经关闭，避免端口冲突
4. 定期更新测试用例，确保与业务逻辑同步