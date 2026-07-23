---
file: YYC3-存储架构设计.md
description: YYC3-存储架构设计 模块
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-04-15
updated: 2026-04-15
status: stable
tags: [core]
category: general
language: zh-CN
---

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

# YYC³ 一体化存储架构核心文档

> **智亦师亦友亦伯乐，谱一言一语一华章！**
>
> 纯开源 · 本地化 · 一用户一端 · 智能协同极致信任 · 人机共进和谐

---

## 目录

1. [设计哲学](#一设计哲学)
2. [架构总览](#二架构总览)
3. [核心组件](#三核心组件)
4. [数据流图](#四数据流图)
5. [安全机制](#五安全机制)
6. [使用指南](#六使用指南)
7. [最佳实践](#七最佳实践)
8. [技术规范](#八技术规范)

---

## 一、设计哲学

### 1.1 核心理念

```
┌─────────────────────────────────────────────────────────────────┐
│                    YYC³ 一体化存储意旨                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │   纯开源    │───▶│   本地化    │───▶│ 一用户一端  │        │
│   │  Transparent │    │  Localized │    │  Isolated   │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│          │                  │                  │                │
│          ▼                  ▼                  ▼                │
│   ┌─────────────────────────────────────────────────────┐      │
│   │            智能协同极致信任                           │      │
│   │         Intelligent Collaboration Trust             │      │
│   └─────────────────────────────────────────────────────┘      │
│                            │                                    │
│                            ▼                                    │
│   ┌─────────────────────────────────────────────────────┐      │
│   │            人机共进成为和谐                           │      │
│   │        Human-Machine Harmony Evolution              │      │
│   └─────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 设计原则

| 原则 | 描述 | 实现方式 |
|------|------|----------|
| **零上传** | 所有数据仅存储于用户本地设备 | localStorage + IndexedDB |
| **零收集** | 不收集任何用户信息 | 无后端服务器、无埋点、无统计 |
| **零追踪** | 不追踪用户行为 | 无Cookie、无指纹、无会话ID |
| **完全开源** | 代码透明可审计 | GitHub开源、详细注释 |
| **用户主权** | 数据完全由用户控制 | 导入/导出/删除/重置 |

### 1.3 信任架构

```
用户信任链:
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  代码开源 │───▶│ 透明审计 │───▶│ 本地存储 │───▶│ 用户控制 │
│  Open    │    │ Auditable│    │  Local   │    │ Control  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │              │               │               │
     └──────────────┴───────────────┴───────────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │    极致信任基础       │
              │  Ultimate Trust Base │
              └──────────────────────┘
```

---

## 二、架构总览

### 2.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           YYC³ 应用层                                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Dashboard│ │ AI Family│ │  Music  │ │  Voice  │ │ Settings│           │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
│       │           │           │           │           │                 │
└───────┼───────────┼───────────┼───────────┼───────────┼─────────────────┘
        │           │           │           │           │
        ▼           ▼           ▼           ▼           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     GlobalStoreProvider (统一数据访问层)                 │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                        useGlobalStore() Hook                       │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │  │
│  │  │useModel     │ │useOllama    │ │useDB        │ │useAlert     │  │  │
│  │  │Providers    │ │Instances    │ │Connections  │ │Rules        │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     GlobalStoreRegistry (全局注册中心)                   │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  • 单例模式管理所有数据存储                                         │  │
│  │  • 订阅/通知机制 (发布-订阅模式)                                    │  │
│  │  • 跨标签页同步 (BroadcastChannel)                                 │  │
│  │  • 数据导入/导出/重置                                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Unified Stores (统一数据存储层)                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │modelProvider│ │ollama      │ │appSettings │ │network     │           │
│  │Store        │ │InstanceStore│ │Store       │ │ConfigStore │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │nodeStore   │ │dbConnection│ │userStore   │ │alertRule   │           │
│  │            │ │Store       │ │            │ │Store       │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                          │
│  │patrolConfig│ │operation   │ │fileSystem  │                          │
│  │Store       │ │HistoryStore│ │Store       │                          │
│  └────────────┘ └────────────┘ └────────────┘                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     LocalStore Factory (本地存储工厂)                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  createLocalStore<T>(key, defaults, prefix) => LocalStore<T>      │  │
│  │                                                                    │  │
│  │  • getAll()        - 获取所有数据                                  │  │
│  │  • getById(id)     - 按ID获取                                      │  │
│  │  • add(item)       - 添加数据                                      │  │
│  │  • update(id, upd) - 更新数据                                      │  │
│  │  • remove(id)      - 删除数据                                      │  │
│  │  • reset()         - 重置为默认值                                  │  │
│  │  • exportData()    - 导出JSON                                      │  │
│  │  • importData(json)- 导入JSON                                      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Browser Storage (浏览器存储层)                       │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐      │
│  │      localStorage           │  │       IndexedDB             │      │
│  │  • 键值对存储                │  │  • 大容量结构化存储          │      │
│  │  • 同步读写                  │  │  • 异步读写                  │      │
│  │  • 前缀隔离: yyc3_           │  │  • 前缀隔离: yyc3_           │      │
│  └─────────────────────────────┘  └─────────────────────────────┘      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    BroadcastChannel                              │   │
│  │  • 跨标签页通信通道: yyc3_global_store_sync                      │   │
│  │  • 实时数据同步                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 数据隔离模型

```
┌─────────────────────────────────────────────────────────────────┐
│                      数据隔离架构                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   用户A的浏览器                                                  │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  localStorage                                            │  │
│   │  ┌─────────────────────────────────────────────────┐    │  │
│   │  │ yyc3_model_providers    → [模型配置数据]         │    │  │
│   │  │ yyc3_ollama_instances   → [Ollama实例数据]       │    │  │
│   │  │ yyc3_app_settings       → [应用设置数据]         │    │  │
│   │  │ yyc3_db_connections     → [数据库连接数据]       │    │  │
│   │  │ ...                                            │    │  │
│   │  └─────────────────────────────────────────────────┘    │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   用户B的浏览器 (完全隔离)                                       │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  localStorage                                            │  │
│   │  ┌─────────────────────────────────────────────────┐    │  │
│   │  │ yyc3_model_providers    → [模型配置数据]         │    │  │
│   │  │ yyc3_ollama_instances   → [Ollama实例数据]       │    │  │
│   │  │ ...                                            │    │  │
│   │  └─────────────────────────────────────────────────┘    │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ❌ 无服务器中转  ❌ 无云端同步  ❌ 无数据共享                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、核心组件

### 3.1 GlobalStoreRegistry (全局注册中心)

**文件位置**: `src/app/stores/global-store-registry.ts`

```typescript
/**
 * 全局存储注册中心
 * 
 * 职责:
 * 1. 管理所有数据存储的单例实例
 * 2. 提供订阅/通知机制
 * 3. 实现跨标签页数据同步
 * 4. 支持数据导入/导出/重置
 */
class GlobalStoreRegistryImpl {
  private static instance: GlobalStoreRegistryImpl | null = null;
  private stores: Map<StoreKey, LocalStore<{ id: string }>> = new Map();
  private subscribers: Map<StoreKey, Set<StoreChangeCallback>> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;
  
  // 单例模式
  static getInstance(): GlobalStoreRegistryImpl {
    if (!GlobalStoreRegistryImpl.instance) {
      GlobalStoreRegistryImpl.instance = new GlobalStoreRegistryImpl();
    }
    return GlobalStoreRegistryImpl.instance;
  }
  
  // 注册存储
  registerStore<T extends { id: string }>(key: StoreKey, store: LocalStore<T>): void
  
  // 订阅变更
  subscribe<T extends { id: string }>(key: StoreKey, callback: StoreChangeCallback<T>): () => void
  
  // 广播变更
  broadcast<T extends { id: string }>(key: StoreKey, event: StoreChangeEvent<T>): void
  
  // 导出所有数据
  exportAll(): Record<string, unknown>
  
  // 导入所有数据
  importAll(data: Record<string, unknown>): boolean
}
```

### 3.2 LocalStore Factory (本地存储工厂)

**文件位置**: `src/app/lib/create-local-store.ts`

```typescript
/**
 * 本地存储工厂函数
 * 
 * 将任意数据类型转化为可持久化的CRUD接口
 * 
 * @param storageKey - localStorage键名
 * @param defaults - 默认数据数组
 * @param idPrefix - ID前缀
 * @returns LocalStore<T> 完整CRUD接口
 */
export function createLocalStore<T extends { id: string }>(
  storageKey: string,
  defaults: T[],
  idPrefix = "item"
): LocalStore<T> {
  // 内存缓存优化
  let _cache: T[] | null = null;
  
  return {
    getAll: () => T[],           // 获取所有
    getById: (id) => T | undefined,  // 按ID获取
    add: (item) => T,            // 添加
    update: (id, updates) => T | null,  // 更新
    remove: (id) => boolean,     // 删除
    removeBatch: (ids) => number, // 批量删除
    reset: () => T[],            // 重置
    exportData: () => string,    // 导出
    importData: (json) => boolean, // 导入
    count: () => number,         // 计数
  };
}
```

### 3.3 GlobalStoreProvider (React上下文提供者)

**文件位置**: `src/app/contexts/GlobalStoreContext.tsx`

```typescript
/**
 * 全局数据上下文提供者
 * 
 * 在App.tsx中包裹整个应用，提供统一数据访问
 */
export function GlobalStoreProvider({ children }: { children: React.ReactNode }) {
  // 初始化状态
  const [state, setState] = useState<GlobalStoreState>(() => ({
    modelProviders: modelProviderStore.getAll(),
    ollamaInstances: ollamaInstanceStore.getAll(),
    settings: Object.fromEntries(appSettingsStore.getAll().map(s => [s.key, s.value])),
    // ... 其他数据
  }));
  
  // 订阅所有存储变更
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    storeKeys.forEach(key => {
      const unsub = globalStoreRegistry.subscribe(key, () => refreshAll());
      unsubscribers.push(unsub);
    });
    return () => unsubscribers.forEach(unsub => unsub());
  }, []);
  
  return (
    <GlobalStoreContext.Provider value={{ ...state, ...actions }}>
      {children}
    </GlobalStoreContext.Provider>
  );
}

// 便捷Hooks
export function useModelProviders() { /* ... */ }
export function useOllamaInstances() { /* ... */ }
export function useDBConnections() { /* ... */ }
export function useAlertRules() { /* ... */ }
export function usePatrolConfigs() { /* ... */ }
```

### 3.4 UnifiedSettingsPanel (统一设置面板)

**文件位置**: `src/app/components/UnifiedSettingsPanel.tsx`

```typescript
/**
 * 统一设置管理面板
 * 
 * 提供所有数据的可视化管理界面:
 * - 数据概览
 * - 模型配置管理
 * - Ollama实例管理
 * - 数据库连接管理
 * - 告警规则管理
 * - 巡查配置管理
 * - 数据导入/导出/重置
 */
export default function UnifiedSettingsPanel() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  
  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* 标签栏 */}
      <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      
      {/* 内容区 */}
      <div className="flex-1 overflow-auto">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "models" && <ModelsTab />}
        {activeTab === "ollama" && <OllamaTab />}
        {activeTab === "database" && <DatabaseTab />}
        {activeTab === "alerts" && <AlertsTab />}
        {activeTab === "patrols" && <PatrolsTab />}
        {activeTab === "import-export" && <ImportExportTab />}
      </div>
    </div>
  );
}
```

---

## 四、数据流图

### 4.1 数据写入流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           数据写入流程                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   用户操作 (添加/修改/删除)                                              │
│        │                                                                │
│        ▼                                                                │
│   ┌─────────────┐                                                       │
│   │ UI组件调用  │                                                       │
│   │ addModelProvider()                                                  │
│   └──────┬──────┘                                                       │
│          │                                                              │
│          ▼                                                              │
│   ┌─────────────┐                                                       │
│   │GlobalStore  │                                                       │
│   │Provider     │                                                       │
│   │ Action      │                                                       │
│   └──────┬──────┘                                                       │
│          │                                                              │
│          ▼                                                              │
│   ┌─────────────┐     ┌─────────────┐                                  │
│   │modelProvider│────▶│localStorage │                                  │
│   │Store.add()  │     │写入数据     │                                  │
│   └──────┬──────┘     └─────────────┘                                  │
│          │                                                              │
│          ▼                                                              │
│   ┌─────────────┐                                                       │
│   │globalStore  │                                                       │
│   │Registry     │                                                       │
│   │.broadcast() │                                                       │
│   └──────┬──────┘                                                       │
│          │                                                              │
│          ├──────────────────────┐                                       │
│          ▼                      ▼                                       │
│   ┌─────────────┐        ┌─────────────┐                               │
│   │通知本地订阅者│        │BroadcastChannel│                            │
│   │(当前标签页) │        │(其他标签页)  │                               │
│   └──────┬──────┘        └──────┬──────┘                               │
│          │                      │                                       │
│          ▼                      ▼                                       │
│   ┌─────────────┐        ┌─────────────┐                               │
│   │触发组件重渲染│        │其他标签页同步│                               │
│   │(React更新)  │        │数据更新     │                               │
│   └─────────────┘        └─────────────┘                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 数据读取流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           数据读取流程                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   组件渲染 / 数据请求                                                   │
│        │                                                                │
│        ▼                                                                │
│   ┌─────────────┐                                                       │
│   │ useModelProviders()                                                 │
│   │ Hook调用    │                                                       │
│   └──────┬──────┘                                                       │
│          │                                                              │
│          ▼                                                              │
│   ┌─────────────┐                                                       │
│   │GlobalStore  │                                                       │
│   │Context      │                                                       │
│   │读取state    │                                                       │
│   └──────┬──────┘                                                       │
│          │                                                              │
│          ▼                                                              │
│   ┌─────────────┐                                                       │
│   │返回缓存的   │                                                       │
│   │modelProviders                                                       │
│   │数据         │                                                       │
│   └──────┬──────┘                                                       │
│          │                                                              │
│          ▼                                                              │
│   ┌─────────────┐                                                       │
│   │组件渲染     │                                                       │
│   │(React更新)  │                                                       │
│   └─────────────┘                                                       │
│                                                                         │
│   注: 数据已缓存在内存中，无需每次读取localStorage                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.3 跨标签页同步流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        跨标签页同步流程                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   标签页A (主操作)                      标签页B (被动同步)              │
│   ┌─────────────────┐                  ┌─────────────────┐             │
│   │ 用户修改数据    │                  │ 等待同步        │             │
│   └────────┬────────┘                  └────────▲────────┘             │
│            │                                    │                       │
│            ▼                                    │                       │
│   ┌─────────────────┐                           │                       │
│   │ localStorage    │                           │                       │
│   │ 写入新数据      │                           │                       │
│   └────────┬────────┘                           │                       │
│            │                                    │                       │
│            ▼                                    │                       │
│   ┌─────────────────┐    BroadcastChannel     │                       │
│   │ broadcast()     │─────────────────────────┘                       │
│   │ 发送变更事件    │    "yyc3_global_store_sync"                      │
│   └─────────────────┘                           │                       │
│                                                 │                       │
│                                                 ▼                       │
│                                        ┌─────────────────┐             │
│                                        │ onmessage       │             │
│                                        │ 接收变更事件    │             │
│                                        └────────┬────────┘             │
│                                                 │                       │
│                                                 ▼                       │
│                                        ┌─────────────────┐             │
│                                        │ 刷新本地缓存    │             │
│                                        │ 触发组件重渲染  │             │
│                                        └─────────────────┘             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 五、安全机制

### 5.1 安全架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           安全机制架构                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                     第一层: 代码层安全                           │  │
│   │  • 完全开源，代码可审计                                          │  │
│   │  • 无混淆，无加密逻辑                                            │  │
│   │  • 详细注释，逻辑透明                                            │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                     第二层: 存储层安全                           │  │
│   │  • 数据仅存储在用户浏览器                                        │  │
│   │  • 使用唯一前缀 yyc3_ 隔离                                       │  │
│   │  • 无云端备份，无服务器存储                                      │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                     第三层: 传输层安全                           │  │
│   │  • 无网络传输 (本地存储)                                         │  │
│   │  • 跨标签页使用 BroadcastChannel (浏览器内部)                    │  │
│   │  • 无第三方API调用                                               │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                     第四层: 用户控制层                           │  │
│   │  • 用户可随时导出数据                                            │  │
│   │  • 用户可随时删除数据                                            │  │
│   │  • 用户可随时重置数据                                            │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 安全检查清单

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 无后端服务器 | ✅ | 纯前端应用 |
| 无用户数据上传 | ✅ | 所有数据本地存储 |
| 无第三方统计 | ✅ | 无埋点、无追踪 |
| 无Cookie追踪 | ✅ | 不使用Cookie |
| 无浏览器指纹 | ✅ | 不收集设备信息 |
| 代码开源可审计 | ✅ | GitHub公开仓库 |
| 数据可导出 | ✅ | JSON格式导出 |
| 数据可删除 | ✅ | 一键重置功能 |
| 跨标签页隔离 | ✅ | BroadcastChannel内部通信 |

### 5.3 数据存储键名规范

```typescript
// 统一前缀: yyc3_
const STORAGE_KEYS = {
  // 模型相关
  MODEL_PROVIDERS: "yyc3_model_providers",
  OLLAMA_INSTANCES: "yyc3_ollama_instances",
  
  // 系统配置
  APP_SETTINGS: "yyc3_app_settings",
  NETWORK_CONFIG: "yyc3_network_config",
  
  // 监控数据
  NODES: "yyc3_nodes",
  DB_CONNECTIONS: "yyc3_db_connections",
  USERS: "yyc3_users",
  
  // 告警和巡查
  ALERT_RULES: "yyc3_alert_rules",
  PATROL_CONFIG: "yyc3_patrol_config",
  
  // 操作历史
  OPERATION_HISTORY: "yyc3_operation_history",
  
  // 文件系统
  FILE_SYSTEM: "yyc3_file_system",
};
```

---

## 六、使用指南

### 6.1 快速开始

#### 步骤1: 在App.tsx中集成Provider

```tsx
// src/app/App.tsx
import { GlobalStoreProvider } from "./contexts/GlobalStoreContext";

export default function App() {
  return (
    <ErrorBoundary level="page" source="App">
      <GlobalStoreProvider>
        <AuthContext.Provider value={{ ... }}>
          <I18nContext.Provider value={{ ... }}>
            <RouterProvider router={router} />
          </I18nContext.Provider>
        </AuthContext.Provider>
      </GlobalStoreProvider>
    </ErrorBoundary>
  );
}
```

#### 步骤2: 在组件中使用数据

```tsx
// 方式1: 使用便捷Hook
import { useModelProviders } from "../contexts/GlobalStoreContext";

function ModelConfigPanel() {
  const { modelProviders, addModelProvider, removeModelProvider } = useModelProviders();
  
  const handleAdd = () => {
    addModelProvider({
      providerId: "openai",
      providerLabel: "OpenAI",
      model: "gpt-4o",
      apiKey: "sk-...",
      baseUrl: "https://api.openai.com/v1",
      createdAt: Date.now(),
      lastUsed: null,
      status: "unchecked",
    });
  };
  
  return (
    <div>
      {modelProviders.map(model => (
        <div key={model.id}>
          {model.model}
          <button onClick={() => removeModelProvider(model.id)}>删除</button>
        </div>
      ))}
      <button onClick={handleAdd}>添加模型</button>
    </div>
  );
}
```

```tsx
// 方式2: 使用全局Hook
import { useGlobalStore } from "../contexts/GlobalStoreContext";

function SettingsPage() {
  const {
    modelProviders,
    ollamaInstances,
    dbConnections,
    alertRules,
    exportAllData,
    importAllData,
    resetAllData,
  } = useGlobalStore();
  
  const handleExport = () => {
    const data = exportAllData();
    const json = JSON.stringify(data, null, 2);
    // 下载JSON文件
  };
  
  return (
    <div>
      {/* ... */}
    </div>
  );
}
```

### 6.2 创建新的数据存储

```typescript
// 1. 定义类型
interface MyCustomConfig {
  id: string;
  name: string;
  value: string;
  createdAt: number;
}

// 2. 定义默认值
const DEFAULT_MY_CONFIGS: MyCustomConfig[] = [
  { id: "default-1", name: "默认配置", value: "default", createdAt: Date.now() },
];

// 3. 创建存储
const myConfigStore = createLocalStore<MyCustomConfig>(
  "yyc3_my_configs",
  DEFAULT_MY_CONFIGS,
  "mycfg"
);

// 4. 注册到全局
globalStoreRegistry.registerStore("myConfigs", myConfigStore);

// 5. 在Context中添加状态和操作
// 编辑 GlobalStoreContext.tsx
```

### 6.3 数据迁移

```typescript
// 从旧localStorage迁移到新存储
function migrateFromOldStorage() {
  // 读取旧数据
  const oldData = localStorage.getItem("old_config_key");
  
  if (oldData) {
    try {
      const parsed = JSON.parse(oldData);
      
      // 写入新存储
      parsed.forEach(item => {
        if (!myConfigStore.getById(item.id)) {
          myConfigStore.add(item);
        }
      });
      
      // 清理旧数据
      localStorage.removeItem("old_config_key");
      
      console.log("[Migration] 数据迁移成功");
    } catch (e) {
      console.error("[Migration] 数据迁移失败:", e);
    }
  }
}
```

---

## 七、最佳实践

### 7.1 数据操作规范

```typescript
// ✅ 推荐: 使用Context提供的操作方法
const { addModelProvider, updateModelProvider, removeModelProvider } = useModelProviders();

// ❌ 避免: 直接操作localStorage
localStorage.setItem("yyc3_model_providers", JSON.stringify(data));
```

### 7.2 组件设计规范

```tsx
// ✅ 推荐: 将数据操作封装在自定义Hook中
function useModelManager() {
  const { modelProviders, addModelProvider, removeModelProvider } = useModelProviders();
  
  const addOpenAI = useCallback((model: string, apiKey: string) => {
    return addModelProvider({
      providerId: "openai",
      providerLabel: "OpenAI",
      model,
      apiKey,
      baseUrl: "https://api.openai.com/v1",
      createdAt: Date.now(),
      lastUsed: null,
      status: "unchecked",
    });
  }, [addModelProvider]);
  
  return { modelProviders, addOpenAI, removeModelProvider };
}

// ❌ 避免: 在组件中直接调用底层存储
function BadComponent() {
  const [models, setModels] = useState([]);
  
  useEffect(() => {
    const data = localStorage.getItem("yyc3_model_providers");
    setModels(JSON.parse(data || "[]"));
  }, []);
  
  // ...
}
```

### 7.3 错误处理规范

```typescript
// ✅ 推荐: 使用try-catch处理可能失败的操作
const handleImport = (json: string) => {
  try {
    const data = JSON.parse(json);
    const success = importAllData(data);
    
    if (success) {
      toast.success("数据导入成功");
    } else {
      toast.error("数据导入失败");
    }
  } catch (e) {
    toast.error("JSON格式错误");
    console.error("[Import] 解析失败:", e);
  }
};
```

### 7.4 性能优化建议

```typescript
// ✅ 推荐: 使用useMemo缓存计算结果
const activeModels = useMemo(() => {
  return modelProviders.filter(m => m.status === "active");
}, [modelProviders]);

// ✅ 推荐: 使用useCallback缓存回调函数
const handleRemove = useCallback((id: string) => {
  removeModelProvider(id);
}, [removeModelProvider]);

// ✅ 推荐: 批量操作使用removeBatch
const handleRemoveSelected = (ids: string[]) => {
  modelProviderStore.removeBatch(ids);
};
```

---

## 八、技术规范

### 8.1 TypeScript类型定义

```typescript
// 存储键类型
type StoreKey =
  | "modelProviders"
  | "ollamaInstances"
  | "settings"
  | "networkConfig"
  | "nodes"
  | "dbConnections"
  | "users"
  | "alertRules"
  | "patrolConfig"
  | "operationHistory"
  | "fileSystem";

// 存储变更事件
interface StoreChangeEvent<T extends { id: string }> {
  action: "add" | "update" | "remove" | "reset" | "import";
  id?: string;
  data?: T;
  storeKey: StoreKey;
  timestamp: number;
  source: "local" | "broadcast";
}

// 存储变更回调
type StoreChangeCallback<T extends { id: string }> = (event: StoreChangeEvent<T>) => void;

// 本地存储接口
interface LocalStore<T extends { id: string }> {
  getAll: () => T[];
  getById: (id: string) => T | undefined;
  add: (item: Omit<T, "id"> & { id?: string }) => T;
  update: (id: string, updates: Partial<T>) => T | null;
  remove: (id: string) => boolean;
  removeBatch: (ids: string[]) => number;
  reset: () => T[];
  exportData: () => string;
  importData: (json: string) => boolean;
  count: () => number;
}
```

### 8.2 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 存储键 | camelCase | `modelProviders` |
| localStorage键 | snake_case + 前缀 | `yyc3_model_providers` |
| ID前缀 | 简写 | `mp` (model provider) |
| Hook名称 | use + 实体名 | `useModelProviders` |
| Store变量 | 实体名 + Store | `modelProviderStore` |
| 类型名称 | PascalCase | `ModelProviderConfig` |

### 8.3 文件结构规范

```
src/app/
├── stores/                          # 数据存储层
│   ├── global-store-registry.ts     # 全局注册中心
│   ├── unified-stores.ts            # 统一数据存储
│   └── dashboard-stores.ts          # 仪表板数据存储
│
├── lib/                             # 工具库
│   └── create-local-store.ts        # 本地存储工厂
│
├── contexts/                        # React上下文
│   └── GlobalStoreContext.tsx       # 全局数据上下文
│
├── components/                      # 组件
│   └── UnifiedSettingsPanel.tsx     # 统一设置面板
│
└── docs/                            # 文档
    └── DATA_MIGRATION_GUIDE.tsx     # 数据迁移指南
```

---

## 附录

### A. 导出数据格式

```json
{
  "_exportedAt": "2026-04-08T12:00:00.000Z",
  "_version": "2.0",
  "modelProviders": [
    {
      "id": "mp-1234567890-abc123",
      "providerId": "openai",
      "providerLabel": "OpenAI",
      "model": "gpt-4o",
      "apiKey": "sk-...",
      "baseUrl": "https://api.openai.com/v1",
      "createdAt": 1234567890000,
      "lastUsed": null,
      "status": "active"
    }
  ],
  "ollamaInstances": [...],
  "settings": [...],
  "networkConfig": [...],
  "nodes": [...],
  "dbConnections": [...],
  "users": [...],
  "alertRules": [...],
  "patrolConfig": [...],
  "operationHistory": [...]
}
```

### B. 常见问题

**Q: 数据存储在哪里？**
A: 所有数据存储在浏览器的localStorage中，使用`yyc3_`前缀隔离。

**Q: 数据会同步到云端吗？**
A: 不会。这是纯本地化应用，无云端服务器，数据永远不会离开您的设备。

**Q: 如何备份数据？**
A: 在设置面板的"导入导出"标签页，点击"导出并下载"即可获得JSON备份文件。

**Q: 如何迁移到新设备？**
A: 在旧设备导出数据，在新设备导入JSON文件即可。

**Q: 数据安全吗？**
A: 数据完全存储在您的浏览器中，代码开源可审计，无任何隐藏收集行为。

---

## 结语

> **智亦师亦友亦伯乐，谱一言一语一华章！**

YYC³ 一体化存储架构的设计初衷，是构建一个真正属于用户的、完全透明的、极致信任的数据管理方案。在这个架构下：

- **用户是数据的主人**：所有数据由用户完全控制
- **代码是透明的**：开源可审计，无隐藏逻辑
- **存储是本地的**：数据永不离开用户设备
- **协同是智能的**：跨标签页实时同步，体验流畅
- **信任是极致的**：零上传、零收集、零追踪

愿这份文档能帮助每一位开发者和用户，理解并信任这套架构，共同构建人机共进的和谐未来。

---

**文档版本**: 1.0.0  
**最后更新**: 2026-04-08  
**维护团队**: YYC³ 开发团队