"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Database,
  Server,
  Activity,
  BarChart3,
  Users,
  FileText,
  Cloud,
  Shield,
  Zap,
  HardDrive,
  Cpu,
  Network,
  Monitor,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Upload,
  Settings,
  Eye,
  TrendingUp,
  Clock,
} from "lucide-react"

interface DataSource {
  id: string
  name: string
  type: string
  status: "connected" | "disconnected" | "syncing" | "error"
  records: number
  lastSync: string
  size: string
}

interface SystemMetric {
  name: string
  value: number
  unit: string
  status: "normal" | "warning" | "critical"
  trend: "up" | "down" | "stable"
}

const mockDataSources: DataSource[] = [
  {
    id: "1",
    name: "用户数据库",
    type: "MySQL",
    status: "connected",
    records: 125430,
    lastSync: "2024-01-20 15:30",
    size: "2.3 GB",
  },
  {
    id: "2",
    name: "业务数据仓库",
    type: "PostgreSQL",
    status: "syncing",
    records: 856920,
    lastSync: "2024-01-20 15:25",
    size: "15.7 GB",
  },
  {
    id: "3",
    name: "日志数据",
    type: "MongoDB",
    status: "connected",
    records: 2456780,
    lastSync: "2024-01-20 15:32",
    size: "8.9 GB",
  },
  {
    id: "4",
    name: "外部API数据",
    type: "REST API",
    status: "error",
    records: 45230,
    lastSync: "2024-01-20 14:15",
    size: "156 MB",
  },
]

const mockMetrics: SystemMetric[] = [
  { name: "CPU使用率", value: 68, unit: "%", status: "normal", trend: "stable" },
  { name: "内存使用率", value: 74, unit: "%", status: "normal", trend: "up" },
  { name: "磁盘使用率", value: 45, unit: "%", status: "normal", trend: "up" },
  { name: "网络吞吐量", value: 125, unit: "MB/s", status: "normal", trend: "stable" },
  { name: "数据库连接数", value: 89, unit: "个", status: "warning", trend: "up" },
  { name: "API响应时间", value: 245, unit: "ms", status: "normal", trend: "down" },
]

