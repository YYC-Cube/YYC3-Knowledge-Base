/**
 * @file: EncryptionService.ts
 * @description: YYC³ 数据加密服务 - 可选加密、自定义密钥、加密强度选择
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: encryption,crypto,security,privacy
 */

import { logger } from "./Logger";
export type EncryptionStrength = 'standard' | 'high' | 'maximum'

export interface EncryptionConfig {
  enabled: boolean
  strength: EncryptionStrength
  keyId: string
}

export interface EncryptedData {
  iv: string
  salt: string
  data: string
  strength: EncryptionStrength
  version: string
  keyId: string
}

const ENCRYPTION_CONFIG_KEY = 'yyc3-encryption-config'
const KEY_STORAGE_PREFIX = 'yyc3-enc-key-'

const DEFAULT_CONFIG: EncryptionConfig = {
  enabled: false,
  strength: 'standard',
  keyId: '',
}

export class EncryptionService {
  private static instance: EncryptionService
  private config: EncryptionConfig

  private constructor() {
    this.config = this.loadConfig()
  }

  /**
   * 将 Uint8Array 转换为纯 ArrayBuffer（兼容 Web Crypto API）
   */
  private static toArrayBuffer(data: Uint8Array | ArrayBuffer | Buffer): ArrayBuffer {
    if (data instanceof ArrayBuffer) {
      const copy = new ArrayBuffer(data.byteLength)
      new Uint8Array(copy).set(new Uint8Array(data))
      return copy
    }
    const src = ArrayBuffer.isView(data)
      ? new Uint8Array((data as Uint8Array).buffer, (data as Uint8Array).byteOffset, (data as Uint8Array).byteLength)
      : new Uint8Array(data as Uint8Array)
    const copy = new ArrayBuffer(src.byteLength)
    new Uint8Array(copy).set(src)
    return copy
  }

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService()
    }
    return EncryptionService.instance
  }

  private loadConfig(): EncryptionConfig {
    try {
      const stored = localStorage.getItem(ENCRYPTION_CONFIG_KEY)
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) }
      }
    } catch (e) {
      logger.warn('[EncryptionService] Failed to load config:', e);
    }
    return DEFAULT_CONFIG
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(ENCRYPTION_CONFIG_KEY, JSON.stringify(this.config))
    } catch (e) {
      logger.error('[EncryptionService] Failed to save config:', e);
    }
  }

  getConfig(): EncryptionConfig {
    return { ...this.config }
  }

  isEnabled(): boolean {
    return this.config.enabled
  }

  async setEnabled(enabled: boolean): Promise<void> {
    if (enabled && !this.config.keyId) {
      throw new Error('请先创建加密密钥')
    }
    this.config.enabled = enabled
    this.saveConfig()
  }

  async setStrength(strength: EncryptionStrength): Promise<void> {
    this.config.strength = strength
    this.saveConfig()
  }

  async generateKey(name: string): Promise<string> {
    const keyId = `${KEY_STORAGE_PREFIX}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const key = crypto.getRandomValues(new Uint8Array(32))

    const keyData = {
      id: keyId,
      name,
      key: this.arrayBufferToBase64(key),
      createdAt: Date.now(),
      strength: this.config.strength,
    }

    localStorage.setItem(keyId, JSON.stringify(keyData))
    this.config.keyId = keyId
    this.saveConfig()

    return keyId
  }

  async deleteKey(keyId: string): Promise<boolean> {
    try {
      if (this.config.keyId === keyId) {
        this.config.enabled = false
        this.config.keyId = ''
        this.saveConfig()
      }
      localStorage.removeItem(keyId)
      return true
    } catch (e) {
      logger.error('[EncryptionService] Failed to delete key:', e);
      return false
    }
  }

  listKeys(): Array<{ id: string; name: string; createdAt: number }> {
    const keys: Array<{ id: string; name: string; createdAt: number }> = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(KEY_STORAGE_PREFIX)) {
        try {
          const keyData = JSON.parse(localStorage.getItem(key) || '{}')
          keys.push({
            id: keyData.id,
            name: keyData.name,
            createdAt: keyData.createdAt,
          })
        } catch {
          // Skip invalid keys
        }
      }
    }

    return keys.sort((a, b) => b.createdAt - a.createdAt)
  }

  async setActiveKey(keyId: string): Promise<void> {
    const keyData = localStorage.getItem(keyId)
    if (!keyData) {
      throw new Error('密钥不存在')
    }
    this.config.keyId = keyId
    this.saveConfig()
  }

  async encrypt(plaintext: string): Promise<EncryptedData> {
    if (!this.config.enabled || !this.config.keyId) {
      throw new Error('加密未启用或未设置密钥')
    }

    const keyDataStr = localStorage.getItem(this.config.keyId)
    if (!keyDataStr) {
      throw new Error('加密密钥不存在')
    }

    const keyData = JSON.parse(keyDataStr)
    const key = this.base64ToArrayBuffer(keyData.key)

    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(this.getIVLength()))

    const derivedKey = await this.deriveKey(key, salt)
    const encoder = new TextEncoder()
    const encodedData = encoder.encode(plaintext)

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: this.getAlgorithm(),
        iv: EncryptionService.toArrayBuffer(iv),
      },
      derivedKey,
      EncryptionService.toArrayBuffer(encodedData),
    )

    return {
      iv: this.arrayBufferToBase64(iv),
      salt: this.arrayBufferToBase64(salt),
      data: this.arrayBufferToBase64(new Uint8Array(encryptedBuffer)),
      strength: this.config.strength,
      version: '1.0',
      keyId: this.config.keyId,
    }
  }

  async decrypt(encryptedData: EncryptedData): Promise<string> {
    const keyId = this.findKeyByData(encryptedData)
    if (!keyId) {
      throw new Error('找不到对应的加密密钥')
    }

    const keyDataStr = localStorage.getItem(keyId)
    if (!keyDataStr) {
      throw new Error('加密密钥不存在')
    }

    const keyData = JSON.parse(keyDataStr)
    const key = this.base64ToArrayBuffer(keyData.key)

    const salt = this.base64ToArrayBuffer(encryptedData.salt)
    const iv = this.base64ToArrayBuffer(encryptedData.iv)
    const data = this.base64ToArrayBuffer(encryptedData.data)

    const derivedKey = await this.deriveKey(key, salt)

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: this.getAlgorithm(),
        iv: EncryptionService.toArrayBuffer(iv),
      },
      derivedKey,
      EncryptionService.toArrayBuffer(data),
    )

    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  }

  encryptLocalStorageKey(key: string): string {
    return `enc_${key}`
  }

  async encryptValue(value: string): Promise<string> {
    if (!this.isEnabled()) {
      return value
    }
    const encrypted = await this.encrypt(value)
    return JSON.stringify(encrypted)
  }

  async decryptValue(value: string): Promise<string> {
    if (!this.isEnabled()) {
      return value
    }

    try {
      const encrypted = JSON.parse(value) as EncryptedData
      if (encrypted.iv && encrypted.salt && encrypted.data) {
        return await this.decrypt(encrypted)
      }
    } catch {
      // Not encrypted, return as-is
    }

    return value
  }

  private findKeyByData(encryptedData: EncryptedData): string | null {
    if (encryptedData.keyId) {
      const keyData = localStorage.getItem(encryptedData.keyId)
      if (keyData) {
        return encryptedData.keyId
      }
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(KEY_STORAGE_PREFIX)) {
        return key
      }
    }
    return null
  }

  private getAlgorithm(): string {
    switch (this.config.strength) {
      case 'maximum':
        return 'AES-GCM'
      case 'high':
        return 'AES-GCM'
      default:
        return 'AES-GCM'
    }
  }

  private getIVLength(): number {
    switch (this.config.strength) {
      case 'maximum':
        return 16
      case 'high':
        return 12
      default:
        return 12
    }
  }

  private async deriveKey(
    password: Uint8Array,
    salt: Uint8Array,
  ): Promise<CryptoKey> {
    const iterations = this.getIterations()

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      EncryptionService.toArrayBuffer(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey'],
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: EncryptionService.toArrayBuffer(salt),
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
  }

  private getIterations(): number {
    switch (this.config.strength) {
      case 'maximum':
        return 1000000
      case 'high':
        return 500000
      default:
        return 100000
    }
  }

  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  async exportKey(keyId: string): Promise<void> {
    const keyDataStr = localStorage.getItem(keyId)
    if (!keyDataStr) {
      throw new Error('密钥不存在')
    }

    const keyData = JSON.parse(keyDataStr)
    const blob = new Blob([JSON.stringify(keyData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yyc3-encryption-key-${keyId.replace(KEY_STORAGE_PREFIX, '')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async importKey(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (event) => {
        try {
          const text = event.target?.result as string
          const keyData = JSON.parse(text)

          if (!keyData.id || !keyData.key || !keyData.name) {
            throw new Error('无效的密钥文件格式')
          }

          const newId = `${KEY_STORAGE_PREFIX}${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`
          keyData.id = newId
          keyData.importedAt = Date.now()

          localStorage.setItem(newId, JSON.stringify(keyData))
          resolve(newId)
        } catch (e) {
          reject(new Error(`导入失败: ${(e as Error).message}`))
        }
      }

      reader.onerror = () => {
        reject(new Error('文件读取失败'))
      }

      reader.readAsText(file)
    })
  }
}

export default EncryptionService
