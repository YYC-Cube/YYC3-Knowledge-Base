/**
 * @description YYC³ Hub - 核心控制器
 * @module @yyc3/core/hub
 */

import { YYC3Auth, type AuthProvider } from './auth';
import { MCPManager } from './mcp';
import { SessionManager } from './session';
import type { YYC3Config, YYC3Result, AIResponse } from './types';

export interface HubConfig extends Partial<YYC3Config> {
  auth?: {
    openaiApiKey?: string;
    ollamaEndpoint?: string;
  };
}

export interface HubStatus {
  initialized: boolean;
  provider: 'openai' | 'ollama' | null;
  mcpServers: number;
  activeSessions: number;
}

export class YYC3Hub {
  private config: YYC3Config;
  private auth: YYC3Auth;
  private mcp: MCPManager;
  private session: SessionManager;
  private initialized: boolean = false;

  constructor(config: HubConfig = {}) {
    this.config = {
      logLevel: config.logLevel ?? 'info',
      timeout: config.timeout ?? 30000,
      retryCount: config.retryCount ?? 3,
      retryDelay: config.retryDelay ?? 1000,
    };

    this.auth = new YYC3Auth(config.auth);
    this.mcp = new MCPManager();
    this.session = new SessionManager();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.auth.initialize();
    await this.mcp.initialize();
    await this.session.initialize();

    this.initialized = true;
  }

  async chat(message: string, sessionId?: string): Promise<YYC3Result<AIResponse>> {
    if (!this.initialized) {
      await this.initialize();
    }

    const provider = this.auth.getProvider();
    if (!provider) {
      return {
        success: false,
        error: {
          name: 'AuthError',
          message: 'No authentication provider available',
          code: 'AUTH_NO_PROVIDER',
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };
    }

    try {
      const response = await provider.chat(message);
      
      if (sessionId) {
        this.session.addMessage(sessionId, {
          role: 'user',
          content: message,
        });
        this.session.addMessage(sessionId, {
          role: 'assistant',
          content: response.content,
        });
      }

      return {
        success: true,
        data: response,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ChatError',
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'CHAT_ERROR',
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };
    }
  }

  getProvider(): AuthProvider | null {
    return this.auth.getProvider();
  }

  getMCPManager(): MCPManager {
    return this.mcp;
  }

  getSessionManager(): SessionManager {
    return this.session;
  }

  getStatus(): HubStatus {
    return {
      initialized: this.initialized,
      provider: this.auth.getProvider()?.type ?? null,
      mcpServers: this.mcp.getServerCount(),
      activeSessions: this.session.getActiveCount(),
    };
  }

  async shutdown(): Promise<void> {
    await this.mcp.shutdown();
    await this.session.shutdown();
    this.initialized = false;
  }
}
