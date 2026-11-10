"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Webhook,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Plus,
  Edit,
  Eye,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Search,
  Activity,
  Shield,
  Key,
  Globe,
} from "lucide-react"

interface WebhookEndpoint {
  id: string
  name: string
  url: string
  description: string
  status: "active" | "inactive" | "failed" | "paused"
  events: string[]
  method: "POST" | "PUT" | "PATCH"
  headers: Record<string, string>
  authentication: {
    type: "none" | "basic" | "bearer" | "signature"
    credentials?: Record<string, string>
  }
  retryPolicy: {
    maxRetries: number
    backoffMultiplier: number
    initialDelay: number
  }
  timeout: number
  createdAt: string
  lastTriggered?: string
  statistics: {
    totalDeliveries: number
    successfulDeliveries: number
    failedDeliveries: number
    averageResponseTime: number
  }
  isActive: boolean
}

interface WebhookDelivery {
  id: string
  webhookId: string
  event: string
  status: "pending" | "success" | "failed" | "retrying"
  attempts: number
  maxAttempts: number
  responseCode?: number
  responseTime?: number
  errorMessage?: string
  payload: any
  createdAt: string
  deliveredAt?: string
  nextRetryAt?: string
}

const mockWebhooks: WebhookEndpoint[] = [
  {
    id: "1",
    name: "订单状态通知",
    url: "https://api.partner.com/webhooks/orders",
    description: "当订单状态发生变化时发送通知",
    status: "active",
    events: ["order.created", "order.updated", "order.cancelled"],
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Version": "v1",
    },
    authentication: {
      type: "bearer",
      credentials: {
        token: "***hidden***",
      },
    },
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000,
    },
    timeout: 30000,
    createdAt: "2023-12-15",
    lastTriggered: "2024-01-20 15:30",
    statistics: {
      totalDeliveries: 1250,
      successfulDeliveries: 1198,
      failedDeliveries: 52,
      averageResponseTime: 245,
    },
    isActive: true,
  },
  {
    id: "2",
    name: "用户注册通知",
    url: "https://crm.company.com/api/webhooks/users",
    description: "新用户注册时同步到CRM系统",
    status: "active",
    events: ["user.created", "user.updated"],
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    authentication: {
      type: "signature",
      credentials: {
        secret: "***hidden***",
      },
    },
    retryPolicy: {
      maxRetries: 5,
      backoffMultiplier: 1.5,
      initialDelay: 500,
    },
    timeout: 15000,
    createdAt: "2024-01-10",
    lastTriggered: "2024-01-20 14:45",
    statistics: {
      totalDeliveries: 456,
      successfulDeliveries: 445,
      failedDeliveries: 11,
      averageResponseTime: 180,
    },
    isActive: true,
  },
  {
    id: "3",
    name: "支付结果通知",
    url: "https://payment.service.com/webhooks/callback",
    description: "支付完成后通知第三方服务",
    status: "failed",
    events: ["payment.completed", "payment.failed"],
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic ***hidden***",
    },
    authentication: {
      type: "basic",
      credentials: {
        username: "webhook_user",
        password: "***hidden***",
      },
    },
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 2000,
    },
    timeout: 20000,
    createdAt: "2023-11-20",
    lastTriggered: "2024-01-19 10:20",
    statistics: {
      totalDeliveries: 89,
      successfulDeliveries: 67,
      failedDeliveries: 22,
      averageResponseTime: 890,
    },
    isActive: false,
  },
]

const mockDeliveries: WebhookDelivery[] = [
  {
    id: "1",
    webhookId: "1",
    event: "order.created",
    status: "success",
    attempts: 1,
    maxAttempts: 3,
    responseCode: 200,
    responseTime: 234,
    payload: {
      orderId: "ORD-12345",
      status: "created",
      amount: 299.99,
    },
    createdAt: "2024-01-20 15:30:00",
    deliveredAt: "2024-01-20 15:30:01",
  },
  {
    id: "2",
    webhookId: "2",
    event: "user.created",
    status: "success",
    attempts: 1,
    maxAttempts: 5,
    responseCode: 201,
    responseTime: 156,
    payload: {
      userId: "USR-67890",
      email: "user@example.com",
      name: "张三",
    },
    createdAt: "2024-01-20 14:45:00",
    deliveredAt: "2024-01-20 14:45:01",
  },
  {
    id: "3",
    webhookId: "3",
    event: "payment.completed",
    status: "failed",
    attempts: 3,
    maxAttempts: 3,
    responseCode: 500,
    errorMessage: "Internal Server Error",
    payload: {
      paymentId: "PAY-54321",
      amount: 199.99,
      status: "completed",
    },
    createdAt: "2024-01-19 10:20:00",
    nextRetryAt: "2024-01-19 10:28:00",
  },
]

