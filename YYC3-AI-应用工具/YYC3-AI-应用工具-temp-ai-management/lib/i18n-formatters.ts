import { SupportedLanguage } from "./i18n.config";

// 格式化日期
export function formatDate(
  date: Date | string | number,
  locale: SupportedLanguage,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  };

  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
}

// 格式化日期时间
export function formatDateTime(
  date: Date | string | number,
  locale: SupportedLanguage,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  };

  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
}

// 格式化相对时间
export function formatRelativeTime(
  date: Date | string | number,
  locale: SupportedLanguage
): string {
  const dateObj =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, "second");
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), "minute");
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), "hour");
  } else if (diffInSeconds < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), "day");
  } else if (diffInSeconds < 31536000) {
    return rtf.format(-Math.floor(diffInSeconds / 2592000), "month");
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 31536000), "year");
  }
}

// 格式化数字
export function formatNumber(
  value: number,
  locale: SupportedLanguage,
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

// 格式化货币
export function formatCurrency(
  value: number,
  locale: SupportedLanguage,
  currency: string = "CNY"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);
}

// 格式化百分比
export function formatPercent(
  value: number,
  locale: SupportedLanguage,
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    ...options,
  }).format(value);
}

// 格式化文件大小
export function formatFileSize(
  bytes: number,
  locale: SupportedLanguage,
  decimals: number = 2
): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// 格式化电话号码
export function formatPhoneNumber(
  phoneNumber: string,
  locale: SupportedLanguage
): string {
  // 简单的电话号码格式化，实际使用中可能需要更复杂的逻辑
  const cleaned = phoneNumber.replace(/\D/g, "");

  if (locale.startsWith("zh")) {
    // 中国电话号码格式
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, "$1 $2 $3");
    }
  } else if (locale === "en-US") {
    // 美国电话号码格式
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
    }
  }

  return phoneNumber;
}

// 根据语言环境获取默认货币
export function getDefaultCurrency(locale: SupportedLanguage): string {
  const currencyMap: Record<string, string> = {
    "zh-CN": "CNY",
    "zh-TW": "TWD",
    "en-US": "USD",
    "ja-JP": "JPY",
    "ko-KR": "KRW",
    "ar-SA": "SAR",
    "es-ES": "EUR",
    "fr-FR": "EUR",
    "de-DE": "EUR",
  };

  return currencyMap[locale] || "USD";
}

// 数字千分位分隔符
export function addThousandSeparator(
  value: number | string,
  locale: SupportedLanguage
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat(locale).format(num);
}
