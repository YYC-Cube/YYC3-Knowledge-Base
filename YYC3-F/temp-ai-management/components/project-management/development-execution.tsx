"use client"

import { useState } from "react"
import {
  Calendar,
  Clock,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  Circle,
  Play,
  RotateCcw,
  TrendingUp,
  Activity,
  BarChart3,
  User,
  Timer,
  Flag,
  MessageSquare,
  Plus,
} from "lucide-react"

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { AnimatedContainer } from "../design-system/animation-system"
import { EnhancedCard } from "../design-system/enhanced-card-system"
import { SoundButton } from "../design-system/sound-system"

// 项目数据类型定义
interface Task {
  id: string
  title: string
  description: string
  status: "not-started" | "in-progress" | "completed" | "blocked"
  priority: "P0" | "P1" | "P2" | "P3"
  assignee: string
  estimatedHours: number
  actualHours: number
  startDate: string
  dueDate: string
  dependencies: string[]
  tags: string[]
}

interface Milestone {
  id: string
  title: string
  description: string
  dueDate: string
  progress: number
  status: "upcoming" | "in-progress" | "completed" | "delayed"
  tasks: string[]
}

interface TeamMember {
  id: string
  name: string
  role: string
  avatar: string
  workload: number
  skills: string[]
  currentTasks: number
}

// 模拟数据
const mockTasks: Task[] = [
  {
    id: "task-1",
    title: "搭建Node.js后端服务架构",
    description: "建立Express.js基础架构，配置中间件和路由系统",
    status: "in-progress",
    priority: "P0",
    assignee: "张伟",
    estimatedHours: 24,
    actualHours: 16,
    startDate: "2024-01-08",
    dueDate: "2024-01-12",
    dependencies: [],
    tags: ["后端", "架构", "Node.js"],
  },
  {
    id: "task-2",
    title: "设计核心数据库Schema",
    description: "设计用户、权限、内容管理等核心数据表结构",
    status: "in-progress",
    priority: "P0",
    assignee: "王强",
    estimatedHours: 16,
    actualHours: 8,
    startDate: "2024-01-08",
    dueDate: "2024-01-10",
    dependencies: [],
    tags: ["数据库", "设计", "Schema"],
  },
  {
    id: "task-3",
    title: "实现基础用户认证API",
    description: "开发用户注册、登录、JWT令牌管理功能",
    status: "not-started",
    priority: "P0",
    assignee: "张伟",
    estimatedHours: 20,
    actualHours: 0,
    startDate: "2024-01-12",
    dueDate: "2024-01-16",
    dependencies: ["task-1", "task-2"],
    tags: ["认证", "API", "安全"],
  },
  {
    id: "task-4",
    title: "前端组件库优化",
    description: "完善现有组件系统，提升性能和可维护性",
    status: "completed",
    priority: "P1",
    assignee: "李明",
    estimatedHours: 32,
    actualHours: 28,
    startDate: "2024-01-05",
    dueDate: "2024-01-15",
    dependencies: [],
    tags: ["前端", "组件", "优化"],
  },
  {
    id: "task-5",
    title: "移动端适配优化",
    description: "优化移动端响应式设计和交互体验",
    status: "blocked",
    priority: "P2",
    assignee: "陈小红",
    estimatedHours: 24,
    actualHours: 4,
    startDate: "2024-01-10",
    dueDate: "2024-01-20",
    dependencies: ["task-4"],
    tags: ["移动端", "响应式", "UI"],
  },
]

const mockMilestones: Milestone[] = [
  {
    id: "milestone-1",
    title: "认证系统基础",
    description: "完成用户认证系统的核心功能开发",
    dueDate: "2024-01-20",
    progress: 65,
    status: "in-progress",
    tasks: ["task-1", "task-2", "task-3"],
  },
  {
    id: "milestone-2",
    title: "前端界面完善",
    description: "完成前端组件库和移动端适配",
    dueDate: "2024-01-25",
    progress: 80,
    status: "in-progress",
    tasks: ["task-4", "task-5"],
  },
  {
    id: "milestone-3",
    title: "数据管理模块",
    description: "实现数据CRUD操作和权限控制",
    dueDate: "2024-02-05",
    progress: 0,
    status: "upcoming",
    tasks: [],
  },
]

