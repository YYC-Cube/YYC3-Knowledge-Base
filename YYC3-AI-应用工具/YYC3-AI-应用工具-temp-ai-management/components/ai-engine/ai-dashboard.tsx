"use client"

import { useState, useEffect } from "react"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Brain,
  Cpu,
  Database,
  BarChart3,
  Zap,
  Activity,
  TrendingUp,
  Users,
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
  Sparkles,
  Layers,
  Network,
  Gauge,
  Bot,
  Lightbulb,
  Target,
  Workflow,
  GitBranch,
  Monitor,
  Server,
  HardDrive,
  MemoryStick,
  Wifi,
  Shield,
  Rocket,
} from "lucide-react"
import { AnimatedContainer } from "../design-system/animation-system"
import { EnhancedCard } from "../design-system/enhanced-card-system"
import { EnhancedButton } from "../design-system/enhanced-button-system"

interface AIModel {
  id: string
  name: string
  type: string
  status: "running" | "stopped" | "training" | "error" | "deploying"
  accuracy: number
  lastTrained: string
  usage: number
  version: string
  description: string
  metrics: {
    precision: number
    recall: number
    f1Score: number
    latency: number
  }
  resources: {
    cpu: number
    memory: number
    gpu: number
  }
}

interface AITask {
  id: string
  name: string
  type: string
  status: "completed" | "running" | "pending" | "failed"
  progress: number
  startTime: string
  estimatedTime?: string
  priority: "high" | "medium" | "low"
  resources: {
    cpu: number
    memory: number
    gpu?: number
  }
}

interface ModelConfig {
  name: string
  type: string
  framework: string
  dataset: string
  hyperparameters: {
    learningRate: number
    batchSize: number
    epochs: number
    optimizer: string
  }
  resources: {
    cpu: number
    memory: number
    gpu: number
  }
}

const mockModels: AIModel[] = [
  {
    id: "1",
    name: "用户行为分析模型",
    type: "分类模型",
    status: "running",
    accuracy: 94.5,
    lastTrained: "2024-01-20",
    usage: 78,
    version: "v2.1.0",
    description: "基于深度学习的用户行为模式识别和预测模型",
    metrics: {
      precision: 0.945,
      recall: 0.923,
      f1Score: 0.934,
      latency: 45,
    },
    resources: {
      cpu: 65,
      memory: 2048,
      gpu: 40,
    },
  },
  {
    id: "2",
    name: "智能推荐引擎",
    type: "推荐模型",
    status: "running",
    accuracy: 89.2,
    lastTrained: "2024-01-19",
    usage: 65,
    version: "v1.8.3",
    description: "协同过滤与深度学习结合的个性化推荐系统",
    metrics: {
      precision: 0.892,
      recall: 0.876,
      f1Score: 0.884,
      latency: 32,
    },
    resources: {
      cpu: 45,
      memory: 1536,
      gpu: 25,
    },
  },
  {
    id: "3",
    name: "文本情感分析",
    type: "NLP模型",
    status: "training",
    accuracy: 87.8,
    lastTrained: "2024-01-18",
    usage: 45,
    version: "v3.0.0-beta",
    description: "基于Transformer的多语言情感分析模型",
    metrics: {
      precision: 0.878,
      recall: 0.865,
      f1Score: 0.871,
      latency: 28,
    },
    resources: {
      cpu: 80,
      memory: 4096,
      gpu: 75,
    },
  },
  {
    id: "4",
    name: "异常检测模型",
    type: "检测模型",
    status: "stopped",
    accuracy: 92.1,
    lastTrained: "2024-01-15",
    usage: 23,
    version: "v1.5.2",
    description: "无监督学习的系统异常检测和预警模型",
    metrics: {
      precision: 0.921,
      recall: 0.908,
      f1Score: 0.914,
      latency: 18,
    },
    resources: {
      cpu: 0,
      memory: 0,
      gpu: 0,
    },
  },
]

