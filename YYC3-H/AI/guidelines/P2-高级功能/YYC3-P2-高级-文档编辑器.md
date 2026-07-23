# YYC3 P2-高级-文档编辑器

@file P2-高级功能/YYC3-P2-高级-文档编辑器.md | @author YanYuCloudCube Team | @version v1.0.0 | @tags P2,advanced,editor,markdown

## 功能目标
富文本(TipTap)、Markdown 预览、Monaco 代码编辑、实时协作(Yjs)、版本历史、自动保存、搜索替换

## 技术栈
TipTap 2.1.12 | ProseMirror 1.32.1 | Monaco Editor 0.45.0 | React-Markdown 9.0.1 | Prism.js 1.29.0 | Yjs 13.6.10

## 架构: UI层 → 编辑器层(TipTap/Monaco/Markdown) → 协作层(Yjs CRDT) → 存储层(本地+版本)

## 核心组件
- **TipTapEditor**: StarterKit + Placeholder + Image + Link + Table + CodeBlockLowlight + Collaboration
- **EditorToolbar**: 粗体/斜体/删除线/行内代码 + H1/H2/H3 + 列表 + 对齐 + 链接/图片/表格/代码块 + 撤销重做
- **MonacoEditor**: @monaco-editor/react + Ctrl+S 保存 + 2s 自动保存
- **MarkdownEditor**: textarea + ReactMarkdown(remarkGfm + remarkMath + rehypeKatex) + SyntaxHighlighter
- **CollaborativeEditor**: Y.Doc + WebsocketProvider + awareness 用户数 + 离线降级
- **VersionHistory**: 版本列表 + 恢复按钮
- **SearchReplace**: 搜索/替换/全部替换 + 区分大小写/正则

## 样式: 赛博朋克深色 + backdrop-filter:blur(10px) + 渐变按钮 #667eea→#764ba2
## 验收: 富文本/Markdown/代码/协作/版本/自动保存/搜索替换/快捷键全部正常
