/**
 * WebSocket 消息类型定义
 */

export type WebSocketMessageType =
  | "notification"
  | "ticket_created"
  | "ticket_updated"
  | "ticket_assigned"
  | "ticket_message"
  | "reconciliation_update"
  | "system_alert"
  | "user_activity"
  | "heartbeat"
  | "subscribe"
  | "unsubscribe"

export interface WebSocketClient {
  id: string
  userId: string
  roles: string[]
  departments: string[]
  connectedAt: string
  lastHeartbeat: string
  subscriptions?: string[]
}

export interface WebSocketMessage {
  type: WebSocketMessageType
  payload: any
  timestamp: string
  userId?: string
  ticketId?: string
  channelId?: string
}

export interface NotificationPayload {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  priority: "low" | "medium" | "high" | "urgent"
  actionUrl?: string
  actionLabel?: string
  data?: Record<string, any>
  userId?: string
}

export interface TicketUpdatePayload {
  ticketId: string
  action: "created" | "updated" | "assigned" | "closed" | "reopened" | "comment_added"
  ticketNumber: string
  title: string
  status: string
  priority: string
  assignedTo?: string
  updatedBy: string
  changes?: Record<string, any>
  timestamp: string
}

export interface HeartbeatMessage {
  type: "heartbeat"
  timestamp: string
  clientId: string
}

export interface SubscriptionMessage {
  type: "subscribe" | "unsubscribe"
  channels: string[]
}

export interface ReconciliationUpdatePayload {
  recordId: string
  status: "matched" | "unmatched" | "disputed" | "resolved"
  amount: number
  currency: string
  updatedBy: string
  timestamp: string
}

export interface SystemAlertPayload {
  id: string
  severity: "info" | "warning" | "critical"
  title: string
  message: string
  affectedServices?: string[]
  timestamp: string
}

export interface UserActivityPayload {
  userId: string
  username: string
  action: string
  resource: string
  timestamp: string
}

export interface WebSocketError {
  code: string
  message: string
  details?: any
}

export interface WebSocketResponse<T = any> {
  success: boolean
  data?: T
  error?: WebSocketError
  timestamp: string
}
