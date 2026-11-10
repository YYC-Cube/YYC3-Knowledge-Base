/**
 * @file: PluginSystem.ts
 * @description: 插件系统架构 — 对齐 P2-插件-插件系统.md / P2-插件-插件开发.md，
 *              提供插件注册、生命周期管理、沙箱隔离、事件通信、插件市场
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-03-15
 * @updated: 2026-04-05
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: plugin,system,registry,lifecycle,sandbox,marketplace
 */

// ================================================================
// Plugin System — 插件系统核心
// ================================================================
//
// 对齐：YYC3-Design-Prompt/P2-高级功能/YYC3-P2-插件-插件系统.md
//       YYC3-Design-Prompt/P2-高级功能/YYC3-P2-插件-插件开发.md
//
// 架构：
//   ┌──────────────────────────────────┐
//   │         Plugin Manager           │
//   │  ┌──────┐ ┌──────┐ ┌──────┐    │
//   │  │ Reg  │ │ Life │ │ Sand │    │
//   │  │ istry│ │ cycle│ │  box │    │
//   │  └──────┘ └──────┘ └──────┘    │
//   └──────────────────────────────────┘
//        ↑ register   ↑ activate    ↑ API
//   ┌──────────────────────────────────┐
//   │      Plugin A  │  Plugin B      │
//   └──────────────────────────────────┘
//
// 插件 API Surface:
//   - editor: 读写文件、获取选中文本
//   - ui: 注册面板、菜单项、状态栏项
//   - ai: 调用 LLM、注册自定义 Provider
//   - commands: 注册命令、快捷键
//   - events: 监听/发射事件
// ================================================================

import type { PluginManifest, PluginInstance } from "./types";
import { logger } from "./services/Logger";

// ── Plugin Market Types ──

export interface PluginMarketItem {
  manifest: PluginManifest;
  downloads: number;
  rating: number;
  reviews: number;
  publishedAt: string;
  updatedAt: string;
  installed?: boolean;
  updateAvailable?: boolean;
}

export interface PluginMarketConfig {
  registryUrl: string;
  cacheTimeout?: number;
}

export interface PluginInstallResult {
  success: boolean;
  plugin?: PluginInstance;
  error?: string;
}

// ── Plugin Event System ──

type PluginEventHandler = (...args: unknown[]) => void;

class PluginEventBus {
  private handlers = new Map<string, Set<PluginEventHandler>>();

  on(event: string, handler: PluginEventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, ...args: unknown[]): void {
    this.handlers.get(event)?.forEach((h) => {
      try {
        h(...args);
      } catch (e) {
        logger.error(`[PluginSystem] Event handler error for "${event}":`, e);
      }
    });
  }

  removeAll(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
}

// ── Plugin API (sandbox) ──

export interface PluginEditorAPI {
  getActiveFile(): string | null;
  getFileContent(path: string): string | null;
  setFileContent(path: string, content: string): void;
  getSelectedText(): string | null;
  openFile(path: string): void;
  listFiles(): string[];
}

export interface PluginUIAPI {
  registerPanel(
    id: string,
    options: { title: string; icon?: string; render: () => unknown },
  ): void;
  registerMenuItem(
    menu: string,
    item: { label: string; action: () => void; shortcut?: string },
  ): void;
  registerStatusBarItem(options: {
    text: string;
    tooltip?: string;
    onClick?: () => void;
  }): void;
  showNotification(
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ): void;
}

export interface PluginAIAPI {
  chat(
    prompt: string,
    options?: { model?: string; temperature?: number },
  ): Promise<string>;
  registerProvider(
    id: string,
    config: { name: string; baseURL: string; models: string[] },
  ): void;
}

export interface PluginCommandAPI {
  registerCommand(
    id: string,
    handler: () => void,
    options?: { title: string; shortcut?: string },
  ): void;
  executeCommand(id: string): void;
}

export interface PluginAPI {
  editor: PluginEditorAPI;
  ui: PluginUIAPI;
  ai: PluginAIAPI;
  commands: PluginCommandAPI;
  events: {
    on: (event: string, handler: PluginEventHandler) => () => void;
    emit: (event: string, ...args: unknown[]) => void;
  };
  storage: {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
    remove: (key: string) => void;
  };
}

// ── Plugin Manager ──

export class PluginManager {
  private plugins = new Map<string, PluginInstance>();
  private eventBus = new PluginEventBus();
  private commands = new Map<string, () => void>();
  private panels = new Map<
    string,
    { title: string; icon?: string; render: () => unknown }
  >();
  private menuItems = new Map<
    string,
    Array<{ label: string; action: () => void; shortcut?: string }>
  >();
  private statusBarItems: Array<{
    text: string;
    tooltip?: string;
    onClick?: () => void;
  }> = [];
  private pluginStorage = new Map<string, Map<string, unknown>>();

