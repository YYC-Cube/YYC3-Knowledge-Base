// @ts-nocheck
/**
 * @file: IntentRecognitionEngine.ts
 * @description: 意图识别引擎 - 整合分类、特征提取、置信度计算的统一引擎
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: intent,engine,recognition,llm
 */

import {
  IntentType,
  IntentCandidate,
  IntentRecognitionResult,
  IntentRecognitionContext,
  IntentConflict,
  IntentSuggestion,
  IntentConfig,
  IntentStatistics,
  DEFAULT_INTENT_CONFIG,
  IntentCategory,
} from './IntentTypes';
import { IntentClassifier, getIntentClassifier } from './IntentClassifier';
import { IntentFeatureExtractor, getIntentFeatureExtractor } from './IntentFeatureExtractor';
import { getIntentConfidenceCalculator } from './IntentConfidenceCalculator';

/**
 * 意图识别引擎
 */
export class IntentRecognitionEngine {
  private classifier: IntentClassifier;
  private featureExtractor: IntentFeatureExtractor;
  private confidenceCalculator: ReturnType<typeof getIntentConfidenceCalculator>;
  private config: IntentConfig;
  private statistics: IntentStatistics;

  constructor(config: Partial<IntentConfig> = {}) {
    this.config = { ...DEFAULT_INTENT_CONFIG, ...config };
    this.classifier = getIntentClassifier(this.config);
    this.featureExtractor = getIntentFeatureExtractor();
    this.confidenceCalculator = getIntentConfidenceCalculator();

    this.statistics = {
      totalRecognitions: 0,
      byType: {} as Record<IntentType, number>,
      byCategory: {} as Record<IntentCategory, number>,
      averageConfidence: 0,
      averageProcessingTime: 0,
    };
  }

  /**
   * 识别意图
   */
  recognize(input: string, context?: Partial<IntentRecognitionContext>): IntentRecognitionResult {
    const startTime = Date.now();

    // 1. 分类意图
    let candidates = this.classifier.classify(input);

    // 2. 提取特征（增强候选）
    candidates = this.enhanceCandidates(candidates, input);

    // 3. 计算置信度
    if (this.config.enableMultiIntent) {
      candidates = this.confidenceCalculator.calculateConfidence(candidates);
    }

    // 4. 过滤低置信度候选
    candidates = candidates.filter(c => c.confidence >= this.config.confidenceThreshold);

    // 5. 限制候选数量
    candidates = candidates.slice(0, this.config.maxCandidates);

    // 构建结果
    const processingTime = Date.now() - startTime;
    const result: IntentRecognitionResult = {
      primaryIntent: candidates[0] || this.createUnknownIntent(),
      secondaryIntents: candidates.slice(1),
      allCandidates: candidates,
      context: {
        userInput: input,
        ...context,
      } as IntentRecognitionContext,
      timestamp: Date.now(),
      processingTime,
    };

    // 更新统计
    this.updateStatistics(result);

    return result;
  }

  /**
   * 增强候选意图（添加详细特征）
   */
  private enhanceCandidates(candidates: IntentCandidate[], input: string): IntentCandidate[] {
    // 提取全局特征
    const globalFeatures = this.featureExtractor.extract(input);

    return candidates.map(candidate => ({
      ...candidate,
      features: {
        ...candidate.features,
        // 合并全局特征
        entities: this.mergeEntities(candidate.features.entities, globalFeatures.entities),
        keywords: this.mergeKeywords(candidate.features.keywords, globalFeatures.keywords),
      },
    }));
  }

  /**
   * 合并实体
   */
  private mergeEntities(existing: any[], newEntities: any[]): any[] {
    const entityMap = new Map<string, any>();

    existing.forEach(e => {
      entityMap.set(`${e.type}:${e.value}`, e);
    });

    newEntities.forEach(e => {
      const key = `${e.type}:${e.value}`;
      if (!entityMap.has(key)) {
        entityMap.set(key, e);
      }
    });

    return Array.from(entityMap.values());
  }

  /**
   * 合并关键词
   */
  private mergeKeywords(existing: string[], newKeywords: string[]): string[] {
    return [...new Set([...existing, ...newKeywords])];
  }

