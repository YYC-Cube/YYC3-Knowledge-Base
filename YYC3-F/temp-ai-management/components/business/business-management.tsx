"use client"

import { useState, useEffect } from "react"
import {
  Building,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Bot,
  Brain,
  Zap,
  AlertTriangle,
  CheckCircle,
  Smartphone,
  Monitor,
  Tablet,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

import { EnhancedCard } from "../design-system/enhanced-card-system"
import { AnimatedContainer } from "../design-system/animation-system"
import { useSound } from "../design-system/sound-system"

// AI分析结果接口
interface AIInsight {
  id: string
  type: "opportunity" | "risk" | "optimization" | "prediction"
  title: string
  description: string
  confidence: number
  impact: "high" | "medium" | "low"
  actionable: boolean
  recommendations: string[]
}

// 业务预测接口
interface BusinessPrediction {
  metric: string
  currentValue: number
  predictedValue: number
  confidence: number
  timeframe: string
  trend: "up" | "down" | "stable"
}

export function BusinessManagement() {
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [predictions, setPredictions] = useState<BusinessPrediction[]>([])
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false)
  const [deviceView, setDeviceView] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const { playSound } = useSound()

  const kpiData = [
    {
      title: "总收入",
      value: "¥2,847,392",
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      mobileValue: "¥284.7万",
    },
    {
      title: "活跃客户",
      value: "8,924",
      change: "+8.2%",
      trend: "up",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      mobileValue: "8.9K",
    },
    {
      title: "转化率",
      value: "15.8%",
      change: "-2.1%",
      trend: "down",
      icon: Target,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      mobileValue: "15.8%",
    },
    {
      title: "客户满意度",
      value: "94.2%",
      change: "+3.7%",
      trend: "up",
      icon: Activity,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      mobileValue: "94.2%",
    },
  ]

  // 模拟AI分析
  const runAIAnalysis = async () => {
    setIsAiAnalyzing(true)
    playSound("click")

    // 模拟API调用延迟
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const mockInsights: AIInsight[] = [
      {
        id: "1",
        type: "opportunity",
        title: "移动端转化率提升机会",
        description: "AI分析发现移动端用户停留时间增长35%，但转化率仅为桌面端的60%",
        confidence: 0.87,
        impact: "high",
        actionable: true,
        recommendations: ["优化移动端结账流程，减少步骤", "增加移动端专属优惠券", "改进移动端支付体验"],
      },
      {
        id: "2",
        type: "risk",
        title: "客户流失风险预警",
        description: "检测到15%的高价值客户活跃度下降，存在流失风险",
        confidence: 0.92,
        impact: "high",
        actionable: true,
        recommendations: ["启动客户挽回计划", "个性化推送相关产品", "安排客户成功经理跟进"],
      },
      {
        id: "3",
        type: "optimization",
        title: "库存优化建议",
        description: "基于销售趋势分析，建议调整Q4库存配置",
        confidence: 0.78,
        impact: "medium",
        actionable: true,
        recommendations: ["增加热销产品库存20%", "减少滞销产品采购", "优化供应链响应时间"],
      },
    ]

    const mockPredictions: BusinessPrediction[] = [
      {
        metric: "月收入",
        currentValue: 2847392,
        predictedValue: 3156831,
        confidence: 0.85,
        timeframe: "下月",
        trend: "up",
      },
      {
        metric: "新客户",
        currentValue: 156,
        predictedValue: 189,
        confidence: 0.79,
        timeframe: "下月",
        trend: "up",
      },
      {
        metric: "客户满意度",
        currentValue: 94.2,
        predictedValue: 95.8,
        confidence: 0.73,
        timeframe: "下月",
        trend: "up",
      },
    ]

    setAiInsights(mockInsights)
    setPredictions(mockPredictions)
    setIsAiAnalyzing(false)
    playSound("success")
  }

  // 检测设备类型
  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth
      if (width < 768) {
        setDeviceView("mobile")
      } else if (width < 1024) {
        setDeviceView("tablet")
      } else {
        setDeviceView("desktop")
      }
    }

    checkDeviceType()
    window.addEventListener("resize", checkDeviceType)
    return () => window.removeEventListener("resize", checkDeviceType)
  }, [])

  // 获取响应式样式
  const getResponsiveCardClass = () => {
    switch (deviceView) {
      case "mobile":
        return "grid-cols-2 gap-3"
      case "tablet":
        return "grid-cols-2 lg:grid-cols-4 gap-4"
      default:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    }
  }

  const getResponsiveTextSize = () => {
    switch (deviceView) {
      case "mobile":
        return "text-lg"
      case "tablet":
        return "text-xl"
      default:
        return "text-2xl"
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
      {/* 设备视图切换器 - 仅开发时显示 */}
      <div className="flex justify-end space-x-2 mb-4 lg:hidden">
        <Button
          variant={deviceView === "mobile" ? "default" : "outline"}
          size="sm"
          onClick={() => setDeviceView("mobile")}
        >
          <Smartphone className="w-4 h-4" />
        </Button>
        <Button
          variant={deviceView === "tablet" ? "default" : "outline"}
          size="sm"
          onClick={() => setDeviceView("tablet")}
        >
          <Tablet className="w-4 h-4" />
        </Button>
        <Button
          variant={deviceView === "desktop" ? "default" : "outline"}
          size="sm"
          onClick={() => setDeviceView("desktop")}
        >
          <Monitor className="w-4 h-4" />
        </Button>
      </div>

      {/* 业务概览 */}
      <AnimatedContainer animation="fadeIn">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
          <div>
            <h2 className={`${getResponsiveTextSize()} font-bold flex items-center`}>
              <Building className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
              商务管理概览
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">AI驱动的业务指标和KPI管理</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">本周</SelectItem>
                <SelectItem value="month">本月</SelectItem>
                <SelectItem value="quarter">本季度</SelectItem>
                <SelectItem value="year">今年</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="w-full sm:w-auto bg-transparent"
              onClick={runAIAnalysis}
              disabled={isAiAnalyzing}
            >
              {isAiAnalyzing ? (
                <>
                  <Brain className="w-4 h-4 mr-2 animate-pulse" />
                  AI分析中...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 mr-2" />
                  AI智能分析
                </>
              )}
            </Button>
            <Button variant="outline" className="w-full sm:w-auto bg-transparent">
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">导出报告</span>
              <span className="sm:hidden">导出</span>
            </Button>
          </div>
        </div>

        <div className={`grid ${getResponsiveCardClass()}`}>
          {kpiData.map((kpi, index) => (
            <AnimatedContainer key={kpi.title} animation="slideUp" delay={index * 100}>
              <EnhancedCard variant="modern" glowEffect>
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className={`p-2 sm:p-3 rounded-lg ${kpi.bgColor}`}>
                      <kpi.icon className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 ${kpi.color}`} />
                    </div>
                    <div className="flex items-center space-x-1">
                      {kpi.trend === "up" ? (
                        <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                      )}
                      <span
                        className={`text-xs sm:text-sm font-medium ${kpi.trend === "up" ? "text-green-600" : "text-red-600"}`}
                      >
                        {kpi.change}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">{kpi.title}</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold">
                      {deviceView === "mobile" ? kpi.mobileValue : kpi.value}
                    </p>
                  </div>
                </CardContent>
              </EnhancedCard>
            </AnimatedContainer>
          ))}
        </div>
      </AnimatedContainer>

      {/* AI洞察面板 */}
      {aiInsights.length > 0 && (
        <AnimatedContainer animation="slideUp" delay={300}>
          <EnhancedCard variant="traditional" glowEffect>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-purple-500" />
                <span>AI智能洞察</span>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  实时分析
                </Badge>
              </CardTitle>
              <CardDescription>基于机器学习算法的业务洞察和预测分析</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {aiInsights.map((insight, index) => (
                  <AnimatedContainer key={insight.id} animation="slideRight" delay={index * 100}>
                    <div className="p-4 border rounded-lg bg-gradient-to-br from-white to-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {insight.type === "opportunity" && <Zap className="w-4 h-4 text-green-500" />}
                          {insight.type === "risk" && <AlertTriangle className="w-4 h-4 text-red-500" />}
                          {insight.type === "optimization" && <Target className="w-4 h-4 text-blue-500" />}
                          {insight.type === "prediction" && <TrendingUp className="w-4 h-4 text-purple-500" />}
                          <Badge
                            variant={
                              insight.impact === "high"
                                ? "destructive"
                                : insight.impact === "medium"
                                  ? "default"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {insight.impact === "high" ? "高影响" : insight.impact === "medium" ? "中影响" : "低影响"}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          置信度: {Math.round(insight.confidence * 100)}%
                        </div>
                      </div>

                      <h4 className="font-medium mb-2 text-sm sm:text-base">{insight.title}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3">{insight.description}</p>

                      {insight.actionable && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-700">AI建议:</p>
                          <ul className="space-y-1">
                            {insight.recommendations.slice(0, deviceView === "mobile" ? 2 : 3).map((rec, idx) => (
                              <li key={idx} className="text-xs text-gray-600 flex items-start">
                                <CheckCircle className="w-3 h-3 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AnimatedContainer>
                ))}
              </div>

              {/* 业务预测 */}
              {predictions.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium mb-4 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    AI业务预测
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {predictions.map((pred, index) => (
                      <div key={index} className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">{pred.metric}</span>
                          <Badge variant="outline" className="text-xs">
                            {pred.timeframe}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">当前:</span>
                            <span className="text-sm font-medium">
                              {pred.metric.includes("收入")
                                ? `¥${pred.currentValue.toLocaleString()}`
                                : pred.currentValue}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">预测:</span>
                            <span className="text-sm font-medium text-blue-600">
                              {pred.metric.includes("收入")
                                ? `¥${pred.predictedValue.toLocaleString()}`
                                : pred.predictedValue}
                            </span>
                            {pred.trend === "up" && <ArrowUpRight className="w-3 h-3 text-green-500" />}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            置信度: {Math.round(pred.confidence * 100)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>
      )}

      {/* 详细分析 */}
      <AnimatedContainer animation="slideUp" delay={200}>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className={`${deviceView === "mobile" ? "grid-cols-2" : "grid-cols-4"} w-full`}>
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              {deviceView === "mobile" ? "概览" : "业务概览"}
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-xs sm:text-sm">
              {deviceView === "mobile" ? "业绩" : "业绩分析"}
            </TabsTrigger>
            {deviceView !== "mobile" && (
              <>
                <TabsTrigger value="customers" className="text-xs sm:text-sm">
                  客户分析
                </TabsTrigger>
                <TabsTrigger value="goals" className="text-xs sm:text-sm">
                  目标管理
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className={`grid gap-4 ${deviceView === "mobile" ? "grid-cols-1" : "md:grid-cols-2"}`}>
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-sm sm:text-base">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>收入趋势</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 sm:h-64 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 text-blue-500 mx-auto mb-2" />
                      <p className="text-xs sm:text-sm text-muted-foreground">收入趋势图表</p>
                      <p className="text-xs text-muted-foreground mt-1">AI预测显示持续增长</p>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>

              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-sm sm:text-base">
                    <PieChart className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>业务分布</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span>产品销售</span>
                        <span className="font-medium">65%</span>
                      </div>
                      <Progress value={65} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span>服务收入</span>
                        <span className="font-medium">25%</span>
                      </div>
                      <Progress value={25} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span>其他收入</span>
                        <span className="font-medium">10%</span>
                      </div>
                      <Progress value={10} className="h-2" />
                    </div>
                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Bot className="w-4 h-4 text-green-600" />
                        <span className="text-xs sm:text-sm font-medium text-green-700">AI建议</span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">建议增加服务收入占比，提升利润率</p>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <EnhancedCard variant="modern">
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">AI驱动的业绩分析</CardTitle>
                <CardDescription className="text-xs sm:text-sm">基于机器学习的深度业绩洞察</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">销售效率</span>
                      <Badge variant="default">优秀</Badge>
                    </div>
                    <div className="text-2xl font-bold text-green-600">92.5%</div>
                    <p className="text-xs text-muted-foreground mt-1">AI分析：比行业平均高15%</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">客户获取成本</span>
                      <Badge variant="secondary">正常</Badge>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">¥245</div>
                    <p className="text-xs text-muted-foreground mt-1">AI建议：可优化渠道配置</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">客户生命周期价值</span>
                      <Badge variant="default">优秀</Badge>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">¥3,420</div>
                    <p className="text-xs text-muted-foreground mt-1">AI预测：持续增长趋势</p>
                  </div>
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>

          {deviceView !== "mobile" && (
            <>
              <TabsContent value="customers" className="space-y-4">
                <EnhancedCard variant="modern">
                  <CardHeader>
                    <CardTitle>AI客户分析</CardTitle>
                    <CardDescription>智能客户行为和满意度分析</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">AI客户分析功能开发中...</p>
                    </div>
                  </CardContent>
                </EnhancedCard>
              </TabsContent>

              <TabsContent value="goals" className="space-y-4">
                <EnhancedCard variant="modern">
                  <CardHeader>
                    <CardTitle>智能目标管理</CardTitle>
                    <CardDescription>AI辅助的业务目标设定和跟踪</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">智能目标管理功能开发中...</p>
                    </div>
                  </CardContent>
                </EnhancedCard>
              </TabsContent>
            </>
          )}
        </Tabs>
      </AnimatedContainer>

      {/* 移动端专用快捷操作 */}
      {deviceView === "mobile" && (
        <AnimatedContainer animation="slideUp" delay={400}>
          <EnhancedCard variant="modern">
            <CardHeader>
              <CardTitle className="text-base">快捷操作</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-16 flex-col space-y-1 bg-transparent">
                  <Users className="w-5 h-5" />
                  <span className="text-xs">客户管理</span>
                </Button>
                <Button variant="outline" className="h-16 flex-col space-y-1 bg-transparent">
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-xs">数据报表</span>
                </Button>
                <Button variant="outline" className="h-16 flex-col space-y-1 bg-transparent">
                  <Target className="w-5 h-5" />
                  <span className="text-xs">目标设定</span>
                </Button>
                <Button variant="outline" className="h-16 flex-col space-y-1 bg-transparent">
                  <Bot className="w-5 h-5" />
                  <span className="text-xs">AI助手</span>
                </Button>
              </div>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>
      )}
    </div>
  )
}
