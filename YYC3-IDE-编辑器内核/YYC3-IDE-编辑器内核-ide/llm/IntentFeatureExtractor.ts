/**
 * @file: IntentFeatureExtractor.ts
 * @description: 意图特征提取器 - 提取关键词、上下文、代码片段、参数和实体
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: intent,feature,extraction,llm
 */

import {
  IntentFeature,
  Entity,
  EntityType,
} from './IntentTypes';

/**
 * 实体模式定义
 */
const ENTITY_PATTERNS: Array<{
  type: EntityType;
  pattern: RegExp;
  confidence: number;
}> = [
  // 文件名
  {
    type: EntityType.FILE_NAME,
    pattern: /[\w\-/.]+\.(ts|tsx|js|jsx|py|java|go|rs|cpp|c|h|md|json|yaml|yml)/gi,
    confidence: 0.9,
  },
  // 函数名
  {
    type: EntityType.FUNCTION_NAME,
    pattern: /\b([a-z][a-zA-Z0-9]*)\s*\(/g,
    confidence: 0.7,
  },
  // 类名
  {
    type: EntityType.CLASS_NAME,
    pattern: /\b([A-Z][a-zA-Z0-9]*)\b/g,
    confidence: 0.6,
  },
  // 编程语言
  {
    type: EntityType.LANGUAGE,
    pattern: /\b(TypeScript|JavaScript|Python|Java|Go|Rust|C\+\+|C|PHP|Ruby|Swift|Kotlin)\b/gi,
    confidence: 0.95,
  },
  // 框架
  {
    type: EntityType.FRAMEWORK,
    pattern: /\b(React|Vue|Angular|Next\.js|Nuxt|Express|Django|Flask|Spring|Laravel)\b/gi,
    confidence: 0.9,
  },
  // 库
  {
    type: EntityType.LIBRARY,
    pattern: /\b(axios|lodash|moment|react-router|redux|vuex|mobx)\b/gi,
    confidence: 0.85,
  },
  // 错误类型
  {
    type: EntityType.ERROR_TYPE,
    pattern: /\b(Error|Exception|TypeError|ReferenceError|SyntaxError|RuntimeError)\b/g,
    confidence: 0.9,
  },
  // API端点
  {
    type: EntityType.API_ENDPOINT,
    pattern: /(\/api\/[\w\-/.]+|\/v\d+\/[\w\-/.]+)/gi,
    confidence: 0.85,
  },
  // 路径
  {
    type: EntityType.PATH,
    pattern: /(\/[\w\-/.]+|\.?\/[\w\-/.]+)/g,
    confidence: 0.7,
  },
  // URL
  {
    type: EntityType.URL,
    pattern: /https?:\/\/[^\s]+/gi,
    confidence: 0.95,
  },
  // 版本号
  {
    type: EntityType.VERSION,
    pattern: /\b\d+\.\d+(\.\d+)?\b/g,
    confidence: 0.8,
  },
];

/**
 * 意图特征提取器
 */
export class IntentFeatureExtractor {
  /**
   * 提取所有特征
   */
  extract(input: string): IntentFeature {
    return {
      keywords: this.extractKeywords(input),
      context: this.extractContext(input),
      codeSnippets: this.extractCodeSnippets(input),
      parameters: this.extractParameters(input),
      entities: this.extractEntities(input),
    };
  }

  /**
   * 提取关键词
   */
  extractKeywords(input: string): string[] {
    const keywords: string[] = [];

    // 移除停用词
    const stopWords = new Set([
      '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
      'can', 'could', 'may', 'might', 'must', 'shall', 'to', 'of', 'in',
      'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    ]);

    // 分词
    const words = input.split(/\s+|[，。！？、；：""''（）【】\[\]{}]/);

    // 过滤并收集关键词
    for (const word of words) {
      const trimmed = word.trim();
      if (trimmed && !stopWords.has(trimmed.toLowerCase()) && trimmed.length > 1) {
        keywords.push(trimmed);
      }
    }

    // 去重
    return [...new Set(keywords)];
  }

  /**
   * 提取上下文
   */
  extractContext(input: string): string[] {
    // 简单实现：提取名词短语
    const context: string[] = [];

    // 匹配引号内容
    const quotedPattern = /["']([^"']+)["']/g;
    let match;
    while ((match = quotedPattern.exec(input)) !== null) {
      context.push(match[1]);
    }

    // 匹配中文短语（2-6个字）
    const chinesePattern = /[\u4e00-\u9fa5]{2,6}/g;
    while ((match = chinesePattern.exec(input)) !== null) {
      context.push(match[0]);
    }

    // 匹配英文短语
    const englishPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    while ((match = englishPattern.exec(input)) !== null) {
      context.push(match[0]);
    }

    return [...new Set(context)];
  }

  /**
   * 提取代码片段
   */
  extractCodeSnippets(input: string): string[] {
    const snippets: string[] = [];

    // 匹配反引号内的代码
    const inlineCodePattern = /`([^`]+)`/g;
    let match;
    while ((match = inlineCodePattern.exec(input)) !== null) {
      snippets.push(match[1]);
    }

    // 匹配代码块
    const codeBlockPattern = /```[\s\S]*?```/g;
    while ((match = codeBlockPattern.exec(input)) !== null) {
      // 提取代码块内容（去除```标记）
      const code = match[0].replace(/```\w*\n?/g, '').replace(/```$/g, '');
      snippets.push(code);
    }

    // 匹配函数调用模式
    const functionPattern = /\b[a-zA-Z_]\w*\([^)]*\)/g;
    while ((match = functionPattern.exec(input)) !== null) {
      snippets.push(match[0]);
    }

    return [...new Set(snippets)];
  }

  /**
   * 提取参数
   */
  extractParameters(input: string): Map<string, any> {
    const parameters = new Map<string, any>();

    // 提取数字参数
    const numberPattern = /\b(\d+)\b/g;
    let match;
    while ((match = numberPattern.exec(input)) !== null) {
      if (!parameters.has('numbers')) {
        parameters.set('numbers', []);
      }
      parameters.get('numbers').push(parseInt(match[1]));
    }

    // 提取布尔参数
    const boolPattern = /\b(true|false|yes|no|是|否)\b/gi;
    while ((match = boolPattern.exec(input)) !== null) {
      const value = ['true', 'yes', '是'].includes(match[1].toLowerCase());
      if (!parameters.has('booleans')) {
        parameters.set('booleans', []);
      }
      parameters.get('booleans').push(value);
    }

    // 提取选项参数
    const optionPattern = /--?(\w+)(?:\s*[=:]\s*(\S+))?/g;
    while ((match = optionPattern.exec(input)) !== null) {
      const key = match[1];
      const value = match[2] || true;
      parameters.set(key, value);
    }

    return parameters;
  }

  /**
   * 提取实体
   */
  extractEntities(input: string): Entity[] {
    const entities: Entity[] = [];

    for (const { type, pattern, confidence } of ENTITY_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);

      while ((match = regex.exec(input)) !== null) {
        const value = match[0];
        const position = [match.index, match.index + value.length];

        entities.push({
          type,
          value,
          position: position as [number, number],
          confidence,
        });
      }
    }

    // 按位置排序
    entities.sort((a, b) => a.position[0] - b.position[0]);

    // 去重
    const seen = new Set<string>();
    const uniqueEntities: Entity[] = [];
    for (const entity of entities) {
      const key = `${entity.type}:${entity.value}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueEntities.push(entity);
      }
    }

    return uniqueEntities;
  }

  /**
   * 提取特定类型的实体
   */
  extractEntitiesByType(input: string, type: EntityType): Entity[] {
    const allEntities = this.extractEntities(input);
    return allEntities.filter(entity => entity.type === type);
  }

  /**
   * 获取主要实体
   */
  getPrimaryEntities(entities: Entity[]): Entity[] {
    // 按置信度排序
    const sorted = [...entities].sort((a, b) => b.confidence - a.confidence);

    // 返回置信度最高的前3个
    return sorted.slice(0, 3);
  }

  /**
   * 提取文件相关实体
   */
  extractFileEntities(input: string): Entity[] {
    return this.extractEntitiesByType(input, EntityType.FILE_NAME);
  }

  /**
   * 提取语言相关实体
   */
  extractLanguageEntities(input: string): Entity[] {
    const languages: Entity[] = [];

    // 编程语言
    languages.push(...this.extractEntitiesByType(input, EntityType.LANGUAGE));

    // 框架
    languages.push(...this.extractEntitiesByType(input, EntityType.FRAMEWORK));

    // 库
    languages.push(...this.extractEntitiesByType(input, EntityType.LIBRARY));

    return languages;
  }
}

/**
 * 单例实例
 */
let instance: IntentFeatureExtractor | null = null;

/**
 * 获取单例实例
 */
export function getIntentFeatureExtractor(): IntentFeatureExtractor {
  if (!instance) {
    instance = new IntentFeatureExtractor();
  }
  return instance;
}
