/**
 * @file: RateLimiter.ts
 * @description: 限流/降级服务 - 支持令牌桶、滑动窗口、熔断器模式
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-05
 * @updated: 2026-04-05
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: rate-limiter,throttle,circuit-breaker,fallback
 */

// ================================================================
// Rate Limiter - 限流/降级服务
// ================================================================
//
// 功能：
//   - 令牌桶限流
//   - 滑动窗口限流
//   - 熔断器模式
//   - 自动降级
//   - 请求队列
//   - 统计监控
//
// 使用场景：
//   - API请求限流
//   - LLM调用限流
//   - 数据库查询限流
//   - 文件操作限流
// ================================================================

// ── Types ──

import { logger } from "./Logger";
export type LimiterType = 'token-bucket' | 'sliding-window' | 'fixed-window';
export type CircuitState = 'closed' | 'open' | 'half-open';

export interface RateLimiterConfig {
  type: LimiterType;
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (context?: unknown) => string;
  onLimitReached?: (key: string) => void;
  onRecovery?: (key: string) => void;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  halfOpenMaxCalls: number;
  onStateChange?: (state: CircuitState) => void;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export interface LimiterStats {
  totalRequests: number;
  allowedRequests: number;
  rejectedRequests: number;
  currentRate: number;
  averageWaitTime: number;
}

// ── Token Bucket Limiter ──

export class TokenBucketLimiter {
  private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map();
  private config: Required<Pick<RateLimiterConfig, 'maxRequests' | 'windowMs'>>;

  constructor(config: { maxRequests: number; windowMs: number }) {
    this.config = config;
  }

  tryAcquire(key: string = 'default'): RateLimitResult {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket) {
      this.buckets.set(key, {
        tokens: this.config.maxRequests - 1,
        lastRefill: now,
      });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: now + this.config.windowMs,
      };
    }

    const elapsed = now - bucket.lastRefill;
    const refillRate = this.config.maxRequests / this.config.windowMs;
    const newTokens = Math.floor(elapsed * refillRate);

    bucket.tokens = Math.min(this.config.maxRequests, bucket.tokens + newTokens);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens--;
      return {
        allowed: true,
        remaining: bucket.tokens,
        resetAt: now + this.config.windowMs,
      };
    }

    const waitTime = Math.ceil((1 - bucket.tokens) / refillRate);
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + waitTime,
      retryAfter: waitTime,
    };
  }

  getStats(key: string = 'default'): { tokens: number; lastRefill: number } | null {
    return this.buckets.get(key) || null;
  }

  reset(key: string = 'default'): void {
    this.buckets.delete(key);
  }

  resetAll(): void {
    this.buckets.clear();
  }
}

// ── Sliding Window Limiter ──

export class SlidingWindowLimiter {
  private windows: Map<string, number[]> = new Map();
  private config: Required<Pick<RateLimiterConfig, 'maxRequests' | 'windowMs'>>;

  constructor(config: { maxRequests: number; windowMs: number }) {
    this.config = config;
  }

  tryAcquire(key: string = 'default'): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let timestamps = this.windows.get(key) || [];

    timestamps = timestamps.filter(ts => ts > windowStart);

    if (timestamps.length < this.config.maxRequests) {
      timestamps.push(now);
      this.windows.set(key, timestamps);
      return {
        allowed: true,
        remaining: this.config.maxRequests - timestamps.length,
        resetAt: timestamps[0] + this.config.windowMs,
      };
    }

    const oldestTimestamp = timestamps[0];
    const retryAfter = oldestTimestamp + this.config.windowMs - now;

    return {
      allowed: false,
      remaining: 0,
      resetAt: oldestTimestamp + this.config.windowMs,
      retryAfter: Math.max(0, retryAfter),
    };
  }

  getStats(key: string = 'default'): { count: number; oldestTimestamp: number } | null {
    const timestamps = this.windows.get(key);
    if (!timestamps || timestamps.length === 0) return null;
    return {
      count: timestamps.length,
      oldestTimestamp: timestamps[0],
    };
  }

  reset(key: string = 'default'): void {
    this.windows.delete(key);
  }

  resetAll(): void {
    this.windows.clear();
  }
}

// ── Circuit Breaker ──

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenCalls: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.timeout) {
        this.transitionTo('half-open');
      } else if (fallback) {
        return fallback();
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;

    if (this.state === 'half-open') {
      this.successes++;
      this.halfOpenCalls++;

      if (this.successes >= this.config.successThreshold) {
        this.transitionTo('closed');
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.transitionTo('open');
    } else if (this.failures >= this.config.failureThreshold) {
      this.transitionTo('open');
    }
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === 'closed') {
      this.failures = 0;
      this.successes = 0;
      this.halfOpenCalls = 0;
    } else if (newState === 'open') {
      this.successes = 0;
      this.halfOpenCalls = 0;
    } else if (newState === 'half-open') {
      this.successes = 0;
      this.halfOpenCalls = 0;
    }

    logger.warn('State transition: ${oldState} -> ${newState}');
    this.config.onStateChange?.(newState);
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailureTime: number;
  } {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = 0;
    this.halfOpenCalls = 0;
  }
}

