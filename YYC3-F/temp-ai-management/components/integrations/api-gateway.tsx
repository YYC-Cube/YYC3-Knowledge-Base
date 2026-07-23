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
  Server,
  Shield,
  Key,
  Activity,
  BarChart3,
  Clock,
  Globe,
  Lock,
  Unlock,
  Plus,
  Edit,
  Eye,
  Trash2,
  Settings,
  AlertTriangle,
  TrendingUp,
  Search,
  RefreshCw,
} from "lucide-react"

interface APIEndpoint {
  id: string
  name: string
  path: string
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  description: string
  status: "active" | "inactive" | "deprecated" | "maintenance"
  version: string
  rateLimit: {
    requests: number
    window: string
  }
  authentication: "none" | "api_key" | "oauth" | "jwt"
  caching: {
    enabled: boolean
    ttl: number
  }
  monitoring: {
    uptime: number
    avgResponseTime: number
    errorRate: number
  }
  usage: {
    totalRequests: number
    dailyRequests: number
    uniqueClients: number
  }
  lastUpdated: string
  tags: string[]
  isPublic: boolean
  documentation: string
}

interface APIKey {
  id: string
  name: string
  key: string
  status: "active" | "revoked" | "expired"
  permissions: string[]
  rateLimit: {
    requests: number
    window: string
  }
  usage: {
    totalRequests: number
    lastUsed: string
  }
  expiresAt?: string
  createdAt: string
  clientInfo: {
    name: string
    type: "web" | "mobile" | "server" | "integration"
    ipWhitelist?: string[]
  }
}

const mockEndpoints: APIEndpoint[] = [
  {
    id: "1",
    name: "用户管理API",
    path: "/api/v1/users",
    method: "GET",
    description: "获取用户列表和用户信息",
    status: "active",
    version: "v1.2.0",
    rateLimit: {
      requests: 1000,
      window: "1h",
    },
    authentication: "api_key",
    caching: {
      enabled: true,
      ttl: 300,
    },
    monitoring: {
      uptime: 99.9,
      avgResponseTime: 120,
      errorRate: 0.1,
    },
    usage: {
      totalRequests: 156780,
      dailyRequests: 2340,
      uniqueClients: 45,
    },
    lastUpdated: "2024-01-20",
    tags: ["用户", "核心API"],
    isPublic: false,
    documentation: "https://docs.yanyu.cloud/api/users",
  },
  {
    id: "2",
    name: "订单处理API",
    path: "/api/v1/orders",
    method: "POST",
    description: "创建和处理订单",
    status: "active",
    version: "v2.1.0",
    rateLimit: {
      requests: 500,
      window: "1h",
    },
    authentication: "oauth",
    caching: {
      enabled: false,
      ttl: 0,
    },
    monitoring: {
      uptime: 99.8,
      avgResponseTime: 250,
      errorRate: 0.3,
    },
    usage: {
      totalRequests: 89340,
      dailyRequests: 1890,
      uniqueClients: 28,
    },
    lastUpdated: "2024-01-18",
    tags: ["订单", "支付"],
    isPublic: false,
    documentation: "https://docs.yanyu.cloud/api/orders",
  },
  {
    id: "3",
    name: "数据分析API",
    path: "/api/v1/analytics",
    method: "GET",
    description: "获取业务数据分析报告",
    status: "active",
    version: "v1.0.0",
    rateLimit: {
      requests: 100,
      window: "1h",
    },
    authentication: "jwt",
    caching: {
      enabled: true,
      ttl: 600,
    },
    monitoring: {
      uptime: 99.5,
      avgResponseTime: 800,
      errorRate: 0.5,
    },
    usage: {
      totalRequests: 23450,
      dailyRequests: 456,
      uniqueClients: 12,
    },
    lastUpdated: "2024-01-15",
    tags: ["分析", "报表"],
    isPublic: true,
    documentation: "https://docs.yanyu.cloud/api/analytics",
  },
]

