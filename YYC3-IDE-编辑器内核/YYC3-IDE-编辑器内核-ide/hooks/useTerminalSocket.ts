/**
 * @file: useTerminalSocket.ts
 * @description: 终端 WebSocket 连接管理 Hook
 *              处理与后端 PTY 的双向实时通信
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-04
 * @updated: 2026-04-09
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: terminal,websocket,hook,pty,realtime
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { logger } from "../services/Logger";

interface TerminalSocketState {
  connected: boolean
  connecting: boolean
  error: string | null
  reconnectAttempts: number
}

interface UseTerminalSocketOptions {
  sessionId: string
  serverUrl?: string
  autoReconnect?: boolean
  maxReconnectAttempts?: number
  reconnectDelay?: number
  onMessage?: (data: string) => void
  onError?: (error: Event) => void
  onClose?: () => void
  onConnect?: () => void
}

interface UseTerminalSocketReturn {
  state: TerminalSocketState
  write: (data: string) => void
  resize: (cols: number, rows: number) => void
  connect: () => void
  disconnect: () => void
  reconnect: () => void
}

export function useTerminalSocket({
  sessionId,
  serverUrl = '',
  autoReconnect = true,
  maxReconnectAttempts = 5,
  reconnectDelay = 3000,
  onMessage,
  onError,
  onClose,
  onConnect,
}: UseTerminalSocketOptions): UseTerminalSocketReturn {

  const wsRef = useRef<WebSocket | null>(null)
  const [state, setState] = useState<TerminalSocketState>({
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempts: 0,
  })

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const optionsRef = useRef({
    sessionId,
    serverUrl,
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
    onMessage,
    onError,
    onClose,
    onConnect,
  })

  // 更新 options ref（避免 effect 重复触发）
  useEffect(() => {
    optionsRef.current = {
      sessionId,
      serverUrl,
      autoReconnect,
      maxReconnectAttempts,
      reconnectDelay,
      onMessage,
      onError,
      onClose,
      onConnect,
    }
  }, [sessionId, serverUrl, autoReconnect, maxReconnectAttempts, reconnectDelay, onMessage, onError, onClose, onConnect])

  // 构建 WebSocket URL
  const buildWsUrl = useCallback(() => {
    const opts = optionsRef.current

    // 自动检测当前页面协议
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

    // 使用 Vite 开发服务器或自定义 URL
    let host: string
    if (opts.serverUrl) {
      // 自定义服务器地址
      host = opts.serverUrl.replace(/^https?/, protocol === 'wss:' ? 'wss' : 'ws')
    } else {
      // 默认使用当前页面的 host
      host = `${protocol}//${window.location.host}`
    }

    return `${host}/api/terminal/ws?sid=${opts.sessionId}&t=${Date.now()}`
  }, [])

  // 建立连接
  const connect = useCallback(() => {
    const opts = optionsRef.current

    // 检查 sessionId 是否有效
    if (!opts.sessionId) {
      logger.warn('sessionId 为空，跳过连接');
      return
    }

    // 防止重复连接
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      logger.warn('已有活跃连接');
      return
    }

    setState(prev => ({ ...prev, connecting: true, error: null }))

    try {
      const url = buildWsUrl()
      logger.info('正在连接: ${url}');

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        logger.info('已连接 (Session: ${opts.sessionId})');
        setState(prev => ({
          ...prev,
          connected: true,
          connecting: false,
          error: null,
          reconnectAttempts: 0,
        }))

        if (opts.onConnect) {
          opts.onConnect()
        }
      }

      ws.onmessage = (event) => {
        // 接收 PTY 输出数据
        const data = event.data.toString()
        if (opts.onMessage) {
          opts.onMessage(data)
        }
      }

      ws.onerror = (event) => {
        logger.warn('WebSocket 连接失败 - 后端服务可能未启动');
        setState(prev => ({
          ...prev,
          connecting: false,
          error: '后端服务未启动，已切换到模拟模式',
        }))

        if (opts.onError) {
          opts.onError(event)
        }
      }

      ws.onclose = (event) => {
        logger.info(`[useTerminalSocket] 连接关闭 (Code: ${event.code}, Reason: ${event.reason})`);

        const wasConnected = state.connected
        setState(prev => ({
          ...prev,
          connected: false,
          connecting: false,
        }))

        wsRef.current = null

        if (opts.onClose && wasConnected) {
          opts.onClose()
        }

        // 自动重连逻辑
        if (autoReconnect && event.code !== 1000) { // 1000 = 正常关闭
          handleReconnect()
        }
      }

    } catch (error) {
      logger.error('[useTerminalSocket] 创建连接失败:', error);
      setState(prev => ({
        ...prev,
        connecting: false,
        error: error instanceof Error ? error.message : '未知错误',
      }))
    }
  }, [buildWsUrl, autoReconnect])

  // 断开连接
  const disconnect = useCallback((code = 1000, reason = '用户主动断开') => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      logger.info('断开连接');
      wsRef.current.close(code, reason)
      wsRef.current = null
    }

    setState({
      connected: false,
      connecting: false,
      error: null,
      reconnectAttempts: 0,
    })
  }, [])

  // 发送数据到 PTY
  const write = useCallback((data: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      logger.warn('未连接，无法发送数据');
      return
    }

    try {
      wsRef.current.send(data)
    } catch (error) {
      logger.error('[useTerminalSocket] 发送数据失败:', error);
    }
  }, [])

  // 发送终端尺寸变更
  const resize = useCallback((cols: number, rows: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    try {
      const resizeData = JSON.stringify({ type: 'resize', cols, rows })
      wsRef.current.send(resizeData)
    } catch (error) {
      logger.error('[useTerminalSocket] 发送尺寸失败:', error);
    }
  }, [])

  // 手动重连
  const reconnect = useCallback(() => {
    disconnect(4000, '手动重连')

    setTimeout(() => {
      connect()
    }, 100)
  }, [disconnect, connect])

  // 自动重连处理
  const handleReconnect = useCallback(() => {
    const opts = optionsRef.current

    setState(prev => {
      const nextAttempt = prev.reconnectAttempts + 1

      if (nextAttempt > opts.maxReconnectAttempts) {
        logger.error('达到最大重连次数 (${opts.maxReconnectAttempts})');
        return {
          ...prev,
          error: `连接失败：已达到最大重连次数 (${opts.maxReconnectAttempts})`,
        }
      }

      const delay = opts.reconnectDelay * Math.pow(1.5, prev.reconnectAttempts) // 指数退避
      logger.info('将在 ${Math.round(delay)}ms 后尝试第 ${nextAttempt} 次重连...');

      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, delay)

      return {
        ...prev,
        reconnectAttempts: nextAttempt,
        error: `正在重连... (${nextAttempt}/${opts.maxReconnectAttempts})`,
      }
    })
  }, [connect])

  // sessionId 变化时连接
  useEffect(() => {
    // 有 sessionId 时才连接
    if (sessionId && !state.connected && !state.connecting) {
      logger.info('sessionId 变化，准备连接: ${sessionId}');
      connect()
    }

    // sessionId 变化且已连接时，重新连接
    if (sessionId && state.connected) {
      disconnect(4001, 'Session 变更')
      setTimeout(() => {
        connect()
      }, 200)
    }
  }, [sessionId])  

  // 组件卸载时断开连接
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])  

  return {
    state,
    write,
    resize,
    connect,
    disconnect,
    reconnect,
  }
}

export default useTerminalSocket
