/**
 * @description YYC³ Agents 类型定义
 * @module @yyc3/agents/types
 */

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  proficiency: number;
}

export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retryCount?: number;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  version: string;
  category: AgentCategory;
  capabilities: AgentCapability[];
  skills: string[];
  mcpServers?: string[];
  config: AgentConfig;
}

export type AgentCategory = 
  | 'backend'
  | 'frontend'
  | 'ai'
  | 'devops'
  | 'security'
  | 'testing'
  | 'documentation'
  | 'optimization';

export interface AgentResult {
  success: boolean;
  output: unknown;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface Task {
  id: string;
  type: string;
  description: string;
  input: Record<string, unknown>;
  constraints?: TaskConstraints;
}

export interface TaskConstraints {
  maxAgents?: number;
  timeout?: number;
  requiredCapabilities?: string[];
  excludedAgents?: string[];
}
