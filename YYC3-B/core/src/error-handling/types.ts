/**
 * @description 错误类型定义
 * @module @yyc3/core/error-handling/types
 */

export type ErrorCategory =
  | 'network'
  | 'parse'
  | 'auth'
  | 'runtime'
  | 'validation'
  | 'storage'
  | 'unknown';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AppError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  source?: string;
  userAction?: string;
  timestamp: number;
  resolved: boolean;
}

export interface ErrorStats {
  total: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  unresolvedCount: number;
  lastErrorTime: number | null;
  recent: AppError[];
}
