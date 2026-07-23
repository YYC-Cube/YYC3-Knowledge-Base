/**
 * YYC³ Claw UI — 设计系统共享 Token
 *
 * 遵循 /docs/README.md 接口规范：
 *   ThemeVariables · breakpoints · ResponsiveProps
 *
 * 零外部依赖，仅依赖 TypeScript 类型系统。
 */

// ─────────────────────────────────────────────
// 主题类型
// ─────────────────────────────────────────────
export type YYC3Theme = 'cyberpunk' | 'liquid-glass';

// ─────────────────────────────────────────────
// 组件基础 Props 规范（README § 1.1）
// ─────────────────────────────────────────────
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export interface ThemeProps {
  theme?: YYC3Theme;
  primaryColor?: string;
}

export interface SizeProps {
  size?: 'small' | 'medium' | 'large';
}

export interface StatusProps {
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
}

// ─────────────────────────────────────────────
// 主题变量接口（README § 1.2）
// ─────────────────────────────────────────────
export interface ThemeVariables {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    text: string;
    border: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
  // 扩展 Token（布局系统专用）
  fontFamily: string;
  scanline: string;            // 赛博朋克扫描线 CSS
  backdropFilter: string;       // 毛玻璃模糊
  glowColor: string;            // 主发光色
  surfaceBg: string;            // 表面背景
  surfaceBgHover: string;       // 表面背景悬停
  headerBg: string;
  sidebarBg: string;
  footerBg: string;
}

// ─────────────────────────────────────────────
// 响应式断点（README § 1.4）
// ─────────────────────────────────────────────
export const breakpoints = {
  xs:  '0px',
  sm:  '576px',
  md:  '768px',
  lg:  '992px',
  xl:  '1200px',
  xxl: '1600px',
} as const;

export type Breakpoint = keyof typeof breakpoints;

/** 媒体查询助手 */
export const mq = (bp: Exclude<Breakpoint, 'xs'>) =>
  `@media (min-width: ${breakpoints[bp]})`;

// ─────────────────────────────────────────────
// 赛博朋克 Token
// ─────────────────────────────────────────────
const cyberpunkTokens: ThemeVariables = {
  colors: {
    primary:    '#00e5ff',
    secondary:  'rgba(0,229,255,0.55)',
    success:    '#00e676',
    warning:    '#ffb800',
    error:      '#ff2d55',
    info:       '#00b0ff',
    background: 'rgba(1,8,14,1)',
    text:       'rgba(0,220,240,0.85)',
    border:     'rgba(0,229,255,0.18)',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '40px',
  },
  borderRadius: {
    sm:   '4px',
    md:   '6px',
    lg:   '8px',
    full: '9999px',
  },
  shadows: {
    sm: '0 0 8px rgba(0,229,255,0.2)',
    md: '0 0 20px rgba(0,229,255,0.3)',
    lg: '0 0 40px rgba(0,229,255,0.25), 0 24px 60px rgba(0,0,0,0.7)',
  },
  transitions: {
    fast:   '150ms ease-in-out',
    normal: '200ms ease-in-out',
    slow:   '300ms ease-in-out',
  },
  fontFamily:    "'Courier New', 'Consolas', monospace",
  scanline:      'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,255,0.008) 2px,rgba(0,255,255,0.008) 4px)',
  backdropFilter: 'none',
  glowColor:     '#00e5ff',
  surfaceBg:     'rgba(0,229,255,0.04)',
  surfaceBgHover:'rgba(0,229,255,0.08)',
  headerBg:      'rgba(2,10,14,0.92)',
  sidebarBg:     'rgba(2,10,16,0.96)',
  footerBg:      'rgba(1,8,12,0.97)',
};

