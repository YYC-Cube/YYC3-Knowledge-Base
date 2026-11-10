/**
 * @file: ErrorHandler.ts
 * @description: 统一的错误处理器，提供异常捕获、错误分类、友好提示和日志记录
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: error,handler,exception,stability
 */

/**
 * 错误类型枚举
 */

import { logger } from '../services/Logger';

export enum ErrorType {
  // 预览相关错误
  PREVIEW_UPDATE_FAILED = "PREVIEW_UPDATE_FAILED",
  PREVIEW_MODE_INVALID = "PREVIEW_MODE_INVALID",
  PREVIEW_TIMEOUT = "PREVIEW_TIMEOUT",

  // 快照相关错误
  SNAPSHOT_CREATE_FAILED = "SNAPSHOT_CREATE_FAILED",
  SNAPSHOT_RESTORE_FAILED = "SNAPSHOT_RESTORE_FAILED",
  SNAPSHOT_NOT_FOUND = "SNAPSHOT_NOT_FOUND",
  SNAPSHOT_STORAGE_FULL = "SNAPSHOT_STORAGE_FULL",

  // 验证相关错误
  VALIDATION_FAILED = "VALIDATION_FAILED",
  VALIDATION_TIMEOUT = "VALIDATION_TIMEOUT",
  CODE_PARSE_ERROR = "CODE_PARSE_ERROR",

  // AI相关错误
  AI_REQUEST_FAILED = "AI_REQUEST_FAILED",
  AI_RESPONSE_INVALID = "AI_RESPONSE_INVALID",
  AI_TIMEOUT = "AI_TIMEOUT",

  // 存储相关错误
  STORAGE_QUOTA_EXCEEDED = "STORAGE_QUOTA_EXCEEDED",
  STORAGE_READ_FAILED = "STORAGE_READ_FAILED",
  STORAGE_WRITE_FAILED = "STORAGE_WRITE_FAILED",

  // 网络相关错误
  NETWORK_ERROR = "NETWORK_ERROR",
  NETWORK_TIMEOUT = "NETWORK_TIMEOUT",

  // 通用错误
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  INVALID_PARAMETER = "INVALID_PARAMETER",
  OPERATION_CANCELLED = "OPERATION_CANCELLED",
}

/**
 * 错误严重级别
 */
export enum ErrorSeverity {
  LOW = "low",           // 低 - 不影响主要功能
  MEDIUM = "medium",     // 中 - 影响部分功能
  HIGH = "high",         // 高 - 影响核心功能
  CRITICAL = "critical", // 严重 - 应用崩溃
}

/**
 * 错误信息接口
 */
export interface ErrorInfo {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;  // 用户友好的错误提示
  details?: any;        // 详细错误信息
  timestamp: number;
  recoverable: boolean; // 是否可恢复
  retryable: boolean;   // 是否可重试
}

/**
 * 错误处理器配置
 */
export interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableUserNotification: boolean;
  maxRetryAttempts: number;
  retryDelayMs: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  enableLogging: true,
  enableUserNotification: true,
  maxRetryAttempts: 3,
  retryDelayMs: 1000,
};

