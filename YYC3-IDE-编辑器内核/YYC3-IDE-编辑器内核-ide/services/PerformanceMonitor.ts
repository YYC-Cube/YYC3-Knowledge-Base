/**
 * @file: PerformanceMonitor.ts
 * @description: YYC³ 性能监控服务 - 存储指标、趋势分析、容量预警
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: performance,monitor,metrics,analytics
 */

import { logger } from "./Logger";
export interface PerformanceMetric {
  timestamp: number
  operation: 'read' | 'write' | 'delete' | 'query'
  storage: 'localStorage' | 'indexedDB'
  duration: number
  success: boolean
  dataSize?: number
}

export interface StorageStats {
  localStorage: {
    used: number
    total: number
    percentage: number
    itemCount: number
  }
  indexedDB: {
    used: number
    total: number
    percentage: number
    databaseCount: number
  }
  total: {
    used: number
    total: number
    percentage: number
  }
}

export interface PerformanceReport {
  period: 'hour' | 'day' | 'week' | 'month'
  metrics: {
    totalOperations: number
    averageDuration: number
    successRate: number
    errorCount: number
    throughput: number
  }
  trends: {
    duration: number[]
    operations: number[]
    errors: number[]
  }
  alerts: PerformanceAlert[]
}

export interface PerformanceAlert {
  id: string
  type: 'capacity' | 'performance' | 'error'
  severity: 'info' | 'warning' | 'critical'
  message: string
  timestamp: number
  details?: Record<string, unknown>
}

export interface MonitorConfig {
  enabled: boolean
  sampleInterval: number
  retentionDays: number
  alertThresholds: {
    capacityWarning: number
    capacityCritical: number
    performanceWarning: number
    performanceCritical: number
    errorRateWarning: number
    errorRateCritical: number
  }
}

