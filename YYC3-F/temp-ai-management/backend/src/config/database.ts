import { logger } from './logger';
import { Pool } from 'pg';

// 定义连接池配置
type PoolConfigType = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  min: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
};

const poolConfig: PoolConfigType = {
  host: process.env.DB_HOST || "localhost",
  port: Number.parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "yanyu_reconciliation",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: Number.parseInt(process.env.DB_POOL_MAX || "20"),
  min: Number.parseInt(process.env.DB_POOL_MIN || "5"),
  idleTimeoutMillis: Number.parseInt(process.env.DB_IDLE_TIMEOUT || "30000"),
  connectionTimeoutMillis: Number.parseInt(
    process.env.DB_CONNECT_TIMEOUT || "10000"
  ),
};

const pool = new Pool(poolConfig);

pool.on("connect", () => {
  logger.info("New database connection established");
});

pool.on("error", (err: Error) => {
  logger.error("Unexpected database error", { error: err });
  process.exit(-1);
});

// 健康检查
const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch (error) {
    logger.error("Database health check failed", { error });
    return false;
  }
};

// 查询性能日志记录
/**
 * @param {string} text - SQL查询语句
 * @param {Array} params - 查询参数数组
 * @returns {Promise<Object>} 查询结果
 */
const queryWithMetrics = async (
  text: string,
  params: Array<any> = []
): Promise<any> => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // 记录慢查询
    if (duration > 1000) {
      logger.warn(`Slow query detected: ${duration}ms`, {
        text,
        params,
      });
    }

    // 更新查询计数指标
    return result;
  } catch (error) {
    logger.error("Database query error", {
      text,
      params,
      error,
    });
    throw error;
  }
};

// 事务处理函数
const withTransaction = async <T>(
  callback: (client: any) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error("Transaction failed and rolled back", { error });
    throw error;
  } finally {
    client.release();
  }
};

export {
  pool,
  checkDatabaseHealth,
  queryWithMetrics,
  withTransaction,
  poolConfig,
};
