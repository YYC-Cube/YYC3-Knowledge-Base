/**
 * @description YYC³ MCP - MCP协议管理
 * @module @yyc3/core/mcp
 */
export class MCPManager {
    servers = new Map();
    _initialized = false;
    async initialize() {
        this._initialized = true;
    }
    addServer(server) {
        this.servers.set(server.id, server);
    }
    removeServer(id) {
        return this.servers.delete(id);
    }
    getServer(id) {
        return this.servers.get(id);
    }
    getAllServers() {
        return Array.from(this.servers.values());
    }
    getServerCount() {
        return this.servers.size;
    }
    async startServer(id) {
        const server = this.servers.get(id);
        if (server) {
            server.status = 'running';
        }
    }
    async stopServer(id) {
        const server = this.servers.get(id);
        if (server) {
            server.status = 'stopped';
        }
    }
    getStatus() {
        const servers = Array.from(this.servers.values());
        return {
            totalServers: servers.length,
            runningServers: servers.filter((s) => s.status === 'running').length,
            errorServers: servers.filter((s) => s.status === 'error').length,
        };
    }
    async shutdown() {
        for (const server of this.servers.values()) {
            server.status = 'stopped';
        }
        this._initialized = false;
    }
}
//# sourceMappingURL=index.js.map