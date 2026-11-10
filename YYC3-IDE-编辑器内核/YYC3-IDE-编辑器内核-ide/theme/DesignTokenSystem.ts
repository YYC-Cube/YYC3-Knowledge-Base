/**
 * @file: DesignTokenSystem.ts
 * @description: Design Token层级系统，支持基础Token、语义Token、组件Token
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: theme,design-tokens,hierarchy,inheritance
 */

// ================================================================
// DesignTokenSystem — Design Token层级系统
// 支持：
//   - 三级Token层级（基础 → 语义 → 组件）
//   - Token继承和覆盖
//   - 主题独立的Token值
//   - Token解析和引用
// ================================================================

import { ThemeType } from './CSSVariableInjector';
import { logger } from "../services/Logger";

export type TokenType = 'primitive' | 'semantic' | 'component';

export interface DesignToken {
  name: string;
  value: string;
  type: TokenType;
  description?: string;
  references?: string; // 引用其他Token
}

export interface TokenGroup {
  name: string;
  tokens: Record<string, DesignToken>;
  description?: string;
}

/**
 * Design Token系统 - 单例模式
 */
export class DesignTokenSystem {
  private static instance: DesignTokenSystem;

  // 三级Token存储
  private primitiveTokens: Map<string, DesignToken> = new Map();
  private semanticTokens: Map<string, DesignToken> = new Map();
  private componentTokens: Map<string, DesignToken> = new Map();

  // 主题Token覆盖
  private themeOverrides: Map<ThemeType, Map<string, string>> = new Map();

  // Token变更监听器
  private tokenListeners: Set<(token: DesignToken) => void> = new Set();

  private constructor() {
    this.initializePrimitiveTokens();
    this.initializeSemanticTokens();
    this.initializeComponentTokens();
  }

  public static getInstance(): DesignTokenSystem {
    if (!DesignTokenSystem.instance) {
      DesignTokenSystem.instance = new DesignTokenSystem();
    }
    return DesignTokenSystem.instance;
  }

  /**
   * 初始化基础Token（Primitive）
   * 定义最基础的颜色、尺寸、间距等
   */
  private initializePrimitiveTokens(): void {
    // 颜色基础Token
    const colorPrimitives: DesignToken[] = [
      { name: 'color.blue.500', value: 'oklch(0.55 0.22 264)', type: 'primitive', description: '基础蓝色' },
      { name: 'color.blue.600', value: 'oklch(0.50 0.24 264)', type: 'primitive', description: '深蓝色' },
      { name: 'color.purple.500', value: 'oklch(0.60 0.25 300)', type: 'primitive', description: '紫色' },
      { name: 'color.green.500', value: 'oklch(0.65 0.20 145)', type: 'primitive', description: '绿色' },
      { name: 'color.red.500', value: 'oklch(0.55 0.22 25)', type: 'primitive', description: '红色' },

      // 灰度
      { name: 'color.gray.50', value: 'oklch(0.98 0.01 264)', type: 'primitive', description: '最浅灰' },
      { name: 'color.gray.100', value: 'oklch(0.95 0.01 264)', type: 'primitive', description: '浅灰' },
      { name: 'color.gray.500', value: 'oklch(0.50 0.01 264)', type: 'primitive', description: '中灰' },
      { name: 'color.gray.900', value: 'oklch(0.15 0.02 264)', type: 'primitive', description: '深灰' },

      // 尺寸
      { name: 'size.xs', value: '4px', type: 'primitive', description: '超小尺寸' },
      { name: 'size.sm', value: '8px', type: 'primitive', description: '小尺寸' },
      { name: 'size.md', value: '12px', type: 'primitive', description: '中等尺寸' },
      { name: 'size.lg', value: '16px', type: 'primitive', description: '大尺寸' },
      { name: 'size.xl', value: '24px', type: 'primitive', description: '超大尺寸' },

      // 间距
      { name: 'spacing.1', value: '4px', type: 'primitive', description: '间距1' },
      { name: 'spacing.2', value: '8px', type: 'primitive', description: '间距2' },
      { name: 'spacing.4', value: '16px', type: 'primitive', description: '间距4' },
      { name: 'spacing.6', value: '24px', type: 'primitive', description: '间距6' },

      // 圆角
      { name: 'radius.sm', value: '4px', type: 'primitive', description: '小圆角' },
      { name: 'radius.md', value: '8px', type: 'primitive', description: '中等圆角' },
      { name: 'radius.lg', value: '12px', type: 'primitive', description: '大圆角' },

      // 阴影
      { name: 'shadow.sm', value: '0 1px 2px rgba(0,0,0,0.05)', type: 'primitive', description: '小阴影' },
      { name: 'shadow.md', value: '0 4px 6px rgba(0,0,0,0.1)', type: 'primitive', description: '中等阴影' },
      { name: 'shadow.lg', value: '0 10px 15px rgba(0,0,0,0.1)', type: 'primitive', description: '大阴影' },
    ];

    colorPrimitives.forEach(token => {
      this.primitiveTokens.set(token.name, token);
    });
  }

