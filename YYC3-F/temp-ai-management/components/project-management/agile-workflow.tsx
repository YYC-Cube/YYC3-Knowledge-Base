"use client"

import { useState } from "react"
import {
  Calendar,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  Circle,
  TrendingUp,
  Activity,
  BarChart3,
  Zap,
  MessageSquare,
  Plus,
  ArrowRight,
  Star,
  ThumbsUp,
  Lightbulb,
  Coffee,
  Flame,
} from "lucide-react"

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

import { AnimatedContainer } from "../design-system/animation-system"
import { EnhancedCard } from "../design-system/enhanced-card-system"
import { SoundButton } from "../design-system/sound-system"

// 敏捷开发数据类型定义
interface UserStory {
  id: string
  title: string
  description: string
  acceptanceCriteria: string[]
  storyPoints: number
  priority: "High" | "Medium" | "Low"
  status: "backlog" | "todo" | "in-progress" | "review" | "done"
  assignee: string
  epic: string
  sprint?: string
  tags: string[]
}

interface Sprint {
  id: string
  name: string
  goal: string
  startDate: string
  endDate: string
  status: "planning" | "active" | "completed"
  capacity: number
  committed: number
  completed: number
  stories: string[]
}

interface Epic {
  id: string
  title: string
  description: string
  color: string
  progress: number
  stories: string[]
}

interface SprintRetrospective {
  id: string
  sprintId: string
  date: string
  whatWentWell: string[]
  whatCouldImprove: string[]
  actionItems: string[]
  teamMood: number // 1-5
}

// 模拟数据
const mockEpics: Epic[] = [
  {
    id: "epic-1",
    title: "用户认证系统",
    description: "完整的用户注册、登录、权限管理系统",
    color: "bg-blue-500",
    progress: 75,
    stories: ["story-1", "story-2", "story-3"],
  },
  {
    id: "epic-2",
    title: "数据管理模块",
    description: "数据CRUD操作、搜索、过滤功能",
    color: "bg-green-500",
    progress: 40,
    stories: ["story-4", "story-5"],
  },
  {
    id: "epic-3",
    title: "移动端优化",
    description: "响应式设计和移动端用户体验优化",
    color: "bg-purple-500",
    progress: 20,
    stories: ["story-6", "story-7"],
  },
]

const mockUserStories: UserStory[] = [
  {
    id: "story-1",
    title: "用户注册功能",
    description: "作为新用户，我希望能够创建账户，以便使用系统功能",
    acceptanceCriteria: [
      "用户可以输入邮箱和密码注册",
      "系统验证邮箱格式和密码强度",
      "注册成功后发送确认邮件",
      "重复邮箱注册时显示错误提示",
    ],
    storyPoints: 8,
    priority: "High",
    status: "done",
    assignee: "张伟",
    epic: "epic-1",
    sprint: "sprint-1",
    tags: ["认证", "后端", "API"],
  },
  {
    id: "story-2",
    title: "用户登录功能",
    description: "作为注册用户，我希望能够登录系统，以便访问个人功能",
    acceptanceCriteria: [
      "用户可以使用邮箱和密码登录",
      "登录成功后跳转到仪表板",
      "错误凭据时显示错误信息",
      "支持记住登录状态",
    ],
    storyPoints: 5,
    priority: "High",
    status: "in-progress",
    assignee: "张伟",
    epic: "epic-1",
    sprint: "sprint-1",
    tags: ["认证", "前端", "UI"],
  },
  {
    id: "story-3",
    title: "权限管理系统",
    description: "作为管理员，我希望能够管理用户权限，以便控制系统访问",
    acceptanceCriteria: [
      "管理员可以查看所有用户",
      "可以分配和撤销用户角色",
      "不同角色有不同的功能权限",
      "权限变更立即生效",
    ],
    storyPoints: 13,
    priority: "Medium",
    status: "todo",
    assignee: "王强",
    epic: "epic-1",
    sprint: "sprint-1",
    tags: ["权限", "管理", "后端"],
  },
  {
    id: "story-4",
    title: "数据列表展示",
    description: "作为用户，我希望能够查看数据列表，以便了解系统中的信息",
    acceptanceCriteria: ["显示数据的分页列表", "支持按字段排序", "提供搜索和过滤功能", "响应式设计适配移动端"],
    storyPoints: 8,
    priority: "Medium",
    status: "backlog",
    assignee: "李明",
    epic: "epic-2",
    tags: ["数据", "前端", "UI"],
  },
  {
    id: "story-5",
    title: "数据编辑功能",
    description: "作为用户，我希望能够编辑数据，以便维护信息的准确性",
    acceptanceCriteria: ["提供数据编辑表单", "实时验证输入数据", "支持批量编辑操作", "编辑历史记录追踪"],
    storyPoints: 13,
    priority: "Medium",
    status: "backlog",
    assignee: "李明",
    epic: "epic-2",
    tags: ["数据", "编辑", "表单"],
  },
  {
    id: "story-6",
    title: "移动端导航优化",
    description: "作为移动端用户，我希望有更好的导航体验，以便快速访问功能",
    acceptanceCriteria: ["优化移动端菜单设计", "支持手势导航", "快速访问常用功能", "适配不同屏幕尺寸"],
    storyPoints: 5,
    priority: "Low",
    status: "backlog",
    assignee: "陈小红",
    epic: "epic-3",
    tags: ["移动端", "导航", "UX"],
  },
  {
    id: "story-7",
    title: "触摸交互优化",
    description: "作为移动端用户，我希望有更好的触摸交互，以便提升使用体验",
    acceptanceCriteria: ["优化按钮和链接的触摸区域", "添加触摸反馈效果", "支持滑动手势操作", "减少误触发生"],
    storyPoints: 8,
    priority: "Low",
    status: "backlog",
    assignee: "陈小红",
    epic: "epic-3",
    tags: ["移动端", "交互", "触摸"],
  },
]

