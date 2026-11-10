/**
 * @file: StorageManager.ts
 * @description: 存储空间管理器 - 支持存储空间检查、清理、监控
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-05
 * @updated: 2026-04-05
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: storage,quota,management,cleanup,monitoring
 */

// ================================================================
// Storage Manager - 存储空间管理器
// ================================================================
//
// 功能：
//   - 存储空间检查
//   - 存储配额管理
//   - 自动清理过期数据
//   - 存储使用监控
//   - 低存储警告
//   - 数据压缩
//
// 使用场景：
//   - IndexedDB存储管理
//   - LocalStorage管理
//   - 缓存管理
//   - 文件存储管理
// ================================================================

// ── Types ──

export interface StorageQuota {
  usage: number;
  quota: number;
  available: number;
  usagePercentage: number;
}

export interface StorageInfo {
  type: 'indexeddb' | 'localstorage' | 'sessionstorage' | 'cache';
  name: string;
  size: number;
  itemCount: number;
  lastAccessed?: number;
  oldestItem?: number;
}

export interface StorageWarning {
  level: 'low' | 'critical' | 'full';
  message: string;
  usagePercentage: number;
  timestamp: number;
}

export interface StorageCleanupResult {
  freedBytes: number;
  removedItems: number;
  errors: string[];
}

export interface StorageManagerConfig {
  warningThreshold: number;
  criticalThreshold: number;
  autoCleanup: boolean;
  cleanupInterval: number;
  maxAge: number;
  onWarning?: (warning: StorageWarning) => void;
  onCleanup?: (result: StorageCleanupResult) => void;
}

// ── Storage Manager ──

export class StorageManager {
  private config: StorageManagerConfig;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private lastWarning: StorageWarning | null = null;

  constructor(config: Partial<StorageManagerConfig> = {}) {
    this.config = {
      warningThreshold: config.warningThreshold ?? 80,
      criticalThreshold: config.criticalThreshold ?? 95,
      autoCleanup: config.autoCleanup ?? true,
      cleanupInterval: config.cleanupInterval ?? 3600000,
      maxAge: config.maxAge ?? 7 * 24 * 60 * 60 * 1000,
      onWarning: config.onWarning,
      onCleanup: config.onCleanup,
    };
  }

  // ── Quota Management ──

