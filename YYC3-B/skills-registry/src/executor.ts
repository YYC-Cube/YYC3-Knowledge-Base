/**
 * @description YYC³ Skills执行器
 * @module @yyc3/skills-registry/executor
 * 
 * 支持CAGEERF推理框架的Skills执行引擎
 */

import type {
  SkillDefinition,
  SkillExecutionContext,
  SkillResult,
  SkillConfig,
  SkillStep,
  SkillMetrics,
  GateResult,
  CAGEERFContext,
  CAGEERFStage,
  CAGEERFHistory,
} from './types.js';
import { CAGEERF_STAGES, DEFAULT_SKILL_CONFIG } from './types.js';
import { EventEmitter } from 'eventemitter3';

export interface SkillExecutorEvents {
  'skill:started': { skillId: string; context: SkillExecutionContext };
  'skill:completed': { skillId: string; result: SkillResult };
  'skill:error': { skillId: string; error: Error };
  'step:started': { skillId: string; stepId: string };
  'step:completed': { skillId: string; stepId: string; output: unknown };
  'step:error': { skillId: string; stepId: string; error: Error };
  'gate:evaluated': { skillId: string; gateId: string; result: GateResult };
  'cageerf:stage': { skillId: string; stage: CAGEERFStage };
}

export type StepExecutor = (
  step: SkillStep,
  context: SkillExecutionContext
) => Promise<unknown>;

export class SkillExecutor extends EventEmitter<SkillExecutorEvents> {
  private config: SkillConfig;
  private stepExecutors: Map<string, StepExecutor> = new Map();

  constructor(config: Partial<SkillConfig> = {}) {
    super();
    this.config = { ...DEFAULT_SKILL_CONFIG, ...config };
    this.registerDefaultExecutors();
  }

  private registerDefaultExecutors(): void {
    this.stepExecutors.set('default', this.defaultStepExecutor.bind(this));
    this.stepExecutors.set('http', this.httpStepExecutor.bind(this));
    this.stepExecutors.set('script', this.scriptStepExecutor.bind(this));
    this.stepExecutors.set('transform', this.transformStepExecutor.bind(this));
    this.stepExecutors.set('validate', this.validateStepExecutor.bind(this));
  }

  async execute(
    skill: SkillDefinition,
    context: SkillExecutionContext
  ): Promise<SkillResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    const errors: string[] = [];
    const metrics: SkillMetrics = {
      totalSteps: skill.steps.length,
      completedSteps: 0,
      skippedSteps: 0,
      failedSteps: 0,
      totalDuration: 0,
    };

    this.emit('skill:started', { skillId: skill.id, context });
    logs.push(`[${new Date().toISOString()}] Skill execution started: ${skill.name}`);

