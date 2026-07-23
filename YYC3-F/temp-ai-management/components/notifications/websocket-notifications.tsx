"use client"

import { useEffect, useState } from "react"
import { Bell, CheckCircle, AlertCircle, Info, XCircle, X } from "lucide-react"
import { useWebSocket } from "@/hooks/use-websocket"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function WebSocketNotifications() {
  const { isConnected, notifications, clearNotifications, lastMessage } = useWebSocket({
    autoConnect: true,
    onConnected: () => {
      console.log("Notifications connected")
    },
    onDisconnected: () => {
      console.log("Notifications disconnected")
    },
  })

  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setUnreadCount(notifications.length)
  }, [notifications.length])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-blue-100 text-blue-800 border-blue-200"
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return "刚刚"
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    return date.toLocaleDateString("zh-CN")
  }

  const handleClearAll = () => {
    clearNotifications()
    setUnreadCount(0)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
          <div
            className={`absolute top-1 right-1 w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"}`}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">通知中心</h3>
            <p className="text-xs text-muted-foreground">
              {isConnected ? "实时连接中" : "未连接"}
              {unreadCount > 0 && ` · ${unreadCount} 条未读`}
            </p>
          </div>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              全部已读
            </Button>
          )}
        </div>

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Bell className="w-12 h-12 mb-2 opacity-20" />
              <p className="text-sm">暂无通知</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {notifications.map((notification, index) => (
                <Card key={notification.id} className={`border ${getPriorityColor(notification.priority)}`}>
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm">{notification.title}</h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 -mt-1"
                            onClick={() => {
                              // Remove this notification
                              const newNotifications = notifications.filter((_, i) => i !== index)
                              setUnreadCount(newNotifications.length)
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatTime(notification.metadata?.timestamp || new Date().toISOString())}
                          </span>
                          {notification.actionUrl && (
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                              查看详情
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {!isConnected && (
          <div className="p-3 border-t bg-yellow-50">
            <p className="text-xs text-yellow-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              连接已断开，正在尝试重新连接...
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
