/**
 * @file: StorageManager.test.ts
 * @description: 存储空间管理器测试用例
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageManager, getStorageManager } from '../services/StorageManager';

describe('StorageManager', () => {
  let storageManager: StorageManager;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    storageManager = new StorageManager({
      warningThreshold: 80,
      criticalThreshold: 95,
      autoCleanup: false,
    });
  });

  afterEach(() => {
    storageManager.stopMonitoring();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('getLocalStorageSize', () => {
    it('should calculate localStorage size', () => {
      localStorage.setItem('test1', 'a'.repeat(100));
      localStorage.setItem('test2', 'b'.repeat(200));

      const size = storageManager.getLocalStorageSize();
      expect(size).toBeGreaterThan(0);
    });

    it('should return 0 for empty localStorage', () => {
      const size = storageManager.getLocalStorageSize();
      expect(size).toBe(0);
    });
  });

  describe('getSessionStorageSize', () => {
    it('should calculate sessionStorage size', () => {
      sessionStorage.setItem('test1', 'a'.repeat(100));

      const size = storageManager.getSessionStorageSize();
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('getQuota', () => {
    it('should return quota information', async () => {
      const quota = await storageManager.getQuota();

      expect(quota).toHaveProperty('usage');
      expect(quota).toHaveProperty('quota');
      expect(quota).toHaveProperty('available');
      expect(quota).toHaveProperty('usagePercentage');
    });

    it('should calculate available space', async () => {
      const quota = await storageManager.getQuota();

      expect(quota.available).toBe(quota.quota - quota.usage);
    });
  });

  describe('checkStorage', () => {
    it('should return null when storage is sufficient', async () => {
      const warning = await storageManager.checkStorage();

      expect(warning).toBeNull();
    });

    it('should trigger warning callback', async () => {
      const onWarning = vi.fn();
      const manager = new StorageManager({
        warningThreshold: 0,
        onWarning,
      });

      await manager.checkStorage();

      expect(onWarning).toHaveBeenCalled();
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', async () => {
      localStorage.setItem('test', 'value');
      sessionStorage.setItem('session', 'data');

      const info = await storageManager.getStorageInfo();

      expect(info.length).toBeGreaterThan(0);
      expect(info.find(i => i.type === 'localstorage')).toBeDefined();
      expect(info.find(i => i.type === 'sessionstorage')).toBeDefined();
    });

    it('should count items correctly', async () => {
      localStorage.setItem('test1', 'value1');
      localStorage.setItem('test2', 'value2');

      const info = await storageManager.getStorageInfo();
      const localStorageInfo = info.find(i => i.type === 'localstorage');

      expect(localStorageInfo?.itemCount).toBe(2);
    });
  });

  describe('cleanupLocalStorage', () => {
    it('should remove old items', async () => {
      const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000;
      localStorage.setItem('old', JSON.stringify({ timestamp: oldTimestamp, data: 'old' }));
      localStorage.setItem('new', JSON.stringify({ timestamp: Date.now(), data: 'new' }));

      const result = await storageManager.cleanupLocalStorage({ maxAge: 7 * 24 * 60 * 60 * 1000 });

      expect(result.removedItems).toBe(1);
      expect(localStorage.getItem('old')).toBeNull();
      expect(localStorage.getItem('new')).not.toBeNull();
    });

    it('should respect exclude keys', async () => {
      const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000;
      localStorage.setItem('excluded', JSON.stringify({ timestamp: oldTimestamp }));
      localStorage.setItem('normal', JSON.stringify({ timestamp: oldTimestamp }));

      const result = await storageManager.cleanupLocalStorage({
        maxAge: 7 * 24 * 60 * 60 * 1000,
        excludeKeys: ['excluded'],
      });

      expect(result.removedItems).toBe(1);
      expect(localStorage.getItem('excluded')).not.toBeNull();
    });

    it('should respect prefix filter', async () => {
      const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000;
      localStorage.setItem('cache:item1', JSON.stringify({ timestamp: oldTimestamp }));
      localStorage.setItem('data:item2', JSON.stringify({ timestamp: oldTimestamp }));

      const result = await storageManager.cleanupLocalStorage({
        maxAge: 7 * 24 * 60 * 60 * 1000,
        prefix: 'cache:',
      });

      expect(result.removedItems).toBe(1);
      expect(localStorage.getItem('cache:item1')).toBeNull();
      expect(localStorage.getItem('data:item2')).not.toBeNull();
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(storageManager.formatBytes(0)).toBe('0 Bytes');
      expect(storageManager.formatBytes(1024)).toBe('1 KB');
      expect(storageManager.formatBytes(1024 * 1024)).toBe('1 MB');
      expect(storageManager.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      expect(storageManager.formatBytes(1536)).toBe('1.5 KB');
    });
  });

  describe('canStore', () => {
    it('should return true for small sizes', async () => {
      const canStore = await storageManager.canStore(1024);
      expect(canStore).toBe(true);
    });
  });

  describe('getStorageBreakdown', () => {
    it('should return breakdown by storage type', async () => {
      localStorage.setItem('test', 'value');

      const breakdown = await storageManager.getStorageBreakdown();

      expect(breakdown).toHaveProperty('localstorage:localStorage');
    });
  });

  describe('Monitoring', () => {
    it('should start and stop monitoring', () => {
      storageManager.startMonitoring();
      storageManager.stopMonitoring();
    });
  });
});

describe('getStorageManager', () => {
  it('should return singleton instance', () => {
    const instance1 = getStorageManager();
    const instance2 = getStorageManager();

    expect(instance1).toBe(instance2);
  });
});
