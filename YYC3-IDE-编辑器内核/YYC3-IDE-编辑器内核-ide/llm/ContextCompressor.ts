/**
 * @file: llm/ContextCompressor.ts
 * @description: 智能压缩算法 - 核心压缩引擎
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: llm,compression,algorithm,engine
 */

import {
  CompressionResult,
  CompressionQuality,
  CompressionConfig,
  CompressionStrategyType,
  CompressionStats,
  CodeSegment,
  SegmentImportance,
  SummaryResult,
  DEFAULT_COMPRESSION_CONFIG,
} from './ContextCompressionTypes';
import { CompressionStrategyDesigner } from './CompressionStrategy';
import { ContentSummarizer } from './ContentSummarizer';

/**
 * 上下文压缩器
 */
export class ContextCompressor {
  private strategyDesigner: CompressionStrategyDesigner;
  private summarizer: ContentSummarizer;
  private stats: CompressionStats;

  constructor(private config: CompressionConfig = DEFAULT_COMPRESSION_CONFIG) {
    this.strategyDesigner = new CompressionStrategyDesigner();
    this.summarizer = new ContentSummarizer();
    this.stats = this.initStats();
  }

  /**
   * 压缩代码内容
   */
  compress(content: string, language?: string): CompressionResult {
    const startTime = Date.now();

    // 1. 估算原始Token数
    const originalTokens = this.estimateTokens(content);

    // 2. 小文件不压缩
    if (content.length < this.config.minFileSize) {
      return this.createNoCompressionResult(content, originalTokens, startTime);
    }

    // 3. 选择压缩策略
    const strategy = this.strategyDesigner.selectStrategy(
      content,
      originalTokens,
      this.config
    );

    // 4. 不压缩策略
    if (strategy.type === CompressionStrategyType.NONE) {
      return this.createNoCompressionResult(content, originalTokens, startTime);
    }

    // 5. 分析代码段
    const segments = this.strategyDesigner.analyzeCode(content, language);

    // 6. 确定重要性
    for (const segment of segments) {
      segment.importance = this.strategyDesigner.determineImportance(segment, this.config);
    }

    // 7. 生成摘要
    const summaries = this.generateSummaries(segments);

    // 8. 压缩代码
    const compressed = this.applyCompression(segments, summaries, strategy);

    // 9. 估算压缩后Token数
    const compressedTokens = this.estimateTokens(compressed);

    // 10. 计算压缩率
    const compressionRatio = originalTokens > 0
      ? (1 - compressedTokens / originalTokens) * 100
      : 0;

    // 11. 评估压缩质量
    const quality = this.evaluateQuality(content, compressed, segments);

    // 12. 更新统计
    this.updateStats(compressionRatio, Date.now() - startTime, strategy.type);

    // 13. 返回结果
    return {
      original: content,
      compressed,
      originalTokens,
      compressedTokens,
      compressionRatio,
      strategy: strategy.type,
      segments,
      summaries,
      processingTime: Date.now() - startTime,
      quality,
    };
  }

  /**
   * 批量压缩
   */
  compressBatch(
    files: Array<{ content: string; path: string; language?: string }>
  ): CompressionResult[] {
    return files.map(file => this.compress(file.content, file.language));
  }

  /**
   * 获取统计信息
   */
  getStats(): CompressionStats {
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = this.initStats();
  }

  /**
   * 生成摘要
   */
  private generateSummaries(segments: CodeSegment[]): Map<string, SummaryResult> {
    const summaries = new Map<string, SummaryResult>();

    for (const segment of segments) {
      if (this.config.enableSummarization) {
        const summary = this.summarizer.summarize(segment, this.config);
        summaries.set(`${segment.startLine}-${segment.endLine}`, summary);
      }
    }

    return summaries;
  }

