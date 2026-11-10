"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useWebSocket } from "@/hooks/use-websocket"
import { AIAnalysisDisplay, type AIAnalysisResult, type AIAnalysisSummary } from "./ai-analysis-display"
import { WebSocketNotifications } from "@/components/notifications/websocket-notifications"
import { Upload, Download, RefreshCw, Sparkles, AlertCircle } from "lucide-react"

interface ReconciliationRecord {
  id: string
  transactionId: string
  amount: number
  date: string
  status: "matched" | "unmatched" | "analyzing"
  systemSource: string
  bankSource?: string
}

export function FinancialReconciliationEnhanced() {
  const [records, setRecords] = useState<ReconciliationRecord[]>([])
  const [aiResults, setAiResults] = useState<AIAnalysisResult[]>([])
  const [aiSummary, setAiSummary] = useState<AIAnalysisSummary | undefined>()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState("records")
  const [reconciliationId, setReconciliationId] = useState<string>("")

  // WebSocket 连接
  const { isConnected, subscribe, send } = useWebSocket()

  // 订阅 AI 分析事件
  useEffect(() => {
    if (!isConnected) return

    const unsubscribeAnalysis = subscribe("ai:analysis:completed", (data: any) => {
      console.log("AI 分析完成", data)
      setIsAnalyzing(false)

      // 获取分析结果
      fetchAIResults(data.reconciliationId)

      // 切换到结果标签
      setActiveTab("ai-results")
    })

    const unsubscribeStarted = subscribe("ai:analysis:started", () => {
      setIsAnalyzing(true)
    })

    const unsubscribeFailed = subscribe("ai:analysis:failed", (data: any) => {
      setIsAnalyzing(false)
      console.error("AI 分析失败", data)
    })

    return () => {
      unsubscribeAnalysis()
      unsubscribeStarted()
      unsubscribeFailed()
    }
  }, [isConnected, subscribe])

  // 获取 AI 分析结果
  const fetchAIResults = async (recId: string) => {
    try {
      const response = await fetch(`/api/ai-analysis/results/${recId}`)
      const data = await response.json()

      setAiResults(data.results || [])
      setAiSummary(data.summary)
    } catch (error) {
      console.error("获取 AI 结果失败", error)
    }
  }

  // 上传文件并触发对账
  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/reconciliation/import", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setReconciliationId(data.reconciliationId)
        setRecords(data.records || [])

        // 如果有未匹配记录，触发 AI 分析
        const unmatchedCount = data.records.filter((r: ReconciliationRecord) => r.status === "unmatched").length

        if (unmatchedCount > 0) {
          triggerAIAnalysis(data.reconciliationId)
        }
      }
    } catch (error) {
      console.error("上传失败", error)
    }
  }

  // 触发 AI 分析
  const triggerAIAnalysis = async (recId: string) => {
    try {
      setIsAnalyzing(true)

      const response = await fetch("/api/ai-analysis/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reconciliationId: recId }),
      })

      const data = await response.json()

      if (data.success) {
        console.log("AI 分析已启动", data.taskId)
      }
    } catch (error) {
      console.error("启动 AI 分析失败", error)
      setIsAnalyzing(false)
    }
  }

  // 应用 AI 建议
  const handleApplyAction = async (recordId: string, action: string) => {
    try {
      const response = await fetch("/api/reconciliation/apply-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, action }),
      })

      const data = await response.json()

      if (data.success) {
        // 更新记录状态
        setRecords((prev) => prev.map((r) => (r.id === recordId ? { ...r, status: "matched" } : r)))
      }
    } catch (error) {
      console.error("应用操作失败", error)
    }
  }

  const unmatchedCount = records.filter((r) => r.status === "unmatched").length
  const matchedCount = records.filter((r) => r.status === "matched").length

  return (
    <div className="space-y-6">
      {/* WebSocket 通知 */}
      <WebSocketNotifications />

      {/* 页面头部 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>财务对账系统</CardTitle>
              <CardDescription>AI 驱动的智能对账与异常分析</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={isConnected ? "default" : "secondary"}>{isConnected ? "已连接" : "未连接"}</Badge>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                上传文件
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                导出报告
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">总记录数</div>
              <div className="text-2xl font-bold">{records.length}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">已匹配</div>
              <div className="text-2xl font-bold text-green-600">{matchedCount}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">未匹配</div>
              <div className="text-2xl font-bold text-orange-600">{unmatchedCount}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">AI 分析</div>
              <div className="text-2xl font-bold text-blue-600">{aiResults.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 主内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="records">对账记录</TabsTrigger>
          <TabsTrigger value="ai-results">
            <Sparkles className="h-4 w-4 mr-2" />
            AI 分析
            {aiResults.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {aiResults.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">历史记录</TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>对账明细</CardTitle>
                {unmatchedCount > 0 && (
                  <Button onClick={() => triggerAIAnalysis(reconciliationId)} disabled={isAnalyzing}>
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        分析中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        AI 分析异常
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无对账记录</p>
                  <p className="text-sm mt-2">请上传对账文件开始</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* 这里可以添加记录表格 */}
                  <p className="text-sm text-muted-foreground">显示 {records.length} 条记录</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-results">
          <AIAnalysisDisplay
            reconciliationId={reconciliationId}
            results={aiResults}
            summary={aiSummary}
            isAnalyzing={isAnalyzing}
            onRefresh={() => fetchAIResults(reconciliationId)}
            onApplyAction={handleApplyAction}
          />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>历史记录</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">暂无历史记录</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
