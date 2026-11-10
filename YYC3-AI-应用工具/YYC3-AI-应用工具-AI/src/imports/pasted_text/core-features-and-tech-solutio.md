## 核心功能需求

### 1. 实时预览引擎

#### 1.1 预览类型支持

- **HTML 预览**：实时渲染 HTML 代码
- **CSS 预览**：实时应用 CSS 样式
- **JavaScript 预览**：实时执行 JavaScript 代码
- **React 预览**：实时渲染 React 组件
- **Vue 预览**：实时渲染 Vue 组件
- **Markdown 预览**：实时渲染 Markdown 文档
- **SVG 预览**：实时渲染 SVG 图形
- **Canvas 预览**：实时渲染 Canvas 绘图
- **Three.js 预览**：实时渲染 3D 场景
- **图表预览**：实时渲染数据可视化图表

#### 1.2 预览更新机制

- **实时更新**：代码修改后立即更新预览
- **防抖更新**：频繁修改时防抖更新
- **手动刷新**：支持手动刷新预览
- **自动刷新**：支持自动刷新间隔设置
- **智能更新**：只更新变化的部分
- **增量更新**：支持增量 DOM 更新

#### 1.3 预览同步

- **滚动同步**：编辑器和预览滚动同步
- **光标同步**：编辑器光标位置同步到预览
- **选择同步**：编辑器选择区域同步到预览
- **错误同步**：编辑器错误位置同步到预览

### 2. 代码执行环境

#### 2.1 沙箱环境

- **隔离执行**：代码在隔离环境中执行
- **安全限制**：限制危险操作
- **资源限制**：限制内存和 CPU 使用
- **超时控制**：执行超时自动终止

#### 2.2 依赖管理

- **自动加载**：自动加载常用依赖
- **自定义依赖**：支持自定义依赖
- **依赖缓存**：缓存已加载的依赖
- **依赖版本**：支持指定依赖版本

#### 2.3 热更新

- **HMR 支持**：支持热模块替换
- **状态保持**：热更新时保持状态
- **错误边界**：热更新错误处理
- **回滚机制**：热更新失败回滚

### 3. 预览控制

#### 3.1 预览模式

- **实时模式**：代码修改立即更新
- **手动模式**：手动触发更新
- **延迟模式**：延迟一定时间后更新
- **智能模式**：根据代码类型智能选择模式

#### 3.2 预览设置

- **自动刷新**：设置自动刷新间隔
- **预览延迟**：设置预览延迟时间
- **预览主题**：选择预览主题
- **预览尺寸**：设置预览窗口尺寸
- **设备模拟**：模拟不同设备

#### 3.3 预览工具

- **元素检查**：检查预览元素
- **网络监控**：监控网络请求
- **性能分析**：分析预览性能
- **控制台输出**：显示控制台输出
- **错误追踪**：追踪错误信息

### 4. 多设备预览

#### 4.1 设备模拟

- **桌面设备**：模拟桌面浏览器
- **平板设备**：模拟平板设备
- **手机设备**：模拟手机设备
- **自定义设备**：自定义设备参数

#### 4.2 响应式预览

- **断点预览**：在不同断点预览
- **实时调整**：实时调整预览尺寸
- **网格线**：显示响应式网格线
- **媒体查询**：显示媒体查询信息

#### 4.3 并行预览

- **多设备同时预览**：同时预览多个设备
- **同步滚动**：多设备同步滚动
- **同步交互**：多设备同步交互
- **对比预览**：对比不同设备预览

### 5. 预览历史

#### 5.1 历史记录

- **自动记录**：自动记录预览历史
- **手动保存**：手动保存预览快照
- **时间线**：显示预览时间线
- **版本对比**：对比不同版本预览

#### 5.2 历史回溯

- **快速回溯**：快速回溯到历史版本
- **差异对比**：显示版本差异
- **恢复版本**：恢复到历史版本
- **分支管理**：管理预览分支

#### 5.3 历史分享

