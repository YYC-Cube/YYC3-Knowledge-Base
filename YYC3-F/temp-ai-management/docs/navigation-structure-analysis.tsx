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
  XCircle,
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
} from "lucide-react"

// 菜单功能映射数据结构
interface MenuMapping {
  mainMenu: string
  icon: any
  subMenus: {
    name: string
    icon: any
    functionalMatch: "完全匹配" | "部分匹配" | "不匹配"
    implementationStatus: "已实现" | "部分实现" | "未实现"
    uiConsistencyScore: number
    description: string
    issues: string[]
  }[]
  overallScore: number
  logicalCoherence: number
}

const menuMappingData: MenuMapping[] = [
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
        description: "实时数据监控与智能分析中心",
        issues: [],
      },
      {
        name: "实时协作",
        icon: Users,
        functionalMatch: "部分匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 7,
        description: "团队协作功能，但与数据中心主题关联度不高",
        issues: ["功能定位不够清晰", "与主菜单逻辑关联性弱"],
      },
      {
        name: "微信集成",
        icon: Bot,
        functionalMatch: "部分匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 8,
        description: "第三方集成功能",
        issues: ["应该归类到系统集成或第三方服务"],
      },
    ],
    overallScore: 8.0,
    logicalCoherence: 7,
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
        description: "完整的用户管理界面",
        issues: [],
      },
      {
        name: "用户详情",
        icon: Eye,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        description: "详细的用户信息展示",
        issues: ["缺少操作历史记录"],
      },
      {
        name: "新增用户",
        icon: UserPlus,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        description: "用户创建功能",
        issues: [],
      },
      {
        name: "角色权限",
        icon: Shield,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        description: "权限管理系统",
        issues: ["权限粒度可以更细"],
      },
      {
        name: "用户配置",
        icon: UserCog,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        description: "用户个性化设置",
        issues: [],
      },
      {
        name: "封禁管理",
        icon: Ban,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        description: "用户状态管理",
        issues: [],
      },
    ],
    overallScore: 8.5,
    logicalCoherence: 10,
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
        description: "核心业务指标展示",
        issues: ["图表交互性有待提升"],
      },
      {
        name: "用户分析",
        icon: TrendingUp,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        description: "用户行为数据分析",
        issues: [],
      },
      {
        name: "业务分析",
        icon: TrendingDown,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        description: "业务指标和趋势分析",
        issues: [],
      },
      {
        name: "报表中心",
        icon: FileBarChart,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 6,
        description: "报表管理功能",
        issues: ["自定义报表功能不完整", "导出功能缺失"],
      },
      {
        name: "实时监控",
        icon: Activity,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        description: "系统性能实时监控",
        issues: [],
      },
      {
        name: "数据预警",
        icon: AlertTriangle,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 7,
        description: "异常检测和告警",
        issues: ["预警规则配置功能缺失"],
      },
    ],
    overallScore: 7.7,
    logicalCoherence: 9,
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
        description: "AI智能助手和分析",
        issues: ["缺少真实AI功能集成", "主要为展示界面"],
      },
      {
        name: "机器学习",
        icon: Cpu,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 7,
        description: "机器学习模型管理",
        issues: ["模型训练功能缺失", "缺少实际ML工作流"],
      },
      {
        name: "数据挖掘",
        icon: Pickaxe,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 7,
        description: "数据处理和分析工具",
        issues: ["缺少实际数据挖掘算法"],
      },
      {
        name: "存储管理",
        icon: HardDrive,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 8,
        description: "数据存储监控和管理",
        issues: ["存储优化功能不完整"],
      },
      {
        name: "开发环境",
        icon: Terminal,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 7,
        description: "AI开发工具链",
        issues: ["缺少实际开发环境集成"],
      },
      {
        name: "知识智库",
        icon: Library,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 8,
        description: "企业知识管理系统",
        issues: ["搜索功能不完善", "知识图谱功能缺失"],
      },
    ],
    overallScore: 7.3,
    logicalCoherence: 9,
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
        description: "业务概览和KPI管理",
        issues: [],
      },
      {
        name: "财务管理",
        icon: DollarSign,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        description: "财务数据管理和分析",
        issues: ["财务报表生成功能需完善"],
      },
      {
        name: "订单管理",
        icon: ShoppingCart,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        description: "订单处理系统",
        issues: [],
      },
      {
        name: "ERP系统",
        icon: Factory,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        description: "企业资源规划系统",
        issues: [],
      },
      {
        name: "CRM客户",
        icon: Headphones,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        description: "客户关系管理",
        issues: [],
      },
      {
        name: "供应链",
        icon: Truck,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        description: "供应链管理",
        issues: [],
      },
    ],
    overallScore: 8.8,
    logicalCoherence: 10,
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
        description: "系统基础配置",
        issues: [],
      },
      {
        name: "安全设置",
        icon: Lock,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        description: "安全策略管理",
        issues: [],
      },
      {
        name: "权限管理",
        icon: UserShield,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 7,
        description: "用户权限控制",
        issues: ["权限粒度不够细", "与用户管理模块有重叠"],
      },
      {
        name: "隐私设置",
        icon: EyeOff,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        description: "隐私保护配置",
        issues: [],
      },
      {
        name: "通知设置",
        icon: Bell,
        functionalMatch: "完全匹配",
        implementationStatus: "部分实现",
        uiConsistencyScore: 7,
        description: "消息通知管理",
        issues: ["缺少实时推送功能"],
      },
      {
        name: "外观设置",
        icon: Paintbrush,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        description: "界面主题配置",
        issues: [],
      },
    ],
    overallScore: 7.8,
    logicalCoherence: 8,
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
        description: "项目进度展示和管理",
        issues: [],
      },
      {
        name: "任务管理",
        icon: CheckSquare,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        description: "任务分配和跟踪",
        issues: ["任务依赖关系展示不清晰"],
      },
      {
        name: "开发执行",
        icon: Play,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        description: "开发计划执行管理",
        issues: [],
      },
      {
        name: "敏捷工作流",
        icon: GitMerge,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        description: "敏捷开发流程管理",
        issues: [],
      },
      {
        name: "CI/CD流水线",
        icon: Pipeline,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        description: "自动化构建部署",
        issues: [],
      },
      {
        name: "开发路线图",
        icon: Map,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        description: "项目规划和里程碑",
        issues: [],
      },
    ],
    overallScore: 8.2,
    logicalCoherence: 10,
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
        description: "个人基础信息展示",
        issues: [],
      },
      {
        name: "编辑资料",
        icon: Edit,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        description: "个人信息编辑",
        issues: [],
      },
      {
        name: "头像设置",
        icon: Camera,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        description: "头像管理和设置",
        issues: ["头像上传功能需优化"],
      },
      {
        name: "联系方式",
        icon: Phone,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        description: "联系信息管理",
        issues: [],
      },
      {
        name: "地址信息",
        icon: MapPin,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 9,
        description: "地址信息管理",
        issues: [],
      },
      {
        name: "账户安全",
        icon: ShieldCheck,
        functionalMatch: "完全匹配",
        implementationStatus: "已实现",
        uiConsistencyScore: 8,
        description: "账户安全设置",
        issues: ["可增加两步验证功能"],
      },
    ],
    overallScore: 8.7,
    logicalCoherence: 10,
  },
]

