/**
 * @file: config/index.ts
 * @description: 配置外部化系统 — 支持多配置源、类型安全、变更通知
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-01
 * @updated: 2026-04-01
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: config,settings,externalization
 */

// ================================================================
// 配置外部化系统 — 零第三方依赖
// ================================================================
// 设计原则：
// 1. 支持多种配置源（内存、localStorage、文件、远程）
// 2. 类型安全的配置访问
// 3. 配置变更通知
// 4. 配置验证和默认值
// 5. 配置持久化
// ================================================================

import type {
  IConfigProvider,
  ISubscription,
  IDisposable,
  ConfigSource,
  ConfigOptions,
} from '../interfaces';

// ── 配置变更事件 ──

/**
 * 配置变更事件
 */
export interface ConfigChangeEvent<T = unknown> {
  key: string;
  oldValue: T | undefined;
  newValue: T | undefined;
  source: ConfigSource;
  timestamp: number;
}

// ── 配置验证器 ──

/**
 * 配置验证器
 */
export type ConfigValidator<T> = (value: unknown) => value is T;

/**
 * 配置模式
 */
export interface ConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
    default?: unknown;
    validator?: ConfigValidator<unknown>;
    description?: string;
  };
}

// ── 内存配置提供者 ──

/**
 * 内存配置提供者
 */
export class MemoryConfigProvider implements IConfigProvider, IDisposable {
  private config: Map<string, unknown> = new Map();
  private listeners: Set<(key: string, value: unknown) => void> = new Set();
  private isDisposed = false;

  constructor(initialConfig?: Record<string, unknown>) {
    if (initialConfig) {
      for (const [key, value] of Object.entries(initialConfig)) {
        this.config.set(key, value);
      }
    }
  }

  get<T>(key: string, defaultValue?: T): T {
    this.ensureNotDisposed();
    if (this.config.has(key)) {
      return this.config.get(key) as T;
    }
    return defaultValue as T;
  }

  set<T>(key: string, value: T): void {
    this.ensureNotDisposed();
    const _oldValue = this.config.get(key);
    this.config.set(key, value);
    this.notifyChange(key, value);
  }

  has(key: string): boolean {
    this.ensureNotDisposed();
    return this.config.has(key);
  }

  delete(key: string): boolean {
    this.ensureNotDisposed();
    const result = this.config.delete(key);
    if (result) {
      this.notifyChange(key, undefined);
    }
    return result;
  }

  async load(): Promise<void> {
    this.ensureNotDisposed();
  }

  async save(): Promise<void> {
    this.ensureNotDisposed();
  }

  onChange(callback: (key: string, value: unknown) => void): ISubscription {
    this.ensureNotDisposed();
    this.listeners.add(callback);
    return {
      isActive: true,
      dispose: () => {
        this.listeners.delete(callback);
      },
      unsubscribe: () => {
        this.listeners.delete(callback);
      },
    };
  }

  dispose(): void {
    this.isDisposed = true;
    this.config.clear();
    this.listeners.clear();
  }

  private notifyChange(key: string, value: unknown): void {
    this.listeners.forEach((callback) => {
      try {
        callback(key, value);
      } catch {
        /* ignore */
      }
    });
  }

  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('ConfigProvider has been disposed');
    }
  }
}

// ── LocalStorage 配置提供者 ──

/**
 * LocalStorage 配置提供者
 */
export class LocalStorageConfigProvider implements IConfigProvider, IDisposable {
  private prefix: string;
  private autoSave: boolean;
  private cache: Map<string, unknown> = new Map();
  private listeners: Set<(key: string, value: unknown) => void> = new Set();
  private isDisposed = false;
  private storageListener: ((event: StorageEvent) => void) | null = null;

  constructor(options: ConfigOptions = { source: 'localStorage' }) {
    this.prefix = options.prefix || 'yyc3_';
    this.autoSave = options.autoSave ?? true;
    this.loadFromStorage();

    if (typeof window !== 'undefined') {
      this.storageListener = (event: StorageEvent) => {
        if (event.key?.startsWith(this.prefix)) {
          const key = event.key.slice(this.prefix.length);
          const newValue = event.newValue ? JSON.parse(event.newValue) : undefined;
          this.cache.set(key, newValue);
          this.notifyChange(key, newValue);
        }
      };
      window.addEventListener('storage', this.storageListener);
    }
  }