const mockAPIKeys: APIKey[] = [
  {
    id: "1",
    name: "移动应用密钥",
    key: "ak_live_1234567890abcdef",
    status: "active",
    permissions: ["users:read", "orders:write", "analytics:read"],
    rateLimit: {
      requests: 10000,
      window: "1h",
    },
    usage: {
      totalRequests: 456789,
      lastUsed: "2024-01-20 15:30",
    },
    expiresAt: "2024-12-31",
    createdAt: "2023-06-15",
    clientInfo: {
      name: "YanYu Mobile App",
      type: "mobile",
      ipWhitelist: ["192.168.1.0/24"],
    },
  },
  {
    id: "2",
    name: "第三方集成密钥",
    key: "ak_live_abcdef1234567890",
    status: "active",
    permissions: ["webhooks:write", "users:read"],
    rateLimit: {
      requests: 5000,
      window: "1h",
    },
    usage: {
      totalRequests: 123456,
      lastUsed: "2024-01-20 14:45",
    },
    createdAt: "2023-09-20",
    clientInfo: {
      name: "CRM Integration",
      type: "integration",
    },
  },
  {
    id: "3",
    name: "测试环境密钥",
    key: "ak_test_fedcba0987654321",
    status: "revoked",
    permissions: ["*"],
    rateLimit: {
      requests: 1000,
      window: "1h",
    },
    usage: {
      totalRequests: 8934,
      lastUsed: "2024-01-10 09:20",
    },
    createdAt: "2023-12-01",
    clientInfo: {
      name: "Development Testing",
      type: "server",
    },
  },
]

