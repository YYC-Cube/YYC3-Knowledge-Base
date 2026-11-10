import { AppError } from '../utils/app-error';
import { logger } from '../config/logger';
import { ErrorCode } from '../constants/error-codes';
import AuthService from '../services/auth.service';

// 扩展Express Request类型以包含user属性
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        roles: string[];
      };
    }
  }
}

/**
 * @typedef {Object} UserPayload
 * @property {string} userId
 * @property {string} email
 * @property {string[]} roles
 */

/**
 * 认证中间件 - 验证访问令牌
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
const authenticate = async (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction): Promise<void> => {
  try {
    // 从请求头中获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw AppError.unauthorized('Authorization header is required', ErrorCode.UNAUTHORIZED);
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      throw AppError.unauthorized('Invalid authorization format. Use Bearer token', ErrorCode.UNAUTHORIZED);
    }

    // 验证令牌并获取用户信息
    const user = AuthService.verifyAccessToken(token);
    req.user = user;

    // 记录认证事件
    logger.info('User authenticated', { userId: user.userId, email: user.email });

    // 继续请求处理
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn('Authentication failed', { error: errorMessage });
    next(error);
  }
};

/**
 * 授权中间件 - 验证用户角色
 * @param {string[]} roles - 允许访问的角色列表
 * @returns {Function} 中间件函数
 */
const authorize = (roles: string[]) => {
  return (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not authenticated', ErrorCode.UNAUTHORIZED);
      }

      // 检查用户是否有任何所需角色
      const hasRole = req.user.roles.some((userRole: string) => 
    roles.includes(userRole)
  );

      if (!hasRole) {
        throw AppError.forbidden('Insufficient permissions', ErrorCode.FORBIDDEN);
      }

      logger.info('User authorized', {
        userId: req.user.userId,
        email: req.user.email,
        requiredRoles: roles,
        userRoles: req.user.roles
      });

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('Authorization failed', { error: errorMessage });
      next(error);
    }
  };
};

/**
 * 可选认证中间件 - 有令牌则认证，无令牌也可以继续
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
const optionalAuth = async (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const [bearer, token] = authHeader.split(' ');
      if (bearer === 'Bearer' && token) {
        try {
          const user = AuthService.verifyAccessToken(token);
          req.user = user;
          logger.info('Optional authentication successful', { userId: user.userId });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          // 可选认证情况下，令牌验证失败不阻止请求
          logger.warn('Optional authentication token invalid', { error: errorMessage });
        }
      }
    }
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn('Optional authentication middleware error', { error: errorMessage });
    next(); // 即使中间件本身出错，也继续请求处理
  }
};

/**
 * CSRF保护中间件
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
const csrfProtection = (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
  // 对于API请求，通常只需要验证来源头
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

  // 检查是否是安全的请求方法
  const isSafeMethod = ['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(req.method);

  // 对于不安全的方法，验证来源
  if (!isSafeMethod && origin && !allowedOrigins.includes(origin)) {
    logger.warn('CSRF protection rejected request', { origin, method: req.method });
    return next(AppError.forbidden('Invalid CSRF token', ErrorCode.FORBIDDEN));
  }

  next();
};

/**
 * 会话超时检查中间件
 * @param {number} timeoutMinutes - 超时时间（分钟），默认30分钟
 * @returns {Function} 中间件函数
 */
const sessionTimeout = (timeoutMinutes: number = 30) => {
  const timeoutMs = timeoutMinutes * 60 * 1000;

  return (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    if (req.user) {
      // 这里简化处理，实际项目中可能需要在Redis中存储用户的最后活动时间
      // 然后检查是否超过了超时时间
      next();
    } else {
      next();
    }
  };
};

/**
 * 获取当前用户信息辅助函数
 * @param {import('express').Request} req
 * @returns {UserPayload|undefined}
 */
const getCurrentUser = (req: import('express').Request) => {
  return req.user;
};

/**
 * 检查用户是否已认证
 * @param {import('express').Request} req
 * @returns {boolean}
 */
const isAuthenticated = (req: import('express').Request): boolean => {
  return !!req.user;
};

/**
 * 检查用户是否具有特定角色
 * @param {import('express').Request} req
 * @param {string} role
 * @returns {boolean}
 */
const hasRole = (req: import('express').Request, role: string): boolean => {
  return req.user?.roles.includes(role) || false;
};

export {
  authenticate,
  authorize,
  optionalAuth,
  csrfProtection,
  sessionTimeout,
  getCurrentUser,
  isAuthenticated,
  hasRole
};
