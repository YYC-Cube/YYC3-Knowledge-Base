/**
 * @description YYC³ Auth - 统一认证管理
 * @module @yyc3/core/auth
 */

import type { AIResponse } from '../types';

export interface AuthConfig {
  openaiApiKey?: string;
  ollamaEndpoint?: string;
}

export interface AuthCredentials {
  type: 'api-key' | 'local';
  token?: string;
  endpoint?: string;
  models?: string[];
}

export interface AuthProvider {
  id: string;
  name: string;
  type: 'openai' | 'ollama';
  initialize(): Promise<void>;
  isAuthenticated(): boolean;
  getCredentials(): AuthCredentials;
  validate(): Promise<boolean>;
  chat(message: string): Promise<AIResponse>;
}

class OpenAIAuthProvider implements AuthProvider {
  id = 'openai';
  name = 'OpenAI';
  type = 'openai' as const;
  private apiKey: string | null = null;
  private client: unknown = null;

  async initialize(): Promise<void> {
    this.apiKey = process.env.OPENAI_API_KEY ?? null;
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not found');
    }
  }

  isAuthenticated(): boolean {
    return this.apiKey !== null;
  }

  getCredentials(): AuthCredentials {
    return {
      type: 'api-key',
      token: this.apiKey ?? undefined,
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    };
  }

  async validate(): Promise<boolean> {
    return this.apiKey !== null;
  }

  async chat(message: string): Promise<AIResponse> {
    return {
      content: `[OpenAI Response] ${message}`,
      model: 'gpt-4',
      timestamp: Date.now(),
    };
  }
}

class OllamaAuthProvider implements AuthProvider {
  id = 'ollama';
  name = 'Ollama';
  type = 'ollama' as const;
  private endpoint: string;
  private models: string[] = [];

  constructor(endpoint?: string) {
    this.endpoint = endpoint ?? 'http://localhost:11434';
  }

  async initialize(): Promise<void> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      const data = await response.json() as { models: Array<{ name: string }> };
      this.models = data.models.map((m) => m.name);
    } catch {
      this.models = [];
    }
  }

  isAuthenticated(): boolean {
    return this.models.length > 0;
  }

  getCredentials(): AuthCredentials {
    return {
      type: 'local',
      endpoint: this.endpoint,
      models: this.models,
    };
  }

  async validate(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async chat(message: string): Promise<AIResponse> {
    return {
      content: `[Ollama Response] ${message}`,
      model: this.models[0] ?? 'llama2',
      timestamp: Date.now(),
    };
  }
}

export class YYC3Auth {
  private providers: Map<string, AuthProvider> = new Map();
  private activeProvider: AuthProvider | null = null;
  private config: AuthConfig;

  constructor(config: AuthConfig = {}) {
    this.config = config;
  }

  async initialize(): Promise<AuthProvider> {
    if (this.config.openaiApiKey ?? process.env.OPENAI_API_KEY) {
      const provider = new OpenAIAuthProvider();
      await provider.initialize();
      this.providers.set('openai', provider);
      this.activeProvider = provider;
      return provider;
    }

    const ollamaProvider = new OllamaAuthProvider(this.config.ollamaEndpoint);
    await ollamaProvider.initialize();
    
    if (ollamaProvider.isAuthenticated()) {
      this.providers.set('ollama', ollamaProvider);
      this.activeProvider = ollamaProvider;
      return ollamaProvider;
    }

    throw new Error('No authentication provider available');
  }

  getProvider(): AuthProvider | null {
    return this.activeProvider;
  }

  getProviderById(id: string): AuthProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): AuthProvider[] {
    return Array.from(this.providers.values());
  }
}
