/**
 * @description YYC³ MCP - MCP协议管理
 * @module @yyc3/core/mcp
 */
export interface MCPServer {
    id: string;
    name: string;
    command: string;
    args: string[];
    env: Record<string, string>;
    status: 'running' | 'stopped' | 'error';
}
export interface MCPConfig {
    servers: MCPServer[];
}
export interface MCPStatus {
    totalServers: number;
    runningServers: number;
    errorServers: number;
}
export declare class MCPManager {
    private servers;
    private _initialized;
    initialize(): Promise<void>;
    addServer(server: MCPServer): void;
    removeServer(id: string): boolean;
    getServer(id: string): MCPServer | undefined;
    getAllServers(): MCPServer[];
    getServerCount(): number;
    startServer(id: string): Promise<void>;
    stopServer(id: string): Promise<void>;
    getStatus(): MCPStatus;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map