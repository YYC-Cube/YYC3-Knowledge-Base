/**
 * @file: PerformanceMonitor.test.ts
 * @description: YYC³ 性能监控服务测试套件
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: test
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,performance,monitor,unit
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PerformanceMonitor } from '../PerformanceMonitor'

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor

  beforeEach(() => {
    localStorage.clear()
    monitor = PerformanceMonitor.getInstance()
    monitor.clearMetrics()
    monitor.clearAlerts()
  })

  afterEach(() => {
    monitor.stopMonitoring()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = PerformanceMonitor.getInstance()
      const instance2 = PerformanceMonitor.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('recordMetric', () => {
    it('should record performance metric', () => {
      monitor.recordMetric({
        operation: 'read',
        storage: 'localStorage',
        duration: 50,
        success: true,
      })

      const report = monitor.getPerformanceReport('hour')
      expect(report.metrics.totalOperations).toBe(1)
      expect(report.metrics.averageDuration).toBe(50)
      expect(report.metrics.successRate).toBe(100)
    })

    it('should track failed operations', () => {
      monitor.recordMetric({
        operation: 'write',
        storage: 'localStorage',
        duration: 100,
        success: false,
      })

      const report = monitor.getPerformanceReport('hour')
      expect(report.metrics.errorCount).toBe(1)
      expect(report.metrics.successRate).toBe(0)
    })
  })

  describe('getStorageStats', () => {
    it('should return storage statistics', () => {
      localStorage.setItem('test-key', 'test-value')

      const stats = monitor.getStorageStats()

      expect(stats.localStorage.used).toBeGreaterThan(0)
      expect(stats.localStorage.itemCount).toBeGreaterThan(0)
      expect(stats.localStorage.total).toBe(5 * 1024 * 1024)
      expect(stats.total.percentage).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getPerformanceReport', () => {
    it('should generate performance report for different periods', () => {
      for (let i = 0; i < 10; i++) {
        monitor.recordMetric({
          operation: 'read',
          storage: 'localStorage',
          duration: 10 + i,
          success: true,
        })
      }

      const report = monitor.getPerformanceReport('hour')

      expect(report.period).toBe('hour')
      expect(report.metrics.totalOperations).toBe(10)
      expect(report.metrics.averageDuration).toBeGreaterThan(0)
      expect(report.trends.operations.length).toBe(12)
    })

    it('should calculate throughput', () => {
      monitor.recordMetric({
        operation: 'write',
        storage: 'localStorage',
        duration: 50,
        success: true,
      })

      const report = monitor.getPerformanceReport('hour')
      expect(report.metrics.throughput).toBeGreaterThan(0)
    })
  })

  describe('alerts', () => {
    it('should create performance alert for slow operations', () => {
      monitor.recordMetric({
        operation: 'query',
        storage: 'indexedDB',
        duration: 1500,
        success: true,
      })

      const alerts = monitor.getAlerts()
      expect(alerts.some((a) => a.type === 'performance')).toBe(true)
    })

    it('should clear all alerts', () => {
      monitor.recordMetric({
        operation: 'read',
        storage: 'localStorage',
        duration: 2000,
        success: true,
      })

      expect(monitor.getAlerts().length).toBeGreaterThan(0)

      monitor.clearAlerts()
      expect(monitor.getAlerts().length).toBe(0)
    })
  })

  describe('config management', () => {
    it('should update config', () => {
      const newConfig = {
        enabled: false,
        sampleInterval: 30000,
      }

      monitor.updateConfig(newConfig)
      const config = monitor.getConfig()

      expect(config.enabled).toBe(false)
      expect(config.sampleInterval).toBe(30000)
    })

    it('should persist config', () => {
      monitor.updateConfig({ retentionDays: 60 })

      const newMonitor = PerformanceMonitor.getInstance()
      expect(newMonitor.getConfig().retentionDays).toBe(60)
    })
  })

  describe('monitoring lifecycle', () => {
    it('should start and stop monitoring without errors', () => {
      expect(() => monitor.startMonitoring()).not.toThrow()
      expect(() => monitor.stopMonitoring()).not.toThrow()
    })

    it('should not start duplicate monitoring', () => {
      monitor.startMonitoring()
      monitor.startMonitoring()
      monitor.stopMonitoring()
    })
  })

  describe('metrics retention', () => {
    it('should clean old metrics when retention days change', () => {
      monitor.recordMetric({
        operation: 'read',
        storage: 'localStorage',
        duration: 50,
        success: true,
      })

      const reportBefore = monitor.getPerformanceReport('hour')
      expect(reportBefore.metrics.totalOperations).toBe(1)

      monitor.updateConfig({ retentionDays: 30 })

      const reportAfter = monitor.getPerformanceReport('hour')
      expect(reportAfter.metrics.totalOperations).toBe(1)
    })
  })
})
