"use client"

import { useState } from "react"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
  PieChart,
  BarChart3,
  Calculator,
  Receipt,
  FileText,
  Plus,
  Download,
  Filter,
  Search,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { EnhancedCard } from "../design-system/enhanced-card-system"
import { EnhancedButton } from "../design-system/enhanced-button-system"
import { AnimatedContainer } from "../design-system/animation-system"

export function FinanceManagement() {
  const [selectedPeriod, setSelectedPeriod] = useState("month")

  const financialData = [
    {
      title: "总收入",
      value: "¥3,247,892",
      change: "+15.2%",
      trend: "up",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "总支出",
      value: "¥1,856,234",
      change: "+8.7%",
      trend: "up",
      icon: CreditCard,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "净利润",
      value: "¥1,391,658",
      change: "+23.4%",
      trend: "up",
      icon: Wallet,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "利润率",
      value: "42.8%",
      change: "+5.1%",
      trend: "up",
      icon: Calculator,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ]

  const transactions = [
    {
      id: "1",
      type: "income",
      description: "产品销售收入",
      amount: 125000,
      date: "2024-01-21",
      category: "销售",
      status: "completed",
    },
    {
      id: "2",
      type: "expense",
      description: "办公用品采购",
      amount: 8500,
      date: "2024-01-20",
      category: "运营",
      status: "completed",
    },
    {
      id: "3",
      type: "income",
      description: "服务费收入",
      amount: 45000,
      date: "2024-01-19",
      category: "服务",
      status: "pending",
    },
    {
      id: "4",
      type: "expense",
      description: "员工薪资",
      amount: 280000,
      date: "2024-01-18",
      category: "人力",
      status: "completed",
    },
  ]

  return (
    <div className="space-y-6">
      {/* 财务概览 */}
      <AnimatedContainer animation="fadeIn">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <DollarSign className="w-6 h-6 mr-2" />
              财务管理
            </h2>
            <p className="text-muted-foreground">专业的财务数据管理和分析</p>
          </div>
          <div className="flex space-x-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">本周</SelectItem>
                <SelectItem value="month">本月</SelectItem>
                <SelectItem value="quarter">本季度</SelectItem>
                <SelectItem value="year">今年</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              财务报表
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {financialData.map((item, index) => (
            <AnimatedContainer key={item.title} animation="slideUp" delay={index * 100}>
              <EnhancedCard variant="modern" glowEffect>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${item.bgColor}`}>
                      <item.icon className={`w-6 h-6 ${item.color}`} />
                    </div>
                    <div className="flex items-center space-x-1">
                      {item.trend === "up" ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span
                        className={`text-sm font-medium ${item.trend === "up" ? "text-green-600" : "text-red-600"}`}
                      >
                        {item.change}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{item.title}</p>
                    <p className="text-2xl font-bold">{item.value}</p>
                  </div>
                </CardContent>
              </EnhancedCard>
            </AnimatedContainer>
          ))}
        </div>
      </AnimatedContainer>

      {/* 详细功能 */}
      <AnimatedContainer animation="slideUp" delay={200}>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">财务概览</TabsTrigger>
            <TabsTrigger value="transactions">交易记录</TabsTrigger>
            <TabsTrigger value="reports">财务报表</TabsTrigger>
            <TabsTrigger value="budget">预算管理</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>收支趋势</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">收支趋势图表</p>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>

              <EnhancedCard variant="traditional" glowEffect>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PieChart className="w-5 h-5" />
                    <span>支出分类</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>人力成本</span>
                        <span className="font-medium">45%</span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>运营费用</span>
                        <span className="font-medium">30%</span>
                      </div>
                      <Progress value={30} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>营销推广</span>
                        <span className="font-medium">15%</span>
                      </div>
                      <Progress value={15} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>其他支出</span>
                        <span className="font-medium">10%</span>
                      </div>
                      <Progress value={10} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <EnhancedCard variant="modern">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>交易记录</CardTitle>
                    <CardDescription>查看和管理所有财务交易</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input placeholder="搜索交易..." className="pl-8 w-64" />
                    </div>
                    <Button variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      筛选
                    </Button>
                    <EnhancedButton variant="primary">
                      <Plus className="w-4 h-4 mr-2" />
                      新增交易
                    </EnhancedButton>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div
                          className={`p-2 rounded-lg ${transaction.type === "income" ? "bg-green-100" : "bg-red-100"}`}
                        >
                          {transaction.type === "income" ? (
                            <TrendingUp
                              className={`w-4 h-4 ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}
                            />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">{transaction.description}</h4>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span>{transaction.category}</span>
                            <span>•</span>
                            <span>{transaction.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div
                            className={`font-medium ${
                              transaction.type === "income" ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {transaction.type === "income" ? "+" : "-"}¥{transaction.amount.toLocaleString()}
                          </div>
                          <Badge variant={transaction.status === "completed" ? "default" : "secondary"}>
                            {transaction.status === "completed" ? "已完成" : "待处理"}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Receipt className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <EnhancedCard variant="modern">
              <CardHeader>
                <CardTitle>财务报表</CardTitle>
                <CardDescription>生成和查看各类财务报表</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">财务报表功能开发中...</p>
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>

          <TabsContent value="budget" className="space-y-4">
            <EnhancedCard variant="modern">
              <CardHeader>
                <CardTitle>预算管理</CardTitle>
                <CardDescription>制定和跟踪预算计划</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">预算管理功能开发中...</p>
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>
        </Tabs>
      </AnimatedContainer>
    </div>
  )
}
