/**
 * @file: PluginTypes.ts
 * @description: 插件系统类型定义 - 定义插件接口、扩展点、生命周期、依赖管理
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: plugin,types,extension,lifecycle,dependency
 */

// ================================================================
// 插件系统类型定义
// ================================================================

// ── 插件生命周期 ──

/**
 * 插件生命周期阶段
 */
export enum PluginLifecycleStage {
  /** 已安装但未加载 */
  INSTALLED = 'installed',
  /** 正在加载 */
  LOADING = 'loading',
  /** 已加载但未激活 */
  LOADED = 'loaded',
  /** 正在激活 */
  ACTIVATING = 'activating',
  /** 已激活，可正常使用 */
  ACTIVE = 'active',
  /** 正在停用 */
  DEACTIVATING = 'deactivating',
  /** 已停用 */
  DISABLED = 'disabled',
  /** 错误状态 */
  ERROR = 'error',
  /** 正在卸载 */
  UNLOADING = 'unloading',
}

/**
 * 插件状态
 */
export interface PluginState {
  /** 插件ID */
  id: string;
  /** 当前生命周期阶段 */
  stage: PluginLifecycleStage;
  /** 错误信息 */
  error?: PluginError;
  /** 激活时间 */
  activatedAt?: number;
  /** 最后使用时间 */
  lastUsedAt?: number;
  /** 使用次数 */
  usageCount: number;
  /** 性能指标 */
  performance?: PluginPerformanceMetrics;
}

// ── 插件清单（Manifest） ──

/**
 * 插件清单
 */
export interface PluginManifest {
  // 基本信息
  id: string;
  name: string;
  nameEn?: string;
  version: string;
  description: string;
  descriptionEn?: string;
  author: string;
  homepage?: string;
  license?: string;
  repository?: string;

  // 入口和配置
  main?: string;
  entry?: string;
  icon?: string;
  category?: PluginCategory;
  tags?: string[];

  // 权限和依赖
  permissions?: PluginPermission[];
  dependencies?: PluginDependency[];
  optionalDependencies?: PluginDependency[];
  peerDependencies?: PluginDependency[];

  // 激活配置
  activationEvents?: PluginActivationEvent[];
  contributes?: PluginContribution;

  // 兼容性
  engines?: {
    node?: string;
    vscode?: string;
    yyc3?: string;
  };

  // 生命周期钩子
  activate?: (context: PluginContext) => Promise<void> | void;
  deactivate?: () => Promise<void> | void;
}

/**
 * 插件分类
 */
export enum PluginCategory {
  EDITOR = 'editor',
  LANGUAGES = 'languages',
  DEBUGGERS = 'debuggers',
  SNIPPETS = 'snippets',
  THEMES = 'themes',
  PRODUCTIVITY = 'productivity',
  AI = 'ai',
  COLLABORATION = 'collaboration',
  OTHER = 'other',
}

// ── 插件权限 ──

/**
 * 插件权限
 */
export enum PluginPermission {
  // 文件系统权限
  FILE_READ = 'file.read',
  FILE_WRITE = 'file.write',
  FILE_DELETE = 'file.delete',

  // 编辑器权限
  EDITOR_READ = 'editor.read',
  EDITOR_WRITE = 'editor.write',

  // UI权限
  UI_PANEL = 'ui.panel',
  UI_MENU = 'ui.menu',
  UI_STATUS_BAR = 'ui.statusBar',
  UI_NOTIFICATION = 'ui.notification',
  UI_THEME = 'ui.theme',

  // AI权限
  AI_CHAT = 'ai.chat',
  AI_PROVIDER = 'ai.provider',

  // 网络权限
  NETWORK_REQUEST = 'network.request',
  NETWORK_WEBSOCKET = 'network.websocket',

  // 系统权限
  SYSTEM_COMMAND = 'system.command',
  SYSTEM_CLIPBOARD = 'system.clipboard',
  SYSTEM_STORAGE = 'system.storage',

