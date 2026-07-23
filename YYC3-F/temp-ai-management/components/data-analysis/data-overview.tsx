"use client"

import { useState } from "react"
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ShoppingCart,
  Eye,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnimatedContainer } from "../design-system/animation-system"
import { EnhancedCard } from "../design-system/enhanced-card-system"

export function DataOverview() {
  const [timeRange, setTimeRange] = useState("7d")

  const metrics = [
    {
      title: "总用户数",
      value: "12,847",
      change: "+12.5%",
      trend: "up",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "总收入",
      value: "¥2,847,392",
      change: "+8.2%",
      trend: "up",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "订单数量",
      value: "3,247",
      change: "-2.1%",
      trend: "down",
      icon: ShoppingCart,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "页面浏览量",
      value: "847,392",
      change: "+15.3%",
      trend: "up",
      icon: Eye,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ]

  const chartData = [
    { name: "1月", value: 4000, orders: 240 },
    { name: "2月", value: 3000, orders: 139 },
    { name: "3月", value: 2000, orders: 980 },
    { name: "4月", value: 2780, orders: 390 },
    { name: "5月", value: 1890, orders: 480 },
    { name: "6月", value: 2390, orders: 380 },
  ]

  return (
    <div className="space-y-6">
      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <AnimatedContainer key={metric.title} animation="slideUp" delay={index * 100}>
            <EnhancedCard variant="modern" glowEffect>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-secondary-600">{metric.title}</CardTitle>
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-secondary-900">{metric.value}</div>
                <div className="flex items-center space-x-1 text-xs">
                  {metric.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={metric.trend === "up" ? "text-green-600" : "text-red-600"}>{metric.change}</span>
                  <span className="text-secondary-500">vs 上周</span>
                </div>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>
        ))}
      </div>

      {/* 详细分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 收入趋势 */}
        <AnimatedContainer animation="slideLeft" delay={200}>
          <EnhancedCard variant="traditional" size="lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-primary-600" />
                <span>收入趋势</span>
              </CardTitle>
              <CardDescription>过去6个月的收入变化趋势</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {chartData.map((item, index) => (
                  <div key={item.name} className="flex items-center space-x-4">
                    <div className="w-8 text-sm text-secondary-600">{item.name}</div>
                    <div className="flex-1">
                      <Progress value={(item.value / 4000) * 100} className="h-2" />
                    </div>
                    <div className="w-20 text-sm font-medium text-right">¥{item.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        {/* 用户活跃度 */}
        <AnimatedContainer animation="slideRight" delay={300}>
          <EnhancedCard variant="traditional" size="lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-accent-600" />
                <span>用户活跃度</span>
              </CardTitle>
              <CardDescription>用户行为分析和活跃度统计</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary-600">日活跃用户</span>
                  <Badge variant="secondary">8,247</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary-600">周活跃用户</span>
                  <Badge variant="secondary">24,891</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary-600">月活跃用户</span>
                  <Badge variant="secondary">89,247</Badge>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-secondary-600">用户留存率</span>
                    <span className="text-sm font-medium">78.5%</span>
                  </div>
                  <Progress value={78.5} className="h-2" />
                </div>
              </div>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>
      </div>

      {/* 时间范围选择器 */}
      <AnimatedContainer animation="fadeIn" delay={400}>
        <EnhancedCard variant="modern">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5 text-traditional-azure" />
              <span>数据分析周期</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={timeRange} onValueChange={setTimeRange}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="7d">7天</TabsTrigger>
                <TabsTrigger value="30d">30天</TabsTrigger>
                <TabsTrigger value="90d">90天</TabsTrigger>
                <TabsTrigger value="1y">1年</TabsTrigger>
              </TabsList>
              <TabsContent value={timeRange} className="mt-4">
                <div className="text-center py-8">
                  <div className="text-lg font-medium text-secondary-900">
                    {timeRange === "7d" && "过去7天数据分析"}
                    {timeRange === "30d" && "过去30天数据分析"}
                    {timeRange === "90d" && "过去90天数据分析"}
                    {timeRange === "1y" && "过去1年数据分析"}
                  </div>
                  <div className="text-sm text-secondary-600 mt-2">数据更新时间：{new Date().toLocaleString()}</div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </EnhancedCard>
      </AnimatedContainer>
    </div>
  )
}