export function DynamicDataCenter() {
  const [dataSources, setDataSources] = useState<DataSource[]>(mockDataSources)
  const [metrics, setMetrics] = useState<SystemMetric[]>(mockMetrics)

  const getStatusBadge = (status: DataSource["status"]) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-100 text-green-800">已连接</Badge>
      case "disconnected":
        return <Badge variant="secondary">已断开</Badge>
      case "syncing":
        return <Badge className="bg-blue-100 text-blue-800">同步中</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800">错误</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getStatusIcon = (status: DataSource["status"]) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "disconnected":
        return <AlertTriangle className="w-4 h-4 text-gray-600" />
      case "syncing":
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Eye className="w-4 h-4 text-gray-600" />
    }
  }

  const getMetricStatusColor = (status: SystemMetric["status"]) => {
    switch (status) {
      case "normal":
        return "text-green-600"
      case "warning":
        return "text-yellow-600"
      case "critical":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getTrendIcon = (trend: SystemMetric["trend"]) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-3 h-3 text-red-500" />
      case "down":
        return <TrendingUp className="w-3 h-3 text-green-500 rotate-180" />
      case "stable":
        return <div className="w-3 h-0.5 bg-gray-400" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* 数据中心概览 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">数据源总数</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataSources.length}</div>
            <p className="text-xs text-muted-foreground">
              {dataSources.filter((ds) => ds.status === "connected").length} 个已连接
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总记录数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(dataSources.reduce((acc, ds) => acc + ds.records, 0) / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground">+12.5% 较上月</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">存储使用量</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">27.1 GB</div>
            <p className="text-xs text-muted-foreground">68% 存储空间</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">系统状态</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">正常</div>
            <p className="text-xs text-muted-foreground">99.9% 可用性</p>
          </CardContent>
        </Card>
      </div>

      {/* 数据中心功能选项卡 */}
      <Tabs defaultValue="sources" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sources">数据源</TabsTrigger>
          <TabsTrigger value="monitoring">系统监控</TabsTrigger>
          <TabsTrigger value="analytics">数据分析</TabsTrigger>
          <TabsTrigger value="backup">备份管理</TabsTrigger>
        </TabsList>

        {/* 数据源管理 */}
        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                数据源管理
              </CardTitle>
              <CardDescription>管理和监控所有数据源的连接状态</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dataSources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(source.status)}
                      <div>
                        <h3 className="font-medium">{source.name}</h3>
                        <p className="text-sm text-muted-foreground">{source.type}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-muted-foreground">
                            记录数: {source.records.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">大小: {source.size}</span>
                          <span className="text-xs text-muted-foreground">最后同步: {source.lastSync}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(source.status)}
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-1" />
                        配置
                      </Button>
                      <Button size="sm">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        同步
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 系统监控 */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Monitor className="w-5 h-5 mr-2" />
                  系统性能指标
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.map((metric, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{metric.name}</span>
                        <div className="flex items-center space-x-2">
                          {getTrendIcon(metric.trend)}
                          <span className={`text-sm font-medium ${getMetricStatusColor(metric.status)}`}>
                            {metric.value}
                            {metric.unit}
                          </span>
                        </div>
                      </div>
                      <Progress value={metric.value} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="w-5 h-5 mr-2" />
                  服务器状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Cpu className="w-4 h-4" />
                      <span>主服务器</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">在线</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4" />
                      <span>数据库服务器</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">在线</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Cloud className="w-4 h-4" />
                      <span>缓存服务器</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">在线</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Network className="w-4 h-4" />
                      <span>负载均衡器</span>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">警告</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                实时活动监控
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { time: "15:32", event: "用户数据库同步完成", type: "success" },
                  { time: "15:30", event: "新用户注册: user@example.com", type: "info" },
                  { time: "15:28", event: "API调用异常: 外部数据源连接失败", type: "error" },
                  { time: "15:25", event: "数据备份任务开始", type: "info" },
                  { time: "15:20", event: "系统性能检查完成", type: "success" },
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
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {activity.type === "success" ? "成功" : activity.type === "error" ? "错误" : "信息"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 数据分析 */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  数据增长趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>日增长量</span>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-600">+12.5K</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>周增长量</span>
                    <span className="font-medium">+89.2K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>月增长量</span>
                    <span className="font-medium">+356.7K</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  用户活动分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>活跃用户</span>
                    <span className="font-medium">8,924</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>新增用户</span>
                    <span className="font-medium text-green-600">+234</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>用户留存率</span>
                    <span className="font-medium">87.5%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  系统性能分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>平均响应时间</span>
                    <span className="font-medium">245ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>系统可用性</span>
                    <span className="font-medium text-green-600">99.9%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>错误率</span>
                    <span className="font-medium">0.1%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 备份管理 */}
        <TabsContent value="backup" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  备份策略
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>自动备份</span>
                  <Badge variant="secondary">已启用</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>备份频率</span>
                  <span className="font-medium">每日 02:00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>保留期限</span>
                  <span className="font-medium">30天</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>备份位置</span>
                  <span className="font-medium">云存储</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HardDrive className="w-5 h-5 mr-2" />
                  备份操作
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  立即备份
                </Button>
                <Button className="w-full bg-transparent" variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  恢复数据
                </Button>
                <Button className="w-full bg-transparent" variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  查看备份历史
                </Button>
                <Button className="w-full bg-transparent" variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  备份设置
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>最近备份记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { date: "2024-01-20 02:00", size: "2.3 GB", status: "成功", type: "自动" },
                  { date: "2024-01-19 02:00", size: "2.2 GB", status: "成功", type: "自动" },
                  { date: "2024-01-18 14:30", size: "2.1 GB", status: "成功", type: "手动" },
                  { date: "2024-01-18 02:00", size: "2.1 GB", status: "失败", type: "自动" },
                  { date: "2024-01-17 02:00", size: "2.0 GB", status: "成功", type: "自动" },
                ].map((backup, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="font-medium">{backup.date}</div>
                        <div className="text-sm text-muted-foreground">
                          大小: {backup.size} | 类型: {backup.type}
                        </div>
                      </div>
                    </div>
                    <Badge variant={backup.status === "成功" ? "default" : "destructive"}>{backup.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
