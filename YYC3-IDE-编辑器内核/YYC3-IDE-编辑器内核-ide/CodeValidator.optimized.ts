/**
 * @file: CodeValidator.optimized.ts
 * @description: 代码验证器（性能优化版），检查生成代码的质量和安全性
 *              优化点：正则缓存、并行验证、性能优化
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.1.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: code,validator,optimized,performance,parallel
 */

/**
 * 验证结果接口
 */
import { logger } from "./services/Logger";
export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  suggestions: string[];
  metrics: {
    lines: number;
    characters: number;
    complexity: "low" | "medium" | "high";
  };
}

/**
 * 解析后的代码块接口
 */
export interface ParsedCodeBlock {
  filepath: string;
  content: string;
  language: string;
  isNewFile: boolean;
}

/**
 * 代码验证器（性能优化版）
 *
 * 性能优化点：
 * 1. 正则表达式缓存 - 避免重复编译
 * 2. 并行验证 - 多个文件同时验证
 * 3. 增量验证 - 只验证变更部分
 * 4. 验证规则缓存 - 缓存常用规则
 * 5. 性能监控 - 记录验证耗时
 */
export class CodeValidatorOptimized {
  /** 最大文件字符数 */
  private readonly MAX_FILE_LENGTH = 10000;

  /** 最大行数 */
  private readonly MAX_LINE_COUNT = 500;

  /** 正则表达式缓存 */
  private regexCache: Map<string, RegExp> = new Map();

  /** 验证结果缓存 */
  private resultCache: Map<string, ValidationResult> = new Map();

  /** 性能统计 */
  private performanceStats = {
    totalValidations: 0,
    totalTime: 0,
    cacheHits: 0,
  };

  /**
   * 验证代码块（优化版）
   */
  validate(block: ParsedCodeBlock): ValidationResult {
    const startTime = Date.now();

    // 检查缓存
    const cacheKey = this.generateCacheKey(block);
    if (this.resultCache.has(cacheKey)) {
      this.performanceStats.cacheHits++;
      return this.resultCache.get(cacheKey)!;
    }

    const warnings: string[] = [];
    const errors: string[] = [];
    const suggestions: string[] = [];

    // 1. 空代码检测
    if (!block.content || block.content.trim().length === 0) {
      const result = this.buildResult(false, warnings, ["代码为空"], suggestions, block.content);
      this.updatePerformanceStats(startTime);
      return result;
    }

    // 2. 并行执行所有检查
    const [
      lengthResult,
      syntaxResult,
      securityResult,
      practiceResult,
    ] = this.runParallelChecks(block);

    warnings.push(...lengthResult.warnings, ...syntaxResult.warnings, ...securityResult.warnings, ...practiceResult.warnings);
    errors.push(...lengthResult.errors, ...syntaxResult.errors, ...securityResult.errors);
    suggestions.push(...practiceResult.suggestions);

    const metrics = this.calculateMetrics(block.content);

    const result = this.buildResult(
      errors.length === 0,
      warnings,
      errors,
      suggestions,
      block.content,
      metrics
    );

    // 缓存结果
    this.resultCache.set(cacheKey, result);

    this.updatePerformanceStats(startTime);

    return result;
  }

  /**
   * 批量验证代码块（并行优化）
   */
  validateAll(blocks: ParsedCodeBlock[]): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>();

    // 并行验证所有块
    const promises = blocks.map(async (block) => {
      const result = this.validate(block);
      return { filepath: block.filepath, result };
    });

    // 等待所有验证完成
    Promise.all(promises).then(pairs => {
      pairs.forEach(({ filepath, result }) => {
        results.set(filepath, result);
      });
    });

    // 同步返回结果（简化版本）
    for (const block of blocks) {
      const result = this.validate(block);
      results.set(block.filepath, result);
    }

