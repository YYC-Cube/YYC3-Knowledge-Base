/**
 * @file: services/errors/index.ts
 * @description: 统一错误体系 barrel 导出
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-06-04
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: errors,barrel,unified
 */

export { AppError } from "./AppError";
export type { AppErrorOptions, ErrorContext } from "./AppError";
export {
  ErrorCode,
  ErrorDomain,
  ErrorSeverity,
  ERROR_DOMAIN_MAP,
  ERROR_USER_MESSAGES,
  getErrorDomain,
  getUserMessage,
} from "./ErrorCodes";
