// @ts-nocheck
/**
 * @file: PluginSystemDesign.ts
 * @description: 插件系统设计 - 实现扩展点、依赖管理和生命周期管理
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: plugin,system,extension,dependency,lifecycle
 */

import type {
  DependencyGraph,
  DependencyNode,
  ExtensionPoint,
  ExtensionPointHandler,
  PluginDependency,
  PluginManifest,
  PluginState,
} from './PluginTypes';
import {
  PluginErrorCode,
  ExtensionPointType,
  PluginLifecycleStage,
} from './PluginTypes';
import { logger } from "../services/Logger";

// ================================================================
// 扩展点管理器
// ================================================================

/**
 * 扩展点管理器
 * 负责注册、查询和管理扩展点
 */
export class ExtensionPointManager {
  private extensionPoints = new Map<string, ExtensionPoint>();
  private extensionPointHandlers = new Map<
    string,
    Set<ExtensionPointHandler<unknown>>
  >();

  /**
   * 注册扩展点
   */
  registerExtensionPoint<T>(
    point: ExtensionPoint<T>,
  ): void {
    if (this.extensionPoints.has(point.id)) {
      throw new Error(`Extension point "${point.id}" already registered`);
    }

    this.extensionPoints.set(point.id, point);
    logger.warn('Registered: ${point.id} (${point.type})');
  }

  /**
   * 注销扩展点
   */
  unregisterExtensionPoint(id: string): void {
    const point = this.extensionPoints.get(id);
    if (!point) {
      return;
    }

    // 清理所有扩展
    point.extensions.clear();
    this.extensionPointHandlers.delete(id);
    this.extensionPoints.delete(id);

    logger.warn('Unregistered: ${id}');
  }

  /**
   * 获取扩展点
   */
  getExtensionPoint<T = unknown>(
    id: string,
  ): ExtensionPoint<T> | undefined {
    return this.extensionPoints.get(id) as ExtensionPoint<T> | undefined;
  }

  /**
   * 获取所有扩展点
   */
  getAllExtensionPoints(): ExtensionPoint[] {
    return Array.from(this.extensionPoints.values());
  }

  /**
   * 按类型获取扩展点
   */
  getExtensionPointsByType(type: ExtensionPointType): ExtensionPoint[] {
    return this.getAllExtensionPoints().filter((p) => p.type === type);
  }

  /**
   * 注册扩展到扩展点
   */
  registerExtension<T>(
    pointId: string,
    extensionId: string,
    extension: T,
    pluginId: string,
  ): void {
    const point = this.extensionPoints.get(pointId);
    if (!point) {
      throw new Error(`Extension point "${pointId}" not found`);
    }

    // 验证扩展
    if (point.schema) {
      this.validateExtension(point, extension);
    }

    // 添加扩展
    point.extensions.set(extensionId, extension);

    // 触发处理器
    if (point.handler) {
      try {
        const result = point.handler(extension, pluginId);
        if (result instanceof Promise) {
          result.catch((error) => {
            logger.error(
              `[ExtensionPoints] Handler error for "${pointId}":`,
              error,
            );
          });
        }
      } catch (error) {
        logger.error(
          `[ExtensionPoints] Handler error for "${pointId}":`,
          error,
        );
      }
    }

    // 触发注册的处理器
    const handlers = this.extensionPointHandlers.get(pointId);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(extension, pluginId);
        } catch (error) {
          logger.error(
            `[ExtensionPoints] Handler error for "${pointId}":`,
            error,
          );
        }
      });
    }

    logger.warn(
      `[ExtensionPoints] Extension "${extensionId}" registered to "${pointId}"`,
    );
  }

  /**
   * 注销扩展
   */
  unregisterExtension(pointId: string, extensionId: string): void {
    const point = this.extensionPoints.get(pointId);
    if (!point) {
      return;
    }

    point.extensions.delete(extensionId);
    logger.warn(
      `[ExtensionPoints] Extension "${extensionId}" unregistered from "${pointId}"`,
    );
  }

  /**
   * 获取扩展点的所有扩展
   */
  getExtensions<T = unknown>(pointId: string): Map<string, T> {
    const point = this.extensionPoints.get(pointId);
    if (!point) {
      return new Map();
    }
    return point.extensions as Map<string, T>;
  }

  /**
   * 注册扩展点处理器
   */
  onExtensionRegistered<T>(
    pointId: string,
    handler: ExtensionPointHandler<T>,
  ): () => void {
    if (!this.extensionPointHandlers.has(pointId)) {
      this.extensionPointHandlers.set(pointId, new Set());
    }

    const handlers = this.extensionPointHandlers.get(pointId)!;
    handlers.add(handler as ExtensionPointHandler<unknown>);

    return () => {
      handlers.delete(handler as ExtensionPointHandler<unknown>);
    };
  }

  /**
   * 验证扩展
   */
  private validateExtension(
    point: ExtensionPoint,
    extension: unknown,
  ): void {
    if (!point.schema) {
      return;
    }

    // 简单的模式验证（实际项目中可使用 JSON Schema 验证库）
    const schema = point.schema as Record<string, unknown>;
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in (extension as Record<string, unknown>))) {
          throw new Error(
            `Extension missing required field: ${String(field)}`,
          );
        }
      }
    }
  }

  /**
   * 清理所有扩展点
   */
  clear(): void {
    this.extensionPoints.clear();
    this.extensionPointHandlers.clear();
    logger.warn('All extension points cleared');
  }
}

