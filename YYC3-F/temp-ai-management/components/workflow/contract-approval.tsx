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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Check,
  X,
  Clock,
  Settings,
  ChevronRight,
  MessageSquare,
  Paperclip,
} from "lucide-react"

// 数据接口定义
interface ContractTemplate {
  id: string
  name: string
  category: string
  description: string
  fields: TemplateField[]
  createdAt: string
  updatedAt: string
  isActive: boolean
}

interface TemplateField {
  id: string
  name: string
  type: "text" | "number" | "date" | "select" | "textarea"
  required: boolean
  options?: string[]
  placeholder?: string
}

interface Contract {
  id: string
  title: string
  templateId: string
  templateName: string
  contractNumber: string
  customerName: string
  customerEmail: string
  amount: number
  currency: string
  startDate: string
  endDate: string
  status: "draft" | "pending" | "reviewing" | "approved" | "rejected" | "signed" | "executed" | "expired"
  currentStep: number
  totalSteps: number
  createdBy: string
  createdAt: string
  updatedAt: string
  approvalHistory: ApprovalStep[]
  attachments: string[]
  notes?: string
}

interface ApprovalStep {
  id: string
  stepNumber: number
  stepName: string
  assignedTo: string
  assignedToName: string
  status: "pending" | "approved" | "rejected" | "skipped"
  action?: "approve" | "reject" | "request_changes"
  comments?: string
  processedAt?: string
  dueDate: string
}

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  isDefault: boolean
  createdAt: string
}

interface WorkflowStep {
  id: string
  name: string
  description: string
  assigneeType: "user" | "role" | "department"
  assigneeId: string
  assigneeName: string
  isRequired: boolean
  timeLimit: number // 小时
  canSkip: boolean
  conditions?: string[]
}

