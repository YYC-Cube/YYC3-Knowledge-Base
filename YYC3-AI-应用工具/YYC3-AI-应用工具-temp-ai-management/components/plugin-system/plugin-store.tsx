"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Store,
  Search,
  Star,
  Download,
  TrendingUp,
  Crown,
  Shield,
  Grid,
  List,
  Heart,
  Eye,
  Sparkles,
  Gift,
} from "lucide-react"

interface StorePlugin {
  id: string
  name: string
  description: string
  longDescription: string
  version: string
  author: string
  authorAvatar: string
  category: string
  subcategory: string
  rating: number
  reviewCount: number
  downloads: number
  price: number
  originalPrice?: number
  discount?: number
  screenshots: string[]
  features: string[]
  tags: string[]
  lastUpdated: string
  size: string
  compatibility: string[]
  languages: string[]
  isNew: boolean
  isFeatured: boolean
  isPopular: boolean
  isTrending: boolean
  hasFreeTrial: boolean
  supportLevel: "community" | "standard" | "premium"
  changelog: string[]
}

const mockStorePlugins: StorePlugin[] = [
  {
    id: "1",
    name: "AI智能客服专业版",
    description: "企业级AI客服解决方案，支持多语言和情感分析",
    longDescription:
      "基于最新GPT技术的企业级智能客服系统，提供24/7全天候服务支持。支持多语言对话、情感分析、智能路由、知识库管理等高级功能。",
    version: "3.2.1",
    author: "YanYu AI Labs",
    authorAvatar: "/api/placeholder/40/40",
    category: "AI & 自动化",
    subcategory: "客服系统",
    rating: 4.9,
    reviewCount: 1247,
    downloads: 25680,
    price: 599,
    originalPrice: 799,
    discount: 25,
    screenshots: ["/api/placeholder/600/400", "/api/placeholder/600/400"],
    features: ["多语言智能对话", "情感分析与识别", "智能工单路由", "知识库自动更新", "实时性能监控", "自定义对话流程"],
    tags: ["AI", "客服", "多语言", "企业级"],
    lastUpdated: "2024-01-20",
    size: "45.2 MB",
    compatibility: ["web", "mobile", "api"],
    languages: ["中文", "英文", "日文", "韩文"],
    isNew: false,
    isFeatured: true,
    isPopular: true,
    isTrending: true,
    hasFreeTrial: true,
    supportLevel: "premium",
    changelog: ["新增情感分析功能", "优化对话响应速度", "修复已知问题"],
  },
  {
    id: "2",
    name: "智能财务分析师",
    description: "AI驱动的财务数据分析和预测工具",
    longDescription: "利用机器学习算法分析财务数据，提供智能预测和风险评估。帮助企业做出更明智的财务决策。",
    version: "2.8.0",
    author: "FinTech Solutions",
    authorAvatar: "/api/placeholder/40/40",
    category: "财务管理",
    subcategory: "数据分析",
    rating: 4.7,
    reviewCount: 892,
    downloads: 18340,
    price: 0,
    screenshots: ["/api/placeholder/600/400"],
    features: ["智能财务预测", "风险评估模型", "自动报表生成", "异常检测", "趋势分析"],
    tags: ["财务", "AI", "预测", "分析"],
    lastUpdated: "2024-01-18",
    size: "28.7 MB",
    compatibility: ["web", "desktop"],
    languages: ["中文", "英文"],
    isNew: true,
    isFeatured: false,
    isPopular: true,
    isTrending: false,
    hasFreeTrial: false,
    supportLevel: "standard",
    changelog: ["新增风险评估模型", "优化预测算法", "增加更多图表类型"],
  },
  {
    id: "3",
    name: "全渠道营销自动化",
    description: "统一管理所有营销渠道的自动化平台",
    longDescription: "集成邮件、短信、社交媒体等多个营销渠道，提供统一的营销自动化解决方案。",
    version: "1.9.5",
    author: "Marketing Pro",
    authorAvatar: "/api/placeholder/40/40",
    category: "营销工具",
    subcategory: "自动化",
    rating: 4.6,
    reviewCount: 654,
    downloads: 12890,
    price: 299,
    originalPrice: 399,
    discount: 25,
    screenshots: ["/api/placeholder/600/400"],
    features: ["多渠道统一管理", "营销流程自动化", "客户行为追踪", "A/B测试", "ROI分析"],
    tags: ["营销", "自动化", "多渠道", "ROI"],
    lastUpdated: "2024-01-15",
    size: "52.1 MB",
    compatibility: ["web", "mobile"],
    languages: ["中文", "英文"],
    isNew: false,
    isFeatured: true,
    isPopular: false,
    isTrending: true,
    hasFreeTrial: true,
    supportLevel: "premium",
    changelog: ["新增A/B测试功能", "优化用户界面", "增加更多集成选项"],
  },
]