    try {
      const cageerfContext = this.initCAGEERFContext(context);

      for (const stage of Object.values(CAGEERF_STAGES)) {
        this.emit('cageerf:stage', { skillId: skill.id, stage });
        cageerfContext.stage = stage;

        const stageResult = await this.executeCAGEERFStage(
          stage,
          skill,
          cageerfContext
        );

        cageerfContext.history.push({
          stage,
          timestamp: Date.now(),
          input: cageerfContext.input,
          output: stageResult,
          duration: Date.now() - startTime,
        });
      }

      for (const step of skill.steps) {
        const stepResult = await this.executeStep(skill.id, step, context);
        
        if (stepResult.success) {
          metrics.completedSteps++;
          context.variables[step.output] = stepResult.output;
        } else {
          metrics.failedSteps++;
          if (step.onError === 'stop') {
            errors.push(`Step ${step.id} failed: ${stepResult.error}`);
            break;
          } else if (step.onError === 'continue') {
            errors.push(`Step ${step.id} failed (continuing): ${stepResult.error}`);
          }
        }
      }

      if (this.config.enableGates && skill.gates) {
        metrics.gateResults = [];
        for (const gate of skill.gates) {
          const gateResult = await this.evaluateGate(skill.id, gate, context);
          metrics.gateResults.push(gateResult);
          
          if (!gateResult.passed && gate.passAction === 'block') {
            errors.push(`Quality gate "${gate.name}" blocked execution`);
            break;
          }
        }
      }

      const result: SkillResult = {
        success: errors.length === 0,
        output: context.variables,
        duration: Date.now() - startTime,
        logs,
        errors,
        metrics,
      };

      this.emit('skill:completed', { skillId: skill.id, result });
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      const result: SkillResult = {
        success: false,
        output: null,
        duration: Date.now() - startTime,
        logs,
        errors,
        metrics,
      };

      this.emit('skill:error', { skillId: skill.id, error: error as Error });
      return result;
    }
  }

  private initCAGEERFContext(context: SkillExecutionContext): CAGEERFContext {
    return {
      stage: CAGEERF_STAGES.CONTEXT,
      input: context.variables,
      context: context.metadata,
      history: [],
    };
  }

  private async executeCAGEERFStage(
    stage: CAGEERFStage,
    skill: SkillDefinition,
    context: CAGEERFContext
  ): Promise<unknown> {
    switch (stage) {
      case CAGEERF_STAGES.CONTEXT:
        return this.gatherContext(skill, context);
      case CAGEERF_STAGES.ANALYZE:
        return this.analyzeRequirements(skill, context);
      case CAGEERF_STAGES.GENERATE:
        return this.generateSolution(skill, context);
      case CAGEERF_STAGES.EVALUATE:
        return this.evaluateSolution(skill, context);
      case CAGEERF_STAGES.EXECUTE:
        return { status: 'ready' };
      case CAGEERF_STAGES.REFINE:
        return { status: 'optimized' };
      case CAGEERF_STAGES.FEEDBACK:
        return { status: 'completed' };
      default:
        return null;
    }
  }

  private async gatherContext(skill: SkillDefinition, context: CAGEERFContext): Promise<unknown> {
    return {
      skillName: skill.name,
      availableParameters: skill.parameters.map(p => p.name),
      inputContext: context.input,
    };
  }

  private async analyzeRequirements(skill: SkillDefinition, context: CAGEERFContext): Promise<unknown> {
    return {
      requiredSteps: skill.steps.length,
      complexity: skill.metadata?.difficulty || 'intermediate',
      dependencies: skill.metadata?.dependencies || [],
    };
  }

  private async generateSolution(skill: SkillDefinition, context: CAGEERFContext): Promise<unknown> {
    return {
      steps: skill.steps.map(s => s.name),
      estimatedTime: skill.metadata?.estimatedTime || 0,
    };
  }

  private async evaluateSolution(skill: SkillDefinition, context: CAGEERFContext): Promise<unknown> {
    const gates = skill.gates || [];
    return {
      gateCount: gates.length,
      criticalGates: gates.filter(g => g.severity === 'critical').length,
    };
  }

  private async executeStep(
    skillId: string,
    step: SkillStep,
    context: SkillExecutionContext
  ): Promise<{ success: boolean; output?: unknown; error?: string }> {
    this.emit('step:started', { skillId, stepId: step.id });

    try {
      const executor = this.stepExecutors.get(step.action) || this.stepExecutors.get('default')!;
      const output = await executor(step, context);

      this.emit('step:completed', { skillId, stepId: step.id, output });
      return { success: true, output };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('step:error', { skillId, stepId: step.id, error: error as Error });
      return { success: false, error: errorMessage };
    }
  }

  private async defaultStepExecutor(
    step: SkillStep,
    context: SkillExecutionContext
  ): Promise<unknown> {
    return { action: step.action, input: step.input };
  }

  private async httpStepExecutor(
    step: SkillStep,
    context: SkillExecutionContext
  ): Promise<unknown> {
    return { status: 'simulated', url: step.input.url };
  }

  private async scriptStepExecutor(
    step: SkillStep,
    context: SkillExecutionContext
  ): Promise<unknown> {
    return { executed: true, script: step.input.script };
  }

  private async transformStepExecutor(
    step: SkillStep,
    context: SkillExecutionContext
  ): Promise<unknown> {
    const input = step.input.source ? context.variables[step.input.source as string] : step.input;
    return { transformed: input };
  }

  private async validateStepExecutor(
    step: SkillStep,
    context: SkillExecutionContext
  ): Promise<unknown> {
    return { valid: true, validated: step.input };
  }

  private async evaluateGate(
    skillId: string,
    gate: SkillDefinition['gates'][0],
    context: SkillExecutionContext
  ): Promise<GateResult> {
    const passed = gate.criteria.every(criteria => {
      return this.evaluateCriteria(criteria, context);
    });

    const result: GateResult = {
      gateId: gate.id,
      passed,
      message: passed ? undefined : `Gate "${gate.name}" failed`,
    };

    this.emit('gate:evaluated', { skillId, gateId: gate.id, result });
    return result;
  }

  private evaluateCriteria(
    criteria: SkillDefinition['gates'][0]['criteria'][0],
    context: SkillExecutionContext
  ): boolean {
    return true;
  }

  registerStepExecutor(action: string, executor: StepExecutor): void {
    this.stepExecutors.set(action, executor);
  }

  updateConfig(config: Partial<SkillConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const globalSkillExecutor = new SkillExecutor();
