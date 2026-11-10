import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

// 支持的语言列表
export const SUPPORTED_LANGUAGES = [
  { code: "zh-CN", name: "简体中文", nativeName: "简体中文", direction: "ltr" },
  { code: "zh-TW", name: "繁體中文", nativeName: "繁體中文", direction: "ltr" },
  {
    code: "en-US",
    name: "English (US)",
    nativeName: "English",
    direction: "ltr",
  },
  { code: "ja-JP", name: "日本語", nativeName: "日本語", direction: "ltr" },
  { code: "ko-KR", name: "한국어", nativeName: "한국어", direction: "ltr" },
  { code: "ar-SA", name: "العربية", nativeName: "العربية", direction: "rtl" },
  { code: "es-ES", name: "Español", nativeName: "Español", direction: "ltr" },
  { code: "fr-FR", name: "Français", nativeName: "Français", direction: "ltr" },
  { code: "de-DE", name: "Deutsch", nativeName: "Deutsch", direction: "ltr" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

// 初始化 i18next
i18next
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "zh-CN",
    supportedLngs: SUPPORTED_LANGUAGES.map((lang) => lang.code),
    debug: process.env.NODE_ENV === "development",

    interpolation: {
      escapeValue: false, // React 已经处理了 XSS
    },

    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
      addPath: "/locales/add/{{lng}}/{{ns}}",
    },

    detection: {
      order: ["querystring", "cookie", "localStorage", "navigator", "htmlTag"],
      caches: ["localStorage", "cookie"],
      lookupQuerystring: "lng",
      lookupCookie: "i18next",
      lookupLocalStorage: "i18nextLng",
    },

    react: {
      useSuspense: true,
    },
  });

export default i18next;
