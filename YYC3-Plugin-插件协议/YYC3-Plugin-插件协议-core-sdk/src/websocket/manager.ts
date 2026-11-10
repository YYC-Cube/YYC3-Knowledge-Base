/**
 * @description WebSocket 管理器 · 提供非 React 环境下的 WebSocket 高级管理功能
 * @module @yyc3/core/websocket/manager
 */

import type {
  WebSocketConfig,
  WebSocketConnectionInfo,
  WebSocketStatistics,
  WebSocketMessage,
  WebSocketMessageType,
} from './types';

export interface WebSocketManager {
  connection: WebSocketConnectionInfo;
  statistics: WebSocketStatistics;
  send: <T = unknown>(type: WebSocketMessageType, data: T) => void;
  connect: () => void;
  disconnect: () => void;
  resetStatistics: () => void;
}

export function createWebSocketManager(config: WebSocketConfig): WebSocketManager {
  return {
    connection: {
      state: 'disconnected',
      connectedDuration: 0,
      reconnectAttempts: 0,
      serverUrl: config.url,
    },
    statistics: {
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      errorCount: 0,
      averageLatency: 0,
      lastActivityAt: new Date(),
    },
    send: () => {},
    connect: () => {},
    disconnect: () => {},
    resetStatistics: () => {},
  };
}
