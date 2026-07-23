"use client"

import { useState } from "react"
import { User, Mail, Phone, MapPin, Calendar, Shield, Edit, Save, X, Camera } from "lucide-react"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AnimatedContainer } from "../design-system/animation-system"
import { EnhancedCard } from "../design-system/enhanced-card-system"
import { EnhancedButton } from "../design-system/enhanced-button-system"

export function UserDetails() {
  const [isEditing, setIsEditing] = useState(false)
  const [userInfo, setUserInfo] = useState({
    id: "USR-2024-001",
    name: "张三",
    email: "zhangsan@example.com",
    phone: "138-0013-8000",
    role: "管理员",
    status: "活跃",
    department: "技术部",
    position: "高级工程师",
    joinDate: "2023-03-15",
    lastLogin: "2024-01-15 14:30:25",
    address: "北京市朝阳区建国门外大街1号",
    bio: "资深全栈开发工程师，专注于React和Node.js技术栈，有5年以上项目开发经验。",
  })

  const handleSave = () => {
    setIsEditing(false)
    // 这里可以添加保存逻辑
  }

  const handleCancel = () => {
    setIsEditing(false)
    // 这里可以重置表单数据
  }

  const activityLogs = [
    { action: "登录系统", time: "2024-01-15 14:30:25", ip: "192.168.1.100" },
    { action: "修改个人资料", time: "2024-01-15 10:15:30", ip: "192.168.1.100" },
    { action: "创建项目", time: "2024-01-14 16:45:12", ip: "192.168.1.100" },
    { action: "上传文件", time: "2024-01-14 14:20:45", ip: "192.168.1.100" },
    { action: "登录系统", time: "2024-01-14 09:30:15", ip: "192.168.1.100" },
  ]

  const permissions = [
    { module: "用户管理", read: true, write: true, delete: false },
    { module: "内容管理", read: true, write: true, delete: true },
    { module: "数据分析", read: true, write: false, delete: false },
    { module: "系统设置", read: true, write: true, delete: false },
    { module: "财务管理", read: false, write: false, delete: false },
  ]

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">用户详情</h2>
          <p className="text-secondary-600">查看和编辑用户的详细信息</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <EnhancedButton variant="outline" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                取消
              </EnhancedButton>
              <EnhancedButton variant="primary" size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                保存
              </EnhancedButton>
            </>
          ) : (
            <EnhancedButton variant="primary" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              编辑资料
            </EnhancedButton>
          )}
        </div>
      </div>

      {/* 用户基本信息卡片 */}
      <AnimatedContainer animation="slideUp">
        <EnhancedCard variant="modern" size="lg" glowEffect>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src="/placeholder-user.jpg" alt={userInfo.name} />
                  <AvatarFallback className="text-lg">{userInfo.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full p-0 bg-transparent"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-2xl font-bold text-secondary-900">{userInfo.name}</h3>
                  <Badge variant={userInfo.status === "活跃" ? "default" : "secondary"}>{userInfo.status}</Badge>
                  <Badge variant="outline">{userInfo.role}</Badge>
                </div>
                <div className="flex items-center space-x-4 text-sm text-secondary-600">
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>ID: {userInfo.id}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>加入时间: {userInfo.joinDate}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </EnhancedCard>
      </AnimatedContainer>

      {/* 详细信息标签页 */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="permissions">权限管理</TabsTrigger>
          <TabsTrigger value="activity">活动日志</TabsTrigger>
          <TabsTrigger value="security">安全设置</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatedContainer animation="slideLeft">
              <EnhancedCard variant="traditional">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-primary-600" />
                    <span>个人信息</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">姓名</Label>
                      {isEditing ? (
                        <Input
                          id="name"
                          value={userInfo.name}
                          onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                        />
                      ) : (
                        <div className="mt-1 text-sm font-medium">{userInfo.name}</div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="role">角色</Label>
                      {isEditing ? (
                        <Select
                          value={userInfo.role}
                          onValueChange={(value) => setUserInfo({ ...userInfo, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="管理员">管理员</SelectItem>
                            <SelectItem value="编辑">编辑</SelectItem>
                            <SelectItem value="用户">用户</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="mt-1 text-sm font-medium">{userInfo.role}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">邮箱</Label>
                    {isEditing ? (
                      <Input
                        id="email"
                        type="email"
                        value={userInfo.email}
                        onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                      />
                    ) : (
                      <div className="mt-1 text-sm font-medium flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-secondary-500" />
                        <span>{userInfo.email}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="phone">电话</Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        value={userInfo.phone}
                        onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
                      />
                    ) : (
                      <div className="mt-1 text-sm font-medium flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-secondary-500" />
                        <span>{userInfo.phone}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="bio">个人简介</Label>
                    {isEditing ? (
                      <Textarea
                        id="bio"
                        value={userInfo.bio}
                        onChange={(e) => setUserInfo({ ...userInfo, bio: e.target.value })}
                        rows={3}
                      />
                    ) : (
                      <div className="mt-1 text-sm text-secondary-600">{userInfo.bio}</div>
                    )}
                  </div>
                </CardContent>
              </EnhancedCard>
            </AnimatedContainer>

            <AnimatedContainer animation="slideRight">
              <EnhancedCard variant="traditional">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-accent-600" />
                    <span>工作信息</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="department">部门</Label>
                    {isEditing ? (
                      <Select
                        value={userInfo.department}
                        onValueChange={(value) => setUserInfo({ ...userInfo, department: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="技术部">技术部</SelectItem>
                          <SelectItem value="产品部">产品部</SelectItem>
                          <SelectItem value="运营部">运营部</SelectItem>
                          <SelectItem value="市场部">市场部</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1 text-sm font-medium">{userInfo.department}</div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="position">职位</Label>
                    {isEditing ? (
                      <Input
                        id="position"
                        value={userInfo.position}
                        onChange={(e) => setUserInfo({ ...userInfo, position: e.target.value })}
                      />
                    ) : (
                      <div className="mt-1 text-sm font-medium">{userInfo.position}</div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="address">地址</Label>
                    {isEditing ? (
                      <Textarea
                        id="address"
                        value={userInfo.address}
                        onChange={(e) => setUserInfo({ ...userInfo, address: e.target.value })}
                        rows={2}
                      />
                    ) : (
                      <div className="mt-1 text-sm font-medium flex items-start space-x-2">
                        <MapPin className="w-4 h-4 text-secondary-500 mt-0.5" />
                        <span>{userInfo.address}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-secondary-600">最后登录:</span>
                      <span className="font-medium">{userInfo.lastLogin}</span>
                    </div>
                  </div>
                </CardContent>
              </EnhancedCard>
            </AnimatedContainer>
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <AnimatedContainer animation="fadeIn">
            <EnhancedCard variant="modern" size="lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-traditional-azure" />
                  <span>权限设置</span>
                </CardTitle>
                <CardDescription>管理用户在各个模块的访问权限</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {permissions.map((permission, index) => (
                    <div
                      key={permission.module}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary-50"
                    >
                      <div className="font-medium">{permission.module}</div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-secondary-600">读取</span>
                          <Badge variant={permission.read ? "default" : "secondary"}>
                            {permission.read ? "允许" : "禁止"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-secondary-600">写入</span>
                          <Badge variant={permission.write ? "default" : "secondary"}>
                            {permission.write ? "允许" : "禁止"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-secondary-600">删除</span>
                          <Badge variant={permission.delete ? "default" : "secondary"}>
                            {permission.delete ? "允许" : "禁止"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <AnimatedContainer animation="fadeIn">
            <EnhancedCard variant="traditional" size="lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary-600" />
                  <span>活动日志</span>
                </CardTitle>
                <CardDescription>用户最近的操作记录</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activityLogs.map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                        <span className="font-medium">{log.action}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-secondary-600">
                        <span>{log.time}</span>
                        <span>IP: {log.ip}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <AnimatedContainer animation="fadeIn">
            <EnhancedCard variant="modern" size="lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  <span>安全设置</span>
                </CardTitle>
                <CardDescription>账户安全相关设置</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary-50">
                    <div>
                      <div className="font-medium">重置密码</div>
                      <div className="text-sm text-secondary-600">为用户重置登录密码</div>
                    </div>
                    <Button variant="outline">重置密码</Button>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary-50">
                    <div>
                      <div className="font-medium">冻结账户</div>
                      <div className="text-sm text-secondary-600">暂时禁用用户账户</div>
                    </div>
                    <Button variant="destructive">冻结账户</Button>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary-50">
                    <div>
                      <div className="font-medium">删除账户</div>
                      <div className="text-sm text-secondary-600">永久删除用户账户（不可恢复）</div>
                    </div>
                    <Button variant="destructive">删除账户</Button>
                  </div>
                </div>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>
        </TabsContent>
      </Tabs>
    </div>
  )
}
