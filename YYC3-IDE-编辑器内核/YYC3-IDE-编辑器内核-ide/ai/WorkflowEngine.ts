/**
 * @file: ai/WorkflowEngine.ts
 * @description: Skills 驱动的 AI Family 工作流引擎
 *               对齐 A2A/MCP 协议思想 — Agent 编排 + Skills 链式执行 + 快照回滚
 *               替代原有 AIAgentWorkflow.ts 的硬编码 Mock 引擎
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-06-03
 * @updated: 2026-06-03
 * @status: dev
 * @license: MIT
 */

import { logger } from '../services/Logger';

// ── Types ──

export type WorkflowStatus = 'draft' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface WorkflowSkillStep {
  id: string;
  skillId: string;
  agentId: string;
  agentName: string;
  description: string;
  tool: string;
  input: string;
  status: StepStatus;
  output?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  /** 依赖的前置步骤 ID */
  dependsOn: string[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  goal: string;
  /** 编排 Agent (通常是天枢) */
  orchestratorAgent: string;
  /** 工作流步骤 */
  steps: WorkflowSkillStep[];
  status: WorkflowStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  /** 快照 ID (用于回滚) */
  snapshotId?: string;
  /** 执行模式 */
  mode: 'auto' | 'interactive' | 'mixed';
}

export type WorkflowEventType =
  | 'workflow:started'
  | 'workflow:completed'
  | 'workflow:failed'
  | 'workflow:cancelled'
  | 'step:started'
  | 'step:completed'
  | 'step:failed'
  | 'step:skipped';

export interface WorkflowEvent {
  type: WorkflowEventType;
  workflowId: string;
  timestamp: number;
  data?: any;
}

export type WorkflowEventHandler = (event: WorkflowEvent) => void;

// ── Workflow Engine ──

export class WorkflowEngine {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private listeners: Set<WorkflowEventHandler> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();

  // ── 工作流 CRUD ──

  createWorkflow(
    name: string,
    goal: string,
    steps: Omit<WorkflowSkillStep, 'id' | 'status' | 'startedAt' | 'completedAt'>[],
    options?: {
      orchestratorAgent?: string;
      mode?: WorkflowDefinition['mode'];
    },
  ): WorkflowDefinition {
    const id = `wf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const workflow: WorkflowDefinition = {
      id,
      name,
      goal,
      orchestratorAgent: options?.orchestratorAgent || 'tianshu',
      steps: steps.map((s, i) => ({
        ...s,
        id: `step-${i + 1}-${id.slice(0, 8)}`,
        status: 'pending' as StepStatus,
      })),
      status: 'draft',
      createdAt: Date.now(),
      mode: options?.mode || 'mixed',
    };

    this.workflows.set(id, workflow);
    logger.info(`[WorkflowEngine] Created: "${name}" (${steps.length} steps)`);
    return workflow;
  }

  // ── 事件系统 ──

  onEvent(handler: WorkflowEventHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  private emit(event: WorkflowEvent): void {
    this.listeners.forEach(h => {
      try { h(event); } catch { /* ignore listener errors */ }
    });
  }

  // ── 工作流执行 ──

  async executeWorkflow(
    workflowId: string,
    executors?: Partial<Record<string, (input: string) => Promise<string>>>,
  ): Promise<WorkflowDefinition> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

    if (workflow.status === 'running') {
      throw new Error(`Workflow "${workflow.name}" is already running`);
    }

    const controller = new AbortController();
    this.abortControllers.set(workflowId, controller);

    workflow.status = 'running';
    workflow.startedAt = Date.now();
    this.emit({ type: 'workflow:started', workflowId, timestamp: Date.now() });

    logger.info(
      `[WorkflowEngine] Starting: "${workflow.name}" ` +
      `(${workflow.steps.length} steps, mode: ${workflow.mode})`
    );

    try {
      await this.executeSteps(workflow, controller.signal, executors);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        workflow.status = 'cancelled';
        this.emit({ type: 'workflow:cancelled', workflowId, timestamp: Date.now() });
        logger.warn(`[WorkflowEngine] Cancelled: "${workflow.name}"`);
      } else {
        workflow.status = 'failed';
        this.emit({ type: 'workflow:failed', workflowId, timestamp: Date.now(), data: error });
        logger.error(`[WorkflowEngine] Failed: "${workflow.name}"`, error);
      }
      return workflow;
    }

    // 检查是否全部完成
    const allDone = workflow.steps.every(s => s.status === 'completed' || s.status === 'skipped');
    if (allDone) {
      workflow.status = 'completed';
      workflow.completedAt = Date.now();
      this.emit({ type: 'workflow:completed', workflowId, timestamp: Date.now() });
      logger.info(`[WorkflowEngine] Completed: "${workflow.name}"`);
    }

    this.abortControllers.delete(workflowId);
    return workflow;
  }

  /**
   * 执行步骤 — 支持依赖拓扑排序的并行执行
   */
  private async executeSteps(
    workflow: WorkflowDefinition,
    signal: AbortSignal,
    executors?: Partial<Record<string, (input: string) => Promise<string>>>,
  ): Promise<void> {
    const completed = new Set<string>();

    while (completed.size < workflow.steps.length) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

      // 找到所有依赖已满足的待执行步骤
      const ready = workflow.steps.filter(s => {
        if (s.status !== 'pending') return false;
        return s.dependsOn.every(depId => completed.has(depId));
      });

      if (ready.length === 0) {
        // 检查是否有步骤失败导致死锁
        const failed = workflow.steps.filter(s => s.status === 'failed');
        if (failed.length > 0) {
          // 跳过依赖失败步骤的后续步骤
          for (const step of workflow.steps) {
            if (step.status === 'pending' &&
              step.dependsOn.some(depId => failed.some(f => f.id === depId))) {
              step.status = 'skipped';
            }
          }
        }
        break;
      }

      // 并行执行所有就绪步骤
      await Promise.all(
        ready.map(step => this.executeStep(step, workflow, signal, executors))
      );

      // 标记完成
      for (const step of ready) {
        if (step.status === 'completed' || step.status === 'skipped') {
          completed.add(step.id);
        }
      }

      // 交互模式：关键步骤后暂停
      if (workflow.mode === 'interactive') {
        break;
      }
    }
  }

  private async executeStep(
    step: WorkflowSkillStep,
    workflow: WorkflowDefinition,
    signal: AbortSignal,
    executors?: Partial<Record<string, (input: string) => Promise<string>>>,
  ): Promise<void> {
    step.status = 'running';
    step.startedAt = Date.now();
    this.emit({
      type: 'step:started',
      workflowId: workflow.id,
      timestamp: Date.now(),
      data: { stepId: step.id, skillId: step.skillId, agentId: step.agentId },
    });

    try {
      // 检查是否被取消
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

      // 执行：优先使用注入的 executor，否则使用默认模拟
      const executor = executors?.[step.tool];
      let output: string;

      if (executor) {
        output = await executor(step.input);
      } else {
        // 模拟执行 (实际使用时替换为真实 MCP Tool 调用)
        output = await this.mockExecute(step);
      }

      step.output = output;
      step.status = 'completed';
      step.completedAt = Date.now();
      this.emit({
        type: 'step:completed',
        workflowId: workflow.id,
        timestamp: Date.now(),
        data: { stepId: step.id, output: output.slice(0, 200) },
      });
    } catch (error: any) {
      step.status = 'failed';
      step.error = error.message;
      this.emit({
        type: 'step:failed',
        workflowId: workflow.id,
        timestamp: Date.now(),
        data: { stepId: step.id, error: error.message },
      });
      throw error;
    }
  }

  /**
   * 模拟工具执行 (占位 — 实际使用时接入 MCP Client 或真实工具)
   */
  private async mockExecute(step: WorkflowSkillStep): Promise<string> {
    await new Promise(r => setTimeout(r, 300)); // 模拟延迟

    switch (step.tool) {
      case 'read_file': return `[读取文件] ${step.input}\n---\n(文件内容)`;
      case 'write_file': return `[写入文件] ${step.input}`;
      case 'search_code': return `[搜索代码] 找到 3 处匹配`;
      case 'run_terminal': return `[终端] $ ${step.input}\n(命令输出)`;
      case 'security_scan': return `[安全扫描] 0 高危漏洞, 2 低危警告`;
      case 'generate_test': return `[测试生成] 已生成测试文件`;
      case 'code_review': return `[代码审查] 质量评分: 85/100`;
      case 'analyze_deps': return `[依赖分析] ${step.input} — 12个直接依赖`;
      case 'list_files': return `[文件列表] src/ (48个文件)`;
      case 'run_lint': return `[Lint] 0 errors, 3 warnings`;
      case 'check_types': return `[类型检查] 通过`;
      default: return `[${step.tool}] 执行完成`;
    }
  }

  // ── 工作流控制 ──

  cancelWorkflow(workflowId: string): void {
    const controller = this.abortControllers.get(workflowId);
    if (controller) {
      controller.abort();
    }
  }

  pauseWorkflow(workflowId: string): void {
    const workflow = this.workflows.get(workflowId);
    if (workflow && workflow.status === 'running') {
      workflow.status = 'paused';
    }
  }

  resumeWorkflow(
    workflowId: string,
    executors?: Partial<Record<string, (input: string) => Promise<string>>>,
  ): Promise<WorkflowDefinition> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);
    if (workflow.status !== 'paused') throw new Error('Workflow is not paused');
    return this.executeWorkflow(workflowId, executors);
  }

  // ── 查询 ──

  getWorkflow(id: string): WorkflowDefinition | undefined {
    return this.workflows.get(id);
  }

  listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values())
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getWorkflowProgress(id: string): { total: number; completed: number; failed: number; skipped: number } {
    const wf = this.workflows.get(id);
    if (!wf) return { total: 0, completed: 0, failed: 0, skipped: 0 };
    return {
      total: wf.steps.length,
      completed: wf.steps.filter(s => s.status === 'completed').length,
      failed: wf.steps.filter(s => s.status === 'failed').length,
      skipped: wf.steps.filter(s => s.status === 'skipped').length,
    };
  }

  // ── 清理 ──

  deleteWorkflow(id: string): void {
    this.cancelWorkflow(id);
    this.workflows.delete(id);
  }

  clearCompleted(): number {
    let count = 0;
    for (const [id, wf] of this.workflows.entries()) {
      if (wf.status === 'completed' || wf.status === 'failed' || wf.status === 'cancelled') {
        this.workflows.delete(id);
        count++;
      }
    }
    return count;
  }

  // ── 导出/导入 ──

  exportWorkflows(): string {
    return JSON.stringify(this.listWorkflows(), null, 2);
  }

  importWorkflows(json: string): number {
    try {
      const workflows = JSON.parse(json) as WorkflowDefinition[];
      let count = 0;
      for (const wf of workflows) {
        this.workflows.set(wf.id, wf);
        count++;
      }
      return count;
    } catch (error) {
      logger.error('[WorkflowEngine] Import failed:', error);
      return 0;
    }
  }
}

// ── 单例 ──

export const workflowEngine = new WorkflowEngine();
export default WorkflowEngine;
