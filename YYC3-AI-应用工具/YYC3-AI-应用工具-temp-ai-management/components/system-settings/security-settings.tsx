"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Shield, Lock, Key, Eye, EyeOff, Trash2, Plus, RefreshCw, XCircle, Clock, Globe, Monitor } from "lucide-react"

interface SecurityConfig {
  passwordMinLength: number
  passwordRequireUppercase: boolean
  passwordRequireLowercase: boolean
  passwordRequireNumbers: boolean
  passwordRequireSymbols: boolean
  passwordExpireDays: number
  maxLoginAttempts: number
  lockoutDuration: number
  twoFactorAuth: boolean
  sessionTimeout: number
  ipWhitelist: string[]
  sslRequired: boolean
  securityHeaders: boolean
  auditLogging: boolean
}

interface LoginAttempt {
  id: string
  ip: string
  username: string
  timestamp: string
  status: "success" | "failed" | "blocked"
  location: string
  device: string
}

interface ActiveSession {
  id: string
  user: string
  ip: string
  device: string
  location: string
  loginTime: string
  lastActivity: string
  status: "active" | "idle"
}

const mockLoginAttempts: LoginAttempt[] = [
  {
    id: "1",
    ip: "192.168.1.100",
    username: "admin",
    timestamp: "2024-01-16 10:30:25",
    status: "success",
    location: "北京, 中国",
    device: "Chrome 120.0 / Windows 10",
  },
  {
    id: "2",
    ip: "203.0.113.45",
    username: "admin",
    timestamp: "2024-01-16 09:15:12",
    status: "failed",
    location: "未知位置",
    device: "Unknown",
  },
  {
    id: "3",
    ip: "192.168.1.101",
    username: "user1",
    timestamp: "2024-01-16 08:45:33",
    status: "success",
    location: "上海, 中国",
    device: "Safari 17.0 / macOS",
  },
]

const mockActiveSessions: ActiveSession[] = [
  {
    id: "1",
    user: "admin",
    ip: "192.168.1.100",
    device: "Chrome 120.0 / Windows 10",
    location: "北京, 中国",
    loginTime: "2024-01-16 10:30:25",
    lastActivity: "2024-01-16 14:25:10",
    status: "active",
  },
  {
    id: "2",
    user: "user1",
    ip: "192.168.1.101",
    device: "Safari 17.0 / macOS",
    location: "上海, 中国",
    loginTime: "2024-01-16 08:45:33",
    lastActivity: "2024-01-16 13:20:45",
    status: "idle",
  },
]