  // ── Plugin Market ──
  private marketConfig: PluginMarketConfig | null = null;
  private marketCache: Map<string, PluginMarketItem> = new Map();
  private cacheTimestamp: number = 0;
  private installedPlugins: Map<string, { version: string; installedAt: number }> = new Map();

  constructor() {
    this.loadInstalledPlugins();
  }

  // ── Registration ──

  register(manifest: PluginManifest): boolean {
    if (this.plugins.has(manifest.id)) {
      logger.warn(
        `[PluginSystem] Plugin "${manifest.id}" is already registered`,
      );
      return false;
    }

    this.plugins.set(manifest.id, {
      manifest,
      status: "installed",
    });

    this.eventBus.emit("plugin:registered", manifest.id);
    return true;
  }

  unregister(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    if (plugin.status === "active") {
      this.deactivate(pluginId);
    }

    this.plugins.delete(pluginId);
    this.pluginStorage.delete(pluginId);
    this.eventBus.emit("plugin:unregistered", pluginId);
    return true;
  }

  // ── Lifecycle ──

  activate(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      logger.error('Plugin "${pluginId}" not found');
      return false;
    }

    if (plugin.status === "active") return true;

    try {
      // Create sandboxed API for this plugin
      const api = this.createPluginAPI(pluginId);

      // Execute plugin's main entry point (simulated)
      plugin.status = "active";
      plugin.exports = { api };
      this.plugins.set(pluginId, plugin);

      this.eventBus.emit("plugin:activated", pluginId);
      logger.warn('Plugin "${pluginId}" activated');
      return true;
    } catch (e) {
      plugin.status = "error";
      plugin.error = String(e);
      this.plugins.set(pluginId, plugin);
      logger.error(`[PluginSystem] Failed to activate "${pluginId}":`, e);
      return false;
    }
  }

  deactivate(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.status !== "active") return false;

