import { redisPubSubService, RedisChannel, type PubSubMessage } from "./redis-pubsub.service"
// @ts-ignore - server.ts使用CommonJS导出
import { wsService } from '../server'
import { logger } from "../config/logger"
import { aiAnalysisTotal, aiAnalysisErrors, aiAnalysisLatency, aiTokensUsed } from "../config/metrics"
import type { NotificationPayload } from "../types/websocket"

export enum NotificationEvent {
  // AI 分析事件
  AI_ANALYSIS_STARTED = "ai:analysis:started",
  AI_ANALYSIS_COMPLETED = "ai:analysis:completed",
  AI_ANALYSIS_FAILED = "ai:analysis:failed",

  // 对账事件
  RECONCILIATION_STARTED = "reconciliation:started",
  RECONCILIATION_COMPLETED = "reconciliation:completed",
  RECONCILIATION_MATCHED = "reconciliation:matched",
  RECONCILIATION_UNMATCHED = "reconciliation:unmatched",

  // 工单事件
  TICKET_CREATED = "ticket:created",
  TICKET_UPDATED = "ticket:updated",
  TICKET_RESOLVED = "ticket:resolved",

  // 系统事件
  SYSTEM_ALERT = "system:alert",
  SYSTEM_WARNING = "system:warning",
}



class NotificationService {
  /**
   * 初始化通知服务
   */
  async initialize(): Promise<void> {
    try {
      // 订阅 AI 分析频道
      await redisPubSubService.subscribe(RedisChannel.AI_ANALYSIS)
      await redisPubSubService.subscribe(RedisChannel.RECONCILIATION)
      await redisPubSubService.subscribe(RedisChannel.NOTIFICATION)

      // 监听AI分析结果
      redisPubSubService.on(RedisChannel.AI_ANALYSIS, (message: PubSubMessage) => {
        this.handleAIAnalysisEvent(message)
      })

      // 监听对账事件
      redisPubSubService.on(RedisChannel.RECONCILIATION, (message: PubSubMessage) => {
        this.handleReconciliationEvent(message)
      })

      // 监听通用通知事件
      redisPubSubService.on(RedisChannel.NOTIFICATION, (message: PubSubMessage) => {
        this.handleNotificationEvent(message)
      })

      logger.info("[Notification Service] Initialized successfully")
    } catch (error) {
      logger.error("[Notification Service] Initialization failed", { error })
      throw error
    }
  }

  /**
   * 处理 AI 分析事件
   */
  private async handleAIAnalysisEvent(message: PubSubMessage): Promise<void> {
    try {
      const { event, data, userId } = message

      let notification: NotificationPayload

      switch (event) {
        case NotificationEvent.AI_ANALYSIS_STARTED:
          notification = {
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: "AI 分析已启动",
            message: `正在分析 ${data.recordCount} 条异常记录...`,
            type: "info",
            priority: "medium",
            data,
            userId,
            actionUrl: `/finance/reconciliation/${data.reconciliationId}`,
          }
          break

        case NotificationEvent.AI_ANALYSIS_COMPLETED:
          notification = {
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: "AI 分析完成",
            message: `成功分析 ${data.analysisCount} 条记录，发现 ${data.issueCount} 个问题`,
            type: "success",
            priority: "medium",
            data,
            userId,
            actionUrl: `/finance/reconciliation/${data.reconciliationId}`,
          }

          aiAnalysisTotal.inc()
          break

        case NotificationEvent.AI_ANALYSIS_FAILED:
          notification = {
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: "AI 分析失败",
            message: data.error || "分析过程中出现错误",
            type: "error",
            priority: "high",
            data,
            userId,
            actionUrl: `/finance/reconciliation/${data.reconciliationId}`,
          }

          aiAnalysisErrors.inc()
          break

        default:
          logger.warn(`[Notification Service] Unknown AI analysis event: ${event}`)
          return
      }

      // 发送通知
      await this.sendNotification(notification)
    } catch (error) {
      logger.error("[Notification Service] Failed to handle AI analysis event", { error })
    }
  }

