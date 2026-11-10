// @ts-nocheck
/**
 * @file: BoundaryHandler.ts
 * @description: 边界情况处理器，处理空文件、超大文件、并发操作等边界情况
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: boundary,handler,edge-case,stability
 */

import { ErrorType, ErrorSeverity, handleError } from "./ErrorHandler";
import { logger } from "../services/Logger";

/**
 * 边界情况类型
 */
export enum BoundaryType {
  EMPTY_FILE = "EMPTY_FILE",
  LARGE_FILE = "LARGE_FILE",
  INVALID_CONTENT = "INVALID_CONTENT",
  CONCURRENT_ACCESS = "CONCURRENT_ACCESS",
  RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED",
  TIMEOUT = "TIMEOUT",
}

/**
 * 边界检查结果
 */
export interface BoundaryCheckResult {
  valid: boolean;
  type?: BoundaryType;
  message?: string;
  suggestion?: string;
}

/**
 * 文件限制配置
 */
export interface FileLimits {
  maxFileSize: number;      // 最大文件大小（字节）
  maxLineCount: number;     // 最大行数
  maxLineLength: number;    // 最大行长度
  maxCharacterCount: number; // 最大字符数
}

/**
 * 默认文件限制
 */
const DEFAULT_FILE_LIMITS: FileLimits = {
  maxFileSize: 1024 * 1024,      // 1MB
  maxLineCount: 10000,           // 10000行
  maxLineLength: 1000,           // 1000字符/行
  maxCharacterCount: 1000000,    // 100万字符
};

/**
 * 并发控制配置
 */
export interface ConcurrencyConfig {
  maxConcurrentOps: number;  // 最大并发操作数
  queueTimeout: number;      // 队列超时时间（毫秒）
}

/**
 * 默认并发配置
 */
const DEFAULT_CONCURRENCY_CONFIG: ConcurrencyConfig = {
  maxConcurrentOps: 10,
  queueTimeout: 30000, // 30秒
};

/**
 * 边界情况处理器
 */
export class BoundaryHandler {
  private static instance: BoundaryHandler;
  private fileLimits: FileLimits;
  private concurrencyConfig: ConcurrencyConfig;
  private activeOperations: Map<string, Promise<any>> = new Map();
  private operationQueue: Array<() => Promise<any>> = [];
  private activeOpCount = 0;

  private constructor(
    fileLimits: Partial<FileLimits> = {},
    concurrencyConfig: Partial<ConcurrencyConfig> = {}
  ) {
    this.fileLimits = { ...DEFAULT_FILE_LIMITS, ...fileLimits };
    this.concurrencyConfig = { ...DEFAULT_CONCURRENCY_CONFIG, ...concurrencyConfig };
  }

  /**
   * 获取单例实例
   */
  static getInstance(
    fileLimits?: Partial<FileLimits>,
    concurrencyConfig?: Partial<ConcurrencyConfig>
  ): BoundaryHandler {
    if (!BoundaryHandler.instance) {
      BoundaryHandler.instance = new BoundaryHandler(fileLimits, concurrencyConfig);
    }
    return BoundaryHandler.instance;
  }

