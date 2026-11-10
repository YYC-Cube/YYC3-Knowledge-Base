/**
 * @description YYC³ MCP认证模块
 * @module @yyc3/mcp-server/auth
 * 
 * 支持OpenAI API Key、Anthropic API Key、Ollama本地服务等多种认证方式
 */

import type { MCPAuthProvider } from './types.js';

export interface AuthConfig {
  providers: MCPAuthProvider[];
  defaultProvider?: string;
  autoDetectLocal?: boolean;
}

export interface AuthResult {
  success: boolean;
  provider: string;
  models?: string[];
  error?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  capabilities?: string[];
}

const DEFAULT_PROVIDERS: MCPAuthProvider[] = [
  {
    type: 'openai',
    endpoint: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o1-preview'],
  },
  {
    type: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-3-5-sonnet'],
  },
  {
    type: 'ollama',
    endpoint: 'http://localhost:11434',
    autoDetect: true,
    models: ['llama3', 'llama2', 'mistral', 'codellama', 'qwen2', 'deepseek-coder'],
  },
];

export class MCPAuthManager {
  private providers: Map<string, MCPAuthProvider> = new Map();
  private defaultProvider: string | null = null;
  private autoDetectLocal: boolean = true;
  private validatedProviders: Set<string> = new Set();

  constructor(config?: Partial<AuthConfig>) {
    if (config?.providers) {
      for (const provider of config.providers) {
        this.addProvider(provider);
      }
    } else {
      for (const provider of DEFAULT_PROVIDERS) {
        this.addProvider(provider);
      }
    }

    if (config?.defaultProvider) {
      this.defaultProvider = config.defaultProvider;
    } else {
      const openai = Array.from(this.providers.values()).find(p => p.type === 'openai');
      if (openai) {
        this.defaultProvider = openai.type;
      }
    }

    if (config?.autoDetectLocal !== undefined) {
      this.autoDetectLocal = config.autoDetectLocal;
    }
  }

  addProvider(provider: MCPAuthProvider): void {
    const id = provider.type;
    this.providers.set(id, provider);
  }

  removeProvider(type: string): boolean {
    return this.providers.delete(type);
  }

  getProvider(type: string): MCPAuthProvider | undefined {
    return this.providers.get(type);
  }

  getAllProviders(): MCPAuthProvider[] {
    return Array.from(this.providers.values());
  }

  setDefaultProvider(type: string): void {
    if (this.providers.has(type)) {
      this.defaultProvider = type;
    }
  }

  getDefaultProvider(): MCPAuthProvider | undefined {
    if (this.defaultProvider) {
      return this.providers.get(this.defaultProvider);
    }
    return undefined;
  }

  async validateProvider(type: string): Promise<AuthResult> {
    const provider = this.providers.get(type);
    if (!provider) {
      return {
        success: false,
        provider: type,
        error: `Provider ${type} not found`,
      };
    }

    try {
      switch (provider.type) {
        case 'openai':
          return await this.validateOpenAI(provider);
        case 'anthropic':
          return await this.validateAnthropic(provider);
        case 'ollama':
          return await this.validateOllama(provider);
        default:
          return await this.validateCustom(provider);
      }
    } catch (error) {
      return {
        success: false,
        provider: type,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async validateOpenAI(provider: MCPAuthProvider): Promise<AuthResult> {
    if (!provider.apiKey && !process.env.OPENAI_API_KEY) {
      return {
        success: false,
        provider: 'openai',
        error: 'OpenAI API key not configured',
      };
    }

    this.validatedProviders.add('openai');
    return {
      success: true,
      provider: 'openai',
      models: provider.models,
    };
  }

  private async validateAnthropic(provider: MCPAuthProvider): Promise<AuthResult> {
    if (!provider.apiKey && !process.env.ANTHROPIC_API_KEY) {
      return {
        success: false,
        provider: 'anthropic',
        error: 'Anthropic API key not configured',
      };
    }

    this.validatedProviders.add('anthropic');
    return {
      success: true,
      provider: 'anthropic',
      models: provider.models,
    };
  }

  private async validateOllama(provider: MCPAuthProvider): Promise<AuthResult> {
    const endpoint = provider.endpoint || 'http://localhost:11434';
    
    try {
      const response = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          success: false,
          provider: 'ollama',
          error: `Ollama server returned ${response.status}`,
        };
      }

      const data = await response.json();
      const models = data.models?.map((m: { name: string }) => m.name) || [];

      this.validatedProviders.add('ollama');
      return {
        success: true,
        provider: 'ollama',
        models,
      };
    } catch (error) {
      return {
        success: false,
        provider: 'ollama',
        error: 'Ollama server not reachable. Is Ollama running?',
      };
    }
  }

  private async validateCustom(provider: MCPAuthProvider): Promise<AuthResult> {
    if (!provider.endpoint) {
      return {
        success: false,
        provider: provider.type,
        error: 'Custom provider requires an endpoint',
      };
    }

    this.validatedProviders.add(provider.type);
    return {
      success: true,
      provider: provider.type,
      models: provider.models,
    };
  }

  async autoDetectLocalProviders(): Promise<AuthResult[]> {
    if (!this.autoDetectLocal) return [];

    const results: AuthResult[] = [];
    
    const ollama = this.providers.get('ollama');
    if (ollama) {
      const result = await this.validateOllama(ollama);
      results.push(result);
    }

    return results;
  }

  isProviderValidated(type: string): boolean {
    return this.validatedProviders.has(type);
  }

  getAvailableModels(): ModelInfo[] {
    const models: ModelInfo[] = [];

    for (const [type, provider] of this.providers) {
      if (provider.models) {
        for (const modelId of provider.models) {
          models.push({
            id: modelId,
            name: modelId,
            provider: type,
          });
        }
      }
    }

    return models;
  }

  getModelsForProvider(type: string): ModelInfo[] {
    const provider = this.providers.get(type);
    if (!provider?.models) return [];

    return provider.models.map(modelId => ({
      id: modelId,
      name: modelId,
      provider: type,
    }));
  }

  createAuthHeader(type: string): Record<string, string> {
    const provider = this.providers.get(type);
    if (!provider) return {};

    switch (provider.type) {
      case 'openai':
        return {
          'Authorization': `Bearer ${provider.apiKey || process.env.OPENAI_API_KEY || ''}`,
        };
      case 'anthropic':
        return {
          'x-api-key': provider.apiKey || process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        };
      case 'ollama':
        return {};
      default:
        if (provider.apiKey) {
          return {
            'Authorization': `Bearer ${provider.apiKey}`,
          };
        }
        return {};
    }
  }
}

export const globalAuthManager = new MCPAuthManager();
