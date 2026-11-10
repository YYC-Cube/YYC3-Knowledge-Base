/**
 * @file: llm/ContextCompressionTypes.ts
 * @description: 上下文压缩类型定义
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: llm,context,compression,types
 */

/**
 * 代码段类型
 */
export enum CodeSegmentType {
  FUNCTION = 'function',
  CLASS = 'class',
  INTERFACE = 'interface',
  TYPE = 'type',
  IMPORT = 'import',
  EXPORT = 'export',
  COMMENT = 'comment',
  TEST = 'test',
  CONFIG = 'config',
  DOCUMENTATION = 'documentation',
  OTHER = 'other',
}

/**
 * 代码段重要性
 */
export enum SegmentImportance {
  CRITICAL = 'critical',    // 关键代码，不可压缩
  HIGH = 'high',            // 高重要性，保留详细信息
  MEDIUM = 'medium',        // 中等重要性，可摘要
  LOW = 'low',              // 低重要性，可压缩
  OPTIONAL = 'optional',    // 可选代码，可删除
}

/**
 * 压缩策略类型
 */
export enum CompressionStrategyType {
  NONE = 'none',                  // 不压缩
  LIGHT = 'light',                // 轻度压缩（删除注释、空行）
  MODERATE = 'moderate',          // 中度压缩（摘要非关键代码）
  AGGRESSIVE = 'aggressive',      // 激进压缩（只保留关键代码）
  INTELLIGENT = 'intelligent',    // 智能压缩（自动选择策略）
}

/**
 * 代码段
 */
export interface CodeSegment {
  type: CodeSegmentType;
  content: string;
  startLine: number;
  endLine: number;
  importance: SegmentImportance;
  tokenCount: number;
  dependencies?: string[];
  signature?: string;
  description?: string;
}

/**
 * 压缩策略
 */
export interface CompressionStrategy {
  type: CompressionStrategyType;
  preserveStructure: boolean;
  preserveComments: boolean;
  preserveTests: boolean;
  preserveConfig: boolean;
  maxTokenLimit: number;
  minCompressionRatio: number;
}

/**
 * 摘要结果
 */
export interface SummaryResult {
  signature: string;
  description: string;
  dependencies: string[];
  keyFeatures: string[];
  tokenCount: number;
  preservedComments: string[];
}

/**
 * 压缩结果
 */
export interface CompressionResult {
  original: string;
  compressed: string;
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  strategy: CompressionStrategyType;
  segments: CodeSegment[];
  summaries: Map<string, SummaryResult>;
  processingTime: number;
  quality: CompressionQuality;
}

/**
 * 压缩质量评估
 */
export interface CompressionQuality {
  structurePreserved: boolean;
  keyInfoPreserved: boolean;
  readability: number;        // 0-100
  completeness: number;       // 0-100
  informationLoss: number;    // 0-100
}

/**
 * 压缩配置
 */
export interface CompressionConfig {
  strategy: CompressionStrategyType;
  maxTokenLimit: number;
  minFileSize: number;        // 最小文件大小，低于此不压缩
  preserveStructure: boolean;
  preserveComments: boolean;
  preserveTests: boolean;
  preserveConfig: boolean;
  enableSummarization: boolean;
  qualityThreshold: number;   // 质量阈值 0-100
}

/**
 * 默认压缩配置
 */
export const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  strategy: CompressionStrategyType.INTELLIGENT,
  maxTokenLimit: 4000,
  minFileSize: 1000,
  preserveStructure: true,
  preserveComments: false,
  preserveTests: false,
  preserveConfig: true,
  enableSummarization: true,
  qualityThreshold: 70,
};

/**
 * 压缩统计
 */
export interface CompressionStats {
  totalFiles: number;
  compressedFiles: number;
  totalOriginalTokens: number;
  totalCompressedTokens: number;
  averageCompressionRatio: number;
  averageProcessingTime: number;
  strategyDistribution: Map<CompressionStrategyType, number>;
}