const mockTeamMembers: TeamMember[] = [
  {
    id: "member-1",
    name: "张伟",
    role: "后端工程师",
    avatar: "/placeholder.svg?height=40&width=40&text=张伟",
    workload: 85,
    skills: ["Node.js", "Express", "MongoDB", "Redis"],
    currentTasks: 2,
  },
  {
    id: "member-2",
    name: "王强",
    role: "数据库工程师",
    avatar: "/placeholder.svg?height=40&width=40&text=王强",
    workload: 70,
    skills: ["PostgreSQL", "MongoDB", "Redis", "数据建模"],
    currentTasks: 1,
  },
  {
    id: "member-3",
    name: "李明",
    role: "前端工程师",
    avatar: "/placeholder.svg?height=40&width=40&text=李明",
    workload: 60,
    skills: ["React", "TypeScript", "Tailwind", "Next.js"],
    currentTasks: 1,
  },
  {
    id: "member-4",
    name: "陈小红",
    role: "UI/UX设计师",
    avatar: "/placeholder.svg?height=40&width=40&text=陈小红",
    workload: 45,
    skills: ["Figma", "响应式设计", "用户体验", "原型设计"],
    currentTasks: 1,
  },
]

export function DevelopmentExecution() {
  const [selectedTab, setSelectedTab] = useState("overview")
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [milestones, setMilestones] = useState<Milestone[]>(mockMilestones)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(mockTeamMembers)

  // 计算项目统计数据
  const projectStats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === "completed").length,
    inProgressTasks: tasks.filter((t) => t.status === "in-progress").length,
    blockedTasks: tasks.filter((t) => t.status === "blocked").length,
    overallProgress: Math.round((tasks.filter((t) => t.status === "completed").length / tasks.length) * 100),
    totalEstimatedHours: tasks.reduce((sum, task) => sum + task.estimatedHours, 0),
    totalActualHours: tasks.reduce((sum, task) => sum + task.actualHours, 0),
    averageTeamWorkload: Math.round(teamMembers.reduce((sum, member) => sum + member.workload, 0) / teamMembers.length),
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "in-progress":
        return <Play className="w-4 h-4 text-blue-500" />
      case "blocked":
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      default:
        return <Circle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: "已完成", variant: "default" as const, className: "bg-green-100 text-green-800" },
      "in-progress": { label: "进行中", variant: "default" as const, className: "bg-blue-100 text-blue-800" },
      blocked: { label: "阻塞", variant: "destructive" as const, className: "bg-red-100 text-red-800" },
      "not-started": { label: "未开始", variant: "secondary" as const, className: "bg-gray-100 text-gray-800" },
      upcoming: { label: "即将开始", variant: "outline" as const, className: "bg-yellow-100 text-yellow-800" },
      delayed: { label: "延期", variant: "destructive" as const, className: "bg-red-100 text-red-800" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig["not-started"]
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      P0: { label: "紧急", className: "bg-red-100 text-red-800 border-red-200" },
      P1: { label: "高", className: "bg-orange-100 text-orange-800 border-orange-200" },
      P2: { label: "中", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      P3: { label: "低", className: "bg-green-100 text-green-800 border-green-200" },
    }

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig["P3"]
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* 项目概览卡片 */}
      <AnimatedContainer animation="fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总体进度</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-primary-600">{projectStats.overallProgress}%</div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <Progress value={projectStats.overallProgress} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {projectStats.completedTasks}/{projectStats.totalTasks} 任务完成
              </p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">进行中任务</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-blue-600">{projectStats.inProgressTasks}</div>
                <Activity className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{projectStats.blockedTasks} 个任务被阻塞</p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">工时统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-accent-600">{projectStats.totalActualHours}h</div>
                <Timer className="w-4 h-4 text-accent-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">预估 {projectStats.totalEstimatedHours}h</p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">团队负载</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-traditional-gold">{projectStats.averageTeamWorkload}%</div>
                <Users className="w-4 h-4 text-traditional-gold" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{teamMembers.length} 名团队成员</p>
            </CardContent>
          </EnhancedCard>
        </div>
      </AnimatedContainer>

      {/* 主要内容区域 */}
      <AnimatedContainer animation="slideUp" delay={200}>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">项目概览</TabsTrigger>
            <TabsTrigger value="tasks">任务管理</TabsTrigger>
            <TabsTrigger value="milestones">里程碑</TabsTrigger>
            <TabsTrigger value="team">团队管理</TabsTrigger>
            <TabsTrigger value="timeline">时间线</TabsTrigger>
          </TabsList>

          {/* 项目概览 */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 任务状态分布 */}
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>任务状态分布</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      {
                        status: "completed",
                        count: projectStats.completedTasks,
                        label: "已完成",
                        color: "bg-green-500",
                      },
                      {
                        status: "in-progress",
                        count: projectStats.inProgressTasks,
                        label: "进行中",
                        color: "bg-blue-500",
                      },
                      { status: "blocked", count: projectStats.blockedTasks, label: "阻塞", color: "bg-red-500" },
                      {
                        status: "not-started",
                        count: tasks.filter((t) => t.status === "not-started").length,
                        label: "未开始",
                        color: "bg-gray-400",
                      },
                    ].map((item) => (
                      <div key={item.status} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${item.color}`} />
                          <span className="text-sm">{item.label}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{item.count}</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${item.color}`}
                              style={{ width: `${(item.count / projectStats.totalTasks) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </EnhancedCard>

              {/* 近期里程碑 */}
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Flag className="w-5 h-5" />
                    <span>近期里程碑</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {milestones.slice(0, 3).map((milestone) => (
                      <div key={milestone.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{milestone.title}</h4>
                          {getStatusBadge(milestone.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{milestone.description}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span>截止日期: {milestone.dueDate}</span>
                          <span>{milestone.progress}% 完成</span>
                        </div>
                        <Progress value={milestone.progress} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </EnhancedCard>
            </div>

            {/* 风险任务提醒 */}
            <EnhancedCard variant="modern" className="border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  <span>需要关注的任务</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasks
                    .filter(
                      (task) =>
                        task.status === "blocked" ||
                        (task.status === "in-progress" &&
                          new Date(task.dueDate) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
                    )
                    .map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(task.status)}
                          <div>
                            <h4 className="font-medium">{task.title}</h4>
                            <p className="text-sm text-muted-foreground">负责人: {task.assignee}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {getPriorityBadge(task.priority)}
                          <p className="text-xs text-muted-foreground mt-1">截止: {task.dueDate}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>

          {/* 任务管理 */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">任务列表</h3>
              <SoundButton variant="default" soundType="click">
                <Plus className="w-4 h-4 mr-2" />
                新建任务
              </SoundButton>
            </div>

            <div className="space-y-3">
              {tasks.map((task) => (
                <EnhancedCard key={task.id} variant="modern" className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getStatusIcon(task.status)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">{task.title}</h4>
                            {getPriorityBadge(task.priority)}
                            {getStatusBadge(task.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>{task.assignee}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                {task.actualHours}h / {task.estimatedHours}h
                              </span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{task.dueDate}</span>
                            </span>
                          </div>
                          {task.tags.length > 0 && (
                            <div className="flex items-center space-x-1 mt-2">
                              {task.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <SoundButton variant="ghost" size="sm" soundType="click">
                          <MessageSquare className="w-4 h-4" />
                        </SoundButton>
                        <SoundButton variant="ghost" size="sm" soundType="click">
                          <RotateCcw className="w-4 h-4" />
                        </SoundButton>
                      </div>
                    </div>
                  </CardContent>
                </EnhancedCard>
              ))}
            </div>
          </TabsContent>

          {/* 里程碑管理 */}
          <TabsContent value="milestones" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">项目里程碑</h3>
              <SoundButton variant="default" soundType="click">
                <Flag className="w-4 h-4 mr-2" />
                新建里程碑
              </SoundButton>
            </div>

            <div className="space-y-4">
              {milestones.map((milestone) => (
                <EnhancedCard key={milestone.id} variant="traditional" glowEffect>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <Target className="w-5 h-5" />
                        <span>{milestone.title}</span>
                      </CardTitle>
                      {getStatusBadge(milestone.status)}
                    </div>
                    <CardDescription>{milestone.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>完成进度</span>
                        <span className="font-medium">{milestone.progress}%</span>
                      </div>
                      <Progress value={milestone.progress} className="h-3" />
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>截止日期: {milestone.dueDate}</span>
                        <span>关联任务: {milestone.tasks.length} 个</span>
                      </div>
                    </div>
                  </CardContent>
                </EnhancedCard>
              ))}
            </div>
          </TabsContent>

          {/* 团队管理 */}
          <TabsContent value="team" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">团队成员</h3>
              <SoundButton variant="default" soundType="click">
                <Users className="w-4 h-4 mr-2" />
                邀请成员
              </SoundButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamMembers.map((member) => (
                <EnhancedCard key={member.id} variant="modern" glowEffect>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                        <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium">{member.name}</h4>
                          <Badge variant="outline">{member.role}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">当前任务: {member.currentTasks} 个</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>工作负载</span>
                            <span
                              className={`font-medium ${
                                member.workload > 80
                                  ? "text-red-600"
                                  : member.workload > 60
                                    ? "text-yellow-600"
                                    : "text-green-600"
                              }`}
                            >
                              {member.workload}%
                            </span>
                          </div>
                          <Progress
                            value={member.workload}
                            className={`h-2 ${
                              member.workload > 80
                                ? "[&>div]:bg-red-500"
                                : member.workload > 60
                                  ? "[&>div]:bg-yellow-500"
                                  : "[&>div]:bg-green-500"
                            }`}
                          />
                          <div className="flex flex-wrap gap-1 mt-2">
                            {member.skills.slice(0, 3).map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {member.skills.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{member.skills.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </EnhancedCard>
              ))}
            </div>
          </TabsContent>

          {/* 时间线视图 */}
          <TabsContent value="timeline" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">项目时间线</h3>
              <div className="flex items-center space-x-2">
                <SoundButton variant="outline" size="sm" soundType="click">
                  本周
                </SoundButton>
                <SoundButton variant="outline" size="sm" soundType="click">
                  本月
                </SoundButton>
                <SoundButton variant="default" size="sm" soundType="click">
                  全部
                </SoundButton>
              </div>
            </div>

            <EnhancedCard variant="traditional" glowEffect>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {milestones.map((milestone, index) => (
                    <div key={milestone.id} className="relative">
                      {index !== milestones.length - 1 && (
                        <div className="absolute left-4 top-8 w-0.5 h-16 bg-gray-200" />
                      )}
                      <div className="flex items-start space-x-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            milestone.status === "completed"
                              ? "bg-green-500"
                              : milestone.status === "in-progress"
                                ? "bg-blue-500"
                                : milestone.status === "delayed"
                                  ? "bg-red-500"
                                  : "bg-gray-300"
                          }`}
                        >
                          <Flag className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium">{milestone.title}</h4>
                            <span className="text-sm text-muted-foreground">{milestone.dueDate}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{milestone.description}</p>
                          <div className="flex items-center space-x-4">
                            <Progress value={milestone.progress} className="flex-1 h-2" />
                            <span className="text-sm font-medium">{milestone.progress}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>
        </Tabs>
      </AnimatedContainer>
    </div>
  )
}
