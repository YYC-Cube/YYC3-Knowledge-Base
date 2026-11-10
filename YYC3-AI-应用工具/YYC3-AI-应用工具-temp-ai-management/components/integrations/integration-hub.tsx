"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Zap,
  Search,
  Plus,
  Settings,
  Database,
  Mail,
  MessageSquare,
  CreditCard,
  ShoppingCart,
  BarChart3,
  Cloud,
  Users,
  Shield,
  Key,
  Webhook,
  Link,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  Edit,
  Play,
  Pause,
  RefreshCw,
  Download,
  Star,
  TrendingUp,
  Activity,
  Package,
} from "lucide-react"

interface Integration {
  id: string
  name: string
  description: string
  category: string
  provider: string
  logo: string
  status: "connected" | "disconnected" | "error" | "configuring"
  isPopular: boolean
  isVerified: boolean
  rating: number
  installations: number
  lastSync: string
  version: string
  features: string[]
  endpoints: {
    webhook?: string
    api?: string
    oauth?: string
  }
  config: {
    apiKey?: string
    secret?: string
    webhookUrl?: string
    [key: string]: any
  }
  permissions: string[]
  dataFlow: "inbound" | "outbound" | "bidirectional"
  syncFrequency: "realtime" | "hourly" | "daily" | "weekly"
  supportedEvents: string[]
}

interface IntegrationCategory {
  id: string
  name: string
  description: string
  icon: any
  count: number
}

const mockIntegrations: Integration[] = [
  {
    id: "1",
    name: "微信公众号",
    description: "集成微信公众号，实现消息推送和用户管理",
    category: "社交媒体",
    provider: "腾讯",
    logo: "/api/placeholder/40/40",
    status: "connected",
    isPopular: true,
    isVerified: true,
    rating: 4.8,
    installations: 15420,
    lastSync: "2024-01-20 15:30",
    version: "2.1.0",
    features: ["消息推送", "用户管理", "菜单配置", "素材管理"],
    endpoints: {
      webhook: "https://api.wechat.com/webhook",
      api: "https://api.wechat.com/cgi-bin",
    },
    config: {
      appId: "wx1234567890",
      appSecret: "***hidden***",
      token: "***hidden***",
    },
    permissions: ["发送消息", "获取用户信息", "管理菜单"],
    dataFlow: "bidirectional",
    syncFrequency: "realtime",
    supportedEvents: ["message", "subscribe", "unsubscribe", "click"],
  },
  {
    id: "2",
    name: "支付宝支付",
    description: "集成支付宝支付功能，支持扫码支付和APP支付",
    category: "支付",
    provider: "蚂蚁集团",
    logo: "/api/placeholder/40/40",
    status: "connected",
    isPopular: true,
    isVerified: true,
    rating: 4.9,
    installations: 12890,
    lastSync: "2024-01-20 14:45",
    version: "3.0.2",
    features: ["扫码支付", "APP支付", "退款", "对账"],
    endpoints: {
      api: "https://openapi.alipay.com/gateway.do",
      webhook: "https://notify.alipay.com",
    },
    config: {
      appId: "2021001234567890",
      privateKey: "***hidden***",
      publicKey: "***hidden***",
    },
    permissions: ["发起支付", "查询订单", "申请退款"],
    dataFlow: "bidirectional",
    syncFrequency: "realtime",
    supportedEvents: ["payment", "refund", "trade_close"],
  },
  {
    id: "3",
    name: "钉钉企业版",
    description: "集成钉钉企业应用，实现组织架构同步和消息通知",
    category: "办公协作",
    provider: "阿里巴巴",
    logo: "/api/placeholder/40/40",
    status: "configuring",
    isPopular: false,
    isVerified: true,
    rating: 4.6,
    installations: 8760,
    lastSync: "",
    version: "1.8.5",
    features: ["组织架构同步", "消息通知", "审批流程", "考勤管理"],
    endpoints: {
      api: "https://oapi.dingtalk.com",
      webhook: "https://oapi.dingtalk.com/robot/send",
    },
    config: {
      corpId: "***hidden***",
      corpSecret: "***hidden***",
    },
    permissions: ["获取通讯录", "发送消息", "管理审批"],
    dataFlow: "bidirectional",
    syncFrequency: "hourly",
    supportedEvents: ["user_add", "user_modify", "approval"],
  },
  {
    id: "4",
    name: "腾讯云短信",
    description: "集成腾讯云短信服务，支持验证码和营销短信",
    category: "通信",
    provider: "腾讯云",
    logo: "/api/placeholder/40/40",
    status: "disconnected",
    isPopular: true,
    isVerified: true,
    rating: 4.7,
    installations: 9340,
    lastSync: "",
    version: "2.3.1",
    features: ["验证码短信", "营销短信", "国际短信", "统计报表"],
    endpoints: {
      api: "https://sms.tencentcloudapi.com",
    },
    config: {},
    permissions: ["发送短信", "查询发送状态", "获取统计数据"],
    dataFlow: "outbound",
    syncFrequency: "realtime",
    supportedEvents: ["sms_send", "sms_reply", "sms_status"],
  },
  {
    id: "5",
    name: "Salesforce CRM",
    description: "集成Salesforce CRM系统，同步客户和销售数据",
    category: "CRM",
    provider: "Salesforce",
    logo: "/api/placeholder/40/40",
    status: "error",
    isPopular: false,
    isVerified: true,
    rating: 4.5,
    installations: 3420,
    lastSync: "2024-01-19 10:20",
    version: "4.2.0",
    features: ["客户同步", "销售机会", "报表分析", "工作流自动化"],
    endpoints: {
      api: "https://api.salesforce.com",
      oauth: "https://login.salesforce.com/services/oauth2",
    },
    config: {
      clientId: "***hidden***",
      clientSecret: "***hidden***",
      refreshToken: "***hidden***",
    },
    permissions: ["读取客户数据", "创建销售机会", "更新联系人"],
    dataFlow: "bidirectional",
    syncFrequency: "daily",
    supportedEvents: ["lead_create", "opportunity_update", "account_change"],
  },
]

