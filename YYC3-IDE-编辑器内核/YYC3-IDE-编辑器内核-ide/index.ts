/**
 * @file: index.ts
 * @description: YYC³ IDE 标准规范 — 统一入口文件
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-06-03
 * @updated: 2026-06-03
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: ide,standard,entry-point,unified-export
 */

// ── 核心接口层 (Interfaces) ──
export type {
  IDisposable,
  IAsyncDisposable,
  ISubscription,
  IEventEmitter,
  IObservable,
  IStorageAdapter,
  StorageConfig,
  ISnapshotFile,
  ISnapshotMetadata,
  ISnapshot,
  ISnapshotDiff,
  ISnapshotManager,
  SnapshotConfig,
  IThemeTokens,
  ITheme,
  IThemeManager,
  ThemeConfig,
  PreviewMode as IPreviewMode,
  IPreviewState,
  IPreviewController,
  PreviewConfig,
  IValidationResult,
  IValidationError,
  IValidationWarning,
  ICodeValidator,
  IValidationRule,
  EventHandler,
  IEventBus,
  LogLevel,
  ILogEntry,
  ILogger,
  LoggerConfig,
  IPluginContext,
  IPlugin,
  IPluginManager,
  IFactory,
  IAsyncFactory,
  IServiceLocator,
  IConfigProvider,
  ConfigSource,
  ConfigOptions,
} from './interfaces';

// ── 依赖注入系统 (DI) ──
export {
  DIContainer,
  ServiceToken,
  Lifecycle,
  TOKENS,
  Injectable,
  getInjectableMetadata,
  FactoryBuilder,
  factoryFor,
  getGlobalContainer,
  resetGlobalContainer,
  registerService,
  resolveService,
  hasService,
  Container,
  Token,
} from './di';

// ── 配置管理系统 (Config) ──
export {
  MemoryConfigProvider,
  LocalStorageConfigProvider,
  CompositeConfigProvider,
  ConfigManager,
  DEFAULT_CONFIG,
  createConfigProvider,
  createYYC3ConfigManager,
  type ConfigChangeEvent,
  type ConfigValidator,
  type ConfigSchema,
  type YYC3AppConfig,
} from './config';

// ── 应用工厂 (Factory) ──
export {
  AppFactory,
  getAppFactory,
  initializeApp,
  getService,
  resetApp,
  createStorageAdapter,
  createSnapshotManager,
  createThemeManager,
  type AppContext,
  type AppOptions,
} from './factory';

// ── 常量定义 (Constants) ──
export {
  BRAND_NAME, BRAND_NAME_CN, BRAND_NAME_SHORT,
  BRAND_SLOGAN, BRAND_SLOGAN_CN, BRAND_SLOGAN_EN,
  BRAND_DESCRIPTION, BRAND_FOOTER,
  BRAND_COLOR_PRIMARY, BRAND_COLOR_SECONDARY, BRAND_COLOR_ACCENT,
  BRAND_COLOR_SUCCESS, BRAND_COLOR_WARNING, BRAND_COLOR_ERROR,
  BRAND_GRADIENT_PRIMARY, BRAND_GRADIENT_ACCENT,
  BRAND_EMAIL, BRAND_GITHUB, BRAND_GITHUB_REPO,
  BRAND_LICENSE, BRAND_COPYRIGHT_YEAR, BRAND_COPYRIGHT, BRAND_TEAM,
  BRAND_FONT_FAMILY_SANS, BRAND_FONT_FAMILY_MONO,
  BRAND_BREAKPOINTS,
  BRAND_TRANSITION_FAST, BRAND_TRANSITION_NORMAL, BRAND_TRANSITION_SLOW,
  Z_INDEX,
} from './constants/brand';

