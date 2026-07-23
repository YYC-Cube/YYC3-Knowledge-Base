"use client"

import { useState, useEffect } from "react"
import { Activity, Server, Users, Zap, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnimatedContainer } from "../design-system/animation-system"
import { EnhancedCard } from "../design-system/enhanced-card-system"

export function RealTimeMonitoring() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const systemMetrics = [
    {
      title: "CPU使用率",
      value: 68,
      status: "normal",
      icon: Server,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      threshold: 80,
    },
    {
      title: "内存使用率",
      value: 45,
      status: "normal",
      icon: Activity,
      color: "text-green-600",
      bgColor: "bg-green-50",
      threshold: 85,
    },
    {
      title: "在线用户",
      value: 1247,
      status: "high",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      unit: "人",
    },
    {
      title: "响应时间",
      value: 156,
      status: "normal",
      icon: Zap,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      unit: "ms",
      threshold: 500,
    },
  ]

  const serverStatus = [
    { name: "Web服务器-01", status: "online", cpu: 45, memory: 62, uptime: "15天" },
    { name: "Web服务器-02", status: "online", cpu: 38, memory: 58, uptime: "15天" },
    { name: "数据库服务器", status: "online", cpu: 72, memory: 68, uptime: "30天" },
    { name: "缓存服务器", status: "warning", cpu: 85, memory: 45, uptime: "7天" },
    { name: "文件服务器", status: "offline", cpu: 0, memory: 0, uptime: "0天" },
  ]

  const recentAlerts = [
    {
      id: 1,
      type: "warning",
      message: "缓存服务器CPU使用率过高",
      time: "2分钟前",
      severity: "中等",
    },
    {
      id: 2,
      type: "error",
      message: "文件服务器连接失败",
      time: "5分钟前",
      severity: "严重",
    },
    {
      id: 3,
      type: "info",
      message: "数据库备份完成",
      time: "10分钟前",
      severity: "信息",
    },
    {
      id: 4,
      type: "warning",
      message: "磁盘空间使用率达到75%",
      time: "15分钟前",
      severity: "中等",
    },
  ]

  const networkTraffic = [
    { time: "00:00", inbound: 45, outbound: 32 },
    { time: "04:00", inbound: 23, outbound: 18 },
    { time: "08:00", inbound: 78, outbound: 65 },
    { time: "12:00", inbound: 92, outbound: 87 },
    { time: "16:00", inbound: 156, outbound: 134 },
    { time: "20:00", inbound: 134, outbound: 112 },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "text-green-600 bg-green-100"
      case "warning":
        return "text-yellow-600 bg-yellow-100"
      case "offline":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return CheckCircle
      case "warning":
        return AlertTriangle
      case "offline":
        return XCircle
      default:
        return Clock
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case "error":
        return "text-red-600 bg-red-50 border-red-200"
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "info":
        return "text-blue-600 bg-blue-50 border-blue-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">实时监控</h2>
          <p className="text-secondary-600">系统性能实时监控，确保服务稳定运行</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-secondary-600">
          <Clock className="h-4 w-4" />
          <span>最后更新: {currentTime.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* 系统指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemMetrics.map((metric, index) => (
          <AnimatedContainer key={metric.title} animation="slideUp" delay={index * 100}>
            <EnhancedCard variant="modern" glowEffect>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-secondary-600">{metric.title}</CardTitle>
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-secondary-900">
                  {typeof metric.value === "number" && metric.unit ? `${metric.value}${metric.unit}` : metric.value}
                  {metric.threshold && typeof metric.value === "number" && !metric.unit && "%"}
                </div>
                {metric.threshold && typeof metric.value === "number" && (
                  <div className="mt-2">
                    <Progress
                      value={metric.value}
                      className="h-2"
                      // @ts-ignore
                      indicatorClassName={metric.value > metric.threshold ? "bg-red-500" : "bg-green-500"}
                    />
                    <div className="flex justify-between text-xs text-secondary-500 mt-1">
                      <span>0</span>
                      <span>{metric.threshold}</span>
                    </div>
                  </div>
                )}
                <Badge
                  variant="outline"
                  className={`mt-2 ${
                    metric.status === "normal"
                      ? "text-green-600"
                      : metric.status === "warning"
                        ? "text-yellow-600"
                        : "text-red-600"
                  }`}
                >
                  {metric.status === "normal" ? "正常" : metric.status === "warning" ? "警告" : "异常"}
                </Badge>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>
        ))}
      </div>

      {/* 详细监控 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 服务器状态 */}
        <AnimatedContainer animation="slideLeft" delay={200}>
          <EnhancedCard variant="traditional" size="lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Server className="h-5 w-5 text-primary-600" />
                <span>服务器状态</span>
              </CardTitle>
              <CardDescription>各服务器实时运行状态监控</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {serverStatus.map((server, index) => {
                  const StatusIcon = getStatusIcon(server.status)
                  return (
                    <div key={server.name} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <StatusIcon className="h-5 w-5 text-current" />
                          <span className="font-medium">{server.name}</span>
                        </div>
                        <Badge className={getStatusColor(server.status)}>
                          {server.status === "online" ? "在线" : server.status === "warning" ? "警告" : "离线"}
                        </Badge>
                      </div>
                      {server.status !== "offline" && (
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-secondary-600">CPU</div>
                            <div className="font-medium">{server.cpu}%</div>
                          </div>
                          <div>
                            <div className="text-secondary-600">内存</div>
                            <div className="font-medium">{server.memory}%</div>
                          </div>
                          <div>
                            <div className="text-secondary-600">运行时间</div>
                            <div className="font-medium">{server.uptime}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        {/* 实时告警 */}
        <AnimatedContainer animation="slideRight" delay={300}>
          <EnhancedCard variant="traditional" size="lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-accent-600" />
                <span>实时告警</span>
              </CardTitle>
              <CardDescription>系统异常和警告信息</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className={`p-3 border rounded-lg ${getAlertColor(alert.type)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{alert.message}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {alert.severity}
                          </Badge>
                          <span className="text-xs text-secondary-500">{alert.time}</span>
                        </div>
                      </div>
                      <div className="ml-2">
                        {alert.type === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                        {alert.type === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                        {alert.type === "info" && <CheckCircle className="h-4 w-4 text-blue-500" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t text-center">
                <button className="text-sm text-primary-600 hover:text-primary-700">查看全部告警</button>
              </div>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>
      </div>

      {/* 网络流量监控 */}
      <AnimatedContainer animation="fadeIn" delay={400}>
        <EnhancedCard variant="modern" size="lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-traditional-azure" />
              <span>网络流量监控</span>
            </CardTitle>
            <CardDescription>实时网络流量和带宽使用情况</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="traffic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="traffic">流量统计</TabsTrigger>
                <TabsTrigger value="bandwidth">带宽使用</TabsTrigger>
                <TabsTrigger value="connections">连接状态</TabsTrigger>
              </TabsList>
              <TabsContent value="traffic" className="mt-4">
                <div className="space-y-4">
                  {networkTraffic.map((data, index) => (
                    <div key={data.time} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                      <div className="font-medium">{data.time}</div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm">入站: {data.inbound} MB/s</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm">出站: {data.outbound} MB/s</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="bandwidth" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center p-6 bg-secondary-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">156 MB/s</div>
                    <div className="text-sm text-secondary-600">当前入站带宽</div>
                  </div>
                  <div className="text-center p-6 bg-secondary-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">134 MB/s</div>
                    <div className="text-sm text-secondary-600">当前出站带宽</div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="connections" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-secondary-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">1,247</div>
                    <div className="text-sm text-secondary-600">活跃连接</div>
                  </div>
                  <div className="text-center p-4 bg-secondary-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">23</div>
                    <div className="text-sm text-secondary-600">等待连接</div>
                  </div>
                  <div className="text-center p-4 bg-secondary-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">5</div>
                    <div className="text-sm text-secondary-600">失败连接</div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </EnhancedCard>
      </AnimatedContainer>
    </div>
  )
}
