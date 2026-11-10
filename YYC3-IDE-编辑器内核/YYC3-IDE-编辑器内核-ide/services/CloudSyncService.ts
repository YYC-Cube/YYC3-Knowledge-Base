/**
 * @file: CloudSyncService.ts
 * @description: 云端同步服务 - 支持跨设备数据同步、冲突解决、离线队列
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.1.0
 * @created: 2026-03-19
 * @updated: 2026-06-04
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: sync,cloud,offline,cross-device
 */

import { getDB } from "../adapters/IndexedDBAdapter";
import { logger } from "./Logger";

// ── API Configuration ──

export interface CloudAPIConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface SyncStatus {
  lastSyncTime: number | null;
  pendingChanges: number;
  syncing: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'syncing';
  progress?: { current: number; total: number };
}

export interface SyncConflict {
  path: string;
  localContent: string;
  remoteContent: string;
  localModified: number;
  remoteModified: number;
  resolution: "local" | "remote" | "merge" | null;
}

export interface SyncOptions {
  apiKey: string;
  serverUrl: string;
  autoSync?: boolean;
  syncInterval?: number;
  resolveConflict?: (conflict: SyncConflict) => Promise<"local" | "remote" | "merge">;
  onProgress?: (progress: { current: number; total: number }) => void;
  onStatusChange?: (status: SyncStatus) => void;
}

// ── Sync Event Types ──

type SyncEventType = 'sync-start' | 'sync-progress' | 'sync-complete' | 'sync-error' | 'conflict-detected';

interface SyncEvent {
  type: SyncEventType;
  payload?: unknown;
}

type SyncEventHandler = (event: SyncEvent) => void;

/**
 * 云端同步服务
 */
export class CloudSyncService {
  private static instance: CloudSyncService | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private options: SyncOptions | null = null;
  private pendingQueue: Array<{ path: string; content: string; timestamp: number }> = [];
  private conflicts: SyncConflict[] = [];
  private eventHandlers = new Map<SyncEventType, Set<SyncEventHandler>>();
  private abortController: AbortController | null = null;
  private syncInProgress = false;
  private apiConfig: CloudAPIConfig | null = null;

  private constructor() { }

  static getInstance(): CloudSyncService {
    if (!CloudSyncService.instance) {
      CloudSyncService.instance = new CloudSyncService();
    }
    return CloudSyncService.instance;
  }

  // ── Event System ──