export {
  APP_NAME, APP_SLUG, APP_VERSION,
  SERVER_PORT, API_BASE_URL, API_TIMEOUT, WS_URL,
  DB_TYPE, DB_NAME, DB_VERSION,
  STORAGE_AUTO_SAVE_INTERVAL, STORAGE_DEBOUNCE_DELAY,
  STORAGE_MAX_SNAPSHOTS, STORAGE_MAX_FILE_SIZE,
  EDITOR_FONT_SIZE, EDITOR_TAB_SIZE,
  EDITOR_MINIMAP_ENABLED, EDITOR_WORD_WRAP, EDITOR_LINE_NUMBERS,
  EDITOR_SCROLL_BEYOND_LAST_LINE,
  AI_DEFAULT_PROVIDER, AI_DEFAULT_MODEL,
  AI_TEMPERATURE, AI_MAX_TOKENS, AI_STREAM_ENABLED,
  AI_TIMEOUT, AI_RETRY_COUNT, AI_RETRY_DELAY,
  PERF_DEBOUNCE_DELAY, PERF_VIRTUAL_SCROLL_THRESHOLD,
  PERF_MAX_FILE_TREE_DEPTH, PERF_LAZY_LOAD_THRESHOLD,
  SECURITY_ENCRYPTION_ALGORITHM, SECURITY_KEY_LENGTH,
  SECURITY_IV_LENGTH, SECURITY_SALT_LENGTH, SECURITY_PBKDF2_ITERATIONS,
  UI_THEME_DEFAULT, UI_LANGUAGE_DEFAULT,
  UI_SIDEBAR_WIDTH, UI_PANEL_MIN_WIDTH, UI_PANEL_MIN_HEIGHT,
  UI_TOAST_DURATION, UI_ANIMATION_DURATION,
  COLLAB_HEARTBEAT_INTERVAL, COLLAB_RECONNECT_DELAY, COLLAB_MAX_RECONNECT_ATTEMPTS,
  TERMINAL_MAX_HISTORY, TERMINAL_MAX_OUTPUT_LINES, TERMINAL_DEFAULT_SHELL,
  PREVIEW_DEBOUNCE, PREVIEW_MAX_ERRORS,
  PROJECT_MAX_FILES, PROJECT_MAX_NAME_LENGTH, PROJECT_TEMPLATE_COUNT,
} from './constants/config';

// ── 异常处理 (Exception) ──
export { BoundaryExceptionHandler } from './exception/BoundaryExceptionHandler';

// ── 用户反馈 (Feedback) ──
export { UserFeedbackManager } from './feedback/UserFeedbackManager';
export type {
  FeedbackType, FeedbackPriority, FeedbackStatus, FeedbackSource,
  UserFeedback, SurveyType, QuestionType, SurveyQuestion, Survey,
  SurveyResponse, AnalysisDimension, SentimentAnalysis, CategoryAnalysis,
  TrendAnalysis, IssueCluster, FeedbackAnalysisReport,
  ImprovementType, ImprovementPriority, ImprovementStatus,
  ImprovementPlan, ImprovementRoadmap,
  InterviewType, InterviewMode, InterviewRecord, FeedbackSystemConfig,
} from './feedback/UserFeedbackTypes';

// ── 国际化 (i18n) ──
export type { SupportedLocale, TranslationMap } from './i18n';
export { useI18n, useI18nStore, translate, LOCALE_OPTIONS } from './i18n';

// ── 核心组件 (Components) ──
export { AsyncErrorBoundary, withAsyncErrorBoundary, useAsyncError, useRetry } from './components/AsyncErrorBoundary';
export { VirtualList } from './components/VirtualList';

// ── 适配器 (Adapters) ──
export { isTauriEnvironment, getPlatform, BRIDGE_INFO } from './adapters/TauriBridge';
export type { PlatformType, NativeFileResult, ShellOutput } from './adapters/TauriBridge';
export { exportAsJson, importFromJson } from './adapters/ProjectExporter';
export type { ExportOptions, ImportResult } from './adapters/ProjectExporter';

