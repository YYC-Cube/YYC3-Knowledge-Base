/**
 * @file: SnapshotManager.ts
 * @description: 快照管理器，支持增量存储（Delta Snapshot），仅保存与前一版本的差异，
 *              大幅减少存储空间。恢复时通过链式应用差异重建完整内容。
 *              支持 localStorage 持久化、快照比较、基准快照自动合并
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-03-31
 * @updated: 2026-04-17
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: snapshot,manager,restore,compare,persistence,delta,incremental
 */

import type { DevicePreset } from "./types/previewTypes";
import { logger } from "./services/Logger";

export interface SnapshotFile {
  path: string;
  content: string;
  hash: string;
}

export interface FileDelta {
  path: string;
  type: "added" | "removed" | "modified" | "unchanged";
  patches: TextPatch[];
  hash: string;
}

export interface TextPatch {
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
  content: string;
}

export interface SnapshotMetadata {
  totalFiles: number;
  totalLines: number;
  device?: DevicePreset;
  zoom?: number;
  tags?: string[];
  description?: string;
  isDelta: boolean;
  baseSnapshotId?: string;
  compressionRatio?: number;
}

export interface Snapshot {
  id: string;
  label: string;
  timestamp: number;
  files: SnapshotFile[];
  deltas?: FileDelta[];
  metadata: SnapshotMetadata;
}

export interface SnapshotComparison {
  added: string[];
  removed: string[];
  modified: string[];
  unchanged: string[];
}

type PatchOp = "equal" | "insert" | "delete";

interface DiffOp {
  op: PatchOp;
  lines: string[];
}

export class SnapshotManager {
  private snapshots: Map<string, Snapshot> = new Map();
  private readonly MAX_SNAPSHOTS = 50;
  private readonly STORAGE_KEY = "yyc3_snapshots";
  private readonly DELTA_THRESHOLD = 0.5;

  constructor() {
    this.loadFromStorage();
    logger.warn('Initialized with ${this.snapshots.size} snapshots');
  }

  createSnapshot(
    label: string,
    files: Array<{ path: string; content: string }>,
    metadata?: Partial<SnapshotMetadata>,
  ): Snapshot {
    const timestamp = Date.now();
    const id = `snap_${timestamp}_${Math.random().toString(36).slice(2, 9)}`;

    const totalLines = files.reduce((sum, f) =>
      sum + f.content.split('\n').length, 0
    );

    const sortedSnapshots = this.listSnapshots();
    const previousSnapshot = sortedSnapshots.length > 0 ? sortedSnapshots[0] : null;

    let snapshot: Snapshot;

    if (previousSnapshot && this.canUseDelta(previousSnapshot, files)) {
      const deltas = this.computeDeltas(previousSnapshot.files, files);
      const baseFiles = previousSnapshot.metadata.isDelta
        ? this.reconstructBaseFiles(previousSnapshot)
        : previousSnapshot.files;

      const fullFiles = files.map(f => ({
        path: f.path,
        content: f.content,
        hash: this.calculateHash(f.content),
      }));

      const deltaSize = JSON.stringify(deltas).length;
      const fullSize = JSON.stringify(fullFiles).length;
      const compressionRatio = fullSize > 0 ? deltaSize / fullSize : 1;

      if (compressionRatio < this.DELTA_THRESHOLD) {
        snapshot = {
          id,
          label,
          timestamp,
          files: fullFiles,
          deltas,
          metadata: {
            totalFiles: files.length,
            totalLines,
            isDelta: true,
            baseSnapshotId: previousSnapshot.id,
            compressionRatio,
            ...metadata,
          },
        };
        logger.warn('Created delta snapshot: ${id} (${(compressionRatio * 100).toFixed(1)}% of full)');
      } else {
        snapshot = {
          id,
          label,
          timestamp,
          files: fullFiles,
          metadata: {
            totalFiles: files.length,
            totalLines,
            isDelta: false,
            ...metadata,
          },
        };
        logger.warn('Created full snapshot (delta ratio ${(compressionRatio * 100).toFixed(1)}% exceeds threshold)');
      }
    } else {
      const fullFiles = files.map(f => ({
        path: f.path,
        content: f.content,
        hash: this.calculateHash(f.content),
      }));

      snapshot = {
        id,
        label,
        timestamp,
        files: fullFiles,
        metadata: {
          totalFiles: files.length,
          totalLines,
          isDelta: false,
          ...metadata,
        },
      };
      logger.warn('Created full snapshot (no previous base): ${id}');
    }

    this.snapshots.set(id, snapshot);
    this.enforceLimit();
    this.saveToStorage();

    return snapshot;
  }

