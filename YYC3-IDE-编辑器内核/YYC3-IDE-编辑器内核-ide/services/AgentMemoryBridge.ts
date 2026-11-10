/**
 * @file: AgentMemoryBridge.ts
 * @description: 智能体与记忆系统双向绑定服务
 *              提供执行结果自动写入记忆、上下文检索、相关性评分
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-04
 * @updated: 2026-04-04
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: agent,memory,bridge,integration
 */

import type { AgentRole, AgentResult } from '../../../../agent/types';
import { useMemoryStore, type MemoryItem, type MemoryCategory } from '../stores/useMemoryStore';

export interface MemoryEntry {
  title: string;
  summary: string;
  category: MemoryCategory;
  agent: AgentRole;
  relevance: number;
  pinned: boolean;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface ContextRetrievalOptions {
  limit?: number;
  categories?: MemoryCategory[];
  minRelevance?: number;
  includePinned?: boolean;
}

export interface AgentMemoryBridge {
  saveResult(role: AgentRole, result: AgentResult, userRequest: string): Promise<MemoryItem>;
  retrieveContext(userRequest: string, options?: ContextRetrievalOptions): Promise<MemoryItem[]>;
  updateRelevance(memoryId: string, increment: number): Promise<void>;
  getAgentMemories(role: AgentRole, limit?: number): Promise<MemoryItem[]>;
}

const CATEGORY_MAP: Record<AgentRole, MemoryCategory> = {
  planner: 'project',
  coder: 'patterns',
  tester: 'debug',
  reviewer: 'preferences',
};

const RELEVANCE_SCORES: Record<AgentRole, number> = {
  planner: 85,
  coder: 80,
  tester: 75,
  reviewer: 90,
};

export function createAgentMemoryBridge(): AgentMemoryBridge {
  const store = useMemoryStore.getState();

  const saveResult = async (
    role: AgentRole,
    result: AgentResult,
    userRequest: string
  ): Promise<MemoryItem> => {
    const outputText = typeof result.output === 'string'
      ? result.output
      : JSON.stringify(result.output, null, 2);

    const entry: MemoryEntry = {
      title: `[${role.toUpperCase()}] ${userRequest.slice(0, 50)}${userRequest.length > 50 ? '...' : ''}`,
      summary: outputText.slice(0, 300),
      category: CATEGORY_MAP[role],
      agent: role,
      relevance: RELEVANCE_SCORES[role],
      pinned: false,
      tags: [role, 'agent-result', result.status === 'success' ? 'success' : 'error'],
      metadata: {
        taskId: result.taskId,
        duration: result.metrics?.executionTime,
        tokensUsed: result.metrics?.tokensUsed,
        success: result.status === 'success',
      },
    };

    await store.addMemory(entry);
    const memories = store.memories;
    const memoryItem = memories[memories.length - 1];
    if (!memoryItem) {
      throw new Error('Failed to create memory item');
    }
    return memoryItem;
  };

  const retrieveContext = async (
    userRequest: string,
    options: ContextRetrievalOptions = {}
  ): Promise<MemoryItem[]> => {
    const {
      limit = 5,
      categories,
      minRelevance = 50,
      includePinned = true,
    } = options;

    let memories = store.memories;

    if (categories && categories.length > 0) {
      memories = memories.filter(m => categories.includes(m.category));
    }

    memories = memories.filter(m => m.relevance >= minRelevance);

    if (includePinned) {
      memories.sort((a, b) => {
        if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
        return b.relevance - a.relevance;
      });
    } else {
      memories.sort((a, b) => b.relevance - a.relevance);
    }

    const searchResults = store.search(userRequest);
    const relevantIds = new Set(searchResults.slice(0, limit).map(m => m.id));

    const combined = memories.filter(m => relevantIds.has(m.id) || m.pinned);

    return combined.slice(0, limit);
  };

  const updateRelevance = async (memoryId: string, increment: number): Promise<void> => {
    const memory = store.memories.find(m => m.id === memoryId);
    if (memory) {
      await store.updateMemory(memoryId, {
        relevance: Math.min(100, Math.max(0, memory.relevance + increment)),
      });
    }
  };

  const getAgentMemories = async (role: AgentRole, limit = 10): Promise<MemoryItem[]> => {
    return store.memories
      .filter(m => m.agent === role)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  };

  return {
    saveResult,
    retrieveContext,
    updateRelevance,
    getAgentMemories,
  };
}

export function useAgentMemoryBridge(): AgentMemoryBridge {
  return createAgentMemoryBridge();
}
