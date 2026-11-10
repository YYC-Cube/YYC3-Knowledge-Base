/**
 * @file: services/errors/AppError.ts
 * @description: 统一应用错误类 — 替代 ServiceError + 各处 ad-hoc Error
 *              支持错误码、严重级别、可恢复性、重试、上下文数据
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-06-04
 * @updated: 2026-06-04
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: errors,app-error,unified,encapsulation
 */

import { ErrorCode, ErrorSeverity, getErrorDomain, getUserMessage, type ErrorDomain } from "./ErrorCodes";

export interface ErrorContext {
  source?: string;
  component?: string;
  action?: string;
  params?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AppErrorOptions {
  code?: ErrorCode;
  severity?: ErrorSeverity;
  message?: string;
  userMessage?: string;
  source?: string;
  context?: ErrorContext;
  cause?: Error;
  recoverable?: boolean;
  retryable?: boolean;
}

/**
 * 统一应用错误
 *
 * 使用示例：
 *   throw new AppError({ code: ErrorCode.STORAGE_WRITE_FAILED, context: { path } });
 *   throw AppError.fromError(error, ErrorCode.AI_REQUEST_FAILED);
 *   throw AppError.validation("参数 name 不能为空");
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly domain: ErrorDomain;
  readonly severity: ErrorSeverity;
  readonly userMessage: string;
  readonly timestamp: string;
  readonly source: string;
  readonly context: ErrorContext;
  readonly cause: Error | undefined;
  readonly recoverable: boolean;
  readonly retryable: boolean;

  constructor(options: AppErrorOptions) {
    const code = options.code ?? ErrorCode.APP_UNKNOWN;
    const message = options.message ?? getUserMessage(code, "未知错误");
    super(message);
    this.name = "AppError";
    this.code = code;
    this.domain = getErrorDomain(code);
    this.severity = options.severity ?? ErrorSeverity.MEDIUM;
    this.userMessage = options.userMessage ?? getUserMessage(code, message);
    this.timestamp = new Date().toISOString();
    this.source = options.source ?? "unknown";
    this.context = options.context ?? {};
    this.cause = options.cause;
    this.recoverable = options.recoverable ?? true;
    this.retryable = options.retryable ?? true;

    Object.setPrototypeOf(this, AppError.prototype);
  }

  /** 便捷工厂：从任意 error 创建 AppError */
  static fromError(error: unknown, code: ErrorCode = ErrorCode.APP_UNKNOWN, source?: string): AppError {
    if (error instanceof AppError) return error;
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error : undefined;
    return new AppError({ code, message, source, cause, context: { originalError: message } });
  }

  /** 便捷工厂：校验错误 */
  static validation(message: string, context?: ErrorContext): AppError {
    return new AppError({
      code: ErrorCode.VALIDATION_INVALID_PARAMETER,
      severity: ErrorSeverity.MEDIUM,
      message,
      context,
      recoverable: true,
      retryable: false,
    });
  }

  /** 便捷工厂：AI 错误 */
  static ai(message: string, code: ErrorCode = ErrorCode.AI_REQUEST_FAILED, cause?: Error): AppError {
    return new AppError({
      code,
      severity: ErrorSeverity.HIGH,
      message,
      cause,
      retryable: code === ErrorCode.AI_TIMEOUT || code === ErrorCode.AI_RATE_LIMITED,
    });
  }

  /** 便捷工厂：存储错误 */
  static storage(message: string, code: ErrorCode = ErrorCode.STORAGE_WRITE_FAILED, cause?: Error): AppError {
    return new AppError({
      code,
      severity: ErrorSeverity.HIGH,
      message,
      cause,
      recoverable: true,
    });
  }

  /** 便捷工厂：网络错误 */
  static network(message: string, code: ErrorCode = ErrorCode.NETWORK_ERROR, cause?: Error): AppError {
    return new AppError({
      code,
      severity: ErrorSeverity.HIGH,
      message,
      cause,
      retryable: true,
    });
  }

  /** 序列化为纯对象（用于日志/上报） */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      domain: this.domain,
      severity: this.severity,
      message: this.message,
      userMessage: this.userMessage,
      timestamp: this.timestamp,
      source: this.source,
      context: this.context,
      cause: this.cause?.message,
      recoverable: this.recoverable,
      retryable: this.retryable,
    };
  }
}
