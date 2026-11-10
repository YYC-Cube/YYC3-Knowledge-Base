/**
 * @file: llm/ContentSummarizer.ts
 * @description: 内容摘要生成 - 函数签名、类结构、依赖关系、关键注释
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: llm,compression,summarizer,content
 */

import {
  CodeSegment,
  CodeSegmentType,
  SummaryResult,
  CompressionConfig,
} from './ContextCompressionTypes';

/**
 * 内容摘要生成器
 */
export class ContentSummarizer {
  /**
   * 生成代码段摘要
   */
  summarize(segment: CodeSegment, config: CompressionConfig): SummaryResult {
    switch (segment.type) {
      case CodeSegmentType.FUNCTION:
        return this.summarizeFunction(segment, config);
      case CodeSegmentType.CLASS:
        return this.summarizeClass(segment, config);
      case CodeSegmentType.INTERFACE:
        return this.summarizeInterface(segment, config);
      case CodeSegmentType.TYPE:
        return this.summarizeType(segment, config);
      case CodeSegmentType.IMPORT:
        return this.summarizeImport(segment, config);
      case CodeSegmentType.TEST:
        return this.summarizeTest(segment, config);
      default:
        return this.summarizeGeneric(segment, config);
    }
  }

  /**
   * 生成函数摘要
   */
  private summarizeFunction(segment: CodeSegment, config: CompressionConfig): SummaryResult {
    const signature = this.extractFunctionSignature(segment.content);
    const description = this.extractDescription(segment.content);
    const dependencies = this.extractDependencies(segment.content);
    const keyFeatures = this.extractKeyFeatures(segment.content);
    const preservedComments = config.preserveComments
      ? this.extractKeyComments(segment.content)
      : [];

    return {
      signature,
      description,
      dependencies,
      keyFeatures,
      tokenCount: this.estimateTokens(`${signature  } ${  description}`),
      preservedComments,
    };
  }

  /**
   * 生成类摘要
   */
  private summarizeClass(segment: CodeSegment, config: CompressionConfig): SummaryResult {
    const signature = this.extractClassSignature(segment.content);
    const description = this.extractDescription(segment.content);
    const dependencies = this.extractDependencies(segment.content);
    const keyFeatures = this.extractClassFeatures(segment.content);
    const preservedComments = config.preserveComments
      ? this.extractKeyComments(segment.content)
      : [];

    return {
      signature,
      description,
      dependencies,
      keyFeatures,
      tokenCount: this.estimateTokens(`${signature  } ${  description}`),
      preservedComments,
    };
  }

  /**
   * 生成接口摘要
   */
  private summarizeInterface(segment: CodeSegment, config: CompressionConfig): SummaryResult {
    const signature = segment.content.trim();
    const description = this.extractDescription(segment.content);
    const dependencies: string[] = [];
    const keyFeatures = this.extractInterfaceFeatures(segment.content);
    const preservedComments: string[] = [];

    return {
      signature,
      description,
      dependencies,
      keyFeatures,
      tokenCount: this.estimateTokens(signature),
      preservedComments,
    };
  }

  /**
   * 生成类型摘要
   */
  private summarizeType(segment: CodeSegment, config: CompressionConfig): SummaryResult {
    const signature = segment.content.trim();
    const description = this.extractDescription(segment.content);
    const dependencies: string[] = [];
    const keyFeatures: string[] = [];
    const preservedComments: string[] = [];

    return {
      signature,
      description,
      dependencies,
      keyFeatures,
      tokenCount: this.estimateTokens(signature),
      preservedComments,
    };
  }

  /**
   * 生成导入摘要
   */
  private summarizeImport(segment: CodeSegment, config: CompressionConfig): SummaryResult {
    const signature = segment.content.trim();
    const description = 'Import statement';
    const dependencies = this.extractImportDependencies(segment.content);
    const keyFeatures: string[] = [];
    const preservedComments: string[] = [];

    return {
      signature,
      description,
      dependencies,
      keyFeatures,
      tokenCount: this.estimateTokens(signature),
      preservedComments,
    };
  }

  /**
   * 生成测试摘要
   */
  private summarizeTest(segment: CodeSegment, config: CompressionConfig): SummaryResult {
    const signature = this.extractTestSignature(segment.content);
    const description = this.extractTestDescription(segment.content);
    const dependencies: string[] = [];
    const keyFeatures: string[] = [];
    const preservedComments: string[] = [];

    return {
      signature,
      description,
      dependencies,
      keyFeatures,
      tokenCount: this.estimateTokens(signature),
      preservedComments,
    };
  }

  /**
   * 生成通用摘要
   */
  private summarizeGeneric(segment: CodeSegment, config: CompressionConfig): SummaryResult {
    const signature = segment.content.substring(0, 100).trim();
    const description = 'Code segment';
    const dependencies: string[] = [];
    const keyFeatures: string[] = [];
    const preservedComments: string[] = [];

    return {
      signature,
      description,
      dependencies,
      keyFeatures,
      tokenCount: this.estimateTokens(signature),
      preservedComments,
    };
  }

