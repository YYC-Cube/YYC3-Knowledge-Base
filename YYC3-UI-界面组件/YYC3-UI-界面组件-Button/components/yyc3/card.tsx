'use client';

import React, {
  forwardRef,
  useContext,
  createContext,
  type ReactNode,
  type CSSProperties,
  type HTMLAttributes,
  type ImgHTMLAttributes,
} from 'react';

// ─────────────────────────────────────────────
// 主题上下文（与 Button/Input 同模式）
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
export type CardShadow = 'none' | 'small' | 'medium' | 'large';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 卡片标题（渲染在 Card.Header 前） */
  title?: ReactNode;
  /** 右上角操作区 */
  extra?: ReactNode;
  /** 是否显示边框 */
  bordered?: boolean;
  /** 是否显示悬停效果（上浮 + 阴影增强） */
  hoverable?: boolean;
  /** 加载状态（骨架屏） */
  loading?: boolean;
  /** 阴影级别 */
  shadow?: CardShadow;
  /** 强制覆盖主题 */
  theme?: YYC3Theme;
  /** 子内容 */
  children?: ReactNode;
  /** 自定义样式 */
  style?: CSSProperties;
  /** 自定义 className */
  className?: string;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: ReactNode;
  extra?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  style?: CSSProperties;
  /** 移除内边距（用于嵌入 Image 等满铺内容） */
  noPadding?: boolean;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  style?: CSSProperties;
}

export interface CardImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** 图片高度（默认 200px） */
  height?: number | string;
  /** 图片填充方式 */
  objectFit?: CSSProperties['objectFit'];
  style?: CSSProperties;
}

// ─────────────────────────────────────────────
// 主题 Token
// ─────────────────────────────────────────────
interface CardTokens {
  bg: string;
  bgLoading: string;
  border: string;
  borderHover: string;
  headerBorder: string;
  footerBorder: string;
  titleColor: string;
  extraColor: string;
  textColor: string;
  backdropFilter: string;
  shadowNone: string;
  shadowSmall: string;
  shadowMedium: string;
  shadowLarge: string;
  shadowHoverAdd: string;
  skeletonBase: string;
  skeletonShimmer: string;
  glowColor: string;
  scanline: boolean;
  fontFamily: string;
}

function getTokens(theme: YYC3Theme): CardTokens {
  if (theme === 'cyberpunk') {
    return {
      bg: 'rgba(2, 18, 22, 0.95)',
      bgLoading: 'rgba(2, 14, 18, 0.97)',
      border: 'rgba(0, 229, 255, 0.22)',
      borderHover: 'rgba(0, 229, 255, 0.65)',
      headerBorder: 'rgba(0, 229, 255, 0.12)',
      footerBorder: 'rgba(0, 229, 255, 0.1)',
      titleColor: 'rgba(0, 240, 255, 0.95)',
      extraColor: 'rgba(0, 200, 220, 0.65)',
      textColor: 'rgba(0, 220, 240, 0.82)',
      backdropFilter: 'none',
      shadowNone: 'none',
      shadowSmall: '0 2px 8px rgba(0,0,0,0.4), 0 0 12px rgba(0,229,255,0.06)',
      shadowMedium: '0 4px 20px rgba(0,0,0,0.5), 0 0 20px rgba(0,229,255,0.1)',
      shadowLarge: '0 8px 40px rgba(0,0,0,0.65), 0 0 40px rgba(0,229,255,0.16)',
      shadowHoverAdd: '0 12px 48px rgba(0,0,0,0.7), 0 0 60px rgba(0,229,255,0.22)',
      skeletonBase: 'rgba(0, 229, 255, 0.06)',
      skeletonShimmer: 'rgba(0, 229, 255, 0.14)',
      glowColor: 'rgba(0, 229, 255, 0.55)',
      scanline: true,
      fontFamily: "'Courier New', 'Consolas', monospace",
    };
  }
  return {
    bg: 'rgba(255, 255, 255, 0.18)',
    bgLoading: 'rgba(255, 255, 255, 0.14)',
    border: 'rgba(200, 215, 240, 0.45)',
    borderHover: 'rgba(59, 130, 246, 0.5)',
    headerBorder: 'rgba(180, 200, 230, 0.28)',
    footerBorder: 'rgba(180, 200, 230, 0.24)',
    titleColor: 'rgba(15, 25, 60, 0.92)',
    extraColor: 'rgba(60, 90, 180, 0.7)',
    textColor: 'rgba(30, 45, 90, 0.82)',
    backdropFilter: 'blur(16px) saturate(180%)',
    shadowNone: 'none',
    shadowSmall: '0 2px 8px rgba(80,100,180,0.1), inset 0 1px 0 rgba(255,255,255,0.7)',
    shadowMedium: '0 4px 20px rgba(80,100,180,0.14), inset 0 1px 0 rgba(255,255,255,0.75)',
    shadowLarge: '0 8px 40px rgba(80,100,180,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
    shadowHoverAdd: '0 16px 48px rgba(59,130,246,0.22), inset 0 1px 0 rgba(255,255,255,0.85)',
    skeletonBase: 'rgba(180, 200, 230, 0.2)',
    skeletonShimmer: 'rgba(255, 255, 255, 0.5)',
    glowColor: 'rgba(59, 130, 246, 0.3)',
    scanline: false,
    fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
  };
}

