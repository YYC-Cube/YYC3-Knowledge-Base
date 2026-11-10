"use client"

import { useState } from "react"
import { Settings, User, Bell, Shield, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { AnimatedContainer } from "../design-system/animation-system"
import { EnhancedCard } from "../design-system/enhanced-card-system"

export function UserConfiguration() {
  const [config, setConfig] = useState({
    autoLogin: true,
    emailNotifications: true,
    pushNotifications: false,
    twoFactorAuth: true,
    sessionTimeout: 30,
    theme: "auto",
    language: "zh-CN",
    timezone: "Asia/Shanghai",
  })

  const handleSave = () => {
    console.log("保存配置:", config)
  }

  return (
    <div className="space-y-6">
      <AnimatedContainer animation="fadeIn">
        <EnhancedCard variant="modern" size="lg" glowEffect>
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Settings className="h-6 w-6 mr-2" />
              用户配置管理
            </CardTitle>
            <CardDescription>管理用户的系统偏好设置和安全配置</CardDescription>
          </CardHeader>
        </EnhancedCard>
      </AnimatedContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatedContainer animation="slideLeft" delay={100}>
          <EnhancedCard variant="modern">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                账户设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-login">自动登录</Label>
                  <p className="text-sm text-muted-foreground">记住登录状态，下次自动登录</p>
                </div>
                <Switch
                  id="auto-login"
                  checked={config.autoLogin}
                  onCheckedChange={(checked) => setConfig({ ...config, autoLogin: checked })}
                />
              </div>

              <Separator />

              <div>
                <Label>会话超时时间（分钟）</Label>
                <div className="mt-2">
                  <Slider
                    value={[config.sessionTimeout]}
                    onValueChange={(value) => setConfig({ ...config, sessionTimeout: value[0] })}
                    max={120}
                    min={5}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>5分钟</span>
                    <span>{config.sessionTimeout}分钟</span>
                    <span>120分钟</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label htmlFor="language">语言设置</Label>
                <Select value={config.language} onValueChange={(value) => setConfig({ ...config, language: value })}>
                  <SelectTrigger className="mt-2">
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

              <div>
                <Label htmlFor="timezone">时区设置</Label>
                <Select value={config.timezone} onValueChange={(value) => setConfig({ ...config, timezone: value })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Shanghai">北京时间 (UTC+8)</SelectItem>
                    <SelectItem value="Asia/Tokyo">东京时间 (UTC+9)</SelectItem>
                    <SelectItem value="America/New_York">纽约时间 (UTC-5)</SelectItem>
                    <SelectItem value="Europe/London">伦敦时间 (UTC+0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <div className="space-y-6">
          <AnimatedContainer animation="slideRight" delay={200}>
            <EnhancedCard variant="modern">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  通知设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications">邮件通知</Label>
                    <p className="text-sm text-muted-foreground">接收系统邮件通知</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={config.emailNotifications}
                    onCheckedChange={(checked) => setConfig({ ...config, emailNotifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push-notifications">推送通知</Label>
                    <p className="text-sm text-muted-foreground">接收浏览器推送通知</p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={config.pushNotifications}
                    onCheckedChange={(checked) => setConfig({ ...config, pushNotifications: checked })}
                  />
                </div>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>

          <AnimatedContainer animation="slideRight" delay={300}>
            <EnhancedCard variant="modern">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  安全设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="two-factor">双因素认证</Label>
                    <p className="text-sm text-muted-foreground">启用额外的安全验证</p>
                  </div>
                  <Switch
                    id="two-factor"
                    checked={config.twoFactorAuth}
                    onCheckedChange={(checked) => setConfig({ ...config, twoFactorAuth: checked })}
                  />
                </div>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>

          <AnimatedContainer animation="slideRight" delay={400}>
            <EnhancedCard variant="modern">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  外观设置
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="theme">主题模式</Label>
                  <Select value={config.theme} onValueChange={(value) => setConfig({ ...config, theme: value })}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">浅色模式</SelectItem>
                      <SelectItem value="dark">深色模式</SelectItem>
                      <SelectItem value="auto">跟随系统</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>
        </div>
      </div>

      <AnimatedContainer animation="slideUp" delay={500}>
        <div className="flex justify-end space-x-4">
          <Button variant="outline">重置默认</Button>
          <Button onClick={handleSave}>保存配置</Button>
        </div>
      </AnimatedContainer>
    </div>
  )
}
