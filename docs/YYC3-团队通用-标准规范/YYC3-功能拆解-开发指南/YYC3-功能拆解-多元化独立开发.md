# YYC3 项目功能拆解与多元化独立开发

# Next.js + React + Vite + shadcn/ui + Radix UI + pnpm 技术栈：功能拆解与多元化独立开发指南

本技术栈的核心优势是**组件原子化、构建高效、依赖管理清晰、全栈能力完整**，非常适合将完整功能/复杂组件按职责分层拆解，实现多形态独立开发、独立发布、按需集成。基于 `pnpm workspace` 的 Monorepo 架构是最佳落地载体，可实现本地并行开发、版本统一管理。

## 一、核心拆解方法论：先分层，再独立

### 1.1 拆解五大原则

1. **单一职责**：每个独立模块只负责一个明确的能力，边界清晰
2. **依赖单向**：上层依赖下层，禁止循环依赖（UI层依赖逻辑层，逻辑层不依赖UI）
3. **SSR/CSR分层**：严格区分服务端可用模块与客户端模块，明确标记 `'use client'`
4. **类型先行**：所有模块先定义TypeScript接口，再实现逻辑
5. **可独立测试**：每个模块可单独运行、单独测试、单独发布

### 1.2 实战拆解：以「通用数据管理表格」完整功能为例

我们以后台系统最常见的**带筛选、分页、导出、权限控制的数据表格**为例，按职责拆分为6层，每层均可独立开发：

| 层级 | 模块内容 | 运行环境 | 耦合度 | 可独立形态 |
|------|----------|----------|--------|------------|
| UI展示层 | 表格本体、分页器、筛选栏、操作弹窗、行操作按钮 | 客户端 | 低（纯UI） | 独立UI组件包、主题包 |
| 交互逻辑层 | 排序、筛选、分页、行选择、列配置、虚拟滚动 | 客户端 | 极低（纯逻辑） | 独立Hooks包、功能插件 |
| 数据请求层 | 查询参数封装、请求状态管理、缓存、防抖 | 客户端/服务端 | 低 | 独立请求库、Hooks包 |
| 服务端能力层 | 数据查询、权限校验、导出生成、批量处理 | 服务端 | 中 | 独立Server Action包、API模块 |
| 扩展能力层 | Excel导出、PDF打印、批量导入、AI分析 | 两端均可 | 极低（插拔式） | 独立插件、MCP模块 |
| 业务适配层 | 对接业务API、字段映射、业务权限规则 | 项目内 | 高 | 适配器包、配置模板 |

---

## 二、多元化独立开发方向（含插件、MCP及扩展方向）

以下10个方向均基于上述拆解的模块，可独立开发、独立发布、按需集成到任意同技术栈项目中。

### 方向1：独立UI组件包（基础复用核心）

#### 定义

基于 `Radix UI` 原子组件 + `shadcn/ui` 样式规范，二次封装通用业务组件，发布为私有/公共npm包，替代shadcn的「代码复制」模式，实现多项目统一维护。

#### 适用模块

原子组件、分子组件、通用业务组件（表格、表单、弹窗、导航栏等）

#### 技术实现要点

1. **构建工具**：使用 `Vite 库模式` 构建，输出 ESM + CJS 双格式，类型自动导出
2. **样式处理**：不打包Tailwind样式，仅输出class类名，由宿主项目的Tailwind配置渲染；配套共享Tailwind预设包
3. **SSR兼容**：客户端组件统一在文件顶部标注 `'use client'`，服务端可直接导入的纯展示组件不标注
4. **无障碍**：保留Radix UI原生的无障碍能力，不破坏键盘导航、ARIA属性

#### 示例包结构

```
packages/ui-components/
├── src/
│   ├── components/
│   │   ├── data-table/     # 封装好的业务表格组件
│   │   ├── form/           # 表单组件集
│   │   └── dialog/         # 弹窗组件
│   ├── hooks/              # 组件内部专用Hooks
│   └── index.ts
├── vite.config.ts          # Vite库模式配置
└── package.json
```

#### 技术栈价值

解决shadcn/ui「每个项目复制代码、版本不统一、升级困难」的问题，一套组件多项目复用。

---

### 方向2：独立Hooks/逻辑工具包（逻辑复用核心）

#### 定义

将无UI的交互逻辑、业务规则、工具函数抽离为纯逻辑包，是代码复用的最高效形态，完全与UI解耦。

#### 适用模块

数据请求、表单逻辑、权限判断、状态管理、通用工具函数

#### 技术实现要点

1. **纯函数优先**：无副作用、无UI依赖，支持Tree Shaking
2. **React Hooks规范**：遵循Hooks使用规则，仅在客户端组件中使用
3. **类型完整**：全量TypeScript类型定义，支持泛型适配不同业务

#### 典型可独立Hooks

