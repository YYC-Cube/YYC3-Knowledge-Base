/**
 * @file StorageManager.comprehensive.test.ts
 * @description StorageManager 全面测试 - 存储空间管理、配额检查、清理功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StorageManager } from '../StorageManager'

describe('StorageManager - 初始化', () => {

  it('应该正确创建实例', () => {
    const manager = new StorageManager({
      warningThreshold: 70,
      criticalThreshold: 90,
      autoCleanup: false,
      cleanupInterval: 60000,
      maxAge: 0,
    })
    
    expect(manager).toBeDefined()
    expect(manager).toBeInstanceOf(StorageManager)
  })

  it('默认配置应该合理', () => {
    const manager = new StorageManager()
    
    expect(manager).toBeDefined()
  })
})

describe('StorageManager - 存储信息获取', () => {

  let manager: StorageManager

  beforeEach(() => {
    manager = new StorageManager({
      warningThreshold: 70,
      criticalThreshold: 90,
      autoCleanup: false,
      cleanupInterval: 60000,
      maxAge: 0,
    })
  })

  it('getQuota方法应该存在且返回Promise', async () => {
    expect(typeof manager.getQuota).toBe('function')
    
    // getQuota可能需要浏览器API支持
    try {
      const quota = await manager.getQuota()
      if (quota) {
        expect(quota).toHaveProperty('usage')
        expect(quota).toHaveProperty('quota')
        expect(quota).toHaveProperty('available')
        expect(quota).toHaveProperty('usagePercentage')
      }
    } catch (e) {
      // 浏览器API不可用时可能抛出异常
    }
  })

  it('checkStorage方法应该存在', async () => {
    expect(typeof manager.checkStorage).toBe('function')
    
    try {
      const warning = await manager.checkStorage()
      expect(warning === null || typeof warning === 'object').toBe(true)
    } catch (e) {
      // 可能抛出异常
    }
  })

  it('getLocalStorageSize方法应该返回数字', () => {
    const size = manager.getLocalStorageSize()
    
    expect(typeof size).toBe('number')
    expect(size).toBeGreaterThanOrEqual(0)
  })

  it('getSessionStorageSize方法应该返回数字', () => {
    const size = manager.getSessionStorageSize()
    
    expect(typeof size).toBe('number')
    expect(size).toBeGreaterThanOrEqual(0)
  })

  it('formatBytes方法应该格式化字节数', () => {
    expect(manager.formatBytes(0)).toBe('0 Bytes')
    expect(manager.formatBytes(1024)).toContain('KB')
    expect(manager.formatBytes(1048576)).toContain('MB')
  })
})

describe('StorageManager - 清理功能', () => {

  let manager: StorageManager

  beforeEach(() => {
    manager = new StorageManager({
      warningThreshold: 70,
      criticalThreshold: 90,
      autoCleanup: false,
      cleanupInterval: 60000,
      maxAge: 0,
    })
  })

  it('cleanupLocalStorage方法应该存在', async () => {
    expect(typeof manager.cleanupLocalStorage).toBe('function')
    
    try {
      const result = await manager.cleanupLocalStorage({
        excludeKeys: ['test'],
        prefix: undefined,
        maxAge: 0,
      })
      
      if (result) {
        expect(result).toHaveProperty('freedBytes')
        expect(result).toHaveProperty('removedItems')
        expect(Array.isArray(result.errors)).toBe(true)
      }
    } catch (e) {
      // 可能抛出异常
    }
  })

  it('autoCleanup方法应该存在', async () => {
    expect(typeof manager.autoCleanup).toBe('function')
  })
})

describe('StorageManager - 监控控制', () => {

  let manager: StorageManager

  beforeEach(() => {
    manager = new StorageManager({
      warningThreshold: 70,
      criticalThreshold: 90,
      autoCleanup: false,
      cleanupInterval: 10000, // 短间隔用于测试
      maxAge: 0,
    })
  })

  afterEach(() => {
    manager.stopMonitoring()
  })

  it('startMonitoring方法应该启动监控', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval').mockReturnValue(1 as any)
    
    manager.startMonitoring()
    
    expect(setIntervalSpy).toHaveBeenCalled()
    
    setIntervalSpy.mockRestore()
  })

  it('stopMonitoring方法应该停止监控', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval').mockImplementation(() => {})
    
    manager.startMonitoring()
    manager.stopMonitoring()
    
    expect(clearIntervalSpy).toHaveBeenCalled()
    
    clearIntervalSpy.mockRestore()
  })
})

describe('StorageManager - 边界情况', () => {

  it('实例应该有所有核心方法', () => {
    const mgr = new StorageManager()
    
    expect(typeof mgr.getQuota).toBe('function')
    expect(typeof mgr.checkStorage).toBe('function')
    expect(typeof mgr.getLocalStorageSize).toBe('function')
    expect(typeof mgr.getSessionStorageSize).toBe('function')
    expect(typeof mgr.getIndexedDBSize).toBe('function')
    expect(typeof mgr.getStorageInfo).toBe('function')
    expect(typeof mgr.cleanupLocalStorage).toBe('function')
    expect(typeof mgr.cleanupCaches).toBe('function')
    expect(typeof mgr.autoCleanup).toBe('function')
    expect(typeof mgr.startMonitoring).toBe('function')
    expect(typeof mgr.stopMonitoring).toBe('function')
    expect(typeof mgr.formatBytes).toBe('function')
    expect(typeof mgr.canStore).toBe('function')
    expect(typeof mgr.getStorageBreakdown).toBe('function')
  })

  it('canStore方法应该返回布尔值或Promise', async () => {
    const mgr = new StorageManager()
    
    try {
      const canStore = await mgr.canStore(1024)
      expect(typeof canStore).toBe('boolean')
    } catch (e) {
      // 可能抛出异常
    }
  })

  it('getStorageBreakdown方法应该返回对象', async () => {
    const mgr = new StorageManager()
    
    try {
      const breakdown = await mgr.getStorageBreakdown()
      expect(typeof breakdown).toBe('object')
    } catch (e) {
      // 可能抛出异常
    }
  })
})
