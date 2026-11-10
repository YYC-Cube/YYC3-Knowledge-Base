/**
 * @file: EncryptionService.test.ts
 * @description: YYC³ 加密服务测试套件
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: test
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,encryption,unit
 */

// @vitest-environment node

import { describe, it, expect, beforeEach } from 'vitest'
import { EncryptionService } from '../EncryptionService'

describe('EncryptionService', () => {
  let encryptionService: EncryptionService

  beforeEach(() => {
    localStorage.clear()
    encryptionService = EncryptionService.getInstance()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = EncryptionService.getInstance()
      const instance2 = EncryptionService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text successfully', async () => {
      const plaintext = 'Hello, YYC³!'

      const keyId = await encryptionService.generateKey('test-key')
      await encryptionService.setActiveKey(keyId)
      await encryptionService.setEnabled(true)

      const encrypted = await encryptionService.encrypt(plaintext)
      const decrypted = await encryptionService.decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
      expect(encrypted.data).not.toBe(plaintext)
      expect(encrypted.iv).toBeDefined()
      expect(encrypted.salt).toBeDefined()
    })

    it('should fail to encrypt when not enabled', async () => {
      const plaintext = 'Secret data'

      await expect(encryptionService.encrypt(plaintext)).rejects.toThrow()
    })
  })

  describe('encryption strength', () => {
    it('should use different strengths', async () => {
      await encryptionService.setStrength('standard')
      const keyId = await encryptionService.generateKey('standard-key')
      await encryptionService.setActiveKey(keyId)
      await encryptionService.setEnabled(true)

      const plaintext = 'Test data'
      const encrypted = await encryptionService.encrypt(plaintext)

      expect(encrypted.strength).toBe('standard')
    })
  })

  describe('key management', () => {
    it('should generate and list keys', async () => {
      const keyId1 = await encryptionService.generateKey('Key 1')
      const keyId2 = await encryptionService.generateKey('Key 2')

      const keys = encryptionService.listKeys()
      expect(keys.length).toBeGreaterThanOrEqual(2)
      expect(keys.find((k) => k.id === keyId1)).toBeDefined()
      expect(keys.find((k) => k.id === keyId2)).toBeDefined()
    })

    it('should delete key', async () => {
      const keyId = await encryptionService.generateKey('Test Key')

      const result = await encryptionService.deleteKey(keyId)
      expect(result).toBe(true)

      const keys = encryptionService.listKeys()
      expect(keys.find((k) => k.id === keyId)).toBeUndefined()
    })

    it('should set active key', async () => {
      const keyId = await encryptionService.generateKey('Active Key')
      await encryptionService.setActiveKey(keyId)

      const config = encryptionService.getConfig()
      expect(config.keyId).toBe(keyId)
    })
  })

  describe('config management', () => {
    it('should enable and disable encryption', async () => {
      const keyId = await encryptionService.generateKey('test-key')
      await encryptionService.setActiveKey(keyId)

      await encryptionService.setEnabled(true)
      expect(encryptionService.isEnabled()).toBe(true)

      await encryptionService.setEnabled(false)
      expect(encryptionService.isEnabled()).toBe(false)
    })

    it('should set strength', async () => {
      await encryptionService.setStrength('high')
      const config = encryptionService.getConfig()
      expect(config.strength).toBe('high')
    })
  })
})
