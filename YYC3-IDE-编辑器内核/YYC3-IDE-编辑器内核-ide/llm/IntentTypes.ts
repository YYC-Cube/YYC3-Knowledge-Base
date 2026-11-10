/**
 * @file: IntentTypes.ts
 * @description: 意图识别类型定义 - 定义所有意图类型和相关接口
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: intent,types,llm,classification
 */

/**
 * 意图类型枚举
 */
export enum IntentType {
  // 代码操作类
  CREATE = 'create',           // 创建新代码/文件
  MODIFY = 'modify',           // 修改现有代码
  OPTIMIZE = 'optimize',       // 优化代码性能/结构
  REFACTOR = 'refactor',       // 重构代码

  // 开发流程类
  DEBUG = 'debug',             // 调试问题
  TEST = 'test',               // 编写/运行测试
  DEPLOY = 'deploy',           // 部署相关

  // 信息查询类
  QUERY = 'query',             // 查询信息
  ANALYZE = 'analyze',         // 分析代码/数据
  DOCUMENT = 'document',       // 生成文档

  // 其他
  EXPLAIN = 'explain',         // 解释代码
  CONVERT = 'convert',         // 转换格式/语言
  REVIEW = 'review',           // 代码审查
  UNKNOWN = 'unknown',         // 未知意图
}

/**
 * 意图类别枚举
 */
export enum IntentCategory {
  CODE_OPERATION = 'code_operation',     // 代码操作
  DEVELOPMENT_FLOW = 'development_flow', // 开发流程
  INFORMATION = 'information',           // 信息查询
  OTHER = 'other',                       // 其他
}

/**
 * 意图优先级枚举
 */
export enum IntentPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * 意图特征接口
 */
export interface IntentFeature {
  keywords: string[];          // 关键词列表
  context: string[];           // 上下文信息
  codeSnippets: string[];      // 代码片段
  parameters: Map<string, any>; // 参数映射
  entities: Entity[];          // 实体列表
}

/**
 * 实体接口
 */
export interface Entity {
  type: EntityType;            // 实体类型
  value: string;               // 实体值
  position: number[];          // 位置（开始、结束）
  confidence: number;          // 置信度
}

/**
 * 实体类型枚举
 */
export enum EntityType {
  FILE_NAME = 'file_name',     // 文件名
  FUNCTION_NAME = 'function_name', // 函数名
  CLASS_NAME = 'class_name',   // 类名
  VARIABLE = 'variable',       // 变量
  LANGUAGE = 'language',       // 编程语言
  FRAMEWORK = 'framework',     // 框架
  LIBRARY = 'library',         // 库
  ERROR_TYPE = 'error_type',   // 错误类型
  API_ENDPOINT = 'api_endpoint', // API端点
  PATH = 'path',               // 路径
  URL = 'url',                 // URL
  NUMBER = 'number',           // 数字
  VERSION = 'version',         // 版本号
}

/**
 * 意图候选接口
 */
export interface IntentCandidate {
  type: IntentType;            // 意图类型
  confidence: number;          // 置信度（0-1）
  features: IntentFeature;     // 意图特征
  reason: string;              // 判断理由
  metadata?: Record<string, any>; // 额外元数据
}

/**
 * 意图识别结果接口
 */
export interface IntentRecognitionResult {
  primaryIntent: IntentCandidate;      // 主要意图
  secondaryIntents: IntentCandidate[]; // 次要意图
  allCandidates: IntentCandidate[];    // 所有候选
  context: RecognitionContext;         // 识别上下文
  timestamp: number;                   // 时间戳
  processingTime: number;              // 处理时间（毫秒）
}

/**
 * 识别上下文接口
 */
export interface RecognitionContext {
  userInput: string;           // 用户输入
  conversationHistory?: string[]; // 对话历史
  currentFile?: string;        // 当前文件
  projectContext?: string;     // 项目上下文
  userPreferences?: Record<string, any>; // 用户偏好
}

/**
 * 意图冲突信息接口
 */
export interface IntentConflict {
  intents: IntentType[];       // 冲突的意图
  severity: ConflictSeverity;  // 冲突严重程度
  description: string;         // 冲突描述
  suggestion: string;          // 解决建议
}

/**
 * 冲突严重程度枚举
 */
export enum ConflictSeverity {
  LOW = 'low',                 // 低 - 可忽略
  MEDIUM = 'medium',           // 中 - 需要澄清
  HIGH = 'high',               // 高 - 必须解决
}

/**
 * 意图建议接口
 */
export interface IntentSuggestion {
  type: IntentType;            // 建议的意图类型
  description: string;         // 描述
  example: string;             // 示例
  priority: IntentPriority;    // 优先级
}

/**
 * 意图模式接口
 */
export interface IntentPattern {
  type: IntentType;            // 意图类型
  patterns: RegExp[];          // 匹配模式
  keywords: string[];          // 关键词
  priority: IntentPriority;    // 优先级
  category: IntentCategory;    // 类别
  description: string;         // 描述
}

/**
 * 意图配置接口
 */
export interface IntentConfig {
  enableMultiIntent: boolean;  // 是否启用多意图识别
  confidenceThreshold: number; // 置信度阈值（0-1）
  maxCandidates: number;       // 最大候选数量
  enableConflictDetection: boolean; // 是否启用冲突检测
  enableSuggestions: boolean;  // 是否启用意图建议
}

/**
 * 默认配置
 */
export const DEFAULT_INTENT_CONFIG: IntentConfig = {
  enableMultiIntent: true,
  confidenceThreshold: 0.3,  // 降低阈值，允许更多意图通过
  maxCandidates: 5,
  enableConflictDetection: true,
  enableSuggestions: true,
};

/**
 * 意图统计信息接口
 */
export interface IntentStatistics {
  totalRecognitions: number;   // 总识别次数
  byType: Record<IntentType, number>; // 按类型统计
  byCategory: Record<IntentCategory, number>; // 按类别统计
  averageConfidence: number;   // 平均置信度
  averageProcessingTime: number; // 平均处理时间
}
