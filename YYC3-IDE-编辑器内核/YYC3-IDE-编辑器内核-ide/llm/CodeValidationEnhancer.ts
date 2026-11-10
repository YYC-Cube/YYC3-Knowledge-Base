/**
 * @file: llm/CodeValidationEnhancer.ts
 * @description: 代码验证功能增强 - 格式、长度、质量检测
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: llm,code-validation,enhancement
 */

import {
  FormatValidationResult,
  LengthValidationResult,
  QualityValidationResult,
  FullValidationResult,
  ValidationConfig,
  DEFAULT_VALIDATION_CONFIG,
  FormatIssue,
  FunctionLength,
  CodeBlock,
  DuplicateCode,
  ComplexityInfo,
} from './CodeValidationTypes';

/**
 * 代码验证增强器
 * 提供格式验证、长度验证、质量检测功能
 */
export class CodeValidationEnhancer {
  private config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  }

  /**
   * 完整验证
   */
  validate(code: string, language: string): FullValidationResult {
    const format = this.validateFormat(code, language);
    const length = this.validateLength(code);
    const quality = this.validateQuality(code, language);

    const overall = this.calculateOverall(format, length, quality);

    return { format, length, quality, overall };
  }

  /**
   * 格式验证
   */
  validateFormat(code: string, language: string): FormatValidationResult {
    const issues: FormatIssue[] = [];

    // 检测语言
    const detectedLanguage = this.detectLanguage(code, language);

    // 检测缩进风格
    const indentInfo = this.detectIndentStyle(code);

    // 检测括号匹配
    const bracketMatch = this.checkBracketMatch(code, issues);

    // 检测缩进一致性
    if (this.config.enforceConsistentIndent) {
      this.checkIndentConsistency(code, indentInfo, issues);
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      language: detectedLanguage,
      indentStyle: indentInfo.style,
      indentSize: indentInfo.size,
      bracketMatch,
      issues,
    };
  }

  /**
   * 长度验证
   */
  validateLength(code: string): LengthValidationResult {
    const lines = code.split('\n');
    const totalLength = code.length;
    const lineCount = lines.length;

    // 计算行长度统计
    const lineLengths = lines.map(line => line.length);
    const maxLineLength = Math.max(...lineLengths);
    const avgLineLength = lineLengths.reduce((a, b) => a + b, 0) / lineCount;

    // 检测函数长度
    const functionLengths = this.detectFunctionLengths(code, lines);

    // 生成建议
    const suggestions: string[] = [];
    if (totalLength > this.config.maxTotalLength) {
      suggestions.push(`代码总长度${totalLength}超过限制${this.config.maxTotalLength}，建议拆分文件`);
    }
    if (lineCount > this.config.maxLineCount) {
      suggestions.push(`代码行数${lineCount}超过限制${this.config.maxLineCount}，建议重构`);
    }
    if (maxLineLength > this.config.maxLineLength) {
      suggestions.push(`最长行${maxLineLength}超过限制${this.config.maxLineLength}，建议换行`);
    }

    const valid =
      totalLength <= this.config.maxTotalLength &&
      lineCount <= this.config.maxLineCount &&
      maxLineLength <= this.config.maxLineLength;

    return {
      valid,
      totalLength,
      maxTotalLength: this.config.maxTotalLength,
      lineCount,
      maxLineCount: this.config.maxLineCount,
      maxLineLength,
      avgLineLength,
      functionLengths,
      suggestions,
    };
  }

  /**
   * 质量检测
   */
  validateQuality(code: string, language: string): QualityValidationResult {
    const emptyBlocks = this.detectEmptyBlocks(code);
    const duplicates = this.detectDuplicates(code);
    const complexity = this.calculateComplexity(code, language);

    const suggestions: string[] = [];

    if (emptyBlocks.length > 0) {
      suggestions.push(`发现${emptyBlocks.length}个空代码块，建议补充实现`);
    }
    if (duplicates.length > 0) {
      suggestions.push(`发现${duplicates.length}处重复代码，建议提取为函数`);
    }
    if (complexity.cyclomaticComplexity > this.config.maxCyclomaticComplexity) {
      suggestions.push(`圈复杂度${complexity.cyclomaticComplexity}过高，建议简化逻辑`);
    }

    const score = this.calculateQualityScore(emptyBlocks, duplicates, complexity);
    const valid = score >= 60;

    return {
      valid,
      score,
      emptyBlocks,
      duplicates,
      complexity,
      suggestions,
    };
  }

  /**
   * 检测语言
   */
  private detectLanguage(code: string, specified: string): string {
    if (specified && specified !== 'unknown') return specified;

    // 简单的语言检测
    if (code.includes('import React') || code.includes('useState')) return 'typescript';
    if (code.includes('def ') || code.includes('import ')) return 'python';
    if (code.includes('function ') || code.includes('const ')) return 'javascript';

    return 'unknown';
  }

  /**
   * 检测缩进风格
   */
  private detectIndentStyle(code: string): { style: 'spaces' | 'tabs' | 'mixed'; size: number } {
    const lines = code.split('\n').filter(line => line.match(/^\s+/));
    if (lines.length === 0) return { style: 'spaces', size: 2 };

    let spaces = 0;
    let tabs = 0;
    const spaceSizes: number[] = [];

    for (const line of lines) {
      const indent = line.match(/^(\s+)/)?.[1] || '';
      if (indent.includes('\t')) {
        tabs++;
      } else {
        spaces++;
        spaceSizes.push(indent.length);
      }
    }

    const style = tabs > spaces ? 'tabs' : spaces > tabs ? 'spaces' : 'mixed';
    const size = style === 'spaces'
      ? spaceSizes.length > 0 ? Math.round(spaceSizes.reduce((a, b) => a + b, 0) / spaceSizes.length) : 2
      : 1;

    return { style, size };
  }

  /**
   * 检查括号匹配
   */
  private checkBracketMatch(code: string, issues: FormatIssue[]): boolean {
    const stack: string[] = [];
    const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      if (pairs[char]) {
        stack.push(char);
      } else if (Object.values(pairs).includes(char)) {
        const last = stack.pop();
        if (!last || pairs[last] !== char) {
          issues.push({
            type: 'bracket',
            message: `括号不匹配: 期望 ${last ? pairs[last] : '开始括号'}`,
            severity: 'error',
          });
          return false;
        }
      }
    }

    if (stack.length > 0) {
      issues.push({
        type: 'bracket',
        message: `缺少闭合括号`,
        severity: 'error',
      });
      return false;
    }

    return true;
  }

  /**
   * 检查缩进一致性
   */
  private checkIndentConsistency(
    code: string,
    indentInfo: { style: 'spaces' | 'tabs' | 'mixed'; size: number },
    issues: FormatIssue[]
  ): void {
    if (indentInfo.style === 'mixed') {
      issues.push({
        type: 'indent',
        message: '缩进风格不一致，混用了空格和制表符',
        severity: 'warning',
      });
    }
  }

  /**
   * 检测函数长度
   */
  private detectFunctionLengths(code: string, lines: string[]): FunctionLength[] {
    const functionLengths: FunctionLength[] = [];
    const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*\([^)]*\)\s*{)/g;

    let match;
    while ((match = functionRegex.exec(code)) !== null) {
      const name = match[1] || match[2] || match[3];
      const startLine = code.substring(0, match.index).split('\n').length;

      // 简化：估算函数长度
      let braceCount = 0;
      let endLine = startLine;

      for (let i = match.index; i < code.length; i++) {
        if (code[i] === '{') braceCount++;
        if (code[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            endLine = code.substring(0, i).split('\n').length;
            break;
          }
        }
      }

      const lineCount = endLine - startLine + 1;
      if (lineCount > 0) {
        functionLengths.push({
          name,
          startLine,
          endLine,
          lineCount,
          exceedsLimit: lineCount > this.config.maxFunctionLength,
        });
      }
    }

    return functionLengths;
  }

  /**
   * 检测空代码块
   */
  private detectEmptyBlocks(code: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const emptyBlockRegex = /(?:function\s+\w+|if\s*\(|for\s*\(|while\s*\(|class\s+\w+|try\s*|catch\s*)\s*\{[\s\n]*\}/g;

    let match;
    while ((match = emptyBlockRegex.exec(code)) !== null) {
      const startLine = code.substring(0, match.index).split('\n').length;
      blocks.push({
        type: 'function',
        startLine,
        endLine: startLine,
        isEmpty: true,
      });
    }

    return blocks;
  }

  /**
   * 检测重复代码
   */
  private detectDuplicates(code: string): DuplicateCode[] {
    const duplicates: DuplicateCode[] = [];
    const lines = code.split('\n');
    const lineMap = new Map<string, number[]>();

    // 简化的重复检测：检查连续重复行
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.length > 10) {
        const occurrences = lineMap.get(trimmed) || [];
        occurrences.push(index + 1);
        lineMap.set(trimmed, occurrences);
      }
    });

    lineMap.forEach((occurrences, line) => {
      if (occurrences.length >= 2) {
        duplicates.push({
          type: 'exact',
          lines: 1,
          occurrences: occurrences.length,
          locations: occurrences.map(line => ({ startLine: line, endLine: line })),
        });
      }
    });

    return duplicates.slice(0, 5); // 最多返回5个重复项
  }

  /**
   * 计算复杂度
   */
  private calculateComplexity(code: string, language: string): ComplexityInfo {
    // 简化的复杂度计算
    const ifCount = (code.match(/\bif\b/g) || []).length;
    const forCount = (code.match(/\bfor\b/g) || []).length;
    const whileCount = (code.match(/\bwhile\b/g) || []).length;
    const caseCount = (code.match(/\bcase\b/g) || []).length;

    const cyclomaticComplexity = 1 + ifCount + forCount + whileCount + caseCount;

    // 计算嵌套层级
    let maxNesting = 0;
    let currentNesting = 0;
    for (const char of code) {
      if (char === '{') {
        currentNesting++;
        maxNesting = Math.max(maxNesting, currentNesting);
      }
      if (char === '}') {
        currentNesting--;
      }
    }

    const rating =
      cyclomaticComplexity <= 5 ? 'low' :
      cyclomaticComplexity <= 10 ? 'medium' :
      cyclomaticComplexity <= 20 ? 'high' : 'very-high';

    return {
      cyclomaticComplexity,
      cognitiveComplexity: cyclomaticComplexity, // 简化
      nestingLevel: maxNesting,
      rating,
    };
  }

  /**
   * 计算质量分数
   */
  private calculateQualityScore(
    emptyBlocks: CodeBlock[],
    duplicates: DuplicateCode[],
    complexity: ComplexityInfo
  ): number {
    let score = 100;

    // 空块扣分
    score -= emptyBlocks.length * 10;

    // 重复代码扣分
    score -= duplicates.length * 5;

    // 复杂度扣分
    if (complexity.cyclomaticComplexity > this.config.maxCyclomaticComplexity) {
      score -= (complexity.cyclomaticComplexity - this.config.maxCyclomaticComplexity) * 2;
    }

    return Math.max(0, score);
  }

  /**
   * 计算总体结果
   */
  private calculateOverall(
    format: FormatValidationResult,
    length: LengthValidationResult,
    quality: QualityValidationResult
  ): { valid: boolean; score: number; summary: string } {
    const score = (quality.score * 0.5) +
      (format.valid ? 25 : 0) +
      (length.valid ? 25 : 0);

    const valid = format.valid && length.valid && quality.valid;

    let summary = valid ? '代码质量良好' : '代码存在问题需要改进';
    if (!format.valid) summary += '，格式不规范';
    if (!length.valid) summary += '，长度超标';
    if (!quality.valid) summary += '，质量分数较低';

    return { valid, score, summary };
  }
}
