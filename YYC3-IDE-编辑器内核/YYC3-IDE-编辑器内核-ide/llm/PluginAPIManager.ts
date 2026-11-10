// @ts-nocheck
/**
 * @file: PluginAPIManager.ts
 * @description: 插件API管理器 - 提供核心API、UI扩展API、数据访问API、事件系统
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: plugin,api,editor,ui,events,storage
 */

import type {
  PluginAPI,
  PluginEditorAPI,
  PluginUIAPI,
  PluginAIAPI,
  PluginCommandAPI,
  PluginEventAPI,
  PluginStorageAPI,
  PluginNetworkAPI,
  PluginWorkspaceAPI,
  PluginLoggerAPI,
  EventHandler,
  Disposable,
  AIProviderConfig,
  AIProviderInfo,
  LogLevel,
} from './PluginTypes';
import { logger } from "../services/Logger";

// ================================================================
// 事件总线
// ================================================================

/**
 * 事件总线
 * 提供事件的发布订阅功能
 */
export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  /**
   * 订阅事件
   */
  on(event: string, handler: EventHandler): Disposable {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    this.handlers.get(event)!.add(handler);

    return {
      dispose: () => {
        this.handlers.get(event)?.delete(handler);
      },
    };
  }

  /**
   * 订阅一次性事件
   */
  once(event: string, handler: EventHandler): Disposable {
    const wrapper: EventHandler = (...args: unknown[]) => {
      this.off(event, wrapper);
      handler(...args);
    };

    return this.on(event, wrapper);
  }

  /**
   * 取消订阅
   */
  off(event: string, handler?: EventHandler): void {
    if (!handler) {
      this.handlers.delete(event);
    } else {
      this.handlers.get(event)?.delete(handler);
    }
  }

  /**
   * 发布事件
   */
  emit(event: string, ...args: unknown[]): void {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers) {
      return;
    }

    for (const handler of eventHandlers) {
      try {
        handler(...args);
      } catch (error) {
        logger.error(`[EventBus] Error in event handler for "${event}":`, error);
      }
    }
  }

  /**
   * 清理所有事件
   */
  clear(): void {
    this.handlers.clear();
  }
}

// ================================================================
// 命令注册表
// ================================================================

/**
 * 命令注册表
 */
export class CommandRegistry {
  private commands = new Map<
    string,
    {
      handler: (...args: unknown[]) => unknown;
      options?: { title?: string; shortcut?: string };
    }
  >();

  /**
   * 注册命令
   */
  register(
    id: string,
    handler: (...args: unknown[]) => unknown,
    options?: { title?: string; shortcut?: string },
  ): Disposable {
    if (this.commands.has(id)) {
      logger.warn('Command "${id}" already registered');
    }

    this.commands.set(id, { handler, options });

    return {
      dispose: () => {
        this.commands.delete(id);
      },
    };
  }

  /**
   * 执行命令
   */
  async execute<T = unknown>(
    id: string,
    ...args: unknown[]
  ): Promise<T> {
    const command = this.commands.get(id);
    if (!command) {
      throw new Error(`Command "${id}" not found`);
    }

    return command.handler(...args) as T;
  }

  /**
   * 获取所有命令
   */
  getAll(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * 检查命令是否存在
   */
  has(id: string): boolean {
    return this.commands.has(id);
  }

  /**
   * 清理所有命令
   */
  clear(): void {
    this.commands.clear();
  }
}

// ================================================================
// 插件存储
// ================================================================

/**
 * 插件存储
 */
export class PluginStorage {
  private storage = new Map<string, Map<string, unknown>>();
  private globalStorage = new Map<string, unknown>();
  private workspaceStorage = new Map<string, unknown>();

  /**
   * 获取插件存储
   */
  get<T = unknown>(pluginId: string, key: string): T | undefined {
    return this.storage.get(pluginId)?.get(key) as T | undefined;
  }

  /**
   * 设置插件存储
   */
  set(pluginId: string, key: string, value: unknown): void {
    if (!this.storage.has(pluginId)) {
      this.storage.set(pluginId, new Map());
    }
    this.storage.get(pluginId)!.set(key, value);
  }

  /**
   * 删除插件存储
   */
  remove(pluginId: string, key: string): void {
    this.storage.get(pluginId)?.delete(key);
  }

