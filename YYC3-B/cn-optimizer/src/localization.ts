/**
 * @description YYC³-CN中文本地化模块
 * @module @yyc3/cn-optimizer/localization
 * 
 * 支持中英互译、术语本地化、文化适配
 */

import type {
  LocalizationConfig,
  LocalizationResult,
  ChineseSynonym,
} from './types.js';
import { TECHNICAL_TERMS } from './types.js';

const DEFAULT_CONFIG: LocalizationConfig = {
  sourceLocale: 'en-US',
  targetLocale: 'zh-CN',
  domain: 'general',
  formality: 'neutral',
};

export class ChineseLocalization {
  private config: LocalizationConfig;
  private customTerms: Map<string, string> = new Map();

  constructor(config: Partial<LocalizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeCustomTerms();
  }

  private initializeCustomTerms(): void {
    for (const [en, zh] of Object.entries(TECHNICAL_TERMS)) {
      this.customTerms.set(en.toLowerCase(), zh);
    }
  }

  localize(text: string): LocalizationResult {
    const notes: string[] = [];
    let localized = text;

    if (this.config.sourceLocale.startsWith('en') && this.config.targetLocale.startsWith('zh')) {
      const result = this.englishToChinese(localized);
      localized = result.text;
      notes.push(...result.notes);
    } else if (this.config.sourceLocale.startsWith('zh') && this.config.targetLocale.startsWith('en')) {
      const result = this.chineseToEnglish(localized);
      localized = result.text;
      notes.push(...result.notes);
    }

    localized = this.applyFormality(localized);

    const confidence = this.calculateConfidence(text, localized);

    return {
      original: text,
      localized,
      locale: this.config.targetLocale,
      confidence,
      notes,
    };
  }

  private englishToChinese(text: string): { text: string; notes: string[] } {
    const notes: string[] = [];
    let result = text;

    for (const [en, zh] of this.customTerms) {
      const regex = new RegExp(`\\b${en}\\b`, 'gi');
      if (regex.test(result)) {
        result = result.replace(regex, zh);
        notes.push(`术语本地化: ${en} → ${zh}`);
      }
    }

    result = result
      .replace(/\bAPI\b/g, 'API接口')
      .replace(/\bSDK\b/g, 'SDK工具包')
      .replace(/\bBug\b/g, '缺陷')
      .replace(/\bFeature\b/g, '功能')
      .replace(/\bIssue\b/g, '问题')
      .replace(/\bPull Request\b/g, '合并请求')
      .replace(/\bCommit\b/g, '提交')
      .replace(/\bBranch\b/g, '分支')
      .replace(/\bMerge\b/g, '合并')
      .replace(/\bDeploy\b/g, '部署')
      .replace(/\bDebug\b/g, '调试');

    return { text: result, notes };
  }

  private chineseToEnglish(text: string): { text: string; notes: string[] } {
    const notes: string[] = [];
    let result = text;

    const reverseTerms = new Map<string, string>();
    for (const [en, zh] of this.customTerms) {
      reverseTerms.set(zh, en);
    }

    for (const [zh, en] of reverseTerms) {
      if (result.includes(zh)) {
        result = result.replace(new RegExp(zh, 'g'), en);
        notes.push(`术语本地化: ${zh} → ${en}`);
      }
    }

    return { text: result, notes };
  }

  private applyFormality(text: string): string {
    if (this.config.formality === 'formal') {
      text = text.replace(/你/g, '您');
      text = text.replace(/帮忙/g, '协助');
      text = text.replace(/看看/g, '查看');
    } else if (this.config.formality === 'informal') {
      text = text.replace(/您/g, '你');
    }

    return text;
  }

  private calculateConfidence(original: string, localized: string): number {
    let confidence = 0.8;

    if (localized !== original) {
      confidence += 0.1;
    }

    const technicalTermCount = Array.from(this.customTerms.keys())
      .filter(term => original.toLowerCase().includes(term)).length;
    confidence += Math.min(0.1, technicalTermCount * 0.02);

    return Math.min(1, confidence);
  }

  addCustomTerm(source: string, target: string): void {
    this.customTerms.set(source.toLowerCase(), target);
  }

  removeCustomTerm(source: string): void {
    this.customTerms.delete(source.toLowerCase());
  }

  getSynonyms(word: string): ChineseSynonym | null {
    const synonymMap: Record<string, ChineseSynonym> = {
      '优化': {
        word: '优化',
        synonyms: ['改进', '提升', '完善', '改良'],
        context: ['性能优化', '代码优化', '流程优化'],
      },
      '实现': {
        word: '实现',
        synonyms: ['完成', '达成', '落实', '执行'],
        context: ['功能实现', '目标实现', '方案实现'],
      },
      '分析': {
        word: '分析',
        synonyms: ['解析', '研究', '探讨', '剖析'],
        context: ['数据分析', '问题分析', '需求分析'],
      },
      '处理': {
        word: '处理',
        synonyms: ['解决', '应对', '处置', '办理'],
        context: ['异常处理', '数据处理', '请求处理'],
      },
      '生成': {
        word: '生成',
        synonyms: ['创建', '产生', '构建', '制作'],
        context: ['代码生成', '报告生成', '文档生成'],
      },
    };

    return synonymMap[word] || null;
  }

  formatNumber(num: number, style: 'default' | 'currency' | 'percent' = 'default'): string {
    const formatter = new Intl.NumberFormat('zh-CN', {
      style,
      currency: style === 'currency' ? 'CNY' : undefined,
    });

    return formatter.format(num);
  }

  formatDate(date: Date, format: 'short' | 'medium' | 'long' = 'medium'): string {
    const options: Intl.DateTimeFormatOptions = {
      short: { year: 'numeric', month: 'numeric', day: 'numeric' },
      medium: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
    }[format];

    return new Intl.DateTimeFormat('zh-CN', options).format(date);
  }

  formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    if (days < 365) return `${Math.floor(days / 30)}个月前`;
    return `${Math.floor(days / 365)}年前`;
  }

  pluralize(count: number, singular: string, plural?: string): string {
    if (count === 1) return singular;
    return plural || singular;
  }

  updateConfig(config: Partial<LocalizationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const globalLocalization = new ChineseLocalization();

export function localizeText(
  text: string,
  config?: Partial<LocalizationConfig>
): LocalizationResult {
  const localizer = config ? new ChineseLocalization(config) : globalLocalization;
  return localizer.localize(text);
}

export function getChineseSynonyms(word: string): ChineseSynonym | null {
  return globalLocalization.getSynonyms(word);
}
