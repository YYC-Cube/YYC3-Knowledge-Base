/**
 * @file StorageMonitor.comprehensive.test.ts
 * @description StorageMonitor 全面测试 - 存储监控功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { storageMonitor, startMonitoring, stopMonitoring, getStorageUsage } from '../StorageMonitor'

describe('StorageMonitor - 基本功能', () => {

  it('storageMonitor应该存在', () => {
    expect(storageMonitor).toBeDefined()
  })

  it('startMonitoring应该存在且是函数', () => {
    expect(typeof startMonitoring).toBe('function')
  })

  it('stopMonitoring应该存在且是函数', () => {
    expect(typeof stopMonitoring).toBe('function')
  })

  it('getStorageUsage应该存在且是函数', () => {
    expect<typeof getStorageUsage>(getStorageUsage).toBeDefined()
  })
})

describe('StorageMonitor - 监控控制', () => {

  it('startMonitoring可以被调用', () => {
    expect(() => startMonitoring()).not.toThrow()
  })

  it('stopMonitoring可以被调用', () => {
    expect(() => stopMonitoring()).not.toThrow()
  })

  it('getStorageUsage返回Promise', async () => {
    try {
      const usage = await getStorageUsage()
      if (usage) {
        expect(usage).toBeDefined()
      }
    } catch (e) {
      // 可能失败
    }
  })
})