  private canUseDelta(previous: Snapshot, newFiles: Array<{ path: string; content: string }>): boolean {
    const previousPaths = new Set(previous.files.map(f => f.path));
    const newPaths = new Set(newFiles.map(f => f.path));

    const commonPaths = [...previousPaths].filter(p => newPaths.has(p));
    if (commonPaths.length === 0) return false;

    const overlapRatio = commonPaths.length / Math.max(previousPaths.size, newPaths.size);
    return overlapRatio > 0.3;
  }

  private computeDeltas(oldFiles: SnapshotFile[], newFiles: Array<{ path: string; content: string }>): FileDelta[] {
    const oldMap = new Map(oldFiles.map(f => [f.path, f]));
    const newMap = new Map(newFiles.map(f => [f.path, f]));
    const deltas: FileDelta[] = [];

    for (const [path, newFile] of newMap) {
      const oldFile = oldMap.get(path);
      const newHash = this.calculateHash(newFile.content);

      if (!oldFile) {
        deltas.push({
          path,
          type: "added",
          patches: this.computePatches("", newFile.content),
          hash: newHash,
        });
      } else if (oldFile.hash !== newHash) {
        deltas.push({
          path,
          type: "modified",
          patches: this.computePatches(oldFile.content, newFile.content),
          hash: newHash,
        });
      } else {
        deltas.push({
          path,
          type: "unchanged",
          patches: [],
          hash: newHash,
        });
      }
    }

    for (const [path] of oldMap) {
      if (!newMap.has(path)) {
        deltas.push({
          path,
          type: "removed",
          patches: [],
          hash: "",
        });
      }
    }

    return deltas;
  }

  computePatches(oldText: string, newText: string): TextPatch[] {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const ops = this.lcsDiff(oldLines, newLines);
    const patches: TextPatch[] = [];

    let oldPos = 0;
    let newPos = 0;

    for (const op of ops) {
      if (op.op === "equal") {
        oldPos += op.lines.length;
        newPos += op.lines.length;
      } else if (op.op === "delete") {
        const startOld = oldPos;
        const endOld = oldPos + op.lines.length;
        oldPos = endOld;

        const nextOp = ops[ops.indexOf(op) + 1];
        if (nextOp && nextOp.op === "insert") {
          patches.push({
            oldStart: startOld,
            oldEnd: endOld,
            newStart: newPos,
            newEnd: newPos + nextOp.lines.length,
            content: nextOp.lines.join('\n'),
          });
          newPos += nextOp.lines.length;
          ops.splice(ops.indexOf(nextOp), 1);
        } else {
          patches.push({
            oldStart: startOld,
            oldEnd: endOld,
            newStart: newPos,
            newEnd: newPos,
            content: "",
          });
        }
      } else if (op.op === "insert") {
        patches.push({
          oldStart: oldPos,
          oldEnd: oldPos,
          newStart: newPos,
          newEnd: newPos + op.lines.length,
          content: op.lines.join('\n'),
        });
        newPos += op.lines.length;
      }
    }

    return patches;
  }

  applyPatches(oldText: string, patches: TextPatch[]): string {
    const lines = oldText.split('\n');
    const sortedPatches = [...patches].sort((a, b) => a.oldStart - b.oldStart);

    let offset = 0;
    for (const patch of sortedPatches) {
      const deleteCount = patch.oldEnd - patch.oldStart;
      const insertLines = patch.content ? patch.content.split('\n') : [];

      lines.splice(patch.oldStart + offset, deleteCount, ...insertLines);
      offset += insertLines.length - deleteCount;
    }

    return lines.join('\n');
  }

  private lcsDiff(oldLines: string[], newLines: string[]): DiffOp[] {
    const m = oldLines.length;
    const n = newLines.length;

    if (m === 0 && n === 0) return [];
    if (m === 0) return [{ op: "insert", lines: [...newLines] }];
    if (n === 0) return [{ op: "delete", lines: [...oldLines] }];

    const maxLen = 5000;
    if (m > maxLen || n > maxLen) {
      return this.simpleDiff(oldLines, newLines);
    }

    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const ops: DiffOp[] = [];
    let i = m, j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        ops.unshift({ op: "equal", lines: [oldLines[i - 1]] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        if (ops.length > 0 && ops[0].op === "insert") {
          ops[0].lines.unshift(newLines[j - 1]);
        } else {
          ops.unshift({ op: "insert", lines: [newLines[j - 1]] });
        }
        j--;
      } else {
        if (ops.length > 0 && ops[0].op === "delete") {
          ops[0].lines.unshift(oldLines[i - 1]);
        } else {
          ops.unshift({ op: "delete", lines: [oldLines[i - 1]] });
        }
        i--;
      }
    }

    return this.mergeOps(ops);
  }

