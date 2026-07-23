/**
 * @description YYC³ Hub - 核心控制器
 * @module @yyc3/core/hub
 */
import { type AuthProvider } from './auth';
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
export declare class YYC3Hub {
    private config;
    private auth;
    private mcp;
    private session;
    private initialized;
    constructor(config?: HubConfig);
    initialize(): Promise<void>;
    chat(message: string, sessionId?: string): Promise<YYC3Result<AIResponse>>;
    getProvider(): AuthProvider | null;
    getMCPManager(): MCPManager;
    getSessionManager(): SessionManager;
    getStatus(): HubStatus;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=hub.d.ts.map