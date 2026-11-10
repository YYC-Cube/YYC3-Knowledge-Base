/**
 * @description YYC³ MCP服务器核心类型定义
 * @module @yyc3/mcp-server/types
 * 
 * 支持MCP协议1.0规范，实现完整的工具调用、资源管理、提示词系统
 */

export interface MCPServerConfig {
  id: string;
  name: string;
  description?: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  autoStart?: boolean;
  tags?: string[];
  category?: MCPServerCategory;
}

export type MCPServerCategory = 
  | 'api'
  | 'database'
  | 'ai-tools'
  | 'cloud'
  | 'filesystem'
  | 'web'
  | 'development'
  | 'communication'
  | 'analytics'
  | 'other';

export interface MCPServerStatus {
  id: string;
  status: 'idle' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  pid?: number;
  startTime?: number;
  lastActivity?: number;
  requestCount: number;
  errorCount: number;
  lastError?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, MCPToolProperty>;
    required?: string[];
  };
}

export interface MCPToolProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: string[];
  default?: unknown;
}

export interface MCPToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  id: string;
  content: MCPContent[];
  isError?: boolean;
}

export interface MCPContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  resource?: MCPResource;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface MCPPromptResult {
  description?: string;
  messages: MCPPromptMessage[];
}

export interface MCPPromptMessage {
  role: 'user' | 'assistant';
  content: MCPContent;
}

export interface MCPAuthProvider {
  type: 'openai' | 'anthropic' | 'ollama' | 'custom';
  apiKey?: string;
  endpoint?: string;
  models?: string[];
  autoDetect?: boolean;
}

export interface MCPRegistryEntry {
  id: string;
  name: string;
  description: string;
  category: MCPServerCategory;
  dockerImage?: string;
  npmPackage?: string;
  githubRepo?: string;
  config: MCPServerConfig;
  tools?: MCPTool[];
  resources?: MCPResource[];
  prompts?: MCPPrompt[];
  tags: string[];
  popularity: number;
  verified: boolean;
}

export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

export interface MCPEventMap {
  'server:started': { serverId: string };
  'server:stopped': { serverId: string };
  'server:error': { serverId: string; error: Error };
  'tool:called': { serverId: string; toolName: string; arguments: Record<string, unknown> };
  'tool:result': { serverId: string; toolName: string; result: MCPToolResult };
  'resource:accessed': { serverId: string; uri: string };
}

export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR_START: -32000,
  SERVER_ERROR_END: -32099,
} as const;

export const DEFAULT_MCP_SERVERS: MCPRegistryEntry[] = [
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: '本地文件系统操作',
    category: 'filesystem',
    config: {
      id: 'filesystem',
      name: 'Filesystem',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem'],
      autoStart: true,
      tags: ['filesystem', 'local'],
    },
    tags: ['filesystem', 'local', 'builtin'],
    popularity: 100,
    verified: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'GitHub API集成',
    category: 'api',
    config: {
      id: 'github',
      name: 'GitHub',
      command: 'docker',
      args: ['run', '-i', '--rm', 'mcp/github'],
      env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
      autoStart: false,
      tags: ['api', 'github', 'git'],
    },
    tags: ['api', 'github', 'git', 'version-control'],
    popularity: 95,
    verified: true,
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'PostgreSQL数据库操作',
    category: 'database',
    config: {
      id: 'postgres',
      name: 'PostgreSQL',
      command: 'docker',
      args: ['run', '-i', '--rm', 'mcp/postgres'],
      autoStart: false,
      tags: ['database', 'postgres', 'sql'],
    },
    tags: ['database', 'postgres', 'sql'],
    popularity: 90,
    verified: true,
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Brave搜索引擎API',
    category: 'web',
    config: {
      id: 'brave-search',
      name: 'Brave Search',
      command: 'docker',
      args: ['run', '-i', '--rm', 'mcp/brave-search'],
      env: { BRAVE_API_KEY: '${BRAVE_API_KEY}' },
      autoStart: false,
      tags: ['web', 'search', 'api'],
    },
    tags: ['web', 'search', 'api'],
    popularity: 85,
    verified: true,
  },
  {
    id: 'chroma',
    name: 'Chroma',
    description: '向量数据库集成',
    category: 'ai-tools',
    config: {
      id: 'chroma',
      name: 'Chroma',
      command: 'docker',
      args: ['run', '-i', '--rm', 'mcp/chroma'],
      autoStart: false,
      tags: ['ai', 'vector-db', 'rag'],
    },
    tags: ['ai', 'vector-db', 'rag', 'embeddings'],
    popularity: 80,
    verified: true,
  },
  {
    id: 'ollama',
    name: 'Ollama',
    description: '本地LLM模型服务',
    category: 'ai-tools',
    config: {
      id: 'ollama',
      name: 'Ollama',
      command: 'npx',
      args: ['-y', '@yyc3/mcp-ollama'],
      env: { OLLAMA_HOST: 'http://localhost:11434' },
      autoStart: true,
      tags: ['ai', 'llm', 'local'],
    },
    tags: ['ai', 'llm', 'local', 'ollama'],
    popularity: 95,
    verified: true,
  },
];
