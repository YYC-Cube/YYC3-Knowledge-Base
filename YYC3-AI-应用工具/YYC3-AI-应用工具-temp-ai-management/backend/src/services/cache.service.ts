import { redis } from "../config/redis"
import { logger } from "../config/logger"
import { cacheHits, cacheMisses, cacheLatency, cacheSize, cacheEvictions, cacheHitRate } from "../config/metrics"

export interface CacheOptions {
  ttl?: number
  prefix?: string
}

export class CacheService {
  private defaultTTL = 3600
  private hitCount = 0
  private missCount = 0

  /**
   * 获取缓存
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const fullKey = this.buildKey(key, options.prefix)
    const start = Date.now()

    try {
      const cached = await redis.get(fullKey)
      const duration = (Date.now() - start) / 1000

      if (cached) {
        this.hitCount++
        cacheHits.inc({ cache_key_pattern: options.prefix || "default" })
        cacheLatency.observe({ operation: "get", status: "hit" }, duration)
        this.updateHitRate()

        logger.debug("Cache hit", { key: fullKey, duration })
        return JSON.parse(cached) as T
      } else {
        this.missCount++
        cacheMisses.inc()
        cacheLatency.observe({ operation: "get", status: "miss" }, duration)
        this.updateHitRate()

        logger.debug("Cache miss", { key: fullKey, duration })
        return null
      }
    } catch (error) {
      const duration = (Date.now() - start) / 1000
      cacheHits.inc({ cache_key_pattern: options.prefix || "default" })
      cacheLatency.observe({ operation: "get", status: "error" }, duration)

      logger.error("Cache get error", { key: fullKey, error })
      return null
    }
  }

  /**
   * 设置缓存
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    const fullKey = this.buildKey(key, options.prefix)
    const ttl = options.ttl || this.defaultTTL
    const start = Date.now()

    try {
      const serialized = JSON.stringify(value)
      await redis.setex(fullKey, ttl, serialized)

      const duration = (Date.now() - start) / 1000
      cacheLatency.observe({ operation: "set", status: "success" }, duration)

      const size = Buffer.byteLength(serialized, "utf8")
      cacheSize.set({ cache_type: options.prefix || "default" }, size)

      logger.debug("Cache set", { key: fullKey, ttl, size, duration })
      return true
    } catch (error) {
      const duration = (Date.now() - start) / 1000
      cacheLatency.observe({ operation: "set", status: "error" }, duration)

      logger.error("Cache set error", { key: fullKey, error })
      return false
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    const fullKey = this.buildKey(key, options.prefix)
    const start = Date.now()

    try {
      const result = await redis.del(fullKey)
      const duration = (Date.now() - start) / 1000

      cacheLatency.observe({ operation: "delete", status: "success" }, duration)
      cacheEvictions.inc({ reason: "manual" })

      logger.debug("Cache delete", { key: fullKey, result, duration })
      return result > 0
    } catch (error) {
      const duration = (Date.now() - start) / 1000
      cacheLatency.observe({ operation: "delete", status: "error" }, duration)

      logger.error("Cache delete error", { key: fullKey, error })
      return false
    }
  }

  /**
   * 批量删除缓存（按模式）
   */
  async delPattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    const fullPattern = this.buildKey(pattern, options.prefix)
    const start = Date.now()

    try {
      const keys = await redis.keys(fullPattern)
      if (keys.length === 0) {
        return 0
      }

      const result = await redis.del(...keys)
      const duration = (Date.now() - start) / 1000

      cacheLatency.observe({ operation: "delete_pattern", status: "success" }, duration)
      cacheEvictions.inc({ reason: "pattern" }, keys.length)

      logger.info("Cache pattern delete", { pattern: fullPattern, count: result, duration })
      return result
    } catch (error) {
      const duration = (Date.now() - start) / 1000
      cacheLatency.observe({ operation: "delete_pattern", status: "error" }, duration)

      logger.error("Cache pattern delete error", { pattern: fullPattern, error })
      return 0
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    const fullKey = this.buildKey(key, options.prefix)

    try {
      const result = await redis.exists(fullKey)
      return result > 0
    } catch (error) {
      logger.error("Cache exists error", { key: fullKey, error })
      return false
    }
  }

  /**
   * 获取缓存的剩余过期时间（秒）
   */
  async ttl(key: string, options: CacheOptions = {}): Promise<number> {
    const fullKey = this.buildKey(key, options.prefix)

    try {
      return await redis.ttl(fullKey)
    } catch (error) {
      logger.error("Cache TTL error", { key: fullKey, error })
      return -1
    }
  }

  /**
   * 刷新缓存过期时间
   */
  async expire(key: string, ttl: number, options: CacheOptions = {}): Promise<boolean> {
    const fullKey = this.buildKey(key, options.prefix)

    try {
      const result = await redis.expire(fullKey, ttl)
      return result === 1
    } catch (error) {
      logger.error("Cache expire error", { key: fullKey, error })
      return false
    }
  }

  /**
   * 🆕 Wrap 方法 - 缓存穿透保护
   * 如果缓存存在则返回，否则执行 fetcher 并缓存结果
   */
  async wrap<T>(key: string, fetcher: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    const cached = await this.get<T>(key, options)

    if (cached !== null) {
      return cached
    }

    try {
      const data = await fetcher()
      await this.set(key, data, options)
      return data
    } catch (error) {
      logger.error("Cache wrap fetcher error", { key, error })
      throw error
    }
  }

  /**
   * 原子性递增
   */
  async increment(key: string, options: CacheOptions = {}): Promise<number> {
    const fullKey = this.buildKey(key, options.prefix)

    try {
      return await redis.incr(fullKey)
    } catch (error) {
      logger.error("Cache increment error", { key: fullKey, error })
      return 0
    }
  }

  /**
   * 原子性递减
   */
  async decrement(key: string, options: CacheOptions = {}): Promise<number> {
    const fullKey = this.buildKey(key, options.prefix)

    try {
      return await redis.decr(fullKey)
    } catch (error) {
      logger.error("Cache decrement error", { key: fullKey, error })
      return 0
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const total = this.hitCount + this.missCount
    const hitRate = total > 0 ? (this.hitCount / total) * 100 : 0

    return {
      hits: this.hitCount,
      misses: this.missCount,
      total,
      hitRate: hitRate.toFixed(2) + "%",
    }
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.hitCount = 0
    this.missCount = 0
  }

  private buildKey(key: string, prefix?: string): string {
    if (prefix) {
      return `${prefix}:${key}`
    }
    return key
  }

  private updateHitRate() {
    const total = this.hitCount + this.missCount
    if (total > 0) {
      const hitRate = (this.hitCount / total) * 100
      cacheHitRate.set(hitRate)
    }
  }
}

export const cacheService = new CacheService()