  /**
   * 初始化语义Token（Semantic）
   * 基于基础Token定义语义化的颜色
   */
  private initializeSemanticTokens(): void {
    const semanticTokens: DesignToken[] = [
      // 主要颜色（引用基础Token）
      {
        name: 'color.primary',
        value: '{color.blue.500}',
        type: 'semantic',
        description: '主题主色',
        references: 'color.blue.500'
      },
      {
        name: 'color.primary.hover',
        value: '{color.blue.600}',
        type: 'semantic',
        description: '主题主色悬停态',
        references: 'color.blue.600'
      },

      // 背景颜色
      {
        name: 'color.background',
        value: '{color.gray.900}',
        type: 'semantic',
        description: '页面背景色',
        references: 'color.gray.900'
      },
      {
        name: 'color.surface',
        value: '{color.gray.50}',
        type: 'semantic',
        description: '表面颜色（卡片等）',
        references: 'color.gray.50'
      },

      // 文本颜色
      {
        name: 'color.text.primary',
        value: '{color.gray.50}',
        type: 'semantic',
        description: '主要文本颜色',
        references: 'color.gray.50'
      },
      {
        name: 'color.text.secondary',
        value: '{color.gray.500}',
        type: 'semantic',
        description: '次要文本颜色',
        references: 'color.gray.500'
      },

      // 状态颜色
      {
        name: 'color.success',
        value: '{color.green.500}',
        type: 'semantic',
        description: '成功状态颜色',
        references: 'color.green.500'
      },
      {
        name: 'color.error',
        value: '{color.red.500}',
        type: 'semantic',
        description: '错误状态颜色',
        references: 'color.red.500'
      },

      // 边框颜色
      {
        name: 'color.border',
        value: '{color.gray.100}',
        type: 'semantic',
        description: '边框颜色',
        references: 'color.gray.100'
      },

      // 尺寸语义
      {
        name: 'size.button.padding',
        value: '{spacing.2} {spacing.4}',
        type: 'semantic',
        description: '按钮内边距'
      },
      {
        name: 'size.card.padding',
        value: '{spacing.6}',
        type: 'semantic',
        description: '卡片内边距'
      },
    ];

    semanticTokens.forEach(token => {
      this.semanticTokens.set(token.name, token);
    });
  }

  /**
   * 初始化组件Token（Component）
   * 基于语义Token定义具体组件的样式
   */
  private initializeComponentTokens(): void {
    const componentTokens: DesignToken[] = [
      // 按钮组件
      {
        name: 'button.primary.background',
        value: '{color.primary}',
        type: 'component',
        description: '主按钮背景色',
        references: 'color.primary'
      },
      {
        name: 'button.primary.color',
        value: '{color.text.primary}',
        type: 'component',
        description: '主按钮文本色',
        references: 'color.text.primary'
      },
      {
        name: 'button.primary.padding',
        value: '{size.button.padding}',
        type: 'component',
        description: '主按钮内边距',
        references: 'size.button.padding'
      },
      {
        name: 'button.primary.radius',
        value: '{radius.md}',
        type: 'component',
        description: '主按钮圆角',
        references: 'radius.md'
      },

      // 卡片组件
      {
        name: 'card.background',
        value: '{color.surface}',
        type: 'component',
        description: '卡片背景色',
        references: 'color.surface'
      },
      {
        name: 'card.border',
        value: '{color.border}',
        type: 'component',
        description: '卡片边框色',
        references: 'color.border'
      },
      {
        name: 'card.padding',
        value: '{size.card.padding}',
        type: 'component',
        description: '卡片内边距',
        references: 'size.card.padding'
      },
      {
        name: 'card.radius',
        value: '{radius.lg}',
        type: 'component',
        description: '卡片圆角',
        references: 'radius.lg'
      },
      {
        name: 'card.shadow',
        value: '{shadow.md}',
        type: 'component',
        description: '卡片阴影',
        references: 'shadow.md'
      },

      // 输入框组件
      {
        name: 'input.background',
        value: '{color.surface}',
        type: 'component',
        description: '输入框背景色',
        references: 'color.surface'
      },
      {
        name: 'input.border',
        value: '{color.border}',
        type: 'component',
        description: '输入框边框色',
        references: 'color.border'
      },
      {
        name: 'input.radius',
        value: '{radius.md}',
        type: 'component',
        description: '输入框圆角',
        references: 'radius.md'
      },
    ];

    componentTokens.forEach(token => {
      this.componentTokens.set(token.name, token);
    });
  }

  /**
   * 获取Token值（自动解析引用）
   */
  public getToken(name: string, theme?: ThemeType): string {
    // 先查找主题覆盖
    if (theme) {
      const override = this.themeOverrides.get(theme)?.get(name);
      if (override) return override;
    }

    // 查找三级Token
    const token = this.componentTokens.get(name) ||
                this.semanticTokens.get(name) ||
                this.primitiveTokens.get(name);

    if (!token) {
      logger.warn('Token not found: ${name}');
      return '';
    }

    // 如果有引用，递归解析
    if (token.references) {
      return this.getToken(token.references, theme);
    }

    return token.value;
  }

