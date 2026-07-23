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

export class MCPManager {
  private servers: Map<string, MCPServer> = new Map();
  private _initialized: boolean = false;

  async initialize(): Promise<void> {
    this._initialized = true;
  }

  addServer(server: MCPServer): void {
    this.servers.set(server.id, server);
  }

  removeServer(id: string): boolean {
    return this.servers.delete(id);
  }

  getServer(id: string): MCPServer | undefined {
    return this.servers.get(id);
  }

  getAllServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  getServerCount(): number {
    return this.servers.size;
  }

  async startServer(id: string): Promise<void> {
    const server = this.servers.get(id);
    if (server) {
      server.status = 'running';
    }
  }

  async stopServer(id: string): Promise<void> {
    const server = this.servers.get(id);
    if (server) {
      server.status = 'stopped';
    }
  }

  getStatus(): MCPStatus {
    const servers = Array.from(this.servers.values());
    return {
      totalServers: servers.length,
      runningServers: servers.filter((s) => s.status === 'running').length,
      errorServers: servers.filter((s) => s.status === 'error').length,
    };
  }

  async shutdown(): Promise<void> {
    for (const server of this.servers.values()) {
      server.status = 'stopped';
    }
    this._initialized = false;
  }
}
