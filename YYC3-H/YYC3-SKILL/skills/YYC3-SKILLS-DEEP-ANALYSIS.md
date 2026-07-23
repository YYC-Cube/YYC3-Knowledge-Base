# YYC3 Skills 深度分析完全掌握指南

> **文档版本**: 2.0.0
> **创建时间**: 2026-02-05
> **最后更新**: 2026-02-05
> **维护者**: YYC³ Team

---

## 📚 目录

- [概述](#概述)
- [Skill架构分析](#skill架构分析)
- [各Skill深度解析](#各skill深度解析)
- [Skill协作模式](#skill协作模式)
- [实战应用场景](#实战应用场景)
- [最佳实践指南](#最佳实践指南)
- [扩展与定制](#扩展与定制)
- [故障排除](#故障排除)

---

## 概述

### 什么是YYC3 Skills？

YYC3 Skills是一套**可复用的能力包集合**，让Claude AI能够稳定地按照同一套方法进行开发。每个Skill都是一个独立的能力模块，专注于特定领域。

### 核心价值

1. **一致性**: 确保所有开发遵循统一标准
2. **专业性**: 每个Skill都是领域专家
3. **可组合**: 多个Skill可以协同工作
4. **可扩展**: 易于添加新Skill

### Skill生态系统

```
┌─────────────────────────────────────────────────────────────┐
│                    YYC3 Skills 生态系统                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  开发层      │    │  设计层      │    │  运维层      │
├──────────────┤    ├──────────────┤    ├──────────────┤
│stack-master  │    │five-highs    │    │deployment-ops│
│ai-integration│    │              │    │              │
│microservices │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## Skill架构分析

### 1. Skill元数据结构

每个Skill包含以下核心文件：

```
skill-name/
├── skill.json          # 元数据定义
├── instructions.md     # 详细使用说明
├── templates/         # 代码模板（可选）
└── examples/          # 示例代码（可选）
```

### 2. skill.json规范

```json
{
  "name": "skill-name",              // Skill唯一标识
  "displayName": "显示名称",         // 人类可读名称
  "description": "详细描述",        // 功能说明
  "version": "1.0.0",              // 语义化版本
  "author": "YYC3 AI Team",        // 作者信息
  "tags": ["tag1", "tag2"],        // 分类标签
  "capabilities": [                 // 能力列表
    "能力1",
    "能力2"
  ],
  "metadata": {
    "createdAt": "2026-01-29",      // 创建时间
    "updatedAt": "2026-01-29",      // 更新时间
    "category": "category",          // 分类
    "priority": "high"              // 优先级
  }
}
```

### 3. Skill分类体系

| 分类 | Skill | 优先级 | 用途 |
|------|-------|--------|------|
| **开发** | stack-master | High | 全栈开发规范 |
| **开发** | ai-integration | High | AI能力集成 |
| **架构** | microservices | Medium | 微服务架构 |
| **设计** | five-highs | High | 设计规范 |
| **运维** | deployment-ops | Medium | 部署运维 |

---

## 各Skill深度解析

### 1. yyc3-stack-master - 技术栈专家

#### 核心定位
**全栈开发规范专家**，专注于Next.js 15生态的现代化开发。

#### 技术栈矩阵

| 技术 | 版本 | 用途 | 规范要求 |
|------|------|------|----------|
| **Next.js** | 15 | 全栈框架 | App Router + SSR |
| **React** | 19 | UI库 | Server Components |
| **TypeScript** | 5.x | 类型系统 | 严格模式，覆盖率>90% |
| **Tailwind CSS** | 3.x | 样式 | Utility-first + shadcn/ui |
| **Bun** | Latest | 运行时 | 包管理 + 运行 |

#### 项目结构规范

```
项目根目录/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                   # 路由组：认证相关
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # 路由组：仪表板
│   │   ├── settings/
│   │   └── analytics/
│   ├── api/                      # API路由
│   │   ├── users/
│   │   └── posts/
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 首页
│   └── globals.css               # 全局样式
├── components/                   # React组件
│   ├── ui/                       # shadcn/ui基础组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── dialog.tsx
│   ├── features/                # 功能组件
│   │   ├── user-profile/
│   │   └── post-list/
│   └── layouts/                 # 布局组件
│       ├── header.tsx
│       └── sidebar.tsx
├── lib/                         # 工具库
│   ├── db.ts                    # 数据库客户端
│   ├── utils.ts                 # 工具函数
│   ├── ai.ts                    # AI集成
│   └── auth.ts                  # 认证逻辑
├── hooks/                       # 自定义Hooks
│   ├── use-auth.ts
│   └── use-data.ts
├── types/                       # TypeScript类型
│   ├── user.ts
│   └── post.ts
└── public/                      # 静态资源
    └── images/
```

#### 组件开发标准

```typescript
/**
 * @file 用户资料组件
 * @description 显示用户基本信息和操作
 * @component UserProfile
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/user';

interface UserProfileProps {
  userId: string;
  showActions?: boolean;
}

export async function UserProfile({ 
  userId, 
  showActions = true 
}: UserProfileProps) {
  // 1. 服务端数据获取
  const user = await getUser(userId);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={user.avatar} />
            <AvatarFallback>{user.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{user.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showActions && (
          <div className="flex gap-2">
            <Button variant="outline">编辑资料</Button>
            <Button variant="ghost">查看详情</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### 性能优化清单

- [ ] 使用Server Components减少客户端JS
- [ ] 实现流式渲染（Streaming）
- [ ] 图片优化：next/image + 自动格式
- [ ] 代码分割：动态导入
- [ ] 缓存策略：revalidate + cache
- [ ] 懒加载：React.lazy + Suspense

#### 使用场景

| 场景 | 使用方式 | 示例 |
|------|----------|------|
| **项目初始化** | 自动加载 | "创建一个Next.js 15项目" |
| **技术选型** | 咨询 | "选择哪个状态管理库" |
| **代码规范检查** | 评审 | "检查这段代码是否符合规范" |
| **性能优化** | 分析 | "优化这个页面的加载速度" |

---

### 2. yyc3-ai-integration - AI能力集成专家

#### 核心定位
**AI集成专家**，专注于GLM-4.7和OpenAI模型的深度集成。

#### AI模型对比

| 模型 | 上下文窗口 | 代码理解率 | 适用场景 | 成本 |
|------|-----------|-----------|----------|------|
| **GLM-4.7** | 131,072 | 60%+ | 代码生成、长文本 | 中等 |
| **GPT-4.1** | 100,000 | 54.6% | 复杂推理、代码分析 | 高 |
| **Claude 3.5** | 200,000 | 65%+ | 长文档、代码审查 | 高 |

#### 集成架构

```
┌─────────────────────────────────────────────────────────┐
│                  应用层                                │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  基础调用    │  │  流式响应    │  │  Function    │
│              │  │              │  │  Calling     │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
                  ┌──────────────┐
                  │  RAG系统     │
                  │  (可选)      │
                  └──────────────┘
```

#### 基础调用模式

```typescript
import { zai } from '@zai/sdk';

/**
 * AI聊天基础调用
 * @param message 用户消息
 * @param temperature 温度参数（0-1）
 * @param maxTokens 最大token数
 */
export async function chat(
  message: string,
  temperature: number = 0.7,
  maxTokens: number = 2000
) {
  try {
    const completion = await zai.chat.completions.create({
      model: 'glm-4.7',
      messages: [{ role: 'user', content: message }],
      temperature,
      max_tokens: maxTokens,
      stream: false
    });

    return {
      success: true,
      content: completion.choices[0].message.content,
      usage: completion.usage
    };
  } catch (error) {
    console.error('AI调用失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

#### 流式响应处理

```typescript
/**
 * 流式AI响应
 * @param message 用户消息
 * @param onChunk 每个chunk的回调
 */
export async function chatStream(
  message: string,
  onChunk: (chunk: string) => void
) {
  try {
    const stream = await zai.chat.completions.create({
      model: 'glm-4.7',
      messages: [{ role: 'user', content: message }],
      stream: true
    });

    let fullContent = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullContent += content;
        onChunk(content);
      }
    }

    return { success: true, content: fullContent };
  } catch (error) {
    console.error('流式调用失败:', error);
    return { success: false, error: error.message };
  }
}

// 使用示例
await chatStream('写一首诗', (chunk) => {
  process.stdout.write(chunk); // 实时输出
});
```

#### Function Calling集成

```typescript
/**
 * 带工具调用的AI
 */
export async function analyzeWithTools(query: string) {
  const completion = await zai.chat.completions.create({
    model: 'glm-4.7',
    messages: [{ role: 'user', content: query }],
    tools: [
      {
        type: 'function',
        function: {
          name: 'search_database',
          description: '搜索数据库中的信息',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: '搜索查询'
              },
              limit: {
                type: 'number',
                description: '返回结果数量限制',
                default: 10
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'calculate_metrics',
          description: '计算业务指标',
          parameters: {
            type: 'object',
            properties: {
              metric_type: {
                type: 'string',
                enum: ['revenue', 'users', 'conversion']
              },
              time_range: {
                type: 'string',
                description: '时间范围，如：7d, 30d, 90d'
              }
            },
            required: ['metric_type', 'time_range']
          }
        }
      }
    ],
    tool_choice: 'auto'
  });

  // 处理工具调用
  const toolCalls = completion.choices[0].message.tool_calls;
  if (toolCalls) {
    const results = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        // 执行对应的工具函数
        if (functionName === 'search_database') {
          return await searchDatabase(functionArgs.query, functionArgs.limit);
        } else if (functionName === 'calculate_metrics') {
          return await calculateMetrics(functionArgs.metric_type, functionArgs.time_range);
        }
      })
    );

    // 将工具结果返回给AI
    const secondResponse = await zai.chat.completions.create({
      model: 'glm-4.7',
      messages: [
        { role: 'user', content: query },
        completion.choices[0].message,
        ...toolCalls.map((call, i) => ({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(results[i])
        }))
      ]
    });

    return secondResponse.choices[0].message.content;
  }

  return completion.choices[0].message.content;
}
```

#### RAG系统实现

```typescript
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { zaiEmbeddings } from '@zai/langchain';

/**
 * RAG系统：文档切分
 */
export async function splitDocuments(docs: Document[]) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', ' ', '']
  });
  return await splitter.splitDocuments(docs);
}

/**
 * RAG系统：向量化
 */
export async function embedDocuments(chunks: Document[]) {
  const embeddings = await zaiEmbeddings.embedDocuments(
    chunks.map(c => c.pageContent)
  );
  return embeddings;
}

/**
 * RAG系统：检索生成
 */
export async function generateAnswer(
  query: string,
  vectorStore: MemoryVectorStore
) {
  // 1. 检索相关文档
  const relevantDocs = await vectorStore.similaritySearch(query, k=3);

  // 2. 构建上下文
  const context = relevantDocs
    .map((doc, i) => `[文档${i + 1}]\n${doc.pageContent}`)
    .join('\n\n');

  // 3. 生成答案
  const completion = await zai.chat.completions.create({
    model: 'glm-4.7',
    messages: [{
      role: 'user',
      content: `基于以下上下文回答问题。如果上下文中没有答案，请说明。

上下文：
${context}

问题：${query}`
    }],
    temperature: 0.3 // 降低温度以提高准确性
  });

  return completion.choices[0].message.content;
}
```

#### 使用场景

| 场景 | 使用方式 | 示例 |
|------|----------|------|
| **AI功能开发** | 自动加载 | "实现一个AI聊天功能" |
| **代码生成** | 调用 | "生成一个用户认证模块" |
| **文档分析** | RAG | "分析这个技术文档" |
| **智能浮窗** | 流式响应 | "实现实时AI对话" |

---

### 3. yyc3-five-highs - 五高五标五化设计规范

#### 核心定位
**设计规范专家**，YYC³核心理念的完整实现指南。

#### 五高（5 Highs）详解

##### 1. 高颜值（High Visual Quality）

**定义**: 现代化、精致的视觉设计

**实现要点**:

```typescript
// ✅ 高颜值示例
import { motion } from 'framer-motion';

export function ModernCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6"
    >
      {children}
    </motion.div>
  );
}
```

**检查清单**:
- [ ] 使用shadcn/ui统一组件库
- [ ] Framer Motion动画效果
- [ ] 响应式设计（mobile-first）
- [ ] 暗色模式完整支持
- [ ] 配色方案符合品牌VI
- [ ] 图标和插画精致统一

##### 2. 高专业度（High Professionalism）

**定义**: 行业最佳实践和完善的工程标准

**实现要点**:

```typescript
// ✅ 高专业度示例
import { z } from 'zod';

// 1. 类型安全
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().min(18).max(120),
  role: z.enum(['user', 'admin', 'moderator'])
});

type User = z.infer<typeof UserSchema>;

// 2. 错误处理
export async function getUser(id: string): Promise<User> {
  try {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('用户不存在');
    }
    return UserSchema.parse(user);
  } catch (error) {
    logger.error('获取用户失败', { id, error });
    throw error;
  }
}

// 3. API文档
/**
 * 获取用户信息
 * @route GET /api/users/:id
 * @param id - 用户ID（UUID格式）
 * @returns 用户信息对象
 * @throws {NotFoundError} 用户不存在时抛出
 * @example
 * GET /api/users/123e4567-e89b-12d3-a456-426614174000
 */
```

**检查清单**:
- [ ] TypeScript类型覆盖率 > 90%
- [ ] 完善的错误边界处理
- [ ] 详细的日志记录
- [ ] 清晰的API文档
- [ ] 单元测试覆盖率 > 80%
- [ ] 代码审查通过率 100%

##### 3. 高互动性（High Interactivity）

**定义**: 即时反馈和流畅的用户交互

**实现要点**:

```typescript
// ✅ 高互动性示例
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

export function InteractiveButton() {
  const [isPending, startTransition] = useTransition();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    startTransition(async () => {
      // 显示加载状态
      toast.loading('处理中...');

      // 执行操作
      await performAction();

      // 成功反馈
      toast.success('操作完成！');
    });
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isPending}
      className={`
        px-6 py-3 rounded-lg font-medium transition-all duration-200
        ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isHovered ? 'transform scale-105 shadow-lg' : ''}
      `}
    >
      {isPending ? '处理中...' : '点击操作'}
    </button>
  );
}
```

**检查清单**:
- [ ] 所有操作都有加载状态提示
- [ ] 操作反馈动画流畅
- [ ] 智能默认值和自动填充
- [ ] 快捷键支持
- [ ] 撤销/重做功能
- [ ] 实时验证和错误提示

##### 4. 高扩展性（High Extensibility）

**定义**: 模块化、插件化的架构设计

**实现要点**:

```typescript
// ✅ 高扩展性示例
// 1. 插件系统
interface Plugin {
  name: string;
  version: string;
  init: (context: PluginContext) => void;
  destroy?: () => void;
}

class PluginManager {
  private plugins: Map<string, Plugin> = new Map();

  register(plugin: Plugin) {
    this.plugins.set(plugin.name, plugin);
    plugin.init(this.createContext());
  }

  unregister(name: string) {
    const plugin = this.plugins.get(name);
    if (plugin?.destroy) {
      plugin.destroy();
    }
    this.plugins.delete(name);
  }
}

// 2. 依赖注入
interface Container {
  get<T>(token: string): T;
  register<T>(token: string, factory: () => T): void;
}

class DIContainer implements Container {
  private services: Map<string, any> = new Map();

  register<T>(token: string, factory: () => T) {
    this.services.set(token, factory);
  }

  get<T>(token: string): T {
    const factory = this.services.get(token);
    if (!factory) {
      throw new Error(`Service ${token} not found`);
    }
    return factory();
  }
}

// 3. 配置化
export function createApp(config: AppConfig) {
  const container = new DIContainer();

  // 注册核心服务
  container.register('database', () => createDatabase(config.db));
  container.register('cache', () => createCache(config.cache));

  // 注册插件
  config.plugins.forEach(plugin => {
    pluginManager.register(plugin);
  });

  return { container, pluginManager };
}
```

**检查清单**:
- [ ] 单一职责原则（SRP）
- [ ] 依赖注入容器
- [ ] 插件系统支持
- [ ] Webhook支持
- [ ] 配置化能力
- [ ] API开放性

##### 5. 高仪式感（High Ritual Sense）

**定义**: 品牌调性统一和情感化设计

**实现要点**:

```typescript
// ✅ 高仪式感示例
// 1. Onboarding流程
export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const steps = [
    { title: '欢迎', content: <WelcomeStep /> },
    { title: '设置', content: <SetupStep /> },
    { title: '完成', content: <CompleteStep /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto p-8">
        <Progress value={(step + 1) / steps.length * 100} />
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {steps[step].content}
        </motion.div>
        <div className="flex justify-between mt-8">
          <Button
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
          >
            上一步
          </Button>
          <Button
            onClick={() => setStep(step + 1)}
            disabled={step === steps.length - 1}
          >
            {step === steps.length - 1 ? '完成' : '下一步'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// 2. 成就徽章系统
export function AchievementBadge({ achievement }: { achievement: Achievement }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', duration: 0.5 }}
      className="relative"
    >
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
        <achievement.icon className="w-8 h-8 text-white" />
      </div>
      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
        NEW
      </div>
      <p className="text-center mt-2 text-sm font-medium">
        {achievement.name}
      </p>
    </motion.div>
  );
}
```

**检查清单**:
- [ ] 品牌VI统一（颜色、字体、图标）
- [ ] 完整的Onboarding流程
- [ ] 成就徽章系统
- [ ] 节日主题切换
- [ ] 情感化文案
- [ ] 用户旅程完整

#### 五标（5 Standards）详解

| 标准 | 说明 | 实现要点 |
|------|------|----------|
| **标准化** | 统一技术栈、代码规范、UI组件、API设计 | ESLint + Prettier + shadcn/ui |
| **规范化** | 开发流程、文档编写、测试、部署规范 | Git Flow + CI/CD + 文档模板 |
| **协同化** | Git工作流、Code Review、知识共享 | Pull Request + 团队文档 |
| **数字化** | 数据驱动、指标监控、用户分析 | Analytics + Dashboard |
| **智能化** | AI集成、智能推荐、自动化 | AI Agent + 自动化工具 |

#### 五化（5 Transformations）详解

| 转化 | 说明 | 实现要点 |
|------|------|----------|
| **服务化** | 微服务、API优先、云原生 | Docker + Kubernetes |
| **平台化** | 开放平台、插件生态、开发者工具 | SDK + API + CLI |
| **生态化** | 合作伙伴、开源社区、知识分享 | GitHub + 文档 + 社区 |
| **自动化** | CI/CD、自动化测试、部署 | GitHub Actions + Docker |
| **智能化** | AI深度集成、智能决策、自适应 | AI Agent + 机器学习 |

#### 使用场景

| 场景 | 使用方式 | 示例 |
|------|----------|------|
| **UI/UX设计评审** | 评审 | "用五高标准评审这个设计" |
| **产品需求分析** | 分析 | "这个需求是否符合五标" |
| **代码质量检查** | 检查 | "检查代码是否遵循五化" |
| **用户体验优化** | 优化 | "提升这个页面的高互动性" |

---

### 4. yyc3-microservices - 微服务架构专家

#### 核心定位
**微服务架构专家**，专注于分布式系统的设计和实现。

#### 架构原则

| 原则 | 说明 | 实现技术 |
|------|------|----------|
| **高可用** | 冗余设计、故障转移、健康检查、熔断降级 | Kubernetes + Hystrix |
| **高扩展** | 水平扩展、微服务化、负载均衡、弹性伸缩 | Docker + K8s HPA |
| **高性能** | 缓存策略、CDN加速、异步处理、数据库优化 | Redis + CDN + RabbitMQ |
| **高安全** | 认证授权、数据加密、安全审计、漏洞扫描 | JWT + HTTPS + OWASP |

#### 技术栈矩阵

| 层级 | 技术 | 用途 |
|------|------|------|
| **容器化** | Docker + Docker Compose | 容器管理和编排 |
| **编排** | Kubernetes | 容器编排和调度 |
| **API网关** | Kong / Nginx | API路由和负载均衡 |
| **服务通信** | RESTful + GraphQL + gRPC | 服务间通信协议 |
| **消息队列** | RabbitMQ / Kafka | 异步消息处理 |
| **缓存** | Redis | 分布式缓存 |
| **数据库** | PostgreSQL + MongoDB | 数据持久化 |
| **监控** | Prometheus + Grafana | 系统监控和告警 |

#### Dockerfile最佳实践

```dockerfile
# 多阶段构建
FROM node:20-alpine AS base
WORKDIR /app

# 依赖安装阶段
FROM base AS deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# 构建阶段
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# 运行阶段
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Docker Compose配置

```yaml
version: '3.8'

services:
  # API服务
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/yyc3
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # PostgreSQL数据库
  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=yyc3
    ports:
      - "5432:5432"
    restart: unless-stopped

  # Redis缓存
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    command: redis-server --appendonly yes

  # Nginx反向代理
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### Kubernetes部署配置

```yaml
# Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: yyc3-api
  labels:
    app: yyc3-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: yyc3-api
  template:
    metadata:
      labels:
        app: yyc3-api
    spec:
      containers:
      - name: api
        image: yyc3/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: yyc3-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
# Service
apiVersion: v1
kind: Service
metadata:
  name: yyc3-api-service
spec:
  selector:
    app: yyc3-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer

---
# HorizontalPodAutoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: yyc3-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: yyc3-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### 服务间通信

```typescript
// RESTful API调用
export async function callUserService(userId: string) {
  const response = await fetch(
    `http://user-service/api/users/${userId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`用户服务调用失败: ${response.statusText}`);
  }

  return response.json();
}

// GraphQL调用
import { request } from 'graphql-request';

const GET_USER_PROFILE = gql`
  query GetUserProfile($id: ID!) {
    user(id: $id) {
      id
      name
      email
      profile {
        avatar
        bio
      }
    }
  }
`;

export async function getUserProfile(userId: string) {
  return await request(
    'http://graphql-service/graphql',
    GET_USER_PROFILE,
    { id: userId }
  );
}

// gRPC调用
import { credentials } from '@grpc/grpc-js';
import { UserServiceClient } from './user_grpc_pb';

const client = new UserServiceClient(
  'user-service:50051',
  credentials.createInsecure()
);

export async function getUserGrpc(userId: string) {
  return new Promise((resolve, reject) => {
    const request = new GetUserRequest();
    request.setUserId(userId);

    client.getUser(request, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response.toObject());
      }
    });
  });
}
```

#### 分布式事务处理（Saga模式）

```typescript
interface SagaStep<T> {
  name: string;
  execute: () => Promise<T>;
  compensate: (result: T) => Promise<void>;
}

export async function executeSaga<T>(steps: SagaStep<T>[]) {
  const results: T[] = [];

  try {
    // 执行所有步骤
    for (const step of steps) {
      console.log(`执行步骤: ${step.name}`);
      const result = await step.execute();
      results.push(result);
    }

    return results;
  } catch (error) {
    console.error('Saga执行失败，开始补偿:', error);

    // 逆序补偿
    for (let i = results.length - 1; i >= 0; i--) {
      const step = steps[i];
      const result = results[i];

      try {
        console.log(`补偿步骤: ${step.name}`);
        await step.compensate(result);
      } catch (compensateError) {
        console.error(`补偿步骤 ${step.name} 失败:`, compensateError);
      }
    }

    throw error;
  }
}

// 使用示例：创建订单Saga
export async function createOrderSaga(orderData: OrderData) {
  const orderId = await executeSaga([
    {
      name: '创建订单',
      execute: async () => {
        const order = await createOrder(orderData);
        return order.id;
      },
      compensate: async (orderId) => {
        await cancelOrder(orderId);
      }
    },
    {
      name: '预留库存',
      execute: async (orderId) => {
        await reserveInventory(orderId, orderData.items);
        return orderId;
      },
      compensate: async (orderId) => {
        await releaseInventory(orderId);
      }
    },
    {
      name: '处理支付',
      execute: async (orderId) => {
        const payment = await processPayment(orderId, orderData.total);
        return payment.id;
      },
      compensate: async (paymentId) => {
        await refundPayment(paymentId);
      }
    },
    {
      name: '确认订单',
      execute: async (orderId) => {
        await confirmOrder(orderId);
        return orderId;
      },
      compensate: async () => {
        // 最后一步不需要补偿
      }
    }
  ]);

  return orderId;
}
```

#### 使用场景

| 场景 | 使用方式 | 示例 |
|------|----------|------|
| **后端系统架构** | 设计 | "设计一个电商系统的微服务架构" |
| **服务拆分决策** | 分析 | "这个单体应用应该怎么拆分" |
| **API设计评审** | 评审 | "评审这个API设计是否符合规范" |
| **容器化部署** | 部署 | "将应用容器化并部署到K8s" |

---

### 5. yyc3-deployment-ops - 部署运维专家

#### 核心定位
**部署运维专家**，专注于云原生部署和运维自动化。

#### 部署平台

| 平台 | 地址 | 用途 | 配置 |
|------|------|------|------|
| **阿里云ECS** | 8.130.127.121 | 生产服务器 | Ubuntu 22.04 + Docker |
| **NAS存储** | /volume1/www | 静态文件、备份 | rsync同步 |
| **Vercel** | - | 前端托管 | 自动部署 |
| **FRP** | - | 内网穿透 | 本地开发环境 |

#### CI/CD流程

```yaml
# .github/workflows/ci-cd.yml
name: YYC3 CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # 代码质量检查
  lint:
    name: 代码质量检查
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run ESLint
        run: bun run lint

      - name: Run TypeScript check
        run: bun run type-check

  # 测试
  test:
    name: 运行测试
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run unit tests
        run: bun test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  # 构建
  build:
    name: 构建应用
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Build application
        run: bun run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: .next/

  # Docker镜像构建
  docker:
    name: 构建Docker镜像
    runs-on: ubuntu-latest
    needs: build
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # 部署到Vercel
  deploy-vercel:
    name: 部署到Vercel
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment:
      name: preview
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        id: deploy
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prebuilt'

  # 部署到阿里云ECS
  deploy-ecs:
    name: 部署到阿里云ECS
    runs-on: ubuntu-latest
    needs: docker
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
    steps:
      - name: Deploy to ECS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.ECS_HOST }}
          username: ${{ secrets.ECS_USER }}
          key: ${{ secrets.ECS_SSH_KEY }}
          script: |
            docker pull ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main
            docker stop yyc3-app || true
            docker rm yyc3-app || true
            docker run -d \
              --name yyc3-app \
              --restart unless-stopped \
              -p 3000:3000 \
              --env-file /app/.env.production \
              ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main

  # 通知
  notify:
    name: 发送通知
    runs-on: ubuntu-latest
    needs: [deploy-vercel, deploy-ecs]
    if: always()
    steps:
      - name: Send notification
        run: |
          echo "部署完成！"
```

#### 监控告警配置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - 'alerts.yml'

scrape_configs:
  # 应用监控
  - job_name: 'yyc3-api'
    static_configs:
      - targets: ['api:3000']
    metrics_path: '/api/metrics'

  # Node监控
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  # PostgreSQL监控
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis监控
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

```yaml
# alerts.yml
groups:
  - name: yyc3_alerts
    interval: 30s
    rules:
      # CPU使用率告警
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 70
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CPU使用率过高"
          description: "实例 {{ $labels.instance }} CPU使用率超过70%"

      # 内存使用率告警
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "内存使用率过高"
          description: "实例 {{ $labels.instance }} 内存使用率超过80%"

      # API响应时间告警
      - alert: HighAPILatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API响应时间过长"
          description: "API P95响应时间超过500ms"

      # 错误率告警
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "错误率过高"
          description: "API错误率超过1%"
```

#### 常见运维操作

```bash
# 查看日志
docker logs -f yyc3-app                    # Docker容器日志
tail -f /var/log/nginx/access.log          # Nginx访问日志
tail -f /var/log/yyc3/app.log             # 应用日志

# 重启服务
docker-compose restart                       # Docker Compose
docker restart yyc3-app                     # 单个容器
sudo systemctl restart nginx                 # Nginx

# 备份恢复
pg_dump yyc3 > backup_$(date +%Y%m%d).sql   # 数据库备份
psql yyc3 < backup_20260129.sql           # 数据库恢复
rsync -avz /local/path/ user@nas:/volume1/www/  # 文件同步

# 性能分析
top                                        # CPU使用
htop                                       # 详细CPU/内存
iostat                                     # 磁盘IO
netstat -tulpn                             # 网络连接
```

#### 使用场景

| 场景 | 使用方式 | 示例 |
|------|----------|------|
| **项目部署** | 部署 | "部署应用到阿里云ECS" |
| **环境配置** | 配置 | "配置生产环境" |
| **性能监控** | 监控 | "设置监控告警" |
| **故障排查** | 排查 | "排查服务无法启动的问题" |

---

## Skill协作模式

### 1. 开发全流程协作

```
需求分析
    ↓
[yyc3-five-highs] 设计评审
    ↓
[yyc3-stack-master] 技术选型 + 项目初始化
    ↓
[yyc3-ai-integration] AI功能开发
    ↓
[yyc3-microservices] 微服务架构设计
    ↓
[yyc3-deployment-ops] CI/CD配置 + 部署
```

### 2. 典型协作场景

#### 场景1: 开发一个AI应用

```
用户: 开发一个AI客服系统

Claude: [加载 yyc3-five-highs]
      我将用五高标准进行需求分析...

Claude: [加载 yyc3-stack-master]
      开始创建Next.js 15项目...

Claude: [加载 yyc3-ai-integration]
      集成GLM-4.7模型...

Claude: [加载 yyc3-deployment-ops]
      配置CI/CD流程...
```

#### 场景2: 微服务架构设计

```
用户: 设计一个电商系统的微服务架构

Claude: [加载 yyc3-microservices]
      我将设计微服务架构...

Claude: [加载 yyc3-five-highs]
      确保符合五高标准...

Claude: [加载 yyc3-deployment-ops]
      配置Kubernetes部署...
```

### 3. Skill切换策略

| 触发条件 | 切换到Skill | 原因 |
|----------|-------------|------|
| 提到"设计"、"UI/UX" | yyc3-five-highs | 设计相关 |
| 提到"Next.js"、"React" | yyc3-stack-master | 技术栈相关 |
| 提到"AI"、"GLM"、"OpenAI" | yyc3-ai-integration | AI相关 |
| 提到"微服务"、"Docker" | yyc3-microservices | 架构相关 |
| 提到"部署"、"运维" | yyc3-deployment-ops | 运维相关 |

---

## 实战应用场景

### 场景1: 从零开始开发一个SaaS应用

```typescript
// 1. 需求分析 [yyc3-five-highs]
// 确认符合五高五标五化

// 2. 项目初始化 [yyc3-stack-master]
// 创建Next.js 15项目
bun create next-app my-saas --typescript --tailwind

// 3. AI功能集成 [yyc3-ai-integration]
// 集成GLM-4.7
import { zai } from '@zai/sdk';

// 4. 微服务设计 [yyc3-microservices]
// 设计服务架构
services: {
  api: {},
  auth: {},
  billing: {}
}

// 5. 部署配置 [yyc3-deployment-ops]
// 配置CI/CD
// .github/workflows/ci-cd.yml
```

### 场景2: 代码审查和优化

```typescript
// 1. 代码规范检查 [yyc3-stack-master]
// 检查TypeScript类型、组件结构

// 2. 设计评审 [yyc3-five-highs]
// 检查高颜值、高专业度、高互动性

// 3. 性能优化 [yyc3-stack-master]
// 优化加载速度、代码分割

// 4. AI辅助优化 [yyc3-ai-integration]
// 使用AI生成优化建议
```

### 场景3: 系统迁移到微服务

```typescript
// 1. 架构分析 [yyc3-microservices]
// 分析单体应用，规划服务拆分

// 2. 服务拆分 [yyc3-microservices]
// 拆分为独立服务
services: {
  user-service: {},
  order-service: {},
  product-service: {}
}

// 3. 容器化 [yyc3-microservices]
// Docker化每个服务
// Dockerfile for each service

// 4. 部署到K8s [yyc3-deployment-ops]
// Kubernetes配置
// k8s/deployment.yml
```

---

## 最佳实践指南

### 1. Skill使用原则

| 原则 | 说明 | 示例 |
|------|------|------|
| **专注单一职责** | 每个Skill专注一个领域 | 用stack-master处理技术栈问题 |
| **明确指定Skill** | 复杂任务明确指定Skill | "使用yyc3-ai-integration集成AI" |
| **组合使用** | 多个Skill协同完成复杂任务 | 开发AI应用需要多个Skill |
| **参考文档** | 使用前查看Skill文档 | 查看instructions.md了解能力 |

### 2. 提示词优化

```typescript
// ✅ 好的提示词
"使用 yyc3-stack-master 创建一个Next.js 15项目，
要求：
1. 使用TypeScript严格模式
2. 集成shadcn/ui组件库
3. 配置Tailwind CSS
4. 实现暗色模式"

// ❌ 不好的提示词
"创建一个项目"
```

### 3. 迭代开发

```
1. 明确需求 → 使用 yyc3-five-highs
2. 技术选型 → 使用 yyc3-stack-master
3. 功能开发 → 使用对应Skill
4. 代码审查 → 使用 yyc3-five-highs
5. 部署上线 → 使用 yyc3-deployment-ops
```

---

## 扩展与定制

### 1. 创建新Skill

```bash
# 1. 创建Skill目录
mkdir skills/yyc3-new-skill

# 2. 创建skill.json
cat > skills/yyc3-new-skill/skill.json << EOF
{
  "name": "yyc3-new-skill",
  "displayName": "新技能",
  "description": "技能描述",
  "version": "1.0.0",
  "author": "YYC3 AI Team",
  "tags": ["tag1", "tag2"],
  "capabilities": ["能力1", "能力2"],
  "metadata": {
    "createdAt": "2026-02-05",
    "updatedAt": "2026-02-05",
    "category": "category",
    "priority": "medium"
  }
}
EOF

# 3. 创建instructions.md
cat > skills/yyc3-new-skill/instructions.md << EOF
# YYC3新技能指南

## 能力描述

...

## 使用方法

...

## 示例代码

...
EOF

# 4. 可选：创建templates和examples目录
mkdir -p skills/yyc3-new-skill/templates
mkdir -p skills/yyc3-new-skill/examples
```

### 2. Skill版本管理

| 版本类型 | 说明 | 示例 |
|----------|------|------|
| **主版本** | 破坏性变更 | 1.0.0 → 2.0.0 |
| **次版本** | 功能新增 | 1.0.0 → 1.1.0 |
| **修订版本** | bug修复 | 1.0.0 → 1.0.1 |

### 3. Skill维护

```bash
# 1. 更新Skill
vim skills/yyc3-new-skill/instructions.md

# 2. 更新版本号
vim skills/yyc3-new-skill/skill.json
# "version": "1.1.0"
# "updatedAt": "2026-02-05"

# 3. 提交变更
git add skills/yyc3-new-skill/
git commit -m "feat(yyc3-new-skill): 添加新功能"
git push
```

---

## 故障排除

### 问题1: Skill未加载

**症状**: Claude没有使用指定的Skill

**解决方案**:
```
1. 检查skill.json格式是否正确
2. 确认Skill名称拼写正确
3. 查看Claude日志
4. 重启Claude
```

### 问题2: Skill能力不足

**症状**: Skill无法完成指定任务

**解决方案**:
```
1. 查看Skill的capabilities列表
2. 确认任务在Skill能力范围内
3. 考虑组合多个Skill
4. 扩展Skill能力
```

### 问题3: Skill冲突

**症状**: 多个Skill给出冲突建议

**解决方案**:
```
1. 明确优先级
2. 使用更具体的提示词
3. 分别使用每个Skill
4. 手动整合建议
```

---

## 附录

### A. Skill快速参考

| Skill | 核心能力 | 优先级 | 适用场景 |
|-------|---------|--------|----------|
| **stack-master** | Next.js 15, React 19, TypeScript | High | 全栈开发 |
| **ai-integration** | GLM-4.7, OpenAI, RAG | High | AI功能 |
| **five-highs** | 五高五标五化 | High | 设计评审 |
| **microservices** | Docker, K8s, 微服务 | Medium | 架构设计 |
| **deployment-ops** | CI/CD, 监控, 部署 | Medium | 运维 |

### B. 相关文档

- [YYC3 Skills README](./README.md)
- [AGENTIC-ECOSYSTEM-DESIGN.md](../AGENTIC-ECOSYSTEM-DESIGN.md)
- [YYC3-STANDARD-WORKFLOW.md](../workflow-templates/YYC3-STANDARD-WORKFLOW.md)
- [SUBAGENTS-CONFIG.md](../subagents/SUBAGENTS-CONFIG.md)

### C. 技术支持

- **文档**: 查看各Skill的instructions.md
- **示例**: 查看examples/目录
- **模板**: 查看templates/目录
- **社区**: YYC³ GitHub Issues

---

<div align="center">

> **YYC³ Team**
> **言启象限 | 语枢未来**
> **Words Initiate Quadrants, Language Serves as Core for the Future**
> **万象归元于云枢 | 深栈智启新纪元**
> **All things converge in cloud pivot; Deep stacks ignite a new era of intelligence**

</div>