  /**
   * 创建未知意图
   */
  private createUnknownIntent(): IntentCandidate {
    return {
      type: IntentType.UNKNOWN,
      confidence: 0,
      features: {
        keywords: [],
        context: [],
        codeSnippets: [],
        parameters: new Map(),
        entities: [],
      },
      reason: '未识别到明确意图',
    };
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(result: IntentRecognitionResult): void {
    this.statistics.totalRecognitions++;

    // 按类型统计
    const type = result.primaryIntent.type;
    this.statistics.byType[type] = (this.statistics.byType[type] || 0) + 1;

    // 计算平均置信度
    const totalConfidence = this.statistics.averageConfidence * (this.statistics.totalRecognitions - 1);
    this.statistics.averageConfidence = (totalConfidence + result.primaryIntent.confidence) / this.statistics.totalRecognitions;

    // 计算平均处理时间
    const totalTime = this.statistics.averageProcessingTime * (this.statistics.totalRecognitions - 1);
    this.statistics.averageProcessingTime = (totalTime + result.processingTime) / this.statistics.totalRecognitions;
  }

  /**
   * 检测冲突
   */
  detectConflicts(candidates: IntentCandidate[]): IntentConflict[] {
    if (!this.config.enableConflictDetection) {
      return [];
    }
    return this.confidenceCalculator.detectConflicts(candidates);
  }

  /**
   * 获取建议
   */
  getSuggestions(context?: Partial<{
    currentFile: string;
    projectType: string;
    recentIntents: IntentType[];
  }>): IntentSuggestion[] {
    if (!this.config.enableSuggestions) {
      return [];
    }
    return this.confidenceCalculator.getSuggestions(context);
  }

  /**
   * 快速识别（简化版）
   */
  quickRecognize(input: string): IntentType {
    const result = this.recognize(input);
    return result.primaryIntent.type;
  }

  /**
   * 批量识别
   */
  batchRecognize(inputs: string[]): IntentRecognitionResult[] {
    return inputs.map(input => this.recognize(input));
  }

  /**
   * 获取统计信息
   */
  getStatistics(): IntentStatistics {
    return { ...this.statistics };
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    this.statistics = {
      totalRecognitions: 0,
      byType: {} as Record<IntentType, number>,
      byCategory: {} as Record<IntentCategory, number>,
      averageConfidence: 0,
      averageProcessingTime: 0,
    };
    this.classifier.resetStatistics();
  }

  /**
   * 获取配置
   */
  getConfig(): IntentConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<IntentConfig>): void {
    this.config = { ...this.config, ...config };
    this.classifier.updateConfig(this.config);
  }

  /**
   * 添加自定义意图模式
   */
  addCustomPattern(pattern: any): void {
    this.classifier.addPattern(pattern);
  }

  /**
   * 生成详细报告
   */
  generateReport(result: IntentRecognitionResult): string {
    const report: string[] = [];

    report.push('=== 意图识别报告 ===\n');
    report.push(`用户输入: "${result.context.userInput}"`);
    report.push(`处理时间: ${result.processingTime}ms\n`);

    // 主要意图
    report.push(`主要意图: ${result.primaryIntent.type}`);
    report.push(`置信度: ${(result.primaryIntent.confidence * 100).toFixed(1)}%`);
    report.push(`理由: ${result.primaryIntent.reason}\n`);

    // 次要意图
    if (result.secondaryIntents.length > 0) {
      report.push('次要意图:');
      result.secondaryIntents.forEach((intent, i) => {
        report.push(`  ${i + 1}. ${intent.type} (${(intent.confidence * 100).toFixed(1)}%)`);
      });
      report.push('');
    }

    // 特征信息
    const features = result.primaryIntent.features;
    if (features.keywords.length > 0) {
      report.push(`关键词: ${features.keywords.join(', ')}`);
    }

    if (features.entities.length > 0) {
      report.push('识别实体:');
      features.entities.forEach(entity => {
        report.push(`  - ${entity.type}: ${entity.value} (${(entity.confidence * 100).toFixed(0)}%)`);
      });
    }

    if (features.codeSnippets.length > 0) {
      report.push(`代码片段: ${features.codeSnippets.length}个`);
    }

    // 冲突检测
    const conflicts = this.detectConflicts(result.allCandidates);
    if (conflicts.length > 0) {
      report.push('\n检测到意图冲突:');
      conflicts.forEach((conflict, i) => {
        report.push(`  ${i + 1}. ${conflict.intents.join(' vs ')}`);
        report.push(`     严重程度: ${conflict.severity}`);
        report.push(`     描述: ${conflict.description}`);
        report.push(`     建议: ${conflict.suggestion}`);
      });
    }

    return report.join('\n');
  }

  /**
   * 导出引擎状态
   */
  exportState(): {
    config: IntentConfig;
    statistics: IntentStatistics;
  } {
    return {
      config: this.getConfig(),
      statistics: this.getStatistics(),
    };
  }

  /**
   * 导入引擎状态
   */
  importState(state: {
    config?: Partial<IntentConfig>;
    statistics?: IntentStatistics;
  }): void {
    if (state.config) {
      this.updateConfig(state.config);
    }
    if (state.statistics) {
      this.statistics = state.statistics;
    }
  }
}

/**
 * 单例实例
 */
let instance: IntentRecognitionEngine | null = null;

/**
 * 获取单例实例
 */
export function getIntentRecognitionEngine(config?: Partial<IntentConfig>): IntentRecognitionEngine {
  if (!instance) {
    instance = new IntentRecognitionEngine(config);
  }
  return instance;
}

/**
 * 便捷函数：识别意图
 */
export function recognizeIntent(input: string, context?: Partial<IntentRecognitionContext>): IntentRecognitionResult {
  const engine = getIntentRecognitionEngine();
  return engine.recognize(input, context);
}

/**
 * 便捷函数：快速识别
 */
export function quickRecognizeIntent(input: string): IntentType {
  const engine = getIntentRecognitionEngine();
  return engine.quickRecognize(input);
}