  /**
   * 应用压缩
   */
  private applyCompression(
    segments: CodeSegment[],
    summaries: Map<string, SummaryResult>,
    strategy: any
  ): string {
    const compressedParts: string[] = [];
    let currentTokens = 0;

    // 按重要性排序
    const sortedSegments = [...segments].sort((a, b) => {
      const importanceOrder = {
        [SegmentImportance.CRITICAL]: 0,
        [SegmentImportance.HIGH]: 1,
        [SegmentImportance.MEDIUM]: 2,
        [SegmentImportance.LOW]: 3,
        [SegmentImportance.OPTIONAL]: 4,
      };
      return importanceOrder[a.importance] - importanceOrder[b.importance];
    });

    for (const segment of sortedSegments) {
      // 检查Token限制
      const segmentTokens = this.estimateTokens(segment.content);
      if (currentTokens + segmentTokens > strategy.maxTokenLimit) {
        // 尝试使用摘要
        if (this.config.enableSummarization) {
          const summary = summaries.get(`${segment.startLine}-${segment.endLine}`);
          if (summary) {
            const summaryTokens = summary.tokenCount;
            if (currentTokens + summaryTokens <= strategy.maxTokenLimit) {
              compressedParts.push(`// [Summary] ${summary.signature}`);
              if (summary.description) {
                compressedParts.push(`// ${summary.description}`);
              }
              currentTokens += summaryTokens;
              continue;
            }
          }
        }
        break; // 达到限制
      }

      // 检查是否应该跳过
      if (this.shouldSkipSegment(segment, strategy)) {
        continue;
      }

      // 添加代码段
      let part = segment.content;

      // 删除注释（如果策略要求）
      if (!strategy.preserveComments && segment.type !== 'comment') {
        part = this.removeComments(part);
      }

      // 压缩空行
      if (!strategy.preserveStructure) {
        part = this.compressWhitespace(part);
      }

      compressedParts.push(part);
      currentTokens += this.estimateTokens(part);
    }

    return compressedParts.join('\n\n');
  }

  /**
   * 检查是否应该跳过代码段
   */
  private shouldSkipSegment(segment: CodeSegment, strategy: any): boolean {
    // 测试代码
    if (segment.type === 'test' && !strategy.preserveTests) {
      return segment.importance === SegmentImportance.LOW;
    }

    // 注释
    if (segment.type === 'comment' && !strategy.preserveComments) {
      return true;
    }

    // 配置代码
    if (segment.type === 'config' && !strategy.preserveConfig) {
      return segment.importance === SegmentImportance.MEDIUM;
    }

    // 可选代码
    if (segment.importance === SegmentImportance.OPTIONAL) {
      return strategy.type === CompressionStrategyType.AGGRESSIVE;
    }

    return false;
  }

  /**
   * 删除注释
   */
  private removeComments(code: string): string {
    // 删除单行注释
    let result = code.replace(/\/\/.*$/gm, '');

    // 删除多行注释
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');

    return result;
  }

  /**
   * 压缩空行
   */
  private compressWhitespace(code: string): string {
    // 删除多余空行
    let result = code.replace(/\n\s*\n\s*\n/g, '\n\n');

    // 删除行尾空格
    result = result.replace(/[ \t]+$/gm, '');

    return result;
  }

  /**
   * 评估压缩质量
   */
  private evaluateQuality(
    original: string,
    compressed: string,
    segments: CodeSegment[]
  ): CompressionQuality {
    // 检查结构保留
    const structurePreserved = this.checkStructurePreserved(original, compressed);

    // 检查关键信息保留
    const keyInfoPreserved = this.checkKeyInfoPreserved(segments, compressed);

    // 计算可读性
    const readability = this.calculateReadability(compressed);

    // 计算完整性
    const completeness = this.calculateCompleteness(segments, compressed);

    // 计算信息损失
    const informationLoss = this.calculateInformationLoss(original, compressed);

    return {
      structurePreserved,
      keyInfoPreserved,
      readability,
      completeness,
      informationLoss,
    };
  }

