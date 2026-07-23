"use client"

import { useState, useEffect } from "react"
import { Target, Users, ShoppingCart, TrendingUp, Star, Heart, Eye, MousePointer, Clock, Filter, Zap, Brain, Sparkles, ArrowRight, ThumbsUp, ThumbsDown, RefreshCw, Settings, Download, Share2, BookOpen, Tag, Gift, MessageSquare, Calendar, MapPin } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"

import { EnhancedCard } from "../design-system/enhanced-card-system"
import { EnhancedButton } from "../design-system/enhanced-button-system"
import { AnimatedContainer, FloatingElement } from "../design-system/animation-system"
import { useSound } from "../design-system/sound-system"

// 推荐类型定义
interface Recommendation {
  id: string
  type: "product" | "content" | "user" | "action" | "campaign"
  title: string
  description: string
  confidence: number
  impact: "high" | "medium" | "low"
  category: string
  targetAudience: string[]
  expectedOutcome: string
  reasoning: string[]
  actions: RecommendationAction[]
  metadata: {
    priority: number
    estimatedROI?: number
    timeToImplement?: string
    difficulty?: "easy" | "medium" | "hard"
    tags?: string[]
  }
}

interface RecommendationAction {
  id: string
  title: string
  description: string
  icon: any
  action: () => void
}

interface UserSegment {
  id: string
  name: string
  description: string
  size: number
  characteristics: string[]
  preferences: string[]
  behavior: {
    avgSessionTime: number
    conversionRate: number
    lifetimeValue: number
  }
}

interface RecommendationEngine {
  algorithm: string
  accuracy: number
  lastTrained: Date
  dataPoints: number
  features: string[]
}

