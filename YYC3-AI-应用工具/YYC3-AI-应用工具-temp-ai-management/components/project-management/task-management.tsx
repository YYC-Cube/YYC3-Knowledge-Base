"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  CheckSquare,
  Clock,
  User,
  Calendar,
  Flag,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  MessageSquare,
  Paperclip,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react"

interface Task {
  id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "review" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "critical"
  assignee: {
    id: string
    name: string
    avatar: string
  }
  project: string
  dueDate: string
  createdDate: string
  tags: string[]
  comments: number
  attachments: number
  subtasks: {
    id: string
    title: string
    completed: boolean
  }[]
  estimatedHours: number
  actualHours: number
}

export function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "设计系统架构",
      description: "设计整个云系统管理平台的技术架构和数据流",
      status: "completed",
      priority: "high",
      assignee: {
        id: "1",
        name: "张三",
        avatar: "/placeholder-user.jpg",
      },
      project: "云系统管理平台",
      dueDate: "2024-01-25",
      createdDate: "2024-01-15",
      tags: ["架构", "设计", "技术"],
      comments: 5,
      attachments: 3,
      subtasks: [
        { id: "1-1", title: "数据库设计", completed: true },
        { id: "1-2", title: "API设计", completed: true },
        { id: "1-3", title: "前端架构", completed: true },
      ],
      estimatedHours: 40,
      actualHours: 38,
    },
    {
      id: "2",
      title: "用户界面开发",
      description: "开发管理后台的用户界面组件",
      status: "in-progress",
      priority: "medium",
      assignee: {
        id: "2",
        name: "李四",
        avatar: "/placeholder-user.jpg",
      },
      project: "云系统管理平台",
      dueDate: "2024-02-15",
      createdDate: "2024-01-20",
      tags: ["前端", "React", "UI"],
      comments: 8,
      attachments: 2,
      subtasks: [
        { id: "2-1", title: "登录页面", completed: true },
        { id: "2-2", title: "仪表板", completed: true },
        { id: "2-3", title: "用户管理", completed: false },
        { id: "2-4", title: "系统设置", completed: false },
      ],
      estimatedHours: 60,
      actualHours: 35,
    },
    {
      id: "3",
      title: "API接口开发",
      description: "开发后端API接口和数据处理逻辑",
      status: "in-progress",
      priority: "high",
      assignee: {
        id: "3",
        name: "王五",
        avatar: "/placeholder-user.jpg",
      },
      project: "云系统管理平台",
      dueDate: "2024-02-10",
      createdDate: "2024-01-18",
      tags: ["后端", "Node.js", "API"],
      comments: 12,
      attachments: 1,
      subtasks: [
        { id: "3-1", title: "用户认证API", completed: true },
        { id: "3-2", title: "数据管理API", completed: false },
        { id: "3-3", title: "系统监控API", completed: false },
      ],
      estimatedHours: 50,
      actualHours: 28,
    },
    {
      id: "4",
      title: "数据库优化",
      description: "优化数据库查询性能和索引设计",
      status: "review",
      priority: "medium",
      assignee: {
        id: "4",
        name: "赵六",
        avatar: "/placeholder-user.jpg",
      },
      project: "云系统管理平台",
      dueDate: "2024-01-30",
      createdDate: "2024-01-22",
      tags: ["数据库", "优化", "性能"],
      comments: 3,
      attachments: 4,
      subtasks: [
        { id: "4-1", title: "查询优化", completed: true },
        { id: "4-2", title: "索引设计", completed: true },
        { id: "4-3", title: "性能测试", completed: false },
      ],
      estimatedHours: 25,
      actualHours: 22,
    },
    {
      id: "5",
      title: "安全测试",
      description: "进行系统安全漏洞扫描和渗透测试",
      status: "todo",
      priority: "critical",
      assignee: {
        id: "5",
        name: "孙七",
        avatar: "/placeholder-user.jpg",
      },
      project: "云系统管理平台",
      dueDate: "2024-02-20",
      createdDate: "2024-01-25",
      tags: ["安全", "测试", "漏洞"],
      comments: 1,
      attachments: 0,
      subtasks: [
        { id: "5-1", title: "漏洞扫描", completed: false },
        { id: "5-2", title: "渗透测试", completed: false },
        { id: "5-3", title: "安全报告", completed: false },
      ],
      estimatedHours: 30,
      actualHours: 0,
    },
  ])

  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("dueDate")
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "outline"
      case "in-progress":
        return "default"
      case "review":
        return "secondary"
      case "completed":
        return "secondary"
      case "cancelled":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "todo":
        return "待办"
      case "in-progress":
        return "进行中"
      case "review":
        return "待审核"
      case "completed":
        return "已完成"
      case "cancelled":
        return "已取消"
      default:
        return "未知"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "todo":
        return <Clock className="h-4 w-4" />
      case "in-progress":
        return <AlertCircle className="h-4 w-4" />
      case "review":
        return <Eye className="h-4 w-4" />
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "cancelled":
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "destructive"
      case "high":
        return "default"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "outline"
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "critical":
        return "紧急"
      case "high":
        return "高"
      case "medium":
        return "中"
      case "low":
        return "低"
      default:
        return "未知"
    }
  }

  const filteredTasks = tasks.filter((task) => {
    const matchesFilter = filter === "all" || task.status === filter
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title)
      case "priority":
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      case "assignee":
        return a.assignee.name.localeCompare(b.assignee.name)
      case "dueDate":
      default:
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }
  })

  const getTaskStats = () => {
    const total = tasks.length
    const todo = tasks.filter((t) => t.status === "todo").length
    const inProgress = tasks.filter((t) => t.status === "in-progress").length
    const completed = tasks.filter((t) => t.status === "completed").length
    const overdue = tasks.filter((t) => t.status !== "completed" && new Date(t.dueDate) < new Date()).length

    return { total, todo, inProgress, completed, overdue }
  }

  const stats = getTaskStats()

  const getCompletedSubtasks = (subtasks: Task["subtasks"]) => {
    return subtasks.filter((st) => st.completed).length
  }

  const isOverdue = (dueDate: string, status: string) => {
    return status !== "completed" && new Date(dueDate) < new Date()
  }

  return (
    <div className="space-y-6">
      {/* 任务统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总任务数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">待办</p>
                <p className="text-2xl font-bold text-gray-600">{stats.todo}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">进行中</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已完成</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">逾期任务</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 任务管理工具栏 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>任务管理</CardTitle>
              <CardDescription>创建、分配和跟踪项目任务</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={viewMode} onValueChange={(value: "list" | "kanban") => setViewMode(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">列表视图</SelectItem>
                  <SelectItem value="kanban">看板视图</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    新建任务
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>创建新任务</DialogTitle>
                    <DialogDescription>填写任务详细信息并分配给团队成员</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>任务标题</Label>
                        <Input placeholder="输入任务标题" />
                      </div>
                      <div className="space-y-2">
                        <Label>所属项目</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="选择项目" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="project1">云系统管理平台</SelectItem>
                            <SelectItem value="project2">移动端应用开发</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>任务描述</Label>
                      <Textarea placeholder="详细描述任务内容和要求" rows={3} />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>优先级</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="选择优先级" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">低</SelectItem>
                            <SelectItem value="medium">中</SelectItem>
                            <SelectItem value="high">高</SelectItem>
                            <SelectItem value="critical">紧急</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>分配给</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="选择负责人" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user1">张三</SelectItem>
                            <SelectItem value="user2">李四</SelectItem>
                            <SelectItem value="user3">王五</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>截止日期</Label>
                        <Input type="date" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>预估工时（小时）</Label>
                        <Input type="number" placeholder="0" />
                      </div>
                      <div className="space-y-2">
                        <Label>标签</Label>
                        <Input placeholder="输入标签，用逗号分隔" />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={() => setIsCreateDialogOpen(false)}>创建任务</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索任务..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="筛选状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="todo">待办</SelectItem>
                <SelectItem value="in-progress">进行中</SelectItem>
                <SelectItem value="review">待审核</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dueDate">截止日期</SelectItem>
                <SelectItem value="title">任务标题</SelectItem>
                <SelectItem value="priority">优先级</SelectItem>
                <SelectItem value="assignee">负责人</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 任务列表 */}
          <div className="space-y-4">
            {sortedTasks.map((task) => (
              <Card
                key={task.id}
                className={`hover:shadow-md transition-shadow ${
                  isOverdue(task.dueDate, task.status) ? "border-red-200 bg-red-50/50" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Checkbox />
                        <h3 className="text-lg font-semibold">{task.title}</h3>
                        <Badge variant={getStatusColor(task.status) as any} className="flex items-center gap-1">
                          {getStatusIcon(task.status)}
                          {getStatusText(task.status)}
                        </Badge>
                        <Badge variant={getPriorityColor(task.priority) as any}>
                          <Flag className="h-3 w-3 mr-1" />
                          {getPriorityText(task.priority)}
                        </Badge>
                        {isOverdue(task.dueDate, task.status) && <Badge variant="destructive">逾期</Badge>}
                      </div>
                      <p className="text-muted-foreground mb-3">{task.description}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {task.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={task.assignee.avatar || "/placeholder.svg"} alt={task.assignee.name} />
                        <AvatarFallback>{task.assignee.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{task.assignee.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {task.actualHours}h / {task.estimatedHours}h
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{task.comments}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{task.attachments}</span>
                      </div>
                    </div>
                  </div>

                  {task.subtasks.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">子任务进度</span>
                        <span className="text-sm text-muted-foreground">
                          {getCompletedSubtasks(task.subtasks)} / {task.subtasks.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {task.subtasks.slice(0, 3).map((subtask) => (
                          <div key={subtask.id} className="flex items-center gap-2">
                            <Checkbox checked={subtask.completed} />
                            <span
                              className={`text-sm ${subtask.completed ? "line-through text-muted-foreground" : ""}`}
                            >
                              {subtask.title}
                            </span>
                          </div>
                        ))}
                        {task.subtasks.length > 3 && (
                          <div className="text-sm text-muted-foreground">
                            还有 {task.subtasks.length - 3} 个子任务...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">项目: {task.project}</div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        编辑
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        查看详情
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {sortedTasks.length === 0 && (
            <div className="text-center py-12">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">没有找到任务</h3>
              <p className="text-muted-foreground mb-4">{searchTerm ? "尝试调整搜索条件" : "开始创建您的第一个任务"}</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                新建任务
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
