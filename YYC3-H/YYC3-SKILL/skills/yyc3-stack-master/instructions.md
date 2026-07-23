# YYC3技术栈开发规范

> ***YanYuCloudCube***
> 言启象限 | 语枢未来
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> 万象归元于云枢 | 深栈智启新纪元
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

> **万象归元于云枢 | 深栈智启新纪元**

## 核心技术栈

- **框架**: Next.js 15 (App Router)
- **UI**: React 19 + TypeScript
- **样式**: Tailwind CSS + shadcn/ui
- **运行时**: Bun
- **包管理**: Bun install

## 开发规范

### 项目结构
```
app/
├── (auth)/           # 认证相关路由组
├── (dashboard)/      # 仪表板路由组
├── api/              # API路由
├── layout.tsx        # 根布局
└── page.tsx          # 首页
components/
├── ui/              # 基础UI组件
├── features/        # 功能组件
└── layouts/         # 布局组件
lib/
├── db.ts            # 数据库客户端
├── utils.ts         # 工具函数
└── ai.ts            # AI集成
```

### 组件开发标准

```typescript
// 1. 使用TypeScript严格模式
export function UserProfile({ userId }: { userId: string }) {
  // 2. 服务端数据获取
  const user = await getUser(userId);

  // 3. 类型安全
  return (
    <div className="flex items-center gap-4">
      <Avatar src={user.avatar} />
      <Card>
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
```

### 样式规范
- 使用Tailwind CSS实用类
- 遵循shadcn/ui设计系统
- 响应式设计：mobile-first
- 暗色模式支持

### 性能优化
- 服务端渲染（SSR）
- 流式渲染（Streaming）
- 图片优化：next/image
- 代码分割：动态导入

## 常见任务

### 创建新页面
1. 在app/目录创建route.tsx
2. 使用async function Page()
3. 服务端获取数据
4. 返回JSX

### 创建API路由
1. 在app/api/目录创建route.ts
2. 导出GET/POST/PUT/DELETE函数
3. 使用NextResponse返回
4. 错误处理

### AI集成
1. 使用@zai/sdk
2. Server Actions调用
3. 流式响应处理
4. 错误重试
