// @ts-nocheck
/**
 * @file: llm/KeyboardNavigator.ts
 * @description: 键盘导航管理 - Tab导航、箭头导航、快捷键、焦点管理
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: accessibility,keyboard,navigation
 */

import {
  KeyboardNavigationConfig,
  FocusManagementConfig,
  FocusState,
  FocusTrapMode,
  NavigationType,
} from './AccessibilityTypes';

/**
 * 键盘导航管理器
 */
export class KeyboardNavigator {
  private focusState: FocusState = {
    currentElement: null,
    previousElement: null,
    focusableElements: [],
    trapContainer: null,
  };
  private navigationConfigs: Map<string, KeyboardNavigationConfig> = new Map();
  private focusConfig: FocusManagementConfig | null = null;
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;

  /**
   * 初始化键盘导航
   */
  init(container: Element, config?: Partial<FocusManagementConfig>): void {
    this.focusConfig = {
      trapMode: FocusTrapMode.LOOSE,
      returnFocus: true,
      autoFocus: false,
      restoreFocus: true,
      ...config,
    };

    this.focusState.trapContainer = container;
    this.updateFocusableElements();

    // 设置键盘事件监听
    this.setupKeyboardListeners();
  }

  /**
   * 销毁键盘导航
   */
  destroy(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    // 恢复焦点
    if (this.focusConfig?.restoreFocus && this.focusState.previousElement) {
      (this.focusState.previousElement as HTMLElement).focus();
    }

    this.focusState = {
      currentElement: null,
      previousElement: null,
      focusableElements: [],
      trapContainer: null,
    };
  }

  /**
   * 注册导航配置
   */
  registerNavigation(id: string, config: KeyboardNavigationConfig): void {
    this.navigationConfigs.set(id, config);
  }

  /**
   * 注销导航配置
   */
  unregisterNavigation(id: string): void {
    this.navigationConfigs.delete(id);
  }

  /**
   * 获取可聚焦元素
   */
  getFocusableElements(): Element[] {
    return [...this.focusState.focusableElements];
  }

  /**
   * 获取当前焦点元素
   */
  getCurrentFocus(): Element | null {
    return this.focusState.currentElement;
  }

  /**
   * 移动焦点到下一个元素
   */
  focusNext(): void {
    const elements = this.focusState.focusableElements;
    const current = this.focusState.currentElement;
    const currentIndex = current ? elements.indexOf(current) : -1;

    const nextIndex = (currentIndex + 1) % elements.length;
    this.focusElement(elements[nextIndex] as HTMLElement);
  }

  /**
   * 移动焦点到上一个元素
   */
  focusPrevious(): void {
    const elements = this.focusState.focusableElements;
    const current = this.focusState.currentElement;
    const currentIndex = current ? elements.indexOf(current) : -1;

    const prevIndex = currentIndex <= 0 ? elements.length - 1 : currentIndex - 1;
    this.focusElement(elements[prevIndex] as HTMLElement);
  }

  /**
   * 移动焦点到第一个元素
   */
  focusFirst(): void {
    const elements = this.focusState.focusableElements;
    if (elements.length > 0) {
      this.focusElement(elements[0] as HTMLElement);
    }
  }

  /**
   * 移动焦点到最后一个元素
   */
  focusLast(): void {
    const elements = this.focusState.focusableElements;
    if (elements.length > 0) {
      this.focusElement(elements[elements.length - 1] as HTMLElement);
    }
  }

  /**
   * 聚焦指定元素
   */
  focusElement(element: HTMLElement): void {
    this.focusState.previousElement = this.focusState.currentElement;
    this.focusState.currentElement = element;
    element.focus();
  }

  /**
   * 更新可聚焦元素列表
   */
  updateFocusableElements(): void {
    if (!this.focusState.trapContainer) return;

    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    this.focusState.focusableElements = Array.from(
      this.focusState.trapContainer.querySelectorAll(selector)
    ).filter((el) => {
      // 过滤隐藏元素
      return el.offsetParent !== null &&
             !el.hasAttribute('aria-hidden') &&
             window.getComputedStyle(el).visibility !== 'hidden';
    });

    // 自动聚焦
    if (this.focusConfig?.autoFocus && this.focusState.focusableElements.length > 0) {
      this.focusFirst();
    }
  }

  /**
   * 设置键盘事件监听
   */
  private setupKeyboardListeners(): void {
    this.keydownHandler = (event: KeyboardEvent) => {
      this.handleKeydown(event);
    };

    document.addEventListener('keydown', this.keydownHandler);
  }

  /**
   * 处理键盘事件
   */
  private handleKeydown(event: KeyboardEvent): void {
    const key = event.key;

    // Tab导航
    if (key === 'Tab') {
      this.handleTabNavigation(event);
      return;
    }

    // 箭头导航
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      this.handleArrowNavigation(event);
      return;
    }

    // 自定义快捷键
    this.handleCustomShortcuts(event);
  }

  /**
   * 处理Tab导航
   */
  private handleTabNavigation(event: KeyboardEvent): void {
    if (!this.focusState.trapContainer) return;

    const elements = this.focusState.focusableElements;
    const current = this.focusState.currentElement;
    const currentIndex = current ? elements.indexOf(current) : -1;

    // 严格焦点陷阱
    if (this.focusConfig?.trapMode === FocusTrapMode.STRICT) {
      event.preventDefault();

      if (event.shiftKey) {
        // Shift + Tab: 向后
        const prevIndex = currentIndex <= 0 ? elements.length - 1 : currentIndex - 1;
        this.focusElement(elements[prevIndex] as HTMLElement);
      } else {
        // Tab: 向前
        const nextIndex = (currentIndex + 1) % elements.length;
        this.focusElement(elements[nextIndex] as HTMLElement);
      }
    }

    // 循环焦点陷阱
    if (this.focusConfig?.trapMode === FocusTrapMode.LOOP) {
      if (event.shiftKey && currentIndex === 0) {
        event.preventDefault();
        this.focusLast();
      } else if (!event.shiftKey && currentIndex === elements.length - 1) {
        event.preventDefault();
        this.focusFirst();
      }
    }
  }

  /**
   * 处理箭头导航
   */
  private handleArrowNavigation(event: KeyboardEvent): void {
    const config = this.findNavigationConfig(event.key);
    if (config) {
      if (config.preventDefault) event.preventDefault();
      if (config.stopPropagation) event.stopPropagation();
      config.handler(event);
    }
  }

  /**
   * 处理自定义快捷键
   */
  private handleCustomShortcuts(event: KeyboardEvent): void {
    const config = this.findNavigationConfig(event.key);
    if (config && config.type === NavigationType.SHORTCUT) {
      if (config.preventDefault) event.preventDefault();
      if (config.stopPropagation) event.stopPropagation();
      config.handler(event);
    }
  }

  /**
   * 查找导航配置
   */
  private findNavigationConfig(key: string): KeyboardNavigationConfig | null {
    for (const config of this.navigationConfigs.values()) {
      if (config.keys.includes(key)) {
        return config;
      }
    }
    return null;
  }
}