  /**
   * 清理插件存储
   */
  clear(pluginId: string): void {
    this.storage.delete(pluginId);
  }

  /**
   * 获取全局存储
   */
  getGlobal<T = unknown>(key: string): T | undefined {
    return this.globalStorage.get(key) as T | undefined;
  }

  /**
   * 设置全局存储
   */
  setGlobal(key: string, value: unknown): void {
    this.globalStorage.set(key, value);
  }

  /**
   * 获取工作区存储
   */
  getWorkspace<T = unknown>(key: string): T | undefined {
    return this.workspaceStorage.get(key) as T | undefined;
  }

  /**
   * 设置工作区存储
   */
  setWorkspace(key: string, value: unknown): void {
    this.workspaceStorage.set(key, value);
  }
}

// ================================================================
// AI 提供者管理器
// ================================================================

/**
 * AI 提供者管理器
 */
export class AIProviderManager {
  private providers = new Map<string, AIProviderConfig>();
  private defaultProvider?: string;

  /**
   * 注册提供者
   */
  register(id: string, config: AIProviderConfig): void {
    this.providers.set(id, config);

    if (!this.defaultProvider) {
      this.defaultProvider = id;
    }

    logger.warn('Registered: ${id}');
  }

  /**
   * 注销提供者
   */
  unregister(id: string): void {
    this.providers.delete(id);

    if (this.defaultProvider === id) {
      this.defaultProvider = Array.from(this.providers.keys())[0];
    }
  }

  /**
   * 获取提供者
   */
  get(id: string): AIProviderConfig | undefined {
    return this.providers.get(id);
  }

  /**
   * 获取所有提供者信息
   */
  getAll(): AIProviderInfo[] {
    return Array.from(this.providers.entries()).map(([id, config]) => ({
      id,
      name: config.name,
      models: config.models,
      isDefault: this.defaultProvider === id,
    }));
  }

