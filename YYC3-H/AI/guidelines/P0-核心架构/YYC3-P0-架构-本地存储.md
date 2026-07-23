# YYC3 P0-架构-本地存储

## 文档信息

| 字段 | 内容 |
|------|------|
| @file | P0-核心架构/YYC3-P0-架构-本地存储.md |
| @description | 本地存储架构 - Dexie.js + IndexedDB + AES-GCM 加密 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @status | stable |
| @tags | P0,architecture,storage,database,encryption |

---

## 架构目标

- 大容量数据存储（IndexedDB，支持数百MB到数GB）
- 数据加密保护（Web Crypto API AES-GCM）
- 版本化数据库迁移
- 高性能查询与索引
- 与宿主机文件系统同步

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Dexie.js | 3.2.4 | IndexedDB ORM |
| Web Crypto API | Browser | 数据加密 |

## 架构分层

```
应用层 → 存储服务层(加密/同步/缓存) → 数据访问层(Dexie ORM) → 存储引擎层(IndexedDB + Web Crypto)
```

---

## 数据库设计

```typescript
// src/storage/db.ts
import Dexie, { Table } from 'dexie';

export interface Note {
  id: string; title: string; content: string;
  encryptedContent?: string; createdAt: number; updatedAt: number;
  tags?: string[]; isEncrypted: boolean;
  syncStatus: 'synced' | 'pending' | 'conflict'; version: number;
}

export interface Project {
  id: string; name: string; description: string;
  createdAt: number; updatedAt: number; settings: Record<string, any>;
}

export interface FileRecord {
  id: string; name: string; path: string; content: string;
  size: number; type: string; createdAt: number; updatedAt: number;
}

export interface SyncRecord {
  id: string; entityType: 'note' | 'project' | 'file';
  entityId: string; action: 'create' | 'update' | 'delete';
  timestamp: number; status: 'pending' | 'success' | 'failed';
  errorMessage?: string;
}

export class AppDB extends Dexie {
  notes!: Table<Note, string>;
  projects!: Table<Project, string>;
  files!: Table<FileRecord, string>;
  syncRecords!: Table<SyncRecord, string>;

  constructor() {
    super('{{PROJECT_SLUG}}-db');
    this.version(1).stores({
      notes: 'id, createdAt, updatedAt, tags, syncStatus',
      projects: 'id, createdAt, updatedAt',
      files: 'id, name, type, createdAt, updatedAt',
      syncRecords: 'id, entityType, entityId, timestamp, status',
    });
    this.version(2).stores({
      notes: 'id, createdAt, updatedAt, tags, syncStatus, isEncrypted',
    });
    this.version(3).stores({
      notes: 'id, createdAt, updatedAt, tags, syncStatus, isEncrypted, version',
    });
  }
}

export const db = new AppDB();
```

## 数据加密

```typescript
// src/storage/encryption.ts
const CONFIG = { algorithm: 'AES-GCM', keyLength: 256, ivLength: 12, saltLength: 16 };

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: CONFIG.keyLength }, false, ['encrypt', 'decrypt']
  );
}

export async function encrypt(data: string, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(CONFIG.saltLength));
  const iv = crypto.getRandomValues(new Uint8Array(CONFIG.ivLength));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(data));
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decrypt(encryptedData: string, password: string, salt: string, iv: string) {
  const key = await deriveKey(password, Uint8Array.from(atob(salt), c => c.charCodeAt(0)));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: Uint8Array.from(atob(iv), c => c.charCodeAt(0)) },
    key, Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
  );
  return new TextDecoder().decode(decrypted);
}
```

## 同步服务

```typescript
// src/storage/sync.ts
export class SyncService {
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  startAutoSync() {
    if (!this.syncTimer) this.syncTimer = setInterval(() => this.sync(), 30000);
  }
  stopAutoSync() {
    if (this.syncTimer) { clearInterval(this.syncTimer); this.syncTimer = null; }
  }

  async sync(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      const pending = await db.syncRecords.where('status').equals('pending').toArray();
      for (const record of pending) { await this.syncRecord(record); }
      await db.syncRecords.where('status').equals('pending').modify({ status: 'success' });
    } catch (error) {
      await db.syncRecords.where('status').equals('pending').modify({ status: 'failed', errorMessage: String(error) });
    } finally { this.isSyncing = false; }
  }

  async createSyncRecord(entityType: string, entityId: string, action: string) {
    await db.syncRecords.add({ id: `${entityType}-${entityId}-${Date.now()}`, entityType, entityId, action, timestamp: Date.now(), status: 'pending' });
  }
}

export const syncService = new SyncService();
```

## LRU 缓存

```typescript
// src/storage/cache.ts
export class LRUCache<T> {
  private cache: Map<string, { data: T; timestamp: number }> = new Map();
  constructor(private maxSize = 100, private ttl = 300000) {}

  set(key: string, data: T) {
    this.cleanup();
    if (this.cache.size >= this.maxSize) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry || Date.now() - entry.timestamp > this.ttl) { this.cache.delete(key); return undefined; }
    this.cache.delete(key); this.cache.set(key, entry);
    return entry.data;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache) if (now - entry.timestamp > this.ttl) this.cache.delete(key);
  }
}
```

## 性能指标

| 指标 | 目标 |
|------|------|
| 单条读取延迟 | < 10ms |
| 单条写入延迟 | < 20ms |
| 批量读取 100 条 | < 100ms |
| 批量写入 100 条 | < 200ms |
| 搜索 1000 条 | < 50ms |
| 缓存命中率 | > 80% |
| 数据库大小 | < 500MB |

## 验收标准

- 笔记 CRUD 正常工作
- 加密存储正常工作
- 数据库版本迁移正常
- 同步服务正常运行
- 缓存策略有效
- 性能指标达标
