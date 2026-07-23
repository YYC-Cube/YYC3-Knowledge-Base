'use client';

import React, {
  forwardRef,
  useState,
  useRef,
  useCallback,
  useContext,
  createContext,
  useId,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
  type CSSProperties,
  type KeyboardEvent,
  type ChangeEvent,
  type FocusEvent,
} from 'react';

// ─────────────────────────────────────────────
// 主题上下文（与 Button 共享，此处独立导出以便单独使用）
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
export type InputSize = 'small' | 'medium' | 'large';
export type InputStatus = 'default' | 'error' | 'warning' | 'success';
export type InputType = 'text' | 'password' | 'email' | 'number' | 'search' | 'textarea';

interface BaseInputProps {
  /** 输入框类型 */
  type?: InputType;
  /** 尺寸 */
  size?: InputSize;
  /** 验证状态 */
  status?: InputStatus;
  /** 错误信息（status="error" 时显示） */
  errorMessage?: string;
  /** 警告信息（status="warning" 时显示） */
  warningMessage?: string;
  /** 成功信息（status="success" 时显示） */
  successMessage?: string;
  /** 前缀内容 */
  prefix?: ReactNode;
  /** 后缀内容 */
  suffix?: ReactNode;
  /** 显示清除按钮 */
  allowClear?: boolean;
  /** 显示字数统计 */
  showCount?: boolean;
  /** 密码可见性切换（type="password" 时生效） */
  passwordToggle?: boolean;
  /** Textarea 行数（type="textarea" 时生效） */
  rows?: number;
  /** 强制使用某主题 */
  theme?: YYC3Theme;
  /** 自定义外层容器样式 */
  wrapperStyle?: CSSProperties;
  /** 自定义外层容器类名 */
  wrapperClassName?: string;
  /** 回车键回调 */
  onPressEnter?: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

// 普通输入框 Props
export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'prefix'>,
    BaseInputProps {}

// Textarea Props
export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    BaseInputProps {
  type: 'textarea';
}

export type CombinedInputProps = InputProps | TextareaProps;

// ─────────────────────────────────────────────
// SVG 图标（零依赖）
// ─────────────────────────────────────────────
const CloseCircleIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.707 12.293a1 1 0 0 1-1.414 1.414L12 13.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L10.586 12 8.293 9.707a1 1 0 0 1 1.414-1.414L12 10.586l2.293-2.293a1 1 0 0 1 1.414 1.414L13.414 12l2.293 2.293z" />
  </svg>
);

const EyeIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const SearchIcon = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CheckCircleIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const WarningIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ErrorIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

// ─────────────────────────────────────────────
// 主题配色 Token
// ─────────────────────────────────────────────
interface ThemeTokens {
  bg: string;
  bgDisabled: string;
  bgReadOnly: string;
  border: string;
  borderFocus: string;
  borderHover: string;
  borderError: string;
  borderWarning: string;
  borderSuccess: string;
  text: string;
  textPlaceholder: string;
  textDisabled: string;
  prefixBg: string;
  prefixBorder: string;
  prefixText: string;
  focusShadow: string;
  focusShadowError: string;
  focusShadowWarning: string;
  focusShadowSuccess: string;
  backdropFilter: string;
  msgError: string;
  msgWarning: string;
  msgSuccess: string;
  clearColor: string;
  clearHover: string;
  iconColor: string;
}

