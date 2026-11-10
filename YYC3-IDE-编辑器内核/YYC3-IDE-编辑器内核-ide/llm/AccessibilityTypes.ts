/**
 * @file: llm/AccessibilityTypes.ts
 * @description: 可访问性增强类型定义
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: accessibility,wcag,aria,types
 */

/**
 * WCAG级别
 */
export enum WCAGLevel {
  A = 'A',       // 最低级别
  AA = 'AA',     // 推荐级别
  AAA = 'AAA',   // 最高级别
}

/**
 * WCAG检查类型
 */
export enum WCAGCheckType {
  COLOR_CONTRAST = 'color_contrast',       // 颜色对比度
  KEYBOARD_NAV = 'keyboard_navigation',    // 键盘导航
  SCREEN_READER = 'screen_reader',         // 屏幕阅读器
  FOCUS_MANAGEMENT = 'focus_management',   // 焦点管理
  ALT_TEXT = 'alt_text',                   // 替代文本
  FORM_LABELS = 'form_labels',             // 表单标签
  HEADING_STRUCTURE = 'heading_structure', // 标题结构
  LINK_TEXT = 'link_text',                 // 链接文本
}

/**
 * 检查结果状态
 */
export enum CheckStatus {
  PASS = 'pass',           // 通过
  FAIL = 'fail',           // 失败
  WARNING = 'warning',     // 警告
  MANUAL = 'manual',       // 需手动检查
}

/**
 * WCAG检查项
 */
export interface WCAGCheckItem {
  id: string;
  type: WCAGCheckType;
  level: WCAGLevel;
  description: string;
  status: CheckStatus;
  element?: string;
  value?: number | string;
  expected?: number | string;
  message: string;
  suggestions: string[];
}

/**
 * WCAG合规报告
 */
export interface WCAGReport {
  id: string;
  timestamp: number;
  url?: string;
  checks: WCAGCheckItem[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    manual: number;
    compliance: number; // 0-100
    level: WCAGLevel;
  };
}

/**
 * 键盘导航类型
 */
export enum NavigationType {
  TAB = 'tab',               // Tab导航
  ARROW = 'arrow',           // 箭头导航
  SHORTCUT = 'shortcut',     // 快捷键
  CONTEXT_MENU = 'context',  // 上下文菜单
}

/**
 * 焦点陷阱模式
 */
export enum FocusTrapMode {
  LOOP = 'loop',             // 循环
  STRICT = 'strict',         // 严格（不离开容器）
  LOOSE = 'loose',           // 宽松（可以离开）
}

/**
 * 键盘导航配置
 */
export interface KeyboardNavigationConfig {
  type: NavigationType;
  keys: string[];
  handler: (event: KeyboardEvent) => void;
  description?: string;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

/**
 * 焦点管理配置
 */
export interface FocusManagementConfig {
  trapMode: FocusTrapMode;
  initialFocus?: string;
  returnFocus?: boolean;
  autoFocus?: boolean;
  restoreFocus?: boolean;
}

/**
 * 焦点状态
 */
export interface FocusState {
  currentElement: Element | null;
  previousElement: Element | null;
  focusableElements: Element[];
  trapContainer: Element | null;
}

/**
 * ARIA角色
 */
export enum ARIARole {
  ALERT = 'alert',
  ALERTDIALOG = 'alertdialog',
  BUTTON = 'button',
  CHECKBOX = 'checkbox',
  DIALOG = 'dialog',
  GRID = 'grid',
  LISTBOX = 'listbox',
  MENU = 'menu',
  MENUITEM = 'menuitem',
  NAVIGATION = 'navigation',
  PROGRESSBAR = 'progressbar',
  RADIO = 'radio',
  RADIOGROUP = 'radiogroup',
  SLIDER = 'slider',
  SPINBUTTON = 'spinbutton',
  TAB = 'tab',
  TABLIST = 'tablist',
  TABBANEL = 'tabpanel',
  TEXTBOX = 'textbox',
  TOOLTIP = 'tooltip',
  TREE = 'tree',
  TREEITEM = 'treeitem',
}

/**
 * ARIA属性
 */
export interface ARIAAttributes {
  role?: ARIARole | string;
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  expanded?: boolean;
  hidden?: boolean;
  disabled?: boolean;
  checked?: boolean | 'mixed';
  selected?: boolean;
  pressed?: boolean;
  hasPopup?: string;
  controls?: string;
  owns?: string;
  live?: 'off' | 'polite' | 'assertive';
  atomic?: boolean;
  relevant?: string;
  currentValue?: string | number;
  valueMin?: number;
  valueMax?: number;
  valueNow?: number;
  valueText?: string;
}

/**
 * 屏幕阅读器通知类型
 */
export enum NotificationType {
  ALERT = 'alert',           // 警告
  STATUS = 'status',         // 状态
  LOG = 'log',               // 日志
  PROGRESS = 'progress',     // 进度
  MARQUEE = 'marquee',       // 滚动字幕
  TIMER = 'timer',           // 计时器
}

/**
 * 屏幕阅读器通知
 */
export interface ScreenReaderNotification {
  type: NotificationType;
  message: string;
  priority: 'low' | 'medium' | 'high';
  timeout?: number;
  clearPrevious?: boolean;
}

/**
 * 颜色对比度结果
 */
export interface ColorContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  level: WCAGLevel;
  normalText: {
    aa: boolean;
    aaa: boolean;
  };
  largeText: {
    aa: boolean;
    aaa: boolean;
  };
}

/**
 * 可访问性配置
 */
export interface AccessibilityConfig {
  wcagLevel: WCAGLevel;
  checkColorContrast: boolean;
  checkKeyboardNav: boolean;
  checkScreenReader: boolean;
  checkFocusManagement: boolean;
  autoFix: boolean;
  notifyOnViolation: boolean;
}

/**
 * 默认可访问性配置
 */
export const DEFAULT_ACCESSIBILITY_CONFIG: AccessibilityConfig = {
  wcagLevel: WCAGLevel.AA,
  checkColorContrast: true,
  checkKeyboardNav: true,
  checkScreenReader: true,
  checkFocusManagement: true,
  autoFix: false,
  notifyOnViolation: true,
};

/**
 * 可访问性统计
 */
export interface AccessibilityStats {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  averageContrastRatio: number;
  keyboardAccessibleElements: number;
  ariaLabeledElements: number;
  focusableElements: number;
}
