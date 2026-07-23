/**
 * @description YYC³ Core 类型定义
 * @module @yyc3/core/types
 */
export interface YYC3Config {
    logLevel: LogLevel;
    timeout: number;
    retryCount: number;
    retryDelay: number;
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface YYC3Error extends Error {
    code: string;
    details?: Record<string, unknown>;
    timestamp: number;
}
export interface YYC3Result<T> {
    success: boolean;
    data?: T;
    error?: YYC3Error;
    timestamp: number;
}
export interface ProviderConfig {
    type: 'openai' | 'ollama';
    apiKey?: string;
    endpoint?: string;
    model?: string;
}
export interface AIResponse {
    content: string;
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    timestamp: number;
}
//# sourceMappingURL=types.d.ts.map