export function RecommendationEngine() {
  const [activeTab, setActiveTab] = useState("recommendations")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [confidenceThreshold, setConfidenceThreshold] = useState([70])
  const [isGenerating, setIsGenerating] = useState(false)
  const { playSound } = useSound()

  // 推荐数据
  const [recommendations, setRecommendations] = useState<Recommendation[]>([
    {
      id: "1",
      type: "product",
      title: "推荐高转化产品组合",
      description: "基于用户购买行为分析，推荐将产品A与产品B进行组合销售，预计可提升转化率25%",
      confidence: 0.89,
      impact: "high",
      category: "销售优化",
      targetAudience: ["高价值客户", "复购用户"],
      expectedOutcome: "转化率提升25%，客单价增长15%",
      reasoning: [
        "产品A和产品B的共同购买率达到45%",
        "组合购买用户的满意度评分高出平均值20%",
        "竞品分析显示类似组合策略效果显著",
      ],
      actions: [
        {
          id: "create-bundle",
          title: "创建产品组合",
          description: "在系统中创建新的产品组合",
          icon: ShoppingCart,
          action: () => console.log("创建产品组合"),
        },
        {
          id: "setup-campaign",
          title: "设置营销活动",
          description: "为产品组合创建专门的营销活动",
          icon: Target,
          action: () => console.log("设置营销活动"),
        },
      ],
      metadata: {
        priority: 1,
        estimatedROI: 180,
        timeToImplement: "1-2周",
        difficulty: "easy",
        tags: ["产品组合", "转化优化", "销售策略"],
      },
    },
    {
      id: "2",
      type: "content",
      title: "个性化内容推送策略",
      description: "为不同用户群体定制个性化内容推送，基于用户兴趣和行为模式优化内容分发",
      confidence: 0.76,
      impact: "medium",
      category: "内容营销",
      targetAudience: ["活跃用户", "内容消费者"],
      expectedOutcome: "用户参与度提升30%，内容点击率增长40%",
      reasoning: [
        "用户对个性化内容的参与度比通用内容高3倍",
        "基于兴趣标签的内容推荐准确率达到78%",
        "个性化推送的取消订阅率降低60%",
      ],
      actions: [
        {
          id: "segment-users",
          title: "用户分群",
          description: "基于行为数据进行用户分群",
          icon: Users,
          action: () => console.log("用户分群"),
        },
        {
          id: "create-templates",
          title: "创建内容模板",
          description: "为不同用户群体创建内容模板",
          icon: BookOpen,
          action: () => console.log("创建内容模板"),
        },
      ],
      metadata: {
        priority: 2,
        estimatedROI: 145,
        timeToImplement: "2-3周",
        difficulty: "medium",
        tags: ["个性化", "内容营销", "用户参与"],
      },
    },
    {
      id: "3",
      type: "campaign",
      title: "智能营销时机优化",
      description: "基于用户活跃时间和历史互动数据，优化营销活动的发送时机，提升营销效果",
      confidence: 0.92,
      impact: "high",
      category: "营销优化",
      targetAudience: ["全体用户"],
      expectedOutcome: "营销邮件打开率提升45%，点击率增长35%",
      reasoning: [
        "用户活跃时间分析显示明显的时段偏好",
        "在最佳时机发送的营销内容效果提升2.5倍",
        "个性化发送时机比统一发送效果好80%",
      ],
      actions: [
        {
          id: "analyze-timing",
          title: "分析最佳时机",
          description: "分析用户的最佳互动时间",
          icon: Clock,
          action: () => console.log("分析最佳时机"),
        },
        {
          id: "setup-automation",
          title: "设置自动化",
          description: "配置智能发送时机自动化",
          icon: Zap,
          action: () => console.log("设置自动化"),
        },
      ],
      metadata: {
        priority: 1,
        estimatedROI: 220,
        timeToImplement: "1周",
        difficulty: "easy",
        tags: ["营销自动化", "时机优化", "用户行为"],
      },
    },
  ])

  // 用户分群数据
  const [userSegments] = useState<UserSegment[]>([
    {
      id: "high-value",
      name: "高价值客户",
      description: "消费金额高、忠诚度强的核心客户群体",
      size: 156,
      characteristics: ["高消费", "高频次", "高满意度"],
      preferences: ["优质服务", "专属优惠", "新品优先"],
      behavior: {
        avgSessionTime: 12.5,
        conversionRate: 8.2,
        lifetimeValue: 2850,
      },
    },
    {
      id: "potential-customers",
      name: "潜在客户",
      description: "有购买意向但���未转化的用户群体",
      size: 423,
      characteristics: ["浏览活跃", "关注产品", "价格敏感"],
      preferences: ["优惠活动", "产品试用", "详细介绍"],
      behavior: {
        avgSessionTime: 6.8,
        conversionRate: 2.1,
        lifetimeValue: 450,
      },
    },
    {
      id: "content-consumers",
      name: "内容消费者",
      description: "主要消费内容、参与度高的用户群体",
      size: 892,
      characteristics: ["内容活跃", "社交分享", "意见领袖"],
      preferences: ["优质内容", "互动体验", "社区参与"],
      behavior: {
        avgSessionTime: 15.2,
        conversionRate: 1.8,
        lifetimeValue: 320,
      },
    },
  ])

  // 推荐引擎状态
  const [engineStatus] = useState<RecommendationEngine>({
    algorithm: "深度学习协同过滤",
    accuracy: 0.847,
    lastTrained: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    dataPoints: 1247856,
    features: ["用户行为", "产品属性", "时间序列", "社交关系", "内容偏好"],
  })

  // 生成新推荐
  const handleGenerateRecommendations = async () => {
    setIsGenerating(true)
    playSound("click")

    // 模拟AI生成过程
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const newRecommendation: Recommendation = {
      id: Date.now().toString(),
      type: "action",
      title: "优化用户注册流程",
      description: "简化注册步骤，减少用户流失，提升注册转化率",
      confidence: 0.81,
      impact: "medium",
      category: "用户体验",
      targetAudience: ["新用户"],
      expectedOutcome: "注册转化率提升20%，用户流失率降低15%",
      reasoning: [
        "当前注册流程有3个步骤，用户在第2步流失率最高",
        "简化后的注册流程在A/B测试中表现更好",
        "竞品分析显示简化注册是行业趋势",
      ],
      actions: [
        {
          id: "simplify-form",
          title: "简化表单",
          description: "减少必填字段，优化表单设计",
          icon: Settings,
          action: () => console.log("简化表单"),
        },
      ],
      metadata: {
        priority: 2,
        estimatedROI: 160,
        timeToImplement: "1-2周",
        difficulty: "medium",
        tags: ["用户体验", "转化优化", "注册流程"],
      },
    }

    setRecommendations((prev) => [newRecommendation, ...prev])
    setIsGenerating(false)
    playSound("success")
  }

  const handleRecommendationFeedback = (id: string, feedback: "positive" | "negative") => {
    playSound("click")
    console.log(`推荐 ${id} 反馈: ${feedback}`)
  }

  const getImpactColor = (impact: Recommendation["impact"]) => {
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

  const getDifficultyColor = (difficulty: Recommendation["metadata"]["difficulty"]) => {
    switch (difficulty) {
      case "easy":
        return "bg-traditional-jade/10 text-traditional-jade"
      case "medium":
        return "bg-traditional-gold/10 text-traditional-gold"
      case "hard":
        return "bg-traditional-crimson/10 text-traditional-crimson"
      default:
        return "bg-secondary-100 text-secondary-600"
    }
  }

  const filteredRecommendations = recommendations.filter((rec) => {
    if (selectedCategory !== "all" && rec.category !== selectedCategory) return false
    if (rec.confidence * 100 < confidenceThreshold[0]) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* 推荐引擎状态 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnimatedContainer animation="slideUp" delay={0}>
          <EnhancedCard variant="glass" interactive>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">推荐准确率</CardTitle>
              <Brain className="h-4 w-4 text-primary-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary-500">
                {Math.round(engineStatus.accuracy * 100)}%
              </div>
              <p className="text-xs text-secondary-500">基于机器学习算法</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={150}>
          <EnhancedCard variant="glass" interactive>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">数据点</CardTitle>
              <Target className="h-4 w-4 text-accent-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent-500">
                {(engineStatus.dataPoints / 1000000).toFixed(1)}M
              </div>
              <p className="text-xs text-secondary-500">训练数据量</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={300}>
          <EnhancedCard variant="glass" interactive>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">活跃推荐</CardTitle>
              <Sparkles className="h-4 w-4 text-traditional-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-traditional-gold">{recommendations.length}</div>
              <p className="text-xs text-secondary-500">当前可用推荐</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={450}>
          <EnhancedCard variant="glass" interactive>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">最后训练</CardTitle>
              <RefreshCw className="h-4 w-4 text-traditional-jade" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-traditional-jade">
                {Math.floor((Date.now() - engineStatus.lastTrained.getTime()) / (1000 * 60 * 60 * 24))}天前
              </div>
              <p className="text-xs text-secondary-500">模型更新时间</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>
      </div>

      {/* 主要推荐内容 */}
      <EnhancedCard variant="traditional" size="lg">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recommendations">智能推荐</TabsTrigger>
            <TabsTrigger value="segments">用户分群</TabsTrigger>
            <TabsTrigger value="settings">引擎设置</TabsTrigger>
          </TabsList>

          {/* 智能推荐 */}
          <TabsContent value="recommendations" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold">AI智能推荐</h3>
                <p className="text-sm text-secondary-600">基于用户行为和业务数据的个性化推荐</p>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类别</SelectItem>
                    <SelectItem value="销售优化">销售优化</SelectItem>
                    <SelectItem value="内容营销">内容营销</SelectItem>
                    <SelectItem value="营销优化">营销优化</SelectItem>
                    <SelectItem value="用户体验">用户体验</SelectItem>
                  </SelectContent>
                </Select>
                <EnhancedButton
                  variant="primary"
                  size="sm"
                  onClick={handleGenerateRecommendations}
                  disabled={isGenerating}
                  glowEffect
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      生成推荐
                    </>
                  )}
                </EnhancedButton>
              </div>
            </div>

            {/* 置信度筛选 */}
            <div className="flex items-center space-x-4 p-4 bg-secondary-50 rounded-lg">
              <span className="text-sm font-medium">置信度阈值:</span>
              <div className="flex-1 max-w-xs">
                <Slider
                  value={confidenceThreshold}
                  onValueChange={setConfidenceThreshold}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
              </div>
              <span className="text-sm text-secondary-600">{confidenceThreshold[0]}%</span>
            </div>

            <div className="grid gap-4">
              {filteredRecommendations.map((recommendation, index) => (
                <AnimatedContainer key={recommendation.id} animation="slideUp" delay={index * 100}>
                  <EnhancedCard variant="glass" className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-lg">{recommendation.title}</h4>
                          <Badge variant="outline" className={getImpactColor(recommendation.impact)}>
                            {recommendation.impact === "high" ? "高影响" : recommendation.impact === "medium" ? "中影响" : "低影响"}
                          </Badge>
                          <Badge variant="outline" className={getDifficultyColor(recommendation.metadata.difficulty)}>
                            {recommendation.metadata.difficulty === "easy" ? "简单" : recommendation.metadata.difficulty === "medium" ? "中等" : "困难"}
                          </Badge>
                        </div>
                        <p className="text-secondary-600 mb-3">{recommendation.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-secondary-500 mb-4">
                          <span>置信度: {Math.round(recommendation.confidence * 100)}%</span>
                          <span>预期ROI: {recommendation.metadata.estimatedROI}%</span>
                          <span>实施时间: {recommendation.metadata.timeToImplement}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRecommendationFeedback(recommendation.id, "positive")}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRecommendationFeedback(recommendation.id, "negative")}
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h5 className="font-medium mb-2">目标受众</h5>
                      <div className="flex flex-wrap gap-1">
                        {recommendation.targetAudience.map((audience, audienceIndex) => (
                          <Badge key={audienceIndex} variant="secondary" className="text-xs">
                            {audience}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <h5 className="font-medium mb-2">预期结果</h5>
                      <p className="text-sm text-secondary-600">{recommendation.expectedOutcome}</p>
                    </div>

                    <div className="mb-4">
                      <h5 className="font-medium mb-2">推荐理由</h5>
                      <ul className="text-sm text-secondary-600 space-y-1">
                        {recommendation.reasoning.map((reason, reasonIndex) => (
                          <li key={reasonIndex} className="flex items-start space-x-2">
                            <span className="text-primary-500 mt-1">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {recommendation.actions.map((action) => (
                        <EnhancedButton
                          key={action.id}
                          variant="outline"
                          size="sm"
                          onClick={action.action}
                          className="text-xs"
                        >
                          <action.icon className="w-3 h-3 mr-1" />
                          {action.title}
                        </EnhancedButton>
                      ))}
                    </div>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 用户分群 */}
          <TabsContent value="segments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">用户分群分析</h3>
              <Badge variant="outline" className="bg-primary-50 text-primary-600">
                {userSegments.length} 个用户群体
              </Badge>
            </div>

            <div className="grid gap-4">
              {userSegments.map((segment, index) => (
                <AnimatedContainer key={segment.id} animation="slideRight" delay={index * 100}>
                  <EnhancedCard variant="glass" className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-lg">{segment.name}</h4>
                        <p className="text-sm text-secondary-600">{segment.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary-500">{segment.size}</div>
                        <div className="text-xs text-secondary-500">用户数量</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <h5 className="font-medium mb-2">用户特征</h5>
                        <div className="flex flex-wrap gap-1">
                          {segment.characteristics.map((char, charIndex) => (
                            <Badge key={charIndex} variant="outline" className="text-xs">
                              {char}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">偏好设置</h5>
                        <div className="flex flex-wrap gap-1">
                          {segment.preferences.map((pref, prefIndex) => (
                            <Badge key={prefIndex} variant="secondary" className="text-xs">
                              {pref}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">行为数据</h5>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>平均会话时长:</span>
                            <span className="font-medium">{segment.behavior.avgSessionTime}分钟</span>
                          </div>
                          <div className="flex justify-between">
                            <span>转化率:</span>
                            <span className="font-medium">{segment.behavior.conversionRate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>生命周期价值:</span>
                            <span className="font-medium">¥{segment.behavior.lifetimeValue}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm">
                        <Target className="w-3 h-3 mr-1" />
                        创建营销活动
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        发送消息
                      </Button>
                    </div>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 引擎设置 */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid gap-4">
              <EnhancedCard variant="glass" className="p-4">
                <h4 className="font-medium mb-3">推荐算法设置</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">启用协同过滤</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">内容基础推荐</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">深度学习增强</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">实时学习</span>
                    <Switch />
                  </div>
                </div>
              </EnhancedCard>

              <EnhancedCard variant="glass" className="p-4">
                <h4 className="font-medium mb-3">数据源配置</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">用户行为数据</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">交易历史数据</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">内容互动数据</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">外部数据源</span>
                    <Switch />
                  </div>
                </div>
              </EnhancedCard>

              <EnhancedCard variant="glass" className="p-4">
                <h4 className="font-medium mb-3">模型训练</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>当前算法: {engineStatus.algorithm}</span>
                      <span>准确率: {Math.round(engineStatus.accuracy * 100)}%</span>
                    </div>
                    <Progress value={engineStatus.accuracy * 100} className="h-2" />
                  </div>
                  <div className="flex space-x-2">
                    <EnhancedButton variant="primary" size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      重新训练模型
                    </EnhancedButton>
                    <EnhancedButton variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      导出模型
                    </EnhancedButton>
                  </div>
                </div>
              </EnhancedCard>
            </div>
          </TabsContent>
        </Tabs>
      </EnhancedCard>
    </div>
  )
}
