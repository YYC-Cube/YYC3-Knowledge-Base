/**
 * YYC3 Language Switcher — Toggle between Chinese and English locales
 * @description Compact or standard toggle button with locale preview label.
 * @version 4.8.0
 */
import { Languages } from "lucide-react";
import { useI18n } from "../i18n/context";
import { useThemeStore } from "../store/theme-store";

export function LangSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, toggleLocale } = useI18n();
  const { tokens, isCyberpunk } = useThemeStore();

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-1.5 px-2 py-0.5 rounded transition-all hover:opacity-80"
      style={{
        border: `1px solid ${tokens.border}`,
        background: isCyberpunk ? "transparent" : tokens.primaryGlow,
      }}
      title={locale === "zh" ? "Switch to English" : "\u5207\u6362\u5230\u4E2D\u6587"}
    >
      <Languages size={compact ? 10 : 12} color={tokens.primary} style={{ filter: isCyberpunk ? `drop-shadow(0 0 3px ${tokens.primary})` : "none" }} />
      <span
        style={{
          fontFamily: tokens.fontMono,
          fontSize: compact ? "9px" : "10px",
          color: tokens.primary,
          letterSpacing: "1px",
        }}
      >
        {locale === "zh" ? "EN" : "\u4E2D"}
      </span>
      <div className="w-px h-3" style={{ background: tokens.border }} />
      <span
        style={{
          fontFamily: tokens.fontMono,
          fontSize: compact ? "8px" : "9px",
          color: tokens.primaryDim,
        }}
      >
        {locale === "zh" ? "\u4E2D\u6587" : "EN"}
      </span>
    </button>
  );
}