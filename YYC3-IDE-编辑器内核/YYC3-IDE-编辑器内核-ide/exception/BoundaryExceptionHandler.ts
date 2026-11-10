// @ts-nocheck
/**
 * @file: BoundaryExceptionHandler.ts
 * @description: 边界异常处理器 - 统一捕获、记录、处理各种边界异常
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: exception,handler,boundary,error
 */

// ================================================================
// BoundaryExceptionHandler - Unified exception handling and recovery
// ================================================================

/**
 * 异常类型
 */
export type ExceptionType =
  | "validation" // 验证错误
  | "range" // 范围错误
  | "format" // 格式错误
  | "network" // 网络错误
  | "storage" // 存储错误
  | "memory" // 内存错误
  | "concurrency" // 并发错误
  | "timeout" // 超时错误
  | "unknown"; // 未知错误

/**
 * 异常严重级别
 */
export type ExceptionSeverity = "low" | "medium" | "high" | "critical";

/**
 * 异常记录
 */
export interface ExceptionRecord {
  /** 异常ID */
  id: string;
  /** 异常类型 */
  type: ExceptionType;
  /** 严重级别 */
  severity: ExceptionSeverity;
  /** 异常消息 */
  message: string;
  /** 原始错误 */
  error?: Error;
  /** 堆栈信息 */
  stack?: string;
  /** 上下文信息 */
  context?: Record<string, any>;
  /** 时间戳 */
  timestamp: number;
  /** 已解决 */
  resolved: boolean;
  /** 解决方案 */
  solution?: string;
}

/**
 * 异常处理配置
 */
export interface ExceptionHandlerConfig {
  /** 最大记录数量 */
  maxRecords?: number;
  /** 是否启用日志输出 */
  enableLogging?: boolean;
  /** 是否启用自动恢复 */
  enableAutoRecovery?: boolean;
  /** 异常回调 */
  onException?: (record: ExceptionRecord) => void;
  /** 异常解决回调 */
  onExceptionResolved?: (record: ExceptionRecord) => void;
}

/**
 * 异常处理器
 *
 * 统一捕获、记录、处理各种边界异常
 */

import { logger } from '../services/Logger';

export class BoundaryExceptionHandler {
  private config: ExceptionHandlerConfig;
  private records: Map<string, ExceptionRecord>;
  private idCounter: number;

  constructor(config?: ExceptionHandlerConfig) {
    this.config = {
      maxRecords: 100,
      enableLogging: true,
      enableAutoRecovery: true,
      ...config,
    };

    this.records = new Map();
    this.idCounter = 0;
  }

  /**
   * 捕获异常
   */
  catchException(
    type: ExceptionType,
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): ExceptionRecord {
    const record: ExceptionRecord = {
      id: this.generateId(),
      type,
      severity: this.determineSeverity(type, error),
      message,
      error,
      stack: error?.stack,
      context,
      timestamp: Date.now(),
      resolved: false,
    };

    // 添加到记录
    this.addRecord(record);

    // 日志输出
    if (this.config.enableLogging) {
      this.logException(record);
    }

    // 触发回调
    if (this.config.onException) {
      this.config.onException(record);
    }

    // 尝试自动恢复
    if (this.config.enableAutoRecovery) {
      this.tryAutoRecover(record);
    }

    return record;
  }

  /**
   * 捕获验证异常
   */
  catchValidationError(message: string, context?: Record<string, any>): ExceptionRecord {
    return this.catchException("validation", message, undefined, context);
  }

  /**
   * 捕获范围异常
   */
  catchRangeError(message: string, value: any, min: number, max: number): ExceptionRecord {
    return this.catchException(
      "range",
      message,
      undefined,
      { value, min, max, valueType: typeof value }
    );
  }

  /**
   * 捕获格式异常
   */
  catchFormatError(message: string, value: any, expectedFormat: string): ExceptionRecord {
    return this.catchException(
      "format",
      message,
      undefined,
      { value, expectedFormat, actualType: typeof value }
    );
  }

