/**
 * @file: services/errors/ErrorCodes.ts
 * @description: 统一错误码体系 — 合并 ErrorHandler.ErrorType + ServiceErrorCode + BoundaryType
 *              五层分类：领域 → 模块 → 具体错误，替代原有的 4 套独立错误枚举
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-06-04
 * @updated: 2026-06-04
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: errors,codes,taxonomy,unified,encapsulation
 */

// ================================================================
// YYC3 统一错误码体系 v2 — 分层分类
// ================================================================
// 层次结构：Domain > Category > SpecificCode
//   APP_*      — 应用层错误
//   AI_*       — AI/LLM 层错误
//   STORAGE_*  — 存储层错误
//   NETWORK_*  — 网络层错误
//   VALIDATION_* — 校验层错误
//   SYSTEM_*   — 系统层错误
// ================================================================

export enum ErrorDomain {
  APP = "APP",
  AI = "AI",
  STORAGE = "STORAGE",
  NETWORK = "NETWORK",
  VALIDATION = "VALIDATION",
  SYSTEM = "SYSTEM",
}

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * 统一错误码 — 单一定义，全局引用
 */
export enum ErrorCode {
  // ── 应用层 (APP) ──
  APP_UNKNOWN = "APP_UNKNOWN",
  APP_OPERATION_CANCELLED = "APP_OPERATION_CANCELLED",
  APP_CONCURRENT_ACCESS = "APP_CONCURRENT_ACCESS",
  APP_RESOURCE_EXHAUSTED = "APP_RESOURCE_EXHAUSTED",
  APP_TIMEOUT = "APP_TIMEOUT",
  APP_EMPTY_RESULT = "APP_EMPTY_RESULT",
  APP_CONFIG_INVALID = "APP_CONFIG_INVALID",

  // ── AI 层 (AI) ──
  AI_REQUEST_FAILED = "AI_REQUEST_FAILED",
  AI_RESPONSE_INVALID = "AI_RESPONSE_INVALID",
  AI_TIMEOUT = "AI_TIMEOUT",
  AI_RATE_LIMITED = "AI_RATE_LIMITED",
  AI_UNAUTHORIZED = "AI_UNAUTHORIZED",
  AI_PROMPT_TOO_LONG = "AI_PROMPT_TOO_LONG",
  AI_STREAM_ERROR = "AI_STREAM_ERROR",

  // ── 存储层 (STORAGE) ──
  STORAGE_QUOTA_EXCEEDED = "STORAGE_QUOTA_EXCEEDED",
  STORAGE_READ_FAILED = "STORAGE_READ_FAILED",
  STORAGE_WRITE_FAILED = "STORAGE_WRITE_FAILED",
  STORAGE_NOT_FOUND = "STORAGE_NOT_FOUND",
  STORAGE_ALREADY_EXISTS = "STORAGE_ALREADY_EXISTS",
  STORAGE_INIT_FAILED = "STORAGE_INIT_FAILED",
  STORAGE_INDEXEDDB_ERROR = "STORAGE_INDEXEDDB_ERROR",
  STORAGE_DECRYPTION_FAILED = "STORAGE_DECRYPTION_FAILED",

  // ── 网络层 (NETWORK) ──
  NETWORK_ERROR = "NETWORK_ERROR",
  NETWORK_TIMEOUT = "NETWORK_TIMEOUT",
  NETWORK_OFFLINE = "NETWORK_OFFLINE",
  NETWORK_DNS_ERROR = "NETWORK_DNS_ERROR",
  NETWORK_CORS_BLOCKED = "NETWORK_CORS_BLOCKED",

  // ── 校验层 (VALIDATION) ──
  VALIDATION_INVALID_PARAMETER = "VALIDATION_INVALID_PARAMETER",
  VALIDATION_TYPE_MISMATCH = "VALIDATION_TYPE_MISMATCH",
  VALIDATION_RANGE_ERROR = "VALIDATION_RANGE_ERROR",
  VALIDATION_REQUIRED_MISSING = "VALIDATION_REQUIRED_MISSING",
  VALIDATION_FILE_TOO_LARGE = "VALIDATION_FILE_TOO_LARGE",
  VALIDATION_EMPTY_FILE = "VALIDATION_EMPTY_FILE",
  VALIDATION_CODE_PARSE_ERROR = "VALIDATION_CODE_PARSE_ERROR",
  VALIDATION_SANITIZE_BLOCKED = "VALIDATION_SANITIZE_BLOCKED",

  // ── 系统层 (SYSTEM) ──
  SYSTEM_INTERNAL_ERROR = "SYSTEM_INTERNAL_ERROR",
  SYSTEM_NOT_FOUND = "SYSTEM_NOT_FOUND",
  SYSTEM_UNAUTHORIZED = "SYSTEM_UNAUTHORIZED",
  SYSTEM_RATE_LIMITED = "SYSTEM_RATE_LIMITED",
  SYSTEM_EXTERNAL_API_ERROR = "SYSTEM_EXTERNAL_API_ERROR",
}

/**
 * 错误码 → 领域映射
 */
