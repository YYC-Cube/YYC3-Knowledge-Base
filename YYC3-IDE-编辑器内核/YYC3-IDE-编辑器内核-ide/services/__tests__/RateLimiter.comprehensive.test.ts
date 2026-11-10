/**
 * @file RateLimiter.comprehensive.test.ts
 * @description RateLimiter 全面测试 - 令牌桶、滑动窗口、熔断器
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  TokenBucketLimiter,
  SlidingWindowLimiter,
  CircuitBreaker,
  RateLimiter,
  LLMRateLimiter,
  getGlobalRateLimiter,
} from '../RateLimiter'

describe('TokenBucketLimiter - 基础功能', () => {

  let limiter: TokenBucketLimiter

  beforeEach(() => {
    limiter = new TokenBucketLimiter({
      maxRequests: 5,
      windowMs: 1000, // 1秒窗口，5个请求
    })
  })

  it('应该允许初始请求', () => {
    const result = limiter.tryAcquire()
    
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4) // 5-1
    expect(result.resetAt).toBeGreaterThan(Date.now())
  })

  it('应该正确消耗令牌', () => {
    limiter.tryAcquire() // 4 remaining
    limiter.tryAcquire() // 3
    limiter.tryAcquire() // 2
    
    const result = limiter.tryAcquire() // 1
    expect(result.remaining).toBe(1)
    expect(result.allowed).toBe(true)
  })

  it('应该在令牌耗尽后拒绝请求', () => {
    for (let i = 0; i < 5; i++) {
      limiter.tryAcquire()
    }
    
    const result = limiter.tryAcquire()
    
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('应该支持多key独立限流', () => {
    const resultA = limiter.tryAcquire('user-A')
    const resultB = limiter.tryAcquire('user-B')
    
    expect(resultA.allowed).toBe(true)
    expect(resultB.allowed).toBe(true)
    expect(resultA.remaining).toBe(4)
    expect(resultB.remaining).toBe(4)
  })

  it('reset应该清除指定key', () => {
    limiter.tryAcquire('key1')
    limiter.reset('key1')
    
    const result = limiter.tryAcquire('key1')
    expect(result.remaining).toBe(4) // 重置后重新开始
  })
})

describe('SlidingWindowLimiter - 滑动窗口', () => {

  let limiter: SlidingWindowLimiter

  beforeEach(() => {
    limiter = new SlidingWindowLimiter({
      maxRequests: 3,
      windowMs: 1000,
    })
  })

  it('应该允许在窗口内的请求', () => {
    const result1 = limiter.tryAcquire()
    const result2 = limiter.tryAcquire()
    const result3 = limiter.tryAcquire()
    
    expect(result1.allowed).toBe(true)
    expect(result2.allowed).toBe(true)
    expect(result3.allowed).toBe(true)
  })

  it('应该拒绝超过限制的请求', () => {
    for (let i = 0; i < 3; i++) {
      limiter.tryAcquire()
    }
    
    const result = limiter.tryAcquire()
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeGreaterThanOrEqual(0)
  })

  it('getStats应该返回当前状态', () => {
    limiter.tryAcquire()
    limiter.tryAcquire()
    
    const stats = limiter.getStats()
    
    expect(stats).not.toBeNull()
    if (stats) {
      expect(stats.count).toBe(2)
      expect(stats.oldestTimestamp).toBeGreaterThan(0)
    }
  })

  it('resetAll应该清除所有窗口数据', () => {
    limiter.tryAcquire('a')
    limiter.tryAcquire('b')
    
    limiter.resetAll()
    
    const statsA = limiter.getStats('a')
    const statsB = limiter.getStats('b')
    
    expect(statsA).toBeNull()
    expect(statsB).toBeNull()
  })
})

describe('CircuitBreaker - 熔断器', () => {

  let breaker: CircuitBreaker

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      halfOpenMaxCalls: 2,
    })
  })

  it('初始状态应该是closed', () => {
    expect(breaker.getState()).toBe('closed')
  })

  it('成功执行不应该改变状态', async () => {
    await breaker.execute(async () => 'success')
    
    expect(breaker.getState()).toBe('closed')
  })

  it('失败次数达到阈值应该打开熔断器', async () => {
    const failingFn = async () => { throw new Error('Service unavailable') }

    try { await breaker.execute(failingFn) } catch { /* Expected error */ }
    try { await breaker.execute(failingFn) } catch { /* Expected error */ }
    try { await breaker.execute(failingFn) } catch { /* Expected error */ }

    expect(breaker.getState()).toBe('open')
  })

  it('熔断器打开时应该使用fallback', async () => {
    const stateChangeSpy = vi.fn()
    breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 1,
      timeout: 5000,
      halfOpenMaxCalls: 1,
      onStateChange: stateChangeSpy,
    })
    
    // 触发一次失败
    try {
      await breaker.execute(async () => { throw new Error('fail') })
    } catch { /* Expected error */ }

    expect(breaker.getState()).toBe('open')

    // 应该调用fallback
    const result = await breaker.execute(
      async () => { throw new Error('still failing') },
      async () => 'fallback response'
    )

    expect(result).toBe('fallback response')
  })

  it('超时后应该进入half-open状态', async () => {
    breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 1,
      timeout: 10, // 很短的超时时间用于测试
      halfOpenMaxCalls: 1,
    })

    // 触发熔断
    try {
      await breaker.execute(async () => { throw new Error('fail') })
    } catch { /* Expected error */ }
    
    expect(breaker.getState()).toBe('open')
    
    // 等待超时
    await new Promise(resolve => setTimeout(resolve, 20))
    
    // 下次execute应该尝试半开
    await breaker.execute(
      async () => 'recovered',
      undefined
    )
    
    // 成功后应该回到closed
    expect(breaker.getState()).toBe('closed')
  })

  it('getStats应该返回正确的统计信息', () => {
    const stats = breaker.getStats()
    
    expect(stats.state).toBe('closed')
    expect(stats.failures).toBe(0)
    expect(stats.successes).toBe(0)
  })

  it('reset应该重置所有状态', async () => {
    try {
      await breaker.execute(async () => { throw new Error('fail') })
      await breaker.execute(async () => { throw new Error('fail') })
    } catch { /* Expected error */ }

    breaker.reset()
    
    expect(breaker.getState()).toBe('closed')
    const stats = breaker.getStats()
    expect(stats.failures).toBe(0)
  })
})

