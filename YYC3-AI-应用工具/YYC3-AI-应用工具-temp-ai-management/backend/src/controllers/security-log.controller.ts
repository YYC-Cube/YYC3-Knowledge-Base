// 导入必要的模块
const { pool } = require('../config/database');
const { securityLogService } = require('../services/security-log.service');
const AppError = require('../utils/app-error');
const { logger } = require('../config/logger');

// 导入Express类型
import type { Request, Response, NextFunction } from 'express';

// 安全日志控制器
class SecurityLogController {
  // 查询登录历史记录
  static getLoginHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, username, ipAddress, success, startDate, endDate, limit = '20', offset = '0' } = req.query;
      
      // 获取用户登录历史
      let loginHistory: any[] = [];
      if (userId) {
        loginHistory = await securityLogService.getUserLoginHistory(userId as string, parseInt(limit as string));
      } else {
        // 查询所有用户的登录记录
        const queryText = `SELECT id, user_id, username, ip_address, user_agent, success, reason, timestamp
                     FROM user_login_history
                     ORDER BY timestamp DESC
                     LIMIT $1 OFFSET $2`;
        const result = await pool.query(queryText, [parseInt(limit as string), parseInt(offset as string)]);
        loginHistory = result.rows;
      }

      logger.info('Retrieved login history', {
        userId,
        username,
        count: loginHistory.length
      });

      res.status(200).json({
        success: true,
        data: loginHistory,
        meta: {
          total: loginHistory.length, // 简化处理
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      logger.error('Failed to retrieve login history', { error });
      next(error);
    }
  };

  // 查询用户活动日志
  static getUserActivityLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, username, eventType, ipAddress, startDate, endDate, limit = '20', offset = '0' } = req.query;
      
      // 获取用户活动日志
      let queryText = `SELECT id, user_id, username, event_type, details, ip_address, timestamp
                     FROM user_activity_logs WHERE 1=1`;
      const params: any[] = [];
      let paramIndex = 1;
      
      if (userId) {
        queryText += ` AND user_id = $${paramIndex++}`;
        params.push(userId);
      }
      
      if (eventType) {
        queryText += ` AND event_type = $${paramIndex++}`;
        params.push(eventType);
      }
      
      if (ipAddress) {
        queryText += ` AND ip_address = $${paramIndex++}`;
        params.push(ipAddress);
      }
      
      queryText += ` ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(parseInt(limit as string), parseInt(offset as string));
      
      const result = await pool.query(queryText, params);
      
      // 解析details为对象
      const activityLogs = result.rows.map((row: any) => ({
        ...row,
        details: JSON.parse(row.details)
      }));

      logger.info('Retrieved user activity logs', {
        userId,
        username,
        eventType,
        count: activityLogs.length
      });

      res.status(200).json({
        success: true,
        data: activityLogs,
        meta: {
          total: activityLogs.length, // 简化处理
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      logger.error('Failed to retrieve user activity logs', { error });
      next(error);
    }
  };

  // 查询安全警报
  static getSecurityAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { severity, eventType, userId, isResolved, startDate, endDate, limit = '20', offset = '0' } = req.query;
      
      // 获取安全警报
      let alerts: any[];
      if (severity && typeof severity === 'string') {
        alerts = await securityLogService.getUnresolvedAlerts(severity as any, parseInt(limit as string));
      } else {
        alerts = await securityLogService.getUnresolvedAlerts(undefined, parseInt(limit as string));
      }

      logger.info('Retrieved security alerts', {
        severity,
        eventType,
        isResolved,
        count: alerts.length
      });

      res.status(200).json({
        success: true,
        data: alerts,
        meta: {
          total: alerts.length, // 简化处理
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      logger.error('Failed to retrieve security alerts', { error });
      next(error);
    }
  };

  // 解决安全警报
  static resolveSecurityAlert = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { alertId } = req.params;
      const { resolutionNotes } = req.body || {};
      // 安全地获取用户ID，使用类型断言
      const currentUserId = (req as any).user?.id;

      if (!currentUserId) {
        throw AppError.unauthorized('User not authenticated');
      }

      // 解决安全警报
      const alert = await securityLogService.resolveSecurityAlert(alertId, resolutionNotes);

      logger.info('Security alert resolved', {
        alertId,
        resolvedBy: currentUserId
      });

      res.status(200).json({
        success: true,
        data: alert
      });
    } catch (error) {
      logger.error('Failed to resolve security alert', {
        error,
        alertId: req.params.alertId
      });
      next(error);
    }
  };

  // 获取安全统计信息
  static getSecurityStatistics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { timeRange = '7d' } = req.query;
      // 获取安全统计信息
      let days = 7;
      if (timeRange === '24h') days = 1;
      if (timeRange === '30d') days = 30;
      
      const statistics = await securityLogService.getSecurityStats(days);

      logger.info('Retrieved security statistics', { timeRange });

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('Failed to retrieve security statistics', { error });
      next(error);
    }
  };

  // 获取用户安全报告
  static getUserSecurityReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      // 获取用户安全报告
      const loginHistory = await securityLogService.getUserLoginHistory(userId);
      const unresolvedAlerts = await securityLogService.getUnresolvedAlerts();
      
      // 筛选用户相关的警报
      const userAlerts = unresolvedAlerts.filter((alert: any) => alert.user_id === userId);
      
      // 构建报告
      const report = {
        userId,
        loginHistory: loginHistory.slice(0, 10), // 最近10次登录
        unresolvedAlerts: userAlerts,
        hasSuspiciousActivity: await securityLogService.detectSuspiciousLogins(userId)
      };

      logger.info('Retrieved user security report', { userId });

      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Failed to retrieve user security report', {
        error,
        userId: req.params.userId
      });
      next(error);
    }
  };

  // 获取异常登录尝试
  static getSuspiciousLogins = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = '20', offset = '0' } = req.query;
      // 获取异常登录尝试
      const queryText = `SELECT id, user_id, username, ip_address, user_agent, success, reason, timestamp
                     FROM user_login_history
                     WHERE success = false
                     ORDER BY timestamp DESC
                     LIMIT $1 OFFSET $2`;
      const result = await pool.query(queryText, [parseInt(limit as string), parseInt(offset as string)]);
      
      const suspiciousLogins = result.rows;

      logger.info('Retrieved suspicious logins', { count: suspiciousLogins.length });

      res.status(200).json({
        success: true,
        data: suspiciousLogins,
        meta: {
          total: suspiciousLogins.length, // 简化处理
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      logger.error('Failed to retrieve suspicious logins', { error });
      next(error);
    }
  };
}

// 使用CommonJS导出
module.exports = SecurityLogController;