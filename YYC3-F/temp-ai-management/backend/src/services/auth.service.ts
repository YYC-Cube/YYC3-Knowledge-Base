// 在文件顶部添加dotenv配置以确保环境变量正确加载
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { AppError } from '../utils/app-error';
import { ErrorCode } from '../constants/error-codes';

// 添加调试日志，检查dotenv配置
console.log('Before dotenv.config:', {
  hasDotenv: !!dotenv,
  processEnvKeys: Object.keys(process.env).slice(0, 5) // 只显示前5个环境变量键名
});

dotenv.config();

// 再次检查环境变量
console.log('After dotenv.config:', {
  hasJWTSecret: !!process.env.JWT_SECRET,
  hasJWTRefreshSecret: !!process.env.JWT_REFRESH_SECRET,
  processEnvKeys: Object.keys(process.env).slice(0, 5)
});

// 从环境变量获取密钥，不提供默认值以确保安全
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');

// 添加调试日志
console.log('Loaded environment variables:', {
  JWT_SECRET: JWT_SECRET ? 'Present (hidden)' : 'Not found',
  JWT_REFRESH_SECRET: JWT_REFRESH_SECRET ? 'Present (hidden)' : 'Not found',
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  SALT_ROUNDS
});

// 验证必要的环境变量是否存在
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error('Critical error: Missing JWT secrets in environment variables');
  throw new Error('JWT secrets are not configured in environment variables');
}

/**
 * TokenPayload接口定义JWT令牌中包含的用户信息
 */
export interface TokenPayload {
  userId: string;
  email: string;
  roles: string[];
}

/**
 * 认证服务类 - 提供用户注册、登录、令牌管理等功能
 */
