"use client"

import { useState } from "react"
import {
  BookOpen,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Tag,
  Users,
  Star,
  Share,
  Filter,
  MoreHorizontal,
  FileText,
  ImageIcon,
  Video,
  Music,
  Link,
  Brain,
  Lightbulb,
  TrendingUp,
  BarChart3,
  Network,
  Database,
  Cpu,
  RefreshCw,
  MessageSquare,
  ThumbsUp,
  Bookmark,
  ExternalLink,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { EnhancedCard } from "../design-system/enhanced-card-system"
import { EnhancedButton } from "../design-system/enhanced-button-system"
import { AnimatedContainer } from "../design-system/animation-system"
import { useSound } from "../design-system/sound-system"

// 数据类型定义
interface KnowledgeItem {
  id: string
  title: string
  type: "document" | "video" | "audio" | "image" | "link" | "dataset" | "model"
  content: string
  summary: string
  tags: string[]
  category: string
  author: string
  authorAvatar?: string
  createdAt: string
  updatedAt: string
  views: number
  likes: number
  dislikes: number
  bookmarks: number
  comments: number
  rating: number
  status: "published" | "draft" | "archived" | "review"
  visibility: "public" | "private" | "team"
  size: number // KB
  language: string
  difficulty: "beginner" | "intermediate" | "advanced" | "expert"
  estimatedReadTime: number // minutes
  relatedItems: string[]
  attachments: string[]
  metadata: Record<string, any>
}

interface KnowledgeCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  itemCount: number
  subcategories: string[]
  parentCategory?: string
}

interface KnowledgeGraph {
  nodes: Array<{
    id: string
    title: string
    type: string
    category: string
    connections: number
  }>
  edges: Array<{
    source: string
    target: string
    weight: number
    type: "related" | "reference" | "dependency"
  }>
}

interface SearchFilter {
  query: string
  type: string
  category: string
  author: string
  dateRange: string
  difficulty: string
  language: string
  tags: string[]
}

