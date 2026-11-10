"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, BarChart3, PieChart, LineChart, Activity, Users, ShoppingCart, DollarSign, Eye, MousePointer, Clock, Target, Zap, Brain, Lightbulb, AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight, RefreshCw, Download, Share2, Filter, Calendar, Settings } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { EnhancedCard } from "../design-system/enhanced-card-system"
import { EnhancedButton } from "../design-system/enhanced-button-system"
import { AnimatedContainer, FloatingElement } from "../design-system/animation-system"
import { useSound } from "../design-system/sound-system"

// 数据类型定义
interface AnalysisMetric {
  id: string
  name: string
  value: number
  change: number
  trend: "up" | "down" | "stable"
  icon: any
  color: string
  description: string
}

interface AIInsight {
  id: string
  type: "opportunity" | "warning" | "trend" | "recommendation"
  title: string
  description: string
  impact: "high" | "medium" | "low"
  confidence: number
  actions: string[]
  timestamp: Date
}

interface PredictionData {
  id: string
  metric: string
  currentValue: number
  predictedValue: number
  timeframe: string
  confidence: number
  factors: string[]
}

export function IntelligentAnalysis() {
  const [activeTab, setActiveTab] = useState("overview")
  const [timeRange, setTimeRange] = useState("7d")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const { playSound } = useSound()

  // 核心指标数据
  const [metrics, setMetrics] = useState<AnalysisMetric[]>([
    {
      id: "users",
      name: "活跃用户",
      value: 1247,
      change: 12.5,
      trend: "up",
      icon: Users,
      color: "text-traditional-jade",
      description: "较上周增长12.5%，用户活跃度持续提升",
    },
    {
      id: "revenue",
      name: "营收",
      value: 45680,
      change: -3.2,
      trend: "down",
      icon: DollarSign,
      color: "text-traditional-crimson",
      description: "较上周下降3.2%，需要关注转化率优化",
    },
    {
      id: "conversion",
      name: "转化率",
      value: 3.8,
      change: 0.5,
      trend: "up",
      icon: Target,
      color: "text-primary-500",
      description: "转化率稳步提升，营销策略效果显著",
    },
    {
      id: "engagement",
      name: "用户参与度",
      value: 68.5,
      change: 5.2,
      trend: "up",
      icon: Activity,
      color: "text-accent-500",
      description: "用户参与度大幅提升，内容策略成效明显",
    },
  ])

  // AI洞察数据
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([
    {
      id: "1",
      type: "opportunity",
      title: "移动端用户增长机会",
      description: "移动端用户访问量增长35%，但转化率仅为桌面端的60%。优化移动端用户体验可显著提升整体转化率。",
      impact: "high",
      confidence: 0.89,
      actions: ["优化移动端界面", "简化注册流程", "增加移动端专属功能"],
      timestamp: new Date(),
    },
    {
      id: "2",
      type: "warning",
      title: "用户流失风险预警",
      description: "检测到15%的高价值用户在过去7天内活跃度下降。建议立即启动用户挽回策略。",
      impact: "high",
      confidence: 0.92,
      actions: ["发送个性化挽回邮件", "提供专属优惠", "安排客服主动联系"],
      timestamp: new Date(),
    },
    {
      id: "3",
      type: "trend",
      title: "内容消费趋势变化",
      description: "用户对视频内容的偏好增长45%，文字内容消费下降20%。建议调整内容策略。",
      impact: "medium",
      confidence: 0.76,
      actions: ["增加视频内容比例", "优化视频播放体验", "开发短视频功能"],
      timestamp: new Date(),
    },
    {
      id: "4",
      type: "recommendation",
      title: "个性化推荐优化",
      description: "基于用户行为分析，个性化推荐算法可提升点击率25%。建议升级推荐系统。",
      impact: "medium",
      confidence: 0.83,
      actions: ["升级推荐算法", "增加用户标签维度", "A/B测试新推荐策略"],
      timestamp: new Date(),
    },
  ])

  // 预测数据
  const [predictions, setPredictions] = useState<PredictionData[]>([
    {
      id: "1",
      metric: "月活跃用户",
      currentValue: 1247,
      predictedValue: 1456,
      timeframe: "下月",
      confidence: 0.87,
      factors: ["季节性增长", "营销活动效果", "产品功能优化"],
    },
    {
      id: "2",
      metric: "月营收",
      currentValue: 45680,
      predictedValue: 52340,
      timeframe: "下月",
      confidence: 0.79,
      factors: ["用户增长", "客单价提升", "新产品发布"],
    },
    {
      id: "3",
      metric: "转化率",
      currentValue: 3.8,
      predictedValue: 4.2,
      timeframe: "下月",
      confidence: 0.91,
      factors: ["界面优化", "流程简化", "个性化推荐"],
    },
  ])

  // 触发AI分析
  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    playSound("click")

    // 模拟AI分析过程
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // 更新洞察数据
    const newInsight: AIInsight = {
      id: Date.now().toString(),
      type: "recommendation",
      title: "实时分析完成",
      description: `基于最新数据分析，发现了${Math.floor(Math.random() * 5) + 3}个优化机会。建议优先关注用户体验提升和转化率优化。`,
      impact: "high",
      confidence: 0.85 + Math.random() * 0.1,
      actions: ["查看详细报告", "制定优化计划", "设置监控告警"],
      timestamp: new Date(),
    }

    setAiInsights((prev) => [newInsight, ...prev.slice(0, 4)])
    setIsAnalyzing(false)
    playSound("success")
  }

  const getInsightIcon = (type: AIInsight["type"]) => {
    switch (type) {
      case "opportunity":
        return <Lightbulb className="w-4 h-4 text-traditional-gold" />
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-traditional-crimson" />
      case "trend":
        return <TrendingUp className="w-4 h-4 text-primary-500" />
      case "recommendation":
        return <Brain className="w-4 h-4 text-accent-500" />
      default:
        return <CheckCircle className="w-4 h-4 text-traditional-jade" />
    }
  }

  const getImpactColor = (impact: AIInsight["impact"]) => {
    switch (impact) {
      case "high":
        return "bg-traditional-crimson/10 text-traditional-crimson border-traditional-crimson/20"
      case "medium":
        return "bg-traditional-gold/10 text-traditional-gold border-traditional-gold/20"
      case "low":
        return "bg-traditional-jade/10 text-traditional-jade border-traditional-jade/20"
      default:
        return "bg-secondary-100 text-secondary-600 border-secondary-200"
    }
  }

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">AI智能分析</h2>
          <p className="text-secondary-600 text-sm">基于机器学习的业务数据深度分析与预测</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">今日</SelectItem>
              <SelectItem value="7d">近7天</SelectItem>
              <SelectItem value="30d">近30天</SelectItem>
              <SelectItem value="90d">近90天</SelectItem>
            </SelectContent>
          </Select>
          <EnhancedButton
            variant="primary"
            size="sm"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            glowEffect
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                AI分析
              </>
            )}
          </EnhancedButton>
        </div>
      </div>

      {/* 核心指标概览 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <AnimatedContainer key={metric.id} animation="slideUp" delay={index * 100}>
            <EnhancedCard variant="glass" interactive>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metric.id === "revenue" ? `¥${metric.value.toLocaleString()}` : metric.value.toLocaleString()}
                  {metric.id === "conversion" && "%"}
                  {metric.id === "engagement" && "%"}
                </div>
                <div className="flex items-center space-x-1 text-xs">
                  {metric.trend === "up" ? (
                    <ArrowUpRight className="w-3 h-3 text-traditional-jade" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-traditional-crimson" />
                  )}
                  <span className={metric.trend === "up" ? "text-traditional-jade" : "text-traditional-crimson"}>
                    {Math.abs(metric.change)}%
                  </span>
                  <span className="text-secondary-500">vs 上周</span>
                </div>
                <p className="text-xs text-secondary-500 mt-1">{metric.description}</p>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>
        ))}
      </div>

      {/* 主要分析内容 */}
      <EnhancedCard variant="traditional" size="lg">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">智能洞察</TabsTrigger>
            <TabsTrigger value="predictions">预测分析</TabsTrigger>
            <TabsTrigger value="trends">趋势分析</TabsTrigger>
            <TabsTrigger value="recommendations">优化建议</TabsTrigger>
          </TabsList>

          {/* 智能洞察 */}
          <TabsContent value="overview" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">AI智能洞察</h3>
              <Badge variant="outline" className="bg-primary-50 text-primary-600">
                {aiInsights.length} 条洞察
              </Badge>
            </div>

            <div className="grid gap-4">
              {aiInsights.map((insight, index) => (
                <AnimatedContainer key={insight.id} animation="slideRight" delay={index * 100}>
                  <EnhancedCard variant="glass" className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getInsightIcon(insight.type)}
                          <h4 className="font-medium">{insight.title}</h4>
                          <Badge variant="outline" className={getImpactColor(insight.impact)}>
                            {insight.impact === "high" ? "高影响" : insight.impact === "medium" ? "中影响" : "低影响"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            置信度 {Math.round(insight.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="text-sm text-secondary-600 mb-3">{insight.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {insight.actions.map((action, actionIndex) => (
                            <Button key={actionIndex} variant="outline" size="sm" className="text-xs h-6">
                              {action}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-secondary-400 ml-4">
                        {insight.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 预测分析 */}
          <TabsContent value="predictions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">AI预测分析</h3>
              <Badge variant="outline" className="bg-accent-50 text-accent-600">
                基于机器学习模型
              </Badge>
            </div>

            <div className="grid gap-4">
              {predictions.map((prediction, index) => (
                <AnimatedContainer key={prediction.id} animation="slideLeft" delay={index * 100}>
                  <EnhancedCard variant="glass" className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">{prediction.metric}</h4>
                      <Badge variant="outline" className="bg-traditional-jade/10 text-traditional-jade">
                        置信度 {Math.round(prediction.confidence * 100)}%
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-secondary-500">当前值</p>
                        <p className="text-xl font-bold">{prediction.currentValue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary-500">预测值 ({prediction.timeframe})</p>
                        <p className="text-xl font-bold text-primary-500">
                          {prediction.predictedValue.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>预测增长</span>
                        <span className="text-traditional-jade">
                          +{Math.round(((prediction.predictedValue - prediction.currentValue) / prediction.currentValue) * 100)}%
                        </span>
                      </div>
                      <Progress
                        value={((prediction.predictedValue - prediction.currentValue) / prediction.currentValue) * 100}
                        className="h-2"
                      />
                    </div>

                    <div>
                      <p className="text-sm text-secondary-500 mb-2">影响因素:</p>
                      <div className="flex flex-wrap gap-1">
                        {prediction.factors.map((factor, factorIndex) => (
                          <Badge key={factorIndex} variant="secondary" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 趋势分析 */}
          <TabsContent value="trends" className="space-y-4">
            <div className="text-center py-12">
              <FloatingElement>
                <div className="mx-auto mb-4 p-4 bg-gradient-to-r from-primary-500/10 to-accent-500/10 rounded-full w-fit">
                  <LineChart className="w-16 h-16 text-primary-500" />
                </div>
              </FloatingElement>
              <h3 className="text-xl font-semibold mb-2">趋势分析图表</h3>
              <p className="text-secondary-600 mb-4">
                基于历史数据的深度趋势分析，识别业务发展模式和周期性变化
              </p>
              <EnhancedButton variant="primary" glowEffect>
                <BarChart3 className="w-4 h-4 mr-2" />
                生成趋势图表
              </EnhancedButton>
            </div>
          </TabsContent>

          {/* 优化建议 */}
          <TabsContent value="recommendations" className="space-y-4">
            <div className="text-center py-12">
              <FloatingElement>
                <div className="mx-auto mb-4 p-4 bg-gradient-to-r from-accent-500/10 to-traditional-gold/10 rounded-full w-fit">
                  <Zap className="w-16 h-16 text-accent-500" />
                </div>
              </FloatingElement>
              <h3 className="text-xl font-semibold mb-2">AI优化建议</h3>
              <p className="text-secondary-600 mb-4">
                基于数据分析结果，AI将为您生成个性化的业务优化建议和行动计划
              </p>
              <EnhancedButton variant="accent" glowEffect>
                <Brain className="w-4 h-4 mr-2" />
                生成优化方案
              </EnhancedButton>
            </div>
          </TabsContent>
        </Tabs>
      </EnhancedCard>
    </div>
  )
}