  /**
   * 设置Token值
   */
  public setToken(name: string, value: string, type: TokenType, description?: string): void {
    const token: DesignToken = { name, value, type, description };

    switch (type) {
      case 'primitive':
        this.primitiveTokens.set(name, token);
        break;
      case 'semantic':
        this.semanticTokens.set(name, token);
        break;
      case 'component':
        this.componentTokens.set(name, token);
        break;
    }

    this.notifyListeners(token);
  }

  /**
   * 设置主题Token覆盖
   */
  public setThemeOverride(theme: ThemeType, tokenName: string, value: string): void {
    if (!this.themeOverrides.has(theme)) {
      this.themeOverrides.set(theme, new Map());
    }

    this.themeOverrides.get(theme)!.set(tokenName, value);
  }

  /**
   * 获取所有Token（按类型）
   */
  public getAllTokens(type?: TokenType): DesignToken[] {
    if (type === 'primitive') {
      return Array.from(this.primitiveTokens.values());
    }
    if (type === 'semantic') {
      return Array.from(this.semanticTokens.values());
    }
    if (type === 'component') {
      return Array.from(this.componentTokens.values());
    }

    // 返回所有Token
    return [
      ...this.primitiveTokens.values(),
      ...this.semanticTokens.values(),
      ...this.componentTokens.values()
    ];
  }

  /**
   * 获取Token定义（包含元数据）
   */
  public getTokenDefinition(name: string): DesignToken | undefined {
    return this.componentTokens.get(name) ||
           this.semanticTokens.get(name) ||
           this.primitiveTokens.get(name);
  }

  /**
   * 解析Token引用（如 {color.blue.500}）
   */
  public resolveTokenReference(reference: string, theme?: ThemeType): string {
    // 提取Token名称
    const match = reference.match(/\{([^}]+)\}/);
    if (!match) return reference;

    const tokenName = match[1];
    return this.getToken(tokenName, theme);
  }

  /**
   * 解析包含Token引用的值
   */
  public resolveValue(value: string, theme?: ThemeType): string {
    // 替换所有Token引用
    return value.replace(/\{([^}]+)\}/g, (_, tokenName) => {
      return this.getToken(tokenName, theme);
    });
  }

  /**
   * 导出Token为CSS变量
   */
  public exportToCSSVariables(theme?: ThemeType): Record<string, string> {
    const variables: Record<string, string> = {};

    // 导出基础Token
    Array.from(this.primitiveTokens.entries()).forEach(([name, token]) => {
      const cssVarName = this.tokenNameToCSSVar(name);
      variables[cssVarName] = this.getToken(name, theme);
    });

    // 导出语义Token
    for (const [name, token] of this.semanticTokens) {
      const cssVarName = this.tokenNameToCSSVar(name);
      variables[cssVarName] = this.getToken(name, theme);
    }

    // 导出组件Token
    for (const [name, token] of this.componentTokens) {
      const cssVarName = this.tokenNameToCSSVar(name);
      variables[cssVarName] = this.getToken(name, theme);
    }

    return variables;
  }

  /**
   * Token名称转CSS变量名
   */
  private tokenNameToCSSVar(name: string): string {
    return `--${name.replace(/\./g, '-')}`;
  }

  /**
   * 添加Token变更监听器
   */
  public addTokenListener(callback: (token: DesignToken) => void): () => void {
    this.tokenListeners.add(callback);
    return () => this.tokenListeners.delete(callback);
  }

  /**
   * 通知监听器
   */
  private notifyListeners(token: DesignToken): void {
    for (const listener of this.tokenListeners) {
      try {
        listener(token);
      } catch (error) {
        logger.error('Error in token listener:', error);
      }
    }
  }

  /**
   * 批量设置Token
   */
  public setTokens(tokens: DesignToken[]): void {
    tokens.forEach(token => {
      this.setToken(token.name, token.value, token.type, token.description);
    });
  }

  /**
   * 清空所有Token
   */
  public clearAll(): void {
    this.primitiveTokens.clear();
    this.semanticTokens.clear();
    this.componentTokens.clear();
    this.themeOverrides.clear();

    // 重新初始化
    this.initializePrimitiveTokens();
    this.initializeSemanticTokens();
    this.initializeComponentTokens();
  }

  /**
   * 获取Token统计
   */
  public getTokenStats(): {
    primitive: number;
    semantic: number;
    component: number;
    total: number;
  } {
    return {
      primitive: this.primitiveTokens.size,
      semantic: this.semanticTokens.size,
      component: this.componentTokens.size,
      total: this.primitiveTokens.size + this.semanticTokens.size + this.componentTokens.size
    };
  }
}

// 导出单例
export const designTokenSystem = DesignTokenSystem.getInstance();

/**
 * 快速获取Token值
 */
export function getToken(name: string, theme?: ThemeType): string {
  return designTokenSystem.getToken(name, theme);
}

/**
 * 快速设置Token
 */
export function setToken(name: string, value: string, type: TokenType, description?: string): void {
  designTokenSystem.setToken(name, value, type, description);
}
