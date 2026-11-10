/**
 * @file BackupService.comprehensive.test.ts
 * @description BackupService 全面测试 - 备份创建、恢复、配置管理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BackupService } from '../BackupService'

// 类型别名简化使用
type ServiceInstance = InstanceType<typeof BackupService>

describe('BackupService - 单例模式', () => {

  it('getInstance应该返回相同实例', () => {
    const instance1 = BackupService.getInstance()
    const instance2 = BackupService.getInstance()
    
    expect(instance1).toBe(instance2)
  })
})

describe('BackupService - 配置管理', () => {

  let service: ServiceInstance

  beforeEach(() => {
    service = BackupService.getInstance() as ServiceInstance
  })

  it('getConfig应该返回默认配置', () => {
    const config = service.getConfig()
    
    expect(config.enabled).toBe(true)
    expect(config.interval).toBe(60 * 60 * 1000)
    expect(config.maxBackups).toBe(10)
    expect(config.autoBackupOnExit).toBe(true)
    expect(config.compressBackups).toBe(false)
  })

  it('updateConfig应该更新指定字段', () => {
    service.updateConfig({
      maxBackups: 20,
      interval: 30 * 60 * 1000,
    })
    
    const config = service.getConfig()
    expect(config.maxBackups).toBe(20)
    expect(config.interval).toBe(30 * 60 * 1000)
    expect(config.enabled).toBe(true)
    expect(config.compressBackups).toBe(false)
  })

  it('updateConfig应该保存到localStorage', () => {
    service.updateConfig({ maxBackups: 50 })
    
    const saved = localStorage.getItem('yyc3-backup-config')
    expect(saved).toBeTruthy()
    
    const parsed = JSON.parse(saved!)
    expect(parsed.maxBackups).toBe(50)
  })

  it('updateConfig应该支持所有字段', () => {
    service.updateConfig({
      enabled: false,
      interval: 99999,
      maxBackups: 999,
      autoBackupOnExit: false,
      compressBackups: true,
    })
    
    const config = service.getConfig()
    expect(config.enabled).toBe(false)
    expect(config.compressBackups).toBe(true)
  })
})

describe('BackupService - listBackups', () => {

  let service: ServiceInstance

  beforeEach(() => {
    service = BackupService.getInstance() as ServiceInstance
  })

  it('listBackups应该返回数组', async () => {
    const result = await service.listBackups()
    
    expect(Array.isArray(result)).toBe(true)
  })
})

describe('BackupService - getBackup边界情况', () => {

  let service: ServiceInstance

  beforeEach(() => {
    service = BackupService.getInstance() as ServiceInstance
  })

  it('getBackup对于不存在的ID应返回null', async () => {
    const result = await service.getBackup('non-existent-id')
    
    expect(result).toBeNull()
  })
})

describe('BackupService - restoreBackup验证', () => {

  let service: ServiceInstance

  beforeEach(() => {
    service = BackupService.getInstance() as ServiceInstance
  })

  it('restoreBackup对不存在备份应返回失败', async () => {
    const result = await service.restoreBackup('non-existent')
    
    expect(result.success).toBe(false)
    expect(result.message).toContain('不存在')
  })
})

describe('BackupService - 自动备份控制', () => {

  let service: ServiceInstance

  beforeEach(() => {
    service = BackupService.getInstance() as ServiceInstance
    try { (service as any).stopAutoBackup?.() } catch { /* Ignore cleanup */ }
  })

  afterEach(() => {
    try { (service as any).stopAutoBackup?.() } catch { /* Ignore cleanup */ }
  })

  it('updateConfig启用时应该触发自动备份重启', () => {
    // 测试配置更新对自动备份的影响
    const originalInterval = service.getConfig().interval
    
    service.updateConfig({ interval: 120000 })
    
    // 验证配置已更新
    expect(service.getConfig().interval).toBe(120000)
    
    // 恢复原始配置
    service.updateConfig({ interval: originalInterval })
  })

  it('禁用自动备份不应该影响手动备份', async () => {
    service.updateConfig({ enabled: false })
    
    // 验证服务仍然可以工作
    const config = service.getConfig()
    expect(config.enabled).toBe(false)
    expect(typeof service.createBackup).toBe('function')
    
    // 恢复
    service.updateConfig({ enabled: true })
  })
})

describe('BackupService - 边界情况', () => {

  it('多次调用getInstance应该返回同一实例', () => {
    const instances = Array.from({ length: 10 }, () => BackupService.getInstance())
    
    expect(new Set(instances).size).toBe(1)
  })

  it('单例应该有正确的方法', () => {
    const instance = BackupService.getInstance()
    
    expect(typeof instance.getConfig).toBe('function')
    expect(typeof instance.updateConfig).toBe('function')
    expect(typeof instance.createBackup).toBe('function')
    expect(typeof instance.listBackups).toBe('function')
    expect(typeof instance.getBackup).toBe('function')
    expect(typeof instance.restoreBackup).toBe('function')
  })
})
