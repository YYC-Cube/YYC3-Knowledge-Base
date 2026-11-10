/**
 * @description WebSocket React Hook · 提供完整的 WebSocket 连接管理和消息订阅功能
 * @module @yyc3/core/websocket/useWebSocket
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  WebSocketState,
  WebSocketMessage,
  WebSocketMessageType,
  WebSocketConfig,
  WebSocketConnectionInfo,
  WebSocketStatistics,
  WebSocketSubscriptionOptions,
  FallbackStrategyConfig,
} from './types';

export interface UseWebSocketReturn {
  state: WebSocketState;
  connectionInfo: WebSocketConnectionInfo;
  statistics: WebSocketStatistics;
  isConnected: boolean;
  isConnecting: boolean;
  isFallbackActive: boolean;
  lastError: string | null;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  send: <T = unknown>(type: WebSocketMessageType, data: T) => void;
  subscribe: <T = unknown>(
    callback: (message: WebSocketMessage<T>) => void,
    options?: WebSocketSubscriptionOptions
  ) => () => void;
}

const DEFAULT_CONFIG: Partial<WebSocketConfig> = {
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
  heartbeatTimeout: 5000,
  autoReconnect: true,
};

const DEFAULT_FALLBACK: FallbackStrategyConfig = {
  enabled: true,
  mode: 'polling',
  pollingInterval: 5000,
  maxPollingFailures: 3,
  trigger: {
    connectionFailures: 3,
    timeout: 10000,
  },
};

export function useWebSocket(
  url: string,
  config: Partial<WebSocketConfig> = {}
): UseWebSocketReturn {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subscriptionsRef = useRef<
    Map<
      string,
      {
        callback: (message: WebSocketMessage) => void;
        options?: WebSocketSubscriptionOptions;
      }
    >
  >(new Map());

  const [state, setState] = useState<WebSocketState>('disconnected');
  const [connectionInfo, setConnectionInfo] = useState<WebSocketConnectionInfo>({
    state: 'disconnected',
    connectedDuration: 0,
    reconnectAttempts: 0,
    serverUrl: url,
  });
  const [statistics, setStatistics] = useState<WebSocketStatistics>({
    messagesSent: 0,
    messagesReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    errorCount: 0,
    averageLatency: 0,
    lastActivityAt: new Date(),
  });
  const [isFallbackActive, setIsFallbackActive] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        id: `ping_${Date.now()}`,
        type: 'ping',
        data: null,
        timestamp: new Date(),
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    heartbeatTimerRef.current = setInterval(sendHeartbeat, fullConfig.heartbeatInterval);
  }, [sendHeartbeat, fullConfig.heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const startFallback = useCallback(() => {
    if (!DEFAULT_FALLBACK.enabled) {
      return;
    }

    setIsFallbackActive(true);

    if (DEFAULT_FALLBACK.mode === 'polling') {
      fallbackTimerRef.current = setInterval(() => {}, DEFAULT_FALLBACK.pollingInterval);
    }
  }, []);

  const stopFallback = useCallback(() => {
    setIsFallbackActive(false);

    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    setStatistics((prev) => ({
      ...prev,
      messagesReceived: prev.messagesReceived + 1,
      bytesReceived: prev.bytesReceived + JSON.stringify(message).length,
      lastActivityAt: new Date(),
    }));

    subscriptionsRef.current.forEach(({ callback, options }) => {
      if (options?.messageTypes && !options.messageTypes.includes(message.type)) {
        return;
      }
      if (options?.sources && message.source && !options.sources.includes(message.source)) {
        return;
      }
      if (options?.priorities && message.priority && !options.priorities.includes(message.priority)) {
        return;
      }

      callback(message);
    });
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState('connecting');
    setConnectionInfo((prev) => ({
      ...prev,
      state: 'connecting',
    }));

    try {
      const ws = new WebSocket(url, fullConfig.protocols);

      ws.onopen = () => {
        setState('connected');
        setConnectionInfo((prev) => ({
          ...prev,
          state: 'connected',
          reconnectAttempts: 0,
          lastConnectedAt: new Date(),
        }));
        setLastError(null);
        stopFallback();
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          setStatistics((prev) => ({
            ...prev,
            errorCount: prev.errorCount + 1,
          }));
        }
      };

      ws.onerror = () => {
        setLastError('WebSocket error occurred');
        setStatistics((prev) => ({
          ...prev,
          errorCount: prev.errorCount + 1,
        }));
      };

      ws.onclose = () => {
        setState('disconnected');
        setConnectionInfo((prev) => ({
          ...prev,
          state: 'disconnected',
          lastDisconnectedAt: new Date(),
        }));
        stopHeartbeat();

        if (
          fullConfig.autoReconnect &&
          connectionInfo.reconnectAttempts < (fullConfig.maxReconnectAttempts || 5)
        ) {
          setState('reconnecting');
          setConnectionInfo((prev) => ({
            ...prev,
            state: 'reconnecting',
            reconnectAttempts: prev.reconnectAttempts + 1,
          }));

          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, fullConfig.reconnectInterval);
        } else if (connectionInfo.reconnectAttempts >= (fullConfig.maxReconnectAttempts || 5)) {
          startFallback();
        }
      };

      wsRef.current = ws;
    } catch (error) {
      setState('failed');
      setConnectionInfo((prev) => ({
        ...prev,
        state: 'failed',
        lastError: error instanceof Error ? error.message : 'Connection failed',
      }));
      setLastError(error instanceof Error ? error.message : 'Connection failed');
      startFallback();
    }
  }, [
    url,
    fullConfig,
    connectionInfo.reconnectAttempts,
    handleMessage,
    stopFallback,
    startHeartbeat,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    stopHeartbeat();
    stopFallback();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState('disconnected');
    setConnectionInfo((prev) => ({
      ...prev,
      state: 'disconnected',
      reconnectAttempts: 0,
    }));
  }, [stopHeartbeat, stopFallback]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 100);
  }, [connect, disconnect]);

  const send = useCallback(
    <T = unknown>(type: WebSocketMessageType, data: T) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const message: WebSocketMessage<T> = {
          id: `msg_${Date.now()}`,
          type,
          data,
          timestamp: new Date(),
        };

        const messageStr = JSON.stringify(message);
        wsRef.current.send(messageStr);

        setStatistics((prev) => ({
          ...prev,
          messagesSent: prev.messagesSent + 1,
          bytesSent: prev.bytesSent + messageStr.length,
          lastActivityAt: new Date(),
        }));
      }
    },
    []
  );

  const subscribe = useCallback(
    <T = unknown>(
      callback: (message: WebSocketMessage<T>) => void,
      options?: WebSocketSubscriptionOptions
    ): (() => void) => {
      const subscriptionId = `sub_${Date.now()}_${Math.random()}`;

      subscriptionsRef.current.set(subscriptionId, {
        callback: callback as (message: WebSocketMessage) => void,
        options,
      });

      return () => {
        subscriptionsRef.current.delete(subscriptionId);
      };
    },
    []
  );

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [url]);

  return {
    state,
    connectionInfo,
    statistics,
    isConnected: state === 'connected',
    isConnecting: state === 'connecting' || state === 'reconnecting',
    isFallbackActive,
    lastError,
    connect,
    disconnect,
    reconnect,
    send,
    subscribe,
  };
}
