/**
 * @file: interfaces/index.ts
 * @description: 核心抽象接口层 — 定义组件间解耦的契约接口
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-01
 * @updated: 2026-04-01
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: interfaces,abstraction,di,contracts
 */

// ================================================================
// 核心抽象接口 — 实现组件间零第三方依赖
// ================================================================
// 设计原则：
// 1. 接口只依赖 TypeScript 内置类型
// 2. 不引入任何第三方库类型
// 3. 使用泛型提供类型安全
// 4. 支持同步和异步操作
// ================================================================

// ── 基础类型 ──

/**
 * 可释放资源
 */
export interface IDisposable {
  dispose(): void;
}

/**
 * 异步可释放资源
 */
export interface IAsyncDisposable {
  dispose(): Promise<void>;
}

/**
 * 事件订阅
 */
export interface ISubscription extends IDisposable {
  readonly isActive: boolean;
  unsubscribe(): void;
}

/**
 * 事件发射器
 */
export interface IEventEmitter<T> {
  subscribe(callback: (data: T) => void): ISubscription;
  emit(data: T): void;
  readonly listenerCount: number;
}

/**
 * 可观察对象
 */
export interface IObservable<T> {
  subscribe(callback: (value: T) => void): ISubscription;
  getValue(): T;
  setValue(value: T): void;
}

// ── 存储接口 ──

/**
 * 存储适配器接口 — 抽象化存储层
 */
export interface IStorageAdapter extends IAsyncDisposable {
  readonly name: string;
  readonly isReady: boolean;

  init(): Promise<void>;

  saveFile(path: string, content: string): Promise<void>;
  loadFile(path: string): Promise<string | null>;
  deleteFile(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  listFiles(pattern?: string): Promise<string[]>;

  saveObject<T>(key: string, value: T): Promise<void>;
  loadObject<T>(key: string): Promise<T | null>;
  deleteObject(key: string): Promise<void>;

  clear(): Promise<void>;
  getStorageSize(): Promise<number>;
}

/**
 * 存储配置
 */
export interface StorageConfig {
  dbName: string;
  dbVersion?: number;
  maxStorageSize?: number;
}

// ── 快照接口 ──

/**
 * 快照文件
 */
export interface ISnapshotFile {
  path: string;
  content: string;
  hash?: string;
}

/**
 * 快照元数据
 */
export interface ISnapshotMetadata {
  id: string;
  label: string;
  description?: string;
  createdAt: number;
  fileCount: number;
  totalSize: number;
  tags?: string[];
}

/**
 * 快照
 */
export interface ISnapshot extends ISnapshotMetadata {
  files: ISnapshotFile[];
}

/**
 * 快照差异
 */
export interface ISnapshotDiff {
  added: string[];
  removed: string[];
  modified: string[];
  unchanged: string[];
}

/**
 * 快照管理器接口
 */
export interface ISnapshotManager extends IDisposable {
  readonly snapshotCount: number;
  readonly maxSnapshots: number;

  createSnapshot(label: string, files: ISnapshotFile[], description?: string): ISnapshot;
  getSnapshot(id: string): ISnapshot | null;
  listSnapshots(): ISnapshotMetadata[];
  deleteSnapshot(id: string): boolean;
  restoreSnapshot(id: string, callback: (files: ISnapshotFile[]) => void): boolean;
  compareSnapshots(id1: string, id2: string): ISnapshotDiff;

  onSnapshotCreated(callback: (snapshot: ISnapshot) => void): ISubscription;
  onSnapshotDeleted(callback: (id: string) => void): ISubscription;
}

/**
 * 快照配置
 */
export interface SnapshotConfig {
  maxSnapshots: number;
  autoSnapshot?: boolean;
  autoSnapshotInterval?: number;
  storageAdapter?: IStorageAdapter;
}

// ── 主题接口 ──

/**
 * 主题令牌
 */
export interface IThemeTokens {
  colors: Record<string, string>;
  fonts: Record<string, string>;
  spacing: Record<string, string>;
  radii: Record<string, string>;
  shadows: Record<string, string>;
}

/**
 * 主题
 */
export interface ITheme {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  tokens: IThemeTokens;
}

/**
 * 主题管理器接口
 */
export interface IThemeManager extends IDisposable {
  readonly currentTheme: ITheme;
  readonly availableThemes: ITheme[];

  setTheme(themeId: string): void;
  getTheme(themeId: string): ITheme | null;
  registerTheme(theme: ITheme): void;
  unregisterTheme(themeId: string): boolean;

  getTokenValue(tokenPath: string): string | undefined;
  resolveToken(token: string): string;

