"use client"

import { useState, useEffect } from "react"
import {
  Shield,
  Users,
  Settings,
  Edit,
  Trash2,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  Smartphone,
  Monitor,
  Tablet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"

import { AnimatedContainer } from "../design-system/animation-system"
import { EnhancedCard } from "../design-system/enhanced-card-system"
import { useSound } from "../design-system/sound-system"

interface Role {
  id: string
  name: string
  description: string
  userCount: number
  permissions: string[]
  isSystem: boolean
  createdAt: Date
  updatedAt: Date
  status: "active" | "inactive" | "deprecated"
  riskLevel: "low" | "medium" | "high"
}

interface Permission {
  id: string
  name: string
  description: string
  category: string
  riskLevel: "low" | "medium" | "high"
  dependencies: string[]
  mobileSupported: boolean
}

interface PermissionTemplate {
  id: string
  name: string
  description: string
  permissions: string[]
  targetRole: string
}

export function RolePermissions() {
  const [selectedRole, setSelectedRole] = useState<string>("admin")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [deviceView, setDeviceView] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [showRiskAnalysis, setShowRiskAnalysis] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const { playSound } = useSound()

  const roles: Role[] = [
    {
      id: "admin",
      name: "超级管理员",
      description: "拥有系统所有权限",
      userCount: 2,
      permissions: ["user_manage", "data_view", "system_config", "role_manage", "ai_access", "mobile_admin"],
      isSystem: true,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-15"),
      status: "active",
      riskLevel: "high",
    },
    {
      id: "manager",
      name: "部门经理",
      description: "部门管理权限",
      userCount: 8,
      permissions: ["user_view", "data_view", "report_generate", "team_manage", "mobile_view"],
      isSystem: false,
      createdAt: new Date("2024-01-05"),
      updatedAt: new Date("2024-01-20"),
      status: "active",
      riskLevel: "medium",
    },
    {
      id: "employee",
      name: "普通员工",
      description: "基础操作权限",
      userCount: 45,
      permissions: ["data_view", "profile_edit", "mobile_view"],
      isSystem: false,
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date("2024-01-25"),
      status: "active",
      riskLevel: "low",
    },
    {
      id: "guest",
      name: "访客用户",
      description: "只读权限",
      userCount: 12,
      permissions: ["data_view"],
      isSystem: true,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      status: "active",
      riskLevel: "low",
    },
  ]

  const permissions: Permission[] = [
    {
      id: "user_manage",
      name: "用户管理",
      description: "创建、编辑、删除用户",
      category: "用户权限",
      riskLevel: "high",
      dependencies: [],
      mobileSupported: true,
    },
    {
      id: "user_view",
      name: "用户查看",
      description: "查看用户列表和详情",
      category: "用户权限",
      riskLevel: "low",
      dependencies: [],
      mobileSupported: true,
    },
    {
      id: "role_manage",
      name: "角色管理",
      description: "管理角色和权限",
      category: "用户权限",
      riskLevel: "high",
      dependencies: ["user_manage"],
      mobileSupported: false,
    },
    {
      id: "data_view",
      name: "数据查看",
      description: "查看业务数据",
      category: "数据权限",
      riskLevel: "low",
      dependencies: [],
      mobileSupported: true,
    },
    {
      id: "data_export",
      name: "数据导出",
      description: "导出业务数据",
      category: "数据权限",
      riskLevel: "medium",
      dependencies: ["data_view"],
      mobileSupported: false,
    },
    {
      id: "report_generate",
      name: "报表生成",
      description: "生成各类报表",
      category: "数据权限",
      riskLevel: "medium",
      dependencies: ["data_view"],
      mobileSupported: true,
    },
    {
      id: "system_config",
      name: "系统配置",
      description: "修改系统设置",
      category: "系统权限",
      riskLevel: "high",
      dependencies: [],
      mobileSupported: false,
    },
    {
      id: "profile_edit",
      name: "资料编辑",
      description: "编辑个人资料",
      category: "基础权限",
      riskLevel: "low",
      dependencies: [],
      mobileSupported: true,
    },
    {
      id: "ai_access",
      name: "AI功能访问",
      description: "使用AI分析和预测功能",
      category: "AI权限",
      riskLevel: "medium",
      dependencies: ["data_view"],
      mobileSupported: true,
    },
    {
      id: "team_manage",
      name: "团队管理",
      description: "管理团队成员和任务",
      category: "管理权限",
      riskLevel: "medium",
      dependencies: ["user_view"],
      mobileSupported: true,
    },
    {
      id: "mobile_admin",
      name: "移动端管理",
      description: "移动端管理功能",
      category: "移动权限",
      riskLevel: "medium",
      dependencies: [],
      mobileSupported: true,
    },
    {
      id: "mobile_view",
      name: "移动端查看",
      description: "移动端基础查看功能",
      category: "移动权限",
      riskLevel: "low",
      dependencies: [],
      mobileSupported: true,
    },
  ]

  const permissionTemplates: PermissionTemplate[] = [
    {
      id: "sales_template",
      name: "销售人员模板",
      description: "适用于销售团队的权限配置",
      permissions: ["data_view", "report_generate", "profile_edit", "mobile_view"],
      targetRole: "销售人员",
    },
    {
      id: "analyst_template",
      name: "数据分析师模板",
      description: "适用于数据分析师的权限配置",
      permissions: ["data_view", "data_export", "report_generate", "ai_access", "mobile_view"],
      targetRole: "数据分析师",
    },
    {
      id: "mobile_user_template",
      name: "移动端用户模板",
      description: "专为移动端用户设计的权限配置",
      permissions: ["data_view", "profile_edit", "mobile_view", "mobile_admin"],
      targetRole: "移动端用户",
    },
  ]

  const currentRole = roles.find((role) => role.id === selectedRole)

  // 根据搜索和筛选条件过滤权限
  const filteredPermissions = permissions.filter((permission) => {
    const matchesSearch =
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === "all" || permission.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const permissionsByCategory = filteredPermissions.reduce(
    (acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = []
      }
      acc[permission.category].push(permission)
      return acc
    },
    {} as Record<string, Permission[]>,
  )

  const hasPermission = (permissionId: string) => {
    return currentRole?.permissions.includes(permissionId) || false
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200"
      case "medium":
        return "text-orange-600 bg-orange-50 border-orange-200"
      case "low":
        return "text-green-600 bg-green-50 border-green-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const calculateRoleRisk = (role: Role) => {
    const highRiskPerms = role.permissions.filter(
      (permId) => permissions.find((p) => p.id === permId)?.riskLevel === "high",
    ).length
    const mediumRiskPerms = role.permissions.filter(
      (permId) => permissions.find((p) => p.id === permId)?.riskLevel === "medium",
    ).length

    return (highRiskPerms * 3 + mediumRiskPerms * 2) / role.permissions.length
  }

  // 检测设备类型
  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth
      if (width < 768) {
        setDeviceView("mobile")
      } else if (width < 1024) {
        setDeviceView("tablet")
      } else {
        setDeviceView("desktop")
      }
    }

    checkDeviceType()
    window.addEventListener("resize", checkDeviceType)
    return () => window.removeEventListener("resize", checkDeviceType)
  }, [])

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    playSound("click")

    // 检查依赖关系
    const permission = permissions.find((p) => p.id === permissionId)
    if (checked && permission?.dependencies.length) {
      const missingDeps = permission.dependencies.filter((dep) => !hasPermission(dep))
      if (missingDeps.length > 0) {
        alert(`需要先启用依赖权限: ${missingDeps.map((dep) => permissions.find((p) => p.id === dep)?.name).join(", ")}`)
        return
      }
    }

    console.log(`${permission?.name}: ${checked}`)
  }

  const applyTemplate = (template: PermissionTemplate) => {
    setSelectedPermissions(template.permissions)
    playSound("success")
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
      {/* 设备视图切换器 - 仅开发时显示 */}
      <div className="flex justify-end space-x-2 mb-4 lg:hidden">
        <Button
          variant={deviceView === "mobile" ? "default" : "outline"}
          size="sm"
          onClick={() => setDeviceView("mobile")}
        >
          <Smartphone className="w-4 h-4" />
        </Button>
        <Button
          variant={deviceView === "tablet" ? "default" : "outline"}
          size="sm"
          onClick={() => setDeviceView("tablet")}
        >
          <Tablet className="w-4 h-4" />
        </Button>
        <Button
          variant={deviceView === "desktop" ? "default" : "outline"}
          size="sm"
          onClick={() => setDeviceView("desktop")}
        >
          <Monitor className="w-4 h-4" />
        </Button>
      </div>

      {/* 头部操作栏 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
            权限管理中心
          </h2>
          <p className="text-sm text-muted-foreground">智能权限配置与风险管控</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Button variant="outline" size="sm" onClick={() => setShowRiskAnalysis(!showRiskAnalysis)}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            {showRiskAnalysis ? "隐藏" : "显示"}风险分析
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                新建角色
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>创建新角色</DialogTitle>
                <DialogDescription>配置新角色的基本信息和权限</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role-name">角色名称</Label>
                    <Input id="role-name" placeholder="输入角色名称" />
                  </div>
                  <div>
                    <Label htmlFor="role-status">状态</Label>
                    <Select defaultValue="active">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">激活</SelectItem>
                        <SelectItem value="inactive">停用</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="role-description">角色描述</Label>
                  <Textarea id="role-description" placeholder="描述角色的用途和职责" />
                </div>

                {/* 权限模板选择 */}
                <div>
                  <Label>权限模板</Label>
                  <div className="grid gap-2 mt-2">
                    {permissionTemplates.map((template) => (
                      <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          <p className="text-xs text-muted-foreground">{template.description}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => applyTemplate(template)}>
                          应用
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button
                  onClick={() => {
                    setIsCreateDialogOpen(false)
                    playSound("success")
                  }}
                >
                  创建角色
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 风险分析面板 */}
      {showRiskAnalysis && (
        <AnimatedContainer animation="slideDown">
          <EnhancedCard variant="modern" className="border-orange-200 bg-orange-50/30">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-700">
                <AlertTriangle className="w-5 h-5 mr-2" />
                权限风险分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {roles.map((role) => {
                  const riskScore = calculateRoleRisk(role)
                  return (
                    <div key={role.id} className="p-3 bg-white rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{role.name}</span>
                        <Badge
                          variant={
                            role.riskLevel === "high"
                              ? "destructive"
                              : role.riskLevel === "medium"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {role.riskLevel === "high" ? "高风险" : role.riskLevel === "medium" ? "中风险" : "低风险"}
                        </Badge>
                      </div>
                      <Progress value={riskScore * 20} className="h-2 mb-2" />
                      <div className="text-xs text-muted-foreground">
                        {role.userCount} 个用户 • 风险评分: {riskScore.toFixed(1)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>
      )}

      <div className={`grid gap-6 ${deviceView === "mobile" ? "grid-cols-1" : "lg:grid-cols-3"}`}>
        {/* 角色列表 */}
        <AnimatedContainer animation="slideLeft" className={deviceView === "mobile" ? "order-2" : ""}>
          <EnhancedCard variant="modern">
            <CardHeader>
              <CardTitle className="flex items-center text-sm sm:text-base">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                角色列表
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">选择要管理的角色</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索角色..."
                  className="pl-10 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {roles
                .filter(
                  (role) =>
                    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    role.description.toLowerCase().includes(searchTerm.toLowerCase()),
                )
                .map((role) => (
                  <div
                    key={role.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedRole === role.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => {
                      setSelectedRole(role.id)
                      playSound("click")
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{role.name}</h4>
                          {role.isSystem && (
                            <Badge variant="outline" className="text-xs">
                              系统
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{role.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {role.userCount}
                          </Badge>
                          <div className={`text-xs px-2 py-1 rounded-full border ${getRiskColor(role.riskLevel)}`}>
                            {role.riskLevel === "high" ? "高风险" : role.riskLevel === "medium" ? "中风险" : "低风险"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        {/* 权限配置 */}
        <div className={`${deviceView === "mobile" ? "order-1 col-span-1" : "lg:col-span-2"}`}>
          <AnimatedContainer animation="slideRight" delay={100}>
            <EnhancedCard variant="modern">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div>
                    <CardTitle className="flex items-center text-sm sm:text-base">
                      <Settings className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      {currentRole?.name} 权限配置
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">{currentRole?.description}</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      编辑
                    </Button>
                    {!currentRole?.isSystem && (
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        删除
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 筛选和搜索 */}
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索权限..."
                      className="pl-10 text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">所有分类</SelectItem>
                      <SelectItem value="用户权限">用户权限</SelectItem>
                      <SelectItem value="数据权限">数据权限</SelectItem>
                      <SelectItem value="系统权限">系统权限</SelectItem>
                      <SelectItem value="AI权限">AI权限</SelectItem>
                      <SelectItem value="移动权限">移动权限</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 权限列表 */}
                <Tabs defaultValue="permissions" className="w-full">
                  <TabsList className={`${deviceView === "mobile" ? "grid-cols-2" : "grid-cols-3"} w-full`}>
                    <TabsTrigger value="permissions" className="text-xs sm:text-sm">
                      权限配置
                    </TabsTrigger>
                    <TabsTrigger value="mobile" className="text-xs sm:text-sm">
                      移动端权限
                    </TabsTrigger>
                    {deviceView !== "mobile" && (
                      <TabsTrigger value="audit" className="text-xs sm:text-sm">
                        审计日志
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="permissions" className="space-y-4 mt-4">
                    {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                      <div key={category}>
                        <h4 className="font-medium mb-3 text-sm sm:text-base flex items-center">
                          {category}
                          <Badge variant="outline" className="ml-2 text-xs">
                            {categoryPermissions.length}
                          </Badge>
                        </h4>
                        <div className="space-y-2 sm:space-y-3">
                          {categoryPermissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-white"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <Label htmlFor={permission.id} className="font-medium text-xs sm:text-sm">
                                    {permission.name}
                                  </Label>
                                  {hasPermission(permission.id) && (
                                    <Badge variant="default" className="text-xs">
                                      已授权
                                    </Badge>
                                  )}
                                  {permission.riskLevel === "high" && (
                                    <Badge variant="destructive" className="text-xs">
                                      高风险
                                    </Badge>
                                  )}
                                  {!permission.mobileSupported && deviceView === "mobile" && (
                                    <Badge variant="secondary" className="text-xs">
                                      桌面端专用
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{permission.description}</p>
                                {permission.dependencies.length > 0 && (
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs text-orange-600">依赖:</span>
                                    {permission.dependencies.map((dep) => (
                                      <Badge key={dep} variant="outline" className="text-xs">
                                        {permissions.find((p) => p.id === dep)?.name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                {permission.riskLevel === "high" && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                <Switch
                                  id={permission.id}
                                  checked={hasPermission(permission.id)}
                                  onCheckedChange={(checked) => handlePermissionToggle(permission.id, checked)}
                                  disabled={currentRole?.isSystem && permission.riskLevel === "high"}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <Separator className="mt-4" />
                      </div>
                    ))}

                    <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
                      <Button variant="outline">取消</Button>
                      <Button onClick={() => playSound("success")}>保存权限</Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="mobile" className="space-y-4 mt-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Smartphone className="w-5 h-5 text-blue-600" />
                        <h4 className="font-medium text-blue-700">移动端权限配置</h4>
                      </div>
                      <p className="text-sm text-blue-600 mb-4">配置用户在移动设备上的权限访问</p>

                      <div className="space-y-3">
                        {permissions
                          .filter((p) => p.mobileSupported)
                          .map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border"
                            >
                              <div>
                                <Label className="font-medium text-sm">{permission.name}</Label>
                                <p className="text-xs text-muted-foreground">{permission.description}</p>
                              </div>
                              <Switch
                                checked={hasPermission(permission.id)}
                                onCheckedChange={(checked) => handlePermissionToggle(permission.id, checked)}
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  </TabsContent>

                  {deviceView !== "mobile" && (
                    <TabsContent value="audit" className="space-y-4 mt-4">
                      <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">权限审计日志功能开发中...</p>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>
        </div>
      </div>
    </div>
  )
}