  // 数据权限
  DATA_READ = 'data.read',
  DATA_WRITE = 'data.write',

  // 插件权限
  PLUGIN_MANAGE = 'plugin.manage',
}

// ── 插件依赖 ──

/**
 * 插件依赖
 */
export interface PluginDependency {
  /** 依赖ID */
  id: string;
  /** 版本范围（遵循 semver） */
  version: string;
  /** 是否必需 */
  required?: boolean;
  /** 加载顺序（数值越小越先加载） */
  loadOrder?: number;
}

/**
 * 依赖图
 */
export interface DependencyGraph {
  /** 依赖节点 */
  nodes: Map<string, DependencyNode>;
  /** 拓扑排序结果 */
  sortedOrder: string[];
  /** 循环依赖 */
  circularDependencies: string[][];
}

/**
 * 依赖节点
 */
export interface DependencyNode {
  /** 插件ID */
  id: string;
  /** 依赖该插件的其他插件 */
  dependents: Set<string>;
  /** 该插件依赖的其他插件 */
  dependencies: Set<string>;
}

// ── 插件激活事件 ──

/**
 * 插件激活事件
 */
export type PluginActivationEvent =
  | { type: 'onStartup' }
  | { type: 'onCommand'; command: string }
  | { type: 'onFileOpen'; pattern?: string }
  | { type: 'onLanguage'; languageId: string }
  | { type: 'onView'; viewId: string }
  | { type: 'onFileSystem'; scheme: string }
  | { type: 'workspaceContains'; pattern: string }
  | { type: 'onAuthenticationRequest' };

// ── 插件贡献（扩展点） ──

/**
 * 插件贡献
 */
export interface PluginContribution {
  /** 命令 */
  commands?: PluginCommand[];
  /** 菜单项 */
  menus?: Record<string, PluginMenuItem[]>;
  /** 视图 */
  views?: PluginView[];
  /** 设置 */
  configuration?: PluginConfiguration;
  /** 语言 */
  languages?: PluginLanguage[];
  /** 语法高亮 */
  grammars?: PluginGrammar[];
  /** 主题 */
  themes?: PluginTheme[];
  /** 图标 */
  icons?: PluginIconTheme[];
  /** 快捷键 */
  keybindings?: PluginKeybinding[];
  /** 代码片段 */
  snippets?: PluginSnippet[];
}

/**
 * 插件命令
 */
export interface PluginCommand {
  command: string;
  title: string;
  category?: string;
  icon?: string;
  enablement?: string;
}

/**
 * 插件菜单项
 */
export interface PluginMenuItem {
  command: string;
  group?: string;
  when?: string;
  order?: number;
  alt?: string;
}

/**
 * 插件视图
 */
export interface PluginView {
  id: string;
  name: string;
  when?: string;
  icon?: string;
  contextualTitle?: string;
}

/**
 * 插件配置
 */
export interface PluginConfiguration {
  title: string;
  properties: Record<string, PluginConfigurationProperty>;
}

/**
 * 插件配置属性
 */
export interface PluginConfigurationProperty {
  type: string;
  default?: unknown;
  description: string;
  enum?: string[];
  enumDescriptions?: string[];
  scope?: 'window' | 'resource' | 'machine';
}

/**
 * 插件语言
 */
export interface PluginLanguage {
  id: string;
  extensions: string[];
  aliases?: string[];
  filenames?: string[];
  firstLine?: string;
}

/**
 * 插件语法
 */
export interface PluginGrammar {
  language: string;
  scopeName: string;
  path: string;
  embeddedLanguages?: Record<string, string>;
}

/**
 * 插件主题
 */
export interface PluginTheme {
  id: string;
  label: string;
  uiTheme: 'vs' | 'vs-dark' | 'hc-black';
  path: string;
}

/**
 * 插件图标主题
 */
