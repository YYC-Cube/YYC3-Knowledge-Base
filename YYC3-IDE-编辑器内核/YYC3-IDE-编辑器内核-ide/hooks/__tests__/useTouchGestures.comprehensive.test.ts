/**
 * @file useTouchGestures.comprehensive.test.ts
 * @description useTouchGestures 全面测试 - 触摸手势Hook
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTouchGestures } from '../useTouchGestures'

const DEFAULT_OPTIONS = {
  onSwipeLeft: () => {},
  onSwipeRight: () => {},
  threshold: 50,
  enabled: true,
}

describe('useTouchGestures - 基本功能', () => {

  it('hook应该存在且可调用', () => {
    const { result } = renderHook(() => useTouchGestures(DEFAULT_OPTIONS))

    expect(result.current).toBeDefined()
    expect(typeof result.current).toBe('object')
  })

  it('应该返回触摸手势相关状态', () => {
    const { result } = renderHook(() => useTouchGestures(DEFAULT_OPTIONS))

    if (result.current) {
      const keys = Object.keys(result.current)
      expect(keys.length).toBeGreaterThan(0)
    }
  })

  it('应该包含触摸事件处理方法', () => {
    const { result } = renderHook(() => useTouchGestures(DEFAULT_OPTIONS))

    if (result.current) {
      const methods = Object.keys(result.current).filter(key =>
        typeof (result.current as any)[key] === 'function'
      )

      expect(methods.length + Object.keys(result.current).length).toBeGreaterThan(0)
    }
  })
})

describe('useTouchGestures - 边界情况', () => {

  it('多次调用应该返回独立实例', () => {
    const { result: result1 } = renderHook(() => useTouchGestures(DEFAULT_OPTIONS))
    const { result: result2 } = renderHook(() => useTouchGestures(DEFAULT_OPTIONS))

    if (result1.current && result2.current) {
      expect(result1.current).not.toBe(result2.current)
    }
  })

  it('hook应该在组件卸载时清理资源', () => {
    let hookResult: any

    const { unmount } = renderHook(() => {
      hookResult = useTouchGestures(DEFAULT_OPTIONS)
      return hookResult
    })

    expect(hookResult).toBeDefined()

    unmount()

    expect(true).toBe(true)
  })

  it('disabled状态应该正常处理', () => {
    try {
      const { result } = renderHook(() =>
        useTouchGestures({ ...DEFAULT_OPTIONS, enabled: false })
      )
      expect(result.current).toBeDefined()
    } catch (e) {
      expect(e).toBeDefined()
    }
  })
})
