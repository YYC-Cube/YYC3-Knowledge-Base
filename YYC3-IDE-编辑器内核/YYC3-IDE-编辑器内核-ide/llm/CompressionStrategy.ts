/**
 * @file: llm/CompressionStrategy.ts
 * @description: 压缩策略设计 - 识别关键代码段、注释、测试、配置
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: llm,compression,strategy,analysis
 */

import {
  CodeSegment,
  CodeSegmentType,
  SegmentImportance,
  CompressionStrategy,
  CompressionStrategyType,
  CompressionConfig,
} from './ContextCompressionTypes';

/**
 * 压缩策略设计器
 */
export class CompressionStrategyDesigner {
  private readonly patterns = {
    function: /(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)|class\s+\w+.*\{)/g,
    import: /^import\s+.*?from\s+['"].*['"]/gm,
    export: /^export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type)/gm,
    comment: /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
    test: /(?:describe|it|test)\s*\(\s*['"`].*['"`]/gm,
    config: /(?:config|Config|CONFIG)\s*[=:]/gm,
    interface: /interface\s+\w+\s*\{[^}]*\}/g,
    type: /type\s+\w+\s*=\s*[^;]+;/g,
  };

  /**
   * 分析代码内容，识别代码段
   */
  analyzeCode(content: string, language?: string): CodeSegment[] {
    const segments: CodeSegment[] = [];
    const lines = content.split('\n');

    // 1. 识别导入语句
    this.extractImports(content, lines, segments);

    // 2. 识别导出语句
    this.extractExports(content, lines, segments);

    // 3. 识别函数和类
    this.extractFunctionsAndClasses(content, lines, segments);

    // 4. 识别接口和类型
    this.extractInterfacesAndTypes(content, lines, segments);

    // 5. 识别注释
    this.extractComments(content, lines, segments);

    // 6. 识别测试代码
    this.extractTestCode(content, lines, segments);

    // 7. 识别配置代码
    this.extractConfigCode(content, lines, segments);

    // 8. 填充其他内容
    this.fillGaps(content, lines, segments);

    return segments.sort((a, b) => a.startLine - b.startLine);
  }

  /**
   * 确定代码段重要性
   */
  determineImportance(
    segment: CodeSegment,
    config: CompressionConfig
  ): SegmentImportance {
    // 关键代码：函数、类、接口、类型定义
    if (
      segment.type === CodeSegmentType.FUNCTION ||
      segment.type === CodeSegmentType.CLASS ||
      segment.type === CodeSegmentType.INTERFACE ||
      segment.type === CodeSegmentType.TYPE
    ) {
      // 检查是否是主函数或关键API
      if (this.isCriticalFunction(segment)) {
        return SegmentImportance.CRITICAL;
      }
      return SegmentImportance.HIGH;
    }

    // 导入导出语句
    if (segment.type === CodeSegmentType.IMPORT || segment.type === CodeSegmentType.EXPORT) {
      return SegmentImportance.HIGH;
    }

    // 配置代码
    if (segment.type === CodeSegmentType.CONFIG) {
      return config.preserveConfig ? SegmentImportance.HIGH : SegmentImportance.MEDIUM;
    }

    // 测试代码
    if (segment.type === CodeSegmentType.TEST) {
      return config.preserveTests ? SegmentImportance.MEDIUM : SegmentImportance.LOW;
    }

    // 注释
    if (segment.type === CodeSegmentType.COMMENT) {
      // 检查是否是文档注释
      if (this.isDocumentationComment(segment)) {
        return config.preserveComments ? SegmentImportance.MEDIUM : SegmentImportance.LOW;
      }
      return SegmentImportance.OPTIONAL;
    }

    return SegmentImportance.MEDIUM;
  }

  /**
   * 选择压缩策略
   */
  selectStrategy(
    content: string,
    tokenCount: number,
    config: CompressionConfig
  ): CompressionStrategy {
    // 小文件不压缩
    if (content.length < config.minFileSize || tokenCount < config.maxTokenLimit * 0.5) {
      return this.createStrategy(CompressionStrategyType.NONE, config);
    }

    // 指定策略
    if (config.strategy !== CompressionStrategyType.INTELLIGENT) {
      return this.createStrategy(config.strategy, config);
    }

    // 智能选择策略
    const segments = this.analyzeCode(content);
    const criticalRatio = this.calculateCriticalRatio(segments);
    const testRatio = this.calculateTestRatio(segments);
    const commentRatio = this.calculateCommentRatio(segments);

    // 根据内容特征选择策略
    if (criticalRatio > 0.6) {
      // 大部分是关键代码，轻度压缩
      return this.createStrategy(CompressionStrategyType.LIGHT, config);
    } else if (testRatio > 0.5) {
      // 大部分是测试代码，激进压缩
      return this.createStrategy(CompressionStrategyType.AGGRESSIVE, config);
    } else if (commentRatio > 0.3) {
      // 大量注释，中度压缩
      return this.createStrategy(CompressionStrategyType.MODERATE, config);
    } else {
      // 默认中度压缩
      return this.createStrategy(CompressionStrategyType.MODERATE, config);
    }
  }

  /**
   * 创建压缩策略
   */
  private createStrategy(
    type: CompressionStrategyType,
    config: CompressionConfig
  ): CompressionStrategy {
    const strategies: Record<CompressionStrategyType, Omit<CompressionStrategy, 'type' | 'maxTokenLimit' | 'minCompressionRatio'>> = {
      [CompressionStrategyType.NONE]: {
        preserveStructure: true,
        preserveComments: true,
        preserveTests: true,
        preserveConfig: true,
      },
      [CompressionStrategyType.LIGHT]: {
        preserveStructure: true,
        preserveComments: false,
        preserveTests: true,
        preserveConfig: true,
      },
      [CompressionStrategyType.MODERATE]: {
        preserveStructure: true,
        preserveComments: false,
        preserveTests: false,
        preserveConfig: true,
      },
      [CompressionStrategyType.AGGRESSIVE]: {
        preserveStructure: false,
        preserveComments: false,
        preserveTests: false,
        preserveConfig: false,
      },
      [CompressionStrategyType.INTELLIGENT]: {
        preserveStructure: config.preserveStructure,
        preserveComments: config.preserveComments,
        preserveTests: config.preserveTests,
        preserveConfig: config.preserveConfig,
      },
    };

    return {
      type,
      maxTokenLimit: config.maxTokenLimit,
      minCompressionRatio: type === CompressionStrategyType.NONE ? 0 : 0.3,
      ...strategies[type],
    };
  }

  /**
   * 提取导入语句
   */
  private extractImports(content: string, lines: string[], segments: CodeSegment[]): void {
    let match;
    while ((match = this.patterns.import.exec(content)) !== null) {
      const startLine = this.getLineNumber(content, match.index);
      const endLine = this.getLineNumber(content, match.index + match[0].length);

      segments.push({
        type: CodeSegmentType.IMPORT,
        content: match[0],
        startLine,
        endLine,
        importance: SegmentImportance.HIGH,
        tokenCount: this.estimateTokens(match[0]),
      });
    }
  }

  /**
   * 提取导出语句
   */
  private extractExports(content: string, lines: string[], segments: CodeSegment[]): void {
    let match;
    while ((match = this.patterns.export.exec(content)) !== null) {
      const startLine = this.getLineNumber(content, match.index);
      const endLine = this.getLineNumber(content, match.index + match[0].length);

      segments.push({
        type: CodeSegmentType.EXPORT,
        content: match[0],
        startLine,
        endLine,
        importance: SegmentImportance.HIGH,
        tokenCount: this.estimateTokens(match[0]),
      });
    }
  }

  /**
   * 提取函数和类
   */
  private extractFunctionsAndClasses(content: string, lines: string[], segments: CodeSegment[]): void {
    let match;
    while ((match = this.patterns.function.exec(content)) !== null) {
      const startLine = this.getLineNumber(content, match.index);

      // 简单的函数体识别（需要更精确的解析器）
      const block = this.extractBlock(content, match.index);
      const endLine = this.getLineNumber(content, match.index + block.length);

      const type = match[0].startsWith('class') ? CodeSegmentType.CLASS : CodeSegmentType.FUNCTION;

      segments.push({
        type,
        content: block,
        startLine,
        endLine,
        importance: SegmentImportance.HIGH,
        tokenCount: this.estimateTokens(block),
        signature: match[0],
      });
    }
  }

  /**
   * 提取接口和类型
   */
  private extractInterfacesAndTypes(content: string, lines: string[], segments: CodeSegment[]): void {
    let match;
    while ((match = this.patterns.interface.exec(content)) !== null) {
      const startLine = this.getLineNumber(content, match.index);
      const endLine = this.getLineNumber(content, match.index + match[0].length);

      segments.push({
        type: CodeSegmentType.INTERFACE,
        content: match[0],
        startLine,
        endLine,
        importance: SegmentImportance.HIGH,
        tokenCount: this.estimateTokens(match[0]),
      });
    }

    while ((match = this.patterns.type.exec(content)) !== null) {
      const startLine = this.getLineNumber(content, match.index);
      const endLine = this.getLineNumber(content, match.index + match[0].length);

      segments.push({
        type: CodeSegmentType.TYPE,
        content: match[0],
        startLine,
        endLine,
        importance: SegmentImportance.HIGH,
        tokenCount: this.estimateTokens(match[0]),
      });
    }
  }

  /**
   * 提取注释
   */
  private extractComments(content: string, lines: string[], segments: CodeSegment[]): void {
    let match;
    while ((match = this.patterns.comment.exec(content)) !== null) {
      const startLine = this.getLineNumber(content, match.index);
      const endLine = this.getLineNumber(content, match.index + match[0].length);

      segments.push({
        type: CodeSegmentType.COMMENT,
        content: match[0],
        startLine,
        endLine,
        importance: SegmentImportance.OPTIONAL,
        tokenCount: this.estimateTokens(match[0]),
      });
    }
  }

  /**
   * 提取测试代码
   */
  private extractTestCode(content: string, lines: string[], segments: CodeSegment[]): void {
    let match;
    while ((match = this.patterns.test.exec(content)) !== null) {
      const startLine = this.getLineNumber(content, match.index);
      const block = this.extractBlock(content, match.index);
      const endLine = this.getLineNumber(content, match.index + block.length);

      segments.push({
        type: CodeSegmentType.TEST,
        content: block,
        startLine,
        endLine,
        importance: SegmentImportance.LOW,
        tokenCount: this.estimateTokens(block),
      });
    }
  }

  /**
   * 提取配置代码
   */
  private extractConfigCode(content: string, lines: string[], segments: CodeSegment[]): void {
    let match;
    while ((match = this.patterns.config.exec(content)) !== null) {
      const startLine = this.getLineNumber(content, match.index);
      const line = lines[startLine - 1] || '';
      const endLine = startLine;

      segments.push({
        type: CodeSegmentType.CONFIG,
        content: line,
        startLine,
        endLine,
        importance: SegmentImportance.MEDIUM,
        tokenCount: this.estimateTokens(line),
      });
    }
  }

  /**
   * 填充空白区域
   */
  private fillGaps(content: string, lines: string[], segments: CodeSegment[]): void {
    // 按行号排序
    segments.sort((a, b) => a.startLine - b.startLine);

    let lastEndLine = 0;
    const newSegments: CodeSegment[] = [];

    for (const segment of segments) {
      // 添加空白区域
      if (segment.startLine > lastEndLine + 1) {
        const gapContent = lines.slice(lastEndLine, segment.startLine - 1).join('\n');
        if (gapContent.trim()) {
          newSegments.push({
            type: CodeSegmentType.OTHER,
            content: gapContent,
            startLine: lastEndLine + 1,
            endLine: segment.startLine - 1,
            importance: SegmentImportance.MEDIUM,
            tokenCount: this.estimateTokens(gapContent),
          });
        }
      }

      newSegments.push(segment);
      lastEndLine = segment.endLine;
    }

    // 添加末尾空白
    if (lastEndLine < lines.length) {
      const gapContent = lines.slice(lastEndLine).join('\n');
      if (gapContent.trim()) {
        newSegments.push({
          type: CodeSegmentType.OTHER,
          content: gapContent,
          startLine: lastEndLine + 1,
          endLine: lines.length,
          importance: SegmentImportance.MEDIUM,
          tokenCount: this.estimateTokens(gapContent),
        });
      }
    }

    segments.length = 0;
    segments.push(...newSegments);
  }

  /**
   * 获取行号
   */
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * 提取代码块
   */
  private extractBlock(content: string, startIndex: number): string {
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let i = startIndex;

    while (i < content.length) {
      const char = content[i];

      // 处理字符串
      if ((char === '"' || char === "'" || char === '`') && content[i - 1] !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      // 计算括号
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            return content.substring(startIndex, i + 1);
          }
        }
      }

      i++;
    }