const mockSprints: Sprint[] = [
  {
    id: "sprint-1",
    name: "Sprint 1 - 认证基础",
    goal: "完成用户认证系统的核心功能",
    startDate: "2024-01-08",
    endDate: "2024-01-21",
    status: "active",
    capacity: 80,
    committed: 26,
    completed: 8,
    stories: ["story-1", "story-2", "story-3"],
  },
  {
    id: "sprint-2",
    name: "Sprint 2 - 数据管理",
    goal: "实现基础数据管理功能",
    startDate: "2024-01-22",
    endDate: "2024-02-04",
    status: "planning",
    capacity: 80,
    committed: 0,
    completed: 0,
    stories: [],
  },
]

const mockRetrospectives: SprintRetrospective[] = [
  {
    id: "retro-1",
    sprintId: "sprint-0",
    date: "2024-01-07",
    whatWentWell: ["团队协作良好，沟通顺畅", "代码质量有所提升", "自动化测试覆盖率达到80%"],
    whatCouldImprove: ["需求变更频繁，影响开发节奏", "技术债务需要及时处理", "跨团队依赖导致阻塞"],
    actionItems: ["建立需求变更评审流程", "每周安排技术债务处理时间", "改善跨团队沟通机制"],
    teamMood: 4,
  },
]

