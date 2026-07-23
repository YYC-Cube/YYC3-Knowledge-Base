"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Plus, Eye, Edit, Phone, Mail, DollarSign, Users, Star, MessageSquare, Activity } from "lucide-react"

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  company: string
  address: string
  status: "active" | "inactive" | "potential" | "vip"
  totalOrders: number
  totalSpent: number
  lastOrderDate: string
  joinDate: string
  avatar?: string
  notes: string
  tags: string[]
}

const mockCustomers: Customer[] = [
  {
    id: "1",
    name: "张三",
    email: "zhangsan@example.com",
    phone: "13800138001",
    company: "科技有限公司",
    address: "北京市朝阳区xxx街道xxx号",
    status: "vip",
    totalOrders: 15,
    totalSpent: 45600,
    lastOrderDate: "2024-01-15",
    joinDate: "2023-06-15",
    notes: "重要客户，需要优先服务",
    tags: ["VIP客户", "大客户", "长期合作"],
  },
  {
    id: "2",
    name: "李四",
    email: "lisi@example.com",
    phone: "13800138002",
    company: "贸易公司",
    address: "上海市浦东新区xxx路xxx号",
    status: "active",
    totalOrders: 8,
    totalSpent: 23400,
    lastOrderDate: "2024-01-12",
    joinDate: "2023-09-20",
    notes: "定期采购，信誉良好",
    tags: ["活跃客户", "定期采购"],
  },
  {
    id: "3",
    name: "王五",
    email: "wangwu@example.com",
    phone: "13800138003",
    company: "制造企业",
    address: "广州市天河区xxx大道xxx号",
    status: "potential",
    totalOrders: 2,
    totalSpent: 5600,
    lastOrderDate: "2024-01-08",
    joinDate: "2024-01-01",
    notes: "新客户，有潜力发展",
    tags: ["新客户", "潜在客户"],
  },
]

const statusColors = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  potential: "bg-blue-100 text-blue-800",
  vip: "bg-purple-100 text-purple-800",
}

const statusLabels = {
  active: "活跃",
  inactive: "非活跃",
  potential: "潜在",
  vip: "VIP",
}

const customerActivities = [
  { id: "1", type: "order", description: "下单购买智能手机", date: "2024-01-15", amount: 3299 },
  { id: "2", type: "contact", description: "电话咨询产品信息", date: "2024-01-14", amount: 0 },
  { id: "3", type: "email", description: "发送产品资料邮件", date: "2024-01-13", amount: 0 },
  { id: "4", type: "order", description: "下单购买配件", date: "2024-01-10", amount: 299 },
]