export function ContractApproval() {
  const [activeTab, setActiveTab] = useState("contracts")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false)

  // 模拟数据
  const [contractTemplates] = useState<ContractTemplate[]>([
    {
      id: "TPL-001",
      name: "服务合同模板",
      category: "服务类",
      description: "标准服务提供合同模板",
      fields: [
        { id: "f1", name: "服务内容", type: "textarea", required: true, placeholder: "详细描述服务内容" },
        { id: "f2", name: "服务期限", type: "date", required: true },
        { id: "f3", name: "服务费用", type: "number", required: true },
        { id: "f4", name: "付款方式", type: "select", required: true, options: ["月付", "季付", "年付", "一次性"] },
      ],
      createdAt: "2024-01-10 10:00:00",
      updatedAt: "2024-01-15 14:30:00",
      isActive: true,
    },
    {
      id: "TPL-002",
      name: "采购合同模板",
      category: "采购类",
      description: "标准采购合同模板",
      fields: [
        { id: "f1", name: "采购物品", type: "textarea", required: true },
        { id: "f2", name: "数量", type: "number", required: true },
        { id: "f3", name: "单价", type: "number", required: true },
        { id: "f4", name: "交付日期", type: "date", required: true },
        { id: "f5", name: "质量标准", type: "textarea", required: false },
      ],
      createdAt: "2024-01-08 09:15:00",
      updatedAt: "2024-01-12 16:20:00",
      isActive: true,
    },
  ])

  const [contracts, setContracts] = useState<Contract[]>([
    {
      id: "CON-2024-001",
      title: "北京科技公司软件开发服务合同",
      templateId: "TPL-001",
      templateName: "服务合同模板",
      contractNumber: "CON-2024-001",
      customerName: "北京科技有限公司",
      customerEmail: "contact@bjtech.com",
      amount: 150000,
      currency: "CNY",
      startDate: "2024-02-01",
      endDate: "2024-07-31",
      status: "reviewing",
      currentStep: 2,
      totalSteps: 4,
      createdBy: "张三",
      createdAt: "2024-01-15 09:30:00",
      updatedAt: "2024-01-16 14:20:00",
      approvalHistory: [
        {
          id: "step-1",
          stepNumber: 1,
          stepName: "部门经理审批",
          assignedTo: "manager-001",
          assignedToName: "李经理",
          status: "approved",
          action: "approve",
          comments: "合同条款合理，同意审批",
          processedAt: "2024-01-15 16:30:00",
          dueDate: "2024-01-16 18:00:00",
        },
        {
          id: "step-2",
          stepNumber: 2,
          stepName: "法务审核",
          assignedTo: "legal-001",
          assignedToName: "王律师",
          status: "pending",
          dueDate: "2024-01-17 18:00:00",
        },
        {
          id: "step-3",
          stepNumber: 3,
          stepName: "财务审核",
          assignedTo: "finance-001",
          assignedToName: "赵会计",
          status: "pending",
          dueDate: "2024-01-18 18:00:00",
        },
        {
          id: "step-4",
          stepNumber: 4,
          stepName: "总经理签批",
          assignedTo: "ceo-001",
          assignedToName: "陈总",
          status: "pending",
          dueDate: "2024-01-19 18:00:00",
        },
      ],
      attachments: ["contract-draft.pdf", "requirements.docx"],
      notes: "客户要求加急处理",
    },
    {
      id: "CON-2024-002",
      title: "上海贸易公司采购合同",
      templateId: "TPL-002",
      templateName: "采购合同模板",
      contractNumber: "CON-2024-002",
      customerName: "上海贸易有限公司",
      customerEmail: "purchase@shtrade.com",
      amount: 85000,
      currency: "CNY",
      startDate: "2024-01-20",
      endDate: "2024-03-20",
      status: "approved",
      currentStep: 4,
      totalSteps: 4,
      createdBy: "李四",
      createdAt: "2024-01-12 14:15:00",
      updatedAt: "2024-01-14 11:45:00",
      approvalHistory: [
        {
          id: "step-1",
          stepNumber: 1,
          stepName: "部门经理审批",
          assignedTo: "manager-002",
          assignedToName: "刘经理",
          status: "approved",
          action: "approve",
          processedAt: "2024-01-12 17:30:00",
          dueDate: "2024-01-13 18:00:00",
        },
        {
          id: "step-2",
          stepNumber: 2,
          stepName: "法务审核",
          assignedTo: "legal-001",
          assignedToName: "王律师",
          status: "approved",
          action: "approve",
          processedAt: "2024-01-13 10:15:00",
          dueDate: "2024-01-14 18:00:00",
        },
        {
          id: "step-3",
          stepNumber: 3,
          stepName: "财务审核",
          assignedTo: "finance-001",
          assignedToName: "赵会计",
          status: "approved",
          action: "approve",
          processedAt: "2024-01-13 15:20:00",
          dueDate: "2024-01-15 18:00:00",
        },
        {
          id: "step-4",
          stepNumber: 4,
          stepName: "总经理签批",
          assignedTo: "ceo-001",
          assignedToName: "陈总",
          status: "approved",
          action: "approve",
          processedAt: "2024-01-14 11:45:00",
          dueDate: "2024-01-16 18:00:00",
        },
      ],
      attachments: ["purchase-contract.pdf"],
    },
    {
      id: "CON-2024-003",
      title: "深圳制造企业设备租赁合同",
      templateId: "TPL-001",
      templateName: "服务合同模板",
      contractNumber: "CON-2024-003",
      customerName: "深圳制造企业",
      customerEmail: "lease@szmfg.com",
      amount: 45000,
      currency: "CNY",
      startDate: "2024-02-15",
      endDate: "2024-08-15",
      status: "rejected",
      currentStep: 2,
      totalSteps: 4,
      createdBy: "王五",
      createdAt: "2024-01-10 11:20:00",
      updatedAt: "2024-01-11 09:30:00",
      approvalHistory: [
        {
          id: "step-1",
          stepNumber: 1,
          stepName: "部门经理审批",
          assignedTo: "manager-001",
          assignedToName: "李经理",
          status: "approved",
          action: "approve",
          processedAt: "2024-01-10 16:45:00",
          dueDate: "2024-01-11 18:00:00",
        },
        {
          id: "step-2",
          stepNumber: 2,
          stepName: "法务审核",
          assignedTo: "legal-001",
          assignedToName: "王律师",
          status: "rejected",
          action: "reject",
          comments: "合同条款存在法律风险，建议修改后重新提交",
          processedAt: "2024-01-11 09:30:00",
          dueDate: "2024-01-12 18:00:00",
        },
      ],
      attachments: ["lease-contract-draft.pdf"],
      notes: "需要修改风险条款",
    },
  ])

  const [workflowTemplates] = useState<WorkflowTemplate[]>([
    {
      id: "WF-001",
      name: "标准合同审批流程",
      description: "适用于大部分合同的标准审批流程",
      isDefault: true,
      createdAt: "2024-01-01 00:00:00",
      steps: [
        {
          id: "step-1",
          name: "部门经理审批",
          description: "部门经理对合同进行初步审核",
          assigneeType: "role",
          assigneeId: "department-manager",
          assigneeName: "部门经理",
          isRequired: true,
          timeLimit: 24,
          canSkip: false,
        },
        {
          id: "step-2",
          name: "法务审核",
          description: "法务部门审核合同条款的合法性",
          assigneeType: "department",
          assigneeId: "legal",
          assigneeName: "法务部",
          isRequired: true,
          timeLimit: 48,
          canSkip: false,
        },
        {
          id: "step-3",
          name: "财务审核",
          description: "财务部门审核合同的财务条款",
          assigneeType: "department",
          assigneeId: "finance",
          assigneeName: "财务部",
          isRequired: true,
          timeLimit: 24,
          canSkip: false,
          conditions: ["amount > 50000"],
        },
        {
          id: "step-4",
          name: "总经理签批",
          description: "总经理最终审批",
          assigneeType: "user",
          assigneeId: "ceo",
          assigneeName: "总经理",
          isRequired: true,
          timeLimit: 72,
          canSkip: false,
          conditions: ["amount > 100000"],
        },
      ],
    },
  ])

  // 过滤合同数据
  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || contract.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // 状态标签组件
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">草稿</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">待审批</Badge>
      case "reviewing":
        return <Badge className="bg-blue-100 text-blue-800">审核中</Badge>
      case "approved":
        return <Badge className="bg-green-100 text-green-800">已批准</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">已拒绝</Badge>
      case "signed":
        return <Badge className="bg-purple-100 text-purple-800">已签署</Badge>
      case "executed":
        return <Badge className="bg-indigo-100 text-indigo-800">执行中</Badge>
      case "expired":
        return <Badge variant="outline">已过期</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getStepStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600">
            待处理
          </Badge>
        )
      case "approved":
        return <Badge className="bg-green-100 text-green-800">已通过</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">已拒绝</Badge>
      case "skipped":
        return <Badge variant="secondary">已跳过</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // 处理审批操作
  const handleApproval = (contractId: string, stepId: string, action: "approve" | "reject", comments?: string) => {
    setContracts((prev) =>
      prev.map((contract) => {
        if (contract.id === contractId) {
          const updatedHistory = contract.approvalHistory.map((step) =>
            step.id === stepId
              ? {
                  ...step,
                  status: action === "approve" ? "approved" : "rejected",
                  action,
                  comments,
                  processedAt: new Date().toISOString(),
                }
              : step,
          )

          // 更新合同状态
          let newStatus = contract.status
          let newCurrentStep = contract.currentStep

          if (action === "approve") {
            if (contract.currentStep < contract.totalSteps) {
              newCurrentStep = contract.currentStep + 1
              newStatus = "reviewing"
            } else {
              newStatus = "approved"
            }
          } else {
            newStatus = "rejected"
          }

          return {
            ...contract,
            status: newStatus,
            currentStep: newCurrentStep,
            approvalHistory: updatedHistory,
            updatedAt: new Date().toISOString(),
          }
        }
        return contract
      }),
    )
  }

  // 统计数据
  const stats = {
    total: contracts.length,
    pending: contracts.filter((c) => c.status === "pending" || c.status === "reviewing").length,
    approved: contracts.filter((c) => c.status === "approved").length,
    rejected: contracts.filter((c) => c.status === "rejected").length,
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">合同审批工作流</h1>
          <p className="text-muted-foreground mt-1">智能化合同管理、审批流程和电子签名</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            导出报告
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                创建合同
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>创建新合同</DialogTitle>
                <DialogDescription>选择模板并填写合同基本信息</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>选择合同模板</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择模板" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} - {template.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>合同标题</Label>
                    <Input placeholder="输入合同标题" />
                  </div>
                  <div>
                    <Label>客户名称</Label>
                    <Input placeholder="输入客户名称" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>合同金额</Label>
                    <Input type="number" placeholder="0.00" />
                  </div>
                  <div>
                    <Label>币种</Label>
                    <Select defaultValue="CNY">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CNY">人民币 (CNY)</SelectItem>
                        <SelectItem value="USD">美元 (USD)</SelectItem>
                        <SelectItem value="EUR">欧元 (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>开始日期</Label>
                    <Input type="date" />
                  </div>
                  <div>
                    <Label>结束日期</Label>
                    <Input type="date" />
                  </div>
                </div>
                <div>
                  <Label>备注</Label>
                  <Textarea placeholder="合同备注信息" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button onClick={() => setShowCreateDialog(false)}>创建合同</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">合同总数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">本月新增 {Math.floor(stats.total * 0.2)} 份</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待审批</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">需要及时处理</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已批准</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">
              审批通过率 {Math.round((stats.approved / stats.total) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已拒绝</CardTitle>
            <X className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">需要重新提交</p>
          </CardContent>
        </Card>
      </div>

      {/* 主要功能选项卡 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="contracts">合同管理</TabsTrigger>
          <TabsTrigger value="templates">合同模板</TabsTrigger>
          <TabsTrigger value="workflows">审批流程</TabsTrigger>
          <TabsTrigger value="analytics">数据分析</TabsTrigger>
        </TabsList>

        {/* 合同管理 */}
        <TabsContent value="contracts" className="space-y-4">
          {/* 搜索和过滤 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="搜索合同标题、客户名称或合同号..."
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
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="pending">待审批</SelectItem>
                      <SelectItem value="reviewing">审核中</SelectItem>
                      <SelectItem value="approved">已批准</SelectItem>
                      <SelectItem value="rejected">已拒绝</SelectItem>
                      <SelectItem value="signed">已签署</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    筛选
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 合同列表 */}
          <Card>
            <CardHeader>
              <CardTitle>合同列表</CardTitle>
              <CardDescription>
                显示 {filteredContracts.length} 份合同，共 {contracts.length} 份
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>合同信息</TableHead>
                    <TableHead>客户</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>进度</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{contract.title}</div>
                          <div className="text-sm text-muted-foreground font-mono">{contract.contractNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{contract.customerName}</div>
                          <div className="text-sm text-muted-foreground">{contract.customerEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">¥{contract.amount.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress value={(contract.currentStep / contract.totalSteps) * 100} className="w-16 h-2" />
                          <span className="text-sm text-muted-foreground">
                            {contract.currentStep}/{contract.totalSteps}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {contract.createdAt.split(" ")[0]}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedContract(contract)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
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

        {/* 合同模板 */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">合同模板管理</h3>
              <p className="text-sm text-muted-foreground">创建和管理合同模板，提高合同创建效率</p>
            </div>
            <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  新建模板
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>创建合同模板</DialogTitle>
                  <DialogDescription>设计可重复使用的合同模板</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>模板名称</Label>
                      <Input placeholder="输入模板名称" />
                    </div>
                    <div>
                      <Label>模板分类</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="选择分类" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="service">服务类</SelectItem>
                          <SelectItem value="purchase">采购类</SelectItem>
                          <SelectItem value="lease">租赁类</SelectItem>
                          <SelectItem value="partnership">合作类</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>模板描述</Label>
                    <Textarea placeholder="描述模板的用途和适用场景" />
                  </div>
                  <div>
                    <Label>模板字段</Label>
                    <div className="space-y-2">
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input placeholder="字段名称" />
                        </div>
                        <div className="w-32">
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="类型" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">文本</SelectItem>
                              <SelectItem value="number">数字</SelectItem>
                              <SelectItem value="date">日期</SelectItem>
                              <SelectItem value="select">选择</SelectItem>
                              <SelectItem value="textarea">多行文本</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={() => setShowTemplateDialog(false)}>创建模板</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contractTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{template.name}</span>
                    <Badge variant="outline">{template.category}</Badge>
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground">字段数量：</span>
                      <span className="font-medium">{template.fields.length}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">创建时间：</span>
                      <span>{template.createdAt.split(" ")[0]}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                        <Eye className="w-4 h-4 mr-1" />
                        预览
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                        <Edit className="w-4 h-4 mr-1" />
                        编辑
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 审批流程 */}
        <TabsContent value="workflows" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">审批流程配置</h3>
              <p className="text-sm text-muted-foreground">设计和管理合同审批工作流程</p>
            </div>
            <Dialog open={showWorkflowDialog} onOpenChange={setShowWorkflowDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  新建流程
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>创建审批流程</DialogTitle>
                  <DialogDescription>设计合同审批的工作流程</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>流程名称</Label>
                      <Input placeholder="输入流程名称" />
                    </div>
                    <div>
                      <Label>适用范围</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="选择适用范围" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">所有合同</SelectItem>
                          <SelectItem value="amount">按金额区分</SelectItem>
                          <SelectItem value="type">按类型区分</SelectItem>
                          <SelectItem value="department">按部门区分</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>流程描述</Label>
                    <Textarea placeholder="描述流程的适用场景和规则" />
                  </div>
                  <div>
                    <Label>审批步骤</Label>
                    <div className="space-y-3">
                      <div className="flex gap-2 items-center p-3 border rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                          1
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">部门经理审批</div>
                          <div className="text-sm text-muted-foreground">初步审核合同内容</div>
                        </div>
                        <div className="text-sm text-muted-foreground">24小时</div>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2 items-center p-3 border rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                          2
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">法务审核</div>
                          <div className="text-sm text-muted-foreground">审核合同条款合法性</div>
                        </div>
                        <div className="text-sm text-muted-foreground">48小时</div>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button variant="outline" className="w-full bg-transparent">
                        <Plus className="w-4 h-4 mr-2" />
                        添加步骤
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowWorkflowDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={() => setShowWorkflowDialog(false)}>创建流程</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {workflowTemplates.map((workflow) => (
              <Card key={workflow.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{workflow.name}</span>
                    {workflow.isDefault && <Badge>默认流程</Badge>}
                  </CardTitle>
                  <CardDescription>{workflow.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      {workflow.steps.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className="text-xs text-center mt-1 max-w-20">{step.name}</div>
                            <div className="text-xs text-muted-foreground">{step.timeLimit}h</div>
                          </div>
                          {index < workflow.steps.length - 1 && (
                            <ChevronRight className="w-4 h-4 text-muted-foreground mx-2" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        查看详情
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-1" />
                        编辑流程
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-1" />
                        配置规则
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 数据分析 */}
        <TabsContent value="analytics" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">审批数据分析</h3>
            <p className="text-sm text-muted-foreground">分析合同审批效率和流程优化建议</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>审批效率统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">平均审批时长</span>
                    <span className="font-medium">2.3天</span>
                  </div>
                  <Progress value={76} className="h-2" />

                  <div className="flex justify-between items-center">
                    <span className="text-sm">按时完成率</span>
                    <span className="font-medium">87%</span>
                  </div>
                  <Progress value={87} className="h-2" />

                  <div className="flex justify-between items-center">
                    <span className="text-sm">一次通过率</span>
                    <span className="font-medium">72%</span>
                  </div>
                  <Progress value={72} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>审批瓶颈分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <span className="text-sm">法务审核</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-red-200 h-2 rounded"></div>
                      <span className="text-sm font-medium text-red-600">3.2天</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                    <span className="text-sm">财务审核</span>
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-yellow-200 h-2 rounded"></div>
                      <span className="text-sm font-medium text-yellow-600">1.8天</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="text-sm">部门审批</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 bg-green-200 h-2 rounded"></div>
                      <span className="text-sm font-medium text-green-600">0.8天</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>月度审批趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">28</div>
                  <div className="text-sm text-muted-foreground">1月审批</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">35</div>
                  <div className="text-sm text-muted-foreground">12月审批</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">42</div>
                  <div className="text-sm text-muted-foreground">11月审批</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">31</div>
                  <div className="text-sm text-muted-foreground">10月审批</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 合同详情对话框 */}
      {selectedContract && (
        <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedContract.title}</span>
                {getStatusBadge(selectedContract.status)}
              </DialogTitle>
              <DialogDescription>
                合同号：{selectedContract.contractNumber} | 创建人：{selectedContract.createdBy}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* 基本信息 */}
              <div>
                <h4 className="font-medium mb-3">基本信息</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">客户名称：</span>
                    <span className="font-medium">{selectedContract.customerName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">客户邮箱：</span>
                    <span>{selectedContract.customerEmail}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">合同金额：</span>
                    <span className="font-medium">¥{selectedContract.amount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">合同期限：</span>
                    <span>
                      {selectedContract.startDate} 至 {selectedContract.endDate}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 审批进度 */}
              <div>
                <h4 className="font-medium mb-3">审批进度</h4>
                <div className="space-y-3">
                  {selectedContract.approvalHistory.map((step, index) => (
                    <div key={step.id} className="flex items-start space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          step.status === "approved"
                            ? "bg-green-100 text-green-600"
                            : step.status === "rejected"
                              ? "bg-red-100 text-red-600"
                              : step.status === "pending"
                                ? "bg-yellow-100 text-yellow-600"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{step.stepName}</div>
                            <div className="text-sm text-muted-foreground">审批人：{step.assignedToName}</div>
                          </div>
                          <div className="text-right">
                            {getStepStatusBadge(step.status)}
                            <div className="text-xs text-muted-foreground mt-1">截止：{step.dueDate.split(" ")[0]}</div>
                          </div>
                        </div>
                        {step.comments && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                            <MessageSquare className="w-4 h-4 inline mr-1" />
                            {step.comments}
                          </div>
                        )}
                        {step.processedAt && (
                          <div className="text-xs text-muted-foreground mt-1">处理时间：{step.processedAt}</div>
                        )}

                        {/* 审批操作按钮 */}
                        {step.status === "pending" && (
                          <div className="flex gap-2 mt-3">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                  <Check className="w-4 h-4 mr-1" />
                                  通过
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>审批通过</DialogTitle>
                                  <DialogDescription>确认通过 "{step.stepName}" 审批步骤</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>审批意见</Label>
                                    <Textarea placeholder="请输入审批意见（可选）" />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline">取消</Button>
                                  <Button
                                    onClick={() => handleApproval(selectedContract.id, step.id, "approve", "审批通过")}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    确认通过
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <X className="w-4 h-4 mr-1" />
                                  拒绝
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>审批拒绝</DialogTitle>
                                  <DialogDescription>拒绝 "{step.stepName}" 审批步骤</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>拒绝原因 *</Label>
                                    <Textarea placeholder="请详细说明拒绝原因" required />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline">取消</Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() =>
                                      handleApproval(selectedContract.id, step.id, "reject", "存在问题需要修改")
                                    }
                                  >
                                    确认拒绝
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 附件和备注 */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">附件文件</h4>
                  <div className="space-y-2">
                    {selectedContract.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          <Paperclip className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{file}</span>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">备注信息</h4>
                  <div className="p-3 bg-gray-50 rounded text-sm">{selectedContract.notes || "暂无备注"}</div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
