/**
 * @description YYC³ Agents 管理器
 * @module @yyc3/agents/manager
 */

import type { Agent, AgentResult, Task } from './types';

export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  register(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  unregister(id: string): boolean {
    return this.agents.delete(id);
  }

  get(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  getByCategory(category: string): Agent[] {
    return this.getAll().filter((a) => a.category === category);
  }

  search(query: string): Agent[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      (a) =>
        a.name.toLowerCase().includes(lowerQuery) ||
        a.description.toLowerCase().includes(lowerQuery)
    );
  }

  async execute(id: string, task: Task): Promise<AgentResult> {
    const agent = this.agents.get(id);
    if (!agent) {
      return {
        success: false,
        output: null,
        duration: 0,
        metadata: { error: `Agent not found: ${id}` },
      };
    }

    const startTime = Date.now();

    try {
      return {
        success: true,
        output: { message: `Agent ${agent.name} executed task ${task.id}` },
        duration: Date.now() - startTime,
        metadata: { agentId: agent.id, taskId: task.id },
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        duration: Date.now() - startTime,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  getAgentCount(): number {
    return this.agents.size;
  }
}
