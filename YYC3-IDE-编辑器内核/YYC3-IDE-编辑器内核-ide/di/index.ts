/**
 * @file: di/index.ts
 * @description: 轻量级依赖注入容器 — 零第三方依赖的 DI 实现
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-01
 * @updated: 2026-04-01
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: di,dependency-injection,container,ioc
 */

// ================================================================
// 轻量级依赖注入容器 — 零第三方依赖
// ================================================================
// 设计原则：
// 1. 不依赖任何第三方库
// 2. 支持单例、瞬态、作用域生命周期
// 3. 支持工厂函数和直接值注册
// 4. 支持嵌套作用域
// 5. 完整的类型安全
// ================================================================

import type {
  IServiceLocator,
  IFactory,
  IDisposable,
  ISubscription,
  IEventEmitter,
} from '../interfaces';

// ── 服务令牌 ──

/**
 * 服务令牌 — 用于标识注册的服务
 */
export class ServiceToken<T = unknown> {
  constructor(
    public readonly identifier: string,
    public readonly description?: string
  ) {}

  toString(): string {
    return `ServiceToken(${this.identifier})`;
  }
}

// ── 生命周期 ──

/**
 * 服务生命周期
 */
export enum Lifecycle {
  /** 单例 — 容器内唯一实例 */
  Singleton = 'singleton',
  /** 瞬态 — 每次解析创建新实例 */
  Transient = 'transient',
  /** 作用域 — 在同一作用域内唯一 */
  Scoped = 'scoped',
}

// ── 服务描述符 ──

/**
 * 服务描述符
 */
interface ServiceDescriptor<T = unknown> {
  token: string | ServiceToken<T>;
  factory: IFactory<T> | T;
  lifecycle: Lifecycle;
  instance?: T;
  isDisposed: boolean;
}

// ── 简单事件发射器实现 ──

class SimpleEventEmitter<T> implements IEventEmitter<T> {
  private listeners: Set<(data: T) => void> = new Set();

