# YYC3 P2-插件-插件开发

@file P2-高级功能/YYC3-P2-插件-插件开发.md | @author YanYuCloudCube Team | @version v1.0.0 | @tags P2,plugin,development

## 插件开发指南

### 项目结构
```
my-yyc3-plugin/
├── src/index.ts          # 继承 BasePlugin，实现 activate/deactivate
├── src/components/       # 插件组件
├── package.json          # yyc3.permissions 声明权限
├── vite.config.ts        # lib 模式打包
└── README.md
```

### BasePlugin 接口
```typescript
abstract class BasePlugin {
  abstract activate(context: PluginContext): Promise<void> | void;
  abstract deactivate(): Promise<void> | void;
  onConfigChange?(config: Record<string, any>): void;
}
```

### PluginContext API
- ui: registerPanel/registerButton/registerMenuItem/showNotification/showDialog
- editor: getContent/setContent/getSelection/insertText/getLanguage/format
- ai: generateCode/completeCode/optimizeCode/explainCode/reviewCode
- storage: get/set/delete/clear
- logger: info/warn/error/debug

### 权限: storage|network|ui|editor|ai|database|collaboration

### 示例: 格式化插件、AI 生成插件、自定义面板插件
### 打包: vite lib 模式 → npm pack → 提交插件市场
### 测试: vi.mock PluginContext + 单元测试 + 集成测试
