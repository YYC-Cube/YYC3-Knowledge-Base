"use client"

import { useState, useEffect } from "react"
import {
  HardDrive,
  Database,
  Server,
  Cloud,
  File,
  Archive,
  Trash2,
  Download,
  Upload,
  Search,
  Settings,
  Monitor,
  Activity,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Lock,
  Eye,
  Copy,
  Move,
  RefreshCw,
  Plus,
  Gauge,
  Layers,
  Network,
  Cpu,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { EnhancedCard } from "../design-system/enhanced-card-system"
import { EnhancedButton } from "../design-system/enhanced-button-system"
import { AnimatedContainer } from "../design-system/animation-system"
import { useSound } from "../design-system/sound-system"

// 数据类型定义
interface StorageNode {
  id: string
  name: string
  type: "ssd" | "hdd" | "nvme" | "cloud" | "network"
  status: "online" | "offline" | "maintenance" | "error"
  capacity: number // GB
  used: number // GB
  available: number // GB
  usage: number // percentage
  health: number // percentage
  temperature: number // Celsius
  readSpeed: number // MB/s
  writeSpeed: number // MB/s
  iops: number
  location: string
  mountPoint: string
  fileSystem: string
  lastCheck: string
  createdAt: string
}

interface StoragePool {
  id: string
  name: string
  type: "raid0" | "raid1" | "raid5" | "raid10" | "single"
  status: "healthy" | "degraded" | "failed" | "rebuilding"
  nodes: string[]
  totalCapacity: number
  usedCapacity: number
  redundancy: number
  performance: number
  description: string
  createdAt: string
}

interface DataFile {
  id: string
  name: string
  type: "dataset" | "model" | "backup" | "log" | "temp"
  size: number // MB
  path: string
  storageNode: string
  owner: string
  permissions: string
  lastModified: string
  lastAccessed: string
  checksum: string
  encrypted: boolean
  compressed: boolean
  tags: string[]
  metadata: Record<string, any>
}

interface BackupJob {
  id: string
  name: string
  type: "full" | "incremental" | "differential"
  status: "running" | "completed" | "failed" | "scheduled"
  source: string
  destination: string
  progress: number
  startTime: string
  endTime?: string
  duration?: string
  dataSize: number
  compressedSize: number
  compressionRatio: number
  schedule: string
  retention: number // days
  nextRun: string
}

// 模拟数据
const mockStorageNodes: StorageNode[] = [
  {
    id: "node-1",
    name: "主存储节点-01",
    type: "nvme",
    status: "online",
    capacity: 2048,
    used: 1434,
    available: 614,
    usage: 70,
    health: 98,
    temperature: 42,
    readSpeed: 3500,
    writeSpeed: 3200,
    iops: 450000,
    location: "机房A-机柜01",
    mountPoint: "/storage/nvme01",
    fileSystem: "ext4",
    lastCheck: "2024-01-21 16:30:00",
    createdAt: "2024-01-01",
  },
  {
    id: "node-2",
    name: "主存储节点-02",
    type: "ssd",
    status: "online",
    capacity: 4096,
    used: 2867,
    available: 1229,
    usage: 70,
    health: 95,
    temperature: 38,
    readSpeed: 550,
    writeSpeed: 520,
    iops: 85000,
    location: "机房A-机柜02",
    mountPoint: "/storage/ssd01",
    fileSystem: "xfs",
    lastCheck: "2024-01-21 16:25:00",
    createdAt: "2024-01-01",
  },
  {
    id: "node-3",
    name: "归档存储节点",
    type: "hdd",
    status: "online",
    capacity: 8192,
    used: 3276,
    available: 4916,
    usage: 40,
    health: 92,
    temperature: 35,
    readSpeed: 180,
    writeSpeed: 160,
    iops: 150,
    location: "机房B-机柜01",
    mountPoint: "/storage/archive",
    fileSystem: "zfs",
    lastCheck: "2024-01-21 16:20:00",
    createdAt: "2024-01-01",
  },
  {
    id: "node-4",
    name: "云存储节点",
    type: "cloud",
    status: "online",
    capacity: 10240,
    used: 2048,
    available: 8192,
    usage: 20,
    health: 100,
    temperature: 0,
    readSpeed: 100,
    writeSpeed: 80,
    iops: 1000,
    location: "阿里云-华东1",
    mountPoint: "/storage/cloud",
    fileSystem: "s3fs",
    lastCheck: "2024-01-21 16:35:00",
    createdAt: "2024-01-01",
  },
]

const mockStoragePools: StoragePool[] = [
  {
    id: "pool-1",
    name: "高性能存储池",
    type: "raid10",
    status: "healthy",
    nodes: ["node-1", "node-2"],
    totalCapacity: 6144,
    usedCapacity: 4301,
    redundancy: 50,
    performance: 95,
    description: "用于存储高频访问的数据和模型",
    createdAt: "2024-01-01",
  },
  {
    id: "pool-2",
    name: "归档存储池",
    type: "raid5",
    status: "healthy",
    nodes: ["node-3"],
    totalCapacity: 8192,
    usedCapacity: 3276,
    redundancy: 25,
    performance: 60,
    description: "用于长期归档和备份数据",
    createdAt: "2024-01-01",
  },
  {
    id: "pool-3",
    name: "云存储池",
    type: "single",
    status: "healthy",
    nodes: ["node-4"],
    totalCapacity: 10240,
    usedCapacity: 2048,
    redundancy: 0,
    performance: 40,
    description: "云端弹性存储，用于备份和灾难恢复",
    createdAt: "2024-01-01",
  },
]

const mockDataFiles: DataFile[] = [
  {
    id: "file-1",
    name: "用户行为数据集_2024Q1.csv",
    type: "dataset",
    size: 2048,
    path: "/storage/datasets/user_behavior_2024q1.csv",
    storageNode: "node-1",
    owner: "张数据分析师",
    permissions: "rw-r--r--",
    lastModified: "2024-01-20 14:30:00",
    lastAccessed: "2024-01-21 09:15:00",
    checksum: "sha256:a1b2c3d4e5f6...",
    encrypted: true,
    compressed: false,
    tags: ["用户数据", "Q1", "分析"],
    metadata: { format: "csv", encoding: "utf-8", rows: 150000 },
  },
  {
    id: "file-2",
    name: "推荐模型_v2.1.pkl",
    type: "model",
    size: 512,
    path: "/storage/models/recommendation_v2.1.pkl",
    storageNode: "node-1",
    owner: "李ML工程师",
    permissions: "rw-r-----",
    lastModified: "2024-01-19 16:45:00",
    lastAccessed: "2024-01-21 10:30:00",
    checksum: "sha256:f6e5d4c3b2a1...",
    encrypted: true,
    compressed: true,
    tags: ["模型", "推荐系统", "生产"],
    metadata: { framework: "scikit-learn", version: "2.1", accuracy: 0.87 },
  },
  {
    id: "file-3",
    name: "系统日志_20240120.log",
    type: "log",
    size: 128,
    path: "/storage/logs/system_20240120.log",
    storageNode: "node-2",
    owner: "系统管理员",
    permissions: "rw-r--r--",
    lastModified: "2024-01-20 23:59:59",
    lastAccessed: "2024-01-21 08:00:00",
    checksum: "sha256:9876543210ab...",
    encrypted: false,
    compressed: true,
    tags: ["日志", "系统", "监控"],
    metadata: { level: "info", entries: 25000 },
  },
]

const mockBackupJobs: BackupJob[] = [
  {
    id: "backup-1",
    name: "数据库全量备份",
    type: "full",
    status: "completed",
    source: "/storage/database",
    destination: "/storage/backup/db_full",
    progress: 100,
    startTime: "2024-01-21 02:00:00",
    endTime: "2024-01-21 04:30:00",
    duration: "2小时30分钟",
    dataSize: 15360,
    compressedSize: 6144,
    compressionRatio: 60,
    schedule: "每周日 02:00",
    retention: 30,
    nextRun: "2024-01-28 02:00:00",
  },
  {
    id: "backup-2",
    name: "模型增量备份",
    type: "incremental",
    status: "running",
    source: "/storage/models",
    destination: "/storage/backup/models_inc",
    progress: 65,
    startTime: "2024-01-21 16:00:00",
    dataSize: 2048,
    compressedSize: 1024,
    compressionRatio: 50,
    schedule: "每日 16:00",
    retention: 7,
    nextRun: "2024-01-22 16:00:00",
  },
  {
    id: "backup-3",
    name: "日志差异备份",
    type: "differential",
    status: "scheduled",
    source: "/storage/logs",
    destination: "/storage/backup/logs_diff",
    progress: 0,
    startTime: "2024-01-21 18:00:00",
    dataSize: 512,
    compressedSize: 256,
    compressionRatio: 50,
    schedule: "每6小时",
    retention: 3,
    nextRun: "2024-01-21 18:00:00",
  },
]

export function StorageManagement() {
  const [selectedTab, setSelectedTab] = useState("overview")
  const [storageNodes, setStorageNodes] = useState<StorageNode[]>(mockStorageNodes)
  const [storagePools, setStoragePools] = useState<StoragePool[]>(mockStoragePools)
  const [dataFiles, setDataFiles] = useState<DataFile[]>(mockDataFiles)
  const [backupJobs, setBackupJobs] = useState<BackupJob[]>(mockBackupJobs)
  const [selectedNode, setSelectedNode] = useState<StorageNode | null>(null)
  const [isCreatePoolOpen, setIsCreatePoolOpen] = useState(false)
  const { playSound } = useSound()

  // 模拟实时更新存储状态
  useEffect(() => {
    const interval = setInterval(() => {
      setStorageNodes((prevNodes) =>
        prevNodes.map((node) => ({
          ...node,
          temperature: node.temperature + (Math.random() - 0.5) * 2,
          usage: Math.max(0, Math.min(100, node.usage + (Math.random() - 0.5) * 5)),
        })),
      )

      setBackupJobs((prevJobs) =>
        prevJobs.map((job) => {
          if (job.status === "running" && job.progress < 100) {
            return { ...job, progress: Math.min(job.progress + Math.random() * 5, 100) }
          }
          return job
        }),
      )
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      online: { label: "在线", className: "bg-green-100 text-green-800" },
      offline: { label: "离线", className: "bg-red-100 text-red-800" },
      maintenance: { label: "维护中", className: "bg-yellow-100 text-yellow-800" },
      error: { label: "错误", className: "bg-red-100 text-red-800" },
      healthy: { label: "健康", className: "bg-green-100 text-green-800" },
      degraded: { label: "降级", className: "bg-yellow-100 text-yellow-800" },
      failed: { label: "失败", className: "bg-red-100 text-red-800" },
      rebuilding: { label: "重建中", className: "bg-blue-100 text-blue-800" },
      running: { label: "运行中", className: "bg-blue-100 text-blue-800" },
      completed: { label: "已完成", className: "bg-green-100 text-green-800" },
      scheduled: { label: "已计划", className: "bg-gray-100 text-gray-800" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.online
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
      case "healthy":
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "offline":
      case "failed":
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case "maintenance":
      case "degraded":
      case "rebuilding":
        return <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />
      case "running":
        return <Activity className="w-4 h-4 text-blue-600" />
      case "scheduled":
        return <Clock className="w-4 h-4 text-gray-600" />
      default:
        return <HardDrive className="w-4 h-4 text-gray-600" />
    }
  }

  const getStorageTypeIcon = (type: string) => {
    switch (type) {
      case "nvme":
        return <Zap className="w-5 h-5 text-purple-600" />
      case "ssd":
        return <HardDrive className="w-5 h-5 text-blue-600" />
      case "hdd":
        return <Database className="w-5 h-5 text-green-600" />
      case "cloud":
        return <Cloud className="w-5 h-5 text-orange-600" />
      case "network":
        return <Network className="w-5 h-5 text-red-600" />
      default:
        return <Server className="w-5 h-5 text-gray-600" />
    }
  }

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case "dataset":
        return <Database className="w-4 h-4 text-blue-600" />
      case "model":
        return <Cpu className="w-4 h-4 text-purple-600" />
      case "backup":
        return <Archive className="w-4 h-4 text-green-600" />
      case "log":
        return <File className="w-4 h-4 text-orange-600" />
      case "temp":
        return <Clock className="w-4 h-4 text-gray-600" />
      default:
        return <File className="w-4 h-4 text-gray-600" />
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleNodeAction = (nodeId: string, action: string) => {
    playSound("click")
    console.log(`Node ${nodeId} action: ${action}`)
  }

  const handleCreatePool = () => {
    playSound("success")
    setIsCreatePoolOpen(false)
    // 这里可以添加创建存储池的逻辑
  }

  // 计算总体存储统计
  const totalCapacity = storageNodes.reduce((acc, node) => acc + node.capacity, 0)
  const totalUsed = storageNodes.reduce((acc, node) => acc + node.used, 0)
  const totalAvailable = storageNodes.reduce((acc, node) => acc + node.available, 0)
  const averageUsage = Math.round(storageNodes.reduce((acc, node) => acc + node.usage, 0) / storageNodes.length)
  const averageHealth = Math.round(storageNodes.reduce((acc, node) => acc + node.health, 0) / storageNodes.length)

  return (
    <div className="space-y-6">
      {/* 存储概览 */}
      <AnimatedContainer animation="fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总容量</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-primary-600">
                  {formatBytes(totalCapacity * 1024 * 1024 * 1024)}
                </div>
                <HardDrive className="w-4 h-4 text-primary-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{formatBytes(totalUsed * 1024 * 1024 * 1024)} 已使用</p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">使用率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-blue-600">{averageUsage}%</div>
                <Gauge className="w-4 h-4 text-blue-500" />
              </div>
              <Progress value={averageUsage} className="mt-2 h-2" />
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">健康状态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-green-600">{averageHealth}%</div>
                <Activity className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {storageNodes.filter((n) => n.status === "online").length}/{storageNodes.length} 节点在线
              </p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">存储池</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-accent-600">{storagePools.length}</div>
                <Layers className="w-4 h-4 text-accent-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {storagePools.filter((p) => p.status === "healthy").length} 个健康
              </p>
            </CardContent>
          </EnhancedCard>
        </div>
      </AnimatedContainer>

      {/* 主要功能区域 */}
      <AnimatedContainer animation="slideUp" delay={200}>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">存储概览</TabsTrigger>
            <TabsTrigger value="nodes">存储节点</TabsTrigger>
            <TabsTrigger value="pools">存储池</TabsTrigger>
            <TabsTrigger value="files">文件管理</TabsTrigger>
            <TabsTrigger value="backup">备份管理</TabsTrigger>
          </TabsList>

          {/* 存储概览 */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              {/* 存储使用趋势 */}
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>存储使用趋势</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-32 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">存储使用趋势图</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">本月增长</span>
                        <div className="font-medium text-green-600">+15.2%</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">预计满载</span>
                        <div className="font-medium">8个月</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>

              {/* 性能监控 */}
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Monitor className="w-5 h-5" />
                    <span>性能监控</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>平均读取速度</span>
                        <span className="font-medium">1,082 MB/s</span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>平均写入速度</span>
                        <span className="font-medium">990 MB/s</span>
                      </div>
                      <Progress value={68} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>IOPS</span>
                        <span className="font-medium">134,037</span>
                      </div>
                      <Progress value={82} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </div>

            {/* 存储节点状态 */}
            <EnhancedCard variant="modern">
              <CardHeader>
                <CardTitle>存储节点状态</CardTitle>
                <CardDescription>所有存储节点的实时状态监控</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {storageNodes.map((node) => (
                    <div key={node.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStorageTypeIcon(node.type)}
                          <span className="font-medium text-sm">{node.name}</span>
                        </div>
                        {getStatusBadge(node.status)}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>使用率</span>
                          <span>{node.usage}%</span>
                        </div>
                        <Progress value={node.usage} className="h-1" />
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>健康: {node.health}%</div>
                          <div>温度: {node.temperature.toFixed(1)}°C</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>

          {/* 存储节点 */}
          <TabsContent value="nodes" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">存储节点管理</h3>
              <EnhancedButton variant="primary" soundType="click">
                <Plus className="w-4 h-4 mr-2" />
                添加节点
              </EnhancedButton>
            </div>

            <div className="space-y-4">
              {storageNodes.map((node, index) => (
                <AnimatedContainer key={node.id} animation="slideRight" delay={index * 100}>
                  <EnhancedCard variant="modern" className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-4">
                          {getStorageTypeIcon(node.type)}
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold text-lg">{node.name}</h3>
                              {getStatusBadge(node.status)}
                              <Badge variant="outline" className="capitalize">
                                {node.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{node.location}</p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span>挂载点: {node.mountPoint}</span>
                              <span>文件系统: {node.fileSystem}</span>
                              <span>最后检查: {node.lastCheck}</span>
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
                            <DropdownMenuLabel>节点操作</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleNodeAction(node.id, "monitor")}>
                              <Monitor className="w-4 h-4 mr-2" />
                              监控详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleNodeAction(node.id, "check")}>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              健康检查
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleNodeAction(node.id, "maintenance")}>
                              <Settings className="w-4 h-4 mr-2" />
                              维护模式
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleNodeAction(node.id, "remove")}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              移除节点
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* 存储容量 */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">
                            {formatBytes(node.capacity * 1024 * 1024 * 1024)}
                          </div>
                          <div className="text-xs text-muted-foreground">总容量</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">
                            {formatBytes(node.used * 1024 * 1024 * 1024)}
                          </div>
                          <div className="text-xs text-muted-foreground">已使用</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-gray-600">
                            {formatBytes(node.available * 1024 * 1024 * 1024)}
                          </div>
                          <div className="text-xs text-muted-foreground">可用</div>
                        </div>
                      </div>

                      {/* 使用率进度条 */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>存储使用率</span>
                          <span>{node.usage}%</span>
                        </div>
                        <Progress value={node.usage} className="h-3" />
                      </div>

                      {/* 性能指标 */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-2 bg-purple-50 rounded">
                          <div className="text-sm font-bold text-purple-600">{node.readSpeed}</div>
                          <div className="text-xs text-muted-foreground">读取 MB/s</div>
                        </div>
                        <div className="text-center p-2 bg-orange-50 rounded">
                          <div className="text-sm font-bold text-orange-600">{node.writeSpeed}</div>
                          <div className="text-xs text-muted-foreground">写入 MB/s</div>
                        </div>
                        <div className="text-center p-2 bg-red-50 rounded">
                          <div className="text-sm font-bold text-red-600">{node.iops.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">IOPS</div>
                        </div>
                        <div className="text-center p-2 bg-yellow-50 rounded">
                          <div className="text-sm font-bold text-yellow-600">{node.temperature.toFixed(1)}°C</div>
                          <div className="text-xs text-muted-foreground">温度</div>
                        </div>
                      </div>

                      {/* 健康状态 */}
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-800">健康状态</span>
                        </div>
                        <div className="text-green-600 font-bold">{node.health}%</div>
                      </div>
                    </CardContent>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 存储池 */}
          <TabsContent value="pools" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">存储池管理</h3>
              <Dialog open={isCreatePoolOpen} onOpenChange={setIsCreatePoolOpen}>
                <DialogTrigger asChild>
                  <EnhancedButton variant="primary" soundType="click">
                    <Plus className="w-4 h-4 mr-2" />
                    创建存储池
                  </EnhancedButton>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>创建存储池</DialogTitle>
                    <DialogDescription>配置新的存储池参数和RAID级别</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pool-name">存储池名称</Label>
                        <Input id="pool-name" placeholder="输入存储池名称" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="raid-type">RAID类型</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="选择RAID类型" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">单盘 (无冗余)</SelectItem>
                            <SelectItem value="raid0">RAID 0 (条带化)</SelectItem>
                            <SelectItem value="raid1">RAID 1 (镜像)</SelectItem>
                            <SelectItem value="raid5">RAID 5 (分布式奇偶校验)</SelectItem>
                            <SelectItem value="raid10">RAID 10 (镜像+条带)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">描述</Label>
                      <Textarea id="description" placeholder="描述存储池的用途和特点" />
                    </div>
                    <div className="space-y-2">
                      <Label>选择存储节点</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {storageNodes.map((node) => (
                          <div key={node.id} className="flex items-center space-x-2">
                            <input type="checkbox" id={`node-${node.id}`} className="rounded" />
                            <label htmlFor={`node-${node.id}`} className="text-sm">
                              {node.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreatePoolOpen(false)}>
                      取消
                    </Button>
                    <EnhancedButton variant="primary" onClick={handleCreatePool} soundType="success">
                      创建存储池
                    </EnhancedButton>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {storagePools.map((pool, index) => (
                <AnimatedContainer key={pool.id} animation="slideUp" delay={index * 100}>
                  <EnhancedCard variant="modern" className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-3">
                          <Layers className="w-5 h-5 text-blue-600" />
                          <div>
                            <h4 className="font-medium">{pool.name}</h4>
                            <p className="text-sm text-muted-foreground uppercase">{pool.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(pool.status)}
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4">{pool.description}</p>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>使用率</span>
                          <span className="font-medium">
                            {Math.round((pool.usedCapacity / pool.totalCapacity) * 100)}%
                          </span>
                        </div>
                        <Progress value={(pool.usedCapacity / pool.totalCapacity) * 100} className="h-2" />

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">总容量</span>
                            <div className="font-medium">{formatBytes(pool.totalCapacity * 1024 * 1024 * 1024)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">已使用</span>
                            <div className="font-medium">{formatBytes(pool.usedCapacity * 1024 * 1024 * 1024)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">冗余度</span>
                            <div className="font-medium">{pool.redundancy}%</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">性能</span>
                            <div className="font-medium">{pool.performance}%</div>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          <div>节点数: {pool.nodes.length}</div>
                          <div>创建时间: {pool.createdAt}</div>
                        </div>

                        <div className="flex space-x-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                            <Monitor className="w-4 h-4 mr-1" />
                            监控
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                            <Settings className="w-4 h-4 mr-1" />
                            配置
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 文件管理 */}
          <TabsContent value="files" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">文件管理</h3>
              <div className="flex space-x-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input placeholder="搜索文件..." className="pl-8 w-64" />
                </div>
                <EnhancedButton variant="primary" soundType="click">
                  <Upload className="w-4 h-4 mr-2" />
                  上传文件
                </EnhancedButton>
              </div>
            </div>

            <EnhancedCard variant="modern">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>文件名</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>大小</TableHead>
                      <TableHead>所有者</TableHead>
                      <TableHead>修改时间</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataFiles.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getFileTypeIcon(file.type)}
                            <div>
                              <div className="font-medium">{file.name}</div>
                              <div className="text-xs text-muted-foreground">{file.path}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {file.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatBytes(file.size * 1024 * 1024)}</TableCell>
                        <TableCell>{file.owner}</TableCell>
                        <TableCell>{file.lastModified}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {file.encrypted && <Lock className="w-3 h-3 text-green-600" />}
                            {file.compressed && <Archive className="w-3 h-3 text-blue-600" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Settings className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                查看详情
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="w-4 h-4 mr-2" />
                                下载
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="w-4 h-4 mr-2" />
                                复制
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Move className="w-4 h-4 mr-2" />
                                移动
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </EnhancedCard>
          </TabsContent>

          {/* 备份管理 */}
          <TabsContent value="backup" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">备份管理</h3>
              <EnhancedButton variant="primary" soundType="click">
                <Plus className="w-4 h-4 mr-2" />
                创建备份任务
              </EnhancedButton>
            </div>

            <div className="space-y-4">
              {backupJobs.map((job, index) => (
                <AnimatedContainer key={job.id} animation="slideLeft" delay={index * 100}>
                  <EnhancedCard variant="modern">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-3">
                          <Archive className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium">{job.name}</h4>
                            <p className="text-sm text-muted-foreground capitalize">{job.type} 备份</p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                              <span>源: {job.source}</span>
                              <span>目标: {job.destination}</span>
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
                      {job.status === "running" && (
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span>备份进度</span>
                            <span>{job.progress}%</span>
                          </div>
                          <Progress value={job.progress} className="h-2" />
                        </div>
                      )}

                      {/* 备份统计 */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">
                            {formatBytes(job.dataSize * 1024 * 1024)}
                          </div>
                          <div className="text-xs text-muted-foreground">原始大小</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">
                            {formatBytes(job.compressedSize * 1024 * 1024)}
                          </div>
                          <div className="text-xs text-muted-foreground">压缩后</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-lg font-bold text-purple-600">{job.compressionRatio}%</div>
                          <div className="text-xs text-muted-foreground">压缩率</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-lg font-bold text-orange-600">{job.retention}</div>
                          <div className="text-xs text-muted-foreground">保留天数</div>
                        </div>
                      </div>

                      {/* 时间信息 */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">开始时间</span>
                          <div className="font-medium">{job.startTime}</div>
                        </div>
                        {job.endTime && (
                          <div>
                            <span className="text-muted-foreground">结束时间</span>
                            <div className="font-medium">{job.endTime}</div>
                          </div>
                        )}
                        {job.duration && (
                          <div>
                            <span className="text-muted-foreground">耗时</span>
                            <div className="font-medium">{job.duration}</div>
                          </div>
                        )}
                      </div>

                      {/* 调度信息 */}
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">调度规则</span>
                            <div className="font-medium">{job.schedule}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">下次运行</span>
                            <div className="font-medium">{job.nextRun}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </AnimatedContainer>
    </div>
  )
}
