/**
 * @file: OptimisticUpdateManager.ts
 * @description: 乐观更新管理器 - 支持乐观更新、自动回滚、事务管理
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-05
 * @updated: 2026-04-05
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: optimistic-update,rollback,transaction,state-management
 */

// ================================================================
// Optimistic Update Manager - 乐观更新管理器
// ================================================================
//
// 功能：
//   - 乐观更新执行
//   - 自动回滚机制
//   - 事务管理
//   - 更新队列
//   - 冲突检测
//   - 状态快照
//
// 使用场景：
//   - 文件操作乐观更新
//   - 数据同步乐观更新
//   - 协作编辑乐观更新
// ================================================================

// ── Types ──

export interface OptimisticUpdate<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed' | 'rolled-back';
  snapshot?: StateSnapshot;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface StateSnapshot {
  id: string;
  timestamp: number;
  state: Record<string, unknown>;
  checksum: string;
}

export interface UpdateResult<T = unknown> {
  success: boolean;
  update: OptimisticUpdate<T>;
  error?: string;
}

export interface OptimisticUpdateConfig {
  maxRetries: number;
  retryDelay: number;
  snapshotEnabled: boolean;
  conflictDetection: boolean;
  onConflict?: (update: OptimisticUpdate, conflict: ConflictInfo) => void;
  onRollback?: (update: OptimisticUpdate) => void;
  onConfirm?: (update: OptimisticUpdate) => void;
}

export interface ConflictInfo {
  type: 'concurrent-modification' | 'version-mismatch' | 'data-corruption';
  localVersion: unknown;
  remoteVersion: unknown;
  timestamp: number;
}

export type StateGetter = () => Record<string, unknown>;
export type StateSetter = (state: Record<string, unknown>) => void;

// ── Optimistic Update Manager ──

export class OptimisticUpdateManager {
  private updates: Map<string, OptimisticUpdate> = new Map();
  private snapshots: Map<string, StateSnapshot> = new Map();
  private pendingQueue: string[] = [];
  private config: OptimisticUpdateConfig;
  private getState: StateGetter;
  private setState: StateSetter;
  private updateCounter: number = 0;

