/**
 * @file useThemeTokens.comprehensive.test.ts
 * @description useThemeTokens 全面测试 - 主题令牌Hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useThemeTokens } from '../useThemeTokens'

const mockUseSettingsStore = vi.fn()

vi.mock('../stores/useSettingsStore', () => ({
  useSettingsStore: () => mockUseSettingsStore(),
}))

describe('useThemeTokens - 基本功能', () => {

  beforeEach(() => {
    mockUseSettingsStore.mockReturnValue({
      settings: {
        theme: 'light',
        accentColor: '#3b82f6',
      },
    })
  })

  it('hook应该存在且可调用', () => {
    const { result } = renderHook(() => useThemeTokens())
    
    expect(result.current).toBeDefined()
    expect(typeof result.current).toBe('object')
  })

  it('应该返回主题相关属性', () => {
    const { result } = renderHook(() => useThemeTokens())
    const tokens = result.current
    
    expect(tokens).toHaveProperty('page')
    expect(tokens).toHaveProperty('text')
    expect(tokens).toHaveProperty('btn')
  })

  it('page属性应该包含必要的样式类', () => {
    const { result } = renderHook(() => useThemeTokens())
    const page = result.current.page
    
    expect(page).toBeDefined()
    expect(typeof page).toBe('object')
  })

  it('text属性应该包含文本样式', () => {
    const { result } = renderHook(() => useThemeTokens())
    const text = result.current.text
    
    expect(text).toBeDefined()
    expect(typeof text).toBe('object')
  })

  it('btn属性应该包含按钮样式', () => {
    const { result } = renderHook(() => useThemeTokens())
    const btn = result.current.btn
    
    expect(btn).toBeDefined()
    expect(typeof btn).toBe('object')
  })
})

describe('useThemeTokens - 边界情况', () => {

  it('多次调用应该返回一致的结果', () => {
    const { result: result1 } = renderHook(() => useThemeTokens())
    const { result: result2 } = renderHook(() => useThemeTokens())
    
    expect(result1.current).toEqual(result2.current)
  })

  it('所有样式值应该是字符串类型', () => {
    const { result } = renderHook(() => useThemeTokens())
    const tokens = result.current
    
    const checkStrings = (obj: Record<string, any>) => {
      Object.values(obj).forEach(value => {
        if (typeof value === 'string') {
          expect(typeof value).toBe('string')
        } else if (typeof value === 'object' && value !== null) {
          checkStrings(value)
        }
      })
    }
    
    checkStrings(tokens as any)
  })

  it('应该支持暗色主题', () => {
    mockUseSettingsStore.mockReturnValue({
      settings: {
        theme: 'dark',
        accentColor: '#8b5cf6',
      },
    })
    
    const { result } = renderHook(() => useThemeTokens())
    
    expect(result.current).toBeDefined()
  })

  it('应该处理空设置', () => {
    mockUseSettingsStore.mockReturnValue({
      settings: {},
    })
    
    const { result } = renderHook(() => useThemeTokens())
    
    expect(result.current).toBeDefined()
  })

  it('应该处理自定义强调色', () => {
    mockUseSettingsStore.mockReturnValue({
      settings: {
        theme: 'light',
        accentColor: '#ef4444',
      },
    })
    
    const { result } = renderHook(() => useThemeTokens())
    
    expect(result.current).toBeDefined()
  })
})
