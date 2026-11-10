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
import { Progress } from "@/components/ui/progress"
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
  Building,
  Users,
  Database,
  Shield,
  Settings,
  Plus,
  Edit,
  Eye,
  Globe,
  Server,
  HardDrive,
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  BarChart3,
  DollarSign,
  Package,
  Zap,
  Key,
  Activity,
} from "lucide-react"

interface Tenant {
  id: string
  name: string
  domain: string
  subdomain: string
  status: "active" | "suspended" | "pending" | "inactive"
  plan: "starter" | "professional" | "enterprise" | "custom"
  users: number
  maxUsers: number
  storage: number
  maxStorage: number
  bandwidth: number
  maxBandwidth: number
  createdAt: string
  lastActive: string
  owner: {
    name: string
    email: string
    avatar: string
  }
  features: string[]
  customDomain?: string
  sslEnabled: boolean
  backupEnabled: boolean
  monitoringEnabled: boolean
  apiAccess: boolean
  webhooksEnabled: boolean
  customBranding: boolean
  priority: "low" | "normal" | "high" | "critical"
  region: string
  database: {
    type: string
    size: number
    connections: number
    maxConnections: number
  }
  billing: {
    amount: number
    currency: string
    cycle: "monthly" | "yearly"
    nextBilling: string
    status: "paid" | "pending" | "overdue"
  }
}

interface TenantStats {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  totalRevenue: number
  storageUsed: number
  bandwidthUsed: number
  planDistribution: { plan: string; count: number; percentage: number }[]
  regionDistribution: { region: string; count: number }[]
}

const mockTenants: Tenant[] = [
  {
    id: "1",
    name: "科技创新有限公司",
    domain: "techinnov.yanyu.cloud",
    subdomain: "techinnov",
    status: "active",
    plan: "enterprise",
    users: 156,
    maxUsers: 500,
    storage: 45.2,
    maxStorage: 100,
    bandwidth: 2.8,
    maxBandwidth: 10,
    createdAt: "2023-08-15",
    lastActive: "2024-01-20 15:30",
    owner: {
      name: "张明",
      email: "zhang.ming@techinnov.com",
      avatar: "/api/placeholder/40/40",
    },
    features: ["自定义域名", "SSL证书", "API访问", "Webhook", "自定义品牌"],
    customDomain: "erp.techinnov.com",
    sslEnabled: true,
    backupEnabled: true,
    monitoringEnabled: true,
    apiAccess: true,
    webhooksEnabled: true,
    customBranding: true,
    priority: "high",
    region: "华东",
    database: {
      type: "PostgreSQL",
      size: 12.5,
      connections: 45,
      maxConnections: 100,
    },
    billing: {
      amount: 2999,
      currency: "CNY",
      cycle: "monthly",
      nextBilling: "2024-02-15",
      status: "paid",
    },
  },
  {
    id: "2",
    name: "电商运营中心",
    domain: "ecommerce.yanyu.cloud",
    subdomain: "ecommerce",
    status: "active",
    plan: "professional",
    users: 89,
    maxUsers: 200,
    storage: 28.7,
    maxStorage: 50,
    bandwidth: 1.9,
    maxBandwidth: 5,
    createdAt: "2023-10-22",
    lastActive: "2024-01-20 14:15",
    owner: {
      name: "李华",
      email: "li.hua@ecommerce.com",
      avatar: "/api/placeholder/40/40",
    },
    features: ["SSL证书", "API访问", "基础监控"],
    sslEnabled: true,
    backupEnabled: true,
    monitoringEnabled: false,
    apiAccess: true,
    webhooksEnabled: false,
    customBranding: false,
    priority: "normal",
    region: "华南",
    database: {
      type: "MySQL",
      size: 8.3,
      connections: 32,
      maxConnections: 50,
    },
    billing: {
      amount: 999,
      currency: "CNY",
      cycle: "monthly",
      nextBilling: "2024-02-22",
      status: "paid",
    },
  },
  {
    id: "3",
    name: "初创企业",
    domain: "startup.yanyu.cloud",
    subdomain: "startup",
    status: "pending",
    plan: "starter",
    users: 12,
    maxUsers: 50,
    storage: 5.2,
    maxStorage: 10,
    bandwidth: 0.3,
    maxBandwidth: 1,
    createdAt: "2024-01-18",
    lastActive: "2024-01-19 09:45",
    owner: {
      name: "王小明",
      email: "wang.xiaoming@startup.com",
      avatar: "/api/placeholder/40/40",
    },
    features: ["基础功能"],
    sslEnabled: false,
    backupEnabled: false,
    monitoringEnabled: false,
    apiAccess: false,
    webhooksEnabled: false,
    customBranding: false,
    priority: "low",
    region: "华北",
    database: {
      type: "SQLite",
      size: 1.2,
      connections: 5,
      maxConnections: 10,
    },
    billing: {
      amount: 199,
      currency: "CNY",
      cycle: "monthly",
      nextBilling: "2024-02-18",
      status: "pending",
    },
  },
]

