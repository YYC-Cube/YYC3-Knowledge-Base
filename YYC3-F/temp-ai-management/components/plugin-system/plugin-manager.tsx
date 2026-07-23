"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Puzzle,
  Search,
  Download,
  Upload,
  Settings,
  Play,
  Pause,
  Trash2,
  Star,
  Users,
  Shield,
  Globe,
  Database,
  Bot,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Eye,
  Plus,
  Filter,
} from "lucide-react"

interface Plugin {
  id: string
  name: string
  description: string
  version: string
  author: string
  category: string
  status: "active" | "inactive" | "installing" | "error" | "updating"
  rating: number
  downloads: number
  size: string
  lastUpdated: string
  permissions: string[]
  dependencies: string[]
  screenshots: string[]
  price: number
  isPremium: boolean
  isVerified: boolean
  compatibility: string[]
  apiVersion: string
}

interface PluginStats {
  totalPlugins: number
  activePlugins: number
  totalDownloads: number
  averageRating: number
  categories: { name: string; count: number }[]
}

const mockPlugins: Plugin[] = [
  {
    id: "1",
    name: "AI智能客服",
    description: "基于GPT的智能客服系统，支持多语言对话和情感分析",
    version: "2.1.0",
    author: "YanYu AI Team",
    category: "AI & 自动化",
    status: "active",
    rating: 4.8,
    downloads: 15420,
    size: "12.5 MB",
    lastUpdated: "2024-01-15",
    permissions: ["访问客户数据", "发送消息", "访问AI服务"],
    dependencies: ["@yanyu/ai-core", "@yanyu/chat-ui"],
    screenshots: ["/api/placeholder/400/300"],
    price: 299,
    isPremium: true,
    isVerified: true,
    compatibility: ["web", "mobile", "api"],
    apiVersion: "v3.0",
  },
  {
    id: "2",
    name: "财务报表生成器",
    description: "自动生成各类财务报表，支持自定义模板和数据可视化",
    version: "1.5.2",
    author: "Finance Pro",
    category: "财务管理",
    status: "active",
    rating: 4.6,
    downloads: 8930,
    size: "8.2 MB",
    lastUpdated: "2024-01-12",
    permissions: ["访问财务数据", "生成报表", "导出文件"],
    dependencies: ["@yanyu/charts", "@yanyu/export"],
    screenshots: ["/api/placeholder/400/300"],
    price: 0,
    isPremium: false,
    isVerified: true,
    compatibility: ["web", "desktop"],
    apiVersion: "v2.8",
  },
  {
    id: "3",
    name: "库存预警系统",
    description: "智能库存监控和预警，支持多仓库管理和自动补货建议",
    version: "3.0.1",
    author: "Supply Chain Solutions",
    category: "库存管理",
    status: "installing",
    rating: 4.7,
    downloads: 12650,
    size: "15.8 MB",
    lastUpdated: "2024-01-18",
    permissions: ["访问库存数据", "发送通知", "修改库存设置"],
    dependencies: ["@yanyu/notifications", "@yanyu/inventory-core"],
    screenshots: ["/api/placeholder/400/300"],
    price: 199,
    isPremium: true,
    isVerified: true,
    compatibility: ["web", "mobile"],
    apiVersion: "v3.0",
  },
  {
    id: "4",
    name: "社交媒体集成",
    description: "集成主流社交媒体平台，统一管理社交媒体营销活动",
    version: "1.2.8",
    author: "Social Media Hub",
    category: "营销工具",
    status: "inactive",
    rating: 4.3,
    downloads: 6780,
    size: "22.1 MB",
    lastUpdated: "2024-01-10",
    permissions: ["访问社交媒体API", "发布内容", "获取分析数据"],
    dependencies: ["@yanyu/social-apis", "@yanyu/media-manager"],
    screenshots: ["/api/placeholder/400/300"],
    price: 149,
    isPremium: true,
    isVerified: false,
    compatibility: ["web"],
    apiVersion: "v2.5",
  },
  {
    id: "5",
    name: "数据备份助手",
    description: "自动化数据备份和恢复工具，支持多种存储方式",
    version: "2.3.0",
    author: "Data Security Inc",
    category: "数据管理",
    status: "error",
    rating: 4.5,
    downloads: 9340,
    size: "18.7 MB",
    lastUpdated: "2024-01-14",
    permissions: ["访问所有数据", "创建备份", "访问云存储"],
    dependencies: ["@yanyu/backup-core", "@yanyu/cloud-storage"],
    screenshots: ["/api/placeholder/400/300"],
    price: 99,
    isPremium: true,
    isVerified: true,
    compatibility: ["web", "desktop", "server"],
    apiVersion: "v3.0",
  },
]