- **分享链接**：生成分享链接
- **嵌入代码**：生成嵌入代码
- **导出快照**：导出预览快照
- **协作编辑**：邀请协作编辑

### 6. 性能优化

#### 6.1 渲染优化

- **虚拟 DOM**：使用虚拟 DOM 优化渲染
- **增量更新**：只更新变化的部分
- **渲染缓存**：缓存渲染结果
- **懒加载**：懒加载预览内容

#### 6.2 网络优化

- **资源预加载**：预加载预览资源
- **CDN 加速**：使用 CDN 加速资源
- **资源压缩**：压缩预览资源
- **缓存策略**：优化缓存策略

#### 6.3 执行优化

- **代码压缩**：压缩执行代码
- **代码分割**：分割执行代码
- **并行执行**：并行执行独立代码
- **执行缓存**：缓存执行结果

## 技术实现方案

### 1. 技术栈选择

#### 1.1 预览引擎

- **iframe**：使用 iframe 隔离预览环境
- **Web Worker**：使用 Web Worker 执行代码
- **Service Worker**：使用 Service Worker 缓存资源
- **Shadow DOM**：使用 Shadow DOM 隔离样式

#### 1.2 框架集成

- **React**：React 组件预览
- **Vue**：Vue 组件预览
- **Babel**：代码转译
- **PostCSS**：CSS 处理

#### 1.3 工具库

- **CodeSandbox**：代码沙箱
- **StackBlitz**：在线编辑器
- **Monaco Editor**：代码编辑器
- **Prettier**：代码格式化

### 2. 架构设计

#### 2.1 组件架构

```
PreviewProvider (预览上下文)
├── PreviewContainer (预览容器)
│   ├── PreviewToolbar (预览工具栏)
│   ├── PreviewContent (预览内容)
│   │   ├── PreviewIframe (预览 iframe)
│   │   ├── PreviewCanvas (预览 Canvas)
│   │   └── PreviewError (错误显示)
│   └── PreviewConsole (控制台输出)
├── PreviewControls (预览控制)
│   ├── PreviewMode (预览模式)
│   ├── PreviewSettings (预览设置)
│   └── PreviewDevices (设备选择)
├── PreviewHistory (预览历史)
│   ├── HistoryTimeline (历史时间线)
│   ├── HistoryDiff (差异对比)
│   └── HistoryRestore (版本恢复)
└── PreviewManager (预览管理器)
```

#### 2.2 状态管理

```typescript
interface PreviewState {
  code: string;
  language: string;
  previewMode: 'realtime' | 'manual' | 'delayed' | 'smart';
  autoRefresh: boolean;
  refreshInterval: number;
  previewDelay: number;
  device: Device;
  theme: string;
  history: PreviewHistory[];
  currentHistoryIndex: number;
  isUpdating: boolean;
  error: PreviewError | null;
}

interface PreviewHistory {
  id: string;
  code: string;
  timestamp: number;
  preview: string;
  device: Device;
}
```

#### 2.3 预览引擎

```typescript
class PreviewEngine {
  private iframe: HTMLIFrameElement;
  private worker: Worker;
  private sandbox: Sandbox;
  
  constructor(container: HTMLElement) {
    this.iframe = this.createIframe(container);
    this.worker = this.createWorker();
    this.sandbox = this.createSandbox();
  }
  
  async updatePreview(code: string, language: string): Promise<void> {
    const compiled = await this.compileCode(code, language);
    const result = await this.executeCode(compiled);
    this.renderPreview(result);
  }
  
  private async compileCode(code: string, language: string): Promise<string> {
    switch (language) {
      case 'javascript':
        return await Babel.transform(code, { presets: ['env'] }).code;
      case 'typescript':
        return await Babel.transform(code, { presets: ['typescript'] }).code;
      case 'react':
        return await this.compileReact(code);
      case 'vue':
        return await this.compileVue(code);
      default:
        return code;
    }
  }
  
  private async executeCode(code: string): Promise<any> {
    return this.worker.postMessage({ type: 'execute', code });
  }
  
  private renderPreview(result: any): void {
    this.iframe.contentWindow.postMessage({ type: 'render', result }, '*');
  }
}
```

