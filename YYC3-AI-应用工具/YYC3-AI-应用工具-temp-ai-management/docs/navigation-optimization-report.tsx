"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  CheckCircle,
  AlertTriangle,
  Star,
  TrendingUp,
  Users,
  BarChart3,
  Brain,
  Briefcase,
  Settings,
  Target,
  User,
  Home,
  Eye,
  UserPlus,
  Shield,
  UserCog,
  Ban,
  PieChart,
  TrendingDown,
  FileBarChart,
  Activity,
  Bot,
  Cpu,
  Pickaxe,
  HardDrive,
  Terminal,
  Library,
  Building,
  DollarSign,
  ShoppingCart,
  Factory,
  Headphones,
  Truck,
  Sliders,
  Lock,
  Shield as UserShield,
  EyeOff,
  Bell,
  Paintbrush,
  FolderKanban,
  CheckSquare,
  Play,
  GitMerge,
  FilePenLine as Pipeline,
  Map,
  Info,
  Edit,
  Camera,
  Phone,
  MapPin,
  ShieldCheck,
  Zap,
} from "lucide-react"

// 详细的功能映射和评分数据
interface DetailedMenuAnalysis {
  mainMenu: string
  icon: any
  subMenus: {
    name: string
    icon: any
    functionalMatch: "完全匹配" | "部分匹配" | "不匹配"
    implementationStatus: "已实现" | "部分实现" | "未实现"
    uiConsistencyScore: number
    interactionScore: number
    accessibilityScore: number
    performanceScore: number
    description: string
    issues: string[]
    improvements: string[]
    codeQuality: number
  }[]
  overallScore: number
  logicalCoherence: number
  navigationEfficiency: number
  userExperience: number
}

