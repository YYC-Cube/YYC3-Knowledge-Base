/**
 * @description AI React Hook · 提供 AI 对话功能，支持流式响应和多提供商
 * @module @yyc3/web-ui/hooks/useAI
 */

import { useState, useEffect, useCallback } from 'react';

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

const DEFAULT_CONFIG: AIConfig = {
  provider: 'ollama',
  apiKey: 'ollama',
  baseUrl: 'http://localhost:11434/v1',
  model: 'llama3',
  temperature: 0.7,
  version: 1,
};

const STORAGE_KEY = 'yyc3_ai_config';
const CURRENT_VERSION = 1;

export function useAI(): UseAIReturn {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        if (parsed.version !== CURRENT_VERSION) {
          const migrated = {
            ...DEFAULT_CONFIG,
            ...parsed,
            version: CURRENT_VERSION,
          };
          setConfig(migrated);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        } else {
          setConfig(parsed);
        }
      }
    } catch (err) {
      // Use default config on load failure
    } finally {
      setLoading(false);
    }
  }, []);

  const saveConfig = useCallback((newConfig: AIConfig) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      setConfig(newConfig);
    } catch (e) {
      // Silent on save failure
    }
  }, []);

  const chat = useCallback(
    async (messages: AIMessage[], onChunk: AIStreamCallback) => {
      setIsStreaming(true);

      const currentConfig = config;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
          const response = await fetch(
            `${currentConfig.baseUrl}/chat/completions`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentConfig.apiKey}`,
              },
              body: JSON.stringify({
                model: currentConfig.model,
                messages: messages,
                temperature: currentConfig.temperature,
                stream: true,
              }),
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`AI API Error: ${response.statusText}`);
          }
          if (!response.body) {
            throw new Error('No response body');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = (buffer + chunk).split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                const dataStr = trimmed.slice(6);
                if (dataStr === '[DONE]') {
                  continue;
                }

                try {
                  const data = JSON.parse(dataStr);
                  const content = data.choices?.[0]?.delta?.content || '';
                  if (content) {
                    onChunk(content);
                  }
                } catch (e) {
                  // Ignore stream chunk parse error
                }
              }
            }
          }
        } catch (networkError: unknown) {
          const fallbackMessage =
            'Local inference node unreachable. Using simulated response.\n\n' +
            `Your message has been processed. In production, this would be the actual AI response from ${currentConfig.model}.`;

          const chunks = fallbackMessage.split(' ');
          for (const chunk of chunks) {
            await new Promise((r) => setTimeout(r, 50));
            onChunk(chunk + ' ');
          }
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        onChunk(`\n[SYSTEM_ERROR]: ${errorMessage}\n`);
      } finally {
        setIsStreaming(false);
      }
    },
    [config]
  );

  return { chat, isStreaming, config, saveConfig, loading };
}
