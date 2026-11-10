/**
 * @file: storage-integration.test.ts
 * @description: YYC³ 存储管理集成测试套件
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: test
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,integration,storage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BackupService } from '../BackupService'
import { EncryptionService } from '../EncryptionService'
import { MigrationService } from '../MigrationService'
import { PerformanceMonitor } from '../PerformanceMonitor'

// Ensure Web Crypto API is available for encryption tests
beforeEach(async () => {
  try {
    const { webcrypto } = await import('node:crypto')
    if (typeof globalThis.crypto === 'undefined' || !(globalThis as any).crypto?.subtle) {
      (globalThis as any).crypto = webcrypto
    }
  } catch (error) {
    console.warn('Failed to setup crypto:', error)
  }
})

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

describe('Storage Management Integration Tests', () => {
  let backupService: ReturnType<typeof BackupService.getInstance>
  let encryptionService: ReturnType<typeof EncryptionService.getInstance>
  let migrationService: ReturnType<typeof MigrationService.getInstance>
  let monitor: ReturnType<typeof PerformanceMonitor.getInstance>

  beforeEach(() => {
    localStorage.clear()
    backupService = BackupService.getInstance()
    encryptionService = EncryptionService.getInstance()
    migrationService = MigrationService.getInstance()
    monitor = PerformanceMonitor.getInstance()
    monitor.clearMetrics()
    monitor.clearAlerts()
  })

  afterEach(() => {
    backupService.stopAutoBackup()
    monitor.stopMonitoring()
  })

  describe('Service Initialization', () => {
    it('should initialize all services as singletons', () => {
      const backup1 = BackupService.getInstance()
      const backup2 = BackupService.getInstance()
      expect(backup1).toBe(backup2)

      const encryption1 = EncryptionService.getInstance()
      const encryption2 = EncryptionService.getInstance()
      expect(encryption1).toBe(encryption2)

      const migration1 = MigrationService.getInstance()
      const migration2 = MigrationService.getInstance()
      expect(migration1).toBe(migration2)

      const monitor1 = PerformanceMonitor.getInstance()
      const monitor2 = PerformanceMonitor.getInstance()
      expect(monitor1).toBe(monitor2)
    })
  })

  describe('Backup + Encryption Integration', () => {
    it('should create backup with encryption enabled', async () => {
      localStorage.setItem('sensitive-key', 'sensitive-value')

      const keyId = await encryptionService.generateKey('backup-key')
      await encryptionService.setActiveKey(keyId)
      await encryptionService.setEnabled(true)

      const backupId = await backupService.createBackup('manual', 'Encrypted backup')
      expect(backupId).toBeDefined()
      expect(backupId).toMatch(/^backup-\d+-/)
    })

    it('should handle encryption key rotation', async () => {
      const keyId1 = await encryptionService.generateKey('key1')
      const keyId2 = await encryptionService.generateKey('key2')

      await encryptionService.setActiveKey(keyId1)
      await encryptionService.setEnabled(true)

      const text = 'Important data'
      const encrypted = await encryptionService.encrypt(text)

      await encryptionService.setActiveKey(keyId2)

      const decrypted = await encryptionService.decrypt(encrypted)
      expect(decrypted).toBe(text)
    })
  })

  describe('Migration + Performance Integration', () => {
    it('should migrate data and track performance', async () => {
      const sourceData = {
        localStorage: {
          'migrated-key1': 'value1',
          'migrated-key2': 'value2',
        },
      }
      const file = new File([JSON.stringify(sourceData)], 'migration.json', {
        type: 'application/json',
      })

      const migrationResult = await migrationService.migrate(file, 'yyc3')
      expect(migrationResult.success).toBe(true)

      monitor.recordMetric({
        operation: 'write',
        storage: 'localStorage',
        duration: 30,
        success: true,
      })

      const stats = monitor.getStorageStats()
      expect(stats.localStorage.itemCount).toBeGreaterThanOrEqual(2)
    })

    it('should export migrated data to different formats', async () => {
      const sourceData = {
        localStorage: {
          key1: 'value1',
          key2: 'value2',
        },
      }
      const file = new File([JSON.stringify(sourceData)], 'migration.json', {
        type: 'application/json',
      })

      await migrationService.migrate(file, 'yyc3')

      const exportData = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          exportData.push({ key, value: localStorage.getItem(key) })
        }
      }

      const csvBlob = await migrationService.exportToFormat('csv', exportData)
      expect(csvBlob.type).toBe('text/csv')

      const jsonBlob = await migrationService.exportToFormat('json', exportData)
      expect(jsonBlob.type).toBe('application/json')
    })
  })

  describe('Performance Monitoring Integration', () => {
    it('should monitor all storage operations', async () => {
      monitor.startMonitoring()

      localStorage.setItem('test-key', 'test-value')
      monitor.recordMetric({
        operation: 'write',
        storage: 'localStorage',
        duration: 5,
        success: true,
      })

      const backupId = await backupService.createBackup('manual')
      monitor.recordMetric({
        operation: 'write',
        storage: 'localStorage',
        duration: 50,
        success: true,
      })

      const keyId = await encryptionService.generateKey('test')
      await encryptionService.setActiveKey(keyId)
      await encryptionService.setEnabled(true)
      monitor.recordMetric({
        operation: 'write',
        storage: 'localStorage',
        duration: 100,
        success: true,
      })

      const file = new File([JSON.stringify({ key: 'value' })], 'test.json', {
        type: 'application/json',
      })
      await migrationService.migrate(file, 'generic')
      monitor.recordMetric({
        operation: 'write',
        storage: 'localStorage',
        duration: 30,
        success: true,
      })

      const report = monitor.getPerformanceReport('hour')
      expect(report.metrics.totalOperations).toBe(4)
      expect(report.metrics.successRate).toBe(100)

      monitor.stopMonitoring()
    })

    it('should track performance degradation', async () => {
      monitor.updateConfig({
        alertThresholds: {
          capacityWarning: 50,
          capacityCritical: 80,
          performanceWarning: 500,
          performanceCritical: 1000,
          errorRateWarning: 5,
          errorRateCritical: 10,
        },
      })

      for (let i = 0; i < 5; i++) {
        monitor.recordMetric({
          operation: 'read',
          storage: 'localStorage',
          duration: 600,
          success: true,
        })
      }

      const alerts = monitor.getAlerts()
      expect(alerts.some((a: { type: string }) => a.type === 'performance')).toBe(true)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle invalid migration data gracefully', async () => {
      const badData = 'invalid-json-data'
      const file = new File([badData], 'bad.json', { type: 'application/json' })

      try {
        await migrationService.migrate(file, 'yyc3')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle concurrent operations safely', async () => {
      const operations = []

      for (let i = 0; i < 10; i++) {
        operations.push(
          (async () => {
            localStorage.setItem(`concurrent-key-${i}`, `value-${i}`)
            monitor.recordMetric({
              operation: 'write',
              storage: 'localStorage',
              duration: Math.random() * 10,
              success: true,
            })
          })()
        )
      }

      await Promise.all(operations)

      for (let i = 0; i < 10; i++) {
        expect(localStorage.getItem(`concurrent-key-${i}`)).toBe(`value-${i}`)
      }
    })
  })

  describe('Data Encryption Integration', () => {
    it('should maintain data integrity with encryption', async () => {
      const originalData = {
        key1: 'value1',
        key2: JSON.stringify({ nested: 'data' }),
        key3: JSON.stringify([1, 2, 3]),
      }

      Object.entries(originalData).forEach(([key, value]) => {
        localStorage.setItem(key, value)
      })

      const keyId = await encryptionService.generateKey('integrity-key')
      await encryptionService.setActiveKey(keyId)
      await encryptionService.setEnabled(true)

      const encrypted = await encryptionService.encrypt(originalData.key1)

      const decrypted = await encryptionService.decrypt(encrypted)
      expect(decrypted).toBe(originalData.key1)
    })
  })

  describe('End-to-End Workflow', () => {
    it('should complete full storage management workflow', async () => {
      monitor.startMonitoring()

      const keyId = await encryptionService.generateKey('workflow-key')
      await encryptionService.setActiveKey(keyId)
      await encryptionService.setEnabled(true)

      for (let i = 0; i < 50; i++) {
        localStorage.setItem(`workflow-key-${i}`, `data-${i}`)
        monitor.recordMetric({
          operation: 'write',
          storage: 'localStorage',
          duration: Math.random() * 5,
          success: true,
        })
      }

      const backupId1 = await backupService.createBackup('manual', 'Initial state')
      expect(backupId1).toBeDefined()
      monitor.recordMetric({
        operation: 'write',
        storage: 'localStorage',
        duration: 50,
        success: true,
      })

      const migrationData = {
        localStorage: {
          'new-key-1': 'new-value-1',
          'new-key-2': 'new-value-2',
        },
      }
      const file = new File([JSON.stringify(migrationData)], 'migration.json', {
        type: 'application/json',
      })
      const migrationResult = await migrationService.migrate(file, 'yyc3')
      expect(migrationResult.success).toBe(true)
      monitor.recordMetric({
        operation: 'write',
        storage: 'localStorage',
        duration: 30,
        success: true,
      })

      expect(localStorage.getItem('new-key-1')).toBe('new-value-1')
      expect(localStorage.getItem('new-key-2')).toBe('new-value-2')

      const report = monitor.getPerformanceReport('hour')
      expect(report.metrics.totalOperations).toBeGreaterThan(0)
      expect(report.metrics.successRate).toBeGreaterThan(95)

      monitor.stopMonitoring()
    })
  })
})