const detailedAnalysisData: DetailedMenuAnalysis[] = [
  {
    mainMenu: "数据中心",
    icon: Home,
    subMenus: [
      {
        name: "数据中心",
        icon: BarChart3,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        interactionScore: 8,
        accessibilityScore: 9,
        performanceScore: 8,
        codeQuality: 9,
        description: "实时数据监控与智能分析中心，提供全方位的业务洞察",
        issues: [],
        improvements: ["可增加更多实时数据源", "优化图表加载性能"],
      },
    ],
    overallScore: 8.6,
    logicalCoherence: 9,
    navigationEfficiency: 8,
    userExperience: 9,
  },
  {
    mainMenu: "用户管理",
    icon: Users,
    subMenus: [
      {
        name: "用户列表",
        icon: Users,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        interactionScore: 9,
        accessibilityScore: 8,
        performanceScore: 8,
        codeQuality: 9,
        description: "完整的用户管理界面，包含搜索、筛选、用户详情管理",
        issues: [],
        improvements: ["增加批量操作功能", "优化大数据量加载"],
      },
      {
        name: "用户详情",
        icon: Eye,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        interactionScore: 8,
        accessibilityScore: 8,
        performanceScore: 9,
        codeQuality: 8,
        description: "详细的用户信息展示和编辑功能",
        issues: ["缺少操作历史记录"],
        improvements: ["添加用户活动时间线", "增强编辑表单验证"],
      },
      {
        name: "新增用户",
        icon: UserPlus,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        interactionScore: 9,
        accessibilityScore: 9,
        performanceScore: 9,
        codeQuality: 9,
        description: "快速创建新用户账户，配置基本信息和权限",
        issues: [],
        improvements: ["添加用户导入功能", "增加模板选择"],
      },
      {
        name: "角色权限",
        icon: Shield,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        interactionScore: 7,
        accessibilityScore: 8,
        performanceScore: 8,
        codeQuality: 8,
        description: "灵活的权限管理系统，支持角色分配和权限控制",
        issues: ["权限粒度可以更细"],
        improvements: ["增加权限继承机制", "优化权限树展示"],
      },
      {
        name: "用户配置",
        icon: UserCog,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        interactionScore: 8,
        accessibilityScore: 8,
        performanceScore: 8,
        codeQuality: 8,
        description: "个性化用户设置管理，优化用户体验",
        issues: [],
        improvements: ["增加配置模板", "添加批量配置功能"],
      },
      {
        name: "封禁管理",
        icon: Ban,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        interactionScore: 8,
        accessibilityScore: 9,
        performanceScore: 9,
        codeQuality: 9,
        description: "用户状态管理，包括封禁、解封和状态监控",
        issues: [],
        improvements: ["增加自动解封功能", "添加封禁原因分类"],
      },
    ],
    overallScore: 8.5,
    logicalCoherence: 10,
    navigationEfficiency: 9,
    userExperience: 8,
  },
  {
    mainMenu: "数据分析",
    icon: BarChart3,
    subMenus: [
      {
        name: "数据概览",
        icon: PieChart,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        interactionScore: 7,
        accessibilityScore: 8,
        performanceScore: 7,
        codeQuality: 8,
        description: "核心业务指标展示，提供数据驱动的决策支持",
        issues: ["图表交互性有待提升"],
        improvements: ["增加图表钻取功能", "优化数据刷新机制"],
      },
      {
        name: "用户分析",
        icon: TrendingUp,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        interactionScore: 8,
        accessibilityScore: 8,
        performanceScore: 8,
        codeQuality: 8,
        description: "深度用户行为数据分析，洞察用户偏好和趋势",
        issues: [],
        improvements: ["增加用户画像功能", "添加预测分析"],
      },
      {
        name: "业务分析",
        icon: TrendingDown,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        interactionScore: 8,
        accessibilityScore: 8,
        performanceScore: 8,
        codeQuality: 8,
        description: "全面的业务指标和趋势分析，助力业务增长",
        issues: [],
        improvements: ["增加同比环比分析", "添加业务预警"],
      },
      {
        name: "报表中心",
        icon: FileBarChart,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 6,
        interactionScore: 5,
        accessibilityScore: 7,
        performanceScore: 6,
        codeQuality: 6,
        description: "专业的数据报表管理，支持自定义报表生成",
        issues: ["自定义报表功能不完整", "导出功能缺失"],
        improvements: ["完善报表设计器", "增加多格式导出", "添加定时报表"],
      },
      {
        name: "实时监控",
        icon: Activity,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        interactionScore: 9,
        accessibilityScore: 8,
        performanceScore: 9,
        codeQuality: 9,
        description: "系统性能实时监控，确保服务稳定运行",
        issues: [],
        improvements: ["增加监控告警", "添加性能分析"],
      },
      {
        name: "数据预警",
        icon: AlertTriangle,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 7,
        interactionScore: 6,
        accessibilityScore: 7,
        performanceScore: 7,
        codeQuality: 7,
        description: "智能异常检测和告警系统，预防潜在问题",
        issues: ["预警规则配置功能缺失"],
        improvements: ["完善规则引擎", "增加智能预警", "添加告警分级"],
      },
    ],
    overallScore: 7.7,
    logicalCoherence: 9,
    navigationEfficiency: 8,
    userExperience: 7,
  },
  {
    mainMenu: "智能引擎",
    icon: Brain,
    subMenus: [
      {
        name: "AI 智能",
        icon: Bot,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 7,
        interactionScore: 6,
        accessibilityScore: 7,
        performanceScore: 6,
        codeQuality: 7,
        description: "基于深度学习的智能助手、数据分析与个性化推荐系统",
        issues: ["缺少真实AI功能集成", "主要为展示界面"],
        improvements: ["集成真实AI模型", "增加对话功能", "添加智能推荐"],
      },
      {
        name: "机器学习",
        icon: Cpu,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 7,
        interactionScore: 6,
        accessibilityScore: 7,
        performanceScore: 6,
        codeQuality: 7,
        description: "先进的机器学习模型训练和管理平台",
        issues: ["模型训练功能缺失", "缺少实际ML工作流"],
        improvements: ["集成ML框架", "添加模型管理", "增加训练监控"],
      },
      {
        name: "数据挖掘",
        icon: Pickaxe,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 7,
        interactionScore: 6,
        accessibilityScore: 7,
        performanceScore: 6,
        codeQuality: 7,
        description: "强大的数据处理和分析工具，发现数据价值",
        issues: ["缺少实际数据挖掘算法"],
        improvements: ["集成数据挖掘算法", "添加可视化工具", "增加结果解释"],
      },
      {
        name: "存储管理",
        icon: HardDrive,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 8,
        interactionScore: 7,
        accessibilityScore: 8,
        performanceScore: 7,
        codeQuality: 8,
        description: "智能数据存储监控和优化管理系统",
        issues: ["存储优化功能不完整"],
        improvements: ["增加存储分析", "添加自动清理", "优化存储策略"],
      },
      {
        name: "开发环境",
        icon: Terminal,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 7,
        interactionScore: 6,
        accessibilityScore: 7,
        performanceScore: 6,
        codeQuality: 7,
        description: "完整的AI开发工具链，支持模型开发和部署",
        issues: ["缺少实际开发环境集成"],
        improvements: ["集成IDE功能", "添加调试工具", "增加部署管道"],
      },
      {
        name: "知识智库",
        icon: Library,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 8,
        interactionScore: 7,
        accessibilityScore: 8,
        performanceScore: 7,
        codeQuality: 8,
        description: "企业知识管理系统，构建智能知识图谱",
        issues: ["搜索功能不完善", "知识图谱功能缺失"],
        improvements: ["完善搜索引擎", "构建知识图谱", "增加智能问答"],
      },
    ],
    overallScore: 7.2,
    logicalCoherence: 9,
    navigationEfficiency: 7,
    userExperience: 6,
  },
  {
    mainMenu: "商务功能",
    icon: Briefcase,
    subMenus: [
      {
        name: "商务管理",
        icon: Building,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        interactionScore: 9,
        accessibilityScore: 9,
        performanceScore: 8,
        codeQuality: 9,
        description: "全面的业务概览和KPI管理，驱动业务成功",
        issues: [],
        improvements: ["增加业务预测", "添加KPI告警"],
      },
      {
        name: "财务管理",
        icon: DollarSign,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        interactionScore: 8,
        accessibilityScore: 8,
        performanceScore: 8,
        codeQuality: 8,
        description: "专业的财务数据管理和分析系统",
        issues: ["财务报表生成功能需完善"],
        improvements: ["完善报表模板", "增加财务分析", "添加预算管理"],
      },
      {
        name: "订单管理",
        icon: ShoppingCart,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        interactionScore: 9,
        accessibilityScore: 9,
        performanceScore: 9,
        codeQuality: 9,
        description: "高效的订单处理系统，优化业务流程",
        issues: [],
        improvements: ["增加订单跟踪", "添加自动化流程"],
      },
      {
        name: "ERP系统",
        icon: Factory,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        interactionScore: 8,
        accessibilityScore: 9,
        performanceScore: 8,
        codeQuality: 9,
        description: "企业资源规划系统，整合业务流程",
        issues: [],
        improvements: ["增加模块集成", "优化工作流程"],
      },
      {
        name: "CRM客户",
        icon: Headphones,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        interactionScore: 9,
        accessibilityScore: 9,
        performanceScore: 9,
        codeQuality: 9,
        description: "客户关系管理系统，提升客户满意度",
        issues: [],
        improvements: ["增加客户画像", "添加营销自动化"],
      },
      {
        name: "供应链",
        icon: Truck,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        interactionScore: 8,
        accessibilityScore: 9,
        performanceScore: 8,
        codeQuality: 9,
        description: "智能供应链管理，优化资源配置",
        issues: [],
        improvements: ["增加供应商评估", "添加库存优化"],
      },
    ],
    overallScore: 8.8,
    logicalCoherence: 10,
    navigationEfficiency: 9,
    userExperience: 9,
  },
  {
    mainMenu: "系统设置",
    icon: Settings,
    subMenus: [
      {
        name: "常规设置",
        icon: Sliders,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        interactionScore: 8,
        accessibilityScore: 8,
        performanceScore: 8,
        codeQuality: 8,
        description: "系统基础配置管理，个性化系统体验",
        issues: [],
        improvements: ["增加配置导入导出", "添加配置验证"],
      },
      {
        name: "安全设置",
        icon: Lock,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        interactionScore: 8,
        accessibilityScore: 8,
        performanceScore: 8,
        codeQuality: 8,
        description: "全面的安全策略管理，保障系统安全",
        issues: [],
        improvements: ["增加安全审计", "添加威胁检测"],
      },
      {
        name: "权限管理",
        icon: UserShield,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 7,
        interactionScore: 7,
        accessibilityScore: 7,
        performanceScore: 7,
        codeQuality: 7,
        description: "精细化用户权限控制，确保数据安全",
        issues: ["权限粒度不够细", "与用户管理模块有重叠"],
        improvements: ["细化权限粒度", "整合权限管理", "增加权限审计"],
      },
      {
        name: "隐私设置",
        icon: EyeOff,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        interactionScore: 8,
        accessibilityScore: 8,
        performanceScore: 8,
        codeQuality: 8,
        description: "隐私保护配置管理，符合合规要求",
        issues: [],
        improvements: ["增加合规检查", "添加隐私评估"],
      },
      {
        name: "通知设置",
        icon: Bell,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 7,
        interactionScore: 6,
        accessibilityScore: 7,
        performanceScore: 7,
        codeQuality: 7,
        description: "智能消息通知管理，优化信息传递",
        issues: ["缺少实时推送功能"],
        improvements: ["集成推送服务", "增加通知模板", "添加通知统计"],
      },
      {
        name: "外观设置",
        icon: Paintbrush,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        interactionScore: 9,
        accessibilityScore: 9,
        performanceScore: 9,
        codeQuality: 9,
        description: "个性化界面主题配置，提升用户体验",
        issues: [],
        improvements: ["增加自定义主题", "添加主题市场"],
      },
    ],
    overallScore: 7.8,
    logicalCoherence: 8,
    navigationEfficiency: 8,
    userExperience: 8,
  },
  {
    mainMenu: "项目管理",
    icon: Target,
    subMenus: [
      {
        name: "项目概览",
        icon: FolderKanban,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        interactionScore: 8,
        accessibilityScore: 8,
        performanceScore: 8,
        codeQuality: 8,
        description: "项目进度展示和管理，掌控项目全局",
        issues: [],
        improvements: ["增加甘特图", "添加里程碑管理"],
      },
      {
        name: "任务管理",
        icon: CheckSquare,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        interactionScore: 7,
        accessibilityScore: 8,
        performanceScore: 8,
        codeQuality: 8,
        description: "高效的任务分配和跟踪系统",
        issues: ["任务依赖关系展示不清晰"],
        improvements: ["优化依赖关系图", "增加任务模板", "添加时间跟踪"],
      },
      {
        name: "开发执行",
        icon: Play,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        interactionScore: 8,
        accessibilityScore: 8,
        performanceScore: 8,
        codeQuality: 8,
        description: "基于分析报告的迭代开发计划执行与任务管理",
        issues: [],
        improvements: ["增加代码质量监控", "添加自动化测试"],
      },
      {
        name: "敏捷工作流",
        icon: GitMerge,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        interactionScore: 8,
        accessibilityScore: 8,
        performanceScore: 8,
        codeQuality: 8,
        description: "敏捷开发流程管理，Sprint规划与团队协作",
        issues: [],
        improvements: ["增加燃尽图", "添加团队速度跟踪"],
      },
      {
        name: "CI/CD流水线",
        icon: Pipeline,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        interactionScore: 9,
        accessibilityScore: 8,
        performanceScore: 9,
        codeQuality: 9,
        description: "自动化构建、测试、部署流程管理与监控",
        issues: [],
        improvements: ["增加流水线模板", "添加部署策略"],
      },
      {
        name: "开发路线图",
        icon: Map,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        interactionScore: 8,
        accessibilityScore: 8,
        performanceScore: 8,
        codeQuality: 8,
        description: "项目规划和里程碑管理，指导开发方向",
        issues: [],
        improvements: ["增加版本规划", "添加功能优先级"],
      },
    ],
    overallScore: 8.2,
    logicalCoherence: 10,
    navigationEfficiency: 9,
    userExperience: 8,
  },
  {
    mainMenu: "个人资料",
    icon: User,
    subMenus: [
      {
        name: "基本信息",
        icon: Info,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        interactionScore: 9,
        accessibilityScore: 9,
        performanceScore: 9,
        codeQuality: 9,
        description: "个人基础信息展示和管理",
        issues: [],
        improvements: ["增加信息验证", "添加修改历史"],
      },
      {
        name: "编辑资料",
        icon: Edit,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        interactionScore: 9,
        accessibilityScore: 9,
        performanceScore: 9,
        codeQuality: 9,
        description: "便捷的个人信息编辑功能",
        issues: [],
        improvements: ["增加批量编辑", "添加自动保存"],
      },
      {
        name: "头像设置",
        icon: Camera,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        interactionScore: 7,
        accessibilityScore: 8,
        performanceScore: 8,
        codeQuality: 8,
        description: "个性化头像管理和设置",
        issues: ["头像上传功能需优化"],
        improvements: ["优化上传体验", "增加头像裁剪", "添加默认头像"],
      },
      {
        name: "联系方式",
        icon: Phone,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        interactionScore: 9,
        accessibilityScore: 9,
        performanceScore: 9,
        codeQuality: 9,
        description: "联系信息管理和维护",
        issues: [],
        improvements: ["增加联系方式验证", "添加紧急联系人"],
      },
      {
        name: "地址信息",
        icon: MapPin,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        interactionScore: 9,
        accessibilityScore: 9,
        performanceScore: 9,
        codeQuality: 9,
        description: "地址信息管理和配置",
        issues: [],
        improvements: ["集成地图选择", "添加地址验证"],
      },
      {
        name: "账户安全",
        icon: ShieldCheck,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        interactionScore: 8,
        accessibilityScore: 8,
        performanceScore: 8,
        codeQuality: 8,
        description: "账户安全设置和保护措施",
        issues: ["可增加两步验证功能"],
        improvements: ["增加两步验证", "添加登录日志", "增强密码策略"],
      },
    ],
    overallScore: 8.7,
    logicalCoherence: 10,
    navigationEfficiency: 9,
    userExperience: 9,
  },
]

