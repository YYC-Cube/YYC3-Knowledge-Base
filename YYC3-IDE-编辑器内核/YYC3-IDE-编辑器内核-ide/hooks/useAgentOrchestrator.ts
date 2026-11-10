/**
 * @file: useAgentOrchestrator.ts
 * @description: AgentOrchestrator 前端状态同步 Hook — 连接智能体核心与 React 状态
 *              提供实时状态更新、进度追踪、错误处理
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-04
 * @updated: 2026-04-04
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: hook,agent,orchestrator,state
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  AgentServiceAdapter,
  createAgentServiceAdapter,
  type LLMServiceConfig,
  type AgentExecutionOptions,
  type PipelineExecutionResult,
} from '../services/AgentServiceAdapter';
import type { AgentRole, AgentResult, AgentContext } from '../../../../agent/types';
import { useMemoryStore } from '../stores/useMemoryStore';

export type PipelineStage = 'idle' | 'planning' | 'coding' | 'testing' | 'reviewing' | 'completed' | 'error';

export interface AgentState {
  role: AgentRole;
  status: 'idle' | 'running' | 'completed' | 'error';
  currentTask: string;
  progress: number;
  output: string;
  duration: number;
}

export interface OrchestratorHookState {
  stage: PipelineStage;
  agents: Record<AgentRole, AgentState>;
  results: AgentResult[];
  currentOutput: string;
  isStreaming: boolean;
  error: string | null;
  userRequest: string;
  totalDuration: number;
}

export interface UseAgentOrchestratorOptions {
  autoSaveToMemory?: boolean;
  onStageChange?: (stage: PipelineStage) => void;
  onAgentComplete?: (role: AgentRole, result: AgentResult) => void;
  onError?: (error: string) => void;
}

const INITIAL_AGENT_STATE: AgentState = {
  role: 'planner',
  status: 'idle',
  currentTask: '',
  progress: 0,
  output: '',
  duration: 0,
};

const INITIAL_STATE: OrchestratorHookState = {
  stage: 'idle',
  agents: {
    planner: { ...INITIAL_AGENT_STATE, role: 'planner' },
    coder: { ...INITIAL_AGENT_STATE, role: 'coder' },
    tester: { ...INITIAL_AGENT_STATE, role: 'tester' },
    reviewer: { ...INITIAL_AGENT_STATE, role: 'reviewer' },
  },
  results: [],
  currentOutput: '',
  isStreaming: false,
  error: null,
  userRequest: '',
  totalDuration: 0,
};

export function useAgentOrchestrator(options: UseAgentOrchestratorOptions = {}) {
  const [state, setState] = useState<OrchestratorHookState>(INITIAL_STATE);
  const adapterRef = useRef<AgentServiceAdapter | null>(null);
  const { addMemory } = useMemoryStore();

  useEffect(() => {
    adapterRef.current = createAgentServiceAdapter({
      maxConcurrentTasks: 4,
      taskTimeout: 120000,
      retryAttempts: 3,
      enableParallelExecution: true,
    });

    return () => {
      adapterRef.current?.reset();
    };
  }, []);

  const initialize = useCallback(async (
    context: AgentContext,
    llmConfig: LLMServiceConfig
  ): Promise<boolean> => {
    if (!adapterRef.current) {
      return false;
    }

    try {
      await adapterRef.current.initialize(context, llmConfig);
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        stage: 'error',
        error: `初始化失败: ${(error as Error).message}`,
      }));
      return false;
    }
  }, []);

  const updateAgentState = useCallback((
    role: AgentRole,
    updates: Partial<AgentState>
  ) => {
    setState(prev => ({
      ...prev,
      agents: {
        ...prev.agents,
        [role]: { ...prev.agents[role], ...updates },
      },
    }));
  }, []);

  const executePipeline = useCallback(async (
    userRequest: string,
    context: AgentContext,
    llmConfig: LLMServiceConfig
  ): Promise<PipelineExecutionResult> => {
    if (!adapterRef.current) {
      return {
        success: false,
        results: [],
        totalDuration: 0,
        error: 'Adapter not initialized',
      };
    }

    setState(prev => ({
      ...prev,
      stage: 'planning',
      userRequest,
      results: [],
      currentOutput: '',
      isStreaming: true,
      error: null,
    }));

    options.onStageChange?.('planning');
    updateAgentState('planner', { status: 'running', currentTask: '分析需求...', progress: 0 });

    try {
      await adapterRef.current.initialize(context, llmConfig);

      const result = await adapterRef.current.executePipeline(userRequest);

      for (const agentResult of result.results) {
        const role = agentResult.agent;
        updateAgentState(role, {
          status: agentResult.status === 'success' ? 'completed' : 'error',
          output: typeof agentResult.output === 'string'
            ? agentResult.output
            : JSON.stringify(agentResult.output),
          duration: agentResult.metrics?.executionTime || 0,
          progress: 100,
        });

        if (options.autoSaveToMemory && agentResult.status === 'success') {
          const outputStr = typeof agentResult.output === 'string'
            ? agentResult.output
            : JSON.stringify(agentResult.output);
          await addMemory({
            title: `${role} 执行结果: ${userRequest.slice(0, 50)}`,
            summary: outputStr.slice(0, 200),
            category: role === 'planner' ? 'project' : role === 'reviewer' ? 'patterns' : 'debug',
            agent: role,
            relevance: 80,
            pinned: false,
            tags: [role, 'pipeline'],
          });
        }

        options.onAgentComplete?.(role, agentResult);
      }

      const finalStage = result.success ? 'completed' : 'error';
      setState(prev => ({
        ...prev,
        stage: finalStage,
        results: result.results,
        totalDuration: result.totalDuration,
        isStreaming: false,
        error: result.error || null,
      }));

      options.onStageChange?.(finalStage);

      if (result.error) {
        options.onError?.(result.error);
      }

      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState(prev => ({
        ...prev,
        stage: 'error',
        error: errorMessage,
        isStreaming: false,
      }));

      options.onError?.(errorMessage);

      return {
        success: false,
        results: [],
        totalDuration: 0,
        error: errorMessage,
      };
    }
  }, [addMemory, options, updateAgentState]);

  const executeAgent = useCallback(async (
    role: AgentRole,
    task: string,
    context: AgentContext,
    llmConfig: LLMServiceConfig,
    execOptions?: AgentExecutionOptions
  ): Promise<AgentResult | null> => {
    if (!adapterRef.current) {
      return null;
    }

    const stageMap: Record<AgentRole, PipelineStage> = {
      planner: 'planning',
      coder: 'coding',
      tester: 'testing',
      reviewer: 'reviewing',
    };

    setState(prev => ({
      ...prev,
      stage: stageMap[role],
      isStreaming: true,
    }));

    updateAgentState(role, { status: 'running', currentTask: task, progress: 0 });

    options.onStageChange?.(stageMap[role]);

    try {
      await adapterRef.current.initialize(context, llmConfig);
      const result = await adapterRef.current.executeAgent(role, task, execOptions);

      updateAgentState(role, {
        status: result.status === 'success' ? 'completed' : 'error',
        output: typeof result.output === 'string'
          ? result.output
          : JSON.stringify(result.output),
        duration: result.metrics?.executionTime || 0,
        progress: 100,
      });

      if (options.autoSaveToMemory && result.status === 'success') {
        const outputStr = typeof result.output === 'string'
          ? result.output
          : JSON.stringify(result.output);
        await addMemory({
          title: `${role} 单独执行: ${task.slice(0, 50)}`,
          summary: outputStr.slice(0, 200),
          category: 'conversation',
          agent: role,
          relevance: 75,
          pinned: false,
          tags: [role, 'single'],
        });
      }

      options.onAgentComplete?.(role, result);

      setState(prev => ({
        ...prev,
        stage: 'completed',
        results: [...prev.results, result],
        isStreaming: false,
      }));

      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      updateAgentState(role, { status: 'error' });
      setState(prev => ({
        ...prev,
        stage: 'error',
        error: errorMessage,
        isStreaming: false,
      }));

      options.onError?.(errorMessage);
      return null;
    }
  }, [addMemory, options, updateAgentState]);

  const cancel = useCallback(() => {
    adapterRef.current?.cancel();
    setState(prev => ({
      ...prev,
      stage: 'idle',
      isStreaming: false,
    }));
  }, []);

  const reset = useCallback(() => {
    adapterRef.current?.reset();
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    initialize,
    executePipeline,
    executeAgent,
    cancel,
    reset,
    isReady: adapterRef.current !== null,
  };
}