// ─────────────────────────────────────────────
// CSS 注入（仅一次）
// ─────────────────────────────────────────────
const CARD_CSS = `
@keyframes yyc3-card-shimmer {
  0%   { background-position: -300px 0; }
  100% { background-position: 300px 0; }
}
@keyframes yyc3-card-pulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}

/* cyberpunk hover */
.yyc3-card[data-theme="cyberpunk"][data-hoverable="true"]:hover {
  transform: translateY(-4px) !important;
  border-color: rgba(0,229,255,0.65) !important;
  box-shadow: 0 12px 48px rgba(0,0,0,0.7), 0 0 60px rgba(0,229,255,0.22) !important;
}

/* liquid-glass hover */
.yyc3-card[data-theme="liquid-glass"][data-hoverable="true"]:hover {
  transform: translateY(-4px) !important;
  border-color: rgba(59,130,246,0.5) !important;
  box-shadow: 0 16px 48px rgba(59,130,246,0.22), inset 0 1px 0 rgba(255,255,255,0.85) !important;
}

/* skeleton shimmer */
.yyc3-skeleton-line {
  border-radius: 4px;
  animation: yyc3-card-shimmer 1.6s infinite linear;
  background-size: 600px 100%;
}

.yyc3-skeleton-circle {
  border-radius: 50%;
  animation: yyc3-card-shimmer 1.6s infinite linear;
  background-size: 600px 100%;
}

/* cyberpunk corner accent */
.yyc3-card-corner {
  position: absolute;
  width: 12px;
  height: 12px;
  pointer-events: none;
}
.yyc3-card-corner-tl { top: -1px; left: -1px; border-top: 2px solid rgba(0,229,255,0.8); border-left: 2px solid rgba(0,229,255,0.8); }
.yyc3-card-corner-tr { top: -1px; right: -1px; border-top: 2px solid rgba(0,229,255,0.8); border-right: 2px solid rgba(0,229,255,0.8); }
.yyc3-card-corner-bl { bottom: -1px; left: -1px; border-bottom: 2px solid rgba(0,229,255,0.8); border-left: 2px solid rgba(0,229,255,0.8); }
.yyc3-card-corner-br { bottom: -1px; right: -1px; border-bottom: 2px solid rgba(0,229,255,0.8); border-right: 2px solid rgba(0,229,255,0.8); }
`;

let cardStyleInjected = false;
function ensureCardStyles() {
  if (cardStyleInjected || typeof document === 'undefined') return;
  cardStyleInjected = true;
  const el = document.createElement('style');
  el.id = 'yyc3-card-styles';
  el.textContent = CARD_CSS;
  document.head.appendChild(el);
}

