/**
 * @file 多语言类型定义
 * @description 定义支持的语言类型和翻译数据结构
 * @author YYC³
 * @version 1.0.0
 * @created 2025-09-15
 */

// 支持的语言类型
export type LanguageCode = 'zh' | 'en';

// 语言字典类型 - 从中文字典推断
export type TranslationData = typeof import('./locales/zh').zh;

// 语言配置接口
export interface LanguageConfig {
  defaultLanguage: LanguageCode;
  supportedLanguages: LanguageCode[];
  languageNames: Record<LanguageCode, string>;
}

// 语言上下文接口
export interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  isRTL: boolean;
}
