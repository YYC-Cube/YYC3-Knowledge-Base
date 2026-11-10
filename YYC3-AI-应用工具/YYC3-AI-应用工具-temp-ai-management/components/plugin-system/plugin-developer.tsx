"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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
  Code,
  Download,
  Bug,
  BookOpen,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  Package,
  Rocket,
  Shield,
  Eye,
  Edit,
  Plus,
  FileText,
  Terminal,
  Globe,
  Star,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Database,
  Key,
} from "lucide-react"

interface DeveloperPlugin {
  id: string
  name: string
  description: string
  version: string
  status: "draft" | "review" | "published" | "rejected" | "suspended"
  downloads: number
  rating: number
  revenue: number
  lastUpdated: string
  category: string
  price: number
  isPublic: boolean
}

interface APIEndpoint {
  id: string
  name: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  path: string
  description: string
  parameters: { name: string; type: string; required: boolean }[]
  responses: { code: number; description: string }[]
}

const mockDeveloperPlugins: DeveloperPlugin[] = [
  {
    id: "1",
    name: "我的AI助手",
    description: "智能业务助手插件",
    version: "1.2.0",
    status: "published",
    downloads: 1250,
    rating: 4.6,
    revenue: 2480,
    lastUpdated: "2024-01-20",
    category: "AI & 自动化",
    price: 199,
    isPublic: true,
  },
  {
    id: "2",
    name: "数据可视化工具",
    description: "高级图表和数据展示组件",
    version: "0.8.5",
    status: "review",
    downloads: 0,
    rating: 0,
    revenue: 0,
    lastUpdated: "2024-01-18",
    category: "数据分析",
    price: 0,
    isPublic: false,
  },
  {
    id: "3",
    name: "库存管理增强",
    description: "扩展库存管理功能",
    version: "2.1.3",
    status: "draft",
    downloads: 0,
    rating: 0,
    revenue: 0,
    lastUpdated: "2024-01-15",
    category: "库存管理",
    price: 299,
    isPublic: false,
  },
]

const mockAPIEndpoints: APIEndpoint[] = [
  {
    id: "1",
    name: "获取用户信息",
    method: "GET",
    path: "/api/v1/users/{id}",
    description: "根据用户ID获取用户详细信息",
    parameters: [
      { name: "id", type: "string", required: true },
      { name: "include", type: "string", required: false },
    ],
    responses: [
      { code: 200, description: "成功返回用户信息" },
      { code: 404, description: "用户不存在" },
    ],
  },
  {
    id: "2",
    name: "创建订单",
    method: "POST",
    path: "/api/v1/orders",
    description: "创建新的订单",
    parameters: [
      { name: "customer_id", type: "string", required: true },
      { name: "items", type: "array", required: true },
      { name: "discount", type: "number", required: false },
    ],
    responses: [
      { code: 201, description: "订单创建成功" },
      { code: 400, description: "请求参数错误" },
    ],
  },
]

