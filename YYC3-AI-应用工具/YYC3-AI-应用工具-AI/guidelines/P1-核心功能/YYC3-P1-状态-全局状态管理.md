# YYC3 P1-状态-全局状态管理

## 文档信息
| 字段 | 内容 |
|------|------|
| @file | P1-核心功能/YYC3-P1-状态-全局状态管理.md |
| @description | Zustand 全局状态管理 - 认证/用户/项目/主题/通知 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @status | stable |
| @tags | P1,state,zustand,global |

---

## 功能目标

1. 集中管理全局状态
2. 避免不必要重渲染 (selector)
3. 完整 TypeScript 支持
4. 状态持久化 (persist middleware)
5. 中间件扩展 (devtools/subscribeWithSelector)

## 状态架构

```
GlobalState/
├── useAuthStore         # 认证 (login/logout/refreshToken) + persist
├── useUserStore         # 用户 CRUD + devtools
├── useProjectStore      # 项目 CRUD + devtools
├── useEditorStore       # 编辑器状态
├── useLayoutStore       # 布局状态
├── usePreviewStore      # 预览状态
├── useThemeStore        # 主题 (light/dark/auto) + persist
└── useNotificationStore # 通知 (success/error/warning/info)
```

## 核心 Store 实现

### useAuthStore

```typescript
export const useAuthStore = create<AuthState & AuthActions>()(
  persist((set, get) => ({
    user: null, isAuthenticated: false,
    authStatus: 'idle', error: null,
    login: async (email, password) => { /* fetch /api/auth/login */ },
    logout: async () => { /* fetch /api/auth/logout */ },
    refreshToken: async () => { /* fetch /api/auth/refresh */ },
  }), { name: 'auth-storage', partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }) })
);
```

### useThemeStore

```typescript
export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist((set, get) => ({
    theme: 'dark', useSystemTheme: false,
    setTheme: (theme) => set({ theme }),
    toggleTheme: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
  }), { name: 'theme-storage' })
);
```

### useNotificationStore

```typescript
export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export interface Notification {
  id: string; type: NotificationType;
  title: string; message: string; duration: number;
}
// addNotification: 自动按 duration 移除
// removeNotification / clearNotifications
```

## 性能优化 - Selector 使用

```typescript
// 避免不必要重渲染
const users = useUserStore((state) => state.users);
const loading = useUserStore((state) => state.loading);
```

## 验收标准

- 全局状态管理正常、持久化正常
- 中间件支持完善、类型完整
- Selector 优化无多余重渲染