export interface PluginIconTheme {
  id: string;
  label: string;
  path: string;
}

/**
 * 插件快捷键
 */
export interface PluginKeybinding {
  command: string;
  key: string;
  mac?: string;
  linux?: string;
  win?: string;
  when?: string;
}

/**
 * 插件代码片段
 */
export interface PluginSnippet {
  language: string;
  path: string;
}

// ── 插件上下文（Context） ──

/**
 * 插件上下文
 */
export interface PluginContext {
  /** 插件清单 */
  manifest: PluginManifest;
  /** 插件状态 */
  state: PluginState;

  // 订阅管理
  subscriptions: Disposable[];

  // API访问
  editor: PluginEditorAPI;
  ui: PluginUIAPI;
  ai: PluginAIAPI;
  commands: PluginCommandAPI;
  events: PluginEventAPI;
  storage: PluginStorageAPI;
  network: PluginNetworkAPI;
  workspace: PluginWorkspaceAPI;

  // 工具函数
  logger: PluginLoggerAPI;

  // 扩展点注册
  registerExtensionPoint: (point: ExtensionPoint) => void;
  getExtensionPoint: <T = unknown>(id: string) => ExtensionPoint<T> | undefined;
}

/**
 * 可释放资源
 */
export interface Disposable {
  dispose(): void;
}

// ── 插件API ──

/**
 * 编辑器API
 */
export interface PluginEditorAPI {
  getActiveFile(): string | null;
  getFileContent(path: string): Promise<string | null>;
  setFileContent(path: string, content: string): Promise<void>;
  getSelectedText(): string | null;
  openFile(path: string): Promise<void>;
  listFiles(): string[];
  createFile(path: string, content?: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  renameFile(oldPath: string, newPath: string): Promise<void>;
  saveFile(path?: string): Promise<void>;

  // 光标和选择
  getCursorPosition(): { line: number; column: number } | null;
  setCursorPosition(line: number, column: number): void;
  getSelection(): { start: number; end: number } | null;
  setSelection(start: number, end: number): void;

  // 编辑器配置
  getConfiguration(): Record<string, unknown>;
  updateConfiguration(config: Record<string, unknown>): void;
}

/**
 * UI API
 */
export interface PluginUIAPI {
  registerPanel(id: string, options: PanelOptions): void;
  unregisterPanel(id: string): void;

  registerMenuItem(menu: string, item: MenuItemOptions): void;
  unregisterMenuItem(menu: string, command: string): void;

  registerStatusBarItem(options: StatusBarItemOptions): void;
  unregisterStatusBarItem(id: string): void;

  showNotification(
    message: string,
    type?: 'info' | 'success' | 'warning' | 'error',
    options?: NotificationOptions,
  ): void;

  showPanel(options: ShowPanelOptions): void;
  hidePanel(id: string): void;

  showModal(options: ModalOptions): Promise<boolean>;

  showQuickPick<T extends QuickPickItem>(
    items: T[],
    options?: QuickPickOptions,
  ): Promise<T | undefined>;

  showInputBox(options: InputBoxOptions): Promise<string | undefined>;
}

/**
 * 面板选项
 */
export interface PanelOptions {
  title: string;
  icon?: string;
  position?: 'left' | 'right' | 'bottom' | 'center';
  width?: number;
  height?: number;
  render: () => unknown;
}

/**
 * 菜单项选项
 */
export interface MenuItemOptions {
  label: string;
  command?: string;
  action?: () => void;
  shortcut?: string;
  icon?: string;
  group?: string;
  order?: number;
  when?: string;
  enabled?: boolean;
}

/**
 * 状态栏项选项
 */
export interface StatusBarItemOptions {
  id: string;
  text: string;
  tooltip?: string;
  icon?: string;
  command?: string;
  onClick?: () => void;
  alignment?: 'left' | 'right';
  priority?: number;
}

/**
 * 通知选项
 */
export interface NotificationOptions {
  duration?: number;
  actions?: Array<{ label: string; action: () => void }>;
  modal?: boolean;
}

/**
 * 显示面板选项
 */
export interface ShowPanelOptions {
  title: string;
  content: string | (() => unknown);
  width?: number;
  height?: number;
  position?: 'left' | 'right' | 'bottom' | 'center' | 'modal';
  closable?: boolean;
  resizable?: boolean;
}

/**
 * 模态框选项
 */
export interface ModalOptions {
  title: string;
  message: string;
  detail?: string;
  buttons?: Array<{ label: string; result: boolean }>;
  type?: 'info' | 'warning' | 'error' | 'question';
}

/**
 * 快速选择项
 */
export interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
  picked?: boolean;
}