export const ERROR_DOMAIN_MAP: Record<ErrorCode, ErrorDomain> = {
  [ErrorCode.APP_UNKNOWN]: ErrorDomain.APP,
  [ErrorCode.APP_OPERATION_CANCELLED]: ErrorDomain.APP,
  [ErrorCode.APP_CONCURRENT_ACCESS]: ErrorDomain.APP,
  [ErrorCode.APP_RESOURCE_EXHAUSTED]: ErrorDomain.APP,
  [ErrorCode.APP_TIMEOUT]: ErrorDomain.APP,
  [ErrorCode.APP_EMPTY_RESULT]: ErrorDomain.APP,
  [ErrorCode.APP_CONFIG_INVALID]: ErrorDomain.APP,

  [ErrorCode.AI_REQUEST_FAILED]: ErrorDomain.AI,
  [ErrorCode.AI_RESPONSE_INVALID]: ErrorDomain.AI,
  [ErrorCode.AI_TIMEOUT]: ErrorDomain.AI,
  [ErrorCode.AI_RATE_LIMITED]: ErrorDomain.AI,
  [ErrorCode.AI_UNAUTHORIZED]: ErrorDomain.AI,
  [ErrorCode.AI_PROMPT_TOO_LONG]: ErrorDomain.AI,
  [ErrorCode.AI_STREAM_ERROR]: ErrorDomain.AI,

  [ErrorCode.STORAGE_QUOTA_EXCEEDED]: ErrorDomain.STORAGE,
  [ErrorCode.STORAGE_READ_FAILED]: ErrorDomain.STORAGE,
  [ErrorCode.STORAGE_WRITE_FAILED]: ErrorDomain.STORAGE,
  [ErrorCode.STORAGE_NOT_FOUND]: ErrorDomain.STORAGE,
  [ErrorCode.STORAGE_ALREADY_EXISTS]: ErrorDomain.STORAGE,
  [ErrorCode.STORAGE_INIT_FAILED]: ErrorDomain.STORAGE,
  [ErrorCode.STORAGE_INDEXEDDB_ERROR]: ErrorDomain.STORAGE,
  [ErrorCode.STORAGE_DECRYPTION_FAILED]: ErrorDomain.STORAGE,

  [ErrorCode.NETWORK_ERROR]: ErrorDomain.NETWORK,
  [ErrorCode.NETWORK_TIMEOUT]: ErrorDomain.NETWORK,
  [ErrorCode.NETWORK_OFFLINE]: ErrorDomain.NETWORK,
  [ErrorCode.NETWORK_DNS_ERROR]: ErrorDomain.NETWORK,
  [ErrorCode.NETWORK_CORS_BLOCKED]: ErrorDomain.NETWORK,

  [ErrorCode.VALIDATION_INVALID_PARAMETER]: ErrorDomain.VALIDATION,
  [ErrorCode.VALIDATION_TYPE_MISMATCH]: ErrorDomain.VALIDATION,
  [ErrorCode.VALIDATION_RANGE_ERROR]: ErrorDomain.VALIDATION,
  [ErrorCode.VALIDATION_REQUIRED_MISSING]: ErrorDomain.VALIDATION,
  [ErrorCode.VALIDATION_FILE_TOO_LARGE]: ErrorDomain.VALIDATION,
  [ErrorCode.VALIDATION_EMPTY_FILE]: ErrorDomain.VALIDATION,
  [ErrorCode.VALIDATION_CODE_PARSE_ERROR]: ErrorDomain.VALIDATION,
  [ErrorCode.VALIDATION_SANITIZE_BLOCKED]: ErrorDomain.VALIDATION,

  [ErrorCode.SYSTEM_INTERNAL_ERROR]: ErrorDomain.SYSTEM,
  [ErrorCode.SYSTEM_NOT_FOUND]: ErrorDomain.SYSTEM,
  [ErrorCode.SYSTEM_UNAUTHORIZED]: ErrorDomain.SYSTEM,
  [ErrorCode.SYSTEM_RATE_LIMITED]: ErrorDomain.SYSTEM,
  [ErrorCode.SYSTEM_EXTERNAL_API_ERROR]: ErrorDomain.SYSTEM,
};

/**
 * 从错误码获取领域
 */
export function getErrorDomain(code: ErrorCode): ErrorDomain {
  return ERROR_DOMAIN_MAP[code] ?? ErrorDomain.APP;
}

/**
 * 错误码 → 用户友好消息映射
 */
export const ERROR_USER_MESSAGES: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.AI_REQUEST_FAILED]: "AI 请求失败，请稍后重试",
  [ErrorCode.AI_TIMEOUT]: "AI 响应超时，请检查网络后重试",
  [ErrorCode.AI_RATE_LIMITED]: "请求过于频繁，请稍后重试",
  [ErrorCode.AI_UNAUTHORIZED]: "API 密钥无效，请在设置中重新配置",
  [ErrorCode.STORAGE_QUOTA_EXCEEDED]: "存储空间不足，请清理旧数据",
  [ErrorCode.STORAGE_READ_FAILED]: "数据读取失败，请刷新页面重试",
  [ErrorCode.STORAGE_WRITE_FAILED]: "保存失败，请检查磁盘空间",
  [ErrorCode.NETWORK_ERROR]: "网络连接异常，请检查网络设置",
  [ErrorCode.NETWORK_OFFLINE]: "当前处于离线状态，部分功能不可用",
  [ErrorCode.VALIDATION_FILE_TOO_LARGE]: "文件过大，请拆分后重试",
  [ErrorCode.VALIDATION_EMPTY_FILE]: "文件内容为空，无法处理",
  [ErrorCode.SYSTEM_INTERNAL_ERROR]: "系统内部错误，我们正在修复中",
};

/**
 * 获取用户友好消息
 */
export function getUserMessage(code: ErrorCode, fallback = "操作失败，请重试"): string {
  return ERROR_USER_MESSAGES[code] ?? fallback;
}
