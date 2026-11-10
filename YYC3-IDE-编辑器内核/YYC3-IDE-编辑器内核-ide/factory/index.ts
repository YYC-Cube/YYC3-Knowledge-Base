/**
 * @file: factory/index.ts
 * @description: 组件工厂 — 整合 DI 和配置系统，提供统一的组件创建入口
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-01
 * @updated: 2026-04-01
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: factory,di,config,bootstrap
 */

// ================================================================
// 组件工厂 — 整合 DI 和配置系统
// ================================================================
// 设计原则：
// 1. 统一的组件创建入口
// 2. 自动注入依赖和配置
// 3. 支持自定义实现替换
// 4. 零第三方依赖
// ================================================================

import { DIContainer, Lifecycle, ServiceToken, TOKENS } from '../di';
import { ConfigManager, createYYC3ConfigManager, DEFAULT_CONFIG, type YYC3AppConfig } from '../config';
import type {
  IStorageAdapter,
  ISnapshotManager,
  IThemeManager,
  IPreviewController,
  ICodeValidator,
  IEventBus,
  ILogger,
  IConfigProvider,
  IDisposable,
  ISubscription,
  ILogEntry,
} from '../interfaces';

// ── 简单实现 ──

/**
 * 简单事件总线实现
 */
class SimpleEventBus implements IEventBus {
  private listeners: Map<string, Set<(event: unknown) => void>> = new Map();
  private isDisposed = false;

  publish<T>(eventType: string, event: T): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch {
          /* ignore */
        }
      });
    }
  }

  subscribe<T>(eventType: string, handler: (event: T) => void): ISubscription {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler as (event: unknown) => void);

    return {
      isActive: true,
      dispose: () => {
        this.listeners.get(eventType)?.delete(handler as (event: unknown) => void);
      },
      unsubscribe: () => {
        this.listeners.get(eventType)?.delete(handler as (event: unknown) => void);
      },
    };
  }

  once<T>(eventType: string, handler: (event: T) => void): ISubscription {
    const subscription = this.subscribe<T>(eventType, (event) => {
      subscription.dispose();
      handler(event);
    });
    return subscription;
  }

  get eventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }

  getListenerCount(eventType: string): number {
    return this.listeners.get(eventType)?.size || 0;
  }

  dispose(): void {
    this.isDisposed = true;
    this.listeners.clear();
  }
}

/**
 * 简单日志器实现
 */
class SimpleLogger implements ILogger {
  private level: 'debug' | 'info' | 'warn' | 'error' = 'info';
  private prefix: string;
  private listeners: Set<(entry: unknown) => void> = new Set();

  constructor(prefix: string = '[YYC3]') {
    this.prefix = prefix;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      this.log('info', message, context);
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      this.log('warn', message, context);
    }
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      this.log('error', message, { ...context, error: error?.message });
    }
  }

  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.level = level;
  }

  getLevel(): 'debug' | 'info' | 'warn' | 'error' {
    return this.level;
  }

  onLog(callback: (entry: ILogEntry) => void): ISubscription {
    this.listeners.add(callback as (entry: unknown) => void);
    return {
      isActive: true,
      dispose: () => this.listeners.delete(callback as (entry: unknown) => void),
      unsubscribe: () => this.listeners.delete(callback as (entry: unknown) => void),
    };
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.level];
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>): void {
    const entry = {
      level,
      message: `${this.prefix} ${message}`,
      timestamp: Date.now(),
      context,
    };

    const consoleMethod = level === 'debug' ? 'log' : level;
    console[consoleMethod](entry.message, context || '');

    this.listeners.forEach((callback) => {
      try {
        callback(entry);
      } catch {
        /* ignore */
      }
    });
  }
}

// ── 应用上下文 ──

/**
 * 应用上下文
 */
export interface AppContext {
  container: DIContainer;
  config: ConfigManager;
  logger: ILogger;
  eventBus: IEventBus;
}

/**
 * 应用选项
 */
export interface AppOptions {
  config?: Partial<YYC3AppConfig>;
  configSource?: 'memory' | 'localStorage';
  customImplementations?: {
    storage?: IStorageAdapter;
    snapshotManager?: ISnapshotManager;
    themeManager?: IThemeManager;
    previewController?: IPreviewController;
    codeValidator?: ICodeValidator;
    eventBus?: IEventBus;
    logger?: ILogger;
  };
}

// ── 应用工厂 ──

/**
 * 应用工厂
 */
export class AppFactory {
  private container: DIContainer;
  private config: ConfigManager;
  private logger: ILogger;
  private eventBus: IEventBus;
  private isInitialized = false;

