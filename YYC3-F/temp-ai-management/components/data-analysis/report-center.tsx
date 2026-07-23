"use client"

import { useState } from "react"
import {
  FileBarChart,
  Download,
  Calendar,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Settings,
  BarChart3,
  PieChart,
  LineChart,
  Table2,
  FileText,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
} from "lucide-react"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { AnimatedContainer } from "../design-system/animation-system"
import { EnhancedCard } from "../design-system/enhanced-card-system"
import { EnhancedButton } from "../design-system/enhanced-button-system"

interface ReportTemplate {
  id: number
  name: string
  category: string
  description: string
  lastGenerated: string
  status: "已生成" | "生成中" | "失败" | "草稿"
  downloads: number
  chartType: string
  dataSource: string
  filters: string[]
  schedule?: {
    enabled: boolean
    frequency: string
    time: string
    recipients: string[]
  }
}

interface CustomReport {
  name: string
  description: string
  category: string
  chartType: string
  dataSource: string
  dateRange: string
  filters: {
    department: string[]
    status: string[]
    dateFrom: string
    dateTo: string
  }
  visualization: {
    showLegend: boolean
    showGrid: boolean
    colorScheme: string
    fontSize: number
  }
  schedule: {
    enabled: boolean
    frequency: string
    time: string
    recipients: string[]
  }
}