function getThemeTokens(theme: YYC3Theme): ThemeTokens {
  if (theme === 'cyberpunk') {
    return {
      bg: 'rgba(0, 20, 25, 0.92)',
      bgDisabled: 'rgba(0, 10, 12, 0.7)',
      bgReadOnly: 'rgba(0, 15, 18, 0.85)',
      border: 'rgba(0, 229, 255, 0.25)',
      borderFocus: 'rgba(0, 229, 255, 0.85)',
      borderHover: 'rgba(0, 229, 255, 0.5)',
      borderError: 'rgba(255, 45, 85, 0.8)',
      borderWarning: 'rgba(255, 184, 0, 0.75)',
      borderSuccess: 'rgba(0, 230, 118, 0.7)',
      text: 'rgba(0, 240, 255, 0.92)',
      textPlaceholder: 'rgba(0, 200, 220, 0.3)',
      textDisabled: 'rgba(0, 150, 170, 0.35)',
      prefixBg: 'rgba(0, 229, 255, 0.06)',
      prefixBorder: 'rgba(0, 229, 255, 0.18)',
      prefixText: 'rgba(0, 229, 255, 0.6)',
      focusShadow: '0 0 0 3px rgba(0, 229, 255, 0.18), 0 0 16px rgba(0, 229, 255, 0.12)',
      focusShadowError: '0 0 0 3px rgba(255, 45, 85, 0.2), 0 0 12px rgba(255, 45, 85, 0.1)',
      focusShadowWarning: '0 0 0 3px rgba(255, 184, 0, 0.18), 0 0 12px rgba(255, 184, 0, 0.08)',
      focusShadowSuccess: '0 0 0 3px rgba(0, 230, 118, 0.18), 0 0 12px rgba(0, 230, 118, 0.08)',
      backdropFilter: 'none',
      msgError: 'rgba(255, 80, 110, 0.9)',
      msgWarning: 'rgba(255, 196, 20, 0.9)',
      msgSuccess: 'rgba(0, 240, 130, 0.9)',
      clearColor: 'rgba(0, 180, 200, 0.45)',
      clearHover: 'rgba(0, 255, 255, 0.85)',
      iconColor: 'rgba(0, 200, 220, 0.45)',
    };
  }
  // liquid-glass
  return {
    bg: 'rgba(255, 255, 255, 0.14)',
    bgDisabled: 'rgba(240, 242, 248, 0.3)',
    bgReadOnly: 'rgba(240, 242, 255, 0.2)',
    border: 'rgba(180, 190, 220, 0.35)',
    borderFocus: 'rgba(59, 130, 246, 0.65)',
    borderHover: 'rgba(100, 130, 200, 0.5)',
    borderError: 'rgba(239, 68, 68, 0.65)',
    borderWarning: 'rgba(234, 179, 8, 0.65)',
    borderSuccess: 'rgba(34, 197, 94, 0.6)',
    text: 'rgba(20, 30, 70, 0.9)',
    textPlaceholder: 'rgba(100, 120, 180, 0.5)',
    textDisabled: 'rgba(100, 120, 180, 0.35)',
    prefixBg: 'rgba(59, 130, 246, 0.06)',
    prefixBorder: 'rgba(180, 200, 230, 0.3)',
    prefixText: 'rgba(80, 100, 180, 0.7)',
    focusShadow: '0 0 0 3px rgba(59, 130, 246, 0.15), 0 2px 8px rgba(59, 130, 246, 0.08)',
    focusShadowError: '0 0 0 3px rgba(239, 68, 68, 0.15)',
    focusShadowWarning: '0 0 0 3px rgba(234, 179, 8, 0.15)',
    focusShadowSuccess: '0 0 0 3px rgba(34, 197, 94, 0.15)',
    backdropFilter: 'blur(12px) saturate(160%)',
    msgError: 'rgba(220, 38, 38, 0.9)',
    msgWarning: 'rgba(161, 98, 7, 0.9)',
    msgSuccess: 'rgba(21, 128, 61, 0.9)',
    clearColor: 'rgba(140, 160, 210, 0.6)',
    clearHover: 'rgba(59, 130, 246, 0.9)',
    iconColor: 'rgba(120, 140, 200, 0.55)',
  };
}