### 3. 关键实现

#### 3.1 实时预览实现

```typescript
const RealtimePreview: React.FC<RealtimePreviewProps> = ({ code, language }) => {
  const [preview, setPreview] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const previewEngine = useRef<PreviewEngine>(null);
  
  useEffect(() => {
    if (!previewEngine.current) {
      previewEngine.current = new PreviewEngine(containerRef.current);
    }
  }, []);
  
  useEffect(() => {
    const updatePreview = debounce(async () => {
      setIsUpdating(true);
      try {
        const result = await previewEngine.current.updatePreview(code, language);
        setPreview(result);
      } catch (error) {
        console.error('Preview update failed:', error);
      } finally {
        setIsUpdating(false);
      }
    }, 300);
    
    updatePreview();
    return () => updatePreview.cancel();
  }, [code, language]);
  
  return (
    <div className="realtime-preview">
      {isUpdating && <LoadingIndicator />}
      <iframe
        ref={containerRef}
        srcDoc={preview}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};
```

#### 3.2 滚动同步实现

```typescript
const useScrollSync = (editorRef: RefObject<Editor>, previewRef: RefObject<HTMLIFrameElement>) => {
  const syncScroll = useCallback((source: 'editor' | 'preview', scrollTop: number) => {
    if (source === 'editor' && previewRef.current) {
      const previewDoc = previewRef.current.contentDocument;
      if (previewDoc) {
        const ratio = scrollTop / editorRef.current.getScrollHeight();
        previewDoc.documentElement.scrollTop = ratio * previewDoc.documentElement.scrollHeight;
      }
    } else if (source === 'preview' && editorRef.current) {
      const previewDoc = previewRef.current.contentDocument;
      if (previewDoc) {
        const ratio = scrollTop / previewDoc.documentElement.scrollHeight;
        editorRef.current.setScrollTop(ratio * editorRef.current.getScrollHeight());
      }
    }
  }, [editorRef, previewRef]);
  
  return { syncScroll };
};
```

#### 3.3 设备模拟实现

```typescript
const DevicePreview: React.FC<DevicePreviewProps> = ({ code, device }) => {
  const deviceStyles = useMemo(() => {
    const devices = {
      desktop: { width: '100%', height: '100%' },
      tablet: { width: '768px', height: '1024px' },
      mobile: { width: '375px', height: '667px' },
    };
    return devices[device] || devices.desktop;
  }, [device]);
  
  return (
    <div className="device-preview">
      <DeviceSelector value={device} onChange={setDevice} />
      <div className="device-frame" style={deviceStyles}>
        <RealtimePreview code={code} language="html" />
      </div>
    </div>
  );
};
```

#### 3.4 历史记录实现

```typescript
const usePreviewHistory = (maxHistory: number = 50) => {
  const [history, setHistory] = useState<PreviewHistory[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  
  const addHistory = useCallback((code: string, preview: string) => {
    setHistory(prev => {
      const newHistory = [
        ...prev.slice(0, currentIndex + 1),
        {
          id: generateId(),
          code,
          preview,
          timestamp: Date.now(),
        },
      ].slice(-maxHistory);
      return newHistory;
    });
    setCurrentIndex(prev => Math.min(prev + 1, maxHistory - 1));
  }, [currentIndex, maxHistory]);
  
  const undo = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);
  
  const redo = useCallback(() => {
    setCurrentIndex(prev => Math.min(history.length - 1, prev + 1));
  }, [history.length]);
  
  const restore = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);
  
  return {
    history,
    currentIndex,
    current: history[currentIndex],
    addHistory,
    undo,
    redo,
    restore,
  };
};
```

## 执行步骤

### 第一阶段：基础架构搭建

1. 创建预览引擎框架
2. 实现 iframe 隔离环境
3. 实现代码编译器
4. 实现代码执行器