const mockStats: PluginStats = {
  totalPlugins: 156,
  activePlugins: 23,
  totalDownloads: 89420,
  averageRating: 4.5,
  categories: [
    { name: "AI & 自动化", count: 28 },
    { name: "财务管理", count: 22 },
    { name: "库存管理", count: 18 },
    { name: "营销工具", count: 15 },
    { name: "数据管理", count: 12 },
    { name: "客户服务", count: 10 },
  ],
}

export function PluginManager() {
  const [plugins, setPlugins] = useState<Plugin[]>(mockPlugins)
  const [stats, setStats] = useState<PluginStats>(mockStats)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null)
  const [showInstallDialog, setShowInstallDialog] = useState(false)
  const [installProgress, setInstallProgress] = useState(0)
  const [isInstalling, setIsInstalling] = useState(false)

  const filteredPlugins = plugins.filter((plugin) => {
    const matchesSearch =
      plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || plugin.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getStatusBadge = (status: Plugin["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">运行中</Badge>
      case "inactive":
        return <Badge variant="secondary">已停用</Badge>
      case "installing":
        return <Badge className="bg-blue-100 text-blue-800 animate-pulse">安装中</Badge>
      case "updating":
        return <Badge className="bg-purple-100 text-purple-800 animate-pulse">更新中</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800">错误</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getStatusIcon = (status: Plugin["status"]) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "inactive":
        return <Pause className="w-4 h-4 text-gray-600" />
      case "installing":
      case "updating":
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Eye className="w-4 h-4 text-gray-600" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "AI & 自动化":
        return <Bot className="w-4 h-4" />
      case "财务管理":
        return <TrendingUp className="w-4 h-4" />
      case "库存管理":
        return <Package className="w-4 h-4" />
      case "营销工具":
        return <Globe className="w-4 h-4" />
      case "数据管理":
        return <Database className="w-4 h-4" />
      case "客户服务":
        return <Users className="w-4 h-4" />
      default:
        return <Puzzle className="w-4 h-4" />
    }
  }

  const handlePluginAction = (pluginId: string, action: string) => {
    setPlugins((prev) =>
      prev.map((plugin) => {
        if (plugin.id === pluginId) {
          switch (action) {
            case "activate":
              return { ...plugin, status: "active" as const }
            case "deactivate":
              return { ...plugin, status: "inactive" as const }
            case "uninstall":
              return { ...plugin, status: "inactive" as const }
            default:
              return plugin
          }
        }
        return plugin
      }),
    )
  }

  const handleInstallPlugin = async () => {
    if (!selectedPlugin) return

    setIsInstalling(true)
    setInstallProgress(0)

    // 模拟安装过程
    const installSteps = [
      { step: "下载插件包", progress: 20 },
      { step: "验证插件签名", progress: 40 },
      { step: "检查依赖关系", progress: 60 },
      { step: "安装插件文件", progress: 80 },
      { step: "配置插件设置", progress: 100 },
    ]

    for (const { progress } of installSteps) {
      await new Promise((resolve) => setTimeout(resolve, 800))
      setInstallProgress(progress)
    }

    // 更新插件状态
    setPlugins((prev) =>
      prev.map((plugin) => (plugin.id === selectedPlugin.id ? { ...plugin, status: "active" as const } : plugin)),
    )

    setIsInstalling(false)
    setShowInstallDialog(false)
    setSelectedPlugin(null)
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center">
            <Puzzle className="h-8 w-8 mr-3 text-primary-600" />
            插件管理中心
          </h2>
          <p className="text-muted-foreground">管理和扩展您的商务系统功能</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            上传插件
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            开发插件
          </Button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已安装插件</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePlugins}</div>
            <p className="text-xs text-muted-foreground">共 {stats.totalPlugins} 个可用</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总下载量</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDownloads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12.5% 较上月</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均评分</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating}</div>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < Math.floor(stats.averageRating) ? "text-yellow-400 fill-current" : "text-gray-300"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">插件分类</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categories.length}</div>
            <p className="text-xs text-muted-foreground">覆盖主要业务场景</p>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="搜索插件名称或描述..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="选择分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有分类</SelectItem>
            {stats.categories.map((category) => (
              <SelectItem key={category.name} value={category.name}>
                {category.name} ({category.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 插件管理选项卡 */}
      <Tabs defaultValue="installed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="installed">已安装插件</TabsTrigger>
          <TabsTrigger value="available">可用插件</TabsTrigger>
          <TabsTrigger value="categories">分类浏览</TabsTrigger>
          <TabsTrigger value="settings">插件设置</TabsTrigger>
        </TabsList>

        {/* 已安装插件 */}
        <TabsContent value="installed" className="space-y-4">
          <div className="grid gap-4">
            {filteredPlugins
              .filter((p) => p.status === "active" || p.status === "inactive")
              .map((plugin) => (
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
                            {plugin.isVerified && (
                              <Badge className="bg-blue-100 text-blue-800">
                                <Shield className="w-3 h-3 mr-1" />
                                已验证
                              </Badge>
                            )}
                            {plugin.isPremium && (
                              <Badge className="bg-purple-100 text-purple-800">
                                <Star className="w-3 h-3 mr-1" />
                                高级版
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground mb-3">{plugin.description}</p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div className="text-sm">
                              <span className="text-muted-foreground">作者:</span>
                              <span className="ml-1 font-medium">{plugin.author}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">分类:</span>
                              <span className="ml-1 font-medium">{plugin.category}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">大小:</span>
                              <span className="ml-1 font-medium">{plugin.size}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">下载量:</span>
                              <span className="ml-1 font-medium">{plugin.downloads.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
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
                            <span>更新时间: {plugin.lastUpdated}</span>
                            <span>API版本: {plugin.apiVersion}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {plugin.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePluginAction(plugin.id, "deactivate")}
                          >
                            <Pause className="w-4 h-4 mr-1" />
                            停用
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => handlePluginAction(plugin.id, "activate")}>
                            <Play className="w-4 h-4 mr-1" />
                            启用
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handlePluginAction(plugin.id, "uninstall")}>
                          <Trash2 className="w-4 h-4 mr-1" />
                          卸载
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* 可用插件 */}
        <TabsContent value="available" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlugins.map((plugin) => (
              <Card key={plugin.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-0">
                  <div className="aspect-video bg-gradient-to-br from-blue-50 to-purple-50 rounded-t-lg flex items-center justify-center">
                    {getCategoryIcon(plugin.category)}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{plugin.name}</h3>
                      <div className="flex items-center space-x-1">
                        {plugin.isVerified && <Shield className="w-4 h-4 text-blue-500" />}
                        {plugin.isPremium && <Star className="w-4 h-4 text-purple-500" />}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{plugin.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < Math.floor(plugin.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({plugin.downloads.toLocaleString()})
                        </span>
                      </div>
                      <div className="text-sm font-medium">{plugin.price > 0 ? `¥${plugin.price}` : "免费"}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {plugin.author} • {plugin.version}
                      </div>
                      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm" onClick={() => setSelectedPlugin(plugin)}>
                            <Download className="w-4 h-4 mr-1" />
                            安装
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center space-x-2">
                              <Package className="h-5 w-5" />
                              <span>安装插件 - {selectedPlugin?.name}</span>
                            </DialogTitle>
                            <DialogDescription>请确认插件信息和权限要求</DialogDescription>
                          </DialogHeader>

                          {selectedPlugin && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>插件名称</Label>
                                  <p className="font-medium">{selectedPlugin.name}</p>
                                </div>
                                <div>
                                  <Label>版本</Label>
                                  <p className="font-medium">{selectedPlugin.version}</p>
                                </div>
                                <div>
                                  <Label>作者</Label>
                                  <p className="font-medium">{selectedPlugin.author}</p>
                                </div>
                                <div>
                                  <Label>大小</Label>
                                  <p className="font-medium">{selectedPlugin.size}</p>
                                </div>
                              </div>

                              <div>
                                <Label>插件描述</Label>
                                <p className="text-sm text-muted-foreground mt-1">{selectedPlugin.description}</p>
                              </div>

                              <div>
                                <Label>权限要求</Label>
                                <div className="mt-2 space-y-2">
                                  {selectedPlugin.permissions.map((permission, index) => (
                                    <div key={index} className="flex items-center space-x-2">
                                      <Shield className="w-4 h-4 text-orange-500" />
                                      <span className="text-sm">{permission}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <Label>依赖项</Label>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {selectedPlugin.dependencies.map((dep, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {dep}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {isInstalling && (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>安装进度</span>
                                    <span>{installProgress}%</span>
                                  </div>
                                  <Progress value={installProgress} className="h-2" />
                                </div>
                              )}
                            </div>
                          )}

                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setShowInstallDialog(false)}
                              disabled={isInstalling}
                            >
                              取消
                            </Button>
                            <Button onClick={handleInstallPlugin} disabled={isInstalling}>
                              {isInstalling ? (
                                <>
                                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                                  安装中...
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4 mr-2" />
                                  确认安装
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
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
            {stats.categories.map((category) => (
              <Card key={category.name} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    {getCategoryIcon(category.name)}
                    <h3 className="font-semibold">{category.name}</h3>
                  </div>
                  <p className="text-2xl font-bold text-primary-600 mb-2">{category.count}</p>
                  <p className="text-sm text-muted-foreground">个可用插件</p>
                  <Button variant="outline" className="w-full mt-4 bg-transparent">
                    浏览插件
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 插件设置 */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>插件系统设置</CardTitle>
                <CardDescription>配置插件系统的全局设置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>自动更新插件</Label>
                    <p className="text-sm text-muted-foreground">自动检查并安装插件更新</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>允许未验证插件</Label>
                    <p className="text-sm text-muted-foreground">允许安装未经官方验证的插件</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>插件使用统计</Label>
                    <p className="text-sm text-muted-foreground">收集插件使用数据以改进体验</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>开发者模式</Label>
                    <p className="text-sm text-muted-foreground">启用插件开发和调试功能</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>安全设置</CardTitle>
                <CardDescription>配置插件安全和权限控制</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>插件权限级别</Label>
                  <Select defaultValue="standard">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strict">严格模式</SelectItem>
                      <SelectItem value="standard">标准模式</SelectItem>
                      <SelectItem value="permissive">宽松模式</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>插件沙箱</Label>
                  <Select defaultValue="enabled">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">启用沙箱</SelectItem>
                      <SelectItem value="disabled">禁用沙箱</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>最大内存使用 (MB)</Label>
                  <Input type="number" defaultValue="512" />
                </div>
                <div className="space-y-2">
                  <Label>插件超时时间 (秒)</Label>
                  <Input type="number" defaultValue="30" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
