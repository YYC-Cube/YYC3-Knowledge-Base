import type { Request, Response, NextFunction } from "express"
import { cacheService } from "../services/cache.service"
import { logger } from "../config/logger"

export interface CacheMiddlewareOptions {
  ttl?: number // 缓存过期时间（秒）
  prefix?: string // 缓存key前缀
  keyGenerator?: (req: Request) => string // 自定义key生成器
  condition?: (req: Request) => boolean // 缓存条件判断
}

/**
 * 缓存中间件
 * 缓存 GET 请求的响应
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const {
    ttl = 300, // 默认5分钟
    prefix = "api",
    keyGenerator,
    condition,
  } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    // 只缓存 GET 请求
    if (req.method !== "GET") {
      return next()
    }

    // 检查缓存条件
    if (condition && !condition(req)) {
      return next()
    }

    // 生成缓存 key
    const cacheKey = keyGenerator ? keyGenerator(req) : generateCacheKey(req)

    try {
      // 尝试从缓存获取
      const cached = await cacheService.get<any>(cacheKey, { prefix })

      if (cached) {
        logger.debug("Cache middleware hit", { key: cacheKey })
        res.setHeader("X-Cache", "HIT")
        return res.json(cached)
      }

      // 缓存未命中，继续处理请求
      logger.debug("Cache middleware miss", { key: cacheKey })
      res.setHeader("X-Cache", "MISS")

      // 拦截响应
      const originalJson = res.json.bind(res)
      res.json = (body: any) => {
        // 只缓存成功的响应
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, body, { ttl, prefix }).catch((error) => {
            logger.error("Failed to cache response", { key: cacheKey, error })
          })
        }
        return originalJson(body)
      }

      next()
    } catch (error) {
      logger.error("Cache middleware error", { key: cacheKey, error })
      next()
    }
  }
}

/**
 * 生成默认缓存 key
 */
function generateCacheKey(req: Request): string {
  const { path, query } = req
  const queryString = new URLSearchParams(query as any).toString()
  return queryString ? `${path}?${queryString}` : path
}

/**
 * 缓存失效中间件
 * 在数据变更后清除相关缓存
 */
export function invalidateCacheMiddleware(options: {
  patterns: string[] | ((req: Request) => string[])
  prefix?: string
}) {
  const { patterns, prefix = "api" } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    // 拦截响应
    const originalJson = res.json.bind(res)
    res.json = (body: any) => {
      // 只在成功响应后清除缓存
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const patternsToInvalidate = typeof patterns === "function" ? patterns(req) : patterns

        Promise.all(patternsToInvalidate.map((pattern) => cacheService.delPattern(pattern, { prefix }))).catch(
          (error) => {
            logger.error("Failed to invalidate cache", { patterns: patternsToInvalidate, error })
          },
        )
      }
      return originalJson(body)
    }

    next()
  }
}
