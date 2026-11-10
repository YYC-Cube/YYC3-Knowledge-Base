"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../hooks/use-language";
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
} from "../../lib/i18n-formatters";

// HOC for internationalization
export function withI18n<P extends Record<string, any>>(
  Component: React.ComponentType<P>
) {
  const WrappedComponent = (props: P) => {
    const { t } = useTranslation();
    const { currentLanguage, isRTL } = useLanguage();

    const i18nProps = {
      t,
      currentLanguage,
      isRTL,
      formatDate: (
        date: Date | string | number,
        options?: Intl.DateTimeFormatOptions
      ) => formatDate(date, currentLanguage, options),
      formatDateTime: (
        date: Date | string | number,
        options?: Intl.DateTimeFormatOptions
      ) => formatDateTime(date, currentLanguage, options),
      formatCurrency: (value: number, currency?: string) =>
        formatCurrency(value, currentLanguage, currency),
      formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
        formatNumber(value, currentLanguage, options),
    };

    return (
      <div dir={isRTL ? "rtl" : "ltr"}>
        <Component {...props} {...i18nProps} />
      </div>
    );
  };

  WrappedComponent.displayName = `withI18n(${
    Component.displayName || Component.name
  })`;
  return WrappedComponent;
}

// Hook for using i18n in components
export function useI18n() {
  const { t } = useTranslation();
  const { currentLanguage, isRTL, languageInfo } = useLanguage();

  return {
    t,
    currentLanguage,
    isRTL,
    languageInfo,
    formatDate: (
      date: Date | string | number,
      options?: Intl.DateTimeFormatOptions
    ) => formatDate(date, currentLanguage, options),
    formatDateTime: (
      date: Date | string | number,
      options?: Intl.DateTimeFormatOptions
    ) => formatDateTime(date, currentLanguage, options),
    formatCurrency: (value: number, currency?: string) =>
      formatCurrency(value, currentLanguage, currency),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(value, currentLanguage, options),
  };
}

// Text component with automatic translation
interface I18nTextProps {
  tKey: string;
  values?: Record<string, any>;
  fallback?: string;
  className?: string;
  tag?: keyof JSX.IntrinsicElements;
}

export function I18nText({
  tKey,
  values,
  fallback,
  className = "",
  tag: Tag = "span",
}: I18nTextProps) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  return (
    <Tag
      className={`${className} ${isRTL ? "text-right" : "text-left"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {t(tKey, fallback || tKey, values)}
    </Tag>
  );
}

// Button component with i18n support
interface I18nButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tKey: string;
  values?: Record<string, any>;
  fallback?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function I18nButton({
  tKey,
  values,
  fallback,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: I18nButtonProps) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const baseClasses =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantClasses = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary",
    outline:
      "border border-input hover:bg-accent hover:text-accent-foreground focus:ring-primary",
    ghost: "hover:bg-accent hover:text-accent-foreground focus:ring-primary",
  };

  const sizeClasses = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4",
    lg: "h-12 px-6 text-lg",
  };

  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${isRTL ? "flex-row-reverse" : "flex-row"}
    ${className}
  `;

  return (
    <button className={buttonClasses} dir={isRTL ? "rtl" : "ltr"} {...props}>
      {children}
      {tKey && <span>{t(tKey, fallback || tKey, values)}</span>}
    </button>
  );
}

// Form label with i18n support
interface I18nLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  tKey: string;
  values?: Record<string, any>;
  fallback?: string;
  required?: boolean;
}

export function I18nLabel({
  tKey,
  values,
  fallback,
  required = false,
  className = "",
  children,
  ...props
}: I18nLabelProps) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  return (
    <label
      className={`block text-sm font-medium ${
        isRTL ? "text-right" : "text-left"
      } ${className}`}
      dir={isRTL ? "rtl" : "ltr"}
      {...props}
    >
      {t(tKey, fallback || tKey, values)}
      {required && <span className="text-red-500 ml-1">*</span>}
      {children}
    </label>
  );
}

// Input with i18n placeholder support
interface I18nInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholderKey?: string;
  placeholderValues?: Record<string, any>;
  placeholderFallback?: string;
}

export function I18nInput({
  placeholderKey,
  placeholderValues,
  placeholderFallback,
  className = "",
  ...props
}: I18nInputProps) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const placeholder = placeholderKey
    ? t(
        placeholderKey,
        placeholderFallback || placeholderKey,
        placeholderValues
      )
    : props.placeholder;

  return (
    <input
      {...props}
      placeholder={placeholder}
      className={`
        w-full px-3 py-2 border border-input rounded-md
        focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
        ${isRTL ? "text-right" : "text-left"}
        ${className}
      `}
      dir={isRTL ? "rtl" : "ltr"}
    />
  );
}
