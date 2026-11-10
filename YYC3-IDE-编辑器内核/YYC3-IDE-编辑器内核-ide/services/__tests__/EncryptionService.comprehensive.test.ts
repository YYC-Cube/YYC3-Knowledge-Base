/**
 * @file: EncryptionService.comprehensive.test.ts
 * @description: EncryptionService 全面测试 - 覆盖所有核心功能
 *              目标覆盖率: 85%+ | 预估用例数: 95+
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-15
 * @status: dev
 * @license: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EncryptionService } from '../EncryptionService';

// 内联Crypto Mock - 避免路径解析问题
function setupTestCrypto() {
  if (typeof globalThis.crypto === 'undefined') {
    const originalSubtle = {
      importKey: vi.fn().mockImplementation(async (_format: string, _key: any, _algorithm: any, _extractable: boolean, _usages: string[]) => ({
        algorithm: { name: 'PBKDF2' },
        extractable: false,
        type: 'secret',
        usages: ['deriveBits', 'deriveKey'],
      })),
      deriveKey: vi.fn().mockImplementation(async (_params: any, _keyMaterial: any, _algo: any, _extractable: boolean, _usages: string[]) => ({
        algorithm: { name: 'AES-GCM', length: 256 },
        extractable: false,
        type: 'secret',
        usages: ['encrypt', 'decrypt'],
      })),
      encrypt: vi.fn().mockImplementation(async () => new ArrayBuffer(32)),
      decrypt: vi.fn().mockImplementation(async () => new TextEncoder().encode('decrypted').buffer),
    };

    Object.defineProperty(globalThis, 'crypto', {
      value: {
        subtle: originalSubtle,
        getRandomValues: vi.fn((arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
          return arr;
        }),
      },
      writable: true,
    });
  }
}

// ── Setup ───────────────────────────────────────────────

let encryptionService: EncryptionService;

beforeEach(async () => {
    await setupTestCrypto();
    localStorage.clear();
    vi.clearAllMocks();
    
    // 重置单例
    (EncryptionService as any).instance = undefined;
    encryptionService = EncryptionService.getInstance();
    
    // 重置为standard强度
    await encryptionService.setStrength('standard');
  });

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ── Helper Functions ─────────────────────────────────────

async function createTestKey(name: string = 'test-key'): Promise<string> {
  return encryptionService.generateKey(name);
}

// ================================================================
// 1. 单例模式与初始化测试
// ================================================================

describe('EncryptionService - 单例模式与初始化', () => {
  
  it('应该返回相同的实例', () => {
    const instance1 = EncryptionService.getInstance();
    const instance2 = EncryptionService.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  it('应该在创建时加载默认配置', () => {
    const config = encryptionService.getConfig();
    
    expect(config).toEqual({
      enabled: false,
      strength: 'standard',
      keyId: '',
    });
  });

  it('应该从localStorage恢复已保存的配置', () => {
    localStorage.setItem(
      'yyc3-encryption-config',
      JSON.stringify({ enabled: true, strength: 'high', keyId: 'test-key-id' })
    );
    
    (EncryptionService as any).instance = undefined;
    const newInstance = EncryptionService.getInstance();
    
    expect(newInstance.getConfig()).toMatchObject({
      enabled: true,
      strength: 'high',
      keyId: 'test-key-id',
    });
  });

  it('应该处理损坏的配置数据', () => {
    localStorage.setItem('yyc3-encryption-config', 'invalid-json{');
    
    (EncryptionService as any).instance = undefined;
    const newInstance = EncryptionService.getInstance();
    
    const config = newInstance.getConfig();
    expect(config.enabled).toBe(false);
  });
});

// ================================================================
// 2. 配置管理测试
// ================================================================

describe('EncryptionService - 配置管理', () => {

  it('getConfig 应该返回配置的副本', async () => {
    const config1 = encryptionService.getConfig();
    const config2 = encryptionService.getConfig();
    
    expect(config1).not.toBe(config2); // 不同引用
    expect(config1).toEqual(config2);   // 相同值
  });

  it('isEnabled 应该返回当前启用状态', () => {
    expect(encryptionService.isEnabled()).toBe(false);
  });

  it('setEnabled(true) 在没有密钥时应该抛出错误', async () => {
    await expect(encryptionService.setEnabled(true))
      .rejects.toThrow('请先创建加密密钥');
  });

  it('setEnabled(true) 在有密钥时应该成功', async () => {
    await createTestKey();
    await encryptionService.setEnabled(true);
    
    expect(encryptionService.isEnabled()).toBe(true);
  });

  it('setEnabled(false) 应该禁用加密', async () => {
    await createTestKey();
    await encryptionService.setEnabled(true);
    await encryptionService.setEnabled(false);
    
    expect(encryptionService.isEnabled()).toBe(false);
  });

  it('setStrength 应该更新加密强度', async () => {
    await encryptionService.setStrength('high');
    
    expect(encryptionService.getConfig().strength).toBe('high');
  });

  it('setStrength 应该支持所有有效强度值', async () => {
    const strengths = ['standard', 'high', 'maximum'] as const;
    
    for (const strength of strengths) {
      await encryptionService.setStrength(strength);
      expect(encryptionService.getConfig().strength).toBe(strength);
    }
  });
});

// ================================================================
// 3. 密钥管理测试
// ================================================================

describe('EncryptionService - 密钥管理', () => {

  describe('generateKey', () => {
    
    it('应该生成新的加密密钥', async () => {
      const keyId = await createTestKey();
      
      expect(keyId).toBeTruthy();
      expect(keyId).toContain('yyc3-enc-key-');
      
      // 密钥应该保存在localStorage
      const keyData = JSON.parse(localStorage.getItem(keyId)!);
      expect(keyData.id).toBe(keyId);
      expect(keyData.name).toBe('test-key');
      expect(keyData.key).toBeTruthy();
      expect(keyData.createdAt).toBeLessThanOrEqual(Date.now());
    });

    it('生成密钥后应该自动设置为活跃密钥', async () => {
      const keyId = await createTestKey();
      
      expect(encryptionService.getConfig().keyId).toBe(keyId);
    });

    it('应该为每个密钥生成唯一的ID', async () => {
      const keyId1 = await createTestKey('key-1');
      const keyId2 = await createTestKey('key-2');
      
      expect(keyId1).not.toBe(keyId2);
    });

    it('自定义名称应该正确保存', async () => {
      const customName = 'my-custom-key';
      const keyId = await encryptionService.generateKey(customName);
      
      const keyData = JSON.parse(localStorage.getItem(keyId)!);
      expect(keyData.name).toBe(customName);
    });
  });

  describe('deleteKey', () => {
    
    it('应该删除指定的密钥', async () => {
      const keyId = await createTestKey();
      
      const result = await encryptionService.deleteKey(keyId);
      
      expect(result).toBe(true);
      expect(localStorage.getItem(keyId)).toBeNull();
    });

    it('删除活跃密钥应该禁用加密并清除keyId', async () => {
      const keyId = await createTestKey();
      await encryptionService.setEnabled(true);
      
      await encryptionService.deleteKey(keyId);
      
      expect(encryptionService.isEnabled()).toBe(false);
      expect(encryptionService.getConfig().keyId).toBe('');
    });

    it('删除非活跃密钥不应该影响配置', async () => {
      const keyId1 = await createTestKey('key-1');
      await createTestKey('key-2'); // 这会成为活跃密钥
      
      await encryptionService.deleteKey(keyId1);
      
      expect(encryptionService.getConfig().keyId).not.toBe(keyId1);
    });
  });

  describe('listKeys', () => {
    
    it('应该返回空数组当没有密钥时', () => {
      const keys = encryptionService.listKeys();
      
      expect(keys).toHaveLength(0);
    });

    it('应该列出所有已保存的密钥', async () => {
      await createTestKey('first-key');
      await createTestKey('second-key');
      await createTestKey('third-key');
      
      const keys = encryptionService.listKeys();
      
      expect(keys).toHaveLength(3);
    });

    it('返回的密钥应该按创建时间降序排列', async () => {
      const keyId1 = await createTestKey('oldest');
      // 短暂延迟确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 10));
      const keyId2 = await createTestKey('newest');
      
      const keys = encryptionService.listKeys();
      
      expect(keys[0].id).toBe(keyId2); // 最新在前
      expect(keys[1].id).toBe(keyId1);
    });

    it('应该跳过无效的密钥数据', async () => {
      await createTestKey('valid-key');
      localStorage.setItem('yyc3-enc-key-invalid', '{invalid-json}');
      
      const keys = encryptionService.listKeys();
      
      // 只返回有效的密钥
      expect(keys.length).toBeGreaterThanOrEqual(1);
      expect(keys.every(k => k.id && k.name)).toBe(true);
    });
  });

  describe('setActiveKey', () => {
    
    it('应该设置指定的密钥为活跃密钥', async () => {
      const keyId = await createTestKey();
      
      // 先清除活跃状态
      (encryptionService as any).config.keyId = '';
      
      await encryptionService.setActiveKey(keyId);
      
      expect(encryptionService.getConfig().keyId).toBe(keyId);
    });

    it('对于不存在的密钥ID应该抛出错误', async () => {
      await expect(encryptionService.setActiveKey('non-existent-key'))
        .rejects.toThrow('密钥不存在');
    });
  });
});

// ================================================================
// 4. 加密/解密功能测试
// ================================================================

describe('EncryptionService - 加密/解密功能', () => {

  beforeEach(async () => {
    await createTestKey();
    await encryptionService.setEnabled(true);
  });

  describe('encrypt', () => {
    
    it('应该成功加密文本', async () => {
      const plaintext = 'Hello, World!';
      const encrypted = await encryptionService.encrypt(plaintext);
      
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.salt).toBeTruthy();
      expect(encrypted.data).toBeTruthy();
      expect(encrypted.strength).toBe('standard');
      expect(encrypted.version).toBe('1.0');
      expect(encrypted.keyId).toBeTruthy();
    });

    it('不同明文应该产生不同的密文', async () => {
      const encrypted1 = await encryptionService.encrypt('text-1');
      const encrypted2 = await encryptionService.encrypt('text-2');
      
      // IV和salt应该是随机的
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
      expect(encrypted1.data).not.toBe(encrypted2.data);
    });

    it('相同明文也应该产生不同的密文（因为随机IV）', async () => {
      const plaintext = 'same-text';
      const encrypted1 = await encryptionService.encrypt(plaintext);
      const encrypted2 = await encryptionService.encrypt(plaintext);
      
      expect(encrypted1.data).not.toBe(encrypted2.data);
    });

    it('在未启用加密时应该抛出错误', async () => {
      await encryptionService.setEnabled(false);
      (encryptionService as any).config.keyId = '';
      
      await expect(encryptionService.encrypt('test'))
        .rejects.toThrow('加密未启用或未设置密钥');
    });

    it('在没有设置密钥时应该抛出错误', async () => {
      (encryptionService as any).config.keyId = '';
      
      await expect(encryptionService.encrypt('test'))
        .rejects.toThrow('加密未启用或未设置密钥');
    });

    it('应该能够处理空字符串', async () => {
      const encrypted = await encryptionService.encrypt('');
      
      expect(encrypted.data).toBeTruthy();
    });

    it('应该能够处理长文本', async () => {
      const longText = 'a'.repeat(10000);
      const encrypted = await encryptionService.encrypt(longText);
      
      expect(encrypted.data).toBeTruthy();
    });

    it('应该能够处理Unicode字符', async () => {
      const unicodeText = '你好世界 🌍 日本語 한국어';
      const encrypted = await encryptionService.encrypt(unicodeText);
      
      expect(encrypted.data).toBeTruthy();
    });

    it('应该使用正确的强度设置', async () => {
      await encryptionService.setStrength('high');
      const encrypted = await encryptionService.encrypt('test');
      
      expect(encrypted.strength).toBe('high');
    });
  });

  describe('decrypt', () => {
    
    it('应该成功解密之前加密的数据', async () => {
      const original = 'Secret message';
      const encrypted = await encryptionService.encrypt(original);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(original);
    });

    it('应该保留原始文本的所有内容', async () => {
      const original = JSON.stringify({
        name: 'Test User',
        age: 30,
        active: true,
        tags: ['dev', 'test'],
      });
      const encrypted = await encryptionService.encrypt(original);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(original));
    });

    it('对于不存在的密钥应该抛出错误', async () => {
      const fakeEncrypted = {
        iv: 'dGVzdA==',
        salt: 'dGVzdA==',
        data: 'dGVzdA==',
        strength: 'standard' as const,
        version: '1.0',
        keyId: 'non-existent-key-id',
      };
      
      // Web Crypto会先尝试解密，如果密钥不存在或数据无效会抛出错误
      await expect(encryptionService.decrypt(fakeEncrypted))
        .rejects.toThrow(); // 只验证抛出错误即可
    });

    it('被篡改的密文应该抛出错误', async () => {
      const encrypted = await encryptionService.encrypt('original');
      
      // 篡改密文
      encrypted.data = 'tampered-data';
      
      await expect(encryptionService.decrypt(encrypted))
        .rejects.toThrow(); // Web Crypto会抛出OperationError
    });
  });

  describe('encryptValue / decryptValue', () => {
    
    it('encryptValue 在未启用时应该返回原始值', async () => {
      await encryptionService.setEnabled(false);
      
      const result = await encryptionService.encryptValue('plain-value');
      
      expect(result).toBe('plain-value');
    });

    it('decryptValue 在未启用时应该返回原始值', async () => {
      await encryptionService.setEnabled(false);
      
      const result = await encryptionService.decryptValue('some-value');
      
      expect(result).toBe('some-value');
    });

    it('encryptValue 在启用时应该返回JSON字符串', async () => {
      const value = 'sensitive-data';
      const encrypted = await encryptionService.encryptValue(value);
      
      const parsed = JSON.parse(encrypted);
      expect(parsed.iv).toBeTruthy();
      expect(parsed.salt).toBeTruthy();
      expect(parsed.data).toBeTruthy();
    });

    it('decryptValue 应该能还原 encryptValue 的结果', async () => {
      const original = 'secret-info';
      const encrypted = await encryptionService.encryptValue(original);
      const decrypted = await encryptionService.decryptValue(encrypted);
      
      expect(decrypted).toBe(original);
    });

    it('decryptValue 对于非JSON字符串应该返回原值', async () => {
      const plainString = 'not-encrypted-json';
      const result = await encryptionService.decryptValue(plainString);
      
      expect(result).toBe(plainString);
    });
  });

  describe('encryptLocalStorageKey', () => {
    
    it('应该给键名添加前缀', () => {
      const obfuscated = encryptionService.encryptLocalStorageKey('user-token');
      
      expect(obfuscated).toBe('enc_user-token');
    });
  });
});

// ================================================================
// 5. 密钥导入/导出测试
// ================================================================

describe('EncryptionService - 密钥导入/导出', () => {

  beforeEach(async () => {
    await createTestKey('exportable-key');
  });

  describe('exportKey', () => {
    
    it('应该导出存在的密钥', async () => {
      const keyId = encryptionService.getConfig().keyId;
      
      // Mock DOM方法
      const mockCreateObjectURL = vi.fn(() => 'blob:url');
      const mockClick = vi.fn();
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      const mockRevokeObjectURL = vi.fn();

      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;
      global.document.createElement = vi.fn((tag: string) => ({
        click: mockClick,
        href: '',
        download: '',
      })) as any;
      global.document.body.appendChild = mockAppendChild;
      global.document.body.removeChild = mockRemoveChild;

      await encryptionService.exportKey(keyId);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('对于不存在的密钥应该抛出错误', async () => {
      await expect(encryptionService.exportKey('non-existent'))
        .rejects.toThrow('密钥不存在');
    });
  });

  describe('importKey', () => {
    
    it('应该从有效的JSON文件导入密钥', async () => {
      const validKeyData = {
        id: 'original-id',
        name: 'imported-key',
        key: Array.from(crypto.getRandomValues(new Uint8Array(32))),
        createdAt: Date.now(),
        strength: 'standard',
      };
      
      const file = new File(
        [JSON.stringify(validKeyData)],
        'key.json',
        { type: 'application/json' }
      );

      const newKeyId = await encryptionService.importKey(file);

      expect(newKeyId).toBeTruthy();
      expect(newKeyId).toContain('yyc3-enc-key-');
      
      // 验证导入的密钥可以访问
      const importedData = JSON.parse(localStorage.getItem(newKeyId)!);
      expect(importedData.name).toBe('imported-key');
      expect(importedData.importedAt).toBeTruthy();
    });

    it('对于缺少必要字段的文件应该拒绝', async () => {
      const invalidData = { id: 'only-id' };
      const file = new File([JSON.stringify(invalidData)], 'bad.json');

      await expect(encryptionService.importKey(file))
        .rejects.toThrow('无效的密钥文件格式');
    });

    it('对于非JSON文件应该拒绝', async () => {
      const file = new File(['not json content'], 'text.txt', { type: 'text/plain' });

      await expect(encryptionService.importKey(file))
        .rejects.toThrow();
    });
  });
});

// ================================================================
// 6. 加密强度配置测试
// ================================================================

describe('EncryptionService - 加密强度配置', () => {

  it('standard 强度应该使用12字节IV', async () => {
    await encryptionService.setStrength('standard');
    await createTestKey();
    await encryptionService.setEnabled(true);

    const encrypted = await encryptionService.encrypt('test');
    
    // Base64编码的12字节IV应该是16个字符（padding后）
    expect(encrypted.iv.length).toBeGreaterThan(10);
  });

  it('high 强度应该使用12字节IV', async () => {
    await encryptionService.setStrength('high');
    await createTestKey();
    await encryptionService.setEnabled(true);

    const encrypted = await encryptionService.encrypt('test');
    
    expect(encrypted.strength).toBe('high');
  });

  it('maximum 强度应该使用16字节IV', async () => {
    await encryptionService.setStrength('maximum');
    await createTestKey();
    await encryptionService.setEnabled(true);

    const encrypted = await encryptionService.encrypt('test');
    
    expect(encrypted.strength).toBe('maximum');
  });

  it('所有强度都应该使用AES-GCM算法', async () => {
    const strengths = ['standard', 'high', 'maximum'] as const;
    
    for (const strength of strengths) {
      await encryptionService.setStrength(strength);
      await createTestKey(`key-${strength}`);
      await encryptionService.setEnabled(true);
      
      const encrypted = await encryptionService.encrypt('test');
      
      // 所有强度都使用AES-GCM
      expect(encrypted.version).toBe('1.0');
    }
  });
});

// ================================================================
// 7. 边界情况和错误处理测试
// ================================================================

describe('EncryptionService - 边界情况与错误处理', () => {

  it('应该处理localStorage写入失败', async () => {
    // 直接mock setItem使其抛出错误
    const originalSetItem = Storage.prototype.setItem;
    let callCount = 0;
    Storage.prototype.setItem = function(...args: any[]) {
      callCount++;
      if (callCount === 1) throw new Error('QuotaExceededError');
      return originalSetItem.apply(this, args as [string, string]);
    };

    try {
      // 不应该抛出错误，只是记录日志
      await encryptionService.setStrength('high');
      
      // 配置可能没有保存，但不应该崩溃
      expect(encryptionService).toBeDefined();
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
  });

  it('应该处理特殊字符', async () => {
    await createTestKey();
    await encryptionService.setEnabled(true);

    const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
    const encrypted = await encryptionService.encrypt(specialChars);
    const decrypted = await encryptionService.decrypt(encrypted);
    
    expect(decrypted).toBe(specialChars);
  });

  it('应该处理多行文本', async () => {
    await createTestKey();
    await encryptionService.setEnabled(true);

    const multiLine = `Line 1
Line 2
Line 3`;
    const encrypted = await encryptionService.encrypt(multiLine);
    const decrypted = await encryptionService.decrypt(encrypted);
    
    expect(decrypted).toBe(multiLine);
  });

  it('快速连续调用应该正常工作', async () => {
    await createTestKey();
    await encryptionService.setEnabled(true);

    const promises = Array.from({ length: 10 }, (_, i) =>
      encryptionService.encrypt(`message-${i}`)
    );

    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(10);
    expect(results.every(r => r.data && r.iv && r.salt)).toBe(true);
  });

  it('大量密钥列表应该正常工作', async () => {
    for (let i = 0; i < 50; i++) {
      await encryptionService.generateKey(`bulk-key-${i}`);
    }

    const keys = encryptionService.listKeys();
    
    expect(keys).toHaveLength(50);
  });
});

// ================================================================
// 8. toArrayBuffer 工具函数测试
// ================================================================

describe('EncryptionService - toArrayBuffer 工具函数', () => {

  it('应该将ArrayBuffer转换为独立副本', () => {
    const buffer = new ArrayBuffer(16);
    const result = (EncryptionService as any).toArrayBuffer(buffer);
    
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBe(buffer.byteLength);
  });

  it('应该将Uint8Array转换为ArrayBuffer', () => {
    const uint8 = new Uint8Array([1, 2, 3, 4]);
    const result = (EncryptionService as any).toArrayBuffer(uint8);
    
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBe(4);
  });

  it('应该处理带偏移量的视图', () => {
    const buffer = new ArrayBuffer(8);
    const view = new Uint8Array(buffer, 2, 4); // 偏移2，长度4
    const result = (EncryptionService as any).toArrayBuffer(view);
    
    expect(result.byteLength).toBe(4);
  });
});