/**
 * 快速选择选项
 */
export interface QuickPickOptions {
  placeHolder?: string;
  matchOnDescription?: boolean;
  matchOnDetail?: boolean;
  ignoreFocusOut?: boolean;
  canPickMany?: boolean;
}

/**
 * 输入框选项
 */
export interface InputBoxOptions {
  prompt?: string;
  placeHolder?: string;
  value?: string;
  valueSelection?: [number, number];
  password?: boolean;
  ignoreFocusOut?: boolean;
  validateInput?: (value: string) => string | undefined;
}

/**
 * AI API
 */
export interface PluginAIAPI {
  chat(
    prompt: string,
    options?: AIChatOptions,
  ): Promise<string>;

  complete(
    prompt: string,
    options?: AICompleteOptions,
  ): Promise<string>;

  embed(text: string): Promise<number[]>;

  registerProvider(
    id: string,
    config: AIProviderConfig,
  ): void;

  unregisterProvider(id: string): void;

  getProviders(): AIProviderInfo[];

  setDefaultProvider(id: string): void;
}

/**
 * AI聊天选项
 */
export interface AIChatOptions {
  model?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * AI补全选项
 */
export interface AICompleteOptions {
  model?: string;
  provider?: string;
  maxTokens?: number;
  stop?: string[];
}

/**
 * AI提供者配置
 */
export interface AIProviderConfig {
  name: string;
  baseURL: string;
  models: string[];
  defaultModel?: string;
  apiKey?: string;
}

/**
 * AI提供者信息
 */
export interface AIProviderInfo {
  id: string;
  name: string;
  models: string[];
  isDefault: boolean;
}

/**
 * 命令API
 */
export interface PluginCommandAPI {
  registerCommand(
    id: string,
    handler: (...args: unknown[]) => unknown,
    options?: CommandOptions,
  ): Disposable;

  executeCommand<T = unknown>(
    id: string,
    ...args: unknown[]
  ): Promise<T>;

  getCommands(filterInternal?: boolean): string[];

  registerTextEditorCommand(
    id: string,
    callback: (editor: unknown, edit: unknown) => unknown,
  ): Disposable;
}

/**
 * 命令选项
 */
export interface CommandOptions {
  title?: string;
  shortcut?: string;
  icon?: string;
  category?: string;
  enablement?: string;
}

/**
 * 事件API
 */
export interface PluginEventAPI {
  on(event: string, handler: EventHandler): Disposable;
  once(event: string, handler: EventHandler): Disposable;
  emit(event: string, ...args: unknown[]): void;

  // 内置事件
  onFileOpen: (handler: (path: string) => void) => Disposable;
  onFileClose: (handler: (path: string) => void) => Disposable;
  onFileSave: (handler: (path: string) => void) => Disposable;
  onFileChange: (handler: (path: string, content: string) => void) => Disposable;
  onSelectionChange: (handler: (selection: unknown) => void) => Disposable;
  onConfigurationChange: (handler: (config: unknown) => void) => Disposable;
  onPluginActivate: (handler: (pluginId: string) => void) => Disposable;
  onPluginDeactivate: (handler: (pluginId: string) => void) => Disposable;
}

/**
 * 事件处理器
 */
export type EventHandler = (...args: unknown[]) => void;

/**
 * 存储API
 */
export interface PluginStorageAPI {
  get<T = unknown>(key: string): T | undefined;
  set(key: string, value: unknown): void;
  remove(key: string): void;
  clear(): void;

