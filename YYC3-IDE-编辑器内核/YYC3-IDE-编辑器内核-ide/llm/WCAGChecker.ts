// @ts-nocheck
/**
 * @file: llm/WCAGChecker.ts
 * @description: WCAG合规检查 - 颜色对比度、键盘导航、屏幕阅读器、焦点管理
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: accessibility,wcag,checker
 */

import {
  WCAGCheckItem,
  WCAGCheckType,
  WCAGLevel,
  CheckStatus,
  WCAGReport,
  _ColorContrastResult,
  DEFAULT_ACCESSIBILITY_CONFIG,
  AccessibilityConfig,
} from './AccessibilityTypes';

/**
 * WCAG合规检查器
 */
export class WCAGChecker {
  private config: AccessibilityConfig;

  constructor(config: Partial<AccessibilityConfig> = {}) {
    this.config = { ...DEFAULT_ACCESSIBILITY_CONFIG, ...config };
  }

  /**
   * 执行完整检查
   */
  checkAll(root: Element = document.body): WCAGReport {
    const checks: WCAGCheckItem[] = [];

    // 1. 颜色对比度检查
    if (this.config.checkColorContrast) {
      checks.push(...this.checkColorContrast(root));
    }

    // 2. 键盘导航检查
    if (this.config.checkKeyboardNav) {
      checks.push(...this.checkKeyboardNavigation(root));
    }

    // 3. 屏幕阅读器支持检查
    if (this.config.checkScreenReader) {
      checks.push(...this.checkScreenReaderSupport(root));
    }

    // 4. 焦点管理检查
    if (this.config.checkFocusManagement) {
      checks.push(...this.checkFocusManagement(root));
    }

    // 生成报告
    return this.generateReport(checks);
  }

  /**
   * 检查颜色对比度
   */
  checkColorContrast(root: Element): WCAGCheckItem[] {
    const checks: WCAGCheckItem[] = [];
    const elements = root.querySelectorAll('*');

    elements.forEach((element) => {
      const computedStyle = window.getComputedStyle(element);
      const color = computedStyle.color;
      const bgColor = computedStyle.backgroundColor;

      // 只检查有文本内容的元素
      if (element.textContent && element.textContent.trim().length > 0) {
        const contrast = this.calculateContrastRatio(color, bgColor);

        // AA级别要求
        const minRatio = this.config.wcagLevel === WCAGLevel.AAA ? 7 : 4.5;

        if (contrast < minRatio) {
          checks.push({
            id: `contrast_${element.id || Math.random().toString(36).substr(2, 9)}`,
            type: WCAGCheckType.COLOR_CONTRAST,
            level: this.config.wcagLevel,
            description: `颜色对比度不足: ${contrast.toFixed(2)}`,
            status: CheckStatus.FAIL,
            element: element.tagName,
            value: contrast,
            expected: minRatio,
            message: `元素 <${element.tagName}> 的颜色对比度为 ${contrast.toFixed(2)}，低于 ${this.config.wcagLevel} 级别要求的 ${minRatio}`,
            suggestions: [
              '增加文本颜色和背景颜色的对比度',
              '使用更深的文本颜色或更浅的背景颜色',
              '考虑使用 WCAG 对比度检查工具',
            ],
          });
        } else {
          checks.push({
            id: `contrast_${element.id || Math.random().toString(36).substr(2, 9)}`,
            type: WCAGCheckType.COLOR_CONTRAST,
            level: this.config.wcagLevel,
            description: `颜色对比度合规: ${contrast.toFixed(2)}`,
            status: CheckStatus.PASS,
            element: element.tagName,
            value: contrast,
            expected: minRatio,
            message: `元素 <${element.tagName}> 的颜色对比度为 ${contrast.toFixed(2)}，符合 ${this.config.wcagLevel} 级别要求`,
            suggestions: [],
          });
        }
      }
    });

    return checks;
  }

