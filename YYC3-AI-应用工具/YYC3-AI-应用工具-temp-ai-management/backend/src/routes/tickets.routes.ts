// 修复tickets.routes.ts文件中的TypeScript错误
import express, { Request, Response, NextFunction } from 'express';
import TicketService from '../services/ticket.service';
const { validateRequest } = require('../middleware/validation.middleware');
import { authenticate as authMiddleware, authorize as checkPermission } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';
import { circuitBreaker } from '../middleware/circuit-breaker.middleware';
import { logger } from '../config/logger';
import Joi from 'joi';

const router = express.Router();
const ticketService = new TicketService();

// 请求验证 schemas
const createTicketSchema = Joi.object({
  title: Joi.string().required().max(200),
  description: Joi.string().required().max(2000),
  category: Joi.string().required(),
  priority: Joi.string().valid("low", "medium", "high", "urgent").required(),
  customerName: Joi.string().required().max(200),
  customerEmail: Joi.string().email().required(),
  customerPhone: Joi.string().max(20).optional(),
})

const updateTicketSchema = Joi.object({
  status: Joi.string().valid("open", "in-progress", "pending", "resolved", "closed").optional(),
  priority: Joi.string().valid("low", "medium", "high", "urgent").optional(),
  assignedTo: Joi.string().uuid().optional(),
  notes: Joi.string().max(1000).optional(),
})

const addMessageSchema = Joi.object({
  content: Joi.string().required().max(2000),
  isInternal: Joi.boolean().default(false),
})

router.use(authMiddleware)

/**
 * @route   GET /api/tickets
 * @desc    获取工单列表
 * @access  Private (需要 tickets:read 权限)
 */
router.get(
  "/",
  checkPermission(["tickets:read"]),
  rateLimiter({ windowMs: 60000, max: 100 }),
  circuitBreaker({ threshold: 0.5, timeout: 30000, resetTimeout: 60000 }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        priority: req.query.priority as string | undefined,
        assignedTo: req.query.assignedTo as string | undefined,
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0,
      }

      const result = await ticketService.getTickets(filters)

      res.json({
        success: true,
        data: result,
        pagination: {
          // 由于getTickets方法没有返回total，这里暂时返回数据长度
          total: result.length,
          limit: filters.limit,
          offset: filters.offset,
        },
      })
    } catch (error) {
      next(error)
    }
  },
)

/**
 * @route   GET /api/tickets/:id
 * @desc    获取工单详情
 * @access  Private (需要 tickets:read 权限)
 */
router.get(
  "/:id",
  checkPermission(["tickets:read"]),
  circuitBreaker({ threshold: 0.5, timeout: 30000, resetTimeout: 60000 }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ticket = await ticketService.getTicketById(req.params.id)

      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: "Ticket not found",
        })
      }

      res.json({
        success: true,
        data: ticket,
      })
    } catch (error) {
      next(error)
    }
  },
)

/**
 * @route   POST /api/tickets
 * @desc    创建工单
 * @access  Private (需要 tickets:create 权限)
 */
router.post(
  "/",
  checkPermission(["tickets:create"]),
  rateLimiter({ windowMs: 60000, max: 20 }),
  validateRequest(createTicketSchema, "body"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id
      const ticketData = {
        ...req.body,
        createdBy: userId,
      }

      const ticket = await ticketService.createTicket(ticketData)

      logger.info("Ticket created", {
        ticketId: ticket.id,
        userId,
      })

      res.status(201).json({
        success: true,
        data: ticket,
      })
    } catch (error) {
      next(error)
    }
  },
)

/**
 * @route   PATCH /api/tickets/:id
 * @desc    更新工单
 * @access  Private (需要 tickets:update 权限)
 */
router.patch(
  "/:id",
  checkPermission(["tickets:update"]),
  validateRequest(updateTicketSchema, "body"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id
      const ticket = await ticketService.updateTicket(req.params.id, req.body, userId)

      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: "Ticket not found",
        })
      }

      res.json({
        success: true,
        data: ticket,
      })
    } catch (error) {
      next(error)
    }
  },
)

/**
 * @route   POST /api/tickets/:id/messages
 * @desc    添加工单消息
 * @access  Private (需要 tickets:message 权限)
 */
router.post(
  "/:id/messages",
  checkPermission(["tickets:message"]),
  rateLimiter({ windowMs: 60000, max: 50 }),
  validateRequest(addMessageSchema, "body"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id
      const userName = (req as any).user.name

      const message = await ticketService.addTicketMessage(req.params.id, {
        sender: userId,
        senderName: userName,
        content: req.body.content,
        isInternal: req.body.isInternal,
      })

      res.status(201).json({
        success: true,
        data: message,
      })
    } catch (error) {
      next(error)
    }
  },
)

/**
 * @route   GET /api/tickets/stats
 * @desc    获取工单统计
 * @access  Private (需要 tickets:read 权限)
 */
router.get("/stats", checkPermission(["tickets:read"]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await ticketService.getTicketStats()

    res.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    next(error)
  }
})

// 导出路由
export default router;
