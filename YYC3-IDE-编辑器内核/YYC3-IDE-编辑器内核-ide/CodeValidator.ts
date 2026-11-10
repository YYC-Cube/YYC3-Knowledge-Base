import { logger } from "./services/Logger";
/**
 * @file: CodeValidator.ts
 * @description: 代码验证器，检查生成代码的质量和安全性
 */

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  /** 警告信息列表 */
  warnings: string[];
  /** 错误信息列表 */
  errors: string[];
  /** 建议信息列表 */
  suggestions: string[];
  /** 代码指标 */
  metrics: {
    /** 行数 */
    lines: number;
    /** 字符数 */
    characters: number;
    /** 复杂度：低/中/高 */
    complexity: "low" | "medium" | "high";
  };
}

/**
 * 解析后的代码块接口
 */
export interface ParsedCodeBlock {
  /** 文件路径 */
  filepath: string;
  /** 代码内容 */
  content: string;
  /** 语言类型 */
  language: string;
  /** 是否为新文件 */
  isNewFile: boolean;
}

/**
 * 代码验证器类
 *
 * 负责：
 * - 语法验证
 * - 安全性检查
 * - 最佳实践检查
 * - 代码指标计算
 */
export class CodeValidator {
  /** 最大文件字符数 */
  private readonly MAX_FILE_LENGTH = 10000;

  /** 最大行数 */
  private readonly MAX_LINE_COUNT = 500;

  /**
   * 验证代码块
   *
   * @param block 代码块
   * @returns 验证结果
   */
  validate(block: ParsedCodeBlock): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const suggestions: string[] = [];

    // 1. 空代码检测
    if (!block.content || block.content.trim().length === 0) {
      errors.push("代码为空");
      return this.buildResult(false, warnings, errors, suggestions, block.content);
    }

    // 2. 长度检查
    const lengthCheck = this.checkLength(block.content);
    warnings.push(...lengthCheck.warnings);
    errors.push(...lengthCheck.errors);

    // 3. 语法验证
    const syntaxCheck = this.checkSyntax(block.content, block.language);
    errors.push(...syntaxCheck.errors);
    warnings.push(...syntaxCheck.warnings);

    // 4. 安全性检查
    const securityCheck = this.checkSecurity(block.content);
    warnings.push(...securityCheck.warnings);
    errors.push(...securityCheck.errors);

    // 5. 最佳实践检查
    const practiceCheck = this.checkBestPractices(block.content, block.language);
    suggestions.push(...practiceCheck.suggestions);
    warnings.push(...practiceCheck.warnings);

    // 6. 计算指标
    const metrics = this.calculateMetrics(block.content);

