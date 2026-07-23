# Lexical Markdown Editor

基于 Lexical 的交互式 Markdown 编辑器扩展，集成 TODO 列表和设计系统配置功能。

## ✨ 功能特性

### 核心功能

- 🎨 **富文本编辑**：基于 Meta 的 Lexical 框架，流畅的编辑体验
- 💾 **自动保存**：实时保存编辑内容（延迟 1 秒）
- 🔄 **Markdown 支持**：完整的 Markdown 语法支持

### TODO 列表管理

- ✅ **交互式任务列表**：可视化管理任务
- ➕ **快速添加**：点击 +New 按钮即可添加新任务
- ✏️ **双击编辑**：双击任务内容快速编辑
- 💾 **持久化存储**：自动保存到 VS Code globalStorage

### 设计系统配置

- 🎨 **风格关键词**：定义设计风格标签
- 🔤 **字体系统**：配置标题、正文字体规范
- 🎨 **色彩系统**：可视化配置主色、背景色、文字色
- 📦 **组件库选择**：支持 MUI、shadcn/ui、TDesign 等
- 👁️ **实时预览**：字体配置实时预览效果

## 🚀 快速开始

### 打开编辑器

1. 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux)
2. 输入 `Open Lexical Markdown Editor`
3. 开始编辑！

### 使用 TODO 列表

```typescript
// 从其他扩展发送 TODO 列表数据
await vscode.commands.executeCommand("lexicalMarkdown.syncTodoList", {
	conversationId: "my-conversation-id",
	todolist: [
		{ id: "todo-1", content: "实现登录功能", dependencies: [] },
		{ id: "todo-2", content: "添加单元测试", dependencies: ["todo-1"] },
	],
});
```

### 配置设计系统

```typescript
// 从其他扩展发送设计配置
await vscode.commands.executeCommand("lexicalMarkdown.syncDesignConfig", {
	conversationId: "my-conversation-id",
	config: {
		styleKeywords: ["Minimalist", "Modern", "Clean"],
		fontSystem: {
			fontFamily: 'Inter, "PingFang SC", sans-serif',
			heading: { size: "32px", weight: 600 },
			subheading: { size: "18px", weight: 500 },
			body: { size: "16px", weight: 400 },
		},
		colorSystem: {
			primary: ["#2563EB"],
			background: ["#F9FAFB"],
			text: ["#1F2937"],
		},
		component: "shadcn/ui",
	},
});
```

## 📖 详细文档

查看 [USAGE.md](./USAGE.md) 了解完整的使用指南。

## 🛠️ 开发

### 安装依赖

```bash
# 安装扩展依赖
npm install

# 安装 webview 依赖
cd webview && npm install
```

### 构建

```bash
# 编译扩展
npm run compile

# 构建 webview
npm run build:webview

# 监听模式
npm run watch
```

### 调试

1. 按 F5 启动扩展开发主机
2. 在新窗口中运行命令：`Open Lexical Markdown Editor`

## 📁 目录结构

```
lexical-markdown-editor/
├── src/                          # 扩展主代码
│   ├── extension.ts             # 扩展入口
│   ├── types/
│   │   └── designConfig.d.ts   # 类型定义
│   └── commands/
│       ├── syncTodoList.ts     # TODO 列表同步命令
│       └── syncDesignConfig.ts # 设计配置同步命令
├── webview/                     # Webview 前端代码
│   ├── src/
│   │   ├── index.tsx           # React 入口
│   │   ├── Editor.css          # 编辑器样式
│   │   ├── plugins/            # Lexical 插件
│   │   │   ├── SavePlugin.tsx  # 自动保存插件
│   │   │   └── MarkdownPlugin.tsx # Markdown 插件
│   │   └── panels/             # 功能面板
│   │       ├── TodoListPanel.tsx      # TODO 列表面板
│   │       └── DesignConfigPanel.tsx  # 设计配置面板
│   ├── package.json            # Webview 依赖
│   └── webpack.config.js       # Webpack 配置
├── package.json                # 扩展配置
├── README.md                   # 项目说明
└── USAGE.md                    # 使用指南
```

## 🎯 使用场景

1. **AI 辅助开发**：与 AI 代码助手集成，可视化管理任务和设计规范
2. **项目规划**：使用 TODO 列表跟踪开发任务
3. **设计系统**：配置和管理项目的设计规范
4. **文档编写**：富文本 Markdown 编辑体验

## 🔌 API 接口

### 命令

- `lexicalMarkdown.openEditor` - 打开编辑器
- `lexicalMarkdown.syncTodoList` - 同步 TODO 列表
- `lexicalMarkdown.syncDesignConfig` - 同步设计配置

### 消息类型

**发送到 Webview**:

- `loadMarkdown` - 加载 Markdown 内容
- `syncTodoList` - 同步 TODO 列表数据
- `syncDesignConfig` - 同步设计配置数据

**从 Webview 接收**:

- `save` - 保存 Markdown 内容
- `updateTodoList` - 更新 TODO 列表
- `updateDesignConfig` - 更新设计配置

## License

MIT