const availableEvents = [
  "user.created",
  "user.updated",
  "user.deleted",
  "order.created",
  "order.updated",
  "order.cancelled",
  "payment.completed",
  "payment.failed",
  "product.created",
  "product.updated",
  "inventory.low",
  "system.maintenance",
]

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(mockWebhooks)
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>(mockDeliveries)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEndpoint | null>(null)

  const filteredWebhooks = webhooks.filter((webhook) => {
    const matchesSearch =
      webhook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      webhook.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      webhook.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = selectedStatus === "all" || webhook.status === selectedStatus

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: WebhookEndpoint["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">活跃</Badge>
      case "inactive":
        return <Badge variant="secondary">非活跃</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800">失败</Badge>
      case "paused":
        return <Badge className="bg-yellow-100 text-yellow-800">暂停</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getDeliveryStatusBadge = (status: WebhookDelivery["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">成功</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800">失败</Badge>
      case "pending":
        return <Badge className="bg-blue-100 text-blue-800">待发送</Badge>
      case "retrying":
        return <Badge className="bg-yellow-100 text-yellow-800">重试中</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getStatusIcon = (status: WebhookEndpoint["status"]) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "inactive":
        return <Clock className="w-4 h-4 text-gray-600" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "paused":
        return <Pause className="w-4 h-4 text-yellow-600" />
      default:
        return <Eye className="w-4 h-4 text-gray-600" />
    }
  }

  const getAuthBadge = (type: WebhookEndpoint["authentication"]["type"]) => {
    switch (type) {
      case "none":
        return <Badge variant="outline">无认证</Badge>
      case "basic":
        return <Badge className="bg-blue-100 text-blue-800">Basic</Badge>
      case "bearer":
        return <Badge className="bg-purple-100 text-purple-800">Bearer</Badge>
      case "signature":
        return <Badge className="bg-green-100 text-green-800">签名</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const handleWebhookAction = (webhookId: string, action: string) => {
    setWebhooks((prev) =>
      prev.map((webhook) => {
        if (webhook.id === webhookId) {
          switch (action) {
            case "activate":
              return { ...webhook, status: "active" as const, isActive: true }
            case "deactivate":
              return { ...webhook, status: "inactive" as const, isActive: false }
            case "pause":
              return { ...webhook, status: "paused" as const }
            case "test":
              setSelectedWebhook(webhook)
              setShowTestDialog(true)
              return webhook
            default:
              return webhook
          }
        }
        return webhook
      }),
    )
  }

  const totalDeliveries = webhooks.reduce((sum, webhook) => sum + webhook.statistics.totalDeliveries, 0)
  const successfulDeliveries = webhooks.reduce((sum, webhook) => sum + webhook.statistics.successfulDeliveries, 0)
  const failedDeliveries = webhooks.reduce((sum, webhook) => sum + webhook.statistics.failedDeliveries, 0)
  const successRate = totalDeliveries > 0 ? ((successfulDeliveries / totalDeliveries) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center">
            <Webhook className="h-8 w-8 mr-3 text-primary-600" />
            Webhook管理
          </h2>
          <p className="text-muted-foreground">管理和监控Webhook端点和消息投递</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            投递日志
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>创建新的Webhook</DialogTitle>
                <DialogDescription>配置Webhook端点和事件订阅</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-name">Webhook名称</Label>
                    <Input id="webhook-name" placeholder="输入Webhook名称" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">目标URL</Label>
                    <Input id="webhook-url" placeholder="https://api.example.com/webhook" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-description">描述</Label>
                  <Textarea id="webhook-description" placeholder="描述Webhook的用途" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>HTTP方法</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="选择方法" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>认证方式</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="选择认证方式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无认证</SelectItem>
                        <SelectItem value="basic">Basic认证</SelectItem>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="signature">签名验证</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>订阅事件</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {availableEvents.map((event) => (
                      <div key={event} className="flex items-center space-x-2">
                        <Switch />
                        <Label className="text-sm">{event}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeout">超时时间 (毫秒)</Label>
                    <Input id="timeout" type="number" placeholder="30000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-retries">最大重试次数</Label>
                    <Input id="max-retries" type="number" placeholder="3" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button onClick={() => setShowCreateDialog(false)}>创建Webhook</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃Webhook</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{webhooks.filter((w) => w.status === "active").length}</div>
            <p className="text-xs text-muted-foreground">共 {webhooks.length} 个Webhook</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总投递数</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeliveries.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+8.2% 较昨日</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成功率</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">{successfulDeliveries} 成功投递</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">失败投递</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedDeliveries}</div>
            <p className="text-xs text-muted-foreground">需要关注</p>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="搜索Webhook名称、URL或描述..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">活跃</SelectItem>
              <SelectItem value="inactive">非活跃</SelectItem>
              <SelectItem value="failed">失败</SelectItem>
              <SelectItem value="paused">暂停</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Webhook管理选项卡 */}
      <Tabs defaultValue="webhooks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="webhooks">Webhook列表</TabsTrigger>
          <TabsTrigger value="deliveries">投递日志</TabsTrigger>
          <TabsTrigger value="events">事件管理</TabsTrigger>
          <TabsTrigger value="security">安全设置</TabsTrigger>
        </TabsList>

        {/* Webhook列表 */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="grid gap-4">
            {filteredWebhooks.map((webhook) => (
              <Card key={webhook.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {getStatusIcon(webhook.status)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{webhook.name}</h3>
                          {getStatusBadge(webhook.status)}
                          {getAuthBadge(webhook.authentication.type)}
                          <Badge variant="outline" className="text-xs">
                            {webhook.method}
                          </Badge>
                        </div>

                        <div className="flex items-center space-x-4 mb-3 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Globe className="w-4 h-4" />
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{webhook.url}</code>
                          </div>
                          <span>创建: {webhook.createdAt}</span>
                          {webhook.lastTriggered && <span>最后触发: {webhook.lastTriggered}</span>}
                        </div>

                        <p className="text-muted-foreground mb-3">{webhook.description}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div className="text-sm">
                            <span className="text-muted-foreground">总投递:</span>
                            <span className="ml-1 font-medium">
                              {webhook.statistics.totalDeliveries.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">成功率:</span>
                            <span className="ml-1 font-medium text-green-600">
                              {webhook.statistics.totalDeliveries > 0
                                ? (
                                    (webhook.statistics.successfulDeliveries / webhook.statistics.totalDeliveries) *
                                    100
                                  ).toFixed(1)
                                : "0"}
                              %
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">响应时间:</span>
                            <span className="ml-1 font-medium">{webhook.statistics.averageResponseTime}ms</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">超时:</span>
                            <span className="ml-1 font-medium">{webhook.timeout / 1000}s</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                          <span>重试策略: 最多{webhook.retryPolicy.maxRetries}次</span>
                          <span>事件: {webhook.events.length}个</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {webhook.events.slice(0, 3).map((event, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                          {webhook.events.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{webhook.events.length - 3} 更多
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleWebhookAction(webhook.id, "test")}
                        title="测试"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="查看详情">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="编辑">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="设置">
                        <Settings className="w-4 h-4" />
                      </Button>
                      {webhook.status === "active" ? (
                        <Button variant="outline" size="sm" onClick={() => handleWebhookAction(webhook.id, "pause")}>
                          <Pause className="w-4 h-4 mr-1" />
                          暂停
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => handleWebhookAction(webhook.id, "activate")}>
                          <Play className="w-4 h-4 mr-1" />
                          激活
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 投递日志 */}
        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>投递日志</CardTitle>
              <CardDescription>查看Webhook消息投递的详细记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deliveries.map((delivery) => (
                  <div key={delivery.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col items-center">
                        {delivery.status === "success" ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : delivery.status === "failed" ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : delivery.status === "retrying" ? (
                          <RefreshCw className="w-5 h-5 text-yellow-600 animate-spin" />
                        ) : (
                          <Clock className="w-5 h-5 text-blue-600" />
                        )}
                        <span className="text-xs text-muted-foreground mt-1">
                          {delivery.attempts}/{delivery.maxAttempts}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">{delivery.event}</span>
                          {getDeliveryStatusBadge(delivery.status)}
                          {delivery.responseCode && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                delivery.responseCode < 300
                                  ? "text-green-600"
                                  : delivery.responseCode < 400
                                    ? "text-blue-600"
                                    : "text-red-600"
                              }`}
                            >
                              {delivery.responseCode}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span>创建: {delivery.createdAt}</span>
                          {delivery.deliveredAt && <span className="ml-4">投递: {delivery.deliveredAt}</span>}
                          {delivery.responseTime && <span className="ml-4">耗时: {delivery.responseTime}ms</span>}
                        </div>
                        {delivery.errorMessage && (
                          <div className="text-sm text-red-600 mt-1">{delivery.errorMessage}</div>
                        )}
                        {delivery.nextRetryAt && (
                          <div className="text-sm text-yellow-600 mt-1">下次重试: {delivery.nextRetryAt}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" title="查看载荷">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {delivery.status === "failed" && (
                        <Button variant="outline" size="sm" title="重新发送">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 事件管理 */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>事件管理</CardTitle>
              <CardDescription>管理系统支持的Webhook事件类型</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {availableEvents.map((event) => (
                  <div key={event} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{event}</h4>
                      <p className="text-sm text-muted-foreground">
                        {event.includes("user")
                          ? "用户相关事件"
                          : event.includes("order")
                            ? "订单相关事件"
                            : event.includes("payment")
                              ? "支付相关事件"
                              : "系统事件"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {webhooks.filter((w) => w.events.includes(event)).length} 订阅
                      </Badge>
                      <Switch defaultChecked />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 安全设置 */}
        <TabsContent value="security" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  安全策略
                </CardTitle>
                <CardDescription>配置Webhook安全和验证策略</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>签名验证</Label>
                    <p className="text-sm text-muted-foreground">验证Webhook请求签名</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>IP白名单</Label>
                    <p className="text-sm text-muted-foreground">限制允许的IP地址</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>HTTPS强制</Label>
                    <p className="text-sm text-muted-foreground">仅允许HTTPS端点</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label>默认超时时间 (秒)</Label>
                  <Input type="number" defaultValue="30" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="w-5 h-5 mr-2" />
                  重试策略
                </CardTitle>
                <CardDescription>配置失败重试和错误处理</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>默认最大重试次数</Label>
                  <Input type="number" defaultValue="3" />
                </div>
                <div className="space-y-2">
                  <Label>初始延迟 (毫秒)</Label>
                  <Input type="number" defaultValue="1000" />
                </div>
                <div className="space-y-2">
                  <Label>退避倍数</Label>
                  <Input type="number" step="0.1" defaultValue="2.0" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>自动禁用失败端点</Label>
                    <p className="text-sm text-muted-foreground">连续失败后自动禁用</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 测试Webhook对话框 */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>测试Webhook - {selectedWebhook?.name}</DialogTitle>
            <DialogDescription>发送测试消息到Webhook端点</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>测试事件</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择测试事件" />
                </SelectTrigger>
                <SelectContent>
                  {selectedWebhook?.events.map((event) => (
                    <SelectItem key={event} value={event}>
                      {event}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>测试载荷</Label>
              <Textarea
                placeholder="输入JSON格式的测试数据"
                defaultValue={JSON.stringify(
                  {
                    event: "test.webhook",
                    timestamp: new Date().toISOString(),
                    data: {
                      message: "这是一个测试消息",
                    },
                  },
                  null,
                  2,
                )}
                className="font-mono text-sm"
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              取消
            </Button>
            <Button onClick={() => setShowTestDialog(false)}>
              <Send className="w-4 h-4 mr-2" />
              发送测试
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