  // 全局存储
  getGlobal<T = unknown>(key: string): T | undefined;
  setGlobal(key: string, value: unknown): void;

  // 工作区存储
  getWorkspace<T = unknown>(key: string): T | undefined;
  setWorkspace(key: string, value: unknown): void;
}

/**
 * 网络API
 */
export interface PluginNetworkAPI {
  fetch(url: string, options?: RequestInit): Promise<Response>;
  websocket(url: string): WebSocket;
  request(options: RequestOptions): Promise<Response>;
}

/**
 * 请求选项
 */
export interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

/**
 * 工作区API
 */
export interface PluginWorkspaceAPI {
  getWorkspaceFolders(): WorkspaceFolder[];
  getConfiguration(section?: string): unknown;
  updateConfiguration(
    section: string,
    value: unknown,
    target?: ConfigurationTarget,
  ): void;
  onDidChangeConfiguration: (
    handler: (event: ConfigurationChangeEvent) => void,
  ) => Disposable;

  createFileSystemWatcher(
    globPattern: string,
    ignoreCreateEvents?: boolean,
    ignoreChangeEvents?: boolean,
    ignoreDeleteEvents?: boolean,
  ): FileSystemWatcher;
}

/**
 * 工作区文件夹
 */
export interface WorkspaceFolder {
  uri: string;
  name: string;
  index: number;
}

/**
 * 配置目标
 */
export enum ConfigurationTarget {
  GLOBAL = 1,
  WORKSPACE,
  WORKSPACE_FOLDER,
}

/**
 * 配置变更事件
 */
export interface ConfigurationChangeEvent {
  affectsConfiguration(section: string): boolean;
}

/**
 * 文件系统监视器
 */
export interface FileSystemWatcher {
  onDidCreate: (handler: (uri: string) => void) => Disposable;
  onDidChange: (handler: (uri: string) => void) => Disposable;
  onDidDelete: (handler: (uri: string) => void) => Disposable;
  dispose(): void;
}

/**
 * 日志API
 */
export interface PluginLoggerAPI {
  log(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  trace(...args: unknown[]): void;

  // 日志级别
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
}

/**
 * 日志级别
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARNING = 3,
  ERROR = 4,
  CRITICAL = 5,
  OFF = 6,
}

// ── 扩展点（Extension Point） ──

/**
 * 扩展点
 */
export interface ExtensionPoint<T = unknown> {
  /** 扩展点ID */
  id: string;
  /** 扩展点名称 */
  name: string;
  /** 扩展点描述 */
  description?: string;
  /** 扩展点类型 */
  type: ExtensionPointType;
  /** 扩展点模式（用于验证） */
  schema?: Record<string, unknown>;
  /** 扩展点处理器 */
  handler?: ExtensionPointHandler<T>;
  /** 已注册的扩展 */
  extensions: Map<string, T>;
}

/**
 * 扩展点类型
 */
export enum ExtensionPointType {
  COMMAND = 'command',
  VIEW = 'view',
  MENU = 'menu',
  THEME = 'theme',
  LANGUAGE = 'language',
  GRAMMAR = 'grammar',
  SNIPPET = 'snippet',
  STATUS_BAR_ITEM = 'statusBarItem',
  PANEL = 'panel',
  PROVIDER = 'provider',
  CUSTOM = 'custom',
}

/**
 * 扩展点处理器
 */
export type ExtensionPointHandler<T> = (
  extension: T,
  pluginId: string,
) => void | Promise<void>;

// ── 插件错误 ──

/**
 * 插件错误
 */
export interface PluginError {
  code: PluginErrorCode;
  message: string;
  stack?: string;
  timestamp: number;
  recoverable: boolean;
}

/**
 * 插件错误码
 */
export enum PluginErrorCode {
  // 加载错误
  LOAD_FAILED = 'LOAD_FAILED',
  INVALID_MANIFEST = 'INVALID_MANIFEST',
  MISSING_ENTRY = 'MISSING_ENTRY',
  SYNTAX_ERROR = 'SYNTAX_ERROR',