  /**
   * 检查文件内容边界
   */
  checkFileBoundary(content: string, filename: string = "unknown"): BoundaryCheckResult {
    // 检查空文件
    if (!content || content.trim().length === 0) {
      return {
        valid: false,
        type: BoundaryType.EMPTY_FILE,
        message: `文件 ${filename} 为空`,
        suggestion: "请提供有效的文件内容",
      };
    }

    // 检查文件大小
    const sizeInBytes = new Blob([content]).size;
    if (sizeInBytes > this.fileLimits.maxFileSize) {
      return {
        valid: false,
        type: BoundaryType.LARGE_FILE,
        message: `文件 ${filename} 大小 ${this.formatSize(sizeInBytes)} 超过限制 ${this.formatSize(this.fileLimits.maxFileSize)}`,
        suggestion: "请拆分文件或删除不必要的内容",
      };
    }

    // 检查行数
    const lines = content.split("\n");
    if (lines.length > this.fileLimits.maxLineCount) {
      return {
        valid: false,
        type: BoundaryType.LARGE_FILE,
        message: `文件 ${filename} 行数 ${lines.length} 超过限制 ${this.fileLimits.maxLineCount}`,
        suggestion: "请拆分文件或删除不必要的代码",
      };
    }

    // 检查字符数
    if (content.length > this.fileLimits.maxCharacterCount) {
      return {
        valid: false,
        type: BoundaryType.LARGE_FILE,
        message: `文件 ${filename} 字符数 ${content.length} 超过限制 ${this.fileLimits.maxCharacterCount}`,
        suggestion: "请删除不必要的注释或空白字符",
      };
    }

    // 检查行长度
    const longLines = lines
      .map((line, index) => ({ line, index: index + 1 }))
      .filter(({ line }) => line.length > this.fileLimits.maxLineLength);

    if (longLines.length > 0) {
      return {
        valid: false,
        type: BoundaryType.LARGE_FILE,
        message: `文件 ${filename} 第 ${longLines[0].index} 行长度超过限制 ${this.fileLimits.maxLineLength}`,
        suggestion: "请拆分过长的代码行",
      };
    }

    // 检查无效内容
    if (this.containsInvalidCharacters(content)) {
      return {
        valid: false,
        type: BoundaryType.INVALID_CONTENT,
        message: `文件 ${filename} 包含无效字符`,
        suggestion: "请检查文件编码或移除无效字符",
      };
    }

    return { valid: true };
  }

  /**
   * 处理空文件
   */
  handleEmptyFile(filename: string, defaultContent: string = ""): string {
    logger.warn('处理空文件: ${filename}');
    return defaultContent;
  }

  /**
   * 处理超大文件
   */
  handleLargeFile(content: string, filename: string): {
    truncated: boolean;
    content: string;
    originalSize: number;
    newSize: number;
  } {
    const lines = content.split("\n");
    const originalSize = content.length;
    let truncated = false;
    let newContent = content;
    let newSize = originalSize;

    // 如果行数超限，截断
    if (lines.length > this.fileLimits.maxLineCount) {
      truncated = true;
      newContent = lines.slice(0, this.fileLimits.maxLineCount).join("\n");
      newSize = newContent.length;
      logger.warn(
        `[BoundaryHandler] 截断文件 ${filename}: ${lines.length} -> ${this.fileLimits.maxLineCount} 行`
      );
    }

    // 如果字符数超限，进一步截断
    if (newContent.length > this.fileLimits.maxCharacterCount) {
      truncated = true;
      newContent = newContent.slice(0, this.fileLimits.maxCharacterCount);
      newSize = newContent.length;
      logger.warn(
        `[BoundaryHandler] 截断文件 ${filename}: ${originalSize} -> ${newSize} 字符`
      );
    }

    return {
      truncated,
      content: newContent,
      originalSize,
      newSize,
    };
  }

  /**
   * 并发控制：执行操作
   */
  async executeWithConcurrencyControl<T>(
    operationId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // 检查是否已有相同操作在执行
    if (this.activeOperations.has(operationId)) {
      logger.warn('等待现有操作: ${operationId}');
      return this.activeOperations.get(operationId)!;
    }

    // 如果达到并发限制，加入队列
    if (this.activeOpCount >= this.concurrencyConfig.maxConcurrentOps) {
      logger.warn(
        `[BoundaryHandler] 达到并发限制 ${this.concurrencyConfig.maxConcurrentOps}，操作入队: ${operationId}`
      );
      return this.queueOperation(operation);
    }

    // 执行操作
    this.activeOpCount++;
    const operationPromise = operation();

    this.activeOperations.set(operationId, operationPromise);

    try {
      const result = await operationPromise;
      return result;
    } finally {
      this.activeOperations.delete(operationId);
      this.activeOpCount--;

      // 处理队列中的下一个操作
      if (this.operationQueue.length > 0) {
        const nextOperation = this.operationQueue.shift()!;
        nextOperation().catch((error) => {
          logger.error("[BoundaryHandler] 队列操作失败:", error);
        });
      }
    }
  }

