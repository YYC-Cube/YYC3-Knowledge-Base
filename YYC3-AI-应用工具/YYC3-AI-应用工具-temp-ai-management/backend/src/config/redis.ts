import { logger } from './logger';
import Redis from 'ioredis';

// Redis 配置
type RedisConfigType = {
  host: string;
  port: number;
  password: string | undefined;
  db: number;
  keyPrefix: string;
  connectTimeout: number;
  retryStrategy: (times: number) => number;
  maxRetriesPerRequest: number;
  clusterMode: boolean;
};

const redisConfig: RedisConfigType = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB) || 0,
  keyPrefix: process.env.REDIS_KEY_PREFIX || "yyc3:",
  connectTimeout: 10000, // 10秒连接超时
  retryStrategy: (times: number): number => {
    // 指数退避策略
    const delay = Math.min(times * 1000, 15000); // 最大15秒
    return delay;
  },
  maxRetriesPerRequest: 3, // 每个请求最大重试次数
  clusterMode: process.env.REDIS_CLUSTER_MODE === 'true',
};

// Redis默认TTL配置 (秒)
const REDIS_TTL = Number(process.env.REDIS_TTL) || 3600;

// 创建Redis客户端实例
const redis = new Redis(redisConfig);

// Redis连接事件监听
redis.on("connect", () => {
  logger.info("Redis连接成功", {
    host: redisConfig.host,
    port: redisConfig.port,
    db: redisConfig.db,
  });
});

redis.on("error", (error: Error) => {
  logger.error("Redis连接错误", {
    error: error.message,
    host: redisConfig.host,
    port: redisConfig.port,
  });
});

redis.on("close", () => {
  logger.warn("Redis连接关闭");
});

// 定期记录Redis内存使用情况
setInterval(async () => {
  try {
    const info = await redis.info('memory');
    const memoryUsed = info.match(/used_memory_human:(\d+\.\d+ \w+)/)?.[1];
    const memoryPeak = info.match(/used_memory_peak_human:(\d+\.\d+ \w+)/)?.[1];
    
    if (memoryUsed && memoryPeak) {
      logger.debug("Redis内存使用情况", {
        used: memoryUsed,
        peak: memoryPeak
      });
    }
  } catch (error) {
    logger.error("获取Redis内存信息失败", { error });
  }
}, 60000); // 每分钟检查一次

// Redis健康检查
const checkRedisHealth = async (): Promise<boolean> => {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    logger.error("Redis健康检查失败", { error });
    return false;
  }
};

// 关闭Redis连接
const closeRedis = async (): Promise<void> => {
  try {
    await redis.quit();
    logger.info("Redis连接已关闭");
  } catch (error) {
    logger.error("关闭Redis连接失败", { error });
  }
};

// Redis发布消息
const publishToRedis = async (
  channel: string,
  message: string | object
): Promise<number> => {
  try {
    const messageString = typeof message === 'object' ? JSON.stringify(message) : message;
    const result = await redis.publish(channel, messageString);
    logger.debug("Redis消息发布成功", {
      channel,
      message: messageString.length > 100 ? `${messageString.substring(0, 100)}...` : messageString
    });
    return result;
  } catch (error) {
    logger.error("Redis消息发布失败", { channel, error });
    throw error;
  }
};

// Redis订阅消息
const subscribeToRedis = (
  channel: string,
  callback: (message: string, channel: string) => void
): void => {
  try {
    redis.subscribe(channel);
    
    // 监听订阅成功事件
    redis.on('subscribe', (subscribedChannel: string, count: number) => {
      if (subscribedChannel === channel) {
        logger.debug("Redis订阅成功", { channel, count });
      }
    });

    // 监听消息
    redis.on('message', (receivedChannel: string, message: string) => {
      if (receivedChannel === channel) {
        try {
          callback(message, receivedChannel);
        } catch (callbackError) {
          logger.error("Redis消息处理回调失败", { channel, callbackError });
        }
      }
    });
  } catch (error) {
    logger.error("Redis订阅处理失败", { channel, error });
  }
};

