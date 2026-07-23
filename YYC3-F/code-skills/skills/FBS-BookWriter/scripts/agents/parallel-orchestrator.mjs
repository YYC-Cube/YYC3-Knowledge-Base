#!/usr/bin/env node
/**
 * 并行编排器
 * 
 * 职责:
 * - 多章节并行编排
 * - 智能体资源调度
 * - 并发度控制
 * - 进度跟踪
 */

import { getEventBus } from './event-bus.mjs';
import { ConcurrencyController } from './concurrency-controller.mjs';
import { ResearchAgent } from './research-agent.mjs';
import { WritingAgent } from './writing-agent.mjs';
import { ReviewAgent } from './review-agent.mjs';
import { ValidationAgent } from './validation-agent.mjs';
import { AuditAgent } from './audit-agent.mjs';
import { DeployAgent } from './deploy-agent.mjs';

export class ParallelOrchestrator {
  constructor(options = {}) {
    this.options = {
      maxConcurrency: options.maxConcurrency || 3,
      bookRoot: options.bookRoot || null,
      ...options
    };
    
    this.eventBus = getEventBus();
    this.concurrencyController = new ConcurrencyController({
      maxConcurrency: this.options.maxConcurrency
    });
    
    this.agents = {};
    this.activeWorkflows = new Map();
    this.workflowResults = new Map();
    
    this._initializeAgents();
    this._setupEventHandlers();
  }

  /**
   * 启动并行工作流
   * @param {array} chapters - 章节列表
   * @returns {Promise<object>} - 工作流结果
   */
  async startParallelWorkflow(chapters) {
    console.log(`[ParallelOrchestrator] Starting parallel workflow for ${chapters.length} chapters`);
    
    const workflowId = `workflow-${Date.now()}`;
    const startTime = Date.now();
    
    // 创建工作流上下文
    const workflowContext = {
      workflowId,
      chapters: chapters.map(ch => ({
        chapterId: ch.chapterId,
        bookRoot: ch.bookRoot || this.options.bookRoot,
        topic: ch.topic,
        reader: ch.reader,
        genre: ch.genre,
        status: 'pending',
        currentState: null,
        startTime: null,
        endTime: null,
        error: null
      })),
      startTime,
      status: 'running',
      progress: 0
    };
    
    this.activeWorkflows.set(workflowId, workflowContext);
    
    // 并行处理所有章节
    const chapterPromises = chapters.map(chapter => 
      this._processChapter(workflowId, chapter)
    );
    
    try {
      const results = await Promise.allSettled(chapterPromises);
      
      // 更新工作流状态
      workflowContext.status = results.every(r => r.status === 'fulfilled') ? 'completed' : 'partial';
      workflowContext.endTime = Date.now();
      workflowContext.duration = workflowContext.endTime - workflowContext.startTime;
      workflowContext.progress = 100;
      
      // 汇总结果
      const workflowResult = this._aggregateResults(workflowContext, results);
      this.workflowResults.set(workflowId, workflowResult);
      
      // 发布工作流完成事件
      this.publishEvent('parallel.workflow.completed', {
        workflowId,
        workflowResult
      });
      
      console.log(`[ParallelOrchestrator] Parallel workflow completed: ${workflowId}`);
      
      return workflowResult;
      
    } catch (error) {
      workflowContext.status = 'failed';
      workflowContext.error = error.message;
      workflowContext.endTime = Date.now();
      
      throw error;
    }
  }

  /**
   * 获取工作流状态
   * @param {string} workflowId - 工作流ID
   * @returns {object} - 工作流状态
   */
  getWorkflowStatus(workflowId) {
    return this.activeWorkflows.get(workflowId);
  }

  /**
   * 停止工作流
   * @param {string} workflowId - 工作流ID
   */
  stopWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    workflow.status = 'stopped';
    workflow.endTime = Date.now();
    
