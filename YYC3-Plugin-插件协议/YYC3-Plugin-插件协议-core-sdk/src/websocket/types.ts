/**
 * @description WebSocket 类型定义 · 包含所有 WebSocket 相关的 TypeScript 接口和类型
 * @module @yyc3/core/websocket/types
 */

export type WebSocketState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'failed';

export type WebSocketMessageType =
  | 'terminal_output'
  | 'docker_log'
  | 'git_operation'
  | 'system_diagnostic'
  | 'workflow_execution'
  | 'heartbeat'
  | 'error'
  | 'ping'
  | 'pong';

export interface WebSocketMessage<T = unknown> {
  id: string;
  type: WebSocketMessageType;
  data: T;
  timestamp: Date;
  source?: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  autoReconnect?: boolean;
  protocols?: string | string[];
}

export interface WebSocketConnectionInfo {
  state: WebSocketState;
  connectedDuration: number;
  reconnectAttempts: number;
  lastConnectedAt?: Date;
  lastDisconnectedAt?: Date;
  lastError?: string;
  serverUrl: string;
}

export interface WebSocketStatistics {
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  errorCount: number;
  averageLatency: number;
  lastActivityAt: Date;
}

export interface WebSocketSubscriptionOptions {
  messageTypes?: WebSocketMessageType[];
  sources?: string[];
  priorities?: ('low' | 'normal' | 'high')[];
  bufferSize?: number;
  batchProcessing?: boolean;
  batchInterval?: number;
}

export interface FallbackStrategyConfig {
  enabled: boolean;
  mode: 'polling' | 'long-polling' | 'sse';
  pollingInterval?: number;
  maxPollingFailures?: number;
  trigger: {
    connectionFailures?: number;
    timeout?: number;
  };
}

export interface TerminalOutputMessage extends WebSocketMessage<string> {
  type: 'terminal_output';
  data: string;
  terminalId?: string;
}

export interface DockerLogMessage extends WebSocketMessage<Record<string, unknown>> {
  type: 'docker_log';
  data: {
    containerId: string;
    containerName?: string;
    log: string;
    timestamp: string;
    stream?: 'stdout' | 'stderr';
  };
}

export interface GitOperationMessage extends WebSocketMessage<Record<string, unknown>> {
  type: 'git_operation';
  data: {
    repository: string;
    operation: string;
    status: 'pending' | 'success' | 'error';
    progress?: number;
    message?: string;
  };
}

export interface SystemDiagnosticMessage extends WebSocketMessage<Record<string, unknown>> {
  type: 'system_diagnostic';
  data: {
    cpu: number;
    memory: number;
    disk: number;
    network?: {
      bytesIn: number;
      bytesOut: number;
    };
  };
}

export interface WorkflowExecutionMessage extends WebSocketMessage<Record<string, unknown>> {
  type: 'workflow_execution';
  data: {
    workflowId: string;
    stepId?: string;
    status: 'running' | 'completed' | 'failed' | 'paused';
    progress?: number;
    result?: unknown;
    error?: string;
  };
}

export type WebSocketEvent =
  | { type: 'open' }
  | { type: 'close'; code: number; reason: string }
  | { type: 'error'; error: Error }
  | { type: 'message'; data: WebSocketMessage }
  | { type: 'reconnect'; attempt: number }
  | { type: 'state_change'; from: WebSocketState; to: WebSocketState };

export interface LogStreamConfig {
  source: string;
  filter?: LogStreamFilter;
  bufferSize?: number;
  batchInterval?: number;
}

export interface LogStreamFilter {
  levels?: ('info' | 'warn' | 'error' | 'debug')[];
  sources?: string[];
  keywords?: string[];
  since?: Date;
  until?: Date;
}

export interface LogStreamMessage {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
