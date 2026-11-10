# YYC3 P1-前端-本地存储同步

## 文档信息
| 字段 | 内容 |
|------|------|
| @file | P1-核心功能/YYC3-P1-前端-本地存储同步.md |
| @description | 前端本地存储同步 - 实时同步/冲突解决/离线模式/进度指示 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @status | stable |
| @tags | P1,frontend,sync,storage,ui |

---

## 功能目标

- 实时同步状态显示
- 手动/自动触发同步
- 同步历史记录
- 冲突解决界面
- 离线模式支持
- 同步进度指示器

## 组件架构

```
SyncProvider (Context)
├── SyncStatusIndicator   # 状态指示器 (syncing/success/error/offline)
├── SyncButton            # 同步按钮
├── SyncHistory           # 同步历史列表
├── SyncProgress          # 进度条
├── ConflictResolver      # 冲突解决器 (本地/远程版本对比)
└── OfflineMode           # 离线模式指示器
```

## 同步状态 Context

```typescript
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

export interface Conflict {
  id: string; entityType: 'note' | 'project' | 'file';
  entityId: string; localVersion: any; remoteVersion: any; timestamp: number;
}

interface SyncContextValue {
  status: SyncStatus; lastSyncTime: number | null;
  pendingChanges: number; conflicts: Conflict[]; isOnline: boolean;
  sync: () => Promise<void>;
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote') => Promise<void>;
  clearHistory: () => Promise<void>;
}
```

## 关键行为

- `navigator.onLine` 监听在线/离线切换
- 离线恢复时自动同步
- 每 5 秒检查 pending 变更数
- 同步成功后 3 秒重置状态
- 冲突解决: 全屏遮罩 + 左右对比 + 选择按钮
- 进度条: 渐变 `#667eea → #764ba2`

## 样式

- 状态指示器: `rgba(255,255,255,0.1)` + `backdrop-filter: blur(10px)`
- 同步按钮: 渐变 `#667eea → #764ba2`
- 历史列表: 最多 50 条，按时间倒序
- Badge: success `#4caf50` / error `#f44336` / pending `#ff9800`
- 离线指示器: `rgba(255,152,0,0.1)` 边框

## 验收标准

- 实时状态显示/手动同步/历史记录正常
- 冲突解决/离线模式/同步进度正常
- 自动在线检测、JSDoc >90%
