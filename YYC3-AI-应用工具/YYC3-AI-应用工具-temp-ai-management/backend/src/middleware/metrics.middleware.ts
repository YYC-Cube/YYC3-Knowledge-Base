import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../services/metrics.service';

/**
 * 指标收集中间件 - 自动收集HTTP请求指标
 */
export const metricsCollector = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // 替换res.send方法，以便在响应完成后记录指标
  (res.send as any) = function(this: Response, ...args: [body?: any]) {
    const duration = (Date.now() - startTime) / 1000; // 转换为秒
    const route = getRouteFromRequest(req);
    
    // 记录HTTP请求指标
    metricsService.recordHttpRequest(
      req.method,
      route,
      res.statusCode,
      duration
    );
    
    // 调用原始的send方法
    return originalSend.apply(this, args);
  };
  
  next();
};

/**
 * 从请求中获取标准化的路由路径
 * 避免为每个不同的ID创建单独的指标
 */
function getRouteFromRequest(req: Request): string {
  // 如果Express有路由信息，使用它
  if (req.route && req.route.path) {
    return req.route.path.toString();
  }
  
  // 否则，尝试标准化路径（替换ID等变量部分）
  const path = req.path;
  
  // 替换常见的ID模式，如 /users/123 -> /users/:id
  const normalizedPath = path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '/:uuid')
    .replace(/\/\w+@\w+\.\w+/g, '/:email');
  
  return normalizedPath;
}

/**
 * 数据库查询指标收集器 - 包装数据库查询以收集性能指标
 */
export const withDatabaseMetrics = async <T>(
  queryType: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  let success = true;
  
  try {
    const result = await queryFn();
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const duration = (Date.now() - startTime) / 1000; // 转换为秒
    metricsService.recordDatabaseQuery(queryType, duration, success);
  }
};

/**
 * 缓存指标收集器 - 用于跟踪缓存命中率
 */
interface CacheOperationResult {
  hit: boolean;
  [key: string]: any;
}

export const withCacheMetrics = async <T extends CacheOperationResult>(
  cacheFn: () => Promise<T>
): Promise<T> => {
  try {
    const result = await cacheFn();
    
    // 这里简化处理，实际项目中应该维护全局的命中和未命中计数
    // 然后根据这些计数计算命中率
    if (result.hit) {
      // 记录缓存命中
      console.log('Cache hit');
    } else {
      // 记录缓存未命中
      console.log('Cache miss');
    }
    
    return result;
  } catch (error) {
    throw error;
  }
};