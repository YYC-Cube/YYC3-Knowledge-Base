/**
 * @file: CSSVariableInjector.ts
 * @description: 增强的CSS变量动态注入系统，支持批量更新、变化检测、性能优化
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: theme,css-variables,performance,batch-update
 */

// ================================================================
// CSSVariableInjector — 增强的CSS变量动态注入系统
// 支持：
//   - 批量更新（减少重绘）
//   - 变化检测（避免不必要更新）
//   - 性能监控
//   - 三种主题支持（Cyberpunk、Navy、Light）
// ================================================================

import { logger } from "../services/Logger";
export type ThemeType = 'navy' | 'cyberpunk' | 'light';

export interface CSSVariableChange {
  key: string;
  oldValue: string | undefined;
  newValue: string;
}

export interface BatchUpdateResult {
  applied: number;
  skipped: number;
  changes: CSSVariableChange[];
  duration: number;
}

export interface PerformanceMetrics {
  totalUpdates: number;
  totalVariables: number;
  averageBatchSize: number;
  averageDuration: number;
  lastUpdateDuration: number;
}

/**
 * CSS变量注入器 - 单例模式
 * 提供高性能的CSS变量批量更新和变化检测
 */
export class CSSVariableInjector {
  private static instance: CSSVariableInjector;

  // 当前变量状态
  private currentVariables: Map<string, string> = new Map();

  // 性能监控
  private metrics: PerformanceMetrics = {
    totalUpdates: 0,
    totalVariables: 0,
    averageBatchSize: 0,
    averageDuration: 0,
    lastUpdateDuration: 0
  };

  // 批量更新队列（用于减少重绘）
  private pendingUpdate: boolean = false;
  private pendingVariables: Map<string, string> = new Map();
  private updateScheduled: boolean = false;

  // 变化监听器
  private changeListeners: Set<(changes: CSSVariableChange[]) => void> = new Set();

  private constructor() {
    // 私有构造函数，强制使用getInstance
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): CSSVariableInjector {
    if (!CSSVariableInjector.instance) {
      CSSVariableInjector.instance = new CSSVariableInjector();
    }
    return CSSVariableInjector.instance;
  }

  /**
   * 批量更新CSS变量（核心方法）
   * 只更新变化的变量，减少DOM操作
   */
  public batchUpdate(variables: Record<string, string>): BatchUpdateResult {
    const startTime = performance.now();
    const changes: CSSVariableChange[] = [];
    let applied = 0;
    let skipped = 0;

    // 检测变化
    for (const [key, value] of Object.entries(variables)) {
      const oldValue = this.currentVariables.get(key);

      if (oldValue !== value) {
        changes.push({ key, oldValue, newValue: value });
        applied++;
      } else {
        skipped++;
      }
    }

    // 只有有变化才更新DOM
    if (changes.length > 0) {
      this.applyChangesToDOM(changes);

      // 更新内部状态
      for (const change of changes) {
        this.currentVariables.set(change.key, change.newValue);
      }

      // 通知监听器
      this.notifyListeners(changes);
    }

    // 更新性能指标
    const duration = performance.now() - startTime;
    this.updateMetrics(changes.length, duration);

    return {
      applied,
      skipped,
      changes,
      duration
    };
  }

