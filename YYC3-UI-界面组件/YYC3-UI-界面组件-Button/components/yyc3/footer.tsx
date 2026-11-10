'use client';

/**
 * YYC³ Claw UI — Footer 组件
 *
 * 符合 /docs/README.md 设计系统对接规范：
 *   § 1.1 BaseComponentProps 统一接口
 *   § 1.2 ThemeVariables 主题系统
 *   § 1.3 可访问性（role=contentinfo, aria-label, 语义化链接）
 *   § 1.4 响应式设计（CSS Grid 自适应列数）
 *
 * 零外部依赖，仅依赖 React。
 */

import React, {
  forwardRef,
  useState,
  type ReactNode,
  type CSSProperties,
  type HTMLAttributes,
} from 'react';

import {
  getThemeTokens,
  cx,
  breakpoints,
  type YYC3Theme,
  type BaseComponentProps,
  type ThemeProps,
} from './theme-tokens';

import { useYYC3Theme, YYC3ThemeProvider } from './layout';

// ─────────────────────────────────────────────
// 类型定义（§ 1.1）
// ─────────────────────────────────────────────
export interface FooterLink {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterProps
  extends BaseComponentProps,
    ThemeProps,
    Omit<HTMLAttributes<HTMLElement>, 'color'> {
  /** 左侧 Logo / 品牌内容 */
  logo?: ReactNode;
  /** 品牌描述 */
  description?: string;
  /** 链接分组（多列） */
  columns?: FooterColumn[];
  /** 社交媒体链接 */
  socials?: { label: string; icon: ReactNode; href?: string; onClick?: () => void }[];
  /** 版权声明 */
  copyright?: ReactNode;
  /** 底部附加信息 */
  extra?: ReactNode;
  /** 显示顶部分割线 @default true */
  bordered?: boolean;
  /** 紧凑模式（单行） @default false */
  compact?: boolean;
}

// ─────────────────────────────────────────────
// 主题 Token（从共享 ThemeVariables 派生）
// ─────────────────────────────────────────────
interface FooterTokens {
  bg: string;
  border: string;
  logoColor: string;
  descColor: string;
  colTitleColor: string;
  linkColor: string;
  linkHoverColor: string;
  copyrightColor: string;
  socialBg: string;
  socialBorder: string;
  socialColor: string;
  socialHoverBg: string;
  socialHoverColor: string;
  glowLine: string;
  fontFamily: string;
  backdropFilter: string;
  dividerColor: string;
}

function getFooterTokens(theme: YYC3Theme): FooterTokens {
  const t = getThemeTokens(theme);
  if (theme === 'cyberpunk') {
    return {
      bg:              t.footerBg,
      border:          t.colors.border,
      logoColor:       t.colors.primary,
      descColor:       'rgba(0,200,220,0.5)',
      colTitleColor:   'rgba(0,229,255,0.75)',
      linkColor:       'rgba(0,190,210,0.55)',
      linkHoverColor:  t.colors.primary,
      copyrightColor:  'rgba(0,180,200,0.4)',
      socialBg:        'rgba(0,229,255,0.06)',
      socialBorder:    'rgba(0,229,255,0.18)',
      socialColor:     'rgba(0,200,220,0.65)',
      socialHoverBg:   'rgba(0,229,255,0.14)',
      socialHoverColor:t.colors.primary,
      glowLine:        `linear-gradient(90deg,transparent 0%,${t.glowColor} 50%,transparent 100%)`,
      fontFamily:      t.fontFamily,
      backdropFilter:  'none',
      dividerColor:    t.colors.border,
    };
  }
  return {
    bg:              t.footerBg,
    border:          t.colors.border,
    logoColor:       'rgba(10,20,60,0.9)',
    descColor:       'rgba(60,80,140,0.55)',
    colTitleColor:   'rgba(20,35,80,0.8)',
    linkColor:       'rgba(60,80,150,0.6)',
    linkHoverColor:  t.colors.primary,
    copyrightColor:  'rgba(80,100,160,0.45)',
    socialBg:        'rgba(255,255,255,0.5)',
    socialBorder:    'rgba(180,200,235,0.5)',
    socialColor:     'rgba(60,80,150,0.65)',
    socialHoverBg:   'rgba(59,130,246,0.1)',
    socialHoverColor:t.colors.primary,
    glowLine:        `linear-gradient(90deg,transparent 0%,${t.glowColor} 50%,transparent 100%)`,
    fontFamily:      t.fontFamily,
    backdropFilter:  t.backdropFilter,
    dividerColor:    t.colors.border,
  };
}

// ─────────────────────────────────────────────
// CSS 注入（响应式 Grid § 1.4）
// ─────────────────────────────────────────────
const FOOTER_CSS = `
.yyc3-footer-link {
  transition: color 160ms ease-in-out !important;
  text-decoration: none !important;
  background: none !important;
  border: none !important;
  padding: 0 !important;
  cursor: pointer !important;
  font-family: inherit !important;
}
.yyc3-footer-link:focus-visible { outline: 2px solid currentColor !important; outline-offset: 2px !important; border-radius: 2px; }
.yyc3-footer-social-btn { transition: background 160ms ease-in-out, color 160ms ease-in-out, border-color 160ms ease-in-out !important; }
.yyc3-footer-social-btn:focus-visible { outline: 2px solid currentColor !important; outline-offset: 2px !important; border-radius: 6px; }

/* 响应式列布局（§ 1.4） */
.yyc3-footer-grid { display: grid; grid-template-columns: 1fr repeat(auto-fit, minmax(120px, auto)); gap: 40px; }
@media (max-width: ${breakpoints.md}) {
  .yyc3-footer-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: ${breakpoints.sm}) {
  .yyc3-footer-grid { grid-template-columns: 1fr; gap: 24px; }
}
`;

let footerStyleInjected = false;
function ensureFooterStyles() {
  if (footerStyleInjected || typeof document === 'undefined') return;
  footerStyleInjected = true;
  const el = document.createElement('style');
  el.id = 'yyc3-footer-styles';
  el.textContent = FOOTER_CSS;
  document.head.appendChild(el);
}

// ─────────────────────────────────────────────
// FooterLinkItem
// ─────────────────────────────────────────────
function FooterLinkItem({ link, tokens }: { link: FooterLink; tokens: FooterTokens }) {
  const [hovered, setHovered] = useState(false);
  const Tag = link.href ? 'a' : 'button';
  return React.createElement(
    Tag,
    {
      href: link.href,
      onClick: link.onClick,
      className: 'yyc3-footer-link',
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      style: { color: hovered ? tokens.linkHoverColor : tokens.linkColor, fontSize: '13px', fontFamily: tokens.fontFamily, display: 'block' } as CSSProperties,
    } as React.HTMLAttributes<HTMLElement> & { href?: string },
    link.label
  );
}

// ─────────────────────────────────────────────
// SocialButton
// ─────────────────────────────────────────────
function SocialButton({ social, tokens }: { social: { label: string; icon: ReactNode; href?: string; onClick?: () => void }; tokens: FooterTokens }) {
  const [hovered, setHovered] = useState(false);
  const Tag = social.href ? 'a' : 'button';
  return React.createElement(
    Tag,
    {
      href: social.href,
      onClick: social.onClick,
      'aria-label': social.label,
      className: 'yyc3-footer-social-btn',
      target: social.href ? '_blank' : undefined,
      rel: social.href ? 'noopener noreferrer' : undefined,
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '34px', height: '34px', borderRadius: '6px',
        background: hovered ? tokens.socialHoverBg : tokens.socialBg,
        border: `1px solid ${tokens.socialBorder}`,
        color: hovered ? tokens.socialHoverColor : tokens.socialColor,
        cursor: 'pointer', textDecoration: 'none', fontSize: '16px',
      } as CSSProperties,
    } as React.HTMLAttributes<HTMLElement> & { href?: string; target?: string; rel?: string },
    social.icon
  );
}

