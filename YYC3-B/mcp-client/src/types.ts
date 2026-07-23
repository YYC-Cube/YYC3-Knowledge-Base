/**
 * @description YYC³ MCP Client 类型定义
 * @module @yyc3/mcp-client/types
 */

export interface MCPClientConfig {
  timeout: number;
  retryCount: number;
  retryDelay: number;
}

export interface MCPConnection {
  id: string;
  serverName: string;
  status: 'connected' | 'disconnected' | 'error';
  lastPing?: number;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}
