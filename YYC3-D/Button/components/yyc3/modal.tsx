'use client';

import React, {
  forwardRef,
  useContext,
  createContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useId,
  createPortal,
  type ReactNode,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
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
export type ModalAnimation = 'fade' | 'zoom' | 'slide';
export type ModalPreset = 'confirm' | 'info' | 'success' | 'error' | 'warning';

export interface ModalProps {
  /** 是否显示 */
  visible: boolean;
  /** 标题 */
  title?: ReactNode;
  /** 宽度 */
  width?: number | string;
  /** 垂直居中 */
  centered?: boolean;
  /** 距离顶部（非 centered 时生效） */
  top?: number | string;
  /** 是否显示关闭按钮 */
  closable?: boolean;
  /** 是否显示遮罩 */
  mask?: boolean;
  /** 点击遮罩是否关闭 */
  maskClosable?: boolean;
  /** 关闭时是否销毁子元素 */
  destroyOnClose?: boolean;
  /** 进入/退出动画 */
  animation?: ModalAnimation;
  /** 确认按钮文字 */
  okText?: string;
  /** 取消按钮文字 */
  cancelText?: string;
  /** 确认回调 */
  onOk?: () => void | Promise<void>;
  /** 取消/关闭回调 */
  onCancel?: () => void;
  /** 打开后回调 */
  afterOpen?: () => void;
  /** 关闭后回调 */
  afterClose?: () => void;
  /** 隐藏底部操作栏 */
  footer?: ReactNode | null;
  /** 强制覆盖主题 */
  theme?: YYC3Theme;
  /** 子内容 */
  children?: ReactNode;
  /** 自定义内容区样式 */
  bodyStyle?: CSSProperties;
  /** 自定义 className */
  className?: string;
  /** 自定义样式 */
  style?: CSSProperties;
  /** zIndex */
  zIndex?: number;
}

// ─────────────────────────────────────────────
// 主题 Token
// ─────────────────────────────────────────────
interface ModalTokens {
  maskBg: string;
  dialogBg: string;
  border: string;
  titleColor: string;
  bodyColor: string;
  closeColor: string;
  closeHoverBg: string;
  footerBorder: string;
  fontFamily: string;
  backdropFilter: string;
  glowShadow: string;
  scanline: boolean;
  okBg: string;
  okBgHover: string;
  okColor: string;
  okBorder: string;
  okShadow: string;
  cancelBg: string;
  cancelBgHover: string;
  cancelColor: string;
  cancelBorder: string;
}

function getTokens(theme: YYC3Theme): ModalTokens {
  if (theme === 'cyberpunk') {
    return {
      maskBg: 'rgba(0, 8, 12, 0.78)',
      dialogBg: 'rgba(2, 15, 20, 0.97)',
      border: 'rgba(0, 229, 255, 0.3)',
      titleColor: 'rgba(0, 240, 255, 0.96)',
      bodyColor: 'rgba(0, 220, 240, 0.8)',
      closeColor: 'rgba(0, 200, 220, 0.55)',
      closeHoverBg: 'rgba(0, 229, 255, 0.1)',
      footerBorder: 'rgba(0, 229, 255, 0.1)',
      fontFamily: "'Courier New', 'Consolas', monospace",
      backdropFilter: 'none',
      glowShadow: '0 0 0 1px rgba(0,229,255,0.15), 0 8px 60px rgba(0,229,255,0.2), 0 24px 80px rgba(0,0,0,0.8)',
      scanline: true,
      okBg: 'linear-gradient(135deg, #007a91 0%, #00e5ff 100%)',
      okBgHover: 'linear-gradient(135deg, #00b8d9 0%, #0ff 100%)',
      okColor: '#001a1f',
      okBorder: 'rgba(0,229,255,0.6)',
      okShadow: '0 0 12px rgba(0,229,255,0.4)',
      cancelBg: 'rgba(0,229,255,0.06)',
      cancelBgHover: 'rgba(0,229,255,0.14)',
      cancelColor: 'rgba(0,229,255,0.85)',
      cancelBorder: 'rgba(0,229,255,0.28)',
    };
  }
  return {
    maskBg: 'rgba(15, 20, 50, 0.45)',
    dialogBg: 'rgba(255, 255, 255, 0.22)',
    border: 'rgba(200, 215, 245, 0.5)',
    titleColor: 'rgba(10, 20, 60, 0.94)',
    bodyColor: 'rgba(30, 45, 90, 0.82)',
    closeColor: 'rgba(80, 100, 180, 0.55)',
    closeHoverBg: 'rgba(59, 130, 246, 0.1)',
    footerBorder: 'rgba(180, 200, 235, 0.3)',
    fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
    backdropFilter: 'blur(20px) saturate(180%)',
    glowShadow: '0 8px 32px rgba(59,130,246,0.15), 0 24px 64px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.85)',
    scanline: false,
    okBg: 'rgba(59, 130, 246, 0.82)',
    okBgHover: 'rgba(59, 130, 246, 0.95)',
    okColor: '#fff',
    okBorder: 'rgba(255,255,255,0.3)',
    okShadow: '0 4px 12px rgba(59,130,246,0.35)',
    cancelBg: 'rgba(255,255,255,0.18)',
    cancelBgHover: 'rgba(255,255,255,0.3)',
    cancelColor: 'rgba(30,45,90,0.8)',
    cancelBorder: 'rgba(200,215,245,0.4)',
  };
}

// ─────────────────────────────────────────────
// CSS 注入
// ─────────────────────────────────────────────
const MODAL_CSS = `
@keyframes yyc3-modal-fade-in     { from { opacity: 0; }                          to { opacity: 1; } }
@keyframes yyc3-modal-fade-out    { from { opacity: 1; }                          to { opacity: 0; } }
@keyframes yyc3-modal-zoom-in     { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: scale(1); } }
@keyframes yyc3-modal-zoom-out    { from { opacity: 1; transform: scale(1); }    to { opacity: 0; transform: scale(0.88); } }
@keyframes yyc3-modal-slide-in    { from { opacity: 0; transform: translateY(-28px); } to { opacity: 1; transform: translateY(0); } }
@keyframes yyc3-modal-slide-out   { from { opacity: 1; transform: translateY(0); }     to { opacity: 0; transform: translateY(-28px); } }
@keyframes yyc3-mask-in           { from { opacity: 0; } to { opacity: 1; } }
@keyframes yyc3-mask-out          { from { opacity: 1; } to { opacity: 0; } }
@keyframes yyc3-modal-scanline    {
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}

.yyc3-modal-ok-btn[data-theme="cyberpunk"]:hover   { filter: brightness(1.15); box-shadow: 0 0 20px rgba(0,229,255,0.55) !important; }
.yyc3-modal-ok-btn[data-theme="liquid-glass"]:hover { background: rgba(59,130,246,0.95) !important; }
.yyc3-modal-cancel-btn[data-theme="cyberpunk"]:hover   { background: rgba(0,229,255,0.14) !important; }
.yyc3-modal-cancel-btn[data-theme="liquid-glass"]:hover { background: rgba(255,255,255,0.3) !important; }
.yyc3-modal-close-btn[data-theme="cyberpunk"]:hover  { background: rgba(0,229,255,0.1) !important; color: rgba(0,229,255,0.9) !important; }
.yyc3-modal-close-btn[data-theme="liquid-glass"]:hover { background: rgba(59,130,246,0.1) !important; color: rgba(59,130,246,0.9) !important; }
.yyc3-modal-ok-btn, .yyc3-modal-cancel-btn, .yyc3-modal-close-btn {
  transition: all 200ms ease-in-out !important;
}
`;

let modalStyleInjected = false;
function ensureModalStyles() {
  if (modalStyleInjected || typeof document === 'undefined') return;
  modalStyleInjected = true;
  const el = document.createElement('style');
  el.id = 'yyc3-modal-styles';
  el.textContent = MODAL_CSS;
  document.head.appendChild(el);
}

// ─────────────────────────────────────────────
// SVG 图标
// ─────────────────────────────────────────────
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PresetIcons: Record<ModalPreset, (isCyber: boolean) => ReactNode> = {
  confirm: (isCyber) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill={isCyber ? 'rgba(0,229,255,0.12)' : 'rgba(59,130,246,0.1)'} stroke={isCyber ? 'rgba(0,229,255,0.7)' : 'rgba(59,130,246,0.7)'} strokeWidth="1.5" />
      <path d="M12 8v4m0 4h.01" stroke={isCyber ? '#0ff' : '#3b82f6'} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  info: (isCyber) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill={isCyber ? 'rgba(0,229,255,0.12)' : 'rgba(59,130,246,0.1)'} stroke={isCyber ? 'rgba(0,229,255,0.7)' : 'rgba(59,130,246,0.7)'} strokeWidth="1.5" />
      <path d="M12 16v-4m0-4h.01" stroke={isCyber ? '#0ff' : '#3b82f6'} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  success: (isCyber) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill={isCyber ? 'rgba(0,230,118,0.1)' : 'rgba(34,197,94,0.1)'} stroke={isCyber ? 'rgba(0,230,118,0.7)' : 'rgba(34,197,94,0.7)'} strokeWidth="1.5" />
      <polyline points="8 12 11 15 16 9" stroke={isCyber ? '#00e676' : '#22c55e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (isCyber) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill={isCyber ? 'rgba(255,45,85,0.1)' : 'rgba(239,68,68,0.1)'} stroke={isCyber ? 'rgba(255,45,85,0.7)' : 'rgba(239,68,68,0.7)'} strokeWidth="1.5" />
      <path d="M15 9l-6 6M9 9l6 6" stroke={isCyber ? '#ff2d55' : '#ef4444'} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  warning: (isCyber) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill={isCyber ? 'rgba(255,184,0,0.1)' : 'rgba(234,179,8,0.1)'} stroke={isCyber ? 'rgba(255,184,0,0.75)' : 'rgba(234,179,8,0.75)'} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 9v4m0 4h.01" stroke={isCyber ? '#ffb800' : '#eab308'} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

// ─────────────────────────────────────────────
// 动画关键帧映射
// ─────────────────────────────────────────────
function getDialogAnimation(animation: ModalAnimation, entering: boolean): string {
  const map: Record<ModalAnimation, [string, string]> = {
    fade:  ['yyc3-modal-fade-in',  'yyc3-modal-fade-out'],
    zoom:  ['yyc3-modal-zoom-in',  'yyc3-modal-zoom-out'],
    slide: ['yyc3-modal-slide-in', 'yyc3-modal-slide-out'],
  };
  return `${map[animation][entering ? 0 : 1]} 300ms cubic-bezier(0.34,1.26,0.64,1) forwards`;
}

// ─────────────────────────────────────────────
// Focus Trap Hook
// ─────────────────────────────────────────────
function useFocusTrap(active: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const focusable = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const el = containerRef.current;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const nodes = Array.from(el.querySelectorAll<HTMLElement>(focusable)).filter(n => !n.closest('[aria-hidden]'));
      if (!nodes.length) { e.preventDefault(); return; }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Focus the first focusable element
    const firstFocusable = el.querySelector<HTMLElement>(focusable);
    firstFocusable?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, containerRef]);
}

// ─────────────────────────────────────────────
// Modal 主组件
// ─────────────────────────────────────────────
export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      visible,
      title,
      width = 520,
      centered = false,
      top = 80,
      closable = true,
      mask = true,
      maskClosable = true,
      destroyOnClose = false,
      animation = 'zoom',
      okText = '确 认',
      cancelText = '取 消',
      onOk,
      onCancel,
      afterOpen,
      afterClose,
      footer,
      theme: themeProp,
      children,
      bodyStyle,
      className,
      style,
      zIndex = 1000,
    },
    ref
  ) => {
    const { theme: ctxTheme } = useYYC3Theme();
    const theme = themeProp ?? ctxTheme;
    const tokens = getTokens(theme);
    const isCyber = theme === 'cyberpunk';

    const [mounted, setMounted] = useState(false);
    const [rendered, setRendered] = useState(false);
    const [entering, setEntering] = useState(true);
    const [okLoading, setOkLoading] = useState(false);

    const dialogRef = useRef<HTMLDivElement>(null);
    const prevFocusRef = useRef<HTMLElement | null>(null);
    const titleId = useId();
    const descId = useId();

    if (typeof window !== 'undefined') ensureModalStyles();

    // ── 挂载/卸载逻辑 ──
    useEffect(() => {
      if (visible) {
        setMounted(true);
        setEntering(true);
        prevFocusRef.current = document.activeElement as HTMLElement;
        // 延迟触发动画
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setRendered(true));
        });
      } else {
        if (!mounted) return;
        setEntering(false);
        const timer = setTimeout(() => {
          setRendered(false);
          if (destroyOnClose) setMounted(false);
          afterClose?.();
          prevFocusRef.current?.focus();
        }, 300);
        return () => clearTimeout(timer);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // afterOpen 回调
    useEffect(() => {
      if (rendered && entering) {
        const t = setTimeout(() => afterOpen?.(), 310);
        return () => clearTimeout(t);
      }
    }, [rendered, entering, afterOpen]);

    // 滚动锁定
    useEffect(() => {
      if (!visible) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }, [visible]);

    // ESC 键关闭
    useEffect(() => {
      if (!visible) return;
      const handleEsc = (e: globalThis.KeyboardEvent) => {
        if (e.key === 'Escape') onCancel?.();
      };
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }, [visible, onCancel]);

    // Focus Trap
    useFocusTrap(visible && rendered, dialogRef as React.RefObject<HTMLElement | null>);

    // ── 确认按钮（支持异步） ──
    const handleOk = useCallback(async () => {
      if (!onOk) return;
      const result = onOk();
      if (result instanceof Promise) {
        setOkLoading(true);
        try { await result; } finally { setOkLoading(false); }
      }
    }, [onOk]);

    // ── 遮罩点击 ──
    const handleMaskClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && maskClosable) onCancel?.();
    }, [maskClosable, onCancel]);

    if (!mounted && !visible) return null;

    const dialogWidth = typeof width === 'number' ? `${width}px` : width;
    const dialogTop = typeof top === 'number' ? `${top}px` : top;

    const dialogStyle: CSSProperties = {
      position: 'relative',
      width: dialogWidth,
      maxWidth: 'calc(100vw - 32px)',
      background: tokens.dialogBg,
      backdropFilter: tokens.backdropFilter,
      WebkitBackdropFilter: tokens.backdropFilter,
      border: `1px solid ${tokens.border}`,
      borderRadius: '8px',
      boxShadow: tokens.glowShadow,
      fontFamily: tokens.fontFamily,
      overflow: 'hidden',
      animation: rendered
        ? getDialogAnimation(animation, entering)
        : 'none',
      outline: 'none',
    };

    const footerNode = footer !== undefined ? footer : (
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        padding: '14px 24px',
        borderTop: `1px solid ${tokens.footerBorder}`,
      }}>
        <button
          className="yyc3-modal-cancel-btn"
          data-theme={theme}
          onClick={onCancel}
          style={{
            padding: '8px 20px',
            borderRadius: '6px',
            border: `1px solid ${tokens.cancelBorder}`,
            background: tokens.cancelBg,
            color: tokens.cancelColor,
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: tokens.fontFamily,
            letterSpacing: isCyber ? '0.06em' : '0',
            textTransform: isCyber ? 'uppercase' : 'none',
          }}
        >
          {cancelText}
        </button>
        <button
          className="yyc3-modal-ok-btn"
          data-theme={theme}
          onClick={handleOk}
          disabled={okLoading}
          style={{
            padding: '8px 24px',
            borderRadius: '6px',
            border: `1px solid ${tokens.okBorder}`,
            background: tokens.okBg,
            color: tokens.okColor,
            fontSize: '14px',
            fontWeight: 700,
            cursor: okLoading ? 'not-allowed' : 'pointer',
            boxShadow: tokens.okShadow,
            fontFamily: tokens.fontFamily,
            letterSpacing: isCyber ? '0.08em' : '0',
            textTransform: isCyber ? 'uppercase' : 'none',
            opacity: okLoading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {okLoading && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'yyc3-spin 0.7s linear infinite' }} aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3" />
              <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          )}
          {okText}
        </button>
      </div>
    );

    const modalContent = (
      <YYC3ThemeProvider theme={theme}>
        {/* 遮罩 */}
        {mask && (
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: tokens.maskBg,
              zIndex,
              animation: rendered
                ? `${entering ? 'yyc3-mask-in' : 'yyc3-mask-out'} 300ms ease forwards`
                : 'none',
              backdropFilter: isCyber ? 'none' : 'blur(4px)',
              WebkitBackdropFilter: isCyber ? 'none' : 'blur(4px)',
            }}
            onClick={handleMaskClick}
          />
        )}

        {/* 定位容器 */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: zIndex + 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: centered ? 'center' : 'flex-start',
            paddingTop: centered ? 0 : dialogTop,
            paddingBottom: centered ? 0 : '40px',
            overflowY: 'auto',
            pointerEvents: 'none',
          }}
          onClick={handleMaskClick}
        >
          {/* Dialog 本体 */}
          <div
            ref={(node) => {
              (dialogRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={descId}
            tabIndex={-1}
            className={`yyc3-modal-dialog ${className ?? ''}`}
            data-theme={theme}
            style={{ ...dialogStyle, ...style, pointerEvents: 'all' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 赛博朋克装饰 */}
            {isCyber && (
              <>
                {/* 顶部光带 */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                  background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.7), transparent)',
                  pointerEvents: 'none', zIndex: 10,
                }} />
                {/* 扫描线 */}
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.004) 2px, rgba(0,255,255,0.004) 4px)',
                  pointerEvents: 'none', zIndex: 0,
                }} />
                {/* 四角 */}
                {(['tl','tr','bl','br'] as const).map(pos => (
                  <div key={pos} style={{
                    position: 'absolute',
                    width: '14px', height: '14px',
                    ...(pos.includes('t') ? { top: -1 } : { bottom: -1 }),
                    ...(pos.includes('l') ? { left: -1 } : { right: -1 }),
                    borderTop: pos.includes('t') ? '2px solid rgba(0,229,255,0.7)' : undefined,
                    borderBottom: pos.includes('b') ? '2px solid rgba(0,229,255,0.7)' : undefined,
                    borderLeft: pos.includes('l') ? '2px solid rgba(0,229,255,0.7)' : undefined,
                    borderRight: pos.includes('r') ? '2px solid rgba(0,229,255,0.7)' : undefined,
                    pointerEvents: 'none', zIndex: 11,
                  }} />
                ))}
              </>
            )}

            {/* 液态玻璃高光 */}
            {!isCyber && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 100%)',
                pointerEvents: 'none', zIndex: 0, borderRadius: '8px 8px 0 0',
              }} />
            )}

            {/* 内容区 z-index */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* 标题栏 */}
              {(title !== undefined || closable) && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '18px 24px 16px',
                  borderBottom: title !== undefined ? `1px solid ${isCyber ? 'rgba(0,229,255,0.1)' : 'rgba(180,200,235,0.3)'}` : 'none',
                  gap: '12px',
                }}>
                  {title !== undefined && (
                    <h2
                      id={titleId}
                      style={{
                        margin: 0,
                        fontSize: '17px',
                        fontWeight: 700,
                        color: tokens.titleColor,
                        fontFamily: tokens.fontFamily,
                        letterSpacing: isCyber ? '0.06em' : '0',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {title}
                    </h2>
                  )}
                  {closable && (
                    <button
                      className="yyc3-modal-close-btn"
                      data-theme={theme}
                      onClick={onCancel}
                      aria-label="关闭"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'transparent',
                        color: tokens.closeColor,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <CloseIcon />
                    </button>
                  )}
                </div>
              )}

              {/* 正文 */}
              <div
                id={descId}
                style={{
                  padding: '20px 24px',
                  color: tokens.bodyColor,
                  fontSize: '14px',
                  lineHeight: 1.65,
                  fontFamily: tokens.fontFamily,
                  ...bodyStyle,
                }}
              >
                {!destroyOnClose || visible ? children : null}
              </div>

              {/* 底部 */}
              {footer !== null && footerNode}
            </div>
          </div>
        </div>
      </YYC3ThemeProvider>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(modalContent, document.body);
  }
);

