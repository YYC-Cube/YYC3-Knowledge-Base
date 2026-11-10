"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Settings, Globe, Clock, Server, Save, RefreshCw, AlertCircle, CheckCircle } from "lucide-react"

interface SystemConfig {
  siteName: string
  siteDescription: string
  adminEmail: string
  timezone: string
  language: string
  dateFormat: string
  currency: string
  maintenanceMode: boolean
  debugMode: boolean
  cacheEnabled: boolean
  autoBackup: boolean
  emailNotifications: boolean
  systemLogs: boolean
  apiRateLimit: number
  sessionTimeout: number
  maxFileSize: number
}

export function GeneralSettings() {
  const [config, setConfig] = useState<SystemConfig>({
    siteName: "YanYu Cloud³ 智能商务中心",
    siteDescription: "企业级智能商务管理平台",
    adminEmail: "admin@yanyu.cloud",
    timezone: "Asia/Shanghai",
    language: "zh-CN",
    dateFormat: "YYYY-MM-DD",
    currency: "CNY",
    maintenanceMode: false,
    debugMode: false,
    cacheEnabled: true,
    autoBackup: true,
    emailNotifications: true,
    systemLogs: true,
    apiRateLimit: 1000,
    sessionTimeout: 30,
    maxFileSize: 10,
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // 模拟保存操作
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSaveStatus("success")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } catch (error) {
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setConfig({
      siteName: "YanYu Cloud³ 智能商务中心",
      siteDescription: "企业级智能商务管理平台",
      adminEmail: "admin@yanyu.cloud",
      timezone: "Asia/Shanghai",
      language: "zh-CN",
      dateFormat: "YYYY-MM-DD",
      currency: "CNY",
      maintenanceMode: false,
      debugMode: false,
      cacheEnabled: true,
      autoBackup: true,
      emailNotifications: true,
      systemLogs: true,
      apiRateLimit: 1000,
      sessionTimeout: 30,
      maxFileSize: 10,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">通用设置</h2>
          <p className="text-muted-foreground">配置系统基本参数和全局设置</p>
        </div>
        <div className="flex items-center space-x-2">
          {saveStatus === "success" && (
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span className="text-sm">保存成功</span>
            </div>
          )}
          {saveStatus === "error" && (
            <div className="flex items-center text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span className="text-sm">保存失败</span>
            </div>
          )}
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            重置
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "保存中..." : "保存设置"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 基本信息 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                站点信息
              </CardTitle>
              <CardDescription>配置网站基本信息和描述</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">站点名称</Label>
                <Input
                  id="siteName"
                  value={config.siteName}
                  onChange={(e) => setConfig({ ...config, siteName: e.target.value })}
                  placeholder="输入站点名称"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">站点描述</Label>
                <Textarea
                  id="siteDescription"
                  value={config.siteDescription}
                  onChange={(e) => setConfig({ ...config, siteDescription: e.target.value })}
                  placeholder="输入站点描述"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">管理员邮箱</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={config.adminEmail}
                  onChange={(e) => setConfig({ ...config, adminEmail: e.target.value })}
                  placeholder="输入管理员邮箱"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                区域设置
              </CardTitle>
              <CardDescription>配置时区、语言和格式设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">时区</Label>
                  <Select value={config.timezone} onValueChange={(value) => setConfig({ ...config, timezone: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Shanghai">Asia/Shanghai (UTC+8)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">语言</Label>
                  <Select value={config.language} onValueChange={(value) => setConfig({ ...config, language: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-CN">简体中文</SelectItem>
                      <SelectItem value="zh-TW">繁体中文</SelectItem>
                      <SelectItem value="en-US">English</SelectItem>
                      <SelectItem value="ja-JP">日本語</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">日期格式</Label>
                  <Select
                    value={config.dateFormat}
                    onValueChange={(value) => setConfig({ ...config, dateFormat: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY年MM月DD日">YYYY年MM月DD日</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">货币</Label>
                  <Select value={config.currency} onValueChange={(value) => setConfig({ ...config, currency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNY">人民币 (¥)</SelectItem>
                      <SelectItem value="USD">美元 ($)</SelectItem>
                      <SelectItem value="EUR">欧元 (€)</SelectItem>
                      <SelectItem value="JPY">日元 (¥)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="h-5 w-5 mr-2" />
                系统参数
              </CardTitle>
              <CardDescription>配置系统运行参数和限制</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apiRateLimit">API速率限制</Label>
                  <Input
                    id="apiRateLimit"
                    type="number"
                    value={config.apiRateLimit}
                    onChange={(e) => setConfig({ ...config, apiRateLimit: Number.parseInt(e.target.value) })}
                    placeholder="每小时请求数"
                  />
                  <p className="text-xs text-muted-foreground">每小时最大请求数</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">会话超时</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={config.sessionTimeout}
                    onChange={(e) => setConfig({ ...config, sessionTimeout: Number.parseInt(e.target.value) })}
                    placeholder="分钟"
                  />
                  <p className="text-xs text-muted-foreground">会话超时时间(分钟)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxFileSize">最大文件大小</Label>
                  <Input
                    id="maxFileSize"
                    type="number"
                    value={config.maxFileSize}
                    onChange={(e) => setConfig({ ...config, maxFileSize: Number.parseInt(e.target.value) })}
                    placeholder="MB"
                  />
                  <p className="text-xs text-muted-foreground">上传文件大小限制(MB)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 系统开关 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                系统开关
              </CardTitle>
              <CardDescription>控制系统功能的启用状态</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>维护模式</Label>
                  <p className="text-sm text-muted-foreground">启用后网站将显示维护页面</p>
                </div>
                <Switch
                  checked={config.maintenanceMode}
                  onCheckedChange={(checked) => setConfig({ ...config, maintenanceMode: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>调试模式</Label>
                  <p className="text-sm text-muted-foreground">显示详细的错误信息</p>
                </div>
                <Switch
                  checked={config.debugMode}
                  onCheckedChange={(checked) => setConfig({ ...config, debugMode: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>缓存系统</Label>
                  <p className="text-sm text-muted-foreground">启用系统缓存提升性能</p>
                </div>
                <Switch
                  checked={config.cacheEnabled}
                  onCheckedChange={(checked) => setConfig({ ...config, cacheEnabled: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>自动备份</Label>
                  <p className="text-sm text-muted-foreground">定期自动备份系统数据</p>
                </div>
                <Switch
                  checked={config.autoBackup}
                  onCheckedChange={(checked) => setConfig({ ...config, autoBackup: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>邮件通知</Label>
                  <p className="text-sm text-muted-foreground">发送系统通知邮件</p>
                </div>
                <Switch
                  checked={config.emailNotifications}
                  onCheckedChange={(checked) => setConfig({ ...config, emailNotifications: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>系统日志</Label>
                  <p className="text-sm text-muted-foreground">记录系统操作日志</p>
                </div>
                <Switch
                  checked={config.systemLogs}
                  onCheckedChange={(checked) => setConfig({ ...config, systemLogs: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>系统状态</CardTitle>
              <CardDescription>当前系统运行状态</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">系统版本</span>
                <Badge variant="outline">v3.2.1</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">运行时间</span>
                <Badge variant="outline">15天 8小时</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">数据库状态</span>
                <Badge className="bg-green-100 text-green-800">正常</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">缓存状态</span>
                <Badge className="bg-green-100 text-green-800">正常</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">存储空间</span>
                <Badge variant="outline">78% 已使用</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