const mockStats: TenantStats = {
  totalTenants: 156,
  activeTenants: 142,
  totalUsers: 8924,
  totalRevenue: 456780,
  storageUsed: 2.8,
  bandwidthUsed: 15.6,
  planDistribution: [
    { plan: "starter", count: 89, percentage: 57 },
    { plan: "professional", count: 45, percentage: 29 },
    { plan: "enterprise", count: 18, percentage: 12 },
    { plan: "custom", count: 4, percentage: 2 },
  ],
  regionDistribution: [
    { region: "华东", count: 68 },
    { region: "华南", count: 42 },
    { region: "华北", count: 28 },
    { region: "西南", count: 18 },
  ],
}

export function TenantManagement() {
  const [tenants, setTenants] = useState<Tenant[]>(mockTenants)
  const [stats, setStats] = useState<TenantStats>(mockStats)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedPlan, setSelectedPlan] = useState("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [newTenant, setNewTenant] = useState({
    name: "",
    subdomain: "",
    plan: "starter",
    ownerName: "",
    ownerEmail: "",
    region: "华东",
  })

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.owner.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = selectedStatus === "all" || tenant.status === selectedStatus
    const matchesPlan = selectedPlan === "all" || tenant.plan === selectedPlan

    return matchesSearch && matchesStatus && matchesPlan
  })

  const getStatusBadge = (status: Tenant["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">活跃</Badge>
      case "suspended":
        return <Badge className="bg-red-100 text-red-800">已暂停</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">待激活</Badge>
      case "inactive":
        return <Badge variant="secondary">非活跃</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getStatusIcon = (status: Tenant["status"]) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "suspended":
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "inactive":
        return <Eye className="w-4 h-4 text-gray-600" />
      default:
        return <Eye className="w-4 h-4 text-gray-600" />
    }
  }

  const getPlanBadge = (plan: Tenant["plan"]) => {
    switch (plan) {
      case "starter":
        return <Badge variant="outline">入门版</Badge>
      case "professional":
        return <Badge className="bg-blue-100 text-blue-800">专业版</Badge>
      case "enterprise":
        return <Badge className="bg-purple-100 text-purple-800">企业版</Badge>
      case "custom":
        return <Badge className="bg-orange-100 text-orange-800">定制版</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getPriorityColor = (priority: Tenant["priority"]) => {
    switch (priority) {
      case "critical":
        return "text-red-600"
      case "high":
        return "text-orange-600"
      case "normal":
        return "text-blue-600"
      case "low":
        return "text-gray-600"
      default:
        return "text-gray-600"
    }
  }

  const handleCreateTenant = () => {
    const tenant: Tenant = {
      id: Date.now().toString(),
      name: newTenant.name,
      domain: `${newTenant.subdomain}.yanyu.cloud`,
      subdomain: newTenant.subdomain,
      status: "pending",
      plan: newTenant.plan as Tenant["plan"],
      users: 0,
      maxUsers: newTenant.plan === "starter" ? 50 : newTenant.plan === "professional" ? 200 : 500,
      storage: 0,
      maxStorage: newTenant.plan === "starter" ? 10 : newTenant.plan === "professional" ? 50 : 100,
      bandwidth: 0,
      maxBandwidth: newTenant.plan === "starter" ? 1 : newTenant.plan === "professional" ? 5 : 10,
      createdAt: new Date().toISOString().split("T")[0],
      lastActive: "",
      owner: {
        name: newTenant.ownerName,
        email: newTenant.ownerEmail,
        avatar: "/api/placeholder/40/40",
      },
      features:
        newTenant.plan === "starter"
          ? ["基础功能"]
          : newTenant.plan === "professional"
            ? ["SSL证书", "API访问", "基础监控"]
            : ["自定义域名", "SSL证书", "API访问", "Webhook", "自定义品牌"],
      sslEnabled: newTenant.plan !== "starter",
      backupEnabled: newTenant.plan !== "starter",
      monitoringEnabled: newTenant.plan === "enterprise",
      apiAccess: newTenant.plan !== "starter",
      webhooksEnabled: newTenant.plan === "enterprise",
      customBranding: newTenant.plan === "enterprise",
      priority: "normal",
      region: newTenant.region,
      database: {
        type: newTenant.plan === "starter" ? "SQLite" : newTenant.plan === "professional" ? "MySQL" : "PostgreSQL",
        size: 0,
        connections: 0,
        maxConnections: newTenant.plan === "starter" ? 10 : newTenant.plan === "professional" ? 50 : 100,
      },
      billing: {
        amount: newTenant.plan === "starter" ? 199 : newTenant.plan === "professional" ? 999 : 2999,
        currency: "CNY",
        cycle: "monthly",
        nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        status: "pending",
      },
    }

    setTenants([...tenants, tenant])
    setNewTenant({
      name: "",
      subdomain: "",
      plan: "starter",
      ownerName: "",
      ownerEmail: "",
      region: "华东",
    })
    setShowCreateDialog(false)
  }

  const handleTenantAction = (tenantId: string, action: string) => {
    setTenants((prev) =>
      prev.map((tenant) => {
        if (tenant.id === tenantId) {
          switch (action) {
            case "activate":
              return { ...tenant, status: "active" as const }
            case "suspend":
              return { ...tenant, status: "suspended" as const }
            case "deactivate":
              return { ...tenant, status: "inactive" as const }
            default:
              return tenant
          }
        }
        return tenant
      }),
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center">
            <Building className="h-8 w-8 mr-3 text-primary-600" />
            多租户管理
          </h2>
          <p className="text-muted-foreground">管理和监控所有租户实例</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            分析报告
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建租户
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>创建新租户</DialogTitle>
                <DialogDescription>为新客户创建独立的租户实例</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tenant-name">租户名称</Label>
                    <Input
                      id="tenant-name"
                      value={newTenant.name}
                      onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                      placeholder="输入公司或组织名称"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenant-subdomain">子域名</Label>
                    <div className="flex">
                      <Input
                        id="tenant-subdomain"
                        value={newTenant.subdomain}
                        onChange={(e) => setNewTenant({ ...newTenant, subdomain: e.target.value })}
                        placeholder="subdomain"
                        className="rounded-r-none"
                      />
                      <div className="flex items-center px-3 bg-muted border border-l-0 rounded-r-md text-sm text-muted-foreground">
                        .yanyu.cloud
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="owner-name">管理员姓名</Label>
                    <Input
                      id="owner-name"
                      value={newTenant.ownerName}
                      onChange={(e) => setNewTenant({ ...newTenant, ownerName: e.target.value })}
                      placeholder="输入管理员姓名"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="owner-email">管理员邮箱</Label>
                    <Input
                      id="owner-email"
                      type="email"
                      value={newTenant.ownerEmail}
                      onChange={(e) => setNewTenant({ ...newTenant, ownerEmail: e.target.value })}
                      placeholder="输入管理员邮箱"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>套餐计划</Label>
                    <Select
                      value={newTenant.plan}
                      onValueChange={(value) => setNewTenant({ ...newTenant, plan: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter">入门版 - ¥199/月</SelectItem>
                        <SelectItem value="professional">专业版 - ¥999/月</SelectItem>
                        <SelectItem value="enterprise">企业版 - ¥2999/月</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>部署区域</Label>
                    <Select
                      value={newTenant.region}
                      onValueChange={(value) => setNewTenant({ ...newTenant, region: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="华东">华东</SelectItem>
                        <SelectItem value="华南">华南</SelectItem>
                        <SelectItem value="华北">华北</SelectItem>
                        <SelectItem value="西南">西南</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateTenant}>创建租户</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总租户数</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTenants}</div>
            <p className="text-xs text-muted-foreground">{stats.activeTenants} 个活跃</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总用户数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12.5% 较上月</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总收入</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+8.7% 较上月</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">存储使用</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.storageUsed} TB</div>
            <p className="text-xs text-muted-foreground">带宽: {stats.bandwidthUsed} TB</p>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Input
            placeholder="搜索租户名称、域名或邮箱..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
              <SelectItem value="suspended">已暂停</SelectItem>
              <SelectItem value="pending">待激活</SelectItem>
              <SelectItem value="inactive">非活跃</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="套餐" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部套餐</SelectItem>
              <SelectItem value="starter">入门版</SelectItem>
              <SelectItem value="professional">专业版</SelectItem>
              <SelectItem value="enterprise">企业版</SelectItem>
              <SelectItem value="custom">定制版</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 租户管理选项卡 */}
      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants">租户列表</TabsTrigger>
          <TabsTrigger value="analytics">数据分析</TabsTrigger>
          <TabsTrigger value="resources">资源监控</TabsTrigger>
          <TabsTrigger value="billing">计费管理</TabsTrigger>
          <TabsTrigger value="settings">系统设置</TabsTrigger>
        </TabsList>

        {/* 租户列表 */}
        <TabsContent value="tenants" className="space-y-4">
          <div className="grid gap-4">
            {filteredTenants.map((tenant) => (
              <Card key={tenant.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {getStatusIcon(tenant.status)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{tenant.name}</h3>
                          {getStatusBadge(tenant.status)}
                          {getPlanBadge(tenant.plan)}
                          <Badge variant="outline" className="text-xs">
                            {tenant.region}
                          </Badge>
                        </div>

                        <div className="flex items-center space-x-4 mb-3 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Globe className="w-4 h-4" />
                            <span>{tenant.domain}</span>
                          </div>
                          {tenant.customDomain && (
                            <div className="flex items-center space-x-1">
                              <Key className="w-4 h-4" />
                              <span>{tenant.customDomain}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <img
                              src={tenant.owner.avatar || "/placeholder.svg"}
                              alt={tenant.owner.name}
                              className="w-4 h-4 rounded-full"
                            />
                            <span>{tenant.owner.name}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>用户数</span>
                              <span>
                                {tenant.users}/{tenant.maxUsers}
                              </span>
                            </div>
                            <Progress value={(tenant.users / tenant.maxUsers) * 100} className="h-1" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>存储</span>
                              <span>
                                {tenant.storage.toFixed(1)}/{tenant.maxStorage} GB
                              </span>
                            </div>
                            <Progress value={(tenant.storage / tenant.maxStorage) * 100} className="h-1" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>带宽</span>
                              <span>
                                {tenant.bandwidth.toFixed(1)}/{tenant.maxBandwidth} TB
                              </span>
                            </div>
                            <Progress value={(tenant.bandwidth / tenant.maxBandwidth) * 100} className="h-1" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>数据库</span>
                              <span>
                                {tenant.database.connections}/{tenant.database.maxConnections}
                              </span>
                            </div>
                            <Progress
                              value={(tenant.database.connections / tenant.database.maxConnections) * 100}
                              className="h-1"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>创建时间: {tenant.createdAt}</span>
                          <span>最后活跃: {tenant.lastActive}</span>
                          <span className={`font-medium ${getPriorityColor(tenant.priority)}`}>
                            优先级:{" "}
                            {tenant.priority === "critical"
                              ? "紧急"
                              : tenant.priority === "high"
                                ? "高"
                                : tenant.priority === "normal"
                                  ? "普通"
                                  : "低"}
                          </span>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-3 h-3" />
                            <span>¥{tenant.billing.amount}/月</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 mt-3">
                          {tenant.sslEnabled && (
                            <Badge variant="outline" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              SSL
                            </Badge>
                          )}
                          {tenant.backupEnabled && (
                            <Badge variant="outline" className="text-xs">
                              <Database className="w-3 h-3 mr-1" />
                              备份
                            </Badge>
                          )}
                          {tenant.apiAccess && (
                            <Badge variant="outline" className="text-xs">
                              <Zap className="w-3 h-3 mr-1" />
                              API
                            </Badge>
                          )}
                          {tenant.customBranding && (
                            <Badge variant="outline" className="text-xs">
                              <Package className="w-3 h-3 mr-1" />
                              品牌
                            </Badge>
                          )}
                        </div>
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
                      {tenant.status === "active" ? (
                        <Button variant="outline" size="sm" onClick={() => handleTenantAction(tenant.id, "suspend")}>
                          <Lock className="w-4 h-4 mr-1" />
                          暂停
                        </Button>
                      ) : tenant.status === "suspended" ? (
                        <Button size="sm" onClick={() => handleTenantAction(tenant.id, "activate")}>
                          <Unlock className="w-4 h-4 mr-1" />
                          激活
                        </Button>
                      ) : tenant.status === "pending" ? (
                        <Button size="sm" onClick={() => handleTenantAction(tenant.id, "activate")}>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          批准
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => handleTenantAction(tenant.id, "activate")}>
                          <CheckCircle className="w-4 h-4 mr-1" />
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

        {/* 数据分析 */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  套餐分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.planDistribution.map((plan) => (
                    <div key={plan.plan} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">
                          {plan.plan === "starter"
                            ? "入门版"
                            : plan.plan === "professional"
                              ? "专业版"
                              : plan.plan === "enterprise"
                                ? "企业版"
                                : "定制版"}
                        </span>
                        <span>
                          {plan.count} ({plan.percentage}%)
                        </span>
                      </div>
                      <Progress value={plan.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="w-5 h-5 mr-2" />
                  区域分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.regionDistribution.map((region) => (
                    <div key={region.region} className="flex justify-between items-center">
                      <span className="text-sm">{region.region}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(region.count / stats.totalTenants) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-8">{region.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                增长趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">租户增长趋势图表</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 资源监控 */}
        <TabsContent value="resources" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="w-5 h-5 mr-2" />
                  系统资源
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>CPU使用率</span>
                      <span>68%</span>
                    </div>
                    <Progress value={68} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>内存使用率</span>
                      <span>74%</span>
                    </div>
                    <Progress value={74} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>磁盘使用率</span>
                      <span>45%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>网络带宽</span>
                      <span>125 MB/s</span>
                    </div>
                    <Progress value={62} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  数据库状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">PostgreSQL 集群</span>
                    <Badge className="bg-green-100 text-green-800">正常</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">MySQL 集群</span>
                    <Badge className="bg-green-100 text-green-800">正常</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Redis 缓存</span>
                    <Badge className="bg-green-100 text-green-800">正常</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">备份服务</span>
                    <Badge className="bg-yellow-100 text-yellow-800">运行中</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                实时活动
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { time: "15:32", event: "新租户 'startup' 创建成功", type: "success" },
                  { time: "15:30", event: "租户 'techinnov' 升级到企业版", type: "info" },
                  { time: "15:28", event: "租户 'ecommerce' 存储使用率达到 80%", type: "warning" },
                  { time: "15:25", event: "系统备份任务完成", type: "success" },
                  { time: "15:20", event: "租户 'oldcorp' 已暂停", type: "error" },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                    <span className="text-sm flex-1">{activity.event}</span>
                    <Badge
                      variant={
                        activity.type === "success"
                          ? "default"
                          : activity.type === "error"
                            ? "destructive"
                            : activity.type === "warning"
                              ? "secondary"
                              : "outline"
                      }
                      className="text-xs"
                    >
                      {activity.type === "success"
                        ? "成功"
                        : activity.type === "error"
                          ? "错误"
                          : activity.type === "warning"
                            ? "警告"
                            : "信息"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 计费管理 */}
        <TabsContent value="billing" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  收入概览
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">¥{stats.totalRevenue.toLocaleString()}</div>
                    <p className="text-sm text-muted-foreground">本月总收入</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>已付费</span>
                      <span className="text-green-600">¥{(stats.totalRevenue * 0.85).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>待付费</span>
                      <span className="text-yellow-600">¥{(stats.totalRevenue * 0.12).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>逾期</span>
                      <span className="text-red-600">¥{(stats.totalRevenue * 0.03).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>计费统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">按时付费租户</span>
                    <span className="font-medium">142</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">逾期付费租户</span>
                    <span className="font-medium text-red-600">8</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">免费试用租户</span>
                    <span className="font-medium">6</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">平均客单价</span>
                    <span className="font-medium">¥{Math.round(stats.totalRevenue / stats.activeTenants)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>付费提醒</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border-l-4 border-red-500 bg-red-50">
                    <p className="text-sm font-medium text-red-800">8个租户付费逾期</p>
                    <p className="text-xs text-red-600">需要立即处理</p>
                  </div>
                  <div className="p-3 border-l-4 border-yellow-500 bg-yellow-50">
                    <p className="text-sm font-medium text-yellow-800">15个租户即将到期</p>
                    <p className="text-xs text-yellow-600">3天内到期</p>
                  </div>
                  <div className="p-3 border-l-4 border-blue-500 bg-blue-50">
                    <p className="text-sm font-medium text-blue-800">6个免费试用即将结束</p>
                    <p className="text-xs text-blue-600">需要升级提醒</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 系统设置 */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>多租户配置</CardTitle>
                <CardDescription>配置多租户系统的全局设置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>自动扩容</Label>
                    <p className="text-sm text-muted-foreground">根据负载自动扩展资源</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>数据隔离</Label>
                    <p className="text-sm text-muted-foreground">启用严格的租户数据隔离</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>自动备份</Label>
                    <p className="text-sm text-muted-foreground">定期自动备份租户数据</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>监控告警</Label>
                    <p className="text-sm text-muted-foreground">资源使用异常时发送告警</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>资源限制</CardTitle>
                <CardDescription>设置租户资源使用限制</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>默认存储限制 (GB)</Label>
                  <Input type="number" defaultValue="10" />
                </div>
                <div className="space-y-2">
                  <Label>默认带宽限制 (TB/月)</Label>
                  <Input type="number" defaultValue="1" />
                </div>
                <div className="space-y-2">
                  <Label>默认用户数限制</Label>
                  <Input type="number" defaultValue="50" />
                </div>
                <div className="space-y-2">
                  <Label>数据库连接数限制</Label>
                  <Input type="number" defaultValue="10" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