// 模拟数据
const mockKnowledgeItems: KnowledgeItem[] = [
  {
    id: "kb-1",
    title: "深度学习基础理论与实践",
    type: "document",
    content: "深度学习是机器学习的一个分支，它基于人工神经网络的表示学习...",
    summary: "全面介绍深度学习的基础理论、核心算法和实际应用案例",
    tags: ["深度学习", "神经网络", "机器学习", "AI"],
    category: "人工智能",
    author: "张AI专家",
    authorAvatar: "/placeholder.svg",
    createdAt: "2024-01-15",
    updatedAt: "2024-01-20",
    views: 1250,
    likes: 89,
    dislikes: 3,
    bookmarks: 156,
    comments: 23,
    rating: 4.8,
    status: "published",
    visibility: "public",
    size: 2048,
    language: "中文",
    difficulty: "intermediate",
    estimatedReadTime: 45,
    relatedItems: ["kb-2", "kb-5"],
    attachments: ["deep_learning_slides.pdf", "code_examples.zip"],
    metadata: { format: "markdown", version: "2.1" },
  },
  {
    id: "kb-2",
    title: "TensorFlow 2.0 实战教程",
    type: "video",
    content: "TensorFlow 2.0 的核心概念和实际应用演示...",
    summary: "通过实际项目演示TensorFlow 2.0的使用方法和最佳实践",
    tags: ["TensorFlow", "深度学习", "Python", "教程"],
    category: "技术文档",
    author: "李ML工程师",
    createdAt: "2024-01-18",
    updatedAt: "2024-01-19",
    views: 890,
    likes: 67,
    dislikes: 2,
    bookmarks: 98,
    comments: 15,
    rating: 4.6,
    status: "published",
    visibility: "public",
    size: 512000,
    language: "中文",
    difficulty: "beginner",
    estimatedReadTime: 120,
    relatedItems: ["kb-1", "kb-3"],
    attachments: ["tensorflow_tutorial.mp4"],
    metadata: { duration: "2h 15m", resolution: "1080p" },
  },
  {
    id: "kb-3",
    title: "数据预处理最佳实践",
    type: "document",
    content: "数据预处理是机器学习项目中最重要的步骤之一...",
    summary: "详细介绍数据清洗、特征工程和数据增强的方法和技巧",
    tags: ["数据预处理", "特征工程", "数据清洗", "机器学习"],
    category: "数据科学",
    author: "王数据科学家",
    createdAt: "2024-01-12",
    updatedAt: "2024-01-21",
    views: 756,
    likes: 45,
    dislikes: 1,
    bookmarks: 78,
    comments: 12,
    rating: 4.7,
    status: "published",
    visibility: "team",
    size: 1024,
    language: "中文",
    difficulty: "intermediate",
    estimatedReadTime: 30,
    relatedItems: ["kb-4"],
    attachments: ["preprocessing_notebook.ipynb"],
    metadata: { format: "jupyter", cells: 45 },
  },
  {
    id: "kb-4",
    title: "推荐系统算法对比分析",
    type: "document",
    content: "推荐系统是现代互联网应用的核心组件...",
    summary: "对比分析协同过滤、内容过滤和混合推荐算法的优缺点",
    tags: ["推荐系统", "协同过滤", "算法对比", "机器学习"],
    category: "算法研究",
    author: "陈算法工程师",
    createdAt: "2024-01-10",
    updatedAt: "2024-01-16",
    views: 623,
    likes: 38,
    dislikes: 0,
    bookmarks: 67,
    comments: 8,
    rating: 4.9,
    status: "published",
    visibility: "public",
    size: 1536,
    language: "中文",
    difficulty: "advanced",
    estimatedReadTime: 35,
    relatedItems: ["kb-3"],
    attachments: ["recommendation_comparison.pdf"],
    metadata: { format: "pdf", pages: 28 },
  },
  {
    id: "kb-5",
    title: "AI模型部署指南",
    type: "document",
    content: "将训练好的AI模型部署到生产环境的完整指南...",
    summary: "从模型优化到容器化部署的完整流程和注意事项",
    tags: ["模型部署", "Docker", "Kubernetes", "MLOps"],
    category: "运维部署",
    author: "刘DevOps工程师",
    createdAt: "2024-01-08",
    updatedAt: "2024-01-14",
    views: 445,
    likes: 29,
    dislikes: 1,
    bookmarks: 52,
    comments: 6,
    rating: 4.5,
    status: "published",
    visibility: "team",
    size: 896,
    language: "中文",
    difficulty: "expert",
    estimatedReadTime: 25,
    relatedItems: ["kb-1"],
    attachments: ["deployment_scripts.zip", "docker_configs.tar.gz"],
    metadata: { format: "markdown", scripts: 12 },
  },
]

const mockCategories: KnowledgeCategory[] = [
  {
    id: "cat-1",
    name: "人工智能",
    description: "AI相关的理论、算法和应用",
    icon: "Brain",
    color: "blue",
    itemCount: 45,
    subcategories: ["机器学习", "深度学习", "自然语言处理", "计算机视觉"],
  },
  {
    id: "cat-2",
    name: "数据科学",
    description: "数据分析、处理和可视化",
    icon: "BarChart3",
    color: "green",
    itemCount: 32,
    subcategories: ["数据分析", "数据可视化", "统计学", "数据挖掘"],
  },
  {
    id: "cat-3",
    name: "技术文档",
    description: "技术教程、API文档和开发指南",
    icon: "FileText",
    color: "purple",
    itemCount: 67,
    subcategories: ["API文档", "开发教程", "最佳实践", "代码示例"],
  },
  {
    id: "cat-4",
    name: "算法研究",
    description: "算法理论和实现研究",
    icon: "Target",
    color: "orange",
    itemCount: 28,
    subcategories: ["排序算法", "搜索算法", "优化算法", "图算法"],
  },
  {
    id: "cat-5",
    name: "运维部署",
    description: "系统运维和应用部署",
    icon: "Settings",
    color: "red",
    itemCount: 19,
    subcategories: ["容器化", "CI/CD", "监控告警", "性能优化"],
  },
]

