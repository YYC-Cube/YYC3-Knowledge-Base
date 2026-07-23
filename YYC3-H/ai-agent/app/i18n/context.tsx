/**
 * @file 语言上下文
 * @description React上下文用于管理应用的语言状态和翻译功能
 * @author YYC³
 * @version 1.0.0
 * @created 2025-09-15
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LanguageCode, TranslationData, LanguageContextType } from './types';
import { getDefaultLanguage, saveLanguagePreference } from './config';

// 动态导入语言包
const importLanguage = async (language: LanguageCode): Promise<TranslationData> => {
  switch (language) {
    case 'zh':
      return (await import('./locales/zh')).zh;
    case 'en':
      return (await import('./locales/en')).en;
    default:
      return (await import('./locales/zh')).zh;
  }
};

// 创建语言上下文
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

// 语言提供者组件
export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageCode>(getDefaultLanguage());
  const [translations, setTranslations] = useState<TranslationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 加载语言包
  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        const data = await importLanguage(language);
        setTranslations(data);
      } catch (error) {
        console.error('Failed to load translations:', error);
        // 加载失败时回退到中文
        const fallbackData = await importLanguage('zh');
        setTranslations(fallbackData);
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, [language]);

  // 切换语言
  const changeLanguage = (lang: LanguageCode): void => {
    setLanguage(lang);
    saveLanguagePreference(lang);
    // 触发页面重新渲染以更新所有文本
    document.documentElement.lang = lang;
  };

  // 翻译函数 - 支持嵌套键访问，如 'common.save'
  const t = (key: string): string => {
    if (!translations || isLoading) {
      return key;
    }

    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value[k] === undefined) {
        return key; // 如果键不存在，返回原始键
      }
      value = value[k];
    }

    return typeof value === 'string' ? value : key;
  };

  // 判断是否为RTL语言（阿拉伯语等），这里目前不涉及RTL语言
  const isRTL = false;

  const contextValue: LanguageContextType = {
    language,
    setLanguage: changeLanguage,
    t,
    isRTL,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

// 自定义Hook，方便在组件中使用语言上下文
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// 便捷Hook，仅用于翻译
export const useTranslation = () => {
  const { t } = useLanguage();
  return { t };
};
