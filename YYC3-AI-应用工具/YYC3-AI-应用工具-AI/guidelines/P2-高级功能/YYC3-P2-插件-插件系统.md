# YYC3 P2-插件-插件系统

@file P2-高级功能/YYC3-P2-插件-插件系统.md | @author YanYuCloudCube Team | @version v1.0.0 | @tags P2,plugin,system

## 功能目标
插件加载、通信、生命周期、权限控制、热更新、依赖管理

## 核心接口
```typescript
interface PluginManifest {
  id: string; name: string; version: string; description: string; author: string;
  appVersion: string; main: string; icon?: string;
  permissions: PluginPermission[]; // 'storage'|'network'|'clipboard'|'notification'|'editor'|'database'|'ai'
  dependencies?: string[]; config?: PluginConfig[];
}

interface PluginAPI {
  registerCommand, unregisterCommand, registerMenuItem, unregisterMenuItem,
  registerToolbarButton, unregisterToolbarButton, registerPanel, unregisterPanel,
  sendMessage, onMessage, storage: PluginStorage, editor: EditorAPI, ai: AIAPI
}
```

## PluginManager
- loadPlugin(manifest) → dynamic import(main) → instance.activate() → status='active'
- unloadPlugin(id) → instance.deactivate() → delete
- sendMessage/onMessage 插件间通信

## 验收: 插件加载/通信/生命周期/权限控制/热更新正常