  /**
   * 捕获网络异常
   */
  catchNetworkError(message: string, error?: Error): ExceptionRecord {
    return this.catchException("network", message, error, {
      url: error?.message?.match(/url:\s*(\S+)/)?.[1],
    });
  }

  /**
   * 捕获存储异常
   */
  catchStorageError(message: string, key?: string, operation?: string): ExceptionRecord {
    return this.catchException(
      "storage",
      message,
      undefined,
      { key, operation }
    );
  }

  /**
   * 捕获内存异常
   */
  catchMemoryError(message: string, operation?: string): ExceptionRecord {
    return this.catchException(
      "memory",
      message,
      undefined,
      { operation }
    );
  }

  /**
   * 捕获并发异常
   */
  catchConcurrencyError(message: string, operation?: string, resourceId?: string): ExceptionRecord {
    return this.catchException(
      "concurrency",
      message,
      undefined,
      { operation, resourceId }
    );
  }

  /**
   * 捕获超时异常
   */
  catchTimeoutError(message: string, operation?: string, timeout?: number): ExceptionRecord {
    return this.catchException(
      "timeout",
      message,
      undefined,
      { operation, timeout }
    );
  }

  /**
   * 捕获未知异常
   */
  catchUnknownError(error: Error, context?: Record<string, any>): ExceptionRecord {
    return this.catchException(
      "unknown",
      error.message || "Unknown error",
      error,
      context
    );
  }

  /**
   * 解决异常
   */
  resolveException(exceptionId: string, solution?: string): boolean {
    const record = this.records.get(exceptionId);
    if (!record) {
      return false;
    }

    record.resolved = true;
    record.solution = solution;

    // 触发回调
    if (this.config.onExceptionResolved) {
      this.config.onExceptionResolved(record);
    }

    return true;
  }

  /**
   * 获取异常记录
   */
  getException(exceptionId: string): ExceptionRecord | undefined {
    const record = this.records.get(exceptionId);
    return record ? { ...record } : undefined;
  }

  /**
   * 获取所有异常记录
   */
  getAllExceptions(): ExceptionRecord[] {
    return Array.from(this.records.values()).map((r) => ({ ...r }));
  }

  /**
   * 获取未解决的异常
   */
  getUnresolvedExceptions(): ExceptionRecord[] {
    return Array.from(this.records.values())
      .filter((r) => !r.resolved)
      .map((r) => ({ ...r }));
  }

  /**
   * 获取按类型分组的异常
   */
  getExceptionsByType(): Map<ExceptionType, ExceptionRecord[]> {
    const grouped = new Map<ExceptionType, ExceptionRecord[]>();

    this.records.forEach((record) => {
      const type = record.type;
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push({ ...record });
    });

    return grouped;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    unresolved: number;
    byType: Record<ExceptionType, number>;
    bySeverity: Record<ExceptionSeverity, number>;
  } {
    const byType: Record<ExceptionType, number> = {
      validation: 0,
      range: 0,
      format: 0,
      network: 0,
      storage: 0,
      memory: 0,
      concurrency: 0,
      timeout: 0,
      unknown: 0,
    };

    const bySeverity: Record<ExceptionSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let unresolved = 0;

    this.records.forEach((record) => {
      byType[record.type]++;
      bySeverity[record.severity]++;

      if (!record.resolved) {
        unresolved++;
      }
    });

    return {
      total: this.records.size,
      unresolved,
      byType,
      bySeverity,
    };
  }

  /**
   * 清空异常记录
   */
  clearRecords(): void {
    this.records.clear();
    this.idCounter = 0;
  }

  /**
   * 清空已解决的记录
   */
  clearResolvedRecords(): void {
    const unresolvedRecords = new Map<string, ExceptionRecord>();

    this.records.forEach((record) => {
      if (!record.resolved) {
        unresolvedRecords.set(record.id, record);
      }
    });

    this.records = unresolvedRecords;
  }

