"use client"

import { useState, useEffect } from "react"
import {
  Database,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Zap,
  Brain,
  Layers,
  GitBranch,
  Settings,
  Play,
  Pause,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Plus,
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Sparkles,
  Code,
  TestTube,
  BookOpen,
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { EnhancedCard } from "../design-system/enhanced-card-system"
import { EnhancedButton } from "../design-system/enhanced-button-system"
import { AnimatedContainer } from "../design-system/animation-system"
import { useSound } from "../design-system/sound-system"

// 数据类型定义
interface DataMiningProject {
  id: string
  name: string
  type: "classification" | "clustering" | "association" | "regression" | "anomaly_detection"
  status: "running" | "completed" | "failed" | "paused" | "queued"
  progress: number
  dataSource: string
  algorithm: string
  accuracy?: number
  insights: number
  patterns: number
  startTime: string
  endTime?: string
  duration?: string
  author: string
  description: string
  tags: string[]
  results?: DataMiningResult[]
}

interface DataMiningResult {
  id: string
  type: "pattern" | "insight" | "anomaly" | "trend" | "correlation"
  title: string
  description: string
  confidence: number
  impact: "high" | "medium" | "low"
  category: string
  data: any
  createdAt: string
}

interface DataSource {
  id: string
  name: string
  type: "database" | "file" | "api" | "stream"
  status: "connected" | "disconnected" | "error"
  records: number
  size: number
  lastSync: string
  schema: string[]
  description: string
}

interface MiningAlgorithm {
  id: string
  name: string
  type: string
  description: string
  parameters: Record<string, any>
  complexity: "low" | "medium" | "high"
  accuracy: number
  speed: number
  useCases: string[]
}

// 模拟数据
const mockProjects: DataMiningProject[] = [
  {
    id: "project-1",
    name: "用户行为模式挖掘",
    type: "clustering",
    status: "completed",
    progress: 100,
    dataSource: "用户行为数据库",
    algorithm: "K-Means聚类",
    accuracy: 87.5,
    insights: 15,
    patterns: 8,
    startTime: "2024-01-15 09:00:00",
    endTime: "2024-01-15 14:30:00",
    duration: "5小时30分钟",
    author: "张数据分析师",
    description: "分析用户在平台上的行为模式，识别不同用户群体的特征",
    tags: ["用户分析", "聚类", "行为模式"],
    results: [
      {
        id: "result-1",
        type: "pattern",
        title: "高价值用户群体特征",
        description: "发现占用户总数20%的高价值用户群体，贡献了80%的收入",
        confidence: 92,
        impact: "high",
        category: "用户分群",
        data: {},
        createdAt: "2024-01-15 14:30:00",
      },
      {
        id: "result-2",
        type: "insight",
        title: "用户流失预警模式",
        description: "识别出用户流失前的5个关键行为指标",
        confidence: 85,
        impact: "high",
        category: "流失预测",
        data: {},
        createdAt: "2024-01-15 14:30:00",
      },
    ],
  },
  {
    id: "project-2",
    name: "商品关联规则挖掘",
    type: "association",
    status: "running",
    progress: 65,
    dataSource: "交易数据库",
    algorithm: "Apriori算法",
    insights: 8,
    patterns: 12,
    startTime: "2024-01-20 10:00:00",
    author: "李商务分析师",
    description: "挖掘商品之间的关联关系，为推荐系统提供数据支持",
    tags: ["关联规则", "推荐系统", "商品分析"],
  },
  {
    id: "project-3",
    name: "异常交易检测",
    type: "anomaly_detection",
    status: "completed",
    progress: 100,
    dataSource: "支付数据流",
    algorithm: "孤立森林",
    accuracy: 94.2,
    insights: 23,
    patterns: 5,
    startTime: "2024-01-18 08:00:00",
    endTime: "2024-01-18 16:45:00",
    duration: "8小时45分钟",
    author: "王安全专家",
    description: "实时检测异常交易行为，防范金融风险",
    tags: ["异常检测", "风险控制", "实时分析"],
  },
  {
    id: "project-4",
    name: "销售趋势预测分析",
    type: "regression",
    status: "paused",
    progress: 35,
    dataSource: "销售历史数据",
    algorithm: "随机森林回归",
    insights: 3,
    patterns: 2,
    startTime: "2024-01-19 13:00:00",
    author: "陈预测分析师",
    description: "基于历史销售数据预测未来销售趋势，支持业务决策",
    tags: ["销售预测", "回归分析", "趋势分析"],
  },
]

const mockDataSources: DataSource[] = [
  {
    id: "source-1",
    name: "用户行为数据库",
    type: "database",
    status: "connected",
    records: 2500000,
    size: 15.6,
    lastSync: "2024-01-21 16:30:00",
    schema: ["user_id", "action_type", "timestamp", "page_url", "session_id", "device_type"],
    description: "用户在平台上的所有行为记录，包括浏览、点击、购买等",
  },
  {
    id: "source-2",
    name: "交易数据库",
    type: "database",
    status: "connected",
    records: 850000,
    size: 8.2,
    lastSync: "2024-01-21 16:25:00",
    schema: ["order_id", "user_id", "product_id", "amount", "timestamp", "payment_method"],
    description: "所有交易订单的详细信息",
  },
  {
    id: "source-3",
    name: "商品信息文件",
    type: "file",
    status: "connected",
    records: 45000,
    size: 2.1,
    lastSync: "2024-01-21 12:00:00",
    schema: ["product_id", "category", "price", "brand", "description", "inventory"],
    description: "商品基础信息和库存数据",
  },
  {
    id: "source-4",
    name: "实时支付流",
    type: "stream",
    status: "connected",
    records: 0,
    size: 0,
    lastSync: "实时",
    schema: ["transaction_id", "amount", "timestamp", "merchant", "status"],
    description: "实时支付交易数据流",
  },
]

const mockAlgorithms: MiningAlgorithm[] = [
  {
    id: "algo-1",
    name: "K-Means聚类",
    type: "聚类算法",
    description: "基于距离的聚类算法，适用于发现数据中的自然分组",
    parameters: { k: 5, max_iter: 300, tol: 0.0001 },
    complexity: "medium",
    accuracy: 85,
    speed: 90,
    useCases: ["用户分群", "市场细分", "异常检测"],
  },
  {
    id: "algo-2",
    name: "Apriori算法",
    type: "关联规则",
    description: "挖掘频繁项集和关联规则的经典算法",
    parameters: { min_support: 0.1, min_confidence: 0.8 },
    complexity: "high",
    accuracy: 78,
    speed: 60,
    useCases: ["购物篮分析", "推荐系统", "交叉销售"],
  },
  {
    id: "algo-3",
    name: "孤立森林",
    type: "异常检测",
    description: "基于随机森林的异常检测算法，无需标注数据",
    parameters: { n_estimators: 100, contamination: 0.1 },
    complexity: "medium",
    accuracy: 92,
    speed: 85,
    useCases: ["欺诈检测", "系统监控", "质量控制"],
  },
  {
    id: "algo-4",
    name: "随机森林",
    type: "回归/分类",
    description: "集成学习算法，具有高准确性和良好的泛化能力",
    parameters: { n_estimators: 100, max_depth: 10, min_samples_split: 2 },
    complexity: "medium",
    accuracy: 88,
    speed: 75,
    useCases: ["预测分析", "特征重要性", "分类问题"],
  },
]

export function DataMining() {
  const [selectedTab, setSelectedTab] = useState("projects")
  const [projects, setProjects] = useState<DataMiningProject[]>(mockProjects)
  const [dataSources, setDataSources] = useState<DataSource[]>(mockDataSources)
  const [algorithms, setAlgorithms] = useState<MiningAlgorithm[]>(mockAlgorithms)
  const [selectedProject, setSelectedProject] = useState<DataMiningProject | null>(null)
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const { playSound } = useSound()

  // 模拟实时更新项目进度
  useEffect(() => {
    const interval = setInterval(() => {
      setProjects((prevProjects) =>
        prevProjects.map((project) => {
          if (project.status === "running" && project.progress < 100) {
            return {
              ...project,
              progress: Math.min(project.progress + Math.random() * 3, 100),
              insights: project.insights + (Math.random() > 0.8 ? 1 : 0),
              patterns: project.patterns + (Math.random() > 0.9 ? 1 : 0),
            }
          }
          return project
        }),
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      running: { label: "运行中", className: "bg-blue-100 text-blue-800" },
      completed: { label: "已完成", className: "bg-green-100 text-green-800" },
      failed: { label: "失败", className: "bg-red-100 text-red-800" },
      paused: { label: "已暂停", className: "bg-yellow-100 text-yellow-800" },
      queued: { label: "队列中", className: "bg-gray-100 text-gray-800" },
      connected: { label: "已连接", className: "bg-green-100 text-green-800" },
      disconnected: { label: "未连接", className: "bg-red-100 text-red-800" },
      error: { label: "错误", className: "bg-red-100 text-red-800" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.completed
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "failed":
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case "paused":
        return <Pause className="w-4 h-4 text-yellow-600" />
      case "queued":
        return <Clock className="w-4 h-4 text-gray-600" />
      case "connected":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "disconnected":
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Eye className="w-4 h-4 text-gray-600" />
    }
  }

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case "clustering":
        return <Layers className="w-5 h-5 text-blue-600" />
      case "classification":
        return <Target className="w-5 h-5 text-green-600" />
      case "association":
        return <GitBranch className="w-5 h-5 text-purple-600" />
      case "regression":
        return <TrendingUp className="w-5 h-5 text-orange-600" />
      case "anomaly_detection":
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      default:
        return <Database className="w-5 h-5 text-gray-600" />
    }
  }

  const getDataSourceIcon = (type: string) => {
    switch (type) {
      case "database":
        return <Database className="w-5 h-5 text-blue-600" />
      case "file":
        return <FileText className="w-5 h-5 text-green-600" />
      case "api":
        return <Zap className="w-5 h-5 text-purple-600" />
      case "stream":
        return <Activity className="w-5 h-5 text-orange-600" />
      default:
        return <Database className="w-5 h-5 text-gray-600" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "text-red-600 bg-red-100"
      case "medium":
        return "text-yellow-600 bg-yellow-100"
      case "low":
        return "text-green-600 bg-green-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const handleProjectAction = (projectId: string, action: string) => {
    playSound("click")
    console.log(`Project ${projectId} action: ${action}`)
  }

  const handleCreateProject = () => {
    playSound("success")
    setIsCreateProjectOpen(false)
    // 这里可以添加创建项目的逻辑
  }

  return (
    <div className="space-y-6">
      {/* 数据挖掘概览 */}
      <AnimatedContainer animation="fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">挖掘项目</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-primary-600">{projects.length}</div>
                <Database className="w-4 h-4 text-primary-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {projects.filter((p) => p.status === "running").length} 个运行中
              </p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">发现洞察</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-blue-600">
                  {projects.reduce((acc, p) => acc + p.insights, 0)}
                </div>
                <Lightbulb className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">+12 本周新增</p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">识别模式</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-green-600">
                  {projects.reduce((acc, p) => acc + p.patterns, 0)}
                </div>
                <Sparkles className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">+8 本周新增</p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">数据源</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-accent-600">{dataSources.length}</div>
                <Activity className="w-4 h-4 text-accent-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {dataSources.filter((ds) => ds.status === "connected").length} 个已连接
              </p>
            </CardContent>
          </EnhancedCard>
        </div>
      </AnimatedContainer>

      {/* 主要功能区域 */}
      <AnimatedContainer animation="slideUp" delay={200}>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="projects">挖掘项目</TabsTrigger>
            <TabsTrigger value="results">挖掘结果</TabsTrigger>
            <TabsTrigger value="datasources">数据源</TabsTrigger>
            <TabsTrigger value="algorithms">算法库</TabsTrigger>
            <TabsTrigger value="insights">洞察分析</TabsTrigger>
          </TabsList>

          {/* 挖掘项目 */}
          <TabsContent value="projects" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">数据挖掘项目</h3>
              <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
                <DialogTrigger asChild>
                  <EnhancedButton variant="primary" soundType="click">
                    <Plus className="w-4 h-4 mr-2" />
                    新建项目
                  </EnhancedButton>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>创建数据挖掘项目</DialogTitle>
                    <DialogDescription>配置数据挖掘任务的参数和目标</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="project-name">项目名称</Label>
                        <Input id="project-name" placeholder="输入项目名称" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="project-type">挖掘类型</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="选择挖掘类型" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="clustering">聚类分析</SelectItem>
                            <SelectItem value="classification">分类分析</SelectItem>
                            <SelectItem value="association">关联规则</SelectItem>
                            <SelectItem value="regression">回归分析</SelectItem>
                            <SelectItem value="anomaly_detection">异常检测</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">项目描述</Label>
                      <Textarea id="description" placeholder="描述项目的目标和预期结果" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="data-source">数据源</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="选择数据源" />
                          </SelectTrigger>
                          <SelectContent>
                            {dataSources.map((source) => (
                              <SelectItem key={source.id} value={source.id}>
                                {source.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="algorithm">算法选择</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="选择算法" />
                          </SelectTrigger>
                          <SelectContent>
                            {algorithms.map((algo) => (
                              <SelectItem key={algo.id} value={algo.id}>
                                {algo.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateProjectOpen(false)}>
                      取消
                    </Button>
                    <EnhancedButton variant="primary" onClick={handleCreateProject} soundType="success">
                      创建项目
                    </EnhancedButton>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {projects.map((project, index) => (
                <AnimatedContainer key={project.id} animation="slideRight" delay={index * 100}>
                  <EnhancedCard variant="modern" className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-4">
                          {getProjectTypeIcon(project.type)}
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold text-lg">{project.name}</h3>
                              {getStatusBadge(project.status)}
                              <Badge variant="outline">{project.algorithm}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{project.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span>作者: {project.author}</span>
                              <span>数据源: {project.dataSource}</span>
                              <span>开始: {project.startTime}</span>
                              {project.duration && <span>耗时: {project.duration}</span>}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>项目操作</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleProjectAction(project.id, "view")}>
                              <Eye className="w-4 h-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleProjectAction(project.id, "edit")}>
                              <Edit className="w-4 h-4 mr-2" />
                              编辑项目
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleProjectAction(project.id, "export")}>
                              <Download className="w-4 h-4 mr-2" />
                              导出结果
                            </DropdownMenuItem>
                            {project.status === "paused" && (
                              <DropdownMenuItem onClick={() => handleProjectAction(project.id, "resume")}>
                                <Play className="w-4 h-4 mr-2" />
                                继续运行
                              </DropdownMenuItem>
                            )}
                            {project.status === "running" && (
                              <DropdownMenuItem onClick={() => handleProjectAction(project.id, "pause")}>
                                <Pause className="w-4 h-4 mr-2" />
                                暂停运行
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleProjectAction(project.id, "delete")}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              删除项目
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* 项目指标 */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">{project.insights}</div>
                          <div className="text-xs text-muted-foreground">发现洞察</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">{project.patterns}</div>
                          <div className="text-xs text-muted-foreground">识别模式</div>
                        </div>
                        {project.accuracy && (
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-lg font-bold text-purple-600">{project.accuracy}%</div>
                            <div className="text-xs text-muted-foreground">准确率</div>
                          </div>
                        )}
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-lg font-bold text-orange-600">{project.progress}%</div>
                          <div className="text-xs text-muted-foreground">完成度</div>
                        </div>
                      </div>

                      {/* 进度条 */}
                      {project.status === "running" && (
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span>挖掘进度</span>
                            <span>{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-2" />
                        </div>
                      )}

                      {/* 项目标签 */}
                      <div className="flex flex-wrap gap-2">
                        {project.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 挖掘结果 */}
          <TabsContent value="results" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">挖掘结果与洞察</h3>
              <EnhancedButton variant="secondary" soundType="click">
                <Download className="w-4 h-4 mr-2" />
                导出报告
              </EnhancedButton>
            </div>

            <div className="space-y-6">
              {projects
                .filter((p) => p.results && p.results.length > 0)
                .map((project) => (
                  <EnhancedCard key={project.id} variant="traditional" glowEffect>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        {getProjectTypeIcon(project.type)}
                        <span>{project.name}</span>
                      </CardTitle>
                      <CardDescription>发现 {project.results?.length} 个重要结果</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {project.results?.map((result) => (
                          <div key={result.id} className="p-4 border rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                  {result.type === "pattern" && <Sparkles className="w-4 h-4 text-blue-600" />}
                                  {result.type === "insight" && <Lightbulb className="w-4 h-4 text-blue-600" />}
                                  {result.type === "anomaly" && <AlertTriangle className="w-4 h-4 text-blue-600" />}
                                  {result.type === "trend" && <TrendingUp className="w-4 h-4 text-blue-600" />}
                                  {result.type === "correlation" && <GitBranch className="w-4 h-4 text-blue-600" />}
                                </div>
                                <div>
                                  <h4 className="font-medium">{result.title}</h4>
                                  <p className="text-sm text-muted-foreground mt-1">{result.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className={getImpactColor(result.impact)}>
                                  {result.impact === "high"
                                    ? "高影响"
                                    : result.impact === "medium"
                                      ? "中影响"
                                      : "低影响"}
                                </Badge>
                                <Badge variant="secondary">{result.confidence}% 置信度</Badge>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>类别: {result.category}</span>
                              <span>发现时间: {result.createdAt}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </EnhancedCard>
                ))}
            </div>
          </TabsContent>

          {/* 数据源管理 */}
          <TabsContent value="datasources" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">数据源管理</h3>
              <EnhancedButton variant="primary" soundType="click">
                <Plus className="w-4 h-4 mr-2" />
                添加数据源
              </EnhancedButton>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {dataSources.map((source, index) => (
                <AnimatedContainer key={source.id} animation="slideUp" delay={index * 100}>
                  <EnhancedCard variant="modern" className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-3">
                          {getDataSourceIcon(source.type)}
                          <div>
                            <h4 className="font-medium">{source.name}</h4>
                            <p className="text-sm text-muted-foreground capitalize">{source.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(source.status)}
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4">{source.description}</p>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">记录数</span>
                            <div className="font-medium">{source.records.toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">大小</span>
                            <div className="font-medium">{source.size} GB</div>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          <div>最后同步: {source.lastSync}</div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm font-medium">数据字段</div>
                          <div className="flex flex-wrap gap-1">
                            {source.schema.slice(0, 4).map((field) => (
                              <Badge key={field} variant="outline" className="text-xs">
                                {field}
                              </Badge>
                            ))}
                            {source.schema.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{source.schema.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex space-x-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                            <Eye className="w-4 h-4 mr-1" />
                            预览
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                            <RefreshCw className="w-4 h-4 mr-1" />
                            同步
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 算法库 */}
          <TabsContent value="algorithms" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">数据挖掘算法库</h3>
              <EnhancedButton variant="secondary" soundType="click">
                <BookOpen className="w-4 h-4 mr-2" />
                算法文档
              </EnhancedButton>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {algorithms.map((algorithm, index) => (
                <AnimatedContainer key={algorithm.id} animation="slideLeft" delay={index * 100}>
                  <EnhancedCard variant="modern" className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-medium text-lg">{algorithm.name}</h4>
                          <p className="text-sm text-muted-foreground">{algorithm.type}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            algorithm.complexity === "high"
                              ? "bg-red-100 text-red-800"
                              : algorithm.complexity === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                          }
                        >
                          {algorithm.complexity === "high"
                            ? "高复杂度"
                            : algorithm.complexity === "medium"
                              ? "中复杂度"
                              : "低复杂度"}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4">{algorithm.description}</p>

                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">准确性</span>
                          <span className="text-sm font-medium">{algorithm.accuracy}%</span>
                        </div>
                        <Progress value={algorithm.accuracy} className="h-2" />

                        <div className="flex justify-between items-center">
                          <span className="text-sm">执行速度</span>
                          <span className="text-sm font-medium">{algorithm.speed}%</span>
                        </div>
                        <Progress value={algorithm.speed} className="h-2" />
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium mb-2">主要参数</div>
                          <div className="space-y-1">
                            {Object.entries(algorithm.parameters).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{key}:</span>
                                <span className="font-medium">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-2">适用场景</div>
                          <div className="flex flex-wrap gap-1">
                            {algorithm.useCases.map((useCase) => (
                              <Badge key={useCase} variant="secondary" className="text-xs">
                                {useCase}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex space-x-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                            <TestTube className="w-4 h-4 mr-1" />
                            测试
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                            <Code className="w-4 h-4 mr-1" />
                            代码
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 洞察分析 */}
          <TabsContent value="insights" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">智能洞察分析</h3>
              <EnhancedButton variant="primary" soundType="click">
                <Brain className="w-4 h-4 mr-2" />
                生成洞察
              </EnhancedButton>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* 趋势分析 */}
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>趋势分析</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-green-800">用户增长趋势</span>
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-sm text-green-700">用户数量呈现稳定增长，月增长率达到15.2%</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-blue-800">收入趋势</span>
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-sm text-blue-700">收入增长加速，预计下季度将突破历史新高</p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-yellow-800">活跃度变化</span>
                        <TrendingDown className="w-4 h-4 text-yellow-600" />
                      </div>
                      <p className="text-sm text-yellow-700">用户活跃度略有下降，需要关注用户留存策略</p>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>

              {/* 关联分析 */}
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <GitBranch className="w-5 h-5" />
                    <span>关联分析</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-purple-800">商品关联</span>
                        <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">85% 置信度</span>
                      </div>
                      <p className="text-sm text-purple-700">购买A商品的用户有85%概率会购买B商品</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-orange-800">行为关联</span>
                        <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">78% 置信度</span>
                      </div>
                      <p className="text-sm text-orange-700">浏览特定页面的用户更容易进行购买行为</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-red-800">时间关联</span>
                        <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">92% 置信度</span>
                      </div>
                      <p className="text-sm text-red-700">周末的购买转化率比工作日高出40%</p>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>

              {/* 异常检测 */}
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>异常检测</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-red-800">高风险交易</span>
                        <Badge variant="destructive" className="text-xs">
                          紧急
                        </Badge>
                      </div>
                      <p className="text-sm text-red-700">检测到3笔可疑大额交易，建议立即审查</p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-yellow-800">异常访问</span>
                        <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                          警告
                        </Badge>
                      </div>
                      <p className="text-sm text-yellow-700">发现异常IP访问模式，可能存在安全风险</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-blue-800">数据异常</span>
                        <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                          信息
                        </Badge>
                      </div>
                      <p className="text-sm text-blue-700">部分数据指标出现异常波动，需要进一步分析</p>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>

              {/* 预测分析 */}
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>预测分析</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-green-800">销售预测</span>
                        <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">94% 准确率</span>
                      </div>
                      <p className="text-sm text-green-700">预计下月销售额将增长18%，达到新的里程碑</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-blue-800">用户流失预测</span>
                        <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">89% 准确率</span>
                      </div>
                      <p className="text-sm text-blue-700">识别出156名高风险流失用户，建议及时干预</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-purple-800">需求预测</span>
                        <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">91% 准确率</span>
                      </div>
                      <p className="text-sm text-purple-700">预测热门商品需求量，优化库存管理策略</p>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </div>
          </TabsContent>
        </Tabs>
      </AnimatedContainer>
    </div>
  )
}
