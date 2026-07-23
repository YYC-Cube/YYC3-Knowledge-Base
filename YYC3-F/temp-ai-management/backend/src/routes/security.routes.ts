(function() {
  const express = require('express');
  const SecurityLogController = require('../controllers/security-log.controller').SecurityLogController;
  const { authenticate, authorize } = require('../middleware/auth.middleware');

  const router = express.Router();

  /**
   * 安全日志相关路由
   * 这些路由用于查询和管理系统安全日志、监控用户活动和处理安全警报
   * 所有路由都需要管理员或安全分析师权限
   */

  // 修复拼写错误：将outer改为router
  // 应用身份验证中间件
  router.use(authenticate);

  /**
   * @route GET /api/security/login-history
   * @desc 查询用户登录历史记录
   * @access Private (需要管理员或安全分析师权限)
   */
  router.get('/login-history', authorize(['admin', 'security-analyst']), SecurityLogController.getLoginHistory);

  /**
   * @route GET /api/security/activity-logs
   * @desc 查询用户活动日志
   * @access Private (需要管理员或安全分析师权限)
   */
  router.get('/activity-logs', authorize(['admin', 'security-analyst']), SecurityLogController.getUserActivityLogs);

  /**
   * @route GET /api/security/alerts
   * @desc 查询安全警报
   * @access Private (需要管理员或安全分析师权限)
   */
  router.get('/alerts', authorize(['admin', 'security-analyst']), SecurityLogController.getSecurityAlerts);

  /**
   * @route PATCH /api/security/alerts/:alertId/resolve
   * @desc 解决安全警报
   * @access Private (需要管理员或安全分析师权限)
   */
  router.patch('/alerts/:alertId/resolve', authorize(['admin', 'security-analyst']), SecurityLogController.resolveSecurityAlert);

  /**
   * @route GET /api/security/statistics
   * @desc 获取安全统计信息
   * @access Private (需要管理员或安全分析师权限)
   */
  router.get('/statistics', authorize(['admin', 'security-analyst']), SecurityLogController.getSecurityStatistics);

  /**
   * @route GET /api/security/users/:userId/report
   * @desc 获取用户安全报告
   * @access Private (需要管理员或安全分析师权限)
   */
  router.get('/users/:userId/report', authorize(['admin', 'security-analyst']), SecurityLogController.getUserSecurityReport);

  /**
   * @route GET /api/security/suspicious-logins
   * @desc 获取异常登录尝试
   * @access Private (需要管理员或安全分析师权限)
   */
  router.get('/suspicious-logins', authorize(['admin', 'security-analyst']), SecurityLogController.getSuspiciousLogins);

  module.exports = router;
})();