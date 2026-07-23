"use client"

// YanYu Cloud³ 设计令牌系统
export const designTokens = {
  // 品牌色彩系统 - 中国风配色
  colors: {
    primary: {
      50: "#f0f9ff",
      100: "#e0f2fe",
      200: "#bae6fd",
      300: "#7dd3fc",
      400: "#38bdf8",
      500: "#0ea5e9", // 主品牌色 - 天青色
      600: "#0284c7",
      700: "#0369a1",
      800: "#075985",
      900: "#0c4a6e",
    },
    secondary: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b", // 辅助色 - 青灰色
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
    },
    accent: {
      50: "#fdf4ff",
      100: "#fae8ff",
      200: "#f5d0fe",
      300: "#f0abfc",
      400: "#e879f9",
      500: "#d946ef", // 强调色 - 紫色
      600: "#c026d3",
      700: "#a21caf",
      800: "#86198f",
      900: "#701a75",
    },
    // 中国传统色彩
    traditional: {
      ink: "#2c3e50", // 墨色
      jade: "#27ae60", // 翠绿
      gold: "#f39c12", // 金色
      crimson: "#e74c3c", // 朱红
      azure: "#3498db", // 天蓝
    },
  },

  // 字体系统
  typography: {
    fontFamily: {
      sans: ["Inter", "PingFang SC", "Microsoft YaHei", "sans-serif"],
      mono: ["JetBrains Mono", "Consolas", "monospace"],
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
    },
  },

  // 间距系统
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
  },

  // 圆角系统
  borderRadius: {
    none: "0",
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    full: "9999px",
  },

  // 阴影系统
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  },

  // 动画系统
  animations: {
    duration: {
      fast: "150ms",
      normal: "300ms",
      slow: "500ms",
    },
    easing: {
      linear: "linear",
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      easeOut: "cubic-bezier(0, 0, 0.2, 1)",
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },
}

// 组件变体系统
export const componentVariants = {
  button: {
    primary: "bg-primary-500 hover:bg-primary-600 text-white",
    secondary: "bg-secondary-100 hover:bg-secondary-200 text-secondary-900",
    ghost: "hover:bg-secondary-100 text-secondary-700",
    accent: "bg-accent-500 hover:bg-accent-600 text-white",
  },
  card: {
    default: "bg-white border border-secondary-200 shadow-md",
    elevated: "bg-white border border-secondary-200 shadow-lg hover:shadow-xl",
    glass: "bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg",
  },
}
