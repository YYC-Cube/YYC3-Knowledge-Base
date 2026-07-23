import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import { logger } from '../config/logger';
import { redis } from '../config/redis';
import { pool } from '../config/database';

/**
 * 指标服务 - 负责收集和暴露系统性能指标
 */
export class MetricsService {
  private registry: Registry;
  private httpRequestsTotal!: Counter<any>;
  private httpRequestDurationSeconds!: Histogram<any>;
  private databaseQueryDurationSeconds!: Histogram<any>;
  private activeUsers!: Gauge<any>;
  private activeTickets!: Gauge<any>;
  private cacheHitRate!: Gauge<any>;
  private databaseConnections!: Gauge<any>;
  private memoryUsage!: Gauge<any>;
  private uptime!: Gauge<any>;

  constructor() {
    this.registry = new Registry();
    this.initializeMetrics();
    this.startCollectingDefaultMetrics();
    logger.info('Metrics service initialized');
  }

  /**
   * 初始化所有指标
   */
  private initializeMetrics(): void {
    // HTTP请求计数
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // HTTP请求持续时间
    this.httpRequestDurationSeconds = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    // 数据库查询持续时间
    this.databaseQueryDurationSeconds = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['query_type', 'success'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    // 活跃用户数
    this.activeUsers = new Gauge({
      name: 'active_users',
      help: 'Number of active users',
      registers: [this.registry],
    });

    // 活跃工单数
    this.activeTickets = new Gauge({
      name: 'active_tickets',
      help: 'Number of active tickets',
      registers: [this.registry],
    });

    // 缓存命中率
    this.cacheHitRate = new Gauge({
      name: 'cache_hit_rate',
      help: 'Cache hit rate percentage',
      registers: [this.registry],
    });

    // 数据库连接数
    this.databaseConnections = new Gauge({
      name: 'database_connections',
      help: 'Number of active database connections',
      registers: [this.registry],
    });

    // 内存使用量
    this.memoryUsage = new Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      registers: [this.registry],
    });

    // 应用运行时间
    this.uptime = new Gauge({
      name: 'application_uptime_seconds',
      help: 'Application uptime in seconds',
      registers: [this.registry],
    });
  }

  /**
   * 开始收集默认指标
   */
  private startCollectingDefaultMetrics(): void {
    collectDefaultMetrics({ register: this.registry });
    
    // 定期更新自定义指标
    setInterval(() => {
      this.updateMemoryUsage();
      this.updateUptime();
      this.updateDatabaseConnections();
    }, 5000); // 每5秒更新一次
  }

  /**
   * 记录HTTP请求
   */
  public recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestsTotal.labels(method, route, statusCode.toString()).inc();
    this.httpRequestDurationSeconds.labels(method, route).observe(duration);
  }

  /**
   * 记录数据库查询
   */
  public recordDatabaseQuery(queryType: string, duration: number, success: boolean = true): void {
    this.databaseQueryDurationSeconds.labels(queryType, success.toString()).observe(duration);
  }

  /**
   * 更新活跃用户数
   */
  public async updateActiveUsers(count?: number): Promise<void> {
    if (count !== undefined) {
      this.activeUsers.set(count);
    } else {
      try {
        // 从数据库获取活跃用户数
        const result = await pool.query(
          `SELECT COUNT(DISTINCT user_id) as count 
           FROM user_activity_logs 
           WHERE created_at > NOW() - INTERVAL '15 minutes'`
        );
        this.activeUsers.set(result.rows[0]?.count || 0);
      } catch (error) {
        logger.error('Failed to update active users metric', { error });
      }
    }
  }

  /**
   * 更新活跃工单数
   */
  public async updateActiveTickets(count?: number): Promise<void> {
    if (count !== undefined) {
      this.activeTickets.set(count);
    } else {
      try {
        // 从数据库获取活跃工单数
        const result = await pool.query(
          `SELECT COUNT(*) as count 
           FROM tickets 
           WHERE status NOT IN ('closed', 'resolved')`
        );
        this.activeTickets.set(result.rows[0]?.count || 0);
      } catch (error) {
        logger.error('Failed to update active tickets metric', { error });
      }
    }
  }

  /**
   * 更新缓存命中率
   */
  public updateCacheHitRate(hitRate: number): void {
    this.cacheHitRate.set(hitRate);
  }

  /**
   * 更新数据库连接数
   */
  private async updateDatabaseConnections(): Promise<void> {
    try {
      // 获取当前数据库连接池状态
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT count(*) FROM pg_stat_activity WHERE state = $1', ['active']);
        this.databaseConnections.set(result.rows[0]?.count || 0);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Failed to update database connections metric', { error });
    }
  }

  /**
   * 更新内存使用量
   */
  private updateMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    this.memoryUsage.set(memUsage.rss); // 使用常驻集大小
  }

  /**
   * 更新应用运行时间
   */
  private updateUptime(): void {
    this.uptime.set(process.uptime());
  }

  /**
   * 获取所有指标数据
   */
  public async getMetrics(): Promise<string> {
    // 确保在获取指标前更新动态指标
    try {
      await Promise.all([
        this.updateActiveUsers(),
        this.updateActiveTickets(),
      ]);
    } catch (error) {
      logger.error('Failed to update metrics before collection', { error });
    }

    return this.registry.metrics();
  }

  /**
   * 获取指标注册表
   */
  public getRegistry(): Registry {
    return this.registry;
  }
}

// 创建单例实例
export const metricsService = new MetricsService();