const integrationCategories: IntegrationCategory[] = [
  {
    id: "social",
    name: "社交媒体",
    description: "微信、微博、抖音等社交平台集成",
    icon: MessageSquare,
    count: 12,
  },
  {
    id: "payment",
    name: "支付",
    description: "支付宝、微信支付、银联等支付集成",
    icon: CreditCard,
    count: 8,
  },
  {
    id: "ecommerce",
    name: "电商",
    description: "淘宝、京东、拼多多等电商平台集成",
    icon: ShoppingCart,
    count: 15,
  },
  {
    id: "communication",
    name: "通信",
    description: "短信、邮件、语音通话等通信服务",
    icon: Mail,
    count: 10,
  },
  {
    id: "office",
    name: "办公协作",
    description: "钉钉、企业微信、飞书等办公平台",
    icon: Users,
    count: 9,
  },
  {
    id: "analytics",
    name: "数据分析",
    description: "Google Analytics、百度统计等分析工具",
    icon: BarChart3,
    count: 7,
  },
  {
    id: "crm",
    name: "CRM",
    description: "Salesforce、HubSpot等客户管理系统",
    icon: Database,
    count: 6,
  },
  {
    id: "cloud",
    name: "云服务",
    description: "阿里云、腾讯云、AWS等云服务集成",
    icon: Cloud,
    count: 11,
  },
]