    return this.buildResult(
      errors.length === 0,
      warnings,
      errors,
      suggestions,
      block.content,
      metrics
    );
  }

  /**
   * 批量验证代码块
   *
   * @param blocks 代码块数组
   * @returns 验证结果映射
   */
  validateAll(blocks: ParsedCodeBlock[]): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>();

    for (const block of blocks) {
      const result = this.validate(block);
      results.set(block.filepath, result);
    }

    return results;
  }

  /**
   * 长度检查
   *
   * @param content 代码内容
   * @returns 检查结果
   */
  private checkLength(content: string): { warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // 字符数检查
    if (content.length > this.MAX_FILE_LENGTH) {
      errors.push(`代码过长 (${content.length} 字符，建议不超过 ${this.MAX_FILE_LENGTH})`);
    } else if (content.length > this.MAX_FILE_LENGTH * 0.8) {
      warnings.push(`代码接近长度限制 (${content.length}/${this.MAX_FILE_LENGTH})`);
    }

    // 行数检查
    const lineCount = content.split('\n').length;
    if (lineCount > this.MAX_LINE_COUNT) {
      warnings.push(`文件行数较多 (${lineCount} 行)，建议拆分模块`);
    }

    return { warnings, errors };
  }

  /**
   * 语法验证（基础检查）
   *
   * @param content 代码内容
   * @param language 语言类型
   * @returns 检查结果
   */
  private checkSyntax(
    content: string,
    language: string
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查括号匹配
    const bracketCheck = this.checkBrackets(content);
    if (!bracketCheck.valid) {
      errors.push(`括号不匹配: ${bracketCheck.message}`);
    }

    // TypeScript/JavaScript 特定检查
    if (['ts', 'tsx', 'js', 'jsx'].includes(language)) {
      // 检查未闭合的字符串
      if (this.hasUnclosedString(content)) {
        errors.push("存在未闭合的字符串");
      }

      // 检查是否包含 debugger
      if (content.includes('debugger')) {
        warnings.push("代码中包含 debugger 语句");
      }
    }

    return { errors, warnings };
  }

  /**
   * 安全性检查
   *
   * @param content 代码内容
   * @returns 检查结果
   */
  private checkSecurity(content: string): { warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // 检查危险模式
    const dangerousPatterns = [
      { pattern: /eval\s*\(/, message: "使用了 eval()，存在安全风险" },
      { pattern: /Function\s*\(/, message: "动态创建函数，可能存在风险" },
      { pattern: /innerHTML\s*=/, message: "使用 innerHTML，注意 XSS 风险" },
      { pattern: /dangerouslySetInnerHTML/, message: "使用 dangerouslySetInnerHTML，确保内容安全" },
      { pattern: /document\.write/, message: "使用 document.write，已废弃" },
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(content)) {
        warnings.push(message);
      }
    }

    // 检查硬编码的敏感信息
    const sensitivePatterns = [
      { pattern: /password\s*[:=]\s*["'].*["']/i, message: "可能包含硬编码密码" },
      { pattern: /api[_-]?key\s*[:=]\s*["'].*["']/i, message: "可能包含硬编码 API key" },
      { pattern: /secret\s*[:=]\s*["'].*["']/i, message: "可能包含硬编码密钥" },
    ];

    for (const { pattern, message } of sensitivePatterns) {
      if (pattern.test(content)) {
        errors.push(message);
      }
    }

    return { warnings, errors };
  }

  /**
   * 最佳实践检查
   *
   * @param content 代码内容
   * @param language 语言类型
   * @returns 检查结果
   */
  private checkBestPractices(
    content: string,
    language: string
  ): { warnings: string[]; suggestions: string[] } {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 检查 console.log
    const consoleLogMatches = content.match(/console\.log/g);
    if (consoleLogMatches && consoleLogMatches.length > 5) {
      warnings.push(`存在多个 console.log (${consoleLogMatches.length} 个)，建议清理`);
    }

    // 检查 TODO/FIXME
    const todoMatches = content.match(/TODO|FIXME/gi);
    if (todoMatches && todoMatches.length > 0) {
      suggestions.push(`包含 ${todoMatches.length} 个待办事项 (TODO/FIXME)`);
    }

    // TypeScript 特定建议
    if (language === 'ts' || language === 'tsx') {
      if (content.includes(': any')) {
        suggestions.push("使用了 any 类型，建议使用具体类型");
      }
      if (!content.includes('export')) {
        suggestions.push("文件没有导出任何内容，确认是否为模块");
      }
    }

    // React 特定检查
    if (language === 'tsx' || language === 'jsx') {
      if (!content.includes('import React') && content.includes('useState')) {
        warnings.push("使用了 React hooks 但未导入 React");
      }
    }

    return { warnings, suggestions };
  }

  /**
   * 括号匹配检查
   *
   * @param content 代码内容
   * @returns 检查结果
   */
  private checkBrackets(content: string): { valid: boolean; message: string } {
    const stack: string[] = [];
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}'
    };

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (pairs[char]) {
        stack.push(char);
      } else if (Object.values(pairs).includes(char)) {
        const last = stack.pop();
        if (!last || pairs[last] !== char) {
          return { valid: false, message: `位置 ${i} 处括号不匹配` };
        }
      }
    }

    if (stack.length > 0) {
      return { valid: false, message: `存在 ${stack.length} 个未闭合的括号` };
    }

    return { valid: true, message: "" };
  }

  /**
   * 检查未闭合的字符串
   *
   * @param content 代码内容
   * @returns 是否存在未闭合的字符串
   */
  private hasUnclosedString(content: string): boolean {
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const prevChar = i > 0 ? content[i - 1] : '';

      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
      }
    }

    return inString;
  }

  /**
   * 计算代码指标
   *
   * @param content 代码内容
   * @returns 代码指标
   */
  private calculateMetrics(content: string): ValidationResult["metrics"] {
    const lines = content.split('\n').length;
    const characters = content.length;

    // 简单的复杂度评估
    const complexityIndicators = [
      /if\s*\(/g,
      /for\s*\(/g,
      /while\s*\(/g,
      /switch\s*\(/g,
      /\?\s*:/g, // 三元运算符
    ];

    let complexityScore = 0;
    for (const pattern of complexityIndicators) {
      const matches = content.match(pattern);
      complexityScore += matches ? matches.length : 0;
    }

    const complexity = complexityScore < 5 ? "low" :
                       complexityScore < 15 ? "medium" : "high";

    return { lines, characters, complexity };
  }

  /**
   * 构建验证结果
   *
   * @param valid 是否通过验证
   * @param warnings 警告信息
   * @param errors 错误信息
   * @param suggestions 建议信息
   * @param content 代码内容
   * @param metrics 代码指标（可选）
   * @returns 验证结果
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
      metrics: metrics || {
        lines: content.split('\n').length,
        characters: content.length,
        complexity: "low"
      }
    };
  }

  validateCodeBlock(filepath: string, content: string, language: string): ValidationResult {
    return this.validate({ filepath, content, language, isNewFile: true });
  }
}

/**
 * 便捷函数：验证代码块
 *
 * @param block 代码块
 * @returns 验证结果
 */
export function validateCodeBlock(block: ParsedCodeBlock): ValidationResult {
  const validator = new CodeValidator();
  return validator.validate(block);
}

/**
 * 便捷函数：批量验证代码块
 *
 * @param blocks 代码块数组
 * @returns 验证结果映射
 */
export function validateCodeBlocks(blocks: ParsedCodeBlock[]): Map<string, ValidationResult> {
  const validator = new CodeValidator();
  return validator.validateAll(blocks);
}
