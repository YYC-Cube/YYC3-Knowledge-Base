import { Router } from "express"
import type { Request, Response, NextFunction } from "express"
import { cachedReconciliationService } from "../services/reconciliation.service.cached"
import { cacheMiddleware, invalidateCacheMiddleware } from "../middleware/cache.middleware"
import { validateRequest } from "../middleware/validation.middleware"
import { authenticate as authMiddleware, authorize as checkPermission } from "../middleware/auth.middleware"
import Joi from "joi"

const router = Router()

// 请求验证 schemas
const reconciliationFiltersSchema = Joi.object({
  status: Joi.string().valid("pending", "matched", "exception", "resolved").optional(),
  type: Joi.string().valid("payment", "refund", "transfer", "adjustment").optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
})

// 所有路由需要认证
router.use(authMiddleware)

/**
 * @route   GET /api/reconciliation
 * @desc    获取对账记录列表（带缓存）
 * @access  Private (需要 reconciliation:read 权限)
 * @cache   5分钟
 */
router.get(
  "/",
  checkPermission(["reconciliation:read"]),
  validateRequest(reconciliationFiltersSchema, "query"),
  cacheMiddleware({
    ttl: 300, // 5分钟
    prefix: "reconciliation",
    keyGenerator: (req) => {
      const { status, type, dateFrom, dateTo, limit, offset } = req.query
      const parts = ["list"]
      if (status) parts.push(`status:${status}`)
      if (type) parts.push(`type:${type}`)
      if (dateFrom) parts.push(`from:${dateFrom}`)
      if (dateTo) parts.push(`to:${dateTo}`)
      if (limit) parts.push(`limit:${limit}`)
      if (offset) parts.push(`offset:${offset}`)
      return parts.join(":")
    },
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = req.query as any
      const result = await cachedReconciliationService.getRecords(filters)

      res.json({
        success: true,
        data: result.records,
        pagination: {
          total: result.total,
          limit: filters.limit || 20,
          offset: filters.offset || 0,
        },
      })
    } catch (error) {
      next(error)
    }
  },
)

/**
 * @route   GET /api/reconciliation/stats
 * @desc    获取对账统计（带缓存）
 * @access  Private
 * @cache   1分钟
 */
router.get(
  "/stats",
  checkPermission(["reconciliation:read"]),
  cacheMiddleware({
    ttl: 60, // 1分钟
    prefix: "reconciliation",
    keyGenerator: () => "stats:all",
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await cachedReconciliationService.getStats()

      res.json({
        success: true,
        data: stats,
      })
    } catch (error) {
      next(error)
    }
  },
)

/**
 * @route   GET /api/reconciliation/:id
 * @desc    获取单条对账记录（带缓存）
 * @access  Private
 * @cache   5分钟
 */
router.get(
  "/:id",
  checkPermission(["reconciliation:read"]),
  cacheMiddleware({
    ttl: 300,
    prefix: "reconciliation",
    keyGenerator: (req) => `record:${req.params.id}`,
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await cachedReconciliationService.getRecordById(req.params.id)

      if (!record) {
        return res.status(404).json({
          success: false,
          error: "Reconciliation record not found",
        })
      }

      res.json({
        success: true,
        data: record,
      })
    } catch (error) {
      next(error)
    }
  },
)

/**
 * @route   POST /api/reconciliation
 * @desc    创建对账记录（清除缓存）
 * @access  Private
 */
router.post(
  "/",
  checkPermission(["reconciliation:write"]),
  invalidateCacheMiddleware({
    patterns: ["list:*", "stats:*"],
    prefix: "reconciliation",
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await cachedReconciliationService.createRecord(req.body)

      res.status(201).json({
        success: true,
        data: record,
      })
    } catch (error) {
      next(error)
    }
  },
)

/**
 * @route   PUT /api/reconciliation/:id
 * @desc    更新对账记录（清除缓存）
 * @access  Private
 */
router.put(
  "/:id",
  checkPermission(["reconciliation:write"]),
  invalidateCacheMiddleware({
    patterns: (req) => [`record:${req.params.id}`, "list:*", "stats:*"],
    prefix: "reconciliation",
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId
      const record = await cachedReconciliationService.updateRecord(req.params.id, req.body, userId)

      if (!record) {
        return res.status(404).json({
          success: false,
          error: "Reconciliation record not found",
        })
      }

      res.json({
        success: true,
        data: record,
      })
    } catch (error) {
      next(error)
    }
  },
)

/**
 * @route   POST /api/reconciliation/match
 * @desc    批量匹配对账（清除所有缓存）
 * @access  Private
 */
router.post(
  "/match",
  checkPermission(["reconciliation:reconcile"]),
  invalidateCacheMiddleware({
    patterns: ["*"],
    prefix: "reconciliation",
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await cachedReconciliationService.bulkMatch(req.body)

      res.json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  },
)

/**
 * @route   POST /api/reconciliation/:id/resolve
 * @desc    处理异常（清除缓存）
 * @access  Private
 */
router.post(
  "/:id/resolve",
  checkPermission(["reconciliation:resolve"]),
  invalidateCacheMiddleware({
    patterns: (req) => [`record:${req.params.id}`, "list:*", "stats:*"],
    prefix: "reconciliation",
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id
      const record = await cachedReconciliationService.resolveException(req.params.id, req.body.resolution, userId)

      if (!record) {
        return res.status(404).json({
          success: false,
          error: "Reconciliation record not found",
        })
      }

      res.json({
        success: true,
        data: record,
      })
    } catch (error) {
      next(error)
    }
  },
)

module.exports = router;
