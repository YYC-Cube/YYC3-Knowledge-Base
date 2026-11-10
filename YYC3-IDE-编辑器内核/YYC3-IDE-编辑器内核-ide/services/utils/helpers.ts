/**
 * @file: services/utils/helpers.ts
 * @description: 通用工具函数集 — debounce, throttle, retry, delay, id 生成等
 *              补充现有 utils/ 目录中缺失的通用能力
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-06-04
 * @updated: 2026-06-04
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: utils,helpers,debounce,throttle,retry
 */

// ================================================================
// 通用工具函数 — 补充现有 utils/ 目录中缺失的通用能力
// ================================================================
// 现有 utils 文件：clipboard.ts, generateId.ts, xterm-theme.ts,
//   SafariCompat.ts, ErrorHandler.ts, BoundaryHandler.ts, performanceBenchmark.ts
// 本模块补充：debounce, throttle, retry, delay, once, memoize, tryCatch 等
// ================================================================

// ── 时间控制 ──

/** 防抖 — 延迟执行，连续调用只执行最后一次 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number,
): { (...args: Parameters<T>): void; cancel: () => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const clear = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const invoke = () => {
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
    }
    clear();
  };

  const debounced = (...args: Parameters<T>) => {
    lastArgs = args;
    clear();
    timer = setTimeout(invoke, delayMs);
  };

  debounced.cancel = clear;
  debounced.flush = invoke;

  return debounced;
}

/** 节流 — 固定频率执行，忽略间隔内的重复调用 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  intervalMs: number,
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = intervalMs - (now - lastTime);

    if (remaining <= 0) {
      lastTime = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  };
}

/** 异步延迟 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── 重试 ──

export interface RetryOptions {
  attempts?: number;
  delayMs?: number;
  backoff?: "fixed" | "exponential";
  onRetry?: (attempt: number, error: Error) => void;
}

/** 异步重试 — 支持固定/指数退避 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { attempts = 3, delayMs = 1000, backoff = "exponential", onRetry } = options;
  let lastError: Error | undefined;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < attempts - 1) {
        const wait = backoff === "exponential" ? delayMs * Math.pow(2, i) : delayMs;
        onRetry?.(i + 1, lastError);
        await delay(wait);
      }
    }
  }

  throw lastError!;
}

// ── 安全执行 ──

/** try-catch 包装，返回 [result, error] 元组 */
export async function tryCatch<T>(fn: () => Promise<T>): Promise<[T, null] | [null, Error]> {
  try {
    return [await fn(), null];
  } catch (err) {
    return [null, err instanceof Error ? err : new Error(String(err))];
  }
}

/** try-catch 同步版本 */
export function tryCatchSync<T>(fn: () => T): [T, null] | [null, Error] {
  try {
    return [fn(), null];
  } catch (err) {
    return [null, err instanceof Error ? err : new Error(String(err))];
  }
}

// ── 缓存 ──

/** 函数记忆化 — 基于第一个参数的简单缓存 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  ttlMs?: number,
): T {
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    const now = Date.now();

    if (cached && (!ttlMs || now - cached.timestamp < ttlMs)) {
      return cached.value;
    }

    const value = fn(...args);
    cache.set(key, { value, timestamp: now });

    // 限制缓存大小
    if (cache.size > 100) {
      const oldest = [...cache.entries()].sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
      if (oldest) cache.delete(oldest[0]);
    }

    return value;
  }) as T;
}

// ── 一次性函数 ──

/** 包装函数使其只执行一次 */
export function once<T extends (...args: any[]) => any>(fn: T): T {
  let called = false;
  let result: ReturnType<T>;

  return ((...args: Parameters<T>): ReturnType<T> => {
    if (!called) {
      called = true;
      result = fn(...args);
    }
    return result;
  }) as T;
}

// ── 管道 / 组合 ──

/** 从左到右管道组合 */
export function pipe<T>(...fns: Array<(arg: T) => T>): (arg: T) => T {
  return (arg: T) => fns.reduce((acc, fn) => fn(acc), arg);
}

// ── 安全 JSON ──

/** 安全 JSON.parse */
export function safeJSONParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/** 安全 JSON.stringify，失败返回 fallback */
export function safeJSONStringify(value: unknown, fallback = "{}"): string {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

// ── 格式化 ──

/** 字节大小格式化 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/** 毫秒格式化 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

// ── 断言 ──

/** 非空断言，为空时抛出 */
export function assertNonNull<T>(value: T | null | undefined, message = "值不能为空"): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`[assertNonNull] ${message}`);
  }
}

/** 条件断言 */
export function assert(condition: unknown, message = "断言失败"): asserts condition {
  if (!condition) {
    throw new Error(`[assert] ${message}`);
  }
}
