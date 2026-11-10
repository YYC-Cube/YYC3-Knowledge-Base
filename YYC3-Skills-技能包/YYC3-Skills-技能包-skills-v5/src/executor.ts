/**
 * @description YYC³ Skills 执行器
 * @module @yyc3/skills/executor
 */

import type { Skill, SkillResult, SkillStep } from './types';

export interface ExecutorConfig {
  maxConcurrent: number;
  timeout: number;
  retryCount: number;
}

export class SkillExecutor {
  private config: ExecutorConfig;

  constructor(config: Partial<ExecutorConfig> = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent ?? 5,
      timeout: config.timeout ?? 30000,
      retryCount: config.retryCount ?? 3,
    };
  }

  async execute(skill: Skill, input: Record<string, unknown>): Promise<SkillResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    const errors: string[] = [];

    try {
      logs.push(`Validating input for skill: ${skill.name}`);
      this.validateInput(skill, input);

      logs.push(`Executing skill: ${skill.name}`);
      const output = await this.executeSteps(skill.steps, input, logs);

      return {
        success: true,
        output,
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

  private validateInput(skill: Skill, input: Record<string, unknown>): void {
    for (const param of skill.parameters) {
      if (param.required && !(param.name in input)) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }
    }
  }

  private async executeSteps(
    steps: SkillStep[],
    input: Record<string, unknown>,
    logs: string[]
  ): Promise<unknown> {
    const context = { ...input };

    for (const step of steps) {
      logs.push(`Executing step: ${step.name}`);
      
      const stepResult = await this.executeStep(step, context);
      context[step.output] = stepResult;
    }

    return context;
  }

  private async executeStep(
    step: SkillStep,
    context: Record<string, unknown>
  ): Promise<unknown> {
    return { stepId: step.id, action: step.action, result: 'completed' };
  }
}