    try {
      // Cleanup: remove plugin's registered commands, panels, etc.
      this.cleanupPlugin(pluginId);

      plugin.status = "disabled";
      plugin.exports = undefined;
      this.plugins.set(pluginId, plugin);

      this.eventBus.emit("plugin:deactivated", pluginId);
      logger.warn('Plugin "${pluginId}" deactivated');
      return true;
    } catch (e) {
      logger.error(`[PluginSystem] Failed to deactivate "${pluginId}":`, e);
      return false;
    }
  }

  // ── Query ──

  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  getActivePlugins(): PluginInstance[] {
    return this.getAllPlugins().filter((p) => p.status === "active");
  }

  getRegisteredCommands(): Map<string, () => void> {
    return new Map(this.commands);
  }

  getRegisteredPanels(): Map<
    string,
    { title: string; icon?: string; render: () => unknown }
  > {
    return new Map(this.panels);
  }

  getStatusBarItems(): typeof this.statusBarItems {
    return [...this.statusBarItems];
  }

  // ── Event Bus (global) ──

  on(event: string, handler: PluginEventHandler): () => void {
    return this.eventBus.on(event, handler);
  }

  emit(event: string, ...args: unknown[]): void {
    this.eventBus.emit(event, ...args);
  }

  // ── Execute command ──

  executeCommand(commandId: string): boolean {
    const handler = this.commands.get(commandId);
    if (!handler) return false;
    try {
      handler();
      return true;
    } catch (e) {
      logger.error(`[PluginSystem] Command "${commandId}" failed:`, e);
      return false;
    }
  }

  // ── Private Helpers ──

  private createPluginAPI(pluginId: string): PluginAPI {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const pluginSystem = this;

    // Ensure plugin storage exists
    if (!this.pluginStorage.has(pluginId)) {
      this.pluginStorage.set(pluginId, new Map());
    }

    return {
      editor: {
        getActiveFile: () => null, // Wired to FileStore at integration time
        getFileContent: () => null,
        setFileContent: () => {},
        getSelectedText: () => null,
        openFile: () => {},
        listFiles: () => [],
      },
      ui: {
        registerPanel: (id, options) => {
          pluginSystem.panels.set(`${pluginId}:${id}`, options);
        },
        registerMenuItem: (menu, item) => {
          const key = `${pluginId}:${menu}`;
          if (!pluginSystem.menuItems.has(key)) pluginSystem.menuItems.set(key, []);
          pluginSystem.menuItems.get(key)!.push(item);
        },
        registerStatusBarItem: (options) => {
          pluginSystem.statusBarItems.push(options);
        },
        showNotification: (message, type = "info") => {
          pluginSystem.eventBus.emit("notification", { message, type, pluginId });
        },
      },
      ai: {
        chat: async (prompt, options) => {
          // Stub: integrate with LLMService at runtime
          return `[PluginAI] Prompt received: "${prompt.slice(0, 50)}..." (model: ${options?.model || "default"})`;
        },
        registerProvider: (id, config) => {
          pluginSystem.eventBus.emit("ai:provider-registered", {
            pluginId,
            providerId: id,
            config,
          });
        },
      },
      commands: {
        registerCommand: (id, handler, options) => {
          const fullId = `${pluginId}.${id}`;
          pluginSystem.commands.set(fullId, handler);
          if (options?.title) {
            pluginSystem.eventBus.emit("command:registered", {
              id: fullId,
              ...options,
            });
          }
        },
        executeCommand: (id) => {
          pluginSystem.executeCommand(id);
        },
      },
      events: {
        on: (event, handler) => pluginSystem.eventBus.on(event, handler),
        emit: (event, ...args) => pluginSystem.eventBus.emit(event, ...args),
      },
      storage: {
        get: (key) => pluginSystem.pluginStorage.get(pluginId)?.get(key),
        set: (key, value) => pluginSystem.pluginStorage.get(pluginId)?.set(key, value),
        remove: (key) => pluginSystem.pluginStorage.get(pluginId)?.delete(key),
      },
    };
  }

  // ── Plugin Market ──

  configureMarket(config: PluginMarketConfig): void {
    this.marketConfig = config;
    logger.warn('[PluginMarket] Configured:', config.registryUrl);
  }

  async fetchMarketPlugins(forceRefresh = false): Promise<PluginMarketItem[]> {
    if (!this.marketConfig) {
      logger.warn('Not configured');
      return [];
    }

    const { registryUrl, cacheTimeout = 300000 } = this.marketConfig;
    const now = Date.now();

    if (!forceRefresh && this.marketCache.size > 0 && now - this.cacheTimestamp < cacheTimeout) {
      return Array.from(this.marketCache.values());
    }

    try {
      const response = await fetch(`${registryUrl}/plugins.json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch plugins: ${response.status}`);
      }

      const plugins: PluginMarketItem[] = await response.json();

      this.marketCache.clear();
      plugins.forEach(plugin => {
        plugin.installed = this.installedPlugins.has(plugin.manifest.id);
        if (plugin.installed) {
          const installed = this.installedPlugins.get(plugin.manifest.id)!;
          plugin.updateAvailable = this.compareVersions(plugin.manifest.version, installed.version) > 0;
        }
        this.marketCache.set(plugin.manifest.id, plugin);
      });

      this.cacheTimestamp = now;
      this.eventBus.emit('market:refreshed', plugins);

      return plugins;
    } catch (error) {
      logger.error('[PluginMarket] Failed to fetch plugins:', error);
      this.eventBus.emit('market:error', error);
      return Array.from(this.marketCache.values());
    }
  }

  async searchPlugins(query: string): Promise<PluginMarketItem[]> {
    const plugins = await this.fetchMarketPlugins();
    const lowerQuery = query.toLowerCase();

    return plugins.filter(plugin => 
      plugin.manifest.name.toLowerCase().includes(lowerQuery) ||
      plugin.manifest.description.toLowerCase().includes(lowerQuery) ||
      plugin.manifest.author.toLowerCase().includes(lowerQuery) ||
      plugin.manifest.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  async getPluginDetails(pluginId: string): Promise<PluginMarketItem | null> {
    if (this.marketCache.has(pluginId)) {
      return this.marketCache.get(pluginId) || null;
    }

    if (!this.marketConfig) return null;

    try {
      const response = await fetch(`${this.marketConfig.registryUrl}/plugins/${pluginId}.json`);
      if (!response.ok) return null;

      const plugin: PluginMarketItem = await response.json();
      plugin.installed = this.installedPlugins.has(pluginId);
      if (plugin.installed) {
        const installed = this.installedPlugins.get(pluginId)!;
        plugin.updateAvailable = this.compareVersions(plugin.manifest.version, installed.version) > 0;
      }

      this.marketCache.set(pluginId, plugin);
      return plugin;
    } catch (error) {
      logger.error('[PluginMarket] Failed to get plugin details:', error);
      return null;
    }
  }

  async installPlugin(pluginId: string): Promise<PluginInstallResult> {
    const marketItem = await this.getPluginDetails(pluginId);
    if (!marketItem) {
      return { success: false, error: 'Plugin not found in market' };
    }

    if (this.installedPlugins.has(pluginId)) {
      return { success: false, error: 'Plugin already installed' };
    }

    try {
      const manifest = marketItem.manifest;

      if (manifest.dependencies) {
        for (const [depId, depVersion] of Object.entries(manifest.dependencies)) {
          if (!this.installedPlugins.has(depId)) {
            logger.warn('Installing dependency: ${depId}@${depVersion}');
            const depResult = await this.installPlugin(depId);
            if (!depResult.success) {
              return { success: false, error: `Failed to install dependency: ${depId}` };
            }
          }
        }
      }

      this.register(manifest);
      this.installedPlugins.set(pluginId, {
        version: manifest.version,
        installedAt: Date.now(),
      });

      await this.saveInstalledPlugins();

      this.eventBus.emit('plugin:installed', { pluginId, version: manifest.version });

      const plugin = this.plugins.get(pluginId);
      return { success: true, plugin };
    } catch (error) {
      logger.error('[PluginMarket] Failed to install plugin:', error);
      return { success: false, error: String(error) };
    }
  }

  async uninstallPlugin(pluginId: string): Promise<boolean> {
    if (!this.installedPlugins.has(pluginId)) {
      logger.warn('[PluginMarket] Plugin not installed:', pluginId);
      return false;
    }

    const dependents = this.findDependents(pluginId);
    if (dependents.length > 0) {
      logger.error('[PluginMarket] Cannot uninstall: other plugins depend on it:', dependents);
      return false;
    }

    try {
      this.unregister(pluginId);
      this.installedPlugins.delete(pluginId);
      await this.saveInstalledPlugins();

      this.eventBus.emit('plugin:uninstalled', pluginId);
      return true;
    } catch (error) {
      logger.error('[PluginMarket] Failed to uninstall plugin:', error);
      return false;
    }
  }

  async updatePlugin(pluginId: string): Promise<PluginInstallResult> {
    const marketItem = await this.getPluginDetails(pluginId);
    if (!marketItem) {
      return { success: false, error: 'Plugin not found in market' };
    }

    const installed = this.installedPlugins.get(pluginId);
    if (!installed) {
      return { success: false, error: 'Plugin not installed' };
    }

    if (this.compareVersions(marketItem.manifest.version, installed.version) <= 0) {
      return { success: false, error: 'Already up to date' };
    }

    try {
      this.deactivate(pluginId);
      this.plugins.delete(pluginId);

      const manifest = marketItem.manifest;
      this.register(manifest);
      this.installedPlugins.set(pluginId, {
        version: manifest.version,
        installedAt: Date.now(),
      });

      await this.saveInstalledPlugins();

      this.eventBus.emit('plugin:updated', { pluginId, version: manifest.version });

      const plugin = this.plugins.get(pluginId);
      return { success: true, plugin };
    } catch (error) {
      logger.error('[PluginMarket] Failed to update plugin:', error);
      return { success: false, error: String(error) };
    }
  }

  getInstalledPlugins(): Array<{ id: string; version: string; installedAt: number }> {
    return Array.from(this.installedPlugins.entries()).map(([id, data]) => ({
      id,
      ...data,
    }));
  }

  getAvailableUpdates(): Array<{ id: string; currentVersion: string; latestVersion: string }> {
    const updates: Array<{ id: string; currentVersion: string; latestVersion: string }> = [];

    for (const [id, installed] of this.installedPlugins) {
      const marketItem = this.marketCache.get(id);
      if (marketItem && this.compareVersions(marketItem.manifest.version, installed.version) > 0) {
        updates.push({
          id,
          currentVersion: installed.version,
          latestVersion: marketItem.manifest.version,
        });
      }
    }

    return updates;
  }

  // ── Private Market Helpers ──

  private findDependents(pluginId: string): string[] {
    const dependents: string[] = [];

    for (const [id, installed] of this.installedPlugins) {
      const plugin = this.plugins.get(id);
      if (plugin?.manifest.dependencies?.[pluginId]) {
        dependents.push(id);
      }
    }

    return dependents;
  }

  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;
      if (partA > partB) return 1;
      if (partA < partB) return -1;
    }

    return 0;
  }

  private async saveInstalledPlugins(): Promise<void> {
    try {
      const data = Object.fromEntries(this.installedPlugins);
      localStorage.setItem('yyc3-installed-plugins', JSON.stringify(data));
    } catch (error) {
      logger.error('[PluginMarket] Failed to save installed plugins:', error);
    }
  }

  private loadInstalledPlugins(): void {
    try {
      const data = localStorage.getItem('yyc3-installed-plugins');
      if (data) {
        const parsed = JSON.parse(data);
        for (const [id, info] of Object.entries(parsed)) {
          this.installedPlugins.set(id, info as { version: string; installedAt: number });
        }
      }
    } catch (error) {
      logger.error('[PluginMarket] Failed to load installed plugins:', error);
    }
  }

  private cleanupPlugin(pluginId: string): void {
    // Remove commands
    for (const [key] of this.commands) {
      if (key.startsWith(`${pluginId}.`)) this.commands.delete(key);
    }
    // Remove panels
    for (const [key] of this.panels) {
      if (key.startsWith(`${pluginId}:`)) this.panels.delete(key);
    }
    // Remove menu items
    for (const [key] of this.menuItems) {
      if (key.startsWith(`${pluginId}:`)) this.menuItems.delete(key);
    }
  }
}

