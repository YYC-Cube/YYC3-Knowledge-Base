'use client';

import React, {
  forwardRef,
  useCallback,
  useContext,
  createContext,
  type ButtonHTMLAttributes,
  type ReactNode,
  type CSSProperties,
} from 'react';

// ─────────────────────────────────────────────
// 主题上下文
// ─────────────────────────────────────────────
export type YYC3Theme = 'cyberpunk' | 'liquid-glass';

interface ThemeContextValue {
  theme: YYC3Theme;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'cyberpunk' });

export const useYYC3Theme = () => useContext(ThemeContext);

export interface YYC3ThemeProviderProps {
  theme: YYC3Theme;
  children: ReactNode;
}

export const YYC3ThemeProvider: React.FC<YYC3ThemeProviderProps> = ({
  theme,
  children,
}) => <ThemeContext.Provider value={{ theme }}>{children}</ThemeContext.Provider>;

// ─────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger';

export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体 */
  variant?: ButtonVariant;
  /** 按钮尺寸 */
  size?: ButtonSize;
  /** 加载状态 */
  loading?: boolean;
  /** 激活/选中状态 */
  active?: boolean;
  /** 左侧图标 */
  leftIcon?: ReactNode;
  /** 右侧图标 */
  rightIcon?: ReactNode;
  /** 仅图标模式（无文字） */
  iconOnly?: boolean;
  /** 强制使用某主题，不传则继承上下文 */
  theme?: YYC3Theme;
  /** 自定义样式覆盖 */
  style?: CSSProperties;
  /** 子内容 */
  children?: ReactNode;
}