export function IntegrationHub() {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations)
  const [categories, setCategories] = useState<IntegrationCategory[]>(integrationCategories)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesSearch =
      integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      integration.provider.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === "all" || integration.category === selectedCategory
    const matchesStatus = selectedStatus === "all" || integration.status === selectedStatus

    return matchesSearch && matchesCategory && matchesStatus
  })

  const getStatusBadge = (status: Integration["status"]) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-100 text-green-800">已连接</Badge>
      case "disconnected":
        return <Badge variant="secondary">未连接</Badge>
      case "configuring":
        return <Badge className="bg-blue-100 text-blue-800">配置中</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800">错误</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getStatusIcon = (status: Integration["status"]) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "disconnected":
        return <AlertTriangle className="w-4 h-4 text-gray-600" />
      case "configuring":
        return <Clock className="w-4 h-4 text-blue-600" />
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Eye className="w-4 h-4 text-gray-600" />
    }
  }

  const getDataFlowBadge = (dataFlow: Integration["dataFlow"]) => {
    switch (dataFlow) {
      case "inbound":
        return (
          <Badge variant="outline" className="text-xs">
            入站
          </Badge>
        )
      case "outbound":
        return (
          <Badge variant="outline" className="text-xs">
            出站
          </Badge>
        )
      case "bidirectional":
        return (
          <Badge variant="outline" className="text-xs">
            双向
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-xs">
            未知
          </Badge>
        )
    }
  }

  const handleIntegrationAction = (integrationId: string, action: string) => {
    setIntegrations((prev) =>
      prev.map((integration) => {
        if (integration.id === integrationId) {
          switch (action) {
            case "connect":
              return { ...integration, status: "connected" as const, lastSync: new Date().toISOString() }
            case "disconnect":
              return { ...integration, status: "disconnected" as const }
            case "configure":
              setSelectedIntegration(integration)
              setShowConfigDialog(true)
              return integration
            default:
              return integration
          }
        }
        return integration
      }),
    )
  }

  const connectedIntegrations = integrations.filter((i) => i.status === "connected").length
  const totalInstallations = integrations.reduce((sum, i) => sum + i.installations, 0)

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center">
            <Zap className="h-8 w-8 mr-3 text-primary-600" />
            集成中心
          </h2>
          <p className="text-muted-foreground">连接第三方服务，扩展系统功能</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Package className="h-4 w-4 mr-2" />
            API文档
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            自定义集成
          </Button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已连接集成</CardTitle>
            <Link className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedIntegrations}</div>
            <p className="text-xs text-muted-foreground">共 {integrations.length} 个可用</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总安装量</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInstallations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+15.2% 较上月</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">集成分类</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">覆盖主要业务场景</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">数据同步</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.9%</div>
            <p className="text-xs text-muted-foreground">同步成功率</p>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="搜索集成名称、提供商或功能..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name} ({category.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="connected">已连接</SelectItem>
              <SelectItem value="disconnected">未连接</SelectItem>
              <SelectItem value="configuring">配置中</SelectItem>
              <SelectItem value="error">错误</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 集成管理选项卡 */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">全部集成</TabsTrigger>
          <TabsTrigger value="connected">已连接</TabsTrigger>
          <TabsTrigger value="categories">分类浏览</TabsTrigger>
          <TabsTrigger value="webhooks">Webhook管理</TabsTrigger>
          <TabsTrigger value="api">API管理</TabsTrigger>
        </TabsList>

        {/* 全部集成 */}
        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4">
            {filteredIntegrations.map((integration) => (
              <Card key={integration.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <img
                          src={integration.logo || "/placeholder.svg"}
                          alt={integration.name}
                          className="w-8 h-8 rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{integration.name}</h3>
                          <Badge variant="outline">{integration.version}</Badge>
                          {getStatusBadge(integration.status)}
                          {integration.isPopular && (
                            <Badge className="bg-orange-100 text-orange-800">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              热门
                            </Badge>
                          )}
                          {integration.isVerified && (
                            <Badge className="bg-blue-100 text-blue-800">
                              <Shield className="w-3 h-3 mr-1" />
                              已验证
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mb-3">{integration.description}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div className="text-sm">
                            <span className="text-muted-foreground">提供商:</span>
                            <span className="ml-1 font-medium">{integration.provider}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">分类:</span>
                            <span className="ml-1 font-medium">{integration.category}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">数据流:</span>
                            <span className="ml-1">{getDataFlowBadge(integration.dataFlow)}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">同步频率:</span>
                            <span className="ml-1 font-medium">
                              {integration.syncFrequency === "realtime"
                                ? "实时"
                                : integration.syncFrequency === "hourly"
                                  ? "每小时"
                                  : integration.syncFrequency === "daily"
                                    ? "每日"
                                    : "每周"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < Math.floor(integration.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                                }`}
                              />
                            ))}
                            <span className="ml-1">{integration.rating}</span>
                          </div>
                          <span>{integration.installations.toLocaleString()} 安装</span>
                          {integration.lastSync && <span>最后同步: {integration.lastSync}</span>}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {integration.features.slice(0, 4).map((feature, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                          {integration.features.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{integration.features.length - 4} 更多
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(integration.status)}
                      <Button variant="ghost" size="sm" title="查看详情">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleIntegrationAction(integration.id, "configure")}
                        title="配置"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      {integration.status === "connected" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleIntegrationAction(integration.id, "disconnect")}
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          断开
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => handleIntegrationAction(integration.id, "connect")}>
                          <Play className="w-4 h-4 mr-1" />
                          连接
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 已连接集成 */}
        <TabsContent value="connected" className="space-y-4">
          <div className="grid gap-4">
            {integrations
              .filter((i) => i.status === "connected")
              .map((integration) => (
                <Card key={integration.id} className="border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <div>
                          <h3 className="font-semibold">{integration.name}</h3>
                          <p className="text-sm text-muted-foreground">最后同步: {integration.lastSync}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Pause className="w-4 h-4 mr-1" />
                          断开
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* 分类浏览 */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Card key={category.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <category.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold">{category.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary-600">{category.count}</span>
                    <Button variant="outline" size="sm" className="bg-transparent">
                      浏览集成
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Webhook管理 */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Webhook className="w-5 h-5 mr-2" />
                Webhook配置
              </CardTitle>
              <CardDescription>管理第三方服务的Webhook回调配置</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {integrations
                  .filter((i) => i.endpoints.webhook)
                  .map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <img
                          src={integration.logo || "/placeholder.svg"}
                          alt={integration.name}
                          className="w-8 h-8 rounded"
                        />
                        <div>
                          <h4 className="font-medium">{integration.name}</h4>
                          <p className="text-sm text-muted-foreground">{integration.endpoints.webhook}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(integration.status)}
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API管理 */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="w-5 h-5 mr-2" />
                API密钥管理
              </CardTitle>
              <CardDescription>管理第三方服务的API访问密钥</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {integrations
                  .filter((i) => i.config.apiKey || i.config.appId)
                  .map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <img
                          src={integration.logo || "/placeholder.svg"}
                          alt={integration.name}
                          className="w-8 h-8 rounded"
                        />
                        <div>
                          <h4 className="font-medium">{integration.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {integration.config.apiKey ? "API Key" : "App ID"}: ***hidden***
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(integration.status)}
                        <Button variant="ghost" size="sm">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 配置对话框 */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>配置集成 - {selectedIntegration?.name}</span>
            </DialogTitle>
            <DialogDescription>配置 {selectedIntegration?.name} 的连接参数和权限设置</DialogDescription>
          </DialogHeader>

          {selectedIntegration && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>集成名称</Label>
                  <p className="font-medium">{selectedIntegration.name}</p>
                </div>
                <div>
                  <Label>提供商</Label>
                  <p className="font-medium">{selectedIntegration.provider}</p>
                </div>
                <div>
                  <Label>版本</Label>
                  <p className="font-medium">{selectedIntegration.version}</p>
                </div>
                <div>
                  <Label>数据流向</Label>
                  <p className="font-medium">
                    {selectedIntegration.dataFlow === "bidirectional"
                      ? "双向"
                      : selectedIntegration.dataFlow === "inbound"
                        ? "入站"
                        : "出站"}
                  </p>
                </div>
              </div>

              <div>
                <Label>API配置</Label>
                <div className="mt-2 space-y-3">
                  {selectedIntegration.endpoints.api && (
                    <div className="space-y-2">
                      <Label htmlFor="api-endpoint">API端点</Label>
                      <Input id="api-endpoint" value={selectedIntegration.endpoints.api} readOnly />
                    </div>
                  )}
                  {selectedIntegration.config.appId && (
                    <div className="space-y-2">
                      <Label htmlFor="app-id">应用ID</Label>
                      <Input id="app-id" value={selectedIntegration.config.appId} placeholder="输入应用ID" />
                    </div>
                  )}
                  {selectedIntegration.config.apiKey && (
                    <div className="space-y-2">
                      <Label htmlFor="api-key">API密钥</Label>
                      <Input id="api-key" type="password" value="***hidden***" placeholder="输入API密钥" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>权限设置</Label>
                <div className="mt-2 space-y-2">
                  {selectedIntegration.permissions.map((permission, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Switch defaultChecked />
                      <span className="text-sm">{permission}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>支持的事件</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedIntegration.supportedEvents.map((event, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {event}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              取消
            </Button>
            <Button onClick={() => setShowConfigDialog(false)}>保存配置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
