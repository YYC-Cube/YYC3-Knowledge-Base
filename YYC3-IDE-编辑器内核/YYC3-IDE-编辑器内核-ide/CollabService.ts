/**
 * @file: CollabService.ts
 * @description: Yjs 实时协作服务 — 基于 CRDT 的文档同步引擎，
 *              支持离线优先、自动重连、感知光标、冲突解决、
 *              可接入 y-websocket / y-indexeddb / y-webrtc 传输层
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-15
 * @updated: 2026-03-15
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: collaboration,yjs,crdt,realtime,sync,awareness
 */

import * as Y from "yjs";
import { logger } from "./services/Logger";
import { performMerge } from "./services/ThreeWayMerge";

// ── WebSocket Message Types ──

interface WSMessage {
  type: 'sync' | 'sync-step-1' | 'sync-step-2' | 'update' | 'awareness' | 'query-awareness' | 'heartbeat';
  payload?: unknown;
}

// ── Conflict Resolution Types ──

export interface ConflictInfo {
  id: string;
  filePath: string;
  localVersion: string;
  remoteVersion: string;
  localUserId: string;
  remoteUserId: string;
  timestamp: number;
  resolved: boolean;
}

export interface ConflictResolution {
  conflictId: string;
  strategy: 'keep-local' | 'keep-remote' | 'merge';
  mergedContent?: string;
}

// ================================================================
// CollabService — Yjs 实时协作服务
// ================================================================
//
// 架构:
//   ┌─────────────────────────────────────────┐
//   │           CollabService                  │
//   │  ┌──────────┐  ┌──────────┐  ┌───────┐ │
//   │  │ Y.Doc    │  │ Awareness│  │ Sync  │ │
//   │  │ (CRDT)   │  │ (Cursors)│  │ State │ │
//   │  └──────────┘  └──────────┘  └───────┘ │
//   └──────────────┬──────────────────────────┘
//                  ↓
//   ┌─────────────────────────────────────────┐
//   │         Transport Layer (pluggable)      │
//   │  ┌──────────┐ ┌──────────┐ ┌──────────┐│
//   │  │WebSocket │ │IndexedDB │ │  WebRTC  ││
//   │  └──────────┘ └──────────┘ └──────────┘│
//   └─────────────────────────────────────────┘
//
// 使用示例:
//   const collab = CollabService.create("doc-123", { userName: "Dev" })
//   collab.onUpdate((update) => { ... })
//   collab.getText("main").insert(0, "Hello")
//   collab.destroy()
// ================================================================

// ── Types ──

export interface CollabUser {
  id: string;
  name: string;
  color: string;
  cursor?: CursorPosition;
  lastActive: number;
}

