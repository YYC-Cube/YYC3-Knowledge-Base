
YYC3-P2-插件-插件开发.md
You are a senior AI code generation specialist and intelligent development tools architect with deep expertise in AI-powered code generation, code analysis, and developer productivity enhancement.
Your Role & Expertise

You are an experienced AI developer who specializes in:
- **AI Code Generation**: LLM-based code generation, code completion, code refactoring
- **Code Analysis**: Static analysis, code quality assessment, bug detection
- **Code Optimization**: Performance optimization, code simplification, best practices
- **Testing**: Automated test generation, test coverage analysis, test optimization
- **Documentation**: Code documentation generation, API documentation, inline comments
- **Developer Experience**: IDE integration, real-time suggestions, intelligent autocomplete
- **Code Patterns**: Design patterns, architectural patterns, code templates
- **Best Practices**: Clean code, SOLID principles, code maintainability

### Code Standards

**IMPORTANT**: Please ensure all generated code files follow the team requirements specified in: `guidelines/YYC3-Code-header.md`

All code files must include proper file headers with:
- @file: File name/path
- @description: Clear description of file purpose
- @author: YanYuCloudCube Team <admin@0379.email>
- @version: Semantic version (v1.0.0)
- @created: Creation date (YYYY-MM-DD)
- @updated: Last update date (YYYY-MM-DD)
- @status: File status (draft/dev/test/stable/deprecated)
- @license: License type
- @copyright: Copyright notice
- @tags: Relevant tags for categorization

---

## 📋 文档信息

| 字段 | 内容 |
|------|------|
| @file | P1-核心功能/YYC3-P1-AI-智能代码生成.md |
| @description | AI 智能代码生成功能设计和实现，包含代码生成、代码补全、代码优化等 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @created | 2026-03-14 |
| @updated | 2026-03-14 |
| @status | stable |
| @license | MIT |
| @copyright | Copyright (c) 2026 YanYuCloudCube Team |
| @tags P1,AI,code,generation |

---

## 🎯 功能目标

### 核心目标

1. **代码生成**：根据描述生成代码
2. **代码补全**：智能代码自动补全
3. **代码优化**：优化代码质量和性能
4. **代码解释**：解释代码功能
5. **代码重构**：重构代码结构
6. **代码测试**：生成测试代码

---

## 🏗️ 架构设计

### 1. 功能架构

```
AI Code Generation/
├── CodeGenerator          # 代码生成器
├── CodeCompleter         # 代码补全器
├── CodeOptimizer         # 代码优化器
├── CodeExplainer         # 代码解释器
├── CodeRefactor         # 代码重构器
└── CodeTestGenerator     # 测试代码生成器
```

### 2. 数据流

```
User Input (用户输入)
    ↓ AI Prompt
AI Provider (AI 提供商)
    ↓ AI Response
Code Generator (代码生成器)
    ↓ Generated Code
Editor (编辑器)
```

---

## 💻 核心实现

### 1. 代码生成器

```typescript
// src/ai/code/CodeGenerator.ts
import { aiProviderManager } from '../AIProviderManager';
import type { AIRequestConfig } from '@/types';

export interface CodeGenerationOptions {
  /** 代码语言 */
  language: string;
  /** 代码描述 */
  description: string;
  /** 代码上下文 */
  context?: string;
  /** 是否包含注释 */
  includeComments?: boolean;
  /** 代码风格 */
  style?: 'functional' | 'object-oriented' | 'procedural';
  /** 是否包含错误处理 */
  includeErrorHandling?: boolean;
}

export class CodeGenerator {
  /**
   * 生成代码
   */
  async generateCode(options: CodeGenerationOptions): Promise<string> {
    const {
      language,
      description,
      context = '',
      includeComments = true,
      style = 'object-oriented',
      includeErrorHandling = true,
    } = options;

    const systemPrompt = this.buildSystemPrompt(language, style, includeComments, includeErrorHandling);
    const userPrompt = this.buildUserPrompt(description, context);

    const config: AIRequestConfig = {
      provider: await aiProviderManager.selectProvider(),
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 4096,
      stream: false,
    };

    const response = await aiProviderManager.request(config);
    return response.content;
  }

  /**
   * 流式生成代码
   */
  async generateCodeStream(
    options: CodeGenerationOptions,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const {
      language,
      description,
      context = '',
      includeComments = true,
      style = 'object-oriented',
      includeErrorHandling = true,
    } = options;

    const systemPrompt = this.buildSystemPrompt(language, style, includeComments, includeErrorHandling);
    const userPrompt = this.buildUserPrompt(description, context);

    const config: AIRequestConfig = {
      provider: await aiProviderManager.selectProvider(),
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 4096,
      stream: true,
    };

    await aiProviderManager.streamRequest(config, onChunk, onComplete, onError);
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(
    language: string,
    style: string,
    includeComments: boolean,
    includeErrorHandling: boolean
  ): string {
    let prompt = `You are an expert ${language} programmer. Generate clean, efficient, and well-structured code.\n\n`;

    prompt += `Code Style: ${style}\n`;
    prompt += includeComments ? 'Include clear and helpful comments.\n' : 'Do not include comments.\n';
    prompt += includeErrorHandling ? 'Include proper error handling.\n' : 'Do not include error handling.\n';

    prompt += `\nGuidelines:\n`;
    prompt += `- Write production-ready code\n`;
    prompt += `- Follow best practices and conventions\n`;
    prompt += `- Use meaningful variable and function names\n`;
    prompt += `- Keep code DRY (Don't Repeat Yourself)\n`;
    prompt += `- Write modular and reusable code\n`;

    return prompt;
  }

  /**
   * 构建用户提示词
   */
  private buildUserPrompt(description: string, context: string): string {
    let prompt = '';

    if (context) {
      prompt += `Context:\n${context}\n\n`;
    }

    prompt += `Task:\n${description}\n\n`;
    prompt += `Please generate the code that fulfills the above requirements. Only output the code, no explanations.`;

    return prompt;
  }
}

export const codeGenerator = new CodeGenerator();
```

### 2. 代码补全器

```typescript
// src/ai/code/CodeCompleter.ts
import { aiProviderManager } from '../AIProviderManager';
import type { AIRequestConfig } from '@/types';

export interface CodeCompletionOptions {
  /** 代码语言 */
  language: string;
  /** 当前代码 */
  code: string;
  /** 光标位置 */
  cursorPosition: { line: number; column: number };
  /** 补全类型 */
  type?: 'inline' | 'block' | 'function' | 'class';
  /** 最大补全长度 */
  maxLength?: number;
}

