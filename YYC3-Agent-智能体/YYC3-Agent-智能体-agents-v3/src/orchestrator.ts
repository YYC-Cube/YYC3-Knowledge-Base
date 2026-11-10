/**
 * @description YYC³ Agents 编排器
 * @module @yyc3/agents/orchestrator
 */

import type { Agent, AgentResult, Task, TaskConstraints } from './types';

export interface OrchestratorConfig {
  maxConcurrentAgents: number;
  defaultTimeout: number;
  enableRetry: boolean;
  retryCount: number;
}

export interface TaskAssignment {
  agentId: string;
  task: Task;
  priority: number;
}

export interface CollaborationResult {
  success: boolean;
  results: AgentResult[];
  totalDuration: number;
  agentsUsed: string[];
}

export class AgentOrchestrator {
  private agents: Map<string, Agent>;
  private config: OrchestratorConfig;

  constructor(agents: Map<string, Agent>, config: Partial<OrchestratorConfig> = {}) {
    this.agents = agents;
    this.config = {
      maxConcurrentAgents: config.maxConcurrentAgents ?? 5,
      defaultTimeout: config.defaultTimeout ?? 30000,
      enableRetry: config.enableRetry ?? true,
      retryCount: config.retryCount ?? 3,
    };
  }

  async collaborate(
    task: Task,
    agentIds: string[],
    mode: 'parallel' | 'sequential' | 'pipeline' = 'parallel'
  ): Promise<CollaborationResult> {
    const startTime = Date.now();
    const results: AgentResult[] = [];

    switch (mode) {
      case 'parallel':
        results.push(...(await this.executeParallel(task, agentIds)));
        break;
      case 'sequential':
        results.push(...(await this.executeSequential(task, agentIds)));
        break;
      case 'pipeline':
        results.push(...(await this.executePipeline(task, agentIds)));
        break;
    }

    return {
      success: results.every((r) => r.success),
      results,
      totalDuration: Date.now() - startTime,
      agentsUsed: agentIds,
    };
  }

  private async executeParallel(task: Task, agentIds: string[]): Promise<AgentResult[]> {
    const promises = agentIds.map((id) => this.executeAgent(id, task));
    return Promise.all(promises);
  }

  private async executeSequential(task: Task, agentIds: string[]): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    for (const id of agentIds) {
      results.push(await this.executeAgent(id, task));
    }
    return results;
  }

  private async executePipeline(task: Task, agentIds: string[]): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    let currentInput = task.input;

    for (const id of agentIds) {
      const pipelineTask = { ...task, input: currentInput };
      const result = await this.executeAgent(id, pipelineTask);
      results.push(result);

      if (!result.success) break;
      currentInput = result.output as Record<string, unknown>;
    }

    return results;
  }

  private async executeAgent(agentId: string, task: Task): Promise<AgentResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return {
        success: false,
        output: null,
        duration: 0,
        metadata: { error: `Agent not found: ${agentId}` },
      };
    }

    const startTime = Date.now();
    return {
      success: true,
      output: { message: `Agent ${agent.name} processed task` },
      duration: Date.now() - startTime,
    };
  }

  assignTasks(tasks: Task[], constraints?: TaskConstraints): TaskAssignment[] {
    const assignments: TaskAssignment[] = [];
    const maxAgents = constraints?.maxAgents ?? this.config.maxConcurrentAgents;

    for (let i = 0; i < tasks.length && i < maxAgents; i++) {
      const task = tasks[i];
      if (!task) continue;
      
      const agent = this.findBestAgent(task, constraints);
      if (agent) {
        assignments.push({
          agentId: agent.id,
          task,
          priority: i,
        });
      }
    }

    return assignments;
  }

  private findBestAgent(task: Task, constraints?: TaskConstraints): Agent | undefined {
    const availableAgents = Array.from(this.agents.values()).filter((a) => {
      if (constraints?.excludedAgents?.includes(a.id)) {
        return false;
      }
      return true;
    });

    return availableAgents[0];
  }
}