  constructor(
    config: Partial<OptimisticUpdateConfig>,
    getState: StateGetter,
    setState: StateSetter
  ) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      snapshotEnabled: config.snapshotEnabled ?? true,
      conflictDetection: config.conflictDetection ?? true,
      onConflict: config.onConflict,
      onRollback: config.onRollback,
      onConfirm: config.onConfirm,
    };
    this.getState = getState;
    this.setState = setState;
  }

  // ── Core Operations ──

  async execute<T>(
    type: string,
    payload: T,
    optimisticFn: (state: Record<string, unknown>, payload: T) => Record<string, unknown>,
    confirmFn: (payload: T) => Promise<boolean>,
    rollbackFn?: (state: Record<string, unknown>, payload: T) => Record<string, unknown>
  ): Promise<UpdateResult<T>> {
    const updateId = this.generateUpdateId();
    const currentState = this.getState();

    const snapshot = this.config.snapshotEnabled
      ? this.createSnapshot(currentState)
      : undefined;

    const update: OptimisticUpdate<T> = {
      id: updateId,
      type,
      payload,
      timestamp: Date.now(),
      status: 'pending',
      snapshot,
      retryCount: 0,
      maxRetries: this.config.maxRetries,
    };

    this.updates.set(updateId, update);
    this.pendingQueue.push(updateId);

    try {
      const optimisticState = optimisticFn({ ...currentState }, payload);
      this.setState(optimisticState);

      const confirmed = await confirmFn(payload);

      if (confirmed) {
        update.status = 'confirmed';
        this.updates.set(updateId, update);
        this.removeFromQueue(updateId);
        this.config.onConfirm?.(update);
        return { success: true, update };
      }

      throw new Error('Confirmation failed');
    } catch (error) {
      update.status = 'failed';
      update.error = String(error);
      this.updates.set(updateId, update);

      const rolledBack = await this.rollback<T>(
        updateId,
        rollbackFn || this.defaultRollback
      );

      if (rolledBack) {
        update.status = 'rolled-back';
        this.config.onRollback?.(update);
      }

      return { success: false, update, error: String(error) };
    }
  }

  async executeBatch<T>(
    operations: Array<{
      type: string;
      payload: T;
      optimisticFn: (state: Record<string, unknown>, payload: T) => Record<string, unknown>;
      confirmFn: (payload: T) => Promise<boolean>;
      rollbackFn?: (state: Record<string, unknown>, payload: T) => Record<string, unknown>;
    }>
  ): Promise<UpdateResult<T>[]> {
    const results: UpdateResult<T>[] = [];
    const batchSnapshot = this.config.snapshotEnabled
      ? this.createSnapshot(this.getState())
      : undefined;

    try {
      for (const op of operations) {
        const result = await this.execute(
          op.type,
          op.payload,
          op.optimisticFn,
          op.confirmFn,
          op.rollbackFn
        );
        results.push(result);

        if (!result.success) {
          if (batchSnapshot) {
            this.restoreSnapshot(batchSnapshot);
          }
          break;
        }
      }

      return results;
    } catch (error) {
      if (batchSnapshot) {
        this.restoreSnapshot(batchSnapshot);
      }
      throw error;
    }
  }

  // ── Rollback Operations ──

  private async rollback<T>(
    updateId: string,
    rollbackFn: (state: Record<string, unknown>, payload: T) => Record<string, unknown>
  ): Promise<boolean> {
    const update = this.updates.get(updateId) as OptimisticUpdate<T> | undefined;
    if (!update || !update.snapshot) {
      return false;
    }

    try {
      const restoredState = rollbackFn(
        update.snapshot.state,
        update.payload
      );
      this.setState(restoredState);
      this.removeFromQueue(updateId);
      return true;
    } catch (error) {
      logger.error('[OptimisticUpdate] Rollback failed:', error);
      return false;
    }
  }

  private defaultRollback<T>(
    snapshotState: Record<string, unknown>,
    _payload: T
  ): Record<string, unknown> {
    return snapshotState;
  }

  // ── Retry Logic ──

  async retry<T>(
    updateId: string,
    confirmFn: (payload: T) => Promise<boolean>
  ): Promise<UpdateResult<T>> {
    const update = this.updates.get(updateId) as OptimisticUpdate<T> | undefined;
    if (!update) {
      return {
        success: false,
        update: {
          id: updateId,
          type: 'unknown',
          payload: null as T,
          timestamp: Date.now(),
          status: 'failed',
          retryCount: 0,
          maxRetries: this.config.maxRetries,
        },
        error: 'Update not found',
      };
    }

    if (update.retryCount >= update.maxRetries) {
      update.status = 'failed';
      update.error = 'Max retries exceeded';
      this.updates.set(updateId, update);
      return { success: false, update, error: update.error };
    }

    update.retryCount++;
    this.updates.set(updateId, update);

    await this.delay(this.config.retryDelay * update.retryCount);

    try {
      const confirmed = await confirmFn(update.payload);
      if (confirmed) {
        update.status = 'confirmed';
        this.updates.set(updateId, update);
        this.removeFromQueue(updateId);
        this.config.onConfirm?.(update);
        return { success: true, update };
      }
      throw new Error('Retry confirmation failed');
    } catch (error) {
      update.status = 'failed';
      update.error = String(error);
      this.updates.set(updateId, update);
      return { success: false, update, error: String(error) };
    }
  }

  // ── Conflict Detection ──

  detectConflict(updateId: string, remoteState: Record<string, unknown>): ConflictInfo | null {
    if (!this.config.conflictDetection) return null;

    const update = this.updates.get(updateId);
    if (!update || !update.snapshot) return null;

    const localChecksum = this.calculateChecksum(update.snapshot.state);
    const remoteChecksum = this.calculateChecksum(remoteState);

    if (localChecksum !== remoteChecksum) {
      const conflict: ConflictInfo = {
        type: 'concurrent-modification',
        localVersion: update.snapshot.state,
        remoteVersion: remoteState,
        timestamp: Date.now(),
      };

      this.config.onConflict?.(update, conflict);
      return conflict;
    }

    return null;
  }

  // ── Snapshot Management ──

  private createSnapshot(state: Record<string, unknown>): StateSnapshot {
    const id = `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const snapshot: StateSnapshot = {
      id,
      timestamp: Date.now(),
      state: { ...state },
      checksum: this.calculateChecksum(state),
    };
    this.snapshots.set(id, snapshot);
    return snapshot;
  }

  private restoreSnapshot(snapshot: StateSnapshot): void {
    this.setState({ ...snapshot.state });
  }

  private calculateChecksum(state: Record<string, unknown>): string {
    const str = JSON.stringify(state, Object.keys(state).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  // ── Utility Methods ──

  private generateUpdateId(): string {
    return `update-${Date.now()}-${++this.updateCounter}`;
  }

  private removeFromQueue(updateId: string): void {
    const index = this.pendingQueue.indexOf(updateId);
    if (index > -1) {
      this.pendingQueue.splice(index, 1);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Query Methods ──

  getUpdate(updateId: string): OptimisticUpdate | undefined {
    return this.updates.get(updateId);
  }

  getPendingUpdates(): OptimisticUpdate[] {
    return this.pendingQueue
      .map(id => this.updates.get(id))
      .filter((u): u is OptimisticUpdate => u !== undefined);
  }

  getUpdatesByType(type: string): OptimisticUpdate[] {
    return Array.from(this.updates.values()).filter(u => u.type === type);
  }

  getUpdatesByStatus(status: OptimisticUpdate['status']): OptimisticUpdate[] {
    return Array.from(this.updates.values()).filter(u => u.status === status);
  }

  getStats(): {
    total: number;
    pending: number;
    confirmed: number;
    failed: number;
    rolledBack: number;
  } {
    const updates = Array.from(this.updates.values());
    return {
      total: updates.length,
      pending: updates.filter(u => u.status === 'pending').length,
      confirmed: updates.filter(u => u.status === 'confirmed').length,
      failed: updates.filter(u => u.status === 'failed').length,
      rolledBack: updates.filter(u => u.status === 'rolled-back').length,
    };
  }

  // ── Cleanup ──

  clearConfirmed(maxAge: number = 3600000): void {
    const cutoff = Date.now() - maxAge;
    for (const [id, update] of this.updates) {
      if (update.status === 'confirmed' && update.timestamp < cutoff) {
        this.updates.delete(id);
        if (update.snapshot) {
          this.snapshots.delete(update.snapshot.id);
        }
      }
    }
  }

  clearAll(): void {
    this.updates.clear();
    this.snapshots.clear();
    this.pendingQueue = [];
  }
}

// ── React Hook for Optimistic Updates ──

import { useCallback, useRef } from 'react';
import { logger } from "./Logger";

export function useOptimisticUpdate<T>(
  getState: StateGetter,
  setState: StateSetter,
  config?: Partial<OptimisticUpdateConfig>
) {
  const managerRef = useRef<OptimisticUpdateManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = new OptimisticUpdateManager(config || {}, getState, setState);
  }

  const execute = useCallback(
    async (
      type: string,
      payload: T,
      optimisticFn: (state: Record<string, unknown>, payload: T) => Record<string, unknown>,
      confirmFn: (payload: T) => Promise<boolean>,
      rollbackFn?: (state: Record<string, unknown>, payload: T) => Record<string, unknown>
    ) => {
      return managerRef.current!.execute(type, payload, optimisticFn, confirmFn, rollbackFn);
    },
    []
  );

  const getPendingCount = useCallback(() => {
    return managerRef.current!.getPendingUpdates().length;
  }, []);

  const getStats = useCallback(() => {
    return managerRef.current!.getStats();
  }, []);

  return {
    execute,
    getPendingCount,
    getStats,
    manager: managerRef.current,
  };
}

// ── Export Singleton Factory ──

export function createOptimisticUpdateManager(
  getState: StateGetter,
  setState: StateSetter,
  config?: Partial<OptimisticUpdateConfig>
): OptimisticUpdateManager {
  return new OptimisticUpdateManager(config || {}, getState, setState);
}
