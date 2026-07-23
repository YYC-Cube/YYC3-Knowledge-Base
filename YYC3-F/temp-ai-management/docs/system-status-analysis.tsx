"use client"

import { useState } from "react"
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
  Code,
  Zap,
  Target,
  Calendar,
  BarChart3,
  PieChart,
  FileText,
  Settings,
  Lightbulb,
  ArrowRight,
  Plus,
  Equal,
} from "lucide-react"

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { EnhancedCard } from "../components/design-system/enhanced-card-system"
import { AnimatedContainer } from "../components/design-system/animation-system"

export function SystemStatusAnalysis() {
  const [selectedCategory, setSelectedCategory] = useState("all")

  // 系统现状统计
  const systemStats = {
    totalComponents: 156,
    completedComponents: 89,
    inProgressComponents: 34,
    plannedComponents: 33,
    completionRate: 57.1,
    codeLines: 45280,
    testCoverage: 78.5,
    performanceScore: 92.3,
  }

  // 功能模块状态
  const moduleStatus = [
    {
      name: "用户管理",
      status: "completed",
      progress: 100,
      components: 6,
      features: ["用户列表", "用户详情", "新增用户", "角色权限", "用户配置", "封禁管理"],
      priority: "high",
      lastUpdate: "2024-01-21",
    },
    {
      name: "数据分析",
      status: "completed",
      progress: 100,
      components: 6,
      features: ["数据概览", "用户分析", "业务分析", "报表中心", "实时监控", "数据预警"],
      priority: "high",
      lastUpdate: "2024-01-21",
    },
    {
      name: "智能引擎",
      status: "completed",
      progress: 100,
      components: 6,
      features: ["AI智能", "机器学习", "数据挖掘", "存储管理", "开发环境", "知识智库"],
      priority: "high",
      lastUpdate: "2024-01-21",
    },
    {
      name: "商务功能",
      status: "in-progress",
      progress: 33,
      components: 6,
      features: ["商务管理", "财务管理", "订单管理", "ERP系统", "CRM客户", "供应链"],
      priority: "medium",
      lastUpdate: "2024-01-21",
    },
    {
      name: "系统设置",
      status: "planned",
      progress: 0,
      components: 6,
      features: ["常规设置", "安全设置", "权限管理", "隐私设置", "通知设置", "外观设置"],
      priority: "medium",
      lastUpdate: "未开始",
    },
    {
      name: "项目管理",
      status: "planned",
      progress: 0,
      components: 6,
      features: ["项目概览", "任务管理", "开发执行", "敏捷工作流", "CI/CD流水线", "开发路线图"],
      priority: "low",
      lastUpdate: "未开始",
    },
    {
      name: "个人资料",
      status: "planned",
      progress: 0,
      components: 6,
      features: ["基本信息", "编辑资料", "头像设置", "联系方式", "地址信息", "账户安全"],
      priority: "low",
      lastUpdate: "未开始",
    },
  ]

  // 技术债务分析
  const technicalDebt = [
    {
      category: "代码质量",
      issues: 12,
      severity: "medium",
      description: "部分组件需要重构优化",
      impact: "维护性",
    },
    {
      category: "性能优化",
      issues: 8,
      severity: "low",
      description: "可进一步优化加载速度",
      impact: "用户体验",
    },
    {
      category: "测试覆盖",
      issues: 15,
      severity: "high",
      description: "需要增加单元测试和集成测试",
      impact: "代码质量",
    },
    {
      category: "文档完善",
      issues: 23,
      severity: "medium",
      description: "API文档和组件文档需要完善",
      impact: "开发效率",
    },
  ]

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "in-progress":
        return <Clock className="w-5 h-5 text-blue-600" />
      case "planned":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case "blocked":
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Activity className="w-5 h-5 text-gray-600" />
    }
  }

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: "已完成", className: "bg-green-100 text-green-800" },
      "in-progress": { label: "进行中", className: "bg-blue-100 text-blue-800" },
      planned: { label: "计划中", className: "bg-yellow-100 text-yellow-800" },
      blocked: { label: "阻塞", className: "bg-red-100 text-red-800" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planned
    return <Badge className={config.className}>{config.label}</Badge>
  }

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-50"
      case "medium":
        return "text-yellow-600 bg-yellow-50"
      case "low":
        return "text-green-600 bg-green-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  // 获取严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-600"
      case "medium":
        return "text-yellow-600"
      case "low":
        return "text-green-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* 系统概览 */}
      <AnimatedContainer animation="fadeIn">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-2">
            YanYu Cloud³ 系统现状分析报告
          </h1>
          <p className="text-muted-foreground text-lg">全面分析系统当前开发状态、功能完成度和技术指标</p>
          <div className="flex items-center space-x-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>生成时间: {new Date().toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <FileText className="w-4 h-4" />
              <span>版本: v1.0.0</span>
            </div>
          </div>
        </div>

        {/* 核心指标 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <EnhancedCard variant="modern" glowEffect>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Code className="w-6 h-6 text-blue-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">总组件数</p>
                <p className="text-3xl font-bold">{systemStats.totalComponents}</p>
                <p className="text-xs text-green-600">+23 本周新增</p>
              </div>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">完成率</p>
                <p className="text-3xl font-bold">{systemStats.completionRate}%</p>
                <Progress value={systemStats.completionRate} className="h-2" />
              </div>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">代码行数</p>
                <p className="text-3xl font-bold">{systemStats.codeLines.toLocaleString()}</p>
                <p className="text-xs text-green-600">+2.1K 本周</p>
              </div>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-50 rounded-lg">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">性能评分</p>
                <p className="text-3xl font-bold">{systemStats.performanceScore}</p>
                <p className="text-xs text-green-600">优秀</p>
              </div>
            </CardContent>
          </EnhancedCard>
        </div>
      </AnimatedContainer>

      {/* 详细分析 */}
      <AnimatedContainer animation="slideUp" delay={200}>
        <Tabs defaultValue="modules" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="modules">功能模块</TabsTrigger>
            <TabsTrigger value="progress">开发进度</TabsTrigger>
            <TabsTrigger value="quality">代码质量</TabsTrigger>
            <TabsTrigger value="recommendations">改进建议</TabsTrigger>
          </TabsList>

          {/* 功能模块状态 */}
          <TabsContent value="modules" className="space-y-6">
            <EnhancedCard variant="traditional" glowEffect>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>功能模块开发状态</span>
                </CardTitle>
                <CardDescription>各功能模块的详细开发进度和状态分析</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {moduleStatus.map((module, index) => (
                    <AnimatedContainer key={module.name} animation="slideRight" delay={index * 100}>
                      <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(module.status)}
                            <div>
                              <h3 className="font-semibold text-lg">{module.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {module.components} 个组件 • 最后更新: {module.lastUpdate}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(module.status)}
                            <Badge className={getPriorityColor(module.priority)} variant="secondary">
                              {module.priority === "high"
                                ? "高优先级"
                                : module.priority === "medium"
                                  ? "中优先级"
                                  : "低优先级"}
                            </Badge>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span>完成进度</span>
                            <span className="font-medium">{module.progress}%</span>
                          </div>
                          <Progress value={module.progress} className="h-3" />
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">包含功能:</h4>
                          <div className="flex flex-wrap gap-2">
                            {module.features.map((feature, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </AnimatedContainer>
                  ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>

          {/* 开发进度 */}
          <TabsContent value="progress" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PieChart className="w-5 h-5" />
                    <span>整体进度分布</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>已完成</span>
                        </span>
                        <span className="font-medium">{systemStats.completedComponents} 个</span>
                      </div>
                      <Progress
                        value={(systemStats.completedComponents / systemStats.totalComponents) * 100}
                        className="h-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span>进行中</span>
                        </span>
                        <span className="font-medium">{systemStats.inProgressComponents} 个</span>
                      </div>
                      <Progress
                        value={(systemStats.inProgressComponents / systemStats.totalComponents) * 100}
                        className="h-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <span>计划中</span>
                        </span>
                        <span className="font-medium">{systemStats.plannedComponents} 个</span>
                      </div>
                      <Progress
                        value={(systemStats.plannedComponents / systemStats.totalComponents) * 100}
                        className="h-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>

              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>里程碑进度</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium">核心功能开发</span>
                      </div>
                      <Badge className="bg-green-100 text-green-800">已完成</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">业务功能扩展</span>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">进行中</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <span className="font-medium">系统优化</span>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">计划中</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-5 h-5 text-gray-600" />
                        <span className="font-medium">生产部署</span>
                      </div>
                      <Badge variant="outline">待定</Badge>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </div>
          </TabsContent>

          {/* 代码质量 */}
          <TabsContent value="quality" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>质量指标</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>测试覆盖率</span>
                        <span className="font-medium">{systemStats.testCoverage}%</span>
                      </div>
                      <Progress value={systemStats.testCoverage} className="h-2" />
                      <p className="text-xs text-muted-foreground">目标: 85%</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>代码复杂度</span>
                        <span className="font-medium text-green-600">良好</span>
                      </div>
                      <Progress value={75} className="h-2" />
                      <p className="text-xs text-muted-foreground">平均圈复杂度: 3.2</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>代码重复率</span>
                        <span className="font-medium text-green-600">5.2%</span>
                      </div>
                      <Progress value={5.2} className="h-2" />
                      <p className="text-xs text-muted-foreground">目标: &lt; 10%</p>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>

              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>技术债务</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {technicalDebt.map((debt, index) => (
                      <div key={debt.category} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{debt.category}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{debt.issues} 个问题</Badge>
                            <span className={`text-sm font-medium ${getSeverityColor(debt.severity)}`}>
                              {debt.severity === "high" ? "高" : debt.severity === "medium" ? "中" : "低"}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{debt.description}</p>
                        <p className="text-xs text-muted-foreground">影响: {debt.impact}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </EnhancedCard>
            </div>
          </TabsContent>

          {/* 改进建议 */}
          <TabsContent value="recommendations" className="space-y-6">
            <EnhancedCard variant="traditional" glowEffect>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5" />
                  <span>系统改进建议</span>
                </CardTitle>
                <CardDescription>基于当前分析结果的优化建议和下一步行动计划</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 短期建议 */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4 flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span>短期优化 (1-2周)</span>
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <Plus className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium">完善商务功能模块</h4>
                          <p className="text-sm text-muted-foreground">
                            优先完成订单管理、ERP系统、CRM客户和供应链管理功能
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <Plus className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium">增加单元测试</h4>
                          <p className="text-sm text-muted-foreground">
                            将测试覆盖率从78.5%提升到85%以上，重点覆盖核心业务逻辑
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <Plus className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium">优化组件性能</h4>
                          <p className="text-sm text-muted-foreground">对数据量大的组件进行虚拟化处理，减少渲染时间</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 中期建议 */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4 flex items-center space-x-2">
                      <Target className="w-5 h-5 text-green-600" />
                      <span>中期规划 (1-2月)</span>
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                        <ArrowRight className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium">完成系统设置模块</h4>
                          <p className="text-sm text-muted-foreground">
                            实现常规设置、安全设置、权限管理等核心配置功能
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                        <ArrowRight className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium">建立CI/CD流水线</h4>
                          <p className="text-sm text-muted-foreground">自动化测试、构建和部署流程，提高开发效率</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                        <ArrowRight className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium">完善API文档</h4>
                          <p className="text-sm text-muted-foreground">使用OpenAPI规范生成完整的API文档和SDK</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 长期建议 */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4 flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                      <span>长期目标 (3-6月)</span>
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                        <Equal className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium">微服务架构重构</h4>
                          <p className="text-sm text-muted-foreground">
                            将单体应用拆分为微服务，提高系统可扩展性和维护性
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                        <Equal className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium">多租户支持</h4>
                          <p className="text-sm text-muted-foreground">实现SaaS多租户架构，支持企业级客户独立部署</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                        <Equal className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium">国际化支持</h4>
                          <p className="text-sm text-muted-foreground">添加多语言支持，扩展海外市场</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>
        </Tabs>
      </AnimatedContainer>
    </div>
  )
}