  async getQuota(): Promise<StorageQuota> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0),
        usagePercentage: estimate.quota
          ? ((estimate.usage || 0) / estimate.quota) * 100
          : 0,
      };
    }

    const localStorageSize = this.getLocalStorageSize();
    const estimatedQuota = 5 * 1024 * 1024;

    return {
      usage: localStorageSize,
      quota: estimatedQuota,
      available: estimatedQuota - localStorageSize,
      usagePercentage: (localStorageSize / estimatedQuota) * 100,
    };
  }

  async checkStorage(): Promise<StorageWarning | null> {
    const quota = await this.getQuota();

    if (quota.usagePercentage >= this.config.criticalThreshold) {
      const warning: StorageWarning = {
        level: 'critical',
        message: `存储空间严重不足！已使用 ${quota.usagePercentage.toFixed(1)}%`,
        usagePercentage: quota.usagePercentage,
        timestamp: Date.now(),
      };
      this.triggerWarning(warning);
      return warning;
    }

    if (quota.usagePercentage >= this.config.warningThreshold) {
      const warning: StorageWarning = {
        level: 'low',
        message: `存储空间不足，已使用 ${quota.usagePercentage.toFixed(1)}%`,
        usagePercentage: quota.usagePercentage,
        timestamp: Date.now(),
      };
      this.triggerWarning(warning);
      return warning;
    }

    this.lastWarning = null;
    return null;
  }

  private triggerWarning(warning: StorageWarning): void {
    if (
      this.lastWarning &&
      this.lastWarning.level === warning.level &&
      Date.now() - this.lastWarning.timestamp < 60000
    ) {
      return;
    }

    this.lastWarning = warning;
    this.config.onWarning?.(warning);

    if (warning.level === 'critical' && this.config.autoCleanup) {
      this.autoCleanup();
    }
  }

  // ── Storage Info ──

  getLocalStorageSize(): number {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          size += key.length + value.length;
        }
      }
    }
    return size * 2;
  }

  getSessionStorageSize(): number {
    let size = 0;
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key);
        if (value) {
          size += key.length + value.length;
        }
      }
    }
    return size * 2;
  }

  async getIndexedDBSize(dbName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        let size = 0;

        const objectStoreNames = Array.from(db.objectStoreNames);
        const transaction = db.transaction(objectStoreNames, 'readonly');

        for (const storeName of Array.from(db.objectStoreNames)) {
          const store = transaction.objectStore(storeName);
          const countRequest = store.count();

          countRequest.onsuccess = () => {
            const cursorRequest = store.openCursor();
            cursorRequest.onsuccess = (event: any) => {
              const cursor = event.target.result;
              if (cursor) {
                size += JSON.stringify(cursor.value).length * 2;
                cursor.continue();
              }
            };
          };
        }

        transaction.oncomplete = () => resolve(size);
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }

  async getStorageInfo(): Promise<StorageInfo[]> {
    const info: StorageInfo[] = [];

    info.push({
      type: 'localstorage',
      name: 'localStorage',
      size: this.getLocalStorageSize(),
      itemCount: localStorage.length,
    });

    info.push({
      type: 'sessionstorage',
      name: 'sessionStorage',
      size: this.getSessionStorageSize(),
      itemCount: sessionStorage.length,
    });

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        let size = 0;

        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            size += blob.size;
          }
        }

        info.push({
          type: 'cache',
          name,
          size,
          itemCount: keys.length,
        });
      }
    }

    return info;
  }

  // ── Cleanup Operations ──

  async cleanupLocalStorage(options: {
    maxAge?: number;
    excludeKeys?: string[];
    prefix?: string;
  } = {}): Promise<StorageCleanupResult> {
    const result: StorageCleanupResult = {
      freedBytes: 0,
      removedItems: 0,
      errors: [],
    };

    const { maxAge = this.config.maxAge, excludeKeys = [], prefix } = options;
    const cutoff = Date.now() - maxAge;

    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (excludeKeys.includes(key)) continue;
      if (prefix && !key.startsWith(prefix)) continue;

      try {
        const value = localStorage.getItem(key);
        if (!value) continue;

        let data: { timestamp?: number } | null = null;
        try {
          data = JSON.parse(value);
        } catch {
          continue;
        }

        if (data?.timestamp && data.timestamp < cutoff) {
          keysToRemove.push(key);
        }
      } catch (error) {
        result.errors.push(`Failed to process key ${key}: ${error}`);
      }
    }

    for (const key of keysToRemove) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          result.freedBytes += (key.length + value.length) * 2;
        }
        localStorage.removeItem(key);
        result.removedItems++;
      } catch (error) {
        result.errors.push(`Failed to remove key ${key}: ${error}`);
      }
    }

    this.config.onCleanup?.(result);
    return result;
  }

  async cleanupIndexedDB(
    dbName: string,
    storeNames?: string[],
    options: { maxAge?: number } = {}
  ): Promise<StorageCleanupResult> {
    const result: StorageCleanupResult = {
      freedBytes: 0,
      removedItems: 0,
      errors: [],
    };

    const { maxAge = this.config.maxAge } = options;
    const cutoff = Date.now() - maxAge;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const stores = storeNames || Array.from(db.objectStoreNames);

        for (const storeName of stores) {
          try {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            const index = store.index('timestamp');
            const range = IDBKeyRange.upperBound(cutoff);

            const cursorRequest = index.openCursor(range);

            cursorRequest.onsuccess = (event: any) => {
              const cursor = event.target.result;
              if (cursor) {
                result.freedBytes += JSON.stringify(cursor.value).length * 2;
                cursor.delete();
                result.removedItems++;
                cursor.continue();
              }
            };

            cursorRequest.onerror = () => {
              result.errors.push(`Failed to cleanup store ${storeName}`);
            };
          } catch (error) {
            result.errors.push(`Failed to process store ${storeName}: ${error}`);
          }
        }

        db.close();
        this.config.onCleanup?.(result);
        resolve(result);
      };
    });
  }

  async cleanupCaches(maxAge?: number): Promise<StorageCleanupResult> {
    const result: StorageCleanupResult = {
      freedBytes: 0,
      removedItems: 0,
      errors: [],
    };

    if (!('caches' in window)) {
      return result;
    }

    const cutoff = Date.now() - (maxAge || this.config.maxAge);
    const cacheNames = await caches.keys();

    for (const name of cacheNames) {
      try {
        const cache = await caches.open(name);
        const keys = await cache.keys();

        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const dateHeader = response.headers.get('date');
            if (dateHeader) {
              const date = new Date(dateHeader).getTime();
              if (date < cutoff) {
                const blob = await response.blob();
                result.freedBytes += blob.size;
                await cache.delete(request);
                result.removedItems++;
              }
            }
          }
        }
      } catch (error) {
        result.errors.push(`Failed to cleanup cache ${name}: ${error}`);
      }
    }

    this.config.onCleanup?.(result);
    return result;
  }

  async autoCleanup(): Promise<StorageCleanupResult> {
    const results = await Promise.all([
      this.cleanupLocalStorage(),
      this.cleanupCaches(),
    ]);

    return {
      freedBytes: results.reduce((sum, r) => sum + r.freedBytes, 0),
      removedItems: results.reduce((sum, r) => sum + r.removedItems, 0),
      errors: results.flatMap(r => r.errors),
    };
  }

  // ── Monitoring ──

  startMonitoring(): void {
    if (this.cleanupTimer) {
      this.stopMonitoring();
    }

    this.cleanupTimer = setInterval(async () => {
      await this.checkStorage();
      if (this.config.autoCleanup) {
        const quota = await this.getQuota();
        if (quota.usagePercentage >= this.config.warningThreshold) {
          await this.autoCleanup();
        }
      }
    }, this.config.cleanupInterval);
  }

  stopMonitoring(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // ── Utility Methods ──

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async canStore(size: number): Promise<boolean> {
    const quota = await this.getQuota();
    return quota.available >= size;
  }

  async getStorageBreakdown(): Promise<Record<string, number>> {
    const info = await this.getStorageInfo();
    const breakdown: Record<string, number> = {};

    for (const item of info) {
      breakdown[`${item.type}:${item.name}`] = item.size;
    }

    return breakdown;
  }
}

