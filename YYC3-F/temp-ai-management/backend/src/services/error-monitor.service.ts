import { logger } from "../config/logger";

export class ErrorMonitorService {
  private static errorThresholds = {
    api5xx: {
      count: 10,
      timeWindow: 60 * 1000, // 1分钟
      cooldown: 5 * 60 * 1000, // 5分钟
    },
    api4xx: {
      count: 50,
      timeWindow: 5 * 60 * 1000, // 5分钟
      cooldown: 15 * 60 * 1000, // 15分钟
    },
    database: {
      count: 5,
      timeWindow: 5 * 60 * 1000, // 5分钟
      cooldown: 10 * 60 * 1000, // 10分钟
    },
  };

  private static errorCounts = {
    api5xx: [] as number[],
    api4xx: [] as number[],
    database: [] as number[],
  };

  private static alertSent = {
    api5xx: 0,
    api4xx: 0,
    database: 0,
  };

  // 记录API错误
  static recordApiError(statusCode: number): void {
    const now = Date.now();

    if (statusCode >= 500) {
      this.errorCounts.api5xx.push(now);
      this.checkThreshold("api5xx", now);
    } else if (statusCode >= 400) {
      this.errorCounts.api4xx.push(now);
      this.checkThreshold("api4xx", now);
    }

    // 清理过期错误记录
    this.cleanupErrorCounts();
  }

  // 记录数据库错误
  static recordDatabaseError(): void {
    const now = Date.now();
    this.errorCounts.database.push(now);
    this.checkThreshold("database", now);

    // 清理过期错误记录
    this.cleanupErrorCounts();
  }

  // 检查是否触发告警
  private static checkThreshold(
    type: keyof typeof ErrorMonitorService.errorThresholds,
    now: number
  ): void {
    const threshold = this.errorThresholds[type];
    const counts = this.errorCounts[type];

    // 过滤在时间窗口内的错误
    const recentErrors = counts.filter(
      (time) => now - time <= threshold.timeWindow
    );

    // 检查是否超过阈值且未处于冷却期
    if (
      recentErrors.length >= threshold.count &&
      now - this.alertSent[type] > threshold.cooldown
    ) {
      this.sendAlert(type, recentErrors.length);
      this.alertSent[type] = now;
    }
  }

  // 清理过期错误记录
  private static cleanupErrorCounts(): void {
    const now = Date.now();

    // 对每种类型的错误进行清理
    Object.keys(this.errorThresholds).forEach((key) => {
      const type = key as keyof typeof ErrorMonitorService.errorThresholds;
      const threshold = this.errorThresholds[type];

      // 只保留时间窗口内的错误
      this.errorCounts[type] = this.errorCounts[type].filter(
        (time) => now - time <= threshold.timeWindow
      );
    });
  }

  // 发送告警
  private static async sendAlert(type: string, count: number): Promise<void> {
    const alertMessage = `[警告] 检测到异常错误率：${type} 在过去时间窗口内出现了 ${count} 次错误`;

    logger.error(alertMessage, {
      type,
      count,
      timestamp: new Date().toISOString(),
    });

    // 这里可以实现发送告警的逻辑，例如：
    // - 发送邮件
    // - 发送短信
    // - 调用钉钉/企业微信机器人
    // - 记录到专门的告警系统

    try {
      // 示例：调用告警API
      if (process.env.ALERT_WEBHOOK_URL) {
        await fetch(process.env.ALERT_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: alertMessage,
            level: "error",
            source: "yanyu-cloud-api",
            type: type,
            count: count,
            timestamp: new Date().toISOString(),
          }),
        });
      }
    } catch (error) {
      logger.error("Failed to send alert", { error });
    }
  }

  // 获取错误统计
  static getErrorStats() {
    return {
      api5xx: this.errorCounts.api5xx.length,
      api4xx: this.errorCounts.api4xx.length,
      database: this.errorCounts.database.length,
      thresholds: this.errorThresholds,
      lastAlerts: this.alertSent,
    };
  }
}
