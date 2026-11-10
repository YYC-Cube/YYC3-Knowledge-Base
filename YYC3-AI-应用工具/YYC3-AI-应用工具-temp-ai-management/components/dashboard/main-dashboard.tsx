"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KpiCard } from "@/components/common/kpi-card"
import {
  Users,
  Ticket,
  FileText,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowUpRight,
  Calendar,
  Target,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface DashboardStats {
  totalUsers: number
  totalTickets: number
  totalContracts: number
  totalRevenue: number
  activeTickets: number
  pendingApprovals: number
  reconciliationIssues: number
  userGrowth: number
  ticketGrowth: number
  contractGrowth: number
  revenueGrowth: number
}

interface Alert {
  id: string
  type: "warning" | "error" | "info"
  title: string
  message: string
  time: string
  link?: string
}

interface TrendData {
  date: string
  tickets: number
  contracts: number
  revenue: number
}

export function MainDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 12847,
    totalTickets: 3247,
    totalContracts: 1567,
    totalRevenue: 2847392,
    activeTickets: 156,
    pendingApprovals: 23,
    reconciliationIssues: 8,
    userGrowth: 12.5,
    ticketGrowth: 8.3,
    contractGrowth: 15.7,
    revenueGrowth: 23.4,
  })

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: "alert-1",
      type: "error",
      title: "对账异常",
      message: "发现8笔交易对账异常，需要人工处理",
      time: "5分钟前",
      link: "/reconciliation",
    },
    {
      id: "alert-2",
      type: "warning",
      title: "合同即将到期",
      message: "3份重要合同将在本周到期，请及时续签",
      time: "1小时前",
      link: "/contracts",
    },
    {
      id: "alert-3",
      type: "info",
      title: "工单积压提醒",
      message: "技术支持类工单积压较多，当前23个待处理",
      time: "2小时前",
      link: "/tickets",
    },
    {
      id: "alert-4",
      type: "warning",
      title: "审批超时",
      message: "5份合同审批已超时，请尽快处理",
      time: "3小时前",
      link: "/approvals",
    },
  ])

  const [trendData, setTrendData] = useState<TrendData[]>([
    { date: "2024-01-01", tickets: 245, contracts: 89, revenue: 234000 },
    { date: "2024-01-02", tickets: 267, contracts: 92, revenue: 245000 },
    { date: "2024-01-03", tickets: 289, contracts: 95, revenue: 256000 },
    { date: "2024-01-04", tickets: 234, contracts: 88, revenue: 238000 },
    { date: "2024-01-05", tickets: 312, contracts: 103, revenue: 278000 },
    { date: "2024-01-06", tickets: 298, contracts: 98, revenue: 267000 },
    { date: "2024-01-07", tickets: 276, contracts: 94, revenue: 259000 },
  ])

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 模拟数据加载
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const getAlertColor = (type: string) => {
    switch (type) {
      case "error":
        return "border-red-200 bg-red-50"
      case "warning":
        return "border-yellow-200 bg-yellow-50"
      case "info":
        return "border-blue-200 bg-blue-50"
      default:
        return "border-gray-200 bg-gray-50"
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case "warning":
        return <Clock className="w-5 h-5 text-yellow-600" />
      case "info":
        return <CheckCircle className="w-5 h-5 text-blue-600" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">仪表盘</h1>
          <p className="text-muted-foreground mt-1">欢迎回来！这是您的系统概览</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            选择日期范围
          </Button>
          <Button>
            <Target className="w-4 h-4 mr-2" />
            查看报告
          </Button>
        </div>
      </div>

      {/* KPI 卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="总用户数"
          value={stats.totalUsers.toLocaleString()}
          change={stats.userGrowth}
          trend="up"
          icon={Users}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-50"
          loading={isLoading}
          description="活跃用户占比 78%"
        />
        <KpiCard
          title="工单总数"
          value={stats.totalTickets.toLocaleString()}
          change={stats.ticketGrowth}
          trend="up"
          icon={Ticket}
          iconColor="text-green-600"
          iconBgColor="bg-green-50"
          loading={isLoading}
          description={`${stats.activeTickets} 个待处理`}
        />
        <KpiCard
          title="合同总数"
          value={stats.totalContracts.toLocaleString()}
          change={stats.contractGrowth}
          trend="up"
          icon={FileText}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-50"
          loading={isLoading}
          description={`${stats.pendingApprovals} 个待审批`}
        />
        <KpiCard
          title="总收入"
          value={`¥${(stats.totalRevenue / 10000).toFixed(1)}万`}
          change={stats.revenueGrowth}
          trend="up"
          icon={DollarSign}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-50"
          loading={isLoading}
          description="本月增长显著"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 趋势图表 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>业务趋势</span>
                <Tabs defaultValue="tickets" className="w-auto">
                  <TabsList>
                    <TabsTrigger value="tickets">工单</TabsTrigger>
                    <TabsTrigger value="contracts">合同</TabsTrigger>
                    <TabsTrigger value="revenue">收入</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardTitle>
              <CardDescription>过去7天的业务数据趋势</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trendData.map((data, index) => {
                  const maxValue = Math.max(...trendData.map((d) => d.tickets))
                  const percentage = (data.tickets / maxValue) * 100
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2 text-sm">
                        <span className="text-muted-foreground">
                          {new Date(data.date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                        </span>
                        <span className="font-medium">{data.tickets} 个工单</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  )
                })}
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {trendData.reduce((sum, d) => sum + d.tickets, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">总工单数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(trendData.reduce((sum, d) => sum + d.tickets, 0) / trendData.length)}
                  </div>
                  <div className="text-sm text-muted-foreground">日均工单</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {trendData.reduce((sum, d) => sum + d.contracts, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">总合同数</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 快速操作 */}
          <Card>
            <CardHeader>
              <CardTitle>快速操作</CardTitle>
              <CardDescription>常用功能快速入口</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-24 flex-col bg-transparent">
                  <Ticket className="w-6 h-6 mb-2" />
                  <span>创建工单</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col bg-transparent">
                  <FileText className="w-6 h-6 mb-2" />
                  <span>新建合同</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col bg-transparent">
                  <DollarSign className="w-6 h-6 mb-2" />
                  <span>财务对账</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col bg-transparent">
                  <Users className="w-6 h-6 mb-2" />
                  <span>用户管理</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 告警一览 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>系统告警</span>
                <Badge variant="destructive">{alerts.length}</Badge>
              </CardTitle>
              <CardDescription>需要关注的重要事项</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${getAlertColor(alert.type)} cursor-pointer hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium">{alert.title}</h4>
                          <span className="text-xs text-muted-foreground">{alert.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{alert.message}</p>
                        {alert.link && (
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            查看详情
                            <ArrowUpRight className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 待办事项 */}
          <Card>
            <CardHeader>
              <CardTitle>待办事项</CardTitle>
              <CardDescription>需要您处理的任务</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <div>
                      <div className="text-sm font-medium">处理紧急工单</div>
                      <div className="text-xs text-muted-foreground">5个高优先级工单</div>
                    </div>
                  </div>
                  <Badge variant="destructive">紧急</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <div>
                      <div className="text-sm font-medium">审批合同</div>
                      <div className="text-xs text-muted-foreground">23份合同待审批</div>
                    </div>
                  </div>
                  <Badge variant="outline">重要</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div>
                      <div className="text-sm font-medium">核对财务数据</div>
                      <div className="text-xs text-muted-foreground">8笔异常交易</div>
                    </div>
                  </div>
                  <Badge variant="secondary">普通</Badge>
                </div>

                <Button variant="outline" className="w-full bg-transparent" size="sm">
                  查看全部待办
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
