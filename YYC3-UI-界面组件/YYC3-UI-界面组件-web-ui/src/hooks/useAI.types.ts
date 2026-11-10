/**
 * @description AI Hook 类型定义
 * @module @yyc3/web-ui/hooks/useAI.types
 */

export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'ollama'
  | 'zhipu'
  | 'qwen'
  | 'deepseek'
  | 'custom';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  version?: number;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type AIStreamCallback = (chunk: string) => void;

export interface UseAIReturn {
  chat: (messages: AIMessage[], onChunk: AIStreamCallback) => Promise<void>;
  isStreaming: boolean;
  config: AIConfig;
  saveConfig: (newConfig: AIConfig) => void;
  loading: boolean;
}
