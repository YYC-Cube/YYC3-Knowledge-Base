'use client';

/**
 * YYC³ Claw UI — Container 组件
 *
 * 符合 /docs/README.md 设计系统对接规范：
 *   § 1.1 BaseComponentProps 统一接口
 *   § 1.2 ThemeVariables 主题系统
 *   § 1.4 响应式断点 breakpoints（xs/sm/md/lg/xl/xxl）
 *
 * 零外部依赖，仅依赖 React。
 */

import React, {
  forwardRef,
  type HTMLAttributes,
  type CSSProperties,
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
// 类型定义
// ─────────────────────────────────────────────

/** 预设最大宽度档位（与 README 断点对应） */
export type ContainerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'fluid';

/** 内边距预设 */
export type ContainerPadding = 'none' | 'sm' | 'md' | 'lg';

export interface ContainerProps
  extends BaseComponentProps,
    ThemeProps,
    Omit<HTMLAttributes<HTMLDivElement>, 'color'> {
  /**
   * 最大宽度预设
   * xs=480  sm=576  md=768  lg=1024  xl=1280  2xl=1536  full=100%  fluid=无限制
   * @default 'xl'
   */
  size?: ContainerSize;
  /**
   * 水平内边距预设
   * none=0  sm=12px  md=24px  lg=40px
   * @default 'md'
   */
  padding?: ContainerPadding;
  /** 是否水平居中 @default true */
  centered?: boolean;
  /** 是否撑满父级高度 @default false */
  fullHeight?: boolean;
  /**
   * Section 模式：启用主题化背景 + 圆角边框
   * 适合页面中独立视觉分区
   * @default false
   */
  section?: boolean;
  /**
   * 是否响应式缩进：在窄屏自动减小 padding
   * @default true
   */
  responsive?: boolean;
}

// ─────────────────────────────────────────────
// 尺寸映射（对应 README 断点）
// ─────────────────────────────────────────────
const SIZE_MAP: Record<ContainerSize, string> = {
  xs:    breakpoints.sm,    // 576px
  sm:    breakpoints.md,    // 768px
  md:    breakpoints.lg,    // 992px
  lg:    breakpoints.xl,    // 1200px
  xl:    '1280px',
  '2xl': '1536px',
  full:  '100%',
  fluid: 'none',
};

const PADDING_MAP: Record<ContainerPadding, string> = {
  none: '0',
  sm:   '0 12px',
  md:   '0 24px',
  lg:   '0 40px',
};

// ─────────────────────────────────────────────
// 响应式 CSS 注入（一次性）
// ─────────────────────────────────────────────
const CONTAINER_CSS = `
/* 响应式内边距缩减 */
@media (max-width: ${breakpoints.md}) {
  .yyc3-container[data-responsive="true"] { padding-left: 16px !important; padding-right: 16px !important; }
}
@media (max-width: ${breakpoints.sm}) {
  .yyc3-container[data-responsive="true"] { padding-left: 12px !important; padding-right: 12px !important; }
}
`;

let containerStyleInjected = false;
function ensureContainerStyles() {
  if (containerStyleInjected || typeof document === 'undefined') return;
  containerStyleInjected = true;
  const el = document.createElement('style');
  el.id = 'yyc3-container-styles';
  el.textContent = CONTAINER_CSS;
  document.head.appendChild(el);
}

// ─────────────────────────────────────────────
// Container 组件
// ─────────────────────────────────────────────
export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      size = 'xl',
      padding = 'md',
      centered = true,
      fullHeight = false,
      section = false,
      responsive = true,
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
    const tokens = getThemeTokens(theme);

    if (typeof window !== 'undefined') ensureContainerStyles();

    const maxWidth = SIZE_MAP[size];
    const paddingValue = PADDING_MAP[padding];

    const containerStyle: CSSProperties = {
      width: '100%',
      maxWidth: maxWidth === 'none' ? undefined : maxWidth,
      padding: section ? tokens.spacing.lg : paddingValue,
      margin: centered ? '0 auto' : undefined,
      height: fullHeight ? '100%' : undefined,
      boxSizing: 'border-box',
      position: 'relative',
      // Section 视觉分区
      ...(section && {
        background: tokens.surfaceBg,
        borderRadius: tokens.borderRadius.lg,
        border: `1px solid ${tokens.colors.border}`,
        backdropFilter: tokens.backdropFilter,
        WebkitBackdropFilter: tokens.backdropFilter,
        boxShadow: tokens.shadows.sm,
        // 赛博朋克：顶部霓虹线
        ...(theme === 'cyberpunk' && {
          borderTop: `1px solid ${tokens.glowColor}`,
          boxShadow: `0 0 16px rgba(0,229,255,0.06), inset 0 1px 0 rgba(0,229,255,0.1)`,
        }),
      }),
    };

    return (
      <div
        ref={ref}
        className={cx('yyc3-container', className)}
        data-responsive={responsive ? 'true' : 'false'}
        style={{ ...containerStyle, ...style }}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

Container.displayName = 'YYC3Container';