  /**
   * 添加操作到队列
   */
  private queueOperation<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(`操作超时: 队列等待超过 ${this.concurrencyConfig.queueTimeout}ms`)
        );
      }, this.concurrencyConfig.queueTimeout);

      this.operationQueue.push(async () => {
        clearTimeout(timeout);
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * 超时控制
   */
  async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string = "operation"
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            handleError(
              new Error(`${operationName} 超时`),
              ErrorType.TIMEOUT,
              ErrorSeverity.MEDIUM
            )
          );
        }, timeoutMs);
      }),
    ]);
  }

  /**
   * 重试机制
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    operationName: string = "operation"
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(
          `[BoundaryHandler] ${operationName} 重试 ${attempt}/${maxRetries}:`,
          lastError.message
        );

        if (attempt < maxRetries) {
          await this.delay(delayMs * attempt); // 指数退避
        }
      }
    }

    throw handleError(
      lastError || new Error("Unknown error"),
      ErrorType.OPERATION_CANCELLED,
      ErrorSeverity.MEDIUM
    );
  }

  /**
   * 资源限制检查
   */
  checkResourceLimit(
    currentUsage: number,
    limit: number,
    resourceName: string
  ): BoundaryCheckResult {
    if (currentUsage >= limit) {
      return {
        valid: false,
        type: BoundaryType.RESOURCE_EXHAUSTED,
        message: `${resourceName} 使用已达到限制: ${currentUsage}/${limit}`,
        suggestion: `请释放一些 ${resourceName} 资源`,
      };
    }

    return { valid: true };
  }

  /**
   * 批处理分片
   */
  async processInBatches<T, R>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);

      // 批次间延迟，避免过载
      if (i + batchSize < items.length) {
        await this.delay(10);
      }
    }

    return results;
  }

  /**
   * 防抖执行
   */
  debounce<T extends (...args: any[]) => any>(
    fn: T,
    delayMs: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        fn(...args);
        timeoutId = null;
      }, delayMs);
    };
  }

  /**
   * 节流执行
   */
  throttle<T extends (...args: any[]) => any>(
    fn: T,
    limitMs: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limitMs);
      }
    };
  }

  /**
   * 检查是否包含无效字符
   */
  private containsInvalidCharacters(content: string): boolean {
    // 检查是否包含控制字符（除了换行、制表符、回车）
    const invalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/; // eslint-disable-line no-control-regex
    return invalidChars.test(content);
  }

  /**
   * 格式化文件大小
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取当前配置
   */
  getConfig(): { fileLimits: FileLimits; concurrencyConfig: ConcurrencyConfig } {
    return {
      fileLimits: { ...this.fileLimits },
      concurrencyConfig: { ...this.concurrencyConfig },
    };
  }

  /**
   * 更新配置
   */
  updateConfig(
    fileLimits?: Partial<FileLimits>,
    concurrencyConfig?: Partial<ConcurrencyConfig>
  ): void {
    if (fileLimits) {
      this.fileLimits = { ...this.fileLimits, ...fileLimits };
    }
    if (concurrencyConfig) {
      this.concurrencyConfig = { ...this.concurrencyConfig, ...concurrencyConfig };
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    activeOperations: number;
    queuedOperations: number;
    activeOpCount: number;
  } {
    return {
      activeOperations: this.activeOperations.size,
      queuedOperations: this.operationQueue.length,
      activeOpCount: this.activeOpCount,
    };
  }
}

// 导出单例实例
export const boundaryHandler = BoundaryHandler.getInstance();

// 导出便捷方法
export const checkFileBoundary = boundaryHandler.checkFileBoundary.bind(boundaryHandler);
export const handleEmptyFile = boundaryHandler.handleEmptyFile.bind(boundaryHandler);
export const handleLargeFile = boundaryHandler.handleLargeFile.bind(boundaryHandler);
export const executeWithConcurrencyControl = boundaryHandler.executeWithConcurrencyControl.bind(boundaryHandler);
export const withTimeout = boundaryHandler.withTimeout.bind(boundaryHandler);
export const withRetry = boundaryHandler.withRetry.bind(boundaryHandler);
export const checkResourceLimit = boundaryHandler.checkResourceLimit.bind(boundaryHandler);
export const processInBatches = boundaryHandler.processInBatches.bind(boundaryHandler);
