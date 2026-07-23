"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Shield,
  Users,
  Key,
  Plus,
  Edit,
  Trash2,
  Eye,
  Settings,
  Database,
  FileText,
  BarChart3,
  UserCheck,
  Lock,
} from "lucide-react"

interface Role {
  id: string
  name: string
  description: string
  userCount: number
  permissions: string[]
  isSystem: boolean
  createdAt: string
}

interface Permission {
  id: string
  name: string
  description: string
  category: string
  isSystem: boolean
}

interface User {
  id: string
  name: string
  email: string
  roles: string[]
  status: "active" | "inactive" | "suspended"
  lastLogin: string
}

const mockRoles: Role[] = [
  {
    id: "1",
    name: "超级管理员",
    description: "拥有系统所有权限的最高管理员角色",
    userCount: 2,
    permissions: ["*"],
    isSystem: true,
    createdAt: "2023-01-01",
  },
  {
    id: "2",
    name: "系统管理员",
    description: "负责系统配置和用户管理的管理员",
    userCount: 5,
    permissions: ["user.manage", "system.config", "data.view", "report.generate"],
    isSystem: true,
    createdAt: "2023-01-01",
  },
  {
    id: "3",
    name: "业务管理员",
    description: "负责业务数据管理和分析的管理员",
    userCount: 8,
    permissions: ["data.manage", "report.generate", "order.manage", "customer.manage"],
    isSystem: false,
    createdAt: "2023-06-15",
  },
  {
    id: "4",
    name: "普通用户",
    description: "基础用户角色，只能查看和操作自己的数据",
    userCount: 156,
    permissions: ["data.view", "profile.edit"],
    isSystem: true,
    createdAt: "2023-01-01",
  },
]

const mockPermissions: Permission[] = [
  { id: "1", name: "user.manage", description: "用户管理", category: "用户管理", isSystem: true },
  { id: "2", name: "user.create", description: "创建用户", category: "用户管理", isSystem: true },
  { id: "3", name: "user.edit", description: "编辑用户", category: "用户管理", isSystem: true },
  { id: "4", name: "user.delete", description: "删除用户", category: "用户管理", isSystem: true },
  { id: "5", name: "data.view", description: "查看数据", category: "数据管理", isSystem: true },
  { id: "6", name: "data.manage", description: "管理数据", category: "数据管理", isSystem: true },
  { id: "7", name: "data.export", description: "导出数据", category: "数据管理", isSystem: true },
  { id: "8", name: "system.config", description: "系统配置", category: "系统管理", isSystem: true },
  { id: "9", name: "system.backup", description: "系统备份", category: "系统管理", isSystem: true },
  { id: "10", name: "report.generate", description: "生成报表", category: "报表管理", isSystem: true },
  { id: "11", name: "order.manage", description: "订单管理", category: "业务管理", isSystem: false },
  { id: "12", name: "customer.manage", description: "客户管理", category: "业务管理", isSystem: false },
  { id: "13", name: "profile.edit", description: "编辑个人资料", category: "个人设置", isSystem: true },
]

const mockUsers: User[] = [
  {
    id: "1",
    name: "张三",
    email: "zhangsan@example.com",
    roles: ["超级管理员"],
    status: "active",
    lastLogin: "2024-01-16 14:30:25",
  },
  {
    id: "2",
    name: "李四",
    email: "lisi@example.com",
    roles: ["系统管理员"],
    status: "active",
    lastLogin: "2024-01-16 13:45:12",
  },
  {
    id: "3",
    name: "王五",
    email: "wangwu@example.com",
    roles: ["业务管理员", "普通用户"],
    status: "active",
    lastLogin: "2024-01-16 12:20:33",
  },
]