  /**
   * 检查键盘导航
   */
  checkKeyboardNavigation(root: Element): WCAGCheckItem[] {
    const checks: WCAGCheckItem[] = [];

    // 检查可交互元素
    const interactiveElements = root.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [tabindex]'
    );

    interactiveElements.forEach((element) => {
      // 检查tabindex
      const tabIndex = element.getAttribute('tabindex');
      const hasNegativeTabIndex = tabIndex && parseInt(tabIndex) < 0;

      if (hasNegativeTabIndex) {
        checks.push({
          id: `keyboard_${element.id || Math.random().toString(36).substr(2, 9)}`,
          type: WCAGCheckType.KEYBOARD_NAV,
          level: WCAGLevel.A,
          description: '元素被排除在Tab顺序之外',
          status: CheckStatus.WARNING,
          element: element.tagName,
          message: `元素 <${element.tagName}> 设置了 tabindex="${tabIndex}"，可能无法通过键盘访问`,
          suggestions: [
            '确保该元素有替代的键盘访问方式',
            '或者使用快捷键来访问此元素',
          ],
        });
      }

      // 检查事件处理
      const hasClickHandler = element.onclick !== null;
      const hasKeyHandler = element.onkeydown !== null || element.onkeyup !== null;

      if (hasClickHandler && !hasKeyHandler) {
        checks.push({
          id: `keyboard_${element.id || Math.random().toString(36).substr(2, 9)}`,
          type: WCAGCheckType.KEYBOARD_NAV,
          level: WCAGLevel.A,
          description: '元素缺少键盘事件处理',
          status: CheckStatus.FAIL,
          element: element.tagName,
          message: `元素 <${element.tagName}> 有点击事件但没有键盘事件处理`,
          suggestions: [
            '添加 onkeydown 或 onkeyup 事件处理',
            '支持 Enter 和 Space 键触发操作',
          ],
        });
      }
    });

