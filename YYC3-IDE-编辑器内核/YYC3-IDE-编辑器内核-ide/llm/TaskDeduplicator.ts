/**
 * @file: llm/TaskDeduplicator.ts
 * @description: 任务去重与合并系统
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: llm,task-extraction,deduplication
 */

import {
  ExtractedTask,
  DeduplicationResult,
  DeduplicationReport,
  DeduplicationDetail,
  MergedTask,
  TaskPriority,
  TaskType,
} from './TaskTypes';

/**
 * 去重配置
 */
export interface DeduplicationConfig {
  similarityThreshold: number;  // 相似度阈值
  mergeThreshold: number;        // 合并阈值
  enableSemanticSimilarity: boolean;
  preserveHistory: boolean;
}

/**
 * 默认去重配置
 */
const DEFAULT_DEDUPLICATION_CONFIG: DeduplicationConfig = {
  similarityThreshold: 0.85,
  mergeThreshold: 0.7,
  enableSemanticSimilarity: true,
  preserveHistory: true,
};

/**
 * 任务去重器
 * 检测重复任务、合并相似任务
 */
export class TaskDeduplicator {
  private config: DeduplicationConfig;
  private taskHistory: Map<string, ExtractedTask[]> = new Map();

  constructor(config: Partial<DeduplicationConfig> = {}) {
    this.config = { ...DEFAULT_DEDUPLICATION_CONFIG, ...config };
  }

  /**
   * 去重处理
   */
  deduplicate(tasks: ExtractedTask[]): DeduplicationResult {
    const duplicates: ExtractedTask[] = [];
    const unique: ExtractedTask[] = [];
    const merged: MergedTask[] = [];
    const details: DeduplicationDetail[] = [];

    // 按相似度分组
    const groups = this.groupSimilarTasks(tasks);

    for (const group of groups) {
      if (group.length === 1) {
        // 唯一任务
        unique.push(group[0]);
        details.push({
          taskId: group[0].id,
          similarity: 1.0,
          action: 'kept',
        });
      } else {
        // 多个相似任务
        const bestTask = this.selectBestTask(group);
        const otherTasks = group.filter(t => t.id !== bestTask.id);

        // 检查是否应该合并
        const avgSimilarity = this.calculateAverageSimilarity(group);

        if (avgSimilarity >= this.config.mergeThreshold) {
          // 合并任务
          const mergedTask = this.mergeTasks(group);
          merged.push(mergedTask);
          unique.push(mergedTask.task);

          details.push({
            taskId: bestTask.id,
            similarity: avgSimilarity,
            action: 'merged',
          });

          for (const task of otherTasks) {
            details.push({
              taskId: task.id,
              duplicateOf: bestTask.id,
              similarity: avgSimilarity,
              action: 'merged',
            });
          }
        } else {
          // 保留最佳任务，标记其他为重复
          unique.push(bestTask);
          duplicates.push(...otherTasks);

          details.push({
            taskId: bestTask.id,
            similarity: avgSimilarity,
            action: 'kept',
          });

          for (const task of otherTasks) {
            details.push({
              taskId: task.id,
              duplicateOf: bestTask.id,
              similarity: avgSimilarity,
              action: 'removed',
            });
          }
        }
      }
    }

    // 保存历史
    if (this.config.preserveHistory) {
      this.saveHistory(tasks);
    }

    const report: DeduplicationReport = {
      totalTasks: tasks.length,
      duplicatesFound: duplicates.length,
      mergedTasks: merged.length,
      uniqueTasks: unique.length,
      details,
    };

    return {
      original: tasks,
      duplicates,
      unique,
      merged,
      report,
    };
  }

