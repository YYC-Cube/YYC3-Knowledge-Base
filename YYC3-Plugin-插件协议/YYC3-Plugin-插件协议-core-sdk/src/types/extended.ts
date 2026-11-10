/**
 * @description YYC³ Core 扩展类型定义
 * @module @yyc3/core/types/extended
 */

export type AIProviderType = 'openai' | 'ollama' | 'anthropic' | 'custom';

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finishReason: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface MCPTransportConfig {
  type: 'stdio' | 'http' | 'websocket';
  endpoint?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPServerConfig {
  name: string;
  transport: MCPTransportConfig;
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
}

export type AIFamilyAgent =
  | 'meta-oracle'
  | 'navigator'
  | 'thinker'
  | 'prophet'
  | 'bolero'
  | 'sentinel'
  | 'master'
  | 'creative';

export interface AIFamilyAgentConfig {
  id: AIFamilyAgent;
  name: string;
  role: string;
  description: string;
  systemPrompt: string;
  capabilities: string[];
  priority: number;
}

export interface ClawConfig {
  auth: {
    provider: AIProviderType;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
  mcp?: MCPServerConfig[];
  skills?: SkillDefinition[];
  agents?: AIFamilyAgentConfig[];
}

export type SkillCategory = 'reasoning' | 'generation' | 'analysis' | 'automation' | 'integration';

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  category: SkillCategory;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ExecutionContext {
  sessionId: string;
  userId?: string;
  provider: AIProviderType;
  model?: string;
  messages: ChatMessage[];
  variables: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface SkillExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  duration: number;
  tokens?: {
    input: number;
    output: number;
  };
}