// ─────────────────────────────────────────────
// 注入 CSS（仅运行一次）
// ─────────────────────────────────────────────
const INPUT_CSS = `
/* ──── cyberpunk input hover ──── */
.yyc3-input-wrap[data-theme="cyberpunk"]:not([data-disabled="true"]):not([data-readonly="true"]):hover .yyc3-input-inner {
  border-color: rgba(0, 229, 255, 0.5) !important;
}
/* ──── liquid-glass input hover ──── */
.yyc3-input-wrap[data-theme="liquid-glass"]:not([data-disabled="true"]):not([data-readonly="true"]):hover .yyc3-input-inner {
  border-color: rgba(100, 130, 200, 0.5) !important;
}

/* clear button hover */
.yyc3-clear-btn[data-theme="cyberpunk"]:hover { color: rgba(0,255,255,0.85) !important; transform: scale(1.15); }
.yyc3-clear-btn[data-theme="liquid-glass"]:hover { color: rgba(59,130,246,0.9) !important; transform: scale(1.15); }
.yyc3-clear-btn { transition: color 150ms ease, transform 150ms ease; }

/* password toggle hover */
.yyc3-pwd-btn[data-theme="cyberpunk"]:hover { opacity: 1 !important; }
.yyc3-pwd-btn[data-theme="liquid-glass"]:hover { opacity: 1 !important; }
.yyc3-pwd-btn { transition: opacity 150ms ease; }

/* focus-visible ring on the real input */
.yyc3-input-el:focus { outline: none; }
`;

let inputStyleInjected = false;
function ensureInputStyles() {
  if (inputStyleInjected || typeof document === 'undefined') return;
  inputStyleInjected = true;
  const el = document.createElement('style');
  el.id = 'yyc3-input-styles';
  el.textContent = INPUT_CSS;
  document.head.appendChild(el);
}

// ─────────────────────────────────────────────
// 尺寸规格
// ─────────────────────────────────────────────
const SIZE_MAP = {
  small: {
    padding: '4px 8px',
    fontSize: '14px',
    lineHeight: '20px',
    minHeight: '28px',
    borderRadius: '4px',
    iconSize: 14,
    countFontSize: '11px',
  },
  medium: {
    padding: '8px 12px',
    fontSize: '16px',
    lineHeight: '24px',
    minHeight: '40px',
    borderRadius: '4px',
    iconSize: 15,
    countFontSize: '12px',
  },
  large: {
    padding: '12px 16px',
    fontSize: '18px',
    lineHeight: '28px',
    minHeight: '52px',
    borderRadius: '4px',
    iconSize: 16,
    countFontSize: '13px',
  },
} as const;

// ─────────────────────────────────────────────
// 状态颜色映射
// ─────────────────────────────────────────────
function getBorderForStatus(status: InputStatus, tokens: ThemeTokens, isFocused: boolean): string {
  if (status === 'error') return tokens.borderError;
  if (status === 'warning') return tokens.borderWarning;
  if (status === 'success') return tokens.borderSuccess;
  return isFocused ? tokens.borderFocus : tokens.border;
}

function getShadowForStatus(status: InputStatus, tokens: ThemeTokens, isFocused: boolean): string {
  if (!isFocused) return 'none';
  if (status === 'error') return tokens.focusShadowError;
  if (status === 'warning') return tokens.focusShadowWarning;
  if (status === 'success') return tokens.focusShadowSuccess;
  return tokens.focusShadow;
}

