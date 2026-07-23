/**
 * @description YYC³ Agents 路由器
 * @module @yyc3/agents/router
 */

import type { Agent, Task, TaskConstraints } from './types';

export interface RoutingResult {
  selectedAgents: Agent[];
  confidence: number;
  reasoning: string;
}

export class AgentRouter {
  private agents: Map<string, Agent>;

  constructor(agents: Map<string, Agent>) {
    this.agents = agents;
  }

  route(task: Task, constraints?: TaskConstraints): RoutingResult {
    const candidates = this.findCandidates(task, constraints);
    const ranked = this.rankAgents(candidates, task);
    const selected = this.selectAgents(ranked, constraints);

    return {
      selectedAgents: selected,
      confidence: this.calculateConfidence(selected, task),
      reasoning: this.generateReasoning(selected, task),
    };
  }

  private findCandidates(task: Task, constraints?: TaskConstraints): Agent[] {
    return Array.from(this.agents.values()).filter((agent) => {
      if (constraints?.excludedAgents?.includes(agent.id)) {
        return false;
      }

      if (constraints?.requiredCapabilities) {
        const agentCapabilities = agent.capabilities.map((c) => c.id);
        const hasAll = constraints.requiredCapabilities.every((c) =>
          agentCapabilities.includes(c)
        );
        if (!hasAll) return false;
      }

      return this.hasRelevantCapabilities(agent, task);
    });
  }

  private hasRelevantCapabilities(agent: Agent, task: Task): boolean {
    const taskKeywords = this.extractKeywords(task);
    const agentKeywords = agent.capabilities.flatMap((c) => [
      c.id,
      c.name,
      ...c.description.split(' '),
    ]);

    return taskKeywords.some((keyword) =>
      agentKeywords.some((ak) => ak.toLowerCase().includes(keyword.toLowerCase()))
    );
  }

  private extractKeywords(task: Task): string[] {
    return [
      task.type,
      ...task.description.split(' '),
      ...Object.keys(task.input),
    ].filter(Boolean);
  }

  private rankAgents(agents: Agent[], task: Task): Agent[] {
    return agents.sort((a, b) => {
      const scoreA = this.calculateAgentScore(a, task);
      const scoreB = this.calculateAgentScore(b, task);
      return scoreB - scoreA;
    });
  }

  private calculateAgentScore(agent: Agent, task: Task): number {
    const capabilityScore = agent.capabilities.reduce((sum, c) => sum + c.proficiency, 0);
    const taskRelevance = this.hasRelevantCapabilities(agent, task) ? 10 : 0;
    return capabilityScore + taskRelevance;
  }

  private selectAgents(agents: Agent[], constraints?: TaskConstraints): Agent[] {
    const maxAgents = constraints?.maxAgents ?? 1;
    return agents.slice(0, maxAgents);
  }

  private calculateConfidence(agents: Agent[], task: Task): number {
    if (agents.length === 0) return 0;
    const avgScore =
      agents.reduce((sum, a) => sum + this.calculateAgentScore(a, task), 0) / agents.length;
    return Math.min(avgScore / 100, 1);
  }

  private generateReasoning(agents: Agent[], task: Task): string {
    if (agents.length === 0) {
      return `No suitable agents found for task type: ${task.type}`;
    }

    const agentNames = agents.map((a) => a.name).join(', ');
    return `Selected ${agents.length} agent(s) for task: ${agentNames}`;
  }
}