export function SecuritySettings() {
  const [config, setConfig] = useState<SecurityConfig>({
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: false,
    passwordExpireDays: 90,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    twoFactorAuth: true,
    sessionTimeout: 30,
    ipWhitelist: ["192.168.1.0/24", "10.0.0.0/8"],
    sslRequired: true,
    securityHeaders: true,
    auditLogging: true,
  })

  const [showApiKey, setShowApiKey] = useState(false)
  const [newIpRange, setNewIpRange] = useState("")

  const handleAddIpRange = () => {
    if (newIpRange && !config.ipWhitelist.includes(newIpRange)) {
      setConfig({
        ...config,
        ipWhitelist: [...config.ipWhitelist, newIpRange],
      })
      setNewIpRange("")
    }
  }

  const handleRemoveIpRange = (ip: string) => {
    setConfig({
      ...config,
      ipWhitelist: config.ipWhitelist.filter((item) => item !== ip),
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
      case "active":
        return "bg-green-100 text-green-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "blocked":
        return "bg-orange-100 text-orange-800"
      case "idle":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "success":
        return "成功"
      case "failed":
        return "失败"
      case "blocked":
        return "已阻止"
      case "active":
        return "活跃"
      case "idle":
        return "空闲"
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">安全设置</h2>
          <p className="text-muted-foreground">配置系统安全策略和访问控制</p>
        </div>
        <Button>
          <Shield className="h-4 w-4 mr-2" />
          保存设置
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 密码策略 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              密码策略
            </CardTitle>
            <CardDescription>配置用户密码安全要求</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="passwordMinLength">最小密码长度</Label>
              <Input
                id="passwordMinLength"
                type="number"
                value={config.passwordMinLength}
                onChange={(e) => setConfig({ ...config, passwordMinLength: Number.parseInt(e.target.value) })}
                min="6"
                max="32"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>要求大写字母</Label>
                <Switch
                  checked={config.passwordRequireUppercase}
                  onCheckedChange={(checked) => setConfig({ ...config, passwordRequireUppercase: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>要求小写字母</Label>
                <Switch
                  checked={config.passwordRequireLowercase}
                  onCheckedChange={(checked) => setConfig({ ...config, passwordRequireLowercase: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>要求数字</Label>
                <Switch
                  checked={config.passwordRequireNumbers}
                  onCheckedChange={(checked) => setConfig({ ...config, passwordRequireNumbers: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>要求特殊字符</Label>
                <Switch
                  checked={config.passwordRequireSymbols}
                  onCheckedChange={(checked) => setConfig({ ...config, passwordRequireSymbols: checked })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordExpireDays">密码过期天数</Label>
              <Input
                id="passwordExpireDays"
                type="number"
                value={config.passwordExpireDays}
                onChange={(e) => setConfig({ ...config, passwordExpireDays: Number.parseInt(e.target.value) })}
                min="0"
                max="365"
              />
              <p className="text-xs text-muted-foreground">设置为0表示密码永不过期</p>
            </div>
          </CardContent>
        </Card>

        {/* 登录安全 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Key className="h-5 w-5 mr-2" />
              登录安全
            </CardTitle>
            <CardDescription>配置登录验证和会话管理</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxLoginAttempts">最大登录尝试次数</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  value={config.maxLoginAttempts}
                  onChange={(e) => setConfig({ ...config, maxLoginAttempts: Number.parseInt(e.target.value) })}
                  min="3"
                  max="10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lockoutDuration">锁定时长(分钟)</Label>
                <Input
                  id="lockoutDuration"
                  type="number"
                  value={config.lockoutDuration}
                  onChange={(e) => setConfig({ ...config, lockoutDuration: Number.parseInt(e.target.value) })}
                  min="5"
                  max="1440"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">会话超时(分钟)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={config.sessionTimeout}
                onChange={(e) => setConfig({ ...config, sessionTimeout: Number.parseInt(e.target.value) })}
                min="5"
                max="480"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>双因素认证</Label>
                <p className="text-sm text-muted-foreground">启用2FA增强账户安全</p>
              </div>
              <Switch
                checked={config.twoFactorAuth}
                onCheckedChange={(checked) => setConfig({ ...config, twoFactorAuth: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>强制HTTPS</Label>
                <p className="text-sm text-muted-foreground">要求所有连接使用SSL</p>
              </div>
              <Switch
                checked={config.sslRequired}
                onCheckedChange={(checked) => setConfig({ ...config, sslRequired: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>安全头部</Label>
                <p className="text-sm text-muted-foreground">启用HTTP安全头部</p>
              </div>
              <Switch
                checked={config.securityHeaders}
                onCheckedChange={(checked) => setConfig({ ...config, securityHeaders: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* IP白名单 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              IP访问控制
            </CardTitle>
            <CardDescription>管理允许访问的IP地址范围</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="输入IP地址或CIDR范围"
                value={newIpRange}
                onChange={(e) => setNewIpRange(e.target.value)}
              />
              <Button onClick={handleAddIpRange}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {config.ipWhitelist.map((ip, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-mono text-sm">{ip}</span>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveIpRange(ip)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>审计日志</Label>
                <p className="text-sm text-muted-foreground">记录所有安全相关操作</p>
              </div>
              <Switch
                checked={config.auditLogging}
                onCheckedChange={(checked) => setConfig({ ...config, auditLogging: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* API密钥管理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Key className="h-5 w-5 mr-2" />
              API密钥管理
            </CardTitle>
            <CardDescription>管理系统API访问密钥</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>主API密钥</Label>
              <div className="flex space-x-2">
                <Input type={showApiKey ? "text" : "password"} value="sk-1234567890abcdef1234567890abcdef" readOnly />
                <Button variant="outline" size="sm" onClick={() => setShowApiKey(!showApiKey)}>
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>密钥状态</Label>
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-100 text-green-800">活跃</Badge>
                <span className="text-sm text-muted-foreground">最后使用: 2024-01-16 14:30</span>
              </div>
            </div>

            <Button variant="outline" className="w-full bg-transparent">
              <Plus className="h-4 w-4 mr-2" />
              生成新密钥
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 登录记录 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            登录记录
          </CardTitle>
          <CardDescription>查看最近的登录尝试记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP地址</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>位置</TableHead>
                  <TableHead>设备</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockLoginAttempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-mono">{attempt.ip}</TableCell>
                    <TableCell>{attempt.username}</TableCell>
                    <TableCell>{attempt.timestamp}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(attempt.status)}>{getStatusLabel(attempt.status)}</Badge>
                    </TableCell>
                    <TableCell>{attempt.location}</TableCell>
                    <TableCell className="max-w-32 truncate">{attempt.device}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 活跃会话 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Monitor className="h-5 w-5 mr-2" />
            活跃会话
          </CardTitle>
          <CardDescription>管理当前活跃的用户会话</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>IP地址</TableHead>
                  <TableHead>设备</TableHead>
                  <TableHead>位置</TableHead>
                  <TableHead>登录时间</TableHead>
                  <TableHead>最后活动</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockActiveSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.user}</TableCell>
                    <TableCell className="font-mono">{session.ip}</TableCell>
                    <TableCell className="max-w-32 truncate">{session.device}</TableCell>
                    <TableCell>{session.location}</TableCell>
                    <TableCell>{session.loginTime}</TableCell>
                    <TableCell>{session.lastActivity}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(session.status)}>{getStatusLabel(session.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
