/**
 * @file: services/registry.ts
 * @description: 统一服务注册中心 — 基于 DI 容器的服务生命周期管理
 *              替代直接 import 实例化，提供类型安全的服务获取
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-06-04
 * @updated: 2026-06-04
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: registry,di,services,lifecycle,encapsulation
 */

// ================================================================
// 统一服务注册中心 — 连接 DI 容器与实际服务
// ================================================================
// 设计原则：
//   1. 单一入口 — 所有服务通过 Registry 获取
//   2. 延迟初始化 — 首次使用时创建实例
//   3. 类型安全 — 泛型约束服务类型
//   4. 生命周期管理 — 支持 init/dispose
// ================================================================

import { DIContainer, Lifecycle, ServiceToken } from "../di";
import { logger } from "./Logger";

export { Lifecycle, ServiceToken };
export type { DIContainer };

/** 服务注册描述 */
export interface ServiceDescriptor<T> {
  token: ServiceToken<T>;
  factory: () => T;
  lifecycle: Lifecycle;
  dependencies?: ServiceToken<unknown>[];
  init?: (instance: T) => Promise<void> | void;
  dispose?: (instance: T) => Promise<void> | void;
}

/**
 * 统一服务注册中心
 *
 * 使用示例：
 *   const llmService = registry.get(TOKENS.LLMService);
 *   await registry.initialize();
 *   await registry.dispose();
 */
export class ServiceRegistry {
  private container = new DIContainer();
  private descriptors = new Map<string, ServiceDescriptor<unknown>>();
  private initialized = false;

  /** 注册服务 */
  register<T>(descriptor: ServiceDescriptor<T>): this {
    this.descriptors.set(descriptor.token.identifier, descriptor as ServiceDescriptor<unknown>);
    this.container.register(
      descriptor.token.identifier,
      descriptor.factory,
      descriptor.lifecycle,
    );
    logger.debug(`[Registry] Registered: ${descriptor.token.identifier}`);
    return this;
  }

  /** 获取服务实例 */
  get<T>(token: ServiceToken<T>): T {
    if (!this.descriptors.has(token.identifier)) {
      throw new Error(`[Registry] Service not registered: ${token.identifier}`);
    }
    return this.container.resolve(token.identifier);
  }

  /** 尝试获取服务，不存在返回 undefined */
  tryGet<T>(token: ServiceToken<T>): T | undefined {
    if (!this.descriptors.has(token.identifier)) return undefined;
    try {
      return this.container.resolve(token.identifier);
    } catch {
      return undefined;
    }
  }

  /** 初始化所有服务 */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    for (const [, descriptor] of this.descriptors) {
      if (descriptor.init) {
        try {
          const instance = this.container.resolve(descriptor.token.identifier);
          await descriptor.init(instance);
        } catch (err) {
          logger.error(`[Registry] Init failed: ${descriptor.token.identifier}`, err);
        }
      }
    }
    this.initialized = true;
    logger.info("[Registry] All services initialized");
  }

  /** 释放所有服务 */
  async dispose(): Promise<void> {
    for (const [, descriptor] of this.descriptors) {
      if (descriptor.dispose) {
        try {
          const instance = this.container.resolve(descriptor.token.identifier);
          await descriptor.dispose(instance);
        } catch (err) {
          logger.error(`[Registry] Dispose failed: ${descriptor.token.identifier}`, err);
        }
      }
    }
    this.container.dispose();
    this.descriptors.clear();
    this.initialized = false;
    logger.info("[Registry] All services disposed");
  }

  /** 检查服务是否已注册 */
  has(token: ServiceToken<unknown>): boolean {
    return this.descriptors.has(token.identifier);
  }

  /** 获取所有已注册服务 token */
  getRegisteredTokens(): string[] {
    return [...this.descriptors.keys()];
  }
}

/** 全局单例注册中心 */
export const serviceRegistry = new ServiceRegistry();
