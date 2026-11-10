"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Truck,
  Package,
  Factory,
  Clock,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Users,
  DollarSign,
  Search,
  Plus,
  Eye,
  Edit,
} from "lucide-react"

interface Supplier {
  id: string
  name: string
  contact: string
  email: string
  phone: string
  address: string
  status: "active" | "inactive" | "pending"
  rating: number
  totalOrders: number
  onTimeDelivery: number
  categories: string[]
}

interface PurchaseOrder {
  id: string
  orderNumber: string
  supplier: string
  items: string[]
  totalAmount: number
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  orderDate: string
  expectedDelivery: string
  actualDelivery?: string
}

interface Shipment {
  id: string
  trackingNumber: string
  supplier: string
  destination: string
  status: "in_transit" | "delivered" | "delayed" | "cancelled"
  progress: number
  estimatedArrival: string
  items: number
}

const mockSuppliers: Supplier[] = [
  {
    id: "1",
    name: "华为技术有限公司",
    contact: "张经理",
    email: "zhang@huawei.com",
    phone: "400-822-9999",
    address: "深圳市龙岗区华为基地",
    status: "active",
    rating: 4.8,
    totalOrders: 156,
    onTimeDelivery: 95,
    categories: ["电子产品", "通信设备"],
  },
  {
    id: "2",
    name: "小米科技有限公司",
    contact: "李总监",
    email: "li@xiaomi.com",
    phone: "400-100-5678",
    address: "北京市海淀区小米科技园",
    status: "active",
    rating: 4.6,
    totalOrders: 89,
    onTimeDelivery: 92,
    categories: ["智能手机", "智能家居"],
  },
  {
    id: "3",
    name: "联想集团有限公司",
    contact: "王主管",
    email: "wang@lenovo.com",
    phone: "400-990-8888",
    address: "北京市海淀区上地信息产业基地",
    status: "pending",
    rating: 4.4,
    totalOrders: 45,
    onTimeDelivery: 88,
    categories: ["电脑硬件", "服务器"],
  },
]

const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: "1",
    orderNumber: "PO-2024-001",
    supplier: "华为技术有限公司",
    items: ["智能手机 x100", "充电器 x100"],
    totalAmount: 299000,
    status: "confirmed",
    orderDate: "2024-01-15",
    expectedDelivery: "2024-01-25",
  },
  {
    id: "2",
    orderNumber: "PO-2024-002",
    supplier: "小米科技有限公司",
    items: ["平板电脑 x50", "保护套 x50"],
    totalAmount: 129500,
    status: "shipped",
    orderDate: "2024-01-12",
    expectedDelivery: "2024-01-22",
    actualDelivery: "2024-01-21",
  },
  {
    id: "3",
    orderNumber: "PO-2024-003",
    supplier: "联想集团有限公司",
    items: ["笔记本电脑 x30"],
    totalAmount: 149700,
    status: "pending",
    orderDate: "2024-01-16",
    expectedDelivery: "2024-01-26",
  },
]

const mockShipments: Shipment[] = [
  {
    id: "1",
    trackingNumber: "SF1234567890",
    supplier: "华为技术有限公司",
    destination: "北京仓库",
    status: "in_transit",
    progress: 75,
    estimatedArrival: "2024-01-25",
    items: 200,
  },
  {
    id: "2",
    trackingNumber: "YT9876543210",
    supplier: "小米科技有限公司",
    destination: "上海仓库",
    status: "delivered",
    progress: 100,
    estimatedArrival: "2024-01-21",
    items: 100,
  },
  {
    id: "3",
    trackingNumber: "ZTO5555666677",
    supplier: "联想集团有限公司",
    destination: "广州仓库",
    status: "delayed",
    progress: 60,
    estimatedArrival: "2024-01-28",
    items: 30,
  },
]

const statusColors = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  in_transit: "bg-blue-100 text-blue-800",
  delayed: "bg-red-100 text-red-800",
}

const statusLabels = {
  active: "活跃",
  inactive: "非活跃",
  pending: "待审核",
  confirmed: "已确认",
  shipped: "已发货",
  delivered: "已送达",
  cancelled: "已取消",
  in_transit: "运输中",
  delayed: "延迟",
}