  /**
   * 检查结构是否保留
   */
  private checkStructurePreserved(original: string, compressed: string): boolean {
    // 检查主要结构元素
    const structures = ['function', 'class', 'interface', 'type', 'import', 'export'];

    for (const structure of structures) {
      const originalCount = (original.match(new RegExp(`\\b${structure}\\b`, 'g')) || []).length;
      const compressedCount = (compressed.match(new RegExp(`\\b${structure}\\b`, 'g')) || []).length;

      // 允许一定损失，但至少保留70%
      if (compressedCount < originalCount * 0.7) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查关键信息是否保留
   */
  private checkKeyInfoPreserved(segments: CodeSegment[], compressed: string): boolean {
    // 检查关键代码段
    const criticalSegments = segments.filter(
      s => s.importance === SegmentImportance.CRITICAL || s.importance === SegmentImportance.HIGH
    );

    for (const segment of criticalSegments) {
      // 检查签名是否保留
      if (segment.signature && !compressed.includes(segment.signature)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 计算可读性
   */
  private calculateReadability(code: string): number {
    let score = 100;

    // 检查缩进
    const lines = code.split('\n');
    const indentScore = lines.filter(line => {
      if (line.trim().length === 0) return true;
      return line.startsWith('  ') || line.startsWith('\t');
    }).length / lines.length;
    score *= indentScore;

    // 检查行长度
    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
    if (avgLineLength > 100) {
      score *= 0.9;
    }

    // 检查空行比例
    const emptyLineRatio = lines.filter(line => line.trim().length === 0).length / lines.length;
    if (emptyLineRatio > 0.3) {
      score *= 0.9;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算完整性
   */
  private calculateCompleteness(segments: CodeSegment[], compressed: string): number {
    const totalImportance = segments.reduce((sum, s) => {
      const weights = {
        [SegmentImportance.CRITICAL]: 10,
        [SegmentImportance.HIGH]: 7,
        [SegmentImportance.MEDIUM]: 4,
        [SegmentImportance.LOW]: 2,
        [SegmentImportance.OPTIONAL]: 1,
      };
      return sum + weights[s.importance];
    }, 0);

    const preservedImportance = segments.reduce((sum, s) => {
      if (compressed.includes(s.signature || s.content.substring(0, 50))) {
        const weights = {
          [SegmentImportance.CRITICAL]: 10,
          [SegmentImportance.HIGH]: 7,
          [SegmentImportance.MEDIUM]: 4,
          [SegmentImportance.LOW]: 2,
          [SegmentImportance.OPTIONAL]: 1,
        };
        return sum + weights[s.importance];
      }
      return sum;
    }, 0);

    return totalImportance > 0 ? (preservedImportance / totalImportance) * 100 : 0;
  }

  /**
   * 计算信息损失
   */
  private calculateInformationLoss(original: string, compressed: string): number {
    const originalTokens = this.estimateTokens(original);
    const compressedTokens = this.estimateTokens(compressed);
    return originalTokens > 0 ? ((originalTokens - compressedTokens) / originalTokens) * 100 : 0;
  }

  /**
   * 估算Token数量
   */
  private estimateTokens(text: string): number {
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    return Math.ceil(englishWords * 1.3 + chineseChars * 2);
  }

  /**
   * 创建不压缩的结果
   */
  private createNoCompressionResult(
    content: string,
    tokens: number,
    startTime: number
  ): CompressionResult {
    return {
      original: content,
      compressed: content,
      originalTokens: tokens,
      compressedTokens: tokens,
      compressionRatio: 0,
      strategy: CompressionStrategyType.NONE,
      segments: [],
      summaries: new Map(),
      processingTime: Date.now() - startTime,
      quality: {
        structurePreserved: true,
        keyInfoPreserved: true,
        readability: 100,
        completeness: 100,
        informationLoss: 0,
      },
    };
  }

  /**
   * 初始化统计
   */
  private initStats(): CompressionStats {
    return {
      totalFiles: 0,
      compressedFiles: 0,
      totalOriginalTokens: 0,
      totalCompressedTokens: 0,
      averageCompressionRatio: 0,
      averageProcessingTime: 0,
      strategyDistribution: new Map(),
    };
  }

  /**
   * 更新统计
   */
  private updateStats(
    compressionRatio: number,
    processingTime: number,
    strategy: CompressionStrategyType
  ): void {
    this.stats.totalFiles++;

    if (compressionRatio > 0) {
      this.stats.compressedFiles++;
    }

    // 更新平均值
    const n = this.stats.totalFiles;
    this.stats.averageCompressionRatio =
      (this.stats.averageCompressionRatio * (n - 1) + compressionRatio) / n;
    this.stats.averageProcessingTime =
      (this.stats.averageProcessingTime * (n - 1) + processingTime) / n;

    // 更新策略分布
    const count = this.stats.strategyDistribution.get(strategy) || 0;
    this.stats.strategyDistribution.set(strategy, count + 1);
  }
}