  get<T>(key: string, defaultValue?: T): T {
    this.ensureNotDisposed();
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }
    return defaultValue as T;
  }

  set<T>(key: string, value: T): void {
    this.ensureNotDisposed();
    this.cache.set(key, value);
    if (this.autoSave) {
      this.saveToStorage(key, value);
    }
    this.notifyChange(key, value);
  }

  has(key: string): boolean {
    this.ensureNotDisposed();
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    this.ensureNotDisposed();
    const result = this.cache.delete(key);
    if (result && this.autoSave) {
      this.deleteFromStorage(key);
    }
    if (result) {
      this.notifyChange(key, undefined);
    }
    return result;
  }

  async load(): Promise<void> {
    this.ensureNotDisposed();
    this.loadFromStorage();
  }

  async save(): Promise<void> {
    this.ensureNotDisposed();
    this.saveAllToStorage();
  }

  onChange(callback: (key: string, value: unknown) => void): ISubscription {
    this.ensureNotDisposed();
    this.listeners.add(callback);
    return {
      isActive: true,
      dispose: () => {
        this.listeners.delete(callback);
      },
      unsubscribe: () => {
        this.listeners.delete(callback);
      },
    };
  }

  dispose(): void {
    this.isDisposed = true;
    this.cache.clear();
    this.listeners.clear();
    if (this.storageListener && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageListener);
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        const configKey = key.slice(this.prefix.length);
        try {
          const value = JSON.parse(localStorage.getItem(key) || 'null');
          if (value !== null) {
            this.cache.set(configKey, value);
          }
        } catch {
          /* ignore parse errors */
        }
      }
    }
  }

  private saveToStorage(key: string, value: unknown): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch {
      /* ignore storage errors */
    }
  }

  private deleteFromStorage(key: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.prefix + key);
  }

  private saveAllToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    Array.from(this.cache.entries()).forEach(([key, value]) => {
      this.saveToStorage(key, value);
    });
  }

  private notifyChange(key: string, value: unknown): void {
    this.listeners.forEach((callback) => {
      try {
        callback(key, value);
      } catch {
        /* ignore */
      }
    });
  }

  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('ConfigProvider has been disposed');
    }
  }
}

// ── 组合配置提供者 ──

/**
 * 组合配置提供者 — 支持多配置源优先级
 */
export class CompositeConfigProvider implements IConfigProvider, IDisposable {
  private providers: IConfigProvider[];
  private listeners: Set<(key: string, value: unknown) => void> = new Set();
  private isDisposed = false;

  constructor(providers: IConfigProvider[]) {
    this.providers = providers;
    this.setupListeners();
  }

  get<T>(key: string, defaultValue?: T): T {
    this.ensureNotDisposed();
    for (const provider of this.providers) {
      if (provider.has(key)) {
        return provider.get<T>(key);
      }
    }
    return defaultValue as T;
  }

  set<T>(key: string, value: T): void {
    this.ensureNotDisposed();
    if (this.providers.length > 0) {
      this.providers[0].set(key, value);
    }
  }

  has(key: string): boolean {
    this.ensureNotDisposed();
    return this.providers.some((p) => p.has(key));
  }

  delete(key: string): boolean {
    this.ensureNotDisposed();
    let deleted = false;
    for (const provider of this.providers) {
      if (provider.delete(key)) {
        deleted = true;
      }
    }
    return deleted;
  }

  async load(): Promise<void> {
    this.ensureNotDisposed();
    await Promise.all(this.providers.map((p) => p.load()));
  }

  async save(): Promise<void> {
    this.ensureNotDisposed();
    await Promise.all(this.providers.map((p) => p.save()));
  }

  onChange(callback: (key: string, value: unknown) => void): ISubscription {
    this.ensureNotDisposed();
    this.listeners.add(callback);
    return {
      isActive: true,
      dispose: () => {
        this.listeners.delete(callback);
      },
      unsubscribe: () => {
        this.listeners.delete(callback);
      },
    };
  }

  dispose(): void {
    this.isDisposed = true;
    this.providers.forEach((p) => {
      if ('dispose' in p) {
        (p as IDisposable).dispose();
      }
    });
    this.listeners.clear();
  }

  private setupListeners(): void {
    this.providers.forEach((provider) => {
      provider.onChange((key, value) => {
        this.notifyChange(key, value);
      });
    });
  }

  private notifyChange(key: string, value: unknown): void {
    this.listeners.forEach((callback) => {
      try {
        callback(key, value);
      } catch {
        /* ignore */
      }
    });
  }

  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('ConfigProvider has been disposed');
    }
  }
}

// ── YYC3 应用配置 ──

/**
 * YYC3 应用配置接口
 */
export interface YYC3AppConfig {
  storage: {
    dbName: string;
    dbVersion: number;
    maxStorageSize: number;
  };
  snapshot: {
    maxSnapshots: number;
    autoSnapshot: boolean;
    autoSnapshotInterval: number;
  };
  theme: {
    defaultThemeId: string;
    persistTheme: boolean;
    storageKey: string;
  };
  preview: {
    defaultMode: 'realtime' | 'delayed' | 'manual';
    delayMs: number;
  };
  logger: {
    level: 'debug' | 'info' | 'warn' | 'error';
    prefix: string;
  };
  plugins: {
    autoLoad: boolean;
    allowedPermissions: string[];
  };
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: YYC3AppConfig = {
  storage: {
    dbName: 'yyc3-filestore',
    dbVersion: 1,
    maxStorageSize: 50 * 1024 * 1024,
  },
  snapshot: {
    maxSnapshots: 50,
    autoSnapshot: false,
    autoSnapshotInterval: 5 * 60 * 1000,
  },
  theme: {
    defaultThemeId: 'light',
    persistTheme: true,
    storageKey: 'yyc3_theme',
  },
  preview: {
    defaultMode: 'realtime',
    delayMs: 500,
  },
  logger: {
    level: 'info',
    prefix: '[YYC3]',
  },
  plugins: {
    autoLoad: true,
    allowedPermissions: [],
  },
};

// ── 配置管理器 ──

/**
 * 配置管理器
 */
export class ConfigManager implements IDisposable {
  private provider: IConfigProvider;
  private schema: ConfigSchema;
  private isDisposed = false;

