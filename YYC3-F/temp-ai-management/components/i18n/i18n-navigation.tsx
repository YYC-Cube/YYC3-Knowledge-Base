"use client";

import React from "react";
import { LanguageSelector } from "../i18n/language-selector";
import { useLanguage } from "../../hooks/use-language";
import { useTranslation } from "react-i18next";

interface I18nNavigationHeaderProps {
  className?: string;
}

export function I18nNavigationHeader({
  className = "",
}: I18nNavigationHeaderProps) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();

  return (
    <div
      className={`flex items-center justify-between p-4 border-b ${className}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold">{t("app.name")}</h1>
        <span className="text-sm text-muted-foreground">
          {t("app.tagline")}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <LanguageSelector />
      </div>
    </div>
  );
}

interface I18nBreadcrumbProps {
  items: Array<{
    key: string;
    href?: string;
    isActive?: boolean;
  }>;
  className?: string;
}

export function I18nBreadcrumb({ items, className = "" }: I18nBreadcrumbProps) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();

  return (
    <nav
      className={`flex ${className}`}
      dir={isRTL ? "rtl" : "ltr"}
      aria-label={t("common.breadcrumb", "Breadcrumb")}
    >
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={item.key} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-muted-foreground">
                {isRTL ? "◀" : "▶"}
              </span>
            )}
            {item.href && !item.isActive ? (
              <a
                href={item.href}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                {t(`nav.${item.key}`, item.key)}
              </a>
            ) : (
              <span
                className={`text-sm ${
                  item.isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {t(`nav.${item.key}`, item.key)}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface I18nMenuItemProps {
  itemKey: string;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  active?: boolean;
}

export function I18nMenuItem({
  itemKey,
  children,
  onClick,
  className = "",
  active = false,
}: I18nMenuItemProps) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center w-full px-4 py-2 text-sm transition-colors
        ${
          active
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-muted"
        }
        ${isRTL ? "text-right" : "text-left"}
        ${className}
      `}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <span className="flex-1">{t(`nav.${itemKey}`, itemKey)}</span>
      {children}
    </button>
  );
}

// 导出一个完整的国际化导航容器
interface I18nNavigationContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function I18nNavigationContainer({
  children,
  className = "",
}: I18nNavigationContainerProps) {
  const { isRTL, languageInfo } = useLanguage();

  // 应用RTL样式类
  const containerClasses = `
    ${className}
    ${isRTL ? "rtl" : "ltr"}
    ${isRTL ? "flex-row-reverse" : "flex-row"}
  `;

  // 为RTL语言设置字体
  const fontFamily =
    languageInfo?.code === "ar-SA"
      ? "font-arabic"
      : languageInfo?.code.startsWith("zh")
      ? "font-chinese"
      : "font-latin";

  return (
    <div
      className={`${containerClasses} ${fontFamily}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {children}
    </div>
  );
}