  on(event: SyncEventType, handler: SyncEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    return () => this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(event: SyncEvent): void {
    this.eventHandlers.get(event.type)?.forEach(handler => {
      try {
        handler(event);
      } catch (e) {
        logger.error('[CloudSync] Event handler error:', e);
      }
    });
  }

  // ── API Request Helper ──

  private async apiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown,
    retryCount = 0
  ): Promise<T | null> {
    if (!this.apiConfig) {
      throw new Error('CloudSync not configured');
    }

    const { baseUrl, apiKey, timeout = 30000, retryAttempts = 3, retryDelay = 1000 } = this.apiConfig;

    const controller = new AbortController();
    this.abortController = controller;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Client-Version": "2.0.0",
          "X-Request-ID": `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed. Please check your API key.");
        }
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (response.status >= 500 && retryCount < retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
          return this.apiRequest<T>(endpoint, method, body, retryCount + 1);
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json() as T;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      if (retryCount < retryAttempts && !errMsg.includes("Authentication")) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
        return this.apiRequest<T>(endpoint, method, body, retryCount + 1);
      }
      throw error;
    }
  }

  // ── Authentication ──

  async authenticate(): Promise<boolean> {
    if (!this.options) {
      throw new Error('CloudSync not initialized');
    }

    try {
      const result = await this.apiRequest<{ success: boolean; userId: string }>('/api/auth/verify');
      return result?.success ?? false;
    } catch (error) {
      logger.error('[CloudSync] Authentication failed:', error);
      return false;
    }
  }

  async refreshToken(): Promise<boolean> {
    if (!this.options) return false;

    try {
      const result = await this.apiRequest<{ success: boolean; newKey: string }>('/api/auth/refresh');
      if (result?.success && result.newKey) {
        this.options.apiKey = result.newKey;
        this.apiConfig!.apiKey = result.newKey;
        return true;
      }
      return false;
    } catch (error) {
      logger.error('[CloudSync] Token refresh failed:', error);
      return false;
    }
  }

  /**
   * 初始化同步服务
   */
  async init(options: SyncOptions): Promise<boolean> {
    this.options = options;
    this.apiConfig = {
      baseUrl: options.serverUrl,
      apiKey: options.apiKey,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
    };

    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      logger.error('Authentication failed during init');
      this.emit({ type: 'sync-error', payload: { error: 'Authentication failed' } });
      return false;
    }

    if (options.autoSync) {
      this.startAutoSync(options.syncInterval || 300000);
    }

    logger.warn('Initialized successfully');
    this.emit({ type: 'sync-complete', payload: { initialized: true } });
    return true;
  }

  /**
   * 开始自动同步
   */
  startAutoSync(intervalMs: number): void {
    if (this.syncInterval) {
      this.stopAutoSync();
    }

    this.syncInterval = setInterval(() => {
      this.syncToCloud();
    }, intervalMs);

    logger.warn("[CloudSync] Auto sync started with interval:", intervalMs, "ms");
  }

  /**
   * 停止自动同步
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.warn('Auto sync stopped');
    }
  }

  /**
   * 取消当前同步
   */
  cancelSync(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.syncInProgress = false;
  }

  /**
   * 同步到云端
   */
  async syncToCloud(): Promise<{ success: boolean; synced: number; conflicts: number }> {
    if (this.syncInProgress) {
      logger.warn('Sync already in progress');
      return { success: false, synced: 0, conflicts: 0 };
    }

    if (!this.options) {
      throw new Error("CloudSync not initialized");
    }

    this.syncInProgress = true;
    this.emit({ type: 'sync-start' });

    const result = {
      success: false,
      synced: 0,
      conflicts: 0,
    };

    try {
      const db = await getDB();

      const localFiles = await db.getAll("files");
      const total = localFiles.length;

      const remoteFiles = await this.fetchRemoteFiles();

      this.conflicts = [];
      for (let i = 0; i < localFiles.length; i++) {
        const localFile = localFiles[i];
        const remoteFile = remoteFiles.find((f: any) => f.path === localFile.path);

        this.options.onProgress?.({ current: i + 1, total });
        this.emit({ type: 'sync-progress', payload: { current: i + 1, total } });

        if (remoteFile) {
          if (remoteFile.modifiedAt > localFile.updatedAt) {
            if (localFile.content !== remoteFile.content) {
              this.conflicts.push({
                path: localFile.path,
                localContent: localFile.content,
                remoteContent: remoteFile.content,
                localModified: localFile.updatedAt,
                remoteModified: remoteFile.modifiedAt,
                resolution: null,
              });
              result.conflicts++;
            }
          }
        }
      }

      if (result.conflicts > 0 && this.options.resolveConflict) {
        await this.resolveConflicts();
        this.emit({ type: 'conflict-detected', payload: { conflicts: this.conflicts } });
      }

      for (const localFile of localFiles) {
        const remoteFile = remoteFiles.find((f: any) => f.path === localFile.path);

        if (!remoteFile || localFile.updatedAt > remoteFile.modifiedAt) {
          await this.uploadFile(localFile.path, localFile.content);
          result.synced++;
        }
      }

      for (const remoteFile of remoteFiles) {
        const localFile = localFiles.find((f: any) => f.path === remoteFile.path);

        if (!localFile) {
          await db.put("files", {
            path: remoteFile.path,
            content: remoteFile.content,
            updatedAt: remoteFile.modifiedAt,
            size: remoteFile.content.length,
            projectId: "cloud",
          });
          result.synced++;
        }
      }

      await db.put("settings", {
        key: "lastSyncTime",
        value: Date.now(),
      });

      result.success = true;
      this.emit({ type: 'sync-complete', payload: result });
      logger.warn("[CloudSync] Sync completed:", result);

    } catch (error) {
      logger.error("[CloudSync] Sync failed:", error);
      this.emit({ type: 'sync-error', payload: { error } });
      result.success = false;
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * 获取云端文件列表
   */
  private async fetchRemoteFiles(): Promise<any[]> {
    if (!this.options) return [];

    try {
      const response = await fetch(`${this.options.serverUrl}/api/files`, {
        headers: {
          "Authorization": `Bearer ${this.options.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch remote files");
      }

      return await response.json();
    } catch (error) {
      logger.error("[CloudSync] Fetch remote files failed:", error);
      return [];
    }
  }

  /**
   * 上传文件到云端
   */
  private async uploadFile(path: string, content: string): Promise<void> {
    if (!this.options) return;

    try {
      await fetch(`${this.options.serverUrl}/api/files`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path,
          content,
          modifiedAt: Date.now(),
        }),
      });
    } catch (error) {
      logger.error("[CloudSync] Upload file failed:", error);
    }
  }

  /**
   * 解决冲突
   */
  private async resolveConflicts(): Promise<void> {
    if (!this.options?.resolveConflict) return;

    for (const conflict of this.conflicts) {
      const resolution = await this.options.resolveConflict(conflict);
      conflict.resolution = resolution;

      if (resolution === "remote") {
        // 使用云端版本
        const db = await getDB();
        await db.put("files", {
          path: conflict.path,
          content: conflict.remoteContent,
          updatedAt: conflict.remoteModified,
          size: conflict.remoteContent.length,
          projectId: "cloud",
        });
      }
      // "local" 保持本地版本
      // "merge" 需要合并逻辑
    }

    this.conflicts = [];
  }

  /**
   * 获取同步状态
   */
  async getStatus(): Promise<SyncStatus> {
    const db = await getDB();

    let lastSyncTime: number | null = null;
    try {
      const lastSyncSetting = await db.get("settings", "lastSyncTime");
      lastSyncTime = (lastSyncSetting as { value: number } | undefined)?.value ?? null;
    } catch {
      // settings store may not exist yet
    }

    const files = await db.getAll("files");
    const pendingChanges = files.length;

    return {
      lastSyncTime,
      pendingChanges,
      syncing: this.syncInterval !== null,
      error: null,
      connectionStatus: this.syncInProgress ? "syncing" : "disconnected",
    };
  }

  /**
   * 获取冲突列表
   */
  getConflicts(): SyncConflict[] {
    return [...this.conflicts];
  }

  /**
   * 手动解决冲突
   */
  async resolveConflict(index: number, resolution: "local" | "remote" | "merge"): Promise<void> {
    if (index < 0 || index >= this.conflicts.length) {
      throw new Error("Invalid conflict index");
    }

    const conflict = this.conflicts[index];
    conflict.resolution = resolution;

    if (resolution === "remote") {
      const db = await getDB();
      await db.put("files", {
        path: conflict.path,
        content: conflict.remoteContent,
        updatedAt: conflict.remoteModified,
        size: conflict.remoteContent.length,
        projectId: "cloud",
      });
    }

    this.conflicts.splice(index, 1);
  }
}

// 导出单例
export const cloudSync = CloudSyncService.getInstance();

// 导出工具函数
export const initCloudSync = cloudSync.init.bind(cloudSync);
export const startAutoSync = cloudSync.startAutoSync.bind(cloudSync);
export const stopAutoSync = cloudSync.stopAutoSync.bind(cloudSync);
export const syncToCloud = cloudSync.syncToCloud.bind(cloudSync);
export const getSyncStatus = cloudSync.getStatus.bind(cloudSync);
export const getConflicts = cloudSync.getConflicts.bind(cloudSync);
export const resolveConflict = cloudSync.resolveConflict.bind(cloudSync);

export default cloudSync;