  private simpleDiff(oldLines: string[], newLines: string[]): DiffOp[] {
    const ops: DiffOp[] = [];
    if (oldLines.length > 0) {
      ops.push({ op: "delete", lines: [...oldLines] });
    }
    if (newLines.length > 0) {
      ops.push({ op: "insert", lines: [...newLines] });
    }
    return ops;
  }

  private mergeOps(ops: DiffOp[]): DiffOp[] {
    if (ops.length <= 1) return ops;
    const merged: DiffOp[] = [ops[0]];
    for (let i = 1; i < ops.length; i++) {
      const last = merged[merged.length - 1];
      const current = ops[i];
      if (last.op === current.op) {
        last.lines.push(...current.lines);
      } else {
        merged.push(current);
      }
    }
    return merged;
  }

  private reconstructBaseFiles(snapshot: Snapshot): SnapshotFile[] {
    if (!snapshot.metadata.isDelta) {
      return snapshot.files;
    }

    const baseId = snapshot.metadata.baseSnapshotId;
    if (!baseId) return snapshot.files;

    const baseSnapshot = this.snapshots.get(baseId);
    if (!baseSnapshot) {
      logger.warn('Base snapshot not found: ${baseId}, using current files');
      return snapshot.files;
    }

    const baseFiles = this.reconstructBaseFiles(baseSnapshot);
    return this.applyDeltasToFiles(baseFiles, snapshot.deltas || []);
  }

  private applyDeltasToFiles(baseFiles: SnapshotFile[], deltas: FileDelta[]): SnapshotFile[] {
    const fileMap = new Map(baseFiles.map(f => [f.path, f]));

    for (const delta of deltas) {
      switch (delta.type) {
        case "added": {
          const content = delta.patches.length > 0
            ? this.applyPatches("", delta.patches)
            : "";
          fileMap.set(delta.path, { path: delta.path, content, hash: delta.hash });
          break;
        }
        case "removed": {
          fileMap.delete(delta.path);
          break;
        }
        case "modified": {
          const existing = fileMap.get(delta.path);
          if (existing) {
            const content = this.applyPatches(existing.content, delta.patches);
            fileMap.set(delta.path, { path: delta.path, content, hash: delta.hash });
          }
          break;
        }
        case "unchanged":
          break;
      }
    }

    return Array.from(fileMap.values());
  }

  listSnapshots(): Snapshot[] {
    return Array.from(this.snapshots.values())
      .sort((a, b) => {
        const timeDiff = b.timestamp - a.timestamp;
        if (timeDiff !== 0) return timeDiff;
        return a.id.localeCompare(b.id);
      });
  }

  getSnapshot(id: string): Snapshot | null {
    return this.snapshots.get(id) || null;
  }

  restoreSnapshot(
    id: string,
    applyFn: (files: Array<{ path: string; content: string }>) => void,
  ): boolean {
    const snapshot = this.snapshots.get(id);
    if (!snapshot) {
      logger.warn('Snapshot not found: ${id}');
      return false;
    }

    try {
      let files: SnapshotFile[];

      if (snapshot.metadata.isDelta && snapshot.deltas) {
        files = this.reconstructBaseFiles(snapshot);
      } else {
        files = snapshot.files;
      }

      const fileData = files.map(f => ({
        path: f.path,
        content: f.content,
      }));

      applyFn(fileData);
      logger.warn('Restored snapshot: ${id} (${snapshot.label})');
      return true;
    } catch (error) {
      logger.error(`[SnapshotManager] Failed to restore snapshot: ${id}`, error);
      return false;
    }
  }

  deleteSnapshot(id: string): boolean {
    const deleted = this.snapshots.delete(id);
    if (deleted) {
      this.rebaseDanglingDeltas(id);
      this.saveToStorage();
      logger.warn('Deleted snapshot: ${id}');
    }
    return deleted;
  }

