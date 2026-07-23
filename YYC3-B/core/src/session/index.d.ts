/**
 * @description YYC³ Session - 会话管理
 * @module @yyc3/core/session
 */
export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}
export interface Session {
    id: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
    metadata?: Record<string, unknown>;
}
export interface SessionConfig {
    maxSessions?: number;
    maxMessagesPerSession?: number;
}
export declare class SessionManager {
    private sessions;
    private _config;
    private _initialized;
    constructor(config?: SessionConfig);
    initialize(): Promise<void>;
    createSession(metadata?: Record<string, unknown>): Session;
    getSession(id: string): Session | undefined;
    addMessage(sessionId: string, message: Omit<Message, 'timestamp'>): void;
    getMessages(sessionId: string): Message[];
    deleteSession(id: string): boolean;
    getActiveCount(): number;
    getAllSessions(): Session[];
    shutdown(): Promise<void>;
    private generateId;
}
//# sourceMappingURL=index.d.ts.map