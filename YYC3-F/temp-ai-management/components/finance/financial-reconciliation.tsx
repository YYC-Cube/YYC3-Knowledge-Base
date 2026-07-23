"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Search,
  TrendingUp,
  Download,
  Eye,
  Edit,
  RefreshCw,
  BarChart3,
  PieChart,
  AlertCircle,
} from "lucide-react"
import { CsvImport } from "./csv-import"

interface ReconciliationRecord {
  id: string
  date: string
  type: "bank" | "invoice" | "payment" | "refund"
  amount: number
  currency: string
  description: string
  status: "matched" | "unmatched" | "disputed" | "resolved"
  bankReference?: string
  invoiceNumber?: string
  customerName?: string
  category: string
  createdAt: string
  updatedAt: string
  notes?: string
  attachments?: string[]
}

interface ReconciliationSummary {
  totalRecords: number
  matchedAmount: number
  unmatchedAmount: number
  disputedAmount: number
  matchRate: number
  lastReconciliation: string
}

interface InvoiceData {
  id: string
  invoiceNumber: string
  customerName: string
  amount: number
  currency: string
  issueDate: string
  dueDate: string
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  paymentMethod?: string
  notes?: string
}

export function FinancialReconciliation() {
  const [activeTab, setActiveTab] = useState("overview")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<ReconciliationRecord | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  const [reconciliationSummary] = useState<ReconciliationSummary>({
    totalRecords: 1247,
    matchedAmount: 2847392.5,
    unmatchedAmount: 156789.3,
    disputedAmount: 23456.78,
    matchRate: 94.2,
    lastReconciliation: "2024-01-15 14:30:00",
  })

  const [reconciliationRecords, setReconciliationRecords] = useState<ReconciliationRecord[]>([
    {
      id: "REC-2024-001",
      date: "2024-01-15",
      type: "payment",
      amount: 15000.0,
      currency: "CNY",
      description: "客户付款 - 订单 #ORD-2024-0156",
      status: "matched",
      bankReference: "TXN-20240115-001",
      invoiceNumber: "INV-2024-0156",
      customerName: "北京科技有限公司",
      category: "销售收入",
      createdAt: "2024-01-15 09:30:00",
      updatedAt: "2024-01-15 14:30:00",
      notes: "自动匹配成功",
    },
    {
      id: "REC-2024-002",
      date: "2024-01-14",
      type: "invoice",
      amount: 8500.0,
      currency: "CNY",
      description: "服务费发票 - 项目咨询",
      status: "unmatched",
      invoiceNumber: "INV-2024-0157",
      customerName: "上海贸易公司",
      category: "服务收入",
      createdAt: "2024-01-14 16:20:00",
      updatedAt: "2024-01-14 16:20:00",
      notes: "等待银行到账确认",
    },
    {
      id: "REC-2024-003",
      date: "2024-01-13",
      type: "refund",
      amount: -2300.0,
      currency: "CNY",
      description: "退款处理 - 订单取消",
      status: "disputed",
      bankReference: "TXN-20240113-003",
      customerName: "深圳制造企业",
      category: "退款支出",
      createdAt: "2024-01-13 11:45:00",
      updatedAt: "2024-01-13 15:20:00",
      notes: "客户对退款金额有异议",
    },
    {
      id: "REC-2024-004",
      date: "2024-01-12",
      type: "bank",
      amount: 25000.0,
      currency: "CNY",
      description: "银行转账收入",
      status: "unmatched",
      bankReference: "TXN-20240112-005",
      category: "其他收入",
      createdAt: "2024-01-12 14:15:00",
      updatedAt: "2024-01-12 14:15:00",
      notes: "需要核实收款来源",
    },
    {
      id: "REC-2024-005",
      date: "2024-01-11",
      type: "payment",
      amount: 12800.0,
      currency: "CNY",
      description: "月度服务费收款",
      status: "resolved",
      bankReference: "TXN-20240111-002",
      invoiceNumber: "INV-2024-0155",
      customerName: "广州软件公司",
      category: "服务收入",
      createdAt: "2024-01-11 10:30:00",
      updatedAt: "2024-01-11 17:45:00",
      notes: "争议已解决，确认收款",
    },
  ])

  const [invoices] = useState<InvoiceData[]>([
    {
      id: "INV-2024-0156",
      invoiceNumber: "INV-2024-0156",
      customerName: "北京科技有限公司",
      amount: 15000.0,
      currency: "CNY",
      issueDate: "2024-01-10",
      dueDate: "2024-01-25",
      status: "paid",
      paymentMethod: "银行转账",
      notes: "项目开发费用",
    },
    {
      id: "INV-2024-0157",
      invoiceNumber: "INV-2024-0157",
      customerName: "上海贸易公司",
      amount: 8500.0,
      currency: "CNY",
      issueDate: "2024-01-12",
      dueDate: "2024-01-27",
      status: "sent",
      notes: "咨询服务费",
    },
    {
      id: "INV-2024-0158",
      invoiceNumber: "INV-2024-0158",
      customerName: "深圳制造企业",
      amount: 22000.0,
      currency: "CNY",
      issueDate: "2024-01-08",
      dueDate: "2024-01-23",
      status: "overdue",
      notes: "设备采购款项",
    },
  ])

  const filteredRecords = reconciliationRecords.filter((record) => {
    const matchesSearch =
      record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || record.status === statusFilter

    const matchesDateRange =
      (!dateRange.start || record.date >= dateRange.start) && (!dateRange.end || record.date <= dateRange.end)

    return matchesSearch && matchesStatus && matchesDateRange
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "matched":
        return <Badge className="bg-green-100 text-green-800">已匹配</Badge>
      case "unmatched":
        return <Badge className="bg-yellow-100 text-yellow-800">未匹配</Badge>
      case "disputed":
        return <Badge className="bg-red-100 text-red-800">有争议</Badge>
      case "resolved":
        return <Badge className="bg-blue-100 text-blue-800">已解决</Badge>
      case "paid":
        return <Badge className="bg-green-100 text-green-800">已付款</Badge>
      case "sent":
        return <Badge className="bg-blue-100 text-blue-800">已发送</Badge>
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">逾期</Badge>
      case "draft":
        return <Badge variant="secondary">草稿</Badge>
      case "cancelled":
        return <Badge variant="outline">已取消</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleAutoReconciliation = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 3000))

    setReconciliationRecords((prev) =>
      prev.map((record) =>
        record.status === "unmatched" && Math.random() > 0.5
          ? { ...record, status: "matched", updatedAt: new Date().toISOString() }
          : record,
      ),
    )
    setIsLoading(false)
  }

  const handleExportData = () => {
    const csvContent = [
      ["日期", "类型", "金额", "描述", "状态", "客户名称", "发票号"],
      ...filteredRecords.map((record) => [
        record.date,
        record.type,
        record.amount.toString(),
        record.description,
        record.status,
        record.customerName || "",
        record.invoiceNumber || "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `reconciliation-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">财务对账系统</h1>
          <p className="text-muted-foreground mt-1">自动化账单核对、发票管理和异常识别</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-2" />
            导出数据
          </Button>
          <Button onClick={handleAutoReconciliation} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "对账中..." : "自动对账"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总记录数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reconciliationSummary.totalRecords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">本月新增 156 条</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已匹配金额</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ¥{reconciliationSummary.matchedAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">匹配率 {reconciliationSummary.matchRate}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未匹配金额</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ¥{reconciliationSummary.unmatchedAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">需要人工处理</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">争议金额</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ¥{reconciliationSummary.disputedAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">待解决争议</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            对账进度
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>整体匹配率</span>
              <span className="font-medium">{reconciliationSummary.matchRate}%</span>
            </div>
            <Progress value={reconciliationSummary.matchRate} className="h-3" />
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-green-600 font-medium">已匹配</div>
                <div className="text-xs text-muted-foreground">{Math.round(reconciliationSummary.matchRate)}%</div>
              </div>
              <div className="text-center">
                <div className="text-yellow-600 font-medium">未匹配</div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(100 - reconciliationSummary.matchRate - 1)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-red-600 font-medium">有争议</div>
                <div className="text-xs text-muted-foreground">1%</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">对账记录</TabsTrigger>
          <TabsTrigger value="import">CSV导入</TabsTrigger>
          <TabsTrigger value="exceptions">异常处理</TabsTrigger>
          <TabsTrigger value="reports">分析报告</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="搜索描述、客户名称或发票号..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
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
                      <SelectItem value="matched">已匹配</SelectItem>
                      <SelectItem value="unmatched">未匹配</SelectItem>
                      <SelectItem value="disputed">有争议</SelectItem>
                      <SelectItem value="resolved">已解决</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                    className="w-40"
                  />
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                    className="w-40"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>对账记录</CardTitle>
              <CardDescription>
                显示 {filteredRecords.length} 条记录，共 {reconciliationRecords.length} 条
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>客户</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-sm">{record.date}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.type}</Badge>
                      </TableCell>
                      <TableCell className={`font-medium ${record.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                        ¥{Math.abs(record.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{record.description}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>{record.customerName || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(record)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <CsvImport />
        </TabsContent>

        <TabsContent value="exceptions" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">异常处理</h3>
            <p className="text-sm text-muted-foreground">处理对账过程中发现的异常和争议</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  未匹配记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reconciliationRecords
                    .filter((record) => record.status === "unmatched")
                    .map((record) => (
                      <div key={record.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{record.description}</div>
                            <div className="text-sm text-muted-foreground">
                              {record.date} • ¥{Math.abs(record.amount).toLocaleString()}
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            处理
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  争议记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reconciliationRecords
                    .filter((record) => record.status === "disputed")
                    .map((record) => (
                      <div key={record.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{record.description}</div>
                            <div className="text-sm text-muted-foreground">
                              {record.date} • ¥{Math.abs(record.amount).toLocaleString()}
                            </div>
                            <div className="text-sm text-red-600 mt-1">{record.notes}</div>
                          </div>
                          <Button size="sm" variant="outline">
                            解决
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">分析报告</h3>
            <p className="text-sm text-muted-foreground">财务对账数据分析和趋势报告</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  月度对账统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>1月匹配率</span>
                    <span className="font-medium">94.2%</span>
                  </div>
                  <Progress value={94.2} className="h-2" />

                  <div className="flex justify-between">
                    <span>12月匹配率</span>
                    <span className="font-medium">91.8%</span>
                  </div>
                  <Progress value={91.8} className="h-2" />

                  <div className="flex justify-between">
                    <span>11月匹配率</span>
                    <span className="font-medium">89.5%</span>
                  </div>
                  <Progress value={89.5} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="w-5 h-5 mr-2" />
                  异常类型分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">金额不匹配</span>
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-red-200 h-2 rounded"></div>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">时间差异</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 bg-yellow-200 h-2 rounded"></div>
                      <span className="text-sm font-medium">30%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">信息缺失</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 bg-blue-200 h-2 rounded"></div>
                      <span className="text-sm font-medium">25%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {selectedRecord && (
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>对账记录详情</DialogTitle>
              <DialogDescription>记录 ID: {selectedRecord.id}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>日期</Label>
                  <div className="font-mono text-sm">{selectedRecord.date}</div>
                </div>
                <div>
                  <Label>类型</Label>
                  <div>{selectedRecord.type}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>金额</Label>
                  <div className={`font-medium ${selectedRecord.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                    ¥{Math.abs(selectedRecord.amount).toLocaleString()} {selectedRecord.currency}
                  </div>
                </div>
                <div>
                  <Label>状态</Label>
                  <div>{getStatusBadge(selectedRecord.status)}</div>
                </div>
              </div>
              <div>
                <Label>描述</Label>
                <div>{selectedRecord.description}</div>
              </div>
              {selectedRecord.customerName && (
                <div>
                  <Label>客户名称</Label>
                  <div>{selectedRecord.customerName}</div>
                </div>
              )}
              {selectedRecord.invoiceNumber && (
                <div>
                  <Label>发票号</Label>
                  <div className="font-mono">{selectedRecord.invoiceNumber}</div>
                </div>
              )}
              {selectedRecord.bankReference && (
                <div>
                  <Label>银行参考号</Label>
                  <div className="font-mono">{selectedRecord.bankReference}</div>
                </div>
              )}
              {selectedRecord.notes && (
                <div>
                  <Label>备注</Label>
                  <div className="text-sm text-muted-foreground">{selectedRecord.notes}</div>
                </div>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <Label>创建时间</Label>
                  <div>{selectedRecord.createdAt}</div>
                </div>
                <div>
                  <Label>更新时间</Label>
                  <div>{selectedRecord.updatedAt}</div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