export function AgileWorkflow() {
  const [selectedTab, setSelectedTab] = useState("sprint")
  const [userStories, setUserStories] = useState<UserStory[]>(mockUserStories)
  const [sprints, setSprints] = useState<Sprint[]>(mockSprints)
  const [epics, setEpics] = useState<Epic[]>(mockEpics)
  const [retrospectives, setRetrospectives] = useState<SprintRetrospective[]>(mockRetrospectives)

  const currentSprint = sprints.find((s) => s.status === "active")
  const sprintProgress = currentSprint ? Math.round((currentSprint.completed / currentSprint.committed) * 100) : 0

  // 计算燃尽图数据
  const burndownData = currentSprint
    ? [
        { day: 1, remaining: currentSprint.committed, ideal: currentSprint.committed },
        { day: 2, remaining: currentSprint.committed - 2, ideal: currentSprint.committed * 0.9 },
        { day: 3, remaining: currentSprint.committed - 4, ideal: currentSprint.committed * 0.8 },
        { day: 4, remaining: currentSprint.committed - 6, ideal: currentSprint.committed * 0.7 },
        { day: 5, remaining: currentSprint.committed - 8, ideal: currentSprint.committed * 0.6 },
        { day: 6, remaining: currentSprint.committed - currentSprint.completed, ideal: currentSprint.committed * 0.5 },
      ]
    : []

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
        return "bg-green-500"
      case "in-progress":
        return "bg-blue-500"
      case "review":
        return "bg-yellow-500"
      case "todo":
        return "bg-gray-400"
      default:
        return "bg-gray-300"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "text-red-600 bg-red-100"
      case "Medium":
        return "text-yellow-600 bg-yellow-100"
      case "Low":
        return "text-green-600 bg-green-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const moveStory = (storyId: string, newStatus: UserStory["status"]) => {
    setUserStories((stories) =>
      stories.map((story) => (story.id === storyId ? { ...story, status: newStatus } : story)),
    )
  }

  return (
    <div className="space-y-6">
      {/* Sprint 概览 */}
      <AnimatedContainer animation="fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">当前Sprint</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-lg font-bold text-primary-600">{currentSprint?.name || "无活跃Sprint"}</div>
                <Activity className="w-4 h-4 text-primary-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentSprint ? `${currentSprint.startDate} - ${currentSprint.endDate}` : "请开始新的Sprint"}
              </p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sprint进度</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-blue-600">{sprintProgress}%</div>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <Progress value={sprintProgress} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {currentSprint?.completed || 0}/{currentSprint?.committed || 0} 故事点完成
              </p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">团队速度</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-accent-600">26</div>
                <Zap className="w-4 h-4 text-accent-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">故事点/Sprint (↑18%)</p>
            </CardContent>
          </EnhancedCard>

          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">团队士气</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-traditional-gold">4.2</div>
                <div className="flex">
                  {[1, 2, 3, 4].map((star) => (
                    <Star key={star} className="w-3 h-3 fill-traditional-gold text-traditional-gold" />
                  ))}
                  <Star className="w-3 h-3 text-gray-300" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">基于最近回顾会议</p>
            </CardContent>
          </EnhancedCard>
        </div>
      </AnimatedContainer>

      {/* 主要内容区域 */}
      <AnimatedContainer animation="slideUp" delay={200}>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="sprint">Sprint管理</TabsTrigger>
            <TabsTrigger value="backlog">产品待办</TabsTrigger>
            <TabsTrigger value="kanban">看板视图</TabsTrigger>
            <TabsTrigger value="standup">每日站会</TabsTrigger>
            <TabsTrigger value="retrospective">回顾会议</TabsTrigger>
          </TabsList>

          {/* Sprint管理 */}
          <TabsContent value="sprint" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sprint信息 */}
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>当前Sprint详情</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentSprint ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg">{currentSprint.name}</h3>
                        <p className="text-muted-foreground">{currentSprint.goal}</p>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">开始日期</span>
                          <p className="font-medium">{currentSprint.startDate}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">结束日期</span>
                          <p className="font-medium">{currentSprint.endDate}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">团队容量</span>
                          <p className="font-medium">{currentSprint.capacity} 故事点</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">承诺点数</span>
                          <p className="font-medium">{currentSprint.committed} 故事点</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Sprint进度</span>
                          <span>{sprintProgress}%</span>
                        </div>
                        <Progress value={sprintProgress} className="h-3" />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">当前没有活跃的Sprint</p>
                      <SoundButton className="mt-4" soundType="click">
                        开始新Sprint
                      </SoundButton>
                    </div>
                  )}
                </CardContent>
              </EnhancedCard>

              {/* 燃尽图 */}
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>Sprint燃尽图</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center">
                    {currentSprint ? (
                      <div className="w-full space-y-4">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>剩余故事点</span>
                          <span>理想燃尽线</span>
                        </div>
                        <div className="relative h-40 bg-gray-50 rounded-lg p-4">
                          <div className="absolute inset-4 border-l-2 border-b-2 border-gray-300">
                            {/* 简化的燃尽图可视化 */}
                            <div className="absolute bottom-0 left-0 w-full h-full">
                              <div className="absolute bottom-0 left-0 w-4/6 h-3/4 bg-blue-200 opacity-50 rounded-tr-lg" />
                              <div className="absolute bottom-0 right-0 w-2/6 h-1/4 bg-green-200 opacity-50 rounded-tl-lg" />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Sprint开始</span>
                          <span>当前进度</span>
                          <span>Sprint结束</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">开始Sprint后查看燃尽图</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </EnhancedCard>
            </div>

            {/* Sprint用户故事 */}
            <EnhancedCard variant="modern">
              <CardHeader>
                <CardTitle>Sprint用户故事</CardTitle>
                <CardDescription>当前Sprint中的用户故事列表</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userStories
                    .filter((story) => story.sprint === currentSprint?.id)
                    .map((story) => (
                      <div key={story.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(story.status)}`} />
                          <div>
                            <h4 className="font-medium">{story.title}</h4>
                            <p className="text-sm text-muted-foreground">{story.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={getPriorityColor(story.priority)}>
                            {story.priority}
                          </Badge>
                          <Badge variant="secondary">{story.storyPoints}sp</Badge>
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">{story.assignee.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>

          {/* 产品待办 */}
          <TabsContent value="backlog" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">产品待办列表</h3>
              <SoundButton variant="default" soundType="click">
                <Plus className="w-4 h-4 mr-2" />
                新建用户故事
              </SoundButton>
            </div>

            {/* Epic分组 */}
            <div className="space-y-6">
              {epics.map((epic) => (
                <EnhancedCard key={epic.id} variant="traditional" glowEffect>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded ${epic.color}`} />
                        <div>
                          <CardTitle>{epic.title}</CardTitle>
                          <CardDescription>{epic.description}</CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{epic.progress}%</div>
                        <Progress value={epic.progress} className="w-20 h-2 mt-1" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {userStories
                        .filter((story) => story.epic === epic.id)
                        .map((story) => (
                          <div key={story.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(story.status)}`} />
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{story.title}</h4>
                                <p className="text-xs text-muted-foreground">{story.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className={`${getPriorityColor(story.priority)} text-xs`}>
                                {story.priority}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {story.storyPoints}sp
                              </Badge>
                              <SoundButton variant="ghost" size="sm" soundType="click">
                                <ArrowRight className="w-3 h-3" />
                              </SoundButton>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </EnhancedCard>
              ))}
            </div>
          </TabsContent>

          {/* 看板视图 */}
          <TabsContent value="kanban" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-h-96">
              {["backlog", "todo", "in-progress", "review", "done"].map((status) => (
                <EnhancedCard key={status} variant="modern" className="h-fit">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="capitalize">
                        {status === "backlog"
                          ? "待办"
                          : status === "todo"
                            ? "待开发"
                            : status === "in-progress"
                              ? "开发中"
                              : status === "review"
                                ? "评审中"
                                : "已完成"}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {userStories.filter((s) => s.status === status).length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {userStories
                      .filter((story) => story.status === status)
                      .map((story) => (
                        <div
                          key={story.id}
                          className="p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            // 简单的状态切换逻辑
                            const statusOrder = ["backlog", "todo", "in-progress", "review", "done"]
                            const currentIndex = statusOrder.indexOf(story.status)
                            if (currentIndex < statusOrder.length - 1) {
                              moveStory(story.id, statusOrder[currentIndex + 1] as UserStory["status"])
                            }
                          }}
                        >
                          <h4 className="font-medium text-sm mb-1">{story.title}</h4>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{story.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <Badge variant="outline" className={`${getPriorityColor(story.priority)} text-xs`}>
                                {story.priority}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {story.storyPoints}sp
                              </Badge>
                            </div>
                            <Avatar className="w-5 h-5">
                              <AvatarFallback className="text-xs">{story.assignee.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </EnhancedCard>
              ))}
            </div>
          </TabsContent>

          {/* 每日站会 */}
          <TabsContent value="standup" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">每日站会</h3>
              <SoundButton variant="default" soundType="click">
                <Coffee className="w-4 h-4 mr-2" />
                开始站会
              </SoundButton>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 团队状态 */}
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>团队更新</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "张伟", status: "completed", task: "完成用户注册API开发", mood: 4 },
                      { name: "王强", status: "in-progress", task: "设计数据库Schema", mood: 3 },
                      { name: "李明", status: "blocked", task: "前端组件优化", mood: 2 },
                      { name: "陈小红", status: "planning", task: "移动端设计评审", mood: 4 },
                    ].map((member) => (
                      <div key={member.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{member.name}</h4>
                            <p className="text-sm text-muted-foreground">{member.task}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(member.status)}`} />
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${star <= member.mood ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </EnhancedCard>

              {/* 阻塞问题 */}
              <EnhancedCard variant="modern" className="border-l-4 border-l-red-500">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    <span>阻塞问题</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-red-800">前端组件依赖问题</h4>
                          <p className="text-sm text-red-600 mt-1">等待后端API完成，无法继续前端开发</p>
                          <p className="text-xs text-muted-foreground mt-2">报告人: 李明 | 2小时前</p>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          高优先级
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-yellow-800">设计规范不明确</h4>
                          <p className="text-sm text-yellow-600 mt-1">移动端交互规范需要产品经理确认</p>
                          <p className="text-xs text-muted-foreground mt-2">报告人: 陈小红 | 1天前</p>
                        </div>
                        <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                          中优先级
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </div>

            {/* 今日目标 */}
            <EnhancedCard variant="traditional" glowEffect>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>今日团队目标</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">开发目标</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>完成用户登录API测试</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Circle className="w-3 h-3 text-gray-400" />
                        <span>解决前端组件依赖问题</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Circle className="w-3 h-3 text-gray-400" />
                        <span>数据库Schema评审</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">协作目标</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-center space-x-2">
                        <Circle className="w-3 h-3 text-gray-400" />
                        <span>跨团队依赖问题讨论</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Circle className="w-3 h-3 text-gray-400" />
                        <span>移动端设计规范确认</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Circle className="w-3 h-3 text-gray-400" />
                        <span>技术债务处理计划</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>

          {/* 回顾会议 */}
          <TabsContent value="retrospective" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Sprint回顾</h3>
              <SoundButton variant="default" soundType="click">
                <MessageSquare className="w-4 h-4 mr-2" />
                新建回顾
              </SoundButton>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 做得好的 */}
              <EnhancedCard variant="modern" className="border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-green-600">
                    <ThumbsUp className="w-5 h-5" />
                    <span>做得好的</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {retrospectives[0]?.whatWentWell.map((item, index) => (
                      <div key={index} className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-800">{item}</p>
                      </div>
                    ))}
                    <div className="pt-2">
                      <Textarea placeholder="添加新的正面反馈..." className="text-sm" rows={2} />
                      <SoundButton variant="outline" size="sm" className="mt-2" soundType="click">
                        <Plus className="w-3 h-3 mr-1" />
                        添加
                      </SoundButton>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>

              {/* 需要改进的 */}
              <EnhancedCard variant="modern" className="border-l-4 border-l-yellow-500">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-yellow-600">
                    <Lightbulb className="w-5 h-5" />
                    <span>需要改进的</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {retrospectives[0]?.whatCouldImprove.map((item, index) => (
                      <div key={index} className="p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-800">{item}</p>
                      </div>
                    ))}
                    <div className="pt-2">
                      <Textarea placeholder="添加改进建议..." className="text-sm" rows={2} />
                      <SoundButton variant="outline" size="sm" className="mt-2" soundType="click">
                        <Plus className="w-3 h-3 mr-1" />
                        添加
                      </SoundButton>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>

              {/* 行动计划 */}
              <EnhancedCard variant="modern" className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-blue-600">
                    <Zap className="w-5 h-5" />
                    <span>行动计划</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {retrospectives[0]?.actionItems.map((item, index) => (
                      <div key={index} className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <p className="text-sm text-blue-800 flex-1">{item}</p>
                          <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 ml-2 cursor-pointer hover:text-blue-700" />
                        </div>
                      </div>
                    ))}
                    <div className="pt-2">
                      <Textarea placeholder="添加行动计划..." className="text-sm" rows={2} />
                      <SoundButton variant="outline" size="sm" className="mt-2" soundType="click">
                        <Plus className="w-3 h-3 mr-1" />
                        添加
                      </SoundButton>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </div>

            {/* 团队士气投票 */}
            <EnhancedCard variant="traditional" glowEffect>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Flame className="w-5 h-5" />
                  <span>团队士气投票</span>
                </CardTitle>
                <CardDescription>团队成员对本Sprint的整体感受评分 (1-5分)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <div key={score} className="text-center">
                      <div className="mb-2">
                        <div
                          className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center text-white font-bold ${
                            score === 1
                              ? "bg-red-500"
                              : score === 2
                                ? "bg-orange-500"
                                : score === 3
                                  ? "bg-yellow-500"
                                  : score === 4
                                    ? "bg-blue-500"
                                    : "bg-green-500"
                          }`}
                        >
                          {score}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {score === 1
                          ? "很差"
                          : score === 2
                            ? "较差"
                            : score === 3
                              ? "一般"
                              : score === 4
                                ? "良好"
                                : "优秀"}
                      </p>
                      <div className="space-y-1">
                        {[1, 2, 3, 4].map((vote) => (
                          <div
                            key={vote}
                            className={`w-2 h-2 rounded-full mx-auto ${
                              (score === 4 && vote <= 2) || (score === 3 && vote === 1) ? "bg-gray-400" : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {score === 4 ? "2票" : score === 3 ? "1票" : "0票"}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <div className="text-2xl font-bold text-primary-600 mb-1">4.2</div>
                  <p className="text-sm text-muted-foreground">平均团队士气分数</p>
                  <div className="flex justify-center mt-2">
                    {[1, 2, 3, 4].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    <Star className="w-4 h-4 text-gray-300" />
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
