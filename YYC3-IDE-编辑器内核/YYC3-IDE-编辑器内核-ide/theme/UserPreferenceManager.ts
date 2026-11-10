/**
 * @file: UserPreferenceManager.ts
 * @description: 用户偏好管理器，保存和恢复用户主题偏好设置
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: theme,preference,storage,user-settings
 */

// ================================================================
// UserPreferenceManager — 用户偏好管理器
// 提供：
//   - 用户主题偏好保存
//   - 偏好恢复
//   - localStorage持久化
//   - 默认值管理
// ================================================================

import { ThemeType } from './CSSVariableInjector';
import { SystemTheme } from './SystemThemeListener';
import { logger } from "../services/Logger";

export type ThemeSyncMode = 'manual' | 'auto';

export interface UserThemePreference {
  // 当前选择的主题
  selectedTheme: ThemeType | null;

  // 同步模式：manual（手动）或 auto（跟随系统）
  syncMode: ThemeSyncMode;

  // 手动覆盖的主题（当syncMode为auto时，用户可以手动覆盖）
  manualOverride: ThemeType | null;

  // 上次更新的时间戳
  lastUpdated: number;

  // 用户是否首次访问
  isFirstVisit: boolean;
}

const STORAGE_KEY = 'yyc3_theme_preference';
const DEFAULT_PREFERENCE: UserThemePreference = {
  selectedTheme: null,
  syncMode: 'manual',
  manualOverride: null,
  lastUpdated: Date.now(),
  isFirstVisit: true
};

/**
 * UserPreferenceManager - 用户偏好管理器
 * 单例模式，管理用户主题偏好设置
 */
export class UserPreferenceManager {
  private static instance: UserPreferenceManager;

  // 当前偏好
  private preference: UserThemePreference;

  // 是否支持localStorage
  private storageAvailable: boolean = false;

  private constructor() {
    this.storageAvailable = this.checkStorageAvailable();
    this.preference = this.loadPreference();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): UserPreferenceManager {
    if (!UserPreferenceManager.instance) {
      UserPreferenceManager.instance = new UserPreferenceManager();
    }
    return UserPreferenceManager.instance;
  }