// ================================================================
// 依赖管理器
// ================================================================

/**
 * 依赖管理器
 * 负责依赖解析、版本检查和拓扑排序
 */
export class DependencyManager {
  /**
   * 构建依赖图
   */
  buildDependencyGraph(
    plugins: Map<string, PluginManifest>,
  ): DependencyGraph {
    const nodes = new Map<string, DependencyNode>();
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const circularDependencies: string[][] = [];
    const sortedOrder: string[] = [];

    // 创建节点
    for (const [id, manifest] of plugins) {
      const dependencies = new Set<string>();
      const dependents = new Set<string>();

      // 添加依赖
      if (manifest.dependencies) {
        for (const dep of manifest.dependencies) {
          dependencies.add(dep.id);
        }
      }

      nodes.set(id, { id, dependencies, dependents });
    }

    // 构建反向依赖（dependents）
    for (const [id, node] of nodes) {
      for (const depId of node.dependencies) {
        const depNode = nodes.get(depId);
        if (depNode) {
          depNode.dependents.add(id);
        }
      }
    }

    // DFS 拓扑排序
    const dfs = (id: string, path: string[]): void => {
      if (visited.has(id)) {
        return;
      }

      if (visiting.has(id)) {
        // 发现循环依赖
        const cycle = [...path.slice(path.indexOf(id)), id];
        circularDependencies.push(cycle);
        return;
      }

      visiting.add(id);
      const node = nodes.get(id);
      if (node) {
        for (const depId of node.dependencies) {
          if (nodes.has(depId)) {
            dfs(depId, [...path, id]);
          }
        }
      }
      visiting.delete(id);
      visited.add(id);
      sortedOrder.push(id);
    };

    // 遍历所有节点
    for (const id of nodes.keys()) {
      if (!visited.has(id)) {
        dfs(id, []);
      }
    }

    return { nodes, sortedOrder, circularDependencies };
  }

  /**
   * 检查依赖版本
   */
  checkDependencyVersion(
    dependency: PluginDependency,
    installedVersion: string,
  ): boolean {
    const range = dependency.version;

    // 简单的版本范围解析（支持 ^, ~, >=, <=, >, <）
    if (range.startsWith('^')) {
      // 兼容版本：相同主版本
      const required = this.parseVersion(range.slice(1));
      const installed = this.parseVersion(installedVersion);
      return (
        installed.major === required.major &&
        this.compareVersions(installed, required) >= 0
      );
    }

    if (range.startsWith('~')) {
      // 补丁版本：相同主版本和次版本
      const required = this.parseVersion(range.slice(1));
      const installed = this.parseVersion(installedVersion);
      return (
        installed.major === required.major &&
        installed.minor === required.minor &&
        this.compareVersions(installed, required) >= 0
      );
    }

    if (range.startsWith('>=')) {
      const required = this.parseVersion(range.slice(2));
      const installed = this.parseVersion(installedVersion);
      return this.compareVersions(installed, required) >= 0;
    }

    if (range.startsWith('<=')) {
      const required = this.parseVersion(range.slice(2));
      const installed = this.parseVersion(installedVersion);
      return this.compareVersions(installed, required) <= 0;
    }

    if (range.startsWith('>')) {
      const required = this.parseVersion(range.slice(1));
      const installed = this.parseVersion(installedVersion);
      return this.compareVersions(installed, required) > 0;
    }

    if (range.startsWith('<')) {
      const required = this.parseVersion(range.slice(1));
      const installed = this.parseVersion(installedVersion);
      return this.compareVersions(installed, required) < 0;
    }

    // 精确匹配
    return range === installedVersion;
  }