export function PermissionManagement() {
  const [activeTab, setActiveTab] = useState("roles")
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false)
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false)

  const permissionsByCategory = mockPermissions.reduce(
    (acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = []
      }
      acc[permission.category].push(permission)
      return acc
    },
    {} as Record<string, Permission[]>,
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "inactive":
        return "bg-gray-100 text-gray-800"
      case "suspended":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "活跃"
      case "inactive":
        return "非活跃"
      case "suspended":
        return "已暂停"
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">权限管理</h2>
          <p className="text-muted-foreground">管理用户角色和权限分配</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            权限报告
          </Button>
          <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建角色
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>创建新角色</DialogTitle>
                <DialogDescription>定义角色名称、描述和权限</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="roleName">角色名称</Label>
                    <Input id="roleName" placeholder="输入角色名称" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roleStatus">角色状态</Label>
                    <Switch id="roleStatus" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roleDescription">角色描述</Label>
                  <Textarea id="roleDescription" placeholder="输入角色描述" />
                </div>
                <div className="space-y-4">
                  <Label>权限分配</Label>
                  {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="font-medium text-sm">{category}</h4>
                      <div className="grid grid-cols-2 gap-2 pl-4">
                        {permissions.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox id={`perm-${permission.id}`} />
                            <Label htmlFor={`perm-${permission.id}`} className="text-sm">
                              {permission.description}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateRoleOpen(false)}>
                  取消
                </Button>
                <Button onClick={() => setIsCreateRoleOpen(false)}>创建角色</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roles">角色管理</TabsTrigger>
          <TabsTrigger value="permissions">权限管理</TabsTrigger>
          <TabsTrigger value="users">用户权限</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                角色列表
              </CardTitle>
              <CardDescription>管理系统角色和权限分配</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>角色名称</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>用户数量</TableHead>
                      <TableHead>权限数量</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell className="max-w-48 truncate">{role.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{role.userCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {role.permissions.includes("*") ? "全部" : role.permissions.length}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={role.isSystem ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}
                          >
                            {role.isSystem ? "系统角色" : "自定义"}
                          </Badge>
                        </TableCell>
                        <TableCell>{role.createdAt}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedRole(role)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>角色详情 - {role.name}</DialogTitle>
                                </DialogHeader>
                                {selectedRole && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>角色名称</Label>
                                        <p className="mt-1 font-medium">{selectedRole.name}</p>
                                      </div>
                                      <div>
                                        <Label>用户数量</Label>
                                        <p className="mt-1">{selectedRole.userCount} 个用户</p>
                                      </div>
                                    </div>
                                    <div>
                                      <Label>角色描述</Label>
                                      <p className="mt-1">{selectedRole.description}</p>
                                    </div>
                                    <div>
                                      <Label>权限列表</Label>
                                      <div className="mt-2 space-y-2">
                                        {selectedRole.permissions.includes("*") ? (
                                          <Badge className="bg-red-100 text-red-800">所有权限</Badge>
                                        ) : (
                                          <div className="flex flex-wrap gap-2">
                                            {selectedRole.permissions.map((perm, index) => (
                                              <Badge key={index} variant="outline">
                                                {perm}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="sm" disabled={role.isSystem}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" disabled={role.isSystem}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="h-5 w-5 mr-2" />
                权限列表
              </CardTitle>
              <CardDescription>查看和管理系统权限</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      {category === "用户管理" && <Users className="h-5 w-5 mr-2" />}
                      {category === "数据管理" && <Database className="h-5 w-5 mr-2" />}
                      {category === "系统管理" && <Settings className="h-5 w-5 mr-2" />}
                      {category === "报表管理" && <BarChart3 className="h-5 w-5 mr-2" />}
                      {category === "业务管理" && <FileText className="h-5 w-5 mr-2" />}
                      {category === "个人设置" && <UserCheck className="h-5 w-5 mr-2" />}
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {permissions.map((permission) => (
                        <Card key={permission.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{permission.description}</h4>
                                <p className="text-sm text-muted-foreground font-mono">{permission.name}</p>
                              </div>
                              <Badge
                                className={
                                  permission.isSystem ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                                }
                              >
                                {permission.isSystem ? "系统" : "自定义"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                用户权限
              </CardTitle>
              <CardDescription>查看和管理用户的角色分配</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>最后登录</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(user.status)}>{getStatusLabel(user.status)}</Badge>
                        </TableCell>
                        <TableCell>{user.lastLogin}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Lock className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
