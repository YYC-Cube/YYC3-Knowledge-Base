/**
 * @file: storage-performance.bench.ts
 * @description: YYC³ 存储性能基准测试
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: test
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,performance,benchmark
 */

import { describe, bench, beforeAll, afterAll } from 'vitest'
import { BackupService } from '../BackupService'
import { EncryptionService } from '../EncryptionService'
import { MigrationService } from '../MigrationService'
import { PerformanceMonitor } from '../PerformanceMonitor'

describe('Storage Performance Benchmarks', () => {
  let backupService: ReturnType<typeof BackupService.getInstance>
  let encryptionService: ReturnType<typeof EncryptionService.getInstance>
  let migrationService: ReturnType<typeof MigrationService.getInstance>
  let monitor: ReturnType<typeof PerformanceMonitor.getInstance>

  beforeAll(() => {
    localStorage.clear()
    backupService = BackupService.getInstance()
    encryptionService = EncryptionService.getInstance()
    migrationService = MigrationService.getInstance()
    monitor = PerformanceMonitor.getInstance()
  })

  afterAll(() => {
    localStorage.clear()
  })

  describe('Backup Performance', () => {
    bench(
      'create small backup (10 items)',
      async () => {
        for (let i = 0; i < 10; i++) {
          localStorage.setItem(`bench-key-${i}`, `value-${i}`)
        }
        await backupService.createBackup('manual')
      },
      { time: 1000, iterations: 10 }
    )

    bench(
      'create medium backup (100 items)',
      async () => {
        for (let i = 0; i < 100; i++) {
          localStorage.setItem(`bench-key-${i}`, `value-${i}`)
        }
        await backupService.createBackup('manual')
      },
      { time: 1000, iterations: 10 }
    )

    bench(
      'create large backup (1000 items)',
      async () => {
        for (let i = 0; i < 1000; i++) {
          localStorage.setItem(`bench-key-${i}`, `value-${i}`)
        }
        await backupService.createBackup('manual')
      },
      { time: 1000, iterations: 5 }
    )

    bench(
      'restore backup (100 items)',
      async () => {
        for (let i = 0; i < 100; i++) {
          localStorage.setItem(`restore-key-${i}`, `value-${i}`)
        }
        const backupId = await backupService.createBackup('manual')
        localStorage.clear()
        await backupService.restoreBackup(backupId)
      },
      { time: 1000, iterations: 10 }
    )
  })

  describe('Encryption Performance', () => {
    bench(
      'encrypt small text (100 bytes)',
      async () => {
        const keyId = await encryptionService.generateKey('bench-key')
        await encryptionService.setActiveKey(keyId)
        await encryptionService.setEnabled(true)
        const text = 'a'.repeat(100)
        await encryptionService.encrypt(text)
      },
      { time: 1000, iterations: 50 }
    )

    bench(
      'encrypt medium text (1KB)',
      async () => {
        const keyId = await encryptionService.generateKey('bench-key')
        await encryptionService.setActiveKey(keyId)
        await encryptionService.setEnabled(true)
        const text = 'a'.repeat(1024)
        await encryptionService.encrypt(text)
      },
      { time: 1000, iterations: 30 }
    )

    bench(
      'encrypt large text (100KB)',
      async () => {
        const keyId = await encryptionService.generateKey('bench-key')
        await encryptionService.setActiveKey(keyId)
        await encryptionService.setEnabled(true)
        const text = 'a'.repeat(100 * 1024)
        await encryptionService.encrypt(text)
      },
      { time: 1000, iterations: 10 }
    )

    bench(
      'decrypt text (1KB)',
      async () => {
        const keyId = await encryptionService.generateKey('bench-key')
        await encryptionService.setActiveKey(keyId)
        await encryptionService.setEnabled(true)
        const text = 'a'.repeat(1024)
        const encrypted = await encryptionService.encrypt(text)
        await encryptionService.decrypt(encrypted)
      },
      { time: 1000, iterations: 30 }
    )

    bench(
      'generate key with standard strength',
      async () => {
        await encryptionService.setStrength('standard')
        await encryptionService.generateKey('temp-key')
      },
      { time: 1000, iterations: 10 }
    )

    bench(
      'generate key with maximum strength',
      async () => {
        await encryptionService.setStrength('maximum')
        await encryptionService.generateKey('temp-key')
      },
      { time: 5000, iterations: 5 }
    )
  })

  describe('Migration Performance', () => {
    bench(
      'detect format (JSON)',
      async () => {
        const data = { key: 'value' }
        const file = new File([JSON.stringify(data)], 'test.json', { type: 'application/json' })
        await migrationService.detectFormat(file)
      },
      { time: 1000, iterations: 100 }
    )

    bench(
      'migrate small dataset (10 items)',
      async () => {
        const data: { localStorage: Record<string, string> } = {
          localStorage: {},
        }
        for (let i = 0; i < 10; i++) {
          data.localStorage[`key-${i}`] = `value-${i}`
        }
        const file = new File([JSON.stringify(data)], 'test.json', { type: 'application/json' })
        await migrationService.migrate(file, 'yyc3')
      },
      { time: 1000, iterations: 20 }
    )

    bench(
      'migrate medium dataset (100 items)',
      async () => {
        const data: { localStorage: Record<string, string> } = {
          localStorage: {},
        }
        for (let i = 0; i < 100; i++) {
          data.localStorage[`key-${i}`] = `value-${i}`
        }
        const file = new File([JSON.stringify(data)], 'test.json', { type: 'application/json' })
        await migrationService.migrate(file, 'yyc3')
      },
      { time: 1000, iterations: 10 }
    )

    bench(
      'export to JSON (100 items)',
      async () => {
        const data = []
        for (let i = 0; i < 100; i++) {
          data.push({ key: `key-${i}`, value: `value-${i}` })
        }
        await migrationService.exportToFormat('json', data)
      },
      { time: 1000, iterations: 50 }
    )

    bench(
      'export to CSV (100 items)',
      async () => {
        const data = []
        for (let i = 0; i < 100; i++) {
          data.push({ key: `key-${i}`, value: `value-${i}` })
        }
        await migrationService.exportToFormat('csv', data)
      },
      { time: 1000, iterations: 50 }
    )
  })

  describe('Performance Monitor Overhead', () => {
    bench(
      'record metric',
      () => {
        monitor.recordMetric({
          operation: 'read',
          storage: 'localStorage',
          duration: 50,
          success: true,
        })
      },
      { time: 1000, iterations: 1000 }
    )

    bench(
      'get storage stats',
      () => {
        monitor.getStorageStats()
      },
      { time: 1000, iterations: 500 }
    )

    bench(
      'get performance report',
      () => {
        monitor.getPerformanceReport('hour')
      },
      { time: 1000, iterations: 100 }
    )
  })

  describe('LocalStorage Operations', () => {
    bench(
      'setItem (100 bytes)',
      () => {
        const key = `bench-set-${Date.now()}`
        const value = 'a'.repeat(100)
        localStorage.setItem(key, value)
      },
      { time: 1000, iterations: 500 }
    )

    bench(
      'getItem (100 bytes)',
      () => {
        localStorage.setItem('bench-get', 'a'.repeat(100))
        localStorage.getItem('bench-get')
      },
      { time: 1000, iterations: 1000 }
    )

    bench(
      'removeItem',
      () => {
        const key = `bench-remove-${Date.now()}`
        localStorage.setItem(key, 'value')
        localStorage.removeItem(key)
      },
      { time: 1000, iterations: 500 }
    )
  })
})