export interface CursorPosition {
  filePath: string;
  line: number;
  column: number;
  selection?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

export interface CollabEvent {
  type:
    | "user-joined"
    | "user-left"
    | "user-cursor-moved"
    | "document-updated"
    | "conflict-detected"
    | "connection-status"
    | "sync-complete";
  payload: unknown;
}

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface CollabServiceOptions {
  userName: string;
  userColor?: string;
  serverUrl?: string;
  offlineFirst?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

// ── Default config ──

const DEFAULT_OPTIONS: Required<CollabServiceOptions> = {
  userName: "Anonymous",
  userColor: generateUserColor(),
  serverUrl: "ws://localhost:3201",
  offlineFirst: true,
  autoReconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
};

const USER_COLORS = [
  "#38bdf8",
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#e879f9",
  "#22d3ee",
  "#fb923c",
  "#4ade80",
  "#f472b6",
];

function generateUserColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

// ── CollabService Class ──

export class CollabService {
  private doc: Y.Doc;
  private documentId: string;
  private options: Required<CollabServiceOptions>;
  private connectionStatus: ConnectionStatus = "disconnected";
  private localUser: CollabUser;
  private remoteUsers = new Map<string, CollabUser>();
  private eventHandlers = new Map<string, Set<(event: CollabEvent) => void>>();
  private undoManager: Y.UndoManager | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private updateCallbacks = new Set<(update: Uint8Array) => void>();
  private ws: WebSocket | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private offlineQueue: WSMessage[] = [];
  private conflicts: Map<string, ConflictInfo> = new Map();
  private awarenessState: Map<string, unknown> = new Map();

  // ── Static factory ──

  static create(
    documentId: string,
    options: CollabServiceOptions,
  ): CollabService {
    return new CollabService(documentId, options);
  }

  private constructor(documentId: string, options: CollabServiceOptions) {
    this.documentId = documentId;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.doc = new Y.Doc();

    this.localUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: this.options.userName,
      color: this.options.userColor,
      lastActive: Date.now(),
    };

    // Listen to document updates
    this.doc.on("update", (update: Uint8Array) => {
      this.updateCallbacks.forEach((cb) => cb(update));
      this.emitEvent({
        type: "document-updated",
        payload: { size: update.length },
      });
    });

    // Connect if server URL is provided
    if (this.options.serverUrl) {
      this.connect();
    }
  }

  // ── Connection Management ──

  connect(): void {
    if (this.connectionStatus === "connected" || this.connectionStatus === "connecting") return;

    this.setConnectionStatus("connecting");

    try {
      const wsUrl = `${this.options.serverUrl.replace(/^http/, 'ws')}/collab/${this.documentId}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setConnectionStatus("connected");
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.flushOfflineQueue();
        
        this.emitEvent({
          type: "connection-status",
          payload: { status: "connected" },
        });

        const state = Y.encodeStateAsUpdate(this.doc);
        this.sendWSMessage({ type: 'sync-step-1', payload: Array.from(state) });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.handleWSMessage(message);
        } catch (e) {
          logger.error("[CollabService] Failed to parse WS message:", e);
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        logger.error("[CollabService] WebSocket error:", error);
        this.setConnectionStatus("error");
        this.emitEvent({
          type: "connection-status",
          payload: { status: "error" },
        });
      };
    } catch (error) {
      logger.error("[CollabService] Failed to create WebSocket:", error);
      this.setConnectionStatus("error");
      setTimeout(() => this.attemptReconnect(), this.options.reconnectInterval);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendWSMessage({ type: 'heartbeat' });
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendWSMessage(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.offlineQueue.push(message);
    }
  }

  private flushOfflineQueue(): void {
    while (this.offlineQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.offlineQueue.shift();
      if (message) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }

  private handleWSMessage(message: WSMessage): void {
    switch (message.type) {
      case 'sync':
      case 'sync-step-2': {
        if (!message.payload) break;
        const update = new Uint8Array(message.payload as number[]);
        Y.applyUpdate(this.doc, update);
        this.emitEvent({ type: 'sync-complete', payload: { documentId: this.documentId } });
        break;
      }
      case 'update': {
        if (!message.payload) break;
        const update = new Uint8Array(message.payload as number[]);
        Y.applyUpdate(this.doc, update);
        break;
      }
      case 'awareness': {
        if (!message.payload) break;
        const awareness = message.payload as { userId: string; user: CollabUser };
        if (awareness.userId !== this.localUser.id) {
          this.remoteUsers.set(awareness.userId, awareness.user);
          this.emitEvent({ type: 'user-cursor-moved', payload: awareness.user });
        }
        break;
      }
      case 'query-awareness': {
        this.broadcastAwareness();
        break;
      }
      case 'sync-step-1':
      case 'heartbeat':
        break;
    }
  }

  private broadcastAwareness(): void {
    this.sendWSMessage({
      type: 'awareness',
      payload: { userId: this.localUser.id, user: this.localUser },
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setConnectionStatus("disconnected");
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.emitEvent({
      type: "connection-status",
      payload: { status: "disconnected" },
    });
  }

  // ── Conflict Detection & Resolution ──

  detectConflict(filePath: string, localContent: string, remoteContent: string, remoteUserId: string): ConflictInfo | null {
    if (localContent === remoteContent) return null;

    const conflict: ConflictInfo = {
      id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      filePath,
      localVersion: localContent,
      remoteVersion: remoteContent,
      localUserId: this.localUser.id,
      remoteUserId,
      timestamp: Date.now(),
      resolved: false,
    };

    this.conflicts.set(conflict.id, conflict);
    this.emitEvent({
      type: "conflict-detected",
      payload: conflict,
    });

    return conflict;
  }

  resolveConflict(resolution: ConflictResolution): boolean {
    const conflict = this.conflicts.get(resolution.conflictId);
    if (!conflict || conflict.resolved) return false;

    let finalContent: string;

    switch (resolution.strategy) {
      case 'keep-local':
        finalContent = conflict.localVersion;
        break;
      case 'keep-remote':
        finalContent = conflict.remoteVersion;
        break;
      case 'merge':
        finalContent = resolution.mergedContent || this.autoMerge(conflict.localVersion, conflict.remoteVersion);
        break;
      default:
        return false;
    }

    this.setFileContent(conflict.filePath, finalContent);
    conflict.resolved = true;
    this.conflicts.set(conflict.id, conflict);

    return true;
  }

  private autoMerge(local: string, remote: string): string {
    const baseSnapshot = this.createSnapshot();
    const baseContent = this.getFileContentFromSnapshot(baseSnapshot.state);

    const result = performMerge(baseContent, local, remote, "auto-merge");

    if (result.hasConflicts) {
      for (const conflict of result.conflicts) {
        this.conflicts.set(conflict.id, {
          id: conflict.id,
          filePath: conflict.filePath,
          localVersion: conflict.localContent,
          remoteVersion: conflict.remoteContent,
          localUserId: this.localUser.id,
          remoteUserId: "remote",
          timestamp: Date.now(),
          resolved: false,
        });
      }

      this.emitEvent({
        type: "conflict-detected",
        payload: { conflictCount: result.conflicts.length },
      });
    }

    return result.content;
  }

  private getFileContentFromSnapshot(state: Uint8Array): string {
    try {
      const tempDoc = new Y.Doc();
      Y.applyUpdate(tempDoc, state);
      const filesMap = tempDoc.getMap("files");
      const contents: string[] = [];
      filesMap.forEach((value, key) => {
        if (value instanceof Y.Text) {
          contents.push(value.toString());
        }
      });
      tempDoc.destroy();
      return contents.join('\n');
    } catch {
      return "";
    }
  }

  getConflicts(): ConflictInfo[] {
    return Array.from(this.conflicts.values()).filter(c => !c.resolved);
  }

  getAllConflicts(): ConflictInfo[] {
    return Array.from(this.conflicts.values());
  }

  clearConflict(conflictId: string): void {
    this.conflicts.delete(conflictId);
  }

  clearAllConflicts(): void {
    this.conflicts.clear();
  }

  private attemptReconnect(): void {
    if (
      !this.options.autoReconnect ||
      this.reconnectAttempts >= this.options.maxReconnectAttempts
    ) {
      this.setConnectionStatus("error");
      return;
    }

    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.options.reconnectInterval);
  }

  private setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  // ── Document Operations ──

  getText(name: string = "main"): Y.Text {
    return this.doc.getText(name);
  }

  getMap(name: string = "meta"): Y.Map<unknown> {
    return this.doc.getMap(name);
  }

  getArray(name: string = "items"): Y.Array<unknown> {
    return this.doc.getArray(name);
  }

  getDoc(): Y.Doc {
    return this.doc;
  }

  // ── File Content Sync ──

  setFileContent(filePath: string, content: string): void {
    const filesMap = this.doc.getMap("files");
    const fileText = filesMap.get(filePath) as Y.Text | undefined;

    if (fileText) {
      this.doc.transact(() => {
        fileText.delete(0, fileText.length);
        fileText.insert(0, content);
      });
    } else {
      const newText = new Y.Text(content);
      filesMap.set(filePath, newText);
    }
  }

  getFileContent(filePath: string): string | null {
    const filesMap = this.doc.getMap("files");
    const fileText = filesMap.get(filePath) as Y.Text | undefined;
    return fileText ? fileText.toString() : null;
  }

  observeFile(
    filePath: string,
    callback: (content: string) => void,
  ): () => void {
    const filesMap = this.doc.getMap("files");
    const handler = () => {
      const fileText = filesMap.get(filePath) as Y.Text | undefined;
      if (fileText) {
        callback(fileText.toString());
      }
    };
    filesMap.observe(handler);
    return () => filesMap.unobserve(handler);
  }

  // ── Undo/Redo ──

  enableUndoManager(scope: Y.Text | Y.Array<unknown> | Y.Map<unknown>): void {
    this.undoManager = new Y.UndoManager(scope);
  }

  undo(): void {
    this.undoManager?.undo();
  }

  redo(): void {
    this.undoManager?.redo();
  }

  canUndo(): boolean {
    return this.undoManager?.canUndo() ?? false;
  }

  canRedo(): boolean {
    return this.undoManager?.canRedo() ?? false;
  }

  // ── Awareness (Cursors) ──

  updateCursor(cursor: CursorPosition): void {
    this.localUser.cursor = cursor;
    this.localUser.lastActive = Date.now();

    this.emitEvent({
      type: "user-cursor-moved",
      payload: { user: this.localUser, cursor },
    });
  }

  getLocalUser(): CollabUser {
    return { ...this.localUser };
  }

  getRemoteUsers(): CollabUser[] {
    return Array.from(this.remoteUsers.values());
  }

  getAllUsers(): CollabUser[] {
    return [this.localUser, ...this.getRemoteUsers()];
  }

  // ── Simulated Remote Users (for demo) ──

  simulateRemoteUser(user: Omit<CollabUser, "lastActive">): () => void {
    const remoteUser: CollabUser = {
      ...user,
      lastActive: Date.now(),
    };
    this.remoteUsers.set(user.id, remoteUser);

    this.emitEvent({
      type: "user-joined",
      payload: { user: remoteUser },
    });

    return () => {
      this.remoteUsers.delete(user.id);
      this.emitEvent({
        type: "user-left",
        payload: { user: remoteUser },
      });
    };
  }

  // ── Update Callbacks ──

  onUpdate(callback: (update: Uint8Array) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  // Apply remote update
  applyUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update);
  }

  // Get full document state
  getState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  // ── Event System ──

  on(eventType: string, handler: (event: CollabEvent) => void): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
    return () => this.eventHandlers.get(eventType)?.delete(handler);
  }

  private emitEvent(event: CollabEvent): void {
    this.eventHandlers.get(event.type)?.forEach((handler) => {
      try {
        handler(event);
      } catch (e) {
        logger.error("[CollabService] Event handler error:", e);
      }
    });
    // Also emit to wildcard listeners
    this.eventHandlers.get("*")?.forEach((handler) => {
      try {
        handler(event);
      } catch { /* empty */ }
    });
  }

  // ── Snapshot & Merge ──

  createSnapshot(): { id: string; state: Uint8Array; timestamp: number } {
    return {
      id: `snap-${Date.now()}`,
      state: this.getState(),
      timestamp: Date.now(),
    };
  }

  restoreFromSnapshot(state: Uint8Array): void {
    const newDoc = new Y.Doc();
    Y.applyUpdate(newDoc, state);

    // Merge snapshot into current doc
    const update = Y.encodeStateAsUpdate(newDoc);
    Y.applyUpdate(this.doc, update);
    newDoc.destroy();
  }

  // ── Statistics ──

  getStats(): {
    documentId: string;
    connectionStatus: ConnectionStatus;
    localUser: CollabUser;
    remoteUserCount: number;
    documentSize: number;
  } {
    return {
      documentId: this.documentId,
      connectionStatus: this.connectionStatus,
      localUser: this.localUser,
      remoteUserCount: this.remoteUsers.size,
      documentSize: this.getState().length,
    };
  }

  // ── Cleanup ──

  destroy(): void {
    this.disconnect();
    this.stopHeartbeat();
    this.undoManager?.destroy();
    this.doc.destroy();
    this.eventHandlers.clear();
    this.updateCallbacks.clear();
    this.remoteUsers.clear();
    this.conflicts.clear();
    this.offlineQueue = [];
    this.awarenessState.clear();
  }
}

// ── Singleton instance management ──

const instances = new Map<string, CollabService>();

export function getOrCreateCollab(
  documentId: string,
  options: CollabServiceOptions,
): CollabService {
  let instance = instances.get(documentId);
  if (!instance) {
    instance = CollabService.create(documentId, options);
    instances.set(documentId, instance);
  }
  return instance;
}

export function destroyCollab(documentId: string): void {
  const instance = instances.get(documentId);
  if (instance) {
    instance.destroy();
    instances.delete(documentId);
  }
}

export function destroyAllCollab(): void {
  instances.forEach((instance) => instance.destroy());
  instances.clear();
}
