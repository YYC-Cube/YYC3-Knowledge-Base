/**
 * @description YYC³-CN中文提示词优化器
 * @module @yyc3/cn-optimizer/prompt
 * 
 * 专为中文用户设计的AI提示词优化
 */

import type {
  PromptOptimizationConfig,
  OptimizedPrompt,
  PromptImprovement,
  ChineseTextMetrics,
} from './types.js';
import { ChineseTokenizer } from './tokenizer.js';

const DEFAULT_CONFIG: PromptOptimizationConfig = {
  style: 'balanced',
  tone: 'neutral',
  clarity: 'balanced',
  context: 'general',
};

export class ChinesePromptOptimizer {
  private config: PromptOptimizationConfig;
  private tokenizer: ChineseTokenizer;

  constructor(config: Partial<PromptOptimizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tokenizer = new ChineseTokenizer();
  }

  optimize(prompt: string): OptimizedPrompt {
    const improvements: PromptImprovement[] = [];
    let optimized = prompt;

    const clarityImprovement = this.improveClarity(optimized);
    if (clarityImprovement.modified) {
      improvements.push(clarityImprovement.improvement);
      optimized = clarityImprovement.result;
    }

    const structureImprovement = this.improveStructure(optimized);
    if (structureImprovement.modified) {
      improvements.push(structureImprovement.improvement);
      optimized = structureImprovement.result;
    }

    const contextImprovement = this.addContext(optimized);
    if (contextImprovement.modified) {
      improvements.push(contextImprovement.improvement);
      optimized = contextImprovement.result;
    }

    const specificityImprovement = this.improveSpecificity(optimized);
    if (specificityImprovement.modified) {
      improvements.push(specificityImprovement.improvement);
      optimized = specificityImprovement.result;
    }

    const suggestions = this.generateSuggestions(prompt, optimized);

    return {
      original: prompt,
      optimized,
      improvements,
      estimatedQuality: this.estimateQuality(optimized),
      suggestions,
    };
  }

  private improveClarity(text: string): { result: string; modified: boolean; improvement: PromptImprovement } {
    let result = text;
    const improvements: string[] = [];

    result = result.replace(/那个/g, '');
    result = result.replace(/这个/g, '');
    result = result.replace(/其实/g, '');
    result = result.replace(/然后/g, '');
    result = result.replace(/所以/g, '');
    result = result.replace(/\s+/g, ' ').trim();

    if (result !== text) {
      return {
        result,
        modified: true,
        improvement: {
          type: 'clarity',
          description: '移除了冗余词汇，使表达更清晰',
          before: text,
          after: result,
        },
      };
    }

    return { result: text, modified: false, improvement: { type: 'clarity', description: '' } };
  }

  private improveStructure(text: string): { result: string; modified: boolean; improvement: PromptImprovement } {
    let result = text;
    let modified = false;

    if (!text.includes('\n') && text.length > 50) {
      const sentences = text.split(/[。！？]/);
      if (sentences.length > 2) {
        result = sentences.filter(s => s.trim()).join('。\n');
        modified = true;
      }
    }

    if (!text.startsWith('请') && !text.startsWith('帮我') && !text.startsWith('我需要')) {
      result = `请${result}`;
      modified = true;
    }

    if (modified) {
      return {
        result,
        modified: true,
        improvement: {
          type: 'structure',
          description: '优化了提示词结构，添加了明确的请求开头',
        },
      };
    }

    return { result: text, modified: false, improvement: { type: 'structure', description: '' } };
  }

  private addContext(text: string): { result: string; modified: boolean; improvement: PromptImprovement } {
    if (this.config.context === 'general') {
      return { result: text, modified: false, improvement: { type: 'context', description: '' } };
    }

    const contextPrefixes: Record<string, string> = {
      code: '在编程上下文中，',
      business: '在商业场景中，',
      academic: '在学术研究中，',
    };

    const prefix = contextPrefixes[this.config.context];
    if (prefix && !text.startsWith(prefix)) {
      return {
        result: prefix + text,
        modified: true,
        improvement: {
          type: 'context',
          description: `添加了${this.config.context}上下文信息`,
        },
      };
    }

    return { result: text, modified: false, improvement: { type: 'context', description: '' } };
  }

