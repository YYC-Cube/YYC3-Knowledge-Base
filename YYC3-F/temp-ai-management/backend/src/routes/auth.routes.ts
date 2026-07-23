import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import AuthService from '../services/auth.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { logger } from '../config/logger';
import { AppError } from '../utils/app-error';
import { ErrorCode } from '../constants/error-codes';

const router = Router();

/**
 * @route POST /api/auth/register
 * @desc 用户注册
 * @access Public
 */
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('firstName')
      .isString()
      .isLength({ min: 2 })
      .withMessage('First name must be at least 2 characters'),
    body('lastName')
      .isString()
      .isLength({ min: 2 })
      .withMessage('Last name must be at least 2 characters'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw AppError.badRequest('Validation failed', ErrorCode.VALIDATION_ERROR, errors.array());
      }

      const { email, password, firstName, lastName } = req.body;

      // 创建用户
      const result = await AuthService.register(email, password, firstName, lastName);

      logger.info('User registered successfully', { email });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      next(error as Error);
    }
  }
);

/**
 * @route POST /api/auth/login
 * @desc 用户登录
 * @access Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw AppError.badRequest('Validation failed', ErrorCode.VALIDATION_ERROR, errors.array());
      }

      const { email, password } = req.body;
      // 获取客户端IP
      const ipAddress = req.ip || req.connection.remoteAddress || '';

      // 登录用户
      const result = await AuthService.login(email, password, ipAddress);

      logger.info('User logged in successfully', { email });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      next(error as Error);
    }
  }
);

/**
 * @route POST /api/auth/refresh
 * @desc 刷新访问令牌
 * @access Public (需要有效刷新令牌)
 */
router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw AppError.badRequest('Validation failed', ErrorCode.VALIDATION_ERROR, errors.array());
      }

      const { refreshToken } = req.body;

      // 刷新令牌
      const result = await AuthService.refreshToken(refreshToken);

      logger.info('Token refreshed successfully');

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      next(error as Error);
    }
  }
);

/**
 * @route POST /api/auth/logout
 * @desc 用户登出
 * @access Private
 */
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { refreshToken } = req.body;

    if (!userId) {
      throw AppError.unauthorized('User not authenticated', ErrorCode.UNAUTHORIZED);
    }

    // 登出用户
    await AuthService.logout(userId, refreshToken);

    logger.info('User logged out successfully', { userId });

    res.status(200).json({
      success: true,
      message: 'Successfully logged out',
    });
  } catch (error: unknown) {
    next(error as Error);
  }
});

/**
 * @route POST /api/auth/password-reset/request
 * @desc 请求密码重置
 * @access Public
 */
router.post(
  '/password-reset/request',
  [
    body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw AppError.badRequest('Validation failed', ErrorCode.VALIDATION_ERROR, errors.array());
      }

      const { email } = req.body;

      // 请求密码重置
      await AuthService.requestPasswordReset(email);

      logger.info('Password reset request processed', { email });

      // 注意：不透露用户是否存在
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
    } catch (error: unknown) {
      next(error as Error);
    }
  }
);

/**
 * @route POST /api/auth/password-reset/reset
 * @desc 重置密码
 * @access Public (需要有效重置令牌)
 */
router.post(
  '/password-reset/reset',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw AppError.badRequest('Validation failed', ErrorCode.VALIDATION_ERROR, errors.array());
      }

      const { token, password } = req.body;

      // 重置密码
      await AuthService.resetPassword(token, password);

      logger.info('Password reset successfully');

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully',
      });
    } catch (error: unknown) {
      next(error as Error);
    }
  }
);

/**
 * @route POST /api/auth/password/change
 * @desc 修改密码
 * @access Private
 */
router.post(
  '/password/change',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw AppError.badRequest('Validation failed', ErrorCode.VALIDATION_ERROR, errors.array());
      }

      const userId = req.user?.userId;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        throw AppError.unauthorized('User not authenticated', ErrorCode.UNAUTHORIZED);
      }

      // 修改密码
      await AuthService.changePassword(userId, currentPassword, newPassword);

      logger.info('Password changed successfully', { userId });

      res.status(200).json({
        success: true,
        message: 'Password has been changed successfully',
      });
    } catch (error: unknown) {
      next(error as Error);
    }
  }
);

/**
 * @route GET /api/auth/me
 * @desc 获取当前用户信息
 * @access Private
 */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user) {
      throw AppError.unauthorized('User not authenticated', ErrorCode.UNAUTHORIZED);
    }

    logger.info('Retrieved current user info', { userId: user.userId });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
});

/**
 * @route GET /api/auth/permissions
 * @desc 获取当前用户权限
 * @access Private
 */
router.get('/permissions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user) {
      throw AppError.unauthorized('User not authenticated', ErrorCode.UNAUTHORIZED);
    }

    logger.info('Retrieved user permissions', { userId: user.userId });

    res.status(200).json({
      success: true,
      data: {
        roles: user.roles,
      },
    });
  } catch (error: unknown) {
    next(error as Error);
  }
});

module.exports = router;