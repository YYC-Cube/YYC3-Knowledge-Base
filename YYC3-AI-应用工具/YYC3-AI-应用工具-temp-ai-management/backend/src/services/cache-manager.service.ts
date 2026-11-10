import NodeCache from "node-cache";
import { redis } from "../config/redis";
import { logger } from "../config/logger";

export class CacheManager {
  private static memoryCache = new NodeCache({
    stdTTL: 60, // 1分钟默认过期时间
    checkperiod: 120, // 检查过期项目的周期（秒）
    maxKeys: 1000, // 最大缓存项数
  });

  // 内存缓存 - 适用于高频访问，小体积数据
  static async getFromMemory<T>(key: string): Promise<T | null> {
    const data = this.memoryCache.get<T>(key);
    return data === undefined ? null : data;
  }

  static setToMemory<T>(key: string, data: T, ttl: number = 60): boolean {
    return this.memoryCache.set(key, data, ttl);
  }

  // Redis缓存 - 适用于分布式、持久化需求数据
  static async getFromRedis<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error("Redis get error", { key, error });
      return null;
    }
  }

  static async setToRedis<T>(
    key: string,
    data: T,
    ttl: number = 300
  ): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      logger.error("Redis set error", { key, error });
    }
  }

  // 多级缓存包装函数
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      useMemory?: boolean;
      useRedis?: boolean;
      memoryTtl?: number;
      redisTtl?: number;
    } = {}
  ): Promise<T> {
    const {
      useMemory = true,
      useRedis = true,
      memoryTtl = 60,
      redisTtl = 300,
    } = options;

    // 尝试从内存缓存获取
    if (useMemory) {
      const memoryData = await this.getFromMemory<T>(key);
      if (memoryData !== null) {
        logger.debug("Cache hit from memory", { key });
        return memoryData;
      }
    }

    // 尝试从Redis缓存获取
    if (useRedis) {
      const redisData = await this.getFromRedis<T>(key);
      if (redisData !== null) {
        logger.debug("Cache hit from Redis", { key });
        // 如果从Redis获取成功，同时更新内存缓存
        if (useMemory) {
          this.setToMemory(key, redisData, memoryTtl);
        }
        return redisData;
      }
    }

    // 如果缓存都未命中，执行数据获取函数
    logger.debug("Cache miss, fetching data", { key });
    const fetchedData = await fetcher();

    // 更新缓存
    if (useMemory) {
      this.setToMemory(key, fetchedData, memoryTtl);
    }

    if (useRedis) {
      await this.setToRedis(key, fetchedData, redisTtl);
    }

    return fetchedData;
  }

  // 缓存失效函数
  static async invalidate(key: string): Promise<void> {
    this.memoryCache.del(key);
    try {
      await redis.del(key);
    } catch (error) {
      logger.error("Redis del error", { key, error });
    }
  }

  // 按模式批量失效缓存
  static async invalidatePattern(pattern: string): Promise<void> {
    // 内存缓存基于前缀匹配删除
    const memoryKeys = this.memoryCache.keys();
    memoryKeys.forEach((k) => {
      if (k.startsWith(pattern)) {
        this.memoryCache.del(k);
      }
    });

    // Redis基于模式删除
    try {
      const redisKeys = await redis.keys(`${pattern}*`);
      if (redisKeys.length > 0) {
        await redis.del(...redisKeys);
      }
    } catch (error) {
      logger.error("Redis pattern delete error", { pattern, error });
    }
  }

  // 缓存统计信息
  static getStats() {
    return {
      memory: {
        keys: this.memoryCache.keys().length,
        hits: this.memoryCache.getStats().hits,
        misses: this.memoryCache.getStats().misses,
        keys_list: this.memoryCache.keys(),
      },
    };
  }
}
