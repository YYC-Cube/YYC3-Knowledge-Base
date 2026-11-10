(function() {
  const express = require('express');
  const ReconciliationService = require('../services/reconciliation.service');
  const { authenticate: authMiddleware, authorize: checkPermission } = require('../middleware/auth.middleware');
  const { rateLimiter } = require('../middleware/rate-limiter.middleware');
  const { httpRequestsTotal, httpRequestDuration } = require('../config/metrics');
  const { logger } = require('../config/logger');
  const Joi = require('joi');

  const router = express.Router();
  const reconciliationService = new ReconciliationService();

  // 临时的validateRequest中间件实现
  const validateRequest = (schema: any) => {
    return (req: any, res: any, next: any) => {
      try {
        const validated = schema.validate(req.body || {}, { abortEarly: false });
        if (validated.error) {
          const errors = validated.error.details.map((detail: any) => detail.message);
          return res.status(400).json({ errors });
        }
        req.body = validated.value;
        next();
      } catch (error) {
        next(error);
      }
    };
  };

  /**
   * @route   GET /reconciliation/records
   * @desc    获取对账记录
   * @access  Private
   */
  router.get('/records', 
    authMiddleware,
    checkPermission('reconciliation:read'),
    rateLimiter,
    async (req: any, res: any, next: any) => {
      const end = httpRequestDuration.startTimer();
      try {
        const { page = 1, limit = 10, startDate, endDate, status, type } = req.query;
        
        const records = await reconciliationService.getRecords({
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          startDate,
          endDate,
          status,
          type
        });
        
        httpRequestsTotal.inc({ route: '/reconciliation/records', method: 'GET', status: 200 });
        end({ route: '/reconciliation/records', method: 'GET', status: 200 });
        
        res.json(records);
      } catch (error) {
        logger.error('Failed to get reconciliation records', { error });
        httpRequestsTotal.inc({ route: '/reconciliation/records', method: 'GET', status: 500 });
        end({ route: '/reconciliation/records', method: 'GET', status: 500 });
        next(error);
      }
    }
  );

  /**
   * @route   POST /reconciliation/auto-reconcile
   * @desc    自动对账
   * @access  Private
   */
  router.post('/auto-reconcile',
    authMiddleware,
    checkPermission('reconciliation:write'),
    rateLimiter,
    validateRequest(Joi.object({
      date: Joi.date().required(),
      type: Joi.string().valid('daily', 'weekly', 'monthly').required()
    })),
    async (req: any, res: any, next: any) => {
      const end = httpRequestDuration.startTimer();
      try {
        const { date, type } = req.body;
        
        const result = await reconciliationService.autoReconcile(date, type);
        
        httpRequestsTotal.inc({ route: '/reconciliation/auto-reconcile', method: 'POST', status: 200 });
        end({ route: '/reconciliation/auto-reconcile', method: 'POST', status: 200 });
        
        res.status(200).json(result);
      } catch (error) {
        logger.error('Auto reconciliation failed', { error });
        httpRequestsTotal.inc({ route: '/reconciliation/auto-reconcile', method: 'POST', status: 500 });
        end({ route: '/reconciliation/auto-reconcile', method: 'POST', status: 500 });
        next(error);
      }
    }
  );

  /**
   * @route   GET /reconciliation/stats
   * @desc    获取对账统计数据
   * @access  Private
   */
  router.get('/stats',
    authMiddleware,
    checkPermission('reconciliation:read'),
    rateLimiter,
    async (req: any, res: any, next: any) => {
      const end = httpRequestDuration.startTimer();
      try {
        const { startDate, endDate, type } = req.query;
        
        const stats = await reconciliationService.getStats({
          startDate,
          endDate,
          type
        });
        
        httpRequestsTotal.inc({ route: '/reconciliation/stats', method: 'GET', status: 200 });
        end({ route: '/reconciliation/stats', method: 'GET', status: 200 });
        
        res.json(stats);
      } catch (error) {
        logger.error('Failed to get reconciliation stats', { error });
        httpRequestsTotal.inc({ route: '/reconciliation/stats', method: 'GET', status: 500 });
        end({ route: '/reconciliation/stats', method: 'GET', status: 500 });
        next(error);
      }
    }
  );

  /**
   * @route   GET /reconciliation/exceptions
   * @desc    获取对账异常
   * @access  Private
   */
  router.get('/exceptions',
    authMiddleware,
    checkPermission('reconciliation:read'),
    rateLimiter,
    async (req: any, res: any, next: any) => {
      const end = httpRequestDuration.startTimer();
      try {
        const { page = 1, limit = 10, startDate, endDate, status } = req.query;
        
        const exceptions = await reconciliationService.getExceptions({
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          startDate,
          endDate,
          status
        });
        
        httpRequestsTotal.inc({ route: '/reconciliation/exceptions', method: 'GET', status: 200 });
        end({ route: '/reconciliation/exceptions', method: 'GET', status: 200 });
        
        res.json(exceptions);
      } catch (error) {
        logger.error('Failed to get reconciliation exceptions', { error });
        httpRequestsTotal.inc({ route: '/reconciliation/exceptions', method: 'GET', status: 500 });
        end({ route: '/reconciliation/exceptions', method: 'GET', status: 500 });
        next(error);
      }
    }
  );

  /**
   * @route   PATCH /reconciliation/exceptions/:id/resolve
   * @desc    解决对账异常
   * @access  Private
   */
  router.patch('/exceptions/:id/resolve',
    authMiddleware,
    checkPermission('reconciliation:write'),
    rateLimiter,
    validateRequest(Joi.object({
      resolution: Joi.string().required(),
      notes: Joi.string().optional()
    })),
    async (req: any, res: any, next: any) => {
      const end = httpRequestDuration.startTimer();
      try {
        const { id } = req.params;
        const { resolution, notes } = req.body || {};
        
        const result = await reconciliationService.resolveException(id, resolution, notes);
        
        httpRequestsTotal.inc({ route: '/reconciliation/exceptions/:id/resolve', method: 'PATCH', status: 200 });
        end({ route: '/reconciliation/exceptions/:id/resolve', method: 'PATCH', status: 200 });
        
        res.json(result);
      } catch (error) {
        logger.error('Failed to resolve reconciliation exception', { error });
        httpRequestsTotal.inc({ route: '/reconciliation/exceptions/:id/resolve', method: 'PATCH', status: 500 });
        end({ route: '/reconciliation/exceptions/:id/resolve', method: 'PATCH', status: 500 });
        next(error);
      }
    }
  );

  module.exports = router;
})();
