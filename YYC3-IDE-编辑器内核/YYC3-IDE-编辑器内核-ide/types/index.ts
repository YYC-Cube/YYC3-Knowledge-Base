/**
 * @file: types/index.ts
 * @description: 统一类型 barrel — 单一导入源
 *              v2.0: 新增预览类型标准化 re-export，解决 p0-core vs previewTypes 重复问题
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-03-21
 * @updated: 2026-06-04
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: types,barrel,normalization,unified
 */

// ================================================================
// 统一类型 barrel — 消除类型重复定义
// ================================================================
// 规范：
//   1. 每种类型只有一个数据源文件（source of truth）
//   2. 统一从此 barrel 导入，不再从子文件直接 import
//   3. PreviewMode 以 previewTypes.ts 为准（含 "smart" 模式）
// ================================================================

// ── 主题系统 ──

export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  border: string;
  input: string;
  ring: string;
}

export interface ThemeTokens {
  cssVars: Record<string, string>;
  shadcnThemes: Record<string, Record<string, string>>;
  xtermThemes: Record<string, Record<string, string>>;
  lineHeight: Record<string, number>;
}

export interface ThemeSpec {
  name: string;
  mode: "light" | "dark";
  colors: ThemeColors;
}

// ── AI 相关类型 ──

export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    provider?: string;
    tokens?: number;
    duration?: number;
  };
}

export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: number;
  updatedAt: number;
  model?: string;
  provider?: string;
}

export type AIIntent =
  | "code-generation"
  | "code-review"
  | "code-fix"
  | "code-explain"
  | "code-optimize"
  | "code-refactor"
  | "code-test"
  | "general-chat";

// ── 文件系统类型 ──

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  content?: string;
  children?: FileNode[];
  metadata?: {
    size?: number;
    modified?: number;
    language?: string;
  };
}

export interface FileChange {
  path: string;
  type: "create" | "modify" | "delete" | "rename";
  oldPath?: string;
  content?: string;
  timestamp: number;
}

// ── 事件总线类型 ──

export interface WorkflowEvent {
  type: string;
  payload: unknown;
  timestamp: number;
  source?: string;
}

// ── 插件系统类型 ──

