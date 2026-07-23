'use client';

/**
 * YYC³ Claw UI — Header 组件
 *
 * 符合 /docs/README.md 设计系统对接规范：
 *   § 1.1 BaseComponentProps 统一接口
 *   § 1.2 ThemeVariables 主题系统
 *   § 1.3 可访问性（role/aria/键盘导航/焦点管理）
 *   § 1.4 响应式设计（移动端汉堡菜单）
 *
 * 零外部依赖，仅依赖 React。
 */

import React, {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react';

import { getThemeTokens, cx, type YYC3Theme, type BaseComponentProps, type ThemeProps } from './theme-tokens';
import { useYYC3Theme, YYC3ThemeProvider } from './layout';

// ─────────────────────────────────────────────
// 类型定义（§ 1.1）
// ─────────────────────────────────────────────
export interface NavItem {
  key: string;
  label: ReactNode;
  href?: string;
  icon?: ReactNode;
  disabled?: boolean;
  /** 子导航项（下拉菜单） */
  children?: NavItem[];
}

export interface HeaderProps
  extends BaseComponentProps,
    ThemeProps,
    Omit<HTMLAttributes<HTMLElement>, 'color'> {
  /** 左侧 Logo 区域 */
  logo?: ReactNode;
  /** 导航项列表 */
  nav?: NavItem[];
  /** 当前激活项 key */
  activeKey?: string;
  /** 导航点击回调 */
  onNavClick?: (key: string, item: NavItem) => void;
  /** 右侧操作区 */
  actions?: ReactNode;
  /** 是否固定在顶部 @default true */
  sticky?: boolean;
  /** Header 高度（px） @default 60 */
  height?: number;
  /** 滚动后收缩（降低高度 + 加深背景） @default false */
  shrinkOnScroll?: boolean;
}

// ─────────────────────────────────────────────
// 主题 Token（基于共享 ThemeVariables）
// ─────────────────────────────────────────────
interface HeaderTokens {
  bg: string;
  bgScrolled: string;
  border: string;
  borderScrolled: string;
  logoColor: string;
  navColor: string;
  navActiveColor: string;
  navActiveBg: string;
  navHoverColor: string;
  navHoverBg: string;
  navActiveBorder: string;
  fontFamily: string;
  backdropFilter: string;
  backdropFilterScrolled: string;
  glowLine: string;
  shadow: string;
  shadowScrolled: string;
  mobileMenuBg: string;
  mobileMenuBorder: string;
}

function getHeaderTokens(theme: YYC3Theme): HeaderTokens {
  const t = getThemeTokens(theme);
  if (theme === 'cyberpunk') {
    return {
      bg:                    'rgba(2,10,14,0.88)',
      bgScrolled:            'rgba(2,10,14,0.97)',
      border:                t.colors.border,
      borderScrolled:        'rgba(0,229,255,0.28)',
      logoColor:             t.colors.primary,
      navColor:              'rgba(0,210,230,0.7)',
      navActiveColor:        '#00f0ff',
      navActiveBg:           'rgba(0,229,255,0.1)',
      navHoverColor:         t.colors.primary,
      navHoverBg:            'rgba(0,229,255,0.06)',
      navActiveBorder:       'rgba(0,229,255,0.55)',
      fontFamily:            t.fontFamily,
      backdropFilter:        'none',
      backdropFilterScrolled:'none',
      glowLine:              `linear-gradient(90deg,transparent 0%,${t.glowColor} 50%,transparent 100%)`,
      shadow:                `0 1px 0 ${t.colors.border}`,
      shadowScrolled:        `0 4px 24px rgba(0,0,0,0.6),0 0 40px rgba(0,229,255,0.07)`,
      mobileMenuBg:          'rgba(2,10,14,0.99)',
      mobileMenuBorder:      'rgba(0,229,255,0.15)',
    };
  }
  return {
    bg:                    t.headerBg,
    bgScrolled:            'rgba(255,255,255,0.88)',
    border:                t.colors.border,
    borderScrolled:        'rgba(180,200,235,0.55)',
    logoColor:             'rgba(10,20,60,0.92)',
    navColor:              'rgba(40,60,120,0.68)',
    navActiveColor:        t.colors.primary,
    navActiveBg:           'rgba(59,130,246,0.09)',
    navHoverColor:         'rgba(37,99,235,0.9)',
    navHoverBg:            'rgba(59,130,246,0.06)',
    navActiveBorder:       'rgba(59,130,246,0.5)',
    fontFamily:            t.fontFamily,
    backdropFilter:        t.backdropFilter,
    backdropFilterScrolled:'blur(24px) saturate(200%)',
    glowLine:              `linear-gradient(90deg,transparent 0%,${t.glowColor} 50%,transparent 100%)`,
    shadow:                `0 1px 0 rgba(180,200,235,0.3),0 2px 12px rgba(80,100,180,0.06)`,
    shadowScrolled:        `0 4px 24px rgba(80,100,180,0.12)`,
    mobileMenuBg:          'rgba(255,255,255,0.97)',
    mobileMenuBorder:      'rgba(200,215,240,0.45)',
  };
}

// ─────────────────────────────────────────────
// CSS 注入（§ 1.3 焦点 / 过渡 / 响应式）
// ─────────────────────────────────────────────
const HEADER_CSS = `
/* 过渡动画（§ 1.2 transitions.normal） */
.yyc3-header { transition: height 280ms ease-in-out, box-shadow 280ms ease-in-out, background 280ms ease-in-out, border-color 280ms ease-in-out !important; }
.yyc3-nav-btn { transition: background 180ms ease-in-out, color 180ms ease-in-out, box-shadow 180ms ease-in-out !important; }

/* 可访问性：焦点可见（§ 1.3） */
.yyc3-nav-btn:focus-visible { outline: 2px solid currentColor !important; outline-offset: 2px !important; border-radius: 6px; }
.yyc3-header-hamburger:focus-visible { outline: 2px solid currentColor !important; outline-offset: 2px !important; border-radius: 4px; }

/* 移动菜单动画 */
@keyframes yyc3-mobile-menu-in { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
.yyc3-mobile-menu { animation: yyc3-mobile-menu-in 200ms ease-out forwards; }

/* 响应式（§ 1.4）：仅移动端显示汉堡菜单 */
.yyc3-header-desktop-nav { display: flex; }
.yyc3-header-hamburger    { display: none; }
@media (max-width: 767px) {
  .yyc3-header-desktop-nav { display: none !important; }
  .yyc3-header-hamburger    { display: flex !important; }
}
`;

let headerStyleInjected = false;
function ensureHeaderStyles() {
  if (headerStyleInjected || typeof document === 'undefined') return;
  headerStyleInjected = true;
  const el = document.createElement('style');
  el.id = 'yyc3-header-styles';
  el.textContent = HEADER_CSS;
  document.head.appendChild(el);
}

// ─────────────────────────────────────────────
// 汉堡图标
// ─────────────────────────────────────────────
const HamburgerIcon = ({ open, color }: { open: boolean; color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {open ? (
      <>
        <line x1="5" y1="5" x2="19" y2="19" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="19" y1="5" x2="5" y2="19" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      </>
    ) : (
      <>
        <line x1="3" y1="7"  x2="21" y2="7"  stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="3" y1="17" x2="21" y2="17" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      </>
    )}
  </svg>
);

// ─────────────────────────────────────────────
// NavButton（桌面端单项，含键盘导航 § 1.3）
// ─────────────────────────────────────────────
interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  tokens: HeaderTokens;
  isCyber: boolean;
  onClick: () => void;
}

function NavButton({ item, isActive, tokens, isCyber, onClick }: NavButtonProps) {
  const [hovered, setHovered] = useState(false);
  const Tag = item.href ? 'a' : 'button';

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && !item.href) {
      e.preventDefault();
      if (!item.disabled) onClick();
    }
  };

  const navStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: tokens.fontFamily.includes('Courier') ? '4px' : '6px',
    border: 'none',
    background: isActive ? tokens.navActiveBg : hovered ? tokens.navHoverBg : 'transparent',
    color: isActive ? tokens.navActiveColor : hovered ? tokens.navHoverColor : tokens.navColor,
    fontSize: '14px',
    fontWeight: isActive ? 700 : 500,
    fontFamily: tokens.fontFamily,
    letterSpacing: isCyber ? '0.05em' : '0',
    textTransform: isCyber ? 'uppercase' : 'none',
    cursor: item.disabled ? 'not-allowed' : 'pointer',
    opacity: item.disabled ? 0.4 : 1,
    textDecoration: 'none',
    outline: 'none',
    whiteSpace: 'nowrap',
    boxShadow: isActive && isCyber
      ? `0 0 8px rgba(0,229,255,0.2), inset 0 0 0 1px ${tokens.navActiveBorder}`
      : isActive
        ? `inset 0 0 0 1px ${tokens.navActiveBorder}`
        : 'none',
  };

  return React.createElement(
    Tag,
    {
      href: item.href,
      className: 'yyc3-nav-btn',
      role: item.href ? undefined : 'button',
      'aria-current': isActive ? 'page' : undefined,
      'aria-disabled': item.disabled,
      tabIndex: item.disabled ? -1 : 0,
      onClick: item.disabled ? undefined : onClick,
      onKeyDown: handleKeyDown,
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      style: navStyle,
    } as React.HTMLAttributes<HTMLElement> & { href?: string },
    item.icon
      ? React.createElement('span', { 'aria-hidden': true, style: { display: 'flex' } }, item.icon)
      : null,
    item.label
  );
}

