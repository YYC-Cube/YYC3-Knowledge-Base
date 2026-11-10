"use client"

import { useState } from "react"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Users,
  Brain,
  Briefcase,
  Settings,
  Target,
  User,
  Database,
  Puzzle,
  Building,
  Zap,
  TrendingUp,
  Star,
  Search,
  Download,
  Eye,
  CheckSquare,
  Map,
  Package,
  PieChart,
  Lightbulb,
} from "lucide-react"

import { EnhancedCard } from "../components/design-system/enhanced-card-system"
import { AnimatedContainer } from "../components/design-system/animation-system"

// 功能状态枚举
type FunctionStatus = "completed" | "in-progress" | "planned" | "not-started"
type BusinessValue = "high" | "medium" | "low"
type Priority = "critical" | "high" | "medium" | "low"

// 功能项接口
interface FunctionItem {
  id: string
  name: string
  description: string
  status: FunctionStatus
  completionRate: number
  businessValue: BusinessValue
  priority: Priority
  targetUsers: string[]
  useCases: string[]
  components: string[]
  dependencies: string[]
  estimatedHours?: number
}

// 功能模块接口
interface FunctionModule {
  id: string
  name: string
  icon: any
  description: string
  overallCompletion: number
  totalFunctions: number
  completedFunctions: number
  businessImpact: BusinessValue
  functions: FunctionItem[]
}

