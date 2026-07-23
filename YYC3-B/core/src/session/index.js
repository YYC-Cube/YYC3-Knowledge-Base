/**
 * @description YYC³ Session - 会话管理
 * @module @yyc3/core/session
 */
export class SessionManager {
    sessions = new Map();
    _config;
    _initialized = false;
    constructor(config = {}) {
        this._config = {
            maxSessions: config.maxSessions ?? 100,
            maxMessagesPerSession: config.maxMessagesPerSession ?? 1000,
        };
    }
    async initialize() {
        this._initialized = true;
    }
    createSession(metadata) {
        const id = this.generateId();
        const session = {
            id,
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        if (metadata !== undefined) {
            session.metadata = metadata;
        }
        this.sessions.set(id, session);
        return session;
    }
    getSession(id) {
        return this.sessions.get(id);
    }
    addMessage(sessionId, message) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.messages.push({
                ...message,
                timestamp: Date.now(),
            });
            session.updatedAt = Date.now();
        }
    }
    getMessages(sessionId) {
        return this.sessions.get(sessionId)?.messages ?? [];
    }
    deleteSession(id) {
        return this.sessions.delete(id);
    }
    getActiveCount() {
        return this.sessions.size;
    }
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    async shutdown() {
        this.sessions.clear();
        this._initialized = false;
    }
    generateId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}
//# sourceMappingURL=index.js.map