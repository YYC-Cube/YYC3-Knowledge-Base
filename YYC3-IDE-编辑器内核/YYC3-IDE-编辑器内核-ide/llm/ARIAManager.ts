/**
 * @file: llm/ARIAManager.ts
 * @description: ARIA标签管理 - ARIA属性设置、屏幕阅读器通知
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: accessibility,aria,screen-reader
 */

import {
  ARIAAttributes,
  ARIARole,
  ScreenReaderNotification,
  NotificationType,
} from './AccessibilityTypes';

/**
 * ARIA管理器
 */
export class ARIAManager {
  private liveRegion: HTMLElement | null = null;
  private notificationQueue: ScreenReaderNotification[] = [];
  private isProcessing = false;

  constructor() {
    this.createLiveRegion();
  }

  /**
   * 设置ARIA属性
   */
  setAttributes(element: Element, attributes: ARIAAttributes): void {
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== null) {
        const attrName = this.getARIAAttributeName(key);
        if (attrName) {
          element.setAttribute(attrName, String(value));
        }
      }
    }
  }

  /**
   * 移除ARIA属性
   */
  removeAttributes(element: Element, ...attributeNames: string[]): void {
    attributeNames.forEach(name => {
      const attrName = this.getARIAAttributeName(name);
      if (attrName) {
        element.removeAttribute(attrName);
      }
    });
  }

  /**
   * 获取ARIA属性
   */
  getAttribute(element: Element, attributeName: string): string | null {
    const attrName = this.getARIAAttributeName(attributeName);
    return attrName ? element.getAttribute(attrName) : null;
  }

  /**
   * 设置角色
   */
  setRole(element: Element, role: ARIARole | string): void {
    element.setAttribute('role', role);
  }

  /**
   * 设置标签
   */
  setLabel(element: Element, label: string): void {
    element.setAttribute('aria-label', label);
  }

  /**
   * 设置描述
   */
  setDescription(element: Element, description: string): void {
    // 创建描述元素
    let descElement = document.getElementById(`desc-${element.id}`);
    if (!descElement) {
      descElement = document.createElement('span');
      descElement.id = `desc-${element.id || Math.random().toString(36).substr(2, 9)}`;
      descElement.className = 'sr-only'; // 屏幕阅读器专用
      descElement.textContent = description;
      element.insertAdjacentElement('afterend', descElement);
    } else {
      descElement.textContent = description;
    }

    element.setAttribute('aria-describedby', descElement.id);
  }

  /**
   * 设置状态
   */
  setState(element: Element, state: Partial<ARIAAttributes>): void {
    this.setAttributes(element, state);
  }

  /**
   * 扩展元素
   */
  expand(element: Element, expanded: boolean = true): void {
    element.setAttribute('aria-expanded', String(expanded));
  }

  /**
   * 隐藏元素
   */
  hide(element: Element, hidden: boolean = true): void {
    element.setAttribute('aria-hidden', String(hidden));
  }

  /**
   * 禁用元素
   */
  disable(element: Element, disabled: boolean = true): void {
    element.setAttribute('aria-disabled', String(disabled));
    if (disabled) {
      (element as HTMLElement).tabIndex = -1;
    } else {
      (element as HTMLElement).tabIndex = 0;
    }
  }

  /**
   * 选中元素
   */
  select(element: Element, selected: boolean = true): void {
    element.setAttribute('aria-selected', String(selected));
  }

  /**
   * 按下元素
   */
  press(element: Element, pressed: boolean = true): void {
    element.setAttribute('aria-pressed', String(pressed));
  }

  /**
   * 创建实时区域
   */
  private createLiveRegion(): void {
    if (typeof document === 'undefined') return;

    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only'; // 屏幕阅读器专用
    this.liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(this.liveRegion);
  }

  /**
   * 通知屏幕阅读器
   */
  notify(notification: ScreenReaderNotification): void {
    this.notificationQueue.push(notification);
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * 通知消息
   */
  announce(message: string, priority: 'low' | 'medium' | 'high' = 'medium'): void {
    this.notify({
      type: NotificationType.STATUS,
      message,
      priority,
      timeout: 5000,
    });
  }

  /**
   * 通知警告
   */
  alert(message: string): void {
    this.notify({
      type: NotificationType.ALERT,
      message,
      priority: 'high',
      timeout: 10000,
    });
  }

  /**
   * 通知状态变化
   */
  announceStateChange(element: Element, newState: string): void {
    const label = element.getAttribute('aria-label') || element.textContent || '元素';
    this.announce(`${label} 状态已变为: ${newState}`, 'medium');
  }

  /**
   * 通知错误
   */
  announceError(element: Element, errorMessage: string): void {
    const label = element.getAttribute('aria-label') || element.textContent || '元素';
    this.alert(`错误: ${label} - ${errorMessage}`);
  }

  /**
   * 处理通知队列
   */
  private processQueue(): void {
    if (this.notificationQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const notification = this.notificationQueue.shift()!;

    // 设置实时区域属性
    if (this.liveRegion) {
      const liveValue = notification.type === NotificationType.ALERT ? 'assertive' : 'polite';
      this.liveRegion.setAttribute('aria-live', liveValue);
      this.liveRegion.textContent = notification.message;

      // 清除旧消息
      if (notification.clearPrevious) {
        this.liveRegion.textContent = '';
      }

      // 设置消息
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = notification.message;
        }
      }, 100);

      // 清除消息
      if (notification.timeout) {
        setTimeout(() => {
          if (this.liveRegion) {
            this.liveRegion.textContent = '';
          }
          this.processQueue();
        }, notification.timeout);
      } else {
        this.processQueue();
      }
    }
  }

  /**
   * 获取ARIA属性名
   */
  private getARIAAttributeName(key: string): string | null {
    const ariaPrefix = 'aria-';

    // 处理特殊情况
    const specialCases: Record<string, string> = {
      role: 'role',
      label: 'aria-label',
      labelledBy: 'aria-labelledby',
      describedBy: 'aria-describedby',
      expanded: 'aria-expanded',
      hidden: 'aria-hidden',
      disabled: 'aria-disabled',
      checked: 'aria-checked',
      selected: 'aria-selected',
      pressed: 'aria-pressed',
      hasPopup: 'aria-haspopup',
      controls: 'aria-controls',
      owns: 'aria-owns',
      live: 'aria-live',
      atomic: 'aria-atomic',
      relevant: 'aria-relevant',
      currentValue: 'aria-current',
      valueMin: 'aria-valuemin',
      valueMax: 'aria-valuemax',
      valueNow: 'aria-valuenow',
      valueText: 'aria-valuetext',
    };

    if (specialCases[key]) {
      return specialCases[key];
    }

    // 默认添加 aria- 前缀
    return ariaPrefix + key.toLowerCase();
  }

  /**
   * 销毁
   */
  destroy(): void {
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
      this.liveRegion = null;
    }
    this.notificationQueue = [];
    this.isProcessing = false;
  }
}
