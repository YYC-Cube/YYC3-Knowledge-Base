/**
 * @description YYC³ MCP工具管理模块
 * @module @yyc3/mcp-server/tools
 * 
 * 支持工具调用、参数验证、结果处理
 */

import type {
  MCPTool,
  MCPToolCall,
  MCPToolResult,
  MCPContent,
} from './types.js';
import { EventEmitter } from 'eventemitter3';

export interface ToolExecutor {
  (call: MCPToolCall): Promise<MCPToolResult>;
}

export interface ToolManagerEvents {
  'tool:registered': { tool: MCPTool };
  'tool:unregistered': { name: string };
  'tool:called': { call: MCPToolCall };
  'tool:result': { call: MCPToolCall; result: MCPToolResult };
  'tool:error': { call: MCPToolCall; error: Error };
}

export class MCPToolManager extends EventEmitter<ToolManagerEvents> {
  private tools: Map<string, MCPTool> = new Map();
  private executors: Map<string, ToolExecutor> = new Map();

  registerTool(tool: MCPTool, executor?: ToolExecutor): void {
    this.tools.set(tool.name, tool);
    if (executor) {
      this.executors.set(tool.name, executor);
    }
    this.emit('tool:registered', { tool });
  }

  unregisterTool(name: string): boolean {
    const deleted = this.tools.delete(name);
    this.executors.delete(name);
    if (deleted) {
      this.emit('tool:unregistered', { name });
    }
    return deleted;
  }

  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  validateCall(call: MCPToolCall): { valid: boolean; errors: string[] } {
    const tool = this.tools.get(call.name);
    if (!tool) {
      return { valid: false, errors: [`Tool "${call.name}" not found`] };
    }

    const errors: string[] = [];
    const schema = tool.inputSchema;

    if (schema.required) {
      for (const required of schema.required) {
        if (!(required in call.arguments)) {
          errors.push(`Missing required parameter: ${required}`);
        }
      }
    }

    for (const [key, value] of Object.entries(call.arguments)) {
      const prop = schema.properties[key];
      if (!prop) {
        errors.push(`Unknown parameter: ${key}`);
        continue;
      }

      const typeError = this.validateType(key, value, prop);
      if (typeError) {
        errors.push(typeError);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private validateType(
    key: string,
    value: unknown,
    prop: MCPTool['inputSchema']['properties'][string]
  ): string | null {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    
    if (actualType !== prop.type) {
      return `Parameter "${key}" must be of type ${prop.type}, got ${actualType}`;
    }

    if (prop.enum && !prop.enum.includes(value as string)) {
      return `Parameter "${key}" must be one of: ${prop.enum.join(', ')}`;
    }

    return null;
  }

  async executeTool(call: MCPToolCall): Promise<MCPToolResult> {
    this.emit('tool:called', { call });

    const validation = this.validateCall(call);
    if (!validation.valid) {
      const result: MCPToolResult = {
        id: call.id,
        content: [{
          type: 'text',
          text: `Validation failed: ${validation.errors.join('; ')}`,
        }],
        isError: true,
      };
      this.emit('tool:error', { call, error: new Error(validation.errors.join('; ')) });
      return result;
    }

    const executor = this.executors.get(call.name);
    if (!executor) {
      const result: MCPToolResult = {
        id: call.id,
        content: [{
          type: 'text',
          text: `No executor registered for tool "${call.name}"`,
        }],
        isError: true,
      };
      this.emit('tool:error', { call, error: new Error(`No executor for ${call.name}`) });
      return result;
    }

    try {
      const result = await executor(call);
      this.emit('tool:result', { call, result });
      return result;
    } catch (error) {
      const result: MCPToolResult = {
        id: call.id,
        content: [{
          type: 'text',
          text: error instanceof Error ? error.message : 'Unknown error',
        }],
        isError: true,
      };
      this.emit('tool:error', { call, error: error instanceof Error ? error : new Error('Unknown error') });
      return result;
    }
  }

  registerExecutor(name: string, executor: ToolExecutor): void {
    this.executors.set(name, executor);
  }

  hasExecutor(name: string): boolean {
    return this.executors.has(name);
  }

  createTextResult(id: string, text: string, isError: boolean = false): MCPToolResult {
    return {
      id,
      content: [{ type: 'text', text }],
      isError,
    };
  }

  createImageResult(id: string, data: string, mimeType: string = 'image/png'): MCPToolResult {
    return {
      id,
      content: [{ type: 'image', data, mimeType }],
    };
  }

  createResourceResult(id: string, uri: string, name: string, text: string): MCPToolResult {
    return {
      id,
      content: [{
        type: 'resource',
        resource: { uri, name },
        text,
      }],
    };
  }
}

export const builtinTools: MCPTool[] = [
  {
    name: 'read_file',
    description: '读取本地文件内容',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件路径',
        },
        encoding: {
          type: 'string',
          description: '文件编码',
          default: 'utf-8',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: '写入本地文件',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件路径',
        },
        content: {
          type: 'string',
          description: '文件内容',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'execute_command',
    description: '执行系统命令',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: '要执行的命令',
        },
        cwd: {
          type: 'string',
          description: '工作目录',
        },
        timeout: {
          type: 'number',
          description: '超时时间(毫秒)',
          default: 30000,
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'search_web',
    description: '网络搜索',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索查询',
        },
        limit: {
          type: 'number',
          description: '结果数量限制',
          default: 10,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'query_database',
    description: '执行数据库查询',
    inputSchema: {
      type: 'object',
      properties: {
        connection: {
          type: 'string',
          description: '数据库连接ID',
        },
        query: {
          type: 'string',
          description: 'SQL查询语句',
        },
        params: {
          type: 'array',
          description: '查询参数',
        },
      },
      required: ['connection', 'query'],
    },
  },
];

export const globalToolManager = new MCPToolManager();

for (const tool of builtinTools) {
  globalToolManager.registerTool(tool);
}