// 取消Redis订阅
const unsubscribeFromRedis = async (
  channel: string
): Promise<void> => {
  try {
    await redis.unsubscribe(channel);
    logger.debug("Redis取消订阅成功", { channel });
  } catch (error) {
    logger.error("Redis取消订阅失败", { channel, error });
  }
};

// 设置Redis键值对
const setRedisKey = async (
  key: string,
  value: string | number | object,
  ttl: number = REDIS_TTL
): Promise<boolean> => {
  try {
    const valueString = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    if (ttl > 0) {
      await redis.setex(key, ttl, valueString);
    } else {
      await redis.set(key, valueString);
    }
    
    logger.debug("Redis键值设置成功", { key });
    return true;
  } catch (error) {
    logger.error("Redis键值设置失败", { key, error });
    return false;
  }
};

// 获取Redis键值对
const getRedisKey = async (
  key: string
): Promise<string | null> => {
  try {
    const value = await redis.get(key);
    logger.debug("Redis键值获取成功", { key, hasValue: !!value });
    return value;
  } catch (error) {
    logger.error("Redis键值获取失败", { key, error });
    return null;
  }
};

// 删除Redis键
const deleteRedisKey = async (
  key: string
): Promise<number> => {
  try {
    const result = await redis.del(key);
    logger.debug("Redis键删除成功", { key, deletedCount: result });
    return result;
  } catch (error) {
    logger.error("Redis键删除失败", { key, error });
    return 0;
  }
};

// 检查Redis键是否存在
const existsRedisKey = async (
  key: string
): Promise<boolean> => {
  try {
    const result = await redis.exists(key);
    return result > 0;
  } catch (error) {
    logger.error("Redis键检查失败", { key, error });
    return false;
  }
};

// 设置哈希表字段
const hsetRedis = async (
  key: string,
  field: string,
  value: string | number | object
): Promise<number> => {
  try {
    const valueString = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const result = await redis.hset(key, field, valueString);
    logger.debug("Redis哈希表字段设置成功", { key, field });
    return result;
  } catch (error) {
    logger.error("Redis哈希表字段设置失败", { key, field, error });
    return 0;
  }
};

// 获取哈希表字段
const hgetRedis = async (
  key: string,
  field: string
): Promise<string | null> => {
  try {
    const value = await redis.hget(key, field);
    logger.debug("Redis哈希表字段获取成功", { key, field, hasValue: !!value });
    return value;
  } catch (error) {
    logger.error("Redis哈希表字段获取失败", { key, field, error });
    return null;
  }
};

// 删除哈希表字段
const hdelRedis = async (
  key: string,
  field: string
): Promise<number> => {
  try {
    const result = await redis.hdel(key, field);
    logger.debug("Redis哈希表字段删除成功", { key, field, deletedCount: result });
    return result;
  } catch (error) {
    logger.error("Redis哈希表字段删除失败", { key, field, error });
    return 0;
  }
};

// 检查哈希表字段是否存在
const hexistsRedis = async (
  key: string,
  field: string
): Promise<boolean> => {
  try {
    const result = await redis.hexists(key, field);
    return result === 1;
  } catch (error) {
    logger.error("Redis哈希表字段检查失败", { key, field, error });
    return false;
  }
};

// 获取哈希表所有字段和值
const hgetallRedis = async (
  key: string
): Promise<Record<string, string>> => {
  try {
    const result = await redis.hgetall(key);
    logger.debug("Redis哈希表获取成功", { key, fieldCount: Object.keys(result).length });
    return result;
  } catch (error) {
    logger.error("Redis哈希表获取失败", { key, error });
    return {};
  }
};

// 增加Redis计数器
const incrRedis = async (
  key: string,
  value: number = 1
): Promise<number> => {
  try {
    let result: number;
    if (value === 1) {
      result = await redis.incr(key);
    } else {
      result = await redis.incrby(key, value);
    }
    logger.debug("Redis计数器增加成功", { key, value, result });
    return result;
  } catch (error) {
    logger.error("Redis计数器增加失败", { key, value, error });
    return -1;
  }
};

