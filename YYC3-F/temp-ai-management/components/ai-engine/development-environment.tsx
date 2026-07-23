"use client"

import { useState, useEffect } from "react"
import {
  Terminal,
  Code,
  Play,
  Square,
  RefreshCw,
  Settings,
  Monitor,
  Cpu,
  Dock as Docker,
  GitBranch,
  Package,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Plus,
  Database,
  TestTube,
  Rocket,
  BookOpen,
  Trash2,
  Download,
  ExternalLink,
  MoreHorizontal,
  Search,
  Maximize2,
} from "lucide-react"
import { CardContent, CardHeader, CardTitle, Card, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"

import { EnhancedCard } from "../design-system/enhanced-card-system"
import { EnhancedButton } from "../design-system/enhanced-button-system"
import { AnimatedContainer } from "../design-system/animation-system"
import { useSound } from "../design-system/sound-system"

// 数据类型定义
interface DevEnvironment {
  id: string
  name: string
  type: "jupyter" | "vscode" | "rstudio" | "custom"
  status: "running" | "stopped" | "starting" | "stopping" | "error" | "deploying"
  image: string
  version: string
  port: number
  url: string
  resources: {
    cpu: number
    memory: number
    gpu: number
    storage: number
  }
  usage: {
    cpu: number
    memory: number
    gpu: number
    storage: number
  }
  owner: string
  createdAt: string
  lastAccessed: string
  description: string
  tags: string[]
  packages: string[]
  uptime: string
  lastDeploy: string
}

interface CodeRepository {
  id: string
  name: string
  type: "git" | "svn" | "local"
  url: string
  branch: string
  status: "synced" | "outdated" | "conflict" | "error"
  lastCommit: string
  lastSync: string
  size: number
  files: number
  contributors: number
  language: string
  framework: string
  description: string
}

interface DevContainer {
  id: string
  name: string
  image: string
  status: "running" | "stopped" | "building" | "error"
  ports: number[]
  volumes: string[]
  environment: Record<string, string>
  resources: {
    cpuLimit: string
    memoryLimit: string
    gpuAccess: boolean
  }
  createdAt: string
  uptime: string
  logs: string[]
}

interface DevTool {
  id: string
  name: string
  category: "editor" | "runtime" | "database" | "monitoring" | "testing" | "deployment"
  version: string
  status: "installed" | "available" | "updating" | "error"
  description: string
  requirements: string[]
  size: number
  popularity: number
  rating: number
}

interface DeploymentLog {
  id: string
  timestamp: string
  message: string
  type: "info" | "warning" | "error" | "success"
}

// 模拟数据
const mockEnvironments: DevEnvironment[] = [
  {
    id: "env-1",
    name: "AI开发环境",
    type: "jupyter",
    status: "running",
    image: "jupyter/tensorflow-notebook",
    version: "latest",
    port: 8888,
    url: "https://jupyter.yanyu.cloud:8888",
    resources: { cpu: 4, memory: 16, gpu: 1, storage: 100 },
    usage: { cpu: 65, memory: 78, gpu: 45, storage: 32 },
    owner: "张AI工程师",
    createdAt: "2024-01-15",
    lastAccessed: "2024-01-21 15:30:00",
    description: "用于机器学习和深度学习开发的Jupyter环境",
    tags: ["机器学习", "深度学习", "Python"],
    packages: ["tensorflow", "pytorch", "scikit-learn", "pandas", "numpy"],
    uptime: "2天 14小时",
    lastDeploy: "2024-01-16 10:30:00",
  },
  {
    id: "env-2",
    name: "Web开发环境",
    type: "vscode",
    status: "running",
    image: "codercom/code-server",
    version: "4.9.1",
    port: 8080,
    url: "https://vscode.yanyu.cloud:8080",
    resources: { cpu: 2, memory: 8, gpu: 0, storage: 50 },
    usage: { cpu: 35, memory: 42, gpu: 0, storage: 18 },
    owner: "李前端工程师",
    createdAt: "2024-01-18",
    lastAccessed: "2024-01-21 14:15:00",
    description: "基于VS Code的Web开发环境",
    tags: ["Web开发", "JavaScript", "React"],
    packages: ["node", "npm", "react", "typescript", "webpack"],
    uptime: "5天 8小时",
    lastDeploy: "2024-01-15 16:45:00",
  },
  {
    id: "env-3",
    name: "数据分析环境",
    type: "rstudio",
    status: "stopped",
    image: "rocker/rstudio",
    version: "4.3.2",
    port: 8787,
    url: "https://rstudio.yanyu.cloud:8787",
    resources: { cpu: 2, memory: 8, gpu: 0, storage: 30 },
    usage: { cpu: 0, memory: 0, gpu: 0, storage: 12 },
    owner: "王数据分析师",
    createdAt: "2024-01-20",
    lastAccessed: "2024-01-20 16:45:00",
    description: "R语言统计分析和数据可视化环境",
    tags: ["数据分析", "统计", "R语言"],
    packages: ["ggplot2", "dplyr", "shiny", "plotly", "caret"],
    uptime: "15天 3小时",
    lastDeploy: "2024-01-14 09:15:00",
  },
]

const mockRepositories: CodeRepository[] = [
  {
    id: "repo-1",
    name: "yanyu-ai-platform",
    type: "git",
    url: "https://github.com/yanyu/ai-platform.git",
    branch: "main",
    status: "synced",
    lastCommit: "feat: 添加用户行为分析模块",
    lastSync: "2024-01-21 16:30:00",
    size: 156,
    files: 342,
    contributors: 8,
    language: "Python",
    framework: "FastAPI",
    description: "YanYu Cloud³ AI平台核心代码库",
  },
  {
    id: "repo-2",
    name: "data-processing-pipeline",
    type: "git",
    url: "https://github.com/yanyu/data-pipeline.git",
    branch: "develop",
    status: "outdated",
    lastCommit: "refactor: 优化数据清洗流程",
    lastSync: "2024-01-20 14:20:00",
    size: 89,
    files: 156,
    contributors: 5,
    language: "Python",
    framework: "Apache Airflow",
    description: "数据处理和ETL流水线",
  },
  {
    id: "repo-3",
    name: "ml-model-library",
    type: "git",
    url: "https://github.com/yanyu/ml-models.git",
    branch: "main",
    status: "synced",
    lastCommit: "add: 新增推荐算法模型",
    lastSync: "2024-01-21 10:15:00",
    size: 234,
    files: 89,
    contributors: 12,
    language: "Python",
    framework: "TensorFlow",
    description: "机器学习模型库和算法集合",
  },
]

const mockContainers: DevContainer[] = [
  {
    id: "container-1",
    name: "jupyter-ai-dev",
    image: "jupyter/tensorflow-notebook:latest",
    status: "running",
    ports: [8888, 6006],
    volumes: ["/data:/workspace/data", "/models:/workspace/models"],
    environment: { JUPYTER_ENABLE_LAB: "yes", GRANT_SUDO: "yes" },
    resources: { cpuLimit: "4", memoryLimit: "16Gi", gpuAccess: true },
    createdAt: "2024-01-15 09:00:00",
    uptime: "6天 7小时",
    logs: [
      "2024-01-21 16:30:00 - Jupyter server started",
      "2024-01-21 16:25:00 - GPU device detected: Tesla V100",
      "2024-01-21 16:20:00 - Loading TensorFlow 2.13.0",
    ],
  },
  {
    id: "container-2",
    name: "vscode-web-dev",
    image: "codercom/code-server:4.9.1",
    status: "running",
    ports: [8080],
    volumes: ["/workspace:/home/coder/workspace"],
    environment: { PASSWORD: process.env.DEV_ENV_PASSWORD || "", SUDO_PASSWORD: process.env.DEV_ENV_SUDO_PASSWORD || "" },
    resources: { cpuLimit: "2", memoryLimit: "8Gi", gpuAccess: false },
    createdAt: "2024-01-18 14:30:00",
    uptime: "3天 2小时",
    logs: [
      "2024-01-21 16:30:00 - Code server listening on port 8080",
      "2024-01-21 16:25:00 - Extensions loaded successfully",
      "2024-01-21 16:20:00 - Workspace initialized",
    ],
  },
]

const mockDevTools: DevTool[] = [
  {
    id: "tool-1",
    name: "Python",
    category: "runtime",
    version: "3.11.7",
    status: "installed",
    description: "Python编程语言运行时环境",
    requirements: [],
    size: 45,
    popularity: 98,
    rating: 4.9,
  },
  {
    id: "tool-2",
    name: "TensorFlow",
    category: "runtime",
    version: "2.13.0",
    status: "installed",
    description: "开源机器学习框架",
    requirements: ["Python >= 3.8"],
    size: 512,
    popularity: 95,
    rating: 4.8,
  },
  {
    id: "tool-3",
    name: "Docker",
    category: "deployment",
    version: "24.0.7",
    status: "installed",
    description: "容器化平台",
    requirements: [],
    size: 128,
    popularity: 92,
    rating: 4.7,
  },
  {
    id: "tool-4",
    name: "PostgreSQL",
    category: "database",
    version: "15.5",
    status: "available",
    description: "开源关系型数据库",
    requirements: [],
    size: 256,
    popularity: 88,
    rating: 4.6,
  },
  {
    id: "tool-5",
    name: "VS Code",
    category: "editor",
    version: "1.85.1",
    status: "installed",
    description: "轻量级但功能强大的源代码编辑器",
    requirements: [],
    size: 350,
    popularity: 97,
    rating: 4.9,
  },
  {
    id: "tool-6",
    name: "Prometheus",
    category: "monitoring",
    version: "2.45.0",
    status: "available",
    description: "开源系统监控和警报工具包",
    requirements: ["Go >= 1.20"],
    size: 65,
    popularity: 85,
    rating: 4.5,
  },
]

const mockDeploymentLogs: DeploymentLog[] = [
  {
    id: "1",
    timestamp: "2024-01-16 10:30:15",
    message: "开始部署到开发环境",
    type: "info",
  },
  {
    id: "2",
    timestamp: "2024-01-16 10:30:45",
    message: "代码拉取完成",
    type: "success",
  },
  {
    id: "3",
    timestamp: "2024-01-16 10:31:20",
    message: "依赖安装中...",
    type: "info",
  },
  {
    id: "4",
    timestamp: "2024-01-16 10:32:10",
    message: "构建完成",
    type: "success",
  },
  {
    id: "5",
    timestamp: "2024-01-16 10:32:30",
    message: "部署成功",
    type: "success",
  },
]

const statusColors = {
  running: "bg-green-100 text-green-800",
  stopped: "bg-gray-100 text-gray-800",
  deploying: "bg-blue-100 text-blue-800",
  error: "bg-red-100 text-red-800",
}

const statusLabels = {
  running: "运行中",
  stopped: "已停止",
  deploying: "部署中",
  error: "错误",
}

const typeColors = {
  development: "bg-blue-100 text-blue-800",
  staging: "bg-yellow-100 text-yellow-800",
  production: "bg-red-100 text-red-800",
}

const typeLabels = {
  development: "开发",
  staging: "测试",
  production: "生产",
}

export function DevelopmentEnvironment() {
  const [selectedTab, setSelectedTab] = useState("environments")
  const [environments, setEnvironments] = useState<DevEnvironment[]>(mockEnvironments)
  const [repositories, setRepositories] = useState<CodeRepository[]>(mockRepositories)
  const [containers, setContainers] = useState<DevContainer[]>(mockContainers)
  const [devTools, setDevTools] = useState<DevTool[]>(mockDevTools)
  const [isCreateEnvOpen, setIsCreateEnvOpen] = useState(false)
  const [newEnv, setNewEnv] = useState({
    name: "",
    type: "jupyter",
    image: "",
    cpu: 2,
    memory: 8,
    gpu: 0,
    storage: 50,
    description: "",
    tags: [],
  })
  const [searchQuery, setSearchQuery] = useState("")
  const { playSound } = useSound()
  const [selectedEnv, setSelectedEnv] = useState<string>("env-1")
  const [isDeploying, setIsDeploying] = useState(false)

  // 模拟实时更新环境状态
  useEffect(() => {
    const interval = setInterval(() => {
      setEnvironments((prevEnvs) =>
        prevEnvs.map((env) => {
          if (env.status === "running") {
            return {
              ...env,
              usage: {
                ...env.usage,
                cpu: Math.max(0, Math.min(100, env.usage.cpu + (Math.random() - 0.5) * 10)),
                memory: Math.max(0, Math.min(100, env.usage.memory + (Math.random() - 0.5) * 8)),
                gpu: Math.max(0, Math.min(100, env.usage.gpu + (Math.random() - 0.5) * 15)),
              },
            }
          }
          return env
        }),
      )
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // 处理新环境表单变更
  const handleNewEnvChange = (field: string, value: any) => {
    setNewEnv((prev) => ({ ...prev, [field]: value }))
  }

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      running: { label: "运行中", className: "bg-green-100 text-green-800" },
      stopped: { label: "已停止", className: "bg-gray-100 text-gray-800" },
      starting: { label: "启动中", className: "bg-blue-100 text-blue-800" },
      stopping: { label: "停止中", className: "bg-yellow-100 text-yellow-800" },
      building: { label: "构建中", className: "bg-blue-100 text-blue-800" },
      error: { label: "错误", className: "bg-red-100 text-red-800" },
      synced: { label: "已同步", className: "bg-green-100 text-green-800" },
      outdated: { label: "需更新", className: "bg-yellow-100 text-yellow-800" },
      conflict: { label: "冲突", className: "bg-red-100 text-red-800" },
      installed: { label: "已安装", className: "bg-green-100 text-green-800" },
      available: { label: "可安装", className: "bg-blue-100 text-blue-800" },
      updating: { label: "更新中", className: "bg-yellow-100 text-yellow-800" },
      deploying: { label: "部署中", className: "bg-blue-100 text-blue-800" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.stopped
    return <Badge className={config.className}>{config.label}</Badge>
  }

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Play className="w-4 h-4 text-green-600" />
      case "stopped":
        return <Square className="w-4 h-4 text-gray-600" />
      case "starting":
      case "building":
      case "updating":
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      case "stopping":
        return <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />
      case "error":
      case "conflict":
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case "synced":
      case "installed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "outdated":
      case "available":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "deploying":
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      default:
        return <Eye className="w-4 h-4 text-gray-600" />
    }
  }

  // 获取环境类型图标
  const getEnvironmentTypeIcon = (type: string) => {
    switch (type) {
      case "jupyter":
        return <BookOpen className="w-5 h-5 text-orange-600" />
      case "vscode":
        return <Code className="w-5 h-5 text-blue-600" />
      case "rstudio":
        return <BarChart3 className="w-5 h-5 text-purple-600" />
      case "custom":
        return <Settings className="w-5 h-5 text-gray-600" />
      default:
        return <Terminal className="w-5 h-5 text-gray-600" />
    }
  }

  // 获取工具类别图标
  const getToolCategoryIcon = (category: string) => {
    switch (category) {
      case "editor":
        return <Code className="w-4 h-4 text-blue-600" />
      case "runtime":
        return <Cpu className="w-4 h-4 text-green-600" />
      case "database":
        return <Database className="w-4 h-4 text-purple-600" />
      case "monitoring":
        return <Monitor className="w-4 h-4 text-orange-600" />
      case "testing":
        return <TestTube className="w-4 h-4 text-red-600" />
      case "deployment":
        return <Rocket className="w-4 h-4 text-yellow-600" />
      default:
        return <Package className="w-4 h-4 text-gray-600" />
    }
  }

  // 处理环境操作
  const handleEnvironmentAction = (envId: string, action: string) => {
    playSound("click")
    console.log(`Environment ${envId} action: ${action}`)

    // 模拟环境状态变更
    setEnvironments((prev) =>
      prev.map((env) => {
        if (env.id === envId) {
          switch (action) {
            case "start":
              return { ...env, status: "starting" }
            case "stop":
              return { ...env, status: "stopping" }
            case "restart":
              return { ...env, status: env.status === "running" ? "stopping" : "starting" }
            default:
              return env
          }
        }
        return env
      }),
    )

    // 2秒后更新为最终状态
    setTimeout(() => {
      setEnvironments((prev) =>
        prev.map((env) => {
          if (env.id === envId) {
            switch (action) {
              case "start":
                return { ...env, status: "running" }
              case "stop":
                return { ...env, status: "stopped" }
              case "restart":
                return { ...env, status: "running" }
              default:
                return env
            }
          }
          return env
        }),
      )
    }, 2000)
  }

  // 创建新环境
  const handleCreateEnvironment = () => {
    playSound("success")

    // 生成新环境ID
    const newEnvId = `env-${environments.length + 1}`

    // 创建新环境对象
    const environment: DevEnvironment = {
      id: newEnvId,
      name: newEnv.name || `新环境-${newEnvId}`,
      type: newEnv.type as "jupyter" | "vscode" | "rstudio" | "custom",
      status: "starting",
      image: newEnv.image || `${newEnv.type}/default-image:latest`,
      version: "latest",
      port: 8000 + environments.length,
      url: `https://${newEnv.name.toLowerCase().replace(/\s+/g, "-")}.yanyu.cloud:${8000 + environments.length}`,
      resources: {
        cpu: newEnv.cpu,
        memory: newEnv.memory,
        gpu: newEnv.gpu,
        storage: newEnv.storage,
      },
      usage: { cpu: 0, memory: 0, gpu: 0, storage: 0 },
      owner: "当前用户",
      createdAt: new Date().toISOString().split("T")[0],
      lastAccessed: new Date().toISOString().replace("T", " ").slice(0, 19),
      description: newEnv.description,
      tags: newEnv.tags,
      packages: [],
      uptime: "0",
      lastDeploy: "刚刚",
    }

    // 添加到环境列表
    setEnvironments((prev) => [...prev, environment])

    // 2秒后更新为运行状态
    setTimeout(() => {
      setEnvironments((prev) => prev.map((env) => (env.id === newEnvId ? { ...env, status: "running" } : env)))
    }, 2000)

    // 重置表单并关闭对话框
    setNewEnv({
      name: "",
      type: "jupyter",
      image: "",
      cpu: 2,
      memory: 8,
      gpu: 0,
      storage: 50,
      description: "",
      tags: [],
    })
    setIsCreateEnvOpen(false)
  }

  // 处理仓库操作
  const handleRepositoryAction = (repoId: string, action: string) => {
    playSound("click")
    console.log(`Repository ${repoId} action: ${action}`)

    if (action === "sync") {
      setRepositories((prev) => prev.map((repo) => (repo.id === repoId ? { ...repo, status: "outdated" } : repo)))

      setTimeout(() => {
        setRepositories((prev) =>
          prev.map((repo) =>
            repo.id === repoId
              ? { ...repo, status: "synced", lastSync: new Date().toISOString().replace("T", " ").slice(0, 19) }
              : repo,
          ),
        )
      }, 1500)
    }
  }

  // 处理容器操作
  const handleContainerAction = (containerId: string, action: string) => {
    playSound("click")
    console.log(`Container ${containerId} action: ${action}`)

    setContainers((prev) =>
      prev.map((container) => {
        if (container.id === containerId) {
          switch (action) {
            case "start":
              return { ...container, status: "building" as const }
            case "stop":
              return { ...container, status: "stopped" as const }
            case "restart":
              return { ...container, status: container.status === "running" ? "stopped" : "building" as const }
            default:
              return container
          }
        }
        return container
      }),
    )

    setTimeout(() => {
      setContainers((prev) =>
        prev.map((container) => {
          if (container.id === containerId) {
            switch (action) {
              case "start":
                return { ...container, status: "running" }
              case "stop":
                return { ...container, status: "stopped" }
              case "restart":
                return { ...container, status: "running" }
              default:
                return container
            }
          }
          return container
        }),
      )
    }, 2000)
  }

  // 处理工具操作
  const handleToolAction = (toolId: string, action: string) => {
    playSound("click")
    console.log(`Tool ${toolId} action: ${action}`)

    if (action === "install" || action === "update") {
      setDevTools((prev) => prev.map((tool) => (tool.id === toolId ? { ...tool, status: "updating" } : tool)))

      setTimeout(() => {
        setDevTools((prev) => prev.map((tool) => (tool.id === toolId ? { ...tool, status: "installed" } : tool)))
      }, 2000)
    }
  }

  // 格式化字节大小
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 格式化GB大小
  const formatGB = (size: number) => {
    return `${size} GB`
  }

  // 过滤搜索结果
  const filteredEnvironments = environments.filter(
    (env) =>
      env.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      env.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      env.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const filteredRepositories = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.language.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredContainers = containers.filter(
    (container) =>
      container.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      container.image.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredTools = devTools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.category.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleDeploy = async (envId: string) => {
    setIsDeploying(true)
    setEnvironments(environments.map((env) => (env.id === envId ? { ...env, status: "deploying" } : env)))

    // 模拟部署过程
    setTimeout(() => {
      setEnvironments(
        environments.map((env) =>
          env.id === envId
            ? {
                ...env,
                status: "running",
                lastDeploy: new Date().toLocaleString("zh-CN"),
              }
            : env,
        ),
      )
      setIsDeploying(false)
    }, 3000)
  }

  const handleStop = (envId: string) => {
    setEnvironments(environments.map((env) => (env.id === envId ? { ...env, status: "stopped" } : env)))
  }

  const handleStart = (envId: string) => {
    setEnvironments(environments.map((env) => (env.id === envId ? { ...env, status: "running" } : env)))
  }

  const getLogIcon = (type: DeploymentLog["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-blue-600" />
    }
  }

  return (
    <div className="space-y-6 p-4">
      {/* 开发环境概览 */}
      <AnimatedContainer animation="fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <EnhancedCard variant="default" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">运行环境</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-primary-600">
                  {environments.filter((e) => e.status === "running").length}
                </div>
                <Terminal className="w-4 h-4 text-primary-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{environments.length} 个总环境</p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="default" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">代码仓库</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-blue-600">{repositories.length}</div>
                <GitBranch className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {repositories.filter((r) => r.status === "synced").length} 个已同步
              </p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="default" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">容器实例</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-green-600">
                  {containers.filter((c) => c.status === "running").length}
                </div>
                <Docker className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{containers.length} 个总容器</p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="default" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">开发工具</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-accent-600">
                  {devTools.filter((t) => t.status === "installed").length}
                </div>
                <Package className="w-4 h-4 text-accent-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{devTools.length} 个可用工具</p>
            </CardContent>
          </EnhancedCard>
        </div>
      </AnimatedContainer>

      {/* 主要功能区域 */}
      <AnimatedContainer animation="slideUp" delay={200}>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="environments">开发环境</TabsTrigger>
            <TabsTrigger value="repositories">代码仓库</TabsTrigger>
            <TabsTrigger value="containers">容器管理</TabsTrigger>
            <TabsTrigger value="tools">开发工具</TabsTrigger>
            <TabsTrigger value="monitoring">资源监控</TabsTrigger>
          </TabsList>

          {/* 开发环境 */}
          <TabsContent value="environments" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold">开发环境管理</h3>
                <p className="text-sm text-muted-foreground">管理和配置你的开发环境</p>
              </div>
              <div className="flex w-full sm:w-auto gap-2">
                <div className="relative flex-1 sm:flex-none sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="搜索环境..."
                    className="w-full pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Dialog open={isCreateEnvOpen} onOpenChange={setIsCreateEnvOpen}>
                  <DialogTrigger asChild>
                    <EnhancedButton variant="primary">
                      <Plus className="w-4 h-4 mr-2" />
                      创建环境
                    </EnhancedButton>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>创建开发环境</DialogTitle>
                      <DialogDescription>配置新的开发环境参数和资源</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="env-name">环境名称</Label>
                          <Input
                            id="env-name"
                            placeholder="输入环境名称"
                            value={newEnv.name}
                            onChange={(e) => handleNewEnvChange("name", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="env-type">环境类型</Label>
                          <Select value={newEnv.type} onValueChange={(value) => handleNewEnvChange("type", value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="选择环境类型" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="jupyter">Jupyter Notebook</SelectItem>
                              <SelectItem value="vscode">VS Code Server</SelectItem>
                              <SelectItem value="rstudio">RStudio Server</SelectItem>
                              <SelectItem value="custom">自定义环境</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="env-image">镜像名称</Label>
                        <Input
                          id="env-image"
                          placeholder="例如: jupyter/tensorflow-notebook:latest"
                          value={newEnv.image}
                          onChange={(e) => handleNewEnvChange("image", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>资源配置</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">CPU 核心</span>
                              <span className="text-sm font-medium">{newEnv.cpu} 核</span>
                            </div>
                            <Slider
                              defaultValue={[2]}
                              max={8}
                              min={1}
                              step={1}
                              value={[newEnv.cpu]}
                              onValueChange={(value) => handleNewEnvChange("cpu", value[0])}
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">内存</span>
                              <span className="text-sm font-medium">{newEnv.memory} GB</span>
                            </div>
                            <Slider
                              defaultValue={[8]}
                              max={32}
                              min={2}
                              step={2}
                              value={[newEnv.memory]}
                              onValueChange={(value) => handleNewEnvChange("memory", value[0])}
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">GPU 数量</span>
                              <span className="text-sm font-medium">{newEnv.gpu} 个</span>
                            </div>
                            <Slider
                              defaultValue={[0]}
                              max={4}
                              min={0}
                              step={1}
                              value={[newEnv.gpu]}
                              onValueChange={(value) => handleNewEnvChange("gpu", value[0])}
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">存储</span>
                              <span className="text-sm font-medium">{newEnv.storage} GB</span>
                            </div>
                            <Slider
                              defaultValue={[50]}
                              max={500}
                              min={10}
                              step={10}
                              value={[newEnv.storage]}
                              onValueChange={(value) => handleNewEnvChange("storage", value[0])}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="env-description">环境描述</Label>
                        <Textarea
                          id="env-description"
                          placeholder="描述这个环境的用途和特点..."
                          className="min-h-[80px]"
                          value={newEnv.description}
                          onChange={(e) => handleNewEnvChange("description", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="env-tags">标签 (逗号分隔)</Label>
                        <Input
                          id="env-tags"
                          placeholder="例如: Python, 机器学习, TensorFlow"
                          value={newEnv.tags.join(", ")}
                          onChange={(e) =>
                            handleNewEnvChange(
                              "tags",
                              e.target.value
                                .split(",")
                                .map((tag) => tag.trim())
                                .filter(Boolean),
                            )
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="secondary" onClick={() => setIsCreateEnvOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={handleCreateEnvironment} disabled={!newEnv.name.trim()}>
                        创建环境
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredEnvironments.length > 0 ? (
                filteredEnvironments.map((env) => (
                  <EnhancedCard key={env.id} variant="default" className="overflow-hidden">
                    <div className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary-50 rounded-md">{getEnvironmentTypeIcon(env.type)}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{env.name}</h4>
                              {getStatusBadge(env.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">{env.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-sm text-muted-foreground hidden md:block">
                            最后访问: {env.lastAccessed}
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>环境操作</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {env.status === "running" ? (
                                <>
                                  <DropdownMenuItem onClick={() => window.open(env.url, "_blank")}>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    <span>打开环境</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEnvironmentAction(env.id, "stop")}>
                                    <Square className="mr-2 h-4 w-4" />
                                    <span>停止环境</span>
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem onClick={() => handleEnvironmentAction(env.id, "start")}>
                                  <Play className="mr-2 h-4 w-4" />
                                  <span>启动环境</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleEnvironmentAction(env.id, "restart")}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                <span>重启环境</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>删除环境</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">CPU 使用率</span>
                            <span className="font-medium">{env.usage.cpu.toFixed(1)}%</span>
                          </div>
                          <Progress value={env.usage.cpu} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">分配: {env.resources.cpu} 核心</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">内存使用率</span>
                            <span className="font-medium">{env.usage.memory.toFixed(1)}%</span>
                          </div>
                          <Progress value={env.usage.memory} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">分配: {env.resources.memory} GB</p>
                        </div>
                        {env.resources.gpu > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">GPU 使用率</span>
                              <span className="font-medium">{env.usage.gpu.toFixed(1)}%</span>
                            </div>
                            <Progress value={env.usage.gpu} className="h-1.5" />
                            <p className="text-xs text-muted-foreground">分配: {env.resources.gpu} 个</p>
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">存储使用率</span>
                            <span className="font-medium">{env.usage.storage.toFixed(1)}%</span>
                          </div>
                          <Progress value={env.usage.storage} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">分配: {env.resources.storage} GB</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <div className="text-xs text-muted-foreground">镜像:</div>
                        <Badge variant="outline" className="text-xs">
                          {env.image}:{env.version}
                        </Badge>
                        <div className="text-xs text-muted-foreground ml-2">标签:</div>
                        {env.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        <div className="text-xs text-muted-foreground ml-2">端口:</div>
                        <Badge variant="outline" className="text-xs">
                          {env.port}
                        </Badge>
                      </div>
                    </div>
                  </EnhancedCard>
                ))
              ) : (
                <EnhancedCard variant="default" className="p-8 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Terminal className="w-12 h-12 mb-2 opacity-50" />
                    <h3 className="text-lg font-medium mb-1">未找到环境</h3>
                    <p>没有匹配"{searchQuery}"的开发环境</p>
                    <Button variant="secondary" className="mt-4" onClick={() => setSearchQuery("")}>
                      清除搜索
                    </Button>
                  </div>
                </EnhancedCard>
              )}
            </div>
          </TabsContent>

          {/* 代码仓库 */}
          <TabsContent value="repositories" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold">代码仓库管理</h3>
                <p className="text-sm text-muted-foreground">管理你的代码仓库和版本控制</p>
              </div>
              <div className="flex w-full sm:w-auto gap-2">
                <div className="relative flex-1 sm:flex-none sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="搜索仓库..."
                    className="w-full pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <EnhancedButton variant="primary">
                  <Plus className="w-4 h-4 mr-2" />
                  添加仓库
                </EnhancedButton>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredRepositories.length > 0 ? (
                filteredRepositories.map((repo) => (
                  <EnhancedCard key={repo.id} variant="default" className="overflow-hidden">
                    <div className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-md">
                            <GitBranch className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{repo.name}</h4>
                              {getStatusBadge(repo.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">{repo.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-sm text-muted-foreground hidden md:block">最后同步: {repo.lastSync}</div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>仓库操作</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleRepositoryAction(repo.id, "sync")}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                <span>同步仓库</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(repo.url, "_blank")}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                <span>查看远程</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                <span>克隆到本地</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>移除仓库</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">语言 / 框架</span>
                          <span className="font-medium">
                            {repo.language} / {repo.framework}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">分支</span>
                          <span className="font-medium">{repo.branch}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">贡献者</span>
                          <span className="font-medium">{repo.contributors} 人</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">大小 / 文件数</span>
                          <span className="font-medium">
                            {repo.size} MB / {repo.files} 个
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-muted/50 rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">最后提交</div>
                        <div className="text-sm font-medium">{repo.lastCommit}</div>
                      </div>
                    </div>
                  </EnhancedCard>
                ))
              ) : (
                <EnhancedCard variant="default" className="p-8 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <GitBranch className="w-12 h-12 mb-2 opacity-50" />
                    <h3 className="text-lg font-medium mb-1">未找到仓库</h3>
                    <p>没有匹配"{searchQuery}"的代码仓库</p>
                    <Button variant="secondary" className="mt-4" onClick={() => setSearchQuery("")}>
                      清除搜索
                    </Button>
                  </div>
                </EnhancedCard>
              )}
            </div>
          </TabsContent>

          {/* 容器管理 */}
          <TabsContent value="containers" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold">容器实例管理</h3>
                <p className="text-sm text-muted-foreground">管理和监控你的容器实例</p>
              </div>
              <div className="flex w-full sm:w-auto gap-2">
                <div className="relative flex-1 sm:flex-none sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="搜索容器..."
                    className="w-full pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <EnhancedButton variant="primary">
                  <Plus className="w-4 h-4 mr-2" />
                  新建容器
                </EnhancedButton>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredContainers.length > 0 ? (
                filteredContainers.map((container) => (
                  <EnhancedCard key={container.id} variant="default" className="overflow-hidden">
                    <div className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-50 rounded-md">
                            <Docker className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{container.name}</h4>
                              {getStatusBadge(container.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">{container.image}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-sm text-muted-foreground hidden md:block">
                            {container.status === "running"
                              ? `运行时间: ${container.uptime}`
                              : `创建时间: ${container.createdAt}`}
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>容器操作</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {container.status === "running" ? (
                                <>
                                  <DropdownMenuItem onClick={() => handleContainerAction(container.id, "stop")}>
                                    <Square className="mr-2 h-4 w-4" />
                                    <span>停止容器</span>
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem onClick={() => handleContainerAction(container.id, "start")}>
                                  <Play className="mr-2 h-4 w-4" />
                                  <span>启动容器</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleContainerAction(container.id, "restart")}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                <span>重启容器</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Maximize2 className="mr-2 h-4 w-4" />
                                <span>查看详情</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>删除容器</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">暴露端口</div>
                          <div className="flex flex-wrap gap-1">
                            {container.ports.map((port, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {port}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">资源限制</div>
                          <div className="text-sm">
                            CPU: {container.resources.cpuLimit} 核 | 内存: {container.resources.memoryLimit}
                            {container.resources.gpuAccess && <span className="ml-2">| GPU: 已启用</span>}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">挂载卷</div>
                          <div className="flex flex-wrap gap-1">
                            {container.volumes.map((volume, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs truncate max-w-[120px]">
                                {volume}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs text-muted-foreground mb-1">最近日志</div>
                        <ScrollArea className="h-20 rounded-md border p-3 bg-muted/30 text-muted-foreground text-xs">
                          {container.logs.map((log, idx) => (
                            <div key={idx} className="mb-1 last:mb-0">
                              {log}
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    </div>
                  </EnhancedCard>
                ))
              ) : (
                <EnhancedCard variant="default" className="p-8 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Docker className="w-12 h-12 mb-2 opacity-50" />
                    <h3 className="text-lg font-medium mb-1">未找到容器</h3>
                    <p>没有匹配"{searchQuery}"的容器实例</p>
                    <Button variant="secondary" className="mt-4" onClick={() => setSearchQuery("")}>
                      清除搜索
                    </Button>
                  </div>
                </EnhancedCard>
              )}
            </div>
          </TabsContent>

          {/* 开发工具 */}
          <TabsContent value="tools" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold">开发工具管理</h3>
                <p className="text-sm text-muted-foreground">管理你的开发工具和依赖</p>
              </div>
              <div className="flex w-full sm:w-auto gap-2">
                <div className="relative flex-1 sm:flex-none sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="搜索工具..."
                    className="w-full pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="所有类别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有类别</SelectItem>
                    <SelectItem value="editor">编辑器</SelectItem>
                    <SelectItem value="runtime">运行时</SelectItem>
                    <SelectItem value="database">数据库</SelectItem>
                    <SelectItem value="monitoring">监控工具</SelectItem>
                    <SelectItem value="testing">测试工具</SelectItem>
                    <SelectItem value="deployment">部署工具</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTools.length > 0 ? (
                filteredTools.map((tool) => (
                  <EnhancedCard key={tool.id} variant="default" className="overflow-hidden">
                    <div className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-accent-50 rounded-md">{getToolCategoryIcon(tool.category)}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{tool.name}</h4>
                              {getStatusBadge(tool.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">{tool.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            v{tool.version}
                          </Badge>
                          {tool.status === "installed" ? (
                            <Button variant="secondary" size="sm" onClick={() => handleToolAction(tool.id, "update")}>
                              <RefreshCw className="w-4 h-4 mr-1" />
                              更新
                            </Button>
                          ) : (
                            <Button variant="default" size="sm" onClick={() => handleToolAction(tool.id, "install")}>
                              <Download className="w-4 h-4 mr-1" />
                              安装
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">类别</span>
                          <span className="font-medium capitalize">{tool.category}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">大小</span>
                          <span className="font-medium">{formatGB(tool.size)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">评分 / 流行度</span>
                          <span className="font-medium">
                            {tool.rating} / {tool.popularity}%
                          </span>
                        </div>
                      </div>

                      {tool.requirements.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs text-muted-foreground mb-1">依赖要求</div>
                          <div className="flex flex-wrap gap-1">
                            {tool.requirements.map((req, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {req}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </EnhancedCard>
                ))
              ) : (
                <EnhancedCard variant="default" className="p-8 text-center md:col-span-2">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="w-12 h-12 mb-2 opacity-50" />
                    <h3 className="text-lg font-medium mb-1">未找到工具</h3>
                    <p>没有匹配"{searchQuery}"的开发工具</p>
                    <Button variant="secondary" className="mt-4" onClick={() => setSearchQuery("")}>
                      清除搜索
                    </Button>
                  </div>
                </EnhancedCard>
              )}
            </div>
          </TabsContent>

          {/* 资源监控 */}
          <TabsContent value="monitoring" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold">资源监控</h3>
                <p className="text-sm text-muted-foreground">监控系统资源使用情况</p>
              </div>
              <div className="flex gap-2">
                <Select defaultValue="hour">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="时间范围" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hour">最近1小时</SelectItem>
                    <SelectItem value="day">最近24小时</SelectItem>
                    <SelectItem value="week">最近7天</SelectItem>
                    <SelectItem value="month">最近30天</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="secondary">
                  <Download className="w-4 h-4 mr-2" />
                  导出报告
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EnhancedCard variant="default">
                <CardHeader>
                  <CardTitle className="text-base">CPU 使用率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-muted/30 rounded-md flex items-center justify-center">
                    <div className="text-muted-foreground">CPU 监控图表</div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="p-2 bg-muted/20 rounded-md">
                      <div className="text-xs text-muted-foreground">总使用率</div>
                      <div className="text-lg font-semibold">42%</div>
                    </div>
                    <div className="p-2 bg-muted/20 rounded-md">
                      <div className="text-xs text-muted-foreground">环境使用</div>
                      <div className="text-lg font-semibold">35%</div>
                    </div>
                    <div className="p-2 bg-muted/20 rounded-md">
                      <div className="text-xs text-muted-foreground">系统使用</div>
                      <div className="text-lg font-semibold">7%</div>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>

              <EnhancedCard variant="default">
                <CardHeader>
                  <CardTitle className="text-base">内存使用率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-muted/30 rounded-md flex items-center justify-center">
                    <div className="text-muted-foreground">内存监控图表</div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="p-2 bg-muted/20 rounded-md">
                      <div className="text-xs text-muted-foreground">总使用率</div>
                      <div className="text-lg font-semibold">68%</div>
                    </div>
                    <div className="p-2 bg-muted/20 rounded-md">
                      <div className="text-xs text-muted-foreground">已使用</div>
                      <div className="text-lg font-semibold">17 GB</div>
                    </div>
                    <div className="p-2 bg-muted/20 rounded-md">
                      <div className="text-xs text-muted-foreground">剩余</div>
                      <div className="text-lg font-semibold">8 GB</div>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>

              <EnhancedCard variant="default">
                <CardHeader>
                  <CardTitle className="text-base">存储使用率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-muted/30 rounded-md flex items-center justify-center">
                    <div className="text-muted-foreground">存储监控图表</div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="p-2 bg-muted/20 rounded-md">
                      <div className="text-xs text-muted-foreground">总使用率</div>
                      <div className="text-lg font-semibold">32%</div>
                    </div>
                    <div className="p-2 bg-muted/20 rounded-md">
                      <div className="text-xs text-muted-foreground">已使用</div>
                      <div className="text-lg font-semibold">64 GB</div>
                    </div>
                    <div className="p-2 bg-muted/20 rounded-md">
                      <div className="text-xs text-muted-foreground">剩余</div>
                      <div className="text-lg font-semibold">136 GB</div>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>

              <EnhancedCard variant="default">
                <CardHeader>
                  <CardTitle className="text-base">GPU 使用率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-muted/30 rounded-md flex items-center justify-center">
                    <div className="text-muted-foreground">GPU 监控图表</div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="p-2 bg-muted/20 rounded-md">
                      <div className="text-xs text-muted-foreground">总使用率</div>
                      <div className="text-lg font-semibold">45%</div>
                    </div>
                    <div className="p-2 bg-muted/20 rounded-md">
                      <div className="text-xs text-muted-foreground">型号</div>
                      <div className="text-lg font-semibold">Tesla V100</div>
                    </div>
                    <div className="p-2 bg-muted/20 rounded-md">
                      <div className="text-xs text-muted-foreground">显存使用</div>
                      <div className="text-lg font-semibold">8.2 / 16 GB</div>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </div>

            <EnhancedCard variant="default">
              <CardHeader>
                <CardTitle className="text-base">环境资源分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">环境名称</th>
                        <th className="text-left py-3 px-4">CPU</th>
                        <th className="text-left py-3 px-4">内存</th>
                        <th className="text-left py-3 px-4">GPU</th>
                        <th className="text-left py-3 px-4">存储</th>
                        <th className="text-left py-3 px-4">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {environments.map((env) => (
                        <tr key={env.id} className="border-b hover:bg-muted/30">
                          <td className="py-3 px-4">{env.name}</td>
                          <td className="py-3 px-4">
                            <div className="w-24">
                              <div className="flex justify-between text-xs mb-1">
                                <span>{env.usage.cpu.toFixed(1)}%</span>
                                <span>{env.resources.cpu} 核</span>
                              </div>
                              <Progress value={env.usage.cpu} className="h-1.5" />
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="w-24">
                              <div className="flex justify-between text-xs mb-1">
                                <span>{env.usage.memory.toFixed(1)}%</span>
                                <span>{env.resources.memory} GB</span>
                              </div>
                              <Progress value={env.usage.memory} className="h-1.5" />
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {env.resources.gpu > 0 ? (
                              <div className="w-24">
                                <div className="flex justify-between text-xs mb-1">
                                  <span>{env.usage.gpu.toFixed(1)}%</span>
                                  <span>{env.resources.gpu} 个</span>
                                </div>
                                <Progress value={env.usage.gpu} className="h-1.5" />
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="w-24">
                              <div className="flex justify-between text-xs mb-1">
                                <span>{env.usage.storage.toFixed(1)}%</span>
                                <span>{env.resources.storage} GB</span>
                              </div>
                              <Progress value={env.usage.storage} className="h-1.5" />
                            </div>
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(env.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>

          {/* 部署管理 */}
          <TabsContent value="deployment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>部署管理</CardTitle>
                <CardDescription>管理应用程序的部署流程</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>选择环境</Label>
                    <Select value={selectedEnv} onValueChange={setSelectedEnv}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {environments.map((env) => (
                          <SelectItem key={env.id} value={env.id}>
                            {env.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>分支选择</Label>
                    <Select defaultValue="main">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">main</SelectItem>
                        <SelectItem value="develop">develop</SelectItem>
                        <SelectItem value="feature/new-ui">feature/new-ui</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>部署说明</Label>
                  <Input placeholder="输入部署说明（可选）" />
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => handleDeploy(selectedEnv)} disabled={isDeploying} className="flex-1">
                    <GitBranch className="h-4 w-4 mr-2" />
                    {isDeploying ? "部署中..." : "开始部署"}
                  </Button>
                  <Button variant="outline">
                    <Terminal className="h-4 w-4 mr-2" />
                    终端
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 部署日志 */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>部署日志</CardTitle>
                <CardDescription>查看最近的部署活动和日志</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockDeploymentLogs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0 mt-0.5">{getLogIcon(log.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{log.message}</p>
                          <span className="text-xs text-muted-foreground">{log.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </AnimatedContainer>
    </div>
  )
}