// ─────────────────────────────────────────────
// 骨架屏（Skeleton）
// ─────────────────────────────────────────────
function Skeleton({ theme }: { theme: YYC3Theme }) {
  const tokens = getTokens(theme);
  const isCyber = theme === 'cyberpunk';

  const shimmerBg = isCyber
    ? `linear-gradient(90deg, ${tokens.skeletonBase} 0%, ${tokens.skeletonShimmer} 50%, ${tokens.skeletonBase} 100%)`
    : `linear-gradient(90deg, ${tokens.skeletonBase} 0%, ${tokens.skeletonShimmer} 50%, ${tokens.skeletonBase} 100%)`;

  const line = (width: string, height = '12px', mb = '10px') => (
    <div
      className="yyc3-skeleton-line"
      style={{
        width,
        height,
        background: shimmerBg,
        marginBottom: mb,
        flexShrink: 0,
      }}
    />
  );

  return (
    <div style={{ padding: '16px' }}>
      {/* 头像 + 标题行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div
          className="yyc3-skeleton-circle"
          style={{ width: '40px', height: '40px', flexShrink: 0, background: shimmerBg }}
        />
        <div style={{ flex: 1 }}>
          {line('60%', '14px', '6px')}
          {line('40%', '10px', '0')}
        </div>
      </div>
      {/* 内容行 */}
      {line('100%', '12px')}
      {line('95%', '12px')}
      {line('80%', '12px')}
      {line('88%', '12px', '0')}
    </div>
  );
}

