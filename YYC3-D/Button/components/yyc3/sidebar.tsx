'use client';

/**
 * YYC³ Claw UI — Sidebar 组件
 *
 * 符合 /docs/README.md 设计系统对接规范：
 *   § 1.1 BaseComponentProps 统一接口
 *   § 1.2 ThemeVariables 主题系统
 *   § 1.3 可访问性（role=navigation/tree/treeitem, aria-expanded, Tab/Enter/Space/ESC）
 *   § 1.4 响应式设计（移动端自动隐藏）
 *
 * 零外部依赖，仅依赖 React。
 */

import React, {
  forwardRef,
  useState,
  useCallback,
  type ReactNode,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react';

import {
  getThemeTokens,
  cx,
  type YYC3Theme,
  type BaseComponentProps,
  type ThemeProps,
} from './theme-tokens';

import { useYYC3Theme, YYC3ThemeProvider } from './layout';

// ─────────────────────────────────────────────
// 类型定义（§ 1.1）
// ─────────────────────────────────────────────
export interface SidebarItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
  /** 仅作视觉分割线，不渲染为导航项 */
  divider?: boolean;
  children?: SidebarItem[];
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

export type SidebarPlacement = 'left' | 'right';

export interface SidebarProps
  extends BaseComponentProps,
    ThemeProps,
    Omit<HTMLAttributes<HTMLElement>, 'color'> {
  /** 扁平导航项 */
  items?: SidebarItem[];
  /** 分组导航模式（优先于 items） */
  sections?: SidebarSection[];
  /** 当前激活项 key */
  activeKey?: string;
  /** 已展开的子菜单 keys（受控） */
  openKeys?: string[];
  /** 默认展开的子菜单 keys @default [] */
  defaultOpenKeys?: string[];
  /** 点击回调 */
  onItemClick?: (key: string, item: SidebarItem) => void;
  /** 折叠状态（受控） */
  collapsed?: boolean;
  /** 默认折叠 @default false */
  defaultCollapsed?: boolean;
  /** 折叠变化回调 */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** 显示折叠按钮 @default true */
  collapsible?: boolean;
  /** 展开宽度（px） @default 240 */
  width?: number;
  /** 折叠宽度（px） @default 60 */
  collapsedWidth?: number;
  /** 位置 @default 'left' */
  placement?: SidebarPlacement;
  /** 顶部 Logo */
  logo?: ReactNode;
  /** 底部内容 */
  footer?: ReactNode;
}

// ─────────────────────────────────────────────
// 主题 Token（从共享 ThemeVariables 派生）
// ─────────────────────────────────────────────
interface SidebarTokens {
  bg: string;
  border: string;
  logoColor: string;
  sectionTitleColor: string;
  itemColor: string;
  itemActiveColor: string;
  itemActiveBg: string;
  itemHoverColor: string;
  itemHoverBg: string;
  itemActiveIndicator: string;
  badgeBg: string;
  badgeColor: string;
  dividerColor: string;
  collapseButtonBg: string;
  collapseButtonColor: string;
  collapseButtonBorder: string;
  subMenuBg: string;
  fontFamily: string;
  backdropFilter: string;
  glowEdge: string;
  shadow: string;
}

function getSidebarTokens(theme: YYC3Theme): SidebarTokens {
  const t = getThemeTokens(theme);
  if (theme === 'cyberpunk') {
    return {
      bg: t.sidebarBg,
      border: t.colors.border,
      logoColor: t.colors.primary,
      sectionTitleColor: 'rgba(0,200,220,0.45)',
      itemColor: 'rgba(0,200,220,0.68)',
      itemActiveColor: '#00f0ff',
      itemActiveBg: 'rgba(0,229,255,0.1)',
      itemHoverColor: t.colors.primary,
      itemHoverBg: 'rgba(0,229,255,0.06)',
      itemActiveIndicator: t.colors.primary,
      badgeBg: 'rgba(0,229,255,0.15)',
      badgeColor: t.colors.primary,
      dividerColor: 'rgba(0,229,255,0.08)',
      collapseButtonBg: 'rgba(0,229,255,0.06)',
      collapseButtonColor: 'rgba(0,200,220,0.7)',
      collapseButtonBorder: 'rgba(0,229,255,0.18)',
      subMenuBg: 'rgba(0,5,8,0.6)',
      fontFamily: t.fontFamily,
      backdropFilter: 'none',
      glowEdge: 'rgba(0,229,255,0.22)',
      shadow: '2px 0 24px rgba(0,0,0,0.5)',
    };
  }
  return {
    bg: t.sidebarBg,
    border: t.colors.border,
    logoColor: 'rgba(10,20,60,0.92)',
    sectionTitleColor: 'rgba(80,100,160,0.5)',
    itemColor: 'rgba(40,60,120,0.65)',
    itemActiveColor: t.colors.primary,
    itemActiveBg: 'rgba(59,130,246,0.1)',
    itemHoverColor: 'rgba(37,99,235,0.9)',
    itemHoverBg: 'rgba(59,130,246,0.06)',
    itemActiveIndicator: t.colors.primary,
    badgeBg: 'rgba(59,130,246,0.12)',
    badgeColor: 'rgba(37,99,235,0.9)',
    dividerColor: 'rgba(180,200,235,0.35)',
    collapseButtonBg: 'rgba(255,255,255,0.6)',
    collapseButtonColor: 'rgba(60,80,160,0.65)',
    collapseButtonBorder: 'rgba(180,200,235,0.5)',
    subMenuBg: 'rgba(240,245,255,0.5)',
    fontFamily: t.fontFamily,
    backdropFilter: t.backdropFilter,
    glowEdge: 'rgba(59,130,246,0.15)',
    shadow: '2px 0 16px rgba(80,100,180,0.08)',
  };
}

// ─────────────────────────────────────────────
// CSS 注入
// ─────────────────────────────────────────────
const SIDEBAR_CSS = `
/* 宽度过渡（§ 1.2 transitions） */
.yyc3-sidebar { transition: width 280ms cubic-bezier(0.4,0,0.2,1) !important; }

/* 焦点可见（§ 1.3） */
.yyc3-sidebar-item:focus-visible { outline: 2px solid currentColor !important; outline-offset: -2px !important; }
.yyc3-sidebar-collapse-btn:focus-visible { outline: 2px solid currentColor !important; outline-offset: 2px !important; }

/* 子菜单展开动画 */
@keyframes yyc3-sub-open { from { opacity:0; max-height:0; } to { opacity:1; max-height:400px; } }
.yyc3-sidebar-submenu { animation: yyc3-sub-open 220ms ease-out forwards; overflow: hidden; }

/* hover 过渡 */
.yyc3-sidebar-item { transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease !important; }
.yyc3-sidebar-collapse-btn { transition: background 160ms ease, color 160ms ease, border-color 160ms ease !important; }
.yyc3-sidebar-collapse-btn:hover { opacity: 0.85 !important; }

/* 响应式（§ 1.4）：移动端隐藏 sidebar */
@media (max-width: 767px) {
  .yyc3-sidebar { display: none !important; }
}
`;

let sidebarStyleInjected = false;
function ensureSidebarStyles() {
  if (sidebarStyleInjected || typeof document === 'undefined') return;
  sidebarStyleInjected = true;
  const el = document.createElement('style');
  el.id = 'yyc3-sidebar-styles';
  el.textContent = SIDEBAR_CSS;
  document.head.appendChild(el);
}

// ─────────────────────────────────────────────
// 图标
// ─────────────────────────────────────────────
const ChevronIcon = ({ open, color }: { open: boolean; color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"
    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 220ms ease', flexShrink: 0 }}>
    <polyline points="9 6 15 12 9 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CollapseArrowIcon = ({ collapsed, placement, color }: { collapsed: boolean; placement: SidebarPlacement; color: string }) => {
  const pointRight = (placement === 'left' && !collapsed) || (placement === 'right' && collapsed);
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      style={{ transform: pointRight ? 'rotate(180deg)' : 'none', transition: 'transform 280ms ease' }}>
      <polyline points="15 6 9 12 15 18" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─────────────────────────────────────────────
// SidebarItemRow（单项渲染，含 ARIA tree pattern § 1.3）
// ─────────────────────────────────────────────
interface SidebarItemRowProps {
  item: SidebarItem;
  depth: number;
  isActive: boolean;
  isOpen: boolean;
  collapsed: boolean;
  tokens: SidebarTokens;
  isCyber: boolean;
  onToggle: (key: string) => void;
  onItemClick: (key: string, item: SidebarItem) => void;
  activeKey?: string;
  openKeys: string[];
}

function SidebarItemRow({
  item,
  depth,
  isActive,
  isOpen,
  collapsed,
  tokens,
  isCyber,
  onToggle,
  onItemClick,
  activeKey,
  openKeys,
}: SidebarItemRowProps) {
  const [hovered, setHovered] = useState(false);
  const hasChildren = Boolean(item.children?.length);

  const handleClick = useCallback(() => {
    if (item.disabled) return;
    if (hasChildren) onToggle(item.key);
    else onItemClick(item.key, item);
  }, [item, hasChildren, onToggle, onItemClick]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
  };

  if (item.divider) {
    return <div aria-hidden="true" style={{ height: '1px', background: tokens.dividerColor, margin: '6px 12px' }} />;
  }

  const paddingLeft = collapsed ? 0 : 12 + depth * 16;

  const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : '10px',
    padding: collapsed ? '10px 0' : `9px 12px 9px ${paddingLeft}px`,
    justifyContent: collapsed ? 'center' : 'flex-start',
    borderRadius: tokens.fontFamily.includes('Courier') ? '4px' : '6px',
    cursor: item.disabled ? 'not-allowed' : 'pointer',
    color: isActive ? tokens.itemActiveColor : hovered ? tokens.itemHoverColor : tokens.itemColor,
    background: isActive ? tokens.itemActiveBg : hovered ? tokens.itemHoverBg : 'transparent',
    opacity: item.disabled ? 0.4 : 1,
    fontFamily: tokens.fontFamily,
    fontSize: '14px',
    fontWeight: isActive ? 700 : 500,
    letterSpacing: isCyber ? '0.04em' : '0',
    textTransform: isCyber ? 'uppercase' : 'none',
    userSelect: 'none',
    position: 'relative',
    boxShadow: isActive && !collapsed
      ? `inset 3px 0 0 ${tokens.itemActiveIndicator}${isCyber ? ',0 0 10px rgba(0,229,255,0.07)' : ''}`
      : 'none',
  };

  return (
    <>
      <div
        className="yyc3-sidebar-item"
        role="treeitem"
        tabIndex={item.disabled ? -1 : 0}
        aria-expanded={hasChildren ? isOpen : undefined}
        aria-selected={isActive}
        aria-disabled={item.disabled}
        aria-level={depth + 1}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={rowStyle}
        title={collapsed && typeof item.label === 'string' ? item.label : undefined}
      >
        {/* 图标 */}
        {item.icon && (
          <span aria-hidden="true" style={{
            display: 'flex', alignItems: 'center', flexShrink: 0, fontSize: '18px',
            color: isActive ? tokens.itemActiveColor : hovered ? tokens.itemHoverColor : tokens.itemColor,
          }}>
            {item.icon}
          </span>
        )}

        {/* 标签 */}
        {!collapsed && (
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
        )}

        {/* Badge */}
        {!collapsed && item.badge && (
          <span style={{
            flexShrink: 0, background: tokens.badgeBg, color: tokens.badgeColor,
            borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700, letterSpacing: '0',
          }}>
            {item.badge}
          </span>
        )}

        {/* 子菜单箭头 */}
        {!collapsed && hasChildren && (
          <ChevronIcon open={isOpen} color={isActive ? tokens.itemActiveColor : tokens.itemColor} />
        )}
      </div>

      {/* 子菜单（role=group § 1.3） */}
      {hasChildren && isOpen && !collapsed && (
        <div
          role="group"
          aria-label={typeof item.label === 'string' ? `${item.label} 子菜单` : '子菜单'}
          className="yyc3-sidebar-submenu"
          style={{ background: tokens.subMenuBg, borderRadius: '4px', margin: '2px 0' }}
        >
          {item.children!.map((child) => (
            <SidebarItemRow
              key={child.key}
              item={child}
              depth={depth + 1}
              isActive={activeKey === child.key}
              isOpen={openKeys.includes(child.key)}
              collapsed={false}
              tokens={tokens}
              isCyber={isCyber}
              onToggle={onToggle}
              onItemClick={onItemClick}
              activeKey={activeKey}
              openKeys={openKeys}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// Sidebar 主组件
// ─────────────────────────────────────────────
export const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  (
    {
      items = [],
      sections,
      activeKey,
      openKeys: openKeysProp,
      defaultOpenKeys = [],
      onItemClick,
      collapsed: collapsedProp,
      defaultCollapsed = false,
      onCollapsedChange,
      collapsible = true,
      width = 240,
      collapsedWidth = 60,
      placement = 'left',
      logo,
      footer,
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
    const tokens = getSidebarTokens(theme);
    const isCyber = theme === 'cyberpunk';

    // 受控/非受控：折叠
    const isControlledCollapse = collapsedProp !== undefined;
    const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
    const collapsed = isControlledCollapse ? collapsedProp! : internalCollapsed;

    // 受控/非受控：展开 keys
    const isControlledOpen = openKeysProp !== undefined;
    const [internalOpenKeys, setInternalOpenKeys] = useState<string[]>(defaultOpenKeys);
    const openKeys = isControlledOpen ? openKeysProp! : internalOpenKeys;

    if (typeof window !== 'undefined') ensureSidebarStyles();

    const handleCollapse = useCallback(() => {
      const next = !collapsed;
      if (!isControlledCollapse) setInternalCollapsed(next);
      onCollapsedChange?.(next);
    }, [collapsed, isControlledCollapse, onCollapsedChange]);

    const handleToggleOpen = useCallback((key: string) => {
      if (isControlledOpen) return;
      setInternalOpenKeys(prev =>
        prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      );
    }, [isControlledOpen]);

    const handleItemClick = useCallback((key: string, item: SidebarItem) => {
      onItemClick?.(key, item);
    }, [onItemClick]);

    const currentWidth = collapsed ? collapsedWidth : width;

    const sidebarStyle: CSSProperties = {
      width: `${currentWidth}px`,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: tokens.bg,
      backdropFilter: tokens.backdropFilter,
      WebkitBackdropFilter: tokens.backdropFilter,
      borderRight:  placement === 'left'  ? `1px solid ${tokens.border}` : 'none',
      borderLeft:   placement === 'right' ? `1px solid ${tokens.border}` : 'none',
      boxShadow: tokens.shadow,
      overflow: 'hidden',
      flexShrink: 0,
      position: 'relative',
      boxSizing: 'border-box',
    };

    const renderItems = (list: SidebarItem[]) =>
      list.map((item) => (
        <SidebarItemRow
          key={item.key}
          item={item}
          depth={0}
          isActive={activeKey === item.key}
          isOpen={openKeys.includes(item.key)}
          collapsed={collapsed}
          tokens={tokens}
          isCyber={isCyber}
          onToggle={handleToggleOpen}
          onItemClick={handleItemClick}
          activeKey={activeKey}
          openKeys={openKeys}
        />
      ));

    return (
      <YYC3ThemeProvider theme={theme}>
        <aside
          ref={ref}
          className={cx('yyc3-sidebar', className)}
          data-theme={theme}
          data-collapsed={collapsed}
          aria-label="侧边导航"
          role="navigation"
          style={{ ...sidebarStyle, ...style }}
          {...rest}
        >
          {/* 赛博朋克边缘发光 */}
          {isCyber && (
            <div aria-hidden="true" style={{
              position: 'absolute',
              top: 0,
              [placement === 'left' ? 'right' : 'left']: 0,
              bottom: 0,
              width: '1px',
              background: `linear-gradient(180deg,transparent 0%,${tokens.glowEdge} 30%,${tokens.glowEdge} 70%,transparent 100%)`,
              pointerEvents: 'none',
            }} />
          )}

          {/* Logo 区 */}
          {logo && (
            <div style={{
              padding: collapsed ? '18px 0' : '18px 16px',
              display: 'flex',
              justifyContent: collapsed ? 'center' : 'flex-start',
              alignItems: 'center',
              borderBottom: `1px solid ${tokens.dividerColor}`,
              color: tokens.logoColor,
              fontWeight: 800,
              fontSize: '16px',
              letterSpacing: isCyber ? '0.1em' : '0',
              flexShrink: 0,
              overflow: 'hidden',
              transition: 'padding 280ms ease',
            }}>
              {logo}
            </div>
          )}

          {/* 导航菜单（role=tree § 1.3） */}
          <nav
            aria-label="侧边导航菜单"
            role="tree"
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '8px',
              boxSizing: 'border-box',
              scrollbarWidth: 'thin',
              scrollbarColor: `${tokens.border} transparent`,
            }}
          >
            {sections
              ? sections.map((section, si) => (
                  <div key={si} role="group" aria-label={section.title} style={{ marginBottom: '8px' }}>
                    {!collapsed && section.title && (
                      <div style={{
                        padding: '6px 12px 4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: tokens.sectionTitleColor,
                        fontFamily: tokens.fontFamily,
                        letterSpacing: isCyber ? '0.12em' : '0.06em',
                        textTransform: 'uppercase',
                        userSelect: 'none',
                      }}>
                        {section.title}
                      </div>
                    )}
                    {renderItems(section.items)}
                  </div>
                ))
              : renderItems(items)}

            {children}
          </nav>

          {/* 底部区域 */}
          {footer && (
            <div style={{
              flexShrink: 0,
              borderTop: `1px solid ${tokens.dividerColor}`,
              padding: collapsed ? '12px 0' : '12px 16px',
              display: 'flex',
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: tokens.itemColor,
              fontFamily: tokens.fontFamily,
              overflow: 'hidden',
            }}>
              {footer}
            </div>
          )}

          {/* 折叠按钮（§ 1.3 键盘支持） */}
          {collapsible && (
            <button
              className="yyc3-sidebar-collapse-btn"
              aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
              aria-expanded={!collapsed}
              onClick={handleCollapse}
              style={{
                flexShrink: 0,
                width: '100%',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: collapsed ? 0 : '8px',
                background: tokens.collapseButtonBg,
                border: 'none',
                borderTop: `1px solid ${tokens.collapseButtonBorder}`,
                color: tokens.collapseButtonColor,
                cursor: 'pointer',
                fontFamily: tokens.fontFamily,
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: isCyber ? '0.08em' : '0',
                textTransform: isCyber ? 'uppercase' : 'none',
              }}
            >
              <CollapseArrowIcon collapsed={collapsed} placement={placement} color={tokens.collapseButtonColor} />
              {!collapsed && <span>折叠</span>}
            </button>
          )}
        </aside>
      </YYC3ThemeProvider>
    );
  }
);

Sidebar.displayName = 'YYC3Sidebar';