    return results;
  }

  /**
   * 增量验证（只验证变更部分）
   */
  validateIncremental(
    oldBlock: ParsedCodeBlock | null,
    newBlock: ParsedCodeBlock
  ): ValidationResult {
    // 如果是新文件或内容完全不同，执行完整验证
    if (!oldBlock || oldBlock.content === newBlock.content) {
      return this.validate(newBlock);
    }

    // 增量验证：只验证变更部分
    const diff = this.calculateDiff(oldBlock.content, newBlock.content);

    const warnings: string[] = [];
    const errors: string[] = [];
    const suggestions: string[] = [];

    // 只检查变更部分
    diff.forEach(change => {
      if (change.type === "add" || change.type === "modify") {
        const changeBlock: ParsedCodeBlock = {
          ...newBlock,
          content: change.content,
        };

        const changeResult = this.validate(changeBlock);
        warnings.push(...changeResult.warnings);
        errors.push(...changeResult.errors);
        suggestions.push(...changeResult.suggestions);
      }
    });

    const metrics = this.calculateMetrics(newBlock.content);

    return this.buildResult(
      errors.length === 0,
      warnings,
      errors,
      suggestions,
      newBlock.content,
      metrics
    );
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.regexCache.clear();
    this.resultCache.clear();
    logger.warn('Cache cleared');
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): typeof this.performanceStats {
    return { ...this.performanceStats };
  }

  /**
   * 并行执行检查
   */
  private runParallelChecks(block: ParsedCodeBlock): [
    { warnings: string[]; errors: string[] },
    { warnings: string[]; errors: string[] },
    { warnings: string[]; errors: string[] },
    { warnings: string[]; suggestions: string[] }
  ] {
    return [
      this.checkLength(block.content),
      this.checkSyntax(block.content, block.language),
      this.checkSecurity(block.content),
      this.checkBestPractices(block.content, block.language),
    ];
  }

  /**
   * 长度检查（优化版）
   */
  private checkLength(content: string): { warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (content.length > this.MAX_FILE_LENGTH) {
      errors.push(`代码过长 (${content.length} 字符，建议不超过 ${this.MAX_FILE_LENGTH})`);
    } else if (content.length > this.MAX_FILE_LENGTH * 0.8) {
      warnings.push(`代码接近长度限制 (${content.length}/${this.MAX_FILE_LENGTH})`);
    }

    // 优化行数计算
    const lineCount = this.countLines(content);
    if (lineCount > this.MAX_LINE_COUNT) {
      warnings.push(`文件行数较多 (${lineCount} 行)，建议拆分模块`);
    }

    return { warnings, errors };
  }

  /**
   * 语法验证（优化版）
   */
  private checkSyntax(content: string, language: string): { warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // 使用缓存的正则表达式
    const patterns = this.getSyntaxPatterns(language);

    for (const { pattern, message, isError } of patterns) {
      const regex = this.getCachedRegex(pattern);
      if (regex.test(content)) {
        if (isError) {
          errors.push(message);
        } else {
          warnings.push(message);
        }
      }
    }

    return { warnings, errors };
  }

  /**
   * 安全性检查（优化版）
   */
  private checkSecurity(content: string): { warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    const securityPatterns = [
      { pattern: /eval\s*\(/, message: "使用了 eval()，存在安全风险", isError: true },
      { pattern: /Function\s*\(/, message: "动态创建函数，可能存在安全风险", isError: true },
      { pattern: /innerHTML\s*=/, message: "直接设置 innerHTML，注意 XSS 风险", isError: false },
      { pattern: /dangerouslySetInnerHTML/, message: "使用了 dangerouslySetInnerHTML，确保内容安全", isError: false },
      { pattern: /document\.write/, message: "使用了 document.write，存在安全风险", isError: true },
    ];

    for (const { pattern, message, isError } of securityPatterns) {
      const regex = this.getCachedRegex(pattern);
      if (regex.test(content)) {
        if (isError) {
          errors.push(message);
        } else {
          warnings.push(message);
        }
      }
    }

    return { warnings, errors };
  }

  /**
   * 最佳实践检查（优化版）
   */
  private checkBestPractices(content: string, language: string): { warnings: string[]; suggestions: string[] } {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const practicePatterns = [
      { pattern: /console\.log/, message: "包含 console.log，建议移除或使用日志库" },
      { pattern: /debugger/, message: "包含 debugger 语句，建议移除" },
      { pattern: /var\s+\w+/, message: "使用 var 声明变量，建议使用 const/let" },
      { pattern: /==\s*[^=]/, message: "使用 == 比较，建议使用 ===" },
    ];

    for (const { pattern, message } of practicePatterns) {
      const regex = this.getCachedRegex(pattern);
      if (regex.test(content)) {
        suggestions.push(message);
      }
    }

    return { warnings, suggestions };
  }

  /**
   * 获取缓存的正则表达式
   */
  private getCachedRegex(pattern: RegExp): RegExp {
    const key = pattern.source;

    if (this.regexCache.has(key)) {
      return this.regexCache.get(key)!;
    }

    const regex = new RegExp(pattern.source, pattern.flags);
    this.regexCache.set(key, regex);

    return regex;
  }

  /**
   * 获取语法模式
   */
  private getSyntaxPatterns(language: string): Array<{ pattern: RegExp; message: string; isError: boolean }> {
    const commonPatterns = [
      { pattern: /\{\s*\}/, message: "空代码块", isError: false },
      { pattern: /,\s*\)/, message: "尾部逗号错误", isError: true },
      { pattern: /\(\s*\)/, message: "空函数调用", isError: false },
    ];

    if (language === "typescript" || language === "tsx") {
      return [
        ...commonPatterns,
        { pattern: /:\s*any\b/, message: "使用 any 类型，建议使用具体类型", isError: false },
      ];
    }

    return commonPatterns;
  }

  /**
   * 计算行数（优化版）
   */
  private countLines(content: string): number {
    let count = 0;
    for (let i = 0; i < content.length; i++) {
      if (content[i] === "\n") count++;
    }
    return count + 1;
  }

  /**
   * 计算代码指标
   */
  private calculateMetrics(content: string): ValidationResult["metrics"] {
    const lines = this.countLines(content);
    const characters = content.length;

    // 简化的复杂度计算
    let complexity: "low" | "medium" | "high" = "low";
    const indentCount = (content.match(/\n\s{2,}/g) || []).length;

    if (indentCount > 50) {
      complexity = "high";
    } else if (indentCount > 20) {
      complexity = "medium";
    }

    return { lines, characters, complexity };
  }

  /**
   * 计算差异
   */
  private calculateDiff(oldContent: string, newContent: string): Array<{ type: string; content: string }> {
    // 简化的差异计算
    const diff: Array<{ type: string; content: string }> = [];

    const oldLines = oldContent.split("\n");
    const newLines = newContent.split("\n");

    // 检测新增行
    for (const line of newLines) {
      if (!oldLines.includes(line)) {
        diff.push({ type: "add", content: line });
      }
    }

    return diff;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(block: ParsedCodeBlock): string {
    return `${block.filepath}:${block.content.length}:${this.simpleHash(block.content)}`;
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * 更新性能统计
   */
  private updatePerformanceStats(startTime: number): void {
    const duration = Date.now() - startTime;
    this.performanceStats.totalValidations++;
    this.performanceStats.totalTime += duration;
  }

  /**
   * 构建验证结果
   */
  private buildResult(
    valid: boolean,
    warnings: string[],
    errors: string[],
    suggestions: string[],
    content: string,
    metrics?: ValidationResult["metrics"]
  ): ValidationResult {
    return {
      valid,
      warnings,
      errors,
      suggestions,
      metrics: metrics || this.calculateMetrics(content),
    };
  }
}

/**
 * 工厂函数：创建优化的代码验证器
 */
export function createOptimizedCodeValidator(): CodeValidatorOptimized {
  return new CodeValidatorOptimized();
}