// ── Singleton instance ──
export const pluginManager = new PluginManager();

// ── Built-in plugin templates ──

export const BUILTIN_PLUGIN_TEMPLATES: PluginManifest[] = [
  {
    id: "yyc3.code-formatter",
    name: "Code Formatter",
    version: "1.0.0",
    description: "自动格式化代码 (Prettier 集成)",
    author: "YYC³ Team",
    main: "index.ts",
    permissions: ["editor.read", "editor.write"],
    activationEvents: ["onCommand:format"],
  },
  {
    id: "yyc3.git-lens",
    name: "Git Lens",
    version: "1.0.0",
    description: "增强 Git 集成，内联 Blame 显示",
    author: "YYC³ Team",
    main: "index.ts",
    permissions: ["editor.read", "git.read"],
    activationEvents: ["onFileOpen"],
  },
  {
    id: "yyc3.ai-autocomplete",
    name: "AI Autocomplete",
    version: "1.0.0",
    description: "AI 驱动的代码自动补全",
    author: "YYC³ Team",
    main: "index.ts",
    permissions: ["editor.read", "ai.chat"],
    activationEvents: ["onEditorType"],
  },
  {
    id: "yyc3.theme-pack",
    name: "Theme Pack",
    version: "1.0.0",
    description: "额外主题包 (Dracula, Nord, Solarized 等)",
    author: "YYC³ Team",
    main: "index.ts",
    permissions: ["ui.theme"],
    activationEvents: ["onStartup"],
  },
];