  /**
   * 延迟批量更新（用于高频更新场景）
   * 合并多次更新为一次，减少重绘
   */
  public scheduleBatchUpdate(variables: Record<string, string>): void {
    // 将变量添加到待更新队列
    for (const [key, value] of Object.entries(variables)) {
      this.pendingVariables.set(key, value);
    }

    // 如果还没有调度更新，则调度
    if (!this.updateScheduled) {
      this.updateScheduled = true;

      // 使用requestAnimationFrame或setTimeout
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => this.flushScheduledUpdate());
      } else {
        setTimeout(() => this.flushScheduledUpdate(), 16); // ~60fps
      }
    }
  }

  /**
   * 执行延迟的批量更新
   */
  private flushScheduledUpdate(): void {
    if (this.pendingVariables.size > 0) {
      const variables = Object.fromEntries(this.pendingVariables);
      this.batchUpdate(variables);
      this.pendingVariables.clear();
    }
    this.updateScheduled = false;
  }

  /**
   * 设置单个CSS变量
   */
  public setVariable(key: string, value: string): void {
    this.batchUpdate({ [key]: value });
  }

  /**
   * 获取CSS变量当前值
   */
  public getVariable(key: string): string | undefined {
    return this.currentVariables.get(key);
  }

  /**
   * 获取所有CSS变量
   */
  public getAllVariables(): Record<string, string> {
    return Object.fromEntries(this.currentVariables);
  }

  /**
   * 移除CSS变量
   */
  public removeVariable(key: string): void {
    const root = document.documentElement;
    root.style.removeProperty(key);
    this.currentVariables.delete(key);
  }

  /**
   * 清空所有CSS变量
   */
  public clearAll(): void {
    const root = document.documentElement;

    for (const key of this.currentVariables.keys()) {
      root.style.removeProperty(key);
    }

    this.currentVariables.clear();

    // 重置性能指标
    this.metrics = {
      totalUpdates: 0,
      totalVariables: 0,
      averageBatchSize: 0,
      averageDuration: 0,
      lastUpdateDuration: 0
    };
  }

  /**
   * 检查变量是否存在
   */
  public hasVariable(key: string): boolean {
    return this.currentVariables.has(key);
  }

  /**
   * 获取性能指标
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 添加变化监听器
   */
  public addChangeListener(callback: (changes: CSSVariableChange[]) => void): () => void {
    this.changeListeners.add(callback);

    // 返回取消监听函数
    return () => {
      this.changeListeners.delete(callback);
    };
  }

  /**
   * 应用主题预设
   */
  public applyTheme(theme: ThemeType, customVariables?: Record<string, string>): void {
    const themeVariables = this.getThemeVariables(theme);

    // 合并自定义变量
    const finalVariables = customVariables
      ? { ...themeVariables, ...customVariables }
      : themeVariables;

    this.batchUpdate(finalVariables);
  }

  /**
   * 导出当前变量为JSON
   */
  public exportVariables(): string {
    return JSON.stringify(this.getAllVariables(), null, 2);
  }

  /**
   * 从JSON导入变量
   */
  public importVariables(json: string): BatchUpdateResult {
    try {
      const variables = JSON.parse(json);
      return this.batchUpdate(variables);
    } catch (error) {
      logger.error('Failed to import variables:', error);
      return {
        applied: 0,
        skipped: 0,
        changes: [],
        duration: 0
      };
    }
  }

  // ========== 私有方法 ==========

  /**
   * 应用变化到DOM
   */
  private applyChangesToDOM(changes: CSSVariableChange[]): void {
    const root = document.documentElement;

    for (const change of changes) {
      root.style.setProperty(change.key, change.newValue);
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(changes: CSSVariableChange[]): void {
    for (const listener of this.changeListeners) {
      try {
        listener(changes);
      } catch (error) {
        logger.error('Error in change listener:', error);
      }
    }
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(changeCount: number, duration: number): void {
    this.metrics.totalUpdates++;
    this.metrics.totalVariables = this.currentVariables.size;
    this.metrics.lastUpdateDuration = duration;

    // 计算平均值
    const totalDuration = this.metrics.averageDuration * (this.metrics.totalUpdates - 1) + duration;
    this.metrics.averageDuration = totalDuration / this.metrics.totalUpdates;

    const totalBatchSize = this.metrics.averageBatchSize * (this.metrics.totalUpdates - 1) + changeCount;
    this.metrics.averageBatchSize = totalBatchSize / this.metrics.totalUpdates;
  }

  /**
   * 获取主题变量预设
   */
  private getThemeVariables(theme: ThemeType): Record<string, string> {
    const themes: Record<ThemeType, Record<string, string>> = {
      navy: {
        '--primary': 'oklch(0.55 0.22 264)',
        '--primary-foreground': 'oklch(0.98 0.01 264)',
        '--secondary': 'oklch(0.27 0.02 264)',
        '--secondary-foreground': 'oklch(0.98 0.01 264)',
        '--background': 'oklch(0.15 0.02 264)',
        '--foreground': 'oklch(0.98 0.01 264)',
        '--card': 'oklch(0.20 0.02 264)',
        '--card-foreground': 'oklch(0.98 0.01 264)',
        '--border': 'oklch(0.30 0.02 264)',
        '--input': 'oklch(0.27 0.02 264)',
        '--ring': 'oklch(0.55 0.22 264)',
      },
      cyberpunk: {
        '--primary': 'oklch(0.60 0.25 300)',
        '--primary-foreground': 'oklch(0.98 0.01 300)',
        '--secondary': 'oklch(0.20 0.02 300)',
        '--secondary-foreground': 'oklch(0.98 0.01 300)',
        '--background': 'oklch(0.10 0.02 300)',
        '--foreground': 'oklch(0.95 0.01 300)',
        '--card': 'oklch(0.15 0.02 300)',
        '--card-foreground': 'oklch(0.95 0.01 300)',
        '--border': 'oklch(0.25 0.02 300)',
        '--input': 'oklch(0.20 0.02 300)',
        '--ring': 'oklch(0.60 0.25 300)',
      },
      light: {
        '--primary': 'oklch(0.55 0.22 264)',
        '--primary-foreground': 'oklch(0.98 0.01 264)',
        '--secondary': 'oklch(0.95 0.006 264)',
        '--secondary-foreground': 'oklch(0.20 0.02 264)',
        '--background': 'oklch(0.98 0.01 264)',
        '--foreground': 'oklch(0.15 0.02 264)',
        '--card': 'oklch(1.00 0.00 0)',
        '--card-foreground': 'oklch(0.15 0.02 264)',
        '--border': 'oklch(0.85 0.02 264)',
        '--input': 'oklch(0.85 0.02 264)',
        '--ring': 'oklch(0.55 0.22 264)',
      }
    };

    return themes[theme];
  }
}

// 导出便捷函数
export const cssVariableInjector = CSSVariableInjector.getInstance();

/**
 * 快速批量更新CSS变量
 */
export function batchUpdateCSSVariables(variables: Record<string, string>): BatchUpdateResult {
  return cssVariableInjector.batchUpdate(variables);
}

/**
 * 快速设置单个CSS变量
 */
export function setCSSVariable(key: string, value: string): void {
  cssVariableInjector.setVariable(key, value);
}

/**
 * 快速获取CSS变量
 */
export function getCSSVariable(key: string): string | undefined {
  return cssVariableInjector.getVariable(key);
}