  /**
   * 设置默认提供者
   */
  setDefault(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Provider "${id}" not found`);
    }
    this.defaultProvider = id;
  }

  /**
   * 获取默认提供者
   */
  getDefault(): string | undefined {
    return this.defaultProvider;
  }
}

// ================================================================
// 插件 API 工厂
// ================================================================

/**
 * 插件 API 工厂
 * 为每个插件创建独立的 API 实例
 */
export class PluginAPIFactory {
  private eventBus: EventBus;
  private commandRegistry: CommandRegistry;
  private storage: PluginStorage;
  private aiProviderManager: AIProviderManager;
  private pluginFiles = new Map<string, Map<string, string>>();
  private pluginSelections = new Map<string, string>();
  private activeFile: string | null = null;

  constructor() {
    this.eventBus = new EventBus();
    this.commandRegistry = new CommandRegistry();
    this.storage = new PluginStorage();
    this.aiProviderManager = new AIProviderManager();
  }

  /**
   * 为插件创建 API
   */
  createAPI(pluginId: string): PluginAPI {
    return {
      editor: this.createEditorAPI(pluginId),
      ui: this.createUIAPI(pluginId),
      ai: this.createAIAPI(pluginId),
      commands: this.createCommandAPI(pluginId),
      events: this.createEventAPI(pluginId),
      storage: this.createStorageAPI(pluginId),
      network: this.createNetworkAPI(pluginId),
      workspace: this.createWorkspaceAPI(pluginId),
      logger: this.createLoggerAPI(pluginId),
    };
  }

  /**
   * 创建编辑器 API
   */
  private createEditorAPI(pluginId: string): PluginEditorAPI {
    return {
      getActiveFile: () => this.activeFile,

      getFileContent: async (path: string) => {
        return this.pluginFiles.get(pluginId)?.get(path) || null;
      },

      setFileContent: async (path: string, content: string) => {
        if (!this.pluginFiles.has(pluginId)) {
          this.pluginFiles.set(pluginId, new Map());
        }
        this.pluginFiles.get(pluginId)!.set(path, content);
        this.eventBus.emit('file:change', path, content);
      },

      getSelectedText: () => {
        return this.pluginSelections.get(pluginId) || null;
      },

      openFile: async (path: string) => {
        this.activeFile = path;
        this.eventBus.emit('file:open', path);
      },

      listFiles: () => {
        return Array.from(
          this.pluginFiles.get(pluginId)?.keys() || [],
        );
      },

      createFile: async (path: string, content?: string) => {
        if (!this.pluginFiles.has(pluginId)) {
          this.pluginFiles.set(pluginId, new Map());
        }
        this.pluginFiles.get(pluginId)!.set(path, content || '');
        this.eventBus.emit('file:create', path);
      },

      deleteFile: async (path: string) => {
        this.pluginFiles.get(pluginId)?.delete(path);
        this.eventBus.emit('file:delete', path);
      },

      renameFile: async (oldPath: string, newPath: string) => {
        const content = this.pluginFiles.get(pluginId)?.get(oldPath);
        if (content !== undefined) {
          this.pluginFiles.get(pluginId)?.delete(oldPath);
          this.pluginFiles.get(pluginId)?.set(newPath, content);
          this.eventBus.emit('file:rename', oldPath, newPath);
        }
      },

      saveFile: async (path?: string) => {
        const filePath = path || this.activeFile;
        if (filePath) {
          this.eventBus.emit('file:save', filePath);
        }
      },

      getCursorPosition: () => {
        return { line: 1, column: 1 };
      },

      setCursorPosition: (line: number, column: number) => {
        this.eventBus.emit('cursor:move', { line, column });
      },

      getSelection: () => {
        return null;
      },

      setSelection: (start: number, end: number) => {
        this.eventBus.emit('selection:change', { start, end });
      },

      getConfiguration: () => {
        return {};
      },

      updateConfiguration: (config: Record<string, unknown>) => {
        this.eventBus.emit('configuration:change', config);
      },
    };
  }

  /**
   * 创建 UI API
   */
  private createUIAPI(pluginId: string): PluginUIAPI {
    return {
      registerPanel: (id: string, options: unknown) => {
        const fullId = `${pluginId}:${id}`;
        this.eventBus.emit('panel:register', fullId, options);
      },

      unregisterPanel: (id: string) => {
        const fullId = `${pluginId}:${id}`;
        this.eventBus.emit('panel:unregister', fullId);
      },

      registerMenuItem: (menu: string, item: unknown) => {
        const key = `${pluginId}:${menu}`;
        this.eventBus.emit('menu:register', key, item);
      },

      unregisterMenuItem: (menu: string, command: string) => {
        const key = `${pluginId}:${menu}`;
        this.eventBus.emit('menu:unregister', key, command);
      },

      registerStatusBarItem: (options: unknown) => {
        this.eventBus.emit('statusbar:register', pluginId, options);
      },

      unregisterStatusBarItem: (id: string) => {
        this.eventBus.emit('statusbar:unregister', id);
      },

      showNotification: (
        message: string,
        type?: 'info' | 'success' | 'warning' | 'error',
        options?: unknown,
      ) => {
        this.eventBus.emit('notification:show', {
          pluginId,
          message,
          type: type || 'info',
          options,
        });
      },

      showPanel: (options: unknown) => {
        this.eventBus.emit('panel:show', { pluginId, options });
      },

      hidePanel: (id: string) => {
        this.eventBus.emit('panel:hide', id);
      },

      showModal: async (options: unknown) => {
        return new Promise((resolve) => {
          this.eventBus.emit('modal:show', { pluginId, options, resolve });
        });
      },

      showQuickPick: async <T extends { label: string }>(
        items: T[],
        options?: unknown,
      ) => {
        return new Promise<T | undefined>((resolve) => {
          this.eventBus.emit('quickpick:show', {
            pluginId,
            items,
            options,
            resolve,
          });
        });
      },

      showInputBox: async (options: unknown) => {
        return new Promise<string | undefined>((resolve) => {
          this.eventBus.emit('inputbox:show', { pluginId, options, resolve });
        });
      },
    };
  }

  /**
   * 创建 AI API
   */
  private createAIAPI(pluginId: string): PluginAIAPI {
    return {
      chat: async (prompt: string, options?: unknown) => {
        const provider = this.aiProviderManager.getDefault();
        if (!provider) {
          return `[PluginAI] No AI provider available. Prompt: "${prompt.slice(0, 50)}..."`;
        }

        return `[PluginAI] Provider: ${provider}, Prompt: "${prompt.slice(0, 50)}..."`;
      },

      complete: async (prompt: string, options?: unknown) => {
        return `[PluginAI] Completion for: "${prompt.slice(0, 50)}..."`;
      },

      embed: async (text: string) => {
        // 模拟嵌入向量
        return Array(768).fill(0).map(() => Math.random());
      },

      registerProvider: (id: string, config: AIProviderConfig) => {
        this.aiProviderManager.register(`${pluginId}:${id}`, config);
      },

      unregisterProvider: (id: string) => {
        this.aiProviderManager.unregister(`${pluginId}:${id}`);
      },

      getProviders: () => {
        return this.aiProviderManager.getAll();
      },

      setDefaultProvider: (id: string) => {
        this.aiProviderManager.setDefault(`${pluginId}:${id}`);
      },
    };
  }

  /**
   * 创建命令 API
   */
  private createCommandAPI(pluginId: string): PluginCommandAPI {
    return {
      registerCommand: (
        id: string,
        handler: (...args: unknown[]) => unknown,
        options?: unknown,
      ) => {
        const fullId = `${pluginId}.${id}`;
        return this.commandRegistry.register(
          fullId,
          handler,
          options as { title?: string; shortcut?: string },
        );
      },

      executeCommand: async <T = unknown>(
        id: string,
        ...args: unknown[]
      ) => {
        return this.commandRegistry.execute<T>(id, ...args);
      },

      getCommands: (filterInternal?: boolean) => {
        const commands = this.commandRegistry.getAll();
        if (filterInternal) {
          return commands.filter((c) => !c.startsWith('_'));
        }
        return commands;
      },

      registerTextEditorCommand: (
        id: string,
        callback: (editor: unknown, edit: unknown) => unknown,
      ) => {
        const fullId = `${pluginId}.${id}`;
        return this.commandRegistry.register(fullId, () => {
          callback(null, null);
        });
      },
    };
  }

  /**
   * 创建事件 API
   */
  private createEventAPI(pluginId: string): PluginEventAPI {
    return {
      on: (event: string, handler: EventHandler) => {
        return this.eventBus.on(event, handler);
      },

      once: (event: string, handler: EventHandler) => {
        return this.eventBus.once(event, handler);
      },

      emit: (event: string, ...args: unknown[]) => {
        this.eventBus.emit(event, ...args);
      },

      onFileOpen: (handler: (path: string) => void) => {
        return this.eventBus.on('file:open', handler as EventHandler);
      },

      onFileClose: (handler: (path: string) => void) => {
        return this.eventBus.on('file:close', handler as EventHandler);
      },

      onFileSave: (handler: (path: string) => void) => {
        return this.eventBus.on('file:save', handler as EventHandler);
      },

      onFileChange: (handler: (path: string, content: string) => void) => {
        return this.eventBus.on(
          'file:change',
          handler as EventHandler,
        );
      },

      onSelectionChange: (handler: (selection: unknown) => void) => {
        return this.eventBus.on(
          'selection:change',
          handler as EventHandler,
        );
      },

      onConfigurationChange: (handler: (config: unknown) => void) => {
        return this.eventBus.on(
          'configuration:change',
          handler as EventHandler,
        );
      },

      onPluginActivate: (handler: (pluginId: string) => void) => {
        return this.eventBus.on(
          'plugin:activate',
          handler as EventHandler,
        );
      },

      onPluginDeactivate: (handler: (pluginId: string) => void) => {
        return this.eventBus.on(
          'plugin:deactivate',
          handler as EventHandler,
        );
      },
    };
  }

  /**
   * 创建存储 API
   */
  private createStorageAPI(pluginId: string): PluginStorageAPI {
    return {
      get: <T = unknown>(key: string) => {
        return this.storage.get<T>(pluginId, key);
      },

      set: (key: string, value: unknown) => {
        this.storage.set(pluginId, key, value);
      },

      remove: (key: string) => {
        this.storage.remove(pluginId, key);
      },

      clear: () => {
        this.storage.clear(pluginId);
      },

      getGlobal: <T = unknown>(key: string) => {
        return this.storage.getGlobal<T>(key);
      },

      setGlobal: (key: string, value: unknown) => {
        this.storage.setGlobal(key, value);
      },

      getWorkspace: <T = unknown>(key: string) => {
        return this.storage.getWorkspace<T>(key);
      },

      setWorkspace: (key: string, value: unknown) => {
        this.storage.setWorkspace(key, value);
      },
    };
  }

  /**
   * 创建网络 API
   */
  private createNetworkAPI(pluginId: string): PluginNetworkAPI {
    return {
      fetch: async (url: string, options?: RequestInit) => {
        return fetch(url, options);
      },

      websocket: (url: string) => {
        return new WebSocket(url);
      },

      request: async (options: unknown) => {
        const opts = options as {
          url: string;
          method?: string;
          headers?: Record<string, string>;
          body?: unknown;
          timeout?: number;
        };

        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          opts.timeout || 30000,
        );

        try {
          const response = await fetch(opts.url, {
            method: opts.method || 'GET',
            headers: opts.headers,
            body: JSON.stringify(opts.body),
            signal: controller.signal,
          });

          clearTimeout(timeout);
          return response;
        } catch (error) {
          clearTimeout(timeout);
          throw error;
        }
      },
    };
  }

  /**
   * 创建工作区 API
   */
  private createWorkspaceAPI(pluginId: string): PluginWorkspaceAPI {
    return {
      getWorkspaceFolders: () => {
        return [];
      },

      getConfiguration: (section?: string) => {
        return {};
      },

      updateConfiguration: (
        section: string,
        value: unknown,
        target?: unknown,
      ) => {
        this.eventBus.emit('configuration:update', {
          section,
          value,
          target,
        });
      },

      onDidChangeConfiguration: (
        handler: (event: unknown) => void,
      ) => {
        return this.eventBus.on(
          'configuration:change',
          handler as EventHandler,
        );
      },

      createFileSystemWatcher: (
        globPattern: string,
        ignoreCreateEvents?: boolean,
        ignoreChangeEvents?: boolean,
        ignoreDeleteEvents?: boolean,
      ) => {
        const disposables: Disposable[] = [];

        if (!ignoreCreateEvents) {
          disposables.push(
            this.eventBus.on('file:create', () => {}),
          );
        }

        if (!ignoreChangeEvents) {
          disposables.push(
            this.eventBus.on('file:change', () => {}),
          );
        }

        if (!ignoreDeleteEvents) {
          disposables.push(
            this.eventBus.on('file:delete', () => {}),
          );
        }

        return {
          onDidCreate: (handler: (uri: string) => void) => {
            return this.eventBus.on(
              'file:create',
              handler as EventHandler,
            );
          },
          onDidChange: (handler: (uri: string) => void) => {
            return this.eventBus.on(
              'file:change',
              handler as EventHandler,
            );
          },
          onDidDelete: (handler: (uri: string) => void) => {
            return this.eventBus.on(
              'file:delete',
              handler as EventHandler,
            );
          },
          dispose: () => {
            disposables.forEach((d) => d.dispose());
          },
        };
      },
    };
  }

  /**
   * 创建日志 API
   */
  private createLoggerAPI(pluginId: string): PluginLoggerAPI {
    let currentLevel: LogLevel = 2; // INFO

    return {
      log: (...args: unknown[]) => {
        if (currentLevel <= 2) {
          logger.info(`[${pluginId}]`, ...args);
        }
      },

      info: (...args: unknown[]) => {
        if (currentLevel <= 2) {
          logger.info(`[${pluginId}]`, ...args);
        }
      },

      warn: (...args: unknown[]) => {
        if (currentLevel <= 3) {
          logger.warn(`[${pluginId}]`, ...args);
        }
      },

      error: (...args: unknown[]) => {
        if (currentLevel <= 4) {
          logger.error(`[${pluginId}]`, ...args);
        }
      },

      debug: (...args: unknown[]) => {
        if (currentLevel <= 1) {
          logger.debug(`[${pluginId}]`, ...args);
        }
      },

      trace: (...args: unknown[]) => {
        if (currentLevel <= 0) {
          console.trace(`[${pluginId}]`, ...args);
        }
      },

      setLevel: (level: LogLevel) => {
        currentLevel = level;
      },

      getLevel: () => currentLevel,
    };
  }

  /**
   * 获取事件总线
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * 获取命令注册表
   */
  getCommandRegistry(): CommandRegistry {
    return this.commandRegistry;
  }

  /**
   * 获取存储
   */
  getStorage(): PluginStorage {
    return this.storage;
  }

  /**
   * 清理所有资源
   */
  clear(): void {
    this.eventBus.clear();
    this.commandRegistry.clear();
    this.storage = new PluginStorage();
    this.pluginFiles.clear();
    this.pluginSelections.clear();
    this.activeFile = null;
  }
}