  /**
   * 解析版本号
   */
  private parseVersion(version: string): {
    major: number;
    minor: number;
    patch: number;
  } {
    const parts = version.split('.').map((p) => parseInt(p, 10) || 0);
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0,
    };
  }

  /**
   * 比较版本
   */
  private compareVersions(
    a: { major: number; minor: number; patch: number },
    b: { major: number; minor: number; patch: number },
  ): number {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    return a.patch - b.patch;
  }

  /**
   * 验证依赖
   */
  validateDependencies(
    manifest: PluginManifest,
    installedPlugins: Map<string, PluginManifest>,
  ): {
    valid: boolean;
    missing: PluginDependency[];
    versionMismatches: Array<{ dependency: PluginDependency; installed: string }>;
  } {
    const missing: PluginDependency[] = [];
    const versionMismatches: Array<{
      dependency: PluginDependency;
      installed: string;
    }> = [];

    if (!manifest.dependencies) {
      return { valid: true, missing, versionMismatches };
    }

    for (const dep of manifest.dependencies) {
      const installed = installedPlugins.get(dep.id);

      if (!installed) {
        missing.push(dep);
        continue;
      }

      if (!this.checkDependencyVersion(dep, installed.version)) {
        versionMismatches.push({
          dependency: dep,
          installed: installed.version,
        });
      }
    }

    return {
      valid: missing.length === 0 && versionMismatches.length === 0,
      missing,
      versionMismatches,
    };
  }

  /**
   * 获取加载顺序
   */
  getLoadOrder(
    pluginId: string,
    graph: DependencyGraph,
  ): string[] {
    const order: string[] = [];
    const visited = new Set<string>();

    const visit = (id: string): void => {
      if (visited.has(id)) {
        return;
      }

      visited.add(id);
      const node = graph.nodes.get(id);
      if (node) {
        // 先加载依赖
        for (const depId of node.dependencies) {
          visit(depId);
        }
        order.push(id);
      }
    };

    visit(pluginId);
    return order;
  }

  /**
   * 获取反向依赖
   */
  getDependents(
    pluginId: string,
    graph: DependencyGraph,
  ): string[] {
    const node = graph.nodes.get(pluginId);
    if (!node) {
      return [];
    }
    return Array.from(node.dependents);
  }
}

// ================================================================
// 生命周期管理器
// ================================================================

/**
 * 生命周期管理器
 * 负责插件的生命周期状态转换和钩子调用
 */
export class LifecycleManager {
  private stateTransitions: Map<
    PluginLifecycleStage,
    Set<PluginLifecycleStage>
  >;

  constructor() {
    // 定义允许的状态转换
    this.stateTransitions = new Map([
      [
        PluginLifecycleStage.INSTALLED,
        new Set([
          PluginLifecycleStage.LOADING,
          PluginLifecycleStage.UNLOADING,
        ]),
      ],
      [
        PluginLifecycleStage.LOADING,
        new Set([
          PluginLifecycleStage.LOADED,
          PluginLifecycleStage.ERROR,
        ]),
      ],
      [
        PluginLifecycleStage.LOADED,
        new Set([
          PluginLifecycleStage.ACTIVATING,
          PluginLifecycleStage.UNLOADING,
        ]),
      ],
      [
        PluginLifecycleStage.ACTIVATING,
        new Set([
          PluginLifecycleStage.ACTIVE,
          PluginLifecycleStage.ERROR,
        ]),
      ],
      [
        PluginLifecycleStage.ACTIVE,
        new Set([PluginLifecycleStage.DEACTIVATING]),
      ],
      [
        PluginLifecycleStage.DEACTIVATING,
        new Set([
          PluginLifecycleStage.DISABLED,
          PluginLifecycleStage.ERROR,
        ]),
      ],
      [
        PluginLifecycleStage.DISABLED,
        new Set([
          PluginLifecycleStage.ACTIVATING,
          PluginLifecycleStage.UNLOADING,
        ]),
      ],
      [
        PluginLifecycleStage.ERROR,
        new Set([
          PluginLifecycleStage.DISABLED,
          PluginLifecycleStage.UNLOADING,
        ]),
      ],
      [PluginLifecycleStage.UNLOADING, new Set([PluginLifecycleStage.INSTALLED])],
    ]);
  }

