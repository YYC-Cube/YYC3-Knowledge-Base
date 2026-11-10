"use client"

import { useState } from "react"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  Code,
  Database,
  Shield,
  BarChart3,
  Settings,
  Target,
  TrendingUp,
  Package,
  Server,
  Monitor,
} from "lucide-react"

import { EnhancedCard } from "../components/design-system/enhanced-card-system"
import { AnimatedContainer } from "../components/design-system/animation-system"

interface DevelopmentPhase {
  id: string
  name: string
  description: string
  priority: "high" | "medium" | "low"
  status: "planning" | "in-progress" | "completed" | "blocked"
  progress: number
  startDate: string
  endDate: string
  team: string[]
  dependencies: string[]
  deliverables: string[]
  risks: string[]
}

interface TechnicalTask {
  id: string
  title: string
  category: "frontend" | "backend" | "database" | "devops" | "security" | "testing"
  complexity: "low" | "medium" | "high"
  estimatedHours: number
  assignee: string
  status: "todo" | "in-progress" | "review" | "done"
  description: string
}

export function DevelopmentRoadmap() {
  const [activePhase, setActivePhase] = useState("phase1")

  const developmentPhases: DevelopmentPhase[] = [
    {
      id: "phase1",
      name: "核心架构完善",
      description: "建立稳定的技术架构基础，完善数据层和API设计",
      priority: "high",
      status: "in-progress",
      progress: 65,
      startDate: "2024-01-15",
      endDate: "2024-02-28",
      team: ["架构师", "后端工程师", "数据库工程师"],
      dependencies: [],
      deliverables: ["微服务架构设计", "数据库设计优化", "API网关实现", "缓存策略部署", "消息队列集成"],
      risks: ["技术选型风险", "性能瓶颈", "数据一致性"],
    },
    {
      id: "phase2",
      name: "实时协作增强",
      description: "深度优化实时协作功能，提升多用户并发处理能力",
      priority: "high",
      status: "planning",
      progress: 20,
      startDate: "2024-02-01",
      endDate: "2024-03-15",
      team: ["前端工程师", "后端工程师", "WebSocket专家"],
      dependencies: ["phase1"],
      deliverables: ["WebSocket集群化", "操作冲突解决算法", "实时光标同步", "版本控制系统", "离线同步机制"],
      risks: ["并发处理复杂度", "网络延迟", "数据同步冲突"],
    },
    {
      id: "phase3",
      name: "AI智能引擎",
      description: "集成AI能力，提供智能数据分析和自动化功能",
      priority: "medium",
      status: "planning",
      progress: 5,
      startDate: "2024-03-01",
      endDate: "2024-04-30",
      team: ["AI工程师", "数据科学家", "后端工程师"],
      dependencies: ["phase1", "phase2"],
      deliverables: ["智能数据分析", "自动报表生成", "异常检测系统", "预测分析模型", "自然语言查询"],
      risks: ["AI模型准确性", "计算资源消耗", "数据隐私"],
    },
    {
      id: "phase4",
      name: "移动端优化",
      description: "全面优化移动端体验，开发原生应用",
      priority: "medium",
      status: "planning",
      progress: 0,
      startDate: "2024-04-01",
      endDate: "2024-05-31",
      team: ["移动端工程师", "UI/UX设计师", "测试工程师"],
      dependencies: ["phase2"],
      deliverables: ["React Native应用", "离线功能支持", "推送通知系统", "生物识别认证", "移动端专属功能"],
      risks: ["平台兼容性", "性能优化", "应用商店审核"],
    },
    {
      id: "phase5",
      name: "企业级安全",
      description: "加强安全防护，满足企业级安全要求",
      priority: "high",
      status: "planning",
      progress: 0,
      startDate: "2024-05-01",
      endDate: "2024-06-15",
      team: ["安全工程师", "后端工程师", "运维工程师"],
      dependencies: ["phase1"],
      deliverables: ["零信任安全架构", "数据加密传输", "审计日志系统", "权限管理优化", "安全合规认证"],
      risks: ["安全漏洞", "合规要求变化", "性能影响"],
    },
    {
      id: "phase6",
      name: "商业化准备",
      description: "完善商业化功能，准备市场推广",
      priority: "medium",
      status: "planning",
      progress: 0,
      startDate: "2024-06-01",
      endDate: "2024-07-31",
      team: ["产品经理", "商务拓展", "市场营销"],
      dependencies: ["phase3", "phase4", "phase5"],
      deliverables: ["订阅计费系统", "企业版功能", "API开放平台", "合作伙伴集成", "市场推广材料"],
      risks: ["市场接受度", "竞争压力", "定价策略"],
    },
  ]

  const technicalTasks: TechnicalTask[] = [
    {
      id: "task1",
      title: "实现Redis集群缓存",
      category: "backend",
      complexity: "high",
      estimatedHours: 40,
      assignee: "张工程师",
      status: "in-progress",
      description: "部署Redis集群，实现分布式缓存，提升系统性能",
    },
    {
      id: "task2",
      title: "WebSocket连接池优化",
      category: "backend",
      complexity: "high",
      estimatedHours: 32,
      assignee: "李工程师",
      status: "todo",
      description: "优化WebSocket连接管理，支持大规模并发连接",
    },
    {
      id: "task3",
      title: "前端状态管理重构",
      category: "frontend",
      complexity: "medium",
      estimatedHours: 24,
      assignee: "王工程师",
      status: "review",
      description: "使用Zustand重构全局状态管理，提升性能",
    },
    {
      id: "task4",
      title: "数据库分片策略",
      category: "database",
      complexity: "high",
      estimatedHours: 48,
      assignee: "赵工程师",
      status: "todo",
      description: "实现数据库水平分片，支持海量数据存储",
    },
    {
      id: "task5",
      title: "CI/CD流水线搭建",
      category: "devops",
      complexity: "medium",
      estimatedHours: 20,
      assignee: "刘工程师",
      status: "done",
      description: "搭建自动化部署流水线，提升开发效率",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "done":
        return "bg-traditional-jade text-white"
      case "in-progress":
        return "bg-primary-500 text-white"
      case "planning":
      case "todo":
        return "bg-accent-500 text-white"
      case "blocked":
        return "bg-traditional-crimson text-white"
      case "review":
        return "bg-traditional-gold text-white"
      default:
        return "bg-secondary-400 text-white"
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "frontend":
        return <Monitor className="w-4 h-4" />
      case "backend":
        return <Server className="w-4 h-4" />
      case "database":
        return <Database className="w-4 h-4" />
      case "devops":
        return <Settings className="w-4 h-4" />
      case "security":
        return <Shield className="w-4 h-4" />
      case "testing":
        return <CheckCircle className="w-4 h-4" />
      default:
        return <Code className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* 开发概览 */}
      <div className="grid gap-4 md:grid-cols-4">
        <AnimatedContainer animation="slideUp" delay={0}>
          <EnhancedCard variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Target className="w-4 h-4 text-primary-500" />
                <span>开发阶段</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary-500">6</div>
              <p className="text-xs text-secondary-500">总计划阶段</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={150}>
          <EnhancedCard variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-traditional-jade" />
                <span>整体进度</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-traditional-jade">23%</div>
              <Progress value={23} className="mt-2 h-2" />
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={300}>
          <EnhancedCard variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Users className="w-4 h-4 text-accent-500" />
                <span>开发团队</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent-500">12</div>
              <p className="text-xs text-secondary-500">核心成员</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={450}>
          <EnhancedCard variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-traditional-gold" />
                <span>预计完成</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-traditional-gold">7月</div>
              <p className="text-xs text-secondary-500">2024年</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>
      </div>

      {/* 详细计划 */}
      <EnhancedCard variant="traditional" size="lg">
        <Tabs defaultValue="phases" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="phases">开发阶段</TabsTrigger>
            <TabsTrigger value="tasks">技术任务</TabsTrigger>
            <TabsTrigger value="timeline">时间线</TabsTrigger>
            <TabsTrigger value="resources">资源规划</TabsTrigger>
          </TabsList>

          {/* 开发阶段 */}
          <TabsContent value="phases" className="space-y-4">
            <div className="grid gap-4">
              {developmentPhases.map((phase, index) => (
                <AnimatedContainer key={phase.id} animation="slideRight" delay={index * 100}>
                  <EnhancedCard variant="glass" className="p-6">
                    <div className="space-y-4">
                      {/* 阶段头部 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{phase.name}</h3>
                            <p className="text-sm text-secondary-600">{phase.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getPriorityColor(phase.priority)}>
                            {phase.priority === "high" && <AlertCircle className="w-3 h-3 mr-1" />}
                            {phase.priority === "medium" && <Clock className="w-3 h-3 mr-1" />}
                            {phase.priority === "low" && <CheckCircle className="w-3 h-3 mr-1" />}
                            {phase.priority}
                          </Badge>
                          <Badge className={getStatusColor(phase.status)}>{phase.status}</Badge>
                        </div>
                      </div>

                      {/* 进度条 */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>进度</span>
                          <span className="font-medium">{phase.progress}%</span>
                        </div>
                        <Progress value={phase.progress} className="h-2" />
                      </div>

                      {/* 详细信息 */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-sm mb-2">时间安排</h4>
                            <div className="flex items-center space-x-2 text-sm text-secondary-600">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {phase.startDate} - {phase.endDate}
                              </span>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium text-sm mb-2">团队成员</h4>
                            <div className="flex flex-wrap gap-1">
                              {phase.team.map((member) => (
                                <Badge key={member} variant="outline" className="text-xs">
                                  <Users className="w-3 h-3 mr-1" />
                                  {member}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-sm mb-2">主要交付物</h4>
                            <ul className="space-y-1">
                              {phase.deliverables.slice(0, 3).map((deliverable) => (
                                <li key={deliverable} className="text-sm text-secondary-600 flex items-center">
                                  <CheckCircle className="w-3 h-3 mr-2 text-traditional-jade" />
                                  {deliverable}
                                </li>
                              ))}
                              {phase.deliverables.length > 3 && (
                                <li className="text-sm text-secondary-500">+{phase.deliverables.length - 3} 更多...</li>
                              )}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-medium text-sm mb-2">风险评估</h4>
                            <div className="flex flex-wrap gap-1">
                              {phase.risks.map((risk) => (
                                <Badge key={risk} variant="outline" className="text-xs text-traditional-crimson">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  {risk}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 技术任务 */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="grid gap-4">
              {technicalTasks.map((task, index) => (
                <AnimatedContainer key={task.id} animation="slideLeft" delay={index * 100}>
                  <EnhancedCard variant="glass" className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-secondary-100 rounded-lg">{getCategoryIcon(task.category)}</div>
                        <div>
                          <h4 className="font-medium">{task.title}</h4>
                          <p className="text-sm text-secondary-600">{task.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {task.category}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                task.complexity === "high"
                                  ? "text-traditional-crimson"
                                  : task.complexity === "medium"
                                    ? "text-traditional-gold"
                                    : "text-traditional-jade"
                              }`}
                            >
                              {task.complexity}
                            </Badge>
                            <span className="text-xs text-secondary-500">{task.estimatedHours}h</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {task.assignee}
                        </Badge>
                        <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                      </div>
                    </div>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 时间线 */}
          <TabsContent value="timeline" className="space-y-4">
            <div className="relative">
              {/* 时间线主轴 */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 to-accent-500"></div>

              {developmentPhases.map((phase, index) => (
                <AnimatedContainer key={phase.id} animation="slideUp" delay={index * 150}>
                  <div className="relative flex items-center space-x-4 pb-8">
                    {/* 时间节点 */}
                    <div
                      className={`w-4 h-4 rounded-full border-2 border-white shadow-lg z-10 ${
                        phase.status === "completed"
                          ? "bg-traditional-jade"
                          : phase.status === "in-progress"
                            ? "bg-primary-500"
                            : "bg-secondary-300"
                      }`}
                    ></div>

                    {/* 阶段信息 */}
                    <EnhancedCard variant="glass" className="flex-1 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{phase.name}</h4>
                        <div className="text-sm text-secondary-500">
                          {phase.startDate} - {phase.endDate}
                        </div>
                      </div>
                      <p className="text-sm text-secondary-600 mb-2">{phase.description}</p>
                      <div className="flex items-center space-x-2">
                        <Progress value={phase.progress} className="flex-1 h-2" />
                        <span className="text-sm font-medium">{phase.progress}%</span>
                      </div>
                    </EnhancedCard>
                  </div>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 资源规划 */}
          <TabsContent value="resources" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* 人力资源 */}
              <EnhancedCard variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>人力资源分配</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { role: "前端工程师", count: 3, utilization: 85 },
                      { role: "后端工程师", count: 4, utilization: 92 },
                      { role: "数据库工程师", count: 2, utilization: 78 },
                      { role: "DevOps工程师", count: 1, utilization: 95 },
                      { role: "UI/UX设计师", count: 2, utilization: 70 },
                    ].map((resource) => (
                      <div key={resource.role} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{resource.role}</span>
                          <span>
                            {resource.count}人 ({resource.utilization}%)
                          </span>
                        </div>
                        <Progress value={resource.utilization} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </EnhancedCard>

              {/* 技术栈 */}
              <EnhancedCard variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="w-5 h-5" />
                    <span>技术栈规划</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">前端技术</h4>
                      <div className="flex flex-wrap gap-1">
                        {["Next.js 15", "React 18", "TypeScript", "Tailwind CSS", "Zustand"].map((tech) => (
                          <Badge key={tech} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-2">后端技术</h4>
                      <div className="flex flex-wrap gap-1">
                        {["Node.js", "Express", "PostgreSQL", "Redis", "WebSocket"].map((tech) => (
                          <Badge key={tech} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-2">基础设施</h4>
                      <div className="flex flex-wrap gap-1">
                        {["Docker", "Kubernetes", "AWS", "Nginx", "GitHub Actions"].map((tech) => (
                          <Badge key={tech} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </div>

            {/* 预算规划 */}
            <EnhancedCard variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>预算分配</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { category: "人力成本", amount: "¥480,000", percentage: 60 },
                    { category: "基础设施", amount: "¥120,000", percentage: 15 },
                    { category: "第三方服务", amount: "¥80,000", percentage: 10 },
                    { category: "设备采购", amount: "¥60,000", percentage: 8 },
                    { category: "营销推广", amount: "¥40,000", percentage: 5 },
                    { category: "其他费用", amount: "¥20,000", percentage: 2 },
                  ].map((budget) => (
                    <div key={budget.category} className="text-center p-4 bg-white/50 rounded-lg">
                      <div className="text-lg font-bold text-primary-600">{budget.amount}</div>
                      <div className="text-sm text-secondary-600">{budget.category}</div>
                      <div className="text-xs text-secondary-500">{budget.percentage}%</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>
        </Tabs>
      </EnhancedCard>
    </div>
  )
}
