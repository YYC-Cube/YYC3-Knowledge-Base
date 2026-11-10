/**
 * @file 多语言配置
 * @description 多语言系统的核心配置文件
 * @author YYC³
 * @version 1.0.0
 * @created 2025-09-15
 */

import { LanguageConfig, LanguageCode } from './types';

// 语言配置
export const languageConfig: LanguageConfig = {
  // 默认语言设置为中文
  defaultLanguage: 'zh',
  // 支持的语言列表
  supportedLanguages: ['zh', 'en'],
  // 语言名称映射
  languageNames: {
    zh: '中文',
    en: 'English',
  },
};

// 获取默认语言
export const getDefaultLanguage = (): LanguageCode => {
  // 尝试从本地存储获取
  if (typeof window !== 'undefined') {
    const savedLanguage = localStorage.getItem('preferred-language');
    if (savedLanguage && languageConfig.supportedLanguages.includes(savedLanguage as LanguageCode)) {
      return savedLanguage as LanguageCode;
    }
    
    // 尝试从浏览器语言推断
    const browserLanguage = navigator.language.split('-')[0];
    if (browserLanguage && languageConfig.supportedLanguages.includes(browserLanguage as LanguageCode)) {
      return browserLanguage as LanguageCode;
    }
  }
  
  // 回退到默认语言
  return languageConfig.defaultLanguage;
};

// 保存用户语言偏好
export const saveLanguagePreference = (language: LanguageCode): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('preferred-language', language);
  }
};

// 检查是否为支持的语言
export const isValidLanguage = (language: string): language is LanguageCode => {
  return languageConfig.supportedLanguages.includes(language as LanguageCode);
};
