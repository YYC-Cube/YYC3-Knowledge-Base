// @ts-nocheck
/**
 * @file: llm/TaskRecognizer.ts
 * @description: 任务识别算法 — 支持多种格式的任务提取
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: llm,task-extraction,recognition
 */

import {
  TaskFormat,
  TaskPriority,
  TaskType,
  TaskStatus,
  ExtractedTask,
  TaskExtractionContext,
  TaskRecognitionPattern,
  PRIORITY_KEYWORDS,
  TASK_TYPE_KEYWORDS,
} from './TaskTypes';
import { generateId } from '../utils/generateId';
import { logger } from "../services/Logger";

/**
 * 任务识别器
 * 支持多种格式的任务识别
 */
export class TaskRecognizer {
  private patterns: TaskRecognitionPattern[] = [];

  constructor() {
    this.initializePatterns();
  }

  /**
   * 初始化识别模式
   */
  private initializePatterns(): void {
    this.patterns = [
      // TODO格式
      {
        format: TaskFormat.TODO,
        pattern: /^(?:TODO|FIXME|XXX|HACK|NOTE|待办|待做|待完成)[:：]\s*(.+)$/gim,
        extractor: (match, context) => {
          const title = match[1].trim();
          const priority = this.detectPriority(title);
          const type = this.detectType(title);

          return {
            title,
            priority,
            type,
            format: TaskFormat.TODO,
            confidence: 0.85,
            lineNumber: context.lineNumber,
          };
        },
        priority: 10,
        description: 'TODO格式任务',
      },

      // Markdown任务列表
      {
        format: TaskFormat.MARKDOWN,
        pattern: /^[\s]*[-*+]\s*\[([ xX])\]\s*(.+)$/gm,
        extractor: (match, context) => {
          const isChecked = match[1].toLowerCase() === 'x';
          const title = match[2].trim();
          const priority = this.detectPriority(title);
          const type = this.detectType(title);

          return {
            title,
            priority,
            type,
            status: isChecked ? TaskStatus.DONE : TaskStatus.TODO,
            format: TaskFormat.MARKDOWN,
            confidence: 0.9,
            lineNumber: context.lineNumber,
          };
        },
        priority: 11,  // 提高优先级，比无序列表更高
        description: 'Markdown任务列表',
      },

      // 编号列表
      {
        format: TaskFormat.NUMBERED_LIST,
        pattern: /^(?:\d+[.)]|[①②③④⑤⑥⑦⑧⑨⑩])\s*(.+)$/gm,
        extractor: (match, context) => {
          const title = match[1].trim();
          const priority = this.detectPriority(title);
          const type = this.detectType(title);

          return {
            title,
            priority,
            type,
            format: TaskFormat.NUMBERED_LIST,
            confidence: 0.75,
            lineNumber: context.lineNumber,
          };
        },
        priority: 7,
        description: '编号列表任务',
      },

      // 无序列表
      {
        format: TaskFormat.BULLET_LIST,
        pattern: /^[\s]*[-*•·]\s+(.+)$/gm,
        extractor: (match, context) => {
          const title = match[1].trim();
          const priority = this.detectPriority(title);
          const type = this.detectType(title);

          return {
            title,
            priority,
            type,
            format: TaskFormat.BULLET_LIST,
            confidence: 0.7,
            lineNumber: context.lineNumber,
          };
        },
        priority: 6,
        description: '无序列表任务',
      },

      // 自定义格式 - 带优先级标记
      {
        format: TaskFormat.CUSTOM,
        pattern: /\[(P[0-3]|高|中|低|紧急)\]\s*(.+)$/gim,
        extractor: (match, context) => {
          const priorityMark = match[1];
          const title = match[2].trim();
          const priority = this.parsePriorityMark(priorityMark);
          const type = this.detectType(title);

          return {
            title,
            priority,
            type,
            format: TaskFormat.CUSTOM,
            confidence: 0.8,
            lineNumber: context.lineNumber,
          };
        },
        priority: 8,
        description: '带优先级标记的任务',
      },
    ];
  }

  /**
   * 从文本中识别任务
   */
  recognize(text: string): ExtractedTask[] {
    const tasks: ExtractedTask[] = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const context: TaskExtractionContext = {
        lineNumber: i + 1,
        previousLine: i > 0 ? lines[i - 1] : undefined,
        nextLine: i < lines.length - 1 ? lines[i + 1] : undefined,
        surroundingContext: this.getSurroundingContext(lines, i),
        globalContext: text,
      };

      // 尝试匹配各种模式
      for (const pattern of this.patterns) {
        const matches = [...line.matchAll(new RegExp(pattern.pattern.source, pattern.pattern.flags))];

        for (const match of matches) {
          try {
            const partialTask = pattern.extractor(match, context);

            if (this.isValidTask(partialTask)) {
              const task: ExtractedTask = {
                id: generateId(),
                title: partialTask.title || '',
                description: partialTask.description,
                priority: partialTask.priority || TaskPriority.MEDIUM,
                type: partialTask.type || TaskType.OTHER,
                status: partialTask.status || TaskStatus.TODO,
                format: partialTask.format || TaskFormat.PLAIN_TEXT,
                tags: partialTask.tags || [],
                confidence: partialTask.confidence || 0.5,
                lineNumber: partialTask.lineNumber,
                context: context.surroundingContext,
                metadata: partialTask.metadata,
              };

              // 自动标签
              task.tags = this.autoTag(task);

              tasks.push(task);
              break; // 一行只匹配一个模式
            }
          } catch (error) {
            logger.warn('Task extraction failed for line:', line, error);
          }
        }
      }
    }

    return tasks;
  }

  /**
   * 检测优先级
   */
  private detectPriority(text: string): TaskPriority {
    const lowerText = text.toLowerCase();

    // 检查优先级关键词
    for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
      if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
        return priority as TaskPriority;
      }
    }

    // 默认中等优先级
    return TaskPriority.MEDIUM;
  }

  /**
   * 检测任务类型
   */
  private detectType(text: string): TaskType {
    const lowerText = text.toLowerCase();

    // 检查类型关键词
    for (const [type, keywords] of Object.entries(TASK_TYPE_KEYWORDS)) {
      if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
        return type as TaskType;
      }
    }

    return TaskType.OTHER;
  }

  /**
   * 解析优先级标记
   */
  private parsePriorityMark(mark: string): TaskPriority {
    const lowerMark = mark.toLowerCase();

    if (lowerMark === 'p0' || lowerMark === '紧急') {
      return TaskPriority.CRITICAL;
    } else if (lowerMark === 'p1' || lowerMark === '高') {
      return TaskPriority.HIGH;
    } else if (lowerMark === 'p2' || lowerMark === '中') {
      return TaskPriority.MEDIUM;
    } else if (lowerMark === 'p3' || lowerMark === '低') {
      return TaskPriority.LOW;
    }

    return TaskPriority.MEDIUM;
  }

  /**
   * 自动标签
   */
  private autoTag(task: ExtractedTask): string[] {
    const tags: string[] = [...task.tags];

    // 添加格式标签
    tags.push(`format:${task.format.toLowerCase()}`);

    // 添加类型标签
    tags.push(`type:${task.type}`);

    // 添加优先级标签
    tags.push(`priority:${task.priority}`);

    // 去重
    return [...new Set(tags)];
  }

  /**
   * 获取周围上下文
   */
  private getSurroundingContext(lines: string[], currentIndex: number): string {
    const start = Math.max(0, currentIndex - 2);
    const end = Math.min(lines.length, currentIndex + 3);
    return lines.slice(start, end).join('\n');
  }

  /**
   * 验证任务是否有效
   */
  private isValidTask(partialTask: Partial<ExtractedTask>): boolean {
    if (!partialTask.title || partialTask.title.trim().length === 0) {
      return false;
    }

    // 过滤过短或过长的标题
    // 放宽限制：允许3-200字符
    if (partialTask.title.length < 3 || partialTask.title.length > 200) {
      return false;
    }

    // 过滤代码行
    const codePatterns = [
      /^(import|export|const|let|var|function|class|interface|type)\s/,
      /^[{}()\[\];,]*$/,
      /^(\/\/|\/\*|\*|<!--)/,
    ];

    if (codePatterns.some(pattern => pattern.test(partialTask.title))) {
      return false;
    }

    return true;
  }

  /**
   * 获取支持的格式
   */
  getSupportedFormats(): TaskFormat[] {
    return this.patterns.map(p => p.format);
  }

  /**
   * 添加自定义模式
   */
  addCustomPattern(pattern: TaskRecognitionPattern): void {
    this.patterns.push(pattern);
    this.patterns.sort((a, b) => b.priority - a.priority);
  }
}
