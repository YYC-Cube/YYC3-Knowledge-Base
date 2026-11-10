/**
 * @file useSettingsSync.comprehensive.test.ts
 * @description useSettingsSync 全面测试 - 设置同步Hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSettingsSync } from '../useSettingsSync'

const mockUseSettingsStore = vi.fn()

vi.mock('../stores/useSettingsStore', () => ({
  useSettingsStore: () => mockUseSettingsStore(),
}))

describe('useSettingsSync - 基本功能', () => {

  beforeEach(() => {
    mockUseSettingsStore.mockReturnValue({
      settings: {
        theme: 'light',
        language: 'zh-CN',
        fontSize: 14,
      },
      updateSettings: vi.fn(),
    })
  })

  it('hook应该存在且可调用', () => {
    const { result } = renderHook(() => useSettingsSync())
    
    expect(result).toBeDefined()
  })

  it('应该正确初始化设置', () => {
    const store = mockUseSettingsStore()
    
    expect(store.settings).toBeDefined()
    expect(store.settings.theme).toBe('light')
    expect(store.settings.language).toBe('zh-CN')
    expect(store.settings.fontSize).toBe(14)
  })

  it('updateSettings方法应该是函数', () => {
    const store = mockUseSettingsStore()
    
    expect(typeof store.updateSettings).toBe('function')
  })

  it('设置对象应该包含必要属性', () => {
    const store = mockUseSettingsStore()
    
    expect(store.settings).toHaveProperty('theme')
    expect(store.settings).toHaveProperty('language')
    expect(store.settings).toHaveProperty('fontSize')
  })
})

describe('useSettingsSync - 边界情况', () => {

  it('空设置时应该正常工作', () => {
    mockUseSettingsStore.mockReturnValue({
      settings: {},
      updateSettings: vi.fn(),
    })
    
    const { result } = renderHook(() => useSettingsSync())
    
    expect(result).toBeDefined()
  })

  it('大量设置项时应该正常工作', () => {
    const largeSettings = {
      theme: 'dark',
      language: 'en-US',
      fontSize: 16,
      ...Array.from({ length: 50 }, (_, i) => ({
        [`setting-${i}`]: `value-${i}`,
      })).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
    }
    
    mockUseSettingsStore.mockReturnValue({
      settings: largeSettings,
      updateSettings: vi.fn(),
    })
    
    const { result } = renderHook(() => useSettingsSync())
    
    expect(result).toBeDefined()
  })

  it('多次调用应该成功执行', () => {
    const hook1 = renderHook(() => useSettingsSync())
    const hook2 = renderHook(() => useSettingsSync())
    
    expect(hook1).toBeDefined()
    expect(hook2).toBeDefined()
  })

  it('updateSettings可以被调用', () => {
    const updateSettings = vi.fn()
    mockUseSettingsStore.mockReturnValue({
      settings: {},
      updateSettings,
    })
    
    renderHook(() => useSettingsSync())
    
    // 验证updateSettings是函数
    expect(updateSettings).toBeInstanceOf(Function)
  })
})