export function APIGateway() {
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>(mockEndpoints)
  const [apiKeys, setApiKeys] = useState<APIKey[]>(mockAPIKeys)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedMethod, setSelectedMethod] = useState("all")
  const [showCreateEndpoint, setShowCreateEndpoint] = useState(false)
  const [showCreateKey, setShowCreateKey] = useState(false)
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null)

  const filteredEndpoints = endpoints.filter((endpoint) => {
    const matchesSearch =
      endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = selectedStatus === "all" || endpoint.status === selectedStatus
    const matchesMethod = selectedMethod === "all" || endpoint.method === selectedMethod

    return matchesSearch && matchesStatus && matchesMethod
  })

  const getStatusBadge = (status: APIEndpoint["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">活跃</Badge>
      case "inactive":
        return <Badge variant="secondary">非活跃</Badge>
      case "deprecated":
        return <Badge className="bg-orange-100 text-orange-800">已弃用</Badge>
      case "maintenance":
        return <Badge className="bg-blue-100 text-blue-800">维护中</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getMethodBadge = (method: APIEndpoint["method"]) => {
    const colors = {
      GET: "bg-blue-100 text-blue-800",
      POST: "bg-green-100 text-green-800",
      PUT: "bg-yellow-100 text-yellow-800",
      DELETE: "bg-red-100 text-red-800",
      PATCH: "bg-purple-100 text-purple-800",
    }
    return <Badge className={colors[method]}>{method}</Badge>
  }

  const getAuthBadge = (auth: APIEndpoint["authentication"]) => {
    switch (auth) {
      case "none":
        return <Badge variant="outline">无认证</Badge>
      case "api_key":
        return <Badge className="bg-blue-100 text-blue-800">API密钥</Badge>
      case "oauth":
        return <Badge className="bg-purple-100 text-purple-800">OAuth</Badge>
      case "jwt":
        return <Badge className="bg-green-100 text-green-800">JWT</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getKeyStatusBadge = (status: APIKey["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">活跃</Badge>
      case "revoked":
        return <Badge className="bg-red-100 text-red-800">已撤销</Badge>
      case "expired":
        return <Badge className="bg-orange-100 text-orange-800">已过期</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const totalRequests = endpoints.reduce((sum, endpoint) => sum + endpoint.usage.totalRequests, 0)
  const avgUptime = endpoints.reduce((sum, endpoint) => sum + endpoint.monitoring.uptime, 0) / endpoints.length
  const activeEndpoints = endpoints.filter((e) => e.status === "active").length
  const activeKeys = apiKeys.filter((k) => k.status === "active").length

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center">
            <Server className="h-8 w-8 mr-3 text-primary-600" />
            API网关管理
          </h2>
          <p className="text-muted-foreground">管理API端点、密钥和访问控制</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            API分析
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新建API
          </Button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃端点</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEndpoints}</div>
            <p className="text-xs text-muted-foreground">共 {endpoints.length} 个端点</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总请求数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12.5% 较昨日</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">系统可用性</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUptime.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">过去30天平均</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃密钥</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeKeys}</div>
            <p className="text-xs text-muted-foreground">共 {apiKeys.length} 个密钥</p>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="搜索API端点、路径或描述..."
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
              <SelectItem value="deprecated">已弃用</SelectItem>
              <SelectItem value="maintenance">维护中</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedMethod} onValueChange={setSelectedMethod}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="方法" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部方法</SelectItem>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* API管理选项卡 */}
      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">API端点</TabsTrigger>
          <TabsTrigger value="keys">API密钥</TabsTrigger>
          <TabsTrigger value="monitoring">监控统计</TabsTrigger>
          <TabsTrigger value="security">安全设置</TabsTrigger>
          <TabsTrigger value="documentation">API文档</TabsTrigger>
        </TabsList>

        {/* API端点 */}
        <TabsContent value="endpoints" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">API端点管理</h3>
            <Dialog open={showCreateEndpoint} onOpenChange={setShowCreateEndpoint}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  创建端点
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>创建新的API端点</DialogTitle>
                  <DialogDescription>配置新的API端点参数和权限</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="endpoint-name">端点名称</Label>
                      <Input id="endpoint-name" placeholder="输入端点名称" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endpoint-path">API路径</Label>
                      <Input id="endpoint-path" placeholder="/api/v1/resource" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>HTTP方法</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="选择方法" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
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
                          <SelectItem value="api_key">API密钥</SelectItem>
                          <SelectItem value="oauth">OAuth</SelectItem>
                          <SelectItem value="jwt">JWT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endpoint-description">描述</Label>
                    <Textarea id="endpoint-description" placeholder="描述API端点的功能" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rate-limit">速率限制 (请求/小时)</Label>
                      <Input id="rate-limit" type="number" placeholder="1000" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cache-ttl">缓存TTL (秒)</Label>
                      <Input id="cache-ttl" type="number" placeholder="300" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="public-endpoint" />
                    <Label htmlFor="public-endpoint">公开API</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateEndpoint(false)}>
                    取消
                  </Button>
                  <Button onClick={() => setShowCreateEndpoint(false)}>创建端点</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {filteredEndpoints.map((endpoint) => (
              <Card key={endpoint.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg">{endpoint.name}</h3>
                        {getMethodBadge(endpoint.method)}
                        {getStatusBadge(endpoint.status)}
                        {getAuthBadge(endpoint.authentication)}
                        {endpoint.isPublic && (
                          <Badge variant="outline" className="text-xs">
                            公开
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 mb-3 text-sm text-muted-foreground">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">{endpoint.path}</code>
                        <span>版本: {endpoint.version}</span>
                        <span>更新: {endpoint.lastUpdated}</span>
                      </div>

                      <p className="text-muted-foreground mb-3">{endpoint.description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div className="text-sm">
                          <span className="text-muted-foreground">可用性:</span>
                          <span className="ml-1 font-medium text-green-600">{endpoint.monitoring.uptime}%</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">响应时间:</span>
                          <span className="ml-1 font-medium">{endpoint.monitoring.avgResponseTime}ms</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">错误率:</span>
                          <span className="ml-1 font-medium">{endpoint.monitoring.errorRate}%</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">日请求:</span>
                          <span className="ml-1 font-medium">{endpoint.usage.dailyRequests.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>
                          速率限制: {endpoint.rateLimit.requests}/{endpoint.rateLimit.window}
                        </span>
                        <span>缓存: {endpoint.caching.enabled ? `${endpoint.caching.ttl}s` : "禁用"}</span>
                        <span>客户端: {endpoint.usage.uniqueClients}</span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {endpoint.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" title="查看详情">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="编辑">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="设置">
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="刷新">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* API密钥 */}
        <TabsContent value="keys" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">API密钥管理</h3>
            <Dialog open={showCreateKey} onOpenChange={setShowCreateKey}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  生成密钥
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>生成新的API密钥</DialogTitle>
                  <DialogDescription>为客户端应用创建API访问密钥</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">密钥名称</Label>
                    <Input id="key-name" placeholder="输入密钥名称" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-name">客户端名称</Label>
                    <Input id="client-name" placeholder="输入客户端应用名称" />
                  </div>
                  <div className="space-y-2">
                    <Label>客户端类型</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="选择客户端类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="web">Web应用</SelectItem>
                        <SelectItem value="mobile">移动应用</SelectItem>
                        <SelectItem value="server">服务器应用</SelectItem>
                        <SelectItem value="integration">第三方集成</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate-limit-key">速率限制 (请求/小时)</Label>
                    <Input id="rate-limit-key" type="number" placeholder="10000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expires-at">过期时间 (可选)</Label>
                    <Input id="expires-at" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>权限范围</Label>
                    <div className="space-y-2">
                      {["users:read", "users:write", "orders:read", "orders:write", "analytics:read"].map(
                        (permission) => (
                          <div key={permission} className="flex items-center space-x-2">
                            <Switch />
                            <Label className="text-sm">{permission}</Label>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateKey(false)}>
                    取消
                  </Button>
                  <Button onClick={() => setShowCreateKey(false)}>生成密钥</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {apiKeys.map((apiKey) => (
              <Card key={apiKey.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg">{apiKey.name}</h3>
                        {getKeyStatusBadge(apiKey.status)}
                        <Badge variant="outline" className="text-xs">
                          {apiKey.clientInfo.type}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-4 mb-3 text-sm text-muted-foreground">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                          {apiKey.key.substring(0, 20)}...
                        </code>
                        <span>客户端: {apiKey.clientInfo.name}</span>
                        <span>创建: {apiKey.createdAt}</span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div className="text-sm">
                          <span className="text-muted-foreground">总请求:</span>
                          <span className="ml-1 font-medium">{apiKey.usage.totalRequests.toLocaleString()}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">最后使用:</span>
                          <span className="ml-1 font-medium">{apiKey.usage.lastUsed}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">速率限制:</span>
                          <span className="ml-1 font-medium">
                            {apiKey.rateLimit.requests}/{apiKey.rateLimit.window}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">过期时间:</span>
                          <span className="ml-1 font-medium">{apiKey.expiresAt || "永不过期"}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {apiKey.permissions.map((permission, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" title="查看详情">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="编辑">
                        <Edit className="w-4 h-4" />
                      </Button>
                      {apiKey.status === "active" ? (
                        <Button variant="outline" size="sm" title="撤销">
                          <Lock className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button size="sm" title="激活">
                          <Unlock className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 监控统计 */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  请求统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">API请求统计图表</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  响应时间
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">响应时间趋势图</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>实时监控指标</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">99.9%</div>
                  <p className="text-sm text-muted-foreground">系统可用性</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">156ms</div>
                  <p className="text-sm text-muted-foreground">平均响应时间</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">2.3K</div>
                  <p className="text-sm text-muted-foreground">每分钟请求数</p>
                </div>
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
                <CardDescription>配置API安全和访问控制策略</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>启用HTTPS</Label>
                    <p className="text-sm text-muted-foreground">强制使用HTTPS协议</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>IP白名单</Label>
                    <p className="text-sm text-muted-foreground">限制特定IP地址访问</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>请求签名验证</Label>
                    <p className="text-sm text-muted-foreground">验证请求签名防止篡改</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>CORS跨域</Label>
                    <p className="text-sm text-muted-foreground">配置跨域资源共享</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  威胁防护
                </CardTitle>
                <CardDescription>配置API威胁检测和防护</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>DDoS防护</Label>
                    <p className="text-sm text-muted-foreground">检测和防护DDoS攻击</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SQL注入防护</Label>
                    <p className="text-sm text-muted-foreground">检测SQL注入攻击</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>异常流量检测</Label>
                    <p className="text-sm text-muted-foreground">监控异常访问模式</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label>最大请求大小 (MB)</Label>
                  <Input type="number" defaultValue="10" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* API文档 */}
        <TabsContent value="documentation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API文档管理</CardTitle>
              <CardDescription>管理和维护API接口文档</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {endpoints.map((endpoint) => (
                  <div key={endpoint.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getMethodBadge(endpoint.method)}
                      <div>
                        <h4 className="font-medium">{endpoint.name}</h4>
                        <p className="text-sm text-muted-foreground">{endpoint.path}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        查看文档
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-1" />
                        编辑文档
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
