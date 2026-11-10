/**
 * @file: llm/TaskTypes.ts
 * @description: 任务提取系统类型定义
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: llm,task-extraction,types
 */

/**
 * 任务格式类型
 */
export enum TaskFormat {
  TODO = 'TODO',                    // TODO: 格式
  NUMBERED_LIST = 'NUMBERED_LIST',  // 编号列表 (1. 2. 3.)
  MARKDOWN = 'MARKDOWN',            // Markdown任务列表 (- [ ] - [x])
  BULLET_LIST = 'BULLET_LIST',      // 无序列表 (- * •)
  PLAIN_TEXT = 'PLAIN_TEXT',        // 纯文本
  CUSTOM = 'CUSTOM',                // 自定义格式
}

/**
 * 任务优先级
 */
export enum TaskPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * 任务类型
 */
export enum TaskType {
  FEATURE = 'feature',
  BUG = 'bug',
  REFACTOR = 'refactor',
  TEST = 'test',
  DOCUMENTATION = 'documentation',
  OPTIMIZATION = 'optimization',
  SECURITY = 'security',
  DEPLOYMENT = 'deployment',
  OTHER = 'other',
}

/**
 * 任务状态
 */
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  REVIEW = 'review',
  DONE = 'done',
  BLOCKED = 'blocked',
}

/**
 * 提取的任务接口
 */
export interface ExtractedTask {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  type: TaskType;
  status: TaskStatus;
  format: TaskFormat;
  tags: string[];
  confidence: number;
  lineNumber?: number;
  context?: string;
  metadata?: Record<string, any>;
}

/**
 * 任务提取结果接口
 */
export interface TaskExtractionResult {
  tasks: ExtractedTask[];
  format: TaskFormat;
  confidence: number;
  source: string;
  timestamp: number;
  metadata?: {
    totalLines?: number;
    processedLines?: number;
    ignoredLines?: number;
    deduplicationCount?: number;
  };
}

/**
 * 任务提取配置
 */
export interface TaskExtractorConfig {
  enableMultiFormat: boolean;
  maxTasks: number;
  minConfidence: number;
  enableDeduplication: boolean;
  enableAutoTagging: boolean;
  customPatterns?: CustomPattern[];
}

/**
 * 自定义任务模式
 */
export interface CustomPattern {
  name: string;
  pattern: RegExp;
  type: TaskType;
  priority: TaskPriority;
  confidenceBase: number;
}

/**
 * 任务去重结果
 */
export interface DeduplicationResult {
  original: ExtractedTask[];
  duplicates: ExtractedTask[];
  unique: ExtractedTask[];
  merged: MergedTask[];
  report: DeduplicationReport;
}

/**
 * 合并的任务
 */
export interface MergedTask {
  task: ExtractedTask;
  sources: string[];  // 合并的任务ID列表
  mergeScore: number;
}

/**
 * 去重报告
 */
export interface DeduplicationReport {
  totalTasks: number;
  duplicatesFound: number;
  mergedTasks: number;
  uniqueTasks: number;
  details: DeduplicationDetail[];
}

/**
 * 去重详情
 */
export interface DeduplicationDetail {
  taskId: string;
  duplicateOf?: string;
  similarity: number;
  action: 'kept' | 'merged' | 'removed';
}

/**
 * 任务识别模式
 */
export interface TaskRecognitionPattern {
  format: TaskFormat;
  pattern: RegExp;
  extractor: (match: RegExpMatchArray, context: TaskExtractionContext) => Partial<ExtractedTask>;
  priority: number;
  description: string;
}

/**
 * 任务提取上下文
 */
export interface TaskExtractionContext {
  lineNumber: number;
  previousLine?: string;
  nextLine?: string;
  surroundingContext?: string;
  globalContext?: string;
}

/**
 * 默认配置
 */
export const DEFAULT_TASK_EXTRACTOR_CONFIG: TaskExtractorConfig = {
  enableMultiFormat: true,
  maxTasks: 20,
  minConfidence: 0.5,
  enableDeduplication: true,
  enableAutoTagging: true,
};

/**
 * 优先级关键词映射
 */
export const PRIORITY_KEYWORDS: Record<TaskPriority, string[]> = {
  [TaskPriority.CRITICAL]: ['紧急', 'critical', 'urgent', '重要', 'p0', '立即'],
  [TaskPriority.HIGH]: ['高优先级', 'high', '重要', '尽快', 'p1'],
  [TaskPriority.MEDIUM]: ['中等', 'medium', '一般', '正常', 'p2'],
  [TaskPriority.LOW]: ['低优先级', 'low', '次要', '可选', 'p3', '不急'],
};

/**
 * 任务类型关键词映射
 */
export const TASK_TYPE_KEYWORDS: Record<TaskType, string[]> = {
  [TaskType.FEATURE]: ['功能', 'feature', '新增', '添加', '实现'],
  [TaskType.BUG]: ['bug', '错误', '修复', '问题', '缺陷'],
  [TaskType.REFACTOR]: ['重构', 'refactor', '优化结构', '改进'],
  [TaskType.TEST]: ['测试', 'test', '单测', '测试用例'],
  [TaskType.DOCUMENTATION]: ['文档', 'document', '注释', 'readme'],
  [TaskType.OPTIMIZATION]: ['优化', 'optimize', '性能', '加速'],
  [TaskType.SECURITY]: ['安全', 'security', '漏洞', '加密'],
  [TaskType.DEPLOYMENT]: ['部署', 'deploy', '发布', '上线'],
  [TaskType.OTHER]: ['其他', 'other', '杂项'],
};