const mockTasks: AITask[] = [
  {
    id: "1",
    name: "用户画像更新",
    type: "数据处理",
    status: "running",
    progress: 75,
    startTime: "2024-01-20 14:30",
    estimatedTime: "15分钟",
    priority: "high",
    resources: {
      cpu: 60,
      memory: 1024,
      gpu: 30,
    },
  },
  {
    id: "2",
    name: "推荐模型训练",
    type: "模型训练",
    status: "completed",
    progress: 100,
    startTime: "2024-01-20 10:00",
    priority: "medium",
    resources: {
      cpu: 0,
      memory: 0,
    },
  },
  {
    id: "3",
    name: "数据预处理",
    type: "数据处理",
    status: "pending",
    progress: 0,
    startTime: "2024-01-20 16:00",
    estimatedTime: "30分钟",
    priority: "low",
    resources: {
      cpu: 0,
      memory: 0,
    },
  },
  {
    id: "4",
    name: "模型评估",
    type: "模型评估",
    status: "failed",
    progress: 45,
    startTime: "2024-01-20 12:00",
    priority: "medium",
    resources: {
      cpu: 0,
      memory: 0,
    },
  },
]

export function AIDashboard() {
  const [models, setModels] = useState<AIModel[]>(mockModels)
  const [tasks, setTasks] = useState<AITask[]>(mockTasks)
  const [showModelDialog, setShowModelDialog] = useState(false)
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null)
  const [systemMetrics, setSystemMetrics] = useState({
    totalCPU: 68,
    totalMemory: 72,
    totalGPU: 45,
    activeModels: 3,
    queuedTasks: 2,
  })

  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    name: "",
    type: "classification",
    framework: "tensorflow",
    dataset: "user_behavior",
    hyperparameters: {
      learningRate: 0.001,
      batchSize: 32,
      epochs: 100,
      optimizer: "adam",
    },
    resources: {
      cpu: 4,
      memory: 8192,
      gpu: 1,
    },
  })

  // 模拟实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemMetrics((prev) => ({
        ...prev,
        totalCPU: Math.max(30, Math.min(90, prev.totalCPU + (Math.random() - 0.5) * 10)),
        totalMemory: Math.max(40, Math.min(85, prev.totalMemory + (Math.random() - 0.5) * 8)),
        totalGPU: Math.max(20, Math.min(80, prev.totalGPU + (Math.random() - 0.5) * 12)),
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (status: AIModel["status"] | AITask["status"]) => {
    switch (status) {
      case "running":
        return <Badge className="bg-green-100 text-green-800 animate-pulse">运行中</Badge>
      case "stopped":
        return <Badge variant="secondary">已停止</Badge>
      case "training":
        return <Badge className="bg-blue-100 text-blue-800 animate-pulse">训练中</Badge>
      case "deploying":
        return <Badge className="bg-purple-100 text-purple-800 animate-pulse">部署中</Badge>
      case "completed":
        return <Badge className="bg-green-100 text-green-800">已完成</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">等待中</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800">失败</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800">错误</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getStatusIcon = (status: AIModel["status"] | AITask["status"]) => {
    switch (status) {
      case "running":
        return <Activity className="w-4 h-4 text-green-600 animate-pulse" />
      case "stopped":
        return <Pause className="w-4 h-4 text-gray-600" />
      case "training":
        return <Cpu className="w-4 h-4 text-blue-600 animate-spin" />
      case "deploying":
        return <Rocket className="w-4 h-4 text-purple-600 animate-bounce" />
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "failed":
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Eye className="w-4 h-4 text-gray-600" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  const getResourceUsageColor = (usage: number) => {
    if (usage >= 80) return "text-red-600"
    if (usage >= 60) return "text-yellow-600"
    return "text-green-600"
  }

  const handleModelAction = (modelId: string, action: string) => {
    setModels((prev) =>
      prev.map((model) => {
        if (model.id === modelId) {
          switch (action) {
            case "start":
              return { ...model, status: "running" as const }
            case "stop":
              return { ...model, status: "stopped" as const }
            case "retrain":
              return { ...model, status: "training" as const }
            default:
              return model
          }
        }
        return model
      }),
    )
  }

  const handleCreateModel = () => {
    console.log("创建AI模型:", modelConfig)
    setShowModelDialog(false)
    // 重置配置
    setModelConfig({
      name: "",
      type: "classification",
      framework: "tensorflow",
      dataset: "user_behavior",
      hyperparameters: {
        learningRate: 0.001,
        batchSize: 32,
        epochs: 100,
        optimizer: "adam",
      },
      resources: {
        cpu: 4,
        memory: 8192,
        gpu: 1,
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900 flex items-center space-x-2">
            <Brain className="h-6 w-6 text-primary-600" />
            <span>AI智能引擎</span>
          </h2>
          <p className="text-secondary-600">先进的人工智能模型管理平台，支持模型训练、部署和监控</p>
        </div>
        <div className="flex gap-2">
          <EnhancedButton variant="outline" size="sm">
            <Monitor className="h-4 w-4 mr-2" />
            系统监控
          </EnhancedButton>
          <Dialog open={showModelDialog} onOpenChange={setShowModelDialog}>
            <DialogTrigger asChild>
              <EnhancedButton variant="primary" size="sm">
                <Sparkles className="h-4 w-4 mr-2" />
                创建模型
              </EnhancedButton>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <span>创建AI模型</span>
                </DialogTitle>
                <DialogDescription>配置和训练新的AI模型，支持多种框架和算法</DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-4">
                {/* 基本配置 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>基本配置</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="model-name">模型名称</Label>
                      <Input
                        id="model-name"
                        value={modelConfig.name}
                        onChange={(e) => setModelConfig({ ...modelConfig, name: e.target.value })}
                        placeholder="输入模型名称"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>模型类型</Label>
                      <Select
                        value={modelConfig.type}
                        onValueChange={(value) => setModelConfig({ ...modelConfig, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="classification">分类模型</SelectItem>
                          <SelectItem value="regression">回归模型</SelectItem>
                          <SelectItem value="clustering">聚类模型</SelectItem>
                          <SelectItem value="recommendation">推荐模型</SelectItem>
                          <SelectItem value="nlp">自然语言处理</SelectItem>
                          <SelectItem value="computer_vision">计算机视觉</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>框架</Label>
                      <Select
                        value={modelConfig.framework}
                        onValueChange={(value) => setModelConfig({ ...modelConfig, framework: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tensorflow">TensorFlow</SelectItem>
                          <SelectItem value="pytorch">PyTorch</SelectItem>
                          <SelectItem value="scikit-learn">Scikit-learn</SelectItem>
                          <SelectItem value="xgboost">XGBoost</SelectItem>
                          <SelectItem value="lightgbm">LightGBM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>数据集</Label>
                      <Select
                        value={modelConfig.dataset}
                        onValueChange={(value) => setModelConfig({ ...modelConfig, dataset: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user_behavior">用户行为数据</SelectItem>
                          <SelectItem value="sales_data">销售数据</SelectItem>
                          <SelectItem value="system_logs">系统日志</SelectItem>
                          <SelectItem value="customer_feedback">客户反馈</SelectItem>
                          <SelectItem value="financial_data">财务数据</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* 超参数配置 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center space-x-2">
                    <Gauge className="h-4 w-4" />
                    <span>超参数配置</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>学习率: {modelConfig.hyperparameters.learningRate}</Label>
                      <Slider
                        value={[modelConfig.hyperparameters.learningRate]}
                        onValueChange={(value) =>
                          setModelConfig({
                            ...modelConfig,
                            hyperparameters: { ...modelConfig.hyperparameters, learningRate: value[0] },
                          })
                        }
                        max={0.1}
                        min={0.0001}
                        step={0.0001}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>批次大小</Label>
                      <Select
                        value={modelConfig.hyperparameters.batchSize.toString()}
                        onValueChange={(value) =>
                          setModelConfig({
                            ...modelConfig,
                            hyperparameters: { ...modelConfig.hyperparameters, batchSize: Number.parseInt(value) },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="16">16</SelectItem>
                          <SelectItem value="32">32</SelectItem>
                          <SelectItem value="64">64</SelectItem>
                          <SelectItem value="128">128</SelectItem>
                          <SelectItem value="256">256</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>训练轮数</Label>
                      <Input
                        type="number"
                        value={modelConfig.hyperparameters.epochs}
                        onChange={(e) =>
                          setModelConfig({
                            ...modelConfig,
                            hyperparameters: {
                              ...modelConfig.hyperparameters,
                              epochs: Number.parseInt(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>优化器</Label>
                      <Select
                        value={modelConfig.hyperparameters.optimizer}
                        onValueChange={(value) =>
                          setModelConfig({
                            ...modelConfig,
                            hyperparameters: { ...modelConfig.hyperparameters, optimizer: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="adam">Adam</SelectItem>
                          <SelectItem value="sgd">SGD</SelectItem>
                          <SelectItem value="rmsprop">RMSprop</SelectItem>
                          <SelectItem value="adagrad">Adagrad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* 资源配置 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center space-x-2">
                    <Server className="h-4 w-4" />
                    <span>资源配置</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>CPU核心数: {modelConfig.resources.cpu}</Label>
                      <Slider
                        value={[modelConfig.resources.cpu]}
                        onValueChange={(value) =>
                          setModelConfig({
                            ...modelConfig,
                            resources: { ...modelConfig.resources, cpu: value[0] },
                          })
                        }
                        max={16}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>内存 (MB): {modelConfig.resources.memory}</Label>
                      <Slider
                        value={[modelConfig.resources.memory]}
                        onValueChange={(value) =>
                          setModelConfig({
                            ...modelConfig,
                            resources: { ...modelConfig.resources, memory: value[0] },
                          })
                        }
                        max={32768}
                        min={1024}
                        step={1024}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>GPU数量: {modelConfig.resources.gpu}</Label>
                      <Slider
                        value={[modelConfig.resources.gpu]}
                        onValueChange={(value) =>
                          setModelConfig({
                            ...modelConfig,
                            resources: { ...modelConfig.resources, gpu: value[0] },
                          })
                        }
                        max={4}
                        min={0}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowModelDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateModel}>
                  <Rocket className="w-4 h-4 mr-2" />
                  开始训练
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 系统概览统计 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <AnimatedContainer animation="slideUp" delay={0}>
          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI模型总数</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{models.length}</div>
              <p className="text-xs text-muted-foreground">
                {models.filter((m) => m.status === "running").length} 个运行中
              </p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={100}>
          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">处理任务</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tasks.filter((t) => t.status === "running").length}</div>
              <p className="text-xs text-muted-foreground">
                {tasks.filter((t) => t.status === "pending").length} 个等待中
              </p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={200}>
          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均准确率</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(models.reduce((acc, m) => acc + m.accuracy, 0) / models.length).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">+2.1% 较上月</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={300}>
          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU使用率</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getResourceUsageColor(systemMetrics.totalCPU)}`}>
                {systemMetrics.totalCPU}%
              </div>
              <Progress value={systemMetrics.totalCPU} className="h-2 mt-2" />
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={400}>
          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GPU使用率</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getResourceUsageColor(systemMetrics.totalGPU)}`}>
                {systemMetrics.totalGPU}%
              </div>
              <Progress value={systemMetrics.totalGPU} className="h-2 mt-2" />
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>
      </div>

      {/* AI功能选项卡 */}
      <Tabs defaultValue="models" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="models" className="flex items-center space-x-2">
            <Layers className="w-4 h-4" />
            <span>AI模型</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center space-x-2">
            <Workflow className="w-4 h-4" />
            <span>处理任务</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>智能分析</span>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center space-x-2">
            <Monitor className="w-4 h-4" />
            <span>系统监控</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>系统设置</span>
          </TabsTrigger>
        </TabsList>

        {/* AI模型管理 */}
        <TabsContent value="models" className="space-y-4">
          <AnimatedContainer animation="fadeIn" delay={200}>
            <EnhancedCard variant="traditional" size="lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="w-5 h-5 mr-2" />
                  AI模型管理
                </CardTitle>
                <CardDescription>管理和监控所有AI模型的运行状态和性能指标</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {models.map((model) => (
                    <div
                      key={model.id}
                      className="p-6 border rounded-lg hover:bg-secondary-50 transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          {getStatusIcon(model.status)}
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-lg">{model.name}</h3>
                              <Badge variant="outline">{model.type}</Badge>
                              {getStatusBadge(model.status)}
                              <Badge variant="secondary" className="text-xs">
                                {model.version}
                              </Badge>
                            </div>
                            <p className="text-sm text-secondary-600 mb-3">{model.description}</p>

                            {/* 性能指标 */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                              <div className="text-center p-2 bg-blue-50 rounded">
                                <div className="text-sm font-medium text-blue-900">准确率</div>
                                <div className="text-lg font-bold text-blue-600">{model.accuracy}%</div>
                              </div>
                              <div className="text-center p-2 bg-green-50 rounded">
                                <div className="text-sm font-medium text-green-900">精确率</div>
                                <div className="text-lg font-bold text-green-600">
                                  {(model.metrics.precision * 100).toFixed(1)}%
                                </div>
                              </div>
                              <div className="text-center p-2 bg-purple-50 rounded">
                                <div className="text-sm font-medium text-purple-900">召回率</div>
                                <div className="text-lg font-bold text-purple-600">
                                  {(model.metrics.recall * 100).toFixed(1)}%
                                </div>
                              </div>
                              <div className="text-center p-2 bg-orange-50 rounded">
                                <div className="text-sm font-medium text-orange-900">延迟</div>
                                <div className="text-lg font-bold text-orange-600">{model.metrics.latency}ms</div>
                              </div>
                            </div>

                            {/* 资源使用情况 */}
                            <div className="grid grid-cols-3 gap-4 mb-3">
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span>CPU</span>
                                  <span className={getResourceUsageColor(model.resources.cpu)}>
                                    {model.resources.cpu}%
                                  </span>
                                </div>
                                <Progress value={model.resources.cpu} className="h-1" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span>内存</span>
                                  <span>{(model.resources.memory / 1024).toFixed(1)}GB</span>
                                </div>
                                <Progress value={(model.resources.memory / 4096) * 100} className="h-1" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span>GPU</span>
                                  <span className={getResourceUsageColor(model.resources.gpu)}>
                                    {model.resources.gpu}%
                                  </span>
                                </div>
                                <Progress value={model.resources.gpu} className="h-1" />
                              </div>
                            </div>

                            <div className="flex items-center space-x-4 text-xs text-secondary-500">
                              <span>使用率: {model.usage}%</span>
                              <span>最后训练: {model.lastTrained}</span>
                              <span>F1分数: {model.metrics.f1Score.toFixed(3)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" title="查看详情">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="配置">
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="下载模型">
                            <Download className="w-4 h-4" />
                          </Button>
                          {model.status === "stopped" ? (
                            <Button size="sm" onClick={() => handleModelAction(model.id, "start")}>
                              <Play className="w-4 h-4 mr-1" />
                              启动
                            </Button>
                          ) : model.status === "running" ? (
                            <Button variant="outline" size="sm" onClick={() => handleModelAction(model.id, "stop")}>
                              <Pause className="w-4 h-4 mr-1" />
                              停止
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled>
                              <Cpu className="w-4 h-4 mr-1 animate-spin" />
                              {model.status === "training" ? "训练中" : "部署中"}
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleModelAction(model.id, "retrain")}>
                            <GitBranch className="w-4 h-4 mr-1" />
                            重训练
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>
        </TabsContent>

        {/* 处理任务 */}
        <TabsContent value="tasks" className="space-y-4">
          <AnimatedContainer animation="fadeIn" delay={200}>
            <EnhancedCard variant="traditional" size="lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Workflow className="w-5 h-5 mr-2" />
                  AI处理任务
                </CardTitle>
                <CardDescription>监控AI任务的执行进度、资源使用和优先级管理</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="p-4 border rounded-lg hover:bg-secondary-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(task.status)}
                          <div>
                            <h3 className="font-medium">{task.name}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {task.type}
                              </Badge>
                              {getStatusBadge(task.status)}
                              <Badge className={getPriorityColor(task.priority)} size="sm">
                                {task.priority === "high"
                                  ? "高优先级"
                                  : task.priority === "medium"
                                    ? "中优先级"
                                    : "低优先级"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {task.estimatedTime && (
                            <div className="text-sm text-secondary-600">预计: {task.estimatedTime}</div>
                          )}
                          <div className="text-xs text-secondary-500">开始: {task.startTime}</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>进度</span>
                          <span>{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-2" />

                        {/* 资源使用 */}
                        {task.status === "running" && (
                          <div className="grid grid-cols-3 gap-4 mt-3 p-3 bg-gray-50 rounded">
                            <div className="text-center">
                              <div className="text-xs text-secondary-600">CPU</div>
                              <div className="font-medium">{task.resources.cpu}%</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-secondary-600">内存</div>
                              <div className="font-medium">{(task.resources.memory / 1024).toFixed(1)}GB</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-secondary-600">GPU</div>
                              <div className="font-medium">{task.resources.gpu || 0}%</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>
        </TabsContent>

        {/* 智能分析 */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <AnimatedContainer animation="slideLeft" delay={200}>
              <EnhancedCard variant="modern" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    用户行为分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>活跃用户预测</span>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-600">+15.2%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>用户留存率</span>
                      <span className="font-medium">87.5%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>转化率优化</span>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-600">+3.1%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>异常行为检测</span>
                      <Badge className="bg-yellow-100 text-yellow-800">3个异常</Badge>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </AnimatedContainer>

            <AnimatedContainer animation="slideRight" delay={300}>
              <EnhancedCard variant="modern" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    智能客服分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>自动回复准确率</span>
                      <span className="font-medium">94.2%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>问题解决率</span>
                      <span className="font-medium">89.7%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>平均响应时间</span>
                      <span className="font-medium">1.2秒</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>情感分析准确率</span>
                      <span className="font-medium">91.8%</span>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </AnimatedContainer>

            <AnimatedContainer animation="slideLeft" delay={400}>
              <EnhancedCard variant="modern" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    业务预测分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>销售额预测</span>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="font-medium">¥2.1M</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>市场趋势</span>
                      <span className="font-medium text-green-600">上升</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>风险评估</span>
                      <span className="font-medium text-yellow-600">中等</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>库存优化建议</span>
                      <Badge className="bg-blue-100 text-blue-800">12项建议</Badge>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </AnimatedContainer>

            <AnimatedContainer animation="slideRight" delay={500}>
              <EnhancedCard variant="modern" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="w-5 h-5 mr-2" />
                    数据质量分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>数据完整性</span>
                      <span className="font-medium">98.5%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>数据准确性</span>
                      <span className="font-medium">96.8%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>异常检测</span>
                      <span className="font-medium text-red-600">3个异常</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>数据新鲜度</span>
                      <Badge className="bg-green-100 text-green-800">实时</Badge>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </AnimatedContainer>
          </div>
        </TabsContent>

        {/* 系统监控 */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <AnimatedContainer animation="slideLeft" delay={200}>
              <EnhancedCard variant="traditional" size="lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Monitor className="w-5 h-5 mr-2" />
                    实时系统监控
                  </CardTitle>
                  <CardDescription>监控AI系统的实时性能和资源使用情况</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center space-x-2">
                          <Cpu className="w-4 h-4" />
                          <span>CPU使用率</span>
                        </span>
                        <span className={`font-medium ${getResourceUsageColor(systemMetrics.totalCPU)}`}>
                          {systemMetrics.totalCPU}%
                        </span>
                      </div>
                      <Progress value={systemMetrics.totalCPU} className="h-3" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center space-x-2">
                          <MemoryStick className="w-4 h-4" />
                          <span>内存使用率</span>
                        </span>
                        <span className={`font-medium ${getResourceUsageColor(systemMetrics.totalMemory)}`}>
                          {systemMetrics.totalMemory}%
                        </span>
                      </div>
                      <Progress value={systemMetrics.totalMemory} className="h-3" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center space-x-2">
                          <HardDrive className="w-4 h-4" />
                          <span>GPU使用率</span>
                        </span>
                        <span className={`font-medium ${getResourceUsageColor(systemMetrics.totalGPU)}`}>
                          {systemMetrics.totalGPU}%
                        </span>
                      </div>
                      <Progress value={systemMetrics.totalGPU} className="h-3" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{systemMetrics.activeModels}</div>
                        <div className="text-sm text-secondary-600">活跃模型</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{systemMetrics.queuedTasks}</div>
                        <div className="text-sm text-secondary-600">队列任务</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </AnimatedContainer>

            <AnimatedContainer animation="slideRight" delay={300}>
              <EnhancedCard variant="traditional" size="lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Network className="w-5 h-5 mr-2" />
                    网络与连接状态
                  </CardTitle>
                  <CardDescription>监控网络连接和数据传输状态</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Wifi className="w-4 h-4 text-green-600" />
                        <span>API网关</span>
                      </div>
                      <Badge className="bg-green-100 text-green-800">正常</Badge>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Database className="w-4 h-4 text-green-600" />
                        <span>数据库连接</span>
                      </div>
                      <Badge className="bg-green-100 text-green-800">正常</Badge>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-yellow-600" />
                        <span>安全防护</span>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">监控中</Badge>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Server className="w-4 h-4 text-blue-600" />
                        <span>负载均衡</span>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">活跃</Badge>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold">99.9%</div>
                          <div className="text-xs text-secondary-600">系统可用性</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">12ms</div>
                          <div className="text-xs text-secondary-600">平均延迟</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </AnimatedContainer>
          </div>
        </TabsContent>

        {/* 系统设置 */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <AnimatedContainer animation="slideLeft" delay={200}>
              <EnhancedCard variant="traditional" size="lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    AI引擎配置
                  </CardTitle>
                  <CardDescription>配置AI引擎的核心参数和运行模式</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>自动模型更新</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>GPU加速</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>分布式计算</span>
                    <Switch />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>模型缓存</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>自动扩缩容</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>实时监控</span>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </EnhancedCard>
            </AnimatedContainer>

            <AnimatedContainer animation="slideRight" delay={300}>
              <EnhancedCard variant="traditional" size="lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="w-5 h-5 mr-2" />
                    数据管理
                  </CardTitle>
                  <CardDescription>管理训练数据和模型文件</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full bg-transparent" variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    导入训练数据
                  </Button>
                  <Button className="w-full bg-transparent" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    导出模型
                  </Button>
                  <Button className="w-full bg-transparent" variant="outline">
                    <Database className="w-4 h-4 mr-2" />
                    数据清理
                  </Button>
                  <Button className="w-full bg-transparent" variant="outline">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    性能分析
                  </Button>
                  <Button className="w-full bg-transparent" variant="outline">
                    <Shield className="w-4 h-4 mr-2" />
                    安全扫描
                  </Button>
                  <Button className="w-full bg-transparent" variant="outline">
                    <Lightbulb className="w-4 h-4 mr-2" />
                    优化建议
                  </Button>
                </CardContent>
              </EnhancedCard>
            </AnimatedContainer>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