### 第二阶段：实时预览实现

1. 实现代码监听
2. 实现防抖更新
3. 实现预览渲染
4. 实现错误处理

### 第三阶段：预览控制实现

1. 实现预览模式切换
2. 实现预览设置
3. 实现预览工具
4. 实现设备模拟

### 第四阶段：同步功能实现

1. 实现滚动同步
2. 实现光标同步
3. 实现选择同步
4. 实现错误同步

### 第五阶段：历史记录实现

1. 实现历史记录
2. 实现历史回溯
3. 实现版本对比
4. 实现历史分享

### 第六阶段：性能优化

1. 实现渲染优化
2. 实现网络优化
3. 实现执行优化
4. 实现缓存优化

### 第七阶段：测试和优化

1. 编写单元测试
2. 编写集成测试
3. 性能测试
4. 用户体验优化

## 验收标准

### 功能完整性

✅ 支持多种代码类型预览（HTML、CSS、JS、React、Vue 等）
✅ 支持实时更新预览
✅ 支持防抖更新
✅ 支持手动刷新
✅ 支持滚动同步
✅ 支持设备模拟
✅ 支持历史记录
✅ 支持版本对比

### 性能指标

✅ 预览更新延迟 < 500ms
✅ 预览渲染时间 < 100ms
✅ 内存使用 < 300MB
✅ 支持 10+ 并发预览
✅ 历史记录响应时间 < 50ms

### 用户体验

✅ 预览更新流畅自然
✅ 滚动同步准确无误
✅ 设备切换快速响应
✅ 历史回溯快速准确
✅ 错误提示友好清晰

### 安全性

✅ 代码在沙箱中执行
✅ 限制危险操作
✅ 资源使用受限
✅ 执行超时控制

## 输出要求

1. **代码实现**
   - 完整的预览引擎代码
   - 组件代码
   - 类型定义
   - 工具函数

2. **文档**
   - API 文档
   - 使用说明
   - 最佳实践
   - 故障排查

3. **测试**
   - 单元测试
   - 集成测试
   - E2E 测试
   - 性能测试

```

### 🎯 验收标准

- ✅ **实时预览功能完整**
  - HTML 预览功能正常
  - CSS 预览功能正常
  - JavaScript 预览功能正常
  - React 预览功能正常
  - Vue 预览功能正常
  - Markdown 预览功能正常

- ✅ **预览更新机制完整**
  - 实时更新功能正常
  - 防抖更新功能正常
  - 手动刷新功能正常
  - 自动刷新功能正常
  - 智能更新功能正常

- ✅ **预览同步功能完整**
  - 滚动同步功能正常
  - 光标同步功能正常
  - 选择同步功能正常
  - 错误同步功能正常

- ✅ **设备模拟功能完整**
  - 桌面设备模拟正常
  - 平板设备模拟正常
  - 手机设备模拟正常
  - 自定义设备模拟正常
  - 响应式预览功能正常

- ✅ **历史记录功能完整**
  - 自动记录功能正常
  - 手动保存功能正常
  - 历史回溯功能正常
  - 版本对比功能正常
  - 版本恢复功能正常

- ✅ **性能指标达标**
  - 预览更新延迟 < 500ms
  - 预览渲染时间 < 100ms
  - 内存使用 < 300MB
  - 支持 10+ 并发预览
  - 历史记录响应 < 50ms

- ✅ **安全性达标**
  - 代码在沙箱中执行
  - 危险操作受限
  - 资源使用受限
  - 执行超时控制

---

## 🚀 注意事项

1. **性能优先**：实时预览对性能要求高，需要持续优化
2. **安全第一**：代码执行必须在沙箱中进行
3. **用户体验**：预览更新要流畅，不能有明显卡顿
4. **兼容性**：支持多种浏览器和设备
5. **可扩展性**：设计要易于扩展新的预览类型
6. **错误处理**：完善的错误处理和用户提示