const DEFAULT_CONFIG: MonitorConfig = {
  enabled: true,
  sampleInterval: 60000,
  retentionDays: 30,
  alertThresholds: {
    capacityWarning: 70,
    capacityCritical: 90,
    performanceWarning: 500,
    performanceCritical: 1000,
    errorRateWarning: 5,
    errorRateCritical: 10,
  },
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private config: MonitorConfig
  private metrics: PerformanceMetric[] = []
  private alerts: PerformanceAlert[] = []
  private sampleTimer: ReturnType<typeof setInterval> | null = null

  private constructor() {
    this.config = this.loadConfig()
    this.loadMetrics()
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  private loadConfig(): MonitorConfig {
    try {
      const saved = localStorage.getItem('yyc3-monitor-config')
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG
    } catch {
      return DEFAULT_CONFIG
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('yyc3-monitor-config', JSON.stringify(this.config))
    } catch (e) {
      logger.error('[PerformanceMonitor] Failed to save config:', e);
    }
  }

  private loadMetrics(): void {
    try {
      const saved = localStorage.getItem('yyc3-performance-metrics')
      if (saved) {
        this.metrics = JSON.parse(saved)
        this.cleanOldMetrics()
      }
    } catch (e) {
      logger.error('[PerformanceMonitor] Failed to load metrics:', e);
    }
  }

  private saveMetrics(): void {
    try {
      localStorage.setItem('yyc3-performance-metrics', JSON.stringify(this.metrics))
    } catch (e) {
      logger.error('[PerformanceMonitor] Failed to save metrics:', e);
    }
  }

  private cleanOldMetrics(): void {
    const cutoff = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000
    this.metrics = this.metrics.filter((m) => m.timestamp > cutoff)
  }

  startMonitoring(): void {
    if (this.sampleTimer) return

    this.sampleTimer = setInterval(() => {
      this.collectSample()
    }, this.config.sampleInterval)

    logger.info('Monitoring started');
  }

  stopMonitoring(): void {
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer)
      this.sampleTimer = null
      logger.info('Monitoring stopped');
    }
  }

  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
    }

    this.metrics.push(fullMetric)
    this.saveMetrics()

    if (!metric.success) {
      this.checkErrorRate()
    }

    if (metric.duration > this.config.alertThresholds.performanceWarning) {
      this.checkPerformance(fullMetric)
    }
  }

  private collectSample(): void {
    const stats = this.getStorageStats()

    if (stats.total.percentage >= this.config.alertThresholds.capacityCritical) {
      this.createAlert('capacity', 'critical', `存储容量严重不足: ${stats.total.percentage.toFixed(1)}%`, {
        used: stats.total.used,
        total: stats.total.total,
      })
    } else if (stats.total.percentage >= this.config.alertThresholds.capacityWarning) {
      this.createAlert('capacity', 'warning', `存储容量警告: ${stats.total.percentage.toFixed(1)}%`, {
        used: stats.total.used,
        total: stats.total.total,
      })
    }
  }

  private checkErrorRate(): void {
    const recentMetrics = this.metrics.filter(
      (m) => m.timestamp > Date.now() - 3600000,
    )

    if (recentMetrics.length < 10) return

    const errorCount = recentMetrics.filter((m) => !m.success).length
    const errorRate = (errorCount / recentMetrics.length) * 100

    if (errorRate >= this.config.alertThresholds.errorRateCritical) {
      this.createAlert('error', 'critical', `错误率过高: ${errorRate.toFixed(1)}%`, {
        errorCount,
        totalOperations: recentMetrics.length,
      })
    } else if (errorRate >= this.config.alertThresholds.errorRateWarning) {
      this.createAlert('error', 'warning', `错误率警告: ${errorRate.toFixed(1)}%`, {
        errorCount,
        totalOperations: recentMetrics.length,
      })
    }
  }

  private checkPerformance(metric: PerformanceMetric): void {
    if (metric.duration >= this.config.alertThresholds.performanceCritical) {
      this.createAlert('performance', 'critical', `操作耗时过长: ${metric.duration}ms`, {
        operation: metric.operation,
        storage: metric.storage,
        duration: metric.duration,
      })
    } else if (metric.duration >= this.config.alertThresholds.performanceWarning) {
      this.createAlert('performance', 'warning', `操作性能警告: ${metric.duration}ms`, {
        operation: metric.operation,
        storage: metric.storage,
        duration: metric.duration,
      })
    }
  }

  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    details?: Record<string, unknown>,
  ): void {
    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      timestamp: Date.now(),
      details,
    }

    this.alerts.unshift(alert)

    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100)
    }

    localStorage.setItem('yyc3-performance-alerts', JSON.stringify(this.alerts))

    logger.warn('Alert [${severity}]: ${message}');
  }

  getStorageStats(): StorageStats {
    let localStorageUsed = 0
    let localStorageItemCount = 0

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        if (value) {
          localStorageUsed += key.length + value.length
        }
        localStorageItemCount++
      }
    }

    localStorageUsed *= 2

    const localStorageTotal = 5 * 1024 * 1024

    const indexedDBUsed = 0
    const indexedDBTotal = 50 * 1024 * 1024

    const totalUsed = localStorageUsed + indexedDBUsed
    const totalTotal = localStorageTotal + indexedDBTotal

    return {
      localStorage: {
        used: localStorageUsed,
        total: localStorageTotal,
        percentage: (localStorageUsed / localStorageTotal) * 100,
        itemCount: localStorageItemCount,
      },
      indexedDB: {
        used: indexedDBUsed,
        total: indexedDBTotal,
        percentage: (indexedDBUsed / indexedDBTotal) * 100,
        databaseCount: 1,
      },
      total: {
        used: totalUsed,
        total: totalTotal,
        percentage: (totalUsed / totalTotal) * 100,
      },
    }
  }

  getPerformanceReport(period: 'hour' | 'day' | 'week' | 'month'): PerformanceReport {
    const periodMs = {
      hour: 3600000,
      day: 86400000,
      week: 604800000,
      month: 2592000000,
    }

    const cutoff = Date.now() - periodMs[period]
    const periodMetrics = this.metrics.filter((m) => m.timestamp > cutoff)

    const totalOperations = periodMetrics.length
    const successCount = periodMetrics.filter((m) => m.success).length
    const errorCount = totalOperations - successCount
    const averageDuration =
      totalOperations > 0
        ? periodMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations
        : 0
    const successRate = totalOperations > 0 ? (successCount / totalOperations) * 100 : 0
    const throughput = totalOperations / (periodMs[period] / 1000)

    const intervalCount = 12
    const intervalMs = periodMs[period] / intervalCount
    const trends = {
      duration: [] as number[],
      operations: [] as number[],
      errors: [] as number[],
    }

    for (let i = 0; i < intervalCount; i++) {
      const intervalStart = Date.now() - periodMs[period] + i * intervalMs
      const intervalEnd = intervalStart + intervalMs
      const intervalMetrics = periodMetrics.filter(
        (m) => m.timestamp >= intervalStart && m.timestamp < intervalEnd,
      )

      trends.operations.push(intervalMetrics.length)
      trends.errors.push(intervalMetrics.filter((m) => !m.success).length)
      trends.duration.push(
        intervalMetrics.length > 0
          ? intervalMetrics.reduce((sum, m) => sum + m.duration, 0) / intervalMetrics.length
          : 0,
      )
    }

    return {
      period,
      metrics: {
        totalOperations,
        averageDuration,
        successRate,
        errorCount,
        throughput,
      },
      trends,
      alerts: this.alerts.filter((a) => a.timestamp > cutoff),
    }
  }

  getAlerts(): PerformanceAlert[] {
    return this.alerts
  }

  clearAlerts(): void {
    this.alerts = []
    localStorage.removeItem('yyc3-performance-alerts')
  }

  updateConfig(newConfig: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.saveConfig()
  }

  getConfig(): MonitorConfig {
    return { ...this.config }
  }

  clearMetrics(): void {
    this.metrics = []
    this.saveMetrics()
  }
}

export default PerformanceMonitor