  constructor(options: AppOptions = {}) {
    this.container = new DIContainer();
    this.config = createYYC3ConfigManager({
      source: options.configSource || 'localStorage',
    });

    if (options.config) {
      for (const [key, value] of Object.entries(options.config)) {
        this.config.set(key, value);
      }
    }

    this.logger = options.customImplementations?.logger ||
      new SimpleLogger(this.config.getNested('logger.prefix', DEFAULT_CONFIG.logger.prefix));

    this.eventBus = options.customImplementations?.eventBus || new SimpleEventBus();

    this.registerCoreServices(options);
  }

  /**
   * 初始化应用
   */
  async initialize(): Promise<AppContext> {
    if (this.isInitialized) {
      return this.getContext();
    }

    await this.config.load();
    this.isInitialized = true;

    this.logger.info('Application initialized');

    return this.getContext();
  }

  /**
   * 获取上下文
   */
  getContext(): AppContext {
    return {
      container: this.container,
      config: this.config,
      logger: this.logger,
      eventBus: this.eventBus,
    };
  }

  /**
   * 获取服务
   */
  getService<T>(token: string | ServiceToken<T>): T {
    return this.container.resolve<T>(token);
  }

  /**
   * 注册服务
   */
  registerService<T>(
    token: string | ServiceToken<T>,
    factory: (context: AppContext) => T,
    lifecycle: Lifecycle = Lifecycle.Singleton
  ): void {
    this.container.register(
      token,
      {
        create: () => factory(this.getContext()),
      },
      lifecycle
    );
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.container.dispose();
    this.config.dispose();
    this.isInitialized = false;
  }

  /**
   * 注册核心服务
   */
  private registerCoreServices(options: AppOptions): void {
    const custom = options.customImplementations || {};

    this.container.registerSingleton(TOKENS.Logger, this.logger);
    this.container.registerSingleton(TOKENS.EventBus, this.eventBus);
    this.container.registerSingleton(TOKENS.Config, this.config as unknown as IConfigProvider);

    if (custom.storage) {
      this.container.registerSingleton(TOKENS.Storage, custom.storage);
    }

    if (custom.snapshotManager) {
      this.container.registerSingleton(TOKENS.SnapshotManager, custom.snapshotManager);
    }

    if (custom.themeManager) {
      this.container.registerSingleton(TOKENS.ThemeManager, custom.themeManager);
    }

    if (custom.previewController) {
      this.container.registerSingleton(TOKENS.PreviewController, custom.previewController);
    }

    if (custom.codeValidator) {
      this.container.registerSingleton(TOKENS.CodeValidator, custom.codeValidator);
    }
  }
}

// ── 全局实例 ──

let globalAppFactory: AppFactory | null = null;

/**
 * 获取全局应用工厂
 */
export function getAppFactory(options?: AppOptions): AppFactory {
  if (!globalAppFactory) {
    globalAppFactory = new AppFactory(options);
  }
  return globalAppFactory;
}

/**
 * 初始化应用
 */
export async function initializeApp(options?: AppOptions): Promise<AppContext> {
  return getAppFactory(options).initialize();
}

/**
 * 获取服务
 */
export function getService<T>(token: string | ServiceToken<T>): T {
  return getAppFactory().getService<T>(token);
}

/**
 * 重置应用
 */
export function resetApp(): void {
  if (globalAppFactory) {
    globalAppFactory.dispose();
    globalAppFactory = null;
  }
}

// ── 组件创建器 ──

/**
 * 创建存储适配器
 */
export function createStorageAdapter(
  config: YYC3AppConfig['storage']
): IStorageAdapter {
  return {
    name: config.dbName,
    isReady: true,
    async init() {},
    async saveFile(path: string, content: string) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`file:${path}`, content);
      }
    },
    async loadFile(path: string) {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(`file:${path}`);
      }
      return null;
    },
    async deleteFile(path: string) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`file:${path}`);
      }
    },
    async exists(path: string) {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(`file:${path}`) !== null;
      }
      return false;
    },
    async listFiles(pattern?: string) {
      if (typeof localStorage === 'undefined') return [];
      const files: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('file:')) {
          const path = key.slice(5);
          if (!pattern || path.includes(pattern)) {
            files.push(path);
          }
        }
      }
      return files;
    },
    async saveObject<T>(key: string, value: T) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`obj:${key}`, JSON.stringify(value));
      }
    },
    async loadObject<T>(key: string) {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(`obj:${key}`);
        return data ? JSON.parse(data) : null;
      }
      return null;
    },
    async deleteObject(key: string) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`obj:${key}`);
      }
    },
    async clear() {
      if (typeof localStorage !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('file:') || key?.startsWith('obj:')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      }
    },
    async getStorageSize() {
      if (typeof localStorage === 'undefined') return 0;
      let size = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('file:') || key?.startsWith('obj:')) {
          const value = localStorage.getItem(key);
          size += (key.length + (value?.length || 0)) * 2;
        }
      }
      return size;
    },
    async dispose() {},
  };
}