  /**
   * 处理对账事件
   */
  private async handleReconciliationEvent(message: PubSubMessage): Promise<void> {
    try {
      const { event, data, userId } = message

      let notification: NotificationPayload

      switch (event) {
        case NotificationEvent.RECONCILIATION_STARTED:
          notification = {
            id: `recon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: "对账任务已启动",
            message: `开始处理 ${data.recordCount} 条记录`,
            type: "info",
            priority: "low",
            data,
            userId,
          }
          break

        case NotificationEvent.RECONCILIATION_COMPLETED:
          notification = {
            id: `recon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: "对账完成",
            message: `匹配 ${data.matchedCount} 条，未匹配 ${data.unmatchedCount} 条`,
            type: "success",
            priority: "medium",
            data,
            userId,
          }
          break

        case NotificationEvent.RECONCILIATION_UNMATCHED:
          notification = {
            id: `recon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: "发现未匹配记录",
            message: `有 ${data.unmatchedCount} 条记录需要人工处理`,
            type: "warning",
            priority: "high",
            data,
            userId,
          }
          break

        default:
          return
      }

      await this.sendNotification(notification)
    } catch (error) {
      logger.error("[Notification Service] Failed to handle reconciliation event", { error })
    }
  }

  /**
   * 处理通用通知事件
   */
  private async handleNotificationEvent(message: PubSubMessage): Promise<void> {
    try {
      const { data } = message
      await this.sendNotification(data as NotificationPayload)
    } catch (error) {
      logger.error("[Notification Service] Failed to handle notification event", { error })
    }
  }

  /**
   * 发送通知
   */
  private async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      if (payload.userId) {
        // 发送给特定用户
        wsService.sendNotificationToUser(payload.userId, payload)
      } else {
        // 广播给所有用户
        wsService.broadcastToRole("admin", {
          type: "notification",
          payload,
          timestamp: new Date().toISOString()
        })
        wsService.broadcastToRole("support", {
          type: "notification",
          payload,
          timestamp: new Date().toISOString()
        })
      }

      logger.info("[Notification Service] Notification sent", {
        title: payload.title,
        type: payload.type,
        userId: payload.userId,
      })
    } catch (error) {
      logger.error("[Notification Service] Failed to send notification", { error })
    }
  }

  /**
   * 发送自定义通知
   */
  async notify(payload: NotificationPayload): Promise<void> {
    await redisPubSubService.publish(RedisChannel.NOTIFICATION, {
      event: NotificationEvent.SYSTEM_ALERT,
      data: payload,
      userId: payload.userId,
    })
  }

  /**
   * 发送 AI 分析开始通知
   */
  async notifyAIAnalysisStarted(reconciliationId: string, recordCount: number, userId: string): Promise<void> {
    await redisPubSubService.publish(RedisChannel.AI_ANALYSIS, {
      event: NotificationEvent.AI_ANALYSIS_STARTED,
      data: { reconciliationId, recordCount },
      userId,
    })
  }

  /**
   * 发送 AI 分析完成通知
   */
  async notifyAIAnalysisCompleted(
    reconciliationId: string,
    analysisCount: number,
    issueCount: number,
    userId: string,
  ): Promise<void> {
    await redisPubSubService.publish(RedisChannel.AI_ANALYSIS, {
      event: NotificationEvent.AI_ANALYSIS_COMPLETED,
      data: { reconciliationId, analysisCount, issueCount },
      userId,
    })
  }

  /**
   * 发送 AI 分析失败通知
   */
  async notifyAIAnalysisFailed(reconciliationId: string, error: string, userId: string): Promise<void> {
    await redisPubSubService.publish(RedisChannel.AI_ANALYSIS, {
      event: NotificationEvent.AI_ANALYSIS_FAILED,
      data: { reconciliationId, error },
      userId,
    })
  }
}

export const notificationService = new NotificationService()