  onThemeChange(callback: (theme: ITheme) => void): ISubscription;
}

/**
 * 主题配置
 */
export interface ThemeConfig {
  defaultThemeId: string;
  customThemes?: ITheme[];
  persistTheme?: boolean;
  storageKey?: string;
}

// ── 预览接口 ──

/**
 * 预览模式
 */
export type PreviewMode = 'realtime' | 'delayed' | 'manual';

/**
 * 预览状态
 */
export interface IPreviewState {
  mode: PreviewMode;
  isUpdating: boolean;
  lastUpdateTime: number;
  pendingUpdate: boolean;
}

/**
 * 预览控制器接口
 */
export interface IPreviewController extends IDisposable {
  readonly state: IPreviewState;

  setMode(mode: PreviewMode): void;
  handleFileChange(): void;
  triggerImmediateUpdate(): void;

  onStateChange(callback: (state: IPreviewState) => void): ISubscription;
  onUpdate(callback: () => void): ISubscription;
}

/**
 * 预览配置
 */
export interface PreviewConfig {
  defaultMode: PreviewMode;
  delayMs: number;
  onUpdate?: () => void;
}

// ── 代码验证接口 ──

/**
 * 验证结果
 */
export interface IValidationResult {
  isValid: boolean;
  errors: IValidationError[];
  warnings: IValidationWarning[];
}

/**
 * 验证错误
 */
export interface IValidationError {
  line: number;
  column: number;
  message: string;
  code: string;
  severity: 'error';
}

/**
 * 验证警告
 */
export interface IValidationWarning {
  line: number;
  column: number;
  message: string;
  code: string;
  severity: 'warning';
}

/**
 * 代码验证器接口
 */
export interface ICodeValidator extends IDisposable {
  validate(code: string, language: string): IValidationResult;
  validateFile(path: string, content: string): IValidationResult;

  addRule(rule: IValidationRule): void;
  removeRule(ruleId: string): boolean;
  getRules(): IValidationRule[];
}

/**
 * 验证规则
 */
export interface IValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning';
  check(code: string, language: string): IValidationError[] | IValidationWarning[];
}

// ── 事件总线接口 ──

/**
 * 事件处理器
 */
export type EventHandler<T = unknown> = (event: T) => void;

/**
 * 事件总线接口
 */
export interface IEventBus extends IDisposable {
  publish<T>(eventType: string, event: T): void;
  subscribe<T>(eventType: string, handler: EventHandler<T>): ISubscription;
  once<T>(eventType: string, handler: EventHandler<T>): ISubscription;

  readonly eventTypes: string[];
  getListenerCount(eventType: string): number;
}

// ── 日志接口 ──

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 日志条目
 */
export interface ILogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
  error?: Error;
}

/**
 * 日志器接口
 */
export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;

  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;

  onLog(callback: (entry: ILogEntry) => void): ISubscription;
}

/**
 * 日志配置
 */
export interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  includeTimestamp?: boolean;
  includeContext?: boolean;
}

// ── 插件接口 ──

/**
 * 插件上下文
 */
export interface IPluginContext {
  logger: ILogger;
  eventBus: IEventBus;
  storage: IStorageAdapter;
  config: Record<string, unknown>;
}

/**
 * 插件接口
 */
export interface IPlugin extends IDisposable {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  activate(context: IPluginContext): Promise<void>;
  deactivate(): Promise<void>;
}

/**
 * 插件管理器接口
 */
export interface IPluginManager extends IDisposable {
  readonly plugins: IPlugin[];
  readonly activePlugins: IPlugin[];

  registerPlugin(plugin: IPlugin): void;
  unregisterPlugin(pluginId: string): boolean;
  activatePlugin(pluginId: string): Promise<void>;
  deactivatePlugin(pluginId: string): Promise<void>;

  getPlugin(pluginId: string): IPlugin | null;
  isPluginActive(pluginId: string): boolean;
}

// ── 工厂接口 ──

/**
 * 工厂接口
 */
export interface IFactory<T> {
  create(...args: unknown[]): T;
}

/**
 * 异步工厂接口
 */
export interface IAsyncFactory<T> {
  create(...args: unknown[]): Promise<T>;
}

// ── 服务定位器接口 ──

/**
 * 服务定位器接口（简单 DI 容器）
 */
export interface IServiceLocator extends IDisposable {
  register<T>(token: string, factory: IFactory<T> | T): void;
  registerSingleton<T>(token: string, factory: IFactory<T> | T): void;

  resolve<T>(token: string): T;
  tryResolve<T>(token: string): T | null;

  has(token: string): boolean;
  unregister(token: string): boolean;

  createScope(): IServiceLocator;
}

// ── 配置接口 ──

/**
 * 配置提供者接口
 */
export interface IConfigProvider {
  get<T>(key: string, defaultValue?: T): T;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): boolean;

  load(): Promise<void>;
  save(): Promise<void>;

  onChange(callback: (key: string, value: unknown) => void): ISubscription;
}

/**
 * 配置源
 */
export type ConfigSource = 'memory' | 'localStorage' | 'file' | 'remote';

/**
 * 配置选项
 */
export interface ConfigOptions {
  source: ConfigSource;
  prefix?: string;
  autoSave?: boolean;
}