  private rebaseDanglingDeltas(deletedId: string): void {
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.metadata.baseSnapshotId === deletedId) {
        snapshot.metadata.isDelta = false;
        snapshot.metadata.baseSnapshotId = undefined;
        snapshot.deltas = undefined;
        logger.warn('Rebased delta snapshot to full: ${snapshot.id}');
      }
    }
  }

  deleteSnapshots(ids: string[]): number {
    let count = 0;
    for (const id of ids) {
      if (this.snapshots.delete(id)) count++;
    }
    if (count > 0) {
      for (const id of ids) {
        this.rebaseDanglingDeltas(id);
      }
      this.saveToStorage();
    }
    return count;
  }

  compareSnapshots(id1: string, id2: string): SnapshotComparison {
    const snap1 = this.snapshots.get(id1);
    const snap2 = this.snapshots.get(id2);
    if (!snap1) throw new Error(`Snapshot not found: ${id1}`);
    if (!snap2) throw new Error(`Snapshot not found: ${id2}`);

    const files1 = new Map(snap1.files.map(f => [f.path, f]));
    const files2 = new Map(snap2.files.map(f => [f.path, f]));

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];
    const unchanged: string[] = [];

    for (const [path, file2] of files2) {
      const file1 = files1.get(path);
      if (!file1) added.push(path);
      else if (file1.hash !== file2.hash) modified.push(path);
      else unchanged.push(path);
    }

    for (const path of files1.keys()) {
      if (!files2.has(path)) removed.push(path);
    }

    return { added, removed, modified, unchanged };
  }

  clearAll(): void {
    this.snapshots.clear();
    this.saveToStorage();
  }

  getSnapshotCount(): number {
    return this.snapshots.size;
  }

  hasSnapshot(id: string): boolean {
    return this.snapshots.has(id);
  }

  updateSnapshotLabel(id: string, label: string): boolean {
    const snapshot = this.snapshots.get(id);
    if (!snapshot) return false;
    snapshot.label = label;
    this.saveToStorage();
    return true;
  }

  private calculateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private enforceLimit(): void {
    if (this.snapshots.size > this.MAX_SNAPSHOTS) {
      const sorted = this.listSnapshots();
      const toRemove = sorted.slice(this.MAX_SNAPSHOTS);
      for (const snap of toRemove) {
        this.snapshots.delete(snap.id);
      }
      for (const snap of toRemove) {
        this.rebaseDanglingDeltas(snap.id);
      }
    }
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.snapshots.values());
      const json = JSON.stringify(data);

      const sizeInMB = (json.length * 2) / (1024 * 1024);
      if (sizeInMB > 4) {
        logger.warn('Storage size: ${sizeInMB.toFixed(2)}MB (close to limit)');
      }

      localStorage.setItem(this.STORAGE_KEY, json);
    } catch (error) {
      logger.error("[SnapshotManager] Failed to save to localStorage:", error);
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        this.compactStorage();
      }
    }
  }

  compactStorage(): void {
    const sorted = this.listSnapshots();
    if (sorted.length === 0) return;

    const first = sorted[0];
    if (first.metadata.isDelta) {
      first.metadata.isDelta = false;
      first.metadata.baseSnapshotId = undefined;
      first.deltas = undefined;
    }

    for (let i = 1; i < sorted.length; i++) {
      const snap = sorted[i];
      if (snap.metadata.isDelta && snap.deltas) {
        const baseFiles = this.reconstructBaseFiles(snap);
        snap.files = baseFiles;
        snap.metadata.isDelta = false;
        snap.metadata.baseSnapshotId = undefined;
        snap.deltas = undefined;
      }
    }

    this.saveToStorage();
    logger.warn('Compacted storage by converting deltas to full snapshots');
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return;

      const snapshots = JSON.parse(data) as Snapshot[];
      const validSnapshots = snapshots.filter(snap =>
        snap.id && snap.label && snap.timestamp && Array.isArray(snap.files)
      );

      for (const snap of validSnapshots) {
        this.snapshots.set(snap.id, snap);
      }
    } catch (error) {
      logger.error("[SnapshotManager] Failed to load from localStorage:", error);
      this.snapshots.clear();
    }
  }

  getStorageStats(): {
    snapshotCount: number;
    deltaCount: number;
    fullCount: number;
    totalFiles: number;
    totalLines: number;
    estimatedSize: string;
    averageCompressionRatio: number;
  } {
    const snapshots = this.listSnapshots();
    const deltaCount = snapshots.filter(s => s.metadata.isDelta).length;
    const fullCount = snapshots.length - deltaCount;
    const totalFiles = snapshots.reduce((sum, s) => sum + s.metadata.totalFiles, 0);
    const totalLines = snapshots.reduce((sum, s) => sum + s.metadata.totalLines, 0);

    const json = JSON.stringify(snapshots);
    const sizeInBytes = json.length * 2;
    const estimatedSize = sizeInBytes < 1024
      ? `${sizeInBytes} B`
      : sizeInBytes < 1024 * 1024
      ? `${(sizeInBytes / 1024).toFixed(2)} KB`
      : `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;

    const ratios = snapshots
      .filter(s => s.metadata.compressionRatio != null)
      .map(s => s.metadata.compressionRatio!);
    const averageCompressionRatio = ratios.length > 0
      ? ratios.reduce((a, b) => a + b, 0) / ratios.length
      : 1;

    return {
      snapshotCount: snapshots.length,
      deltaCount,
      fullCount,
      totalFiles,
      totalLines,
      estimatedSize,
      averageCompressionRatio,
    };
  }
}

export function createSnapshotManager(): SnapshotManager {
  return new SnapshotManager();
}