describe('RateLimiter - 统一接口', () => {

  let rateLimiter: RateLimiter

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      type: 'token-bucket',
      maxRequests: 5,
      windowMs: 1000,
    })
  })

  it('应该成功执行被允许的请求', async () => {
    const result = await rateLimiter.execute(
      'test-key',
      async () => 'success'
    )
    
    expect(result).toBe('success')
  })

  it('应该拒绝超出限制的请求', async () => {
    // 耗尽所有配额
    for (let i = 0; i < 5; i++) {
      await rateLimiter.execute('test-key', async () => 'ok')
    }
    
    await expect(
      rateLimiter.execute('test-key', async () => 'should fail')
    ).rejects.toThrow('Rate limit exceeded')
  })

  it('应该支持onLimitReached回调', async () => {
    const onLimitReached = vi.fn()
    
    const limitedLimiter = new RateLimiter({
      type: 'token-bucket',
      maxRequests: 1,
      windowMs: 1000,
      onLimitReached,
    })
    
    await limitedLimiter.execute('k', async () => 'ok')
    await limitedLimiter.execute('k', async () => 'ok').catch(() => {})
    
    expect(onLimitReached).toHaveBeenCalled()
  })

  it('withCircuitBreaker应该链式添加熔断器', () => {
    const chained = rateLimiter.withCircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      halfOpenMaxCalls: 2,
    })
    
    expect(chained).toBe(rateLimiter) // 链式调用返回this
  })

  it('tryAcquire应该直接检查而不执行函数', () => {
    const result = rateLimiter.tryAcquire('check-only')
    
    expect(result.allowed).toBe(true)
    expect(typeof result.remaining).toBe('number')
  })

  it('getStats应该返回统计信息', async () => {
    await rateLimiter.execute('stats-key', async () => 'ok')
    await rateLimiter.execute('stats-key', async () => 'ok').catch(() => {})
    
    const stats = rateLimiter.getStats('stats-key')
    
    expect(stats).not.toBeNull()
    if (stats) {
      expect(stats.totalRequests).toBeGreaterThan(0)
    }
  })
})

describe('LLMRateLimiter - LLM专用限流', () => {

  let llmLimiter: LLMRateLimiter

  beforeEach(() => {
    llmLimiter = new LLMRateLimiter()
  })

  it('应该为各provider初始化限流器', async () => {
    const result = await llmLimiter.execute('openai', async () => 'response')
    
    expect(result).toBe('response')
  })

  it('应该为不同provider独立限流', async () => {
    const r1 = await llmLimiter.execute('openai', async () => 'openai-resp')
    const r2 = await llmLimiter.execute('anthropic', async () => 'anthropic-resp')
    
    expect(r1).toBe('openai-resp')
    expect(r2).toBe('anthropic-resp')
  })

  it('未知provider应该使用default配置', async () => {
    const result = await llmLimiter.execute('unknown-provider', async () => 'resp')
    
    expect(result).toBe('resp')
  })

  it('getStats应该返回provider的统计信息', async () => {
    await llmLimiter.execute('zhipu', async () => 'test')
    
    const stats = llmLimiter.getStats('zhipu')
    
    expect(stats).not.toBeNull()
  })
})

describe('全局限流器', () => {

  it('getGlobalRateLimiter应该返回单例', () => {
    const instance1 = getGlobalRateLimiter()
    const instance2 = getGlobalRateLimiter()
    
    expect(instance1).toBe(instance2)
  })

  it('全局限流器应该可以正常工作', async () => {
    const globalLimiter = getGlobalRateLimiter()
    
    const result = await globalLimiter.execute(
      'global-test',
      async () => 'global-ok'
    )
    
    expect(result).toBe('global-ok')
  })
})