/**
 * 创建快照管理器
 */
export function createSnapshotManager(
  config: YYC3AppConfig['snapshot'],
  storage?: IStorageAdapter
): ISnapshotManager {
  const snapshots: Map<string, unknown> = new Map();
  const listeners: { created: Set<(s: unknown) => void>; deleted: Set<(id: string) => void> } = {
    created: new Set(),
    deleted: new Set(),
  };

  return {
    snapshotCount: 0,
    maxSnapshots: config.maxSnapshots,

    createSnapshot(label: string, files: unknown[], description?: string) {
      const id = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const snapshot = {
        id,
        label,
        description,
        createdAt: Date.now(),
        fileCount: files.length,
        totalSize: 0,
        files,
      };
      snapshots.set(id, snapshot);
      listeners.created.forEach((cb) => cb(snapshot));
      return snapshot as unknown as ISnapshotManager extends { createSnapshot(...args: infer A): infer R } ? R : never;
    },

    getSnapshot(id: string) {
      return snapshots.get(id) as unknown as ISnapshotManager extends { getSnapshot(id: string): infer R } ? R : never;
    },

    listSnapshots() {
      return Array.from(snapshots.values()).map((s: any) => ({
        id: s.id,
        label: s.label,
        description: s.description,
        createdAt: s.createdAt,
        fileCount: s.fileCount,
        totalSize: s.totalSize,
      }));
    },

    deleteSnapshot(id: string) {
      const result = snapshots.delete(id);
      if (result) {
        listeners.deleted.forEach((cb) => cb(id));
      }
      return result;
    },

    restoreSnapshot(id: string, callback: (files: unknown[]) => void) {
      const snapshot = snapshots.get(id);
      if (snapshot) {
        callback((snapshot as any).files);
        return true;
      }
      return false;
    },

    compareSnapshots(id1: string, id2: string) {
      return { added: [], removed: [], modified: [], unchanged: [] };
    },

    onSnapshotCreated(callback: (snapshot: unknown) => void) {
      listeners.created.add(callback);
      return {
        isActive: true,
        dispose: () => listeners.created.delete(callback),
        unsubscribe: () => listeners.created.delete(callback),
      };
    },

    onSnapshotDeleted(callback: (id: string) => void) {
      listeners.deleted.add(callback);
      return {
        isActive: true,
        dispose: () => listeners.deleted.delete(callback),
        unsubscribe: () => listeners.deleted.delete(callback),
      };
    },

    dispose() {
      snapshots.clear();
      listeners.created.clear();
      listeners.deleted.clear();
    },
  } as unknown as ISnapshotManager;
}

/**
 * 创建主题管理器
 */
export function createThemeManager(
  config: YYC3AppConfig['theme']
): IThemeManager {
  const themes: Map<string, unknown> = new Map();
  const listeners: Set<(theme: unknown) => void> = new Set();
  let currentTheme: unknown = {
    id: config.defaultThemeId,
    name: config.defaultThemeId,
    mode: config.defaultThemeId === 'dark' ? 'dark' : 'light',
    tokens: {
      colors: {},
      fonts: {},
      spacing: {},
      radii: {},
      shadows: {},
    },
  };

  return {
    get currentTheme() {
      return currentTheme as unknown as IThemeManager extends { currentTheme: infer R } ? R : never;
    },
    get availableThemes() {
      return Array.from(themes.values()) as unknown as IThemeManager extends { availableThemes: infer R } ? R : never;
    },

    setTheme(themeId: string) {
      const theme = themes.get(themeId);
      if (theme) {
        currentTheme = theme;
        listeners.forEach((cb) => cb(theme));
      }
    },

    getTheme(themeId: string) {
      return themes.get(themeId) as unknown as IThemeManager extends { getTheme(id: string): infer R } ? R : never;
    },

    registerTheme(theme: unknown) {
      themes.set((theme as any).id, theme);
    },

    unregisterTheme(themeId: string) {
      return themes.delete(themeId);
    },

    getTokenValue(tokenPath: string) {
      return undefined;
    },

    resolveToken(token: string) {
      return token;
    },

    onThemeChange(callback: (theme: unknown) => void) {
      listeners.add(callback);
      return {
        isActive: true,
        dispose: () => listeners.delete(callback),
        unsubscribe: () => listeners.delete(callback),
      };
    },

    dispose() {
      themes.clear();
      listeners.clear();
    },
  } as unknown as IThemeManager;
}