export function ReportCenter() {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [showCustomDialog, setShowCustomDialog] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)

  const [customReport, setCustomReport] = useState<CustomReport>({
    name: "",
    description: "",
    category: "业务分析",
    chartType: "bar",
    dataSource: "sales",
    dateRange: "last30days",
    filters: {
      department: [],
      status: [],
      dateFrom: "",
      dateTo: "",
    },
    visualization: {
      showLegend: true,
      showGrid: true,
      colorScheme: "blue",
      fontSize: 12,
    },
    schedule: {
      enabled: false,
      frequency: "weekly",
      time: "09:00",
      recipients: [],
    },
  })

  const reportTemplates: ReportTemplate[] = [
    {
      id: 1,
      name: "用户行为分析报告",
      category: "用户分析",
      description: "详细分析用户行为模式和偏好",
      lastGenerated: "2024-01-15",
      status: "已生成",
      downloads: 234,
      chartType: "line",
      dataSource: "user_behavior",
      filters: ["时间范围", "用户类型", "行为类型"],
      schedule: {
        enabled: true,
        frequency: "weekly",
        time: "09:00",
        recipients: ["admin@company.com", "analyst@company.com"],
      },
    },
    {
      id: 2,
      name: "销售业绩月报",
      category: "业务分析",
      description: "月度销售数据和趋势分析",
      lastGenerated: "2024-01-14",
      status: "生成中",
      downloads: 156,
      chartType: "bar",
      dataSource: "sales",
      filters: ["产品类别", "销售区域", "时间范围"],
      schedule: {
        enabled: true,
        frequency: "monthly",
        time: "08:00",
        recipients: ["sales@company.com"],
      },
    },
    {
      id: 3,
      name: "系统性能监控报告",
      category: "技术分析",
      description: "系统运行状态和性能指标",
      lastGenerated: "2024-01-13",
      status: "已生成",
      downloads: 89,
      chartType: "line",
      dataSource: "system_metrics",
      filters: ["服务器", "时间范围", "指标类型"],
    },
    {
      id: 4,
      name: "财务收支分析",
      category: "财务分析",
      description: "收入支出详细分析和预测",
      lastGenerated: "2024-01-12",
      status: "已生成",
      downloads: 312,
      chartType: "pie",
      dataSource: "finance",
      filters: ["账户类型", "交易类型", "时间范围"],
    },
  ]

  const recentReports = [
    {
      id: 1,
      name: "Q4季度业务总结",
      type: "业务报告",
      generatedAt: "2024-01-15 14:30",
      size: "2.4 MB",
      format: "PDF",
      status: "已完成",
    },
    {
      id: 2,
      name: "用户增长分析",
      type: "用户报告",
      generatedAt: "2024-01-15 10:15",
      size: "1.8 MB",
      format: "Excel",
      status: "已完成",
    },
    {
      id: 3,
      name: "产品销售统计",
      type: "销售报告",
      generatedAt: "2024-01-14 16:45",
      size: "3.2 MB",
      format: "PDF",
      status: "生成中",
    },
  ]

  const reportStats = [
    { label: "报告模板", value: "24", change: "+3", icon: FileText },
    { label: "本月生成", value: "156", change: "+28", icon: BarChart3 },
    { label: "总下载量", value: "2,847", change: "+234", icon: Download },
    { label: "自动化报告", value: "12", change: "+2", icon: Clock },
  ]

  const chartTypes = [
    { value: "bar", label: "柱状图", icon: BarChart3 },
    { value: "line", label: "折线图", icon: LineChart },
    { value: "pie", label: "饼图", icon: PieChart },
    { value: "table", label: "表格", icon: Table2 },
  ]

  const dataSources = [
    { value: "sales", label: "销售数据" },
    { value: "user_behavior", label: "用户行为" },
    { value: "finance", label: "财务数据" },
    { value: "system_metrics", label: "系统指标" },
    { value: "inventory", label: "库存数据" },
  ]

  const colorSchemes = [
    { value: "blue", label: "蓝色系", color: "bg-blue-500" },
    { value: "green", label: "绿色系", color: "bg-green-500" },
    { value: "purple", label: "紫色系", color: "bg-purple-500" },
    { value: "orange", label: "橙色系", color: "bg-orange-500" },
  ]

  const handleCreateCustomReport = () => {
    console.log("创建自定义报告:", customReport)
    setShowCustomDialog(false)
    // 这里可以添加实际的报告创建逻辑
  }

  const handleScheduleReport = (template: ReportTemplate) => {
    setSelectedTemplate(template)
    setShowScheduleDialog(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "已生成":
      case "已完成":
        return <Badge className="bg-green-100 text-green-800">已完成</Badge>
      case "生成中":
        return <Badge className="bg-blue-100 text-blue-800">生成中</Badge>
      case "失败":
        return <Badge className="bg-red-100 text-red-800">失败</Badge>
      case "草稿":
        return <Badge variant="secondary">草稿</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "已生成":
      case "已完成":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "生成中":
        return <Play className="w-4 h-4 text-blue-600" />
      case "失败":
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">报表中心</h2>
          <p className="text-secondary-600">专业的数据报表管理，支持自定义报表生成和自动化调度</p>
        </div>
        <div className="flex gap-2">
          <EnhancedButton variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            定时报告
          </EnhancedButton>
          <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
            <DialogTrigger asChild>
              <EnhancedButton variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                自定义报告
              </EnhancedButton>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>创建自定义报告</DialogTitle>
                <DialogDescription>配置您的专属报告，支持多种图表类型和数据源</DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-4">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="report-name">报告名称</Label>
                    <Input
                      id="report-name"
                      value={customReport.name}
                      onChange={(e) => setCustomReport({ ...customReport, name: e.target.value })}
                      placeholder="输入报告名称"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="report-category">报告类别</Label>
                    <Select
                      value={customReport.category}
                      onValueChange={(value) => setCustomReport({ ...customReport, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="业务分析">业务分析</SelectItem>
                        <SelectItem value="用户分析">用户分析</SelectItem>
                        <SelectItem value="财务分析">财务分析</SelectItem>
                        <SelectItem value="技术分析">技术分析</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report-description">报告描述</Label>
                  <Textarea
                    id="report-description"
                    value={customReport.description}
                    onChange={(e) => setCustomReport({ ...customReport, description: e.target.value })}
                    placeholder="描述报告的用途和内容"
                    rows={3}
                  />
                </div>

                {/* 数据配置 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>图表类型</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {chartTypes.map((type) => (
                        <div
                          key={type.value}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            customReport.chartType === type.value
                              ? "border-primary-500 bg-primary-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => setCustomReport({ ...customReport, chartType: type.value })}
                        >
                          <div className="flex items-center space-x-2">
                            <type.icon className="w-4 h-4" />
                            <span className="text-sm">{type.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>数据源</Label>
                    <Select
                      value={customReport.dataSource}
                      onValueChange={(value) => setCustomReport({ ...customReport, dataSource: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dataSources.map((source) => (
                          <SelectItem key={source.value} value={source.value}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 可视化配置 */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">可视化设置</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-legend">显示图例</Label>
                        <Switch
                          id="show-legend"
                          checked={customReport.visualization.showLegend}
                          onCheckedChange={(checked) =>
                            setCustomReport({
                              ...customReport,
                              visualization: { ...customReport.visualization, showLegend: checked },
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-grid">显示网格</Label>
                        <Switch
                          id="show-grid"
                          checked={customReport.visualization.showGrid}
                          onCheckedChange={(checked) =>
                            setCustomReport({
                              ...customReport,
                              visualization: { ...customReport.visualization, showGrid: checked },
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>配色方案</Label>
                        <div className="flex space-x-2">
                          {colorSchemes.map((scheme) => (
                            <div
                              key={scheme.value}
                              className={`w-8 h-8 rounded-full cursor-pointer border-2 ${scheme.color} ${
                                customReport.visualization.colorScheme === scheme.value
                                  ? "border-gray-800"
                                  : "border-gray-300"
                              }`}
                              onClick={() =>
                                setCustomReport({
                                  ...customReport,
                                  visualization: { ...customReport.visualization, colorScheme: scheme.value },
                                })
                              }
                              title={scheme.label}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>字体大小: {customReport.visualization.fontSize}px</Label>
                        <Slider
                          value={[customReport.visualization.fontSize]}
                          onValueChange={(value) =>
                            setCustomReport({
                              ...customReport,
                              visualization: { ...customReport.visualization, fontSize: value[0] },
                            })
                          }
                          max={20}
                          min={8}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 定时调度 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">定时调度</Label>
                    <Switch
                      checked={customReport.schedule.enabled}
                      onCheckedChange={(checked) =>
                        setCustomReport({
                          ...customReport,
                          schedule: { ...customReport.schedule, enabled: checked },
                        })
                      }
                    />
                  </div>
                  {customReport.schedule.enabled && (
                    <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
                      <div className="space-y-2">
                        <Label>频率</Label>
                        <Select
                          value={customReport.schedule.frequency}
                          onValueChange={(value) =>
                            setCustomReport({
                              ...customReport,
                              schedule: { ...customReport.schedule, frequency: value },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">每日</SelectItem>
                            <SelectItem value="weekly">每周</SelectItem>
                            <SelectItem value="monthly">每月</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>时间</Label>
                        <Input
                          type="time"
                          value={customReport.schedule.time}
                          onChange={(e) =>
                            setCustomReport({
                              ...customReport,
                              schedule: { ...customReport.schedule, time: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCustomDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateCustomReport}>创建报告</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportStats.map((stat, index) => (
          <AnimatedContainer key={stat.label} animation="slideUp" delay={index * 100}>
            <EnhancedCard variant="modern" glowEffect>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-secondary-900">{stat.value}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <stat.icon className="h-5 w-5 text-primary-600" />
                    <Badge variant="secondary" className="text-green-600">
                      {stat.change}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>
        ))}
      </div>

      {/* 主要内容 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 报告模板 */}
        <div className="lg:col-span-2">
          <AnimatedContainer animation="slideLeft" delay={200}>
            <EnhancedCard variant="traditional" size="lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <FileBarChart className="h-5 w-5 text-primary-600" />
                      <span>报告模板</span>
                    </CardTitle>
                    <CardDescription>管理和使用报告模板，支持自定义配置</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
                      <Input
                        placeholder="搜索报告..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-48"
                      />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部</SelectItem>
                        <SelectItem value="用户分析">用户分析</SelectItem>
                        <SelectItem value="业务分析">业务分析</SelectItem>
                        <SelectItem value="技术分析">技术分析</SelectItem>
                        <SelectItem value="财务分析">财务分析</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(template.status)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium text-secondary-900">{template.name}</h4>
                            <Badge variant="outline">{template.category}</Badge>
                            {getStatusBadge(template.status)}
                            {template.schedule?.enabled && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                <Clock className="w-3 h-3 mr-1" />
                                定时
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-secondary-600 mt-1">{template.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-secondary-500">
                            <span>最后生成: {template.lastGenerated}</span>
                            <span>下载量: {template.downloads}</span>
                            <span>图表: {chartTypes.find((t) => t.value === template.chartType)?.label}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" title="预览">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="下载">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="定时设置"
                          onClick={() => handleScheduleReport(template)}
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="编辑">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>
        </div>

        {/* 最近报告 */}
        <div>
          <AnimatedContainer animation="slideRight" delay={300}>
            <EnhancedCard variant="traditional" size="lg">
              <CardHeader>
                <CardTitle className="text-lg">最近生成的报告</CardTitle>
                <CardDescription>最新生成的报告文件</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentReports.map((report) => (
                    <div key={report.id} className="p-3 border rounded-lg hover:bg-secondary-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(report.status)}
                          <div className="flex-1">
                            <h5 className="font-medium text-sm text-secondary-900">{report.name}</h5>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {report.type}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {report.format}
                              </Badge>
                              {getStatusBadge(report.status)}
                            </div>
                            <div className="text-xs text-secondary-500 mt-1">
                              <div>{report.generatedAt}</div>
                              <div>{report.size}</div>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" className="w-full bg-transparent" size="sm">
                    查看全部报告
                  </Button>
                </div>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>
        </div>
      </div>

      {/* 定时调度对话框 */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>定时报告设置</DialogTitle>
            <DialogDescription>为 "{selectedTemplate?.name}" 配置自动生成和发送</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label>启用定时生成</Label>
              <Switch defaultChecked={selectedTemplate?.schedule?.enabled} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>生成频率</Label>
                <Select defaultValue={selectedTemplate?.schedule?.frequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">每日</SelectItem>
                    <SelectItem value="weekly">每周</SelectItem>
                    <SelectItem value="monthly">每月</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>生成时间</Label>
                <Input type="time" defaultValue={selectedTemplate?.schedule?.time} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>邮件接收人</Label>
              <Textarea
                placeholder="输入邮箱地址，多个地址用逗号分隔"
                defaultValue={selectedTemplate?.schedule?.recipients?.join(", ")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              取消
            </Button>
            <Button>保存设置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 报告详情表格 */}
      <AnimatedContainer animation="fadeIn" delay={400}>
        <EnhancedCard variant="modern" size="lg">
          <CardHeader>
            <CardTitle>报告管理</CardTitle>
            <CardDescription>详细的报告列表和管理操作</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="templates" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="templates">报告模板</TabsTrigger>
                <TabsTrigger value="scheduled">定时报告</TabsTrigger>
                <TabsTrigger value="history">历史记录</TabsTrigger>
              </TabsList>
              <TabsContent value="templates" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>报告名称</TableHead>
                      <TableHead>类别</TableHead>
                      <TableHead>图表类型</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>最后更新</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportTemplates.map((template) => {
                      // 找到对应的图表类型组件
                      const ChartIcon = chartTypes.find(t => t.value === template.chartType)?.icon;
                      
                      return (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{template.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {ChartIcon && <ChartIcon className="w-4 h-4" />}
                              <span>{chartTypes.find((t) => t.value === template.chartType)?.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(template.status)}</TableCell>
                          <TableCell>{template.lastGenerated}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="scheduled" className="mt-4">
                <div className="space-y-4">
                  {reportTemplates
                    .filter((t) => t.schedule?.enabled)
                    .map(
                      (template) =>
                        (
                          <div key={template.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-secondary-600">
                            {template.schedule?.frequency === 'daily' && '每日'}
                            {template.schedule?.frequency === 'weekly' && '每周'}
                            {template.schedule?.frequency === 'monthly' && '每月'}
                            {' '}
                            {template.schedule?.time} 自动生成
                          </p>
                          <p className="text-xs text-secondary-500">
                            发送至: {template.schedule?.recipients?.join(", ")}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-green-100 text-green-800">
                            <Clock className="w-3 h-3 mr-1" />
                            已启用
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                        ),
                    )}
                </div>
              </TabsContent>
              <TabsContent value="history" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>报告名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>生成时间</TableHead>
                      <TableHead>文件大小</TableHead>
                      <TableHead>格式</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.name}</TableCell>
                        <TableCell>{report.type}</TableCell>
                        <TableCell>{report.generatedAt}</TableCell>
                        <TableCell>{report.size}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.format}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Mail className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </EnhancedCard>
      </AnimatedContainer>
    </div>
  )
}
