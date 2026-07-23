import { logger } from "../config/logger";
import EventEmitter from "events";
import { redis } from "../config/redis";
import Redis from 'ioredis';

// Redis频道枚举
export enum RedisChannel {
  AI_ANALYSIS = "ai:analysis",
  RECONCILIATION = "reconciliation",
  NOTIFICATION = "notification",
  WEBSOCKET_BROADCAST = "websocket:broadcast",
}

// 发布订阅消息接口
export interface PubSubMessage {
  event: string
  data: any
  timestamp: number
  userId?: string
}

// Redis发布订阅服务类
class RedisPubSubService extends EventEmitter {
  private subscriptions: Set<string> = new Set()
  private redisClient: any = redis
  private subscribers: Map<string, any> = new Map()

  constructor() {
    super()
    this.initialize()
  }


  // 初始化服务
  private initialize() {
    // 监听Redis连接状态
    this.redisClient.on('connect', () => {
      logger.info('Redis pubsub service initialized')
    })

    this.redisClient.on('error', (error: Error) => {
      logger.error('Redis pubsub service error', { error })
    })
  }

  // 发布消息到指定频道
  async publish(channel: RedisChannel | string, message: Omit<PubSubMessage, 'timestamp'>): Promise<boolean> {
    try {
      const messageToSend = {
        ...message,
        timestamp: Date.now()
      }
      
      await this.redisClient.publish(channel, JSON.stringify(messageToSend))
      logger.debug(`Published message to channel: ${channel}`, { event: message.event })
      return true
    } catch (error: any) {
      logger.error(`Failed to publish message to channel: ${channel}`, { error })
      return false
    }
  }

  // 订阅频道
  subscribe(channel: RedisChannel | string): void {
    try {
      if (this.subscriptions.has(channel)) {
        logger.warn(`Already subscribed to channel: ${channel}`)
        return
      }

      // 创建新的订阅客户端
      const subscriber = require('ioredis')({
        host: process.env.REDIS_HOST || "localhost",
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: Number(process.env.REDIS_DB) || 0,
        keyPrefix: process.env.REDIS_KEY_PREFIX || "yyc3:",
      })

      // 处理消息
      subscriber.on('message', (receivedChannel: string, message: string) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message)
            this.emit('message', channel, parsedMessage)
            logger.debug(`Received message from channel: ${channel}`, { event: parsedMessage.event })
          } catch (error) {
            logger.error(`Failed to parse message from channel: ${channel}`, { error })
          }
        }
      })

      // 处理错误
      subscriber.on('error', (error: Error) => {
        logger.error(`Subscriber error for channel: ${channel}`, { error })
      })

      // 开始订阅
      subscriber.subscribe(channel)
      this.subscriptions.add(channel)
      this.subscribers.set(channel, subscriber)
      logger.info(`Subscribed to channel: ${channel}`)
    } catch (error) {
      logger.error(`Failed to subscribe to channel: ${channel}`, { error })
    }
  }

  // 取消订阅频道
  unsubscribe(channel: RedisChannel | string): void {
    try {
      if (!this.subscriptions.has(channel)) {
        logger.warn(`Not subscribed to channel: ${channel}`)
        return
      }

      const subscriber = this.subscribers.get(channel)
      if (subscriber) {
        subscriber.unsubscribe(channel)
        subscriber.quit()
        this.subscribers.delete(channel)
      }

      this.subscriptions.delete(channel)
      logger.info(`Unsubscribed from channel: ${channel}`)
    } catch (error) {
      logger.error(`Failed to unsubscribe from channel: ${channel}`, { error })
    }
  }

  // 获取所有订阅的频道
  getSubscribedChannels(): string[] {
    return Array.from(this.subscriptions)
  }

  // 发布AI分析结果
  async publishAiAnalysis(result: any): Promise<boolean> {
    return this.publish(RedisChannel.AI_ANALYSIS, {
      event: 'ai_analysis_result',
      data: result
    })
  }

  // 发布对账结果
  async publishReconciliationResult(result: any): Promise<boolean> {
    return this.publish(RedisChannel.RECONCILIATION, {
      event: 'reconciliation_result',
      data: result
    })
  }

  // 发布通知
  async publishNotification(notification: any, userId?: string): Promise<boolean> {
    return this.publish(RedisChannel.NOTIFICATION, {
      event: 'notification',
      data: notification,
      userId
    })
  }

  // 发布WebSocket广播消息
  async publishWebSocketBroadcast(message: any, userId?: string): Promise<boolean> {
    return this.publish(RedisChannel.WEBSOCKET_BROADCAST, {
      event: 'websocket_broadcast',
      data: message,
      userId
    })
  }

  // 关闭所有订阅
  async close(): Promise<void> {
    try {
      for (const channel of this.subscriptions) {
        this.unsubscribe(channel)
      }
      
      this.subscriptions.clear()
      logger.info('Redis pubsub service closed')
    } catch (error) {
      logger.error('Failed to close Redis pubsub service', { error })
    }
  }

}

// 创建并导出单例实例
export const redisPubSubService = new RedisPubSubService()

export { RedisPubSubService }