export function PluginDeveloper() {
  const [plugins, setPlugins] = useState<DeveloperPlugin[]>(mockDeveloperPlugins)
  const [apiEndpoints, setApiEndpoints] = useState<APIEndpoint[]>(mockAPIEndpoints)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedPlugin, setSelectedPlugin] = useState<DeveloperPlugin | null>(null)
  const [newPlugin, setNewPlugin] = useState({
    name: "",
    description: "",
    category: "",
    price: 0,
    isPublic: true,
  })

  const getStatusBadge = (status: DeveloperPlugin["status"]) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-100 text-green-800">已发布</Badge>
      case "review":
        return <Badge className="bg-blue-100 text-blue-800">审核中</Badge>
      case "draft":
        return <Badge variant="secondary">草稿</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">已拒绝</Badge>
      case "suspended":
        return <Badge className="bg-orange-100 text-orange-800">已暂停</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getStatusIcon = (status: DeveloperPlugin["status"]) => {
    switch (status) {
      case "published":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "review":
        return <Clock className="w-4 h-4 text-blue-600" />
      case "draft":
        return <Edit className="w-4 h-4 text-gray-600" />
      case "rejected":
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case "suspended":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />
      default:
        return <Eye className="w-4 h-4 text-gray-600" />
    }
  }

  const handleCreatePlugin = () => {
    const plugin: DeveloperPlugin = {
      id: Date.now().toString(),
      ...newPlugin,
      version: "0.1.0",
      status: "draft",
      downloads: 0,
      rating: 0,
      revenue: 0,
      lastUpdated: new Date().toISOString().split("T")[0],
    }
    setPlugins([...plugins, plugin])
    setNewPlugin({
      name: "",
      description: "",
      category: "",
      price: 0,
      isPublic: true,
    })
    setShowCreateDialog(false)
  }

  const totalRevenue = plugins.reduce((sum, plugin) => sum + plugin.revenue, 0)
  const totalDownloads = plugins.reduce((sum, plugin) => sum + plugin.downloads, 0)
  const publishedPlugins = plugins.filter((p) => p.status === "published").length

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center">
            <Code className="h-8 w-8 mr-3 text-primary-600" />
            开发者中心
          </h2>
          <p className="text-muted-foreground">开发、发布和管理您的插件</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BookOpen className="h-4 w-4 mr-2" />
            开发文档
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建插件
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建新插件</DialogTitle>
                <DialogDescription>填写插件基本信息开始开发</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="plugin-name">插件名称</Label>
                  <Input
                    id="plugin-name"
                    value={newPlugin.name}
                    onChange={(e) => setNewPlugin({ ...newPlugin, name: e.target.value })}
                    placeholder="输入插件名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plugin-description">插件描述</Label>
                  <Textarea
                    id="plugin-description"
                    value={newPlugin.description}
                    onChange={(e) => setNewPlugin({ ...newPlugin, description: e.target.value })}
                    placeholder="描述插件功能和特性"
                  />
                </div>
                <div className="space-y-2">
                  <Label>插件分类</Label>
                  <Select
                    value={newPlugin.category}
                    onValueChange={(value) => setNewPlugin({ ...newPlugin, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择分类" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AI & 自动化">AI & 自动化</SelectItem>
                      <SelectItem value="财务管理">财务管理</SelectItem>
                      <SelectItem value="营销工具">营销工具</SelectItem>
                      <SelectItem value="库存管理">库存管理</SelectItem>
                      <SelectItem value="数据分析">数据分析</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plugin-price">价格 (¥)</Label>
                  <Input
                    id="plugin-price"
                    type="number"
                    value={newPlugin.price}
                    onChange={(e) => setNewPlugin({ ...newPlugin, price: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="plugin-public"
                    checked={newPlugin.isPublic}
                    onCheckedChange={(checked) => setNewPlugin({ ...newPlugin, isPublic: checked })}
                  />
                  <Label htmlFor="plugin-public">公开插件</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleCreatePlugin}>创建插件</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 开发者统计 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已发布插件</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedPlugins}</div>
            <p className="text-xs text-muted-foreground">共 {plugins.length} 个插件</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总下载量</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDownloads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+15.2% 较上月</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总收入</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+8.7% 较上月</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均评分</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.6</div>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-3 w-3 ${i < 4 ? "text-yellow-400 fill-current" : "text-gray-300"}`} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 开发者工具选项卡 */}
      <Tabs defaultValue="plugins" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plugins">我的插件</TabsTrigger>
          <TabsTrigger value="api">API文档</TabsTrigger>
          <TabsTrigger value="analytics">数据分析</TabsTrigger>
          <TabsTrigger value="resources">开发资源</TabsTrigger>
          <TabsTrigger value="settings">开发设置</TabsTrigger>
        </TabsList>

        {/* 我的插件 */}
        <TabsContent value="plugins" className="space-y-4">
          <div className="grid gap-4">
            {plugins.map((plugin) => (
              <Card key={plugin.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {getStatusIcon(plugin.status)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{plugin.name}</h3>
                          <Badge variant="outline">{plugin.version}</Badge>
                          {getStatusBadge(plugin.status)}
                          {!plugin.isPublic && <Badge variant="secondary">私有</Badge>}
                        </div>
                        <p className="text-muted-foreground mb-3">{plugin.description}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div className="text-sm">
                            <span className="text-muted-foreground">分类:</span>
                            <span className="ml-1 font-medium">{plugin.category}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">价格:</span>
                            <span className="ml-1 font-medium">{plugin.price > 0 ? `¥${plugin.price}` : "免费"}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">下载量:</span>
                            <span className="ml-1 font-medium">{plugin.downloads.toLocaleString()}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">收入:</span>
                            <span className="ml-1 font-medium">¥{plugin.revenue.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          {plugin.rating > 0 && (
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < Math.floor(plugin.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                                  }`}
                                />
                              ))}
                              <span className="ml-1">{plugin.rating}</span>
                            </div>
                          )}
                          <span>更新时间: {plugin.lastUpdated}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      {plugin.status === "draft" && (
                        <Button size="sm">
                          <Rocket className="w-4 h-4 mr-1" />
                          发布
                        </Button>
                      )}
                      {plugin.status === "published" && (
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          查看
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* API文档 */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Terminal className="w-5 h-5 mr-2" />
                API接口文档
              </CardTitle>
              <CardDescription>插件开发可用的API接口和使用说明</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiEndpoints.map((endpoint) => (
                  <div key={endpoint.id} className="border rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Badge
                        className={
                          endpoint.method === "GET"
                            ? "bg-green-100 text-green-800"
                            : endpoint.method === "POST"
                              ? "bg-blue-100 text-blue-800"
                              : endpoint.method === "PUT"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-red-100 text-red-800"
                        }
                      >
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{endpoint.path}</code>
                      <h4 className="font-medium">{endpoint.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{endpoint.description}</p>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium mb-2">请求参数</h5>
                        <div className="space-y-2">
                          {endpoint.parameters.map((param, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                              <code className="bg-gray-100 px-1 rounded">{param.name}</code>
                              <Badge variant="outline" className="text-xs">
                                {param.type}
                              </Badge>
                              {param.required && <Badge className="bg-red-100 text-red-800 text-xs">必需</Badge>}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">响应状态</h5>
                        <div className="space-y-2">
                          {endpoint.responses.map((response, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                              <Badge
                                className={
                                  response.code < 300
                                    ? "bg-green-100 text-green-800"
                                    : response.code < 400
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-red-100 text-red-800"
                                }
                              >
                                {response.code}
                              </Badge>
                              <span>{response.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="w-5 h-5 mr-2" />
                API密钥管理
              </CardTitle>
              <CardDescription>管理您的API访问密钥</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">开发环境密钥</h4>
                    <p className="text-sm text-muted-foreground">用于开发和测试</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">dev_sk_1234...****</code>
                    <Button variant="outline" size="sm">
                      复制
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">生产环境密钥</h4>
                    <p className="text-sm text-muted-foreground">用于正式发布</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">prod_sk_5678...****</code>
                    <Button variant="outline" size="sm">
                      复制
                    </Button>
                  </div>
                </div>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  生成新密钥
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 数据分析 */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  下载趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">下载趋势图表</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  收入分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <DollarSign className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">收入分析图表</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>插件性能指标</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">98.5%</div>
                  <p className="text-sm text-muted-foreground">用户满意度</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">2.3s</div>
                  <p className="text-sm text-muted-foreground">平均响应时间</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">99.9%</div>
                  <p className="text-sm text-muted-foreground">系统可用性</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 开发资源 */}
        <TabsContent value="resources" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  开发文档
                </CardTitle>
                <CardDescription>插件开发指南和最佳实践</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <FileText className="w-4 h-4 mr-2" />
                  快速开始指南
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Code className="w-4 h-4 mr-2" />
                  API参考文档
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Shield className="w-4 h-4 mr-2" />
                  安全最佳实践
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Rocket className="w-4 h-4 mr-2" />
                  发布指南
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  开发者社区
                </CardTitle>
                <CardDescription>与其他开发者交流和协作</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Globe className="w-4 h-4 mr-2" />
                  开发者论坛
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Bug className="w-4 h-4 mr-2" />
                  问题反馈
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Users className="w-4 h-4 mr-2" />
                  技术交流群
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Zap className="w-4 h-4 mr-2" />
                  功能建议
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="w-5 h-5 mr-2" />
                开发工具
              </CardTitle>
              <CardDescription>下载开发工具和SDK</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 border rounded-lg text-center">
                  <Terminal className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <h4 className="font-medium mb-2">CLI工具</h4>
                  <p className="text-sm text-muted-foreground mb-3">命令行开发工具</p>
                  <Button size="sm" variant="outline" className="bg-transparent">
                    下载
                  </Button>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <Code className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <h4 className="font-medium mb-2">JavaScript SDK</h4>
                  <p className="text-sm text-muted-foreground mb-3">前端开发SDK</p>
                  <Button size="sm" variant="outline" className="bg-transparent">
                    下载
                  </Button>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <Database className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <h4 className="font-medium mb-2">Node.js SDK</h4>
                  <p className="text-sm text-muted-foreground mb-3">后端开发SDK</p>
                  <Button size="sm" variant="outline" className="bg-transparent">
                    下载
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 开发设置 */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>开发者信息</CardTitle>
                <CardDescription>管理您的开发者资料</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dev-name">开发者名称</Label>
                  <Input id="dev-name" defaultValue="YanYu Developer" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dev-email">联系邮箱</Label>
                  <Input id="dev-email" type="email" defaultValue="developer@yanyu.cloud" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dev-website">个人网站</Label>
                  <Input id="dev-website" defaultValue="https://yanyu.cloud" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dev-bio">个人简介</Label>
                  <Textarea id="dev-bio" placeholder="介绍您的开发经验和专长" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>开发偏好</CardTitle>
                <CardDescription>配置开发环境和通知</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>邮件通知</Label>
                    <p className="text-sm text-muted-foreground">接收插件相关的邮件通知</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>自动发布</Label>
                    <p className="text-sm text-muted-foreground">通过审核后自动发布插件</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>开发者模式</Label>
                    <p className="text-sm text-muted-foreground">启用高级开发功能</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label>默认插件分类</Label>
                  <Select defaultValue="AI & 自动化">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AI & 自动化">AI & 自动化</SelectItem>
                      <SelectItem value="财务管理">财务管理</SelectItem>
                      <SelectItem value="营销工具">营销工具</SelectItem>
                      <SelectItem value="库存管理">库存管理</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
