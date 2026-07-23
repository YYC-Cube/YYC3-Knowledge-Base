"use client"

import { useState } from "react"
import {
  Calendar,
  Target,
  Zap,
  Users,
  Code,
  Rocket,
  CheckCircle,
  Clock,
  AlertTriangle,
  Star,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  Flag,
  Award,
  Activity,
} from "lucide-react"

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { EnhancedCard } from "../components/design-system/enhanced-card-system"
import { AnimatedContainer } from "../components/design-system/animation-system"

export function NextDevelopmentPlan() {
  const [selectedPhase, setSelectedPhase] = useState("phase1")

  // 开发阶段规划
  const developmentPhases = [
    {
      id: "phase1",
      name: "第一阶段：核心功能完善",
      duration: "2-3周",
      priority: "high",
      status: "in-progress",
      progress: 65,
      startDate: "2024-01-22",
      endDate: "2024-02-12",
      description: "完善现有核心功能模块，提升系统稳定性和用户体验",
      objectives: [
        "完成商务功能模块的所有组件开发",
        "实现系统设置模块的基础功能",
        "优化现有组件的性能和用户体验",
        "增加单元测试覆盖率到85%以上",
      ],
      deliverables: [
        "商务管理完整功能",
        "财务管理系统",
        "订单管理流程",
        "ERP基础模块",
        "CRM客户管理",
        "供应链管理",
        "系统设置界面",
        "测试报告",
      ],
      risks: [
        { risk: "第三方API集成复杂度", level: "medium", mitigation: "提前进行技术调研和原型验证" },
        { risk: "数据迁移兼容性", level: "low", mitigation: "建立完善的数据备份和回滚机制" },
      ],
    },
    {
      id: "phase2",
      name: "第二阶段：系统优化与扩展",
      duration: "3-4周",
      priority: "high",
      status: "planned",
      progress: 0,
      startDate: "2024-02-13",
      endDate: "2024-03-12",
      description: "系统性能优化，添加高级功能，完善用户体验",
      objectives: ["完成项目管理模块开发", "实现个人资料管理功能", "建立完整的权限管理体系", "优化系统性能和响应速度"],
      deliverables: ["项目管理工具", "任务跟踪系统", "个人资料管理", "权限控制系统", "性能优化报告", "用户体验改进"],
      risks: [
        { risk: "性能优化效果不达预期", level: "medium", mitigation: "制定详细的性能基准和监控指标" },
        { risk: "权限系统复杂度过高", level: "high", mitigation: "采用成熟的RBAC模型，分阶段实现" },
      ],
    },
    {
      id: "phase3",
      name: "第三阶段：高级特性开发",
      duration: "4-5周",
      priority: "medium",
      status: "planned",
      progress: 0,
      startDate: "2024-03-13",
      endDate: "2024-04-16",
      description: "开发高级特性，提升系统竞争力和用户粘性",
      objectives: ["实现AI智能推荐系统", "开发实时协作功能", "建立数据分析和报表系统", "添加移动端适配"],
      deliverables: ["AI推荐引擎", "实时协作工具", "高级数据分析", "移动端界面", "API文档", "SDK开发包"],
      risks: [
        { risk: "AI模型训练数据不足", level: "high", mitigation: "收集更多用户行为数据，使用预训练模型" },
        { risk: "实时协作性能瓶颈", level: "medium", mitigation: "采用WebSocket和Redis集群方案" },
        { risk: "移动端兼容性问题", level: "low", mitigation: "使用响应式设计和渐进式Web应用技术" },
      ],
    },
    {
      id: "phase4",
      name: "第四阶段：生产部署与运维",
      duration: "2-3周",
      priority: "high",
      status: "planned",
      progress: 0,
      startDate: "2024-04-17",
      endDate: "2024-05-07",
      description: "系统上线部署，建立运维监控体系，确保生产环境稳定运行",
      objectives: ["建立生产环境部署流程", "实现CI/CD自动化部署", "建立监控告警系统", "制定运维应急预案"],
      deliverables: ["生产环境配置", "CI/CD流水线", "监控告警系统", "运维文档", "应急预案", "性能基准报告"],
      risks: [
        { risk: "生产环境稳定性", level: "high", mitigation: "充分的压力测试和灰度发布策略" },
        { risk: "数据安全合规", level: "high", mitigation: "严格的安全审计和合规检查" },
        { risk: "用户迁移成本", level: "medium", mitigation: "提供详细的迁移指南和技术支持" },
      ],
    },
  ]

  // 技术栈升级计划
  const techStackUpgrades = [
    {
      category: "前端框架",
      current: "React 18 + Next.js 14",
      target: "React 19 + Next.js 15",
      priority: "medium",
      timeline: "Q2 2024",
      benefits: ["更好的并发特性", "改进的SSR性能", "新的编译器优化"],
    },
    {
      category: "状态管理",
      current: "React Context + useState",
      target: "Zustand + React Query",
      priority: "high",
      timeline: "Phase 2",
      benefits: ["更好的性能", "简化的状态逻辑", "内置缓存机制"],
    },
    {
      category: "UI组件库",
      current: "shadcn/ui + Tailwind CSS",
      target: "shadcn/ui v2 + Tailwind CSS v4",
      priority: "low",
      timeline: "Q3 2024",
      benefits: ["更多组件选择", "改进的设计系统", "更好的性能"],
    },
    {
      category: "数据库",
      current: "模拟数据",
      target: "PostgreSQL + Prisma ORM",
      priority: "high",
      timeline: "Phase 1",
      benefits: ["真实数据持久化", "类型安全", "数据库迁移管理"],
    },
    {
      category: "部署平台",
      current: "Vercel",
      target: "Vercel + Docker + Kubernetes",
      priority: "medium",
      timeline: "Phase 4",
      benefits: ["更好的扩展性", "容器化部署", "多环境管理"],
    },
  ]

  // 团队扩展计划
  const teamExpansion = [
    {
      role: "后端工程师",
      count: 2,
      priority: "high",
      timeline: "立即",
      responsibilities: ["API开发", "数据库设计", "系统架构"],
      skills: ["Node.js", "PostgreSQL", "Redis", "Docker"],
    },
    {
      role: "UI/UX设计师",
      count: 1,
      priority: "medium",
      timeline: "Phase 2",
      responsibilities: ["界面设计", "用户体验优化", "设计系统维护"],
      skills: ["Figma", "用户研究", "交互设计", "视觉设计"],
    },
    {
      role: "测试工程师",
      count: 1,
      priority: "medium",
      timeline: "Phase 2",
      responsibilities: ["自动化测试", "性能测试", "安全测试"],
      skills: ["Jest", "Cypress", "性能测试", "安全测试"],
    },
    {
      role: "DevOps工程师",
      count: 1,
      priority: "high",
      timeline: "Phase 3",
      responsibilities: ["CI/CD", "监控告警", "基础设施管理"],
      skills: ["Kubernetes", "监控系统", "云平台", "自动化部署"],
    },
  ]

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

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "in-progress":
        return <Clock className="w-5 h-5 text-blue-600" />
      case "planned":
        return <Calendar className="w-5 h-5 text-yellow-600" />
      case "blocked":
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      default:
        return <Activity className="w-5 h-5 text-gray-600" />
    }
  }

  // 获取风险等级颜色
  const getRiskColor = (level: string) => {
    switch (level) {
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
      {/* 计划概览 */}
      <AnimatedContainer animation="fadeIn">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-2">
            YanYu Cloud³ 下一步开发计划
          </h1>
          <p className="text-muted-foreground text-lg">基于现状分析的详细开发路线图和实施计划</p>
          <div className="flex items-center space-x-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>计划周期: 2024年1月 - 2024年5月</span>
            </div>
            <div className="flex items-center space-x-1">
              <Target className="w-4 h-4" />
              <span>总计: 4个开发阶段</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>预计团队规模: 8-12人</span>
            </div>
          </div>
        </div>

        {/* 阶段概览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {developmentPhases.map((phase, index) => (
            <AnimatedContainer key={phase.id} animation="slideUp" delay={index * 100}>
              <EnhancedCard
                variant="modern"
                glowEffect
                className={`cursor-pointer transition-all ${selectedPhase === phase.id ? "ring-2 ring-primary-500" : ""}`}
                onClick={() => setSelectedPhase(phase.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-primary-50 rounded-lg">{getStatusIcon(phase.status)}</div>
                    <Badge className={getPriorityColor(phase.priority)} variant="secondary">
                      {phase.priority === "high" ? "高优先级" : phase.priority === "medium" ? "中优先级" : "低优先级"}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">{phase.name}</h3>
                    <p className="text-xs text-muted-foreground">{phase.duration}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>进度</span>
                        <span>{phase.progress}%</span>
                      </div>
                      <Progress value={phase.progress} className="h-1.5" />
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </AnimatedContainer>
          ))}
        </div>
      </AnimatedContainer>

      {/* 详细计划 */}
      <AnimatedContainer animation="slideUp" delay={200}>
        <Tabs defaultValue="phases" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="phases">开发阶段</TabsTrigger>
            <TabsTrigger value="technology">技术升级</TabsTrigger>
            <TabsTrigger value="team">团队扩展</TabsTrigger>
            <TabsTrigger value="milestones">里程碑</TabsTrigger>
          </TabsList>

          {/* 开发阶段详情 */}
          <TabsContent value="phases" className="space-y-6">
            <EnhancedCard variant="traditional" glowEffect>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Rocket className="w-5 h-5" />
                  <span>阶段详细规划</span>
                </CardTitle>
                <CardDescription>每个开发阶段的具体目标、交付物和风险评估</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {developmentPhases.map((phase, index) => (
                    <AnimatedContainer key={phase.id} animation="slideRight" delay={index * 100}>
                      <div
                        className={`p-6 border-2 rounded-lg transition-all ${
                          selectedPhase === phase.id ? "border-primary-500 bg-primary-50/30" : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-white rounded-lg shadow-sm">{getStatusIcon(phase.status)}</div>
                            <div>
                              <h3 className="font-bold text-xl">{phase.name}</h3>
                              <p className="text-muted-foreground">{phase.description}</p>
                              <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                                <span>
                                  📅 {phase.startDate} - {phase.endDate}
                                </span>
                                <span>⏱️ {phase.duration}</span>
                                <Badge className={getPriorityColor(phase.priority)} variant="secondary">
                                  {phase.priority === "high"
                                    ? "高优先级"
                                    : phase.priority === "medium"
                                      ? "中优先级"
                                      : "低优先级"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary-600">{phase.progress}%</div>
                            <Progress value={phase.progress} className="w-24 h-2 mt-1" />
                          </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {/* 目标 */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center space-x-2">
                              <Target className="w-4 h-4 text-blue-600" />
                              <span>主要目标</span>
                            </h4>
                            <ul className="space-y-2">
                              {phase.objectives.map((objective, idx) => (
                                <li key={idx} className="flex items-start space-x-2 text-sm">
                                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span>{objective}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* 交付物 */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center space-x-2">
                              <Award className="w-4 h-4 text-purple-600" />
                              <span>主要交付物</span>
                            </h4>
                            <div className="space-y-2">
                              {phase.deliverables.map((deliverable, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                                  <span className="text-sm">{deliverable}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 风险评估 */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center space-x-2">
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                              <span>风险评估</span>
                            </h4>
                            <div className="space-y-3">
                              {phase.risks.map((riskItem, idx) => (
                                <div key={idx} className="p-3 bg-white rounded-lg border">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-sm">{riskItem.risk}</span>
                                    <Badge variant="outline" className={`text-xs ${getRiskColor(riskItem.level)}`}>
                                      {riskItem.level === "high"
                                        ? "高风险"
                                        : riskItem.level === "medium"
                                          ? "中风险"
                                          : "低风险"}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{riskItem.mitigation}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </AnimatedContainer>
                  ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>

          {/* 技术升级计划 */}
          <TabsContent value="technology" className="space-y-6">
            <EnhancedCard variant="traditional" glowEffect>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Code className="w-5 h-5" />
                  <span>技术栈升级规划</span>
                </CardTitle>
                <CardDescription>系统技术栈的升级计划和迁移策略</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {techStackUpgrades.map((upgrade, index) => (
                    <AnimatedContainer key={upgrade.category} animation="slideUp" delay={index * 100}>
                      <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{upgrade.category}</h3>
                            <div className="flex items-center space-x-4 mt-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground">当前:</span>
                                <Badge variant="outline">{upgrade.current}</Badge>
                              </div>
                              <ArrowRight className="w-4 h-4 text-muted-foreground" />
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground">目标:</span>
                                <Badge variant="default">{upgrade.target}</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getPriorityColor(upgrade.priority)} variant="secondary">
                              {upgrade.priority === "high"
                                ? "高优先级"
                                : upgrade.priority === "medium"
                                  ? "中优先级"
                                  : "低优先级"}
                            </Badge>
                            <Badge variant="outline">{upgrade.timeline}</Badge>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">预期收益:</h4>
                          <div className="flex flex-wrap gap-2">
                            {upgrade.benefits.map((benefit, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {benefit}
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

          {/* 团队扩展计划 */}
          <TabsContent value="team" className="space-y-6">
            <EnhancedCard variant="traditional" glowEffect>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>团队扩展计划</span>
                </CardTitle>
                <CardDescription>根据项目需求制定的人员招聘和团队建设计划</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {teamExpansion.map((position, index) => (
                    <AnimatedContainer key={position.role} animation="slideUp" delay={index * 100}>
                      <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{position.role}</h3>
                            <p className="text-sm text-muted-foreground">需求人数: {position.count} 人</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getPriorityColor(position.priority)} variant="secondary">
                              {position.priority === "high" ? "急需" : position.priority === "medium" ? "一般" : "不急"}
                            </Badge>
                            <Badge variant="outline">{position.timeline}</Badge>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">主要职责:</h4>
                            <ul className="space-y-1">
                              {position.responsibilities.map((resp, idx) => (
                                <li key={idx} className="flex items-center space-x-2 text-sm">
                                  <div className="w-1.5 h-1.5 bg-primary-600 rounded-full"></div>
                                  <span>{resp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">技能要求:</h4>
                            <div className="flex flex-wrap gap-2">
                              {position.skills.map((skill, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </AnimatedContainer>
                  ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>

          {/* 里程碑计划 */}
          <TabsContent value="milestones" className="space-y-6">
            <EnhancedCard variant="traditional" glowEffect>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Flag className="w-5 h-5" />
                  <span>项目里程碑</span>
                </CardTitle>
                <CardDescription>关键节点和重要里程碑的时间规划</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 时间轴 */}
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 to-accent-500"></div>

                    <div className="space-y-8">
                      {[
                        {
                          date: "2024-01-22",
                          title: "项目启动",
                          description: "开始第一阶段开发，团队集结完毕",
                          status: "completed",
                          type: "start",
                        },
                        {
                          date: "2024-02-12",
                          title: "核心功能完成",
                          description: "商务功能和系统设置模块开发完成",
                          status: "in-progress",
                          type: "milestone",
                        },
                        {
                          date: "2024-03-12",
                          title: "系统优化完成",
                          description: "性能优化和用户体验改进完成",
                          status: "planned",
                          type: "milestone",
                        },
                        {
                          date: "2024-04-16",
                          title: "高级特性发布",
                          description: "AI功能和移动端适配完成",
                          status: "planned",
                          type: "milestone",
                        },
                        {
                          date: "2024-05-07",
                          title: "正式上线",
                          description: "生产环境部署，系统正式发布",
                          status: "planned",
                          type: "release",
                        },
                      ].map((milestone, index) => (
                        <AnimatedContainer key={milestone.date} animation="slideRight" delay={index * 100}>
                          <div className="relative flex items-start space-x-4">
                            <div
                              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                                milestone.status === "completed"
                                  ? "bg-green-500"
                                  : milestone.status === "in-progress"
                                    ? "bg-blue-500"
                                    : "bg-gray-300"
                              }`}
                            >
                              {milestone.status === "completed" ? (
                                <CheckCircle className="w-4 h-4 text-white" />
                              ) : milestone.status === "in-progress" ? (
                                <Clock className="w-4 h-4 text-white" />
                              ) : (
                                <Calendar className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div className="flex-1 pb-8">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-lg">{milestone.title}</h3>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">{milestone.date}</Badge>
                                  <Badge
                                    variant={
                                      milestone.type === "start"
                                        ? "default"
                                        : milestone.type === "release"
                                          ? "destructive"
                                          : "secondary"
                                    }
                                  >
                                    {milestone.type === "start"
                                      ? "启动"
                                      : milestone.type === "release"
                                        ? "发布"
                                        : "里程碑"}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-muted-foreground">{milestone.description}</p>
                            </div>
                          </div>
                        </AnimatedContainer>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>
        </Tabs>
      </AnimatedContainer>

      {/* 行动计划总结 */}
      <AnimatedContainer animation="slideUp" delay={400}>
        <EnhancedCard variant="modern" glowEffect>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5" />
              <span>立即行动计划</span>
            </CardTitle>
            <CardDescription>基于分析结果的即时行动建议</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h3 className="font-semibold text-red-800 mb-3 flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>紧急任务 (本周)</span>
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full mt-1.5"></div>
                    <span>完成商务管理和财务管理组件开发</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full mt-1.5"></div>
                    <span>建立PostgreSQL数据库连接</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full mt-1.5"></div>
                    <span>招聘2名后端工程师</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h3 className="font-semibold text-yellow-800 mb-3 flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>重要任务 (2周内)</span>
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full mt-1.5"></div>
                    <span>完成订单管理和ERP系统</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full mt-1.5"></div>
                    <span>增加单元测试覆盖率到85%</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full mt-1.5"></div>
                    <span>建立CI/CD基础流水线</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-3 flex items-center space-x-2">
                  <Star className="w-5 h-5" />
                  <span>优化任务 (1月内)</span>
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                    <span>完成系统设置模块</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                    <span>性能优化和用户体验改进</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                    <span>完善API文档和组件文档</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>成功指标</span>
              </h3>
              <div className="grid gap-4 md:grid-cols-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">100%</div>
                  <div className="text-blue-700">核心功能完成率</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">85%</div>
                  <div className="text-blue-700">测试覆盖率目标</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">95%</div>
                  <div className="text-blue-700">性能评分目标</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">5月</div>
                  <div className="text-blue-700">正式上线时间</div>
                </div>
              </div>
            </div>
          </CardContent>
        </EnhancedCard>
      </AnimatedContainer>
    </div>
  )
}