// ─────────────────────────────────────────────
// Spinner 组件（零依赖）
// ─────────────────────────────────────────────
const Spinner: React.FC<{ theme: YYC3Theme; variant: ButtonVariant }> = ({
  theme,
  variant,
}) => {
  const isCyber = theme === 'cyberpunk';
  const color =
    variant === 'primary'
      ? isCyber
        ? '#0ff'
        : 'rgba(255,255,255,0.9)'
      : variant === 'danger'
      ? isCyber
        ? '#ff2d55'
        : '#ef4444'
      : isCyber
      ? '#00e5ff'
      : 'rgba(100,120,160,0.8)';

  return (
    <svg
      aria-hidden="true"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      style={{
        animation: 'yyc3-spin 0.7s linear infinite',
        flexShrink: 0,
        display: 'block',
      }}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke={color}
        strokeWidth="2.5"
        strokeOpacity="0.25"
      />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

// ─────────────────────────────────────────────
// 样式计算函数
// ─────────────────────────────────────────────
function getStyles(
  theme: YYC3Theme,
  variant: ButtonVariant,
  size: ButtonSize,
  state: {
    loading: boolean;
    disabled: boolean;
    active: boolean;
    iconOnly: boolean;
  }
): CSSProperties {
  const isCyber = theme === 'cyberpunk';
  const { disabled, active, loading } = state;
  const isInert = disabled || loading;

  // ── 尺寸 ──
  const sizeMap: Record<ButtonSize, CSSProperties> = {
    small: {
      padding: state.iconOnly ? '4px' : '4px 12px',
      fontSize: '14px',
      lineHeight: '20px',
      minHeight: '28px',
      minWidth: state.iconOnly ? '28px' : undefined,
      borderRadius: '4px',
      gap: '6px',
    },
    medium: {
      padding: state.iconOnly ? '8px' : '8px 16px',
      fontSize: '16px',
      lineHeight: '24px',
      minHeight: '40px',
      minWidth: state.iconOnly ? '40px' : undefined,
      borderRadius: '6px',
      gap: '8px',
    },
    large: {
      padding: state.iconOnly ? '12px' : '12px 20px',
      fontSize: '18px',
      lineHeight: '28px',
      minHeight: '52px',
      minWidth: state.iconOnly ? '52px' : undefined,
      borderRadius: '8px',
      gap: '10px',
    },
  };

  const dim = sizeMap[size];

  // ── 基础样式 ──
  const base: CSSProperties = {
    ...dim,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
    fontWeight: 600,
    letterSpacing: isCyber ? '0.08em' : '0.01em',
    cursor: isInert ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    outline: 'none',
    border: 'none',
    position: 'relative',
    overflow: 'hidden',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    transition:
      'background 200ms ease-in-out, color 200ms ease-in-out, box-shadow 200ms ease-in-out, transform 200ms ease-in-out, border-color 200ms ease-in-out, opacity 200ms ease-in-out',
    textTransform: isCyber ? 'uppercase' : 'none',
  };

  // ─────────────── CYBERPUNK 主题 ───────────────
  if (isCyber) {
    const neonMap: Record<ButtonVariant, CSSProperties> = {
      primary: {
        background: active
          ? 'linear-gradient(135deg, #00b8d9 0%, #0ff 100%)'
          : 'linear-gradient(135deg, #007a91 0%, #00e5ff 100%)',
        color: '#001a1f',
        boxShadow: active
          ? '0 0 20px #0ff, 0 0 40px rgba(0,255,255,0.4), inset 0 0 12px rgba(0,255,255,0.15)'
          : '0 0 8px rgba(0,229,255,0.5), 0 0 16px rgba(0,229,255,0.2)',
        border: '1px solid rgba(0,255,255,0.6)',
      },
      secondary: {
        background: active
          ? 'rgba(0,229,255,0.15)'
          : 'rgba(0,229,255,0.08)',
        color: '#00e5ff',
        boxShadow: active
          ? '0 0 12px rgba(0,229,255,0.3), inset 0 0 8px rgba(0,229,255,0.08)'
          : '0 0 6px rgba(0,229,255,0.15)',
        border: '1px solid rgba(0,229,255,0.35)',
      },
      outline: {
        background: 'transparent',
        color: '#00e5ff',
        boxShadow: active
          ? '0 0 10px rgba(0,229,255,0.3), inset 0 0 6px rgba(0,229,255,0.06)'
          : 'none',
        border: active
          ? '1px solid rgba(0,229,255,0.9)'
          : '1px solid rgba(0,229,255,0.55)',
      },
      ghost: {
        background: active ? 'rgba(0,229,255,0.1)' : 'transparent',
        color: active ? '#0ff' : 'rgba(0,229,255,0.75)',
        boxShadow: 'none',
        border: '1px solid transparent',
      },
      danger: {
        background: active
          ? 'linear-gradient(135deg, #c00030 0%, #ff2d55 100%)'
          : 'linear-gradient(135deg, #8b0020 0%, #e8003a 100%)',
        color: '#fff0f3',
        boxShadow: active
          ? '0 0 20px #ff2d55, 0 0 40px rgba(255,45,85,0.35)'
          : '0 0 8px rgba(255,45,85,0.45), 0 0 16px rgba(255,45,85,0.18)',
        border: '1px solid rgba(255,45,85,0.65)',
      },
    };
    return { ...base, ...neonMap[variant] };
  }

  // ─────────────── LIQUID GLASS 主题 ───────────────
  const glassMap: Record<ButtonVariant, CSSProperties> = {
    primary: {
      background: active
        ? 'rgba(59,130,246,0.85)'
        : 'rgba(59,130,246,0.75)',
      color: '#fff',
      backdropFilter: 'blur(12px) saturate(160%)',
      WebkitBackdropFilter: 'blur(12px) saturate(160%)',
      boxShadow: active
        ? '0 2px 20px rgba(59,130,246,0.5), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.1)'
        : '0 2px 12px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
      border: '1px solid rgba(255,255,255,0.35)',
    },
    secondary: {
      background: active
        ? 'rgba(255,255,255,0.22)'
        : 'rgba(255,255,255,0.14)',
      color: 'rgba(30,40,80,0.9)',
      backdropFilter: 'blur(12px) saturate(140%)',
      WebkitBackdropFilter: 'blur(12px) saturate(140%)',
      boxShadow: active
        ? '0 2px 16px rgba(100,120,200,0.2), inset 0 1px 0 rgba(255,255,255,0.5)'
        : '0 1px 8px rgba(100,120,200,0.1), inset 0 1px 0 rgba(255,255,255,0.4)',
      border: '1px solid rgba(255,255,255,0.45)',
    },
    outline: {
      background: 'rgba(255,255,255,0.04)',
      color: 'rgba(30,40,100,0.85)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      boxShadow: active
        ? 'inset 0 0 0 1.5px rgba(59,130,246,0.6), 0 2px 10px rgba(59,130,246,0.15)'
        : 'none',
      border: active
        ? '1px solid rgba(59,130,246,0.6)'
        : '1px solid rgba(100,120,180,0.35)',
    },
    ghost: {
      background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
      color: active ? 'rgba(37,99,235,1)' : 'rgba(60,80,160,0.75)',
      backdropFilter: 'none',
      boxShadow: 'none',
      border: '1px solid transparent',
    },
    danger: {
      background: active
        ? 'rgba(239,68,68,0.82)'
        : 'rgba(239,68,68,0.7)',
      color: '#fff',
      backdropFilter: 'blur(12px) saturate(160%)',
      WebkitBackdropFilter: 'blur(12px) saturate(160%)',
      boxShadow: active
        ? '0 2px 20px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.25)'
        : '0 2px 12px rgba(239,68,68,0.25), inset 0 1px 0 rgba(255,255,255,0.25)',
      border: '1px solid rgba(255,255,255,0.3)',
    },
  };

  return { ...base, ...glassMap[variant] };
}

// hover / active 动态样式通过 data-* 属性 + CSS 实现
const HOVER_ACTIVE_CSS = `
@keyframes yyc3-spin {
  to { transform: rotate(360deg); }
}

/* ──── cyberpunk hover ──── */
[data-yyc3-theme="cyberpunk"][data-variant="primary"]:not([data-inert="true"]):hover {
  box-shadow: 0 0 20px #0ff, 0 0 40px rgba(0,255,255,0.45), inset 0 0 16px rgba(0,255,255,0.12) !important;
  filter: brightness(1.12);
  transform: translateY(-1px);
}
[data-yyc3-theme="cyberpunk"][data-variant="secondary"]:not([data-inert="true"]):hover {
  background: rgba(0,229,255,0.16) !important;
  box-shadow: 0 0 14px rgba(0,229,255,0.35) !important;
  transform: translateY(-1px);
}
[data-yyc3-theme="cyberpunk"][data-variant="outline"]:not([data-inert="true"]):hover {
  background: rgba(0,229,255,0.06) !important;
  box-shadow: 0 0 12px rgba(0,229,255,0.28) !important;
  border-color: rgba(0,229,255,0.85) !important;
  transform: translateY(-1px);
}
[data-yyc3-theme="cyberpunk"][data-variant="ghost"]:not([data-inert="true"]):hover {
  background: rgba(0,229,255,0.1) !important;
  color: #0ff !important;
}
[data-yyc3-theme="cyberpunk"][data-variant="danger"]:not([data-inert="true"]):hover {
  box-shadow: 0 0 20px #ff2d55, 0 0 40px rgba(255,45,85,0.4) !important;
  filter: brightness(1.12);
  transform: translateY(-1px);
}

/* cyberpunk active press */
[data-yyc3-theme="cyberpunk"]:not([data-inert="true"]):active {
  transform: scale(0.96) translateY(0) !important;
  filter: brightness(0.92);
}

/* cyberpunk focus */
[data-yyc3-theme="cyberpunk"]:focus-visible {
  outline: 2px solid #0ff !important;
  outline-offset: 2px !important;
}

/* ──── liquid-glass hover ──── */
[data-yyc3-theme="liquid-glass"][data-variant="primary"]:not([data-inert="true"]):hover {
  background: rgba(59,130,246,0.88) !important;
  box-shadow: 0 4px 20px rgba(59,130,246,0.45), inset 0 1px 0 rgba(255,255,255,0.35) !important;
  transform: translateY(-1px);
}
[data-yyc3-theme="liquid-glass"][data-variant="secondary"]:not([data-inert="true"]):hover {
  background: rgba(255,255,255,0.26) !important;
  box-shadow: 0 3px 14px rgba(100,120,200,0.2), inset 0 1px 0 rgba(255,255,255,0.55) !important;
  transform: translateY(-1px);
}
[data-yyc3-theme="liquid-glass"][data-variant="outline"]:not([data-inert="true"]):hover {
  background: rgba(59,130,246,0.08) !important;
  border-color: rgba(59,130,246,0.55) !important;
  transform: translateY(-1px);
}
[data-yyc3-theme="liquid-glass"][data-variant="ghost"]:not([data-inert="true"]):hover {
  background: rgba(59,130,246,0.1) !important;
  color: rgba(37,99,235,1) !important;
}
[data-yyc3-theme="liquid-glass"][data-variant="danger"]:not([data-inert="true"]):hover {
  background: rgba(239,68,68,0.88) !important;
  box-shadow: 0 4px 20px rgba(239,68,68,0.4), inset 0 1px 0 rgba(255,255,255,0.3) !important;
  transform: translateY(-1px);
}

/* liquid-glass active press */
[data-yyc3-theme="liquid-glass"]:not([data-inert="true"]):active {
  transform: scale(0.96) translateY(0) !important;
  filter: brightness(0.94);
}

/* liquid-glass focus */
[data-yyc3-theme="liquid-glass"]:focus-visible {
  outline: 2px solid rgba(59,130,246,0.75) !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 4px rgba(59,130,246,0.15) !important;
}

/* ripple effect */
.yyc3-ripple {
  position: absolute;
  border-radius: 50%;
  transform: scale(0);
  animation: yyc3-ripple-anim 500ms ease-out forwards;
  pointer-events: none;
}
@keyframes yyc3-ripple-anim {
  to { transform: scale(4); opacity: 0; }
}
`;

// ─────────────────────────────────────────────
// StyleInjector（仅在客户端注入一次）
// ─────────────────────────────────────────────
let styleInjected = false;

function ensureStyles() {
  if (styleInjected || typeof document === 'undefined') return;
  styleInjected = true;
  const el = document.createElement('style');
  el.id = 'yyc3-button-styles';
  el.textContent = HOVER_ACTIVE_CSS;
  document.head.appendChild(el);
}

// ─────────────────────────────────────────────
// Button 组件
// ─────────────────────────────────────────────
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      loading = false,
      active = false,
      disabled = false,
      leftIcon,
      rightIcon,
      iconOnly = false,
      theme: themeProp,
      style,
      className,
      children,
      onClick,
      'aria-label': ariaLabel,
      ...rest
    },
    ref
  ) => {
    const { theme: ctxTheme } = useYYC3Theme();
    const theme = themeProp ?? ctxTheme;
    const isInert = disabled || loading;

    // 注入 CSS（只跑一次）
    if (typeof window !== 'undefined') ensureStyles();

    const computedStyle = getStyles(theme, variant, size, {
      loading,
      disabled,
      active,
      iconOnly,
    });

    // Ripple effect handler
    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isInert) return;
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        const ripple = document.createElement('span');
        ripple.className = 'yyc3-ripple';
        ripple.style.cssText = `
          width:${size}px;height:${size}px;
          left:${x}px;top:${y}px;
          background:${
            theme === 'cyberpunk'
              ? 'rgba(0,255,255,0.3)'
              : 'rgba(255,255,255,0.4)'
          };
        `;
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 520);

        onClick?.(e);
      },
      [isInert, onClick, theme]
    );

    // aria-label 推断
    const resolvedAriaLabel =
      ariaLabel ??
      (iconOnly
        ? typeof children === 'string'
          ? children
          : 'button'
        : undefined);

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        aria-disabled={isInert}
        aria-busy={loading}
        aria-pressed={active || undefined}
        aria-label={resolvedAriaLabel}
        data-yyc3-theme={theme}
        data-variant={variant}
        data-inert={isInert ? 'true' : undefined}
        onClick={handleClick}
        className={className}
        style={{ ...computedStyle, ...style }}
        {...rest}
      >
        {/* 左侧图标 / Loading Spinner */}
        {loading ? (
          <Spinner theme={theme} variant={variant} />
        ) : leftIcon ? (
          <span
            aria-hidden="true"
            style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
          >
            {leftIcon}
          </span>
        ) : null}

        {/* 主内容 */}
        {!iconOnly && children && (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {children}
          </span>
        )}

        {/* 仅图标模式 */}
        {iconOnly && !loading && (
          <span
            aria-hidden="true"
            style={{ display: 'flex', alignItems: 'center' }}
          >
            {leftIcon ?? children}
          </span>
        )}

        {/* 右侧图标 */}
        {!iconOnly && !loading && rightIcon && (
          <span
            aria-hidden="true"
            style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
          >
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'YYC3Button';