  /**
   * 提取函数签名
   */
  private extractFunctionSignature(content: string): string {
    // 提取函数定义的第一行
    const lines = content.split('\n');
    let signature = '';
    let depth = 0;

    for (const line of lines) {
      signature += `${line  }\n`;
      depth += (line.match(/{/g) || []).length;
      depth -= (line.match(/}/g) || []).length;

      if (depth > 0 && line.includes('{')) {
        break;
      }
    }

    return signature.trim();
  }

  /**
   * 提取类签名
   */
  private extractClassSignature(content: string): string {
    const match = content.match(/class\s+\w+(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?\s*{/);
    return match ? match[0] : 'class';
  }

  /**
   * 提取描述
   */
  private extractDescription(content: string): string {
    // 查找JSDoc注释
    const jsdocMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
    if (jsdocMatch) {
      const lines = jsdocMatch[1]
        .split('\n')
        .map(line => line.replace(/^\s*\*\s?/, '').trim())
        .filter(line => line && !line.startsWith('@'));
      return lines.join(' ').substring(0, 200);
    }

    // 查找单行注释
    const commentMatch = content.match(/\/\/\s*(.+)/);
    if (commentMatch) {
      return commentMatch[1].trim().substring(0, 200);
    }

    return '';
  }

  /**
   * 提取依赖
   */
  private extractDependencies(content: string): string[] {
    const dependencies: Set<string> = new Set();

    // 提取导入的模块
    const importMatches = content.matchAll(/from\s+['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
      dependencies.add(match[1]);
    }

    // 提取使用的类型
    const typeMatches = content.matchAll(/:\s*(\w+)/g);
    for (const match of typeMatches) {
      if (!['string', 'number', 'boolean', 'void', 'any', 'unknown', 'null', 'undefined'].includes(match[1])) {
        dependencies.add(match[1]);
      }
    }

    return Array.from(dependencies);
  }

  /**
   * 提取导入依赖
   */
  private extractImportDependencies(content: string): string[] {
    const match = content.match(/from\s+['"]([^'"]+)['"]/);
    return match ? [match[1]] : [];
  }

  /**
   * 提取关键特性
   */
  private extractKeyFeatures(content: string): string[] {
    const features: string[] = [];

    // 检测异步函数
    if (content.includes('async ') || content.includes('await ')) {
      features.push('async');
    }

    // 检测返回类型
    const returnMatch = content.match(/:\s*(\w+)\s*=>/);
    if (returnMatch) {
      features.push(`returns ${returnMatch[1]}`);
    }

    // 检测参数数量
    const paramMatch = content.match(/\(([^)]*)\)/);
    if (paramMatch) {
      const params = paramMatch[1].split(',').filter(p => p.trim());
      if (params.length > 0) {
        features.push(`${params.length} params`);
      }
    }

    return features;
  }

  /**
   * 提取类特性
   */
  private extractClassFeatures(content: string): string[] {
    const features: string[] = [];

    // 检测继承
    const extendsMatch = content.match(/extends\s+(\w+)/);
    if (extendsMatch) {
      features.push(`extends ${extendsMatch[1]}`);
    }

    // 检测实现接口
    const implementsMatch = content.match(/implements\s+([\w,\s]+)/);
    if (implementsMatch) {
      features.push(`implements ${implementsMatch[1].trim()}`);
    }

    // 检测方法数量
    const methods = content.match(/(?:async\s+)?\w+\s*\([^)]*\)\s*{/g);
    if (methods) {
      features.push(`${methods.length} methods`);
    }

    return features;
  }

  /**
   * 提取接口特性
   */
  private extractInterfaceFeatures(content: string): string[] {
    const features: string[] = [];

    // 检测属性数量
    const properties = content.match(/\w+\s*:/g);
    if (properties) {
      features.push(`${properties.length} properties`);
    }

    return features;
  }

  /**
   * 提取关键注释
   */
  private extractKeyComments(content: string): string[] {
    const comments: string[] = [];

    // 提取JSDoc标签
    const tags = content.matchAll(/@(\w+)\s+(.+)/g);
    for (const match of tags) {
      comments.push(`@${match[1]} ${match[2].trim()}`);
    }

    // 提取TODO和FIXME
    const todos = content.matchAll(/(?:TODO|FIXME|HACK|XXX):\s*(.+)/g);
    for (const match of todos) {
      comments.push(match[0].trim());
    }

    return comments.slice(0, 5); // 限制数量
  }

  /**
   * 提取测试签名
   */
  private extractTestSignature(content: string): string {
    const match = content.match(/(?:describe|it|test)\s*\(\s*['"`]([^'"`]+)['"`]/);
    return match ? `${match[1]}` : 'Test case';
  }

  /**
   * 提取测试描述
   */
  private extractTestDescription(content: string): string {
    const match = content.match(/(?:describe|it|test)\s*\(\s*['"`]([^'"`]+)['"`]/);
    return match ? `Test: ${match[1]}` : 'Test case';
  }

  /**
   * 估算Token数量
   */
  private estimateTokens(text: string): number {
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    return Math.ceil(englishWords * 1.3 + chineseChars * 2);
  }
}
