# YYC3 P1-前端-代码编辑器

## 文档信息
| 字段 | 内容 |
|------|------|
| @file | P1-核心功能/YYC3-P1-前端-代码编辑器.md |
| @description | Monaco Editor 集成 - 语法高亮/自动补全/多标签/搜索替换 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @status | stable |
| @tags | P1,frontend,editor,monaco |

---

## 功能目标

1. 代码编辑：多语言支持
2. 语法高亮：智能语法高亮
3. 自动补全：IntelliSense
4. 错误提示：实时检测
5. 代码格式化：自动格式化
6. 多标签页：多文件编辑
7. 搜索替换：强大搜索

## 组件架构

```
CodeEditor/
├── MonacoEditor.tsx        # Monaco 编辑器
├── EditorTabs.tsx          # 标签栏
├── EditorToolbar.tsx       # 工具栏
├── EditorStatusBar.tsx     # 状态栏
├── SearchReplace.tsx       # 搜索替换面板
└── EditorSettings.tsx      # 编辑器设置
```

## 核心实现

### 编辑器状态管理

```typescript
// src/stores/useEditorStore.ts
export interface EditorFile {
  id: string; name: string; path: string; content: string;
  language: string; isDirty: boolean; readOnly: boolean;
}

export interface EditorState {
  files: EditorFile[];
  activeFileId: string | null;
  editorConfig: {
    fontSize: number; tabSize: number; showLineNumbers: boolean;
    showMinimap: boolean; enableAutocomplete: boolean;
    theme: 'vs-dark' | 'vs-light' | 'hc-black';
  };
  searchState: {
    searchText: string; replaceText: string;
    caseSensitive: boolean; useRegex: boolean;
    matchWholeWord: boolean; showSearchPanel: boolean;
  };
}

// Actions: openFile, closeFile, closeAllFiles, activateFile,
// updateFileContent, saveFile, saveAllFiles, updateEditorConfig, search, replace, replaceAll
```

### Monaco 编辑器组件

```typescript
// src/components/editor/MonacoEditor.tsx
export const MonacoEditor: React.FC<{
  content: string; language: string;
  readOnly?: boolean; onChange?: (value: string) => void;
}> = ({ content, language, readOnly, onChange }) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { editorConfig } = useEditorStore();

  useEffect(() => {
    editorRef.current = monaco.editor.create(containerRef.current!, {
      value: content, language, readOnly,
      theme: editorConfig.theme, fontSize: editorConfig.fontSize,
      tabSize: editorConfig.tabSize,
      lineNumbers: editorConfig.showLineNumbers ? 'on' : 'off',
      minimap: { enabled: editorConfig.showMinimap },
      automaticLayout: true, scrollBeyondLastLine: false, wordWrap: 'on',
    });
    const disposable = editorRef.current.onDidChangeModelContent(() => {
      onChange?.(editorRef.current?.getValue() || '');
    });
    return () => { disposable.dispose(); editorRef.current?.dispose(); };
  }, []);

  return <div ref={containerRef} style={{ height: '100%' }} />;
};
```

### 编辑器标签页

```typescript
// src/components/editor/EditorTabs.tsx
// 显示打开的文件列表，支持: 激活切换、关闭、脏标记(●)、图标
```

### 搜索替换

```typescript
// src/components/editor/SearchReplace.tsx
// 功能: 搜索/替换文本、上/下一个匹配、全部替换
// 选项: 区分大小写、正则表达式、全字匹配
```

## 样式

- VS Code 风格深色主题 (#252526/#2d2d2d/#3c3c3c)
- 标签页: 激活底部 #667eea 高亮、脏状态斜体
- 搜索面板: 浮动定位、#252526 背景

## 验收标准

- 代码编辑/语法高亮/自动补全正常
- 多标签页支持、搜索替换完善
- 主题切换正常、快捷键支持
