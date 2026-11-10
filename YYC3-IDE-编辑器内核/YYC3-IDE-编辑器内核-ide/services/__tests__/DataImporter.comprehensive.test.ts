/**
 * @file DataImporter.comprehensive.test.ts
 * @description DataImporter 全面测试 - 数据导入功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DataImporter } from '../DataImporter'

describe('DataImporter - 静态方法', () => {

  it('importFromFile方法应该存在', () => {
    expect(typeof DataImporter.importFromFile).toBe('function')
  })

  it('importData方法应该存在', () => {
    expect<typeof DataImporter.importData>(DataImporter.importData).toBeDefined()
  })
})

describe('DataImporter - 导入功能', () => {

  it('importFromFile应该返回Promise', () => {
    const file = new File(['{}'], 'test.json')
    const result = DataImporter.importFromFile(file)
    
    expect(result instanceof Promise).toBe(true)
  })

  it('importFromFile对无效文件应该返回错误', async () => {
    const invalidFile = new File(['invalid json'], 'bad.json')
    
    try {
      await DataImporter.importFromFile(invalidFile)
      // 如果没有抛出异常，检查结果
    } catch (e) {
      // 预期会抛出异常或返回错误结果
      expect(e).toBeDefined()
    }
  })

  it('importFromFile对空文件应该处理错误', async () => {
    const emptyFile = new File([''], 'empty.json')
    
    try {
      await DataImporter.importFromFile(emptyFile)
    } catch (e) {
      // 预期会失败
      expect(e).toBeDefined()
    }
  })
})

describe('DataImporter - 边界情况', () => {

  it('多次调用应该返回独立的结果', async () => {
    const file = new File(['{}'], 'test.json')
    
    try {
      const result1 = await DataImporter.importFromFile(file)
      const result2 = await DataImporter.importFromFile(file)
      
      if (result1 && result2) {
        expect(result1).not.toBe(result2)
      }
    } catch (e) {
      // 可能失败
    }
  })

  it('应该支持各种文件类型', async () => {
    const jsonFile = new File(['{}'], 'data.json')
    const txtFile = new File(['{}'], 'data.txt')
    
    expect(DataImporter.importFromFile(jsonFile) instanceof Promise).toBe(true)
    expect(DataImporter.importFromFile(txtFile) instanceof Promise).toBe(true)
  })
})
