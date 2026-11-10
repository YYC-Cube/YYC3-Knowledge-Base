/**
 * @file: vitest.setup.ts
 * @description: YYC³ 测试环境配置
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: test
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,setup,config
 */

import { beforeAll, afterAll, vi } from 'vitest'
import 'fake-indexeddb/auto'

beforeAll(() => {
  global.crypto = {
    subtle: {
      generateKey: vi.fn().mockResolvedValue({}),
      exportKey: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      importKey: vi.fn().mockResolvedValue({}),
      encrypt: vi.fn().mockResolvedValue(new ArrayBuffer(64)),
      decrypt: vi.fn().mockResolvedValue(new TextEncoder().encode('decrypted')),
      deriveKey: vi.fn().mockResolvedValue({}),
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
      return array
    },
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    },
  } as any
})

afterAll(() => {
  vi.clearAllMocks()
})
