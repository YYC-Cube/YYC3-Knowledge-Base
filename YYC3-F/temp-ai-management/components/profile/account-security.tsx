"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Shield,
  Key,
  Smartphone,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Monitor,
  Save,
  RefreshCw,
} from "lucide-react"

interface SecurityEvent {
  id: string
  type: "login" | "password_change" | "2fa_enabled" | "2fa_disabled" | "suspicious_activity"
  description: string
  timestamp: string
  location: string
  device: string
  ipAddress: string
  status: "success" | "failed" | "warning"
}

interface LoginSession {
  id: string
  device: string
  browser: string
  location: string
  ipAddress: string
  lastActive: string
  isCurrent: boolean
}

export function AccountSecurity() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [loginAlerts, setLoginAlerts] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const securityEvents: SecurityEvent[] = [
    {
      id: "1",
      type: "login",
      description: "成功登录",
      timestamp: "2024-01-16 14:30:00",
      location: "北京市朝阳区",
      device: "Windows PC",
      ipAddress: "192.168.1.100",
      status: "success",
    },
    {
      id: "2",
      type: "password_change",
      description: "密码已更改",
      timestamp: "2024-01-15 09:15:00",
      location: "北京市朝阳区",
      device: "Windows PC",
      ipAddress: "192.168.1.100",
      status: "success",
    },
    {
      id: "3",
      type: "suspicious_activity",
      description: "检测到异常登录尝试",
      timestamp: "2024-01-14 23:45:00",
      location: "上海市浦东新区",
      device: "Unknown Device",
      ipAddress: "203.0.113.1",
      status: "warning",
    },
    {
      id: "4",
      type: "2fa_enabled",
      description: "启用双因素认证",
      timestamp: "2024-01-10 16:20:00",
      location: "北京市朝阳区",
      device: "Windows PC",
      ipAddress: "192.168.1.100",
      status: "success",
    },
  ]

  const loginSessions: LoginSession[] = [
    {
      id: "1",
      device: "Windows PC",
      browser: "Chrome 120.0",
      location: "北京市朝阳区",
      ipAddress: "192.168.1.100",
      lastActive: "2024-01-16 14:30:00",
      isCurrent: true,
    },
    {
      id: "2",
      device: "iPhone 15",
      browser: "Safari Mobile",
      location: "北京市朝阳区",
      ipAddress: "192.168.1.101",
      lastActive: "2024-01-16 12:15:00",
      isCurrent: false,
    },
    {
      id: "3",
      device: "MacBook Pro",
      browser: "Safari 17.0",
      location: "北京市海淀区",
      ipAddress: "192.168.2.50",
      lastActive: "2024-01-15 18:45:00",
      isCurrent: false,
    },
  ]

  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (/[a-z]/.test(password)) strength += 25
    if (/[A-Z]/.test(password)) strength += 25
    if (/[0-9]/.test(password)) strength += 25
    if (/[^A-Za-z0-9]/.test(password)) strength += 25
    return Math.min(strength, 100)
  }

  const getPasswordStrengthLabel = (strength: number) => {
    if (strength < 25) return { label: "很弱", color: "text-red-600" }
    if (strength < 50) return { label: "较弱", color: "text-orange-600" }
    if (strength < 75) return { label: "中等", color: "text-yellow-600" }
    if (strength < 100) return { label: "较强", color: "text-blue-600" }
    return { label: "很强", color: "text-green-600" }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      return
    }

    setIsSaving(true)
    try {
      // 模拟密码更改
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoutSession = (sessionId: string) => {
    // 模拟登出会话
    console.log("Logging out session:", sessionId)
  }

  const getEventIcon = (type: SecurityEvent["type"]) => {
    switch (type) {
      case "login":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "password_change":
        return <Key className="h-4 w-4 text-blue-600" />
      case "2fa_enabled":
      case "2fa_disabled":
        return <Shield className="h-4 w-4 text-purple-600" />
      case "suspicious_activity":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const passwordStrength = getPasswordStrength(newPassword)
  const strengthInfo = getPasswordStrengthLabel(passwordStrength)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">账户安全</h2>
        <p className="text-muted-foreground">管理您的账户安全设置和登录活动</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 密码设置 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="h-5 w-5 mr-2" />
                密码设置
              </CardTitle>
              <CardDescription>更改您的登录密码</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">当前密码</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="输入当前密码"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">新密码</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="输入新密码"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {newPassword && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>密码强度</span>
                      <span className={strengthInfo.color}>{strengthInfo.label}</span>
                    </div>
                    <Progress value={passwordStrength} className="h-2" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认新密码</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入新密码"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-red-600">密码不匹配</p>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">密码要求</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• 至少8个字符</li>
                  <li>• 包含大小写字母</li>
                  <li>• 包含数字</li>
                  <li>• 包含特殊字符</li>
                </ul>
              </div>

              <Button
                onClick={handlePasswordChange}
                disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || isSaving}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "更改中..." : "更改密码"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                安全设置
              </CardTitle>
              <CardDescription>配置账户安全选项</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>双因素认证</Label>
                  <p className="text-sm text-muted-foreground">使用手机验证码增强账户安全</p>
                </div>
                <div className="flex items-center space-x-2">
                  {twoFactorEnabled && <Badge className="bg-green-100 text-green-800">已启用</Badge>}
                  <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>邮件通知</Label>
                  <p className="text-sm text-muted-foreground">重要安全事件邮件提醒</p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>登录提醒</Label>
                  <p className="text-sm text-muted-foreground">新设备登录时发送提醒</p>
                </div>
                <Switch checked={loginAlerts} onCheckedChange={setLoginAlerts} />
              </div>

              {twoFactorEnabled && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium">双因素认证设置</h4>
                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Smartphone className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium">手机验证</p>
                        <p className="text-sm text-muted-foreground">+86 138****8001</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">已绑定</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      重新绑定手机
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 登录活动 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>活跃会话</CardTitle>
              <CardDescription>当前登录的设备和会话</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loginSessions.map((session) => (
                <div key={session.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Monitor className="h-4 w-4" />
                      <span className="font-medium">{session.device}</span>
                      {session.isCurrent && <Badge className="bg-green-100 text-green-800">当前会话</Badge>}
                    </div>
                    {!session.isCurrent && (
                      <Button variant="outline" size="sm" onClick={() => handleLogoutSession(session.id)}>
                        登出
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <span className="w-16">浏览器:</span>
                      <span>{session.browser}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span className="w-15">位置:</span>
                      <span>{session.location}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-16">IP:</span>
                      <span>{session.ipAddress}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span className="w-15">活动:</span>
                      <span>{session.lastActive}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>安全日志</CardTitle>
              <CardDescription>最近的安全相关活动</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {securityEvents.map((event) => (
                <div key={event.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">{getEventIcon(event.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{event.description}</p>
                      <Badge
                        variant={
                          event.status === "success"
                            ? "default"
                            : event.status === "warning"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {event.status === "success" ? "成功" : event.status === "warning" ? "警告" : "失败"}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{event.timestamp}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center">
                        <Monitor className="h-3 w-3 mr-1" />
                        <span>
                          {event.device} - {event.ipAddress}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