  /**
   * 检查状态转换是否合法
   */
  canTransition(
    from: PluginLifecycleStage,
    to: PluginLifecycleStage,
  ): boolean {
    const allowed = this.stateTransitions.get(from);
    return allowed?.has(to) ?? false;
  }

  /**
   * 转换状态
   */
  transition(
    state: PluginState,
    to: PluginLifecycleStage,
  ): PluginState {
    const from = state.stage;

    if (!this.canTransition(from, to)) {
      throw new Error(
        `Invalid state transition from ${from} to ${to}`,
      );
    }

    logger.warn('${state.id}: ${from} -> ${to}');

    return {
      ...state,
      stage: to,
      error: undefined,
      activatedAt:
        to === PluginLifecycleStage.ACTIVE
          ? Date.now()
          : state.activatedAt,
    };
  }

  /**
   * 执行激活钩子
   */
  async executeActivateHook(
    manifest: PluginManifest,
    context: unknown,
  ): Promise<void> {
    if (!manifest.activate) {
      return;
    }

    try {
      const result = manifest.activate(context as never);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      throw new Error(
        `Activation hook failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 执行停用钩子
   */
  async executeDeactivateHook(
    manifest: PluginManifest,
  ): Promise<void> {
    if (!manifest.deactivate) {
      return;
    }

    try {
      const result = manifest.deactivate();
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      throw new Error(
        `Deactivation hook failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 创建初始状态
   */
  createInitialState(id: string): PluginState {
    return {
      id,
      stage: PluginLifecycleStage.INSTALLED,
      usageCount: 0,
    };
  }

  /**
   * 设置错误状态
   */
  setErrorState(
    state: PluginState,
    code: PluginErrorCode,
    message: string,
    recoverable: boolean = false,
  ): PluginState {
    return {
      ...state,
      stage: PluginLifecycleStage.ERROR,
      error: {
        code,
        message,
        timestamp: Date.now(),
        recoverable,
      },
    };
  }
}

// ================================================================
// 插件系统配置
// ================================================================

/**
 * 默认扩展点定义
 */
export const DEFAULT_EXTENSION_POINTS: ExtensionPoint[] = [
  {
    id: 'commands',
    name: 'Commands',
    description: 'Register commands',
    type: ExtensionPointType.COMMAND,
    extensions: new Map(),
  },
  {
    id: 'views',
    name: 'Views',
    description: 'Register views',
    type: ExtensionPointType.VIEW,
    extensions: new Map(),
  },
  {
    id: 'menus',
    name: 'Menus',
    description: 'Register menu items',
    type: ExtensionPointType.MENU,
    extensions: new Map(),
  },
  {
    id: 'themes',
    name: 'Themes',
    description: 'Register themes',
    type: ExtensionPointType.THEME,
    extensions: new Map(),
  },
  {
    id: 'languages',
    name: 'Languages',
    description: 'Register languages',
    type: ExtensionPointType.LANGUAGE,
    extensions: new Map(),
  },
  {
    id: 'grammars',
    name: 'Grammars',
    description: 'Register grammars',
    type: ExtensionPointType.GRAMMAR,
    extensions: new Map(),
  },
  {
    id: 'snippets',
    name: 'Snippets',
    description: 'Register code snippets',
    type: ExtensionPointType.SNIPPET,
    extensions: new Map(),
  },
  {
    id: 'statusBarItems',
    name: 'Status Bar Items',
    description: 'Register status bar items',
    type: ExtensionPointType.STATUS_BAR_ITEM,
    extensions: new Map(),
  },
  {
    id: 'panels',
    name: 'Panels',
    description: 'Register panels',
    type: ExtensionPointType.PANEL,
    extensions: new Map(),
  },
  {
    id: 'providers',
    name: 'Providers',
    description: 'Register providers',
    type: ExtensionPointType.PROVIDER,
    extensions: new Map(),
  },
];

/**
 * 初始化默认扩展点
 */
export function initializeDefaultExtensionPoints(
  manager: ExtensionPointManager,
): void {
  for (const point of DEFAULT_EXTENSION_POINTS) {
    manager.registerExtensionPoint(point);
  }
}