export function PluginStore() {
  const [plugins, setPlugins] = useState<StorePlugin[]>(mockStorePlugins)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("popular")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [priceFilter, setPriceFilter] = useState("all")

  const categories = ["AI & 自动化", "财务管理", "营销工具", "库存管理", "客户服务", "数据分析", "项目管理", "人力资源"]

  const filteredPlugins = plugins.filter((plugin) => {
    const matchesSearch =
      plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = selectedCategory === "all" || plugin.category === selectedCategory

    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "free" && plugin.price === 0) ||
      (priceFilter === "paid" && plugin.price > 0)

    return matchesSearch && matchesCategory && matchesPrice
  })

  const sortedPlugins = [...filteredPlugins].sort((a, b) => {
    switch (sortBy) {
      case "popular":
        return b.downloads - a.downloads
      case "rating":
        return b.rating - a.rating
      case "newest":
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      case "price-low":
        return a.price - b.price
      case "price-high":
        return b.price - a.price
      default:
        return 0
    }
  })

  const featuredPlugins = plugins.filter((p) => p.isFeatured)
  const trendingPlugins = plugins.filter((p) => p.isTrending)
  const newPlugins = plugins.filter((p) => p.isNew)

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center">
            <Store className="h-8 w-8 mr-3 text-primary-600" />
            插件商店
          </h2>
          <p className="text-muted-foreground">发现和安装强大的业务插件</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
            <Grid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="搜索插件、功能或标签..."
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
              <SelectItem value="all">所有分类</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priceFilter} onValueChange={setPriceFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="价格" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="free">免费</SelectItem>
              <SelectItem value="paid">付费</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="排序" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">最受欢迎</SelectItem>
              <SelectItem value="rating">评分最高</SelectItem>
              <SelectItem value="newest">最新发布</SelectItem>
              <SelectItem value="price-low">价格从低到高</SelectItem>
              <SelectItem value="price-high">价格从高到低</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 商店内容 */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">全部插件</TabsTrigger>
          <TabsTrigger value="featured">精选推荐</TabsTrigger>
          <TabsTrigger value="trending">热门趋势</TabsTrigger>
          <TabsTrigger value="new">最新发布</TabsTrigger>
        </TabsList>

        {/* 全部插件 */}
        <TabsContent value="all">
          <div className="mb-4 text-sm text-muted-foreground">找到 {sortedPlugins.length} 个插件</div>

          {viewMode === "grid" ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sortedPlugins.map((plugin) => (
                <Card key={plugin.id} className="hover:shadow-lg transition-all duration-200 group">
                  <CardContent className="p-0">
                    <div className="relative">
                      <div className="aspect-video bg-gradient-to-br from-blue-50 to-purple-50 rounded-t-lg flex items-center justify-center">
                        <Store className="w-12 h-12 text-muted-foreground" />
                      </div>
                      <div className="absolute top-2 left-2 flex gap-1">
                        {plugin.isNew && (
                          <Badge className="bg-green-500 text-white text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            新品
                          </Badge>
                        )}
                        {plugin.isFeatured && (
                          <Badge className="bg-purple-500 text-white text-xs">
                            <Crown className="w-3 h-3 mr-1" />
                            精选
                          </Badge>
                        )}
                        {plugin.isTrending && (
                          <Badge className="bg-orange-500 text-white text-xs">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            热门
                          </Badge>
                        )}
                      </div>
                      {plugin.discount && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-red-500 text-white text-xs">-{plugin.discount}%</Badge>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg group-hover:text-primary-600 transition-colors">
                          {plugin.name}
                        </h3>
                        <div className="flex items-center space-x-1">
                          {plugin.supportLevel === "premium" && <Shield className="w-4 h-4 text-purple-500" />}
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
                            {plugin.rating} ({plugin.reviewCount})
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">{plugin.downloads.toLocaleString()} 下载</div>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <img
                            src={plugin.authorAvatar || "/placeholder.svg"}
                            alt={plugin.author}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-xs text-muted-foreground">{plugin.author}</span>
                        </div>
                        <div className="text-sm font-medium">
                          {plugin.price > 0 ? (
                            <div className="flex items-center space-x-1">
                              {plugin.originalPrice && (
                                <span className="text-xs text-muted-foreground line-through">
                                  ¥{plugin.originalPrice}
                                </span>
                              )}
                              <span className="text-primary-600">¥{plugin.price}</span>
                            </div>
                          ) : (
                            <span className="text-green-600">免费</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button className="flex-1" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          {plugin.price > 0 ? "购买" : "安装"}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Heart className="w-4 h-4" />
                        </Button>
                      </div>

                      {plugin.hasFreeTrial && (
                        <div className="mt-2 text-center">
                          <Button variant="link" size="sm" className="text-xs">
                            <Gift className="w-3 h-3 mr-1" />
                            免费试用
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedPlugins.map((plugin) => (
                <Card key={plugin.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Store className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold text-lg">{plugin.name}</h3>
                              <Badge variant="outline">{plugin.version}</Badge>
                              {plugin.isNew && <Badge className="bg-green-500 text-white text-xs">新品</Badge>}
                              {plugin.isFeatured && <Badge className="bg-purple-500 text-white text-xs">精选</Badge>}
                            </div>
                            <p className="text-muted-foreground mb-2">{plugin.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <img
                                  src={plugin.authorAvatar || "/placeholder.svg"}
                                  alt={plugin.author}
                                  className="w-4 h-4 rounded-full"
                                />
                                <span>{plugin.author}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < Math.floor(plugin.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                                <span>
                                  {plugin.rating} ({plugin.reviewCount})
                                </span>
                              </div>
                              <span>{plugin.downloads.toLocaleString()} 下载</span>
                              <span>更新于 {plugin.lastUpdated}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-medium mb-2">
                              {plugin.price > 0 ? (
                                <div>
                                  {plugin.originalPrice && (
                                    <div className="text-sm text-muted-foreground line-through">
                                      ¥{plugin.originalPrice}
                                    </div>
                                  )}
                                  <div className="text-primary-600">¥{plugin.price}</div>
                                </div>
                              ) : (
                                <span className="text-green-600">免费</span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm">
                                <Download className="w-4 h-4 mr-1" />
                                {plugin.price > 0 ? "购买" : "安装"}
                              </Button>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 精选推荐 */}
        <TabsContent value="featured">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredPlugins.map((plugin) => (
              <Card key={plugin.id} className="hover:shadow-lg transition-shadow border-purple-200">
                <CardContent className="p-0">
                  <div className="relative">
                    <div className="aspect-video bg-gradient-to-br from-purple-50 to-pink-50 rounded-t-lg flex items-center justify-center">
                      <Crown className="w-12 h-12 text-purple-500" />
                    </div>
                    <Badge className="absolute top-2 left-2 bg-purple-500 text-white">
                      <Crown className="w-3 h-3 mr-1" />
                      精选推荐
                    </Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{plugin.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{plugin.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < Math.floor(plugin.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">{plugin.rating}</span>
                      </div>
                      <Button size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        获取
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 热门趋势 */}
        <TabsContent value="trending">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {trendingPlugins.map((plugin) => (
              <Card key={plugin.id} className="hover:shadow-lg transition-shadow border-orange-200">
                <CardContent className="p-0">
                  <div className="relative">
                    <div className="aspect-video bg-gradient-to-br from-orange-50 to-red-50 rounded-t-lg flex items-center justify-center">
                      <TrendingUp className="w-12 h-12 text-orange-500" />
                    </div>
                    <Badge className="absolute top-2 left-2 bg-orange-500 text-white">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      热门趋势
                    </Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{plugin.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{plugin.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">{plugin.downloads.toLocaleString()} 下载</div>
                      <Button size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        获取
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 最新发布 */}
        <TabsContent value="new">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {newPlugins.map((plugin) => (
              <Card key={plugin.id} className="hover:shadow-lg transition-shadow border-green-200">
                <CardContent className="p-0">
                  <div className="relative">
                    <div className="aspect-video bg-gradient-to-br from-green-50 to-emerald-50 rounded-t-lg flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-green-500" />
                    </div>
                    <Badge className="absolute top-2 left-2 bg-green-500 text-white">
                      <Sparkles className="w-3 h-3 mr-1" />
                      最新发布
                    </Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{plugin.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{plugin.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">发布于 {plugin.lastUpdated}</div>
                      <Button size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        获取
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
