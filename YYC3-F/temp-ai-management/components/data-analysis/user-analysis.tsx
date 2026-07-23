"use client"

import { useState } from "react"
import { Users, TrendingUp, Clock, MapPin, Smartphone, Monitor, UserCheck, UserX } from "lucide-react"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AnimatedContainer } from "../design-system/animation-system"
import { EnhancedCard } from "../design-system/enhanced-card-system"

export function UserAnalysis() {
  const [selectedPeriod, setSelectedPeriod] = useState("30d")
  const [selectedSegment, setSelectedSegment] = useState("all")

  const userStats = [
    {
      title: "新增用户",
      value: "1,247",
      change: "+18.2%",
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "活跃用户",
      value: "8,934",
      change: "+12.5%",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "流失用户",
      value: "234",
      change: "-5.3%",
      icon: UserX,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "平均会话时长",
      value: "24分钟",
      change: "+8.7%",
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ]

  const deviceData = [
    { name: "移动端", value: 68, icon: Smartphone, color: "bg-blue-500" },
    { name: "桌面端", value: 28, icon: Monitor, color: "bg-green-500" },
    { name: "平板端", value: 4, icon: Smartphone, color: "bg-orange-500" },
  ]

  const regionData = [
    { name: "北京", users: 2847, percentage: 32 },
    { name: "上海", users: 2134, percentage: 24 },
    { name: "广州", users: 1567, percentage: 18 },
    { name: "深圳", users: 1234, percentage: 14 },
    { name: "其他", users: 1065, percentage: 12 },
  ]

  const behaviorData = [
    { action: "页面浏览", count: 45672, trend: "+12%" },
    { action: "搜索查询", count: 12847, trend: "+8%" },
    { action: "下载文件", count: 3456, trend: "+15%" },
    { action: "分享内容", count: 2134, trend: "+22%" },
    { action: "评论互动", count: 1567, trend: "+18%" },
  ]

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">用户行为分析</h2>
          <p className="text-secondary-600">深度分析用户行为模式和偏好趋势</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7天</SelectItem>
              <SelectItem value="30d">30天</SelectItem>
              <SelectItem value="90d">90天</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedSegment} onValueChange={setSelectedSegment}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部用户</SelectItem>
              <SelectItem value="new">新用户</SelectItem>
              <SelectItem value="active">活跃用户</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 用户统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {userStats.map((stat, index) => (
          <AnimatedContainer key={stat.title} animation="slideUp" delay={index * 100}>
            <EnhancedCard variant="modern" glowEffect>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-secondary-600">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-secondary-900">{stat.value}</div>
                <div className="flex items-center space-x-1 text-xs">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-600">{stat.change}</span>
                  <span className="text-secondary-500">vs 上期</span>
                </div>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>
        ))}
      </div>

      {/* 详细分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 设备分布 */}
        <AnimatedContainer animation="slideLeft" delay={200}>
          <EnhancedCard variant="traditional" size="lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Smartphone className="h-5 w-5 text-primary-600" />
                <span>设备分布</span>
              </CardTitle>
              <CardDescription>用户访问设备类型统计</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deviceData.map((device, index) => (
                  <div key={device.name} className="flex items-center space-x-4">
                    <device.icon className="h-5 w-5 text-secondary-600" />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{device.name}</span>
                        <span className="text-sm text-secondary-600">{device.value}%</span>
                      </div>
                      <Progress value={device.value} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        {/* 地域分布 */}
        <AnimatedContainer animation="slideRight" delay={300}>
          <EnhancedCard variant="traditional" size="lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-accent-600" />
                <span>地域分布</span>
              </CardTitle>
              <CardDescription>用户地理位置分布统计</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {regionData.map((region, index) => (
                  <div key={region.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                      <span className="text-sm font-medium">{region.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-secondary-600">{region.users.toLocaleString()}</span>
                      <Badge variant="outline">{region.percentage}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>
      </div>

      {/* 用户行为分析 */}
      <AnimatedContainer animation="fadeIn" delay={400}>
        <EnhancedCard variant="modern" size="lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-traditional-azure" />
              <span>用户行为统计</span>
            </CardTitle>
            <CardDescription>用户在平台上的主要行为数据</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="behavior" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="behavior">行为统计</TabsTrigger>
                <TabsTrigger value="engagement">参与度</TabsTrigger>
                <TabsTrigger value="retention">留存率</TabsTrigger>
              </TabsList>
              <TabsContent value="behavior" className="mt-4">
                <div className="space-y-4">
                  {behaviorData.map((behavior, index) => (
                    <div
                      key={behavior.action}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary-600">{index + 1}</span>
                        </div>
                        <span className="font-medium">{behavior.action}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold">{behavior.count.toLocaleString()}</span>
                        <Badge variant="secondary" className="text-green-600">
                          {behavior.trend}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="engagement" className="mt-4">
                <div className="text-center py-8">
                  <div className="text-4xl font-bold text-primary-600 mb-2">85.2%</div>
                  <div className="text-lg font-medium text-secondary-900">平均参与度</div>
                  <div className="text-sm text-secondary-600 mt-2">用户平均会话参与度较上月提升12.5%</div>
                </div>
              </TabsContent>
              <TabsContent value="retention" className="mt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-secondary-600">1天留存率</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={92} className="w-24 h-2" />
                      <span className="text-sm font-medium">92%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-secondary-600">7天留存率</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={78} className="w-24 h-2" />
                      <span className="text-sm font-medium">78%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-secondary-600">30天留存率</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={65} className="w-24 h-2" />
                      <span className="text-sm font-medium">65%</span>
                    </div>
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