  private improveSpecificity(text: string): { result: string; modified: boolean; improvement: PromptImprovement } {
    let result = text;
    let modified = false;

    const vagueTerms: Record<string, string> = {
      '一些': '具体数量的',
      '很多': '大量的',
      '比较好': '更优的',
      '差不多': '接近',
      '还可以': '可接受的',
    };

    for (const [vague, specific] of Object.entries(vagueTerms)) {
      if (result.includes(vague)) {
        result = result.replace(new RegExp(vague, 'g'), specific);
        modified = true;
      }
    }

    if (modified) {
      return {
        result,
        modified: true,
        improvement: {
          type: 'specificity',
          description: '替换了模糊词汇，使表达更具体',
        },
      };
    }

    return { result: text, modified: false, improvement: { type: 'specificity', description: '' } };
  }

  private generateSuggestions(original: string, optimized: string): string[] {
    const suggestions: string[] = [];

    if (!original.includes('输出格式') && !original.includes('返回格式')) {
      suggestions.push('建议添加输出格式要求，例如："请以JSON格式返回结果"');
    }

    if (!original.includes('示例') && !original.includes('例子')) {
      suggestions.push('建议添加示例，帮助AI更好地理解需求');
    }

    if (!original.includes('约束') && !original.includes('限制') && !original.includes('要求')) {
      suggestions.push('建议添加约束条件，明确输出边界');
    }

    const metrics = this.analyzeText(optimized);
    if (metrics.complexityLevel === 'complex') {
      suggestions.push('提示词较复杂，建议拆分为多个子任务');
    }

    return suggestions;
  }

  private estimateQuality(text: string): number {
    let score = 50;

    if (text.length >= 20 && text.length <= 200) score += 10;
    if (text.includes('请')) score += 5;
    if (text.includes('输出') || text.includes('返回')) score += 10;
    if (text.includes('格式')) score += 5;
    if (text.includes('示例') || text.includes('例子')) score += 10;
    if (/[，。！？、]/.test(text)) score += 5;
    if (text.includes('\n')) score += 5;

    return Math.min(100, score);
  }

  analyzeText(text: string): ChineseTextMetrics {
    const tokens = this.tokenizer.tokenize(text);
    const sentences = text.split(/[。！？\n]/).filter(s => s.trim());
    const paragraphs = text.split('\n\n').filter(p => p.trim());

    const avgSentenceLength = sentences.length > 0
      ? sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
      : 0;

    const readabilityScore = this.calculateReadability(text, avgSentenceLength);

    let complexityLevel: ChineseTextMetrics['complexityLevel'] = 'simple';
    if (readabilityScore > 60) complexityLevel = 'moderate';
    if (readabilityScore > 80) complexityLevel = 'complex';

    return {
      characterCount: text.length,
      wordCount: tokens.tokenCount,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      avgSentenceLength,
      readabilityScore,
      complexityLevel,
    };
  }

  private calculateReadability(text: string, avgSentenceLength: number): number {
    let score = 0;

    score += Math.min(30, avgSentenceLength);
    score += Math.min(20, text.length / 10);
    score += (text.match(/[，、；：]/g) || []).length * 2;
    score += (text.match(/[如果因为虽然但是所以]/g) || []).length * 3;

    return Math.min(100, score);
  }

  generateTemplate(type: string, params: Record<string, string> = {}): string {
    const templates: Record<string, string> = {
      'code-review': `请对以下代码进行审查：
\`\`\`${params.language || 'javascript'}
${params.code || '// 在此粘贴代码'}
\`\`\`

请从以下方面进行分析：
1. 代码质量
2. 潜在问题
3. 优化建议
4. 安全风险`,

      'code-generation': `请生成${params.language || 'JavaScript'}代码，实现以下功能：
${params.description || '描述功能需求'}

要求：
- 代码风格：${params.style || 'clean'}
- 注释级别：${params.comments || 'moderate'}
- 错误处理：${params.errorHandling || 'comprehensive'}`,

      'translation': `请将以下内容翻译成${params.targetLang || '英文'}：
${params.text || '在此输入待翻译内容'}

翻译要求：
- 保持原文风格
- 专业术语准确
- 符合目标语言习惯`,

      'summary': `请总结以下内容：
${params.text || '在此输入待总结内容'}

总结要求：
- 字数限制：${params.maxLength || '200'}字以内
- 突出重点
- 逻辑清晰`,
    };

    return templates[type] || params.description || '请描述您的需求';
  }

  updateConfig(config: Partial<PromptOptimizationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const globalPromptOptimizer = new ChinesePromptOptimizer();

export function optimizeChinesePrompt(
  prompt: string,
  config?: Partial<PromptOptimizationConfig>
): OptimizedPrompt {
  const optimizer = config ? new ChinesePromptOptimizer(config) : globalPromptOptimizer;
  return optimizer.optimize(prompt);
}

export function analyzeChineseText(text: string): ChineseTextMetrics {
  return globalPromptOptimizer.analyzeText(text);
}