// ─────────────────────────────────────────────
// Card.Header 子组件
// ─────────────────────────────────────────────
const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, extra, children, style, className, ...rest }, ref) => {
    const { theme } = useYYC3Theme();
    const tokens = getTokens(theme);
    const isCyber = theme === 'cyberpunk';

    return (
      <div
        ref={ref}
        className={`yyc3-card-header ${className ?? ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: `1px solid ${tokens.headerBorder}`,
          gap: '12px',
          flexShrink: 0,
          ...style,
        }}
        {...rest}
      >
        {/* 标题 */}
        {(title || children) && (
          <div style={{
            fontSize: '15px',
            fontWeight: 700,
            color: tokens.titleColor,
            fontFamily: tokens.fontFamily,
            letterSpacing: isCyber ? '0.06em' : '0',
            flex: 1,
            minWidth: 0,
          }}>
            {title ?? children}
          </div>
        )}
        {/* 操作区 */}
        {extra && (
          <div style={{
            flexShrink: 0,
            fontSize: '13px',
            color: tokens.extraColor,
            fontFamily: tokens.fontFamily,
          }}>
            {extra}
          </div>
        )}
      </div>
    );
  }
);
CardHeader.displayName = 'YYC3CardHeader';

// ─────────────────────────────────────────────
// Card.Body 子组件
// ─────────────────────────────────────────────
const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, style, className, noPadding = false, ...rest }, ref) => {
    const { theme } = useYYC3Theme();
    const tokens = getTokens(theme);

    return (
      <div
        ref={ref}
        className={`yyc3-card-body ${className ?? ''}`}
        style={{
          padding: noPadding ? '0' : '16px 20px',
          color: tokens.textColor,
          fontSize: '14px',
          lineHeight: 1.6,
          flex: 1,
          fontFamily: tokens.fontFamily,
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
CardBody.displayName = 'YYC3CardBody';

// ─────────────────────────────────────────────
// Card.Footer 子组件
// ─────────────────────────────────────────────
const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, style, className, ...rest }, ref) => {
    const { theme } = useYYC3Theme();
    const tokens = getTokens(theme);

    return (
      <div
        ref={ref}
        className={`yyc3-card-footer ${className ?? ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 20px',
          borderTop: `1px solid ${tokens.footerBorder}`,
          gap: '8px',
          flexShrink: 0,
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
CardFooter.displayName = 'YYC3CardFooter';

// ─────────────────────────────────────────────
// Card.Image 子组件
// ─────────────────────────────────────────────
const CardImage = forwardRef<HTMLImageElement, CardImageProps>(
  (
    {
      src,
      alt,
      height = 200,
      objectFit = 'cover',
      style,
      className,
      ...rest
    },
    ref
  ) => {
    const { theme } = useYYC3Theme();
    const isCyber = theme === 'cyberpunk';

    return (
      <div
        style={{
          width: '100%',
          height: typeof height === 'number' ? `${height}px` : height,
          overflow: 'hidden',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {/* cyberpunk 扫描线叠加 */}
        {isCyber && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,255,255,0.025) 3px, rgba(0,255,255,0.025) 4px)',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
        )}
        <img
          ref={ref}
          src={src}
          alt={alt}
          className={className}
          style={{
            width: '100%',
            height: '100%',
            objectFit,
            display: 'block',
            filter: isCyber ? 'saturate(0.8) brightness(0.85)' : 'none',
            transition: 'transform 300ms ease-in-out, filter 300ms ease-in-out',
            ...style,
          }}
          {...rest}
        />
      </div>
    );
  }
);
CardImage.displayName = 'YYC3CardImage';

// ─────────────────────────────────────────────
// 阴影计算
// ─────────────────────────────────────────────
function getShadow(shadow: CardShadow, tokens: CardTokens): string {
  switch (shadow) {
    case 'none':   return tokens.shadowNone;
    case 'small':  return tokens.shadowSmall;
    case 'large':  return tokens.shadowLarge;
    default:       return tokens.shadowMedium;
  }
}

// ─────────────────────────────────────────────
// Card 主组件（含静态子组件挂载）
// ─────────────────────────────────────────────
interface CardComponent extends React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>> {
  Header: typeof CardHeader;
  Body: typeof CardBody;
  Footer: typeof CardFooter;
  Image: typeof CardImage;
}

const CardBase = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      title,
      extra,
      bordered = true,
      hoverable = false,
      loading = false,
      shadow = 'medium',
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
    const tokens = getTokens(theme);
    const isCyber = theme === 'cyberpunk';

    if (typeof window !== 'undefined') ensureCardStyles();

    const hasTitleBar = title !== undefined || extra !== undefined;

    const cardStyle: CSSProperties = {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      background: tokens.bg,
      backdropFilter: tokens.backdropFilter,
      WebkitBackdropFilter: tokens.backdropFilter,
      border: bordered
        ? `1px solid ${tokens.border}`
        : '1px solid transparent',
      borderRadius: '8px',
      boxShadow: getShadow(shadow, tokens),
      overflow: 'hidden',
      transition: 'transform 300ms ease-in-out, box-shadow 300ms ease-in-out, border-color 300ms ease-in-out',
      cursor: hoverable ? 'pointer' : 'default',
      fontFamily: tokens.fontFamily,
    };

    return (
      <YYC3ThemeProvider theme={theme}>
        <div
          ref={ref}
          className={`yyc3-card ${className ?? ''}`}
          data-theme={theme}
          data-hoverable={hoverable ? 'true' : 'false'}
          style={{ ...cardStyle, ...style }}
          {...rest}
        >
          {/* 赛博朋克扫描线 */}
          {isCyber && !loading && (
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.005) 2px, rgba(0,255,255,0.005) 4px)',
              pointerEvents: 'none',
              zIndex: 0,
            }} />
          )}

          {/* 赛博朋克顶部光带 */}
          {isCyber && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.5), transparent)',
              pointerEvents: 'none',
              zIndex: 2,
            }} />
          )}

          {/* 赛博朋克四角装饰 */}
          {isCyber && (
            <>
              <div className="yyc3-card-corner yyc3-card-corner-tl" />
              <div className="yyc3-card-corner yyc3-card-corner-tr" />
              <div className="yyc3-card-corner yyc3-card-corner-bl" />
              <div className="yyc3-card-corner yyc3-card-corner-br" />
            </>
          )}

          {/* 液态玻璃高光反射 */}
          {!isCyber && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: '50%',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)',
              pointerEvents: 'none',
              zIndex: 0,
              borderRadius: '8px 8px 0 0',
            }} />
          )}

          {/* 内容区（z-index: 1 覆盖装饰层） */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
            {loading ? (
              <Skeleton theme={theme} />
            ) : (
              <>
                {/* 顶部内置标题栏 */}
                {hasTitleBar && (
                  <CardHeader title={title} extra={extra} />
                )}
                {/* 子内容 */}
                {children}
              </>
            )}
          </div>
        </div>
      </YYC3ThemeProvider>
    );
  }
);

CardBase.displayName = 'YYC3Card';

// 挂载静态子组件
export const Card = CardBase as CardComponent;
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.Image = CardImage;
