/**
 * @file: PreviewErrorCapturer.ts
 * @description: 预览窗口错误捕获系统 - 捕获运行时错误、Promise异常、资源加载错误、控制台错误
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: error,capture,preview,runtime,monitoring
 */

import { generateId } from '../utils/generateId';
import { logger } from "../services/Logger";

/**
 * 错误类型枚举
 */
export enum ErrorType {
  RUNTIME = 'runtime',           // 运行时错误
  PROMISE = 'promise',           // Promise未处理异常
  RESOURCE = 'resource',         // 资源加载错误
  CONSOLE = 'console',           // 控制台错误
  NETWORK = 'network',           // 网络错误
  SYNTAX = 'syntax',             // 语法错误
  TYPE = 'type',                 // 类型错误
  REFERENCE = 'reference',       // 引用错误
}

/**
 * 错误级别枚举
 */
export enum ErrorLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * 错误来源枚举
 */
export enum ErrorSource {
  USER_CODE = 'user_code',       // 用户代码
  SYSTEM = 'system',             // 系统代码
  EXTERNAL = 'external',         // 外部库
  UNKNOWN = 'unknown',           // 未知来源
}

/**
 * 错误条目接口
 */
export interface ErrorEntry {
  id: string;
  type: ErrorType;
  level: ErrorLevel;
  source: ErrorSource;
  message: string;
  timestamp: number;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  data?: Record<string, any>;
}

/**
 * 错误捕获配置
 */
export interface ErrorCapturerConfig {
  maxEntries: number;           // 最大错误条目数
  enableConsole: boolean;       // 是否捕获控制台错误
  enableRuntime: boolean;       // 是否捕获运行时错误
  enablePromise: boolean;       // 是否捕获Promise异常
  enableResource: boolean;      // 是否捕获资源加载错误
  ignorePatterns: RegExp[];     // 忽略的错误模式
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ErrorCapturerConfig = {
  maxEntries: 1000,
  enableConsole: true,
  enableRuntime: true,
  enablePromise: true,
  enableResource: true,
  ignorePatterns: [],
};

/**
 * 预览窗口错误捕获器
 */
export class PreviewErrorCapturer {
  private errors: ErrorEntry[] = [];
  private config: ErrorCapturerConfig;
  private listeners: Set<(error: ErrorEntry) => void> = new Set();
  private originalConsole: Record<string, (...args: unknown[]) => void> = {};
  private originalOnError: OnErrorEventHandler | null = null;
  private originalOnUnhandledRejection: ((event: PromiseRejectionEvent) => void) | null = null;

  constructor(config: Partial<ErrorCapturerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 启动错误捕获
   */
  start(): void {
    if (this.config.enableRuntime) {
      this.captureRuntimeErrors();
    }
    if (this.config.enablePromise) {
      this.capturePromiseRejections();
    }
    if (this.config.enableResource) {
      this.captureResourceErrors();
    }
    if (this.config.enableConsole) {
      this.captureConsoleErrors();
    }
  }

  /**
   * 停止错误捕获
   */
  stop(): void {
    this.restoreOriginalHandlers();
    this.listeners.clear();
  }

  /**
   * 捕获运行时错误
   */
  private captureRuntimeErrors(): void {
    this.originalOnError = window.onerror;

    window.onerror = (message, filename, lineno, colno, error) => {
      const entry = this.createErrorEntry({
        type: this.classifyRuntimeError(error),
        level: ErrorLevel.ERROR,
        source: this.determineErrorSource(filename),
        message: String(message),
        stack: error?.stack,
        filename,
        lineno,
        colno,
      });

      if (!this.shouldIgnore(entry)) {
        this.addError(entry);
      }

      // 调用原始处理器
      if (this.originalOnError) {
        return this.originalOnError(message, filename, lineno, colno, error);
      }

      return false;
    };
  }

  /**
   * 捕获Promise未处理异常
   */
  private capturePromiseRejections(): void {
    this.originalOnUnhandledRejection = window.onunhandledrejection;

    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      const stack = error instanceof Error ? error.stack : undefined;

      const entry = this.createErrorEntry({
        type: ErrorType.PROMISE,
        level: ErrorLevel.ERROR,
        source: ErrorSource.USER_CODE,
        message: error instanceof Error ? error.message : String(error),
        stack,
        data: {
          reason: error,
        },
      });

      if (!this.shouldIgnore(entry)) {
        this.addError(entry);
      }

      // 调用原始处理器
      if (this.originalOnUnhandledRejection) {
        this.originalOnUnhandledRejection(event);
      }
    };
  }

  /**
   * 捕获资源加载错误
   */
  private captureResourceErrors(): void {
    window.addEventListener('error', (event: Event) => {
      const target = event.target;

      if (target && (target instanceof HTMLImageElement ||
                     target instanceof HTMLScriptElement ||
                     target instanceof HTMLLinkElement)) {
        const src = target instanceof HTMLImageElement ? target.src :
                    target instanceof HTMLScriptElement ? target.src :
                    target instanceof HTMLLinkElement ? target.href : '';

        const entry = this.createErrorEntry({
          type: ErrorType.RESOURCE,
          level: ErrorLevel.ERROR,
          source: ErrorSource.EXTERNAL,
          message: `Failed to load resource: ${src}`,
          data: {
            tagName: target.tagName,
            src,
          },
        });

        if (!this.shouldIgnore(entry)) {
          this.addError(entry);
        }
      }
    }, true); // 使用捕获阶段
  }