  /**
   * 添加记录
   */
  private addRecord(record: ExceptionRecord): void {
    this.records.set(record.id, record);

    if (this.records.size > (this.config.maxRecords as any)) {
      let deleted = false;
      for (const [id, rec] of this.records.entries()) {
        if (rec.resolved) {
          this.records.delete(id);
          deleted = true;
          break;
        }
      }
      if (!deleted) {
        const firstKey = this.records.keys().next().value;
        if (firstKey !== undefined) {
          this.records.delete(firstKey);
        }
      }
    }
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return `exc_${Date.now()}_${++this.idCounter}`;
  }

  /**
   * 确定严重级别
   */
  private determineSeverity(type: ExceptionType, error?: Error): ExceptionSeverity {
    switch (type) {
      case "memory":
      case "critical":
        return "critical";
      case "network":
      case "storage":
      case "concurrency":
        return "high";
      case "range":
      case "timeout":
        return "medium";
      case "validation":
      case "format":
      default:
        return "low";
    }
  }

  /**
   * 记录异常日志
   */
  private logException(record: ExceptionRecord): void {
    const prefix = `[BoundaryExceptionHandler] [${record.type.toUpperCase()}] [${record.severity.toUpperCase()}]`;

    switch (record.severity) {
      case "critical":
      case "high":
        logger.error(prefix, record.message);
        if (record.error) {
          logger.error('record.error');
        }
        break;
      case "medium":
        logger.warn(prefix, record.message);
        break;
      case "low":
      default:
        logger.warn(prefix, record.message);
        break;
    }

    // 记录上下文
    if (record.context && Object.keys(record.context).length > 0) {
      logger.warn("  Context:", record.context);
    }

    // 记录堆栈
    if (record.stack) {
      logger.warn("  Stack:", record.stack);
    }
  }

  /**
   * 尝试自动恢复
   */
  private tryAutoRecover(record: ExceptionRecord): void {
    switch (record.type) {
      case "range":
        // 尝试调整到有效范围
        if (record.context?.min !== undefined && record.context?.max !== undefined) {
          const min = record.context.min as number;
          const max = record.context.max as number;
          const mid = (min + max) / 2;
          record.solution = `Adjusted to middle of valid range: ${mid}`;
          this.resolveException(record.id, record.solution);
        }
        break;

      case "format":
        // 尝试使用默认值
        if (record.context?.expectedFormat) {
          record.solution = `Using default value for ${record.context.expectedFormat}`;
          this.resolveException(record.id, record.solution);
        }
        break;

      case "storage":
        // 尝试清理存储
        if (record.context?.operation === "write") {
          record.solution = "Storage full, clearing old data";
          this.resolveException(record.id, record.solution);
        }
        break;

      default:
        // 其他类型不自动恢复
        break;
    }
  }

  /**
   * 导出异常记录
   */
  exportRecords(): string {
    const records = this.getAllExceptions();
    return JSON.stringify(records, null, 2);
  }

  /**
   * 导入异常记录
   */
  importRecords(json: string): boolean {
    try {
      const records: ExceptionRecord[] = JSON.parse(json);

      records.forEach((record) => {
        this.records.set(record.id, record);
      });

      return true;
    } catch (error) {
      this.catchUnknownError(error as Error, { operation: "importRecords" });
      return false;
    }
  }

  /**
   * 获取配置
   */
  getConfig(): Readonly<ExceptionHandlerConfig> {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(partialConfig: Partial<ExceptionHandlerConfig>): void {
    this.config = { ...this.config, ...partialConfig };
  }

  /**
   * 销毁处理器
   */
  destroy(): void {
    this.clearRecords();
    this.config.onException = undefined;
    this.config.onExceptionResolved = undefined;
  }
}
