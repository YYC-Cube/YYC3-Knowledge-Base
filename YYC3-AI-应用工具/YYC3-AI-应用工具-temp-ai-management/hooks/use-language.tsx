import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, SupportedLanguage } from "../lib/i18n.config";

export function useLanguage() {
  const { i18n, t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    i18n.language as SupportedLanguage
  );

  // 获取当前语言信息
  const languageInfo = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === currentLanguage
  );

  // 切换语言
  const changeLanguage = useCallback(
    async (language: SupportedLanguage) => {
      try {
        await i18n.changeLanguage(language);
        setCurrentLanguage(language);

        // 更新 HTML 属性
        const langInfo = SUPPORTED_LANGUAGES.find(
          (lang) => lang.code === language
        );
        if (langInfo) {
          document.documentElement.lang = language;
          document.documentElement.dir = langInfo.direction;
        }

        // 保存到用户偏好（如果已登录）
        const user = localStorage.getItem("user");
        if (user) {
          try {
            const token = localStorage.getItem("token");
            if (token) {
              await fetch("/api/user/preferences", {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ language }),
              });
            }
          } catch (error) {
            console.error("Failed to save language preference", error);
          }
        }
      } catch (error) {
        console.error("Failed to change language", error);
      }
    },
    [i18n]
  );

  // 监听语言变化
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng as SupportedLanguage);
    };

    i18n.on("languageChanged", handleLanguageChange);

    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, [i18n]);

  return {
    currentLanguage,
    languageInfo,
    languages: SUPPORTED_LANGUAGES,
    changeLanguage,
    t,
    isRTL: languageInfo?.direction === "rtl",
  };
}
