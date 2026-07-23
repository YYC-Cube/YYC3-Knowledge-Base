"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { io, type Socket } from "socket.io-client"
import type { WebSocketMessage, NotificationPayload } from "@/types/websocket"

interface UseWebSocketOptions {
  url?: string
  autoConnect?: boolean
  reconnect?: boolean
  heartbeatInterval?: number
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
}

interface WebSocketHookReturn {
  isConnected: boolean
  socket: Socket | null
  subscribe: (channels: string[]) => void
  unsubscribe: (channels: string[]) => void
  sendMessage: (type: string, data: any) => void
  lastMessage: WebSocketMessage | null
  notifications: NotificationPayload[]
  clearNotifications: () => void
}

export function useWebSocket(options: UseWebSocketOptions = {}): WebSocketHookReturn {
  const {
    url = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001",
    autoConnect = true,
    reconnect = true,
    heartbeatInterval = 30000,
    onConnected,
    onDisconnected,
    onError,
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [notifications, setNotifications] = useState<NotificationPayload[]>([])
  const socketRef = useRef<Socket | null>(null)
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 获取认证 token
  const getAuthToken = useCallback((): string | null => {
    if (typeof window !== "undefined") {
      // 优先从 HttpOnly Cookie 中获取（需要服务端支持）
      // 当前实现：从存储中获取并验证 token 格式
      const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token")
      
      // 验证 token 格式，确保它是有效的 JWT 格式
      if (token && /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/.test(token)) {
        return token;
      }
    }
    return null
  }, [])

  // 发送心跳
  const sendHeartbeat = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("heartbeat", {
        type: "heartbeat",
        timestamp: new Date().toISOString(),
        clientId: socketRef.current.id,
      })
    }
  }, [])

  // 启动心跳定时器
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current)
    }
    heartbeatTimerRef.current = setInterval(sendHeartbeat, heartbeatInterval)
  }, [sendHeartbeat, heartbeatInterval])

  // 停止心跳定时器
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
  }, [])

  // 连接 WebSocket
  const connect = useCallback(() => {
    const token = getAuthToken()
    if (!token) {
      console.warn("No auth token found, cannot connect to WebSocket")
      return
    }

    socketRef.current = io(url, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: reconnect,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    const socket = socketRef.current

    // 连接成功
    socket.on("connect", () => {
      console.log("WebSocket connected", socket.id)
      setIsConnected(true)
      startHeartbeat()
      onConnected?.()
    })

    // 连接断开
    socket.on("disconnect", (reason) => {
      console.log("WebSocket disconnected", reason)
      setIsConnected(false)
      stopHeartbeat()
      onDisconnected?.()
    })

    // 连接错误
    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error", error)
      onError?.(error)
    })

    // 接收欢迎消息
    socket.on("connected", (data) => {
      console.log("WebSocket welcome message", data)
    })

    // 接收心跳响应
    socket.on("heartbeat_ack", (data) => {
      console.debug("Heartbeat acknowledged", data)
    })

    // 接收通知
    socket.on("notification", (message: WebSocketMessage) => {
      console.log("Received notification", message)
      setLastMessage(message)
      if (message.payload) {
        setNotifications((prev) => [message.payload as NotificationPayload, ...prev].slice(0, 50))
      }
    })

    // 接收工单创建事件
    socket.on("ticket_created", (message: WebSocketMessage) => {
      console.log("Ticket created", message)
      setLastMessage(message)
    })

    // 接收工单更新事件
    socket.on("ticket_updated", (message: WebSocketMessage) => {
      console.log("Ticket updated", message)
      setLastMessage(message)
    })

    // 订阅成功
    socket.on("subscribed", (data) => {
      console.log("Subscribed to channels", data)
    })

    // 取消订阅成功
    socket.on("unsubscribed", (data) => {
      console.log("Unsubscribed from channels", data)
    })

    // 订阅错误
    socket.on("subscription_error", (data) => {
      console.error("Subscription error", data)
    })
  }, [url, reconnect, getAuthToken, startHeartbeat, stopHeartbeat, onConnected, onDisconnected, onError])

  // 断开连接
  const disconnect = useCallback(() => {
    stopHeartbeat()
    socketRef.current?.disconnect()
    socketRef.current = null
    setIsConnected(false)
  }, [stopHeartbeat])

  // 订阅频道
  const subscribe = useCallback((channels: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("subscribe", { type: "subscribe", channels })
    }
  }, [])

  // 取消订阅
  const unsubscribe = useCallback((channels: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("unsubscribe", { type: "unsubscribe", channels })
    }
  }, [])

  // 发送消息
  const sendMessage = useCallback((type: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(type, data)
    }
  }, [])

  // 清除通知
  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // 自动连接
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, connect, disconnect])

  return {
    isConnected,
    socket: socketRef.current,
    subscribe,
    unsubscribe,
    sendMessage,
    lastMessage,
    notifications,
    clearNotifications,
  }
}
