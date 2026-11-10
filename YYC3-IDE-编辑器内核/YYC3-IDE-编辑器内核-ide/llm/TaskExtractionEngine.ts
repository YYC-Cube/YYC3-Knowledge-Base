// @ts-nocheck
/**
 * @file: llm/TaskExtractionEngine.ts
 * @description: 任务提取引擎 — 整合识别、结构化、去重功能
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: llm,task-extraction,engine
 */

import {
  ExtractedTask,
  TaskExtractionResult,
  TaskExtractorConfig,
  DEFAULT_TASK_EXTRACTOR_CONFIG,
} from './TaskTypes';
import { TaskRecognizer } from './TaskRecognizer';
import { TaskStructurer } from './TaskStructurer';
import { TaskDeduplicator } from './TaskDeduplicator';

/**
 * 任务提取引擎
 * 整合识别、结构化、去重功能
 */
export class TaskExtractionEngine {
  private config: TaskExtractorConfig;
  private recognizer: TaskRecognizer;
  private structurer: TaskStructurer;
  private deduplicator: TaskDeduplicator;

  constructor(config: Partial<TaskExtractorConfig> = {}) {
    this.config = { ...DEFAULT_TASK_EXTRACTOR_CONFIG, ...config };
    this.recognizer = new TaskRecognizer();
    this.structurer = new TaskStructurer();
    this.deduplicator = new TaskDeduplicator();
  }

  /**
   * 从文本中提取任务
   */
  extract(text: string, source?: string): TaskExtractionResult {
    const startTime = Date.now();
    const lines = text.split('\n');

    // 1. 识别任务
    let tasks = this.recognizer.recognize(text);

    // 2. 结构化任务
    tasks = this.structurer.batchStructure(tasks);

    // 3. 过滤低置信度任务
    tasks = tasks.filter(task => task.confidence >= this.config.minConfidence);

    // 4. 限制任务数量
    if (tasks.length > this.config.maxTasks) {
      tasks = tasks
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, this.config.maxTasks);
    }

    // 5. 去重
    if (this.config.enableDeduplication) {
      const deduplicationResult = this.deduplicator.deduplicate(tasks);
      tasks = deduplicationResult.unique;
    }

    const _processingTime = Date.now() - startTime;

    const result: TaskExtractionResult = {
      tasks,
      format: this.detectMainFormat(tasks),
      confidence: this.calculateOverallConfidence(tasks),
      source: source || 'unknown',
      timestamp: Date.now(),
      metadata: {
        totalLines: lines.length,
        processedLines: lines.length,
        ignoredLines: lines.length - tasks.length,
        deduplicationCount: this.config.enableDeduplication ? 1 : 0,
      },
    };

    return result;
  }

  /**
   * 检测主要格式
   */
  private detectMainFormat(tasks: ExtractedTask[]): any {
    if (tasks.length === 0) {
      return 'unknown';
    }

    const formatCounts = tasks.reduce((acc, task) => {
      acc[task.format] = (acc[task.format] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sorted = Object.entries(formatCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0][0];
  }

  /**
   * 计算整体置信度
   */
  private calculateOverallConfidence(tasks: ExtractedTask[]): number {
    if (tasks.length === 0) return 0;

    const totalConfidence = tasks.reduce((sum, task) => sum + task.confidence, 0);
    return totalConfidence / tasks.length;
  }

  /**
   * 批量提取任务
   */
  batchExtract(texts: string[], sources?: string[]): TaskExtractionResult[] {
    return texts.map((text, index) => {
      const source = sources?.[index] || `batch-${index}`;
      return this.extract(text, source);
    });
  }

  /**
   * 从AI响应中提取任务
   */
  extractFromAIResponse(
    response: string,
    userPrompt?: string,
    messageId?: string
  ): TaskExtractionResult {
    const source = `ai-response-${messageId || Date.now()}`;
    const result = this.extract(response, source);

    // 添加AI响应特有的元数据
    result.metadata = {
      ...result.metadata,
      userPrompt: userPrompt?.slice(0, 200),
      messageId,
      responseType: 'ai',
    };

    // 为任务添加AI响应上下文
    result.tasks = result.tasks.map(task => ({
      ...task,
      context: userPrompt ? `用户提问: ${userPrompt.slice(0, 100)}\n\n${task.context || ''}` : task.context,
      metadata: {
        ...task.metadata,
        extractedFrom: 'ai-response',
        messageId,
      },
    }));

    return result;
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    supportedFormats: string[];
    config: TaskExtractorConfig;
  } {
    return {
      supportedFormats: this.recognizer.getSupportedFormats(),
      config: this.config,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<TaskExtractorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 生成提取报告
   */
  generateReport(result: TaskExtractionResult): string {
    const lines: string[] = [
      '# 任务提取报告',
      '',
      '## 总体统计',
      `- 提取任务数: ${result.tasks.length}`,
      `- 主要格式: ${result.format}`,
      `- 平均置信度: ${(result.confidence * 100).toFixed(1)}%`,
      `- 来源: ${result.source}`,
      `- 提取时间: ${new Date(result.timestamp).toLocaleString()}`,
      '',
      '## 任务列表',
      '',
    ];

    // 按优先级分组
    const byPriority = this.groupByPriority(result.tasks);

    for (const [priority, tasks] of Object.entries(byPriority)) {
      lines.push(`### ${priority.toUpperCase()} (${tasks.length})`);

      for (const task of tasks) {
        lines.push(`- **${task.title}**`);
        lines.push(`  - 类型: ${task.type}`);
        lines.push(`  - 置信度: ${(task.confidence * 100).toFixed(1)}%`);
        lines.push(`  - 格式: ${task.format}`);
        if (task.description) {
          lines.push(`  - 描述: ${task.description.slice(0, 100)}`);
        }
        if (task.tags.length > 0) {
          lines.push(`  - 标签: ${task.tags.join(', ')}`);
        }
        lines.push('');
      }
    }

    // 添加元数据
    if (result.metadata) {
      lines.push('## 元数据');
      for (const [key, value] of Object.entries(result.metadata)) {
        lines.push(`- ${key}: ${value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 按优先级分组
   */
  private groupByPriority(
    tasks: ExtractedTask[]
  ): Record<string, ExtractedTask[]> {
    return tasks.reduce((acc, task) => {
      const priority = task.priority;
      if (!acc[priority]) {
        acc[priority] = [];
      }
      acc[priority].push(task);
      return acc;
    }, {} as Record<string, ExtractedTask[]>);
  }

  /**
   * 验证提取结果
   */
  validate(result: TaskExtractionResult): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证任务数量
    if (result.tasks.length === 0) {
      warnings.push('没有提取到任何任务');
    } else if (result.tasks.length > this.config.maxTasks) {
      warnings.push(`任务数量超过限制 (${result.tasks.length} > ${this.config.maxTasks})`);
    }

    // 验证每个任务
    for (const task of result.tasks) {
      const validation = this.structurer.validate(task);
      errors.push(...validation.errors);
    }

    // 验证置信度
    if (result.confidence < this.config.minConfidence) {
      warnings.push(`整体置信度低于阈值 (${(result.confidence * 100).toFixed(1)}% < ${(this.config.minConfidence * 100).toFixed(1)}%)`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
