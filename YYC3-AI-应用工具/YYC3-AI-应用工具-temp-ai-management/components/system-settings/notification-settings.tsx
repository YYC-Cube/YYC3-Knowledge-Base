"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bell,
  Mail,
  Smartphone,
  Monitor,
  Clock,
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Settings,
  Filter,
  Trash2,
  Plus,
} from "lucide-react"

interface NotificationRule {
  id: string
  name: string
  description: string
  channels: ("email" | "sms" | "push" | "desktop")[]
  conditions: {
    priority: "low" | "medium" | "high" | "critical"
    categories: string[]
    timeRange?: {
      start: string
      end: string
    }
  }
  isEnabled: boolean
}

interface NotificationChannel {
  id: string
  type: "email" | "sms" | "push" | "desktop"
  name: string
  isEnabled: boolean
  settings: {
    sound?: boolean
    vibration?: boolean
    volume?: number
    frequency?: "immediate" | "batched" | "daily" | "weekly"
  }
}

export function NotificationSettings() {
  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: "1",
      type: "email",
      name: "邮件通知",
      isEnabled: true,
      settings: {
        frequency: "immediate",
      },
    },
    {
      id: "2",
      type: "sms",
      name: "短信通知",
      isEnabled: false,
      settings: {
        frequency: "immediate",
      },
    },
    {
      id: "3",
      type: "push",
      name: "推送通知",
      isEnabled: true,
      settings: {
        sound: true,
        vibration: true,
        frequency: "immediate",
      },
    },
    {
      id: "4",
      type: "desktop",
      name: "桌面通知",
      isEnabled: true,
      settings: {
        sound: true,
        volume: 70,
        frequency: "immediate",
      },
    },
  ])

  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([
    {
      id: "1",
      name: "系统安全警报",
      description: "账户安全相关的重要通知",
      channels: ["email", "sms", "push"],
      conditions: {
        priority: "critical",
        categories: ["security", "login", "password"],
      },
      isEnabled: true,
    },
    {
      id: "2",
      name: "工作时间通知",
      description: "工作时间内的一般通知",
      channels: ["push", "desktop"],
      conditions: {
        priority: "medium",
        categories: ["task", "meeting", "message"],
        timeRange: {
          start: "09:00",
          end: "18:00",
        },
      },
      isEnabled: true,
    },
    {
      id: "3",
      name: "系统维护通知",
      description: "系统维护和更新相关通知",
      channels: ["email"],
      conditions: {
        priority: "low",
        categories: ["maintenance", "update"],
      },
      isEnabled: true,
    },
  ])

  const [globalSettings, setGlobalSettings] = useState({
    doNotDisturb: false,
    quietHours: {
      enabled: true,
      start: "22:00",
      end: "08:00",
    },
    batchNotifications: false,
    soundEnabled: true,
    vibrationEnabled: true,
    showPreviews: true,
    groupSimilar: true,
  })

  const notificationCategories = [
    { id: "security", name: "安全", icon: AlertTriangle },
    { id: "task", name: "任务", icon: CheckCircle },
    { id: "message", name: "消息", icon: MessageSquare },
    { id: "meeting", name: "会议", icon: Users },
    { id: "system", name: "系统", icon: Settings },
    { id: "maintenance", name: "维护", icon: Settings },
    { id: "update", name: "更新", icon: Settings },
  ]

  const updateChannelSetting = (channelId: string, setting: string, value: any) => {
    setChannels(
      channels.map((channel) =>
        channel.id === channelId ? { ...channel, settings: { ...channel.settings, [setting]: value } } : channel,
      ),
    )
  }

  const toggleChannel = (channelId: string) => {
    setChannels(
      channels.map((channel) => (channel.id === channelId ? { ...channel, isEnabled: !channel.isEnabled } : channel)),
    )
  }

  const toggleRule = (ruleId: string) => {
    setNotificationRules((rules) =>
      rules.map((rule) => (rule.id === ruleId ? { ...rule, isEnabled: !rule.isEnabled } : rule)),
    )
  }

  const getChannelIcon = (type: NotificationChannel["type"]) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "sms":
        return <Smartphone className="h-4 w-4" />
      case "push":
        return <Bell className="h-4 w-4" />
      case "desktop":
        return <Monitor className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">通知设置</h1>
        <p className="text-muted-foreground">管理您的通知偏好和提醒设置</p>
      </div>

      {/* 全局设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            全局通知设置
          </CardTitle>
          <CardDescription>控制所有通知的全局行为</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>免打扰模式</Label>
              <p className="text-sm text-muted-foreground">暂停所有非紧急通知</p>
            </div>
            <Switch
              checked={globalSettings.doNotDisturb}
              onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, doNotDisturb: checked })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>静音时段</Label>
                <p className="text-sm text-muted-foreground">在指定时间段内静音通知</p>
              </div>
              <Switch
                checked={globalSettings.quietHours.enabled}
                onCheckedChange={(checked) =>
                  setGlobalSettings({
                    ...globalSettings,
                    quietHours: { ...globalSettings.quietHours, enabled: checked },
                  })
                }
              />
            </div>
            {globalSettings.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div className="space-y-2">
                  <Label>开始时间</Label>
                  <Select
                    value={globalSettings.quietHours.start}
                    onValueChange={(value) =>
                      setGlobalSettings({
                        ...globalSettings,
                        quietHours: { ...globalSettings.quietHours, start: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, "0")
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>结束时间</Label>
                  <Select
                    value={globalSettings.quietHours.end}
                    onValueChange={(value) =>
                      setGlobalSettings({
                        ...globalSettings,
                        quietHours: { ...globalSettings.quietHours, end: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, "0")
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>批量通知</Label>
              <p className="text-sm text-muted-foreground">将相似通知合并发送</p>
            </div>
            <Switch
              checked={globalSettings.batchNotifications}
              onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, batchNotifications: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>通知预览</Label>
              <p className="text-sm text-muted-foreground">在锁屏和通知中心显示内容预览</p>
            </div>
            <Switch
              checked={globalSettings.showPreviews}
              onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, showPreviews: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>分组相似通知</Label>
              <p className="text-sm text-muted-foreground">将来自同一应用的通知分组显示</p>
            </div>
            <Switch
              checked={globalSettings.groupSimilar}
              onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, groupSimilar: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* 通知渠道设置 */}
      <Tabs defaultValue="channels" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="channels">通知渠道</TabsTrigger>
          <TabsTrigger value="rules">通知规则</TabsTrigger>
          <TabsTrigger value="categories">分类设置</TabsTrigger>
        </TabsList>

        <TabsContent value="channels">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {channels.map((channel) => (
              <Card key={channel.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(channel.type)}
                      <CardTitle className="text-lg">{channel.name}</CardTitle>
                    </div>
                    <Switch checked={channel.isEnabled} onCheckedChange={() => toggleChannel(channel.id)} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {channel.isEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label>发送频率</Label>
                        <Select
                          value={channel.settings.frequency}
                          onValueChange={(value) => updateChannelSetting(channel.id, "frequency", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">立即发送</SelectItem>
                            <SelectItem value="batched">批量发送</SelectItem>
                            <SelectItem value="daily">每日汇总</SelectItem>
                            <SelectItem value="weekly">每周汇总</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(channel.type === "push" || channel.type === "desktop") && (
                        <>
                          <div className="flex items-center justify-between">
                            <Label>声音提醒</Label>
                            <Switch
                              checked={channel.settings.sound}
                              onCheckedChange={(checked) => updateChannelSetting(channel.id, "sound", checked)}
                            />
                          </div>

                          {channel.settings.sound && channel.type === "desktop" && (
                            <div className="space-y-2">
                              <Label>音量: {channel.settings.volume}%</Label>
                              <Slider
                                value={[channel.settings.volume || 50]}
                                onValueChange={([value]) => updateChannelSetting(channel.id, "volume", value)}
                                max={100}
                                step={10}
                                className="w-full"
                              />
                            </div>
                          )}
                        </>
                      )}

                      {channel.type === "push" && (
                        <div className="flex items-center justify-between">
                          <Label>振动提醒</Label>
                          <Switch
                            checked={channel.settings.vibration}
                            onCheckedChange={(checked) => updateChannelSetting(channel.id, "vibration", checked)}
                          />
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    通知规则
                  </CardTitle>
                  <CardDescription>配置不同类型通知的发送规则</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  添加规则
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationRules.map((rule) => (
                <div key={rule.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{rule.name}</h4>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={rule.isEnabled} onCheckedChange={() => toggleRule(rule.id)} />
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">优先级:</span>
                      <Badge
                        variant={
                          rule.conditions.priority === "critical"
                            ? "destructive"
                            : rule.conditions.priority === "high"
                              ? "default"
                              : rule.conditions.priority === "medium"
                                ? "secondary"
                                : "outline"
                        }
                      >
                        {rule.conditions.priority === "critical"
                          ? "紧急"
                          : rule.conditions.priority === "high"
                            ? "高"
                            : rule.conditions.priority === "medium"
                              ? "中"
                              : "低"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">渠道:</span>
                      <div className="flex gap-1">
                        {rule.channels.map((channel) => (
                          <Badge key={channel} variant="outline" className="text-xs">
                            {channel === "email"
                              ? "邮件"
                              : channel === "sms"
                                ? "短信"
                                : channel === "push"
                                  ? "推送"
                                  : "桌面"}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {rule.conditions.timeRange && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {rule.conditions.timeRange.start} - {rule.conditions.timeRange.end}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">分类:</span>
                    <div className="flex gap-1 flex-wrap">
                      {rule.conditions.categories.map((category) => (
                        <Badge key={category} variant="outline" className="text-xs">
                          {notificationCategories.find((c) => c.id === category)?.name || category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                分类设置
              </CardTitle>
              <CardDescription>为不同类型的通知配置个性化设置</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notificationCategories.map((category) => (
                  <div key={category.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <category.icon className="h-4 w-4" />
                      <span className="font-medium">{category.name}</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">启用通知</Label>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-sm">声音提醒</Label>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-sm">显示预览</Label>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 测试通知 */}
      <Card>
        <CardHeader>
          <CardTitle>测试通知</CardTitle>
          <CardDescription>发送测试通知以验证您的设置</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              <Mail className="h-4 w-4" />
              测试邮件
            </Button>
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              <Smartphone className="h-4 w-4" />
              测试短信
            </Button>
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              <Bell className="h-4 w-4" />
              测试推送
            </Button>
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              <Monitor className="h-4 w-4" />
              测试桌面
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