  // 激活错误
  ACTIVATION_FAILED = 'ACTIVATION_FAILED',
  DEPENDENCY_MISSING = 'DEPENDENCY_MISSING',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // 运行时错误
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  API_MISUSE = 'API_MISUSE',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',

  // 卸载错误
  DEACTIVATION_FAILED = 'DEACTIVATION_FAILED',
  UNLOAD_FAILED = 'UNLOAD_FAILED',

  // 签名错误
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  SIGNATURE_MISSING = 'SIGNATURE_MISSING',
}

// ── 插件性能指标 ──

/**
 * 插件性能指标
 */
export interface PluginPerformanceMetrics {
  /** 加载时间（ms） */
  loadTime: number;
  /** 激活时间（ms） */
  activationTime: number;
  /** 内存使用（MB） */
  memoryUsage: number;
  /** CPU使用率（%） */
  cpuUsage: number;
  /** 事件处理延迟（ms） */
  eventLatency: number;
  /** API调用次数 */
  apiCallCount: number;
  /** 错误次数 */
  errorCount: number;
  /** 最后更新时间 */
  lastUpdated: number;
}

// ── 插件沙箱选项 ──

/**
 * 插件沙箱选项
 */
export interface PluginSandboxOptions {
  /** 启用隔离 */
  enabled: boolean;
  /** 全局变量白名单 */
  globals?: string[];
  /** 模块白名单 */
  modules?: string[];
  /** 网络请求限制 */
  networkWhitelist?: string[];
  /** 超时时间（ms） */
  timeout?: number;
  /** 内存限制（MB） */
  memoryLimit?: number;
  /** CPU限制（百分比） */
  cpuLimit?: number;
}

// ── 插件签名 ──

/**
 * 插件签名
 */
export interface PluginSignature {
  /** 签名算法 */
  algorithm: 'rsa-sha256' | 'ecdsa-sha256';
  /** 签名值 */
  signature: string;
  /** 签名证书 */
  certificate: string;
  /** 时间戳 */
  timestamp: number;
  /** 颁发者 */
  issuer: string;
}

/**
 * 插件签名验证结果
 */
export interface PluginSignatureVerificationResult {
  valid: boolean;
  trusted: boolean;
  issuer?: string;
  error?: string;
}

// ── 插件加载结果 ──

/**
 * 插件加载结果
 */
export interface PluginLoadResult {
  success: boolean;
  plugin?: PluginInstance;
  error?: PluginError;
  warnings?: string[];
}

/**
 * 插件实例
 */
export interface PluginInstance {
  manifest: PluginManifest;
  state: PluginState;
  exports?: Record<string, unknown>;
  context?: PluginContext;
}

// ── 插件管理器配置 ──

/**
 * 插件管理器配置
 */
export interface PluginManagerConfig {
  /** 插件目录 */
  pluginDir: string;
  /** 启用签名验证 */
  verifySignatures: boolean;
  /** 沙箱配置 */
  sandbox: PluginSandboxOptions;
  /** 最大插件数 */
  maxPlugins: number;
  /** 自动激活延迟（ms） */
  autoActivateDelay: number;
  /** 性能监控间隔（ms） */
  performanceMonitorInterval: number;
  /** 启用热重载 */
  enableHotReload: boolean;
  /** 日志级别 */
  logLevel: LogLevel;
}
