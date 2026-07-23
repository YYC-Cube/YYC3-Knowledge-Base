(function() {
  const express = require('express');
  const { checkDatabaseHealth } = require('../config/database');
  const { checkRedisHealth } = require('../config/redis');
  const { register } = require('../config/metrics');
  const { logger } = require('../config/logger');

  const router = express.Router();

  /**
   * @route   GET /health
   * @desc    基础健康检查
   * @access  Public
   */
  router.get('/', async (req: any, res: any) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  /**
   * @route   GET /health/ready
   * @desc    就绪检查（K8s readiness probe）
   * @access  Public
   */
  router.get('/ready', async (req: any, res: any) => {
    try {
      // 检查数据库
      const dbHealth = await checkDatabaseHealth();
      if (!dbHealth) {
        throw new Error(`Database unhealthy`);
      }

      // 检查 Redis
      const redisHealth = await checkRedisHealth();
      if (!redisHealth) {
        throw new Error(`Redis unhealthy`);
      }

      res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbHealth,
          redis: redisHealth,
        },
      });
    } catch (error) {
      logger.error('Readiness check failed', { error });
      res.status(503).json({
        status: 'not ready',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * @route   GET /health/live
   * @desc    存活检查（K8s liveness probe）
   * @access  Public
   */
  router.get('/live', (req: any, res: any) => {
    res.json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      process: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
      },
    });
  });

  /**
   * @route   GET /health/metrics
   * @desc    Prometheus 指标端点
   * @access  Public
   */
  router.get('/metrics', async (req: any, res: any) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.send(metrics);
    } catch (error) {
      logger.error('Failed to collect metrics', { error });
      res.status(500).json({
        error: 'Failed to collect metrics',
      });
    }
  });

  module.exports = router;
})();