export function SupplyChain() {
  const [activeTab, setActiveTab] = useState("suppliers")
  const [searchTerm, setSearchTerm] = useState("")

  const supplyChainStats = {
    totalSuppliers: mockSuppliers.length,
    activeSuppliers: mockSuppliers.filter((s) => s.status === "active").length,
    totalOrders: mockPurchaseOrders.length,
    pendingOrders: mockPurchaseOrders.filter((o) => o.status === "pending").length,
    totalShipments: mockShipments.length,
    inTransitShipments: mockShipments.filter((s) => s.status === "in_transit").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">供应链管理</h2>
          <p className="text-muted-foreground">管理供应商关系、采购订单和物流配送</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            供应链报告
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新建订单
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">供应商总数</p>
                <p className="text-2xl font-bold">{supplyChainStats.totalSuppliers}</p>
                <p className="text-xs text-green-600">活跃: {supplyChainStats.activeSuppliers}</p>
              </div>
              <Factory className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">采购订单</p>
                <p className="text-2xl font-bold">{supplyChainStats.totalOrders}</p>
                <p className="text-xs text-yellow-600">待处理: {supplyChainStats.pendingOrders}</p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">运输批次</p>
                <p className="text-2xl font-bold">{supplyChainStats.totalShipments}</p>
                <p className="text-xs text-purple-600">运输中: {supplyChainStats.inTransitShipments}</p>
              </div>
              <Truck className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">准时交付率</p>
                <p className="text-2xl font-bold">92%</p>
                <p className="text-xs text-orange-600">+3% 较上月</p>
              </div>
              <CheckCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="suppliers">供应商管理</TabsTrigger>
          <TabsTrigger value="orders">采购订单</TabsTrigger>
          <TabsTrigger value="logistics">物流跟踪</TabsTrigger>
          <TabsTrigger value="analytics">供应链分析</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>供应商管理</CardTitle>
                  <CardDescription>管理供应商信息和合作关系</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  添加供应商
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="搜索供应商..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="筛选状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="active">活跃</SelectItem>
                    <SelectItem value="inactive">非活跃</SelectItem>
                    <SelectItem value="pending">待审核</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>供应商名称</TableHead>
                      <TableHead>联系人</TableHead>
                      <TableHead>联系方式</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>评分</TableHead>
                      <TableHead>订单数</TableHead>
                      <TableHead>准时率</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{supplier.name}</div>
                            <div className="text-sm text-muted-foreground">{supplier.categories.join(", ")}</div>
                          </div>
                        </TableCell>
                        <TableCell>{supplier.contact}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">{supplier.email}</div>
                            <div className="text-sm text-muted-foreground">{supplier.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[supplier.status]}>{statusLabels[supplier.status]}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="font-medium">{supplier.rating}</span>
                            <span className="text-yellow-500 ml-1">★</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{supplier.totalOrders}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{supplier.onTimeDelivery}%</span>
                            <Progress value={supplier.onTimeDelivery} className="w-16 h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>采购订单</CardTitle>
              <CardDescription>管理采购订单和供应商交付</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>订单号</TableHead>
                      <TableHead>供应商</TableHead>
                      <TableHead>商品</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>下单日期</TableHead>
                      <TableHead>预计交付</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockPurchaseOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.supplier}</TableCell>
                        <TableCell>
                          <div className="max-w-32">
                            {order.items.slice(0, 2).join(", ")}
                            {order.items.length > 2 && "..."}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">¥{order.totalAmount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
                        </TableCell>
                        <TableCell>{order.orderDate}</TableCell>
                        <TableCell>{order.expectedDelivery}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="logistics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>物流跟踪</CardTitle>
              <CardDescription>实时跟踪货物运输状态</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockShipments.map((shipment) => (
                  <div key={shipment.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{shipment.trackingNumber}</h4>
                        <p className="text-sm text-muted-foreground">
                          {shipment.supplier} → {shipment.destination}
                        </p>
                      </div>
                      <Badge className={statusColors[shipment.status]}>{statusLabels[shipment.status]}</Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>运输进度</span>
                        <span>{shipment.progress}%</span>
                      </div>
                      <Progress value={shipment.progress} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between mt-3 text-sm">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 mr-1" />
                          {shipment.items} 件商品
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          预计到达: {shipment.estimatedArrival}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        查看详情
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>供应链分析</CardTitle>
              <CardDescription>供应链性能指标和趋势分析</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="text-xl font-bold">92%</p>
                      <p className="text-sm text-muted-foreground">平均准时交付率</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-xl font-bold">¥2.1M</p>
                      <p className="text-sm text-muted-foreground">本月采购总额</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <p className="text-xl font-bold">4.6</p>
                      <p className="text-sm text-muted-foreground">供应商平均评分</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 text-center py-8">
                <p className="text-muted-foreground">详细分析报表功能开发中...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
