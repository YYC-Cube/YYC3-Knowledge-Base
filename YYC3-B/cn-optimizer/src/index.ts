/**
 * @description YYC³-CN中文优化专用模块
 * @module @yyc3/cn-optimizer
 * 
 * 专为中文用户设计的AI优化工具集
 * 包含分词、提示词优化、本地化等功能
 */

import type {
  ChineseTokenizerConfig,
  TokenizeResult,
  PromptOptimizationConfig,
  OptimizedPrompt,
  LocalizationConfig,
  LocalizationResult,
  ChineseTextMetrics,
  ChineseNLPConfig,
} from './types.js';
import { ChineseTokenizer, globalTokenizer } from './tokenizer.js';
import { ChinesePromptOptimizer, globalPromptOptimizer } from './prompt.js';
import { ChineseLocalization, globalLocalization } from './localization.js';

export * from './types.js';
export * from './tokenizer.js';
export * from './prompt.js';
export * from './localization.js';

export interface ChineseOptimizerConfig {
  tokenizer?: Partial<ChineseTokenizerConfig>;
  prompt?: Partial<PromptOptimizationConfig>;
  localization?: Partial<LocalizationConfig>;
}

export class ChineseOptimizer {
  private tokenizer: ChineseTokenizer;
  private promptOptimizer: ChinesePromptOptimizer;
  private localization: ChineseLocalization;
  private initialized: boolean = false;

  constructor(config: ChineseOptimizerConfig = {}) {
    this.tokenizer = new ChineseTokenizer(config.tokenizer);
    this.promptOptimizer = new ChinesePromptOptimizer(config.prompt);
    this.localization = new ChineseLocalization(config.localization);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
  }

  tokenize(text: string): TokenizeResult {
    return this.tokenizer.tokenize(text);
  }

  countTokens(text: string): number {
    return this.tokenizer.countTokens(text);
  }

  extractKeywords(text: string, topN?: number): string[] {
    return this.tokenizer.extractKeywords(text, topN);
  }

  optimizePrompt(prompt: string): OptimizedPrompt {
    return this.promptOptimizer.optimize(prompt);
  }

  analyzeText(text: string): ChineseTextMetrics {
    return this.promptOptimizer.analyzeText(text);
  }

  generatePromptTemplate(type: string, params?: Record<string, string>): string {
    return this.promptOptimizer.generateTemplate(type, params);
  }

  localize(text: string): LocalizationResult {
    return this.localization.localize(text);
  }

  getSynonyms(word: string) {
    return this.localization.getSynonyms(word);
  }

  formatNumber(num: number, style?: 'default' | 'currency' | 'percent'): string {
    return this.localization.formatNumber(num, style);
  }

  formatDate(date: Date, format?: 'short' | 'medium' | 'long'): string {
    return this.localization.formatDate(date, format);
  }

  formatRelativeTime(date: Date): string {
    return this.localization.formatRelativeTime(date);
  }

  process(text: string, options: {
    tokenize?: boolean;
    optimizePrompt?: boolean;
    localize?: boolean;
    extractKeywords?: boolean;
    analyze?: boolean;
  } = {}): {
    tokens?: TokenizeResult;
    optimizedPrompt?: OptimizedPrompt;
    localized?: LocalizationResult;
    keywords?: string[];
    metrics?: ChineseTextMetrics;
  } {
    const result: ReturnType<ChineseOptimizer['process']> = {};

    if (options.tokenize) {
      result.tokens = this.tokenize(text);
    }

    if (options.optimizePrompt) {
      result.optimizedPrompt = this.optimizePrompt(text);
    }

    if (options.localize) {
      result.localized = this.localize(text);
    }

    if (options.extractKeywords) {
      result.keywords = this.extractKeywords(text);
    }

    if (options.analyze) {
      result.metrics = this.analyzeText(text);
    }

    return result;
  }

  getTokenizer(): ChineseTokenizer {
    return this.tokenizer;
  }

  getPromptOptimizer(): ChinesePromptOptimizer {
    return this.promptOptimizer;
  }

  getLocalization(): ChineseLocalization {
    return this.localization;
  }
}

export const globalChineseOptimizer = new ChineseOptimizer();

export function createChineseOptimizer(config?: ChineseOptimizerConfig): ChineseOptimizer {
  return new ChineseOptimizer(config);
}

export function optimizeForChinese(text: string): {
  tokens: TokenizeResult;
  optimized: OptimizedPrompt;
  metrics: ChineseTextMetrics;
} {
  const optimizer = globalChineseOptimizer;
  
  return {
    tokens: optimizer.tokenize(text),
    optimized: optimizer.optimizePrompt(text),
    metrics: optimizer.analyzeText(text),
  };
}

export const CN_OPTIMIZER_VERSION = '1.0.0';

export const CHINESE_SUPPORT = {
  tokenizer: true,
  promptOptimization: true,
  localization: true,
  synonymLookup: true,
  textAnalysis: true,
  numberFormatting: true,
  dateFormatting: true,
  keywordExtraction: true,
} as const;
