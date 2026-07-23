import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zhCN }
    },
    lng: 'zh', // 默认简体中文
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;