const AuthService = {
  /**
   * 用户注册
   * @param email - 用户邮箱
   * @param password - 用户密码
   * @param firstName - 用户名字
   * @param lastName - 用户姓氏
   * @returns 注册结果包含用户信息和令牌
   */
  async register(email: string, password: string, firstName: string, lastName: string): Promise<{user: any, accessToken: string, refreshToken: string}> {
    try {
      // 检查邮箱是否已存在
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        throw AppError.conflict('Email already exists', ErrorCode.CONFLICT);
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // 创建用户
      const userId = crypto.randomUUID();
      const result = await pool.query(
        `INSERT INTO users (
          id, email, password_hash, first_name, last_name, 
          status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
        RETURNING id, email, first_name, last_name, status, created_at`,
        [userId, email.toLowerCase(), hashedPassword, firstName, lastName]
      );

      const user = result.rows[0];

      // 分配默认角色
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id)
        SELECT $1, id FROM roles WHERE role_name = 'user'`,
        [userId]
      );

      // 生成令牌
      const accessToken = this.generateAccessToken({
        userId: user.id,
        email: user.email,
        roles: ['user']
      });
      const refreshToken = this.generateRefreshToken(user.id);

      // 存储刷新令牌
      await this.storeRefreshToken(user.id, refreshToken);

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      return { user, accessToken, refreshToken };
    } catch (error: any) {
      logger.error('Registration failed', { email, error: error.message });
      throw error;
    }
  },

  /**
   * 生成访问令牌
   * @param payload - 令牌中包含的用户信息
   * @returns 生成的JWT访问令牌
   */
  generateAccessToken(payload: TokenPayload): string {
    // 确保JWT_SECRET和ACCESS_TOKEN_EXPIRY不是undefined
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }
    // 使用类型断言解决jwt.sign的类型问题
    return jwt.sign(payload, JWT_SECRET as string, {
      expiresIn: ACCESS_TOKEN_EXPIRY
    } as jwt.SignOptions);
  },

  /**
   * 生成刷新令牌
   * @param userId - 用户ID
   * @returns 生成的JWT刷新令牌
   */
  generateRefreshToken(userId: string): string {
    // 确保JWT_REFRESH_SECRET和REFRESH_TOKEN_EXPIRY不是undefined
    if (!JWT_REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }
    // 使用类型断言解决jwt.sign的类型问题
    return jwt.sign({ userId }, JWT_REFRESH_SECRET as string, {
      expiresIn: REFRESH_TOKEN_EXPIRY
    } as jwt.SignOptions);
  },

  /**
   * 验证访问令牌
   * @param token - 要验证的JWT令牌
   * @returns 解码后的令牌数据
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      // 添加类型断言确保返回TokenPayload类型
      return decoded as TokenPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw AppError.unauthorized('Token expired', ErrorCode.TOKEN_EXPIRED);
      } else if (error.name === 'JsonWebTokenError') {
        throw AppError.unauthorized('Invalid token', ErrorCode.INVALID_TOKEN);
      }
      throw AppError.unauthorized('Authentication failed', ErrorCode.UNAUTHORIZED);
    }
  },

  /**
   * 验证刷新令牌
   * @param token - 要验证的JWT刷新令牌
   * @returns 解码后的令牌数据
   */
  verifyRefreshToken(token: string): {userId: string} {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
      // 添加类型断言确保返回正确的类型
      return decoded as {userId: string};
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw AppError.unauthorized('Refresh token expired', ErrorCode.TOKEN_EXPIRED);
      } else if (error.name === 'JsonWebTokenError') {
        throw AppError.unauthorized('Invalid refresh token', ErrorCode.INVALID_TOKEN);
      }
      throw AppError.unauthorized('Authentication failed', ErrorCode.UNAUTHORIZED);
    }
  },

  /**
   * 存储刷新令牌
   * @param userId - 用户ID
   * @param token - 刷新令牌
   */
  async storeRefreshToken(userId: string, token: string): Promise<void> {
    const key = `refresh_token:${userId}`;
    await redis.set(key, token, 'EX', 7 * 24 * 60 * 60); // 7天过期
  },

  /**
   * 获取存储的刷新令牌
   * @param userId - 用户ID
   * @returns 存储的刷新令牌或null
   */
  async getStoredRefreshToken(userId: string): Promise<string|null> {
    const key = `refresh_token:${userId}`;
    return await redis.get(key);
  },

  /**
   * 删除刷新令牌
   * @param userId - 用户ID
   * @param refreshToken - 刷新令牌（可选）
   */
  async deleteRefreshToken(userId: string, refreshToken?: string): Promise<void> {
    const key = `refresh_token:${userId}`;
    await redis.del(key);
  },

  /**
   * 用户登录
   * @param email - 用户邮箱
   * @param password - 用户密码
   * @param ipAddress - 用户IP地址
   * @returns 登录结果包含用户信息和令牌
   */
  async login(email: string, password: string, ipAddress: string): Promise<{user: any, accessToken: string, refreshToken: string}> {
    try {
      // 检查登录尝试次数
      const attemptsKey = `login_attempts:${email}:${ipAddress}`;
      const attempts = await redis.get(attemptsKey);
      
      if (attempts && parseInt(attempts) >= 5) {
        throw AppError.tooManyRequests('Too many login attempts. Please try again later.', ErrorCode.TOO_MANY_REQUESTS);
      }

      // 查找用户
      const result = await pool.query(
        `SELECT u.id, u.email, u.password_hash, u.status, 
                ARRAY_AGG(r.role_name) as roles 
         FROM users u 
         LEFT JOIN user_roles ur ON u.id = ur.user_id 
         LEFT JOIN roles r ON ur.role_id = r.id 
         WHERE u.email = $1 
         GROUP BY u.id`,
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        await this.recordFailedLogin(email, ipAddress);
        throw AppError.unauthorized('Invalid credentials', ErrorCode.UNAUTHORIZED);
      }

      const user = result.rows[0];

      // 检查用户状态
      if (user.status !== 'active') {
        await this.recordFailedLogin(email, ipAddress);
        throw AppError.unauthorized('Account is not active', ErrorCode.ACCOUNT_INACTIVE);
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isPasswordValid) {
        await this.recordFailedLogin(email, ipAddress);
        throw AppError.unauthorized('Invalid credentials', ErrorCode.UNAUTHORIZED);
      }

      // 清除登录尝试记录
      await this.clearLoginAttempts(email, ipAddress);

      // 生成令牌
      const accessToken = this.generateAccessToken({
        userId: user.id,
        email: user.email,
        roles: user.roles || []
      });
      
      const refreshToken = this.generateRefreshToken(user.id);
      
      // 存储刷新令牌
      await this.storeRefreshToken(user.id, refreshToken);

      // 删除密码哈希，不返回给客户端
      delete user.password_hash;

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      return { user, accessToken, refreshToken };
    } catch (error: any) {
      logger.warn('Login failed', { email, ipAddress, error: error.message });
      throw error;
    }
  },

  /**
   * 用户登出
   * @param userId - 用户ID
   * @param refreshToken - 刷新令牌（可选）
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    try {
      await this.deleteRefreshToken(userId, refreshToken);
      logger.info('User logged out successfully', { userId });
    } catch (error: any) {
      logger.error('Logout failed', { userId, error: error.message });
      throw error;
    }
  },

  /**
   * 刷新访问令牌（别名方法，保持API兼容性）
   * @param refreshToken - 当前的刷新令牌
   * @returns 新的访问令牌和刷新令牌
   */
  async refreshToken(refreshToken: string): Promise<{accessToken: string, refreshToken: string}> {
    return this.refreshAccessToken(refreshToken);
  },

  /**
   * 刷新访问令牌
   * @param refreshToken - 当前的刷新令牌
   * @returns 新的访问令牌和刷新令牌
   */
  async refreshAccessToken(refreshToken: string): Promise<{accessToken: string, refreshToken: string}> {
    try {
      // 验证刷新令牌
      const decoded = this.verifyRefreshToken(refreshToken);
      const userId = decoded.userId;

      // 检查令牌是否与存储的匹配
      const storedToken = await this.getStoredRefreshToken(userId);
      
      if (!storedToken || storedToken !== refreshToken) {
        throw AppError.unauthorized('Invalid refresh token', ErrorCode.INVALID_TOKEN);
      }

      // 获取用户信息和角色
      const result = await pool.query(
        `SELECT u.id, u.email, ARRAY_AGG(r.role_name) as roles 
         FROM users u 
         LEFT JOIN user_roles ur ON u.id = ur.user_id 
         LEFT JOIN roles r ON ur.role_id = r.id 
         WHERE u.id = $1 
         GROUP BY u.id`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw AppError.unauthorized('User not found', ErrorCode.USER_NOT_FOUND);
      }

      const user = result.rows[0];

      // 生成新令牌
      const newAccessToken = this.generateAccessToken({
        userId: user.id,
        email: user.email,
        roles: user.roles || []
      });
      
      const newRefreshToken = this.generateRefreshToken(user.id);

      // 存储新的刷新令牌，替换旧的
      await this.storeRefreshToken(userId, newRefreshToken);

      logger.info('Access token refreshed', { userId });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error: any) {
      logger.warn('Token refresh failed', { error: error.message });
      throw error;
    }
  },

  /**
   * 记录失败的登录尝试
   * @param email - 用户邮箱
   * @param ipAddress - 用户IP地址
   */
  async recordFailedLogin(email: string, ipAddress: string): Promise<void> {
    const key = `login_attempts:${email}:${ipAddress}`;
    const attempts = await redis.get(key);

    if (attempts) {
      await redis.incr(key);
    } else {
      await redis.set(key, '1', 'EX', 60 * 60); // 1小时后过期
    }
  },

  /**
   * 清除登录尝试记录
   * @param email - 用户邮箱
   * @param ipAddress - 用户IP地址
   */
  async clearLoginAttempts(email: string, ipAddress: string): Promise<void> {
    const key = `login_attempts:${email}:${ipAddress}`;
    await redis.del(key);
  },

  /**
   * 请求密码重置
   * @param email - 用户邮箱
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      logger.info('Password reset request received', { email });
      // 注意：为了安全，即使邮箱不存在，也不抛出错误
    } catch (error: any) {
      logger.error('Password reset request failed', { email, error: error.message });
      throw error;
    }
  },

  /**
   * 重置密码
   * @param token - 重置令牌
   * @param newPassword - 新密码
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      logger.info('Password reset attempt with token');
      // 实际实现应该验证令牌并更新密码
    } catch (error: any) {
      logger.error('Password reset failed', { error: error.message });
      throw error;
    }
  },

  /**
   * 修改密码
   * @param userId - 用户ID
   * @param currentPassword - 当前密码
   * @param newPassword - 新密码
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      logger.info('Password change attempt', { userId });
      // 实际实现应该验证当前密码并更新为新密码
    } catch (error: any) {
      logger.error('Password change failed', { userId, error: error.message });
      throw error;
    }
  }
};

export default AuthService;