/**
 * @description 错误处理器
 * @module @yyc3/core/error-handling/error-handler
 */

import type {
  ErrorCategory,
  ErrorSeverity,
  AppError,
  ErrorStats,
} from './types';

export interface ErrorStorage {
  save(error: AppError): void | Promise<void>;
  get(limit?: number): AppError[] | Promise<AppError[]>;
  clear(): void | Promise<void>;
}

export class LocalStorageErrorStorage implements ErrorStorage {
  private key: string;
  private maxEntries: number;

  constructor(key: string = 'yyc3_error_log', maxEntries: number = 200) {
    this.key = key;
    this.maxEntries = maxEntries;
  }

  save(error: AppError): void {
    try {
      const log = this.get();
      log.unshift(error);
      const trimmed = log.slice(0, this.maxEntries);
      localStorage.setItem(this.key, JSON.stringify(trimmed));
    } catch {
      try {
        localStorage.setItem(this.key, JSON.stringify([error]));
      } catch {}
    }
  }

  get(limit?: number): AppError[] {
    try {
      const raw = localStorage.getItem(this.key);
      const log = raw ? JSON.parse(raw) : [];
      return limit ? log.slice(0, limit) : log;
    } catch {
      return [];
    }
  }

  clear(): void {
    localStorage.removeItem(this.key);
  }
}

export interface ErrorHandlerConfig {
  storage?: ErrorStorage;
  installGlobalListeners?: boolean;
  logToConsole?: boolean;
  platformErrorFilter?: (
    name: string,
    message: string,
    source?: string,
    stack?: string
  ) => boolean;
}

export class ErrorHandler {
  private storage: ErrorStorage;
  private config: ErrorHandlerConfig;
  private listenersInstalled: boolean;

  constructor(config: ErrorHandlerConfig = {}) {
    this.storage = config.storage || new LocalStorageErrorStorage();
    this.config = {
      installGlobalListeners: true,
      logToConsole: true,
      ...config,
    };
    this.listenersInstalled = false;
  }

