"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare, Tag, Send, Paperclip, Star, Eye, Edit, Target, Plus, Search, Clock, Timer, TrendingUp } from "lucide-react"

// 数据接口定义
interface SupportTicket {
  id: string
  ticketNumber: string
  title: string
  description: string
  category: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "open" | "in-progress" | "pending" | "resolved" | "closed"
  customerName: string
  customerEmail: string
  customerPhone?: string
  assignedTo?: string
  assignedToName?: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  dueDate: string
  tags: string[]
  attachments: string[]
  messages: TicketMessage[]
  satisfaction?: number
  resolution?: string
}

interface TicketMessage {
  id: string
  ticketId: string
  sender: string
  senderName: string
  senderType: "customer" | "agent" | "system"
  content: string
  timestamp: string
  attachments?: string[]
  isInternal?: boolean
}

interface TicketCategory {
  id: string
  name: string
  description: string
  defaultPriority: string
  slaHours: number
  assignedTeam?: string
}

interface Agent {
  id: string
  name: string
  email: string
  department: string
  avatar?: string
  isOnline: boolean
  activeTickets: number
  resolvedToday: number
}

export function TicketSystem() {
  const [activeTab, setActiveTab] = useState("tickets")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newMessage, setNewMessage] = useState("")

  // 模拟数据
  const [categories] = useState<TicketCategory[]>([
    {
      id: "tech-support",
      name: "技术支持",
      description: "系统使用、功能咨询等技术问题",
      defaultPriority: "medium",
      slaHours: 24,
      assignedTeam: "技术团队",
    },
    {
      id: "billing",
      name: "账单问题",
      description: "付费、退款、发票等财务相关问题",
      defaultPriority: "high",
      slaHours: 12,
      assignedTeam: "财务团队",
    },
    {
      id: "feature-request",
      name: "功能建议",
      description: "新功能需求、产品改进建议",
      defaultPriority: "low",
      slaHours: 72,
      assignedTeam: "产品团队",
    },
    {
      id: "bug-report",
      name: "故障报告",
      description: "系统错误、功能异常等问题",
      defaultPriority: "high",
      slaHours: 8,
      assignedTeam: "开发团队",
    },
  ])

  const [agents] = useState<Agent[]>([
    {
      id: "agent-001",
      name: "张小明",
      email: "zhang@company.com",
      department: "技术支持",
      isOnline: true,
      activeTickets: 8,
      resolvedToday: 12,
    },
    {
      id: "agent-002",
      name: "李小红",
      email: "li@company.com",
      department: "客户服务",
      isOnline: true,
      activeTickets: 6,
      resolvedToday: 15,
    },
    {
      id: "agent-003",
      name: "王小强",
      email: "wang@company.com",
      department: "技术支持",
      isOnline: false,
      activeTickets: 4,
      resolvedToday: 8,
    },
  ])

  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: "TKT-2024-001",
      ticketNumber: "TKT-2024-001",
      title: "登录系统时出现错误提示",
      description: "用户在登录时遇到\"网络连接超时\"错误，无法正常访问系统。已尝试清除缓存和重启浏览器，问题依然存在。",
      category: "tech-support",
      priority: "high",
      status: "in-progress",
      customerName: "北京科技有限公司",
      customerEmail: "support@bjtech.com",
      customerPhone: "010-12345678",
      assignedTo: "agent-001",
      assignedToName: "张小明",
      createdAt: "2024-01-15 09:30:00",
      updatedAt: "2024-01-15 14:20:00",
      dueDate: "2024-01-16 09:30:00",
      tags: ["登录问题", "网络错误", "紧急"],
      attachments: ["error-screenshot.png", "browser-log.txt"],
      messages: [
        {
          id: "msg-001",
          ticketId: "TKT-2024-001",
          sender: "customer",
          senderName: "北京科技有限公司",
          senderType: "customer",
          content: "用户在登录时遇到\"网络连接超时\"错误，无法正常访问系统。已尝试清除缓存和重启浏览器，问题依然存在。",
          timestamp: "2024-01-15 09:30:00",
          attachments: ["error-screenshot.png"],
        },
        {
          id: "msg-002",
          ticketId: "TKT-2024-001",
          sender: "agent-001",
          senderName: "张小明",
          senderType: "agent",
          content: "您好，我已收到您的问题反馈。请问您使用的是什么浏览器和版本？另外，这个问题是从什么时候开始出现的？",
          timestamp: "2024-01-15 10:15:00",
        },
        {
          id: "msg-003",
          ticketId: "TKT-2024-001",
          sender: "customer",
          senderName: "北京科技有限公司",
          senderType: "customer",
          content: "我们使用的是Chrome浏览器，版本是120.0.6099.109。问题从昨天下午开始出现，影响了多个用户。",
          timestamp: "2024-01-15 11:30:00",
        },
        {
          id: "msg-004",
          ticketId: "TKT-2024-001",
          sender: "agent-001",
          senderName: "张小明",
          senderType: "agent",
          content: "感谢您提供的信息。我们发现服务器在昨天下午进行了维护，可能影响了部分用户的访问。我正在联系技术团队进行处理，预计今天下午就能解决。",
          timestamp: "2024-01-15 14:20:00",
        },
      ],
    },
    {
      id: "TKT-2024-002",
      ticketNumber: "TKT-2024-002",
      title: "账单金额显示异常",
      description: "客户反映本月账单金额与实际使用量不符，需要核实并调整。",
      category: "billing",
      priority: "medium",
      status: "pending",
      customerName: "上海贸易公司",
      customerEmail: "finance@shtrade.com",
      customerPhone: "021-87654321",
      assignedTo: "agent-002",
      assignedToName: "李小红",
      createdAt: "2024-01-14 16:45:00",
      updatedAt: "2024-01-15 09:10:00",
      dueDate: "2024-01-15 16:45:00",
      tags: ["账单", "金额异常"],
      attachments: ["billing-statement.pdf"],
      messages: [
        {
          id: "msg-005",
          ticketId: "TKT-2024-002",
          sender: "customer",
          senderName: "上海贸易公司",
          senderType: "customer",
          content: "我们发现本月账单金额比预期高出30%，但使用量并没有明显增加。请帮忙核实一下。",
          timestamp: "2024-01-14 16:45:00",
          attachments: ["billing-statement.pdf"],
        },
        {
          id: "msg-006",
          ticketId: "TKT-2024-002",
          sender: "agent-002",
          senderName: "李小红",
          senderType: "agent",
          content: "您好，我已收到您的账单问题。我需要联系财务部门核实具体的计费详情，预计明天上午给您回复。",
          timestamp: "2024-01-15 09:10:00",
        },
      ],
    },
    {
      id: "TKT-2024-003",
      ticketNumber: "TKT-2024-003",
      title: "希望增加数据导出功能",
      description: "客户希望系统能够支持批量数据导出功能，方便进行数据分析。",
      category: "feature-request",
      priority: "low",
      status: "open",
      customerName: "深圳制造企业",
      customerEmail: "it@szmfg.com",
      createdAt: "2024-01-13 14:20:00",
      updatedAt: "2024-01-13 14:20:00",
      dueDate: "2024-01-16 14:20:00",
      tags: ["功能需求", "数据导出"],
      attachments: [],
      messages: [
        {
          id: "msg-007",
          ticketId: "TKT-2024-003",
          sender: "customer",
          senderName: "深圳制造企业",
          senderType: "customer",
          content: "我们希望系统能够支持批量数据导出功能，包括Excel和CSV格式，方便我们进行数据分析和报告制作。",
          timestamp: "2024-01-13 14:20:00",
        },
      ],
    },
    {
      id: "TKT-2024-004",
      ticketNumber: "TKT-2024-004",
      title: "系统响应速度慢",
      description: "最近几天系统响应速度明显变慢，页面加载时间超过10秒。",
      category: "bug-report",
      priority: "urgent",
      status: "resolved",
      customerName: "广州软件公司",
      customerEmail: "tech@gzsoft.com",
      assignedTo: "agent-003",
      assignedToName: "王小强",
      createdAt: "2024-01-12 11:30:00",
      updatedAt: "2024-01-13 16:45:00",
      resolvedAt: "2024-01-13 16:45:00",
      dueDate: "2024-01-12 19:30:00",
      tags: ["性能问题", "响应慢"],
      attachments: ["performance-report.pdf"],
      satisfaction: 5,
      resolution: "通过优化数据库查询和增加缓存机制，系统响应速度已恢复正常。",
      messages: [
        {
          id: "msg-008",
          ticketId: "TKT-2024-004",
          sender: "customer",
          senderName: "广州软件公司",
          senderType: "customer",
          content: "最近几天系统响应速度明显变慢，页面加载时间超过10秒，严重影响工作效率。",
          timestamp: "2024-01-12 11:30:00",
        },
        {
          id: "msg-009",
          ticketId: "TKT-2024-004",
          sender: "agent-003",
          senderName: "王小强",
          senderType: "agent",
          content: "我们已经识别到性能问题，技术团队正在紧急处理。预计今天下午就能解决。",
          timestamp: "2024-01-12 14:20:00",
        },
        {
          id: "msg-010",
          ticketId: "TKT-2024-004",
          sender: "agent-003",
          senderName: "王小强",
          senderType: "agent",
          content: "问题已解决。我们优化了数据库查询并增加了缓存机制，系统响应速度已恢复正常。请您测试确认。",
          timestamp: "2024-01-13 16:45:00",
        },
        {
          id: "msg-011",
          ticketId: "TKT-2024-004",
          sender: "customer",
          senderName: "广州软件公司",
          senderType: "customer",
          content: "测试确认问题已解决，系统响应速度恢复正常。感谢快速处理！",
          timestamp: "2024-01-13 17:30:00",
        },
      ],
    },
  ])

  // 过滤工单数据
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  // 状态标签组件
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-blue-100 text-blue-800">待处理</Badge>
      case "in-progress":
        return <Badge className="bg-yellow-100 text-yellow-800">处理中</Badge>
      case "pending":
        return <Badge className="bg-orange-100 text-orange-800">等待回复</Badge>
      case "resolved":
        return <Badge className="bg-green-100 text-green-800">已解决</Badge>
      case "closed":
        return <Badge variant="secondary">已关闭</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge className="bg-red-600 text-white">紧急</Badge>
      case "high":
        return <Badge className="bg-red-100 text-red-800">高</Badge>
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800">中</Badge>
      case "low":
        return <Badge className="bg-green-100 text-green-800">低</Badge>
      default:
        return <Badge variant="secondary">{priority}</Badge>
    }
  }

  // 发送消息
  const handleSendMessage = (ticketId: string) => {
    if (!newMessage.trim()) return

    const message: TicketMessage = {
      id: `msg-${Date.now()}`,
      ticketId,
      sender: "agent-001",
      senderName: "张小明",
      senderType: "agent",
      content: newMessage,
      timestamp: new Date().toISOString(),
    }

    setTickets(prev => 
      prev.map(ticket => 
        ticket.id === ticketId 
          ? { 
              ...ticket, 
              messages: [...ticket.messages, message],
              updatedAt: new Date().toISOString()
            }
          : ticket
      )
    )

    setNewMessage("")
  }

  // 更新工单状态
  const updateTicketStatus = (ticketId: string, newStatus: string) => {
    setTickets(prev => 
      prev.map(ticket => 
        ticket.id === ticketId 
          ? { 
              ...ticket, 
              status: newStatus as any,
              updatedAt: new Date().toISOString(),
              resolvedAt: newStatus === "resolved" ? new Date().toISOString() : ticket.resolvedAt
            }
          : ticket
      )
    )
  }

  // 分配工单
  const assignTicket = (ticketId: string, agentId: string, agentName: string) => {
    setTickets(prev => 
      prev.map(ticket => 
        ticket.id === ticketId 
          ? { 
              ...ticket, 
              assignedTo: agentId,
              assignedToName: agentName,
              status: "in-progress",
              updatedAt: new Date().toISOString()
            }
          : ticket
      )
    )
  }

  // 统计数据
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    inProgress: tickets.filter(t => t.status === "in-progress").length,
    pending: tickets.filter(t => t.status === "pending").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
    avgResolutionTime: "2.3天",
    satisfactionRate: "4.2/5.0",
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">客服工单系统</h1>
          <p className="text-muted-foreground mt-1">高效的客户服务工单管理和跟踪系统</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <TrendingUp className="w-4 h-4 mr-2" />
            数据报告
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                创建工单
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>创建新工单</DialogTitle>
                <DialogDescription>为客户创建服务工单</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>客户名称</Label>
                    <input placeholder="输入客户名称" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                  </div>
                  <div>
                    <Label>客户邮箱</Label>
                    <input type="email" placeholder="customer@example.com" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>问题分类</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="选择分类" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>优先级</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="选择优先级" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">低</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="high">高</SelectItem>
                        <SelectItem value="urgent">紧急</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>工单标题</Label>
                  <input placeholder="简要描述问题" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                </div>
                <div>
                  <Label>问题描述</Label>
                  <Textarea placeholder="详细描述客户遇到的问题" rows={4} />
                </div>
                <div>
                  <Label>分配给</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择处理人员" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.filter(agent => agent.isOnline).map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name} - {agent.department} ({agent.activeTickets} 个活跃工单)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button onClick={() => setShowCreateDialog(false)}>
                  创建工单
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">工单总数</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">本周新增 {Math.floor(stats.total * 0.3)} 个</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待处理</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.open + stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">需要及时响应</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均解决时间</CardTitle>
            <Timer className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.avgResolutionTime}</div>
            <p className="text-xs text-muted-foreground">比上月减少 0.5天</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">客户满意度</CardTitle>
            <Star className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.satisfactionRate}</div>
            <p className="text-xs text-muted-foreground">满意度持续提升</p>
          </CardContent>
        </Card>
      </div>

      {/* 主要功能选项卡 */}
      <div className="space-y-4">
        <div className="flex border-b">
          <button
            className={`px-4 py-2 font-medium ${activeTab === "tickets" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("tickets")}
          >
            工单管理
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === "agents" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("agents")}
          >
            客服人员
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === "categories" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("categories")}
          >
            分类设置
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === "analytics" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("analytics")}
          >
            数据分析
          </button>
        </div>

        {/* 工单管理 */}
        {activeTab === "tickets" && (
          <div className="space-y-4">
            {/* 搜索和过滤 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <input
                        placeholder="搜索工单标题、客户名称或工单号..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background pl-10 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有状态</SelectItem>
                        <SelectItem value="open">待处理</SelectItem>
                        <SelectItem value="in-progress">处理中</SelectItem>
                        <SelectItem value="pending">等待回复</SelectItem>
                        <SelectItem value="resolved">已解决</SelectItem>
                        <SelectItem value="closed">已关闭</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有优先级</SelectItem>
                        <SelectItem value="urgent">紧急</SelectItem>
                        <SelectItem value="high">高</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="low">低</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 工单列表 */}
            <Card>
              <CardHeader>
                <CardTitle>工单列表</CardTitle>
                <CardDescription>
                  显示 {filteredTickets.length} 个工单，共 {tickets.length} 个
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <div className="grid grid-cols-8 gap-4 p-4 font-medium border-b">
                    <div className="col-span-2">工单信息</div>
                    <div>客户</div>
                    <div>分类</div>
                    <div>优先级</div>
                    <div>状态</div>
                    <div>处理人</div>
                    <div>操作</div>
                  </div>
                  {filteredTickets.map((ticket) => (
                    <div key={ticket.id} className="grid grid-cols-8 gap-4 p-4 border-b last:border-b-0">
                      <div className="col-span-2">
                        <div className="font-medium">{ticket.title}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {ticket.ticketNumber}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">{ticket.customerName}</div>
                        <div className="text-sm text-muted-foreground">{ticket.customerEmail}</div>
                      </div>
                      <div>
                        <Badge variant="outline">
                          {categories.find(c => c.id === ticket.category)?.name || ticket.category}
                        </Badge>
                      </div>
                      <div>{getPriorityBadge(ticket.priority)}</div>
                      <div>{getStatusBadge(ticket.status)}</div>
                      <div>
                        {ticket.assignedToName ? (
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {ticket.assignedToName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{ticket.assignedToName}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">未分配</span>
                        )}
                      </div>
                      <div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>分配工单</DialogTitle>
                                <DialogDescription>
                                  将工单 {ticket.ticketNumber} 分配给客服人员
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>选择客服人员</Label>
                                  <Select onValueChange={(value) => {
                                    const agent = agents.find(a => a.id === value)
                                    if (agent) {
                                      assignTicket(ticket.id, agent.id, agent.name)
                                    }
                                  }}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="选择客服人员" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {agents.map((agent) => (
                                        <SelectItem key={agent.id} value={agent.id}>
                                          <div className="flex items-center space-x-2">
                                            <div className={`w-2 h-2 rounded-full ${agent.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            <span>{agent.name} - {agent.department}</span>
                                            <span className="text-xs text-muted-foreground">
                                              ({agent.activeTickets} 个活跃)
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>更新状态</Label>
                                  <Select onValueChange={(value) => updateTicketStatus(ticket.id, value)}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="选择状态" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="open">待处理</SelectItem>
                                      <SelectItem value="in-progress">处理中</SelectItem>
                                      <SelectItem value="pending">等待回复</SelectItem>
                                      <SelectItem value="resolved">已解决</SelectItem>
                                      <SelectItem value="closed">已关闭</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 客服人员 */}
        {activeTab === "agents" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">客服人员管理</h3>
              <p className="text-sm text-muted-foreground">管理客服团队和工作负载分配</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <Card key={agent.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Avatar>
                          <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-sm text-muted-foreground">{agent.department}</div>
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${agent.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">活跃工单</span>
                        <span className="font-medium">{agent.activeTickets}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">今日已解决</span>
                        <span className="font-medium text-green-600">{agent.resolvedToday}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">状态</span>
                        <Badge variant={agent.isOnline ? "default" : "secondary"}>
                          {agent.isOnline ? "在线" : "离线"}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          消息
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                          <Eye className="w-4 h-4 mr-1" />
                          详情
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 分类设置 */}
        {activeTab === "categories" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">工单分类管理</h3>
                <p className="text-sm text-muted-foreground">配置工单分类和SLA时间</p>
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                新增分类
              </Button>
            </div>

            <div className="grid gap-4">
              {categories.map((category) => (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{category.name}</span>
                      <Badge variant="outline">{category.slaHours}小时 SLA</Badge>
                    </CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">默认优先级：</span>
                        <span className="font-medium">{category.defaultPriority}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">负责团队：</span>
                        <span className="font-medium">{category.assignedTeam}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">SLA时间：</span>
                        <span className="font-medium">{category.slaHours}小时</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-1" />
                        编辑
                      </Button>
                      <Button variant="outline" size="sm">
                        <Target className="w-4 h-4 mr-1" />
                        SLA设置
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 数据分析 */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">客服数据分析</h3>
              <p className="text-sm text-muted-foreground">分析客服效率和客户满意度趋势</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>工单状态分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">待处理</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-blue-200 h-2 rounded"></div>
                        <span className="text-sm font-medium">{stats.open}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">处理中</span>
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-yellow-200 h-2 rounded"></div>
                        <span className="text-sm font-medium">{stats.inProgress}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">等待回复</span>
                      <div className="flex items-center gap-2">
                        <div className="w-8 bg-orange-200 h-2 rounded"></div>
                        <span className="text-sm font-medium">{stats.pending}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">已解决</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-green-200 h-2 rounded"></div>
                        <span className="text-sm font-medium">{stats.resolved}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>响应时间分析</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">首次响应时间</span>
                      <span className="font-medium">2.3小时</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: "85%" }}></div>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm">平均解决时间</span>
                      <span className="font-medium">1.8天</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: "72%" }}></div>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm">SLA达成率</span>
                      <span className="font-medium">89%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{ width: "89%" }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>客户满意度趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">4.5</div>
                    <div className="text-sm text-muted-foreground">本周平均</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">4.2</div>
                    <div className="text-sm text-muted-foreground">上周平均</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">4.0</div>
                    <div className="text-sm text-muted-foreground">本月平均</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">92%</div>
                    <div className="text-sm text-muted-foreground">推荐率</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* 工单详情对话框 */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedTicket.title}</span>
                <div className="flex gap-2">
                  {getStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}
                </div>
              </DialogTitle>
              <DialogDescription>
                工单号：{selectedTicket.ticketNumber} | 创建时间：{selectedTicket.createdAt}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* 基本信息 */}
              <div>
                <h4 className="font-medium mb-3">基本信息</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">客户名称：</span>
                    <span className="font-medium">{selectedTicket.customerName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">联系邮箱：</span>
                    <span>{selectedTicket.customerEmail}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">联系电话：</span>
                    <span>{selectedTicket.customerPhone || "未提供"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">处理人员：</span>
                    <span>{selectedTicket.assignedToName || "未分配"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">问题分类：</span>
                    <span>{categories.find(c => c.id === selectedTicket.category)?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">截止时间：</span>
                    <span>{selectedTicket.dueDate}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 问题描述 */}
              <div>
                <h4 className="font-medium mb-3">问题描述</h4>
                <div className="p-3 bg-gray-50 rounded text-sm">
                  {selectedTicket.description}
                </div>
              </div>

              {/* 标签 */}
              {selectedTicket.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">标签</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTicket.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* 对话记录 */}
              <div>
                <h4 className="font-medium mb-3">对话记录</h4>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {selectedTicket.messages.map((message) => (
                    <div key={message.id} className={`flex ${message.senderType === 'customer' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[70%] ${
                        message.senderType === 'customer' 
                          ? 'bg-gray-100' 
                          : message.senderType === 'agent'
                          ? 'bg-blue-100'
                          : 'bg-yellow-100'
                      } rounded-lg p-3`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {message.senderName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{message.senderName}</span>
                            <Badge variant="outline" className="text-xs">
                              {message.senderType === 'customer' ? '客户' : 
                               message.senderType === 'agent' ? '客服' : '系统'}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {message.timestamp.split(' ')[1]}
                          </span>
                        </div>
                        <div className="text-sm">{message.content}</div>
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.attachments.map((file, index) => (
                              <div key={index} className="flex items-center space-x-2 text-xs">
                                <Paperclip className="w-3 h-3" />
                                <span>{file}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 回复框 */}
              {selectedTicket.status !== "closed" && (
                <div>
                  <h4 className="font-medium mb-3">回复客户</h4>
                  <div className="space-y-3">
                    <Textarea
                      placeholder="输入回复内容..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Paperclip className="w-4 h-4 mr-1" />
                          附件
                        </Button>
                        <Select onValueChange={(value) => updateTicketStatus(selectedTicket.id, value)}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="更新状态" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in-progress">处理中</SelectItem>
                            <SelectItem value="pending">等待回复</SelectItem>
                            <SelectItem value="resolved">已解决</SelectItem>
                            <SelectItem value="closed">关闭工单</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={() => handleSendMessage(selectedTicket.id)}>
                        <Send className="w-4 h-4 mr-2" />
                        发送回复
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* 解决方案和满意度 */}
              {selectedTicket.status === "resolved" && (
                <div>
                  <h4 className="font-medium mb-3">解决方案</h4>
                  <div className="p-3 bg-green-50 rounded text-sm">
                    {selectedTicket.resolution}
                  </div>
                  {selectedTicket.satisfaction && (
                    <div className="mt-3">
                      <span className="text-sm text-muted-foreground">客户满意度：</span>
                      <div className="flex items-center space-x-1 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= selectedTicket.satisfaction!
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="text-sm ml-2">{selectedTicket.satisfaction}/5</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