// ── Unified Rate Limiter ──

export class RateLimiter {
  private limiter: TokenBucketLimiter | SlidingWindowLimiter;
  private circuitBreaker: CircuitBreaker | null = null;
  private stats: Map<string, LimiterStats> = new Map();
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;

    if (config.type === 'token-bucket') {
      this.limiter = new TokenBucketLimiter({
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
      });
    } else {
      this.limiter = new SlidingWindowLimiter({
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
      });
    }
  }

  withCircuitBreaker(config: CircuitBreakerConfig): this {
    this.circuitBreaker = new CircuitBreaker(config);
    return this;
  }

  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const result = this.limiter.tryAcquire(key);

    if (!result.allowed) {
      this.updateStats(key, false);

      if (this.config.onLimitReached) {
        this.config.onLimitReached(key);
      }

      if (fallback) {
        return fallback();
      }

      throw new Error(`Rate limit exceeded. Retry after ${result.retryAfter}ms`);
    }

    this.updateStats(key, true);

    if (this.circuitBreaker) {
      return this.circuitBreaker.execute(fn, fallback);
    }

    return fn();
  }

  tryAcquire(key: string = 'default'): RateLimitResult {
    return this.limiter.tryAcquire(key);
  }

  private updateStats(key: string, allowed: boolean): void {
    const stats = this.stats.get(key) || {
      totalRequests: 0,
      allowedRequests: 0,
      rejectedRequests: 0,
      currentRate: 0,
      averageWaitTime: 0,
    };

    stats.totalRequests++;
    if (allowed) {
      stats.allowedRequests++;
    } else {
      stats.rejectedRequests++;
    }

    stats.currentRate = stats.allowedRequests / stats.totalRequests;
    this.stats.set(key, stats);
  }

  getStats(key: string = 'default'): LimiterStats | null {
    return this.stats.get(key) || null;
  }

  reset(key: string = 'default'): void {
    this.limiter.reset(key);
    this.stats.delete(key);
  }

  resetAll(): void {
    this.limiter.resetAll();
    this.stats.clear();
  }
}

// ── Decorator for Method Rate Limiting ──

export function rateLimit(config: RateLimiterConfig) {
  const limiter = new RateLimiter(config);

  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const key = config.keyGenerator
        ? config.keyGenerator(this)
        : 'default';

      return limiter.execute(
        key,
        () => originalMethod.apply(this, args),
        undefined
      );
    };

    return descriptor;
  };
}

// ── Singleton Instance for Global Use ──

let globalLimiter: RateLimiter | null = null;

export function getGlobalRateLimiter(): RateLimiter {
  if (!globalLimiter) {
    globalLimiter = new RateLimiter({
      type: 'token-bucket',
      maxRequests: 100,
      windowMs: 60000,
    });
  }
  return globalLimiter;
}

export function configureGlobalRateLimiter(config: RateLimiterConfig): void {
  globalLimiter = new RateLimiter(config);
}

// ── LLM-Specific Rate Limiter ──

export class LLMRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map();

  constructor() {
    this.initializeProviderLimiters();
  }

  private initializeProviderLimiters(): void {
    const providerConfigs: Record<string, RateLimiterConfig> = {
      openai: { type: 'token-bucket', maxRequests: 60, windowMs: 60000 },
      anthropic: { type: 'token-bucket', maxRequests: 60, windowMs: 60000 },
      zhipu: { type: 'token-bucket', maxRequests: 30, windowMs: 60000 },
      deepseek: { type: 'token-bucket', maxRequests: 30, windowMs: 60000 },
      ollama: { type: 'token-bucket', maxRequests: 100, windowMs: 60000 },
      default: { type: 'token-bucket', maxRequests: 30, windowMs: 60000 },
    };

    for (const [provider, config] of Object.entries(providerConfigs)) {
      this.limiters.set(
        provider,
        new RateLimiter(config).withCircuitBreaker({
          failureThreshold: 5,
          successThreshold: 3,
          timeout: 30000,
          halfOpenMaxCalls: 3,
        })
      );
    }
  }

  async execute<T>(
    provider: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const limiter = this.limiters.get(provider) || this.limiters.get('default')!;
    return limiter.execute(provider, fn, fallback);
  }

  getStats(provider: string): LimiterStats | null {
    const limiter = this.limiters.get(provider);
    return limiter?.getStats(provider) || null;
  }

  reset(provider: string): void {
    this.limiters.get(provider)?.reset(provider);
  }
}

export const llmRateLimiter = new LLMRateLimiter();
