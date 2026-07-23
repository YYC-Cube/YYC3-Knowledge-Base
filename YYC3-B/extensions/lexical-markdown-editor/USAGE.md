# Lexical Markdown Editor 使用指南

## 功能概览

这是一个基于 Lexical 的交互式 Markdown 编辑器扩展，集成了以下功能：

1. **富文本 Markdown 编辑**：基于 Meta 的 Lexical 框架
2. **TODO 列表管理**：交互式任务列表，支持添加、编辑、删除
3. **设计系统配置**：可视化配置设计规范（字体、颜色、组件库等）

## 基本使用

### 打开编辑器

1. 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux)
2. 输入 `Open Lexical Markdown Editor`
3. 回车打开编辑器

### Markdown 编辑

- 编辑器会自动保存内容（延迟 1 秒）
- 支持所有标准 Markdown 语法
- 实时预览渲染效果

## TODO 列表功能

### 显示 TODO 列表

TODO 列表会在编辑器底部显示（当有 TODO 数据时）。

### 添加新任务

1. 点击 **+New** 按钮
2. 输入任务描述
3. 按 `Enter` 保存

### 编辑任务

- 双击任务文本进入编辑模式
- 修改后按 `Enter` 保存

### 数据持久化

- TODO 列表自动保存到 VS Code 的 globalStorage
- 按 conversationId 组织存储
- 重启 IDE 后数据保留

## 设计配置功能

### 配置项说明

#### 1. Style Keywords（风格关键词）
- 添加设计风格关键词
- 例如：Minimalist, Modern, Clean 等
- 点击 × 删除关键词

#### 2. Font System（字体系统）
- **Font Family**：字体族设置
- **Heading**：大标题字号和字重
- **Subheading**：小标题字号和字重  
- **Body**：正文字号和字重

#### 3. Color System（色彩系统）
- **Primary**：主色调
- **Background**：背景色
- **Text**：文字色
- **Functional**：功能色（可选）

每个颜色支持：
- 点击色块打开颜色选择器
- 手动输入 HEX 颜色值
- 点击 × 删除颜色
- 点击 **+ Add Color** 添加新颜色

#### 4. Component Library（组件库）
选择使用的 UI 组件库：
- None（无）
- MUI (Material-UI)
- shadcn/ui
- TDesign

### 保存配置

- 配置自动保存到 VS Code 的 globalStorage
- 按 conversationId 组织存储
- 可用于 AI 生成设计系统代码

## 数据存储

### 存储位置

```
<VS Code globalStorage>/specs/<conversationId>/
├── todolist.json          # TODO 列表数据
└── design-config.json     # 设计配置数据
```

### 数据格式

**todolist.json**:
```json
{
  "conversationId": "conversation-123",
  "todolist": [
    {
      "id": "todo-1",
      "content": "实现用户登录功能",
      "dependencies": []
    }
  ],
  "lastUpdated": 1234567890
}
```

**design-config.json**:
```json
{
  "conversationId": "conversation-123",
  "config": {
    "styleKeywords": ["Minimalist", "Modern"],
    "fontSystem": {
      "fontFamily": "Inter, sans-serif",
      "heading": { "size": "32px", "weight": 600 },
      "subheading": { "size": "18px", "weight": 500 },
      "body": { "size": "16px", "weight": 400 }
    },
    "colorSystem": {
      "primary": ["#2563EB"],
      "background": ["#F9FAFB"],
      "text": ["#1F2937"]
    },
    "component": "shadcn/ui"
  },
  "lastUpdated": 1234567890
}
```

## 开发和调试

### 构建扩展

```bash
# 编译扩展主代码
npm run compile

# 构建 webview
npm run build:webview
```

### 调试

1. 在 VS Code 中打开扩展目录
2. 按 `F5` 启动扩展开发主机
3. 在新窗口中测试功能

### 监听模式

```bash
# 监听扩展代码变化
npm run watch

# 监听 webview 代码变化
cd webview && npm run watch
```

## 与其他扩展集成

### 从其他扩展调用

```typescript
// 打开编辑器
await vscode.commands.executeCommand('lexicalMarkdown.openEditor');

// 同步 TODO 列表
await vscode.commands.executeCommand('lexicalMarkdown.syncTodoList', {
  conversationId: 'my-conversation',
  todolist: [
    { id: 'todo-1', content: '任务1', dependencies: [] }
  ]
});

// 同步设计配置
await vscode.commands.executeCommand('lexicalMarkdown.syncDesignConfig', {
  conversationId: 'my-conversation',
  config: {
    styleKeywords: ['Modern'],
    fontSystem: { /* ... */ },
    colorSystem: { /* ... */ },
    component: 'MUI'
  }
});
```

## 常见问题

### Q: TODO 列表不显示？
A: 确保通过 `syncTodoList` 命令发送了数据，且 todolist 数组不为空。

### Q: 设计配置不显示？
A: 确保通过 `syncDesignConfig` 命令发送了完整的配置对象。

### Q: 数据丢失了？
A: 数据存储在 VS Code 的 globalStorage 中，检查是否有权限问题。

## 技术栈

- **编辑器**：Lexical (Meta)
- **UI 框架**：React 18
- **构建工具**：Webpack 5
- **语言**：TypeScript 5
- **样式**：CSS + VS Code 主题变量