  subscribe(callback: (data: T) => void): ISubscription {
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

  emit(data: T): void {
    this.listeners.forEach((callback) => {
      try {
        callback(data);
      } catch {
        /* ignore */
      }
    });
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}

// ── 依赖注入容器 ──

/**
 * 依赖注入容器
 */
export class DIContainer implements IServiceLocator, IDisposable {
  private services: Map<string, ServiceDescriptor> = new Map();
  private singletons: Map<string, unknown> = new Map();
  private scopedInstances: Map<string, unknown> = new Map();
  private parentScope: DIContainer | null = null;
  private children: Set<DIContainer> = new Set();
  private isDisposed = false;
  private onDispose = new SimpleEventEmitter<void>();

  constructor(parentScope?: DIContainer) {
    this.parentScope = parentScope || null;
    if (this.parentScope) {
      this.parentScope.children.add(this);
    }
  }

  /**
   * 注册服务
   */
  register<T>(
    token: string | ServiceToken<T>,
    factory: IFactory<T> | T,
    lifecycle: Lifecycle = Lifecycle.Transient
  ): void {
    this.ensureNotDisposed();

    const tokenKey = typeof token === 'string' ? token : token.identifier;

    this.services.set(tokenKey, {
      token,
      factory,
      lifecycle,
      isDisposed: false,
    });
  }

  /**
   * 注册单例服务
   */
  registerSingleton<T>(token: string | ServiceToken<T>, factory: IFactory<T> | T): void {
    this.register(token, factory, Lifecycle.Singleton);
  }

  /**
   * 注册瞬态服务
   */
  registerTransient<T>(token: string | ServiceToken<T>, factory: IFactory<T> | T): void {
    this.register(token, factory, Lifecycle.Transient);
  }

  /**
   * 注册作用域服务
   */
  registerScoped<T>(token: string | ServiceToken<T>, factory: IFactory<T> | T): void {
    this.register(token, factory, Lifecycle.Scoped);
  }

  /**
   * 解析服务
   */
  resolve<T>(token: string | ServiceToken<T>): T {
    this.ensureNotDisposed();

    const tokenKey = typeof token === 'string' ? token : token.identifier;
    const descriptor = this.services.get(tokenKey);

    if (!descriptor) {
      if (this.parentScope) {
        return this.parentScope.resolve<T>(token);
      }
      throw new Error(`Service not found: ${tokenKey}`);
    }

    return this.resolveDescriptor(descriptor as ServiceDescriptor<T>);
  }

  /**
   * 尝试解析服务
   */
  tryResolve<T>(token: string | ServiceToken<T>): T | null {
    try {
      return this.resolve<T>(token);
    } catch {
      return null;
    }
  }

  /**
   * 检查服务是否已注册
   */
  has(token: string | ServiceToken<unknown>): boolean {
    const tokenKey = typeof token === 'string' ? token : token.identifier;
    return this.services.has(tokenKey) || (this.parentScope?.has(token) ?? false);
  }

  /**
   * 取消注册服务
   */
  unregister(token: string | ServiceToken<unknown>): boolean {
    this.ensureNotDisposed();

    const tokenKey = typeof token === 'string' ? token : token.identifier;
    const descriptor = this.services.get(tokenKey);

    if (descriptor) {
      if (descriptor.instance && typeof (descriptor.instance as IDisposable).dispose === 'function') {
        (descriptor.instance as IDisposable).dispose();
      }
      this.singletons.delete(tokenKey);
      this.scopedInstances.delete(tokenKey);
      return this.services.delete(tokenKey);
    }

    return false;
  }

  /**
   * 创建子作用域
   */
  createScope(): IServiceLocator {
    this.ensureNotDisposed();
    return new DIContainer(this);
  }

  /**
   * 释放容器
   */
  dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;

    Array.from(this.children).forEach((child) => {
      child.dispose();
    });
    this.children.clear();

    Array.from(this.singletons.entries()).forEach(([key, instance]) => {
      if (typeof (instance as IDisposable).dispose === 'function') {
        try {
          (instance as IDisposable).dispose();
        } catch {
          /* ignore */
        }
      }
    });

    Array.from(this.scopedInstances.entries()).forEach(([key, instance]) => {
      if (typeof (instance as IDisposable).dispose === 'function') {
        try {
          (instance as IDisposable).dispose();
        } catch {
          /* ignore */
        }
      }
    });

    this.services.clear();
    this.singletons.clear();
    this.scopedInstances.clear();
    this.onDispose.emit(undefined as unknown as void);
  }

  /**
   * 订阅释放事件
   */
  onDisposeEvent(callback: () => void): ISubscription {
    return this.onDispose.subscribe(callback);
  }

  /**
   * 解析服务描述符
   */
  private resolveDescriptor<T>(descriptor: ServiceDescriptor<T>): T {
    switch (descriptor.lifecycle) {
      case Lifecycle.Singleton:
        return this.resolveSingleton(descriptor);

      case Lifecycle.Scoped:
        return this.resolveScoped(descriptor);

      case Lifecycle.Transient:
      default:
        return this.createInstance(descriptor);
    }
  }

  /**
   * 解析单例
   */
  private resolveSingleton<T>(descriptor: ServiceDescriptor<T>): T {
    const tokenKey = typeof descriptor.token === 'string' ? descriptor.token : descriptor.token.identifier;

    if (this.singletons.has(tokenKey)) {
      return this.singletons.get(tokenKey) as T;
    }

    const instance = this.createInstance(descriptor);
    this.singletons.set(tokenKey, instance);
    return instance;
  }

  /**
   * 解析作用域服务
   */
  private resolveScoped<T>(descriptor: ServiceDescriptor<T>): T {
    const tokenKey = typeof descriptor.token === 'string' ? descriptor.token : descriptor.token.identifier;

    if (this.scopedInstances.has(tokenKey)) {
      return this.scopedInstances.get(tokenKey) as T;
    }

    const instance = this.createInstance(descriptor);
    this.scopedInstances.set(tokenKey, instance);
    return instance;
  }

  /**
   * 创建实例
   */
  private createInstance<T>(descriptor: ServiceDescriptor<T>): T {
    const factory = descriptor.factory;

    if (typeof factory === 'function' && 'create' in factory) {
      return (factory as IFactory<T>).create(this);
    }

    return factory as T;
  }

  /**
   * 确保容器未释放
   */
  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('Container has been disposed');
    }
  }
}