// ─────────────────────────────────────────────
// Footer 主组件
// ─────────────────────────────────────────────
export const Footer = forwardRef<HTMLElement, FooterProps>(
  (
    {
      logo,
      description,
      columns = [],
      socials = [],
      copyright,
      extra,
      bordered = true,
      compact = false,
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
    const tokens = getFooterTokens(theme);
    const isCyber = theme === 'cyberpunk';

    if (typeof window !== 'undefined') ensureFooterStyles();

    const footerStyle: CSSProperties = {
      width: '100%',
      background: tokens.bg,
      backdropFilter: tokens.backdropFilter,
      WebkitBackdropFilter: tokens.backdropFilter,
      borderTop: bordered ? `1px solid ${tokens.border}` : 'none',
      fontFamily: tokens.fontFamily,
      boxSizing: 'border-box',
      position: 'relative',
    };

    return (
      <YYC3ThemeProvider theme={theme}>
        <footer
          ref={ref}
          className={cx('yyc3-footer', className)}
          data-theme={theme}
          role="contentinfo"
          style={{ ...footerStyle, ...style }}
          {...rest}
        >
          {/* 赛博朋克顶部发光线 */}
          {isCyber && bordered && (
            <div aria-hidden="true" style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: '1px', background: tokens.glowLine, pointerEvents: 'none',
            }} />
          )}

          <div style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: compact ? '20px 24px' : '40px 24px 24px',
            boxSizing: 'border-box',
          }}>
            {compact ? (
              /* ── 紧凑模式 ── */
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                {logo && (
                  <div style={{ color: tokens.logoColor, fontWeight: 800, fontSize: '16px' }}>
                    {logo}
                  </div>
                )}
                {copyright && (
                  <div style={{ color: tokens.copyrightColor, fontSize: '13px', textAlign: 'center' }}>
                    {copyright}
                  </div>
                )}
                {socials.length > 0 && (
                  <div role="list" aria-label="社交媒体链接" style={{ display: 'flex', gap: '8px' }}>
                    {socials.map((s, i) => (
                      <div key={i} role="listitem"><SocialButton social={s} tokens={tokens} /></div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ── 完整模式 ── */
              <>
                {(logo || description || columns.length > 0) && (
                  <div className="yyc3-footer-grid" style={{ marginBottom: '32px' }}>
                    {(logo || description) && (
                      <div style={{ maxWidth: '260px' }}>
                        {logo && (
                          <div style={{
                            color: tokens.logoColor, fontWeight: 800, fontSize: '20px',
                            marginBottom: '12px', letterSpacing: isCyber ? '0.1em' : '0',
                          }}>
                            {logo}
                          </div>
                        )}
                        {description && (
                          <p style={{ color: tokens.descColor, fontSize: '13px', lineHeight: 1.7, margin: 0 }}>
                            {description}
                          </p>
                        )}
                      </div>
                    )}

                    {columns.map((col, ci) => (
                      <nav key={ci} aria-label={`${col.title} 链接`}>
                        <div style={{
                          color: tokens.colTitleColor, fontSize: '12px', fontWeight: 700,
                          letterSpacing: isCyber ? '0.12em' : '0.06em', textTransform: 'uppercase', marginBottom: '14px',
                        }}>
                          {col.title}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {col.links.map((link, li) => (
                            <FooterLinkItem key={li} link={link} tokens={tokens} />
                          ))}
                        </div>
                      </nav>
                    ))}
                  </div>
                )}

                {children}

                {/* 分割线 */}
                <div style={{ height: '1px', background: tokens.dividerColor, margin: '0 0 20px' }} />

                {/* 底部行 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  {copyright && (
                    <small style={{ color: tokens.copyrightColor, fontSize: '12px' }}>
                      {copyright}
                    </small>
                  )}
                  {extra && (
                    <div style={{ color: tokens.copyrightColor, fontSize: '12px' }}>{extra}</div>
                  )}
                  {socials.length > 0 && (
                    <div role="list" aria-label="社交媒体链接" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {socials.map((s, i) => (
                        <div key={i} role="listitem"><SocialButton social={s} tokens={tokens} /></div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </footer>
      </YYC3ThemeProvider>
    );
  }
);

Footer.displayName = 'YYC3Footer';
