"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bell,
  Search,
  Menu,
  Home,
  ShoppingCart,
  MessageSquare,
  User,
  Settings,
  Plus,
  Filter,
  ChevronRight,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  BarChart3,
  DollarSign,
  Eye,
  Edit,
  Download,
  Share,
} from "lucide-react"

// 移动端数据接口
interface MobileOrder {
  id: string
  orderNumber: string
  customerName: string
  items: OrderItem[]
  totalAmount: number
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled"
  createdAt: string
  estimatedDelivery?: string
  trackingNumber?: string
  paymentStatus: "pending" | "paid" | "failed" | "refunded"
}

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  image?: string
}

interface MobileNotification {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  timestamp: string
  isRead: boolean
  actionUrl?: string
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: any
  color: string
  action: () => void
}

export function MobileDashboard() {
  const [activeTab, setActiveTab] = useState("home")
  const [searchTerm, setSearchTerm] = useState("")
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<MobileOrder | null>(null)

  // 模拟移动端数据
  const [orders, setOrders] = useState<MobileOrder[]>([
    {
      id: "ORD-M-001",
      orderNumber: "ORD-M-001",
      customerName: "张先生",
      items: [
        { id: "1", name: "智能手机保护壳", quantity: 2, price: 29.99 },
        { id: "2", name: "无线充电器", quantity: 1, price: 89.99 },
      ],
      totalAmount: 149.97,
      status: "shipped",
      createdAt: "2024-01-15 10:30:00",
      estimatedDelivery: "2024-01-17",
      trackingNumber: "SF1234567890",
      paymentStatus: "paid",
    },
    {
      id: "ORD-M-002",
      orderNumber: "ORD-M-002",
      customerName: "李女士",
      items: [{ id: "3", name: "蓝牙耳机", quantity: 1, price: 199.99 }],
      totalAmount: 199.99,
      status: "processing",
      createdAt: "2024-01-15 14:20:00",
      paymentStatus: "paid",
    },
    {
      id: "ORD-M-003",
      orderNumber: "ORD-M-003",
      customerName: "王先生",
      items: [
        { id: "4", name: "智能手表", quantity: 1, price: 299.99 },
        { id: "5", name: "运动手环", quantity: 1, price: 99.99 },
      ],
      totalAmount: 399.98,
      status: "pending",
      createdAt: "2024-01-15 16:45:00",
      paymentStatus: "pending",
    },
  ])

  const [notifications, setNotifications] = useState<MobileNotification[]>([
    {
      id: "notif-1",
      title: "新订单提醒",
      message: "您有一个新的订单 ORD-M-003 需要处理",
      type: "info",
      timestamp: "2024-01-15 16:45:00",
      isRead: false,
      actionUrl: "/orders/ORD-M-003",
    },
    {
      id: "notif-2",
      title: "订单已发货",
      message: "订单 ORD-M-001 已发货，物流单号：SF1234567890",
      type: "success",
      timestamp: "2024-01-15 14:30:00",
      isRead: false,
    },
    {
      id: "notif-3",
      title: "付款提醒",
      message: "订单 ORD-M-003 等待客户付款",
      type: "warning",
      timestamp: "2024-01-15 16:50:00",
      isRead: true,
    },
    {
      id: "notif-4",
      title: "系统维护通知",
      message: "系统将于今晚22:00-24:00进行维护升级",
      type: "info",
      timestamp: "2024-01-15 09:00:00",
      isRead: true,
    },
  ])

  // 快捷操作
  const quickActions: QuickAction[] = [
    {
      id: "new-order",
      title: "新建订单",
      description: "快速创建新订单",
      icon: Plus,
      color: "bg-blue-500",
      action: () => console.log("新建订单"),
    },
    {
      id: "scan-code",
      title: "扫码查询",
      description: "扫描二维码查询",
      icon: Search,
      color: "bg-green-500",
      action: () => console.log("扫码查询"),
    },
    {
      id: "customer-service",
      title: "客户服务",
      description: "联系客户服务",
      icon: MessageSquare,
      color: "bg-orange-500",
      action: () => console.log("客户服务"),
    },
    {
      id: "reports",
      title: "数据报表",
      description: "查看业务报表",
      icon: BarChart3,
      color: "bg-purple-500",
      action: () => console.log("数据报表"),
    },
  ]

  // 状态标签
  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">待确认</Badge>
      case "confirmed":
        return <Badge className="bg-blue-100 text-blue-800">已确认</Badge>
      case "processing":
        return <Badge className="bg-orange-100 text-orange-800">处理中</Badge>
      case "shipped":
        return <Badge className="bg-green-100 text-green-800">已发货</Badge>
      case "delivered":
        return <Badge className="bg-green-600 text-white">已送达</Badge>
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">已取消</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600">
            待付款
          </Badge>
        )
      case "paid":
        return <Badge className="bg-green-100 text-green-800">已付款</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800">付款失败</Badge>
      case "refunded":
        return <Badge className="bg-gray-100 text-gray-800">已退款</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Bell className="w-5 h-5 text-blue-500" />
    }
  }

  // 标记通知为已读
  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) => prev.map((notif) => (notif.id === notificationId ? { ...notif, isRead: true } : notif)))
  }

  // 统计数据
  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => o.status === "pending").length,
    shippedOrders: orders.filter((o) => o.status === "shipped").length,
    totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
    unreadNotifications: notifications.filter((n) => !n.isRead).length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 移动端顶部导航 */}
      <div className="sticky top-0 z-50 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sheet open={showMenu} onOpenChange={setShowMenu}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>YanYu Cloud³</SheetTitle>
                  <SheetDescription>智能商务管理系统</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Avatar>
                      <AvatarFallback>管</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">管理员</div>
                      <div className="text-sm text-muted-foreground">admin@company.com</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveTab("home")}>
                      <Home className="w-4 h-4 mr-3" />
                      首页概览
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveTab("orders")}>
                      <ShoppingCart className="w-4 h-4 mr-3" />
                      订单管理
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveTab("messages")}>
                      <MessageSquare className="w-4 h-4 mr-3" />
                      消息中心
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveTab("profile")}>
                      <User className="w-4 h-4 mr-3" />
                      个人中心
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-3" />
                      系统设置
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <h1 className="text-lg font-semibold">YanYu Cloud³</h1>
          </div>

          <div className="flex items-center space-x-2">
            <Sheet open={showNotifications} onOpenChange={setShowNotifications}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-5 h-5" />
                  {stats.unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {stats.unreadNotifications}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>通知中心</SheetTitle>
                  <SheetDescription>{stats.unreadNotifications} 条未读通知</SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] mt-6">
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          notification.isRead ? "bg-gray-50" : "bg-blue-50 border-blue-200"
                        }`}
                        onClick={() => markNotificationAsRead(notification.id)}
                      >
                        <div className="flex items-start space-x-3">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium truncate">{notification.title}</h4>
                              {!notification.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full ml-2" />}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">{notification.timestamp.split(" ")[1]}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <Avatar className="w-8 h-8">
              <AvatarFallback>管</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="p-4 pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* 首页概览 */}
          <TabsContent value="home" className="space-y-4">
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">总订单</p>
                      <p className="text-2xl font-bold">{stats.totalOrders}</p>
                    </div>
                    <ShoppingCart className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">待处理</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">已发货</p>
                      <p className="text-2xl font-bold text-green-600">{stats.shippedOrders}</p>
                    </div>
                    <Truck className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">总收入</p>
                      <p className="text-xl font-bold text-purple-600">¥{stats.totalRevenue.toFixed(2)}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 快捷操作 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">快捷操作</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => (
                    <Button
                      key={action.id}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center space-y-2 bg-transparent"
                      onClick={action.action}
                    >
                      <div className={`w-10 h-10 rounded-full ${action.color} flex items-center justify-center`}>
                        <action.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-sm">{action.title}</div>
                        <div className="text-xs text-muted-foreground">{action.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 最近订单 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  最近订单
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("orders")}>
                    查看全部
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orders.slice(0, 3).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{order.orderNumber}</span>
                          {getOrderStatusBadge(order.status)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {order.customerName} • ¥{order.totalAmount}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 订单管理 */}
          <TabsContent value="orders" className="space-y-4">
            {/* 搜索栏 */}
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="搜索订单号或客户名称..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            {/* 订单列表 */}
            <div className="space-y-3">
              {orders
                .filter(
                  (order) =>
                    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    order.customerName.toLowerCase().includes(searchTerm.toLowerCase()),
                )
                .map((order) => (
                  <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4" onClick={() => setSelectedOrder(order)}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">{order.orderNumber}</span>
                        <div className="flex space-x-2">
                          {getOrderStatusBadge(order.status)}
                          {getPaymentStatusBadge(order.paymentStatus)}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">客户</span>
                          <span>{order.customerName}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">金额</span>
                          <span className="font-medium">¥{order.totalAmount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">创建时间</span>
                          <span>{order.createdAt.split(" ")[0]}</span>
                        </div>
                        {order.trackingNumber && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">物流单号</span>
                            <span className="font-mono text-xs">{order.trackingNumber}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end mt-3 space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          查看
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          编辑
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          {/* 消息中心 */}
          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">消息中心</CardTitle>
                <CardDescription>{stats.unreadNotifications} 条未读消息</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        notification.isRead ? "bg-gray-50" : "bg-blue-50 border-blue-200"
                      }`}
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium truncate">{notification.title}</h4>
                            {!notification.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full ml-2" />}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">{notification.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 个人中心 */}
          <TabsContent value="profile" className="space-y-4">
            {/* 用户信息 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="text-lg">管</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-medium">系统管理员</h3>
                    <p className="text-sm text-muted-foreground">admin@company.com</p>
                    <p className="text-sm text-muted-foreground">最后登录：2024-01-15 16:30</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 功能菜单 */}
            <div className="space-y-3">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-blue-500" />
                      <span>个人信息</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Settings className="w-5 h-5 text-gray-500" />
                      <span>系统设置</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Bell className="w-5 h-5 text-orange-500" />
                      <span>通知设置</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-green-500" />
                      <span>联系客服</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Download className="w-5 h-5 text-purple-500" />
                      <span>数据导出</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 退出登录 */}
            <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 bg-transparent">
              退出登录
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      {/* 底部导航栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2">
        <div className="flex justify-around">
          <Button
            variant={activeTab === "home" ? "default" : "ghost"}
            size="sm"
            className="flex flex-col items-center space-y-1 h-auto py-2"
            onClick={() => setActiveTab("home")}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs">首页</span>
          </Button>

          <Button
            variant={activeTab === "orders" ? "default" : "ghost"}
            size="sm"
            className="flex flex-col items-center space-y-1 h-auto py-2"
            onClick={() => setActiveTab("orders")}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-xs">订单</span>
          </Button>

          <Button
            variant={activeTab === "messages" ? "default" : "ghost"}
            size="sm"
            className="flex flex-col items-center space-y-1 h-auto py-2 relative"
            onClick={() => setActiveTab("messages")}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-xs">消息</span>
            {stats.unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {stats.unreadNotifications}
              </span>
            )}
          </Button>

          <Button
            variant={activeTab === "profile" ? "default" : "ghost"}
            size="sm"
            className="flex flex-col items-center space-y-1 h-auto py-2"
            onClick={() => setActiveTab("profile")}
          >
            <User className="w-5 h-5" />
            <span className="text-xs">我的</span>
          </Button>
        </div>
      </div>

      {/* 订单详情对话框 */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-sm mx-4">
            <DialogHeader>
              <DialogTitle className="text-lg">{selectedOrder.orderNumber}</DialogTitle>
              <DialogDescription>订单详情信息</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* 订单状态 */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">订单状态</span>
                {getOrderStatusBadge(selectedOrder.status)}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">付款状态</span>
                {getPaymentStatusBadge(selectedOrder.paymentStatus)}
              </div>

              {/* 客户信息 */}
              <div>
                <h4 className="font-medium mb-2">客户信息</h4>
                <div className="text-sm space-y-1">
                  <div>客户：{selectedOrder.customerName}</div>
                  <div>创建时间：{selectedOrder.createdAt}</div>
                  {selectedOrder.estimatedDelivery && <div>预计送达：{selectedOrder.estimatedDelivery}</div>}
                  {selectedOrder.trackingNumber && <div>物流单号：{selectedOrder.trackingNumber}</div>}
                </div>
              </div>

              {/* 商品列表 */}
              <div>
                <h4 className="font-medium mb-2">商品列表</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <div className="flex-1">
                        <div>{item.name}</div>
                        <div className="text-muted-foreground">数量：{item.quantity}</div>
                      </div>
                      <div className="font-medium">¥{item.price}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 总金额 */}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium">总金额</span>
                <span className="font-bold text-lg">¥{selectedOrder.totalAmount}</span>
              </div>

              {/* 操作按钮 */}
              <div className="flex space-x-2 pt-2">
                <Button variant="outline" className="flex-1 bg-transparent">
                  <Edit className="w-4 h-4 mr-1" />
                  编辑
                </Button>
                <Button variant="outline" className="flex-1 bg-transparent">
                  <Share className="w-4 h-4 mr-1" />
                  分享
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
