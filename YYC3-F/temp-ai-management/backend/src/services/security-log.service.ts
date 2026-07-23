import { pool } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../utils/app-error';
import { ErrorCode } from '../constants/error-codes';

// 安全事件类型定义
const SecurityEventType = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET: 'PASSWORD_RESET',
  FAILED_LOGIN: 'FAILED_LOGIN',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  PRIVILEGE_ESCALATION: 'PRIVILEGE_ESCALATION',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
  API_KEY_CREATED: 'API_KEY_CREATED',
  API_KEY_REVOKED: 'API_KEY_REVOKED',
  SENSITIVE_DATA_ACCESS: 'SENSITIVE_DATA_ACCESS',
  CONFIGURATION_CHANGE: 'CONFIGURATION_CHANGE',
  SECURITY_POLICY_VIOLATION: 'SECURITY_POLICY_VIOLATION',
};

// 安全日志严重程度
const SecuritySeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

class SecurityLogService {
  constructor() {
    logger.info('Security Log Service initialized');
  }

  /**
   * 记录用户登录尝试
   */
  async logLoginAttempt(
    user_id: string, username: string, ip_address: string, user_agent: string, success: boolean, reason: string
  ) {
    try {
      logger.info('Logging login attempt', { username, success });

      const result = await pool.query(
        `INSERT INTO user_login_history (user_id, username, ip_address, user_agent, success, reason)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, user_id, username, ip_address, user_agent, success, reason, timestamp`,
        [user_id, username, ip_address, user_agent, success, reason]
      );

      const record = result.rows[0];
      logger.info('Login attempt logged successfully', { record_id: record.id });

      // 如果登录失败，创建安全警报
      if (!success) {
        await this.createSecurityAlert(
          SecurityEventType.FAILED_LOGIN,
          SecuritySeverity.MEDIUM,
          { username, reason, ip_address, user_agent },
          user_id,
          username,
          ip_address
        );
      }

      return record;
    } catch (error) {
      logger.error('Failed to log login attempt', { error });
      throw AppError.internal('Failed to log login attempt', ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * 记录用户活动
   */
  async logUserActivity(
    user_id: string, username: string, event_type: string, details: object, ip_address: string
  ) {
    try {
      logger.info('Logging user activity', { username, event_type });

      // 序列化details对象
      const serializedDetails = JSON.stringify(details);

      const result = await pool.query(
        `INSERT INTO user_activity_logs (user_id, username, event_type, details, ip_address)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, username, event_type, details, ip_address, timestamp`,
        [user_id, username, event_type, serializedDetails, ip_address]
      );

      const log = result.rows[0];
      
      // 解析details为对象
      log.details = JSON.parse(log.details);
      
      logger.info('User activity logged successfully', { log_id: log.id });

      // 对于高风险事件，创建安全警报
      if ([
        SecurityEventType.PASSWORD_CHANGE,
        SecurityEventType.PRIVILEGE_ESCALATION,
        SecurityEventType.API_KEY_CREATED,
        SecurityEventType.SENSITIVE_DATA_ACCESS
      ].includes(event_type)) {
        await this.createSecurityAlert(
          event_type,
          SecuritySeverity.HIGH,
          details,
          user_id,
          username,
          ip_address
        );
      }

      return log;
    } catch (error) {
      logger.error('Failed to log user activity', { error });
      throw AppError.internal('Failed to log user activity', ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * 创建安全警报
   */
  async createSecurityAlert(
    event_type: string, severity: string, details: object, user_id: string, username: string, ip_address: string
  ) {
    try {
      logger.info('Creating security alert', { event_type, severity });

      // 序列化details对象
      const serializedDetails = JSON.stringify(details);

      const result = await pool.query(
        `INSERT INTO security_alerts (event_type, severity, details, user_id, username, ip_address, is_resolved)
         VALUES ($1, $2, $3, $4, $5, $6, false)
         RETURNING id, event_type, severity, details, user_id, username, ip_address, is_resolved, created_at, resolved_at`,
        [event_type, severity, serializedDetails, user_id, username, ip_address]
      );

      const alert = result.rows[0];
      
      // 解析details为对象
      alert.details = JSON.parse(alert.details);
      
      logger.info('Security alert created successfully', { alert_id: alert.id });

      // 对于严重警报，记录到主要日志系统
      if (severity === SecuritySeverity.CRITICAL) {
        logger.error('Critical security alert', {
          alert_id: alert.id,
          event_type,
          user_id,
          username,
          ip_address,
          details
        });
      }

      return alert;
    } catch (error) {
      logger.error('Failed to create security alert', { error });
      throw AppError.internal('Failed to create security alert', ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * 解决安全警报
   */
  async resolveSecurityAlert(alert_id: string, resolution_notes: string) {
    try {
      logger.info('Resolving security alert', { alert_id });

      const result = await pool.query(
        `UPDATE security_alerts
         SET is_resolved = true,
             resolved_at = NOW(),
             resolution_notes = $2
         WHERE id = $1
         RETURNING id, event_type, severity, details, user_id, username, ip_address, is_resolved, created_at, resolved_at`,
        [alert_id, resolution_notes]
      );

      if (result.rowCount === 0) {
        throw new Error('Security alert not found');
      }

      const alert = result.rows[0];
      
      // 解析details为对象
      alert.details = JSON.parse(alert.details);
      
      logger.info('Security alert resolved successfully', { alert_id });
      return alert;
    } catch (error) {
      logger.error('Failed to resolve security alert', { alert_id, error });
      throw AppError.internal('Failed to resolve security alert', ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * 获取安全统计信息
   */
  async getSecurityStats(days: number = 7) {
    try {
      logger.info('Fetching security statistics', { days });

      // 获取登录统计
      const loginStatsResult = await pool.query(
        `SELECT 
           COUNT(*) FILTER (WHERE success = true) as total_logins,
           COUNT(*) FILTER (WHERE success = false) as failed_logins
         FROM user_login_history
         WHERE timestamp >= NOW() - INTERVAL '${days} days'`
      );

      // 获取警报统计
      const alertStatsResult = await pool.query(
        `SELECT 
           COUNT(*) FILTER (WHERE is_resolved = false) as active_alerts,
           COUNT(*) FILTER (WHERE is_resolved = false AND severity = 'CRITICAL') as critical_alerts
         FROM security_alerts
         WHERE created_at >= NOW() - INTERVAL '${days} days'`
      );

      // 获取最近安全事件
      const eventsResult = await pool.query(
        `SELECT COUNT(*) as recent_security_events
         FROM user_activity_logs
         WHERE timestamp >= NOW() - INTERVAL '${days} days'`
      );

      const loginStats = loginStatsResult.rows[0];
      const alertStats = alertStatsResult.rows[0];
      const eventsStats = eventsResult.rows[0];

      const stats = {
        total_logins: parseInt(loginStats.total_logins, 10) || 0,
        failed_logins: parseInt(loginStats.failed_logins, 10) || 0,
        active_alerts: parseInt(alertStats.active_alerts, 10) || 0,
        critical_alerts: parseInt(alertStats.critical_alerts, 10) || 0,
        recent_security_events: parseInt(eventsStats.recent_security_events, 10) || 0,
      };

      logger.info('Security statistics fetched successfully');
      return stats;
    } catch (error) {
      logger.error('Failed to fetch security statistics', { error });
      throw AppError.internal('Failed to fetch security statistics', ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * 获取用户登录历史
   */
  async getUserLoginHistory(user_id: string, limit: number = 50) {
    try {
      logger.info('Fetching user login history', { user_id, limit });

      const result = await pool.query(
        `SELECT id, user_id, username, ip_address, user_agent, success, reason, timestamp
         FROM user_login_history
         WHERE user_id = $1
         ORDER BY timestamp DESC
         LIMIT $2`,
        [user_id, limit]
      );

      logger.info('User login history fetched successfully', { user_id, count: result.rows.length });
      return result.rows;
    } catch (error) {
      logger.error('Failed to fetch user login history', { user_id, error });
      throw AppError.internal('Failed to fetch user login history', ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * 获取未解决的安全警报
   */
  async getUnresolvedAlerts(severity: string, limit: number = 100) {
    try {
      logger.info('Fetching unresolved security alerts', { severity, limit });

      let query = `SELECT id, event_type, severity, details, user_id, username, ip_address, is_resolved, created_at, resolved_at
                  FROM security_alerts
                  WHERE is_resolved = false`;
      const params = [];

      if (severity) {
        query += ` AND severity = $1`;
        params.push(severity);
        query += ` ORDER BY created_at DESC LIMIT $2`;
        params.push(limit);
      } else {
        query += ` ORDER BY created_at DESC LIMIT $1`;
        params.push(limit);
      }

      const result = await pool.query(query, params);

      // 解析details为对象
      const alerts = result.rows.map((row: any) => ({
        ...row,
        details: JSON.parse(row.details)
      }));

      logger.info('Unresolved security alerts fetched successfully', { count: alerts.length });
      return alerts;
    } catch (error) {
      logger.error('Failed to fetch unresolved security alerts', { severity, error });
      throw AppError.internal('Failed to fetch unresolved security alerts', ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * 检测可疑登录行为
   */
  async detectSuspiciousLogins(user_id: string) {
    try {
      logger.info('Detecting suspicious logins', { user_id });

      // 检查短时间内的失败登录尝试
      const failedLoginsResult = await pool.query(
        `SELECT COUNT(*) as count
         FROM user_login_history
         WHERE user_id = $1
           AND success = false
           AND timestamp >= NOW() - INTERVAL '1 hour'`,
        [user_id]
      );

      const failedLoginCount = parseInt(failedLoginsResult.rows[0].count, 10) || 0;

      // 如果1小时内有5次或更多失败登录，则视为可疑
      const isSuspicious = failedLoginCount >= 5;

      if (isSuspicious) {
        logger.warn('Suspicious login pattern detected', { user_id, failedLoginCount });
      }

      return isSuspicious;
    } catch (error) {
      logger.error('Failed to detect suspicious logins', { user_id, error });
      // 发生错误时返回false，避免误报
      return false;
    }
  }
}

// 创建并导出单例实例
const securityLogService = new SecurityLogService();

export {
  SecurityLogService,
  securityLogService,
  SecurityEventType,
  SecuritySeverity
};