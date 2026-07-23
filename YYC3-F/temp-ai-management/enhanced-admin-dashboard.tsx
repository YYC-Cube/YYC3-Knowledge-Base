"use client"

import {
  Users,
  BarChart3,
  Brain,
  Briefcase,
  Settings,
  Search,
  Menu,
  Shield,
  TrendingUp,
  PieChart,
  FileBarChart,
  Activity,
  Cpu,
  Cloud,
  Building,
  Sliders,
  Lock,
  Home,
  User,
  Target,
  UserPlus,
  UserCog,
  Ban,
  Eye,
  TrendingDown,
  AlertTriangle,
  Bot,
  Pickaxe,
  HardDrive,
  Terminal,
  Library,
  DollarSign,
  ShoppingCart,
  Factory,
  Headphones,
  Truck,
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
  Puzzle,
  Package,
  Store,
  Code,
  Zap,
  Server,
  Webhook,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"

import { LogoEnhanced } from "./components/design-system/logo-enhanced"
import { ScrollableNavigation } from "./components/design-system/scrollable-navigation"
import { EnhancedCard } from "./components/design-system/enhanced-card-system"
import { EnhancedButton } from "./components/design-system/enhanced-button-system"
import { AnimatedContainer, FloatingElement } from "./components/design-system/animation-system"
import { SeasonalTheme, useSeasonalTheme } from "./components/design-system/seasonal-themes"
import { SoundProvider, useSound, SoundButton } from "./components/design-system/sound-system"
import { SeasonalControls } from "./components/design-system/seasonal-controls"
import { HeaderActions } from "./components/design-system/header-actions"
import {
  ResponsiveContainer,
  SidebarContainer,
  MainContentContainer,
  HeaderContainer,
  ContentContainer,
  LogoContainer,
  NavigationContainer,
  FooterContainer,
  SearchContainer,
  ActionsContainer,
} from "./components/design-system/responsive-layout"

// 导入优化后的导航系统
import {
  NavigationProvider,
  EnhancedBreadcrumb,
  NavigationQuickAccess,
  NavigationStatusIndicator,
  useNavigationPersistence,
} from "./components/navigation/enhanced-navigation"

// 导入数据中心组件
import { DynamicDataCenter } from "./components/data-center/dynamic-data-center"
import { CollaborationEngine } from "./components/data-center/collaboration-engine"
import { WeChatIntegration } from "./components/data-center/wechat-integration"

// 导入开发计划组件
import { DevelopmentRoadmap } from "./docs/development-roadmap"
import { TechnicalSpecifications } from "./docs/technical-specifications"
import { CurrentStatusAnalysis } from "./docs/current-status-analysis"
import { DevelopmentAnalysisReport } from "./docs/development-analysis-report"

// 导入项目管理组件
import { DevelopmentExecution } from "./components/project-management/development-execution"
import { AgileWorkflow } from "./components/project-management/agile-workflow"

// 导入DevOps组件
import { CICDDashboard } from "./components/devops/ci-cd-dashboard"

// 导入用户管理组件
import { UserList } from "./components/user-management/user-list"
import { UserDetails } from "./components/user-management/user-details"
import { AddUser } from "./components/user-management/add-user"
import { RolePermissions } from "./components/user-management/role-permissions"
import { UserConfiguration } from "./components/user-management/user-configuration"
import { BanManagement } from "./components/user-management/ban-management"

// 导入数据分析组件
import { DataOverview } from "./components/data-analysis/data-overview"
import { UserAnalysis } from "./components/data-analysis/user-analysis"
import { BusinessAnalysis } from "./components/data-analysis/business-analysis"
import { ReportCenter } from "./components/data-analysis/report-center"
import { RealTimeMonitoring } from "./components/data-analysis/real-time-monitoring"
import { DataAlert } from "./components/data-analysis/data-alert"

// 导入智能引擎组件
import { AIDashboard } from "./components/ai-engine/ai-dashboard"
import { MachineLearning } from "./components/ai-engine/machine-learning"
import { DataMining } from "./components/ai-engine/data-mining"
import { StorageManagement } from "./components/ai-engine/storage-management"
import { DevelopmentEnvironment } from "./components/ai-engine/development-environment"
import { KnowledgeBase } from "./components/ai-engine/knowledge-base"

// 导入商务功能组件
import { BusinessManagement } from "./components/business/business-management"
import { FinanceManagement } from "./components/business/finance-management"
import { OrderManagement } from "./components/business/order-management"
import { ERPSystem } from "./components/business/erp-system"
import { CRMCustomer } from "./components/business/crm-customer"
import { SupplyChain } from "./components/business/supply-chain"

// 导入系统设置组件
import { GeneralSettings } from "./components/system-settings/general-settings"
import { SecuritySettings } from "./components/system-settings/security-settings"
import { PermissionManagement } from "./components/system-settings/permission-management"
import { PrivacySettings } from "./components/system-settings/privacy-settings"
import { NotificationSettings } from "./components/system-settings/notification-settings"
import { AppearanceSettings } from "./components/system-settings/appearance-settings"

// 导入项目管理组件
import { ProjectOverview } from "./components/project-management/project-overview"
import { TaskManagement } from "./components/project-management/task-management"

// 导入个人资料组件
import { BasicInfo } from "./components/profile/basic-info"
import { EditProfile } from "./components/profile/edit-profile"
import { AvatarSettings } from "./components/profile/avatar-settings"
import { ContactInfo } from "./components/profile/contact-info"
import { AddressInfo } from "./components/profile/address-info"
import { AccountSecurity } from "./components/profile/account-security"

// 导入分析报告组件
import { NavigationStructureAnalysis } from "./docs/navigation-structure-analysis"
import { NavigationOptimizationReport } from "./docs/navigation-optimization-report"

// 导入插件系统组件
import { PluginManager } from "./components/plugin-system/plugin-manager"
import { PluginStore } from "./components/plugin-system/plugin-store"
import { PluginDeveloper } from "./components/plugin-system/plugin-developer"

// 导入多租户管理组件
import { TenantManagement } from "./components/multi-tenant/tenant-management"

// 导入集成平台组件
import { IntegrationHub } from "./components/integrations/integration-hub"
import { APIGateway } from "./components/integrations/api-gateway"
import { WebhookManager } from "./components/integrations/webhook-manager"

const menuItems = [
  {
    title: "数据中心",
    icon: Home,
    href: "/dashboard",
  },
  {
    title: "用户管理",
    icon: Users,
    children: [
      { title: "用户列表", icon: Users, href: "/users" },
      { title: "用户详情", icon: Eye, href: "/user-details" },
      { title: "新增用户", icon: UserPlus, href: "/add-user" },
      { title: "角色权限", icon: Shield, href: "/roles" },
      { title: "用户配置", icon: UserCog, href: "/user-config" },
      { title: "封禁管理", icon: Ban, href: "/bans" },
    ],
  },
  {
    title: "数据分析",
    icon: BarChart3,
    children: [
      { title: "数据概览", icon: PieChart, href: "/data-overview" },
      { title: "用户分析", icon: TrendingUp, href: "/user-analysis" },
      { title: "业务分析", icon: TrendingDown, href: "/business-analysis" },
      { title: "报表中心", icon: FileBarChart, href: "/reports" },
      { title: "实时监控", icon: Activity, href: "/monitoring" },
      { title: "数据预警", icon: AlertTriangle, href: "/data-alert" },
    ],
  },
  {
    title: "智能引擎",
    icon: Brain,
    children: [
      { title: "AI 智能", icon: Bot, href: "/ai" },
      { title: "机器学习", icon: Cpu, href: "/machine-learning" },
      { title: "数据挖掘", icon: Pickaxe, href: "/data-mining" },
      { title: "存储管理", icon: HardDrive, href: "/storage" },
      { title: "开发环境", icon: Terminal, href: "/development" },
      { title: "知识智库", icon: Library, href: "/knowledge" },
    ],
  },
  {
    title: "商务功能",
    icon: Briefcase,
    children: [
      { title: "商务管理", icon: Building, href: "/business" },
      { title: "财务管理", icon: DollarSign, href: "/finance" },
      { title: "订单管理", icon: ShoppingCart, href: "/orders" },
      { title: "ERP系统", icon: Factory, href: "/erp" },
      { title: "CRM客户", icon: Headphones, href: "/crm" },
      { title: "供应链", icon: Truck, href: "/supply-chain" },
    ],
  },
  {
    title: "系统设置",
    icon: Settings,
    children: [
      { title: "常规设置", icon: Sliders, href: "/settings/general" },
      { title: "安全设置", icon: Lock, href: "/settings/security" },
      { title: "权限管理", icon: UserShield, href: "/settings/permissions" },
      { title: "隐私设置", icon: EyeOff, href: "/settings/privacy" },
      { title: "通知设置", icon: Bell, href: "/settings/notifications" },
      { title: "外观设置", icon: Paintbrush, href: "/settings/appearance" },
    ],
  },
  {
    title: "项目管理",
    icon: Target,
    children: [
      { title: "项目概览", icon: FolderKanban, href: "/project-overview" },
      { title: "任务管理", icon: CheckSquare, href: "/task-management" },
      { title: "开发执行", icon: Play, href: "/project-execution" },
      { title: "敏捷工作流", icon: GitMerge, href: "/agile-workflow" },
      { title: "CI/CD流水线", icon: Pipeline, href: "/ci-cd-pipeline" },
      { title: "开发路线图", icon: Map, href: "/roadmap" },
    ],
  },
  {
    title: "个人资料",
    icon: User,
    children: [
      { title: "基本信息", icon: Info, href: "/profile/basic" },
      { title: "编辑资料", icon: Edit, href: "/profile/edit" },
      { title: "头像设置", icon: Camera, href: "/profile/avatar" },
      { title: "联系方式", icon: Phone, href: "/profile/contact" },
      { title: "地址信息", icon: MapPin, href: "/profile/address" },
      { title: "账户安全", icon: ShieldCheck, href: "/profile/security" },
    ],
  },
  {
    title: "插件系统",
    icon: Puzzle,
    children: [
      { title: "插件管理", icon: Package, href: "/plugin-manager" },
      { title: "插件商店", icon: Store, href: "/plugin-store" },
      { title: "开发者中心", icon: Code, href: "/plugin-developer" },
    ],
  },
  {
    title: "多租户管理",
    icon: Building,
    children: [{ title: "租户管理", icon: Building, href: "/tenant-management" }],
  },
  {
    title: "集成平台",
    icon: Zap,
    children: [
      { title: "集成中心", icon: Zap, href: "/integration-hub" },
      { title: "API网关", icon: Server, href: "/api-gateway" },
      { title: "Webhook管理", icon: Webhook, href: "/webhook-manager" },
    ],
  },
]

function AdminDashboardContent() {
  const { activeMenu, openMenus, toggleMenu, navigateToMenu, saveScrollPosition } = useNavigationPersistence()
  const seasonalTheme = useSeasonalTheme()
  const season = seasonalTheme?.season || "spring"
  const autoDetect = seasonalTheme?.autoDetect || false
  const changeSeason = seasonalTheme?.changeSeason || (() => {})
  const enableAutoDetect = seasonalTheme?.enableAutoDetect || (() => {})
  const soundHook = useSound()
  const playSound = soundHook?.playSound || (() => {})

  const handleMenuClick = (title: string) => {
    if (!title) return
    playSound("click")
    navigateToMenu(title)
  }

  const handleToggleMenu = (title: string) => {
    if (!title) return
    playSound("click")
    toggleMenu(title)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo区域 */}
      <LogoContainer>
        <AnimatedContainer animation="slideDown">
          <LogoEnhanced size="sm" variant="full" layout="vertical" animated />
        </AnimatedContainer>
      </LogoContainer>

      {/* 导航菜单 */}
      <NavigationContainer>
        <ScrollableNavigation
          menuItems={menuItems}
          activeMenu={activeMenu}
          openMenus={openMenus}
          onMenuClick={handleMenuClick}
          onToggleMenu={handleToggleMenu}
        />
      </NavigationContainer>

      {/* 快速访问和历史 */}
      <NavigationQuickAccess />

      {/* Footer */}
      <FooterContainer>
        <AnimatedContainer animation="slideUp">
          <div className="text-xs text-secondary-500">
            <p className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent font-medium">
              万象归元于云枢
            </p>
            <p className="mt-1">深栈智启新纪元</p>
          </div>
        </AnimatedContainer>
      </FooterContainer>
    </div>
  )

  // 根据当前菜单渲染不同的内容
  const renderContent = () => {
    switch (activeMenu) {
      // 数据中心
      case "数据中心":
        return <DynamicDataCenter />
      case "实时协作":
        return <CollaborationEngine />
      case "微信集成":
        return <WeChatIntegration />

      // 用户管理
      case "用户列表":
        return <UserList />
      case "用户详情":
        return <UserDetails />
      case "新增用户":
        return <AddUser />
      case "角色权限":
        return <RolePermissions />
      case "用户配置":
        return <UserConfiguration />
      case "封禁管理":
        return <BanManagement />

      // 数据分析
      case "数据概览":
        return <DataOverview />
      case "用户分析":
        return <UserAnalysis />
      case "业务分析":
        return <BusinessAnalysis />
      case "报表中心":
        return <ReportCenter />
      case "实时监控":
        return <RealTimeMonitoring />
      case "数据预警":
        return <DataAlert />

      // 智能引擎
      case "AI 智能":
        return <AIDashboard />
      case "机器学习":
        return <MachineLearning />
      case "数据挖掘":
        return <DataMining />
      case "存储管理":
        return <StorageManagement />
      case "开发环境":
        return <DevelopmentEnvironment />
      case "知识智库":
        return <KnowledgeBase />

      // 商务功能
      case "商务管理":
        return <BusinessManagement />
      case "财务管理":
        return <FinanceManagement />
      case "订单管理":
        return <OrderManagement />
      case "ERP系统":
        return <ERPSystem />
      case "CRM客户":
        return <CRMCustomer />
      case "供应链":
        return <SupplyChain />

      // 系统设置
      case "常规设置":
        return <GeneralSettings />
      case "安全设置":
        return <SecuritySettings />
      case "权限管理":
        return <PermissionManagement />
      case "隐私设置":
        return <PrivacySettings />
      case "通知设置":
        return <NotificationSettings />
      case "外观设置":
        return <AppearanceSettings />

      // 项目管理
      case "项目概览":
        return <ProjectOverview />
      case "任务管理":
        return <TaskManagement />
      case "开发执行":
        return <DevelopmentExecution />
      case "敏捷工作流":
        return <AgileWorkflow />
      case "CI/CD流水线":
        return <CICDDashboard />
      case "开发路线图":
        return <DevelopmentRoadmap />

      // 个人资料
      case "基本信息":
        return <BasicInfo />
      case "编辑资料":
        return <EditProfile />
      case "头像设置":
        return <AvatarSettings />
      case "联系方式":
        return <ContactInfo />
      case "地址信息":
        return <AddressInfo />
      case "账户安全":
        return <AccountSecurity />

      // 分析报告
      case "导航结构分析":
        return <NavigationStructureAnalysis />
      case "导航优化报告":
        return <NavigationOptimizationReport />

      // 插件系统
      case "插件管理":
        return <PluginManager />
      case "插件商店":
        return <PluginStore />
      case "开发者中心":
        return <PluginDeveloper />

      // 多租户管理
      case "租户管理":
        return <TenantManagement />

      // 集成平台
      case "集成中心":
        return <IntegrationHub />
      case "API网关":
        return <APIGateway />
      case "Webhook管理":
        return <WebhookManager />

      // 其他页面
      case "技术规范":
        return <TechnicalSpecifications />
      case "现状分析":
        return <CurrentStatusAnalysis />
      case "分析报告":
        return <DevelopmentAnalysisReport />

      default:
        return (
          <AnimatedContainer animation="fadeIn" delay={200}>
            <EnhancedCard variant="traditional" size="lg" glowEffect>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 sm:p-4 bg-gradient-to-r from-primary-500/10 to-accent-500/10 rounded-full w-fit">
                  <Cloud className="w-12 h-12 sm:w-16 sm:h-16 text-primary-500" />
                </div>
                <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                  {activeMenu}
                </CardTitle>
                <CardDescription className="text-base sm:text-lg text-secondary-600">
                  {activeMenu}功能模块正在开发中，敬请期待...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-24 sm:h-32">
                  <div className="text-center space-y-4">
                    <FloatingElement>
                      <div className="bg-gradient-to-r from-primary-500 via-accent-500 to-traditional-azure bg-clip-text text-transparent font-bold text-base sm:text-lg">
                        智能引擎正在为您准备{activeMenu}功能
                      </div>
                    </FloatingElement>
                    <div className="flex justify-center space-x-4">
                      <EnhancedButton variant="secondary" size="sm" glowEffect>
                        了解更多
                      </EnhancedButton>
                      <EnhancedButton variant="primary" size="sm" glowEffect>
                        申请体验
                      </EnhancedButton>
                    </div>
                  </div>
                </div>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>
        )
    }
  }

  return (
    <SeasonalTheme season={season} autoDetect={autoDetect}>
      <ResponsiveContainer className="bg-secondary-50/30">
        {/* Desktop Sidebar */}
        <SidebarContainer>
          <SidebarContent />
        </SidebarContainer>

        {/* Main Content */}
        <MainContentContainer>
          {/* Header */}
          <HeaderContainer>
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <SoundButton
                  variant="ghost"
                  size="icon"
                  className="lg:hidden h-8 w-8"
                  soundType="click"
                  aria-label="打开移动端导航菜单"
                >
                  <Menu className="h-4 w-4" />
                </SoundButton>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-44 sm:w-48">
                <SheetHeader className="sr-only">
                  <SheetTitle>导航菜单</SheetTitle>
                  <SheetDescription>YanYu Cloud³智能商务中心的主导航菜单</SheetDescription>
                </SheetHeader>
                <SidebarContent />
              </SheetContent>
            </Sheet>

            {/* Search */}
            <SearchContainer>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-secondary-400 w-3.5 h-3.5" />
                <Input
                  placeholder="搜索功能、用户、内容..."
                  className="pl-8 h-8 text-sm border-secondary-200 focus:border-primary-400 focus:ring-primary-400/20 bg-white/80 backdrop-blur-sm"
                  aria-label="全局搜索"
                />
              </div>
            </SearchContainer>

            {/* Navigation Status Indicator */}
            <NavigationStatusIndicator />

            {/* Actions */}
            <ActionsContainer>
              {/* Seasonal Controls - 在大屏幕上显示 */}
              <div className="hidden xl:block">
                <SeasonalControls
                  onSeasonChange={changeSeason}
                  onAutoDetectToggle={enableAutoDetect}
                  currentSeason={season}
                  autoDetect={autoDetect}
                />
              </div>

              {/* Header Actions */}
              <HeaderActions onMenuClick={handleMenuClick} activeMenu={activeMenu} />
            </ActionsContainer>
          </HeaderContainer>

          {/* Main Content Area */}
          <ContentContainer>
            {/* 面包屑导航 */}
            <EnhancedBreadcrumb />

            {/* Page Header */}
            <AnimatedContainer animation="fadeIn" className="mb-6 lg:mb-8">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                {activeMenu}
              </h1>
              <p className="text-secondary-600 mt-1 lg:mt-2 text-sm lg:text-base">{getPageDescription(activeMenu)}</p>
            </AnimatedContainer>

            {/* Dynamic Content */}
            {renderContent()}
          </ContentContainer>
        </MainContentContainer>
      </ResponsiveContainer>
    </SeasonalTheme>
  )
}

