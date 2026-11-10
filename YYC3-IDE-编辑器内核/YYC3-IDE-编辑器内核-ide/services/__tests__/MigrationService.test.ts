/**
 * @file: MigrationService.test.ts
 * @description: YYC³ 迁移服务测试套件
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: test
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,migration,unit
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MigrationService } from '../MigrationService'

vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockResolvedValue([]),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    objectStoreNames: {
      contains: vi.fn().mockReturnValue(true),
    },
    createObjectStore: vi.fn().mockReturnValue({
      createIndex: vi.fn(),
    }),
    transaction: vi.fn().mockReturnValue({
      objectStore: vi.fn().mockReturnValue({
        put: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue(undefined),
        getAll: vi.fn().mockResolvedValue([]),
      }),
    }),
  }),
}))

describe('MigrationService', () => {
  let migrationService: MigrationService

  beforeEach(() => {
    localStorage.clear()
    migrationService = MigrationService.getInstance()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = MigrationService.getInstance()
      const instance2 = MigrationService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('detectFormat', () => {
    it('should detect YYC3 backup format', async () => {
      const yyc3Data = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        localStorage: { key1: 'value1' },
        indexedDB: {},
      }
      const file = new File([JSON.stringify(yyc3Data)], 'backup.json', {
        type: 'application/json',
      })

      const format = await migrationService.detectFormat(file)
      expect(format).not.toBeNull()
      expect(format?.type).toBe('json')
      expect(format?.source).toBe('yyc3')
    })

    it('should detect generic JSON format', async () => {
      const genericData = { key1: 'value1', key2: 'value2' }
      const file = new File([JSON.stringify(genericData)], 'data.json', {
        type: 'application/json',
      })

      const format = await migrationService.detectFormat(file)
      expect(format).not.toBeNull()
      expect(format?.type).toBe('json')
      expect(format?.source).toBe('generic')
    })

    it('should detect CSV format', async () => {
      const csvData = 'key,value\nkey1,value1\nkey2,value2'
      const file = new File([csvData], 'data.csv', { type: 'text/csv' })

      const format = await migrationService.detectFormat(file)
      expect(format).not.toBeNull()
      expect(format?.type).toBe('csv')
    })

    it('should detect markdown format', async () => {
      const markdownData = '# Title\n\nSome content\n\n## Section'
      const file = new File([markdownData], 'doc.md', { type: 'text/markdown' })

      const format = await migrationService.detectFormat(file)
      expect(format).not.toBeNull()
      expect(format?.type).toBe('markdown')
    })
  })

  describe('migrate from YYC3', () => {
    it('should migrate YYC3 backup successfully', async () => {
      const yyc3Data = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        localStorage: {
          'test-key1': 'test-value1',
          'test-key2': 'test-value2',
        },
        indexedDB: {
          files: [],
          projects: [],
          snapshots: [],
        },
      }
      const file = new File([JSON.stringify(yyc3Data)], 'backup.json', {
        type: 'application/json',
      })

      const result = await migrationService.migrate(file, 'yyc3')

      expect(result.success).toBe(true)
      expect(result.imported.localStorage).toBe(2)
      expect(localStorage.getItem('test-key1')).toBe('test-value1')
      expect(localStorage.getItem('test-key2')).toBe('test-value2')
    })
  })

  describe('migrate from VSCode', () => {
    it('should migrate VSCode settings', async () => {
      const vscodeData = {
        settings: {
          'editor.fontSize': 14,
          'editor.tabSize': 2,
          'editor.theme': 'dark',
        },
        keybindings: [{ key: 'ctrl+s', command: 'save' }],
      }
      const file = new File([JSON.stringify(vscodeData)], 'settings.json', {
        type: 'application/json',
      })

      const result = await migrationService.migrate(file, 'vscode')

      expect(result.success).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some((w) => w.includes('VSCode'))).toBe(true)
    })
  })

  describe('migrate from generic', () => {
    it('should migrate generic JSON data', async () => {
      const genericData = {
        setting1: 'value1',
        setting2: { nested: 'value2' },
      }
      const file = new File([JSON.stringify(genericData)], 'data.json', {
        type: 'application/json',
      })

      const result = await migrationService.migrate(file, 'generic')

      expect(result.success).toBe(true)
      expect(result.imported.localStorage).toBe(2)
      expect(localStorage.getItem('yyc3-setting1')).toBe('value1')
    })
  })

  describe('exportToFormat', () => {
    it('should export to JSON format', async () => {
      const data = { key: 'value' }
      const blob = await migrationService.exportToFormat('json', data)

      expect(blob.type).toBe('application/json')
      const text = await blob.text()
      expect(JSON.parse(text)).toEqual(data)
    })

    it('should export to CSV format', async () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ]
      const blob = await migrationService.exportToFormat('csv', data)

      expect(blob.type).toBe('text/csv')
      const text = await blob.text()
      expect(text).toContain('name,age')
      expect(text).toContain('Alice,30')
    })
  })

  describe('getSupportedSources', () => {
    it('should return list of supported sources', () => {
      const sources = migrationService.getSupportedSources()

      expect(sources.length).toBe(4)
      expect(sources.map((s) => s.id)).toContain('yyc3')
      expect(sources.map((s) => s.id)).toContain('vscode')
      expect(sources.map((s) => s.id)).toContain('cursor')
      expect(sources.map((s) => s.id)).toContain('generic')
    })
  })
})
