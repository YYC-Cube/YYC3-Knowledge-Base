// @ts-nocheck
/**
 * @file: ThemeAPI.ts
 * @description: 完整的主题API系统，提供统一的主题管理接口
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: theme,api,management,unified-interface
 */

// ================================================================
// ThemeAPI — 完整的主题API系统
// 提供：
//   - 统一的主题管理接口
//   - 7个核心API方法
//   - 事件系统集成
//   - 对比度验证集成
//   - 完整的主题生命周期管理
// ================================================================

import { CSSVariableInjector, ThemeType } from './CSSVariableInjector';
import { ColorValidator } from './ColorValidator';
import { DesignTokenSystem, DesignToken } from './DesignTokenSystem';
import { ThemeEventSystem, ThemeChangeEvent, ThemeChangeCallback } from './ThemeEventSystem';
import {
  ThemeConfig,
  ThemeColors,
  PRESET_THEMES,
  saveThemes,
  loadCustomThemes,
  saveActiveThemeId,
  loadActiveThemeId,
  applyThemeToDOM,
  exportTheme,
  importTheme,
} from '../CustomThemeStore';

export interface CustomColors {
  [key: string]: string;
}

export interface ThemeExportConfig {
  version: string;
  name: string;
  type: 'light' | 'dark';
  colors: ThemeColors;
  customColors?: CustomColors;
  tokens?: DesignToken[];
}

export interface ThemeAPIResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface ContrastValidationResult {
  valid: boolean;
  ratio: number;
  level: 'AAA' | 'AA' | 'fail';
  warnings: string[];
}

/**
 * ThemeAPI - 统一的主题管理接口
 * 单例模式，提供完整的主题管理功能
 */
export class ThemeAPI {
  private static instance: ThemeAPI;

  // 核心依赖
  private cssInjector: CSSVariableInjector;
  private colorValidator: ColorValidator;
  private tokenSystem: DesignTokenSystem;
  private eventSystem: ThemeEventSystem;

  // 当前主题状态
  private currentTheme: ThemeType = 'navy';
  private currentConfig: ThemeConfig | null = null;
  private customColors: CustomColors = {};

  // 所有主题列表
  private allThemes: ThemeConfig[] = [];