export function CRMCustomer() {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.company.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || customer.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const customerStats = {
    total: customers.length,
    active: customers.filter((c) => c.status === "active").length,
    vip: customers.filter((c) => c.status === "vip").length,
    potential: customers.filter((c) => c.status === "potential").length,
    totalRevenue: customers.reduce((sum, customer) => sum + customer.totalSpent, 0),
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总客户数</p>
                <p className="text-2xl font-bold">{customerStats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">活跃客户</p>
                <p className="text-2xl font-bold text-green-600">{customerStats.active}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">VIP客户</p>
                <p className="text-2xl font-bold text-purple-600">{customerStats.vip}</p>
              </div>
              <Star className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">客户价值</p>
                <p className="text-2xl font-bold text-orange-600">¥{customerStats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>客户关系管理</CardTitle>
              <CardDescription>管理客户信息、跟踪客户活动和维护客户关系</CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  添加客户
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>添加新客户</DialogTitle>
                  <DialogDescription>填写客户详细信息</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">客户姓名</Label>
                      <Input id="name" placeholder="输入客户姓名" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">邮箱地址</Label>
                      <Input id="email" type="email" placeholder="输入邮箱地址" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">联系电话</Label>
                      <Input id="phone" placeholder="输入联系电话" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">公司名称</Label>
                      <Input id="company" placeholder="输入公司名称" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">联系地址</Label>
                    <Textarea id="address" placeholder="输入详细地址" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">客户状态</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="选择状态" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="potential">潜在客户</SelectItem>
                          <SelectItem value="active">活跃客户</SelectItem>
                          <SelectItem value="vip">VIP客户</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tags">客户标签</Label>
                      <Input id="tags" placeholder="输入标签，用逗号分隔" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">备注信息</Label>
                    <Textarea id="notes" placeholder="输入备注信息" />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(false)}>添加客户</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* 搜索和筛选 */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="搜索客户姓名、邮箱或公司..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="筛选状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">活跃客户</SelectItem>
                <SelectItem value="vip">VIP客户</SelectItem>
                <SelectItem value="potential">潜在客户</SelectItem>
                <SelectItem value="inactive">非活跃</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 客户表格 */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>客户信息</TableHead>
                  <TableHead>联系方式</TableHead>
                  <TableHead>公司</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>订单数</TableHead>
                  <TableHead>消费金额</TableHead>
                  <TableHead>最后订单</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={customer.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-muted-foreground">加入时间: {customer.joinDate}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Mail className="h-3 w-3 mr-1" />
                          {customer.email}
                        </div>
                        <div className="flex items-center text-sm">
                          <Phone className="h-3 w-3 mr-1" />
                          {customer.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{customer.company}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[customer.status]}>{statusLabels[customer.status]}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{customer.totalOrders}</TableCell>
                    <TableCell className="font-medium">¥{customer.totalSpent.toLocaleString()}</TableCell>
                    <TableCell>{customer.lastOrderDate}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(customer)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>客户详情 - {customer.name}</DialogTitle>
                            </DialogHeader>
                            {selectedCustomer && (
                              <Tabs defaultValue="info" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                  <TabsTrigger value="info">基本信息</TabsTrigger>
                                  <TabsTrigger value="orders">订单历史</TabsTrigger>
                                  <TabsTrigger value="activities">活动记录</TabsTrigger>
                                </TabsList>

                                <TabsContent value="info" className="space-y-4">
                                  <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                      <div>
                                        <Label>客户姓名</Label>
                                        <p className="mt-1 font-medium">{selectedCustomer.name}</p>
                                      </div>
                                      <div>
                                        <Label>邮箱地址</Label>
                                        <p className="mt-1">{selectedCustomer.email}</p>
                                      </div>
                                      <div>
                                        <Label>联系电话</Label>
                                        <p className="mt-1">{selectedCustomer.phone}</p>
                                      </div>
                                      <div>
                                        <Label>公司名称</Label>
                                        <p className="mt-1">{selectedCustomer.company}</p>
                                      </div>
                                    </div>
                                    <div className="space-y-4">
                                      <div>
                                        <Label>客户状态</Label>
                                        <div className="mt-1">
                                          <Badge className={statusColors[selectedCustomer.status]}>
                                            {statusLabels[selectedCustomer.status]}
                                          </Badge>
                                        </div>
                                      </div>
                                      <div>
                                        <Label>总订单数</Label>
                                        <p className="mt-1 font-medium">{selectedCustomer.totalOrders}</p>
                                      </div>
                                      <div>
                                        <Label>总消费金额</Label>
                                        <p className="mt-1 font-medium text-green-600">
                                          ¥{selectedCustomer.totalSpent.toLocaleString()}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>最后订单日期</Label>
                                        <p className="mt-1">{selectedCustomer.lastOrderDate}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>联系地址</Label>
                                    <p className="mt-1">{selectedCustomer.address}</p>
                                  </div>
                                  <div>
                                    <Label>客户标签</Label>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                      {selectedCustomer.tags.map((tag, index) => (
                                        <Badge key={index} variant="outline">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <Label>备注信息</Label>
                                    <p className="mt-1">{selectedCustomer.notes}</p>
                                  </div>
                                </TabsContent>

                                <TabsContent value="orders" className="space-y-4">
                                  <div className="text-center py-8">
                                    <p className="text-muted-foreground">订单历史功能开发中...</p>
                                  </div>
                                </TabsContent>

                                <TabsContent value="activities" className="space-y-4">
                                  <div className="space-y-3">
                                    {customerActivities.map((activity) => (
                                      <div
                                        key={activity.id}
                                        className="flex items-center space-x-3 p-3 border rounded-lg"
                                      >
                                        <div className="flex-shrink-0">
                                          {activity.type === "order" && (
                                            <DollarSign className="h-5 w-5 text-green-600" />
                                          )}
                                          {activity.type === "contact" && <Phone className="h-5 w-5 text-blue-600" />}
                                          {activity.type === "email" && <Mail className="h-5 w-5 text-purple-600" />}
                                        </div>
                                        <div className="flex-1">
                                          <p className="font-medium">{activity.description}</p>
                                          <p className="text-sm text-muted-foreground">{activity.date}</p>
                                        </div>
                                        {activity.amount > 0 && (
                                          <div className="text-right">
                                            <p className="font-medium text-green-600">
                                              ¥{activity.amount.toLocaleString()}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </TabsContent>
                              </Tabs>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