/**
 * 统一错误处理器
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private config: ErrorHandlerConfig;
  private errorLog: ErrorInfo[] = [];
  private maxLogSize = 100;

  private constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 获取单例实例
   */
  static getInstance(config?: Partial<ErrorHandlerConfig>): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  /**
   * 处理错误
   */
  handleError(
    error: Error | string,
    type: ErrorType = ErrorType.UNKNOWN_ERROR,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details?: any
  ): ErrorInfo {
    const errorInfo: ErrorInfo = {
      type,
      severity,
      message: typeof error === "string" ? error : error.message,
      userMessage: this.getUserMessage(type, error),
      details: details || (error instanceof Error ? error.stack : undefined),
      timestamp: Date.now(),
      recoverable: this.isRecoverable(type),
      retryable: this.isRetryable(type),
    };

    // 记录错误日志
    if (this.config.enableLogging) {
      this.logError(errorInfo);
    }

    // 显示用户通知
    if (this.config.enableUserNotification && severity !== ErrorSeverity.LOW) {
      this.notifyUser(errorInfo);
    }

    return errorInfo;
  }

  /**
   * 包装异步函数，自动捕获错误
   */
  wrapAsync<T>(
    fn: () => Promise<T>,
    errorType: ErrorType = ErrorType.UNKNOWN_ERROR,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): Promise<T> {
    return fn().catch((error) => {
      const errorInfo = this.handleError(error, errorType, severity);
      throw new Error(errorInfo.userMessage);
    });
  }

  /**
   * 带重试的异步执行
   */
  async retryAsync<T>(
    fn: () => Promise<T>,
    errorType: ErrorType,
    maxAttempts: number = this.config.maxRetryAttempts
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxAttempts) {
          logger.warn('Retry attempt ${attempt}/${maxAttempts}');
          await this.delay(this.config.retryDelayMs * attempt);
        }
      }
    }

    const errorInfo = this.handleError(
      lastError || new Error("Unknown error"),
      errorType,
      ErrorSeverity.HIGH
    );
    throw new Error(errorInfo.userMessage);
  }

  /**
   * 验证参数
   */
  validateParameter(
    value: any,
    name: string,
    type: string,
    required: boolean = true
  ): void {
    if (required && (value === null || value === undefined)) {
      throw this.createError(
        ErrorType.INVALID_PARAMETER,
        `参数 ${name} 不能为空`,
        ErrorSeverity.MEDIUM
      );
    }

    if (value !== null && value !== undefined && typeof value !== type) {
      throw this.createError(
        ErrorType.INVALID_PARAMETER,
        `参数 ${name} 类型错误，期望 ${type}，实际 ${typeof value}`,
        ErrorSeverity.MEDIUM
      );
    }
  }

  /**
   * 验证数组参数
   */
  validateArray(
    value: any,
    name: string,
    minLength: number = 0,
    maxLength?: number
  ): void {
    if (!Array.isArray(value)) {
      throw this.createError(
        ErrorType.INVALID_PARAMETER,
        `参数 ${name} 必须是数组`,
        ErrorSeverity.MEDIUM
      );
    }

    if (value.length < minLength) {
      throw this.createError(
        ErrorType.INVALID_PARAMETER,
        `参数 ${name} 长度不能小于 ${minLength}`,
        ErrorSeverity.MEDIUM
      );
    }

    if (maxLength !== undefined && value.length > maxLength) {
      throw this.createError(
        ErrorType.INVALID_PARAMETER,
        `参数 ${name} 长度不能超过 ${maxLength}`,
        ErrorSeverity.MEDIUM
      );
    }
  }

  /**
   * 验证字符串参数
   */
  validateString(
    value: any,
    name: string,
    minLength: number = 0,
    maxLength?: number
  ): void {
    if (typeof value !== "string") {
      throw this.createError(
        ErrorType.INVALID_PARAMETER,
        `参数 ${name} 必须是字符串`,
        ErrorSeverity.MEDIUM
      );
    }

    if (value.length < minLength) {
      throw this.createError(
        ErrorType.INVALID_PARAMETER,
        `参数 ${name} 长度不能小于 ${minLength}`,
        ErrorSeverity.MEDIUM
      );
    }

    if (maxLength !== undefined && value.length > maxLength) {
      throw this.createError(
        ErrorType.INVALID_PARAMETER,
        `参数 ${name} 长度不能超过 ${maxLength}`,
        ErrorSeverity.MEDIUM
      );
    }
  }

  /**
   * 验证数字参数
   */
  validateNumber(
    value: any,
    name: string,
    min?: number,
    max?: number
  ): void {
    if (typeof value !== "number" || isNaN(value)) {
      throw this.createError(
        ErrorType.INVALID_PARAMETER,
        `参数 ${name} 必须是有效数字`,
        ErrorSeverity.MEDIUM
      );
    }

    if (min !== undefined && value < min) {
      throw this.createError(
        ErrorType.INVALID_PARAMETER,
        `参数 ${name} 不能小于 ${min}`,
        ErrorSeverity.MEDIUM
      );
    }

    if (max !== undefined && value > max) {
      throw this.createError(
        ErrorType.INVALID_PARAMETER,
        `参数 ${name} 不能大于 ${max}`,
        ErrorSeverity.MEDIUM
      );
    }
  }

  /**
   * 创建错误
   */
  createError(
    type: ErrorType,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): Error {
    const error = new Error(message);
    (error as any).type = type;
    (error as any).severity = severity;
    return error;
  }

  /**
   * 获取错误日志
   */
  getErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }

  /**
   * 清空错误日志
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * 获取用户友好的错误消息
   */
  private getUserMessage(type: ErrorType, error: Error | string): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.PREVIEW_UPDATE_FAILED]: "预览更新失败，请刷新页面重试",
      [ErrorType.PREVIEW_MODE_INVALID]: "预览模式无效，已恢复默认模式",
      [ErrorType.PREVIEW_TIMEOUT]: "预览更新超时，请检查网络连接",

      [ErrorType.SNAPSHOT_CREATE_FAILED]: "创建快照失败，请稍后重试",
      [ErrorType.SNAPSHOT_RESTORE_FAILED]: "恢复快照失败，快照可能已损坏",
      [ErrorType.SNAPSHOT_NOT_FOUND]: "快照不存在，可能已被删除",
      [ErrorType.SNAPSHOT_STORAGE_FULL]: "存储空间已满，请删除旧快照",

      [ErrorType.VALIDATION_FAILED]: "代码验证失败，请检查代码格式",
      [ErrorType.VALIDATION_TIMEOUT]: "代码验证超时，文件可能过大",
      [ErrorType.CODE_PARSE_ERROR]: "代码解析错误，请检查语法",

      [ErrorType.AI_REQUEST_FAILED]: "AI 请求失败，请稍后重试",
      [ErrorType.AI_RESPONSE_INVALID]: "AI 响应格式错误，请重试",
      [ErrorType.AI_TIMEOUT]: "AI 响应超时，请稍后重试",

      [ErrorType.STORAGE_QUOTA_EXCEEDED]: "存储空间不足，请清理数据",
      [ErrorType.STORAGE_READ_FAILED]: "读取数据失败，请刷新页面",
      [ErrorType.STORAGE_WRITE_FAILED]: "保存数据失败，请检查存储空间",

      [ErrorType.NETWORK_ERROR]: "网络连接失败，请检查网络",
      [ErrorType.NETWORK_TIMEOUT]: "网络请求超时，请稍后重试",

      [ErrorType.UNKNOWN_ERROR]: "发生未知错误，请刷新页面重试",
      [ErrorType.INVALID_PARAMETER]: "参数错误，请检查输入",
      [ErrorType.OPERATION_CANCELLED]: "操作已取消",
    };

    return messages[type] || messages[ErrorType.UNKNOWN_ERROR];
  }

  /**
   * 判断是否可恢复
   */
  private isRecoverable(type: ErrorType): boolean {
    const nonRecoverable = [
      ErrorType.STORAGE_QUOTA_EXCEEDED,
      ErrorType.NETWORK_ERROR,
      ErrorType.NETWORK_TIMEOUT,
    ];
    return !nonRecoverable.includes(type);
  }

  /**
   * 判断是否可重试
   */
  private isRetryable(type: ErrorType): boolean {
    const retryable = [
      ErrorType.PREVIEW_UPDATE_FAILED,
      ErrorType.PREVIEW_TIMEOUT,
      ErrorType.SNAPSHOT_CREATE_FAILED,
      ErrorType.SNAPSHOT_RESTORE_FAILED,
      ErrorType.AI_REQUEST_FAILED,
      ErrorType.AI_TIMEOUT,
      ErrorType.NETWORK_ERROR,
      ErrorType.NETWORK_TIMEOUT,
    ];
    return retryable.includes(type);
  }

  /**
   * 记录错误日志
   */
  private logError(errorInfo: ErrorInfo): void {
    this.errorLog.push(errorInfo);

    // 限制日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // 控制台输出
    const logMethod = this.getLogMethod(errorInfo.severity);
    console[logMethod](
      `[ErrorHandler] ${errorInfo.type}: ${errorInfo.message}`,
      errorInfo.details
    );
  }

  /**
   * 通知用户
   */
  private notifyUser(errorInfo: ErrorInfo): void {
    // 这里可以集成到 UI 通知系统
    // 目前使用 console.warn
    logger.warn('${errorInfo.userMessage}');
  }

  /**
   * 获取日志方法
   */
  private getLogMethod(severity: ErrorSeverity): "log" | "warn" | "error" {
    switch (severity) {
      case ErrorSeverity.LOW:
        return "log";
      case ErrorSeverity.MEDIUM:
        return "warn";
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return "error";
      default:
        return "log";
    }
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 导出单例实例
export const errorHandler = ErrorHandler.getInstance();

// 导出便捷方法
export const handleError = errorHandler.handleError.bind(errorHandler);
export const wrapAsync = errorHandler.wrapAsync.bind(errorHandler);
export const retryAsync = errorHandler.retryAsync.bind(errorHandler);
export const validateParameter = errorHandler.validateParameter.bind(errorHandler);
export const validateArray = errorHandler.validateArray.bind(errorHandler);
export const validateString = errorHandler.validateString.bind(errorHandler);
export const validateNumber = errorHandler.validateNumber.bind(errorHandler);