  constructor(
    provider: IConfigProvider = new MemoryConfigProvider(),
    schema?: ConfigSchema
  ) {
    this.provider = provider;
    this.schema = schema || {};
    this.initializeDefaults();
  }

  /**
   * 获取配置值
   */
  get<T>(key: string, defaultValue?: T): T {
    this.ensureNotDisposed();
    return this.provider.get<T>(key, defaultValue);
  }

  /**
   * 获取嵌套配置值
   */
  getNested<T>(path: string, defaultValue?: T): T {
    this.ensureNotDisposed();
    const keys = path.split('.');
    let value: unknown = this.provider.get(keys[0]);

    for (let i = 1; i < keys.length && value !== undefined; i++) {
      if (typeof value === 'object' && value !== null) {
        value = (value as Record<string, unknown>)[keys[i]];
      } else {
        return defaultValue as T;
      }
    }

    return (value as T) ?? (defaultValue as T);
  }

  /**
   * 设置配置值
   */
  set<T>(key: string, value: T): void {
    this.ensureNotDisposed();
    if (this.schema[key]?.validator) {
      if (!this.schema[key].validator!(value)) {
        throw new Error(`Invalid value for config key: ${key}`);
      }
    }
    this.provider.set(key, value);
  }

  /**
   * 设置嵌套配置值
   */
  setNested<T>(path: string, value: T): void {
    this.ensureNotDisposed();
    const keys = path.split('.');
    const rootKey = keys[0];

    let current: Record<string, unknown> = this.provider.get(rootKey) || {};

    for (let i = 1; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
    this.provider.set(rootKey, current);
  }

  /**
   * 检查配置是否存在
   */
  has(key: string): boolean {
    this.ensureNotDisposed();
    return this.provider.has(key);
  }

  /**
   * 删除配置
   */
  delete(key: string): boolean {
    this.ensureNotDisposed();
    return this.provider.delete(key);
  }

  /**
   * 加载配置
   */
  async load(): Promise<void> {
    this.ensureNotDisposed();
    await this.provider.load();
  }

  /**
   * 保存配置
   */
  async save(): Promise<void> {
    this.ensureNotDisposed();
    await this.provider.save();
  }

  /**
   * 监听配置变更
   */
  onChange(callback: (key: string, value: unknown) => void): ISubscription {
    this.ensureNotDisposed();
    return this.provider.onChange(callback);
  }

  /**
   * 获取所有配置
   */
  getAll(): Record<string, unknown> {
    this.ensureNotDisposed();
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(this.schema)) {
      if (this.provider.has(key)) {
        result[key] = this.provider.get(key);
      }
    }
    return result;
  }

  /**
   * 重置为默认值
   */
  reset(key?: string): void {
    this.ensureNotDisposed();
    if (key) {
      if (this.schema[key]?.default !== undefined) {
        this.provider.set(key, this.schema[key].default);
      }
    } else {
      this.initializeDefaults();
    }
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.isDisposed = true;
    if ('dispose' in this.provider) {
      (this.provider as IDisposable).dispose();
    }
  }

  /**
   * 初始化默认值
   */
  private initializeDefaults(): void {
    for (const [key, schema] of Object.entries(this.schema)) {
      if (schema.default !== undefined && !this.provider.has(key)) {
        this.provider.set(key, schema.default);
      }
    }
  }

  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('ConfigManager has been disposed');
    }
  }
}

// ── 工厂函数 ──

/**
 * 创建配置提供者
 */
export function createConfigProvider(options: ConfigOptions = { source: 'memory' }): IConfigProvider {
  switch (options.source) {
    case 'localStorage':
      return new LocalStorageConfigProvider(options);
    case 'memory':
    default:
      return new MemoryConfigProvider();
  }
}

/**
 * 创建 YYC3 配置管理器
 */
export function createYYC3ConfigManager(
  options: ConfigOptions = { source: 'localStorage' }
): ConfigManager {
  const provider = createConfigProvider(options);
  const schema: ConfigSchema = {
    storage: {
      type: 'object',
      default: DEFAULT_CONFIG.storage,
    },
    snapshot: {
      type: 'object',
      default: DEFAULT_CONFIG.snapshot,
    },
    theme: {
      type: 'object',
      default: DEFAULT_CONFIG.theme,
    },
    preview: {
      type: 'object',
      default: DEFAULT_CONFIG.preview,
    },
    logger: {
      type: 'object',
      default: DEFAULT_CONFIG.logger,
    },
    plugins: {
      type: 'object',
      default: DEFAULT_CONFIG.plugins,
    },
  };

  return new ConfigManager(provider, schema);
}
