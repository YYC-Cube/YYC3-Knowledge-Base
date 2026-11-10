import type { Config } from "tailwindcss"
import { tokens } from "./design-tokens"

const config: Config = {
  content: ["./components/**/*.{js,ts,jsx,tsx,mdx}", "./stories/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: tokens.colors.brand.primary,
        secondary: tokens.colors.brand.secondary,
        accent: tokens.colors.brand.accent,
        neutral: tokens.colors.neutral,
        traditional: tokens.colors.traditional,
        success: tokens.colors.semantic.success.main,
        warning: tokens.colors.semantic.warning.main,
        error: tokens.colors.semantic.error.main,
        info: tokens.colors.semantic.info.main,
      },
      fontFamily: tokens.typography.fontFamily,
      fontSize: tokens.typography.fontSize,
      fontWeight: tokens.typography.fontWeight,
      lineHeight: tokens.typography.lineHeight,
      spacing: tokens.spacing,
      borderRadius: tokens.borderRadius,
      boxShadow: tokens.shadows,
      transitionDuration: tokens.transitions,
      screens: tokens.breakpoints,
      zIndex: tokens.zIndex,
    },
  },
  plugins: [],
}

export default config