- `useDataTable`：表格分页、筛选、排序状态管理
- `useFormSchema`：表单校验逻辑封装
- `usePermission`：权限判断通用逻辑
- `useDebounce` / `useThrottle`：通用性能优化Hook

#### 示例包名：`@your-org/react-hooks`、`@your-org/utils`

---

### 方向3：插件化功能模块（你提到的「插件」方向）

#### 定义

为核心组件/功能设计**标准化插件接口**，将扩展能力做成独立插件包，按需注册、零侵入扩展，核心包不包含冗余功能。

#### 适用场景

复杂组件的扩展能力（表格的导出/虚拟滚动、编辑器的格式插件、表单的字段扩展）

#### 技术实现要点

1. **定义统一Plugin API**：规定插件的生命周期、入参、返回值格式
2. **注册式机制**：核心组件提供 `use()` 方法注册插件，插件不修改核心代码
3. **按需加载**：支持动态导入插件，不增加核心包体积

#### 实战示例：表格插件系统

```ts
// 核心包定义插件接口
export interface TablePlugin<T = any> {
  name: string;
  // 插件初始化钩子
  setup?: (tableInstance: TableInstance<T>) => void;
  // 渲染扩展栏
  renderToolbar?: (tableInstance: TableInstance<T>) => React.ReactNode;
  // 扩展列配置
  extendColumns?: (columns: ColumnDef<T>[]) => ColumnDef<T>[];
}

// 独立开发的导出插件包 @your-org/table-plugin-export
import { TablePlugin } from '@your-org/ui-components';
export const exportPlugin: TablePlugin = {
  name: 'export-excel',
  renderToolbar: (instance) => {
    return <Button onClick={() => instance.exportData()}>导出Excel</Button>;
  }
};

// 项目中使用
import { DataTable } from '@your-org/ui-components';
import { exportPlugin } from '@your-org/table-plugin-export';

export default function Page() {
  return <DataTable plugins={[exportPlugin]} columns={columns} data={data} />;
}
```

#### 可独立开发的插件清单

- 表格类：导出插件、虚拟滚动插件、列设置插件、批量操作插件
- 表单类：富文本插件、上传插件、自动填充插件
- 通用类：埋点插件、权限插件、主题切换插件

---

### 方向4：MCP（Model Context Protocol）能力模块（你提到的MCP方向）

#### 定义

基于 MCP 协议，将AI能力、数据接入、工具调用拆分为独立模块，可独立开发、独立部署，无缝集成到React/Next.js项目中。

#### 两种独立开发形态

##### 形态1：MCP 客户端UI组件包（前端侧）

封装通用的AI对话界面、MCP调用逻辑，做成独立React组件包，项目按需引入即可获得AI能力。

- **UI实现**：基于shadcn/ui + Radix Dialog/ScrollArea 搭建聊天界面
- **逻辑封装**：独立 `useMcpClient` Hook，管理连接状态、消息流、工具调用
- **适用场景**：智能助手、AI查询、代码生成等通用AI界面
- **包名示例**：`@your-org/mcp-chat`

##### 形态2：MCP 服务端能力包（服务端侧）

基于Next.js API路由/Server Action实现MCP服务端，将业务数据、工具接口封装为MCP可调用的能力，独立成包，可挂载到任意Next.js项目。

- **能力示例**：用户数据查询MCP、表格数据分析MCP、文件处理MCP
- **技术要点**：遵循MCP协议规范，使用Next.js Route Handlers做通信入口，权限校验独立封装

#### 技术价值

AI能力与业务代码解耦，MCP模块可单独迭代、单独对接大模型，不侵入业务代码。

---

### 方向5：独立Server Action / 服务端能力包（Next.js全栈特色）

#### 定义

将服务端逻辑抽离为独立包，仅在服务端运行，供Next.js项目的Server Component、Server Action、API路由直接调用。

#### 适用模块

通用CRUD操作、文件上传、权限校验、数据库操作、第三方服务集成

#### 技术实现要点

1. **纯服务端**：不包含任何客户端API、DOM操作，禁止被客户端组件直接导入
2. **缓存兼容**：支持Next.js `revalidate`、`cookies`、`headers`等服务端API
3. **类型安全**：输入输出全类型定义，配合Zod做参数校验

#### 示例包能力

- `@your-org/server-auth`：统一登录校验、权限判断、Session管理
- `@your-org/server-crud`：通用数据库增删改查封装
- `@your-org/server-upload`：统一文件上传、签名、存储逻辑

---

### 方向6：Next.js路由与中间件模块

#### 定义

将通用路由逻辑、中间件规则抽成独立包，可直接配置挂载到Next.js项目，无需重复编写。

#### 适用场景

权限中间件、日志中间件、认证回调路由、多语言路由重写

#### 技术实现要点

1. **中间件包**：导出标准中间件函数，支持配置化参数
2. **路由模板包**：提供可复用的API路由、认证回调页面

#### 示例

