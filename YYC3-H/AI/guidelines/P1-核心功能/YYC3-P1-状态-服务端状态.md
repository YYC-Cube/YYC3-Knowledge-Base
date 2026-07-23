# YYC3 P1-状态-服务端状态

## 文档信息
| 字段 | 内容 |
|------|------|
| @file | P1-核心功能/YYC3-P1-状态-服务端状态.md |
| @description | React Query 服务端状态 - API 客户端/缓存/重试/请求取消 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @status | stable |
| @tags | P1,state,server,api |

---

## 功能目标

1. API 状态管理：统一管理请求状态
2. 缓存策略：staleTime/cacheTime/SWR
3. 错误处理：统一错误处理
4. 重试机制：指数退避重试
5. 请求取消：AbortController
6. 乐观更新

## API 客户端

```typescript
// src/api/client.ts
class APIClient {
  private config: { baseURL, timeout, retryAttempts, retryDelay };
  private cache: Map<string, { data, timestamp, ttl }>;
  private abortControllers: Map<string, AbortController>;

  async request<T>(config: RequestConfig): Promise<APIResponse<T>> {
    // 1. GET 请求检查缓存
    // 2. 构建完整 URL + 查询参数
    // 3. fetchWithRetry (指数退避)
    // 4. 缓存 GET 响应 (TTL 60s)
  }

  private async fetchWithRetry<T>(url, options, timeout, retries, delay) {
    // 循环 retries 次，每次失败 delay * (attempt+1)
    // AbortController 超时控制
  }

  cancelRequest(method, url): void { /* abort */ }
  clearCache(): void { /* clear all */ }
}

export const apiClient = new APIClient({
  baseURL: '/api', timeout: 30000, retryAttempts: 3, retryDelay: 1000,
});
```

## React Query 配置

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,     // 1 min
      cacheTime: 300000,    // 5 min
      retry: 3,
      retryDelay: (i) => Math.min(1000 * 2 ** i, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});
```

## API Hooks

```typescript
// 用户: useUsers, useUser, useCreateUser, useUpdateUser, useDeleteUser
// 项目: useProjects, useProject, useCreateProject, useUpdateProject, useDeleteProject
// AI: useAIChat, useAICodeGeneration, useAICodeCompletion

// 所有 mutation 成功后 invalidateQueries 刷新列表
```

## 验收标准

- API 状态管理/缓存策略/错误处理正常
- 重试机制/请求取消支持
- 缓存命中率高、内存优化