// ─────────────────────────────────────────────
// 液态玻璃 Token
// ─────────────────────────────────────────────
const liquidGlassTokens: ThemeVariables = {
  colors: {
    primary:    'rgba(59,130,246,1)',
    secondary:  'rgba(59,130,246,0.6)',
    success:    'rgba(22,163,74,1)',
    warning:    'rgba(234,179,8,1)',
    error:      'rgba(239,68,68,1)',
    info:       'rgba(14,165,233,1)',
    background: 'rgba(240,245,255,0.98)',
    text:       'rgba(20,30,70,0.88)',
    border:     'rgba(200,215,240,0.45)',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '40px',
  },
  borderRadius: {
    sm:   '4px',
    md:   '6px',
    lg:   '8px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 8px rgba(80,100,180,0.08)',
    md: '0 2px 16px rgba(80,100,180,0.12)',
    lg: '0 8px 40px rgba(80,100,180,0.18)',
  },
  transitions: {
    fast:   '150ms ease-in-out',
    normal: '200ms ease-in-out',
    slow:   '300ms ease-in-out',
  },
  fontFamily:    "'Inter','SF Pro Display',system-ui,sans-serif",
  scanline:      'none',
  backdropFilter: 'blur(16px) saturate(180%)',
  glowColor:     'rgba(59,130,246,0.6)',
  surfaceBg:     'rgba(255,255,255,0.45)',
  surfaceBgHover:'rgba(255,255,255,0.65)',
  headerBg:      'rgba(255,255,255,0.72)',
  sidebarBg:     'rgba(255,255,255,0.65)',
  footerBg:      'rgba(255,255,255,0.6)',
};

// ─────────────────────────────────────────────
// Token 获取函数
// ─────────────────────────────────────────────
export function getThemeTokens(theme: YYC3Theme): ThemeVariables {
  return theme === 'cyberpunk' ? cyberpunkTokens : liquidGlassTokens;
}

// ─────────────────────────────────────────────
// CSS 变量注入（可选：将 Token 注入为 CSS 自定义属性）
// ─────────────────────────────────────────────
let cssVarInjected = false;

export function injectThemeCSSVars(theme: YYC3Theme): void {
  if (typeof document === 'undefined') return;
  const tokens = getThemeTokens(theme);
  const root = document.documentElement;

  root.setAttribute('data-yyc3-theme', theme);

  // 颜色
  root.style.setProperty('--yyc3-color-primary',    tokens.colors.primary);
  root.style.setProperty('--yyc3-color-secondary',  tokens.colors.secondary);
  root.style.setProperty('--yyc3-color-success',    tokens.colors.success);
  root.style.setProperty('--yyc3-color-warning',    tokens.colors.warning);
  root.style.setProperty('--yyc3-color-error',      tokens.colors.error);
  root.style.setProperty('--yyc3-color-info',       tokens.colors.info);
  root.style.setProperty('--yyc3-color-background', tokens.colors.background);
  root.style.setProperty('--yyc3-color-text',       tokens.colors.text);
  root.style.setProperty('--yyc3-color-border',     tokens.colors.border);

  // 间距
  root.style.setProperty('--yyc3-spacing-xs', tokens.spacing.xs);
  root.style.setProperty('--yyc3-spacing-sm', tokens.spacing.sm);
  root.style.setProperty('--yyc3-spacing-md', tokens.spacing.md);
  root.style.setProperty('--yyc3-spacing-lg', tokens.spacing.lg);
  root.style.setProperty('--yyc3-spacing-xl', tokens.spacing.xl);

  // 圆角
  root.style.setProperty('--yyc3-radius-sm',   tokens.borderRadius.sm);
  root.style.setProperty('--yyc3-radius-md',   tokens.borderRadius.md);
  root.style.setProperty('--yyc3-radius-lg',   tokens.borderRadius.lg);
  root.style.setProperty('--yyc3-radius-full', tokens.borderRadius.full);

  // 阴影
  root.style.setProperty('--yyc3-shadow-sm', tokens.shadows.sm);
  root.style.setProperty('--yyc3-shadow-md', tokens.shadows.md);
  root.style.setProperty('--yyc3-shadow-lg', tokens.shadows.lg);

  // 过渡
  root.style.setProperty('--yyc3-transition-fast',   tokens.transitions.fast);
  root.style.setProperty('--yyc3-transition-normal', tokens.transitions.normal);
  root.style.setProperty('--yyc3-transition-slow',   tokens.transitions.slow);

  if (!cssVarInjected) {
    cssVarInjected = true;
    const style = document.createElement('style');
    style.id = 'yyc3-css-vars';
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; }
      :focus-visible { outline-offset: 2px; }
    `;
    document.head.appendChild(style);
  }
}

// ─────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────

/** 合并 className 字符串（轻量替代 clsx） */
export function cx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** 合并内联样式对象 */
export function mergeStyles(
  ...styles: (React.CSSProperties | undefined | null | false)[]
): React.CSSProperties {
  return Object.assign({}, ...styles.filter(Boolean));
}

/** 判断是否为赛博朋克主题 */
export const isCyberpunk = (theme: YYC3Theme) => theme === 'cyberpunk';