// ─────────────────────────────────────────────
// Input 组件
// ─────────────────────────────────────────────
export const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  CombinedInputProps
>((props, ref) => {
  const {
    type = 'text',
    size = 'medium',
    status = 'default',
    errorMessage,
    warningMessage,
    successMessage,
    prefix,
    suffix,
    allowClear,
    showCount,
    passwordToggle,
    rows = 4,
    theme: themeProp,
    wrapperStyle,
    wrapperClassName,
    onPressEnter,
    onChange,
    onFocus,
    onBlur,
    disabled,
    readOnly,
    maxLength,
    className,
    style,
    placeholder,
    value,
    defaultValue,
    id: idProp,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedby,
    ...rest
  } = props;

  const { theme: ctxTheme } = useYYC3Theme();
  const theme = themeProp ?? ctxTheme;
  const tokens = getThemeTokens(theme);
  const dim = SIZE_MAP[size];
  const isCyber = theme === 'cyberpunk';
  const isTextarea = type === 'textarea';
  const isPassword = type === 'password';
  const isSearch = type === 'search';

  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [internalValue, setInternalValue] = useState<string>(
    (defaultValue as string) ?? ''
  );
  const isControlled = value !== undefined;
  const currentValue = isControlled ? (value as string) ?? '' : internalValue;

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const autoId = useId();
  const inputId = idProp ?? `yyc3-input-${autoId}`;
  const msgId = `yyc3-msg-${autoId}`;

  if (typeof window !== 'undefined') ensureInputStyles();

  // ── 事件处理 ──
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!isControlled) setInternalValue(e.target.value);
      (onChange as ((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void))?.(e);
    },
    [isControlled, onChange]
  );

  const handleFocus = useCallback(
    (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setIsFocused(true);
      (onFocus as ((e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void))?.(e);
    },
    [onFocus]
  );

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setIsFocused(false);
      (onBlur as ((e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void))?.(e);
    },
    [onBlur]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !isTextarea) {
        onPressEnter?.(e);
      }
    },
    [isTextarea, onPressEnter]
  );

  const handleClear = useCallback(() => {
    if (!isControlled) setInternalValue('');
    const el = inputRef.current;
    if (el) {
      const nativeInput = Object.getOwnPropertyDescriptor(
        isTextarea ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value'
      );
      nativeInput?.set?.call(el, '');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.focus();
    }
    // Synthetic change event
    const syntheticEvent = {
      target: { value: '' },
      currentTarget: { value: '' },
    } as unknown as ChangeEvent<HTMLInputElement>;
    (onChange as ((e: ChangeEvent<HTMLInputElement>) => void))?.(syntheticEvent);
  }, [isControlled, isTextarea, onChange]);

  const togglePassword = useCallback(() => {
    setShowPassword(v => !v);
    inputRef.current?.focus();
  }, []);

  // ── 文字统计 ──
  const charCount = currentValue.length;
  const isOverLimit = maxLength !== undefined && charCount > maxLength;

  // ── 显示哪些后缀元素 ──
  const showClearBtn = allowClear && currentValue.length > 0 && !disabled && !readOnly;
  const showPasswordBtn = isPassword && passwordToggle;
  const showStatusIcon = status !== 'default' && !showClearBtn;

  // ── 计算内边距（为后缀腾出空间） ──
  const suffixCount = [showClearBtn, showPasswordBtn, showStatusIcon, !!suffix].filter(Boolean).length;
  const prefixPadLeft = prefix ? (size === 'small' ? '28px' : size === 'large' ? '40px' : '34px') : undefined;
  const suffixPadRight = suffixCount > 0
    ? `${suffixCount * (size === 'small' ? 22 : 26) + 8}px`
    : suffix ? (size === 'small' ? '28px' : size === 'large' ? '40px' : '34px') : undefined;

  // ── 样式 ──
  const borderColor = getBorderForStatus(status, tokens, isFocused);
  const boxShadow = getShadowForStatus(status, tokens, isFocused);

  const wrapperBaseStyle: CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: isCyber
      ? "'Courier New', 'Consolas', monospace"
      : "'Inter', 'SF Pro Display', system-ui, sans-serif",
  };

  const innerWrapStyle: CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: isTextarea ? 'flex-start' : 'center',
  };

  const inputBaseStyle: CSSProperties = {
    width: '100%',
    padding: dim.padding,
    paddingLeft: prefix ? prefixPadLeft : dim.padding.split(' ')[1],
    paddingRight: (showClearBtn || showPasswordBtn || showStatusIcon || suffix) ? suffixPadRight : dim.padding.split(' ')[1],
    fontSize: dim.fontSize,
    lineHeight: dim.lineHeight,
    minHeight: isTextarea ? 'auto' : dim.minHeight,
    borderRadius: dim.borderRadius,
    border: `1px solid ${borderColor}`,
    background: disabled
      ? tokens.bgDisabled
      : readOnly
      ? tokens.bgReadOnly
      : tokens.bg,
    backdropFilter: disabled || readOnly ? 'none' : tokens.backdropFilter,
    WebkitBackdropFilter: disabled || readOnly ? 'none' : tokens.backdropFilter,
    color: disabled ? tokens.textDisabled : tokens.text,
    outline: 'none',
    cursor: disabled ? 'not-allowed' : readOnly ? 'default' : 'text',
    transition: 'border-color 200ms ease-in-out, box-shadow 200ms ease-in-out, background 200ms ease-in-out',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: isTextarea ? 'vertical' : 'none',
    boxShadow,
    opacity: disabled ? 0.55 : 1,
    letterSpacing: isCyber ? '0.04em' : 'normal',
  };

  // ── 前缀/后缀图标样式 ──
  const adornmentBaseStyle: CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    color: tokens.prefixText,
    zIndex: 1,
  };

  const prefixStyle: CSSProperties = {
    ...adornmentBaseStyle,
    left: size === 'small' ? '8px' : size === 'large' ? '14px' : '10px',
  };

  // ── 消息区域 ──
  const statusMsg =
    status === 'error'
      ? errorMessage
      : status === 'warning'
      ? warningMessage
      : status === 'success'
      ? successMessage
      : undefined;

  const msgColor =
    status === 'error'
      ? tokens.msgError
      : status === 'warning'
      ? tokens.msgWarning
      : tokens.msgSuccess;

  // Resolved input type
  const resolvedType = isPassword && showPassword ? 'text' : isTextarea ? undefined : type;

  // ── 右侧操作区 ──
  const rightAdornments: ReactNode[] = [];
  const adornmentSize = size === 'small' ? 22 : size === 'large' ? 32 : 26;
  const adornmentGap = 4;
  let rightOffset = size === 'small' ? 6 : size === 'large' ? 10 : 8;

  // Status icon (rightmost non-action)
  if (showStatusIcon && suffix === undefined) {
    rightAdornments.push(
      <span
        key="status"
        style={{
          position: 'absolute',
          right: `${rightOffset}px`,
          top: isTextarea ? `${parseInt(dim.padding) + 2}px` : '50%',
          transform: isTextarea ? 'none' : 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          zIndex: 1,
        }}
        aria-hidden="true"
      >
        {status === 'error' && <ErrorIcon color={tokens.msgError} />}
        {status === 'warning' && <WarningIcon color={tokens.msgWarning} />}
        {status === 'success' && <CheckCircleIcon color={tokens.msgSuccess} />}
      </span>
    );
    rightOffset += adornmentSize + adornmentGap;
  }

  // Custom suffix
  if (suffix) {
    rightAdornments.push(
      <span
        key="suffix"
        style={{
          position: 'absolute',
          right: `${rightOffset}px`,
          top: isTextarea ? `${parseInt(dim.padding) + 2}px` : '50%',
          transform: isTextarea ? 'none' : 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          color: tokens.iconColor,
          zIndex: 1,
        }}
      >
        {suffix}
      </span>
    );
    rightOffset += adornmentSize + adornmentGap;
  }

  // Password toggle
  if (showPasswordBtn) {
    rightAdornments.push(
      <button
        key="pwd"
        type="button"
        className="yyc3-pwd-btn"
        data-theme={theme}
        onClick={togglePassword}
        tabIndex={-1}
        aria-label={showPassword ? '隐藏密码' : '显示密码'}
        style={{
          position: 'absolute',
          right: `${rightOffset}px`,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          padding: '2px',
          cursor: 'pointer',
          opacity: 0.55,
          zIndex: 1,
          borderRadius: '2px',
        }}
      >
        {showPassword
          ? <EyeOffIcon color={tokens.iconColor} />
          : <EyeIcon color={tokens.iconColor} />
        }
      </button>
    );
    rightOffset += adornmentSize + adornmentGap;
  }

  // Clear button
  if (showClearBtn) {
    rightAdornments.push(
      <button
        key="clear"
        type="button"
        className="yyc3-clear-btn"
        data-theme={theme}
        onClick={handleClear}
        tabIndex={-1}
        aria-label="清除内容"
        style={{
          position: 'absolute',
          right: `${rightOffset}px`,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          padding: '2px',
          cursor: 'pointer',
          color: tokens.clearColor,
          zIndex: 1,
          borderRadius: '2px',
        }}
      >
        <CloseCircleIcon color="currentColor" />
      </button>
    );
  }

  const ariaDescribedbyFinal = [ariaDescribedby, statusMsg ? msgId : undefined]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div
      className={`yyc3-input-wrap ${wrapperClassName ?? ''}`}
      data-theme={theme}
      data-disabled={disabled ? 'true' : undefined}
      data-readonly={readOnly ? 'true' : undefined}
      data-status={status}
      style={{ ...wrapperBaseStyle, ...wrapperStyle }}
    >
      {/* ── 输入框主体 ── */}
      <div className="yyc3-input-inner" style={innerWrapStyle}>
        {/* 前缀 */}
        {prefix && (
          <span style={prefixStyle} aria-hidden="true">
            {isSearch && !prefix ? (
              <SearchIcon color={tokens.iconColor} />
            ) : (
              prefix
            )}
          </span>
        )}

        {/* 搜索框默认前缀 */}
        {isSearch && !prefix && (
          <span style={prefixStyle} aria-hidden="true">
            <SearchIcon color={tokens.iconColor} />
          </span>
        )}

        {/* Input / Textarea */}
        {isTextarea ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={inputId}
            className={`yyc3-input-el ${className ?? ''}`}
            disabled={disabled}
            readOnly={readOnly}
            maxLength={maxLength}
            rows={rows}
            placeholder={placeholder}
            value={isControlled ? currentValue : undefined}
            defaultValue={!isControlled ? internalValue : undefined}
            aria-label={ariaLabel}
            aria-disabled={disabled}
            aria-readonly={readOnly}
            aria-invalid={status === 'error'}
            aria-describedby={ariaDescribedbyFinal}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              ...inputBaseStyle,
              paddingTop: dim.padding.split(' ')[0],
              paddingBottom: dim.padding.split(' ')[0],
            }}
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            id={inputId}
            type={resolvedType as string}
            className={`yyc3-input-el ${className ?? ''}`}
            disabled={disabled}
            readOnly={readOnly}
            maxLength={maxLength}
            placeholder={placeholder}
            value={isControlled ? currentValue : undefined}
            defaultValue={!isControlled ? internalValue : undefined}
            aria-label={ariaLabel}
            aria-disabled={disabled}
            aria-readonly={readOnly}
            aria-invalid={status === 'error'}
            aria-describedby={ariaDescribedbyFinal}
            onChange={handleChange as ((e: ChangeEvent<HTMLInputElement>) => void)}
            onFocus={handleFocus as ((e: FocusEvent<HTMLInputElement>) => void)}
            onBlur={handleBlur as ((e: FocusEvent<HTMLInputElement>) => void)}
            onKeyDown={handleKeyDown as ((e: KeyboardEvent<HTMLInputElement>) => void)}
            style={inputBaseStyle}
            {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}

        {/* 右侧操作区 */}
        {rightAdornments}
      </div>

      {/* ── 底部辅助区：字数统计 + 状态消息 ── */}
      {(statusMsg || showCount) && (
        <div style={{
          display: 'flex',
          justifyContent: statusMsg ? 'space-between' : 'flex-end',
          alignItems: 'center',
          marginTop: '4px',
          gap: '8px',
        }}>
          {/* 状态消息 */}
          {statusMsg && (
            <span
              id={msgId}
              role={status === 'error' ? 'alert' : 'status'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: dim.countFontSize,
                color: msgColor,
                lineHeight: 1.4,
                fontFamily: isCyber ? "'Courier New', monospace" : 'inherit',
              }}
            >
              {status === 'error' && <ErrorIcon color={msgColor} />}
              {status === 'warning' && <WarningIcon color={msgColor} />}
              {status === 'success' && <CheckCircleIcon color={msgColor} />}
              {statusMsg}
            </span>
          )}

          {/* 字数统计 */}
          {showCount && (
            <span
              aria-live="polite"
              aria-label={`已输入 ${charCount} 字${maxLength ? `，最多 ${maxLength} 字` : ''}`}
              style={{
                fontSize: dim.countFontSize,
                color: isOverLimit
                  ? tokens.msgError
                  : isFocused
                  ? isCyber ? 'rgba(0,229,255,0.65)' : 'rgba(59,130,246,0.7)'
                  : tokens.textPlaceholder,
                fontFamily: isCyber ? "'Courier New', monospace" : 'inherit',
                transition: 'color 200ms ease',
                flexShrink: 0,
              }}
            >
              {charCount}{maxLength ? ` / ${maxLength}` : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'YYC3Input';
