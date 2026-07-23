"use client"

import { useState, useEffect } from "react"
import {
  Brain,
  Cpu,
  Database,
  BarChart3,
  Activity,
  TrendingUp,
  MessageSquare,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Settings,
  Download,
  Upload,
  Target,
  Layers,
  FileText,
  Monitor,
  Server,
  HardDrive,
  TestTube,
  Rocket,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Copy,
  Share,
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
import { Slider } from "@/components/ui/slider"
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
interface MLModel {
  id: string
  name: string
  type: "classification" | "regression" | "clustering" | "neural_network" | "deep_learning"
  status: "training" | "completed" | "deployed" | "failed" | "paused"
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  trainingProgress: number
  datasetSize: number
  epochs: number
  currentEpoch: number
  learningRate: number
  batchSize: number
  validationLoss: number
  trainingLoss: number
  createdAt: string
  lastUpdated: string
  author: string
  description: string
  framework: "TensorFlow" | "PyTorch" | "Scikit-learn" | "XGBoost" | "Keras"
  version: string
  deploymentUrl?: string
  tags: string[]
}

interface Dataset {
  id: string
  name: string
  type: "structured" | "image" | "text" | "audio" | "video"
  size: number
  records: number
  features: number
  quality: number
  lastUpdated: string
  source: string
  description: string
  format: string
  isPublic: boolean
}

interface Experiment {
  id: string
  name: string
  modelId: string
  status: "running" | "completed" | "failed" | "queued"
  startTime: string
  endTime?: string
  duration?: string
  parameters: Record<string, any>
  metrics: Record<string, number>
  notes: string
  author: string
}

interface TrainingJob {
  id: string
  name: string
  modelType: string
  status: "queued" | "running" | "completed" | "failed" | "cancelled"
  progress: number
  startTime: string
  estimatedTime: string
  gpuUsage: number
  memoryUsage: number
  cpuUsage: number
  logs: string[]
}

// 模拟数据
const mockModels: MLModel[] = [
  {
    id: "model-1",
    name: "用户行为预测���型",
    type: "neural_network",
    status: "deployed",
    accuracy: 94.5,
    precision: 92.8,
    recall: 96.2,
    f1Score: 94.4,
    trainingProgress: 100,
    datasetSize: 150000,
    epochs: 100,
    currentEpoch: 100,
    learningRate: 0.001,
    batchSize: 32,
    validationLoss: 0.045,
    trainingLoss: 0.038,
    createdAt: "2024-01-15",
    lastUpdated: "2024-01-20",
    author: "张AI工程师",
    description: "基于用户历史行为数据预测用户未来行为趋势的深度学习模型",
    framework: "TensorFlow",
    version: "v2.1.0",
    deploymentUrl: "https://api.yanyu.cloud/ml/user-behavior",
    tags: ["用户分析", "预测", "深度学习"],
  },
  {
    id: "model-2",
    name: "商品推荐算法",
    type: "deep_learning",
    status: "training",
    accuracy: 87.3,
    precision: 85.6,
    recall: 89.1,
    f1Score: 87.3,
    trainingProgress: 65,
    datasetSize: 200000,
    epochs: 150,
    currentEpoch: 98,
    learningRate: 0.0005,
    batchSize: 64,
    validationLoss: 0.078,
    trainingLoss: 0.065,
    createdAt: "2024-01-18",
    lastUpdated: "2024-01-21",
    author: "李ML专家",
    description: "基于协同过滤和深度学习的混合推荐系统",
    framework: "PyTorch",
    version: "v1.3.0",
    tags: ["推荐系统", "协同过滤", "深度学习"],
  },
  {
    id: "model-3",
    name: "文本情感分析",
    type: "classification",
    status: "completed",
    accuracy: 91.7,
    precision: 90.2,
    recall: 93.4,
    f1Score: 91.8,
    trainingProgress: 100,
    datasetSize: 80000,
    epochs: 50,
    currentEpoch: 50,
    learningRate: 0.002,
    batchSize: 16,
    validationLoss: 0.156,
    trainingLoss: 0.142,
    createdAt: "2024-01-10",
    lastUpdated: "2024-01-19",
    author: "王NLP工程师",
    description: "基于BERT的中文文本情感分析模型",
    framework: "Keras",
    version: "v1.0.0",
    tags: ["NLP", "情感分析", "BERT"],
  },
  {
    id: "model-4",
    name: "异常检测模型",
    type: "clustering",
    status: "failed",
    accuracy: 78.9,
    precision: 76.5,
    recall: 81.3,
    f1Score: 78.8,
    trainingProgress: 45,
    datasetSize: 120000,
    epochs: 80,
    currentEpoch: 36,
    learningRate: 0.001,
    batchSize: 128,
    validationLoss: 0.234,
    trainingLoss: 0.198,
    createdAt: "2024-01-12",
    lastUpdated: "2024-01-21",
    author: "陈数据科学家",
    description: "基于无监督学习的系统异常检测模型",
    framework: "Scikit-learn",
    version: "v0.8.0",
    tags: ["异常检测", "无监督学习", "聚类"],
  },
]

const mockDatasets: Dataset[] = [
  {
    id: "dataset-1",
    name: "用户行为数据集",
    type: "structured",
    size: 2.5, // GB
    records: 150000,
    features: 45,
    quality: 95,
    lastUpdated: "2024-01-20",
    source: "用户行为日志",
    description: "包含用户浏览、点击、购买等行为的结构化数据",
    format: "CSV",
    isPublic: false,
  },
  {
    id: "dataset-2",
    name: "商品图像数据集",
    type: "image",
    size: 15.8,
    records: 50000,
    features: 0,
    quality: 92,
    lastUpdated: "2024-01-19",
    source: "商品图片库",
    description: "高质量的商品图片数据，包含多个类别",
    format: "JPG/PNG",
    isPublic: true,
  },
  {
    id: "dataset-3",
    name: "客户评论文本",
    type: "text",
    size: 1.2,
    records: 80000,
    features: 0,
    quality: 88,
    lastUpdated: "2024-01-18",
    source: "用户评论系统",
    description: "用户对商品和服务的评论文本数据",
    format: "JSON",
    isPublic: false,
  },
]

const mockExperiments: Experiment[] = [
  {
    id: "exp-1",
    name: "用户行为模型优化实验",
    modelId: "model-1",
    status: "completed",
    startTime: "2024-01-20 10:00:00",
    endTime: "2024-01-20 14:30:00",
    duration: "4小时30分钟",
    parameters: {
      learningRate: 0.001,
      batchSize: 32,
      epochs: 100,
      optimizer: "Adam",
    },
    metrics: {
      accuracy: 94.5,
      precision: 92.8,
      recall: 96.2,
      f1Score: 94.4,
    },
    notes: "通过调整学习率和批次大小，模型性能有显著提升",
    author: "张AI工程师",
  },
  {
    id: "exp-2",
    name: "推荐算法A/B测试",
    modelId: "model-2",
    status: "running",
    startTime: "2024-01-21 09:00:00",
    parameters: {
      learningRate: 0.0005,
      batchSize: 64,
      epochs: 150,
      dropout: 0.3,
    },
    metrics: {
      accuracy: 87.3,
      precision: 85.6,
    },
    notes: "正在测试不同的网络架构对推荐效果的影响",
    author: "李ML专家",
  },
]

const mockTrainingJobs: TrainingJob[] = [
  {
    id: "job-1",
    name: "深度学习模型训练 #1",
    modelType: "Neural Network",
    status: "running",
    progress: 75,
    startTime: "2024-01-21 14:00:00",
    estimatedTime: "2小时15分钟",
    gpuUsage: 85,
    memoryUsage: 12.5,
    cpuUsage: 45,
    logs: [
      "2024-01-21 14:00:00 - 开始训练任务",
      "2024-01-21 14:05:00 - 数据加载完成",
      "2024-01-21 14:10:00 - Epoch 1/100 - Loss: 0.456",
      "2024-01-21 14:15:00 - Epoch 5/100 - Loss: 0.234",
      "2024-01-21 15:00:00 - Epoch 25/100 - Loss: 0.123",
      "2024-01-21 15:30:00 - Epoch 50/100 - Loss: 0.089",
      "2024-01-21 16:00:00 - Epoch 75/100 - Loss: 0.067",
    ],
  },
  {
    id: "job-2",
    name: "文本分类模型训练",
    modelType: "BERT",
    status: "queued",
    progress: 0,
    startTime: "2024-01-21 16:30:00",
    estimatedTime: "1小时45分钟",
    gpuUsage: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    logs: ["2024-01-21 16:30:00 - 任务已加入队列"],
  },
  {
    id: "job-3",
    name: "图像识别模型训练",
    modelType: "CNN",
    status: "completed",
    progress: 100,
    startTime: "2024-01-21 10:00:00",
    estimatedTime: "3小时20分钟",
    gpuUsage: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    logs: [
      "2024-01-21 10:00:00 - 开始训练任务",
      "2024-01-21 13:20:00 - 训练完成",
      "2024-01-21 13:20:00 - 最终准确率: 96.8%",
    ],
  },
]

export function MachineLearning() {
  const [selectedTab, setSelectedTab] = useState("models")
  const [models, setModels] = useState<MLModel[]>(mockModels)
  const [datasets, setDatasets] = useState<Dataset[]>(mockDatasets)
  const [experiments, setExperiments] = useState<Experiment[]>(mockExperiments)
  const [trainingJobs, setTrainingJobs] = useState<TrainingJob[]>(mockTrainingJobs)
  const [selectedModel, setSelectedModel] = useState<MLModel | null>(null)
  const [isCreateModelOpen, setIsCreateModelOpen] = useState(false)
  const { playSound } = useSound()

  // 模拟实时更新训练进度
  useEffect(() => {
    const interval = setInterval(() => {
      setModels((prevModels) =>
        prevModels.map((model) => {
          if (model.status === "training" && model.trainingProgress < 100) {
            return {
              ...model,
              trainingProgress: Math.min(model.trainingProgress + 1, 100),
              currentEpoch: Math.min(model.currentEpoch + 1, model.epochs),
            }
          }
          return model
        }),
      )

      setTrainingJobs((prevJobs) =>
        prevJobs.map((job) => {
          if (job.status === "running" && job.progress < 100) {
            return {
              ...job,
              progress: Math.min(job.progress + 2, 100),
              logs: [
                ...job.logs,
                `${new Date().toLocaleString()} - Epoch ${Math.floor(job.progress / 2)}/100 - Loss: ${(0.5 - job.progress * 0.004).toFixed(3)}`,
              ].slice(-10), // 只保留最近10条日志
            }
          }
          return job
        }),
      )
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      training: { label: "训练中", className: "bg-blue-100 text-blue-800" },
      completed: { label: "已完成", className: "bg-green-100 text-green-800" },
      deployed: { label: "已部署", className: "bg-purple-100 text-purple-800" },
      failed: { label: "失败", className: "bg-red-100 text-red-800" },
      paused: { label: "已暂停", className: "bg-yellow-100 text-yellow-800" },
      running: { label: "运行中", className: "bg-blue-100 text-blue-800" },
      queued: { label: "队列中", className: "bg-gray-100 text-gray-800" },
      cancelled: { label: "已取消", className: "bg-red-100 text-red-800" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.completed
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "training":
      case "running":
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "deployed":
        return <Rocket className="w-4 h-4 text-purple-600" />
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case "paused":
        return <Pause className="w-4 h-4 text-yellow-600" />
      case "queued":
        return <Clock className="w-4 h-4 text-gray-600" />
      default:
        return <Eye className="w-4 h-4 text-gray-600" />
    }
  }

  const getModelTypeIcon = (type: string) => {
    switch (type) {
      case "neural_network":
      case "deep_learning":
        return <Brain className="w-5 h-5 text-purple-600" />
      case "classification":
        return <Target className="w-5 h-5 text-blue-600" />
      case "regression":
        return <TrendingUp className="w-5 h-5 text-green-600" />
      case "clustering":
        return <Layers className="w-5 h-5 text-orange-600" />
      default:
        return <Cpu className="w-5 h-5 text-gray-600" />
    }
  }

  const getDatasetTypeIcon = (type: string) => {
    switch (type) {
      case "structured":
        return <Database className="w-5 h-5 text-blue-600" />
      case "image":
        return <Eye className="w-5 h-5 text-green-600" />
      case "text":
        return <FileText className="w-5 h-5 text-purple-600" />
      case "audio":
        return <MessageSquare className="w-5 h-5 text-orange-600" />
      case "video":
        return <Monitor className="w-5 h-5 text-red-600" />
      default:
        return <HardDrive className="w-5 h-5 text-gray-600" />
    }
  }

  const handleModelAction = (modelId: string, action: string) => {
    playSound("click")
    console.log(`Model ${modelId} action: ${action}`)
  }

  const handleCreateModel = () => {
    playSound("success")
    setIsCreateModelOpen(false)
    // 这里可以添加创建模型的逻辑
  }

  return (
    <div className="space-y-6">
      {/* 机器学习概览 */}
      <AnimatedContainer animation="fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">模型总数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-primary-600">{models.length}</div>
                <Brain className="w-4 h-4 text-primary-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {models.filter((m) => m.status === "deployed").length} 个已部署
              </p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">训练任务</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-blue-600">
                  {trainingJobs.filter((j) => j.status === "running").length}
                </div>
                <Activity className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {trainingJobs.filter((j) => j.status === "queued").length} 个排队中
              </p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">平均准确率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-green-600">
                  {(models.reduce((acc, m) => acc + m.accuracy, 0) / models.length).toFixed(1)}%
                </div>
                <Target className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">+2.3% 较上月</p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">数据集</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-accent-600">{datasets.length}</div>
                <Database className="w-4 h-4 text-accent-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {datasets.reduce((acc, d) => acc + d.size, 0).toFixed(1)} GB 总大小
              </p>
            </CardContent>
          </EnhancedCard>
        </div>
      </AnimatedContainer>

      {/* 主要功能区域 */}
      <AnimatedContainer animation="slideUp" delay={200}>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="models">模型管理</TabsTrigger>
            <TabsTrigger value="training">训练任务</TabsTrigger>
            <TabsTrigger value="datasets">数据集</TabsTrigger>
            <TabsTrigger value="experiments">实验管理</TabsTrigger>
            <TabsTrigger value="deployment">模型部署</TabsTrigger>
          </TabsList>

          {/* 模型管理 */}
          <TabsContent value="models" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">机器学习模型</h3>
              <Dialog open={isCreateModelOpen} onOpenChange={setIsCreateModelOpen}>
                <DialogTrigger asChild>
                  <EnhancedButton variant="primary" soundType="click">
                    <Plus className="w-4 h-4 mr-2" />
                    创建模型
                  </EnhancedButton>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>创建新的机器学习模型</DialogTitle>
                    <DialogDescription>配置模型参数和训练设置</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="model-name">模型名称</Label>
                        <Input id="model-name" placeholder="输入模型名称" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model-type">模型类型</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="选择模型类型" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="classification">分类模型</SelectItem>
                            <SelectItem value="regression">回归模型</SelectItem>
                            <SelectItem value="clustering">聚类模型</SelectItem>
                            <SelectItem value="neural_network">神经网络</SelectItem>
                            <SelectItem value="deep_learning">深度学习</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">模型描述</Label>
                      <Textarea id="description" placeholder="描述模型的用途和特点" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="framework">框架选择</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="选择框架" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tensorflow">TensorFlow</SelectItem>
                            <SelectItem value="pytorch">PyTorch</SelectItem>
                            <SelectItem value="sklearn">Scikit-learn</SelectItem>
                            <SelectItem value="xgboost">XGBoost</SelectItem>
                            <SelectItem value="keras">Keras</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dataset">数据集</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="选择数据集" />
                          </SelectTrigger>
                          <SelectContent>
                            {datasets.map((dataset) => (
                              <SelectItem key={dataset.id} value={dataset.id}>
                                {dataset.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>学习率</Label>
                        <div className="px-3">
                          <Slider defaultValue={[0.001]} max={0.1} min={0.0001} step={0.0001} />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>0.0001</span>
                            <span>0.1</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="batch-size">批次大小</Label>
                        <Input id="batch-size" type="number" defaultValue="32" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="epochs">训练轮数</Label>
                        <Input id="epochs" type="number" defaultValue="100" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateModelOpen(false)}>
                      取消
                    </Button>
                    <EnhancedButton variant="primary" onClick={handleCreateModel} soundType="success">
                      创建模型
                    </EnhancedButton>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {models.map((model, index) => (
                <AnimatedContainer key={model.id} animation="slideRight" delay={index * 100}>
                  <EnhancedCard variant="modern" className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-4">
                          {getModelTypeIcon(model.type)}
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold text-lg">{model.name}</h3>
                              {getStatusBadge(model.status)}
                              <Badge variant="outline">{model.framework}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{model.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span>作者: {model.author}</span>
                              <span>版本: {model.version}</span>
                              <span>更新: {model.lastUpdated}</span>
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
                            <DropdownMenuLabel>模型操作</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleModelAction(model.id, "view")}>
                              <Eye className="w-4 h-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleModelAction(model.id, "edit")}>
                              <Edit className="w-4 h-4 mr-2" />
                              编辑模型
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleModelAction(model.id, "clone")}>
                              <Copy className="w-4 h-4 mr-2" />
                              克隆模型
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleModelAction(model.id, "export")}>
                              <Download className="w-4 h-4 mr-2" />
                              导出模型
                            </DropdownMenuItem>
                            {model.status === "completed" && (
                              <DropdownMenuItem onClick={() => handleModelAction(model.id, "deploy")}>
                                <Rocket className="w-4 h-4 mr-2" />
                                部署模型
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleModelAction(model.id, "delete")}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              删除模型
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* 模型指标 */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">{model.accuracy}%</div>
                          <div className="text-xs text-muted-foreground">准确率</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">{model.precision}%</div>
                          <div className="text-xs text-muted-foreground">精确率</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-lg font-bold text-purple-600">{model.recall}%</div>
                          <div className="text-xs text-muted-foreground">召回率</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-lg font-bold text-orange-600">{model.f1Score}%</div>
                          <div className="text-xs text-muted-foreground">F1分数</div>
                        </div>
                      </div>

                      {/* 训练进度 */}
                      {model.status === "training" && (
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span>训练进度</span>
                            <span>
                              {model.currentEpoch}/{model.epochs} epochs ({model.trainingProgress}%)
                            </span>
                          </div>
                          <Progress value={model.trainingProgress} className="h-2" />
                          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                            <span>训练损失: {model.trainingLoss}</span>
                            <span>验证损失: {model.validationLoss}</span>
                          </div>
                        </div>
                      )}

                      {/* 模型标签 */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {model.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* 部署信息 */}
                      {model.deploymentUrl && (
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-purple-800">已部署</div>
                              <div className="text-xs text-purple-600">{model.deploymentUrl}</div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => window.open(model.deploymentUrl)}>
                              <Share className="w-4 h-4 mr-1" />
                              访问
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 训练任务 */}
          <TabsContent value="training" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">训练任务管理</h3>
              <EnhancedButton variant="primary" soundType="click">
                <Play className="w-4 h-4 mr-2" />
                新建训练任务
              </EnhancedButton>
            </div>

            <div className="space-y-4">
              {trainingJobs.map((job, index) => (
                <AnimatedContainer key={job.id} animation="slideLeft" delay={index * 100}>
                  <EnhancedCard variant="modern">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-3">
                          {getStatusIcon(job.status)}
                          <div>
                            <h4 className="font-medium">{job.name}</h4>
                            <p className="text-sm text-muted-foreground">{job.modelType}</p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                              <span>开始时间: {job.startTime}</span>
                              <span>预计时间: {job.estimatedTime}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(job.status)}
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* 进度条 */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>训练进度</span>
                          <span>{job.progress}%</span>
                        </div>
                        <Progress value={job.progress} className="h-3" />
                      </div>

                      {/* 资源使用情况 */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <div className="text-lg font-bold text-red-600">{job.gpuUsage}%</div>
                          <div className="text-xs text-muted-foreground">GPU使用率</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">{job.memoryUsage}GB</div>
                          <div className="text-xs text-muted-foreground">内存使用</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">{job.cpuUsage}%</div>
                          <div className="text-xs text-muted-foreground">CPU使用率</div>
                        </div>
                      </div>

                      {/* 训练日志 */}
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-32 overflow-y-auto">
                        {job.logs.map((log, logIndex) => (
                          <div key={logIndex} className="mb-1">
                            {log}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 数据集管理 */}
          <TabsContent value="datasets" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">数据集管理</h3>
              <EnhancedButton variant="primary" soundType="click">
                <Upload className="w-4 h-4 mr-2" />
                上传数据集
              </EnhancedButton>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {datasets.map((dataset, index) => (
                <AnimatedContainer key={dataset.id} animation="slideUp" delay={index * 100}>
                  <EnhancedCard variant="modern" className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-3">
                          {getDatasetTypeIcon(dataset.type)}
                          <div>
                            <h4 className="font-medium">{dataset.name}</h4>
                            <p className="text-sm text-muted-foreground capitalize">{dataset.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {dataset.isPublic ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              公开
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-100 text-red-800">
                              私有
                            </Badge>
                          )}
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4">{dataset.description}</p>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>数据质量</span>
                          <span className="font-medium">{dataset.quality}%</span>
                        </div>
                        <Progress value={dataset.quality} className="h-2" />

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">大小</span>
                            <div className="font-medium">{dataset.size} GB</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">记录数</span>
                            <div className="font-medium">{dataset.records.toLocaleString()}</div>
                          </div>
                          {dataset.features > 0 && (
                            <div>
                              <span className="text-muted-foreground">特征数</span>
                              <div className="font-medium">{dataset.features}</div>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">格式</span>
                            <div className="font-medium">{dataset.format}</div>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          <div>来源: {dataset.source}</div>
                          <div>更新: {dataset.lastUpdated}</div>
                        </div>

                        <div className="flex space-x-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                            <Eye className="w-4 h-4 mr-1" />
                            预览
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                            <Download className="w-4 h-4 mr-1" />
                            下载
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 实验管理 */}
          <TabsContent value="experiments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">实验管理</h3>
              <EnhancedButton variant="primary" soundType="click">
                <TestTube className="w-4 h-4 mr-2" />
                新建实验
              </EnhancedButton>
            </div>

            <div className="space-y-4">
              {experiments.map((experiment, index) => (
                <AnimatedContainer key={experiment.id} animation="slideRight" delay={index * 100}>
                  <EnhancedCard variant="modern">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-3">
                          <TestTube className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium">{experiment.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              模型: {models.find((m) => m.id === experiment.modelId)?.name}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                              <span>作者: {experiment.author}</span>
                              <span>开始: {experiment.startTime}</span>
                              {experiment.duration && <span>耗时: {experiment.duration}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(experiment.status)}
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 实验参数 */}
                        <div>
                          <h5 className="font-medium mb-3">实验参数</h5>
                          <div className="space-y-2 text-sm">
                            {Object.entries(experiment.parameters).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-muted-foreground capitalize">{key}:</span>
                                <span className="font-medium">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 实验结果 */}
                        <div>
                          <h5 className="font-medium mb-3">实验结果</h5>
                          <div className="space-y-2 text-sm">
                            {Object.entries(experiment.metrics).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-muted-foreground capitalize">{key}:</span>
                                <span className="font-medium">
                                  {typeof value === "number" ? `${value}%` : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {experiment.notes && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <h5 className="font-medium text-blue-800 mb-1">实验笔记</h5>
                          <p className="text-sm text-blue-700">{experiment.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 模型部署 */}
          <TabsContent value="deployment" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">模型部署管理</h3>
              <EnhancedButton variant="primary" soundType="click">
                <Rocket className="w-4 h-4 mr-2" />
                部署模型
              </EnhancedButton>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* 部署环境 */}
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Server className="w-5 h-5" />
                    <span>部署环境</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "生产环境", status: "healthy", models: 3, load: 68 },
                      { name: "测试环境", status: "healthy", models: 2, load: 45 },
                      { name: "开发环境", status: "warning", models: 1, load: 23 },
                    ].map((env) => (
                      <div key={env.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              env.status === "healthy"
                                ? "bg-green-500"
                                : env.status === "warning"
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                          />
                          <div>
                            <div className="font-medium">{env.name}</div>
                            <div className="text-sm text-muted-foreground">{env.models} 个模型</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{env.load}%</div>
                          <div className="text-xs text-muted-foreground">负载</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </EnhancedCard>

              {/* 部署统计 */}
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>部署统计</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">6</div>
                        <div className="text-sm text-muted-foreground">已部署模型</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">1.2k</div>
                        <div className="text-sm text-muted-foreground">日请求量</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>平均响应时间</span>
                        <span className="font-medium">245ms</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>成功率</span>
                        <span className="font-medium text-green-600">99.8%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>错误率</span>
                        <span className="font-medium text-red-600">0.2%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </div>

            {/* 已部署模型列表 */}
            <EnhancedCard variant="modern">
              <CardHeader>
                <CardTitle>已部署模型</CardTitle>
                <CardDescription>当前在生产环境中运行的模型</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {models
                    .filter((model) => model.status === "deployed")
                    .map((model) => (
                      <div key={model.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Rocket className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">{model.name}</h4>
                            <p className="text-sm text-muted-foreground">{model.deploymentUrl}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right text-sm">
                            <div className="font-medium text-green-600">运行中</div>
                            <div className="text-muted-foreground">准确率: {model.accuracy}%</div>
                          </div>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            监控
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>
        </Tabs>
      </AnimatedContainer>
    </div>
  )
}
