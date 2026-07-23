"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download, Eye, Filter, RefreshCw } from "lucide-react"

interface ImportRecord {
  id: string
  date: string
  description: string
  amount: number
  currency: string
  type: string
  status: "matched" | "unmatched" | "duplicate" | "invalid"
  matchedWith?: string
  issues?: string[]
}

interface ImportResult {
  total: number
  matched: number
  unmatched: number
  duplicates: number
  invalid: number
  records: ImportRecord[]
}

export function CsvImport() {
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showResults, setShowResults] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 模拟CSV导入
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportProgress(0)
    setShowResults(false)

    // 模拟导入进度
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      setImportProgress(i)
    }

    // 生成模拟导入结果
    const mockRecords: ImportRecord[] = [
      {
        id: "IMP-001",
        date: "2024-01-15",
        description: "客户付款 - 订单 #ORD-2024-0156",
        amount: 15000.0,
        currency: "CNY",
        type: "payment",
        status: "matched",
        matchedWith: "INV-2024-0156",
      },
      {
        id: "IMP-002",
        date: "2024-01-14",
        description: "服务费收款",
        amount: 8500.0,
        currency: "CNY",
        type: "payment",
        status: "unmatched",
        issues: ["找不到匹配的发票"],
      },
      {
        id: "IMP-003",
        date: "2024-01-13",
        description: "退款处理",
        amount: -2300.0,
        currency: "CNY",
        type: "refund",
        status: "matched",
        matchedWith: "REF-2024-0023",
      },
      {
        id: "IMP-004",
        date: "2024-01-12",
        description: "客户付款 - 订单 #ORD-2024-0156",
        amount: 15000.0,
        currency: "CNY",
        type: "payment",
        status: "duplicate",
        issues: ["与记录 IMP-001 重复"],
      },
      {
        id: "IMP-005",
        date: "2024-01-11",
        description: "错误数据",
        amount: 0,
        currency: "",
        type: "unknown",
        status: "invalid",
        issues: ["金额为零", "币种缺失", "类型未知"],
      },
      {
        id: "IMP-006",
        date: "2024-01-10",
        description: "供应商付款",
        amount: 12000.0,
        currency: "CNY",
        type: "expense",
        status: "matched",
        matchedWith: "PO-2024-0089",
      },
      {
        id: "IMP-007",
        date: "2024-01-09",
        description: "利息收入",
        amount: 156.78,
        currency: "CNY",
        type: "interest",
        status: "unmatched",
        issues: ["缺少对应记录"],
      },
      {
        id: "IMP-008",
        date: "2024-01-08",
        description: "客户预付款",
        amount: 25000.0,
        currency: "CNY",
        type: "prepayment",
        status: "matched",
        matchedWith: "PRE-2024-0045",
      },
    ]

    const result: ImportResult = {
      total: mockRecords.length,
      matched: mockRecords.filter((r) => r.status === "matched").length,
      unmatched: mockRecords.filter((r) => r.status === "unmatched").length,
      duplicates: mockRecords.filter((r) => r.status === "duplicate").length,
      invalid: mockRecords.filter((r) => r.status === "invalid").length,
      records: mockRecords,
    }

    setImportResult(result)
    setImporting(false)
    setShowResults(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "matched":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            已匹配
          </Badge>
        )
      case "unmatched":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            未匹配
          </Badge>
        )
      case "duplicate":
        return (
          <Badge className="bg-orange-100 text-orange-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            重复
          </Badge>
        )
      case "invalid":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            无效
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const downloadExceptionReport = () => {
    if (!importResult) return

    const exceptions = importResult.records.filter(
      (r) => r.status === "unmatched" || r.status === "duplicate" || r.status === "invalid",
    )

    const csvContent = [
      ["记录ID", "日期", "描述", "金额", "币种", "状态", "问题说明"],
      ...exceptions.map((record) => [
        record.id,
        record.date,
        record.description,
        record.amount.toString(),
        record.currency,
        record.status,
        record.issues?.join("; ") || "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `异常记录_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* 上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            CSV 文件导入
          </CardTitle>
          <CardDescription>上传财务交易记录CSV文件进行自动对账</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>文件格式要求</AlertTitle>
              <AlertDescription>
                CSV文件应包含以下列：日期、描述、金额、币种、交易类型。支持UTF-8编码，最大文件大小10MB。
              </AlertDescription>
            </Alert>

            <div className="flex items-center space-x-4">
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} disabled={importing} size="lg">
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    导入中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    选择文件
                  </>
                )}
              </Button>
              <div className="flex-1">
                {importing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>正在处理...</span>
                      <span>{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">支持格式</div>
                <div className="font-medium">CSV, TXT</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">最大大小</div>
                <div className="font-medium">10 MB</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">编码格式</div>
                <div className="font-medium">UTF-8</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 导入结果 */}
      {showResults && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>导入结果</span>
              <Button variant="outline" size="sm" onClick={downloadExceptionReport}>
                <Download className="w-4 h-4 mr-2" />
                导出异常列表
              </Button>
            </CardTitle>
            <CardDescription>
              共处理 {importResult.total} 条记录，发现{" "}
              {importResult.unmatched + importResult.duplicates + importResult.invalid} 个异常
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{importResult.total}</div>
                <div className="text-sm text-muted-foreground">总记录数</div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-green-50">
                <div className="text-2xl font-bold text-green-600">{importResult.matched}</div>
                <div className="text-sm text-muted-foreground">已匹配</div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-yellow-50">
                <div className="text-2xl font-bold text-yellow-600">{importResult.unmatched}</div>
                <div className="text-sm text-muted-foreground">未匹配</div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-orange-50">
                <div className="text-2xl font-bold text-orange-600">{importResult.duplicates}</div>
                <div className="text-sm text-muted-foreground">重复记录</div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-red-50">
                <div className="text-2xl font-bold text-red-600">{importResult.invalid}</div>
                <div className="text-sm text-muted-foreground">无效记录</div>
              </div>
            </div>

            {/* 记录列表 */}
            <Tabs defaultValue="all">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="matched">已匹配</TabsTrigger>
                <TabsTrigger value="unmatched">未匹配</TabsTrigger>
                <TabsTrigger value="duplicate">重复</TabsTrigger>
                <TabsTrigger value="invalid">无效</TabsTrigger>
              </TabsList>

              {["all", "matched", "unmatched", "duplicate", "invalid"].map((tabValue) => (
                <TabsContent key={tabValue} value={tabValue} className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>记录ID</TableHead>
                        <TableHead>日期</TableHead>
                        <TableHead>描述</TableHead>
                        <TableHead>金额</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>匹配/问题</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResult.records
                        .filter((r) => tabValue === "all" || r.status === tabValue)
                        .map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-mono text-sm">{record.id}</TableCell>
                            <TableCell>{record.date}</TableCell>
                            <TableCell className="max-w-xs truncate">{record.description}</TableCell>
                            <TableCell
                              className={`font-medium ${record.amount < 0 ? "text-red-600" : "text-green-600"}`}
                            >
                              {record.amount > 0 ? "+" : ""}
                              {record.amount.toLocaleString()} {record.currency}
                            </TableCell>
                            <TableCell>{getStatusBadge(record.status)}</TableCell>
                            <TableCell>
                              {record.matchedWith && (
                                <span className="text-sm text-green-600">匹配: {record.matchedWith}</span>
                              )}
                              {record.issues && (
                                <div className="space-y-1">
                                  {record.issues.map((issue, index) => (
                                    <div key={index} className="text-sm text-red-600">
                                      • {issue}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {record.status === "unmatched" && (
                                  <Button variant="ghost" size="sm">
                                    <Filter className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* 匹配规则配置 */}
      <Card>
        <CardHeader>
          <CardTitle>匹配规则配置</CardTitle>
          <CardDescription>设置自动对账的匹配规则和容差范围</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>金额容差（元）</Label>
              <Select defaultValue="0">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">精确匹配（0元）</SelectItem>
                  <SelectItem value="0.01">0.01元</SelectItem>
                  <SelectItem value="0.1">0.1元</SelectItem>
                  <SelectItem value="1">1元</SelectItem>
                  <SelectItem value="10">10元</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>时间容差（天）</Label>
              <Select defaultValue="0">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">同一天</SelectItem>
                  <SelectItem value="1">±1天</SelectItem>
                  <SelectItem value="3">±3天</SelectItem>
                  <SelectItem value="7">±7天</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>匹配字段</Label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部字段</SelectItem>
                  <SelectItem value="amount">仅金额</SelectItem>
                  <SelectItem value="date">仅日期</SelectItem>
                  <SelectItem value="description">仅描述</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>重复检测</Label>
              <Select defaultValue="strict">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">严格模式</SelectItem>
                  <SelectItem value="moderate">一般模式</SelectItem>
                  <SelectItem value="loose">宽松模式</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="mt-4">
            <CheckCircle className="w-4 h-4 mr-2" />
            保存配置
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