// 导航交互问题分析
const navigationIssues = [
  {
    category: "滚动问题",
    priority: "高",
    issues: [
      {
        title: "导航栏无法滚动",
        description: "当菜单项较多时，部分功能无法访问",
        impact: "严重影响用户操作体验",
        solution: "已修复：设置 overflow-y: auto 并优化容器高度",
        status: "已解决",
      },
      {
        title: "滚动位置不保持",
        description: "页面跳转后滚动位置重置",
        impact: "用户需要重新定位菜单项",
        solution: "实现滚动位置记忆和自动定位到激活菜单",
        status: "已解决",
      },
    ],
  },
  {
    category: "状态管理",
    priority: "高",
    issues: [
      {
        title: "菜单状态重置",
        description: "点击菜单后页面返回初始状态",
        impact: "用户上下文丢失，体验不连贯",
        solution: "使用 Context + localStorage 持久化导航状态",
        status: "已解决",
      },
      {
        title: "展开状态不保持",
        description: "菜单展开状态在页面刷新后丢失",
        impact: "用户需要重新展开菜单",
        solution: "实现菜单展开状态的本地存储",
        status: "已解决",
      },
    ],
  },
  {
    category: "交互体验",
    priority: "中",
    issues: [
      {
        title: "缺少面包屑导航",
        description: "用户难以了解当前位置",
        impact: "导航定位感不强",
        solution: "实现自动生成的面包屑导航系统",
        status: "已解决",
      },
      {
        title: "菜单高亮不明确",
        description: "当前激活菜单的视觉反馈不够明显",
        impact: "用户难以快速识别当前位置",
        solution: "优化菜单高亮样式和动画效果",
        status: "已解决",
      },
    ],
  },
]