export function NavigationStructureAnalysis() {
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null)

  const getMatchColor = (match: string) => {
    switch (match) {
      case "完全匹配":
        return "bg-green-100 text-green-800"
      case "部分匹配":
        return "bg-yellow-100 text-yellow-800"
      case "不匹配":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "已实现":
        return "bg-green-100 text-green-800"
      case "部分实现":
        return "bg-yellow-100 text-yellow-800"
      case "未实现":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600"
    if (score >= 6) return "text-yellow-600"
    return "text-red-600"
  }

  const overallStats = {
    totalMenus: menuMappingData.length,
    totalSubMenus: menuMappingData.reduce((sum, menu) => sum + menu.subMenus.length, 0),
    averageScore:
      Math.round((menuMappingData.reduce((sum, menu) => sum + menu.overallScore, 0) / menuMappingData.length) * 10) /
      10,
    averageCoherence:
      Math.round(
        (menuMappingData.reduce((sum, menu) => sum + menu.logicalCoherence, 0) / menuMappingData.length) * 10,
      ) / 10,
    fullyImplemented: menuMappingData.reduce(
      (sum, menu) => sum + menu.subMenus.filter((sub) => sub.implementationStatus === "已实现").length,
      0,
    ),
    partiallyImplemented: menuMappingData.reduce(
      (sum, menu) => sum + menu.subMenus.filter((sub) => sub.implementationStatus === "部分实现").length,
      0,
    ),
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">导航结构分析报告</h1>
        <p className="text-muted-foreground mb-4">YanYu Cloud³ 菜单功能映射与UI一致性评估</p>
      </div>

      {/* 总体统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{overallStats.totalMenus}</div>
            <div className="text-sm text-muted-foreground">主菜单项</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{overallStats.totalSubMenus}</div>
            <div className="text-sm text-muted-foreground">子功能模块</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${getScoreColor(overallStats.averageScore)}`}>
              {overallStats.averageScore}
            </div>
            <div className="text-sm text-muted-foreground">平均UI评分</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${getScoreColor(overallStats.averageCoherence)}`}>
              {overallStats.averageCoherence}
            </div>
            <div className="text-sm text-muted-foreground">逻辑一致性</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="mapping" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mapping">功能映射表</TabsTrigger>
          <TabsTrigger value="ui-scores">UI一致性评分</TabsTrigger>
          <TabsTrigger value="issues">问题列表</TabsTrigger>
          <TabsTrigger value="recommendations">优化建议</TabsTrigger>
        </TabsList>

        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>菜单功能映射关系表</CardTitle>
              <CardDescription>主菜单项与子功能模块的逻辑匹配度分析</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {menuMappingData.map((menu, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <menu.icon className="h-6 w-6 text-primary-600" />
                        <h3 className="text-lg font-semibold">{menu.mainMenu}</h3>
                        <Badge variant="outline">逻辑一致性: {menu.logicalCoherence}/10</Badge>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getScoreColor(menu.overallScore)}`}>
                          {menu.overallScore}/10
                        </div>
                        <div className="text-xs text-muted-foreground">综合评分</div>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>子功能模块</TableHead>
                          <TableHead>功能匹配度</TableHead>
                          <TableHead>实现状态</TableHead>
                          <TableHead>UI评分</TableHead>
                          <TableHead>主要问题</TableHead>
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
                              <Badge className={getMatchColor(subMenu.functionalMatch)}>
                                {subMenu.functionalMatch}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(subMenu.implementationStatus)}>
                                {subMenu.implementationStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${getScoreColor(subMenu.uiConsistencyScore)}`}>
                                {subMenu.uiConsistencyScore}/10
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                {subMenu.issues.length > 0 ? (
                                  <ul className="list-disc list-inside space-y-1">
                                    {subMenu.issues.map((issue, issueIndex) => (
                                      <li key={issueIndex}>{issue}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-green-600">无明显问题</span>
                                )}
                              </div>
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

        <TabsContent value="ui-scores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>UI一致性评分详情</CardTitle>
              <CardDescription>各子页面在布局、配色、组件风格上的一致性评估</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuMappingData.map((menu) =>
                  menu.subMenus.map((subMenu, index) => (
                    <Card key={`${menu.mainMenu}-${index}`} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <subMenu.icon className="h-4 w-4" />
                          <span className="font-medium text-sm">{subMenu.name}</span>
                        </div>
                        <span className={`font-bold ${getScoreColor(subMenu.uiConsistencyScore)}`}>
                          {subMenu.uiConsistencyScore}/10
                        </span>
                      </div>
                      <Progress value={subMenu.uiConsistencyScore * 10} className="mb-2" />
                      <div className="text-xs text-muted-foreground">{subMenu.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">所属: {menu.mainMenu}</div>
                    </Card>
                  )),
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>发现的问题列表</CardTitle>
              <CardDescription>按优先级分类的问题和改进点</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 高优先级问题 */}
                <div className="border rounded-lg p-4 bg-red-50">
                  <h3 className="font-semibold text-red-800 mb-3 flex items-center">
                    <XCircle className="h-5 w-5 mr-2" />
                    高优先级问题
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-red-600 mr-2">•</span>
                      <span>
                        <strong>智能引擎模块：</strong>AI功能主要为展示界面，缺少真实功能集成
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-600 mr-2">•</span>
                      <span>
                        <strong>报表中心：</strong>自定义报表功能不完整，导出功能缺失
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-600 mr-2">•</span>
                      <span>
                        <strong>数据预警：</strong>预警规则配置功能缺失
                      </span>
                    </li>
                  </ul>
                </div>

                {/* 中优先级问题 */}
                <div className="border rounded-lg p-4 bg-yellow-50">
                  <h3 className="font-semibold text-yellow-800 mb-3 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    中优先级问题
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      <span>
                        <strong>权限管理：</strong>系统设置和用户管理中的权限功能有重叠
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      <span>
                        <strong>通知设置：</strong>缺少实时推送功能
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      <span>
                        <strong>数据中心分类：</strong>实时协作和微信集成与主题关联度不高
                      </span>
                    </li>
                  </ul>
                </div>

                {/* 低优先级问题 */}
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    低优先级问题
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>
                        <strong>头像设置：</strong>头像上传功能需要优化
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>
                        <strong>任务管理：</strong>任务依赖关系展示不够清晰
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>
                        <strong>图表交互：</strong>数据概览中的图表交互性有待提升
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>优化建议</CardTitle>
              <CardDescription>基于分析结果的具体改进方案</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 导航交互优化 */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Star className="h-5 w-5 mr-2 text-blue-600" />
                    导航交互优化
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-2">状态持久化</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• 使用 Context + localStorage 保持导航状态</li>
                        <li>• 避免页面跳转后状态重置</li>
                        <li>• 实现菜单展开状态记忆</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">面包屑导航</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• 自动生成基于菜单层级的面包屑</li>
                        <li>• 支持快速跳转到上级页面</li>
                        <li>• 提供清晰的位置指示</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 功能完善建议 */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    功能完善建议
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-2">智能引擎模块</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• 集成真实的AI模型和API</li>
                        <li>• 实现机器学习工作流</li>
                        <li>• 完善知识库搜索功能</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">数据分析模块</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• 完善报表中心自定义功能</li>
                        <li>• 实现数据预警规则配置</li>
                        <li>• 增强图表交互性</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* UI一致性改进 */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Paintbrush className="h-5 w-5 mr-2 text-purple-600" />
                    UI一致性改进
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-2">组件标准化</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• 统一表格、表单、卡片组件样式</li>
                        <li>• 标准化按钮和交互元素</li>
                        <li>• 统一加载和错误状态展示</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">布局优化</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• 统一页面头部和操作区布局</li>
                        <li>• 标准化内容区域间距和对齐</li>
                        <li>• 优化响应式布局适配</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 菜单结构调整 */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-orange-600" />
                    菜单结构调整建议
                  </h3>
                  <div className="text-sm space-y-3">
                    <div>
                      <h4 className="font-medium">数据中心模块重组</h4>
                      <p className="text-muted-foreground">
                        建议将"实时协作"移至项目管理，"微信集成"移至系统设置下的第三方集成分类
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium">权限管理整合</h4>
                      <p className="text-muted-foreground">
                        统一用户管理和系统设置中的权限功能，避免功能重复和用户困惑
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
