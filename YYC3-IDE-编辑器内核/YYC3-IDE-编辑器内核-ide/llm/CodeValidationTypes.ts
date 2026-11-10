/**
 * @file: llm/CodeValidationTypes.ts
 * @description: 代码验证功能增强类型定义
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: llm,code-validation,types
 */

/**
 * 代码格式验证结果
 */
export interface FormatValidationResult {
  valid: boolean;
  language: string;
  indentStyle: 'spaces' | 'tabs' | 'mixed';
  indentSize: number;
  bracketMatch: boolean;
  issues: FormatIssue[];
}

/**
 * 格式问题
 */
export interface FormatIssue {
  type: 'indent' | 'bracket' | 'spacing' | 'line-ending';
  line?: number;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * 代码长度验证结果
 */
export interface LengthValidationResult {
  valid: boolean;
  totalLength: number;
  maxTotalLength: number;
  lineCount: number;
  maxLineCount: number;
  maxLineLength: number;
  avgLineLength: number;
  functionLengths: FunctionLength[];
  suggestions: string[];
}

/**
 * 函数长度信息
 */
export interface FunctionLength {
  name: string;
  startLine: number;
  endLine: number;
  lineCount: number;
  exceedsLimit: boolean;
}

/**
 * 代码质量检测结果
 */
export interface QualityValidationResult {
  valid: boolean;
  score: number; // 0-100
  emptyBlocks: CodeBlock[];
  duplicates: DuplicateCode[];
  complexity: ComplexityInfo;
  suggestions: string[];
}

/**
 * 代码块信息
 */
export interface CodeBlock {
  type: 'function' | 'class' | 'if' | 'loop' | 'try-catch';
  name?: string;
  startLine: number;
  endLine: number;
  isEmpty: boolean;
}

/**
 * 重复代码信息
 */
export interface DuplicateCode {
  type: 'exact' | 'similar';
  lines: number;
  occurrences: number;
  locations: { startLine: number; endLine: number }[];
}

/**
 * 复杂度信息
 */
export interface ComplexityInfo {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  nestingLevel: number;
  rating: 'low' | 'medium' | 'high' | 'very-high';
}

/**
 * 完整验证结果
 */
export interface FullValidationResult {
  format: FormatValidationResult;
  length: LengthValidationResult;
  quality: QualityValidationResult;
  overall: {
    valid: boolean;
    score: number;
    summary: string;
  };
}

/**
 * 验证配置
 */
export interface ValidationConfig {
  maxTotalLength: number;
  maxLineCount: number;
  maxLineLength: number;
  maxFunctionLength: number;
  maxCyclomaticComplexity: number;
  maxNestingLevel: number;
  enforceConsistentIndent: boolean;
}

/**
 * 默认配置
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  maxTotalLength: 10000,
  maxLineCount: 500,
  maxLineLength: 120,
  maxFunctionLength: 50,
  maxCyclomaticComplexity: 10,
  maxNestingLevel: 4,
  enforceConsistentIndent: true,
};
