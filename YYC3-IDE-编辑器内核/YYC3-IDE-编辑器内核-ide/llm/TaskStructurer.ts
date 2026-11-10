/**
 * @file: llm/TaskStructurer.ts
 * @description: 任务结构化 — 解析任务的各个属性
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: llm,task-extraction,structuring
 */

import {
  ExtractedTask,
  TaskPriority,
  TaskType,
  TaskStatus,
  PRIORITY_KEYWORDS,
  TASK_TYPE_KEYWORDS,
} from './TaskTypes';

/**
 * 任务结构化选项
 */
export interface StructuringOptions {
  extractDescription?: boolean;
  extractPriority?: boolean;
  extractType?: boolean;
  extractTags?: boolean;
  extractMetadata?: boolean;
}

/**
 * 任务结构化器
 * 解析任务的各个属性
 */
export class TaskStructurer {
  private static readonly DESCRIPTION_PATTERNS = [
    // 引号描述
    /["「『]([^"」』]+)["」』]/g,
    // 括号描述
    /[（(]([^)）]+)[)）]/g,
    // 破折号描述
    /[-–—]\s*(.+?)$/gm,
  ];

  private static readonly TAG_PATTERNS = [
    // #标签
    /#(\w+)/g,
    // @标签
    /@(\w+)/g,
    // [标签]
    /\[([^\]]+)\]/g,
  ];

  private static readonly METADATA_PATTERNS = {
    time: /(\d+[h小时d天m分钟s秒]|明天|后天|下周|本周)/gi,
    url: /(https?:\/\/[^\s]+)/gi,
    email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    number: /\b(\d+)\b/g,
  };

  /**
   * 结构化任务
   */
  structure(
    task: Partial<ExtractedTask>,
    options: StructuringOptions = {}
  ): ExtractedTask {
    const {
      extractDescription = true,
      extractPriority = true,
      extractType = true,
      extractTags = true,
      extractMetadata = true,
    } = options;

    const structured = { ...task };

    // 提取描述
    if (extractDescription && !structured.description) {
      structured.description = this.extractDescription(structured.title || '');
    }

    // 提取优先级
    if (extractPriority && !structured.priority) {
      structured.priority = this.extractPriority(structured.title || '');
    }

    // 提取类型
    if (extractType && !structured.type) {
      structured.type = this.extractType(structured.title || '');
    }

    // 提取标签
    if (extractTags) {
      const extractedTags = this.extractTags(structured.title || '');
      structured.tags = [...new Set([...(structured.tags || []), ...extractedTags])];
    }

    // 提取元数据
    if (extractMetadata) {
      structured.metadata = {
        ...structured.metadata,
        ...this.extractMetadata(structured.title || ''),
      };
    }

    // 清理标题
    if (structured.title) {
      structured.title = this.cleanTitle(structured.title);
    }

    return structured as ExtractedTask;
  }

  /**
   * 提取描述
   */
  private extractDescription(title: string): string | undefined {
    for (const pattern of TaskStructurer.DESCRIPTION_PATTERNS) {
      const matches = [...title.matchAll(pattern)];
      if (matches.length > 0) {
        return matches.map(m => m[1]).join(' ');
      }
    }
    return undefined;
  }

  /**
   * 提取优先级
   */
  private extractPriority(title: string): TaskPriority {
    const lowerTitle = title.toLowerCase();

    for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
      if (keywords.some(keyword => lowerTitle.includes(keyword.toLowerCase()))) {
        return priority as TaskPriority;
      }
    }

    return TaskPriority.MEDIUM;
  }

  /**
   * 提取任务类型
   */
  private extractType(title: string): TaskType {
    const lowerTitle = title.toLowerCase();

    for (const [type, keywords] of Object.entries(TASK_TYPE_KEYWORDS)) {
      if (keywords.some(keyword => lowerTitle.includes(keyword.toLowerCase()))) {
        return type as TaskType;
      }
    }

    return TaskType.OTHER;
  }

  /**
   * 提取标签
   */
  private extractTags(title: string): string[] {
    const tags: string[] = [];

    for (const pattern of TaskStructurer.TAG_PATTERNS) {
      // 重置正则表达式的lastIndex
      const regex = new RegExp(pattern.source, pattern.flags);
      const matches = [...title.matchAll(regex)];
      for (const match of matches) {
        const tag = match[1].trim();
        if (tag && tag.length > 0 && tag.length < 30) {
          tags.push(tag);
        }
      }
    }

    return tags;
  }

  /**
   * 提取元数据
   */
  private extractMetadata(title: string): Record<string, any> {
    const metadata: Record<string, any> = {};

    // 提取时间
    const timeMatches = [...title.matchAll(TaskStructurer.METADATA_PATTERNS.time)];
    if (timeMatches.length > 0) {
      metadata.timeReferences = timeMatches.map(m => m[1]);
    }

    // 提取URL
    const urlMatches = [...title.matchAll(TaskStructurer.METADATA_PATTERNS.url)];
    if (urlMatches.length > 0) {
      metadata.urls = urlMatches.map(m => m[1]);
    }

    // 提取邮箱
    const emailMatches = [...title.matchAll(TaskStructurer.METADATA_PATTERNS.email)];
    if (emailMatches.length > 0) {
      metadata.emails = emailMatches.map(m => m[1]);
    }

    // 提取数字
    const numberMatches = [...title.matchAll(TaskStructurer.METADATA_PATTERNS.number)];
    if (numberMatches.length > 0) {
      metadata.numbers = numberMatches.map(m => parseInt(m[1], 10));
    }

    return metadata;
  }

  /**
   * 清理标题
   */
  private cleanTitle(title: string): string {
    let cleaned = title;

    // 移除标签
    for (const pattern of TaskStructurer.TAG_PATTERNS) {
      cleaned = cleaned.replace(pattern, '');
    }

    // 移除元数据
    for (const pattern of Object.values(TaskStructurer.METADATA_PATTERNS)) {
      cleaned = cleaned.replace(pattern, '');
    }

    // 移除描述
    for (const pattern of TaskStructurer.DESCRIPTION_PATTERNS) {
      cleaned = cleaned.replace(pattern, '');
    }

    // 移除优先级和类型关键词
    const allKeywords = [
      ...Object.values(PRIORITY_KEYWORDS).flat(),
      ...Object.values(TASK_TYPE_KEYWORDS).flat(),
    ];

    for (const keyword of allKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    }

    // 清理多余空格和标点
    cleaned = cleaned
      .replace(/\s+/g, ' ')
      .replace(/[^\w\u4e00-\u9fa5\s\-_.,!?;:]/g, '')
      .trim();

    return cleaned || title;
  }

  /**
   * 批量结构化
   */
  batchStructure(
    tasks: Partial<ExtractedTask>[],
    options?: StructuringOptions
  ): ExtractedTask[] {
    return tasks.map(task => this.structure(task, options));
  }

  /**
   * 验证任务结构
   */
  validate(task: ExtractedTask): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证标题
    if (!task.title || task.title.trim().length === 0) {
      errors.push('任务标题不能为空');
    } else if (task.title.length < 5) {
      errors.push('任务标题太短（最少5个字符）');
    } else if (task.title.length > 200) {
      errors.push('任务标题太长（最多200个字符）');
    }

    // 验证优先级
    if (!Object.values(TaskPriority).includes(task.priority)) {
      errors.push(`无效的优先级: ${task.priority}`);
    }

    // 验证类型
    if (!Object.values(TaskType).includes(task.type)) {
      errors.push(`无效的任务类型: ${task.type}`);
    }

    // 验证状态
    if (!Object.values(TaskStatus).includes(task.status)) {
      errors.push(`无效的任务状态: ${task.status}`);
    }

    // 验证置信度
    if (task.confidence < 0 || task.confidence > 1) {
      errors.push(`无效的置信度: ${task.confidence}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
