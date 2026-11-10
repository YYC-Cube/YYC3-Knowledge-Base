// @ts-nocheck
/**
 * @file: ThemeSyncManager.ts
 * @description: 主题同步管理器，协调系统主题、用户偏好和应用主题
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: theme,sync,coordination,auto-sync
 */

// ================================================================
// ThemeSyncManager — 主题同步管理器
// 提供：
//   - 系统主题与应用主题同步
//   - 自动/手动模式切换
//   - 用户偏好管理
//   - 主题变化通知
// ================================================================

import { SystemThemeListener, SystemTheme } from './SystemThemeListener';
import { UserPreferenceManager, ThemeSyncMode } from './UserPreferenceManager';
import { ThemeAPI, ThemeType } from './ThemeAPI';
import { ThemeEventSystem } from './ThemeEventSystem';
import { logger } from "../services/Logger";

export interface ThemeSyncConfig {
  // 是否启用自动同步
  enableAutoSync: boolean;

  // 是否在首次访问时跟随系统
  followSystemOnFirstVisit: boolean;

  // 默认主题（当系统主题检测不可用时）
  fallbackTheme: ThemeType;

  // 是否在手动覆盖后提示用户
  showManualOverrideHint: boolean;
}

export interface ThemeSyncState {
  // 当前系统主题
  systemTheme: SystemTheme;

  // 当前应用主题
  appTheme: ThemeType;

  // 同步模式
  syncMode: ThemeSyncMode;

  // 是否有手动覆盖
  hasManualOverride: boolean;

  // 是否支持系统主题检测
  systemThemeSupported: boolean;
}

const DEFAULT_CONFIG: ThemeSyncConfig = {
  enableAutoSync: true,
  followSystemOnFirstVisit: true,
  fallbackTheme: 'navy',
  showManualOverrideHint: false
};

/**
 * ThemeSyncManager - 主题同步管理器
 * 单例模式，协调系统主题和用户偏好
 */
export class ThemeSyncManager {
  private static instance: ThemeSyncManager;

  // 核心依赖
  private systemListener: SystemThemeListener;
  private preferenceManager: UserPreferenceManager;
  private themeAPI: ThemeAPI;
  private eventSystem: ThemeEventSystem;

  // 配置
  private config: ThemeSyncConfig;

  // 系统主题监听器清理函数
  private systemListenerCleanup: (() => void) | null = null;

  // 是否已初始化
  private initialized: boolean = false;

  private constructor(config?: Partial<ThemeSyncConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.systemListener = SystemThemeListener.getInstance();
    this.preferenceManager = UserPreferenceManager.getInstance();
    this.themeAPI = ThemeAPI.getInstance();
    this.eventSystem = ThemeEventSystem.getInstance();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: Partial<ThemeSyncConfig>): ThemeSyncManager {
    if (!ThemeSyncManager.instance) {
      ThemeSyncManager.instance = new ThemeSyncManager(config);
    }
    return ThemeSyncManager.instance;
  }

  /**
   * 初始化同步管理器
   */
  public initialize(): void {
    if (this.initialized) {
      return;
    }

    // 检查是否支持系统主题
    if (!this.systemListener.isSupported()) {
      logger.warn('System theme detection not supported');
    }

    // 处理首次访问
    if (this.preferenceManager.isFirstVisit()) {
      this.handleFirstVisit();
    }

    // 恢复用户偏好
    this.restoreUserPreference();

    // 启动系统主题监听
    this.startSystemThemeListener();

    this.initialized = true;
  }

  /**
   * 处理首次访问
   */
  private handleFirstVisit(): void {
    if (this.config.followSystemOnFirstVisit && this.systemListener.isSupported()) {
      // 设置为自动模式
      this.preferenceManager.setSyncMode('auto');
    } else {
      // 使用默认主题
      this.preferenceManager.setSyncMode('manual');
      this.preferenceManager.setSelectedTheme(this.config.fallbackTheme);
    }

    this.preferenceManager.markAsVisited();
  }

  /**
   * 恢复用户偏好
   */
  private restoreUserPreference(): void {
    const preference = this.preferenceManager.getPreference();

    // 如果是自动模式，根据系统主题设置
    if (preference.syncMode === 'auto') {
      const systemTheme = this.systemListener.getSystemTheme();
      const resolvedTheme = this.preferenceManager.resolveTheme(systemTheme);
      this.themeAPI.setTheme(resolvedTheme);
    } else if (preference.selectedTheme) {
      // 手动模式，恢复用户选择的主题
      this.themeAPI.setTheme(preference.selectedTheme);
    }
  }

  /**
   * 启动系统主题监听
   */
  private startSystemThemeListener(): void {
    if (!this.systemListener.isSupported()) {
      return;
    }

    // 添加监听器
    this.systemListenerCleanup = this.systemListener.addListener((event) => {
      this.handleSystemThemeChange(event.theme);
    });
  }

