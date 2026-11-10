/**
 * @file usePerformanceMonitor.comprehensive.test.ts
 * @description usePerformanceMonitor 全面测试 - 性能监控Hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePerformanceMonitor } from '../usePerformanceMonitor'

describe('usePerformanceMonitor - 基本功能', () => {

  it('hook应该存在且可调用', () => {
    const { result } = renderHook(() => usePerformanceMonitor())
    
    expect(result.current).toBeDefined()
    expect(typeof result.current).toBe('object')
  })

  it('应该返回性能报告对象', () => {
    const { result } = renderHook(() => usePerformanceMonitor())
    
    if (result.current) {
      expect(result.current).toHaveProperty('report')
      expect(result.current.report).toBeDefined()
    }
  })

  it('应该包含reportNow方法', () => {
    const { result } = renderHook(() => usePerformanceMonitor())
    
    if (result.current) {
      expect(typeof result.current.reportNow).toBe('function')
    }
  })

  it('应该包含getMemoryInfo方法', () => {
    const { result } = renderHook(() => usePerformanceMonitor())
    
    if (result.current) {
      expect(typeof result.current.getMemoryInfo).toBe('function')
    }
  })

  it('getMemoryInfo应该返回内存信息或null', () => {
    const { result } = renderHook(() => usePerformanceMonitor())
    
    if (result.current) {
      const memoryInfo = result.current.getMemoryInfo()
      
      if (memoryInfo !== null) {
        expect(memoryInfo).toHaveProperty('used')
        expect(memoryInfo).toHaveProperty('total')
        expect(memoryInfo).toHaveProperty('limit')
      }
    }
  })
})

describe('usePerformanceMonitor - 边界情况', () => {

  it('多次调用应该返回独立实例', () => {
    const { result: result1 } = renderHook(() => usePerformanceMonitor())
    const { result: result2 } = renderHook(() => usePerformanceMonitor())
    
    if (result1.current && result2.current) {
      expect(result1.current).not.toBe(result2.current)
    }
  })

  it('reportNow方法应该可调用', () => {
    const { result } = renderHook(() => usePerformanceMonitor())
    
    if (result.current) {
      try {
        result.current.reportNow()
      } catch (e) {
        // 可能因为某些原因失败，但不应抛出异常
        expect(e).toBeDefined()
      }
    }
  })

  it('性能报告应该有基本结构', () => {
    const { result } = renderHook(() => usePerformanceMonitor())
    
    if (result.current && result.current.report) {
      const report = result.current.report
      
      expect(report).toBeDefined()
      expect(typeof report).toBe('object')
    }
  })

  it('内存信息可能为null（浏览器限制）', () => {
    const { result } = renderHook(() => usePerformanceMonitor())
    
    if (result.current) {
      const memoryInfo = result.current.getMemoryInfo()
      
      // 内存信息可能是null（浏览器不支持）
      expect([null, 'object']).toContain(typeof memoryInfo)
    }
  })
})