// 减少Redis计数器
const decrRedis = async (
  key: string,
  value: number = 1
): Promise<number> => {
  try {
    let result: number;
    if (value === 1) {
      result = await redis.decr(key);
    } else {
      result = await redis.decrby(key, value);
    }
    logger.debug("Redis计数器减少成功", { key, value, result });
    return result;
  } catch (error) {
    logger.error("Redis计数器减少失败", { key, value, error });
    return -1;
  }
};

// 向列表左侧添加元素
const lpushRedis = async (
  key: string,
  ...values: (string | number | object)[]
): Promise<number> => {
  try {
    const stringValues = values.map(value => 
      typeof value === 'object' ? JSON.stringify(value) : String(value)
    );
    const result = await redis.lpush(key, ...stringValues);
    logger.debug("Redis列表左侧添加元素成功", { key, count: values.length });
    return result;
  } catch (error) {
    logger.error("Redis列表左侧添加元素失败", { key, count: values.length, error });
    return 0;
  }
};

// 向列表右侧添加元素
const rpushRedis = async (
  key: string,
  ...values: (string | number | object)[]
): Promise<number> => {
  try {
    const stringValues = values.map(value => 
      typeof value === 'object' ? JSON.stringify(value) : String(value)
    );
    const result = await redis.rpush(key, ...stringValues);
    logger.debug("Redis列表右侧添加元素成功", { key, count: values.length });
    return result;
  } catch (error) {
    logger.error("Redis列表右侧添加元素失败", { key, count: values.length, error });
    return 0;
  }
};

// 获取列表范围内的元素
const lrangeRedis = async (
  key: string,
  start: number,
  stop: number
): Promise<string[]> => {
  try {
    const result = await redis.lrange(key, start, stop);
    logger.debug("Redis列表范围元素获取成功", { key, start, stop, count: result.length });
    return result;
  } catch (error) {
    logger.error("Redis列表范围元素获取失败", { key, start, stop, error });
    return [];
  }
};

// 删除列表中的元素
const lremRedis = async (
  key: string,
  count: number,
  element: string | number | object
): Promise<number> => {
  try {
    const elementString = typeof element === 'object' ? JSON.stringify(element) : String(element);
    const result = await redis.lrem(key, count, elementString);
    logger.debug("Redis列表元素删除成功", { key, count, element: elementString.substring(0, 50) });
    return result;
  } catch (error) {
    logger.error("Redis列表元素删除失败", { key, count, error });
    return 0;
  }
};

// 设置Redis键的过期时间
const expireRedis = async (
  key: string,
  seconds: number
): Promise<boolean> => {
  try {
    const result = await redis.expire(key, seconds);
    logger.debug("Redis键过期时间设置成功", { key, seconds });
    return result === 1;
  } catch (error) {
    logger.error("Redis键过期时间设置失败", { key, seconds, error });
    return false;
  }
};

// 获取Redis键的剩余过期时间
const ttlRedis = async (
  key: string
): Promise<number> => {
  try {
    const result = await redis.ttl(key);
    logger.debug("Redis键剩余过期时间获取成功", { key, ttl: result });
    return result;
  } catch (error) {
    logger.error("Redis键剩余过期时间获取失败", { key, error });
    return -2; // -2表示键不存在
  }
};

// 刷新Redis数据库
const flushRedisDb = async (): Promise<void> => {
  try {
    await redis.flushdb();
    logger.warn("Redis数据库已清空");
  } catch (error) {
    logger.error("Redis数据库清空失败", { error });
  }
};

export {
  redis,
  checkRedisHealth,
  closeRedis,
  publishToRedis,
  subscribeToRedis,
  unsubscribeFromRedis,
  setRedisKey,
  getRedisKey,
  deleteRedisKey,
  existsRedisKey,
  hsetRedis,
  hgetRedis,
  hdelRedis,
  hexistsRedis,
  hgetallRedis,
  incrRedis,
  decrRedis,
  lpushRedis,
  rpushRedis,
  lrangeRedis,
  lremRedis,
  expireRedis,
  ttlRedis,
  flushRedisDb,
  redisConfig,
  REDIS_TTL
};