// ─────────────────────────────────────────────
// Header 主组件
// ─────────────────────────────────────────────
export const Header = forwardRef<HTMLElement, HeaderProps>(
  (
    {
      logo,
      nav = [],
      activeKey,
      onNavClick,
      actions,
      sticky = true,
      height = 60,
      shrinkOnScroll = false,
      theme: themeProp,
      children,
      style,
      className,
      ...rest
    },
    ref
  ) => {
    const { theme: ctxTheme } = useYYC3Theme();
    const theme = themeProp ?? ctxTheme;
    const tokens = getHeaderTokens(theme);
    const isCyber = theme === 'cyberpunk';

    const [scrolled, setScrolled]     = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const mobileMenuRef               = useRef<HTMLDivElement>(null);

    if (typeof window !== 'undefined') ensureHeaderStyles();

    // 滚动监听
    useEffect(() => {
      if (!shrinkOnScroll) return;
      const handler = () => setScrolled(window.scrollY > 12);
      window.addEventListener('scroll', handler, { passive: true });
      handler();
      return () => window.removeEventListener('scroll', handler);
    }, [shrinkOnScroll]);

    // ESC 关闭移动菜单（§ 1.3）
    useEffect(() => {
      if (!mobileOpen) return;
      const handler = (e: globalThis.KeyboardEvent) => {
        if (e.key === 'Escape') setMobileOpen(false);
      };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }, [mobileOpen]);

    const currentHeight = shrinkOnScroll && scrolled ? Math.max(height - 14, 44) : height;

    const headerStyle: CSSProperties = {
      position: sticky ? 'sticky' : 'relative',
      top: sticky ? 0 : undefined,
      zIndex: 200,
      width: '100%',
      height: `${currentHeight}px`,
      display: 'flex',
      alignItems: 'center',
      background: scrolled ? tokens.bgScrolled : tokens.bg,
      backdropFilter: scrolled ? tokens.backdropFilterScrolled : tokens.backdropFilter,
      WebkitBackdropFilter: scrolled ? tokens.backdropFilterScrolled : tokens.backdropFilter,
      borderBottom: `1px solid ${scrolled ? tokens.borderScrolled : tokens.border}`,
      boxShadow: scrolled ? tokens.shadowScrolled : tokens.shadow,
      boxSizing: 'border-box',
      fontFamily: tokens.fontFamily,
    };

    const handleNavClick = useCallback(
      (key: string, item: NavItem) => {
        onNavClick?.(key, item);
        setMobileOpen(false);
      },
      [onNavClick]
    );

    return (
      <YYC3ThemeProvider theme={theme}>
        <header
          ref={ref}
          className={cx('yyc3-header', className)}
          data-theme={theme}
          role="banner"
          style={{ ...headerStyle, ...style }}
          {...rest}
        >
          {/* 赛博朋克底部发光线 */}
          {isCyber && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                height: '1px',
                background: tokens.glowLine,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* 主内容行 */}
          <div style={{
            width: '100%',
            maxWidth: '1440px',
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            height: '100%',
            boxSizing: 'border-box',
          }}>
            {/* Logo */}
            {logo && (
              <div style={{
                flexShrink: 0,
                color: tokens.logoColor,
                fontWeight: 800,
                fontSize: '18px',
                letterSpacing: isCyber ? '0.1em' : '0.01em',
                userSelect: 'none',
              }}>
                {logo}
              </div>
            )}

            {/* 桌面导航（aria-label § 1.3） */}
            {nav.length > 0 && (
              <nav
                aria-label="主导航"
                className="yyc3-header-desktop-nav"
                style={{ alignItems: 'center', gap: '2px', flex: 1 }}
              >
                {nav.map((item) => (
                  <NavButton
                    key={item.key}
                    item={item}
                    isActive={activeKey === item.key}
                    tokens={tokens}
                    isCyber={isCyber}
                    onClick={() => handleNavClick(item.key, item)}
                  />
                ))}
              </nav>
            )}

            {nav.length === 0 && <div style={{ flex: 1 }} />}

            {/* 右侧操作区 */}
            {actions && (
              <div
                role="toolbar"
                aria-label="操作区"
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'inherit',
                }}
              >
                {actions}
              </div>
            )}

            {children}

            {/* 移动端汉堡按钮（§ 1.3 ARIA） */}
            {nav.length > 0 && (
              <button
                className="yyc3-header-hamburger"
                aria-label={mobileOpen ? '关闭导航菜单' : '打开导航菜单'}
                aria-expanded={mobileOpen}
                aria-controls="yyc3-mobile-nav"
                onClick={() => setMobileOpen(v => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '6px',
                  cursor: 'pointer',
                  color: tokens.navColor,
                  borderRadius: '6px',
                  flexShrink: 0,
                  display: 'none', // 由 CSS media query 控制
                }}
              >
                <HamburgerIcon open={mobileOpen} color={tokens.navColor} />
              </button>
            )}
          </div>

          {/* 移动端导航菜单（§ 1.3 焦点陷阱） */}
          {mobileOpen && nav.length > 0 && (
            <nav
              id="yyc3-mobile-nav"
              ref={mobileMenuRef}
              className="yyc3-mobile-menu"
              aria-label="移动端导航"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: tokens.mobileMenuBg,
                backdropFilter: tokens.backdropFilter,
                WebkitBackdropFilter: tokens.backdropFilter,
                borderBottom: `1px solid ${tokens.mobileMenuBorder}`,
                padding: '8px 16px 16px',
                zIndex: 199,
              }}
            >
              {nav.map((item) => {
                const isActive = activeKey === item.key;
                return (
                  <div
                    key={item.key}
                    role="button"
                    tabIndex={item.disabled ? -1 : 0}
                    aria-current={isActive ? 'page' : undefined}
                    aria-disabled={item.disabled}
                    onClick={() => !item.disabled && handleNavClick(item.key, item)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !item.disabled) {
                        e.preventDefault();
                        handleNavClick(item.key, item);
                      }
                    }}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '6px',
                      cursor: item.disabled ? 'not-allowed' : 'pointer',
                      color: isActive ? tokens.navActiveColor : tokens.navColor,
                      background: isActive ? tokens.navActiveBg : 'transparent',
                      fontSize: '15px',
                      fontWeight: isActive ? 700 : 500,
                      fontFamily: tokens.fontFamily,
                      letterSpacing: isCyber ? '0.06em' : '0',
                      textTransform: isCyber ? 'uppercase' : 'none',
                      opacity: item.disabled ? 0.4 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      outline: 'none',
                    }}
                  >
                    {item.icon && <span aria-hidden="true">{item.icon}</span>}
                    {item.label}
                  </div>
                );
              })}
            </nav>
          )}
        </header>
      </YYC3ThemeProvider>
    );
  }
);

Header.displayName = 'YYC3Header';
