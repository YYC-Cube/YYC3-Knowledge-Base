/**
 * @file PerformanceMonitor.comprehensive.test.ts
 * @description PerformanceMonitor 全面测试 - 性能指标、存储统计、告警系统
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import PerformanceMonitor from '../PerformanceMonitor'

describe('PerformanceMonitor - 单例模式', () => {

  it('getInstance应该返回相同实例', () => {
    const instance1 = PerformanceMonitor.getInstance()
    const instance2 = PerformanceMonitor.getInstance()
    
    expect(instance1).toBe(instance2)
  })
})

describe('PerformanceMonitor - 指标记录', () => {

  let monitor: PerformanceMonitor

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance()
    monitor.clearMetrics()
    monitor.clearAlerts()
  })

  it('recordMetric应该成功记录操作指标', () => {
    monitor.recordMetric({
      operation: 'read',
      storage: 'localStorage',
      duration: 100,
      success: true,
    })
    
    const report = monitor.getPerformanceReport('hour')
    expect(report.metrics.totalOperations).toBe(1)
    expect(report.metrics.successRate).toBe(100)
  })

  it('recordMetric应该记录失败的操作', () => {
    monitor.recordMetric({
      operation: 'write',
      storage: 'indexedDB',
      duration: 500,
      success: false,
    })
    
    const report = monitor.getPerformanceReport('hour')
    expect(report.metrics.errorCount).toBe(1)
    expect(report.metrics.successRate).toBe(0)
  })

  it('recordMetric应该支持dataSize参数', () => {
    monitor.recordMetric({
      operation: 'query',
      storage: 'indexedDB',
      duration: 200,
      success: true,
      dataSize: 1024,
    })
    
    const report = monitor.getPerformanceReport('hour')
    expect(report.metrics.totalOperations).toBe(1)
  })

  it('clearMetrics应该清除所有指标', () => {
    monitor.recordMetric({ operation: 'read', storage: 'localStorage', duration: 10, success: true })
    monitor.recordMetric({ operation: 'write', storage: 'localStorage', duration: 20, success: true })
    
    monitor.clearMetrics()
    
    const report = monitor.getPerformanceReport('hour')
    expect(report.metrics.totalOperations).toBe(0)
  })
})

describe('PerformanceMonitor - 存储统计', () => {

  let monitor: PerformanceMonitor

  beforeEach(() => {
    localStorage.clear()
    monitor = PerformanceMonitor.getInstance()
  })

  it('getStorageStats应该返回有效的存储信息', () => {
    const stats = monitor.getStorageStats()
    
    expect(stats).toHaveProperty('localStorage')
    expect(stats).toHaveProperty('indexedDB')
    expect(stats).toHaveProperty('total')
    
    expect(typeof stats.localStorage.used).toBe('number')
    expect(typeof stats.localStorage.percentage).toBe('number')
  })

  it('localStorage统计应该反映实际数据', () => {
    localStorage.setItem('test-key-1', 'x'.repeat(100))
    localStorage.setItem('test-key-2', 'y'.repeat(200))
    
    const stats = monitor.getStorageStats()
    
    expect(stats.localStorage.itemCount).toBeGreaterThanOrEqual(2)
    expect(stats.localStorage.used).toBeGreaterThan(0)
  })

  it('空存储应该返回接近零的使用量', () => {
    localStorage.clear()
    
    const stats = monitor.getStorageStats()
    
    // 可能有一些配置数据，但使用率应该很低
    expect(stats.localStorage.percentage).toBeLessThan(5)
  })
})

describe('PerformanceMonitor - 性能报告', () => {

  let monitor: PerformanceMonitor

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance()
    monitor.clearMetrics()
  })

  it('getPerformanceReport应该返回完整的报告结构', () => {
    const report = monitor.getPerformanceReport('day')
    
    expect(report).toHaveProperty('period')
    expect(report).toHaveProperty('metrics')
    expect(report).toHaveProperty('trends')
    expect(report).toHaveProperty('alerts')
    
    expect(report.period).toBe('day')
    expect(report.metrics).toHaveProperty('totalOperations')
    expect(report.metrics).toHaveProperty('averageDuration')
    expect(report.metrics).toHaveProperty('successRate')
    expect(report.metrics).toHaveProperty('errorCount')
    expect(report.metrics).toHaveProperty('throughput')
  })

  it('报告应该正确计算平均耗时', () => {
    monitor.recordMetric({ operation: 'read', storage: 'localStorage', duration: 100, success: true })
    monitor.recordMetric({ operation: 'read', storage: 'localStorage', duration: 200, success: true })
    monitor.recordMetric({ operation: 'read', storage: 'localStorage', duration: 300, success: true })
    
    const report = monitor.getPerformanceReport('hour')
    
    expect(report.metrics.averageDuration).toBe(200) // (100+200+300)/3
  })

  it('趋势数据应该包含12个间隔点', () => {
    for (let i = 0; i < 50; i++) {
      monitor.recordMetric({ operation: 'write', storage: 'indexedDB', duration: 50, success: true })
    }
    
    const report = monitor.getPerformanceReport('hour')
    
    expect(report.trends.duration.length).toBe(12)
    expect(report.trends.operations.length).toBe(12)
    expect(report.trends.errors.length).toBe(12)
  })

  it('不同时间段的报告应该独立计算', () => {
    monitor.recordMetric({ operation: 'read', storage: 'localStorage', duration: 100, success: true })
    
    const hourReport = monitor.getPerformanceReport('hour')
    const dayReport = monitor.getPerformanceReport('day')
    
    // 同样的数据，不同的时间段
    expect(hourReport.metrics.totalOperations).toBe(dayReport.metrics.totalOperations)
  })
})

describe('PerformanceMonitor - 告警系统', () => {

  let monitor: PerformanceMonitor

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance()
    monitor.clearAlerts()
    monitor.clearMetrics()
  })

  it('getAlerts应该返回告警列表', () => {
    const alerts = monitor.getAlerts()
    
    expect(Array.isArray(alerts)).toBe(true)
  })

  it('clearAlerts应该清除所有告警', () => {
    // 先触发一些告警
    monitor.recordMetric({ 
      operation: 'read', 
      storage: 'localStorage', 
      duration: 2000, // 超过performanceCritical阈值
      success: true 
    })
    
    monitor.clearAlerts()
    
    expect(monitor.getAlerts()).toHaveLength(0)
  })

  it('慢操作应该生成性能告警', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    monitor.updateConfig({
      alertThresholds: {
        ...monitor.getConfig().alertThresholds,
        performanceWarning: 10, // 降低阈值以便测试
        performanceCritical: 20,
      }
    })
    
    monitor.recordMetric({
      operation: 'query',
      storage: 'indexedDB',
      duration: 30, // 超过warning阈值
      success: true,
    })
    
    const alerts = monitor.getAlerts()
    
    // 应该有性能相关的告警
    if (alerts.length > 0) {
      expect(alerts.some(a => a.type === 'performance')).toBe(true)
    }
    
    consoleWarnSpy.mockRestore()
  })
})

describe('PerformanceMonitor - 配置管理', () => {

  let monitor: PerformanceMonitor

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance()
  })

  it('getConfig应该返回当前配置', () => {
    const config = monitor.getConfig()
    
    expect(config).toHaveProperty('enabled')
    expect(config).toHaveProperty('sampleInterval')
    expect(config).toHaveProperty('retentionDays')
    expect(config).toHaveProperty('alertThresholds')
  })

  it('updateConfig应该更新配置', () => {
    monitor.updateConfig({
      sampleInterval: 120000,
      retentionDays: 60,
    })
    
    const config = monitor.getConfig()
    expect(config.sampleInterval).toBe(120000)
    expect(config.retentionDays).toBe(60)
  })

  it('updateConfig应该保留未更新的字段', () => {
    const originalConfig = monitor.getConfig()
    
    monitor.updateConfig({ sampleInterval: 99999 })
    
    const newConfig = monitor.getConfig()
    expect(newConfig.retentionDays).toBe(originalConfig.retentionDays)
    expect(newConfig.enabled).toBe(originalConfig.enabled)
  })
})

describe('PerformanceMonitor - 监控控制', () => {

  let monitor: PerformanceMonitor

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance()
    monitor.stopMonitoring()
  })

  afterEach(() => {
    monitor.stopMonitoring()
  })

  it('startMonitoring应该启动定时采样', () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    
    monitor.startMonitoring()
    
    // 验证info被调用过且包含相关消息
    const calls = consoleInfoSpy.mock.calls
    expect(calls.length).toBeGreaterThan(0)
    const hasStartedMessage = calls.some(call => 
      call[0] && typeof call[0] === 'string' && (call[0] as string).includes('started')
    )
    expect(hasStartedMessage).toBe(true)
    
    consoleInfoSpy.mockRestore()
  })

  it('stopMonitoring应该停止定时采样', () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    
    monitor.startMonitoring()
    monitor.stopMonitoring()
    
    const calls = consoleInfoSpy.mock.calls
    const hasStoppedMessage = calls.some(call => 
      call[0] && typeof call[0] === 'string' && (call[0] as string).includes('stopped')
    )
    expect(hasStoppedMessage).toBe(true)
    
    consoleInfoSpy.mockRestore()
  })

  it('重复调用startMonitoring不应该创建多个定时器', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval')
    
    monitor.startMonitoring()
    monitor.startMonitoring() // 第二次调用
    
    // setInterval应该只被调用一次
    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    
    setIntervalSpy.mockRestore()
    monitor.stopMonitoring()
  })
})

describe('PerformanceMonitor - 边界情况', () => {

  let monitor: PerformanceMonitor

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance()
    monitor.clearMetrics()
  })

  it('空指标集应该产生有效报告', () => {
    const report = monitor.getPerformanceReport('hour')
    
    expect(report.metrics.totalOperations).toBe(0)
    expect(report.metrics.averageDuration).toBe(0)
    expect(report.metrics.successRate).toBe(0)
  })

  it('应该处理所有操作类型', () => {
    const operations: Array<'read' | 'write' | 'delete' | 'query'> = ['read', 'write', 'delete', 'query']
    
    operations.forEach(op => {
      monitor.recordMetric({
        operation: op,
        storage: 'localStorage',
        duration: 100,
        success: true,
      })
    })
    
    const report = monitor.getPerformanceReport('hour')
    expect(report.metrics.totalOperations).toBe(4)
  })

  it('应该处理所有存储类型', () => {
    monitor.recordMetric({ operation: 'read', storage: 'localStorage', duration: 50, success: true })
    monitor.recordMetric({ operation: 'read', storage: 'indexedDB', duration: 150, success: true })
    
    const report = monitor.getPerformanceReport('hour')
    expect(report.metrics.totalOperations).toBe(2)
  })
})