    console.log(`[ParallelOrchestrator] Workflow stopped: ${workflowId}`);
  }

  /**
   * 获取所有工作流
   * @returns {array} - 工作流列表
   */
  getAllWorkflows() {
    return Array.from(this.activeWorkflows.values());
  }

  // ========== 私有方法 ==========

  /**
   * 初始化智能体
   */
  _initializeAgents() {
    this.agents = {
      research: new ResearchAgent({ eventBus: this.eventBus }),
      writing: new WritingAgent({ eventBus: this.eventBus }),
      review: new ReviewAgent({ eventBus: this.eventBus }),
      validation: new ValidationAgent({ eventBus: this.eventBus }),
      audit: new AuditAgent({ eventBus: this.eventBus }),
      deploy: new DeployAgent({ eventBus: this.eventBus })
    };
    
    // 启动所有智能体
    Object.values(this.agents).forEach(agent => agent.start());
    
    console.log(`[ParallelOrchestrator] Initialized ${Object.keys(this.agents).length} agents`);
  }

  /**
   * 设置事件处理器
   */
  _setupEventHandlers() {
    // 监听任务完成事件,更新进度
    this.eventBus.subscribe('task.complete', (message) => {
      this._updateProgress(message);
    });
    
    // 监听任务失败事件
    this.eventBus.subscribe('task.failure', (message) => {
      console.error(`[ParallelOrchestrator] Task failed: ${message.payload.taskId}`);
    });
  }

  /**
   * 处理单个章节
   */
  async _processChapter(workflowId, chapter) {
    const { chapterId, bookRoot, topic, reader, genre } = chapter;
    
    console.log(`[ParallelOrchestrator] Processing chapter: ${chapterId}`);
    
    // 更新章节状态
    const workflow = this.activeWorkflows.get(workflowId);
    const chapterContext = workflow.chapters.find(ch => ch.chapterId === chapterId);
    chapterContext.status = 'processing';
    chapterContext.startTime = Date.now();
    
    try {
      // S0: 简报生成
      await this._executeStage(chapterId, 'S0', async () => {
        const task = {
          taskId: `${chapterId}-S0`,
          chapterId,
          state: 'S0',
          payload: { bookRoot, topic, reader, genre }
        };
        return this.agents.research.executeTask(task);
      });
      
      // S1-S3: 章节写作
      for (const state of ['S1', 'S2', 'S3']) {
        await this._executeStage(chapterId, state, async () => {
          const task = {
            taskId: `${chapterId}-${state}`,
            chapterId,
            state,
            payload: { bookRoot }
          };
          return this.agents.writing.executeTask(task);
        });
      }
      
      // S4: 审校
      await this._executeStage(chapterId, 'S4', async () => {
        const task = {
          taskId: `${chapterId}-S4`,
          chapterId,
          state: 'S4',
          payload: { bookRoot }
        };
        return this.agents.review.executeTask(task);
      });
      
      // S5: 交付
      await this._executeStage(chapterId, 'S5', async () => {
        const task = {
          taskId: `${chapterId}-S5`,
          chapterId,
          state: 'S5',
          payload: { bookRoot }
        };
        return this.agents.deploy.executeTask(task);
      });
      
      // S6: 归档
      await this._executeStage(chapterId, 'S6', async () => {
        const task = {
          taskId: `${chapterId}-S6`,
          chapterId,
          state: 'S6',
          payload: { bookRoot }
        };
        return this.agents.deploy.executeTask(task);
      });
      
      // 更新章节状态
      chapterContext.status = 'completed';
      chapterContext.endTime = Date.now();
      chapterContext.duration = chapterContext.endTime - chapterContext.startTime;
      
      console.log(`[ParallelOrchestrator] Chapter completed: ${chapterId}`);
      
      return {
        chapterId,
        status: 'completed',
        duration: chapterContext.duration
      };
      
    } catch (error) {
      chapterContext.status = 'failed';
      chapterContext.error = error.message;
      chapterContext.endTime = Date.now();
      
      console.error(`[ParallelOrchestrator] Chapter failed: ${chapterId} - ${error.message}`);
      throw error;
    }
  }

  /**
   * 执行阶段
   */
  async _executeStage(chapterId, stage, stageFn) {
    console.log(`[ParallelOrchestrator] Executing stage ${stage} for chapter: ${chapterId}`);
    
    return this.concurrencyController.addTask(stageFn, {
      taskId: `${chapterId}-${stage}`,
      priority: 'normal'
    });
  }

  /**
   * 更新进度
   */
  _updateProgress(message) {
    // 更新工作流进度
    for (const [workflowId, workflow] of this.activeWorkflows) {
      const totalChapters = workflow.chapters.length;
      const completedChapters = workflow.chapters.filter(
        ch => ch.status === 'completed'
      ).length;
      
      workflow.progress = (completedChapters / totalChapters) * 100;
    }
    
    // 发布进度更新事件
    this.publishEvent('parallel.workflow.progress', {
      progress: this._calculateOverallProgress()
    });
  }

  /**
   * 计算总体进度
   */
  _calculateOverallProgress() {
    let totalProgress = 0;
    let workflowCount = 0;
    
    for (const workflow of this.activeWorkflows.values()) {
      totalProgress += workflow.progress;
      workflowCount++;
    }
    
    return workflowCount > 0 ? totalProgress / workflowCount : 0;
  }

  /**
   * 汇总结果
   */
  _aggregateResults(workflowContext, results) {
    const completed = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return {
      workflowId: workflowContext.workflowId,
      status: workflowContext.status,
      startTime: workflowContext.startTime,
      endTime: workflowContext.endTime,
      duration: workflowContext.duration,
      chapters: {
        total: workflowContext.chapters.length,
        completed,
        failed,
        details: workflowContext.chapters
      },
      successRate: (completed / workflowContext.chapters.length) * 100
    };
  }

  /**
   * 发布事件
   */
  publishEvent(topic, payload) {
    const message = {
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fromAgent: 'ParallelOrchestrator',
      timestamp: new Date().toISOString(),
      type: topic,
      payload
    };
    this.eventBus.publish(topic, message);
  }
}
