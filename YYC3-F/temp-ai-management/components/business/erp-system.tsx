"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  Package,
  DollarSign,
  Users,
  TrendingUp,
  ShoppingCart,
  Warehouse,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChartIcon,
  Activity,
} from "lucide-react"

const salesData = [
  { month: "1月", sales: 45000, orders: 120 },
  { month: "2月", sales: 52000, orders: 135 },
  { month: "3月", sales: 48000, orders: 128 },
  { month: "4月", sales: 61000, orders: 156 },
  { month: "5月", sales: 55000, orders: 142 },
  { month: "6月", sales: 67000, orders: 178 },
]

const inventoryData = [
  { name: "智能手机", value: 35, color: "#8884d8" },
  { name: "笔记本电脑", value: 25, color: "#82ca9d" },
  { name: "平板电脑", value: 20, color: "#ffc658" },
  { name: "智能手表", value: 15, color: "#ff7300" },
  { name: "其他", value: 5, color: "#00ff00" },
]

const recentOrders = [
  { id: "ORD-001", customer: "张三", amount: 3299, status: "processing", date: "2024-01-15" },
  { id: "ORD-002", customer: "李四", amount: 8999, status: "shipped", date: "2024-01-14" },
  { id: "ORD-003", customer: "王五", amount: 2599, status: "pending", date: "2024-01-16" },
  { id: "ORD-004", customer: "赵六", amount: 5499, status: "delivered", date: "2024-01-13" },
]

const lowStockItems = [
  { name: "智能手机保护壳", current: 15, minimum: 50, status: "critical" },
  { name: "无线充电器", current: 28, minimum: 40, status: "warning" },
  { name: "蓝牙耳机", current: 35, minimum: 60, status: "warning" },
  { name: "数据线", current: 8, minimum: 30, status: "critical" },
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

export function ERPSystem() {
  const [activeTab, setActiveTab] = useState("dashboard")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ERP企业资源规划</h2>
          <p className="text-muted-foreground">集成化企业管理解决方案</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            生成报告
          </Button>
          <Button>
            <Activity className="h-4 w-4 mr-2" />
            实时监控
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">仪表盘</TabsTrigger>
          <TabsTrigger value="sales">销售管理</TabsTrigger>
          <TabsTrigger value="inventory">库存管理</TabsTrigger>
          <TabsTrigger value="finance">财务管理</TabsTrigger>
          <TabsTrigger value="reports">报表分析</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* 关键指标卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">本月销售额</p>
                    <p className="text-2xl font-bold">¥67,000</p>
                    <p className="text-xs text-green-600">+12.5% 较上月</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">订单数量</p>
                    <p className="text-2xl font-bold">178</p>
                    <p className="text-xs text-blue-600">+8.3% 较上月</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">库存周转率</p>
                    <p className="text-2xl font-bold">4.2</p>
                    <p className="text-xs text-purple-600">+0.3 较上月</p>
                  </div>
                  <Warehouse className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">客户满意度</p>
                    <p className="text-2xl font-bold">96%</p>
                    <p className="text-xs text-orange-600">+2% 较上月</p>
                  </div>
                  <Users className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 销售趋势图 */}
            <Card>
              <CardHeader>
                <CardTitle>销售趋势</CardTitle>
                <CardDescription>过去6个月的销售数据</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 库存分布 */}
            <Card>
              <CardHeader>
                <CardTitle>库存分布</CardTitle>
                <CardDescription>各类产品库存占比</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={inventoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {inventoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 最近订单 */}
            <Card>
              <CardHeader>
                <CardTitle>最近订单</CardTitle>
                <CardDescription>最新的订单处理情况</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{order.id}</p>
                        <p className="text-sm text-muted-foreground">{order.customer}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">¥{order.amount.toLocaleString()}</p>
                        <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                          {statusLabels[order.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 库存预警 */}
            <Card>
              <CardHeader>
                <CardTitle>库存预警</CardTitle>
                <CardDescription>需要补货的商品</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lowStockItems.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.name}</span>
                        <div className="flex items-center space-x-2">
                          {item.status === "critical" ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="text-sm">
                            {item.current}/{item.minimum}
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={(item.current / item.minimum) * 100}
                        className={`h-2 ${item.status === "critical" ? "bg-red-100" : "bg-yellow-100"}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>销售管理</CardTitle>
              <CardDescription>管理销售订单、客户关系和销售业绩</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">1,234</p>
                      <p className="text-sm text-muted-foreground">总订单数</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">¥2,456,789</p>
                      <p className="text-sm text-muted-foreground">总销售额</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">567</p>
                      <p className="text-sm text-muted-foreground">活跃客户</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#8884d8" />
                  <Bar dataKey="orders" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>库存管理</CardTitle>
              <CardDescription>实时监控库存状态，优化库存配置</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <Package className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-xl font-bold">2,345</p>
                      <p className="text-sm text-muted-foreground">总库存</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                      <p className="text-xl font-bold">23</p>
                      <p className="text-sm text-muted-foreground">低库存预警</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="text-xl font-bold">4.2</p>
                      <p className="text-sm text-muted-foreground">周转率</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <p className="text-xl font-bold">98.5%</p>
                      <p className="text-sm text-muted-foreground">库存准确率</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">库存预警列表</h3>
                {lowStockItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {item.status === "critical" ? (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      )}
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          当前库存: {item.current} | 最低库存: {item.minimum}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={item.status === "critical" ? "destructive" : "secondary"}>
                        {item.status === "critical" ? "紧急" : "警告"}
                      </Badge>
                      <Button size="sm">补货</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>财务管理</CardTitle>
              <CardDescription>财务数据分析和资金流管理</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">¥1,234,567</p>
                      <p className="text-sm text-muted-foreground">本月收入</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">¥456,789</p>
                      <p className="text-sm text-muted-foreground">本月支出</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">¥777,778</p>
                      <p className="text-sm text-muted-foreground">净利润</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center py-8">
                <p className="text-muted-foreground">财务详细分析功能开发中...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>报表分析</CardTitle>
              <CardDescription>生成各类业务报表和数据分析</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                      <h3 className="font-semibold mb-2">销售报表</h3>
                      <p className="text-sm text-muted-foreground mb-4">详细的销售数据分析</p>
                      <Button size="sm" className="w-full">
                        生成报表
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <PieChartIcon className="h-12 w-12 mx-auto mb-4 text-green-600" />
                      <h3 className="font-semibold mb-2">库存报表</h3>
                      <p className="text-sm text-muted-foreground mb-4">库存状态和周转分析</p>
                      <Button size="sm" className="w-full">
                        生成报表
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                      <h3 className="font-semibold mb-2">财务报表</h3>
                      <p className="text-sm text-muted-foreground mb-4">收支和利润分析</p>
                      <Button size="sm" className="w-full">
                        生成报表
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
