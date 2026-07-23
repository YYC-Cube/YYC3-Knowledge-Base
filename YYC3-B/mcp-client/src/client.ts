/**
 * @description YYC³ MCP Client 实现
 * @module @yyc3/mcp-client/client
 */

import type { MCPClientConfig, MCPConnection, MCPTool, MCPResource, MCPToolResult } from './types';

export class MCPClient {
  private config: MCPClientConfig;
  private connections: Map<string, MCPConnection> = new Map();
  private tools: Map<string, MCPTool[]> = new Map();
  private resources: Map<string, MCPResource[]> = new Map();

  constructor(config: Partial<MCPClientConfig> = {}) {
    this.config = {
      timeout: config.timeout ?? 30000,
      retryCount: config.retryCount ?? 3,
      retryDelay: config.retryDelay ?? 1000,
    };
  }

  async connect(serverId: string, config: Record<string, unknown>): Promise<MCPConnection> {
    const connection: MCPConnection = {
      id: serverId,
      serverName: config.name as string ?? serverId,
      status: 'connected',
      lastPing: Date.now(),
    };

    this.connections.set(serverId, connection);
    return connection;
  }

  async disconnect(serverId: string): Promise<void> {
    const connection = this.connections.get(serverId);
    if (connection) {
      connection.status = 'disconnected';
      this.connections.delete(serverId);
    }
  }

  async listTools(serverId: string): Promise<MCPTool[]> {
    return this.tools.get(serverId) ?? [];
  }

  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: `Tool ${toolName} called on ${serverId}`,
        },
      ],
    };
  }

  async listResources(serverId: string): Promise<MCPResource[]> {
    return this.resources.get(serverId) ?? [];
  }

  async readResource(serverId: string, uri: string): Promise<unknown> {
    return { uri, content: 'Resource content' };
  }

  getConnection(serverId: string): MCPConnection | undefined {
    return this.connections.get(serverId);
  }

  getAllConnections(): MCPConnection[] {
    return Array.from(this.connections.values());
  }

  getConnectedCount(): number {
    return Array.from(this.connections.values()).filter(
      (c) => c.status === 'connected'
    ).length;
  }
}
