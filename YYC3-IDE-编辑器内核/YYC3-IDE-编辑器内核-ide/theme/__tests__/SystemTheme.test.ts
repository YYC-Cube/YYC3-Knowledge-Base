// @ts-nocheck
/**
 * @file: SystemTheme.test.ts
 * @description: 任务1.3系统主题监听完整测试
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,theme,system,preference,sync
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SystemThemeListener, SystemTheme } from '../SystemThemeListener';
import { UserPreferenceManager, ThemeSyncMode } from '../UserPreferenceManager';
import { ThemeSyncManager } from '../ThemeSyncManager';
import { ThemeAPI } from '../ThemeAPI';

describe('任务1.3: 系统主题监听', () => {
  // 模拟window.matchMedia
  const createMockMediaQuery = (matches: boolean) => ({
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  });

  // 保存原始matchMedia
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    // 保存原始matchMedia
    originalMatchMedia = window.matchMedia;
    
    // 重置所有实例
    SystemThemeListener.resetInstance();
    UserPreferenceManager.resetInstance();
    ThemeSyncManager.resetInstance();
    
    // 清空localStorage
    localStorage.clear();
    
    // 重置DOM
    document.documentElement.style.cssText = '';
  });

  afterEach(() => {
    // 恢复原始matchMedia
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  describe('1.3.1 系统主题检测', () => {
    it('应该检测到深色系统主题', () => {
      // 模拟深色模式
      const mockMediaQuery = createMockMediaQuery(true);
      window.matchMedia = vi.fn(() => mockMediaQuery as any);
      
      const listener = SystemThemeListener.getInstance();
      
      expect(listener.isSupported()).toBe(true);
      expect(listener.getSystemTheme()).toBe('dark');
    });

    it('应该检测到浅色系统主题', () => {
      // 模拟浅色模式
      const mockMediaQuery = createMockMediaQuery(false);
      window.matchMedia = vi.fn(() => mockMediaQuery as any);
      
      const listener = SystemThemeListener.getInstance();
      
      expect(listener.isSupported()).toBe(true);
      expect(listener.getSystemTheme()).toBe('light');
    });

    it('应该在系统主题变化时通知监听器', () => {
      const mockMediaQuery = createMockMediaQuery(false);
      window.matchMedia = vi.fn(() => mockMediaQuery as any);
      
      const listener = SystemThemeListener.getInstance();
      const callback = vi.fn();
      
      listener.addListener(callback);
      
      // 模拟系统主题变化
      const changeEvent = {
        matches: true,
        media: '(prefers-color-scheme: dark)'
      } as MediaQueryListEvent;
      
      // 触发变化
      if (mockMediaQuery.addEventListener.mock.calls.length > 0) {
        const handler = mockMediaQuery.addEventListener.mock.calls[0][1];
        handler(changeEvent);
      }
      
      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0].theme).toBe('dark');
    });

    it('应该支持添加和移除多个监听器', () => {
      const mockMediaQuery = createMockMediaQuery(false);
      window.matchMedia = vi.fn(() => mockMediaQuery as any);
      
      const listener = SystemThemeListener.getInstance();
      
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();
      
      listener.addListener(callback1);
      listener.addListener(callback2);
      listener.addListener(callback3);
      
      expect(listener.getListenerCount()).toBe(3);
      
      listener.removeListener(callback2);
      
      expect(listener.getListenerCount()).toBe(2);
      
      const removed = listener.removeAllListeners();
      expect(removed).toBe(2);
      expect(listener.getListenerCount()).toBe(0);
    });

    it('应该在不支持matchMedia的环境中优雅降级', () => {
      // 模拟不支持matchMedia的环境
      const originalMatchMedia = window.matchMedia;
      (window as any).matchMedia = undefined;
      
      const listener = SystemThemeListener.getInstance();
      
      expect(listener.isSupported()).toBe(false);
      
      // 恢复
      window.matchMedia = originalMatchMedia;
    });

    it('应该正确处理监听器错误', () => {
      const mockMediaQuery = createMockMediaQuery(false);
      window.matchMedia = vi.fn(() => mockMediaQuery as any);
      
      const listener = SystemThemeListener.getInstance();
      
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = vi.fn();
      
      listener.addListener(errorCallback);
      listener.addListener(normalCallback);
      
      // 触发变化，不应该抛出错误
      const changeEvent = {
        matches: true,
        media: '(prefers-color-scheme: dark)'
      } as MediaQueryListEvent;
      
      expect(() => {
        if (mockMediaQuery.addEventListener.mock.calls.length > 0) {
          const handler = mockMediaQuery.addEventListener.mock.calls[0][1];
          handler(changeEvent);
        }
      }).not.toThrow();
      
      // 即使有错误，其他监听器也应该被调用
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('1.3.2 用户偏好管理', () => {
    it('应该保存和恢复用户主题偏好', () => {
      const manager = UserPreferenceManager.getInstance();
      
      manager.setSelectedTheme('cyberpunk');
      manager.setSyncMode('manual');
      
      // 创建新实例验证持久化
      UserPreferenceManager.resetInstance();
      const newManager = UserPreferenceManager.getInstance();
      
      expect(newManager.getSelectedTheme()).toBe('cyberpunk');
      expect(newManager.getSyncMode()).toBe('manual');
    });

    it('应该正确管理同步模式', () => {
      const manager = UserPreferenceManager.getInstance();
      
      // 默认应该是手动模式
      expect(manager.getSyncMode()).toBe('manual');
      
      manager.setSyncMode('auto');
      expect(manager.getSyncMode()).toBe('auto');
      
      manager.setSyncMode('manual');
      expect(manager.getSyncMode()).toBe('manual');
    });

    it('应该正确管理手动覆盖', () => {
      const manager = UserPreferenceManager.getInstance();
      
      manager.setSyncMode('auto');
      manager.setManualOverride('cyberpunk');
      
      expect(manager.getManualOverride()).toBe('cyberpunk');
      
      manager.clearManualOverride();
      expect(manager.getManualOverride()).toBeNull();
    });

    it('应该在自动模式下自动清除手动覆盖', () => {
      const manager = UserPreferenceManager.getInstance();
      
      manager.setManualOverride('cyberpunk');
      manager.setSyncMode('auto');
      
      // 切换到自动模式时应该清除手动覆盖
      expect(manager.getManualOverride()).toBeNull();
    });

    it('应该正确识别首次访问', () => {
      const manager = UserPreferenceManager.getInstance();
      
      expect(manager.isFirstVisit()).toBe(true);
      
      manager.markAsVisited();
      
      expect(manager.isFirstVisit()).toBe(false);
      
      // 创建新实例验证持久化
      UserPreferenceManager.resetInstance();
      const newManager = UserPreferenceManager.getInstance();
      
      expect(newManager.isFirstVisit()).toBe(false);
    });

    it('应该根据系统主题和偏好解析正确的主题', () => {
      const manager = UserPreferenceManager.getInstance();
      
      // 手动模式：返回用户选择的主题
      manager.setSyncMode('manual');
      manager.setSelectedTheme('cyberpunk');
      expect(manager.resolveTheme('dark')).toBe('cyberpunk');
      
      // 自动模式：根据系统主题选择
      manager.setSyncMode('auto');
      manager.clearManualOverride();
      expect(manager.resolveTheme('dark')).toBe('navy');
      expect(manager.resolveTheme('light')).toBe('light');
      
      // 自动模式但有手动覆盖：返回覆盖的主题
      manager.setManualOverride('cyberpunk');
      expect(manager.resolveTheme('dark')).toBe('cyberpunk');
    });

    it('应该正确导出和导入偏好', () => {
      const manager = UserPreferenceManager.getInstance();
      
      manager.setSelectedTheme('cyberpunk');
      manager.setSyncMode('auto');
      manager.setManualOverride('navy');
      
      const exported = manager.exportPreference();
      const parsed = JSON.parse(exported);
      
      expect(parsed.selectedTheme).toBe('cyberpunk');
      expect(parsed.syncMode).toBe('auto');
      expect(parsed.manualOverride).toBe('navy');
      
      // 导入到新实例
      UserPreferenceManager.resetInstance();
      const newManager = UserPreferenceManager.getInstance();
      
      newManager.importPreference(exported);
      
      expect(newManager.getSelectedTheme()).toBe('cyberpunk');
      expect(newManager.getSyncMode()).toBe('auto');
      expect(newManager.getManualOverride()).toBe('navy');
    });

    it('应该重置偏好为默认值', () => {
      const manager = UserPreferenceManager.getInstance();
      
      manager.setSelectedTheme('cyberpunk');
      manager.setSyncMode('auto');
      manager.setManualOverride('navy');
      
      manager.resetPreference();
      
      expect(manager.getSelectedTheme()).toBeNull();
      expect(manager.getSyncMode()).toBe('manual');
      expect(manager.getManualOverride()).toBeNull();
    });
  });

  describe('1.3.3 主题同步管理', () => {
    it('应该在首次访问时根据配置初始化', () => {
      const mockMediaQuery = createMockMediaQuery(true);
      window.matchMedia = vi.fn(() => mockMediaQuery as any);
      
      const syncManager = ThemeSyncManager.getInstance({
        followSystemOnFirstVisit: true
      });
      
      syncManager.initialize();
      
      expect(syncManager.getSyncMode()).toBe('auto');
      expect(syncManager.getSystemTheme()).toBe('dark');
    });

    it('应该正确处理手动模式下的主题设置', () => {
      const syncManager = ThemeSyncManager.getInstance();
      
      syncManager.initialize();
      syncManager.setSyncMode('manual');
      syncManager.setTheme('cyberpunk');
      
      const state = syncManager.getSyncState();
      
      expect(state.appTheme).toBe('cyberpunk');
      expect(state.syncMode).toBe('manual');
    });

    it('应该在自动模式下自动同步系统主题', () => {
      const mockMediaQuery = createMockMediaQuery(false);
      window.matchMedia = vi.fn(() => mockMediaQuery as any);
      
      const syncManager = ThemeSyncManager.getInstance();
      syncManager.initialize();
      syncManager.setSyncMode('auto');
      
      // 初始应该是浅色主题
      expect(syncManager.getAppTheme()).toBe('light');
      
      // 模拟系统主题变化
      const changeEvent = {
        matches: true,
        media: '(prefers-color-scheme: dark)'
      } as MediaQueryListEvent;
      
      if (mockMediaQuery.addEventListener.mock.calls.length > 0) {
        const handler = mockMediaQuery.addEventListener.mock.calls[0][1];
        handler(changeEvent);
      }
      
      // 应该自动切换到深色主题
      expect(syncManager.getAppTheme()).toBe('navy');
    });

    it('应该正确处理自动模式下的手动覆盖', () => {
      const mockMediaQuery = createMockMediaQuery(true);
      window.matchMedia = vi.fn(() => mockMediaQuery as any);
      
      const syncManager = ThemeSyncManager.getInstance();
      syncManager.initialize();
      syncManager.setSyncMode('auto');
      
      // 系统是深色，应该使用navy
      expect(syncManager.getAppTheme()).toBe('navy');
      
      // 手动覆盖
      syncManager.setTheme('cyberpunk');
      
      const state = syncManager.getSyncState();
      expect(state.appTheme).toBe('cyberpunk');
      expect(state.hasManualOverride).toBe(true);
      
      // 清除覆盖
      syncManager.clearManualOverride();
      
      const newState = syncManager.getSyncState();
      expect(newState.appTheme).toBe('navy');
      expect(newState.hasManualOverride).toBe(false);
    });

    it('应该正确切换同步模式', () => {
      const syncManager = ThemeSyncManager.getInstance();
      syncManager.initialize();
      
      syncManager.setSyncMode('manual');
      expect(syncManager.getSyncMode()).toBe('manual');
      
      syncManager.setSyncMode('auto');
      expect(syncManager.getSyncMode()).toBe('auto');
      
      // 测试toggle
      const newMode = syncManager.toggleSyncMode();
      expect(newMode).toBe('manual');
      expect(syncManager.getSyncMode()).toBe('manual');
    });

    it('应该正确恢复用户偏好', () => {
      // 先设置用户偏好
      const prefManager = UserPreferenceManager.getInstance();
      prefManager.setSyncMode('manual');
      prefManager.setSelectedTheme('cyberpunk');
      
      // 创建新的同步管理器
      ThemeSyncManager.resetInstance();
      const syncManager = ThemeSyncManager.getInstance();
      syncManager.initialize();
      
      const state = syncManager.getSyncState();
      
      expect(state.syncMode).toBe('manual');
      expect(state.appTheme).toBe('cyberpunk');
    });

    it('应该正确获取同步状态', () => {
      const mockMediaQuery = createMockMediaQuery(true);
      window.matchMedia = vi.fn(() => mockMediaQuery as any);
      
      const syncManager = ThemeSyncManager.getInstance();
      syncManager.initialize();
      syncManager.setSyncMode('auto');
      
      const state = syncManager.getSyncState();
      
      expect(state.systemTheme).toBe('dark');
      expect(state.syncMode).toBe('auto');
      expect(state.systemThemeSupported).toBe(true);
      expect(typeof state.hasManualOverride).toBe('boolean');
    });

    it('应该正确重置同步管理器', () => {
      const mockMediaQuery = createMockMediaQuery(true);
      window.matchMedia = vi.fn(() => mockMediaQuery as any);
      
      const syncManager = ThemeSyncManager.getInstance({
        followSystemOnFirstVisit: true
      });
      syncManager.initialize();
      
      syncManager.setSyncMode('manual');
      syncManager.setTheme('cyberpunk');
      
      // 确认设置生效
      expect(syncManager.getSyncMode()).toBe('manual');
      
      syncManager.reset();
      
      const state = syncManager.getSyncState();
      // 重置后应该恢复到自动模式（因为配置了followSystemOnFirstVisit且系统主题支持）
      expect(state.syncMode).toBe('auto');
    });

    it('应该正确更新配置', () => {
      const syncManager = ThemeSyncManager.getInstance();
      
      const newConfig = {
        enableAutoSync: false,
        followSystemOnFirstVisit: false,
        fallbackTheme: 'light' as const,
        showManualOverrideHint: true
      };
      
      syncManager.updateConfig(newConfig);
      
      const config = syncManager.getConfig();
      
      expect(config.enableAutoSync).toBe(false);
      expect(config.followSystemOnFirstVisit).toBe(false);
      expect(config.fallbackTheme).toBe('light');
      expect(config.showManualOverrideHint).toBe(true);
    });
  });

  describe('1.3.4 集成测试', () => {
    it('应该完整执行系统主题同步流程', () => {
      const mockMediaQuery = createMockMediaQuery(false);
      window.matchMedia = vi.fn(() => mockMediaQuery as any);
      
      // 1. 初始化
      const syncManager = ThemeSyncManager.getInstance({
        followSystemOnFirstVisit: true
      });
      syncManager.initialize();
      
      // 2. 验证初始状态（自动模式，浅色主题）
      expect(syncManager.getSyncMode()).toBe('auto');
      expect(syncManager.getAppTheme()).toBe('light');
      
      // 3. 切换到手动模式并设置主题
      syncManager.setSyncMode('manual');
      syncManager.setTheme('cyberpunk');
      
      expect(syncManager.getAppTheme()).toBe('cyberpunk');
      
      // 4. 切换回自动模式
      syncManager.setSyncMode('auto');
      expect(syncManager.getAppTheme()).toBe('light');
      
      // 5. 模拟系统主题变化
      const changeEvent = {
        matches: true,
        media: '(prefers-color-scheme: dark)'
      } as MediaQueryListEvent;
      
      if (mockMediaQuery.addEventListener.mock.calls.length > 0) {
        const handler = mockMediaQuery.addEventListener.mock.calls[0][1];
        handler(changeEvent);
      }
      
      // 6. 验证自动同步
      expect(syncManager.getAppTheme()).toBe('navy');
    });

    it('应该正确处理用户偏好的持久化和恢复', () => {
      const mockMediaQuery = createMockMediaQuery(true);
      window.matchMedia = vi.fn(() => mockMediaQuery as any);
      
      // 1. 设置用户偏好
      const syncManager = ThemeSyncManager.getInstance();
      syncManager.initialize();
      syncManager.setSyncMode('manual');
      syncManager.setTheme('cyberpunk');
      
      // 2. 销毁并重新创建实例
      ThemeSyncManager.resetInstance();
      const newSyncManager = ThemeSyncManager.getInstance();
      newSyncManager.initialize();
      
      // 3. 验证偏好恢复
      expect(newSyncManager.getSyncMode()).toBe('manual');
      expect(newSyncManager.getAppTheme()).toBe('cyberpunk');
    });

    it('应该在不支持系统主题的环境中正常工作', () => {
      // 模拟不支持matchMedia的环境
      const originalMatchMedia = window.matchMedia;
      (window as any).matchMedia = undefined;
      
      const syncManager = ThemeSyncManager.getInstance({
        followSystemOnFirstVisit: true,
        fallbackTheme: 'navy'
      });
      syncManager.initialize();
      
      // 应该使用fallback主题
      expect(syncManager.isSystemThemeSupported()).toBe(false);
      expect(syncManager.getAppTheme()).toBe('navy');
      
      // 恢复
      window.matchMedia = originalMatchMedia;
    });
  });

  describe('边界情况测试', () => {
    it('应该处理重复设置相同主题', () => {
      const syncManager = ThemeSyncManager.getInstance();
      syncManager.initialize();
      
      syncManager.setTheme('cyberpunk');
      syncManager.setTheme('cyberpunk');
      
      expect(syncManager.getAppTheme()).toBe('cyberpunk');
    });

    it('应该处理重复设置相同同步模式', () => {
      const syncManager = ThemeSyncManager.getInstance();
      syncManager.initialize();
      
      syncManager.setSyncMode('auto');
      syncManager.setSyncMode('auto');
      
      expect(syncManager.getSyncMode()).toBe('auto');
    });

    it('应该处理无效的偏好导入数据', () => {
      const manager = UserPreferenceManager.getInstance();
      
      const result = manager.importPreference('invalid json');
      expect(result).toBe(false);
      
      const result2 = manager.importPreference(JSON.stringify({ invalid: 'data' }));
      expect(result2).toBe(false);
    });

    it('应该处理localStorage不可用的情况', () => {
      // 模拟localStorage不可用
      const originalLocalStorage = global.localStorage;
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true
      });
      
      const manager = UserPreferenceManager.getInstance();
      
      // 应该使用默认值
      manager.setSelectedTheme('cyberpunk');
      expect(manager.getSelectedTheme()).toBe('cyberpunk');
      
      // 恢复
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      });
    });

    it('应该正确清理资源', () => {
      const mockMediaQuery = createMockMediaQuery(false);
      window.matchMedia = vi.fn(() => mockMediaQuery as any);
      
      const listener = SystemThemeListener.getInstance();
      
      listener.addListener(() => {});
      listener.addListener(() => {});
      
      expect(listener.getListenerCount()).toBe(2);
      
      listener.destroy();
      
      expect(listener.getListenerCount()).toBe(0);
      expect(listener.isInitialized()).toBe(false);
    });
  });
});
