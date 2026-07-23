export interface WebSocketMessage {
  type: "ticket_created" | "ticket_updated" | "ticket_assigned" | "ticket_message" | "notification"
  payload: any
  timestamp: string
  userId?: string
  ticketId?: string
}

export interface WebSocketClient {
  id: string
  userId: string
  roles: string[]
  departments: string[]
  connectedAt: string
  lastHeartbeat: string
}

export interface NotificationPayload {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  priority: "low" | "medium" | "high"
  actionUrl?: string
  metadata?: Record<string, any>
}

export interface TicketUpdatePayload {
  ticketId: string
  ticketNumber: string
  action: "created" | "updated" | "assigned" | "status_changed" | "message_added"
  oldValue?: any
  newValue?: any
  updatedBy: string
  updatedByName: string
  timestamp: string
}

export interface HeartbeatMessage {
  type: "heartbeat"
  timestamp: string
  clientId: string
}

export interface AuthenticationMessage {
  type: "authenticate"
  token: string
}

export interface SubscriptionMessage {
  type: "subscribe" | "unsubscribe"
  channels: string[]
}