export function KnowledgeBase() {
  const [selectedTab, setSelectedTab] = useState("browse")
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>(mockKnowledgeItems)
  const [categories, setCategories] = useState<KnowledgeCategory[]>(mockCategories)
  const [searchFilter, setSearchFilter] = useState<SearchFilter>({
    query: "",
    type: "all",
    category: "all",
    author: "all",
    dateRange: "all",
    difficulty: "all",
    language: "all",
    tags: [],
  })
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null)
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const { playSound } = useSound()

  // 过滤知识项目
  const filteredItems = knowledgeItems.filter((item) => {
    const matchesQuery =
      item.title.toLowerCase().includes(searchFilter.query.toLowerCase()) ||
      item.content.toLowerCase().includes(searchFilter.query.toLowerCase()) ||
      item.tags.some((tag) => tag.toLowerCase().includes(searchFilter.query.toLowerCase()))

    const matchesType = searchFilter.type === "all" || item.type === searchFilter.type
    const matchesCategory = searchFilter.category === "all" || item.category === searchFilter.category
    const matchesAuthor = searchFilter.author === "all" || item.author === searchFilter.author
    const matchesDifficulty = searchFilter.difficulty === "all" || item.difficulty === searchFilter.difficulty
    const matchesLanguage = searchFilter.language === "all" || item.language === searchFilter.language

    return matchesQuery && matchesType && matchesCategory && matchesAuthor && matchesDifficulty && matchesLanguage
  })

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="w-4 h-4" />
      case "video":
        return <Video className="w-4 h-4" />
      case "audio":
        return <Music className="w-4 h-4" />
      case "image":
        return <ImageIcon className="w-4 h-4" />
      case "link":
        return <Link className="w-4 h-4" />
      case "dataset":
        return <Database className="w-4 h-4" />
      case "model":
        return <Cpu className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  // 获取难度颜色
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800"
      case "intermediate":
        return "bg-yellow-100 text-yellow-800"
      case "advanced":
        return "bg-orange-100 text-orange-800"
      case "expert":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      published: { label: "已发布", className: "bg-green-100 text-green-800" },
      draft: { label: "草稿", className: "bg-gray-100 text-gray-800" },
      archived: { label: "已归档", className: "bg-yellow-100 text-yellow-800" },
      review: { label: "审核中", className: "bg-blue-100 text-blue-800" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.published
    return <Badge className={config.className}>{config.label}</Badge>
  }

  // 格式化文件大小
  const formatFileSize = (sizeInKB: number) => {
    if (sizeInKB < 1024) return `${sizeInKB} KB`
    if (sizeInKB < 1024 * 1024) return `${(sizeInKB / 1024).toFixed(1)} MB`
    return `${(sizeInKB / (1024 * 1024)).toFixed(1)} GB`
  }

  // 处理项目操作
  const handleItemAction = (itemId: string, action: string) => {
    playSound("click")
    console.log(`Item ${itemId} action: ${action}`)

    if (action === "like") {
      setKnowledgeItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, likes: item.likes + 1 } : item)))
    } else if (action === "bookmark") {
      setKnowledgeItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, bookmarks: item.bookmarks + 1 } : item)),
      )
    } else if (action === "view") {
      setKnowledgeItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, views: item.views + 1 } : item)))
      setSelectedItem(knowledgeItems.find((item) => item.id === itemId) || null)
    }
  }

  // 创建新项目
  const handleCreateItem = () => {
    playSound("success")
    setIsCreateItemOpen(false)
    // 这里可以添加创建项目的逻辑
  }

  return (
    <div className="space-y-6">
      {/* 知识库概览 */}
      <AnimatedContainer animation="fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">知识条目</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-primary-600">{knowledgeItems.length}</div>
                <BookOpen className="w-4 h-4 text-primary-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {knowledgeItems.filter((item) => item.status === "published").length} 个已发布
              </p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">知识分类</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-blue-600">{categories.length}</div>
                <Tag className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {categories.reduce((acc, cat) => acc + cat.itemCount, 0)} 个总条目
              </p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总浏览量</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-green-600">
                  {knowledgeItems.reduce((acc, item) => acc + item.views, 0).toLocaleString()}
                </div>
                <Eye className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">+15.2% 较上月</p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">平均评分</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-accent-600">
                  {(knowledgeItems.reduce((acc, item) => acc + item.rating, 0) / knowledgeItems.length).toFixed(1)}
                </div>
                <Star className="w-4 h-4 text-accent-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">基于用户评价</p>
            </CardContent>
          </EnhancedCard>
        </div>
      </AnimatedContainer>

      {/* 主要功能区域 */}
      <AnimatedContainer animation="slideUp" delay={200}>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="browse">浏览知识</TabsTrigger>
            <TabsTrigger value="categories">分类管理</TabsTrigger>
            <TabsTrigger value="search">智能搜索</TabsTrigger>
            <TabsTrigger value="analytics">知识分析</TabsTrigger>
            <TabsTrigger value="graph">知识图谱</TabsTrigger>
          </TabsList>

          {/* 浏览知识 */}
          <TabsContent value="browse" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold">知识库浏览</h3>
                <p className="text-sm text-muted-foreground">浏览和管理知识库内容</p>
              </div>
              <div className="flex w-full sm:w-auto gap-2">
                <div className="relative flex-1 sm:flex-none sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="搜索知识..."
                    className="w-full pl-9"
                    value={searchFilter.query}
                    onChange={(e) => setSearchFilter((prev) => ({ ...prev, query: e.target.value }))}
                  />
                </div>
                <Select
                  value={searchFilter.category}
                  onValueChange={(value) => setSearchFilter((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="所有分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有分类</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={isCreateItemOpen} onOpenChange={setIsCreateItemOpen}>
                  <DialogTrigger asChild>
                    <EnhancedButton variant="primary" soundType="click">
                      <Plus className="w-4 h-4 mr-2" />
                      新增知识
                    </EnhancedButton>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>新增知识条目</DialogTitle>
                      <DialogDescription>创建新的知识库条目</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="item-title">标题</Label>
                          <Input id="item-title" placeholder="输入知识条目标题" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="item-type">类型</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="选择类型" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="document">文档</SelectItem>
                              <SelectItem value="video">视频</SelectItem>
                              <SelectItem value="audio">音频</SelectItem>
                              <SelectItem value="image">图片</SelectItem>
                              <SelectItem value="link">链接</SelectItem>
                              <SelectItem value="dataset">数据集</SelectItem>
                              <SelectItem value="model">模型</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="item-summary">摘要</Label>
                        <Textarea id="item-summary" placeholder="简要描述这个知识条目..." />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="item-content">内容</Label>
                        <Textarea id="item-content" placeholder="详细内容..." className="min-h-[120px]" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="item-category">分类</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="选择分类" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.name}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="item-difficulty">难度</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="选择难度" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beginner">初级</SelectItem>
                              <SelectItem value="intermediate">中级</SelectItem>
                              <SelectItem value="advanced">高级</SelectItem>
                              <SelectItem value="expert">专家</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="item-tags">标签 (逗号分隔)</Label>
                        <Input id="item-tags" placeholder="例如: 机器学习, Python, 教程" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateItemOpen(false)}>
                        取消
                      </Button>
                      <EnhancedButton variant="primary" onClick={handleCreateItem} soundType="success">
                        创建条目
                      </EnhancedButton>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* 知识条目列表 */}
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
              {filteredItems.map((item, index) => (
                <AnimatedContainer key={item.id} animation="slideUp" delay={index * 100}>
                  <EnhancedCard variant="modern" className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(item.type)}
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleItemAction(item.id, "view")}>
                              <Eye className="w-4 h-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleItemAction(item.id, "edit")}>
                              <Edit className="w-4 h-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleItemAction(item.id, "share")}>
                              <Share className="w-4 h-4 mr-2" />
                              分享
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleItemAction(item.id, "download")}>
                              <Download className="w-4 h-4 mr-2" />
                              下载
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleItemAction(item.id, "delete")}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <h4
                        className="font-medium text-lg mb-2 line-clamp-2"
                        onClick={() => handleItemAction(item.id, "view")}
                      >
                        {item.title}
                      </h4>

                      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{item.summary}</p>

                      <div className="flex items-center space-x-2 mb-3">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={item.authorAvatar || "/placeholder.svg"} />
                          <AvatarFallback>{item.author.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{item.author}</span>
                        <Badge className={getDifficultyColor(item.difficulty)} variant="secondary">
                          {item.difficulty}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {item.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{item.tags.length - 3}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                        <span>{formatFileSize(item.size)}</span>
                        <span>{item.estimatedReadTime} 分钟阅读</span>
                        <span>{item.updatedAt}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Eye className="w-3 h-3" />
                            <span>{item.views}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ThumbsUp className="w-3 h-3" />
                            <span>{item.likes}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Bookmark className="w-3 h-3" />
                            <span>{item.bookmarks}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleItemAction(item.id, "like")}>
                            <ThumbsUp className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleItemAction(item.id, "bookmark")}>
                            <Bookmark className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <EnhancedCard variant="modern" className="p-8 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <BookOpen className="w-12 h-12 mb-2 opacity-50" />
                  <h3 className="text-lg font-medium mb-1">未找到知识条目</h3>
                  <p>没有匹配搜索条件的知识条目</p>
                  <Button
                    variant="secondary"
                    className="mt-4"
                    onClick={() =>
                      setSearchFilter({
                        query: "",
                        type: "all",
                        category: "all",
                        author: "all",
                        dateRange: "all",
                        difficulty: "all",
                        language: "all",
                        tags: [],
                      })
                    }
                  >
                    清除筛选
                  </Button>
                </div>
              </EnhancedCard>
            )}
          </TabsContent>

          {/* 分类管理 */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">知识分类管理</h3>
              <EnhancedButton variant="primary" soundType="click">
                <Plus className="w-4 h-4 mr-2" />
                新增分类
              </EnhancedButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category, index) => (
                <AnimatedContainer key={category.id} animation="slideUp" delay={index * 100}>
                  <EnhancedCard variant="modern" className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-lg bg-${category.color}-100`}>
                          <Brain className={`w-6 h-6 text-${category.color}-600`} />
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>

                      <h4 className="font-medium text-lg mb-2">{category.name}</h4>
                      <p className="text-sm text-muted-foreground mb-4">{category.description}</p>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">条目数量</span>
                          <Badge variant="secondary">{category.itemCount}</Badge>
                        </div>

                        <div className="space-y-2">
                          <span className="text-sm font-medium">子分类</span>
                          <div className="flex flex-wrap gap-1">
                            {category.subcategories.map((sub, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {sub}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex space-x-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                            <Eye className="w-4 h-4 mr-1" />
                            查看
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                            <Edit className="w-4 h-4 mr-1" />
                            编辑
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 智能搜索 */}
          <TabsContent value="search" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">智能搜索</h3>
              <EnhancedButton variant="secondary" soundType="click">
                <Filter className="w-4 h-4 mr-2" />
                高级筛选
              </EnhancedButton>
            </div>

            <EnhancedCard variant="modern">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      placeholder="输入关键词搜索知识库..."
                      className="pl-10 h-12 text-lg"
                      value={searchFilter.query}
                      onChange={(e) => setSearchFilter((prev) => ({ ...prev, query: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Select
                      value={searchFilter.type}
                      onValueChange={(value) => setSearchFilter((prev) => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="内容类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有类型</SelectItem>
                        <SelectItem value="document">文档</SelectItem>
                        <SelectItem value="video">视频</SelectItem>
                        <SelectItem value="audio">音频</SelectItem>
                        <SelectItem value="image">图片</SelectItem>
                        <SelectItem value="link">链接</SelectItem>
                        <SelectItem value="dataset">数据集</SelectItem>
                        <SelectItem value="model">模型</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={searchFilter.difficulty}
                      onValueChange={(value) => setSearchFilter((prev) => ({ ...prev, difficulty: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="难度等级" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有难度</SelectItem>
                        <SelectItem value="beginner">初级</SelectItem>
                        <SelectItem value="intermediate">中级</SelectItem>
                        <SelectItem value="advanced">高级</SelectItem>
                        <SelectItem value="expert">专家</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={searchFilter.author}
                      onValueChange={(value) => setSearchFilter((prev) => ({ ...prev, author: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="作者" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有作者</SelectItem>
                        {Array.from(new Set(knowledgeItems.map((item) => item.author))).map((author) => (
                          <SelectItem key={author} value={author}>
                            {author}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={searchFilter.dateRange}
                      onValueChange={(value) => setSearchFilter((prev) => ({ ...prev, dateRange: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="时间范围" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有时间</SelectItem>
                        <SelectItem value="today">今天</SelectItem>
                        <SelectItem value="week">本周</SelectItem>
                        <SelectItem value="month">本月</SelectItem>
                        <SelectItem value="year">今年</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">找到 {filteredItems.length} 个相关结果</div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setSearchFilter({
                          query: "",
                          type: "all",
                          category: "all",
                          author: "all",
                          dateRange: "all",
                          difficulty: "all",
                          language: "all",
                          tags: [],
                        })
                      }
                    >
                      重置筛选
                    </Button>
                  </div>
                </div>
              </CardContent>
            </EnhancedCard>

            {/* 搜索结果 */}
            <div className="space-y-4">
              {filteredItems.slice(0, 10).map((item) => (
                <EnhancedCard key={item.id} variant="modern" className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-2 bg-primary-50 rounded-lg">{getTypeIcon(item.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-lg">{item.title}</h4>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(item.status)}
                            <Badge className={getDifficultyColor(item.difficulty)} variant="secondary">
                              {item.difficulty}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{item.summary}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>作者: {item.author}</span>
                            <span>更新: {item.updatedAt}</span>
                            <span>浏览: {item.views}</span>
                            <span>评分: {item.rating}</span>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleItemAction(item.id, "view")}>
                              <Eye className="w-4 h-4 mr-1" />
                              查看
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleItemAction(item.id, "bookmark")}>
                              <Bookmark className="w-4 h-4 mr-1" />
                              收藏
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </EnhancedCard>
              ))}
            </div>
          </TabsContent>

          {/* 知识分析 */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">知识分析</h3>
              <EnhancedButton variant="secondary" soundType="click">
                <Download className="w-4 h-4 mr-2" />
                导出报告
              </EnhancedButton>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* 内容统计 */}
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>内容统计</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categories.map((category) => (
                      <div key={category.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{category.name}</span>
                          <span className="font-medium">{category.itemCount} 个</span>
                        </div>
                        <Progress
                          value={(category.itemCount / categories.reduce((acc, cat) => acc + cat.itemCount, 0)) * 100}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </EnhancedCard>

              {/* 用户参与度 */}
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>用户参与度</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">总浏览量</span>
                      <span className="font-medium">
                        {knowledgeItems.reduce((acc, item) => acc + item.views, 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">总点赞数</span>
                      <span className="font-medium">{knowledgeItems.reduce((acc, item) => acc + item.likes, 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">总收藏数</span>
                      <span className="font-medium">
                        {knowledgeItems.reduce((acc, item) => acc + item.bookmarks, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">总评论数</span>
                      <span className="font-medium">
                        {knowledgeItems.reduce((acc, item) => acc + item.comments, 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>

              {/* 热门内容 */}
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>热门内容</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {knowledgeItems
                      .sort((a, b) => b.views - a.views)
                      .slice(0, 5)
                      .map((item, index) => (
                        <div key={item.id} className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-xs font-medium text-primary-600">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.title}</div>
                            <div className="text-xs text-muted-foreground">{item.views} 次浏览</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </EnhancedCard>

              {/* 质量评估 */}
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="w-5 h-5" />
                    <span>质量评估</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">平均评分</span>
                      <span className="font-medium">
                        {(knowledgeItems.reduce((acc, item) => acc + item.rating, 0) / knowledgeItems.length).toFixed(
                          1,
                        )}{" "}
                        / 5.0
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">高质量内容</span>
                      <span className="font-medium text-green-600">
                        {knowledgeItems.filter((item) => item.rating >= 4.5).length} 个
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">需要改进</span>
                      <span className="font-medium text-yellow-600">
                        {knowledgeItems.filter((item) => item.rating < 4.0).length} 个
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">完成度</span>
                      <span className="font-medium">
                        {Math.round(
                          (knowledgeItems.filter((item) => item.status === "published").length /
                            knowledgeItems.length) *
                            100,
                        )}
                        %
                      </span>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </div>
          </TabsContent>

          {/* 知识图谱 */}
          <TabsContent value="graph" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">知识图谱</h3>
              <div className="flex space-x-2">
                <EnhancedButton variant="secondary" soundType="click">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新生成
                </EnhancedButton>
                <EnhancedButton variant="secondary" soundType="click">
                  <Download className="w-4 h-4 mr-2" />
                  导出图谱
                </EnhancedButton>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* 图谱可视化 */}
              <div className="md:col-span-2">
                <EnhancedCard variant="modern" className="h-96">
                  <CardContent className="p-6 h-full">
                    <div className="h-full bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Network className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                        <h4 className="text-lg font-medium mb-2">知识图谱可视化</h4>
                        <p className="text-sm text-muted-foreground">展示知识条目之间的关联关系</p>
                      </div>
                    </div>
                  </CardContent>
                </EnhancedCard>
              </div>

              {/* 图谱统计 */}
              <div className="space-y-4">
                <EnhancedCard variant="modern">
                  <CardHeader>
                    <CardTitle className="text-base">图谱统计</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">节点数量</span>
                        <span className="font-medium">{knowledgeItems.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">连接数量</span>
                        <span className="font-medium">
                          {knowledgeItems.reduce((acc, item) => acc + item.relatedItems.length, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">聚类数量</span>
                        <span className="font-medium">{categories.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">平均连接度</span>
                        <span className="font-medium">
                          {(
                            knowledgeItems.reduce((acc, item) => acc + item.relatedItems.length, 0) /
                            knowledgeItems.length
                          ).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </EnhancedCard>

                <EnhancedCard variant="modern">
                  <CardHeader>
                    <CardTitle className="text-base">核心节点</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {knowledgeItems
                        .sort((a, b) => b.relatedItems.length - a.relatedItems.length)
                        .slice(0, 5)
                        .map((item, index) => (
                          <div key={item.id} className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs font-medium text-purple-600">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{item.title}</div>
                              <div className="text-xs text-muted-foreground">{item.relatedItems.length} 个连接</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </EnhancedCard>
              </div>
            </div>

            {/* 关联推荐 */}
            <EnhancedCard variant="modern">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5" />
                  <span>智能推荐</span>
                </CardTitle>
                <CardDescription>基于知识图谱的内容推荐</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {knowledgeItems.slice(0, 6).map((item) => (
                    <div key={item.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start space-x-3">
                        {getTypeIcon(item.type)}
                        <div className="flex-1">
                          <h5 className="font-medium text-sm mb-1">{item.title}</h5>
                          <p className="text-xs text-muted-foreground mb-2">{item.summary.slice(0, 80)}...</p>
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">
                              {item.category}
                            </Badge>
                            <Button variant="ghost" size="sm" onClick={() => handleItemAction(item.id, "view")}>
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>
        </Tabs>
      </AnimatedContainer>

      {/* 知识详情对话框 */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {getTypeIcon(selectedItem.type)}
                <span>{selectedItem.title}</span>
              </DialogTitle>
              <DialogDescription>
                {selectedItem.category} • {selectedItem.author} • {selectedItem.updatedAt}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {selectedItem.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="prose max-w-none">
                <p>{selectedItem.content}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">难度等级</span>
                  <div className="font-medium">{selectedItem.difficulty}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">文件大小</span>
                  <div className="font-medium">{formatFileSize(selectedItem.size)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">阅读时间</span>
                  <div className="font-medium">{selectedItem.estimatedReadTime} 分钟</div>
                </div>
                <div>
                  <span className="text-muted-foreground">评分</span>
                  <div className="font-medium">{selectedItem.rating} / 5.0</div>
                </div>
              </div>

              {selectedItem.attachments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">附件</h4>
                  <div className="space-y-2">
                    {selectedItem.attachments.map((attachment, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{attachment}</span>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          下载
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>{selectedItem.views} 浏览</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ThumbsUp className="w-4 h-4" />
                    <span>{selectedItem.likes} 点赞</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Bookmark className="w-4 h-4" />
                    <span>{selectedItem.bookmarks} 收藏</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>{selectedItem.comments} 评论</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => handleItemAction(selectedItem.id, "like")}>
                    <ThumbsUp className="w-4 h-4 mr-1" />
                    点赞
                  </Button>
                  <Button variant="outline" onClick={() => handleItemAction(selectedItem.id, "bookmark")}>
                    <Bookmark className="w-4 h-4 mr-1" />
                    收藏
                  </Button>
                  <Button variant="outline" onClick={() => handleItemAction(selectedItem.id, "share")}>
                    <Share className="w-4 h-4 mr-1" />
                    分享
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