  /**
   * 处理系统主题变化
   */
  private handleSystemThemeChange(systemTheme: SystemTheme): void {
    const preference = this.preferenceManager.getPreference();

    // 只有在自动模式下才响应系统主题变化
    if (preference.syncMode !== 'auto') {
      return;
    }

    // 计算应该使用的主题
    const resolvedTheme = this.preferenceManager.resolveTheme(systemTheme);

    // 应用主题
    this.themeAPI.setTheme(resolvedTheme);

    logger.warn(`[ThemeSyncManager] System theme changed to ${systemTheme}, applying ${resolvedTheme}`);
  }

  /**
   * 手动设置主题
   */
  public setTheme(theme: ThemeType): void {
    const preference = this.preferenceManager.getPreference();

    if (preference.syncMode === 'auto') {
      // 自动模式下，记录手动覆盖
      this.preferenceManager.setManualOverride(theme);

      if (this.config.showManualOverrideHint) {
        logger.warn('Manual override in auto mode');
      }
    } else {
      // 手动模式，直接设置
      this.preferenceManager.setSelectedTheme(theme);
    }

    // 应用主题
    this.themeAPI.setTheme(theme);
  }

  /**
   * 设置同步模式
   */
  public setSyncMode(mode: ThemeSyncMode): void {
    const oldMode = this.preferenceManager.getSyncMode();

    if (oldMode === mode) {
      return;
    }

    this.preferenceManager.setSyncMode(mode);

    // 如果切换到自动模式，立即同步系统主题
    if (mode === 'auto' && this.systemListener.isSupported()) {
      const systemTheme = this.systemListener.getSystemTheme();
      const resolvedTheme = this.preferenceManager.resolveTheme(systemTheme);
      this.themeAPI.setTheme(resolvedTheme);
    }

    logger.warn('Sync mode changed to ${mode}');
  }

  /**
   * 获取同步模式
   */
  public getSyncMode(): ThemeSyncMode {
    return this.preferenceManager.getSyncMode();
  }

  /**
   * 切换同步模式
   */
  public toggleSyncMode(): ThemeSyncMode {
    const currentMode = this.preferenceManager.getSyncMode();
    const newMode = currentMode === 'auto' ? 'manual' : 'auto';
    this.setSyncMode(newMode);
    return newMode;
  }

  /**
   * 清除手动覆盖
   */
  public clearManualOverride(): void {
    this.preferenceManager.clearManualOverride();

    // 如果是自动模式，重新同步系统主题
    if (this.preferenceManager.getSyncMode() === 'auto' && this.systemListener.isSupported()) {
      const systemTheme = this.systemListener.getSystemTheme();
      const resolvedTheme = this.preferenceManager.resolveTheme(systemTheme);
      this.themeAPI.setTheme(resolvedTheme);
    }
  }

  /**
   * 获取当前同步状态
   */
  public getSyncState(): ThemeSyncState {
    const preference = this.preferenceManager.getPreference();
    const currentTheme = this.themeAPI.getTheme();

    return {
      systemTheme: this.systemListener.getSystemTheme(),
      appTheme: currentTheme.type,
      syncMode: preference.syncMode,
      hasManualOverride: preference.manualOverride !== null,
      systemThemeSupported: this.systemListener.isSupported()
    };
  }

  /**
   * 获取系统主题
   */
  public getSystemTheme(): SystemTheme {
    return this.systemListener.getSystemTheme();
  }

  /**
   * 获取当前应用主题
   */
  public getAppTheme(): ThemeType {
    return this.themeAPI.getTheme().type;
  }

  /**
   * 检查是否支持系统主题检测
   */
  public isSystemThemeSupported(): boolean {
    return this.systemListener.isSupported();
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<ThemeSyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  public getConfig(): Readonly<ThemeSyncConfig> {
    return { ...this.config };
  }

  /**
   * 重置为默认设置
   */
  public reset(): void {
    this.preferenceManager.resetPreference();
    this.handleFirstVisit();
    this.restoreUserPreference();
  }

  /**
   * 销毁实例
   */
  public destroy(): void {
    // 清理系统主题监听器
    if (this.systemListenerCleanup) {
      this.systemListenerCleanup();
      this.systemListenerCleanup = null;
    }

    this.initialized = false;
  }

  /**
   * 重置实例（用于测试）
   */
  public static resetInstance(): void {
    if (ThemeSyncManager.instance) {
      ThemeSyncManager.instance.destroy();
      ThemeSyncManager.instance = undefined as any;
    }
  }
}

// 导出便捷实例
export const themeSyncManager = ThemeSyncManager.getInstance();
