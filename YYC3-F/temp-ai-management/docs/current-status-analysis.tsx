"use client"

import { useState } from "react"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Code,
  Zap,
  Target,
  AlertCircle,
  Info,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react"

import { EnhancedCard } from "../components/design-system/enhanced-card-system"
import { AnimatedContainer } from "../components/design-system/animation-system"

interface StatusItem {
  category: string
  item: string
  status: "completed" | "in-progress" | "planned" | "blocked" | "not-started"
  progress: number
  priority: "high" | "medium" | "low"
  description: string
  technicalDebt?: string
  risks?: string[]
  dependencies?: string[]
}

interface AnalysisMetric {
  name: string
  current: number
  target: number
  unit: string
  trend: "up" | "down" | "stable"
  category: "performance" | "quality" | "security" | "usability"
}

export function CurrentStatusAnalysis() {
  const [activeTab, setActiveTab] = useState("overview")

  // 当前系统状态评估
  const systemStatus: StatusItem[] = [
    // 前端开发状态
    {
      category: "前端架构",
      item: "UI设计系统",
      status: "completed",
      progress: 95,
      priority: "high",
      description: "完整的设计令牌系统、组件库、响应式布局",
      technicalDebt: "部分组件需要性能优化，缺少单元测试",
    },
    {
      category: "前端架构",
      item: "状态管理",
      status: "in-progress",
      progress: 60,
      priority: "high",
      description: "使用React useState，需要升级到全局状态管理",
      technicalDebt: "缺少统一的状态管理方案，组件间通信复杂",
      risks: ["状态同步问题", "性能瓶颈", "维护困难"],
    },
    {
      category: "前端架构",
      item: "路由系统",
      status: "planned",
      progress: 20,
      priority: "medium",
      description: "基于菜单的简单路由，需要完整的路由管理",
      dependencies: ["状态管理完善"],
    },

    // 后端开发状态
    {
      category: "后端架构",
      item: "API服务",
      status: "not-started",
      progress: 0,
      priority: "high",
      description: "目前只有前端模拟数据，缺少真实API服务",
      risks: ["数据持久化缺失", "业务逻辑无法验证", "性能无法测试"],
    },
    {
      category: "后端架构",
      item: "数据库设计",
      status: "not-started",
      progress: 0,
      priority: "high",
      description: "需要设计完整的数据库schema和关系模型",
      dependencies: ["需求分析完成", "数据模型设计"],
    },
    {
      category: "后端架构",
      item: "实时通信",
      status: "planned",
      progress: 10,
      priority: "high",
      description: "前端有WebSocket接口，但缺少后端实现",
      technicalDebt: "需要选择合适的实时通信方案",
    },

    // 核心功能状态
    {
      category: "核心功能",
      item: "数据中心",
      status: "in-progress",
      progress: 40,
      priority: "high",
      description: "前端界面完成，但数据都是模拟的",
      risks: ["缺少真实数据验证", "业务逻辑不完整"],
    },
    {
      category: "核心功能",
      item: "实时协作",
      status: "in-progress",
      progress: 30,
      priority: "high",
      description: "UI界面完成，缺少实际的协作逻辑",
      technicalDebt: "冲突解决算法未实现，版本控制缺失",
    },
    {
      category: "核心功能",
      item: "微信集成",
      status: "in-progress",
      progress: 25,
      priority: "medium",
      description: "分享界面完成，缺少微信API集成",
      dependencies: ["微信开发者账号", "小程序开发"],
    },

    // 安全与认证
    {
      category: "安全认证",
      item: "用户认证",
      status: "not-started",
      progress: 0,
      priority: "high",
      description: "缺少完整的用户认证和授权系统",
      risks: ["安全漏洞", "数据泄露风险", "合规问题"],
    },
    {
      category: "安全认证",
      item: "权限管理",
      status: "planned",
      progress: 5,
      priority: "high",
      description: "前端有权限展示，但缺少后端验证",
      dependencies: ["用户认证系统"],
    },
    {
      category: "安全认证",
      item: "数据加密",
      status: "not-started",
      progress: 0,
      priority: "medium",
      description: "需要实现数据传输和存储加密",
    },

    // 性能与优化
    {
      category: "性能优化",
      item: "代码分割",
      status: "planned",
      progress: 15,
      priority: "medium",
      description: "Next.js自动代码分割，需要进一步优化",
      technicalDebt: "大型组件需要懒加载",
    },
    {
      category: "性能优化",
      item: "缓存策略",
      status: "not-started",
      progress: 0,
      priority: "medium",
      description: "缺少前端和后端缓存策略",
    },

    // 测试与质量
    {
      category: "测试质量",
      item: "单元测试",
      status: "not-started",
      progress: 0,
      priority: "medium",
      description: "缺少自动化测试覆盖",
    },
    {
      category: "测试质量",
      item: "集成测试",
      status: "not-started",
      progress: 0,
      priority: "medium",
      description: "需要端到端测试方案",
    },

    // 部署与运维
    {
      category: "部署运维",
      item: "CI/CD流水线",
      status: "not-started",
      progress: 0,
      priority: "medium",
      description: "需要自动化部署流程",
    },
    {
      category: "部署运维",
      item: "监控告警",
      status: "not-started",
      progress: 0,
      priority: "low",
      description: "缺少系统监控和告警机制",
    },
  ]

  // 技术指标分析
  const analysisMetrics: AnalysisMetric[] = [
    {
      name: "代码完成度",
      current: 35,
      target: 90,
      unit: "%",
      trend: "up",
      category: "quality",
    },
    {
      name: "功能覆盖率",
      current: 25,
      target: 85,
      unit: "%",
      trend: "up",
      category: "quality",
    },
    {
      name: "测试覆盖率",
      current: 0,
      target: 80,
      unit: "%",
      trend: "stable",
      category: "quality",
    },
    {
      name: "安全评分",
      current: 20,
      target: 95,
      unit: "/100",
      trend: "down",
      category: "security",
    },
    {
      name: "性能评分",
      current: 60,
      target: 90,
      unit: "/100",
      trend: "stable",
      category: "performance",
    },
    {
      name: "用户体验",
      current: 75,
      target: 95,
      unit: "/100",
      trend: "up",
      category: "usability",
    },
  ]

  // 风险评估
  const riskAssessment = [
    {
      risk: "技术债务积累",
      level: "high",
      impact: "开发效率下降，维护成本增加",
      mitigation: "重构核心组件，建立代码规范",
      timeline: "2-4周",
    },
    {
      risk: "安全漏洞",
      level: "high",
      impact: "数据泄露，合规风险",
      mitigation: "实施安全认证，数据加密",
      timeline: "4-6周",
    },
    {
      risk: "性能瓶颈",
      level: "medium",
      impact: "用户体验差，系统不稳定",
      mitigation: "性能优化，缓存策略",
      timeline: "3-5周",
    },
    {
      risk: "缺少测试",
      level: "medium",
      impact: "代码质量无保障，bug频发",
      mitigation: "建立测试体系，自动化测试",
      timeline: "2-3周",
    },
    {
      risk: "团队协作",
      level: "low",
      impact: "开发效率低，沟通成本高",
      mitigation: "建立开发流程，代码审查",
      timeline: "1-2周",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-traditional-jade text-white"
      case "in-progress":
        return "bg-primary-500 text-white"
      case "planned":
        return "bg-accent-500 text-white"
      case "blocked":
        return "bg-traditional-crimson text-white"
      case "not-started":
        return "bg-secondary-400 text-white"
      default:
        return "bg-secondary-400 text-white"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />
      case "in-progress":
        return <Clock className="w-4 h-4" />
      case "planned":
        return <Target className="w-4 h-4" />
      case "blocked":
        return <XCircle className="w-4 h-4" />
      case "not-started":
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Info className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-traditional-crimson"
      case "medium":
        return "text-traditional-gold"
      case "low":
        return "text-traditional-jade"
      default:
        return "text-secondary-500"
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high":
        return "border-traditional-crimson bg-red-50"
      case "medium":
        return "border-traditional-gold bg-yellow-50"
      case "low":
        return "border-traditional-jade bg-green-50"
      default:
        return "border-secondary-300 bg-secondary-50"
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-traditional-jade" />
      case "down":
        return <TrendingDown className="w-4 h-4 text-traditional-crimson" />
      case "stable":
        return <Activity className="w-4 h-4 text-secondary-500" />
      default:
        return <Activity className="w-4 h-4 text-secondary-500" />
    }
  }

  // 计算整体完成度
  const overallProgress = Math.round(systemStatus.reduce((sum, item) => sum + item.progress, 0) / systemStatus.length)

  const completedItems = systemStatus.filter((item) => item.status === "completed").length
  const inProgressItems = systemStatus.filter((item) => item.status === "in-progress").length
  const notStartedItems = systemStatus.filter((item) => item.status === "not-started").length

  return (
    <div className="space-y-6">
      {/* 整体状态概览 */}
      <div className="grid gap-4 md:grid-cols-4">
        <AnimatedContainer animation="slideUp" delay={0}>
          <EnhancedCard variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-primary-500" />
                <span>整体进度</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary-500">{overallProgress}%</div>
              <Progress value={overallProgress} className="mt-2 h-2" />
              <p className="text-xs text-secondary-500 mt-1">系统完成度</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={150}>
          <EnhancedCard variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-traditional-jade" />
                <span>已完成</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-traditional-jade">{completedItems}</div>
              <p className="text-xs text-secondary-500">功能模块</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={300}>
          <EnhancedCard variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Clock className="w-4 h-4 text-accent-500" />
                <span>进行中</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent-500">{inProgressItems}</div>
              <p className="text-xs text-secondary-500">开发中</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={450}>
          <EnhancedCard variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-traditional-crimson" />
                <span>待开始</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-traditional-crimson">{notStartedItems}</div>
              <p className="text-xs text-secondary-500">未开始</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>
      </div>

      {/* 详细分析 */}
      <EnhancedCard variant="traditional" size="lg">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">现状概览</TabsTrigger>
            <TabsTrigger value="detailed">详细状态</TabsTrigger>
            <TabsTrigger value="metrics">技术指标</TabsTrigger>
            <TabsTrigger value="risks">风险评估</TabsTrigger>
            <TabsTrigger value="recommendations">改进建议</TabsTrigger>
          </TabsList>

          {/* 现状概览 */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* 按类别统计 */}
              <EnhancedCard variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>开发进度分布</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(
                      systemStatus.reduce(
                        (acc, item) => {
                          if (!acc[item.category]) acc[item.category] = []
                          acc[item.category].push(item)
                          return acc
                        },
                        {} as Record<string, StatusItem[]>,
                      ),
                    ).map(([category, items]) => {
                      const avgProgress = Math.round(items.reduce((sum, item) => sum + item.progress, 0) / items.length)
                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{category}</span>
                            <span>{avgProgress}%</span>
                          </div>
                          <Progress value={avgProgress} className="h-2" />
                          <div className="text-xs text-secondary-500">{items.length} 个模块</div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </EnhancedCard>

              {/* 优先级分布 */}
              <EnhancedCard variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>优先级分析</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {["high", "medium", "low"].map((priority) => {
                      const items = systemStatus.filter((item) => item.priority === priority)
                      const completed = items.filter((item) => item.status === "completed").length
                      const total = items.length
                      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

                      return (
                        <div key={priority} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  priority === "high"
                                    ? "bg-traditional-crimson"
                                    : priority === "medium"
                                      ? "bg-traditional-gold"
                                      : "bg-traditional-jade"
                                }`}
                              />
                              <span className="text-sm font-medium capitalize">{priority} Priority</span>
                            </div>
                            <span className="text-sm">
                              {completed}/{total}
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </EnhancedCard>
            </div>

            {/* 关键问题总结 */}
            <EnhancedCard variant="glass" className="border-traditional-crimson/30">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-traditional-crimson">
                  <AlertTriangle className="w-5 h-5" />
                  <span>关键问题识别</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-medium text-sm text-red-800 mb-2">🚨 高优先级缺失</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• 缺少后端API服务</li>
                      <li>• 没有用户认证系统</li>
                      <li>• 数据库设计未开始</li>
                      <li>• 实时通信未实现</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-medium text-sm text-yellow-800 mb-2">⚠️ 技术债务</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• 状态管理方案不统一</li>
                      <li>• 缺少自动化测试</li>
                      <li>• 组件性能需优化</li>
                      <li>• 代码规范待建立</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>

          {/* 详细状态 */}
          <TabsContent value="detailed" className="space-y-4">
            <div className="space-y-3">
              {systemStatus.map((item, index) => (
                <AnimatedContainer key={`${item.category}-${item.item}`} animation="slideRight" delay={index * 50}>
                  <EnhancedCard variant="glass" className="p-4">
                    <div className="space-y-3">
                      {/* 状态头部 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-1 bg-secondary-100 rounded">{getStatusIcon(item.status)}</div>
                          <div>
                            <h4 className="font-medium text-sm">
                              {item.category} - {item.item}
                            </h4>
                            <p className="text-xs text-secondary-600">{item.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getPriorityColor(item.priority)} variant="outline">
                            {item.priority}
                          </Badge>
                          <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                        </div>
                      </div>

                      {/* 进度条 */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>完成进度</span>
                          <span className="font-medium">{item.progress}%</span>
                        </div>
                        <Progress value={item.progress} className="h-1.5" />
                      </div>

                      {/* 详细信息 */}
                      {(item.technicalDebt || item.risks || item.dependencies) && (
                        <div className="grid gap-2 md:grid-cols-3 text-xs">
                          {item.technicalDebt && (
                            <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                              <div className="font-medium text-yellow-800 mb-1">技术债务</div>
                              <div className="text-yellow-700">{item.technicalDebt}</div>
                            </div>
                          )}

                          {item.risks && (
                            <div className="p-2 bg-red-50 rounded border border-red-200">
                              <div className="font-medium text-red-800 mb-1">风险点</div>
                              <ul className="text-red-700 space-y-0.5">
                                {item.risks.map((risk, i) => (
                                  <li key={i}>• {risk}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {item.dependencies && (
                            <div className="p-2 bg-blue-50 rounded border border-blue-200">
                              <div className="font-medium text-blue-800 mb-1">依赖项</div>
                              <ul className="text-blue-700 space-y-0.5">
                                {item.dependencies.map((dep, i) => (
                                  <li key={i}>• {dep}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 技术指标 */}
          <TabsContent value="metrics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {analysisMetrics.map((metric, index) => (
                <AnimatedContainer key={metric.name} animation="slideUp" delay={index * 100}>
                  <EnhancedCard variant="glass" className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-sm">{metric.name}</h4>
                        {getTrendIcon(metric.trend)}
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {metric.category}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary-600">当前值</span>
                        <span className="font-medium">
                          {metric.current}
                          {metric.unit}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary-600">目标值</span>
                        <span className="font-medium text-traditional-jade">
                          {metric.target}
                          {metric.unit}
                        </span>
                      </div>
                      <Progress value={(metric.current / metric.target) * 100} className="h-2" />
                      <div className="text-xs text-secondary-500">
                        差距: {metric.target - metric.current}
                        {metric.unit}
                      </div>
                    </div>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>

            {/* 技术栈健康度 */}
            <EnhancedCard variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Code className="w-5 h-5" />
                  <span>技术栈健康度评估</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { name: "前端技术栈", score: 85, status: "良好", issues: ["状态管理待优化", "测试覆盖不足"] },
                    {
                      name: "后端技术栈",
                      score: 15,
                      status: "严重不足",
                      issues: ["API服务缺失", "数据库未设计", "认证系统缺失"],
                    },
                    {
                      name: "基础设施",
                      score: 25,
                      status: "需要改进",
                      issues: ["CI/CD未建立", "监控缺失", "部署流程不完善"],
                    },
                  ].map((stack) => (
                    <div key={stack.name} className="p-4 bg-white/50 rounded-lg border border-secondary-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{stack.name}</h4>
                        <Badge
                          variant={stack.score >= 70 ? "default" : stack.score >= 40 ? "secondary" : "destructive"}
                        >
                          {stack.status}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold mb-2 text-center">{stack.score}/100</div>
                      <Progress value={stack.score} className="h-2 mb-3" />
                      <div className="space-y-1">
                        {stack.issues.map((issue, i) => (
                          <div key={i} className="text-xs text-secondary-600 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1 text-traditional-crimson" />
                            {issue}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>

          {/* 风险评估 */}
          <TabsContent value="risks" className="space-y-4">
            <div className="space-y-3">
              {riskAssessment.map((risk, index) => (
                <AnimatedContainer key={risk.risk} animation="slideLeft" delay={index * 100}>
                  <EnhancedCard variant="glass" className={`p-4 border-2 ${getRiskColor(risk.level)}`}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{risk.risk}</h4>
                        <Badge
                          variant={
                            risk.level === "high" ? "destructive" : risk.level === "medium" ? "secondary" : "default"
                          }
                        >
                          {risk.level} Risk
                        </Badge>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <h5 className="font-medium text-sm mb-1">影响分析</h5>
                          <p className="text-sm text-secondary-600">{risk.impact}</p>
                        </div>
                        <div>
                          <h5 className="font-medium text-sm mb-1">缓解措施</h5>
                          <p className="text-sm text-secondary-600">{risk.mitigation}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-secondary-600">预计解决时间</span>
                        <Badge variant="outline">{risk.timeline}</Badge>
                      </div>
                    </div>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 改进建议 */}
          <TabsContent value="recommendations" className="space-y-4">
            <div className="grid gap-4">
              {/* 立即行动项 */}
              <EnhancedCard variant="glass" className="border-traditional-crimson/30">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-traditional-crimson">
                    <Zap className="w-5 h-5" />
                    <span>立即行动项 (1-2周)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { action: "建立后端API服务", priority: "P0", effort: "高", impact: "关键业务功能实现" },
                      { action: "实现用户认证系统", priority: "P0", effort: "中", impact: "系统安全基础" },
                      { action: "设计数据库Schema", priority: "P0", effort: "中", impact: "数据持久化支持" },
                      { action: "建立代码规范", priority: "P1", effort: "低", impact: "提升代码质量" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.action}</div>
                          <div className="text-xs text-secondary-600">{item.impact}</div>
                        </div>
                        <div className="flex space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {item.priority}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {item.effort}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </EnhancedCard>

              {/* 短期目标 */}
              <EnhancedCard variant="glass" className="border-traditional-gold/30">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-traditional-gold">
                    <Target className="w-5 h-5" />
                    <span>短期目标 (3-4周)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { action: "完善实时协作功能", priority: "P1", effort: "高", impact: "核心功能完整性" },
                      { action: "实现微信小程序集成", priority: "P1", effort: "中", impact: "移动端用户体验" },
                      { action: "建立自动化测试", priority: "P1", effort: "中", impact: "代码质量保障" },
                      { action: "性能优化和缓存", priority: "P2", effort: "中", impact: "用户体验提升" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.action}</div>
                          <div className="text-xs text-secondary-600">{item.impact}</div>
                        </div>
                        <div className="flex space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {item.priority}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {item.effort}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </EnhancedCard>

              {/* 中长期规划 */}
              <EnhancedCard variant="glass" className="border-traditional-jade/30">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-traditional-jade">
                    <Settings className="w-5 h-5" />
                    <span>中长期规划 (2-3个月)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { action: "AI智能分析引擎", priority: "P2", effort: "高", impact: "产品差异化优势" },
                      { action: "企业级安全认证", priority: "P1", effort: "中", impact: "商业化准备" },
                      { action: "移动端原生应用", priority: "P2", effort: "高", impact: "用户覆盖扩展" },
                      { action: "开放API平台", priority: "P2", effort: "中", impact: "生态系统建设" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.action}</div>
                          <div className="text-xs text-secondary-600">{item.impact}</div>
                        </div>
                        <div className="flex space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {item.priority}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {item.effort}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </EnhancedCard>
            </div>
          </TabsContent>
        </Tabs>
      </EnhancedCard>
    </div>
  )
}
