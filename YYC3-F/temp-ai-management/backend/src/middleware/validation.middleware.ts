// 修复validation.middleware.ts文件中的TypeScript错误，统一使用CommonJS格式
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../config/logger';

/**
 * 验证请求数据的中间件
 * @param schema - Joi验证模式
 * @param source - 请求数据来源（'body' | 'query' | 'params'）
 * @returns 验证中间件函数
 */
const validateRequest = (schema: Joi.Schema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证请求数据
      const { error, value } = schema.validate(req[source as keyof Request] || {}, {
        abortEarly: false,
        stripUnknown: true,
      });

      // 如果有验证错误，返回错误信息
      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        logger.warn('Validation error', {
          path: req.path,
          errors,
        });

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors,
        });
      }

      // 正确地将验证后的数据附加到请求对象
      if (source === 'body' && req.body) {
        req.body = value;
      } else if (source === 'query' && req.query) {
        req.query = value;
      } else if (source === 'params' && req.params) {
        req.params = value;
      }
      
      next();
    } catch (err) {
      next(err);
    }
  };
};

// 同时支持CommonJS和ES模块导入
export { validateRequest };
export default { validateRequest };
