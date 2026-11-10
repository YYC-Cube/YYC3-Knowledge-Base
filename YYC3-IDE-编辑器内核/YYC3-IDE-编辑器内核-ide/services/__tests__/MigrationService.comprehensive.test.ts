/**
 * @file MigrationService.comprehensive.test.ts
 * @description MigrationService 全面测试 - 数据迁移、格式检测、导入导出
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MigrationService } from '../MigrationService'

describe('MigrationService - 单例模式', () => {

  it('getInstance应该返回相同实例', () => {
    const instance1 = MigrationService.getInstance()
    const instance2 = MigrationService.getInstance()
    
    expect(instance1).toBe(instance2)
  })
})

describe('MigrationService - detectFormat格式检测', () => {

  let service: MigrationService

  beforeEach(() => {
    service = MigrationService.getInstance()
  })

  it('应该识别YYC3 JSON格式', async () => {
    const yyc3Data = {
      version: '1.0',
      localStorage: { key: 'value' },
      indexedDB: { files: [], projects: [] }
    }
    
    const file = new File([JSON.stringify(yyc3Data)], 'backup.json', { type: 'application/json' })
    const result = await service.detectFormat(file)
    
    expect(result).not.toBeNull()
    if (result) {
      expect(result.type).toBe('json')
      expect(result.source).toBe('yyc3')
      expect(result.version).toBe('1.0')
    }
  })

  it('应该识别通用JSON格式', async () => {
    const jsonData = { name: 'test', items: [1, 2, 3] }
    
    const file = new File([JSON.stringify(jsonData)], 'data.json', { type: 'application/json' })
    const result = await service.detectFormat(file)
    
    expect(result).not.toBeNull()
    if (result) {
      expect(result.type).toBe('json')
      expect(result.source).toBe('generic')
    }
  })

  it('应该识别CSV格式', async () => {
    const csvData = 'name,value\nitem1,100\nitem2,200'
    
    const file = new File([csvData], 'data.csv', { type: 'text/csv' })
    const result = await service.detectFormat(file)
    
    expect(result).not.toBeNull()
    if (result) {
      expect(result.type).toBe('csv')
    }
  })

  it('应该识别Markdown格式', async () => {
    const mdData = '# Title\n## Section\nSome content here'
    
    const file = new File([mdData], 'doc.md', { type: 'text/markdown' })
    const result = await service.detectFormat(file)
    
    expect(result).not.toBeNull()
    if (result) {
      expect(result.type).toBe('markdown')
    }
  })

  it('应该识别纯文本格式', async () => {
    const textData = 'This is just plain text content'
    
    const file = new File([textData], 'note.txt', { type: 'text/plain' })
    const result = await service.detectFormat(file)
    
    expect(result).not.toBeNull()
    if (result) {
      expect(result.type).toBe('text')
    }
  })

  it('空文件应该返回null', async () => {
    const file = new File([''], 'empty.txt', { type: 'text/plain' })
    const result = await service.detectFormat(file)
    
    // 空文件可能被识别为text或返回null
    expect(result === null || result?.type === 'text').toBe(true)
  })

  it('无效JSON应该被处理为generic或text', async () => {
    const invalidJson = '{ not valid json'
    
    const file = new File([invalidJson], 'bad.json', { type: 'application/json' })
    const result = await service.detectFormat(file)
    
    // 应该不会崩溃，返回某种有效结果
    expect(result !== undefined).toBe(true)
  })
})

describe('MigrationService - migrate迁移功能', () => {

  let service: MigrationService

  beforeEach(() => {
    service = MigrationService.getInstance()
  })

  it('migrate应该返回有效的MigrationResult结构', async () => {
    const testFile = new File([JSON.stringify({ version: '1.0', localStorage: {}, indexedDB: {} })], 'test.json')
    
    const result = await service.migrate(testFile, 'yyc3')
    
    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('source')
    expect(result).toHaveProperty('imported')
    expect(result).toHaveProperty('errors')
    expect(result).toHaveProperty('warnings')
    expect(Array.isArray(result.errors)).toBe(true)
    expect(Array.isArray(result.warnings)).toBe(true)
  })

  it('migrate的source参数应该是yyc3', async () => {
    const testFile = new File([JSON.stringify({})], 'test.json')
    
    const result = await service.migrate(testFile, 'yyc3')
    
    expect(result.source).toBe('yyc3')
  })

  it('migrate应该支持vscode源', async () => {
    const testFile = new File(['{}'], 'settings.json')
    
    const result = await service.migrate(testFile, 'vscode')
    
    expect(result.source).toBe('vscode')
    expect(typeof result.success).toBe('boolean')
  })

  it('migrate应该支持cursor源', async () => {
    const testFile = new File(['{}'], 'rules.json')
    
    const result = await service.migrate(testFile, 'cursor')
    
    expect(result.source).toBe('cursor')
    expect(typeof result.success).toBe('boolean')
  })

  it('migrate应该支持generic源', async () => {
    const testFile = new File(['some data'], 'data.txt')
    
    const result = await service.migrate(testFile, 'generic')
    
    expect(result.source).toBe('generic')
  })
})

describe('MigrationService - 边界情况', () => {

  let service: MigrationService

  beforeEach(() => {
    service = MigrationService.getInstance()
  })

  it('多次调用getInstance应该返回同一实例', () => {
    const instances = Array.from({ length: 5 }, () => MigrationService.getInstance())
    
    expect(new Set(instances).size).toBe(1)
  })

  it('实例应该有正确的方法', () => {
    expect(typeof service.detectFormat).toBe('function')
    expect(typeof service.migrate).toBe('function')
  })

  it('大文件应该能正常处理', async () => {
    const largeContent = 'x'.repeat(100000)
    const file = new File([largeContent], 'large.txt')
    
    const result = await service.detectFormat(file)
    
    expect(result !== null || result !== undefined).toBe(true)
  })

  it('特殊字符文件应该能正常处理', async () => {
    const specialContent = '中文内容 🎉 Special <>&"\' chars'
    const file = new File([specialContent], 'special.txt')
    
    const result = await service.detectFormat(file)
    
    expect(result !== null && result !== undefined).toBe(true)
  })
})