// ── 服务令牌常量 ──

/**
 * 内置服务令牌
 */
export const TOKENS = {
  Storage: new ServiceToken<IStorageAdapter>('storage', '存储适配器'),
  SnapshotManager: new ServiceToken<ISnapshotManager>('snapshotManager', '快照管理器'),
  ThemeManager: new ServiceToken<IThemeManager>('themeManager', '主题管理器'),
  PreviewController: new ServiceToken<IPreviewController>('previewController', '预览控制器'),
  CodeValidator: new ServiceToken<ICodeValidator>('codeValidator', '代码验证器'),
  EventBus: new ServiceToken<IEventBus>('eventBus', '事件总线'),
  Logger: new ServiceToken<ILogger>('logger', '日志器'),
  Config: new ServiceToken<IConfigProvider>('config', '配置提供者'),
} as const;

// ── 导入类型 ──
import type {
  IStorageAdapter,
  ISnapshotManager,
  IThemeManager,
  IPreviewController,
  ICodeValidator,
  IEventBus,
  ILogger,
  IConfigProvider,
} from '../interfaces';

// ── 全局容器 ──

let globalContainer: DIContainer | null = null;

/**
 * 获取全局容器
 */
export function getGlobalContainer(): DIContainer {
  if (!globalContainer) {
    globalContainer = new DIContainer();
  }
  return globalContainer;
}

/**
 * 重置全局容器
 */
export function resetGlobalContainer(): void {
  if (globalContainer) {
    globalContainer.dispose();
    globalContainer = null;
  }
}

/**
 * 便捷注册函数
 */
export function registerService<T>(
  token: string | ServiceToken<T>,
  factory: IFactory<T> | T,
  lifecycle: Lifecycle = Lifecycle.Transient
): void {
  getGlobalContainer().register(token, factory, lifecycle);
}

/**
 * 便捷解析函数
 */
export function resolveService<T>(token: string | ServiceToken<T>): T {
  return getGlobalContainer().resolve<T>(token);
}

/**
 * 便捷检查函数
 */
export function hasService(token: string | ServiceToken<unknown>): boolean {
  return getGlobalContainer().has(token);
}

// ── 装饰器支持（可选） ──

/**
 * 可注入装饰器标记
 */
const INJECTABLE_METADATA = Symbol('injectable');

/**
 * 标记类为可注入
 */

export function Injectable(lifecycle: Lifecycle = Lifecycle.Transient): ClassDecorator {
   
  return function (target: any): any {
    target[INJECTABLE_METADATA] = { lifecycle };
    return target;
  };
}

/**
 * 获取可注入元数据
 */
export function getInjectableMetadata(target: new (...args: unknown[]) => unknown): { lifecycle: Lifecycle } | null {
  return (target as any)[INJECTABLE_METADATA] || null;
}

// ── 工厂构建器 ──

/**
 * 工厂构建器
 */
export class FactoryBuilder<T> {
  private dependencies: Array<string | ServiceToken<unknown>> = [];

  constructor(private targetConstructor: new (...args: unknown[]) => T) {}

  withDependency(token: string | ServiceToken<unknown>): this {
    this.dependencies.push(token);
    return this;
  }

  build(): IFactory<T> {
    const deps = [...this.dependencies];
    const ctor = this.targetConstructor;

    return {
      create: (locator: IServiceLocator) => {
        const args = deps.map((dep) => locator.resolve(dep as string));
        return new ctor(...args);
      },
    };
  }
}

/**
 * 创建工厂构建器
 */
export function factoryFor<T>(constructor: new (...args: unknown[]) => T): FactoryBuilder<T> {
  return new FactoryBuilder(constructor);
}

// ── 导出 ──

export {
  DIContainer as Container,
  ServiceToken as Token,
};
