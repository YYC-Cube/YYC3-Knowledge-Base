# WebviewPanel 迁移完成

## ✅ 已完成的改动

### 1. **package.json**
- ✅ 移除 `customEditors` 配置
- ✅ 移除 `onCustomEditor:lexicalMarkdown.editor` 激活事件
- ✅ 移除废弃命令：`syncSpec`, `syncTodoList`, `syncDesignConfig`
- ✅ 保留核心命令：`lexicalMarkdown.openEditor`

### 2. **extension.ts**
- ✅ 移除 `CustomTextEditorProvider` 类
- ✅ 新增 `LexicalMarkdownEditorManager` 类（使用 WebviewPanel）
- ✅ 重构 `lexicalMarkdown.openEditor` 命令逻辑
- ✅ 保留所有消息处理逻辑（数据同步由你管理）
- ✅ 保留所有功能函数：
  - `updateTextDocument()` - 文件保存
  - `switchToMarkdownSource()` - 切换到源码
  - `switchToPreviewMode()` - 切换回预览
  - `handleUpdateTodoList()` - TODO 更新（已移除外部命令调用）
  - `handleUpdateDesignConfig()` - 设计配置更新（已移除外部命令调用）
  - `handleBuildTodos()` - TODO 构建
  - `handlePlanContentUpdate()` - Plan 内容更新

## 🎯 核心变化

### URI Scheme 变化
```typescript
// 之前 (CustomTextEditor)
resource = file:///path/to/plans/{conversationId}/plan.md

// 现在 (WebviewPanel)
resource = webview-panel://webview-panel/webview-{uuid}
```

### 打开方式变化
```typescript
// 之前
await vscode.commands.executeCommand(
  'vscode.openWith',
  targetUri,
  'lexicalMarkdown.editor'
);

// 现在
await vscode.commands.executeCommand(
  'lexicalMarkdown.openEditor',
  { uri: targetUri, part: 'todolist' }
);
```

### WebviewPanel 管理
```typescript
// 单例模式，防止重复打开
const existingPanel = LexicalMarkdownEditorManager.webviewPanels.get(conversationId);
if (existingPanel) {
  existingPanel.reveal(); // 显示已存在的 panel
}
```

## 📝 你需要注意的数据同步部分

所有数据同步逻辑**已保留并正常工作**：

### 1. **文件保存**
```typescript
// Webview -> Extension
message.type = 'saveMarkdown'

// Extension -> FileSystem
await updateTextDocument(fileUri, message.content);
```

### 2. **Plan 数据加载**
```typescript
// 从文件系统加载
planData = await PlanDataLoader.loadPlan(context, conversationId);

// 发送到 Webview
window.initialMarkdown = planData.content;
window.initialTodoList = planData.todolist;
window.initialDesignConfig = planData.design;
```

### 3. **Plan 数据刷新**
```typescript
// 通过 ReloadPlanCommand 刷新
ReloadPlanCommand.registerWebviewPanel(conversationId, panel);

// 发送刷新消息
panel.webview.postMessage({
  type: 'reloadPlan',
  content: planData.content,
  todolist: planData.todolist,
  design: planData.design
});
```

### 4. **外部命令集成**
```typescript
// ⚠️ 已移除的废弃命令（不再调用）
// - lexicalMarkdown.syncTodoList
// - lexicalMarkdown.syncDesignConfig
// - lexicalMarkdown.syncSpec

// ✅ 仍在使用的外部命令
// Plan 内容更新（推荐使用，统一更新接口）
await vscode.commands.executeCommand('CodeBuddy.plan.markdownUpdate', { ... });

// 构建 TODO
await vscode.commands.executeCommand('tencentcloud.codingcopilot.chat.sendMessage', { ... });
```

## ✨ 新特性

### 1. **面包屑自动隐藏**
- WebviewPanel 使用 `webview-panel://` scheme
- `fileService.hasProvider()` 返回 `false`
- 面包屑自动隐藏 ✅

### 2. **更灵活的生命周期管理**
```typescript
// Panel 可以独立于文件存在
panel.onDidDispose(() => {
  LexicalMarkdownEditorManager.webviewPanels.delete(conversationId);
});
```

### 3. **滚动到指定部分**
```typescript
// 打开时指定滚动位置
await vscode.commands.executeCommand('lexicalMarkdown.openEditor', {
  uri: targetUri,
  part: 'todolist' // 或 'design'
});

// Webview 接收参数
window.scrollToPart = 'todolist';
```

## 🧪 测试建议

### 测试场景：
1. ✅ 打开 plan.md 文件，检查面包屑是否隐藏
2. ✅ 修改内容后保存，检查文件是否正确更新
3. ✅ 切换到源码模式（双列显示）
4. ✅ 从源码模式切换回预览模式
5. ✅ 同一文件重复打开，检查是否复用 panel
6. ✅ 外部修改文件后，你自己管理的数据同步是否正常
7. ✅ ReloadPlanCommand 刷新是否正常
8. ✅ 滚动到指定部分（todolist/design）

### 验证 URI：
```typescript
// 打开 DevTools Console
console.log(vscode.window.activeTextEditor?.document.uri.toString());
// 应该显示: webview-panel://webview-panel/webview-{uuid}
```

## 🔄 与其他扩展的兼容性

### CodeBuddy 主扩展
- ✅ `CodeBuddy.plan.markdownUpdate` - 正常工作
- ✅ `lexicalMarkdown.reloadPlan` - 正常工作
- ✅ `tencentcloud.codingcopilot.chat.sendMessage` - 正常工作

### 数据存储路径
```typescript
// 依然从主扩展的 globalStorage 读取
const mainExtensionPath = currentGlobalStoragePath.replace(
  /vscode\.lexical-markdown-editor$/,
  'tencent-cloud.coding-copilot'
);
```

## 📚 参考

### VSCode API
- [WebviewPanel](https://code.visualstudio.com/api/extension-guides/webview)
- [URI Schemes](https://code.visualstudio.com/api/references/vscode-api#Uri)

### 相关文件
- `breadcrumbsControl.ts:348-359` - 面包屑隐藏逻辑
- `webviewEditorInput.ts:50-51` - WebviewPanel URI 定义
- `markdown-language-features` - Markdown Preview 参考实现

## 🎉 总结

重构已完成！现在你的 Lexical Markdown Editor 使用 WebviewPanel，面包屑会自动隐藏，就像 Markdown Preview 一样。

所有数据同步逻辑都保留了，你可以继续按照之前的方式管理数据。