  installGlobalListeners(): void {
    if (this.listenersInstalled || !this.config.installGlobalListeners) {
      return;
    }
    this.listenersInstalled = true;

    window.addEventListener('error', (event) => {
      if (this.config.platformErrorFilter) {
        const name = event.error?.name || event.error?.constructor?.name || '';
        const msg = String(event.message || '');
        const stack = event.error?.stack || '';
        if (
          this.config.platformErrorFilter(
            name,
            msg,
            event.filename || '',
            stack
          )
        ) {
          return;
        }
      }
      this.capture(event.error || event.message, {
        category: 'runtime',
        severity: 'critical',
        source: `${event.filename}:${event.lineno}:${event.colno}`,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      if (this.config.platformErrorFilter) {
        const reason = event.reason;
        const name = reason?.name || reason?.constructor?.name || '';
        const msg = String(reason?.message || reason || '');
        const stack = reason?.stack || '';
        if (this.config.platformErrorFilter(name, msg, undefined, stack)) {
          event.preventDefault();
          return;
        }
      }
      this.capture(event.reason, {
        category: 'runtime',
        severity: 'error',
        source: 'UnhandledPromiseRejection',
      });
    });

    console.info('[YYC3 Error Handler] 全局错误监听器已安装');
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private categorizeError(error: unknown): {
    category: ErrorCategory;
    severity: ErrorSeverity;
  } {
    if (error instanceof TypeError) {
      return { category: 'runtime', severity: 'error' };
    }
    if (error instanceof SyntaxError) {
      return { category: 'parse', severity: 'error' };
    }
    if (error instanceof DOMException) {
      if (error.name === 'QuotaExceededError') {
        return { category: 'storage', severity: 'warning' };
      }
      if (error.name === 'SecurityError') {
        return { category: 'auth', severity: 'error' };
      }
    }
    if (error instanceof Event && error.type === 'error') {
      return { category: 'network', severity: 'error' };
    }
    return { category: 'unknown', severity: 'error' };
  }

  private extractMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as Record<string, unknown>).message);
    }
    return '未知错误';
  }

  private extractStack(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.stack;
    }
    return undefined;
  }

  capture(
    error: unknown,
    options: {
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      source?: string;
      userAction?: string;
      silent?: boolean;
    } = {}
  ): AppError {
    const auto = this.categorizeError(error);

    const appError: AppError = {
      id: this.generateErrorId(),
      category: options.category || auto.category,
      severity: options.severity || auto.severity,
      message: this.extractMessage(error),
      stack: this.extractStack(error),
      source: options.source,
      userAction: options.userAction,
      timestamp: Date.now(),
      resolved: false,
    };

    this.storage.save(appError);

    if (this.config.logToConsole && !options.silent) {
      const prefix = `[YYC3 Error ${appError.category}]`;
      switch (appError.severity) {
        case 'critical':
        case 'error':
          console.error(prefix, appError.message, appError.stack || '');
          break;
        case 'warning':
          console.warn(prefix, appError.message);
          break;
        default:
          console.info(prefix, appError.message);
      }
    }

    return appError;
  }

  getErrorLog(limit?: number): AppError[] | Promise<AppError[]> {
    const log = this.storage.get(limit);
    return log;
  }

  async getErrorStats(): Promise<ErrorStats> {
    const log = await this.storage.get();
    const byCategory: Record<ErrorCategory, number> = {
      network: 0,
      parse: 0,
      auth: 0,
      runtime: 0,
      validation: 0,
      storage: 0,
      unknown: 0,
    };
    const bySeverity: Record<ErrorSeverity, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };
    let unresolvedCount = 0;

    for (const err of log) {
      byCategory[err.category] = (byCategory[err.category] || 0) + 1;
      bySeverity[err.severity] = (bySeverity[err.severity] || 0) + 1;
      if (!err.resolved) {
        unresolvedCount++;
      }
    }

    return {
      total: log.length,
      byCategory,
      bySeverity,
      unresolvedCount,
      lastErrorTime: log.length > 0 ? log[0].timestamp : null,
      recent: log.slice(0, 10),
    };
  }

  clearErrorLog(): void | Promise<void> {
    this.storage.clear();
  }

  async trySafe<T>(
    fn: () => Promise<T>,
    source?: string
  ): Promise<[T, null] | [null, AppError]> {
    try {
      const result = await fn();
      return [result, null];
    } catch (err) {
      const appError = this.capture(err, { source });
      return [null, appError];
    }
  }

  trySafeSync<T>(fn: () => T, source?: string): [T, null] | [null, AppError] {
    try {
      const result = fn();
      return [result, null];
    } catch (err) {
      const appError = this.capture(err, { source });
      return [null, appError];
    }
  }
}

let globalErrorHandler: ErrorHandler | null = null;

export function getErrorHandler(config?: ErrorHandlerConfig): ErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new ErrorHandler(config);
    globalErrorHandler.installGlobalListeners();
  }
  return globalErrorHandler;
}

export function captureError(
  error: unknown,
  options?: Parameters<ErrorHandler['capture']>[1]
): AppError {
  return getErrorHandler().capture(error, options);
}

export function getErrorLog(limit?: number): AppError[] | Promise<AppError[]> {
  return getErrorHandler().getErrorLog(limit);
}

export function getErrorStats(): ErrorStats | Promise<ErrorStats> {
  return getErrorHandler().getErrorStats();
}

export function clearErrorLog(): void | Promise<void> {
  return getErrorHandler().clearErrorLog();
}

export function trySafe<T>(
  fn: () => Promise<T>,
  source?: string
): Promise<[T, null] | [null, AppError]> {
  return getErrorHandler().trySafe(fn, source);
}

export function trySafeSync<T>(
  fn: () => T,
  source?: string
): [T, null] | [null, AppError] {
  return getErrorHandler().trySafeSync(fn, source);
}
