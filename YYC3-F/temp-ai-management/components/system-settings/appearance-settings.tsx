"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Palette,
  Monitor,
  Sun,
  Moon,
  Smartphone,
  Save,
  RefreshCw,
  Eye,
  Type,
  Layout,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

interface AppearanceConfig {
  theme: "light" | "dark" | "system"
  primaryColor: string
  fontSize: number
  fontFamily: string
  borderRadius: number
  compactMode: boolean
  animations: boolean
  highContrast: boolean
  reducedMotion: boolean
  showSidebar: boolean
  sidebarCollapsed: boolean
  headerFixed: boolean
  footerVisible: boolean
}

const colorOptions = [
  { name: "蓝色", value: "blue", color: "bg-blue-500" },
  { name: "绿色", value: "green", color: "bg-green-500" },
  { name: "紫色", value: "purple", color: "bg-purple-500" },
  { name: "红色", value: "red", color: "bg-red-500" },
  { name: "橙色", value: "orange", color: "bg-orange-500" },
  { name: "粉色", value: "pink", color: "bg-pink-500" },
]

const fontOptions = [
  { name: "系统默认", value: "system" },
  { name: "苹方", value: "PingFang SC" },
  { name: "微软雅黑", value: "Microsoft YaHei" },
  { name: "思源黑体", value: "Source Han Sans" },
  { name: "Roboto", value: "Roboto" },
  { name: "Inter", value: "Inter" },
]

export function AppearanceSettings() {
  const [config, setConfig] = useState<AppearanceConfig>({
    theme: "system",
    primaryColor: "blue",
    fontSize: 14,
    fontFamily: "system",
    borderRadius: 6,
    compactMode: false,
    animations: true,
    highContrast: false,
    reducedMotion: false,
    showSidebar: true,
    sidebarCollapsed: false,
    headerFixed: true,
    footerVisible: true,
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
      theme: "system",
      primaryColor: "blue",
      fontSize: 14,
      fontFamily: "system",
      borderRadius: 6,
      compactMode: false,
      animations: true,
      highContrast: false,
      reducedMotion: false,
      showSidebar: true,
      sidebarCollapsed: false,
      headerFixed: true,
      footerVisible: true,
    })
  }

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case "light":
        return <Sun className="h-4 w-4" />
      case "dark":
        return <Moon className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">外观设置</h2>
          <p className="text-muted-foreground">自定义界面外观和用户体验</p>
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
        {/* 主题和颜色 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                主题和颜色
              </CardTitle>
              <CardDescription>选择应用程序的主题和主色调</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>主题模式</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "light", label: "浅色", icon: Sun },
                    { value: "dark", label: "深色", icon: Moon },
                    { value: "system", label: "跟随系统", icon: Monitor },
                  ].map((theme) => (
                    <Button
                      key={theme.value}
                      variant={config.theme === theme.value ? "default" : "outline"}
                      onClick={() => setConfig({ ...config, theme: theme.value as AppearanceConfig["theme"] })}
                      className="flex flex-col items-center p-4 h-auto"
                    >
                      <theme.icon className="h-6 w-6 mb-2" />
                      <span className="text-sm">{theme.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>主色调</Label>
                <div className="grid grid-cols-6 gap-3">
                  {colorOptions.map((color) => (
                    <Button
                      key={color.value}
                      variant="outline"
                      onClick={() => setConfig({ ...config, primaryColor: color.value })}
                      className={`flex flex-col items-center p-3 h-auto ${
                        config.primaryColor === color.value ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full ${color.color} mb-2`} />
                      <span className="text-xs">{color.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Type className="h-5 w-5 mr-2" />
                字体和排版
              </CardTitle>
              <CardDescription>调整文字显示效果</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>字体系列</Label>
                <Select
                  value={config.fontFamily}
                  onValueChange={(value) => setConfig({ ...config, fontFamily: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>字体大小</Label>
                  <Badge variant="outline">{config.fontSize}px</Badge>
                </div>
                <Slider
                  value={[config.fontSize]}
                  onValueChange={(value) => setConfig({ ...config, fontSize: value[0] })}
                  min={12}
                  max={18}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>圆角大小</Label>
                  <Badge variant="outline">{config.borderRadius}px</Badge>
                </div>
                <Slider
                  value={[config.borderRadius]}
                  onValueChange={(value) => setConfig({ ...config, borderRadius: value[0] })}
                  min={0}
                  max={12}
                  step={1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Layout className="h-5 w-5 mr-2" />
                布局设置
              </CardTitle>
              <CardDescription>调整界面布局和显示选项</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>紧凑模式</Label>
                  <p className="text-sm text-muted-foreground">减少界面元素间距</p>
                </div>
                <Switch
                  checked={config.compactMode}
                  onCheckedChange={(checked) => setConfig({ ...config, compactMode: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>显示侧边栏</Label>
                  <p className="text-sm text-muted-foreground">控制侧边栏的显示</p>
                </div>
                <Switch
                  checked={config.showSidebar}
                  onCheckedChange={(checked) => setConfig({ ...config, showSidebar: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>固定头部</Label>
                  <p className="text-sm text-muted-foreground">头部导航栏固定在顶部</p>
                </div>
                <Switch
                  checked={config.headerFixed}
                  onCheckedChange={(checked) => setConfig({ ...config, headerFixed: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>显示页脚</Label>
                  <p className="text-sm text-muted-foreground">在页面底部显示页脚</p>
                </div>
                <Switch
                  checked={config.footerVisible}
                  onCheckedChange={(checked) => setConfig({ ...config, footerVisible: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 预览和辅助功能 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                预览
              </CardTitle>
              <CardDescription>实时预览当前设置效果</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">示例标题</span>
                    <Badge>标签</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">这是一段示例文本，用于预览当前的字体和颜色设置效果。</p>
                  <div className="flex gap-2">
                    <Button size="sm">主要按钮</Button>
                    <Button size="sm" variant="outline">
                      次要按钮
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>辅助功能</CardTitle>
              <CardDescription>提升可访问性和用户体验</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>动画效果</Label>
                  <p className="text-sm text-muted-foreground">启用界面动画和过渡效果</p>
                </div>
                <Switch
                  checked={config.animations}
                  onCheckedChange={(checked) => setConfig({ ...config, animations: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>高对比度</Label>
                  <p className="text-sm text-muted-foreground">提高文字和背景的对比度</p>
                </div>
                <Switch
                  checked={config.highContrast}
                  onCheckedChange={(checked) => setConfig({ ...config, highContrast: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>减少动效</Label>
                  <p className="text-sm text-muted-foreground">减少动画和视觉效果</p>
                </div>
                <Switch
                  checked={config.reducedMotion}
                  onCheckedChange={(checked) => setConfig({ ...config, reducedMotion: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>响应式设计</CardTitle>
              <CardDescription>不同设备的显示效果</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Monitor className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">桌面端</p>
                    <p className="text-sm text-muted-foreground">完整功能界面</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Smartphone className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">移动端</p>
                    <p className="text-sm text-muted-foreground">优化触摸操作</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