function getPageDescription(activeMenu: string): string {
  const descriptions: Record<string, string> = {
    数据中心: "实时数据监控与智能分析中心，提供全方位的业务洞察",
    用户列表: "完整的用户管理界面，包含搜索、筛选、用户详情管理",
    用户详情: "详细的用户个人信息展示和编辑功能",
    新增用户: "快速创建新用户账户，配置基本信息和权限",
    角色权限: "灵活的权限管理系统，支持角色分配和权限控制",
    用户配置: "个性化用户设置管理，优化用户体验",
    封禁管理: "用户状态管理，包括封禁、解封和状态监控",
    数据概览: "核心业务指标展示，提供数据驱动的决策支持",
    用户分析: "深度用户行为数据分析，洞察用户偏好和趋势",
    业务分析: "全面的业务指标和趋势分析，助力业务增长",
    报表中心: "专业的数据报表管理，支持自定义报表生成",
    实时监控: "系统性能实时监控，确保服务稳定运行",
    数据预警: "智能异常检测和告警系统，预防潜在问题",
    "AI 智能": "基于深度学习的智能助手、数据分析与个性化推荐系统",
    机器学习: "先进的机器学习模型训练和管理平台",
    数据挖掘: "强大的数据处理和分析工具，发现数据价值",
    存储管理: "智能数据存储监控和优化管理系统",
    开发环境: "完整的AI开发工具链，支持模型开发和部署",
    知识智库: "企业知识管理系统，构建智能知识图谱",
    商务管理: "全面的业务概览和KPI管理，驱动业务成功",
    财务管理: "专业的财务数据管理和分析系统",
    订单管理: "高效的订单处理系统，优化业务流程",
    ERP系统: "企业资源规划系统，整合业务流程",
    CRM客户: "客户关系管理系统，提升客户满意度",
    供应链: "智能供应链管理，优化资源配置",
    常规设置: "系统基础配置管理，个性化系统体验",
    安全设置: "全面的安全策略管理，保障系统安全",
    权限管理: "精细化用户权限控制，确保数据安全",
    隐私设置: "隐私保护配置管理，符合合规要求",
    通知设置: "智能消息通知管理，优化信息传递",
    外观设置: "个性化界面主题配置，提升用户体验",
    项目概览: "项目进度展示和管理，掌控项目全局",
    任务管理: "高效的任务分配和跟踪系统",
    开发执行: "基于分析报告的迭代开发计划执行与任务管理",
    敏捷工作流: "敏捷开发流程管理，Sprint规划与团队协作",
    "CI/CD流水线": "自动化构建、测试、部署流程管理与监控",
    开发路线图: "项目规划和里程碑管理，指导开发方向",
    基本信息: "个人基础信息展示和管理",
    编辑资料: "便捷的个人信息编辑功能",
    头像设置: "个性化头像管理和设置",
    联系方式: "联系信息管理和维护",
    地址信息: "地址信息管理和配置",
    账户安全: "账户安全设置和保护措施",
    导航结构分析: "导航系统结构分析和功能映射评估",
    导航优化报告: "导航交互体验优化的详细分析报告",
    插件管理: "管理和扩展系统功能的插件生态系统",
    插件商店: "发现和安装强大的业务插件",
    开发者中心: "开发、发布和管理您的插件",
    租户管理: "管理和监控所有租户实例",
    集成中心: "连接第三方服务，扩展系统功能",
    API网关: "管理API端点、密钥和访问控制",
    Webhook管理: "管理和监控Webhook端点和消息投递",
  }

  return descriptions[activeMenu] || "欢迎使用YanYu Cloud³智能商务中心，开启数字化管理新体验"
}

export default function EnhancedAdminDashboard() {
  return (
    <SoundProvider>
      <NavigationProvider>
        <AdminDashboardContent />
      </NavigationProvider>
    </SoundProvider>
  )
}