// ── Singleton Instance ──

let storageManagerInstance: StorageManager | null = null;

export function getStorageManager(config?: Partial<StorageManagerConfig>): StorageManager {
  if (!storageManagerInstance) {
    storageManagerInstance = new StorageManager(config);
  }
  return storageManagerInstance;
}

// ── React Hook ──

import { useCallback, useEffect, useState } from 'react';

export interface UseStorageManagerResult {
  quota: StorageQuota | null;
  storageInfo: StorageInfo[];
  warning: StorageWarning | null;
  isLoading: boolean;
  checkStorage: () => Promise<void>;
  cleanup: () => Promise<StorageCleanupResult>;
  formatBytes: (bytes: number) => string;
}

export function useStorageManager(
  config?: Partial<StorageManagerConfig>
): UseStorageManagerResult {
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo[]>([]);
  const [warning, setWarning] = useState<StorageWarning | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const manager = getStorageManager({
    ...config,
    onWarning: (w) => {
      setWarning(w);
      config?.onWarning?.(w);
    },
  });

  const checkStorage = useCallback(async () => {
    setIsLoading(true);
    try {
      const [quotaResult, infoResult, warningResult] = await Promise.all([
        manager.getQuota(),
        manager.getStorageInfo(),
        manager.checkStorage(),
      ]);

      setQuota(quotaResult);
      setStorageInfo(infoResult);
      setWarning(warningResult);
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const cleanup = useCallback(async () => {
    return manager.autoCleanup();
  }, [manager]);

  useEffect(() => {
    checkStorage();
    manager.startMonitoring();

    return () => {
      manager.stopMonitoring();
    };
  }, [checkStorage, manager]);

  return {
    quota,
    storageInfo,
    warning,
    isLoading,
    checkStorage,
    cleanup,
    formatBytes: manager.formatBytes.bind(manager),
  };
}

// ── Export Default ──

export default StorageManager;
