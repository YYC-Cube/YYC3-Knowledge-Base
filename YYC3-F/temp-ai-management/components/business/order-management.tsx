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
import { Search, Plus, Eye, Edit, Trash2, Download, Package, Truck, Clock, DollarSign } from "lucide-react"

interface Order {
  id: string
  orderNumber: string
  customer: string
  customerEmail: string
  products: string[]
  totalAmount: number
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  orderDate: string
  deliveryDate?: string
  paymentStatus: "paid" | "pending" | "failed"
  shippingAddress: string
}

const mockOrders: Order[] = [
  {
    id: "1",
    orderNumber: "ORD-2024-001",
    customer: "张三",
    customerEmail: "zhangsan@example.com",
    products: ["智能手机", "保护壳", "充电器"],
    totalAmount: 3299,
    status: "processing",
    orderDate: "2024-01-15",
    paymentStatus: "paid",
    shippingAddress: "北京市朝阳区xxx街道xxx号",
  },
  {
    id: "2",
    orderNumber: "ORD-2024-002",
    customer: "李四",
    customerEmail: "lisi@example.com",
    products: ["笔记本电脑", "鼠标"],
    totalAmount: 8999,
    status: "shipped",
    orderDate: "2024-01-14",
    deliveryDate: "2024-01-16",
    paymentStatus: "paid",
    shippingAddress: "上海市浦东新区xxx路xxx号",
  },
  {
    id: "3",
    orderNumber: "ORD-2024-003",
    customer: "王五",
    customerEmail: "wangwu@example.com",
    products: ["平板电脑"],
    totalAmount: 2599,
    status: "pending",
    orderDate: "2024-01-16",
    paymentStatus: "pending",
    shippingAddress: "广州市天河区xxx大道xxx号",
  },
]

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
}

const statusLabels = {
  pending: "待处理",
  processing: "处理中",
  shipped: "已发货",
  delivered: "已送达",
  cancelled: "已取消",
}

const paymentStatusColors = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
}

const paymentStatusLabels = {
  paid: "已支付",
  pending: "待支付",
  failed: "支付失败",
}

export function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>(mockOrders)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const orderStats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => o.status === "processing").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
  }

  const handleStatusUpdate = (orderId: string, newStatus: Order["status"]) => {
    setOrders(orders.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)))
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总订单数</p>
                <p className="text-2xl font-bold">{orderStats.total}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">待处理</p>
                <p className="text-2xl font-bold text-yellow-600">{orderStats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已发货</p>
                <p className="text-2xl font-bold text-purple-600">{orderStats.shipped}</p>
              </div>
              <Truck className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总收入</p>
                <p className="text-2xl font-bold text-green-600">¥{orderStats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>订单管理</CardTitle>
              <CardDescription>管理所有订单信息和状态</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                导出
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    新建订单
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>创建新订单</DialogTitle>
                    <DialogDescription>填写订单详细信息</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customer">客户姓名</Label>
                        <Input id="customer" placeholder="输入客户姓名" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">客户邮箱</Label>
                        <Input id="email" type="email" placeholder="输入客户邮箱" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="products">产品列表</Label>
                      <Textarea id="products" placeholder="输入产品信息，每行一个" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">订单金额</Label>
                        <Input id="amount" type="number" placeholder="输入订单金额" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">订单状态</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="选择状态" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">待处理</SelectItem>
                            <SelectItem value="processing">处理中</SelectItem>
                            <SelectItem value="shipped">已发货</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">收货地址</Label>
                      <Textarea id="address" placeholder="输入详细收货地址" />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={() => setIsCreateDialogOpen(false)}>创建订单</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 搜索和筛选 */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="搜索订单号或客户..."
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
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="processing">处理中</SelectItem>
                <SelectItem value="shipped">已发货</SelectItem>
                <SelectItem value="delivered">已送达</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 订单表格 */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单号</TableHead>
                  <TableHead>客户</TableHead>
                  <TableHead>产品</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>订单状态</TableHead>
                  <TableHead>支付状态</TableHead>
                  <TableHead>订单日期</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer}</div>
                        <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-32">
                        {order.products.slice(0, 2).join(", ")}
                        {order.products.length > 2 && "..."}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">¥{order.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={paymentStatusColors[order.paymentStatus]}>
                        {paymentStatusLabels[order.paymentStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.orderDate}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>订单详情 - {order.orderNumber}</DialogTitle>
                            </DialogHeader>
                            {selectedOrder && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>客户信息</Label>
                                    <div className="mt-1">
                                      <p className="font-medium">{selectedOrder.customer}</p>
                                      <p className="text-sm text-muted-foreground">{selectedOrder.customerEmail}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>订单金额</Label>
                                    <p className="mt-1 text-lg font-bold">
                                      ¥{selectedOrder.totalAmount.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <Label>产品列表</Label>
                                  <div className="mt-1">
                                    {selectedOrder.products.map((product, index) => (
                                      <Badge key={index} variant="outline" className="mr-2 mb-2">
                                        {product}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <Label>收货地址</Label>
                                  <p className="mt-1">{selectedOrder.shippingAddress}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>订单状态</Label>
                                    <div className="mt-1">
                                      <Select
                                        value={selectedOrder.status}
                                        onValueChange={(value) =>
                                          handleStatusUpdate(selectedOrder.id, value as Order["status"])
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="pending">待处理</SelectItem>
                                          <SelectItem value="processing">处理中</SelectItem>
                                          <SelectItem value="shipped">已发货</SelectItem>
                                          <SelectItem value="delivered">已送达</SelectItem>
                                          <SelectItem value="cancelled">已取消</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>支付状态</Label>
                                    <div className="mt-1">
                                      <Badge className={paymentStatusColors[selectedOrder.paymentStatus]}>
                                        {paymentStatusLabels[selectedOrder.paymentStatus]}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
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
