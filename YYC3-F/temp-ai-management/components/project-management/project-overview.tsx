"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  FolderOpen,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Activity,
} from "lucide-react"

interface Project {
  id: string
  name: string
  description: string
  status: "active" | "completed" | "paused" | "cancelled"
  priority: "low" | "medium" | "high" | "critical"
  progress: number
  startDate: string
  endDate: string
  budget: number
  spent: number
  team: {
    id: string
    name: string
    role: string
    avatar: string
  }[]
  tags: string[]
  lastActivity: string
}

export function ProjectOverview() {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "1",
      name: "云系统管理平台",
      description: "构建现代化的云系统管理和监控平台",
      status: "active",
      priority: "high",
      progress: 75,
      startDate: "2024-01-15",
      endDate: "2024-06-30",
      budget: 500000,
      spent: 375000,
      team: [
        { id: "1", name: "张三", role: "项目经理", avatar: "/placeholder-user.jpg" },
        { id: "2", name: "李四", role: "前端开发", avatar: "/placeholder-user.jpg" },
        { id: "3", name: "王五", role: "后端开发", avatar: "/placeholder-user.jpg" },
        { id: "4", name: "赵六", role: "UI设计师", avatar: "/placeholder-user.jpg" },
      ],
      tags: ["React", "Node.js", "云计算"],
      lastActivity: "2024-01-20T10:30:00Z",
    },
    {
      id: "2",
      name: "移动端应用开发",
      description: "开发跨平台移动应用程序",
      status: "active",
      priority: "medium",
      progress: 45,
      startDate: "2024-02-01",
      endDate: "2024-08-15",
      budget: 300000,
      spent: 135000,
      team: [
        { id: "5", name: "孙七", role: "移动开发", avatar: "/placeholder-user.jpg" },
        { id: "6", name: "周八", role: "UI设计师", avatar: "/placeholder-user.jpg" },
      ],
      tags: ["React Native", "Flutter", "移动开发"],
      lastActivity: "2024-01-19T15:45:00Z",
    },
    {
      id: "3",
      name: "数据分析系统",
      description: "构建企业级数据分析和可视化系统",
      status: "completed",
      priority: "high",
      progress: 100,
      startDate: "2023-09-01",
      endDate: "2023-12-31",
      budget: 400000,
      spent: 380000,
      team: [
        { id: "7", name: "吴九", role: "数据工程师", avatar: "/placeholder-user.jpg" },
        { id: "8", name: "郑十", role: "算法工程师", avatar: "/placeholder-user.jpg" },
      ],
      tags: ["Python", "TensorFlow", "数据分析"],
      lastActivity: "2023-12-31T23:59:00Z",
    },
    {
      id: "4",
      name: "安全审计工具",
      description: "开发自动化安全审计和漏洞扫描工具",
      status: "paused",
      priority: "critical",
      progress: 30,
      startDate: "2024-01-01",
      endDate: "2024-05-31",
      budget: 250000,
      spent: 75000,
      team: [{ id: "9", name: "冯十一", role: "安全工程师", avatar: "/placeholder-user.jpg" }],
      tags: ["安全", "自动化", "扫描"],
      lastActivity: "2024-01-10T09:15:00Z",
    },
  ])

  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("lastActivity")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "completed":
        return "secondary"
      case "paused":
        return "outline"
      case "cancelled":
        return "destructive"
      default:
        return "default"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "进行中"
      case "completed":
        return "已完成"
      case "paused":
        return "已暂停"
      case "cancelled":
        return "已取消"
      default:
        return "未知"
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

  const filteredProjects = projects.filter((project) => {
    const matchesFilter = filter === "all" || project.status === filter
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name)
      case "progress":
        return b.progress - a.progress
      case "priority":
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      case "lastActivity":
      default:
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    }
  })

  const getProjectStats = () => {
    const total = projects.length
    const active = projects.filter((p) => p.status === "active").length
    const completed = projects.filter((p) => p.status === "completed").length
    const overdue = projects.filter((p) => p.status === "active" && new Date(p.endDate) < new Date()).length

    return { total, active, completed, overdue }
  }

  const stats = getProjectStats()

  return (
    <div className="space-y-6">
      {/* 项目统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总项目数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">进行中</p>
                <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
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
                <p className="text-sm font-medium text-muted-foreground">逾期项目</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选和搜索 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>项目列表</CardTitle>
              <CardDescription>管理和监控所有项目的进展情况</CardDescription>
            </div>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              新建项目
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索项目..."
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
                <SelectItem value="active">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="paused">已暂停</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastActivity">最近活动</SelectItem>
                <SelectItem value="name">项目名称</SelectItem>
                <SelectItem value="progress">完成进度</SelectItem>
                <SelectItem value="priority">优先级</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 项目列表 */}
          <div className="space-y-4">
            {sortedProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{project.name}</h3>
                        <Badge variant={getStatusColor(project.status) as any}>{getStatusText(project.status)}</Badge>
                        <Badge variant={getPriorityColor(project.priority) as any}>
                          {getPriorityText(project.priority)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-3">{project.description}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {project.tags.map((tag) => (
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">完成进度</span>
                        <span className="text-sm text-muted-foreground">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">预算使用</span>
                        <span className="text-sm text-muted-foreground">
                          {Math.round((project.spent / project.budget) * 100)}%
                        </span>
                      </div>
                      <Progress value={(project.spent / project.budget) * 100} className="h-2" />
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(project.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{project.team.length}人</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">团队成员:</span>
                      <div className="flex -space-x-2">
                        {project.team.slice(0, 4).map((member) => (
                          <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        ))}
                        {project.team.length > 4 && (
                          <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                            <span className="text-xs font-medium">+{project.team.length - 4}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        最后活动: {new Date(project.lastActivity).toLocaleDateString()}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          查看详情
                        </Button>
                        <Button size="sm">管理项目</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {sortedProjects.length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">没有找到项目</h3>
              <p className="text-muted-foreground mb-4">{searchTerm ? "尝试调整搜索条件" : "开始创建您的第一个项目"}</p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新建项目
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
