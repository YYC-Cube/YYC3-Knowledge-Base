/**
 * @file: RateLimiter.test.ts
 * @description: 限流/降级服务测试用例
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TokenBucketLimiter,
  SlidingWindowLimiter,
  CircuitBreaker,
  RateLimiter,
  LLMRateLimiter,
} from '../services/RateLimiter';

describe('TokenBucketLimiter', () => {
  let limiter: TokenBucketLimiter;

  beforeEach(() => {
    limiter = new TokenBucketLimiter({ maxRequests: 5, windowMs: 1000 });
  });

  it('should allow requests up to max capacity', () => {
    for (let i = 0; i < 5; i++) {
      const result = limiter.tryAcquire('test');
      expect(result.allowed).toBe(true);
    }
  });

  it('should reject requests after max capacity', () => {
    for (let i = 0; i < 5; i++) {
      limiter.tryAcquire('test');
    }

    const result = limiter.tryAcquire('test');
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
  });

  it('should track remaining tokens correctly', () => {
    const result1 = limiter.tryAcquire('test');
    expect(result1.remaining).toBe(4);

    const result2 = limiter.tryAcquire('test');
    expect(result2.remaining).toBe(3);
  });

  it('should reset tokens', () => {
    for (let i = 0; i < 5; i++) {
      limiter.tryAcquire('test');
    }

    limiter.reset('test');

    const result = limiter.tryAcquire('test');
    expect(result.allowed).toBe(true);
  });

  it('should handle different keys independently', () => {
    for (let i = 0; i < 5; i++) {
      limiter.tryAcquire('key1');
    }

    const result1 = limiter.tryAcquire('key1');
    expect(result1.allowed).toBe(false);

    const result2 = limiter.tryAcquire('key2');
    expect(result2.allowed).toBe(true);
  });
});

describe('SlidingWindowLimiter', () => {
  let limiter: SlidingWindowLimiter;

  beforeEach(() => {
    limiter = new SlidingWindowLimiter({ maxRequests: 3, windowMs: 1000 });
  });

  it('should allow requests within limit', () => {
    for (let i = 0; i < 3; i++) {
      const result = limiter.tryAcquire('test');
      expect(result.allowed).toBe(true);
    }
  });

  it('should reject requests exceeding limit', () => {
    for (let i = 0; i < 3; i++) {
      limiter.tryAcquire('test');
    }

    const result = limiter.tryAcquire('test');
    expect(result.allowed).toBe(false);
  });

  it('should provide retry after time', () => {
    for (let i = 0; i < 3; i++) {
      limiter.tryAcquire('test');
    }

    const result = limiter.tryAcquire('test');
    expect(result.retryAfter).toBeGreaterThanOrEqual(0);
  });

  it('should reset window', () => {
    for (let i = 0; i < 3; i++) {
      limiter.tryAcquire('test');
    }

    limiter.reset('test');

    const result = limiter.tryAcquire('test');
    expect(result.allowed).toBe(true);
  });
});

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      halfOpenMaxCalls: 3,
    });
  });

  it('should start in closed state', () => {
    expect(circuitBreaker.getState()).toBe('closed');
  });

  it('should open after failure threshold', async () => {
    const failingFn = vi.fn().mockRejectedValue(new Error('Failed'));

    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failingFn);
      } catch (e) {
        // Expected
      }
    }

    expect(circuitBreaker.getState()).toBe('open');
  });

  it('should use fallback when open', async () => {
    const failingFn = vi.fn().mockRejectedValue(new Error('Failed'));
    const fallbackFn = vi.fn().mockResolvedValue('fallback');

    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failingFn);
      } catch (e) {
        // Expected
      }
    }

    const result = await circuitBreaker.execute(failingFn, fallbackFn);
    expect(result).toBe('fallback');
  });

  it('should transition to half-open after timeout', async () => {
    vi.useFakeTimers();

    const failingFn = vi.fn().mockRejectedValue(new Error('Failed'));

    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failingFn);
      } catch (e) {
        // Expected
      }
    }

    expect(circuitBreaker.getState()).toBe('open');

    vi.advanceTimersByTime(1001);

    const successFn = vi.fn().mockResolvedValue('success');
    await circuitBreaker.execute(successFn);

    expect(circuitBreaker.getState()).toBe('half-open');

    vi.useRealTimers();
  });

  it('should close after success threshold in half-open', async () => {
    vi.useFakeTimers();

    const failingFn = vi.fn().mockRejectedValue(new Error('Failed'));

    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failingFn);
      } catch (e) {
        // Expected
      }
    }

    vi.advanceTimersByTime(1001);

    const successFn = vi.fn().mockResolvedValue('success');
    await circuitBreaker.execute(successFn);
    await circuitBreaker.execute(successFn);

    expect(circuitBreaker.getState()).toBe('closed');

    vi.useRealTimers();
  });

  it('should reset to closed state', async () => {
    const failingFn = vi.fn().mockRejectedValue(new Error('Failed'));

    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failingFn);
      } catch (e) {
        // Expected
      }
    }

    circuitBreaker.reset();
    expect(circuitBreaker.getState()).toBe('closed');
  });
});

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      type: 'token-bucket',
      maxRequests: 5,
      windowMs: 1000,
    });
  });

  it('should execute function when within limit', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const result = await rateLimiter.execute('test', fn);

    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should reject when limit exceeded', async () => {
    const fn = vi.fn().mockResolvedValue('result');

    for (let i = 0; i < 5; i++) {
      await rateLimiter.execute('test', fn);
    }

    await expect(rateLimiter.execute('test', fn)).rejects.toThrow('Rate limit exceeded');
  });

  it('should use fallback when limit exceeded', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const fallback = vi.fn().mockResolvedValue('fallback');

    for (let i = 0; i < 5; i++) {
      await rateLimiter.execute('test', fn);
    }

    const result = await rateLimiter.execute('test', fn, fallback);
    expect(result).toBe('fallback');
  });

  it('should track statistics', async () => {
    const fn = vi.fn().mockResolvedValue('result');

    await rateLimiter.execute('test', fn);
    await rateLimiter.execute('test', fn);

    const stats = rateLimiter.getStats('test');
    expect(stats?.totalRequests).toBe(2);
    expect(stats?.allowedRequests).toBe(2);
  });

  it('should work with circuit breaker', async () => {
    rateLimiter.withCircuitBreaker({
      failureThreshold: 2,
      successThreshold: 1,
      timeout: 1000,
      halfOpenMaxCalls: 1,
    });

    const failingFn = vi.fn().mockRejectedValue(new Error('Failed'));
    const fallback = vi.fn().mockResolvedValue('fallback');

    await rateLimiter.execute('test', failingFn, fallback).catch(() => {});
    await rateLimiter.execute('test', failingFn, fallback).catch(() => {});

    const result = await rateLimiter.execute('test', failingFn, fallback);
    expect(result).toBe('fallback');
  });
});

describe('LLMRateLimiter', () => {
  let llmLimiter: LLMRateLimiter;

  beforeEach(() => {
    llmLimiter = new LLMRateLimiter();
  });

  it('should execute with provider-specific limits', async () => {
    const fn = vi.fn().mockResolvedValue('response');
    const result = await llmLimiter.execute('openai', fn);

    expect(result).toBe('response');
  });

  it('should use fallback when rate limited', async () => {
    const fn = vi.fn().mockResolvedValue('response');
    const fallback = vi.fn().mockResolvedValue('fallback');

    for (let i = 0; i < 100; i++) {
      await llmLimiter.execute('openai', fn).catch(() => {});
    }

    const result = await llmLimiter.execute('openai', fn, fallback);
    expect(result).toBe('fallback');
  });

  it('should track stats per provider', async () => {
    const fn = vi.fn().mockResolvedValue('response');

    await llmLimiter.execute('openai', fn);
    await llmLimiter.execute('anthropic', fn);

    const openaiStats = llmLimiter.getStats('openai');
    const anthropicStats = llmLimiter.getStats('anthropic');

    expect(openaiStats?.totalRequests).toBe(1);
    expect(anthropicStats?.totalRequests).toBe(1);
  });
});