  /**
   * 捕获控制台错误
   */
  private captureConsoleErrors(): void {
    const methods = ['error', 'warn', 'info', 'debug'] as const;

    methods.forEach(method => {
      this.originalConsole[method] = console[method];

      console[method] = (...args: any[]) => {
        const level = this.mapConsoleMethodToLevel(method);

        const entry = this.createErrorEntry({
          type: ErrorType.CONSOLE,
          level,
          source: ErrorSource.USER_CODE,
          message: args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' '),
          data: {
            args,
            method,
          },
        });

        if (!this.shouldIgnore(entry)) {
          this.addError(entry);
        }

        // 调用原始方法
        this.originalConsole[method].apply(console, args);
      };
    });
  }

  /**
   * 恢复原始处理器
   */
  private restoreOriginalHandlers(): void {
    if (this.originalOnError !== null) {
      window.onerror = this.originalOnError;
    }
    if (this.originalOnUnhandledRejection !== null) {
      window.onunhandledrejection = this.originalOnUnhandledRejection;
    }

    // 恢复控制台方法
    Object.entries(this.originalConsole).forEach(([method, original]) => {
      (console as any)[method] = original;
    });
  }

  /**
   * 创建错误条目
   */
  private createErrorEntry(partial: Partial<ErrorEntry>): ErrorEntry {
    return {
      id: generateId(),
      type: partial.type || ErrorType.RUNTIME,
      level: partial.level || ErrorLevel.ERROR,
      source: partial.source || ErrorSource.UNKNOWN,
      message: partial.message || '',
      timestamp: Date.now(),
      stack: partial.stack,
      filename: partial.filename,
      lineno: partial.lineno,
      colno: partial.colno,
      data: partial.data,
    };
  }

  /**
   * 添加错误条目
   */
  private addError(error: ErrorEntry): void {
    this.errors.push(error);

    // 限制错误数量
    if (this.errors.length > this.config.maxEntries) {
      this.errors.shift();
    }

    // 通知监听器
    this.notifyListeners(error);
  }

  /**
   * 判断是否应该忽略错误
   */
  private shouldIgnore(error: ErrorEntry): boolean {
    return this.config.ignorePatterns.some(pattern =>
      pattern.test(error.message)
    );
  }

  /**
   * 分类运行时错误
   */
  private classifyRuntimeError(error: Error | undefined): ErrorType {
    if (!error) return ErrorType.RUNTIME;

    if (error instanceof SyntaxError) return ErrorType.SYNTAX;
    if (error instanceof TypeError) return ErrorType.TYPE;
    if (error instanceof ReferenceError) return ErrorType.REFERENCE;

    return ErrorType.RUNTIME;
  }

  /**
   * 确定错误来源
   */
  private determineErrorSource(filename: string | undefined): ErrorSource {
    if (!filename) return ErrorSource.UNKNOWN;

    // 用户代码
    if (filename.includes('src/') ||
        filename.includes('app/') ||
        filename.startsWith('file://')) {
      return ErrorSource.USER_CODE;
    }

    // 外部库
    if (filename.includes('node_modules') ||
        filename.includes('https://') ||
        filename.includes('http://')) {
      return ErrorSource.EXTERNAL;
    }

    return ErrorSource.SYSTEM;
  }

  /**
   * 映射控制台方法到错误级别
   */
  private mapConsoleMethodToLevel(method: string): ErrorLevel {
    switch (method) {
      case 'error': return ErrorLevel.ERROR;
      case 'warn': return ErrorLevel.WARN;
      case 'info': return ErrorLevel.INFO;
      case 'debug': return ErrorLevel.DEBUG;
      default: return ErrorLevel.INFO;
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(error: ErrorEntry): void {
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        logger.error('Error in listener:', e);
      }
    });
  }

  // ── 公共API ────────────────────────────────────────────────

  /**
   * 获取所有错误
   */
  getErrors(): ErrorEntry[] {
    return [...this.errors];
  }

  /**
   * 获取错误数量
   */
  getErrorCount(): number {
    return this.errors.length;
  }

  /**
   * 清空错误
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * 添加错误监听器
   */
  addListener(listener: (error: ErrorEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 手动添加错误
   */
  captureManualError(
    type: ErrorType,
    message: string,
    level: ErrorLevel = ErrorLevel.ERROR,
    data?: Record<string, any>
  ): void {
    const entry = this.createErrorEntry({
      type,
      level,
      source: ErrorSource.USER_CODE,
      message,
      data,
    });

    if (!this.shouldIgnore(entry)) {
      this.addError(entry);
    }
  }

  /**
   * 导出错误
   */
  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    byLevel: Record<ErrorLevel, number>;
    bySource: Record<ErrorSource, number>;
  } {
    const stats = {
      total: this.errors.length,
      byType: {} as Record<ErrorType, number>,
      byLevel: {} as Record<ErrorLevel, number>,
      bySource: {} as Record<ErrorSource, number>,
    };

    // 初始化统计对象
    Object.values(ErrorType).forEach(type => {
      stats.byType[type] = 0;
    });
    Object.values(ErrorLevel).forEach(level => {
      stats.byLevel[level] = 0;
    });
    Object.values(ErrorSource).forEach(source => {
      stats.bySource[source] = 0;
    });

    // 统计
    this.errors.forEach(error => {
      stats.byType[error.type]++;
      stats.byLevel[error.level]++;
      stats.bySource[error.source]++;
    });

    return stats;
  }
}

/**
 * 单例实例
 */
let instance: PreviewErrorCapturer | null = null;

/**
 * 获取单例实例
 */
export function getPreviewErrorCapturer(
  config?: Partial<ErrorCapturerConfig>
): PreviewErrorCapturer {
  if (!instance) {
    instance = new PreviewErrorCapturer(config);
  }
  return instance;
}
