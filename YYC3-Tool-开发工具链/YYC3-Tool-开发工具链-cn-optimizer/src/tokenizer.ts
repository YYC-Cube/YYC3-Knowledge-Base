/**
 * @description YYC³-CN中文分词器
 * @module @yyc3/cn-optimizer/tokenizer
 * 
 * 高效的中文分词和Token计数
 */

import type {
  ChineseTokenizerConfig,
  TokenizeResult,
  Token,
} from './types.js';
import { CHINESE_PUNCTUATION, CHINESE_STOP_WORDS } from './types.js';

const DEFAULT_CONFIG: ChineseTokenizerConfig = {
  mode: 'mixed',
  preservePunctuation: true,
  preserveNumbers: true,
  preserveEnglish: true,
};

export class ChineseTokenizer {
  private config: ChineseTokenizerConfig;
  private customDictionary: Set<string>;

  constructor(config: Partial<ChineseTokenizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.customDictionary = new Set(config.customDictionary || []);
  }

  tokenize(text: string): TokenizeResult {
    const tokens = this.splitText(text);
    const estimatedTokens = this.estimateTokens(tokens);

    return {
      tokens,
      original: text,
      tokenCount: tokens.length,
      characterCount: text.length,
      estimatedTokens,
    };
  }

  private splitText(text: string): Token[] {
    const tokens: Token[] = [];
    let currentPos = 0;

    while (currentPos < text.length) {
      const char = text[currentPos];
      const nextChar = text[currentPos + 1];

      if (this.isChinese(char)) {
        const result = this.extractChinese(text, currentPos);
        tokens.push(result.token);
        currentPos = result.endPos;
      } else if (this.isEnglish(char)) {
        const result = this.extractEnglish(text, currentPos);
        tokens.push(result.token);
        currentPos = result.endPos;
      } else if (this.isNumber(char)) {
        const result = this.extractNumber(text, currentPos);
        tokens.push(result.token);
        currentPos = result.endPos;
      } else if (this.isPunctuation(char)) {
        if (this.config.preservePunctuation) {
          tokens.push({
            text: char,
            type: 'punctuation',
            position: { start: currentPos, end: currentPos + 1 },
          });
        }
        currentPos++;
      } else {
        tokens.push({
          text: char,
          type: 'unknown',
          position: { start: currentPos, end: currentPos + 1 },
        });
        currentPos++;
      }
    }

    return tokens;
  }

  private extractChinese(text: string, startPos: number): { token: Token; endPos: number } {
    let endPos = startPos;
    
    while (endPos < text.length && this.isChinese(text[endPos])) {
      endPos++;
    }

    const chineseText = text.slice(startPos, endPos);
    
    return {
      token: {
        text: chineseText,
        type: 'chinese',
        position: { start: startPos, end: endPos },
      },
      endPos,
    };
  }

  private extractEnglish(text: string, startPos: number): { token: Token; endPos: number } {
    let endPos = startPos;
    
    while (endPos < text.length && this.isEnglish(text[endPos])) {
      endPos++;
    }

    const englishText = text.slice(startPos, endPos);
    
    return {
      token: {
        text: englishText,
        type: 'english',
        position: { start: startPos, end: endPos },
      },
      endPos,
    };
  }

  private extractNumber(text: string, startPos: number): { token: Token; endPos: number } {
    let endPos = startPos;
    
    while (endPos < text.length && (this.isNumber(text[endPos]) || text[endPos] === '.')) {
      endPos++;
    }

    const numberText = text.slice(startPos, endPos);
    
    return {
      token: {
        text: numberText,
        type: 'number',
        position: { start: startPos, end: endPos },
      },
      endPos,
    };
  }

  private isChinese(char: string): boolean {
    const code = char.charCodeAt(0);
    return code >= 0x4e00 && code <= 0x9fff;
  }

  private isEnglish(char: string): boolean {
    const code = char.charCodeAt(0);
    return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
  }

  private isNumber(char: string): boolean {
    const code = char.charCodeAt(0);
    return code >= 48 && code <= 57;
  }

  private isPunctuation(char: string): boolean {
    return CHINESE_PUNCTUATION.includes(char) || /[.,!?;:'"()\[\]{}]/.test(char);
  }

  private estimateTokens(tokens: Token[]): number {
    let totalTokens = 0;

    for (const token of tokens) {
      switch (token.type) {
        case 'chinese':
          totalTokens += Math.ceil(token.text.length * 0.6);
          break;
        case 'english':
          totalTokens += Math.ceil(token.text.length / 4);
          break;
        case 'number':
          totalTokens += Math.ceil(token.text.length / 3);
          break;
        case 'punctuation':
          totalTokens += 1;
          break;
        default:
          totalTokens += 1;
      }
    }

    return totalTokens;
  }

  countTokens(text: string): number {
    return this.tokenize(text).estimatedTokens;
  }

  extractKeywords(text: string, topN: number = 10): string[] {
    const result = this.tokenize(text);
    const wordFreq: Map<string, number> = new Map();

    for (const token of result.tokens) {
      if (token.type === 'chinese' && !CHINESE_STOP_WORDS.includes(token.text)) {
        wordFreq.set(token.text, (wordFreq.get(token.text) || 0) + 1);
      }
    }

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([word]) => word);
  }

  segment(text: string): string[] {
    const result = this.tokenize(text);
    return result.tokens.map(t => t.text);
  }

  isStopWord(word: string): boolean {
    return CHINESE_STOP_WORDS.includes(word);
  }

  addCustomWord(word: string): void {
    this.customDictionary.add(word);
  }

  removeCustomWord(word: string): void {
    this.customDictionary.delete(word);
  }
}

export const globalTokenizer = new ChineseTokenizer();

export function tokenize(text: string, config?: Partial<ChineseTokenizerConfig>): TokenizeResult {
  const tokenizer = config ? new ChineseTokenizer(config) : globalTokenizer;
  return tokenizer.tokenize(text);
}

export function countChineseTokens(text: string): number {
  return globalTokenizer.countTokens(text);
}

export function extractChineseKeywords(text: string, topN?: number): string[] {
  return globalTokenizer.extractKeywords(text, topN);
}