export function FunctionalAssessmentReport() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<FunctionStatus | "all">("all")
  const [valueFilter, setValueFilter] = useState<BusinessValue | "all">("all")

  // 系统功能模块数据
  const functionModules: FunctionModule[] = [
    {
      id: "data-center",
      name: "数据中心",
      icon: Database,
      description: "实时数据监控、协作引擎和第三方集成的核心数据处理中心",
      overallCompletion: 85,
      totalFunctions: 6,
      completedFunctions: 5,
      businessImpact: "high",
      functions: [
        {
          id: "dynamic-data-center",
          name: "动态数据中心",
          description: "实时数据监控面板，支持多维度数据展示和交互式图表",
          status: "completed",
          completionRate: 95,
          businessValue: "high",
          priority: "critical",
          targetUsers: ["管理员", "数据分析师", "业务负责人"],
          useCases: ["实时业务监控", "KPI跟踪", "异常检测", "趋势分析"],
          components: ["DynamicDataCenter"],
          dependencies: ["数据API", "图表库", "WebSocket"],
          estimatedHours: 120,
        },
        {
          id: "collaboration-engine",
          name: "实时协作引擎",
          description: "支持多用户实时协作、文档共享和版本控制的协作平台",
          status: "completed",
          completionRate: 90,
          businessValue: "high",
          priority: "high",
          targetUsers: ["团队成员", "项目经理", "协作用户"],
          useCases: ["文档协作", "实时编辑", "版本管理", "评论讨论"],
          components: ["CollaborationEngine"],
          dependencies: ["WebSocket", "文档存储", "用户权限"],
          estimatedHours: 160,
        },
        {
          id: "wechat-integration",
          name: "微信集成",
          description: "微信生态集成，支持消息推送、小程序对接和支付功能",
          status: "completed",
          completionRate: 80,
          businessValue: "medium",
          priority: "medium",
          targetUsers: ["C端用户", "营销人员", "客服人员"],
          useCases: ["消息通知", "用户登录", "支付处理", "客户服务"],
          components: ["WeChatIntegration"],
          dependencies: ["微信API", "支付接口", "消息队列"],
          estimatedHours: 80,
        },
        {
          id: "data-sync",
          name: "数据同步服务",
          description: "多数据源同步、数据清洗和ETL处理服务",
          status: "in-progress",
          completionRate: 60,
          businessValue: "high",
          priority: "high",
          targetUsers: ["数据工程师", "系统管理员"],
          useCases: ["数据迁移", "定时同步", "数据清洗", "格式转换"],
          components: ["DataSyncService"],
          dependencies: ["数据库连接", "调度系统", "日志监控"],
          estimatedHours: 100,
        },
        {
          id: "backup-recovery",
          name: "备份恢复系统",
          description: "自动化数据备份、灾难恢复和数据完整性检查",
          status: "planned",
          completionRate: 20,
          businessValue: "high",
          priority: "high",
          targetUsers: ["系统管理员", "运维人员"],
          useCases: ["定时备份", "灾难恢复", "数据迁移", "完整性检查"],
          components: ["BackupSystem", "RecoveryManager"],
          dependencies: ["存储服务", "调度系统", "监控告警"],
          estimatedHours: 120,
        },
        {
          id: "data-governance",
          name: "数据治理平台",
          description: "数据质量管理、血缘分析和合规性检查平台",
          status: "not-started",
          completionRate: 0,
          businessValue: "medium",
          priority: "medium",
          targetUsers: ["数据治理专员", "合规人员"],
          useCases: ["数据质量监控", "血缘追踪", "合规检查", "元数据管理"],
          components: ["DataGovernance", "QualityMonitor"],
          dependencies: ["元数据服务", "规则引擎", "审计日志"],
          estimatedHours: 200,
        },
      ],
    },
    {
      id: "user-management",
      name: "用户管理",
      icon: Users,
      description: "完整的用户生命周期管理，包括注册、权限、配置和安全控制",
      overallCompletion: 92,
      totalFunctions: 8,
      completedFunctions: 7,
      businessImpact: "high",
      functions: [
        {
          id: "user-list",
          name: "用户列表管理",
          description: "用户信息展示、搜索筛选、批量操作和状态管理",
          status: "completed",
          completionRate: 95,
          businessValue: "high",
          priority: "critical",
          targetUsers: ["管理员", "HR人员", "团队负责人"],
          useCases: ["用户查询", "信息管理", "状态监控", "批量操作"],
          components: ["UserList"],
          dependencies: ["用户API", "权限验证", "搜索服务"],
          estimatedHours: 60,
        },
        {
          id: "user-details",
          name: "用户详情管理",
          description: "详细的用户信息展示、编辑和历史记录查看",
          status: "completed",
          completionRate: 90,
          businessValue: "high",
          priority: "high",
          targetUsers: ["管理员", "用户本人", "HR人员"],
          useCases: ["信息查看", "资料编辑", "历史追踪", "权限查看"],
          components: ["UserDetails"],
          dependencies: ["用户API", "文件上传", "历史记录"],
          estimatedHours: 80,
        },
        {
          id: "add-user",
          name: "新增用户",
          description: "用户注册、信息录入、权限分配和欢迎流程",
          status: "completed",
          completionRate: 88,
          businessValue: "high",
          priority: "high",
          targetUsers: ["管理员", "HR人员"],
          useCases: ["员工入职", "批量导入", "权限配置", "欢迎邮件"],
          components: ["AddUser"],
          dependencies: ["用户API", "邮件服务", "权限系统"],
          estimatedHours: 50,
        },
        {
          id: "role-permissions",
          name: "角色权限管理",
          description: "灵活的角色定义、权限分配和继承关系管理",
          status: "completed",
          completionRate: 92,
          businessValue: "high",
          priority: "critical",
          targetUsers: ["系统管理员", "安全管理员"],
          useCases: ["角色定义", "权限分配", "继承管理", "安全审计"],
          components: ["RolePermissions"],
          dependencies: ["权限引擎", "审计日志", "用户系统"],
          estimatedHours: 100,
        },
        {
          id: "user-configuration",
          name: "用户配置管理",
          description: "个性化设置、偏好配置和系统参数管理",
          status: "completed",
          completionRate: 85,
          businessValue: "medium",
          priority: "medium",
          targetUsers: ["所有用户", "管理员"],
          useCases: ["个性化设置", "系统偏好", "通知配置", "界面定制"],
          components: ["UserConfiguration"],
          dependencies: ["配置存储", "用户偏好", "通知系统"],
          estimatedHours: 40,
        },
        {
          id: "ban-management",
          name: "封禁管理",
          description: "用户封禁、解封、黑名单管理和违规处理",
          status: "completed",
          completionRate: 90,
          businessValue: "medium",
          priority: "medium",
          targetUsers: ["管理员", "安全管理员"],
          useCases: ["违规处理", "账户封禁", "黑名单管理", "申诉处理"],
          components: ["BanManagement"],
          dependencies: ["用户状态", "审计日志", "通知系统"],
          estimatedHours: 60,
        },
        {
          id: "user-analytics",
          name: "用户行为分析",
          description: "用户活跃度分析、行为轨迹和使用统计",
          status: "in-progress",
          completionRate: 70,
          businessValue: "high",
          priority: "medium",
          targetUsers: ["产品经理", "数据分析师"],
          useCases: ["活跃度分析", "行为追踪", "使用统计", "留存分析"],
          components: ["UserAnalytics"],
          dependencies: ["埋点系统", "数据分析", "可视化图表"],
          estimatedHours: 80,
        },
        {
          id: "sso-integration",
          name: "单点登录集成",
          description: "LDAP、OAuth、SAML等企业级单点登录集成",
          status: "planned",
          completionRate: 30,
          businessValue: "high",
          priority: "high",
          targetUsers: ["企业用户", "IT管理员"],
          useCases: ["企业登录", "身份联邦", "权限同步", "安全认证"],
          components: ["SSOIntegration", "AuthProvider"],
          dependencies: ["认证服务", "LDAP连接", "OAuth配置"],
          estimatedHours: 120,
        },
      ],
    },
    {
      id: "data-analysis",
      name: "数据分析",
      icon: BarChart3,
      description: "全方位的数据分析平台，提供实时监控、报表生成和智能洞察",
      overallCompletion: 88,
      totalFunctions: 7,
      completedFunctions: 6,
      businessImpact: "high",
      functions: [
        {
          id: "data-overview",
          name: "数据概览",
          description: "核心业务指标展示、趋势分析和KPI监控面板",
          status: "completed",
          completionRate: 90,
          businessValue: "high",
          priority: "critical",
          targetUsers: ["管理层", "业务分析师", "运营人员"],
          useCases: ["业务监控", "KPI跟踪", "趋势分析", "决策支持"],
          components: ["DataOverview"],
          dependencies: ["数据API", "图表库", "实时数据"],
          estimatedHours: 80,
        },
        {
          id: "user-analysis",
          name: "用户分析",
          description: "用户行为分析、留存分析和用户画像构建",
          status: "completed",
          completionRate: 85,
          businessValue: "high",
          priority: "high",
          targetUsers: ["产品经理", "运营人员", "市场人员"],
          useCases: ["用户画像", "行为分析", "留存分析", "转化分析"],
          components: ["UserAnalysis"],
          dependencies: ["用户数据", "行为追踪", "机器学习"],
          estimatedHours: 100,
        },
        {
          id: "business-analysis",
          name: "业务分析",
          description: "业务指标分析、收入分析和市场趋势预测",
          status: "completed",
          completionRate: 88,
          businessValue: "high",
          priority: "high",
          targetUsers: ["业务负责人", "财务人员", "战略规划"],
          useCases: ["收入分析", "成本分析", "市场预测", "竞争分析"],
          components: ["BusinessAnalysis"],
          dependencies: ["业务数据", "财务数据", "预测模型"],
          estimatedHours: 120,
        },
        {
          id: "report-center",
          name: "报表中心",
          description: "自定义报表生成、定时报告和数据导出功能",
          status: "completed",
          completionRate: 92,
          businessValue: "high",
          priority: "high",
          targetUsers: ["分析师", "管理层", "业务人员"],
          useCases: ["报表生成", "定时报告", "数据导出", "模板管理"],
          components: ["ReportCenter"],
          dependencies: ["报表引擎", "模板系统", "导出服务"],
          estimatedHours: 150,
        },
        {
          id: "real-time-monitoring",
          name: "实时监控",
          description: "系统性能监控、业务指标实时跟踪和告警机制",
          status: "completed",
          completionRate: 90,
          businessValue: "high",
          priority: "critical",
          targetUsers: ["运维人员", "系统管理员", "业务监控"],
          useCases: ["性能监控", "业务监控", "异常告警", "容量规划"],
          components: ["RealTimeMonitoring"],
          dependencies: ["监控系统", "告警服务", "时序数据库"],
          estimatedHours: 100,
        },
        {
          id: "data-alert",
          name: "数据预警",
          description: "智能异常检测、多维度告警规则和通知管理",
          status: "completed",
          completionRate: 95,
          businessValue: "high",
          priority: "high",
          targetUsers: ["运维人员", "业务人员", "管理层"],
          useCases: ["异常检测", "阈值告警", "趋势预警", "业务告警"],
          components: ["DataAlert"],
          dependencies: ["规则引擎", "机器学习", "通知系统"],
          estimatedHours: 80,
        },
        {
          id: "advanced-analytics",
          name: "高级分析",
          description: "机器学习驱动的预测分析、异常检测和智能推荐",
          status: "in-progress",
          completionRate: 60,
          businessValue: "high",
          priority: "medium",
          targetUsers: ["数据科学家", "高级分析师"],
          useCases: ["预测分析", "异常检测", "聚类分析", "关联分析"],
          components: ["AdvancedAnalytics", "MLPipeline"],
          dependencies: ["机器学习平台", "特征工程", "模型管理"],
          estimatedHours: 200,
        },
      ],
    },
    {
      id: "ai-engine",
      name: "智能引擎",
      icon: Brain,
      description: "AI驱动的智能分析、机器学习和知识管理平台",
      overallCompletion: 75,
      totalFunctions: 8,
      completedFunctions: 5,
      businessImpact: "high",
      functions: [
        {
          id: "ai-dashboard",
          name: "AI智能面板",
          description: "AI模型管理、训练监控和智能分析结果展示",
          status: "completed",
          completionRate: 90,
          businessValue: "high",
          priority: "high",
          targetUsers: ["AI工程师", "数据科学家", "业务分析师"],
          useCases: ["模型管理", "训练监控", "预测分析", "智能推荐"],
          components: ["AIDashboard"],
          dependencies: ["ML平台", "模型仓库", "计算资源"],
          estimatedHours: 120,
        },
        {
          id: "machine-learning",
          name: "机器学习平台",
          description: "模型训练、评估、部署和版本管理的完整ML工作流",
          status: "completed",
          completionRate: 85,
          businessValue: "high",
          priority: "high",
          targetUsers: ["数据科学家", "ML工程师"],
          useCases: ["模型训练", "超参调优", "模型评估", "A/B测试"],
          components: ["MachineLearning"],
          dependencies: ["计算集群", "数据管道", "实验跟踪"],
          estimatedHours: 200,
        },
        {
          id: "data-mining",
          name: "数据挖掘",
          description: "大数据挖掘、模式发现和知识提取工具",
          status: "completed",
          completionRate: 80,
          businessValue: "medium",
          priority: "medium",
          targetUsers: ["数据分析师", "业务分析师"],
          useCases: ["模式发现", "关联分析", "聚类分析", "异常检测"],
          components: ["DataMining"],
          dependencies: ["大数据平台", "算法库", "可视化工具"],
          estimatedHours: 150,
        },
        {
          id: "storage-management",
          name: "存储管理",
          description: "智能数据存储、生命周期管理和成本优化",
          status: "completed",
          completionRate: 88,
          businessValue: "medium",
          priority: "medium",
          targetUsers: ["系统管理员", "数据工程师"],
          useCases: ["存储监控", "生命周期管理", "成本优化", "容量规划"],
          components: ["StorageManagement"],
          dependencies: ["存储系统", "监控服务", "策略引擎"],
          estimatedHours: 80,
        },
        {
          id: "development-environment",
          name: "开发环境",
          description: "AI开发工具链、Jupyter集成和协作开发环境",
          status: "completed",
          completionRate: 75,
          businessValue: "medium",
          priority: "medium",
          targetUsers: ["AI开发者", "数据科学家"],
          useCases: ["代码开发", "实验管理", "协作开发", "版本控制"],
          components: ["DevelopmentEnvironment"],
          dependencies: ["容器平台", "代码仓库", "计算资源"],
          estimatedHours: 100,
        },
        {
          id: "knowledge-base",
          name: "知识智库",
          description: "企业知识管理、智能问答和知识图谱构建",
          status: "in-progress",
          completionRate: 65,
          businessValue: "high",
          priority: "medium",
          targetUsers: ["知识工作者", "客服人员", "培训人员"],
          useCases: ["知识管理", "智能问答", "文档检索", "专家系统"],
          components: ["KnowledgeBase"],
          dependencies: ["NLP服务", "搜索引擎", "知识图谱"],
          estimatedHours: 180,
        },
        {
          id: "nlp-service",
          name: "自然语言处理",
          description: "文本分析、情感分析、实体识别和语义理解",
          status: "in-progress",
          completionRate: 50,
          businessValue: "high",
          priority: "medium",
          targetUsers: ["内容分析师", "客服人员"],
          useCases: ["文本分析", "情感分析", "实体识别", "意图理解"],
          components: ["NLPService", "TextAnalyzer"],
          dependencies: ["NLP模型", "语料库", "标注工具"],
          estimatedHours: 160,
        },
        {
          id: "computer-vision",
          name: "计算机视觉",
          description: "图像识别、视频分析和OCR文字识别服务",
          status: "planned",
          completionRate: 20,
          businessValue: "medium",
          priority: "low",
          targetUsers: ["图像分析师", "质检人员"],
          useCases: ["图像识别", "质量检测", "OCR识别", "视频分析"],
          components: ["ComputerVision", "ImageProcessor"],
          dependencies: ["CV模型", "GPU资源", "图像存储"],
          estimatedHours: 200,
        },
      ],
    },
    {
      id: "business-functions",
      name: "商务功能",
      icon: Briefcase,
      description: "完整的商务管理套件，涵盖财务、订单、客户和供应链管理",
      overallCompletion: 82,
      totalFunctions: 8,
      completedFunctions: 6,
      businessImpact: "high",
      functions: [
        {
          id: "business-management",
          name: "商务管理",
          description: "业务概览、KPI管理和商务决策支持系统",
          status: "completed",
          completionRate: 90,
          businessValue: "high",
          priority: "critical",
          targetUsers: ["业务负责人", "管理层", "销售经理"],
          useCases: ["业务监控", "KPI管理", "销售分析", "决策支持"],
          components: ["BusinessManagement"],
          dependencies: ["业务数据", "分析引擎", "报表系统"],
          estimatedHours: 100,
        },
        {
          id: "finance-management",
          name: "财务管理",
          description: "财务报表、成本控制、预算管理和财务分析",
          status: "completed",
          completionRate: 85,
          businessValue: "high",
          priority: "critical",
          targetUsers: ["财务人员", "会计师", "CFO"],
          useCases: ["财务报表", "成本分析", "预算管理", "税务处理"],
          components: ["FinanceManagement"],
          dependencies: ["财务数据", "会计准则", "税务系统"],
          estimatedHours: 150,
        },
        {
          id: "order-management",
          name: "订单管理",
          description: "订单处理、库存管理、发货跟踪和售后服务",
          status: "completed",
          completionRate: 88,
          businessValue: "high",
          priority: "high",
          targetUsers: ["销售人员", "客服人员", "仓库管理员"],
          useCases: ["订单处理", "库存管理", "发货跟踪", "退换货"],
          components: ["OrderManagement"],
          dependencies: ["库存系统", "物流接口", "支付系统"],
          estimatedHours: 120,
        },
        {
          id: "erp-system",
          name: "ERP系统",
          description: "企业资源规划、流程管理和业务集成平台",
          status: "completed",
          completionRate: 80,
          businessValue: "high",
          priority: "high",
          targetUsers: ["企业管理者", "部门负责人", "业务人员"],
          useCases: ["资源规划", "流程管理", "部门协作", "数据集成"],
          components: ["ERPSystem"],
          dependencies: ["业务流程", "数据集成", "权限系统"],
          estimatedHours: 200,
        },
        {
          id: "crm-customer",
          name: "客户关系管理",
          description: "客户信息管理、销售跟进、客户服务和关系维护",
          status: "completed",
          completionRate: 85,
          businessValue: "high",
          priority: "high",
          targetUsers: ["销售人员", "客服人员", "市场人员"],
          useCases: ["客户管理", "销售跟进", "客户服务", "营销活动"],
          components: ["CRMCustomer"],
          dependencies: ["客户数据", "沟通记录", "营销工具"],
          estimatedHours: 140,
        },
        {
          id: "supply-chain",
          name: "供应链管理",
          description: "供应商管理、采购流程、库存优化和物流协调",
          status: "completed",
          completionRate: 75,
          businessValue: "high",
          priority: "medium",
          targetUsers: ["采购人员", "供应链经理", "仓库管理员"],
          useCases: ["供应商管理", "采购管理", "库存优化", "物流协调"],
          components: ["SupplyChain"],
          dependencies: ["供应商数据", "采购系统", "物流接口"],
          estimatedHours: 160,
        },
        {
          id: "contract-management",
          name: "合同管理",
          description: "合同起草、审批流程、执行跟踪和到期提醒",
          status: "in-progress",
          completionRate: 60,
          businessValue: "high",
          priority: "medium",
          targetUsers: ["法务人员", "商务人员", "管理层"],
          useCases: ["合同起草", "审批流程", "执行监控", "风险管理"],
          components: ["ContractManagement"],
          dependencies: ["工作流引擎", "电子签名", "文档管理"],
          estimatedHours: 120,
        },
        {
          id: "invoice-system",
          name: "发票系统",
          description: "发票生成、税务计算、开票管理和财务对账",
          status: "planned",
          completionRate: 30,
          businessValue: "high",
          priority: "high",
          targetUsers: ["财务人员", "销售人员", "客户"],
          useCases: ["发票开具", "税务计算", "对账管理", "电子发票"],
          components: ["InvoiceSystem", "TaxCalculator"],
          dependencies: ["税务接口", "财务系统", "客户数据"],
          estimatedHours: 100,
        },
      ],
    },
    {
      id: "system-settings",
      name: "系统设置",
      icon: Settings,
      description: "全面的系统配置管理，包括安全、权限、通知和外观设置",
      overallCompletion: 90,
      totalFunctions: 6,
      completedFunctions: 6,
      businessImpact: "medium",
      functions: [
        {
          id: "general-settings",
          name: "常规设置",
          description: "系统基础配置、区域设置和运行参数管理",
          status: "completed",
          completionRate: 95,
          businessValue: "medium",
          priority: "high",
          targetUsers: ["系统管理员", "IT人员"],
          useCases: ["系统配置", "区域设置", "参数调优", "维护模式"],
          components: ["GeneralSettings"],
          dependencies: ["配置存储", "系统服务", "监控系统"],
          estimatedHours: 60,
        },
        {
          id: "security-settings",
          name: "安全设置",
          description: "安全策略配置、访问控制和安全审计管理",
          status: "completed",
          completionRate: 92,
          businessValue: "high",
          priority: "critical",
          targetUsers: ["安全管理员", "系统管理员"],
          useCases: ["安全策略", "访问控制", "审计日志", "威胁检测"],
          components: ["SecuritySettings"],
          dependencies: ["安全框架", "审计系统", "认证服务"],
          estimatedHours: 80,
        },
        {
          id: "permission-management",
          name: "权限管理",
          description: "细粒度权限控制、角色管理和访问策略配置",
          status: "completed",
          completionRate: 90,
          businessValue: "high",
          priority: "critical",
          targetUsers: ["权限管理员", "系统管理员"],
          useCases: ["权限分配", "角色管理", "策略配置", "权限审计"],
          components: ["PermissionManagement"],
          dependencies: ["权限引擎", "用户系统", "审计日志"],
          estimatedHours: 100,
        },
        {
          id: "privacy-settings",
          name: "隐私设置",
          description: "数据隐私保护、GDPR合规和用户隐私控制",
          status: "completed",
          completionRate: 88,
          businessValue: "high",
          priority: "high",
          targetUsers: ["隐私官", "法务人员", "用户"],
          useCases: ["隐私保护", "数据脱敏", "合规管理", "用户同意"],
          components: ["PrivacySettings"],
          dependencies: ["隐私框架", "数据分类", "合规检查"],
          estimatedHours: 70,
        },
        {
          id: "notification-settings",
          name: "通知设置",
          description: "消息通知配置、推送管理和通知模板设置",
          status: "completed",
          completionRate: 85,
          businessValue: "medium",
          priority: "medium",
          targetUsers: ["所有用户", "管理员"],
          useCases: ["通知配置", "消息推送", "模板管理", "频率控制"],
          components: ["NotificationSettings"],
          dependencies: ["消息队列", "推送服务", "模板引擎"],
          estimatedHours: 50,
        },
        {
          id: "appearance-settings",
          name: "外观设置",
          description: "主题配置、界面定制和用户体验个性化设置",
          status: "completed",
          completionRate: 90,
          businessValue: "low",
          priority: "low",
          targetUsers: ["所有用户", "UI设计师"],
          useCases: ["主题切换", "界面定制", "个性化设置", "品牌定制"],
          components: ["AppearanceSettings"],
          dependencies: ["主题系统", "CSS变量", "用户偏好"],
          estimatedHours: 40,
        },
      ],
    },
    {
      id: "project-management",
      name: "项目管理",
      icon: Target,
      description: "敏捷项目管理平台，支持任务跟踪、团队协作和DevOps集成",
      overallCompletion: 85,
      totalFunctions: 6,
      completedFunctions: 5,
      businessImpact: "high",
      functions: [
        {
          id: "project-overview",
          name: "项目概览",
          description: "项目状态监控、进度跟踪和资源分配管理",
          status: "completed",
          completionRate: 90,
          businessValue: "high",
          priority: "high",
          targetUsers: ["项目经理", "团队成员", "管理层"],
          useCases: ["项目监控", "进度跟踪", "资源管理", "风险识别"],
          components: ["ProjectOverview"],
          dependencies: ["项目数据", "时间跟踪", "资源管理"],
          estimatedHours: 80,
        },
        {
          id: "task-management",
          name: "任务管理",
          description: "任务创建、分配、跟踪和完成状态管理",
          status: "completed",
          completionRate: 88,
          businessValue: "high",
          priority: "high",
          targetUsers: ["项目经理", "开发人员", "团队成员"],
          useCases: ["任务分配", "进度跟踪", "优先级管理", "依赖关系"],
          components: ["TaskManagement"],
          dependencies: ["任务引擎", "通知系统", "时间跟踪"],
          estimatedHours: 100,
        },
        {
          id: "development-execution",
          name: "开发执行",
          description: "基于分析报告的迭代开发计划执行与任务管理",
          status: "completed",
          completionRate: 85,
          businessValue: "high",
          priority: "high",
          targetUsers: ["开发团队", "技术负责人", "项目经理"],
          useCases: ["迭代规划", "开发跟踪", "代码审查", "质量管控"],
          components: ["DevelopmentExecution"],
          dependencies: ["版本控制", "代码审查", "测试系统"],
          estimatedHours: 120,
        },
        {
          id: "agile-workflow",
          name: "敏捷工作流",
          description: "Scrum/Kanban工作流、Sprint规划与团队协作",
          status: "completed",
          completionRate: 90,
          businessValue: "high",
          priority: "high",
          targetUsers: ["Scrum Master", "产品经理", "开发团队"],
          useCases: ["Sprint规划", "看板管理", "燃尽图", "回顾会议"],
          components: ["AgileWorkflow"],
          dependencies: ["工作流引擎", "时间跟踪", "团队协作"],
          estimatedHours: 100,
        },
        {
          id: "cicd-pipeline",
          name: "CI/CD流水线",
          description: "自动化构建、测试、部署流程管理与监控",
          status: "completed",
          completionRate: 80,
          businessValue: "high",
          priority: "medium",
          targetUsers: ["DevOps工程师", "开发人员", "运维人员"],
          useCases: ["自动构建", "自动测试", "自动部署", "流水线监控"],
          components: ["CICDDashboard"],
          dependencies: ["CI/CD工具", "容器平台", "监控系统"],
          estimatedHours: 150,
        },
        {
          id: "resource-planning",
          name: "资源规划",
          description: "人力资源规划、技能匹配和工作负载平衡",
          status: "in-progress",
          completionRate: 60,
          businessValue: "medium",
          priority: "medium",
          targetUsers: ["项目经理", "资源经理", "HR"],
          useCases: ["资源分配", "技能匹配", "负载均衡", "容量规划"],
          components: ["ResourcePlanning"],
          dependencies: ["人员数据", "技能库", "项目数据"],
          estimatedHours: 80,
        },
      ],
    },
    {
      id: "personal-profile",
      name: "个人资料",
      icon: User,
      description: "完整的个人信息管理，包括基本信息、联系方式和安全设置",
      overallCompletion: 92,
      totalFunctions: 6,
      completedFunctions: 6,
      businessImpact: "medium",
      functions: [
        {
          id: "basic-info",
          name: "基本信息",
          description: "个人基础信息展示、编辑和社交链接管理",
          status: "completed",
          completionRate: 95,
          businessValue: "medium",
          priority: "medium",
          targetUsers: ["所有用户"],
          useCases: ["信息展示", "资料编辑", "社交链接", "技能标签"],
          components: ["BasicInfo"],
          dependencies: ["用户系统", "文件上传", "社交集成"],
          estimatedHours: 60,
        },
        {
          id: "edit-profile",
          name: "编辑资料",
          description: "便捷的个人信息编辑和批量更新功能",
          status: "completed",
          completionRate: 90,
          businessValue: "medium",
          priority: "medium",
          targetUsers: ["所有用户"],
          useCases: ["信息编辑", "批量更新", "表单验证", "变更历史"],
          components: ["EditProfile"],
          dependencies: ["表单验证", "数据存储", "变更日志"],
          estimatedHours: 40,
        },
        {
          id: "avatar-settings",
          name: "头像设置",
          description: "头像上传、裁剪、预览和个性化设置",
          status: "completed",
          completionRate: 88,
          businessValue: "low",
          priority: "low",
          targetUsers: ["所有用户"],
          useCases: ["头像上传", "图片裁剪", "预览效果", "默认头像"],
          components: ["AvatarSettings"],
          dependencies: ["文件上传", "图片处理", "CDN存储"],
          estimatedHours: 30,
        },
        {
          id: "contact-info",
          name: "联系方式",
          description: "联系信息管理、隐私控制和验证功能",
          status: "completed",
          completionRate: 92,
          businessValue: "medium",
          priority: "medium",
          targetUsers: ["所有用户"],
          useCases: ["联系管理", "隐私控制", "信息验证", "紧急联系"],
          components: ["ContactInfo"],
          dependencies: ["验证服务", "隐私设置", "通知系统"],
          estimatedHours: 50,
        },
        {
          id: "address-info",
          name: "地址信息",
          description: "地址管理、地图集成和配送地址设置",
          status: "completed",
          completionRate: 85,
          businessValue: "medium",
          priority: "low",
          targetUsers: ["所有用户"],
          useCases: ["地址管理", "地图定位", "配送设置", "地址验证"],
          components: ["AddressInfo"],
          dependencies: ["地图服务", "地址验证", "地理编码"],
          estimatedHours: 40,
        },
        {
          id: "account-security",
          name: "账户安全",
          description: "密码管理、双因素认证和安全设置",
          status: "completed",
          completionRate: 95,
          businessValue: "high",
          priority: "high",
          targetUsers: ["所有用户"],
          useCases: ["密码管理", "双因素认证", "登录历史", "安全提醒"],
          components: ["AccountSecurity"],
          dependencies: ["认证系统", "安全框架", "通知服务"],
          estimatedHours: 70,
        },
      ],
    },
    {
      id: "plugin-system",
      name: "插件系统",
      icon: Puzzle,
      description: "可扩展的插件生态系统，支持第三方开发和功能扩展",
      overallCompletion: 78,
      totalFunctions: 4,
      completedFunctions: 3,
      businessImpact: "medium",
      functions: [
        {
          id: "plugin-manager",
          name: "插件管理",
          description: "插件安装、卸载、配置和生命周期管理",
          status: "completed",
          completionRate: 85,
          businessValue: "medium",
          priority: "medium",
          targetUsers: ["系统管理员", "开发者"],
          useCases: ["插件安装", "配置管理", "版本控制", "依赖管理"],
          components: ["PluginManager"],
          dependencies: ["插件引擎", "包管理", "安全检查"],
          estimatedHours: 100,
        },
        {
          id: "plugin-store",
          name: "插件商店",
          description: "插件发现、评价、下载和更新平台",
          status: "completed",
          completionRate: 80,
          businessValue: "medium",
          priority: "medium",
          targetUsers: ["最终用户", "插件开发者"],
          useCases: ["插件发现", "评价系统", "下载安装", "更新通知"],
          components: ["PluginStore"],
          dependencies: ["商店后端", "支付系统", "评价系统"],
          estimatedHours: 120,
        },
        {
          id: "plugin-developer",
          name: "开发者中心",
          description: "插件开发工具、API文档和发布管理",
          status: "completed",
          completionRate: 75,
          businessValue: "medium",
          priority: "low",
          targetUsers: ["插件开发者", "第三方开发者"],
          useCases: ["开发工具", "API文档", "测试环境", "发布管理"],
          components: ["PluginDeveloper"],
          dependencies: ["开发工具链", "API网关", "文档系统"],
          estimatedHours: 150,
        },
        {
          id: "plugin-security",
          name: "插件安全",
          description: "插件安全扫描、权限控制和沙箱隔离",
          status: "in-progress",
          completionRate: 50,
          businessValue: "high",
          priority: "high",
          targetUsers: ["安全管理员", "系统管理员"],
          useCases: ["安全扫描", "权限控制", "沙箱隔离", "威胁检测"],
          components: ["PluginSecurity", "SecurityScanner"],
          dependencies: ["安全框架", "沙箱技术", "威胁情报"],
          estimatedHours: 80,
        },
      ],
    },
    {
      id: "multi-tenant",
      name: "多租户管理",
      icon: Building,
      description: "企业级多租户架构，支持租户隔离和资源管理",
      overallCompletion: 70,
      totalFunctions: 3,
      completedFunctions: 2,
      businessImpact: "high",
      functions: [
        {
          id: "tenant-management",
          name: "租户管理",
          description: "租户创建、配置、监控和生命周期管理",
          status: "completed",
          completionRate: 85,
          businessValue: "high",
          priority: "high",
          targetUsers: ["平台管理员", "租户管理员"],
          useCases: ["租户创建", "配置管理", "资源分配", "监控告警"],
          components: ["TenantManagement"],
          dependencies: ["多租户框架", "资源隔离", "监控系统"],
          estimatedHours: 120,
        },
        {
          id: "tenant-isolation",
          name: "租户隔离",
          description: "数据隔离、网络隔离和安全边界管理",
          status: "in-progress",
          completionRate: 60,
          businessValue: "high",
          priority: "critical",
          targetUsers: ["安全管理员", "架构师"],
          useCases: ["数据隔离", "网络隔离", "安全边界", "合规检查"],
          components: ["TenantIsolation", "SecurityBoundary"],
          dependencies: ["隔离技术", "安全框架", "网络策略"],
          estimatedHours: 100,
        },
        {
          id: "resource-quota",
          name: "资源配额",
          description: "租户资源配额管理、使用监控和弹性扩缩容",
          status: "planned",
          completionRate: 30,
          businessValue: "medium",
          priority: "medium",
          targetUsers: ["平台管理员", "运维人员"],
          useCases: ["配额管理", "使用监控", "弹性扩容", "成本控制"],
          components: ["ResourceQuota", "UsageMonitor"],
          dependencies: ["资源管理", "监控系统", "计费系统"],
          estimatedHours: 80,
        },
      ],
    },
    {
      id: "integration-platform",
      name: "集成平台",
      icon: Zap,
      description: "企业级集成平台，支持API管理、数据同步和第三方服务集成",
      overallCompletion: 75,
      totalFunctions: 5,
      completedFunctions: 3,
      businessImpact: "high",
      functions: [
        {
          id: "integration-hub",
          name: "集成中心",
          description: "第三方服务集成、连接器管理和数据映射",
          status: "completed",
          completionRate: 80,
          businessValue: "high",
          priority: "high",
          targetUsers: ["集成工程师", "系统管理员"],
          useCases: ["服务集成", "数据同步", "连接器管理", "映射配置"],
          components: ["IntegrationHub"],
          dependencies: ["集成框架", "连接器库", "数据映射"],
          estimatedHours: 150,
        },
        {
          id: "api-gateway",
          name: "API网关",
          description: "API管理、访问控制、限流和监控",
          status: "completed",
          completionRate: 85,
          businessValue: "high",
          priority: "high",
          targetUsers: ["API开发者", "系统管理员"],
          useCases: ["API管理", "访问控制", "流量控制", "API监控"],
          components: ["APIGateway"],
          dependencies: ["网关服务", "认证系统", "监控平台"],
          estimatedHours: 120,
        },
        {
          id: "webhook-manager",
          name: "Webhook管理",
          description: "Webhook配置、事件管理和消息投递监控",
          status: "completed",
          completionRate: 75,
          businessValue: "medium",
          priority: "medium",
          targetUsers: ["开发者", "集成工程师"],
          useCases: ["事件订阅", "消息投递", "重试机制", "投递监控"],
          components: ["WebhookManager"],
          dependencies: ["消息队列", "重试机制", "监控系统"],
          estimatedHours: 80,
        },
        {
          id: "data-sync",
          name: "数据同步",
          description: "实时数据同步、ETL处理和数据一致性保证",
          status: "in-progress",
          completionRate: 60,
          businessValue: "high",
          priority: "high",
          targetUsers: ["数据工程师", "系统管理员"],
          useCases: ["实时同步", "批量同步", "数据清洗", "一致性检查"],
          components: ["DataSync", "ETLProcessor"],
          dependencies: ["数据管道", "消息队列", "数据库"],
          estimatedHours: 100,
        },
        {
          id: "message-queue",
          name: "消息队列",
          description: "异步消息处理、事件驱动架构和可靠性保证",
          status: "planned",
          completionRate: 40,
          businessValue: "high",
          priority: "medium",
          targetUsers: ["架构师", "开发者"],
          useCases: ["异步处理", "事件驱动", "解耦架构", "可靠投递"],
          components: ["MessageQueue", "EventBus"],
          dependencies: ["消息中间件", "持久化存储", "监控系统"],
          estimatedHours: 90,
        },
      ],
    },
  ]

  // 计算总体统计
  const totalFunctions = functionModules.reduce((sum, module) => sum + module.totalFunctions, 0)
  const completedFunctions = functionModules.reduce((sum, module) => sum + module.completedFunctions, 0)
  const overallCompletion = Math.round((completedFunctions / totalFunctions) * 100)

  // 按状态统计
  const allFunctions = functionModules.flatMap((module) => module.functions)
  const statusStats = {
    completed: allFunctions.filter((f) => f.status === "completed").length,
    "in-progress": allFunctions.filter((f) => f.status === "in-progress").length,
    planned: allFunctions.filter((f) => f.status === "planned").length,
    "not-started": allFunctions.filter((f) => f.status === "not-started").length,
  }

  // 按业务价值统计
  const valueStats = {
    high: allFunctions.filter((f) => f.businessValue === "high").length,
    medium: allFunctions.filter((f) => f.businessValue === "medium").length,
    low: allFunctions.filter((f) => f.businessValue === "low").length,
  }

  // 过滤功能
  const filteredFunctions = allFunctions.filter((func) => {
    const matchesSearch =
      func.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      func.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || func.status === statusFilter
    const matchesValue = valueFilter === "all" || func.businessValue === valueFilter
    return matchesSearch && matchesStatus && matchesValue
  })

  const getStatusBadge = (status: FunctionStatus) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">已完成</Badge>
      case "in-progress":
        return <Badge className="bg-blue-100 text-blue-800">进行中</Badge>
      case "planned":
        return <Badge className="bg-yellow-100 text-yellow-800">已规划</Badge>
      case "not-started":
        return <Badge variant="secondary">未开始</Badge>
    }
  }

  const getValueBadge = (value: BusinessValue) => {
    switch (value) {
      case "high":
        return <Badge className="bg-red-100 text-red-800">高价值</Badge>
      case "medium":
        return <Badge className="bg-orange-100 text-orange-800">中价值</Badge>
      case "low":
        return <Badge className="bg-gray-100 text-gray-800">低价值</Badge>
    }
  }

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case "critical":
        return <Badge className="bg-red-600 text-white">关键</Badge>
      case "high":
        return <Badge className="bg-orange-600 text-white">高</Badge>
      case "medium":
        return <Badge className="bg-blue-600 text-white">中</Badge>
      case "low":
        return <Badge className="bg-gray-600 text-white">低</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* 报告头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            YanYu Cloud³ 功能评估报告
          </h1>
          <p className="text-secondary-600 mt-2">全面分析智能商务管理系统的功能完整度、实用性和业务价值</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-transparent">
            <Download className="w-4 h-4 mr-2" />
            导出报告
          </Button>
          <Button>
            <Eye className="w-4 h-4 mr-2" />
            查看详情
          </Button>
        </div>
      </div>

      {/* 总体概览 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnimatedContainer animation="slideUp" delay={0}>
          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">功能模块总数</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{functionModules.length}</div>
              <p className="text-xs text-muted-foreground">涵盖核心业务场景</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={100}>
          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">功能项总数</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFunctions}</div>
              <p className="text-xs text-muted-foreground">已完成 {completedFunctions} 项</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={200}>
          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">整体完成度</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{overallCompletion}%</div>
              <Progress value={overallCompletion} className="h-2 mt-2" />
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={300}>
          <EnhancedCard variant="modern" glowEffect>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">高价值功能</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{valueStats.high}</div>
              <p className="text-xs text-muted-foreground">核心业务功能</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>
      </div>

      {/* 状态分布统计 */}
      <AnimatedContainer animation="fadeIn" delay={400}>
        <EnhancedCard variant="traditional" size="lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              功能开发状态分布
            </CardTitle>
            <CardDescription>按开发状态统计功能项分布情况</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{statusStats.completed}</div>
                <div className="text-sm text-green-700">已完成</div>
                <div className="text-xs text-green-600 mt-1">
                  {Math.round((statusStats.completed / totalFunctions) * 100)}%
                </div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{statusStats["in-progress"]}</div>
                <div className="text-sm text-blue-700">进行中</div>
                <div className="text-xs text-blue-600 mt-1">
                  {Math.round((statusStats["in-progress"] / totalFunctions) * 100)}%
                </div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{statusStats.planned}</div>
                <div className="text-sm text-yellow-700">已规划</div>
                <div className="text-xs text-yellow-600 mt-1">
                  {Math.round((statusStats.planned / totalFunctions) * 100)}%
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{statusStats["not-started"]}</div>
                <div className="text-sm text-gray-700">未开始</div>
                <div className="text-xs text-gray-600 mt-1">
                  {Math.round((statusStats["not-started"] / totalFunctions) * 100)}%
                </div>
              </div>
            </div>
          </CardContent>
        </EnhancedCard>
      </AnimatedContainer>

      {/* 详细分析选项卡 */}
      <Tabs defaultValue="modules" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="modules">模块概览</TabsTrigger>
          <TabsTrigger value="functions">功能详情</TabsTrigger>
          <TabsTrigger value="gaps">功能缺口</TabsTrigger>
          <TabsTrigger value="recommendations">优化建议</TabsTrigger>
        </TabsList>

        {/* 模块概览 */}
        <TabsContent value="modules" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {functionModules.map((module, index) => (
              <AnimatedContainer key={module.id} animation="slideUp" delay={index * 100}>
                <EnhancedCard variant="modern" glowEffect>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <module.icon className="w-5 h-5 text-primary-600" />
                      <span>{module.name}</span>
                    </CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">完成度</span>
                        <span className="font-medium">{module.overallCompletion}%</span>
                      </div>
                      <Progress value={module.overallCompletion} className="h-2" />

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">总功能数</div>
                          <div className="font-medium">{module.totalFunctions}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">已完成</div>
                          <div className="font-medium text-green-600">{module.completedFunctions}</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm">业务影响</span>
                        {getValueBadge(module.businessImpact)}
                      </div>
                    </div>
                  </CardContent>
                </EnhancedCard>
              </AnimatedContainer>
            ))}
          </div>
        </TabsContent>

        {/* 功能详情 */}
        <TabsContent value="functions" className="space-y-4">
          {/* 搜索和过滤 */}
          <EnhancedCard variant="modern">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="搜索功能名称或描述..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as FunctionStatus | "all")}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">所有状态</option>
                    <option value="completed">已完成</option>
                    <option value="in-progress">进行中</option>
                    <option value="planned">已规划</option>
                    <option value="not-started">未开始</option>
                  </select>
                  <select
                    value={valueFilter}
                    onChange={(e) => setValueFilter(e.target.value as BusinessValue | "all")}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">所有价值</option>
                    <option value="high">高价值</option>
                    <option value="medium">中价值</option>
                    <option value="low">低价值</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </EnhancedCard>

          {/* 功能列表 */}
          <EnhancedCard variant="traditional" size="lg">
            <CardHeader>
              <CardTitle>功能详细列表</CardTitle>
              <CardDescription>
                显示 {filteredFunctions.length} 个功能项，共 {totalFunctions} 个
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>功能名称</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>完成度</TableHead>
                    <TableHead>业务价值</TableHead>
                    <TableHead>优先级</TableHead>
                    <TableHead>预估工时</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFunctions.map((func) => (
                    <TableRow key={func.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{func.name}</div>
                          <div className="text-sm text-muted-foreground">{func.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(func.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress value={func.completionRate} className="w-16 h-2" />
                          <span className="text-sm">{func.completionRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{getValueBadge(func.businessValue)}</TableCell>
                      <TableCell>{getPriorityBadge(func.priority)}</TableCell>
                      <TableCell>
                        <span className="text-sm">{func.estimatedHours || 0}h</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </EnhancedCard>
        </TabsContent>

        {/* 功能缺口分析 */}
        <TabsContent value="gaps" className="space-y-4">
          <EnhancedCard variant="traditional" size="lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
                关键功能缺口分析
              </CardTitle>
              <CardDescription>识别系统中缺失的关键功能和改进机会</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 高优先级缺口 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-red-600">🔥 高优先级缺口</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 border-l-4 border-red-500 bg-red-50">
                      <h4 className="font-medium text-red-800">财务对账系统</h4>
                      <p className="text-sm text-red-700 mt-1">缺少自动化财务对账功能，影响财务数据准确性和效率</p>
                      <div className="mt-2 text-xs text-red-600">
                        业务影响：高 | 预估工时：120h | 涉及模块：财务管理
                      </div>
                    </div>
                    <div className="p-4 border-l-4 border-red-500 bg-red-50">
                      <h4 className="font-medium text-red-800">合同审批工作流</h4>
                      <p className="text-sm text-red-700 mt-1">缺少完整的合同审批流程，无法满足企业合规要求</p>
                      <div className="mt-2 text-xs text-red-600">
                        业务影响：高 | 预估工时：100h | 涉及模块：商务功能
                      </div>
                    </div>
                    <div className="p-4 border-l-4 border-red-500 bg-red-50">
                      <h4 className="font-medium text-red-800">客服工单系统</h4>
                      <p className="text-sm text-red-700 mt-1">缺少专业的客服工单管理系统，影响客户服务质量</p>
                      <div className="mt-2 text-xs text-red-600">业务影响：高 | 预估工时：80h | 涉及模块：CRM客户</div>
                    </div>
                    <div className="p-4 border-l-4 border-red-500 bg-red-50">
                      <h4 className="font-medium text-red-800">移动端应用</h4>
                      <p className="text-sm text-red-700 mt-1">缺少原生移动端应用，限制了移动办公场景的使用</p>
                      <div className="mt-2 text-xs text-red-600">业务影响：高 | 预估工时：200h | 涉及模块：全系统</div>
                    </div>
                  </div>
                </div>

                {/* 中优先级缺口 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-orange-600">⚡ 中优先级缺口</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
                      <h4 className="font-medium text-orange-800">库存预警系统</h4>
                      <p className="text-sm text-orange-700 mt-1">缺少智能库存预警，可能导致缺货或积压风险</p>
                      <div className="mt-2 text-xs text-orange-600">
                        业务影响：中 | 预估工时：60h | 涉及模块：供应链
                      </div>
                    </div>
                    <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
                      <h4 className="font-medium text-orange-800">多语言国际化</h4>
                      <p className="text-sm text-orange-700 mt-1">缺少完整的国际化支持，限制海外市场拓展</p>
                      <div className="mt-2 text-xs text-orange-600">
                        业务影响：中 | 预估工时：80h | 涉及模块：系统设置
                      </div>
                    </div>
                    <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
                      <h4 className="font-medium text-orange-800">文档管理系统</h4>
                      <p className="text-sm text-orange-700 mt-1">缺少专业的文档版本管理和协作功能</p>
                      <div className="mt-2 text-xs text-orange-600">
                        业务影响：中 | 预估工时：100h | 涉及模块：数据中心
                      </div>
                    </div>
                    <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
                      <h4 className="font-medium text-orange-800">营销自动化</h4>
                      <p className="text-sm text-orange-700 mt-1">缺少营销活动自动化工具，影响营销效率</p>
                      <div className="mt-2 text-xs text-orange-600">
                        业务影响：中 | 预估工时：120h | 涉及模块：CRM客户
                      </div>
                    </div>
                  </div>
                </div>

                {/* 低优先级缺口 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-blue-600">📈 低优先级缺口</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-3 border-l-4 border-blue-500 bg-blue-50">
                      <h4 className="font-medium text-blue-800">社交媒体集成</h4>
                      <p className="text-sm text-blue-700 mt-1">社交平台数据同步和分析</p>
                    </div>
                    <div className="p-3 border-l-4 border-blue-500 bg-blue-50">
                      <h4 className="font-medium text-blue-800">语音识别功能</h4>
                      <p className="text-sm text-blue-700 mt-1">语音输入和语音助手功能</p>
                    </div>
                    <div className="p-3 border-l-4 border-blue-500 bg-blue-50">
                      <h4 className="font-medium text-blue-800">区块链集成</h4>
                      <p className="text-sm text-blue-700 mt-1">区块链技术应用和数据上链</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </EnhancedCard>
        </TabsContent>

        {/* 优化建议 */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* 功能优化建议 */}
            <EnhancedCard variant="modern" glowEffect>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                  功能优化建议
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800">✅ 优势保持</h4>
                    <ul className="text-sm text-green-700 mt-2 space-y-1">
                      <li>• 数据分析模块完成度高，功能全面</li>
                      <li>• AI智能引擎具有技术领先性</li>
                      <li>• 用户管理系统功能完善</li>
                      <li>• 系统设置模块配置灵活</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-800">⚡ 重点改进</h4>
                    <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                      <li>• 完善商务功能模块的合同管理</li>
                      <li>• 加强多租户系统的安全隔离</li>
                      <li>• 优化集成平台的数据同步性能</li>
                      <li>• 增强插件系统的安全检查</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800">🚀 创新机会</h4>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1">
                      <li>• 引入低代码/无代码平台</li>
                      <li>• 集成更多AI能力（如GPT对话）</li>
                      <li>• 开发移动端原生应用</li>
                      <li>• 构建开放API生态</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </EnhancedCard>

            {/* 实施路线图 */}
            <EnhancedCard variant="modern" glowEffect>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Map className="w-5 h-5 mr-2 text-blue-500" />
                  实施路线图
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 border-l-4 border-red-500 bg-red-50">
                    <h4 className="font-medium text-red-800">Q1 2024 - 关键缺口补齐</h4>
                    <ul className="text-sm text-red-700 mt-2 space-y-1">
                      <li>• 完成财务对账系统开发</li>
                      <li>• 实现合同审批工作流</li>
                      <li>• 建立客服工单系统</li>
                      <li>• 加强系统安全防护</li>
                    </ul>
                  </div>

                  <div className="p-3 border-l-4 border-orange-500 bg-orange-50">
                    <h4 className="font-medium text-orange-800">Q2 2024 - 功能完善</h4>
                    <ul className="text-sm text-orange-700 mt-2 space-y-1">
                      <li>• 开发移动端应用</li>
                      <li>• 完善库存预警系统</li>
                      <li>• 实现多语言国际化</li>
                      <li>• 优化用户体验</li>
                    </ul>
                  </div>

                  <div className="p-3 border-l-4 border-blue-500 bg-blue-50">
                    <h4 className="font-medium text-blue-800">Q3-Q4 2024 - 创新升级</h4>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1">
                      <li>• 引入低代码平台</li>
                      <li>• 集成先进AI能力</li>
                      <li>• 构建开放生态</li>
                      <li>• 性能优化升级</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </EnhancedCard>
          </div>

          {/* 总结评估 */}
          <EnhancedCard variant="traditional" size="lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                综合评估总结
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">A-</div>
                  <div className="text-sm text-muted-foreground">整体评级</div>
                  <p className="text-xs mt-2">功能覆盖全面，核心能力突出</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">85%</div>
                  <div className="text-sm text-muted-foreground">企业就绪度</div>
                  <p className="text-xs mt-2">基本满足企业级应用需求</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">3-6月</div>
                  <div className="text-sm text-muted-foreground">完善周期</div>
                  <p className="text-xs mt-2">预计完善关键功能所需时间</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <h4 className="font-medium mb-2">🎯 核心结论</h4>
                <p className="text-sm text-muted-foreground">
                  YanYu Cloud³ 智能商务管理系统已具备完整的企业级功能框架，
                  核心模块完成度较高，具有良好的技术架构和扩展性。 建议优先补齐财务对账、合同管理等关键业务功能，
                  同时加强移动端支持和国际化能力，以提升市场竞争力。
                </p>
              </div>
            </CardContent>
          </EnhancedCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
