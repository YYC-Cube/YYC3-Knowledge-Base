# YYC³ AI 智能代理构建器

## 项目概述

YYC³ AI 智能代理构建器是一个可视化的AI工作流构建工具，允许用户通过拖放节点直观地构建复杂的AI工作流。用户可以轻松连接提示词、模型、条件判断、工具调用等组件，构建完整的AI应用，并导出为可直接用于生产环境的代码。

## 技术栈

- **前端框架**: Next.js 15.5.4 (App Router)
- **编程语言**: TypeScript
- **UI组件**: Radix UI + Tailwind CSS
- **状态管理**: React Context + Hooks
- **AI集成**: AI SDK + Google Gemini
- **流程图**: React Flow
- **样式方案**: Tailwind CSS 4.1.9

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发环境运行

```bash
pnpm dev
# 服务将在 http://localhost:3411 启动
```

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 核心功能

1. **可视化工作流编辑器**：通过拖放方式构建AI工作流
2. **多样化节点支持**：提示词、文本模型、图像生成、条件判断、HTTP请求等
3. **实时执行**：直接在界面上测试工作流执行效果
4. **代码导出**：将可视化工作流导出为生产就绪的代码
5. **响应式设计**：适配不同尺寸的设备

## API接口文档

### 1. 获取国家信息

```
GET /api/demo-country
```

#### 功能描述
获取请求来源的国家信息，用于演示国际化功能。

#### 响应示例
```json
{
  "country": "CN",
  "message": "Hello from CN!"
}
```

### 2. 执行工作流

```
POST /api/execute-workflow
```

#### 功能描述
执行用户构建的AI工作流，支持流式响应结果。

#### 请求体格式
```json
{
  "nodes": [
    {
      "id": "node-1",
      "type": "start",
      "position": { "x": 100, "y": 100 }
    },
    {
      "id": "node-2",
      "type": "prompt",
      "position": { "x": 300, "y": 100 },
      "data": {
        "prompt": "请生成一段关于人工智能的介绍"
      }
    },
    // 更多节点...
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2"
    }
    // 更多边...
  ]
}
```

#### 响应格式
流式响应，包含工作流执行过程中的各个节点状态更新：

```
{"type":"node_start","nodeId":"node-1","nodeType":"start"}
{"type":"node_complete","nodeId":"node-1","nodeType":"start","output":{}}
{"type":"node_start","nodeId":"node-2","nodeType":"prompt"}
{"type":"node_complete","nodeId":"node-2","nodeType":"prompt","output":"人工智能..."}
{"type":"complete","executionLog":[...execution_results]}
```

## 项目结构

```
├── app/                  # Next.js App Router 页面
│   ├── api/              # API 路由
│   ├── globals.css       # 全局样式
│   ├── layout.tsx        # 根布局
│   └── page.tsx          # 首页
├── components/           # React 组件
│   ├── nodes/            # 工作流节点组件
│   └── ui/               # UI 组件库
├── lib/                  # 工具函数和核心逻辑
├── public/               # 静态资源
└── styles/               # 样式文件
```

## 支持的节点类型

- **开始节点** (start-node): 工作流的入口点
- **提示词节点** (prompt-node): 定义AI提示内容
- **文本模型节点** (text-model-node): 配置和调用文本生成模型
- **条件判断节点** (conditional-node): 根据条件执行不同路径
- **HTTP请求节点** (http-request-node): 发送HTTP请求并获取结果
- **工具节点** (tool-node): 调用外部工具
- **图像生成节点** (image-generation-node): 生成图像内容
- **嵌入模型节点** (embedding-model-node): 生成文本嵌入向量
- **音频节点** (audio-node): 处理音频相关功能
- **结构化输出节点** (structured-output-node): 生成结构化数据输出
- **结束节点** (end-node): 工作流的结束点

## 配置说明

### 环境变量

项目支持以下环境变量配置：

- `GOOGLE_API_KEY`: Google AI 模型 API 密钥
- `NEXT_PUBLIC_BASE_URL`: 应用的基础URL

### 端口配置

项目默认在端口 3411 上运行，可通过修改 `package.json` 中的 `scripts` 部分更改端口号。

## 开发说明

### 代码规范

- 使用 TypeScript 进行类型安全开发
- 遵循 React Hooks 最佳实践
- 组件化设计，提高代码复用性
- 采用 Tailwind CSS 进行样式管理

### 测试

```bash
pnpm test
```

### 代码质量检查

```bash
pnpm lint
```

## 许可证

MIT License

## 作者

YYC³

## 版本

1.0.0
