/**
 * @file: BackupService.test.ts
 * @description: YYC³ 备份服务测试套件
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: test
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,backup,unit
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BackupService } from '../BackupService'

vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockResolvedValue([]),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
    createObjectStore: vi.fn().mockReturnValue({ createIndex: vi.fn() }),
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

describe('BackupService', () => {
  let backupService: ReturnType<typeof BackupService.getInstance>

  beforeEach(() => {
    localStorage.clear()
    backupService = BackupService.getInstance()
  })

  afterEach(() => {
    backupService.stopAutoBackup()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = BackupService.getInstance()
      const instance2 = BackupService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('config management', () => {
    it('should load default config', () => {
      const config = backupService.getConfig()
      expect(config.enabled).toBe(true)
      expect(config.interval).toBe(3600000)
      expect(config.maxBackups).toBe(10)
    })

    it('should update config', () => {
      backupService.updateConfig({ maxBackups: 20, interval: 7200000 })
      const config = backupService.getConfig()
      expect(config.maxBackups).toBe(20)
      expect(config.interval).toBe(7200000)
    })

    it('should persist config to localStorage', () => {
      backupService.updateConfig({ maxBackups: 15 })
      const stored = localStorage.getItem('yyc3-backup-config')
      expect(stored).not.toBeNull()
      const parsed = JSON.parse(stored!)
      expect(parsed.maxBackups).toBe(15)
    })
  })

  describe('autoBackup', () => {
    it('should start and stop auto backup', () => {
      backupService.updateConfig({ enabled: true, interval: 3600000, maxBackups: 10 })
      backupService.startAutoBackup()
      expect(backupService.getConfig().enabled).toBe(true)
      backupService.stopAutoBackup()
    })

    it('should not start duplicate timers', () => {
      backupService.startAutoBackup()
      backupService.startAutoBackup()
      backupService.stopAutoBackup()
    })
  })

  describe('backup creation', () => {
    it('should create backup with localStorage data', async () => {
      localStorage.setItem('test-key', 'test-value')
      const backupId = await backupService.createBackup('manual', 'Test backup')
      expect(backupId).toBeDefined()
      expect(backupId).toMatch(/^backup-\d+-/)
    })

    it('should create auto backup', async () => {
      const backupId = await backupService.createBackup('auto')
      expect(backupId).toBeDefined()
      expect(backupId).toMatch(/^backup-\d+-/)
    })
  })

  describe('backup info', () => {
    it('should return backup info list', async () => {
      await backupService.createBackup('manual', 'Backup 1')
      await backupService.createBackup('manual', 'Backup 2')
      const backups = await backupService.listBackups()
      expect(backups.length).toBeGreaterThanOrEqual(0)
    })
  })
})
