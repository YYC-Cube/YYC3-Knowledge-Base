/**
 * @file: AgentServiceAdapter.ts
 * @description: 智能体服务适配层 — 连接后端智能体核心与前端调度层
 *              提供 AgentOrchestrator 的前端友好接口，支持 LLM 服务集成
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-04
 * @updated: 2026-04-04
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: agent,adapter,service,integration
 */

import {
  AgentOrchestrator,
  type OrchestratorConfig,
  type OrchestratorState,
} from '../../../../agent/orchestrator/AgentOrchestrator';
import type {
  AgentRole,
  AgentTask,
  AgentResult,
  AgentContext,
  TaskDefinition,
} from '../../../../agent/types';
import { PlannerAgent } from '../../../../agent/agents/PlannerAgent';
import { CoderAgent } from '../../../../agent/agents/CoderAgent';
import { TesterAgent } from '../../../../agent/agents/TesterAgent';
import { ReviewerAgent } from '../../../../agent/agents/ReviewerAgent';

export interface LLMServiceConfig {
  provider: string;
  modelId: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface AgentExecutionOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  onToken?: (token: string) => void;
}

export interface PipelineExecutionResult {
  success: boolean;
  plan?: {
    tasks: TaskDefinition[];
    recommendedSequence: string[];
  };
  results: AgentResult[];
  totalDuration: number;
  error?: string;
}

export interface IAgentServiceAdapter {
  initialize(context: AgentContext, llmConfig: LLMServiceConfig): Promise<void>;
  executePipeline(userRequest: string, options?: AgentExecutionOptions): Promise<PipelineExecutionResult>;
  executeAgent(role: AgentRole, task: string, options?: AgentExecutionOptions): Promise<AgentResult>;
  getState(): OrchestratorState;
  cancel(): void;
  reset(): void;
}

export class AgentServiceAdapter implements IAgentServiceAdapter {
  private _orchestrator: AgentOrchestrator;
  private _plannerAgent: PlannerAgent;
  private _coderAgent: CoderAgent;
  private _testerAgent: TesterAgent;
  private _reviewerAgent: ReviewerAgent;
  private _context: AgentContext | null = null;
  private _llmConfig: LLMServiceConfig | null = null;
  private _isInitialized: boolean = false;
  private _abortController: AbortController | null = null;

  constructor(config?: Partial<OrchestratorConfig>) {
    this._orchestrator = new AgentOrchestrator(config);
    this._plannerAgent = new PlannerAgent();
    this._coderAgent = new CoderAgent();
    this._testerAgent = new TesterAgent();
    this._reviewerAgent = new ReviewerAgent();
  }

  async initialize(context: AgentContext, llmConfig: LLMServiceConfig): Promise<void> {
    this._context = context;
    this._llmConfig = llmConfig;

    await this._orchestrator.initialize(context);
    await this._plannerAgent.initialize(context);
    await this._coderAgent.initialize(context);
    await this._testerAgent.initialize(context);
    await this._reviewerAgent.initialize(context);

    this._isInitialized = true;
  }

  private ensureInitialized(): void {
    if (!this._isInitialized || !this._context || !this._llmConfig) {
      throw new Error('AgentServiceAdapter not initialized. Call initialize() first.');
    }
  }

