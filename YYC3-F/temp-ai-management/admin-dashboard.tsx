"use client";

import { useState } from "react";
import {
  Users,
  FileText,
  BarChart3,
  Brain,
  Briefcase,
  Settings,
  ChevronDown,
  Search,
  Bell,
  User,
  Menu,
  Shield,
  UserX,
  TrendingUp,
  PieChart,
  FileBarChart,
  Activity,
  Cpu,
  Database,
  Code,
  BookOpen,
  FolderOpen,
  Cloud,
  Building,
  Package,
  UserCheck,
  Wrench,
  GitBranch,
  ClipboardList,
  CheckCircle,
  BarChart,
  Sliders,
  Lock,
  Home,
  Target,
  Calendar,
  Zap,
  Rocket,
  UserPlus,
  UserCog,
  LineChart,
  Monitor,
  AlertTriangle,
  BriefcaseIcon,
  CreditCard,
  ShoppingCart,
  Phone,
  Key,
  Eye,
  Navigation as Notification,
  Paintbrush,
  Languages,
  Tablet,
  UserCircle,
  Edit,
  Camera,
  MapPin,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const menuItems = [
  {
    title: "仪表盘",
    icon: Home,
    href: "/dashboard",
  },
  {
    title: "用户管理",
    icon: Users,
    children: [
      { title: "用户列表", icon: Users, href: "/users" },
      { title: "用户详情", icon: UserCircle, href: "/user-details" },
      { title: "新增用户", icon: UserPlus, href: "/add-user" },
      { title: "角色权限", icon: Shield, href: "/roles" },
      { title: "用户配置", icon: UserCog, href: "/user-config" },
      { title: "封禁管理", icon: UserX, href: "/bans" },
    ],
  },
  {
    title: "数据分析",
    icon: BarChart3,
    children: [
      { title: "数据概览", icon: PieChart, href: "/analytics" },
      { title: "用户分析", icon: BarChart, href: "/user-analytics" },
      { title: "业务分析", icon: LineChart, href: "/business-analytics" },
      { title: "报表中心", icon: FileBarChart, href: "/reports" },
      { title: "实时监控", icon: Monitor, href: "/monitoring" },
      { title: "数据预警", icon: AlertTriangle, href: "/alerts" },
    ],
  },
  {
    title: "智能引擎",
    icon: Brain,
    children: [
      { title: "AI 智能", icon: Cpu, href: "/ai" },
      { title: "机器学习", icon: Brain, href: "/machine-learning" },
      { title: "数据挖掘", icon: Database, href: "/data-mining" },
      { title: "存储管理", icon: Database, href: "/storage" },
      { title: "开发环境", icon: Code, href: "/development" },
      { title: "知识智库", icon: BookOpen, href: "/knowledge" },
      { title: "文件管理", icon: FolderOpen, href: "/files" },
      { title: "云端同步", icon: Cloud, href: "/sync" },
    ],
  },
  {
    title: "商务功能",
    icon: Briefcase,
    children: [
      { title: "商务管理", icon: BriefcaseIcon, href: "/business" },
      { title: "财务管理", icon: CreditCard, href: "/finance" },
      { title: "订单管理", icon: ShoppingCart, href: "/orders" },
      { title: "ERP系统", icon: Package, href: "/erp" },
      { title: "CRM客户", icon: UserCheck, href: "/crm" },
      { title: "供应链", icon: Building, href: "/supply-chain" },
      { title: "技术平台", icon: Wrench, href: "/platform" },
      { title: "API管理", icon: Code, href: "/api" },
    ],
  },
  {
    title: "工作流管理",
    icon: GitBranch,
    children: [
      { title: "工作流概览", icon: BarChart3, href: "/workflow/overview" },
      { title: "流程设计", icon: GitBranch, href: "/workflow/designer" },
      { title: "我的任务", icon: ClipboardList, href: "/workflow/tasks" },
      { title: "审批中心", icon: CheckCircle, href: "/workflow/approval" },
      { title: "流程实例", icon: Activity, href: "/workflow/instances" },
      { title: "统计分析", icon: BarChart, href: "/workflow/statistics" },
    ],
  },
  {
    title: "系统设置",
    icon: Settings,
    children: [
      { title: "常规设置", icon: Sliders, href: "/settings/general" },
      { title: "安全设置", icon: Lock, href: "/settings/security" },
      { title: "权限管理", icon: Key, href: "/settings/permissions" },
      { title: "隐私设置", icon: Eye, href: "/settings/privacy" },
      {
        title: "通知设置",
        icon: Notification,
        href: "/settings/notifications",
      },
      { title: "外观设置", icon: Paintbrush, href: "/settings/appearance" },
      { title: "语言设置", icon: Languages, href: "/settings/language" },
      { title: "移动设置", icon: Tablet, href: "/settings/mobile" },
    ],
  },
  {
    title: "项目管理",
    icon: Target,
    children: [
      { title: "项目概览", icon: Target, href: "/projects" },
      { title: "任务管理", icon: ClipboardList, href: "/tasks" },
      { title: "开发执行", icon: Zap, href: "/project-execution" },
      { title: "敏捷工作流", icon: GitBranch, href: "/agile-workflow" },
      { title: "CI/CD流水线", icon: Rocket, href: "/ci-cd-pipeline" },
      { title: "开发路线图", icon: Calendar, href: "/roadmap" },
      { title: "技术规范", icon: Code, href: "/specifications" },
      { title: "现状分析", icon: ClipboardList, href: "/status-analysis" },
      { title: "分析报告", icon: FileText, href: "/analysis-report" },
    ],
  },
  {
    title: "个人资料",
    icon: User,
    children: [
      { title: "基本信息", icon: UserCircle, href: "/profile/basic" },
      { title: "编辑资料", icon: Edit, href: "/profile/edit" },
      { title: "头像设置", icon: Camera, href: "/profile/avatar" },
      { title: "联系方式", icon: Phone, href: "/profile/contact" },
      { title: "地址信息", icon: MapPin, href: "/profile/address" },
      { title: "账户安全", icon: Shield, href: "/profile/security" },
    ],
  },
];

export default function Component() {
  const [activeMenu, setActiveMenu] = useState("仪表盘");
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              言枢象限
            </h1>
            <p className="text-xs text-muted-foreground">语启未来</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <div key={item.title}>
            {item.children ? (
              <Collapsible
                open={openMenus.includes(item.title)}
                onOpenChange={() => toggleMenu(item.title)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant={activeMenu === item.title ? "secondary" : "ghost"}
                    className="w-full justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        openMenus.includes(item.title) ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {item.children.map((child) => (
                    <Button
                      key={child.title}
                      variant={activeMenu === child.title ? "default" : "ghost"}
                      className="w-full justify-start pl-8 text-sm"
                      onClick={() => setActiveMenu(child.title)}
                    >
                      <child.icon className="w-4 h-4 mr-3" />
                      {child.title}
                    </Button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <Button
                variant={activeMenu === item.title ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveMenu(item.title)}
              >
                <item.icon className="w-4 h-4 mr-3" />
                {item.title}
              </Button>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="text-xs text-center text-muted-foreground">
          <p>万象归元于云枢</p>
          <p className="mt-1">深栈智启新纪元</p>
        </div>
      </div>
    </div>
  );

  // 根据当前菜单渲染不同的内容
  const renderContent = () => {
    switch (activeMenu) {
      case "仪表盘":
        return (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总用户数</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12,345</div>
                <p className="text-xs text-muted-foreground">+20.1% 较上月</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">内容总数</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8,967</div>
                <p className="text-xs text-muted-foreground">+15.3% 较上月</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI处理量</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45,678</div>
                <p className="text-xs text-muted-foreground">+32.5% 较上月</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">系统状态</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">正常</div>
                <p className="text-xs text-muted-foreground">99.9% 运行时间</p>
              </CardContent>
            </Card>
          </div>
        );

      // 用户管理相关页面
      case "用户列表":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">用户列表</h2>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                新增用户
              </Button>
            </div>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage
                            src={`/generic-placeholder-graphic.png?height=40&width=40`}
                          />
                          <AvatarFallback>用户{i}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">用户{i}</p>
                          <p className="text-sm text-muted-foreground">
                            user{i}@example.com
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">活跃</Badge>
                        <Button variant="outline" size="sm">
                          编辑
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "角色权限":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">角色权限管理</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {["管理员", "编辑者", "查看者"].map((role) => (
                <Card key={role}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="w-5 h-5 mr-2" />
                      {role}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">用户管理</span>
                        <Badge
                          variant={role === "管理员" ? "default" : "secondary"}
                        >
                          {role === "管理员"
                            ? "完全访问"
                            : role === "编辑者"
                            ? "编辑"
                            : "只读"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">数据分析</span>
                        <Badge
                          variant={role === "查看者" ? "secondary" : "default"}
                        >
                          {role === "查看者" ? "只读" : "完全访问"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">系统设置</span>
                        <Badge
                          variant={role === "管理员" ? "default" : "secondary"}
                        >
                          {role === "管理员" ? "完全访问" : "禁止"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      // 数据分析相关页面
      case "数据概览":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">数据概览</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    今日访问量
                  </CardTitle>
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2,847</div>
                  <p className="text-xs text-muted-foreground">+12.5% 较昨日</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">转化率</CardTitle>
                  <LineChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3.2%</div>
                  <p className="text-xs text-muted-foreground">+0.3% 较上周</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    活跃用户
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,234</div>
                  <p className="text-xs text-muted-foreground">+8.1% 较上月</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">收入</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">¥45,231</div>
                  <p className="text-xs text-muted-foreground">+20.1% 较上月</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "实时监控":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">实时监控</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Monitor className="w-5 h-5 mr-2" />
                    系统状态
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>CPU使用率</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div className="w-3/4 h-2 bg-green-500 rounded-full"></div>
                        </div>
                        <span className="text-sm">75%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>内存使用率</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div className="w-1/2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                        <span className="text-sm">50%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>磁盘使用率</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div className="w-1/3 h-2 bg-yellow-500 rounded-full"></div>
                        </div>
                        <span className="text-sm">33%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    网络状态
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>上行带宽</span>
                      <span className="text-sm font-medium">125 Mbps</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>下行带宽</span>
                      <span className="text-sm font-medium">89 Mbps</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>延迟</span>
                      <span className="text-sm font-medium">12ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>丢包率</span>
                      <span className="text-sm font-medium text-green-600">
                        0%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      // 智能引擎相关页面
      case "AI 智能":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">AI 智能中心</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="w-5 h-5 mr-2" />
                    智能分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    基于机器学习的数据分析和预测
                  </p>
                  <Button className="w-full">启动分析</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Cpu className="w-5 h-5 mr-2" />
                    模型训练
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    训练和优化AI模型
                  </p>
                  <Button className="w-full bg-transparent" variant="outline">
                    查看模型
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="w-5 h-5 mr-2" />
                    数据处理
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    自动化数据清洗和预处理
                  </p>
                  <Button className="w-full bg-transparent" variant="outline">
                    处理数据
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      // 商务功能相关页面
      case "商务管理":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">商务管理</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    月度收入
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">¥156,780</div>
                  <p className="text-xs text-muted-foreground">+12.5% 较上月</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    订单数量
                  </CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,234</div>
                  <p className="text-xs text-muted-foreground">+8.1% 较上月</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    客户数量
                  </CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">567</div>
                  <p className="text-xs text-muted-foreground">+15.3% 较上月</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">转化率</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3.2%</div>
                  <p className="text-xs text-muted-foreground">+0.3% 较上月</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      // 系统设置相关页面
      case "常规设置":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">常规设置</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>系统信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>系统版本</span>
                    <span className="font-medium">v3.0.1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>最后更新</span>
                    <span className="font-medium">2024-01-15</span>
                  </div>
                  <div className="flex justify-between">
                    <span>运行时间</span>
                    <span className="font-medium">15天 8小时</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>基础配置</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>自动备份</span>
                    <Badge variant="secondary">已启用</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>日志记录</span>
                    <Badge variant="secondary">已启用</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>邮件通知</span>
                    <Badge variant="outline">已禁用</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      // 项目管理相关页面
      case "项目概览":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">项目概览</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {["YanYu Cloud³", "智能分析系统", "移动端应用"].map(
                (project, i) => (
                  <Card key={project}>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Target className="w-5 h-5 mr-2" />
                        {project}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm">进度</span>
                          <span className="text-sm font-medium">
                            {85 - i * 15}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${85 - i * 15}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>开始时间: 2024-01-01</span>
                          <span>预计完成: 2024-03-01</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          </div>
        );

      // 个人资料相关页面
      case "基本信息":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">基本信息</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCircle className="w-5 h-5 mr-2" />
                    个人信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src="/placeholder.svg?height=64&width=64" />
                      <AvatarFallback>管理</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">系统管理员</h3>
                      <p className="text-sm text-muted-foreground">
                        admin@yanyu.cloud
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>用户ID</span>
                      <span className="font-medium">001</span>
                    </div>
                    <div className="flex justify-between">
                      <span>注册时间</span>
                      <span className="font-medium">2024-01-01</span>
                    </div>
                    <div className="flex justify-between">
                      <span>最后登录</span>
                      <span className="font-medium">2024-01-15 14:30</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    账户安全
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>双因素认证</span>
                    <Badge variant="secondary">已启用</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>密码强度</span>
                    <Badge>强</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>登录保护</span>
                    <Badge variant="secondary">已启用</Badge>
                  </div>
                  <Button className="w-full bg-transparent" variant="outline">
                    修改密码
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>{activeMenu}</CardTitle>
              <CardDescription>
                {activeMenu}功能模块正在开发中，敬请期待...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>智能引擎正在为您准备{activeMenu}功能</p>
                  <p className="text-sm mt-2">万象归元于云枢，深栈智启新纪元</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-4 gap-4">
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <SidebarContent />
              </SheetContent>
            </Sheet>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="搜索功能、用户、内容..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs">
                  3
                </Badge>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src="/placeholder.svg?height=32&width=32"
                        alt="用户头像"
                      />
                      <AvatarFallback>管理</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        系统管理员
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        admin@yanyu.cloud
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveMenu("基本信息")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>个人资料</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveMenu("常规设置")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>设置</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>退出登录</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">
                {activeMenu}
              </h1>
              <p className="text-muted-foreground mt-2">
                {activeMenu === "仪表盘"
                  ? "欢迎使用言枢象限智能管理平台，开启数字化管理新体验"
                  : `${activeMenu}功能模块 - 专业的企业级管理解决方案`}
              </p>
            </div>

            {/* Dynamic Content */}
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