// ── AI 管线 (AI Pipeline) ──
export { SystemPromptBuilder, detectIntent, buildSystemPrompt, buildChatMessages } from './ai/SystemPromptBuilder';
export type { UserIntent as AIUserIntent, LLMReadyMessage } from './ai/SystemPromptBuilder';
export { extractTasksFromResponse, TASK_PATTERNS, MAX_INFERRED_TASKS, MIN_RESPONSE_LENGTH } from './ai/TaskInferenceEngine';
export type { TaskPattern } from './ai/TaskInferenceEngine';
export { generateTestSuite, generateProjectTestPlan, extractSymbols, getSymbolStats } from './ai/TestGenerator';
export type { TestCategory, TestPriority, TestCase, TestSuite, ProjectTestPlan, ExtractedSymbol } from './ai/TestGenerator';
export type { SecuritySeverity, SecurityCategory, SecurityFinding, SecurityReport } from './ai/SecurityScanner';

// ── 自定义 Hooks ──
export { useAgentOrchestrator } from './hooks/useAgentOrchestrator';
export { useChatSessionSync } from './hooks/useChatSessionSync';
export { useErrorDiagnostics } from './hooks/useErrorDiagnostics';
export { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
export { useMultiAgentDispatch } from './hooks/useMultiAgentDispatch';
export { useMultiInstanceSync } from './hooks/useMultiInstanceSync';
export { usePWA } from './hooks/usePWA';
export { usePerformanceMonitor } from './hooks/usePerformanceMonitor';
export { useSentry } from './hooks/useSentry';
export { useSettingsSync } from './hooks/useSettingsSync';
export { useTerminalSocket } from './hooks/useTerminalSocket';
export { useThemeTokens } from './hooks/useThemeTokens';
export { useTouchGestures } from './hooks/useTouchGestures';
export { useWorkspaceFileSync } from './hooks/useWorkspaceFileSync';

// ── 类型定义 (Types) ──
export type {
  DesignRoot, ProjectMetadata, PanelSpec, PanelType, PanelLayout, PanelStyle, PanelId,
  PreviewMode as ExtendedPreviewMode,
  PreviewModeConfig, PreviewModeControllerConfig,
  SnapshotFile, SnapshotMetadata, Snapshot, SnapshotDiff, SnapshotManagerConfig,
  ValidationResult, ParsedCodeBlock, CodeValidatorConfig,
  SystemPromptConfig, LLMMessage, ConversationMessage, BuildMessagesConfig, ProjectContext,
} from './types';

export type {
  InstanceType, WindowType, WorkspaceType, SessionType, SessionStatus,
  AppInstance, WindowConfig, EditorConfig, AIConfig, ShortcutConfig,
  WorkspaceConfig, Workspace, SessionData, Session, IPCMessageType, IPCMessage,
} from './types/multi-instance';

export type {
  PanelLayout as MultiInstancePanelLayout,
  ThemeConfig as MultiInstanceThemeConfig,
} from './types/multi-instance';

export type {
  DeviceType, PreviewEngineType, DevicePreset, ConsoleLog, PreviewSnapshot,
} from './types/previewTypes';

// ── 模型设置面板 (model-settings) ──
export { ProviderCard } from './model-settings/ProviderCard';
export { MCPConfigPanel } from './model-settings/MCPConfigPanel';
export { ProxyConfigPanel } from './model-settings/ProxyConfigPanel';
export { SmartDiagnosticsPanel } from './model-settings/SmartDiagnosticsPanel';
export { LatencyTrendChart } from './model-settings/LatencyTrendChart';
export { CopyButton } from './model-settings/CopyButton';
export type { MCPServerConfig, DiagnosticResult, OllamaDetectedModel, TabKey, ModelSettingsProps } from './model-settings/types';

// ── API 验证 (api) ──
export {
  validateCommand, validateSessionId, validateCwd, validateExecRequest,
  safeJSONParse, validateWSMessage, formatValidationResponse,
} from './api/input-validator';
export type { ValidationResult as ApiValidationResult, ValidationError, ValidationErrorCode } from './api/input-validator';

// ── 版本信息 ──
export const IDE_STANDARD_VERSION = '2.0.0';
export const IDE_STANDARD_BUILD_DATE = '2026-06-03';
export const IDE_STANDARD_AUTHOR = 'YanYuCloudCube Team';
