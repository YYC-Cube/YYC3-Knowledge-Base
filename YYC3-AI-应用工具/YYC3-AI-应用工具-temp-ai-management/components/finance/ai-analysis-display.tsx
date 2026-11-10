"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  RefreshCw,
} from "lucide-react"

export interface AIAnalysisResult {
  id: string
  recordId: string
  confidence: number
  rootCause: string
  category: "amount_mismatch" | "date_mismatch" | "missing_record" | "duplicate" | "system_error"
  severity: "low" | "medium" | "high" | "critical"
  suggestedAction: string
  affectedAmount?: number
  relatedRecords?: string[]
  timestamp: string
  status: "pending" | "processing" | "completed" | "failed"
}

export interface AIAnalysisSummary {
  totalAnalyzed: number
  averageConfidence: number
  categoryDistribution: Record<string, number>
  severityDistribution: Record<string, number>
  estimatedImpact: number
  processingTime: number
}

interface AIAnalysisDisplayProps {
  reconciliationId: string
  results: AIAnalysisResult[]
  summary?: AIAnalysisSummary
  isAnalyzing?: boolean
  onRefresh?: () => void
  onApplyAction?: (recordId: string, action: string) => void
}

export function AIAnalysisDisplay({
  reconciliationId,
  results,
  summary,
  isAnalyzing = false,
  onRefresh,
  onApplyAction,
}: AIAnalysisDisplayProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [filteredResults, setFilteredResults] = useState<AIAnalysisResult[]>(results)

  useEffect(() => {
    if (selectedCategory === "all") {
      setFilteredResults(results)
    } else {
      setFilteredResults(results.filter((r) => r.category === selectedCategory))
    }
  }, [selectedCategory, results])

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      amount_mismatch: "金额不匹配",
      date_mismatch: "日期不匹配",
      missing_record: "缺失记录",
      duplicate: "重复记录",
      system_error: "系统错误",
    }
    return labels[category] || category
  }

  const getSeverityColor = (severity: string): string => {
    const colors: Record<string, string> = {
      low: "text-green-600",
      medium: "text-yellow-600",
      high: "text-orange-600",
      critical: "text-red-600",
    }
    return colors[severity] || "text-gray-600"
  }

  const getSeverityIcon = (severity: string) => {
    const icons: Record<string, any> = {
      low: <CheckCircle2 className="h-4 w-4" />,
      medium: <AlertCircle className="h-4 w-4" />,
      high: <AlertTriangle className="h-4 w-4" />,
      critical: <XCircle className="h-4 w-4" />,
    }
    return icons[severity] || <AlertCircle className="h-4 w-4" />
  }

  return (
    <div className="space-y-6">
      {/* 分析摘要 */}
      {summary && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>AI 分析摘要</CardTitle>
                <CardDescription>
                  共分析 {summary.totalAnalyzed} 条记录，耗时 {summary.processingTime}秒
                </CardDescription>
              </div>
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh} disabled={isAnalyzing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? "animate-spin" : ""}`} />
                  刷新
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">平均置信度</div>
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold">{(summary.averageConfidence * 100).toFixed(1)}%</div>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <Progress value={summary.averageConfidence * 100} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">预估影响金额</div>
                <div className="text-2xl font-bold">¥{summary.estimatedImpact.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">需要关注</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">问题分布</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(summary.categoryDistribution).map(([category, count]) => (
                    <Badge key={category} variant="outline" className="text-xs">
                      {getCategoryLabel(category)}: {count}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">严重程度</div>
                <div className="space-y-1">
                  {Object.entries(summary.severityDistribution).map(([severity, count]) => (
                    <div key={severity} className="flex items-center justify-between text-sm">
                      <span className={getSeverityColor(severity)}>
                        {severity}: {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 分析中状态 */}
      {isAnalyzing && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <div className="flex-1">
                <div className="text-sm font-medium">AI 正在分析异常记录...</div>
                <div className="text-xs text-muted-foreground mt-1">预计需要 30-60 秒，请稍候</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 分析结果列表 */}
      <Card>
        <CardHeader>
          <CardTitle>分析结果详情</CardTitle>
          <CardDescription>
            显示 {filteredResults.length} / {results.length} 条记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="amount_mismatch">金额不匹配</TabsTrigger>
              <TabsTrigger value="date_mismatch">日期不匹配</TabsTrigger>
              <TabsTrigger value="missing_record">缺失记录</TabsTrigger>
              <TabsTrigger value="duplicate">重复记录</TabsTrigger>
              <TabsTrigger value="system_error">系统错误</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedCategory}>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {filteredResults.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>暂无分析结果</p>
                    </div>
                  ) : (
                    filteredResults.map((result) => (
                      <Card
                        key={result.id}
                        className="border-l-4"
                        style={{
                          borderLeftColor:
                            result.severity === "critical"
                              ? "#ef4444"
                              : result.severity === "high"
                                ? "#f97316"
                                : result.severity === "medium"
                                  ? "#eab308"
                                  : "#22c55e",
                        }}
                      >
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            {/* 头部信息 */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={getSeverityColor(result.severity)}>
                                  {getSeverityIcon(result.severity)}
                                </div>
                                <div>
                                  <div className="font-medium">记录 ID: {result.recordId}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {new Date(result.timestamp).toLocaleString("zh-CN")}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{getCategoryLabel(result.category)}</Badge>
                                <Badge variant="secondary">置信度: {(result.confidence * 100).toFixed(0)}%</Badge>
                              </div>
                            </div>

                            {/* 分析内容 */}
                            <div className="space-y-3 pl-7">
                              <div>
                                <div className="text-sm font-medium text-muted-foreground mb-1">根本原因</div>
                                <div className="text-sm">{result.rootCause}</div>
                              </div>

                              <div>
                                <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center">
                                  <Lightbulb className="h-3 w-3 mr-1" />
                                  建议操作
                                </div>
                                <div className="text-sm text-blue-600">{result.suggestedAction}</div>
                              </div>

                              {result.affectedAmount && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-muted-foreground">影响金额:</span>
                                  <span className="text-sm font-medium">¥{result.affectedAmount.toLocaleString()}</span>
                                </div>
                              )}

                              {result.relatedRecords && result.relatedRecords.length > 0 && (
                                <div>
                                  <div className="text-sm text-muted-foreground mb-1">相关记录</div>
                                  <div className="flex flex-wrap gap-1">
                                    {result.relatedRecords.map((id) => (
                                      <Badge key={id} variant="outline" className="text-xs">
                                        {id}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 操作按钮 */}
                            {onApplyAction && result.status === "completed" && (
                              <div className="flex justify-end pt-2 border-t">
                                <Button
                                  size="sm"
                                  onClick={() => onApplyAction(result.recordId, result.suggestedAction)}
                                >
                                  应用建议
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
