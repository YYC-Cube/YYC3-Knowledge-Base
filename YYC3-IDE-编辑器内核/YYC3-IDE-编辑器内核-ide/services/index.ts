/**
 * @file: services/index.ts
 * @description: IDE Services 统一 barrel — 集中导出所有服务层模块
 *              包括：Logger、错误系统、工具函数、存储中心、服务注册
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-06-04
 * @updated: 2026-06-04
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: services,barrel,unified,encapsulation
 */

// ================================================================
// IDE Services 统一 barrel
// ================================================================
// 使用方式：
//   import { logger, AppError, ErrorCode, debounce, serviceRegistry } from '@/services';
// ================================================================

// ── Logger ──
export { logger } from "./Logger";

// ── 统一错误系统 ──
export {
  AppError,
  ErrorCode,
  ErrorDomain,
  ErrorSeverity,
  ERROR_DOMAIN_MAP,
  ERROR_USER_MESSAGES,
  getErrorDomain,
  getUserMessage,
} from "./errors";

export type { AppErrorOptions, ErrorContext } from "./errors";

// ── 统一工具函数 ──
export {
  // new helpers
  debounce,
  throttle,
  delay,
  retry,
  tryCatch,
  tryCatchSync,
  memoize,
  once,
  pipe,
  safeJSONParse,
  safeJSONStringify,
  formatBytes,
  formatDuration,
  assertNonNull,
  assert,
  // existing utils
  copyToClipboard,
  generateId,
  generateUUID,
  generateShortId,
} from "./utils";

export type { RetryOptions } from "./utils";

// ── Store Hub ──
export {
  fileApi,
  modelApi,
  proxyApi,
  previewApi,
  aiFixApi,
  getFileState,
  getModelState,
  getPreviewState,
  batchUpdate,
  useFileStoreZustand,
  useModelStoreZustand,
  useProxyStoreZustand,
  usePreviewStore,
  useAIFixStore,
} from "./stores";

// ── 服务注册中心 ──
export {
  serviceRegistry,
  ServiceRegistry,
  ServiceToken,
  Lifecycle,
} from "./registry";

export type { ServiceDescriptor } from "./registry";