  /**
   * 检查localStorage是否可用
   */
  private checkStorageAvailable(): boolean {
    try {
      if (typeof localStorage === 'undefined') {
        return false;
      }

      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 从localStorage加载偏好
   */
  private loadPreference(): UserThemePreference {
    if (!this.storageAvailable) {
      return { ...DEFAULT_PREFERENCE };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // 验证数据格式
        if (this.validatePreference(parsed)) {
          return {
            ...DEFAULT_PREFERENCE,
            ...parsed,
            lastUpdated: parsed.lastUpdated || Date.now()
          };
        }
      }
    } catch (error) {
      logger.error('[UserPreferenceManager] Failed to load preference:', error);
    }

    return { ...DEFAULT_PREFERENCE };
  }

  /**
   * 验证偏好数据格式
   */
  private validatePreference(data: unknown): data is Partial<UserThemePreference> {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const pref = data as Partial<UserThemePreference>;

    // 如果没有任何有效字段，返回false
    if (!pref.syncMode && !pref.selectedTheme && !pref.manualOverride && pref.isFirstVisit === undefined) {
      return false;
    }

    // 验证syncMode
    if (pref.syncMode && !['manual', 'auto'].includes(pref.syncMode)) {
      return false;
    }

    // 验证selectedTheme
    if (pref.selectedTheme && !['navy', 'cyberpunk', 'light'].includes(pref.selectedTheme)) {
      return false;
    }

    // 验证manualOverride
    if (pref.manualOverride && !['navy', 'cyberpunk', 'light'].includes(pref.manualOverride)) {
      return false;
    }

    return true;
  }

  /**
   * 保存偏好到localStorage
   */
  private savePreference(): void {
    if (!this.storageAvailable) {
      return;
    }

    try {
      this.preference.lastUpdated = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preference));
    } catch (error) {
      logger.error('[UserPreferenceManager] Failed to save preference:', error);
    }
  }

  /**
   * 获取当前偏好
   */
  public getPreference(): Readonly<UserThemePreference> {
    return { ...this.preference };
  }

  /**
   * 设置选中的主题
   */
  public setSelectedTheme(theme: ThemeType | null): void {
    this.preference.selectedTheme = theme;
    this.preference.isFirstVisit = false;
    this.savePreference();
  }

  /**
   * 获取选中的主题
   */
  public getSelectedTheme(): ThemeType | null {
    return this.preference.selectedTheme;
  }

  /**
   * 设置同步模式
   */
  public setSyncMode(mode: ThemeSyncMode): void {
    this.preference.syncMode = mode;

    // 如果切换到自动模式，清除手动覆盖
    if (mode === 'auto') {
      this.preference.manualOverride = null;
    }

    this.savePreference();
  }

  /**
   * 获取同步模式
   */
  public getSyncMode(): ThemeSyncMode {
    return this.preference.syncMode;
  }

  /**
   * 设置手动覆盖
   */
  public setManualOverride(theme: ThemeType | null): void {
    this.preference.manualOverride = theme;
    this.savePreference();
  }

  /**
   * 获取手动覆盖
   */
  public getManualOverride(): ThemeType | null {
    return this.preference.manualOverride;
  }

  /**
   * 清除手动覆盖
   */
  public clearManualOverride(): void {
    this.preference.manualOverride = null;
    this.savePreference();
  }

  /**
   * 检查是否是首次访问
   */
  public isFirstVisit(): boolean {
    return this.preference.isFirstVisit;
  }

  /**
   * 标记为非首次访问
   */
  public markAsVisited(): void {
    if (this.preference.isFirstVisit) {
      this.preference.isFirstVisit = false;
      this.savePreference();
    }
  }

  /**
   * 重置偏好为默认值
   */
  public resetPreference(): void {
    this.preference = { ...DEFAULT_PREFERENCE };
    this.savePreference();
  }

  /**
   * 获取上次更新时间
   */
  public getLastUpdated(): number {
    return this.preference.lastUpdated;
  }

  /**
   * 根据系统主题和用户偏好，计算应该使用的主题
   */
  public resolveTheme(systemTheme: SystemTheme): ThemeType {
    // 如果是手动模式，使用用户选择的主题
    if (this.preference.syncMode === 'manual') {
      return this.preference.selectedTheme || 'navy';
    }

    // 如果是自动模式，但有手动覆盖，使用覆盖的主题
    if (this.preference.manualOverride) {
      return this.preference.manualOverride;
    }

    // 自动模式：根据系统主题选择
    // dark -> navy (深海军蓝)
    // light -> light (浅色主题)
    return systemTheme === 'dark' ? 'navy' : 'light';
  }

  /**
   * 导出偏好（用于调试或备份）
   */
  public exportPreference(): string {
    return JSON.stringify(this.preference, null, 2);
  }

  /**
   * 导入偏好（用于恢复或测试）
   */
  public importPreference(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (this.validatePreference(data)) {
        this.preference = {
          ...DEFAULT_PREFERENCE,
          ...data
        };
        this.savePreference();
        return true;
      }
    } catch (error) {
      logger.error('[UserPreferenceManager] Failed to import preference:', error);
    }
    return false;
  }

  /**
   * 销毁实例
   */
  public destroy(): void {
    this.preference = { ...DEFAULT_PREFERENCE };
  }

  /**
   * 重置实例（用于测试）
   */
  public static resetInstance(): void {
    if (UserPreferenceManager.instance) {
      UserPreferenceManager.instance.destroy();
      UserPreferenceManager.instance = undefined as any;
    }
  }
}

// 导出便捷实例
export const userPreferenceManager = UserPreferenceManager.getInstance();