    // 未找到匹配的括号，返回一行
    const endLine = content.indexOf('\n', startIndex);
    return content.substring(startIndex, endLine !== -1 ? endLine : content.length);
  }

  /**
   * 估算Token数量
   */
  private estimateTokens(text: string): number {
    // 简单估算：英文单词数 * 1.3 + 中文字符数 * 2
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    return Math.ceil(englishWords * 1.3 + chineseChars * 2);
  }

  /**
   * 检查是否是关键函数
   */
  private isCriticalFunction(segment: CodeSegment): boolean {
    const signature = segment.signature?.toLowerCase() || '';
    const criticalPatterns = [
      'main', 'init', 'setup', 'render', 'mount', 'unmount',
      'constructor', 'handle', 'process', 'execute', 'run',
    ];
    return criticalPatterns.some(pattern => signature.includes(pattern));
  }

  /**
   * 检查是否是文档注释
   */
  private isDocumentationComment(segment: CodeSegment): boolean {
    const content = segment.content.trim();
    return content.startsWith('/**') || content.startsWith('*') || content.includes('@param') || content.includes('@returns');
  }

  /**
   * 计算关键代码比例
   */
  private calculateCriticalRatio(segments: CodeSegment[]): number {
    if (segments.length === 0) return 0;
    const criticalCount = segments.filter(
      s => s.importance === SegmentImportance.CRITICAL || s.importance === SegmentImportance.HIGH
    ).length;
    return criticalCount / segments.length;
  }

  /**
   * 计算测试代码比例
   */
  private calculateTestRatio(segments: CodeSegment[]): number {
    if (segments.length === 0) return 0;
    const testTokens = segments
      .filter(s => s.type === CodeSegmentType.TEST)
      .reduce((sum, s) => sum + s.tokenCount, 0);
    const totalTokens = segments.reduce((sum, s) => sum + s.tokenCount, 0);
    return totalTokens > 0 ? testTokens / totalTokens : 0;
  }

  /**
   * 计算注释比例
   */
  private calculateCommentRatio(segments: CodeSegment[]): number {
    if (segments.length === 0) return 0;
    const commentTokens = segments
      .filter(s => s.type === CodeSegmentType.COMMENT)
      .reduce((sum, s) => sum + s.tokenCount, 0);
    const totalTokens = segments.reduce((sum, s) => sum + s.tokenCount, 0);
    return totalTokens > 0 ? commentTokens / totalTokens : 0;
  }
}