export interface PluginContext {
  registerCommand: (command: string, handler: () => void) => void;
  registerProvider: (provider: unknown) => void;
  showMessage: (message: string, type?: "info" | "warning" | "error" | "success") => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
  subscribe: (event: string, handler: () => void) => () => void;
  editor?: {
    getSelection: () => { text: string; start: number; end: number } | null;
    replaceSelection: (text: string) => void;
    insertAtCursor: (text: string) => void;
    getContent: () => string;
    setContent: (content: string) => void;
  };
  ui: {
    showPanel: (id: string | { title: string; content: unknown; width?: number; height?: number }, content?: unknown) => void;
    hidePanel: (id: string) => void;
    showToast: (message: string, type?: "info" | "warning" | "error" | "success") => void;
    registerStatusBarItem: (id: string, options: { text: string; tooltip?: string; command?: string }) => void;
    registerMenuItem: (id: string, options: { label: string; command?: string; action?: () => void }) => void;
  };
  commands: {
    register: (id: string, handler: () => void) => void;
    execute: (id: string) => void;
    registerCommand: (id: string, handler: () => void) => void;
  };
  logger: {
    log: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}

export interface PluginManifest {
  id: string;
  name: string;
  nameEn?: string;
  version: string;
  description: string;
  descriptionEn?: string;
  author: string;
  homepage?: string;
  license?: string;
  main?: string;
  entry?: string;
  icon?: string;
  category?: string;
  permissions?: string[];
  dependencies?: Record<string, string>;
  activationEvents?: string[];
  tags?: string[];
  activate?: (context: PluginContext) => void;
  deactivate?: () => void;
}

export type PluginStatus = "installed" | "active" | "disabled" | "error";

export interface PluginInstance {
  manifest: PluginManifest;
  status: PluginStatus;
  exports?: Record<string, unknown>;
  error?: string;
}

// ── 协作类型 ──

export interface CollabUser {
  id: string;
  name: string;
  color: string;
  cursor?: { line: number; column: number; file?: string };
  isOnline: boolean;
  lastSeen: number;
}

export interface CollabOperation {
  type: "insert" | "delete" | "retain";
  position: number;
  content?: string;
  length?: number;
  userId: string;
  timestamp: number;
}

// ── 预览类型 ──

export interface PreviewState {
  mode: "desktop" | "tablet" | "mobile";
  url?: string;
  isLoading: boolean;
  errors: PreviewError[];
  console: ConsoleEntry[];
}

export interface PreviewError {
  message: string;
  source?: string;
  line?: number;
  column?: number;
  severity: "error" | "warning";
}

export interface ConsoleEntry {
  type: "log" | "warn" | "error" | "info";
  args: string[];
  timestamp: number;
}

// ── 安全类型 ──

export interface EncryptedData {
  iv: string; // Base64 encoded IV
  salt: string; // Base64 encoded salt
  ciphertext: string; // Base64 encoded encrypted data
  algorithm: string;
  version: number;
}

// ── 国际化类型 ──

export type SupportedLocale = "zh-CN" | "en-US" | "ja-JP";

export interface I18nTranslation {
  [key: string]: string | I18nTranslation;
}

// ================================================================
// v2.0: 标准化的子模块类型 re-export（单一数据源）
// ================================================================

// ── 预览系统 (source of truth: previewTypes.ts) ──
// 注意：PreviewMode 以 previewTypes.ts 为准（含 "smart" 模式）
// p0-core.ts 中的 PreviewMode 定义不含 "smart"，请使用 previewTypes 版本
export type {
  ConsoleLog, DevicePreset, DeviceType,
  PreviewEngineType, PreviewMode, PreviewSnapshot
} from "./previewTypes";

// ── 设计系统类型 (IDE 面板设计规范) ──
export interface DesignRoot {
  version: string;
  theme: "light" | "dark";
  tokens: string;
  panels: PanelSpec[];
  components: ComponentSpec[];
  styles: StyleSpec;
  metadata?: ProjectMetadata;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  techStack?: string[];
  tags?: string[];
}

export interface PanelSpec {
  id: string;
  type: PanelType;
  layout: PanelLayout;
  style?: PanelStyle;
  children?: PanelSpec[];
  components?: ComponentSpec[];
  locked?: boolean;
  pinned?: boolean;
}

export type PanelType =
  | "container"
  | "content"
  | "preview"
  | "terminal"
  | "editor";

export interface PanelLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface PanelStyle {
  background?: string;
  border?: string;
  borderRadius?: number;
  elevation?: number;
}

export type PanelId = string;

export interface ComponentSpec {
  id: string;
  type: ComponentType;
  style?: ComponentStyle;
  props?: Record<string, unknown>;
}

export type ComponentType =
  | "button"
  | "input"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "switch"
  | "slider"
  | "table"
  | "chart"
  | "tree"
  | "tabs"
  | "tooltip"
  | "modal"
  | "drawer"
  | "custom";

export interface ComponentStyle {
  width?: string | number;
  height?: string | number;
  margin?: string | number;
  padding?: string | number;
  color?: string;
  background?: string;
  border?: string;
  borderRadius?: number;
  fontSize?: string | number;
  fontWeight?: string | number;
}

export interface StyleSpec {
  colors: Record<string, string>;
  typography: Record<string, { fontFamily: string; fontSize: string; fontWeight: number; lineHeight: number }>;
  spacing: Record<string, string>;
  shadows: Record<string, string>;
  radii: Record<string, string>;
}

// ── P0 核心 (快照、验证、提示词) ──
export type {
  BuildMessagesConfig, CodeValidatorConfig, ConversationMessage, LLMMessage, ParsedCodeBlock, PreviewModeConfig,
  PreviewModeControllerConfig, ProjectContext, Snapshot,
  SnapshotDiff, SnapshotFile, SnapshotManagerConfig, SnapshotMetadata, SystemPromptConfig, UserIntent, ValidationResult
} from "./p0-core";

// ── 多实例 ──
export type {
  AIConfig, AppInstance, EditorConfig, InstanceType, SessionStatus, SessionType, WindowConfig, WindowType,
  WorkspaceType
} from "./multi-instance";
