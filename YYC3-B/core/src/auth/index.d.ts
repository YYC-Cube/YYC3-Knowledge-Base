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
export declare class YYC3Auth {
    private providers;
    private activeProvider;
    private config;
    constructor(config?: AuthConfig);
    initialize(): Promise<AuthProvider>;
    getProvider(): AuthProvider | null;
    getProviderById(id: string): AuthProvider | undefined;
    getAllProviders(): AuthProvider[];
}
//# sourceMappingURL=index.d.ts.map