```ts
// @your-org/next-auth-middleware 包
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function createAuthMiddleware(options: { whiteList: string[] }) {
  return function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    if (!token && !options.whiteList.includes(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  };
}

// 项目中使用
import { createAuthMiddleware } from '@your-org/next-auth-middleware';
export const middleware = createAuthMiddleware({
  whiteList: ['/login', '/register']
});
```

---

### 方向7：设计Token与主题预设包

#### 定义

基于shadcn/ui的CSS变量主题体系，抽离独立的设计规范包，统一多项目的视觉风格。

#### 包含内容

- Tailwind CSS 配置预设（颜色、间距、字体、圆角等设计Token）
- 明暗主题变量、多品牌主题包
- shadcn/ui 组件样式统一覆盖

#### 技术要点

- 以Tailwind预设包形式发布，项目直接在 `tailwind.config.ts` 中引入
- 基于CSS变量实现主题切换，兼容Next.js服务端渲染
- 包名示例：`@your-org/design-tokens`

---

### 方向8：CLI代码生成器与脚手架

#### 定义

独立开发命令行工具，一键生成符合项目规范的组件、页面、路由、接口代码，大幅提升重复功能开发效率。

#### 可实现能力

1. 一键生成CRUD页面（表格+筛选+弹窗表单）
2. 自动添加shadcn/ui组件并二次封装
3. 生成Next.js路由模板、Server Action模板

#### 技术实现

基于Node.js开发，对接shadcn官方CLI，自定义业务模板，发布为全局npm包

#### 示例命令

```bash
your-cli generate crud user --columns id,name,status
```

---

### 方向9：独立测试与Mock套件

#### 定义

将通用测试工具、Mock数据、测试用例抽成独立包，统一多项目测试规范，复用测试逻辑。

#### 包含内容

- 封装后的Testing Library工具函数
- 通用Mock数据生成器（用户、表格数据、接口返回）
- 组件通用测试用例模板

#### 价值

复用组件测试代码，降低测试编写成本，保证复用组件质量一致性。

---

### 方向10：微前端/模块联邦独立模块

#### 定义

将完整业务功能（如用户管理、数据看板）做成可独立部署的模块，基于Vite Module Federation实现按需加载到主应用。

#### 技术要点

- 基于Vite的 `@originjs/vite-plugin-federation` 插件实现
- 独立开发、独立部署、独立灰度发布
- 适配Next.js App Router，支持服务端渲染与客户端渲染混合

#### 适用场景

大型中后台系统、多团队并行开发的复杂项目

---

## 三、工程化落地指导（基于pnpm + Vite Monorepo）

### 3.1 标准目录结构

```
your-monorepo/
├── apps/                     # 业务项目
│   ├── admin-system/         # 后台管理项目（Next.js）
│   └── official-site/        # 官网项目（Next.js）
├── packages/                 # 独立开发模块
│   ├── ui-components/        # UI组件包
│   ├── react-hooks/          # Hooks包
│   ├── utils/                # 工具函数包
│   ├── server-actions/       # 服务端能力包
│   ├── design-tokens/        # 主题包
│   ├── table-plugin-export/  # 表格导出插件
│   └── mcp-chat/             # MCP对话模块
├── pnpm-workspace.yaml
├── package.json
└── turbo.json                # 可选：TurboRepo构建缓存
```

### 3.2 核心配置要点

1. **pnpm workspace**：在 `pnpm-workspace.yaml` 中声明所有包，实现本地软链接，修改即时生效
2. **Vite库模式**：所有独立包使用Vite构建，配置 `build.lib`，输出类型声明
3. **版本管理**：使用 `Changesets` 管理多包版本，自动生成变更日志
4. **本地开发**：使用 `pnpm --filter <包名> dev` 单独开发单个模块

### 3.3 Next.js集成注意事项

1. **'use client' 透传**：独立包中的客户端组件，其 `'use client'` 指令会被Next.js正确识别，无需额外处理
2. **样式共享**：UI包不打包样式，由宿主项目Tailwind扫描包源码生成样式，配置 `content` 包含 `node_modules/@your-org/ui-components`
3. **转译配置**：在 `next.config.ts` 中配置 `transpilePackages`，确保独立包被正确编译

---

## 四、落地实施步骤建议

1. **第一步：分层拆解**：选定1-2个核心功能，按UI/逻辑/服务端/扩展拆分边界
2. **第二步：搭建底座**：初始化pnpm Monorepo，统一TS、ESLint、Prettier规范
3. **第三步：基础复用优先**：先落地UI组件包、Hooks包、主题包这三个高复用模块
4. **第四步：插件化扩展**：为复杂组件设计插件体系，独立开发扩展插件
5. **第五步：高级能力落地**：按需落地MCP模块、CLI工具、微前端等形态
6. **第六步：规范沉淀**：配套文档、版本规则、发布流程，形成可持续迭代的复用体系
