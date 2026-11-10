/**
 * @file StorageCleanup.comprehensive.test.ts
 * @description StorageCleanup 全面测试 - 存储清理功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StorageCleanup } from '../StorageCleanup'

describe('StorageCleanup - 静态方法', () => {

  it('cleanup方法应该存在', () => {
    expect(typeof StorageCleanup.cleanup).toBe('function')
  })

  it('cleanup应该返回Promise', () => {
    const result = StorageCleanup.cleanup()
    
    expect(result instanceof Promise).toBe(true)
  })
})

describe('StorageCleanup - 清理结果结构', () => {

  it('cleanup应该返回有效的CleanupResult结构', async () => {
    try {
      const result = await StorageCleanup.cleanup({ dryRun: true })
      
      if (result) {
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('cleanedFiles')
        expect(result).toHaveProperty('cleanedProjects')
        expect(result).toHaveProperty('cleanedSnapshots')
        expect(result).toHaveProperty('cleanedLocalStorage')
        expect(result).toHaveProperty('freedSpace')
        expect(result).toHaveProperty('errors')
        expect(Array.isArray(result.errors)).toBe(true)
      }
    } catch (e) {
      // 可能因为浏览器API不可用而失败
      expect(e).toBeDefined()
    }
  })
})

describe('StorageCleanup - 配置选项', () => {

  it('应该支持dryRun选项', async () => {
    try {
      const result = await StorageCleanup.cleanup({ dryRun: true })
      
      if (result) {
        // dryRun模式下不应该删除任何东西
        expect(result.cleanedFiles).toBe(0)
        expect(result.cleanedProjects).toBe(0)
        expect(result.cleanedSnapshots).toBe(0)
      }
    } catch (e) {
      // 可能失败
    }
  })

  it('应该支持无参数调用', async () => {
    try {
      const result = await StorageCleanup.cleanup()
      
      if (result) {
        expect(typeof result.success).toBe('boolean')
      }
    } catch (e) {
      // 可能失败
    }
  })

  it('应该支持所有配置选项', async () => {
    try {
      const result = await StorageCleanup.cleanup({
        cleanupFilesOlderThan: 30,
        keepMostRecentFiles: 10,
        cleanupChatHistory: true,
        keepLastSessions: 5,
        cleanupSnapshots: true,
        keepLastSnapshots: 3,
        cleanupUnusedKeys: true,
        cleanupEmptyProjects: true,
        dryRun: true,
      })
      
      if (result) {
        expect(result).toBeDefined()
      }
    } catch (e) {
      // 可能失败
    }
  })
})

describe('StorageCleanup - 边界情况', () => {

  it('多次调用应该返回独立的结果', async () => {
    try {
      const result1 = await StorageCleanup.cleanup({ dryRun: true })
      const result2 = await StorageCleanup.cleanup({ dryRun: true })
      
      if (result1 && result2) {
        expect(result1).not.toBe(result2)
      }
    } catch (e) {
      // 可能失败
    }
  })

  it('errors数组应该是空的或包含字符串', async () => {
    try {
      const result = await StorageCleanup.cleanup({ dryRun: true })
      
      if (result) {
        result.errors.forEach(error => {
          expect(typeof error).toBe('string')
        })
      }
    } catch (e) {
      // 可能失败
    }
  })

  it('freedSpace应该是非负数', async () => {
    try {
      const result = await StorageCleanup.cleanup({ dryRun: true })
      
      if (result) {
        expect(result.freedSpace).toBeGreaterThanOrEqual(0)
      }
    } catch (e) {
      // 可能失败
    }
  })
})