  private constructor() {
    this.cssInjector = CSSVariableInjector.getInstance();
    this.colorValidator = ColorValidator.getInstance();
    this.tokenSystem = DesignTokenSystem.getInstance();
    this.eventSystem = ThemeEventSystem.getInstance();

    this.initializeThemes();
    this.loadCurrentTheme();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ThemeAPI {
    if (!ThemeAPI.instance) {
      ThemeAPI.instance = new ThemeAPI();
    }
    return ThemeAPI.instance;
  }

  /**
   * 初始化主题列表
   */
  private initializeThemes(): void {
    this.allThemes = [...PRESET_THEMES, ...loadCustomThemes()];
  }

  /**
   * 加载当前主题
   */
  private loadCurrentTheme(): void {
    const activeId = loadActiveThemeId();
    if (activeId) {
      const config = this.allThemes.find(t => t.id === activeId);
      if (config) {
        this.currentConfig = config;
        this.currentTheme = this.mapConfigToThemeType(config);
      }
    }
  }

  /**
   * 映射ThemeConfig到ThemeType
   */
  private mapConfigToThemeType(config: ThemeConfig): ThemeType {
    if (config.id.includes('cyberpunk')) return 'cyberpunk';
    if (config.id.includes('light')) return 'light';
    return 'navy';
  }

  /**
   * API 1: setTheme - 设置主题
   */
  public setTheme(theme: ThemeType | string): ThemeAPIResult {
    try {
      const oldTheme = this.currentTheme;
      const oldConfig = this.currentConfig;

      // 查找主题配置
      let config: ThemeConfig | undefined;
      if (theme === 'navy' || theme === 'cyberpunk' || theme === 'light') {
        this.currentTheme = theme;
        config = this.allThemes.find(t =>
          theme === 'navy' ? t.id.includes('cosmic') :
          theme === 'cyberpunk' ? t.id.includes('cyberpunk') :
          t.id.includes('base-light')
        );
      } else {
        // 通过ID查找
        config = this.allThemes.find(t => t.id === theme);
        if (config) {
          this.currentTheme = this.mapConfigToThemeType(config);
        }
      }

      if (!config) {
        return {
          success: false,
          message: `主题未找到: ${theme}`
        };
      }

      // 更新当前配置
      this.currentConfig = config;

      // 应用主题到DOM
      applyThemeToDOM(config);
      saveActiveThemeId(config.id);

      // 应用自定义颜色
      this.applyCustomColors();

      // 触发事件
      this.eventSystem.emitThemeChange({
        oldTheme,
        newTheme: this.currentTheme,
        oldConfig,
        newConfig: config,
        timestamp: Date.now()
      });

      return {
        success: true,
        message: `主题已切换到: ${config.name}`,
        data: { theme: this.currentTheme, config }
      };
    } catch (error) {
      return {
        success: false,
        message: `设置主题失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * API 2: getTheme - 获取当前主题
   */
  public getTheme(): { type: ThemeType; config: ThemeConfig | null } {
    return {
      type: this.currentTheme,
      config: this.currentConfig
    };
  }

  /**
   * API 3: setCustomColor - 设置自定义颜色
   */
  public setCustomColor(key: string, color: string): ThemeAPIResult {
    try {
      // 验证颜色
      const validation = this.colorValidator.validate(color);
      if (!validation.valid) {
        return {
          success: false,
          message: `无效的颜色值: ${validation.error}`
        };
      }

      // 保存自定义颜色
      this.customColors[key] = validation.normalized || color;

      // 应用到DOM
      this.applyCustomColor(key, this.customColors[key]);

      // 触发事件
      this.eventSystem.emitColorChange({
        key,
        oldValue: undefined,
        newValue: this.customColors[key],
        timestamp: Date.now()
      });

      return {
        success: true,
        message: `自定义颜色已设置: ${key} = ${this.customColors[key]}`,
        data: { key, color: this.customColors[key] }
      };
    } catch (error) {
      return {
        success: false,
        message: `设置自定义颜色失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * API 4: getCustomColors - 获取自定义颜色
   */
  public getCustomColors(): CustomColors {
    return { ...this.customColors };
  }

  /**
   * API 5: resetTheme - 重置为默认主题
   */
  public resetTheme(): ThemeAPIResult {
    try {
      const oldTheme = this.currentTheme;
      const oldConfig = this.currentConfig;

      // 重置为默认主题（Navy）
      this.currentTheme = 'navy';
      this.customColors = {};

      // 查找默认配置
      const defaultConfig = this.allThemes.find(t => t.id.includes('cosmic'));
      if (defaultConfig) {
        this.currentConfig = defaultConfig;
        applyThemeToDOM(defaultConfig);
        saveActiveThemeId(defaultConfig.id);
      }

      // 触发事件
      this.eventSystem.emitThemeChange({
        oldTheme,
        newTheme: 'navy',
        oldConfig,
        newConfig: defaultConfig || null,
        timestamp: Date.now()
      });

      return {
        success: true,
        message: '主题已重置为默认主题',
        data: { theme: this.currentTheme, config: this.currentConfig }
      };
    } catch (error) {
      return {
        success: false,
        message: `重置主题失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * API 6: exportTheme - 导出主题配置
   */
  public exportTheme(): ThemeAPIResult {
    try {
      if (!this.currentConfig) {
        return {
          success: false,
          message: '没有当前主题配置可导出'
        };
      }

      const exported = exportTheme(this.currentConfig);

      // 添加自定义颜色
      const exportData: ThemeExportConfig = {
        ...JSON.parse(exported),
        customColors: this.customColors
      };

      // 添加Token（转换为DesignToken数组）
      const cssVars = this.tokenSystem.exportToCSSVariables(this.currentTheme);
      const tokens: DesignToken[] = Object.entries(cssVars).map(([name, value]) => ({
        name: name.replace(/^--/, '').replace(/-/g, '.'),
        value,
        type: 'primitive' as const
      }));
      exportData.tokens = tokens;

      return {
        success: true,
        message: '主题配置已导出',
        data: JSON.stringify(exportData, null, 2)
      };
    } catch (error) {
      return {
        success: false,
        message: `导出主题失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * API 7: importTheme - 导入主题配置
   */
  public importTheme(configJson: string): ThemeAPIResult {
    try {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(configJson);
      } catch {
        return {
          success: false,
          message: '无效的主题配置格式'
        };
      }

      if (parsed.customColors && typeof parsed.customColors === 'object') {
        for (const [key, value] of Object.entries(parsed.customColors)) {
          this.customColors[key] = value as string;
        }
        this.applyCustomColors();
      }

      const config = importTheme(configJson);
      if (!config) {
        return {
          success: false,
          message: '无效的主题配置格式'
        };
      }

      // 添加到主题列表
      this.allThemes.push(config);
      saveThemes(this.allThemes.filter(t => t.isCustom));

      // 立即应用导入的主题
      return this.setTheme(config.id);
    } catch (error) {
      return {
        success: false,
        message: `导入主题失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 应用自定义颜色到DOM
   */
  private applyCustomColors(): void {
    const variables: Record<string, string> = {};

    for (const [key, color] of Object.entries(this.customColors)) {
      variables[`--${key}`] = color;
    }

    if (Object.keys(variables).length > 0) {
      this.cssInjector.batchUpdate(variables);
    }
  }

  /**
   * 应用单个自定义颜色到DOM
   */
  private applyCustomColor(key: string, color: string): void {
    this.cssInjector.batchUpdate({ [`--${key}`]: color });
  }

  /**
   * 验证主题对比度
   */
  public validateContrast(): ContrastValidationResult {
    const warnings: string[] = [];
    let minRatio = Infinity;
    let minLevel: 'AAA' | 'AA' | 'fail' = 'AAA';

    if (!this.currentConfig) {
      return {
        valid: false,
        ratio: 0,
        level: 'fail',
        warnings: ['没有当前主题配置']
      };
    }

    // 验证主要颜色对比度
    const colorPairs: Array<{ fg: string; bg: string; name: string }> = [
      { fg: this.currentConfig.colors.primaryForeground, bg: this.currentConfig.colors.primary, name: 'primary' },
      { fg: this.currentConfig.colors.secondaryForeground, bg: this.currentConfig.colors.secondary, name: 'secondary' },
      { fg: this.currentConfig.colors.foreground, bg: this.currentConfig.colors.background, name: 'background' },
      { fg: this.currentConfig.colors.cardForeground, bg: this.currentConfig.colors.card, name: 'card' },
    ];

    for (const pair of colorPairs) {
      const result = this.colorValidator.checkContrast(pair.fg, pair.bg);

      if (result.ratio < minRatio) {
        minRatio = result.ratio;
        minLevel = result.level;
      }

      if (result.level === 'fail') {
        warnings.push(`${pair.name}: 对比度不足 (${result.ratio.toFixed(2)}:1, 需要 ≥ 4.5:1)`);
      } else if (result.level === 'AA') {
        warnings.push(`${pair.name}: 对比度达到AA标准 (${result.ratio.toFixed(2)}:1, 建议提升到AAA)`);
      }
    }

    return {
      valid: minLevel !== 'fail',
      ratio: minRatio,
      level: minLevel,
      warnings
    };
  }

  /**
   * 监听主题变化
   */
  public onThemeChange(callback: ThemeChangeCallback): () => void {
    return this.eventSystem.onThemeChange(callback);
  }

  /**
   * 监听颜色变化
   */
  public onColorChange(callback: (event: ThemeChangeEvent) => void): () => void {
    return this.eventSystem.on('colorChange', callback);
  }

  /**
   * 获取所有可用主题
   */
  public getAllThemes(): ThemeConfig[] {
    return [...this.allThemes];
  }

  /**
   * 获取主题性能指标
   */
  public getPerformanceMetrics() {
    return this.cssInjector.getPerformanceMetrics();
  }

  /**
   * 销毁实例
   */
  public destroy(): void {
    this.eventSystem.destroy();
  }
}

// 导出便捷函数
export const themeAPI = ThemeAPI.getInstance();
export const setTheme = (theme: ThemeType | string) => themeAPI.setTheme(theme);
export const getTheme = () => themeAPI.getTheme();
export const setCustomColor = (key: string, color: string) => themeAPI.setCustomColor(key, color);
export const getCustomColors = () => themeAPI.getCustomColors();
export const resetTheme = () => themeAPI.resetTheme();
export const exportThemeConfig = () => themeAPI.exportTheme();
export const importThemeConfig = (json: string) => themeAPI.importTheme(json);