Modal.displayName = 'YYC3Modal';

// ─────────────────────────────────────────────
// 命令式 API：Modal.confirm / .info / .success / .error / .warning
// ─────────────────────────────────────────────
interface PresetOptions {
  title?: ReactNode;
  content?: ReactNode;
  okText?: string;
  cancelText?: string;
  onOk?: () => void | Promise<void>;
  onCancel?: () => void;
  theme?: YYC3Theme;
  closable?: boolean;
  centered?: boolean;
}

function createPresetModal(preset: ModalPreset, opts: PresetOptions) {
  if (typeof document === 'undefined') return { destroy: () => {} };

  const container = document.createElement('div');
  document.body.appendChild(container);

  let destroyed = false;
  const { createRoot } = require('react-dom/client') as typeof import('react-dom/client');
  const root = createRoot(container);

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    root.unmount();
    container.remove();
  }

  function ModalInstance() {
    const [visible, setVisible] = useState(true);
    const theme: YYC3Theme = opts.theme ?? 'cyberpunk';
    const tokens = getTokens(theme);
    const isCyber = theme === 'cyberpunk';

    const isConfirm = preset === 'confirm';
    const iconNode = PresetIcons[preset](isCyber);
    const presetTitleColor: Record<ModalPreset, string> = {
      confirm: isCyber ? 'rgba(0,229,255,0.95)' : 'rgba(59,130,246,0.95)',
      info:    isCyber ? 'rgba(0,229,255,0.95)' : 'rgba(59,130,246,0.95)',
      success: isCyber ? 'rgba(0,230,118,0.95)' : 'rgba(34,197,94,0.9)',
      error:   isCyber ? 'rgba(255,80,110,0.95)' : 'rgba(239,68,68,0.9)',
      warning: isCyber ? 'rgba(255,184,0,0.95)'  : 'rgba(234,179,8,0.9)',
    };

    return (
      <YYC3ThemeProvider theme={theme}>
        <Modal
          visible={visible}
          centered={opts.centered ?? true}
          width={440}
          closable={opts.closable ?? false}
          mask
          maskClosable={false}
          theme={theme}
          footer={null}
          afterClose={destroy}
          onCancel={() => {
            opts.onCancel?.();
            setVisible(false);
          }}
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {/* 图标 */}
            <div style={{ flexShrink: 0, marginTop: '2px' }}>{iconNode}</div>

            {/* 内容 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {opts.title && (
                <div style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: presetTitleColor[preset],
                  fontFamily: tokens.fontFamily,
                  letterSpacing: isCyber ? '0.05em' : '0',
                  marginBottom: '8px',
                }}>
                  {opts.title}
                </div>
              )}
              {opts.content && (
                <div style={{
                  fontSize: '14px',
                  color: tokens.bodyColor,
                  lineHeight: 1.65,
                  fontFamily: tokens.fontFamily,
                }}>
                  {opts.content}
                </div>
              )}
              {/* 操作按钮 */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '24px',
              }}>
                {isConfirm && (
                  <button
                    className="yyc3-modal-cancel-btn"
                    data-theme={theme}
                    onClick={() => { opts.onCancel?.(); setVisible(false); }}
                    style={{
                      padding: '7px 18px',
                      borderRadius: '6px',
                      border: `1px solid ${tokens.cancelBorder}`,
                      background: tokens.cancelBg,
                      color: tokens.cancelColor,
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: tokens.fontFamily,
                      letterSpacing: isCyber ? '0.06em' : '0',
                      textTransform: isCyber ? 'uppercase' : 'none',
                    }}
                  >
                    {opts.cancelText ?? '取 消'}
                  </button>
                )}
                <button
                  className="yyc3-modal-ok-btn"
                  data-theme={theme}
                  onClick={async () => {
                    const r = opts.onOk?.();
                    if (r instanceof Promise) await r;
                    setVisible(false);
                  }}
                  style={{
                    padding: '7px 22px',
                    borderRadius: '6px',
                    border: `1px solid ${tokens.okBorder}`,
                    background: tokens.okBg,
                    color: tokens.okColor,
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: tokens.okShadow,
                    fontFamily: tokens.fontFamily,
                    letterSpacing: isCyber ? '0.08em' : '0',
                    textTransform: isCyber ? 'uppercase' : 'none',
                  }}
                >
                  {opts.okText ?? '确 认'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      </YYC3ThemeProvider>
    );
  }

  root.render(<ModalInstance />);
  return { destroy };
}

// 挂载静态方法
(Modal as typeof Modal & {
  confirm: (opts: PresetOptions) => { destroy: () => void };
  info:    (opts: PresetOptions) => { destroy: () => void };
  success: (opts: PresetOptions) => { destroy: () => void };
  error:   (opts: PresetOptions) => { destroy: () => void };
  warning: (opts: PresetOptions) => { destroy: () => void };
}).confirm = (opts) => createPresetModal('confirm', opts);
(Modal as any).info    = (opts: PresetOptions) => createPresetModal('info',    opts);
(Modal as any).success = (opts: PresetOptions) => createPresetModal('success', opts);
(Modal as any).error   = (opts: PresetOptions) => createPresetModal('error',   opts);
(Modal as any).warning = (opts: PresetOptions) => createPresetModal('warning', opts);
