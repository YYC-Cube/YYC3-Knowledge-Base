/**
 * @file: SystemThemeListener.ts
 * @description: 系统主题监听器，检测操作系统深色/浅色模式变化
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: theme,system,dark-mode,light-mode,media-query
 */

// ================================================================
// SystemThemeListener — 系统主题监听器
// 提供：
//   - 系统深色/浅色模式检测
//   - 实时监听系统主题变化
//   - 多监听器支持
//   - 自动资源清理
// ================================================================

import { logger } from '../services/Logger';

export type SystemTheme = 'dark' | 'light';

export interface SystemThemeChangeEvent {
  theme: SystemTheme;
  timestamp: number;
}

export type SystemThemeCallback = (event: SystemThemeChangeEvent) => void;

/**
 * SystemThemeListener - 系统主题监听器
 * 单例模式，监听操作系统主题变化
 */
export class SystemThemeListener {
  private static instance: SystemThemeListener;

  // Media Query对象
  private mediaQuery: MediaQueryList | null = null;

  // 监听器集合
  private listeners: Set<SystemThemeCallback> = new Set();

  // 当前系统主题
  private currentTheme: SystemTheme = 'light';

  // 是否已初始化
  private initialized: boolean = false;

  // 是否支持系统主题检测
  private supported: boolean = false;

  private constructor() {
    this.initialize();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): SystemThemeListener {
    if (!SystemThemeListener.instance) {
      SystemThemeListener.instance = new SystemThemeListener();
    }
    return SystemThemeListener.instance;
  }

  /**
   * 初始化监听器
   */
  private initialize(): void {
    // 检查浏览器环境
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      logger.warn('[SystemThemeListener] window.matchMedia not available, system theme detection disabled');
      this.supported = false;
      return;
    }

    try {
      // 创建Media Query
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.supported = true;

      // 获取初始主题
      this.currentTheme = this.mediaQuery.matches ? 'dark' : 'light';

      // 添加监听器
      if (this.mediaQuery.addEventListener) {
        this.mediaQuery.addEventListener('change', this.handleChange);
      } else if ('addListener' in this.mediaQuery) {
        // 兼容旧版浏览器
        (this.mediaQuery as MediaQueryList & { addListener: (callback: (e: MediaQueryListEvent) => void) => void })
          .addListener(this.handleChange);
      }

      this.initialized = true;
    } catch (error) {
      logger.error('[SystemThemeListener] Failed to initialize:', error);
      this.supported = false;
    }
  }

  /**
   * 处理系统主题变化
   */
  private handleChange = (e: MediaQueryListEvent | MediaQueryList): void => {
    const newTheme: SystemTheme = e.matches ? 'dark' : 'light';
    const oldTheme = this.currentTheme;

    // 只有主题真正变化时才通知
    if (newTheme !== oldTheme) {
      this.currentTheme = newTheme;
      this.notifyListeners(newTheme);
    }
  };

  /**
   * 通知所有监听器
   */
  private notifyListeners(theme: SystemTheme): void {
    const event: SystemThemeChangeEvent = {
      theme,
      timestamp: Date.now()
    };

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.error('[SystemThemeListener] Listener error:', error);
      }
    });
  }

  /**
   * 获取当前系统主题
   */
  public getSystemTheme(): SystemTheme {
    // 如果不支持，返回当前缓存的主题
    if (!this.supported || !this.mediaQuery) {
      return this.currentTheme;
    }

    // 实时查询当前主题
    return this.mediaQuery.matches ? 'dark' : 'light';
  }

  /**
   * 检查是否支持系统主题检测
   */
  public isSupported(): boolean {
    return this.supported;
  }

  /**
   * 检查是否已初始化
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 添加系统主题变化监听器
   */
  public addListener(callback: SystemThemeCallback): () => void {
    this.listeners.add(callback);

    // 返回取消监听函数
    return () => this.removeListener(callback);
  }

  /**
   * 移除系统主题变化监听器
   */
  public removeListener(callback: SystemThemeCallback): boolean {
    return this.listeners.delete(callback);
  }

  /**
   * 移除所有监听器
   */
  public removeAllListeners(): number {
    const count = this.listeners.size;
    this.listeners.clear();
    return count;
  }

  /**
   * 获取监听器数量
   */
  public getListenerCount(): number {
    return this.listeners.size;
  }

  /**
   * 手动触发主题检查（用于测试或强制同步）
   */
  public checkTheme(): SystemTheme {
    const theme = this.getSystemTheme();

    if (theme !== this.currentTheme) {
      this.currentTheme = theme;
      this.notifyListeners(theme);
    }

    return theme;
  }

  /**
   * 销毁监听器（清理资源）
   */
  public destroy(): void {
    if (this.mediaQuery) {
      if (this.mediaQuery.removeEventListener) {
        this.mediaQuery.removeEventListener('change', this.handleChange);
      } else if ('removeListener' in this.mediaQuery) {
        (this.mediaQuery as MediaQueryList & { removeListener: (callback: (e: MediaQueryListEvent) => void) => void })
          .removeListener(this.handleChange);
      }
    }

    this.listeners.clear();
    this.mediaQuery = null;
    this.initialized = false;
    this.supported = false;
  }

  /**
   * 重置实例（用于测试）
   */
  public static resetInstance(): void {
    if (SystemThemeListener.instance) {
      SystemThemeListener.instance.destroy();
      SystemThemeListener.instance = undefined as any;
    }
  }
}

// 导出便捷实例
export const systemThemeListener = SystemThemeListener.getInstance();