  /**
   * 分组相似任务
   */
  private groupSimilarTasks(tasks: ExtractedTask[]): ExtractedTask[][] {
    const groups: ExtractedTask[][] = [];
    const assigned = new Set<string>();

    for (let i = 0; i < tasks.length; i++) {
      if (assigned.has(tasks[i].id)) continue;

      const group: ExtractedTask[] = [tasks[i]];
      assigned.add(tasks[i].id);

      for (let j = i + 1; j < tasks.length; j++) {
        if (assigned.has(tasks[j].id)) continue;

        const similarity = this.calculateSimilarity(tasks[i], tasks[j]);
        if (similarity >= this.config.similarityThreshold) {
          group.push(tasks[j]);
          assigned.add(tasks[j].id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * 计算两个任务的相似度
   */
  private calculateSimilarity(task1: ExtractedTask, task2: ExtractedTask): number {
    // 标题相似度（权重0.5）
    const titleSimilarity = this.calculateTextSimilarity(task1.title, task2.title);

    // 类型相似度（权重0.2）
    const typeSimilarity = task1.type === task2.type ? 1.0 : 0.0;

    // 优先级相似度（权重0.15）
    const prioritySimilarity = task1.priority === task2.priority ? 1.0 : 0.5;

    // 标签相似度（权重0.15）
    const tagSimilarity = this.calculateTagSimilarity(task1.tags, task2.tags);

    // 加权平均
    const totalSimilarity =
      titleSimilarity * 0.5 +
      typeSimilarity * 0.2 +
      prioritySimilarity * 0.15 +
      tagSimilarity * 0.15;

    return totalSimilarity;
  }

  /**
   * 计算文本相似度（使用Levenshtein距离）
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const s1 = text1.toLowerCase().trim();
    const s2 = text2.toLowerCase().trim();

    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    // 简化的相似度计算（基于Jaccard相似度）
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * 计算标签相似度
   */
  private calculateTagSimilarity(tags1: string[], tags2: string[]): number {
    if (tags1.length === 0 && tags2.length === 0) return 1.0;
    if (tags1.length === 0 || tags2.length === 0) return 0.0;

    const set1 = new Set(tags1.map(t => t.toLowerCase()));
    const set2 = new Set(tags2.map(t => t.toLowerCase()));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * 选择最佳任务
   */
  private selectBestTask(tasks: ExtractedTask[]): ExtractedTask {
    // 优先选择置信度最高的任务
    return tasks.reduce((best, current) => {
      if (current.confidence > best.confidence) return current;
      if (current.confidence === best.confidence) {
        // 置信度相同，选择优先级更高的
        const priorityOrder = {
          [TaskPriority.CRITICAL]: 4,
          [TaskPriority.HIGH]: 3,
          [TaskPriority.MEDIUM]: 2,
          [TaskPriority.LOW]: 1,
        };
        return priorityOrder[current.priority] > priorityOrder[best.priority]
          ? current
          : best;
      }
      return best;
    });
  }

  /**
   * 合并多个任务
   */
  private mergeTasks(tasks: ExtractedTask[]): MergedTask {
    const bestTask = this.selectBestTask(tasks);
    const sources = tasks.map(t => t.id);

    // 合并描述
    const descriptions = tasks
      .map(t => t.description)
      .filter((d): d is string => d !== undefined && d.trim().length > 0);

    const mergedDescription = descriptions.length > 0
      ? descriptions.join('\n\n')
      : bestTask.description;

    // 合并标签
    const allTags = tasks.flatMap(t => t.tags);
    const uniqueTags = [...new Set(allTags)];

    // 合并元数据
    const mergedMetadata = tasks.reduce((acc, t) => ({
      ...acc,
      ...t.metadata,
    }), {});

    // 计算平均置信度
    const avgConfidence = tasks.reduce((sum, t) => sum + t.confidence, 0) / tasks.length;

    const mergedTask: ExtractedTask = {
      ...bestTask,
      description: mergedDescription,
      tags: uniqueTags,
      metadata: mergedMetadata,
      confidence: avgConfidence,
    };

    return {
      task: mergedTask,
      sources,
      mergeScore: this.calculateAverageSimilarity(tasks),
    };
  }

  /**
   * 计算平均相似度
   */
  private calculateAverageSimilarity(tasks: ExtractedTask[]): number {
    if (tasks.length <= 1) return 1.0;

    let totalSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        totalSimilarity += this.calculateSimilarity(tasks[i], tasks[j]);
        pairCount++;
      }
    }

    return pairCount > 0 ? totalSimilarity / pairCount : 1.0;
  }

  /**
   * 保存历史
   */
  private saveHistory(tasks: ExtractedTask[]): void {
    const _timestamp = Date.now();
    for (const task of tasks) {
      const existing = this.taskHistory.get(task.id) || [];
      existing.push(task);
      this.taskHistory.set(task.id, existing);
    }

    // 清理过期历史（保留最近1000条）
    if (this.taskHistory.size > 1000) {
      const entries = Array.from(this.taskHistory.entries());
      entries.splice(0, entries.length - 1000);
      this.taskHistory = new Map(entries);
    }
  }

  /**
   * 获取任务历史
   */
  getTaskHistory(taskId: string): ExtractedTask[] | undefined {
    return this.taskHistory.get(taskId);
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    this.taskHistory.clear();
  }

  /**
   * 生成去重报告
   */
  generateReport(result: DeduplicationResult): string {
    const lines: string[] = [
      '# 任务去重报告',
      '',
      `## 总体统计`,
      `- 原始任务数: ${result.original.length}`,
      `- 唯一任务数: ${result.unique.length}`,
      `- 重复任务数: ${result.duplicates.length}`,
      `- 合并任务数: ${result.merged.length}`,
      '',
      `## 详细信息`,
      '',
    ];

    // 显示合并的任务
    if (result.merged.length > 0) {
      lines.push('### 合并的任务');
      for (const merged of result.merged) {
        lines.push(`- **${merged.task.title}**`);
        lines.push(`  - 合并了 ${merged.sources.length} 个任务`);
        lines.push(`  - 合并得分: ${(merged.mergeScore * 100).toFixed(1)}%`);
        lines.push(`  - 置信度: ${(merged.task.confidence * 100).toFixed(1)}%`);
        lines.push('');
      }
    }

    // 显示重复的任务
    if (result.duplicates.length > 0) {
      lines.push('### 移除的重复任务');
      for (const task of result.duplicates) {
        lines.push(`- ${task.title} (ID: ${task.id})`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
