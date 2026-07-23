// YYC³ Claw UI — 完整组件库索引
// 零外部依赖，支持赛博朋克/液态玻璃双主题系统

// ─────────────────────────────────────────────
// 主题系统
// ─────────────────────────────────────────────
export {
  YYC3ThemeProvider,
  useYYC3Theme,
  type YYC3Theme,
  type YYC3ThemeProviderProps,
} from './button';

// ─────────────────────────────────────────────
// 基础交互组件
// ─────────────────────────────────────────────
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './button';
export { Input, type InputProps, type InputSize, type InputStatus } from './input';

// ─────────────────────────────────────────────
// 布局组件系统
// ─────────────────────────────────────────────
export { Layout, type LayoutProps } from './layout';
export { Header, type HeaderProps, type NavItem } from './header';
export { Sidebar, type SidebarProps, type SidebarItem, type SidebarSection, type SidebarPlacement } from './sidebar';
export { Footer, type FooterProps, type FooterLink, type FooterColumn } from './footer';
export { Container, type ContainerProps, type ContainerSize, type ContainerPadding } from './container';

// ─────────────────────────────────────────────
// 数据展示组件
// ─────────────────────────────────────────────
export { Card, type CardProps } from './card';

// ─────────────────────────────────────────────
// 反馈组件
// ─────────────────────────────────────────────
export { Modal, type ModalProps } from './modal';
