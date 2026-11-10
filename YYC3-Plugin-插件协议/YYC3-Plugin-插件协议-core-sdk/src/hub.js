/**
 * @description YYC³ Hub - 核心控制器
 * @module @yyc3/core/hub
 */
import { YYC3Auth } from './auth';
import { MCPManager } from './mcp';
import { SessionManager } from './session';
export class YYC3Hub {
    config;
    auth;
    mcp;
    session;
    initialized = false;
    constructor(config = {}) {
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
    async initialize() {
        if (this.initialized) {
            return;
        }
        await this.auth.initialize();
        await this.mcp.initialize();
        await this.session.initialize();
        this.initialized = true;
    }
    async chat(message, sessionId) {
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
        }
        catch (error) {
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
    getProvider() {
        return this.auth.getProvider();
    }
    getMCPManager() {
        return this.mcp;
    }
    getSessionManager() {
        return this.session;
    }
    getStatus() {
        return {
            initialized: this.initialized,
            provider: this.auth.getProvider()?.type ?? null,
            mcpServers: this.mcp.getServerCount(),
            activeSessions: this.session.getActiveCount(),
        };
    }
    async shutdown() {
        await this.mcp.shutdown();
        await this.session.shutdown();
        this.initialized = false;
    }
}
//# sourceMappingURL=hub.js.map