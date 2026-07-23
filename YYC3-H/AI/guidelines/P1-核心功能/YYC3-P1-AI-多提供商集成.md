# YYC3 P1-AI-多提供商集成

## 文档信息
| 字段 | 内容 |
|------|------|
| @file | P1-核心功能/YYC3-P1-AI-多提供商集成.md |
| @description | AI 多提供商集成设计和实现，支持 OpenAI、Anthropic、智谱 AI 等 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @created | 2026-03-14 |
| @status | stable |
| @tags | P1,AI,provider,integration |

---

## 功能目标

1. **多提供商支持**：支持多个 AI 服务提供商
2. **统一接口**：提供统一的 API 接口
3. **自动切换**：支持自动故障切换
4. **负载均衡**：支持请求负载均衡
5. **流式输出**：支持流式响应
6. **错误处理**：完善的错误处理机制

## 架构设计

```
AI Providers/
├── OpenAIProvider        # OpenAI 提供商
├── AnthropicProvider     # Anthropic 提供商
├── ZhipuProvider         # 智谱 AI 提供商
├── BaiduProvider         # 百度文心提供商
├── AliyunProvider        # 阿里通义提供商
├── OllamaProvider        # Ollama 提供商
└── AIProviderManager     # 提供商管理器
```

## 核心实现

### 1. 提供商接口

```typescript
// src/ai/types.ts
export interface AIProviderInterface {
  name: AIProvider;
  isAvailable(): Promise<boolean>;
  request(config: AIRequestConfig): Promise<AIResponse>;
  streamRequest(
    config: AIRequestConfig,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void>;
  getModels(): Promise<string[]>;
}
```

### 2. OpenAI 提供商

```typescript
// src/ai/providers/OpenAIProvider.ts
export class OpenAIProvider implements AIProviderInterface {
  name = 'openai' as const;
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch { return false; }
  }

  async request(config: AIRequestConfig): Promise<AIResponse> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: config.messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: false,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI API error: ${response.statusText}`);
    const data = await response.json();
    return {
      id: data.id, provider: this.name, model: config.model,
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      finishReason: data.choices[0].finish_reason,
      timestamp: Date.now(),
    };
  }

  async streamRequest(config, onChunk, onComplete, onError): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
        body: JSON.stringify({ ...config, stream: true }),
      });
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('Response body is not readable');
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.trim());
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') { onComplete(); return; }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) onChunk(content);
            } catch (e) {}
          }
        }
      }
    } catch (error) { onError(error as Error); }
  }

  async getModels(): Promise<string[]> {
    const response = await fetch(`${this.baseURL}/models`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });
    const data = await response.json();
    return data.data.map((m: any) => m.id);
  }
}
```

### 3. Anthropic 提供商

```typescript
// src/ai/providers/AnthropicProvider.ts
export class AnthropicProvider implements AIProviderInterface {
  name = 'anthropic' as const;
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL = 'https://api.anthropic.com') {
    this.apiKey = apiKey; this.baseURL = baseURL;
  }

  async request(config: AIRequestConfig): Promise<AIResponse> {
    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model, messages: config.messages,
        max_tokens: config.maxTokens, temperature: config.temperature,
      }),
    });
    const data = await response.json();
    return {
      id: data.id, provider: this.name, model: config.model,
      content: data.content[0].text,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      finishReason: data.stop_reason, timestamp: Date.now(),
    };
  }

  async getModels() {
    return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
  }
}
```

### 4. 提供商管理器

```typescript
// src/ai/AIProviderManager.ts
export class AIProviderManager {
  private providers: Map<AIProvider, AIProviderInterface> = new Map();
  private config: Map<AIProvider, ProviderConfig> = new Map();
  private currentProvider: AIProvider | null = null;

  constructor(configs: ProviderConfig[]) { this.initializeProviders(configs); }

  async selectProvider(): Promise<AIProvider> {
    const sorted = Array.from(this.config.values())
      .filter(c => c.enabled).sort((a, b) => b.priority - a.priority);
    for (const config of sorted) {
      const provider = this.providers.get(config.name);
      if (provider && await provider.isAvailable()) {
        this.currentProvider = config.name;
        return config.name;
      }
    }
    throw new Error('No available providers');
  }

  async request(config: AIRequestConfig): Promise<AIResponse> {
    const provider = this.currentProvider || (await this.selectProvider());
    return this.providers.get(provider)!.request(config);
  }

  async streamRequest(config, onChunk, onComplete, onError): Promise<void> {
    const provider = this.currentProvider || (await this.selectProvider());
    return this.providers.get(provider)!.streamRequest(config, onChunk, onComplete, onError);
  }

  addProvider(config: ProviderConfig): void { /* ... */ }
  removeProvider(provider: AIProvider): void { /* ... */ }
  getProviders(): AIProvider[] { return Array.from(this.providers.keys()); }
}

export const aiProviderManager = new AIProviderManager([
  { name: 'openai', apiKey: '', enabled: true, priority: 10 },
  { name: 'anthropic', apiKey: '', enabled: true, priority: 9 },
]);
```

## 验收标准

- 多提供商支持正常
- 统一接口完善
- 自动切换正常
- 流式输出支持
- 错误处理完善