export class CodeCompleter {
  /**
   * 生成代码补全
   */
  async completeCode(options: CodeCompletionOptions): Promise<string> {
    const {
      language,
      code,
      cursorPosition,
      type = 'inline',
      maxLength = 100,
    } = options;

    const prompt = this.buildPrompt(language, code, cursorPosition, type);

    const config: AIRequestConfig = {
      provider: await aiProviderManager.selectProvider(),
      model: 'gpt-4',
      messages: [
        { role: 'system', content: this.buildSystemPrompt(language) },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      maxTokens: maxLength,
      stream: false,
    };

    const response = await aiProviderManager.request(config);
    return response.content;
  }

  /**
   * 流式代码补全
   */
  async completeCodeStream(
    options: CodeCompletionOptions,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const {
      language,
      code,
      cursorPosition,
      type = 'inline',
      maxLength = 100,
    } = options;

    const prompt = this.buildPrompt(language, code, cursorPosition, type);

    const config: AIRequestConfig = {
      provider: await aiProviderManager.selectProvider(),
      model: 'gpt-4',
      messages: [
        { role: 'system', content: this.buildSystemPrompt(language) },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      maxTokens: maxLength,
      stream: true,
    };

    await aiProviderManager.streamRequest(config, onChunk, onComplete, onError);
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(language: string): string {
    return `You are an expert ${language} programmer. Complete the code at the cursor position. Only provide the completion, no explanations.`;
  }

  /**
   * 构建提示词
   */
  private buildPrompt(
    language: string,
    code: string,
    cursorPosition: { line: number; column: number },
    type: string
  ): string {
    const lines = code.split('\n');
    const prefix = lines.slice(0, cursorPosition.line).join('\n') + '\n';
    const currentLine = lines[cursorPosition.line];
    const suffix = lines.slice(cursorPosition.line + 1).join('\n');

    let prompt = `Language: ${language}\n`;
    prompt += `Completion Type: ${type}\n\n`;
    prompt += `Code:\n\`\`\`${language}\n${prefix}${currentLine.slice(0, cursorPosition.column)}<CURSOR>${currentLine.slice(cursorPosition.column)}\n${suffix}\n\`\`\`\n\n`;
    prompt += `Complete the code at <CURSOR>. Only output the completion, no explanations.`;

    return prompt;
  }
}

export const codeCompleter = new CodeCompleter();
```

### 3. 代码优化器

```typescript
// src/ai/code/CodeOptimizer.ts
import { aiProviderManager } from '../AIProviderManager';
import type { AIRequestConfig } from '@/types';

export interface CodeOptimizationOptions {
  /** 代码语言 */
  language: string;
  /** 原始代码 */
  code: string;
  /** 优化目标 */
  goals?: ('performance' | 'readability' | 'maintainability' | 'security')[];
  /** 是否保留注释 */
  keepComments?: boolean;
}

export class CodeOptimizer {
  /**
   * 优化代码
   */
  async optimizeCode(options: CodeOptimizationOptions): Promise<{ optimizedCode: string; explanation: string }> {
    const {
      language,
      code,
      goals = ['performance', 'readability'],
      keepComments = true,
    } = options;

    const prompt = this.buildPrompt(language, code, goals, keepComments);

    const config: AIRequestConfig = {
      provider: await aiProviderManager.selectProvider(),
      model: 'gpt-4',
      messages: [
        { role: 'system', content: this.buildSystemPrompt(language) },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      maxTokens: 4096,
      stream: false,
    };

    const response = await aiProviderManager.request(config);
    const { optimizedCode, explanation } = this.parseResponse(response.content);

    return { optimizedCode, explanation };
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(language: string): string {
    return `You are an expert ${language} programmer and code reviewer. Optimize the given code for better performance, readability, and maintainability.`;
  }

  /**
   * 构建提示词
   */
  private buildPrompt(
    language: string,
    code: string,
    goals: string[],
    keepComments: boolean
  ): string {
    let prompt = `Language: ${language}\n`;
    prompt += `Optimization Goals: ${goals.join(', ')}\n`;
    prompt += `Keep Comments: ${keepComments ? 'Yes' : 'No'}\n\n`;
    prompt += `Original Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
    prompt += `Please optimize the code. Provide:\n`;
    prompt += `1. The optimized code\n`;
    prompt += `2. A brief explanation of the changes made\n\n`;
    prompt += `Format your response as:\n`;
    prompt += `OPTIMIZED_CODE:\n\`\`\`${language}\n[optimized code here]\n\`\`\`\n\n`;
    prompt += `EXPLANATION:\n[explanation here]`;

    return prompt;
  }

  /**
   * 解析响应
   */
  private parseResponse(content: string): { optimizedCode: string; explanation: string } {
    const optimizedCodeMatch = content.match(/OPTIMIZED_CODE:\n```(?:\w+)?\n([\s\S]*?)\n```/);
    const explanationMatch = content.match(/EXPLANATION:\n([\s\S]*)/);

    return {
      optimizedCode: optimizedCodeMatch?.[1]?.trim() || '',
      explanation: explanationMatch?.[1]?.trim() || '',
    };
  }
}

export const codeOptimizer = new CodeOptimizer();
```

### 4. 代码解释器

```typescript
// src/ai/code/CodeExplainer.ts
import { aiProviderManager } from '../AIProviderManager';
import type { AIRequestConfig } from '@/types';

export interface CodeExplanationOptions {
  /** 代码语言 */
  language: string;
  /** 代码 */
  code: string;
  /** 解释详细程度 */
  detailLevel?: 'brief' | 'detailed' | 'comprehensive';
  /** 目标受众 */
  audience?: 'beginner' | 'intermediate' | 'expert';
}

export class CodeExplainer {
  /**
   * 解释代码
   */
  async explainCode(options: CodeExplanationOptions): Promise<string> {
    const {
      language,
      code,
      detailLevel = 'detailed',
      audience = 'intermediate',
    } = options;

    const prompt = this.buildPrompt(language, code, detailLevel, audience);

    const config: AIRequestConfig = {
      provider: await aiProviderManager.selectProvider(),
      model: 'gpt-4',
      messages: [
        { role: 'system', content: this.buildSystemPrompt(language) },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      maxTokens: 2048,
      stream: false,
    };

    const response = await aiProviderManager.request(config);
    return response.content;
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(language: string): string {
    return `You are an expert ${language} programmer and educator. Explain code clearly and accurately.`;
  }

  /**
   * 构建提示词
   */
  private buildPrompt(
    language: string,
    code: string,
    detailLevel: string,
    audience: string
  ): string {
    let prompt = `Language: ${language}\n`;
    prompt += `Detail Level: ${detailLevel}\n`;
    prompt += `Target Audience: ${audience}\n\n`;
    prompt += `Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
    prompt += `Please explain this code. Include:\n`;
    prompt += `- Overall purpose and functionality\n`;
    prompt += `- Key components and their roles\n`;
    prompt += `- How the code works\n`;
    prompt += `- Any important patterns or techniques used\n`;
    prompt += `- Potential improvements or issues (if any)`;

    return prompt;
  }
}

export const codeExplainer = new CodeExplainer();
```

---

## ✅ 验收标准

### 功能完整性

- ✅ 代码生成功能正常
- ✅ 代码补全功能完善
- ✅ 代码优化功能准确
- ✅ 代码解释功能清晰
- ✅ 流式输出支持

### 代码质量

- ✅ 代码结构清晰
- ✅ 类型定义完整
- ✅ 注释文档完整
- ✅ 代码可维护性好
- ✅ 测试覆盖充分YYC3-P2-插件-插件系统.md
You are a senior plugin development specialist and extensibility architect with deep expertise in plugin systems, third-party integrations, and developer experience for plugin creators.
Your Role & Expertise

You are an experienced plugin architect who specializes in:
- **Plugin Systems**: Plugin architecture, lifecycle management, dependency injection
- **API Design**: Plugin APIs, hooks, events, extension points
- **Type Safety**: TypeScript plugin types, type generation, API contracts
- **Developer Experience**: Plugin development tools, debugging, documentation
- **Security**: Plugin sandboxing, permission systems, secure APIs
- **Performance**: Plugin loading optimization, lazy loading, hot reloading
- **Testing**: Plugin testing frameworks, integration testing, E2E testing
- **Best Practices**: Plugin versioning, backward compatibility, migration guides

### Code Standards

**IMPORTANT**: Please ensure all generated code files follow the team requirements specified in: `guidelines/YYC3-Code-header.md`

All code files must include proper file headers with:
- @file: File name/path
- @description: Clear description of file purpose
- @author: YanYuCloudCube Team <admin@0379.email>
- @version: Semantic version (v1.0.0)
- @created: Creation date (YYYY-MM-DD)
- @updated: Last update date (YYYY-MM-DD)
- @status: File status (draft/dev/test/stable/deprecated)
- @license: License type
- @copyright: Copyright notice
- @tags: Relevant tags for categorization

---

## 📋 插件开发指南

### 插件开发概述

YYC3-AI Code Designer 提供强大的插件系统，允许开发者扩展应用功能，集成第三方服务，并自定义用户体验。本指南将帮助您快速上手插件开发。

### 开发环境准备

#### 必需工具

- **Node.js**: >= 18.0.0
- **TypeScript**: >= 5.0.0
- **Vite**: >= 5.0.0
- **代码编辑器**: VS Code (推荐)

#### 推荐工具

- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Git**: 版本控制

#### 环境配置

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建插件
npm run build:plugin
```

### 插件项目结构

```
my-yyc3-plugin/
├── src/
│   ├── index.ts              # 插件入口文件
│   ├── components/           # 插件组件
│   ├── services/            # 插件服务
│   ├── types/               # 类型定义
│   └── utils/               # 工具函数
├── public/                  # 静态资源
│   └── icon.svg             # 插件图标
├── package.json             # 插件配置
├── tsconfig.json            # TypeScript 配置
├── vite.config.ts           # Vite 配置
└── README.md                # 插件文档
```

### 插件清单 (Plugin Manifest)

#### 基本配置

```typescript
// package.json
{
  "name": "yyc3-plugin-my-plugin",
  "version": "1.0.0",
  "description": "我的 YYC3 插件",
  "main": "dist/index.js",
  "yyc3": {
    "id": "my-plugin",
    "name": "我的插件",
    "description": "插件描述",
    "author": "开发者姓名 <email@example.com>",
    "appVersion": "1.0.0",
    "icon": "icon.svg",
    "permissions": [
      "storage",
      "network",
      "ui"
    ],
    "config": [
      {
        "key": "apiKey",
        "type": "string",
        "label": "API 密钥",
        "required": true,
        "secret": true
      }
    ]
  }
}
```

#### 权限说明

| 权限 | 说明 | 使用场景 |
|------|------|----------|
| `storage` | 本地存储访问 | 保存插件配置、缓存数据 |
| `network` | 网络请求 | 调用外部 API |
| `ui` | UI 操作 | 添加面板、按钮、菜单项 |
| `editor` | 编辑器访问 | 读取/修改代码内容 |
| `ai` | AI 服务调用 | 使用 AI 生成代码 |
| `database` | 数据库访问 | 查询/修改数据库 |
| `collaboration` | 协作功能 | 访问协作状态 |

### 插件 API

#### 核心 API

```typescript
/**
 * 插件基类
 */
export abstract class BasePlugin {
  /**
   * 插件激活时调用
   */
  abstract activate(context: PluginContext): Promise<void> | void;

  /**
   * 插件停用时调用
   */
  abstract deactivate(): Promise<void> | void;

  /**
   * 插件配置更新时调用
   */
  onConfigChange?(config: Record<string, any>): Promise<void> | void;
}

/**
 * 插件上下文
 */
export interface PluginContext {
  /** 插件 API */
  api: PluginAPI;

  /** 插件配置 */
  config: Record<string, any>;

  /** 插件存储 */
  storage: PluginStorage;

  /** 插件日志 */
  logger: PluginLogger;
}

/**
 * 插件 API
 */
export interface PluginAPI {
  /** UI API */
  ui: UIAPI;

  /** 编辑器 API */
  editor: EditorAPI;

  /** AI API */
  ai: AIAPI;

  /** 数据库 API */
  database: DatabaseAPI;

  /** 协作 API */
  collaboration: CollaborationAPI;

  /** 网络请求 */
  fetch: typeof fetch;

  /** 发送消息 */
  sendMessage: (message: any) => Promise<any>;

  /** 监听消息 */
  onMessage: (handler: (message: any) => void) => () => void;
}
```

#### UI API

```typescript
/**
 * UI API
 */
export interface UIAPI {
  /**
   * 注册面板
   */
  registerPanel(config: PanelConfig): void;

  /**
   * 注册按钮
   */
  registerButton(config: ButtonConfig): void;

  /**
   * 注册菜单项
   */
  registerMenuItem(config: MenuItemConfig): void;

  /**
   * 显示通知
   */
  showNotification(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;

  /**
   * 显示对话框
   */
  showDialog(config: DialogConfig): Promise<boolean>;

  /**
   * 显示输入框
   */
  showInputBox(options: InputBoxOptions): Promise<string | undefined>;

  /**
   * 显示选择框
   */
  showQuickPick(items: QuickPickItem[]): Promise<QuickPickItem | undefined>;
}

/**
 * 面板配置
 */
export interface PanelConfig {
  /** 面板 ID */
  id: string;

  /** 面板标题 */
  title: string;

  /** 面板位置 */
  position: 'left' | 'right' | 'bottom';

  /** 面板组件 */
  component: React.ComponentType<any>;

  /** 面板图标 */
  icon?: string;

  /** 是否可关闭 */
  closable?: boolean;

  /** 是否可调整大小 */
  resizable?: boolean;
}

/**
 * 按钮配置
 */
export interface ButtonConfig {
  /** 按钮 ID */
  id: string;

  /** 按钮文本 */
  label: string;

  /** 按钮图标 */
  icon?: string;

  /** 按钮位置 */
  position: 'toolbar' | 'editor' | 'sidebar';

  /** 点击处理函数 */
  onClick: () => void | Promise<void>;
}
```

#### 编辑器 API

```typescript
/**
 * 编辑器 API
 */
export interface EditorAPI {
  /**
   * 获取当前编辑器内容
   */
  getContent(): string;

  /**
   * 设置编辑器内容
   */
  setContent(content: string): void;

  /**
   * 获取选中文本
   */
  getSelection(): string;

  /**
   * 设置选中文本
   */
  setSelection(text: string): void;

  /**
   * 在光标位置插入文本
   */
  insertText(text: string): void;

  /**
   * 获取当前文件路径
   */
  getFilePath(): string | null;

  /**
   * 获取当前语言
   */
  getLanguage(): string;

  /**
   * 格式化代码
   */
  format(): Promise<void>;

  /**
   * 监听内容变化
   */
  onContentChange(handler: (content: string) => void): () => void;
}
```

#### AI API

```typescript
/**
 * AI API
 */
export interface AIAPI {
  /**
   * 生成代码
   */
  generateCode(prompt: string, options?: GenerateOptions): Promise<string>;

  /**
   * 代码补全
   */
  completeCode(context: string, options?: CompleteOptions): Promise<string[]>;

  /**
   * 代码优化
   */
  optimizeCode(code: string, options?: OptimizeOptions): Promise<string>;

  /**
   * 代码解释
   */
  explainCode(code: string, options?: ExplainOptions): Promise<string>;

  /**
   * 代码审查
   */
  reviewCode(code: string, options?: ReviewOptions): Promise<ReviewResult>;
}

/**
 * 生成选项
 */
export interface GenerateOptions {
  /** 提供商 */
  provider?: 'openai' | 'anthropic' | 'zhipu' | 'baidu' | 'aliyun' | 'ollama';

  /** 模型 */
  model?: string;

  /** 最大 token 数 */
  maxTokens?: number;

  /** 温度 */
  temperature?: number;

  /** 语言 */
  language?: string;
}
```

### 插件开发示例

#### 示例 1: 简单的代码格式化插件

```typescript
// src/index.ts
import { BasePlugin, PluginContext } from '@yyc3/plugin-api';

export default class FormatPlugin extends BasePlugin {
  private context!: PluginContext;

  async activate(context: PluginContext): Promise<void> {
    this.context = context;

    // 注册工具栏按钮
    context.api.ui.registerButton({
      id: 'format-code',
      label: '格式化代码',
      icon: 'format',
      position: 'toolbar',
      onClick: this.handleFormatClick.bind(this),
    });

    context.api.ui.showNotification('格式化插件已激活', 'success');
  }

  async deactivate(): Promise<void> {
    this.context.api.ui.showNotification('格式化插件已停用', 'info');
  }

  private async handleFormatClick(): Promise<void> {
    try {
      await this.context.api.editor.format();
      this.context.api.ui.showNotification('代码格式化完成', 'success');
    } catch (error) {
      this.context.api.ui.showNotification(
        `格式化失败: ${error instanceof Error ? error.message : '未知错误'}`,
        'error'
      );
    }
  }
}
```

#### 示例 2: AI 代码生成插件

```typescript
// src/index.ts
import { BasePlugin, PluginContext } from '@yyc3/plugin-api';

export default class AIGeneratePlugin extends BasePlugin {
  private context!: PluginContext;

  async activate(context: PluginContext): Promise<void> {
    this.context = context;

    // 注册菜单项
    context.api.ui.registerMenuItem({
      id: 'ai-generate',
      label: 'AI 生成代码',
      position: 'editor',
      onClick: this.handleGenerateClick.bind(this),
    });

    context.api.ui.showNotification('AI 生成插件已激活', 'success');
  }

  async deactivate(): Promise<void> {
    this.context.api.ui.showNotification('AI 生成插件已停用', 'info');
  }

  private async handleGenerateClick(): Promise<void> {
    const selection = this.context.api.editor.getSelection();

    if (!selection) {
      this.context.api.ui.showNotification('请先选择要生成的代码描述', 'warning');
      return;
    }

    try {
      const generated = await this.context.api.ai.generateCode(selection, {
        provider: 'openai',
        model: 'gpt-4',
        language: this.context.api.editor.getLanguage(),
      });

      this.context.api.editor.insertText(generated);
      this.context.api.ui.showNotification('代码生成完成', 'success');
    } catch (error) {
      this.context.api.ui.showNotification(
        `生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
        'error'
      );
    }
  }
}
```

#### 示例 3: 自定义面板插件

```typescript
// src/index.ts
import { BasePlugin, PluginContext } from '@yyc3/plugin-api';
import React from 'react';

export default class CustomPanelPlugin extends BasePlugin {
  private context!: PluginContext;

  async activate(context: PluginContext): Promise<void> {
    this.context = context;

    // 注册自定义面板
    context.api.ui.registerPanel({
      id: 'custom-panel',
      title: '自定义面板',
      position: 'right',
      icon: 'panel',
      component: CustomPanel,
      closable: true,
      resizable: true,
    });

    context.api.ui.showNotification('自定义面板插件已激活', 'success');
  }

  async deactivate(): Promise<void> {
    this.context.api.ui.showNotification('自定义面板插件已停用', 'info');
  }
}

// 自定义面板组件
const CustomPanel: React.FC = () => {
  return (
    <div style={{ padding: '16px' }}>
      <h3>自定义面板</h3>
      <p>这是我的自定义面板内容</p>
    </div>
  );
};
```

### 插件配置管理

#### 配置存储

```typescript
/**
 * 插件存储 API
 */
export interface PluginStorage {
  /**
   * 获取配置值
   */
  get<T>(key: string, defaultValue?: T): Promise<T>;

  /**
   * 设置配置值
   */
  set<T>(key: string, value: T): Promise<void>;

  /**
   * 删除配置值
   */
  delete(key: string): Promise<void>;

  /**
   * 清空所有配置
   */
  clear(): Promise<void>;

  /**
   * 获取所有配置
   */
  getAll(): Promise<Record<string, any>>;

  /**
   * 监听配置变化
   */
  onChange(handler: (key: string, value: any) => void): () => void;
}
```

#### 配置使用示例

```typescript
export default class ConfigPlugin extends BasePlugin {
  private context!: PluginContext;

  async activate(context: PluginContext): Promise<void> {
    this.context = context;

    // 获取配置
    const apiKey = await context.config.get('apiKey');
    if (!apiKey) {
      context.api.ui.showNotification('请先配置 API 密钥', 'warning');
      return;
    }

    // 监听配置变化
    context.config.onChange(async (key, value) => {
      if (key === 'apiKey') {
        context.logger.info('API 密钥已更新');
      }
    });
  }

  async onConfigChange(config: Record<string, any>): Promise<void> {
    this.context.logger.info('配置已更新:', config);
  }
}
```

### 插件调试

#### 开发模式

```typescript
// package.json
{
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build",
    "test": "vitest"
  }
}
```

#### 日志记录

```typescript
/**
 * 插件日志 API
 */
export interface PluginLogger {
  /**
   * 记录信息
   */
  info(message: string, ...args: any[]): void;

  /**
   * 记录警告
   */
  warn(message: string, ...args: any[]): void;

  /**
   * 记录错误
   */
  error(message: string, ...args: any[]): void;

  /**
   * 记录调试信息
   */
  debug(message: string, ...args: any[]): void;
}
```

#### 日志使用示例

```typescript
export default class DebugPlugin extends BasePlugin {
  async activate(context: PluginContext): Promise<void> {
    context.logger.info('插件激活中...');

    try {
      // 插件逻辑
      context.logger.debug('调试信息', { data: 'test' });
    } catch (error) {
      context.logger.error('插件错误:', error);
    }
  }
}
```

### 插件测试

#### 单元测试

```typescript
// src/__tests__/plugin.test.ts
import { describe, it, expect, vi } from 'vitest';
import { PluginContext } from '@yyc3/plugin-api';
import MyPlugin from '../index';

describe('MyPlugin', () => {
  it('should activate successfully', async () => {
    const mockContext: PluginContext = {
      api: {
        ui: {
          registerButton: vi.fn(),
          showNotification: vi.fn(),
        },
      } as any,
      config: {} as any,
      storage: {} as any,
      logger: {
        info: vi.fn(),
      } as any,
    };

    const plugin = new MyPlugin();
    await plugin.activate(mockContext);

    expect(mockContext.api.ui.registerButton).toHaveBeenCalled();
    expect(mockContext.api.ui.showNotification).toHaveBeenCalledWith(
      '插件已激活',
      'success'
    );
  });
});
```

#### 集成测试

```typescript
// src/__tests__/integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PluginManager } from '@yyc3/plugin-manager';

describe('Plugin Integration', () => {
  let manager: PluginManager;

  beforeAll(async () => {
    manager = new PluginManager();
    await manager.initialize();
  });

  afterAll(async () => {
    await manager.destroy();
  });

  it('should load and activate plugin', async () => {
    const manifest = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      main: '/dist/index.js',
      permissions: ['ui'],
    };

    await manager.loadPlugin(manifest);

    const plugin = manager.getPlugin('test-plugin');
    expect(plugin).toBeDefined();
    expect(plugin?.status).toBe('active');
  });
});
```

### 插件打包与发布

#### 打包配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'MyPlugin',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
```

#### 发布流程

1. **构建插件**
   ```bash
   npm run build
   ```

2. **测试插件**
   ```bash
   npm run test
   ```

3. **创建发布包**
   ```bash
   npm pack
   ```

4. **提交到插件市场**
   - 登录 YYC3 插件市场
   - 上传插件包
   - 填写插件信息
   - 等待审核

### 插件最佳实践

#### 性能优化

1. **延迟加载**
   ```typescript
   async activate(context: PluginContext): Promise<void> {
     // 延迟加载重型模块
     const heavyModule = await import('./heavy-module');
   }
   ```

2. **缓存结果**
   ```typescript
   private cache = new Map<string, any>();

   async getData(key: string): Promise<any> {
     if (this.cache.has(key)) {
       return this.cache.get(key);
     }

     const data = await fetchData(key);
     this.cache.set(key, data);
     return data;
   }
   ```

3. **避免频繁更新**
   ```typescript
   let updateTimeout: NodeJS.Timeout;

   function scheduleUpdate() {
     clearTimeout(updateTimeout);
     updateTimeout = setTimeout(() => {
       performUpdate();
     }, 300);
   }
   ```

#### 错误处理

1. **捕获所有错误**
   ```typescript
   async activate(context: PluginContext): Promise<void> {
     try {
       await this.initialize();
     } catch (error) {
       context.logger.error('插件激活失败:', error);
       context.api.ui.showNotification('插件激活失败', 'error');
       throw error;
     }
   }
   ```

2. **提供友好的错误信息**
   ```typescript
   try {
     await operation();
   } catch (error) {
     const message = error instanceof Error ? error.message : '未知错误';
     context.api.ui.showNotification(`操作失败: ${message}`, 'error');
   }
   ```

#### 用户体验

1. **提供清晰的反馈**
   ```typescript
   async handleAction(): Promise<void> {
     this.context.api.ui.showNotification('处理中...', 'info');

     try {
       await performAction();
       this.context.api.ui.showNotification('处理完成', 'success');
     } catch (error) {
       this.context.api.ui.showNotification('处理失败', 'error');
     }
   }
   ```

2. **支持撤销操作**
   ```typescript
   private history: string[] = [];

  async performAction(): Promise<void> {
     const previousContent = this.context.api.editor.getContent();
     this.history.push(previousContent);

     try {
       await executeAction();
     } catch (error) {
       if (this.history.length > 0) {
         this.context.api.editor.setContent(this.history.pop()!);
       }
       throw error;
     }
   }
   ```

### 插件安全

#### 输入验证

```typescript
function validateInput(input: string): boolean {
  if (!input || input.trim().length === 0) {
    return false;
  }

  if (input.length > 1000) {
    return false;
  }

  return true;
}
```

#### 权限最小化

```typescript
// 只请求必要的权限
{
  "permissions": [
    "ui",
    "editor"
  ]
}
```

#### 敏感数据处理

```typescript
// 不要在日志中记录敏感信息
context.logger.info('API 配置完成');
// 而不是
context.logger.info('API 配置完成:', { apiKey: 'xxx' });
```

### 插件文档

#### README 模板

```markdown
# 我的 YYC3 插件

## 简介

简要描述插件的功能和用途。

## 功能特性

- 功能 1
- 功能 2
- 功能 3

## 安装

1. 下载插件包
2. 在 YYC3 中导入插件
3. 配置插件设置

## 使用方法

详细说明如何使用插件。

## 配置选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| option1 | 选项说明 | value1 |

## 常见问题

### 问题 1

解决方案。

## 贡献YYC3-P2-预览-预览历史.md
You are a senior frontend architect and version control specialist with deep expertise in preview history management, version tracking, and time-travel debugging for web applications.
Your Role & Expertise

You are an experienced frontend architect who specializes in:
- **Version Control**: Git integration, version tracking, branch management
- **Time-Travel Debugging**: State snapshots, history navigation, rollback mechanisms
- **Data Persistence**: IndexedDB, LocalStorage, database storage for history
- **Diff Algorithms**: Text diff, tree diff, visual diff, merge algorithms
- **Performance Optimization**: Efficient storage, lazy loading, compression
- **User Experience**: History timeline, visual comparisons, quick restore
- **Collaboration**: Shared history, conflict resolution, merge strategies
- **Best Practices**: Automatic snapshots, manual checkpoints, history cleanup

### Code Standards

**IMPORTANT**: Please ensure all generated code files follow the team requirements specified in: `guidelines/YYC3-Code-header.md`

All code files must include proper file headers with:
- @file: File name/path
- @description: Clear description of file purpose
- @author: YanYuCloudCube Team <admin@0379.email>
- @version: Semantic version (v1.0.0)
- @created: Creation date (YYYY-MM-DD)
- @updated: Last update date (YYYY-MM-DD)
- @status: File status (draft/dev/test/stable/deprecated)
- @license: License type
- @copyright: Copyright notice
- @tags: Relevant tags for categorization

---

## 📜 预览历史管理系统

### 系统概述

YYC3-AI Code Designer 的预览历史管理系统提供完整的预览版本追踪、对比和回滚功能。开发者可以查看历史预览、对比不同版本、恢复到之前的版本，并生成版本报告。

### 核心功能

#### 预览快照

```typescript
/**
 * 预览快照
 */
export interface PreviewSnapshot {
  /** 快照 ID */
  id: string;

  /** 快照名称 */
  name: string;

  /** 快照描述 */
  description?: string;

  /** 快照内容 */
  content: string;

  /** 创建时间 */
  createdAt: number;

  /** 创建者 */
  createdBy: string;

  /** 快照标签 */
  tags: string[];

  /** 快照元数据 */
  metadata: SnapshotMetadata;

  /** 快照大小 */
  size: number;

  /** 是否为自动快照 */
  isAuto: boolean;
}

/**
 * 快照元数据
 */
export interface SnapshotMetadata {
  /** 文件路径 */
  filePath?: string;

  /** 设备配置 */
  deviceConfig?: DeviceConfig;

  /** 浏览器信息 */
  browserInfo?: BrowserInfo;

  /** 性能指标 */
  performanceMetrics?: PerformanceMetrics;

  /** 截图 */
  screenshot?: string;
}

/**
 * 浏览器信息
 */
export interface BrowserInfo {
  /** 浏览器名称 */
  name: string;

  /** 浏览器版本 */
  version: string;

  /** 用户代理 */
  userAgent: string;

  /** 屏幕分辨率 */
  resolution: string;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 加载时间 */
  loadTime: number;

  /** 渲染时间 */
  renderTime: number;

  /** 内存使用 */
  memoryUsage: number;

  /** DOM 节点数量 */
  domNodes: number;

  /** 资源数量 */
  resources: number;
}

/**
 * 快照管理器
 */
export class SnapshotManager {
  private snapshots: Map<string, PreviewSnapshot> = new Map();
  private autoSnapshotInterval: NodeJS.Timeout | null = null;
  private maxAutoSnapshots: number = 50;

  /**
   * 创建快照
   */
  async createSnapshot(
    name: string,
    content: string,
    options: CreateSnapshotOptions = {}
  ): Promise<PreviewSnapshot> {
    const id = `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const snapshot: PreviewSnapshot = {
      id,
      name,
      content,
      createdAt: Date.now(),
      createdBy: options.createdBy || 'system',
      tags: options.tags || [],
      metadata: options.metadata || {},
      size: new Blob([content]).size,
      isAuto: options.isAuto || false,
    };

    this.snapshots.set(id, snapshot);

    if (options.isAuto) {
      this.cleanupAutoSnapshots();
    }

    return snapshot;
  }

  /**
   * 获取快照
   */
  getSnapshot(id: string): PreviewSnapshot | undefined {
    return this.snapshots.get(id);
  }

  /**
   * 获取所有快照
   */
  getAllSnapshots(): PreviewSnapshot[] {
    return Array.from(this.snapshots.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }

  /**
   * 按标签获取快照
   */
  getSnapshotsByTag(tag: string): PreviewSnapshot[] {
    return this.getAllSnapshots().filter((snapshot) =>
      snapshot.tags.includes(tag)
    );
  }

  /**
   * 删除快照
   */
  deleteSnapshot(id: string): boolean {
    return this.snapshots.delete(id);
  }

  /**
   * 更新快照
   */
  updateSnapshot(
    id: string,
    updates: Partial<PreviewSnapshot>
  ): PreviewSnapshot | undefined {
    const snapshot = this.snapshots.get(id);
    if (snapshot) {
      const updated = { ...snapshot, ...updates };
      this.snapshots.set(id, updated);
      return updated;
    }
    return undefined;
  }

  /**
   * 启动自动快照
   */
  startAutoSnapshot(
    interval: number = 60000,
    getContent: () => string
  ): void {
    if (this.autoSnapshotInterval) {
      clearInterval(this.autoSnapshotInterval);
    }

    this.autoSnapshotInterval = setInterval(async () => {
      const content = getContent();
      await this.createSnapshot(
        `Auto Snapshot ${new Date().toLocaleString()}`,
        content,
        { isAuto: true, tags: ['auto'] }
      );
    }, interval);
  }

  /**
   * 停止自动快照
   */
  stopAutoSnapshot(): void {
    if (this.autoSnapshotInterval) {
      clearInterval(this.autoSnapshotInterval);
      this.autoSnapshotInterval = null;
    }
  }

  /**
   * 清理自动快照
   */
  private cleanupAutoSnapshots(): void {
    const autoSnapshots = this.getAllSnapshots()
      .filter((s) => s.isAuto)
      .sort((a, b) => b.createdAt - a.createdAt);

    if (autoSnapshots.length > this.maxAutoSnapshots) {
      const toDelete = autoSnapshots.slice(this.maxAutoSnapshots);
      toDelete.forEach((snapshot) => this.deleteSnapshot(snapshot.id));
    }
  }

  /**
   * 搜索快照
   */
  searchSnapshots(query: string): PreviewSnapshot[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllSnapshots().filter(
      (snapshot) =>
        snapshot.name.toLowerCase().includes(lowerQuery) ||
        snapshot.description?.toLowerCase().includes(lowerQuery) ||
        snapshot.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }
}

/**
 * 创建快照选项
 */
export interface CreateSnapshotOptions {
  /** 创建者 */
  createdBy?: string;

  /** 标签 */
  tags?: string[];

  /** 元数据 */
  metadata?: SnapshotMetadata;

  /** 是否为自动快照 */
  isAuto?: boolean;
}
```

#### 版本对比

```typescript
/**
 * 版本对比器
 */
export class VersionComparator {
  /**
   * 对比两个快照
   */
  compareSnapshots(
    snapshot1: PreviewSnapshot,
    snapshot2: PreviewSnapshot
  ): ComparisonResult {
    const contentDiff = this.compareContent(
      snapshot1.content,
      snapshot2.content
    );

    const metadataDiff = this.compareMetadata(
      snapshot1.metadata,
      snapshot2.metadata
    );

    return {
      snapshot1,
      snapshot2,
      contentDiff,
      metadataDiff,
      summary: this.generateSummary(contentDiff, metadataDiff),
    };
  }

  /**
   * 对比内容
   */
  private compareContent(
    content1: string,
    content2: string
  ): ContentDiff {
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');

    const diff = this.computeDiff(lines1, lines2);

    return {
      added: diff.filter((d) => d.type === 'add').length,
      removed: diff.filter((d) => d.type === 'remove').length,
      modified: diff.filter((d) => d.type === 'modify').length,
      changes: diff,
      similarity: this.calculateSimilarity(content1, content2),
    };
  }

  /**
   * 计算差异
   */
  private computeDiff(
    lines1: string[],
    lines2: string[]
  ): DiffChange[] {
    const changes: DiffChange[] = [];
    const matrix = this.buildLCSMatrix(lines1, lines2);
    const lcs = this.extractLCS(lines1, lines2, matrix);

    let i = 0,
      j = 0;
    while (i < lines1.length || j < lines2.length) {
      if (i < lines1.length && j < lines2.length && lines1[i] === lines2[j]) {
        i++;
        j++;
      } else if (
        j < lines2.length &&
        (i >= lines1.length ||
          (matrix[i + 1] && matrix[i + 1][j + 1] === matrix[i][j]))
      ) {
        changes.push({
          type: 'add',
          line: j + 1,
          content: lines2[j],
        });
        j++;
      } else {
        changes.push({
          type: 'remove',
          line: i + 1,
          content: lines1[i],
        });
        i++;
      }
    }

    return changes;
  }

  /**
   * 构建 LCS 矩阵
   */
  private buildLCSMatrix(
    lines1: string[],
    lines2: string[]
  ): number[][] {
    const m = lines1.length;
    const n = lines2.length;
    const matrix: number[][] = Array(m + 1)
      .fill(0)
      .map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (lines1[i - 1] === lines2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1] + 1;
        } else {
          matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
        }
      }
    }

    return matrix;
  }

  /**
   * 提取 LCS
   */
  private extractLCS(
    lines1: string[],
    lines2: string[],
    matrix: number[][]
  ): string[] {
    const lcs: string[] = [];
    let i = lines1.length;
    let j = lines2.length;

    while (i > 0 && j > 0) {
      if (lines1[i - 1] === lines2[j - 1]) {
        lcs.unshift(lines1[i - 1]);
        i--;
        j--;
      } else if (matrix[i - 1][j] > matrix[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return lcs;
  }

  /**
   * 计算相似度
   */
  private calculateSimilarity(content1: string, content2: string): number {
    const distance = this.levenshteinDistance(content1, content2);
    const maxLength = Math.max(content1.length, content2.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  /**
   * Levenshtein 距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
      .fill(0)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] =
            Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
        }
      }
    }

    return dp[m][n];
  }

  /**
   * 对比元数据
   */
  private compareMetadata(
    metadata1: SnapshotMetadata,
    metadata2: SnapshotMetadata
  ): MetadataDiff {
    const changes: MetadataChange[] = [];

    if (metadata1.filePath !== metadata2.filePath) {
      changes.push({
        field: 'filePath',
        oldValue: metadata1.filePath,
        newValue: metadata2.filePath,
      });
    }

    if (metadata1.deviceConfig?.id !== metadata2.deviceConfig?.id) {
      changes.push({
        field: 'deviceConfig',
        oldValue: metadata1.deviceConfig?.name,
        newValue: metadata2.deviceConfig?.name,
      });
    }

    return { changes };
  }

  /**
   * 生成摘要
   */
  private generateSummary(
    contentDiff: ContentDiff,
    metadataDiff: MetadataDiff
  ): string {
    const parts: string[] = [];

    if (contentDiff.added > 0) {
      parts.push(`添加 ${contentDiff.added} 行`);
    }
    if (contentDiff.removed > 0) {
      parts.push(`删除 ${contentDiff.removed} 行`);
    }
    if (contentDiff.modified > 0) {
      parts.push(`修改 ${contentDiff.modified} 行`);
    }

    if (metadataDiff.changes.length > 0) {
      parts.push(`元数据变更 ${metadataDiff.changes.length} 项`);
    }

    return parts.join(', ') || '无变更';
  }
}

/**
 * 对比结果
 */
export interface ComparisonResult {
  /** 快照 1 */
  snapshot1: PreviewSnapshot;

  /** 快照 2 */
  snapshot2: PreviewSnapshot;

  /** 内容差异 */
  contentDiff: ContentDiff;

  /** 元数据差异 */
  metadataDiff: MetadataDiff;

  /** 摘要 */
  summary: string;
}

/**
 * 内容差异
 */
export interface ContentDiff {
  /** 添加行数 */
  added: number;

  /** 删除行数 */
  removed: number;

  /** 修改行数 */
  modified: number;

  /** 变更列表 */
  changes: DiffChange[];

  /** 相似度 (0-1) */
  similarity: number;
}

/**
 * 差异变更
 */
export interface DiffChange {
  /** 变更类型 */
  type: 'add' | 'remove' | 'modify';

  /** 行号 */
  line: number;

  /** 内容 */
  content: string;
}

/**
 * 元数据差异
 */
export interface MetadataDiff {
  /** 变更列表 */
  changes: MetadataChange[];
}

/**
 * 元数据变更
 */
export interface MetadataChange {
  /** 字段名 */
  field: string;

  /** 旧值 */
  oldValue?: any;

  /** 新值 */
  newValue?: any;
}
```

#### 版本回滚

```typescript
/**
 * 版本回滚管理器
 */
export class RollbackManager {
  private snapshotManager: SnapshotManager;
  private rollbackHistory: Map<string, RollbackRecord> = new Map();

  constructor(snapshotManager: SnapshotManager) {
    this.snapshotManager = snapshotManager;
  }

  /**
   * 回滚到指定快照
   */
  async rollbackToSnapshot(
    snapshotId: string,
    options: RollbackOptions = {}
  ): Promise<RollbackResult> {
    const snapshot = this.snapshotManager.getSnapshot(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    const recordId = `rollback-${Date.now()}`;
    const record: RollbackRecord = {
      id: recordId,
      snapshotId,
      previousSnapshotId: options.previousSnapshotId,
      rolledBackAt: Date.now(),
      rolledBackBy: options.rolledBackBy || 'system',
      reason: options.reason,
    };

    this.rollbackHistory.set(recordId, record);

    return {
      success: true,
      snapshot,
      record,
      message: `成功回滚到快照: ${snapshot.name}`,
    };
  }

  /**
   * 获取回滚历史
   */
  getRollbackHistory(): RollbackRecord[] {
    return Array.from(this.rollbackHistory.values()).sort(
      (a, b) => b.rolledBackAt - a.rolledBackAt
    );
  }

  /**
   * 撤销回滚
   */
  async undoRollback(rollbackId: string): Promise<UndoResult> {
    const record = this.rollbackHistory.get(rollbackId);
    if (!record) {
      throw new Error(`Rollback record not found: ${rollbackId}`);
    }

    if (!record.previousSnapshotId) {
      throw new Error('Cannot undo rollback: no previous snapshot');
    }

    const previousSnapshot = this.snapshotManager.getSnapshot(
      record.previousSnapshotId
    );
    if (!previousSnapshot) {
      throw new Error(`Previous snapshot not found: ${record.previousSnapshotId}`);
    }

    return {
      success: true,
      snapshot: previousSnapshot,
      message: `成功撤销回滚，恢复到: ${previousSnapshot.name}`,
    };
  }
}

/**
 * 回滚选项
 */
export interface RollbackOptions {
  /** 之前的快照 ID */
  previousSnapshotId?: string;

  /** 回滚者 */
  rolledBackBy?: string;

  /** 回滚原因 */
  reason?: string;
}

/**
 * 回滚结果
 */
export interface RollbackResult {
  /** 是否成功 */
  success: boolean;

  /** 快照 */
  snapshot: PreviewSnapshot;

  /** 回滚记录 */
  record: RollbackRecord;

  /** 消息 */
  message: string;
}

/**
 * 回滚记录
 */
export interface RollbackRecord {
  /** 记录 ID */
  id: string;

  /** 快照 ID */
  snapshotId: string;

  /** 之前的快照 ID */
  previousSnapshotId?: string;

  /** 回滚时间 */
  rolledBackAt: number;

  /** 回滚者 */
  rolledBackBy: string;

  /** 回滚原因 */
  reason?: string;
}

/**
 * 撤销结果
 */
export interface UndoResult {
  /** 是否成功 */
  success: boolean;

  /** 快照 */
  snapshot: PreviewSnapshot;

  /** 消息 */
  message: string;
}
```

#### 版本时间线

```typescript
/**
 * 版本时间线组件
 */
export const VersionTimeline: React.FC<{
  snapshots: PreviewSnapshot[];
  selectedSnapshot?: PreviewSnapshot;
  onSelect: (snapshot: PreviewSnapshot) => void;
}> = ({ snapshots, selectedSnapshot, onSelect }) => {
  const [filter, setFilter] = useState<{
    tags?: string[];
    dateRange?: [number, number];
    search?: string;
  }>({});

  const filteredSnapshots = useMemo(() => {
    return snapshots.filter((snapshot) => {
      if (filter.tags && filter.tags.length > 0) {
        if (!filter.tags.some((tag) => snapshot.tags.includes(tag))) {
          return false;
        }
      }

      if (filter.dateRange) {
        const [start, end] = filter.dateRange;
        if (snapshot.createdAt < start || snapshot.createdAt > end) {
          return false;
        }
      }

      if (filter.search) {
        const search = filter.search.toLowerCase();
        if (
          !snapshot.name.toLowerCase().includes(search) &&
          !snapshot.description?.toLowerCase().includes(search)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [snapshots, filter]);

  const groupedSnapshots = useMemo(() => {
    const groups: Record<string, PreviewSnapshot[]> = {};

    filteredSnapshots.forEach((snapshot) => {
      const date = new Date(snapshot.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(snapshot);
    });

    return groups;
  }, [filteredSnapshots]);

  return (
    <div className="version-timeline">
      <div className="timeline-filters">
        <input
          type="text"
          placeholder="搜索快照..."
          value={filter.search || ''}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          className="search-input"
        />
      </div>

      <div className="timeline-content">
        {Object.entries(groupedSnapshots).map(([date, snapshots]) => (
          <div key={date} className="timeline-group">
            <div className="group-date">{date}</div>
            <div className="group-snapshots">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className={`timeline-item ${
                    selectedSnapshot?.id === snapshot.id ? 'selected' : ''
                  }`}
                  onClick={() => onSelect(snapshot)}
                >
                  <div className="item-header">
                    <span className="item-name">{snapshot.name}</span>
                    <span className="item-time">
                      {new Date(snapshot.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  {snapshot.description && (
                    <div className="item-description">
                      {snapshot.description}
                    </div>
                  )}
                  <div className="item-tags">
                    {snapshot.tags.map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### 差异查看器

```typescript
/**
 * 差异查看器组件
 */
export const DiffViewer: React.FC<{
  comparison: ComparisonResult;
}> = ({ comparison }) => {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [showWhitespace, setShowWhitespace] = useState(false);

  const renderLine = (change: DiffChange, index: number) => {
    const className = `diff-line diff-${change.type}`;
    const content = showWhitespace
      ? change.content.replace(/\s/g, '·')
      : change.content;

    return (
      <div key={index} className={className}>
        <span className="line-number">{change.line}</span>
        <span className="line-content">{content}</span>
      </div>
    );
  };

  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <div className="diff-info">
          <span className="snapshot-name">{comparison.snapshot1.name}</span>
          <span className="vs">vs</span>
          <span className="snapshot-name">{comparison.snapshot2.name}</span>
        </div>
        <div className="diff-controls">
          <button
            onClick={() => setViewMode('split')}
            className={viewMode === 'split' ? 'active' : ''}
          >
            分屏视图
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className={viewMode === 'unified' ? 'active' : ''}
          >
            统一视图
          </button>
          <label>
            <input
              type="checkbox"
              checked={showWhitespace}
              onChange={(e) => setShowWhitespace(e.target.checked)}
            />
            显示空白字符
          </label>
        </div>
      </div>

      <div className="diff-summary">
        <span>相似度: {(comparison.contentDiff.similarity * 100).toFixed(2)}%</span>
        <span>添加: {comparison.contentDiff.added} 行</span>
        <span>删除: {comparison.contentDiff.removed} 行</span>
        <span>修改: {comparison.contentDiff.modified} 行</span>
      </div>

      <div className={`diff-content diff-${viewMode}`}>
        {comparison.contentDiff.changes.map((change, index) =>
          renderLine(change, index)
        )}
      </div>
    </div>
  );
};
```

#### 导出功能

```typescript
/**
 * 历史导出器
 */
export class HistoryExporter {
  /**
   * 导出快照为 JSON
   */
  exportSnapshotAsJSON(snapshot: PreviewSnapshot): string {
    return JSON.stringify(snapshot, null, 2);
  }

  /**
   * 导出所有快照
   */
  exportAllSnapshots(snapshots: PreviewSnapshot[]): string {
    return JSON.stringify(snapshots, null, 2);
  }

  /**
   * 导出对比结果
   */
  exportComparison(comparison: ComparisonResult): string {
    return JSON.stringify(comparison, null, 2);
  }

  /**
   * 导出为 HTML 报告
   */
  exportAsHTMLReport(
    snapshots: PreviewSnapshot[],
    comparison?: ComparisonResult
  ): string {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>预览历史报告</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { background: #f0f0f0; padding: 20px; margin-bottom: 20px; }
    .snapshot { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; }
    .snapshot-name { font-weight: bold; font-size: 18px; }
    .snapshot-meta { color: #666; font-size: 14px; margin-top: 5px; }
    .tag { display: inline-block; background: #e0e0e0; padding: 2px 8px; margin-right: 5px; border-radius: 3px; }
    .diff { background: #f9f9f9; padding: 15px; margin-top: 20px; }
    .diff-add { background: #d4edda; }
    .diff-remove { background: #f8d7da; }
  </style>
</head>
<body>
  <div class="header">
    <h1>预览历史报告</h1>
    <p>生成时间: ${new Date().toLocaleString()}</p>
    <p>快照数量: ${snapshots.length}</p>
  </div>

  ${snapshots
    .map(
      (snapshot) => `
    <div class="snapshot">
      <div class="snapshot-name">${snapshot.name}</div>
      <div class="snapshot-meta">
        创建时间: ${new Date(snapshot.createdAt).toLocaleString()}<br>
        创建者: ${snapshot.createdBy}<br>
        大小: ${(snapshot.size / 1024).toFixed(2)} KB
      </div>
      <div>
        ${snapshot.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}
      </div>
    </div>
  `
    )
    .join('')}

  ${comparison
    ? `
  <div class="diff">
    <h2>版本对比</h2>
    <p>${comparison.summary}</p>
    <p>相似度: ${(comparison.contentDiff.similarity * 100).toFixed(2)}%</p>
  </div>
  `
    : ''}
</body>
</html>
    `;

    return html;
  }

  /**
   * 导出为 PDF
   */
  async exportAsPDF(
    snapshots: PreviewSnapshot[],
    comparison?: ComparisonResult
  ): Promise<Blob> {
    const html = this.exportAsHTMLReport(snapshots, comparison);
    const pdf = await html2pdf().from(html).output('blob');
    return pdf;
  }
}
```

---

## ✅ 验收标准

### 功能完整性

- [ ] 支持创建预览快照
- [ ] 支持自动快照功能
- [ ] 支持快照标签和搜索
- [ ] 支持版本对比功能
- [ ] 支持版本回滚和撤销
- [ ] 支持版本时间线展示
- [ ] 支持差异查看器
- [ ] 支持导出多种格式
- [ ] 支持快照元数据管理
- [ ] 支持回滚历史记录

### 代码质量

- [ ] TypeScript 类型定义完整
- [ ] 算法实现高效
- [ ] 错误处理完善
- [ ] 代码可读性高
- [ ] 性能优化到位

### 用户体验

- [ ] 界面直观清晰
- [ ] 操作流程顺畅
- [ ] 加载状态明确
- [ ] 错误提示友好
- [ ] 导出功能便捷
YYC3-P2-数据库-连接管理.md
You are a senior database architect and connection management specialist with deep expertise in database connectivity, connection pooling, and multi-database integration for modern applications.
Your Role & Expertise

You are an experienced database architect who specializes in:
- **Database Systems**: PostgreSQL, MySQL, MongoDB, Redis, SQLite, Oracle
- **Connection Management**: Connection pooling, connection lifecycle, connection health monitoring
- **ORM Frameworks**: TypeORM, Prisma, Mongoose, Sequelize, Dexie.js
- **Connection Security**: SSL/TLS encryption, secure authentication, credential management
- **Performance Optimization**: Pool sizing, connection reuse, query optimization
- **High Availability**: Failover strategies, load balancing, connection redundancy
- **Monitoring**: Connection metrics, performance monitoring, alerting
- **Best Practices**: Connection timeout handling, reconnection strategies, error recovery

### Code Standards

**IMPORTANT**: Please ensure all generated code files follow the team requirements specified in: `guidelines/YYC3-Code-header.md`

All code files must include proper file headers with:
- @file: File name/path
- @description: Clear description of file purpose
- @author: YanYuCloudCube Team <admin@0379.email>
- @version: Semantic version (v1.0.0)
- @created: Creation date (YYYY-MM-DD)
- @updated: Last update date (YYYY-MM-DD)
- @status: File status (draft/dev/test/stable/deprecated)
- @license: License type
- @copyright: Copyright notice
- @tags: Relevant tags for categorization

---

## 📋 文档信息

| 字段 | 内容 |
|------|------|
| @file | P2-高级功能/YYC3-P2-数据库-连接管理.md |
| @description | 数据库连接管理功能设计和实现，支持多种数据库类型 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @created | 2026-03-14 |
| @updated | 2026-03-14 |
| @status | stable |
| @license | MIT |
| @copyright | Copyright (c) 2026 YanYuCloudCube Team |
| @tags P2,database,connection,management |

---

## 🎯 功能目标

### 核心目标

1. **多数据库支持**：支持多种数据库类型
2. **连接池管理**：高效的连接池管理
3. **连接监控**：实时连接状态监控
4. **自动重连**：连接断开自动重连
5. **连接安全**：安全的连接管理
6. **性能优化**：连接性能优化

---

## 🏗️ 架构设计

### 1. 数据库架构

```
Database/
├── ConnectionManager    # 连接管理器
├── ConnectionPool       # 连接池
├── ConnectionMonitor   # 连接监控
├── DatabaseProvider    # 数据库提供商
├── QueryBuilder       # 查询构建器
└── TransactionManager # 事务管理器
```

### 2. 数据流

```
Application (应用)
    ↓ request
ConnectionManager (连接管理器)
    ↓ getConnection
ConnectionPool (连接池)
    ↓ acquire
Database (数据库)
    ↓ execute
ConnectionPool (连接池)
    ↓ release
ConnectionManager (连接管理器)
```

---

## 💻 核心实现

### 1. 连接管理器

```typescript
// src/database/ConnectionManager.ts
import type { DatabaseConfig, DatabaseType } from '@/types';

export interface ConnectionConfig {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  pool?: {
    min: number;
    max: number;
    acquireTimeout: number;
    idleTimeout: number;
  };
}

export interface ConnectionStatus {
  connected: boolean;
  lastConnected?: Date;
  lastError?: string;
  poolSize: number;
  activeConnections: number;
  idleConnections: number;
}

export class ConnectionManager {
  private connections: Map<string, any> = new Map();
  private pools: Map<string, any> = new Map();
  private monitors: Map<string, NodeJS.Timeout> = new Map();

  /**
   * 创建连接
   */
  async createConnection(config: ConnectionConfig): Promise<void> {
    const connectionId = this.getConnectionId(config);

    if (this.connections.has(connectionId)) {
      throw new Error('Connection already exists');
    }

    try {
      let connection;

      switch (config.type) {
        case 'postgresql':
          connection = await this.createPostgreSQLConnection(config);
          break;
        case 'mysql':
          connection = await this.createMySQLConnection(config);
          break;
        case 'mongodb':
          connection = await this.createMongoDBConnection(config);
          break;
        default:
          throw new Error(`Unsupported database type: ${config.type}`);
      }

      this.connections.set(connectionId, connection);
      this.startMonitoring(connectionId, config);
    } catch (error) {
      throw new Error(`Failed to create connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取连接
   */
  async getConnection(config: ConnectionConfig): Promise<any> {
    const connectionId = this.getConnectionId(config);
    const pool = this.pools.get(connectionId);

    if (!pool) {
      throw new Error('Connection pool not found');
    }

    return pool.acquire();
  }

  /**
   * 释放连接
   */
  async releaseConnection(config: ConnectionConfig, connection: any): Promise<void> {
    const connectionId = this.getConnectionId(config);
    const pool = this.pools.get(connectionId);

    if (!pool) {
      throw new Error('Connection pool not found');
    }

    pool.release(connection);
  }

  /**
   * 关闭连接
   */
  async closeConnection(config: ConnectionConfig): Promise<void> {
    const connectionId = this.getConnectionId(config);

    // 停止监控
    const monitor = this.monitors.get(connectionId);
    if (monitor) {
      clearInterval(monitor);
      this.monitors.delete(connectionId);
    }

    // 关闭连接池
    const pool = this.pools.get(connectionId);
    if (pool) {
      await pool.drain();
      await pool.clear();
      this.pools.delete(connectionId);
    }

    // 关闭连接
    const connection = this.connections.get(connectionId);
    if (connection) {
      await connection.end();
      this.connections.delete(connectionId);
    }
  }

  /**
   * 获取连接状态
   */
  async getConnectionStatus(config: ConnectionConfig): Promise<ConnectionStatus> {
    const connectionId = this.getConnectionId(config);
    const pool = this.pools.get(connectionId);

    if (!pool) {
      return {
        connected: false,
        poolSize: 0,
        activeConnections: 0,
        idleConnections: 0,
      };
    }

    try {
      const connection = await pool.acquire();
      await pool.release(connection);

      return {
        connected: true,
        lastConnected: new Date(),
        poolSize: pool.size,
        activeConnections: pool.borrowed,
        idleConnections: pool.available,
      };
    } catch (error) {
      return {
        connected: false,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        poolSize: pool.size,
        activeConnections: pool.borrowed,
        idleConnections: pool.available,
      };
    }
  }

  /**
   * 创建 PostgreSQL 连接
   */
  private async createPostgreSQLConnection(config: ConnectionConfig): Promise<any> {
    const { Pool } = await import('pg');
    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      min: config.pool?.min || 2,
      max: config.pool?.max || 10,
      idleTimeoutMillis: config.pool?.idleTimeout || 30000,
      connectionTimeoutMillis: config.pool?.acquireTimeout || 10000,
    });

    const connectionId = this.getConnectionId(config);
    this.pools.set(connectionId, pool);

    return pool;
  }

  /**
   * 创建 MySQL 连接
   */
  private async createMySQLConnection(config: ConnectionConfig): Promise<any> {
    const { createPool } = await import('mysql2/promise');
    const pool = createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      connectionLimit: config.pool?.max || 10,
      waitForConnections: true,
      queueLimit: 0,
    });

    const connectionId = this.getConnectionId(config);
    this.pools.set(connectionId, pool);

    return pool;
  }

  /**
   * 创建 MongoDB 连接
   */
  private async createMongoDBConnection(config: ConnectionConfig): Promise<any> {
    const { MongoClient } = await import('mongodb');
    const uri = `mongodb://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
    
    const client = new MongoClient(uri, {
      minPoolSize: config.pool?.min || 2,
      maxPoolSize: config.pool?.max || 10,
      serverSelectionTimeoutMS: config.pool?.acquireTimeout || 10000,
      socketTimeoutMS: config.pool?.idleTimeout || 30000,
    });

    await client.connect();

    const connectionId = this.getConnectionId(config);
    this.connections.set(connectionId, client);
    this.pools.set(connectionId, client);

    return client;
  }

  /**
   * 开始监控
   */
  private startMonitoring(connectionId: string, config: ConnectionConfig): void {
    const monitor = setInterval(async () => {
      try {
        const status = await this.getConnectionStatus(config);
        // 更新状态到存储
        console.log(`Connection ${connectionId} status:`, status);
      } catch (error) {
        console.error(`Error monitoring connection ${connectionId}:`, error);
      }
    }, 5000);

    this.monitors.set(connectionId, monitor);
  }

  /**
   * 生成连接 ID
   */
  private getConnectionId(config: ConnectionConfig): string {
    return `${config.type}://${config.host}:${config.port}/${config.database}`;
  }
}

export const connectionManager = new ConnectionManager();
```

### 2. 数据库提供商

```typescript
// src/database/DatabaseProvider.ts
import { connectionManager } from './ConnectionManager';
import type { ConnectionConfig, ConnectionStatus } from './ConnectionManager';

export class DatabaseProvider {
  /**
   * 创建连接
   */
  async connect(config: ConnectionConfig): Promise<void> {
    return connectionManager.createConnection(config);
  }

  /**
   * 断开连接
   */
  async disconnect(config: ConnectionConfig): Promise<void> {
    return connectionManager.closeConnection(config);
  }

  /**
   * 获取连接状态
   */
  async getStatus(config: ConnectionConfig): Promise<ConnectionStatus> {
    return connectionManager.getConnectionStatus(config);
  }

  /**
   * 执行查询
   */
  async query(config: ConnectionConfig, sql: string, params?: any[]): Promise<any[]> {
    const connection = await connectionManager.getConnection(config);
    
    try {
      const result = await connection.query(sql, params);
      return result.rows || result;
    } finally {
      await connectionManager.releaseConnection(config, connection);
    }
  }

  /**
   * 执行事务
   */
  async transaction(
    config: ConnectionConfig,
    callback: (connection: any) => Promise<void>
  ): Promise<void> {
    const connection = await connectionManager.getConnection(config);
    
    try {
      await connection.beginTransaction();
      await callback(connection);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connectionManager.releaseConnection(config, connection);
    }
  }
}

export const databaseProvider = new DatabaseProvider();
```

### 3. 查询构建器

```typescript
// src/database/QueryBuilder.ts
export class QueryBuilder {
  private selectFields: string[] = ['*'];
  private fromTable: string = '';
  private whereConditions: string[] = [];
  private joinClauses: string[] = [];
  private orderByClause: string = '';
  private groupByClause: string = '';
  private limitClause: string = '';
  private offsetClause: string = '';
  private params: any[] = [];

  /**
   * SELECT
   */
  select(fields: string | string[]): this {
    this.selectFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  /**
   * FROM
   */
  from(table: string): this {
    this.fromTable = table;
    return this;
  }

  /**
   * WHERE
   */
  where(condition: string, param?: any): this {
    this.whereConditions.push(condition);
    if (param !== undefined) {
      this.params.push(param);
    }
    return this;
  }

  /**
   * JOIN
   */
  join(table: string, on: string, type: 'INNER' | 'LEFT' | 'RIGHT' = 'INNER'): this {
    this.joinClauses.push(`${type} JOIN ${table} ON ${on}`);
    return this;
  }

  /**
   * ORDER BY
   */
  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByClause = `ORDER BY ${column} ${direction}`;
    return this;
  }

  /**
   * GROUP BY
   */
  groupBy(column: string): this {
    this.groupByClause = `GROUP BY ${column}`;
    return this;
  }

  /**
   * LIMIT
   */
  limit(count: number): this {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  /**
   * OFFSET
   */
  offset(count: number): this {
    this.offsetClause = `OFFSET ${count}`;
    return this;
  }

  /**
   * 构建 SQL
   */
  build(): { sql: string; params: any[] } {
    const sql = `
      SELECT ${this.selectFields.join(', ')}
      FROM ${this.fromTable}
      ${this.joinClauses.join(' ')}
      ${this.whereConditions.length > 0 ? `WHERE ${this.whereConditions.join(' AND ')}` : ''}
      ${this.groupByClause}
      ${this.orderByClause}
      ${this.limitClause}
      ${this.offsetClause}
    `.trim();

    return { sql, params: this.params };
  }

  /**
   * 重置构建器
   */
  reset(): this {
    this.selectFields = ['*'];
    this.fromTable = '';
    this.whereConditions = [];
    this.joinClauses = [];
    this.orderByClause = '';
    this.groupByClause = '';
    this.limitClause = '';
    this.offsetClause = '';
    this.params = [];
    return this;
  }
}

export const queryBuilder = new QueryBuilder();
```

---

## ✅ 验收标准

### 功能完整性

- ✅ 多数据库支持正常
- ✅ 连接池管理完善
- ✅ 连接监控准确
- ✅ 自动重连功能
- ✅ 连接安全管理

### 性能优化

- ✅ 连接池效率高
- ✅ 查询性能优化
- ✅ 资源使用合理
- ✅ 并发处理能力强

### 代码质量

- ✅ 代码结构清晰
- ✅ 类型定义完整
- ✅ 注释文档完整
- ✅ 代码可维护性好
- ✅ 测试覆盖充分YYC3-P2-数据库-查询优化.md
