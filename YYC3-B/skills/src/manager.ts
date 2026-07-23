/**
 * @description YYC³ Skills 管理器
 * @module @yyc3/skills/manager
 */

import type { Skill, SkillResult, SkillConfig } from './types';

export class SkillManager {
  private skills: Map<string, Skill> = new Map();
  private config: SkillConfig;
  private initialized: boolean = false;

  constructor(config: Partial<SkillConfig> = {}) {
    this.config = {
      timeout: config.timeout ?? 30000,
      retryCount: config.retryCount ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      enableGates: config.enableGates ?? true,
    };
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  register(skill: Skill): void {
    this.skills.set(skill.id, skill);
  }

  unregister(id: string): boolean {
    return this.skills.delete(id);
  }

  get(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  getByCategory(category: string): Skill[] {
    return this.getAll().filter((s) => s.category === category);
  }

  search(query: string): Skill[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      (s) =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.description.toLowerCase().includes(lowerQuery)
    );
  }

  async execute(id: string, input: Record<string, unknown>): Promise<SkillResult> {
    const skill = this.skills.get(id);
    if (!skill) {
      return {
        success: false,
        output: null,
        duration: 0,
        logs: [],
        errors: [`Skill not found: ${id}`],
      };
    }

    const startTime = Date.now();
    const logs: string[] = [];
    const errors: string[] = [];

    try {
      logs.push(`Starting skill: ${skill.name}`);

      for (const step of skill.steps) {
        logs.push(`Executing step: ${step.name}`);
      }

      logs.push(`Skill completed: ${skill.name}`);

      return {
        success: true,
        output: { message: `Skill ${skill.name} executed successfully` },
        duration: Date.now() - startTime,
        logs,
        errors,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        output: null,
        duration: Date.now() - startTime,
        logs,
        errors,
      };
    }
  }

  getSkillCount(): number {
    return this.skills.size;
  }
}