  async executePipeline(
    userRequest: string,
    options?: AgentExecutionOptions
  ): Promise<PipelineExecutionResult> {
    this.ensureInitialized();

    const startTime = Date.now();
    this._abortController = new AbortController();

    try {
      const planTask: AgentTask = {
        id: `plan-${Date.now()}`,
        type: 'decompose',
        description: `Plan: ${userRequest.slice(0, 100)}`,
        priority: 'high',
        status: 'pending',
        input: {
          userMessage: userRequest,
          context: {},
        },
        dependencies: [],
        constraints: {
          timeout: 120000,
          maxRetries: 3,
        },
        metadata: {
          source: 'user',
          conversationId: this._context!.conversationId,
          projectId: this._context!.projectId,
          tags: ['planning'],
        },
        createdAt: Date.now(),
      };

      const planResult = await this._plannerAgent.execute(planTask);

      if (planResult.status !== 'success') {
        return {
          success: false,
          results: [planResult],
          totalDuration: Date.now() - startTime,
          error: 'Planning phase failed',
        };
      }

      const plan = planResult.output.plan as {
        tasks: TaskDefinition[];
        recommendedSequence: string[];
      } | undefined;

      if (!plan || !plan.tasks || plan.tasks.length === 0) {
        return {
          success: false,
          results: [planResult],
          totalDuration: Date.now() - startTime,
          error: 'No tasks generated from planning',
        };
      }

      const executionResults: AgentResult[] = [planResult];
      const taskMap = new Map<string, TaskDefinition>();
      for (const taskDef of plan.tasks) {
        taskMap.set(taskDef.id, taskDef);
      }

      for (const taskId of plan.recommendedSequence) {
        if (this._abortController?.signal.aborted) {
          break;
        }

        const taskDef = taskMap.get(taskId);
        if (!taskDef) continue;

        const agentTask: AgentTask = {
          id: taskDef.id,
          type: taskDef.type as AgentTask['type'],
          description: taskDef.description,
          priority: taskDef.priority,
          status: 'pending',
          input: {
            userMessage: userRequest,
            context: {},
            parameters: { taskDefinition: taskDef },
          },
          dependencies: taskDef.dependencies || [],
          constraints: {
            timeout: 120000,
            maxRetries: 3,
          },
          metadata: {
            source: 'agent',
            conversationId: this._context!.conversationId,
            projectId: this._context!.projectId,
            tags: [taskDef.type],
          },
          createdAt: Date.now(),
        };

        const agent = this.getAgentForTask(taskDef.type);
        if (!agent) continue;

        try {
          const result = await agent.execute(agentTask);
          executionResults.push(result);

          if (result.status === 'failed') {
            break;
          }
        } catch (error) {
          break;
        }
      }

      return {
        success: true,
        plan,
        results: executionResults,
        totalDuration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        results: [],
        totalDuration: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  async executeAgent(
    role: AgentRole,
    task: string,
    options?: AgentExecutionOptions
  ): Promise<AgentResult> {
    this.ensureInitialized();

    const agent = this.getAgentByRole(role);
    if (!agent) {
      return {
        taskId: `error-${Date.now()}`,
        agent: role,
        status: 'failed',
        output: {},
        metrics: {
          executionTime: 0,
          tokensUsed: 0,
          filesModified: 0,
          testsGenerated: 0,
        },
        suggestions: [`Unknown agent role: ${role}`],
      };
    }

    const agentTask: AgentTask = {
      id: `${role}-${Date.now()}`,
      type: this.getTaskTypeForRole(role),
      description: task,
      priority: 'high',
      status: 'pending',
      input: {
        userMessage: task,
        context: {},
      },
      dependencies: [],
      constraints: {
        timeout: 120000,
        maxRetries: 3,
      },
      metadata: {
        source: 'user',
        conversationId: this._context!.conversationId,
        projectId: this._context!.projectId,
        tags: [role],
      },
      createdAt: Date.now(),
    };

    return agent.execute(agentTask);
  }

  getState(): OrchestratorState {
    return this._orchestrator.getOrchestratorState();
  }

  cancel(): void {
    this._abortController?.abort();
  }

  reset(): void {
    this._abortController?.abort();
    this._isInitialized = false;
    this._context = null;
    this._llmConfig = null;
  }

  private getAgentForTask(taskType: string): PlannerAgent | CoderAgent | TesterAgent | ReviewerAgent | null {
    switch (taskType) {
      case 'decompose':
      case 'plan':
        return this._plannerAgent;
      case 'generate':
      case 'modify':
      case 'refactor':
      case 'fix':
        return this._coderAgent;
      case 'test':
        return this._testerAgent;
      case 'review':
        return this._reviewerAgent;
      default:
        return this._coderAgent;
    }
  }

  private getAgentByRole(role: AgentRole): PlannerAgent | CoderAgent | TesterAgent | ReviewerAgent | null {
    switch (role) {
      case 'planner':
        return this._plannerAgent;
      case 'coder':
        return this._coderAgent;
      case 'tester':
        return this._testerAgent;
      case 'reviewer':
        return this._reviewerAgent;
      default:
        return null;
    }
  }

  private getTaskTypeForRole(role: AgentRole): AgentTask['type'] {
    switch (role) {
      case 'planner':
        return 'decompose';
      case 'coder':
        return 'generate';
      case 'tester':
        return 'test';
      case 'reviewer':
        return 'review';
      default:
        return 'generate';
    }
  }
}

export function createAgentServiceAdapter(config?: Partial<OrchestratorConfig>): AgentServiceAdapter {
  return new AgentServiceAdapter(config);
}
