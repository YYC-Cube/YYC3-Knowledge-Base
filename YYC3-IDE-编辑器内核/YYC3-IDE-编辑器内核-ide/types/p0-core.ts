/**
 * @file: types/p0-core.ts
 * @description: P0核心功能类型定义 - 预览模式、快照管理、代码验证、系统提示词构建
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: types,p0,preview,snapshot,validator,prompt-builder
 */

// ================================================================
// PreviewModeController - 预览模式控制
// ================================================================

/**
 * 预览模式类型
 *
 * - realtime: 实时模式 - 代码变更立即触发预览更新
 * - manual: 手动模式 - 用户手动触发预览更新
 * - delayed: 延迟模式 - 代码变更后延迟一定时间再触发预览更新
 */
export type PreviewMode = "realtime" | "manual" | "delayed";

/**
 * 预览模式配置
 */
export interface PreviewModeConfig {
  /** 当前预览模式 */
  mode: PreviewMode;
  /** 延迟时间（毫秒），仅 delayed 模式有效 */
  delay?: number;
  /** 是否自动保存 */
  autoSave?: boolean;
}

/**
 * 预览模式控制器配置
 */
export interface PreviewModeControllerConfig {
  /** 初始模式 */
  initialMode?: PreviewMode;
  /** 延迟模式的延迟时间（毫秒） */
  delayMs?: number;
  /** 更新回调函数 */
  onUpdate?: () => void;
}

// ================================================================
// SnapshotManager - 快照管理
// ================================================================

/**
 * 快照文件
 */
export interface SnapshotFile {
  /** 文件路径 */
  path: string;
  /** 文件内容 */
  content: string;
  /** 内容哈希值（用于快速比较） */
  hash?: string;
}

/**
 * 快照元数据
 */
export interface SnapshotMetadata {
  /** 快照ID */
  id: string;
  /** 快照标签 */
  label: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 文件数量 */
  fileCount: number;
  /** 总字符数 */
  totalChars: number;
  /** 总行数 */
  totalLines: number;
  /** 标签列表 */
  tags?: string[];
  /** 描述 */
  description?: string;
}

/**
 * 快照
 */
export interface Snapshot {
  /** 快照元数据 */
  metadata: SnapshotMetadata;
  /** 快照文件列表 */
  files: SnapshotFile[];
}

/**
 * 快照比较结果
 */
export interface SnapshotDiff {
  /** 新增的文件 */
  added: SnapshotFile[];
  /** 删除的文件路径 */
  removed: string[];
  /** 修改的文件 */
  modified: Array<{
    path: string;
    oldContent: string;
    newContent: string;
    oldHash: string;
    newHash: string;
  }>;
  /** 未变化的文件路径 */
  unchanged: string[];
}

/**
 * 快照管理器配置
 */
export interface SnapshotManagerConfig {
  /** 最大快照数量 */
  maxSnapshots?: number;
  /** 存储键名 */
  storageKey?: string;
}

// ================================================================
// CodeValidator - 代码验证
// ================================================================

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  /** 警告信息列表 */
  warnings: string[];
  /** 错误信息列表 */
  errors: string[];
  /** 建议信息列表 */
  suggestions: string[];
  /** 代码指标 */
  metrics: {
    /** 行数 */
    lines: number;
    /** 字符数 */
    characters: number;
    /** 复杂度：低/中/高 */
    complexity: "low" | "medium" | "high";
  };
}

/**
 * 解析后的代码块
 */
export interface ParsedCodeBlock {
  /** 文件路径 */
  filepath: string;
  /** 代码内容 */
  content: string;
  /** 语言类型 */
  language: string;
  /** 是否为新文件 */
  isNewFile: boolean;
}

/**
 * 代码验证器配置
 */
export interface CodeValidatorConfig {
  /** 最大文件字符数 */
  maxFileLength?: number;
  /** 最大行数 */
  maxLineCount?: number;
}

// ================================================================
// SystemPromptBuilder - 系统提示词构建
// ================================================================

/**
 * 用户意图类型
 *
 * - generate: 生成新代码/组件
 * - modify: 修改现有代码
 * - fix: 修复错误/bug
 * - explain: 解释代码
 * - refactor: 重构优化
 * - test: 生成测试
 * - review: 代码审查
 * - general: 通用对话
 */
export type UserIntent =
  | "generate"
  | "modify"
  | "fix"
  | "explain"
  | "refactor"
  | "test"
  | "review"
  | "general";

/**
 * 系统提示词配置
 */
export interface SystemPromptConfig {
  /** 用户意图 */
  intent: UserIntent;
  /** 项目上下文（可选） */
  context?: ProjectContext | null;
  /** 自定义指令（可选） */
  customInstructions?: string;
  /** 最大 Token 数（可选） */
  maxTokens?: number;
}

/**
 * LLM 消息
 */
export interface LLMMessage {
  /** 消息角色 */
  role: "system" | "user" | "assistant";
  /** 消息内容 */
  content: string;
}

/**
 * 对话历史消息
 */
export interface ConversationMessage {
  /** 消息角色 */
  role: "user" | "assistant";
  /** 消息内容 */
  content: string;
}

/**
 * 对话消息构建配置
 */
export interface BuildMessagesConfig {
  /** 最大历史消息数量 */
  maxHistoryMessages?: number;
  /** 最大上下文 Token 数 */
  maxContextTokens?: number;
  /** 自定义指令 */
  customInstructions?: string;
}

// ================================================================
// ProjectContext - 项目上下文（补充定义）
// ================================================================

/**
 * 项目上下文（从 ContextCollector 导入，此处为类型参考）
 *
 * 注意：完整定义在 ai/ContextCollector.ts 中
 */
export interface ProjectContext {
  /** 文件树 */
  fileTree: string;
  /** 活跃文件 */
  activeFile?: {
    path: string;
    content: string;
    language: string;
  };
  /** 打开的文件列表 */
  openTabs: string[];
  /** 选中的文件内容 */
  selectedFilesContent: Record<string, string>;
  /** Git 状态摘要 */
  gitSummary?: {
    branch: string;
    changedFiles: number;
    stagedFiles: number;
  };
}