    // 检查焦点样式
    const focusableElements = root.querySelectorAll(
      'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach((element) => {
      const computedStyle = window.getComputedStyle(element, ':focus');
      const hasFocusStyle =
        computedStyle.outline !== 'none' ||
        computedStyle.border !== computedStyle.getPropertyValue('border') ||
        computedStyle.boxShadow !== 'none';

      if (!hasFocusStyle) {
        checks.push({
          id: `focus_style_${element.id || Math.random().toString(36).substr(2, 9)}`,
          type: WCAGCheckType.KEYBOARD_NAV,
          level: WCAGLevel.AA,
          description: '元素缺少明显的焦点样式',
          status: CheckStatus.WARNING,
          element: element.tagName,
          message: `元素 <${element.tagName}> 没有明显的焦点样式`,
          suggestions: [
            '添加 :focus 样式',
            '使用 outline 或 border 显示焦点',
            '确保焦点样式清晰可见',
          ],
        });
      }
    });

    return checks;
  }

  /**
   * 检查屏幕阅读器支持
   */
  checkScreenReaderSupport(root: Element): WCAGCheckItem[] {
    const checks: WCAGCheckItem[] = [];

    // 检查图片
    const images = root.querySelectorAll('img');
    images.forEach((img) => {
      const alt = img.getAttribute('alt');
      const ariaLabel = img.getAttribute('aria-label');
      const ariaLabelledBy = img.getAttribute('aria-labelledby');

      if (!alt && !ariaLabel && !ariaLabelledBy) {
        checks.push({
          id: `alt_${img.id || Math.random().toString(36).substr(2, 9)}`,
          type: WCAGCheckType.ALT_TEXT,
          level: WCAGLevel.A,
          description: '图片缺少替代文本',
          status: CheckStatus.FAIL,
          element: 'img',
          message: '图片元素没有 alt 属性或 ARIA 标签',
          suggestions: [
            '添加 alt 属性描述图片内容',
            '如果图片是装饰性的，使用 alt=""',
            '使用 aria-label 或 aria-labelledby',
          ],
        });
      }
    });

    // 检查表单元素
    const formElements = root.querySelectorAll('input, select, textarea');
    formElements.forEach((element) => {
      const id = element.id;
      const label = id ? root.querySelector(`label[for="${id}"]`) : null;
      const ariaLabel = element.getAttribute('aria-label');
      const ariaLabelledBy = element.getAttribute('aria-labelledby');

      if (!label && !ariaLabel && !ariaLabelledBy) {
        checks.push({
          id: `form_label_${element.id || Math.random().toString(36).substr(2, 9)}`,
          type: WCAGCheckType.FORM_LABELS,
          level: WCAGLevel.A,
          description: '表单元素缺少标签',
          status: CheckStatus.FAIL,
          element: element.tagName,
          message: `表单元素 <${element.tagName}> 没有关联的标签`,
          suggestions: [
            '添加 id 属性和关联的 <label> 元素',
            '使用 aria-label 属性',
            '使用 aria-labelledby 属性',
          ],
        });
      }
    });

    // 检查标题结构
    const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level - lastLevel > 1) {
        checks.push({
          id: `heading_${Math.random().toString(36).substr(2, 9)}`,
          type: WCAGCheckType.HEADING_STRUCTURE,
          level: WCAGLevel.AA,
          description: '标题层级跳跃',
          status: CheckStatus.WARNING,
          element: heading.tagName,
          value: level,
          expected: lastLevel + 1,
          message: `从 <h${lastLevel}> 直接跳到 <h${level}>，跳过了层级`,
          suggestions: [
            '确保标题层级连续',
            '不要跳过标题层级',
          ],
        });
      }
      lastLevel = level;
    });

    // 检查ARIA角色
    const elementsWithRole = root.querySelectorAll('[role]');
    elementsWithRole.forEach((element) => {
      const role = element.getAttribute('role');
      const requiredAttributes = this.getRequiredAriaAttributes(role as any);

      requiredAttributes.forEach((attr) => {
        if (!element.hasAttribute(attr)) {
          checks.push({
            id: `aria_role_${element.id || Math.random().toString(36).substr(2, 9)}`,
            type: WCAGCheckType.SCREEN_READER,
            level: WCAGLevel.A,
            description: `ARIA角色缺少必需属性`,
            status: CheckStatus.WARNING,
            element: element.tagName,
            message: `角色 "${role}" 缺少必需属性 "${attr}"`,
            suggestions: [`添加 ${attr} 属性`],
          });
        }
      });
    });

    return checks;
  }

  /**
   * 检查焦点管理
   */
  checkFocusManagement(root: Element): WCAGCheckItem[] {
    const checks: WCAGCheckItem[] = [];

    // 检查模态对话框
    const dialogs = root.querySelectorAll('[role="dialog"], [role="alertdialog"]');
    dialogs.forEach((dialog) => {
      const hasAriaModal = dialog.hasAttribute('aria-modal');
      const hasAriaLabel = dialog.hasAttribute('aria-label') ||
                          dialog.hasAttribute('aria-labelledby');

      if (!hasAriaModal) {
        checks.push({
          id: `dialog_modal_${Math.random().toString(36).substr(2, 9)}`,
          type: WCAGCheckType.FOCUS_MANAGEMENT,
          level: WCAGLevel.AA,
          description: '对话框缺少 aria-modal 属性',
          status: CheckStatus.WARNING,
          element: dialog.tagName,
          message: '对话框元素应设置 aria-modal="true"',
          suggestions: ['添加 aria-modal="true" 属性'],
        });
      }

      if (!hasAriaLabel) {
        checks.push({
          id: `dialog_label_${Math.random().toString(36).substr(2, 9)}`,
          type: WCAGCheckType.FOCUS_MANAGEMENT,
          level: WCAGLevel.A,
          description: '对话框缺少可访问名称',
          status: CheckStatus.FAIL,
          element: dialog.tagName,
          message: '对话框元素必须有 aria-label 或 aria-labelledby',
          suggestions: [
            '添加 aria-label 属性',
            '或添加 aria-labelledby 属性',
          ],
        });
      }
    });

    // 检查隐藏内容
    const hiddenElements = root.querySelectorAll('[aria-hidden="true"]');
    hiddenElements.forEach((element) => {
      const focusableChildren = element.querySelectorAll(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableChildren.length > 0) {
        checks.push({
          id: `hidden_focusable_${Math.random().toString(36).substr(2, 9)}`,
          type: WCAGCheckType.FOCUS_MANAGEMENT,
          level: WCAGLevel.A,
          description: '隐藏元素包含可聚焦子元素',
          status: CheckStatus.FAIL,
          element: element.tagName,
          message: `隐藏元素包含 ${focusableChildren.length} 个可聚焦子元素`,
          suggestions: [
            '移除隐藏元素中的可聚焦元素',
            '或为这些元素设置 tabindex="-1"',
          ],
        });
      }
    });

    return checks;
  }

  /**
   * 计算颜色对比度
   */
  private calculateContrastRatio(foreground: string, background: string): number {
    const fg = this.parseColor(foreground);
    const bg = this.parseColor(background);

    if (!fg || !bg) return 1;

    const fgLuminance = this.getLuminance(fg);
    const bgLuminance = this.getLuminance(bg);

    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * 解析颜色
   */
  private parseColor(color: string): { r: number; g: number; b: number } | null {
    // 解析 rgb(r, g, b) 格式
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3]),
      };
    }

    // 解析 rgba(r, g, b, a) 格式
    const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
    if (rgbaMatch) {
      return {
        r: parseInt(rgbaMatch[1]),
        g: parseInt(rgbaMatch[2]),
        b: parseInt(rgbaMatch[3]),
      };
    }

    // 解析十六进制格式
    const hexMatch = color.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
    if (hexMatch) {
      const hex = hexMatch[1];
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16),
        };
      } else {
        return {
          r: parseInt(hex.substr(0, 2), 16),
          g: parseInt(hex.substr(2, 2), 16),
          b: parseInt(hex.substr(4, 2), 16),
        };
      }
    }

    return null;
  }

  /**
   * 计算相对亮度
   */
  private getLuminance(color: { r: number; g: number; b: number }): number {
    const { r, g, b } = color;
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * 获取ARIA角色必需属性
   */
  private getRequiredAriaAttributes(role: string): string[] {
    const required: Record<string, string[]> = {
      checkbox: ['aria-checked'],
      combobox: ['aria-expanded'],
      menuitemcheckbox: ['aria-checked'],
      menuitemradio: ['aria-checked'],
      option: ['aria-selected'],
      radio: ['aria-checked'],
      slider: ['aria-valuemin', 'aria-valuemax', 'aria-valuenow'],
      spinbutton: ['aria-valuemin', 'aria-valuemax', 'aria-valuenow'],
      tab: ['aria-selected'],
    };

    return required[role] || [];
  }

  /**
   * 生成报告
   */
  private generateReport(checks: WCAGCheckItem[]): WCAGReport {
    const summary = {
      total: checks.length,
      passed: checks.filter(c => c.status === CheckStatus.PASS).length,
      failed: checks.filter(c => c.status === CheckStatus.FAIL).length,
      warnings: checks.filter(c => c.status === CheckStatus.WARNING).length,
      manual: checks.filter(c => c.status === CheckStatus.MANUAL).length,
      compliance: 0,
      level: this.config.wcagLevel,
    };

    // 计算合规率
    if (summary.total > 0) {
      summary.compliance = Math.round(
        (summary.passed / summary.total) * 100
      );
    }

    return {
      id: `wcag_${Date.now()}`,
      timestamp: Date.now(),
      checks,
      summary,
    };
  }
}
