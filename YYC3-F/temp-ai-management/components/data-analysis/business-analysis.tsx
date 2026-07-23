"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Target, BarChart3, PieChart } from "lucide-react"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AnimatedContainer } from "../design-system/animation-system"
import { EnhancedCard } from "../design-system/enhanced-card-system"

export function BusinessAnalysis() {
  const [selectedPeriod, setSelectedPeriod] = useState("30d")
  const [selectedMetric, setSelectedMetric] = useState("revenue")

  const businessMetrics = [
    {
      title: "总收入",
      value: "¥2,847,392",
      change: "+23.5%",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: "up",
    },
    {
      title: "订单数量",
      value: "12,847",
      change: "+18.2%",
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: "up",
    },
    {
      title: "客户获取成本",
      value: "¥156",
      change: "-8.7%",
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      trend: "down",
    },
    {
      title: "客户生命周期价值",
      value: "¥3,247",
      change: "+15.3%",
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      trend: "up",
    },
  ]

  const salesChannels = [
    { name: "线上商城", revenue: 1247392, percentage: 44, growth: "+28%" },
    { name: "移动应用", revenue: 856743, percentage: 30, growth: "+35%" },
    { name: "第三方平台", revenue: 534821, percentage: 19, growth: "+12%" },
    { name: "线下门店", revenue: 208436, percentage: 7, growth: "-5%" },
  ]

  const productCategories = [
    { name: "数字服务", sales: 45672, percentage: 38, color: "bg-blue-500" },
    { name: "软件产品", sales: 32847, percentage: 27, color: "bg-green-500" },
    { name: "咨询服务", sales: 24156, percentage: 20, color: "bg-purple-500" },
    { name: "培训课程", sales: 18234, percentage: 15, color: "bg-orange-500" },
  ]

  const conversionFunnel = [
    { stage: "访问量", count: 125847, percentage: 100, color: "bg-blue-500" },
    { stage: "注册用户", count: 25169, percentage: 20, color: "bg-green-500" },
    { stage: "试用用户", count: 12584, percentage: 10, color: "bg-yellow-500" },
    { stage: "付费用户", count: 6292, percentage: 5, color: "bg-purple-500" },
    { stage: "续费用户", count: 4409, percentage: 3.5, color: "bg-red-500" },
  ]

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">业务分析</h2>
          <p className="text-secondary-600">全面的业务指标和趋势分析，助力业务增长</p>
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
              <SelectItem value="1y">1年</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">收入</SelectItem>
              <SelectItem value="orders">订单</SelectItem>
              <SelectItem value="customers">客户</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 核心业务指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {businessMetrics.map((metric, index) => (
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
                  <span className="text-secondary-500">vs 上期</span>
                </div>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>
        ))}
      </div>

      {/* 详细分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 销售渠道分析 */}
        <AnimatedContainer animation="slideLeft" delay={200}>
          <EnhancedCard variant="traditional" size="lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-primary-600" />
                <span>销售渠道分析</span>
              </CardTitle>
              <CardDescription>各销售渠道收入贡献和增长情况</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salesChannels.map((channel, index) => (
                  <div key={channel.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{channel.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-secondary-600">¥{channel.revenue.toLocaleString()}</span>
                        <Badge variant="outline" className="text-xs">
                          {channel.growth}
                        </Badge>
                      </div>
                    </div>
                    <Progress value={channel.percentage} className="h-2" />
                    <div className="text-xs text-secondary-500">{channel.percentage}% 占比</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        {/* 产品类别分析 */}
        <AnimatedContainer animation="slideRight" delay={300}>
          <EnhancedCard variant="traditional" size="lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="h-5 w-5 text-accent-600" />
                <span>产品类别分析</span>
              </CardTitle>
              <CardDescription>不同产品类别的销售表现</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productCategories.map((category, index) => (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-secondary-600">{category.sales.toLocaleString()}</span>
                      <Badge variant="outline">{category.percentage}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">120,909</div>
                  <div className="text-sm text-secondary-600">总销售量</div>
                </div>
              </div>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>
      </div>

      {/* 转化漏斗分析 */}
      <AnimatedContainer animation="fadeIn" delay={400}>
        <EnhancedCard variant="modern" size="lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-traditional-azure" />
              <span>转化漏斗分析</span>
            </CardTitle>
            <CardDescription>用户从访问到付费的完整转化路径</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="funnel" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="funnel">转化漏斗</TabsTrigger>
                <TabsTrigger value="cohort">用户群组</TabsTrigger>
                <TabsTrigger value="ltv">生命周期价值</TabsTrigger>
              </TabsList>
              <TabsContent value="funnel" className="mt-4">
                <div className="space-y-4">
                  {conversionFunnel.map((stage, index) => (
                    <div key={stage.stage} className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{stage.stage}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold">{stage.count.toLocaleString()}</span>
                          <Badge variant="secondary">{stage.percentage}%</Badge>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="w-full bg-secondary-100 rounded-full h-8">
                          <div
                            className={`${stage.color} h-8 rounded-full flex items-center justify-center text-white text-sm font-medium transition-all duration-500`}
                            style={{ width: `${stage.percentage * 10}%` }}
                          >
                            {stage.percentage}%
                          </div>
                        </div>
                      </div>
                      {index < conversionFunnel.length - 1 && (
                        <div className="flex justify-center mt-2">
                          <TrendingDown className="h-4 w-4 text-secondary-400" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="cohort" className="mt-4">
                <div className="text-center py-8">
                  <div className="text-4xl font-bold text-primary-600 mb-2">78.5%</div>
                  <div className="text-lg font-medium text-secondary-900">30天留存率</div>
                  <div className="text-sm text-secondary-600 mt-2">新用户30天内的平均留存率</div>
                </div>
              </TabsContent>
              <TabsContent value="ltv" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-secondary-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">¥3,247</div>
                    <div className="text-sm text-secondary-600">平均LTV</div>
                  </div>
                  <div className="text-center p-4 bg-secondary-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">¥156</div>
                    <div className="text-sm text-secondary-600">获客成本</div>
                  </div>
                  <div className="text-center p-4 bg-secondary-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">20.8x</div>
                    <div className="text-sm text-secondary-600">LTV/CAC比率</div>
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