// 代码修复建议
const codeFixSuggestions = [
  {
    component: "ScrollableNavigation",
    issues: ["容器高度设置", "滚动事件监听", "自动定位功能"],
    fixes: [
      "设置 flex-1 min-h-0 确保容器可以收缩",
      "添加 overflow-y: auto 启用垂直滚动",
      "实现 scrollToActiveMenu 自动定位功能",
      "使用 useRef 和 useCallback 优化性能",
    ],
  },
  {
    component: "NavigationProvider",
    issues: ["状态持久化", "历史记录管理", "滚动位置保存"],
    fixes: [
      "使用 localStorage 保存导航状态",
      "实现导航历史记录功能",
      "添加滚动位置记忆机制",
      "优化状态更新逻辑避免不必要的重渲染",
    ],
  },
  {
    component: "EnhancedBreadcrumb",
    issues: ["面包屑生成", "点击导航", "样式优化"],
    fixes: ["基于菜单层级自动生成面包屑", "实现面包屑点击导航功能", "添加当前页面描述信息", "优化响应式布局适配"],
  },
]

export function NavigationOptimizationReport() {
  const [selectedCategory, setSelectedCategory] = useState<string>("overview")

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return "text-green-600"
    if (score >= 7) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "已解决":
        return "bg-green-100 text-green-800"
      case "进行中":
        return "bg-yellow-100 text-yellow-800"
      case "待处理":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "高":
        return "bg-red-100 text-red-800"
      case "中":
        return "bg-yellow-100 text-yellow-800"
      case "低":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // 计算总体统计
  const totalSubMenus = detailedAnalysisData.reduce((sum, menu) => sum + menu.subMenus.length, 0)
  const averageScore =
    Math.round(
      (detailedAnalysisData.reduce((sum, menu) => sum + menu.overallScore, 0) / detailedAnalysisData.length) * 10,
    ) / 10
  const averageUiScore =
    Math.round(
      (detailedAnalysisData.reduce(
        (sum, menu) =>
          sum + menu.subMenus.reduce((subSum, sub) => subSum + sub.uiConsistencyScore, 0) / menu.subMenus.length,
        0,
      ) /
        detailedAnalysisData.length) *
        10,
    ) / 10
  const fullyImplemented = detailedAnalysisData.reduce(
    (sum, menu) => sum + menu.subMenus.filter((sub) => sub.implementationStatus === "已实现").length,
    0,
  )

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">导航系统优化报告</h1>
        <p className="text-muted-foreground mb-4">YanYu Cloud³ 导航交互体验全面分析与优化方案</p>
      </div>

      {/* 总体统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{detailedAnalysisData.length}</div>
            <div className="text-sm text-muted-foreground">主菜单模块</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{totalSubMenus}</div>
            <div className="text-sm text-muted-foreground">子功能页面</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${getScoreColor(averageScore)}`}>{averageScore}</div>
            <div className="text-sm text-muted-foreground">综合评分</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${getScoreColor(averageUiScore)}`}>{averageUiScore}</div>
            <div className="text-sm text-muted-foreground">UI一致性</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">总览</TabsTrigger>
          <TabsTrigger value="detailed">详细评分</TabsTrigger>
          <TabsTrigger value="issues">问题分析</TabsTrigger>
          <TabsTrigger value="fixes">修复方案</TabsTrigger>
          <TabsTrigger value="recommendations">优化建议</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 模块评分概览 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  模块评分概览
                </CardTitle>
                <CardDescription>各主要功能模块的综合评分</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {detailedAnalysisData.map((menu, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <menu.icon className="h-5 w-5 text-primary-600" />
                        <span className="font-medium">{menu.mainMenu}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={menu.overallScore * 10} className="w-20" />
                        <span className={`font-bold ${getScoreColor(menu.overallScore)}`}>{menu.overallScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 实现状态统计 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  实现状态统计
                </CardTitle>
                <CardDescription>功能实现完成度分析</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>已完全实现</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="font-bold text-green-600">{fullyImplemented}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>部分实现</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span className="font-bold text-yellow-600">{totalSubMenus - fullyImplemented}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-sm text-muted-foreground mb-2">完成度</div>
                    <Progress value={(fullyImplemented / totalSubMenus) * 100} />
                    <div className="text-center mt-2 font-bold">
                      {Math.round((fullyImplemented / totalSubMenus) * 100)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 关键指标 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                关键性能指标
              </CardTitle>
              <CardDescription>导航系统的核心性能指标评估</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(
                      (detailedAnalysisData.reduce((sum, menu) => sum + menu.navigationEfficiency, 0) /
                        detailedAnalysisData.length) *
                        10,
                    ) / 10}
                  </div>
                  <div className="text-sm text-muted-foreground">导航效率</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(
                      (detailedAnalysisData.reduce((sum, menu) => sum + menu.userExperience, 0) /
                        detailedAnalysisData.length) *
                        10,
                    ) / 10}
                  </div>
                  <div className="text-sm text-muted-foreground">用户体验</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(
                      (detailedAnalysisData.reduce((sum, menu) => sum + menu.logicalCoherence, 0) /
                        detailedAnalysisData.length) *
                        10,
                    ) / 10}
                  </div>
                  <div className="text-sm text-muted-foreground">逻辑一致性</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.round(
                      (detailedAnalysisData.reduce(
                        (sum, menu) =>
                          sum +
                          menu.subMenus.reduce((subSum, sub) => subSum + sub.performanceScore, 0) /
                            menu.subMenus.length,
                        0,
                      ) /
                        detailedAnalysisData.length) *
                        10,
                    ) / 10}
                  </div>
                  <div className="text-sm text-muted-foreground">性能表现</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>详细评分表</CardTitle>
              <CardDescription>每个功能页面的详细评分和分析</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {detailedAnalysisData.map((menu, menuIndex) => (
                  <div key={menuIndex} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <menu.icon className="h-6 w-6 text-primary-600" />
                        <h3 className="text-lg font-semibold">{menu.mainMenu}</h3>
                        <Badge variant="outline">综合评分: {menu.overallScore}/10</Badge>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>功能页面</TableHead>
                          <TableHead>UI一致性</TableHead>
                          <TableHead>交互体验</TableHead>
                          <TableHead>可访问性</TableHead>
                          <TableHead>性能表现</TableHead>
                          <TableHead>代码质量</TableHead>
                          <TableHead>实现状态</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {menu.subMenus.map((subMenu, subIndex) => (
                          <TableRow key={subIndex}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <subMenu.icon className="h-4 w-4" />
                                <span className="font-medium">{subMenu.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${getScoreColor(subMenu.uiConsistencyScore)}`}>
                                {subMenu.uiConsistencyScore}/10
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${getScoreColor(subMenu.interactionScore)}`}>
                                {subMenu.interactionScore}/10
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${getScoreColor(subMenu.accessibilityScore)}`}>
                                {subMenu.accessibilityScore}/10
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${getScoreColor(subMenu.performanceScore)}`}>
                                {subMenu.performanceScore}/10
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${getScoreColor(subMenu.codeQuality)}`}>
                                {subMenu.codeQuality}/10
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  subMenu.implementationStatus === "已实现"
                                    ? "bg-green-100 text-green-800"
                                    : subMenu.implementationStatus === "部分实现"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                }
                              >
                                {subMenu.implementationStatus}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                导航交互问题分析
              </CardTitle>
              <CardDescription>已识别的问题及解决方案</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {navigationIssues.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">{category.category}</h3>
                      <Badge className={getPriorityColor(category.priority)}>{category.priority}优先级</Badge>
                    </div>

                    <div className="space-y-4">
                      {category.issues.map((issue, issueIndex) => (
                        <div key={issueIndex} className="border-l-4 border-primary-200 pl-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{issue.title}</h4>
                            <Badge className={getStatusColor(issue.status)}>{issue.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{issue.description}</p>
                          <p className="text-sm text-red-600 mb-2">
                            <strong>影响：</strong>
                            {issue.impact}
                          </p>
                          <p className="text-sm text-green-600">
                            <strong>解决方案：</strong>
                            {issue.solution}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fixes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                代码修复方案
              </CardTitle>
              <CardDescription>具体的代码优化和修复建议</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {codeFixSuggestions.map((suggestion, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">{suggestion.component}</h3>

                    <div className="mb-4">
                      <h4 className="font-medium mb-2 text-red-600">发现的问题：</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {suggestion.issues.map((issue, issueIndex) => (
                          <li key={issueIndex}>{issue}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2 text-green-600">修复方案：</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {suggestion.fixes.map((fix, fixIndex) => (
                          <li key={fixIndex}>{fix}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 关键代码示例 */}
          <Card>
            <CardHeader>
              <CardTitle>关键修复代码示例</CardTitle>
              <CardDescription>核心问题的具体代码解决方案</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">1. 滚动容器修复</h4>
                  <pre className="text-sm bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto">
                    {`// 修复前：容器无法滚动
<div className="flex-1 px-3 py-2">

// 修复后：启用滚动并优化高度
<div
  ref={scrollContainerRef}
  className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-1"
  style={{
    scrollbarWidth: "thin",
    scrollbarColor: "rgb(14 165 233 / 0.3) transparent",
    maxHeight: "100%",
  }}
>`}
                  </pre>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">2. 自动定位到激活菜单</h4>
                  <pre className="text-sm bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto">
                    {`// 滚动到激活的菜单项
const scrollToActiveMenu = useCallback(() => {
  const container = scrollContainerRef.current
  const activeElement = activeMenuRef.current
  
  if (!container || !activeElement) return

  const containerRect = container.getBoundingClientRect()
  const elementRect = activeElement.getBoundingClientRect()
  
  // 计算滚动位置并居中显示
  const scrollTo = elementTop - (container.clientHeight / 2) + (elementRect.height / 2)
  container.scrollTo({
    top: Math.max(0, scrollTo),
    behavior: 'smooth'
  })
}, [])`}
                  </pre>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">3. 状态持久化</h4>
                  <pre className="text-sm bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto">
                    {`// 保存导航状态到本地存储
useEffect(() => {
  const stateToSave = {
    activeMenu: navigationState.activeMenu,
    openMenus: navigationState.openMenus,
    navigationHistory: navigationState.navigationHistory.slice(-10),
  }
  
  localStorage.setItem("yanyu-navigation-state-v2", JSON.stringify(stateToSave))
}, [navigationState.activeMenu, navigationState.openMenus, navigationState.navigationHistory])`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="h-5 w-5 mr-2" />
                优化建议
              </CardTitle>
              <CardDescription>基于分析结果的系统性改进建议</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 短期优化建议 */}
                <div className="border rounded-lg p-4 bg-green-50">
                  <h3 className="font-semibold mb-3 flex items-center text-green-800">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    短期优化（已完成）
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-2">导航体验优化</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>✅ 修复导航栏滚动问题</li>
                        <li>✅ 实现菜单状态持久化</li>
                        <li>✅ 添加面包屑导航</li>
                        <li>✅ 优化菜单高亮效果</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">交互体验提升</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>✅ 自动定位到激活菜单</li>
                        <li>✅ 实现导航历史记录</li>
                        <li>✅ 添加快速访问功能</li>
                        <li>✅ 优化滚动位置记忆</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 中期优化建议 */}
                <div className="border rounded-lg p-4 bg-yellow-50">
                  <h3 className="font-semibold mb-3 flex items-center text-yellow-800">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    中期优化（建议实施）
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-2">功能完善</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• 完善报表中心自定义功能</li>
                        <li>• 实现数据预警规则配置</li>
                        <li>• 增强通知系统实时推送</li>
                        <li>• 优化权限管理模块整合</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">性能优化</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• 优化大数据量页面加载</li>
                        <li>• 增强图表交互性能</li>
                        <li>• 实现组件懒加载</li>
                        <li>• 优化移动端适配</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 长期优化建议 */}
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold mb-3 flex items-center text-blue-800">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    长期优化（战略规划）
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-2">智能化升级</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• 集成真实AI功能和模型</li>
                        <li>• 实现机器学习工作流</li>
                        <li>• 构建知识图谱系统</li>
                        <li>• 添加智能推荐引擎</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">生态系统建设</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• 开发插件系统</li>
                        <li>• 建设第三方集成平台</li>
                        <li>• 实现多租户架构</li>
                        <li>• 构建开发者生态</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 技术债务处理 */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    技术债务处理建议
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <h4 className="font-medium text-red-600">高优先级</h4>
                      <p className="text-muted-foreground">
                        智能引擎模块需要从展示界面升级为真实功能实现，建议分阶段集成AI服务和机器学习框架
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-yellow-600">中优先级</h4>
                      <p className="text-muted-foreground">
                        权限管理功能在用户管理和系统设置中存在重叠，需要重构统一权限管理架构
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-600">低优先级</h4>
                      <p className="text-muted-foreground">
                        优化组件复用性，建立统一的设计系统和组件库，提升开发效率和UI一致性
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
