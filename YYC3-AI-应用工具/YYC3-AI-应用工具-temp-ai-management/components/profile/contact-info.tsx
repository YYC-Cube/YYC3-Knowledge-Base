"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Phone,
  Mail,
  MessageSquare,
  Globe,
  Save,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react"

interface ContactMethod {
  id: string
  type: "phone" | "email" | "wechat" | "qq" | "telegram" | "whatsapp" | "other"
  label: string
  value: string
  isPrimary: boolean
  isPublic: boolean
  isVerified: boolean
}

interface SocialLink {
  id: string
  platform: string
  username: string
  url: string
  isPublic: boolean
}

export function ContactInfo() {
  const [contactMethods, setContactMethods] = useState<ContactMethod[]>([
    {
      id: "1",
      type: "email",
      label: "工作邮箱",
      value: "admin@yanyu.cloud",
      isPrimary: true,
      isPublic: true,
      isVerified: true,
    },
    {
      id: "2",
      type: "phone",
      label: "手机号码",
      value: "+86 138-0013-8001",
      isPrimary: true,
      isPublic: false,
      isVerified: true,
    },
    {
      id: "3",
      type: "wechat",
      label: "微信号",
      value: "yanyu_admin",
      isPrimary: false,
      isPublic: true,
      isVerified: false,
    },
  ])

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([
    {
      id: "1",
      platform: "GitHub",
      username: "yanyu-admin",
      url: "https://github.com/yanyu-admin",
      isPublic: true,
    },
    {
      id: "2",
      platform: "LinkedIn",
      username: "yanyu-cloud",
      url: "https://linkedin.com/in/yanyu-cloud",
      isPublic: true,
    },
  ])

  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")
  const [newContactType, setNewContactType] = useState<string>("")
  const [newContactLabel, setNewContactLabel] = useState("")
  const [newContactValue, setNewContactValue] = useState("")

  const contactTypeOptions = [
    { value: "phone", label: "电话", icon: Phone },
    { value: "email", label: "邮箱", icon: Mail },
    { value: "wechat", label: "微信", icon: MessageSquare },
    { value: "qq", label: "QQ", icon: MessageSquare },
    { value: "telegram", label: "Telegram", icon: MessageSquare },
    { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
    { value: "other", label: "其他", icon: Globe },
  ]

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

  const addContactMethod = () => {
    if (newContactType && newContactLabel && newContactValue) {
      const newContact: ContactMethod = {
        id: Date.now().toString(),
        type: newContactType as ContactMethod["type"],
        label: newContactLabel,
        value: newContactValue,
        isPrimary: false,
        isPublic: false,
        isVerified: false,
      }
      setContactMethods([...contactMethods, newContact])
      setNewContactType("")
      setNewContactLabel("")
      setNewContactValue("")
    }
  }

  const removeContactMethod = (id: string) => {
    setContactMethods(contactMethods.filter((contact) => contact.id !== id))
  }

  const updateContactMethod = (id: string, updates: Partial<ContactMethod>) => {
    setContactMethods(contactMethods.map((contact) => (contact.id === id ? { ...contact, ...updates } : contact)))
  }

  const setPrimaryContact = (id: string, type: ContactMethod["type"]) => {
    setContactMethods(
      contactMethods.map((contact) => ({
        ...contact,
        isPrimary: contact.id === id && contact.type === type,
      })),
    )
  }

  const getContactIcon = (type: ContactMethod["type"]) => {
    const option = contactTypeOptions.find((opt) => opt.value === type)
    return option ? option.icon : Globe
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">联系信息</h2>
          <p className="text-muted-foreground">管理您的联系方式和社交媒体链接</p>
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
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "保存中..." : "保存更改"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 联系方式 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                联系方式
              </CardTitle>
              <CardDescription>管理您的各种联系方式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contactMethods.map((contact) => {
                const IconComponent = getContactIcon(contact.type)
                return (
                  <div key={contact.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{contact.label}</span>
                            {contact.isPrimary && (
                              <Badge variant="default" className="text-xs">
                                主要
                              </Badge>
                            )}
                            {contact.isVerified && (
                              <Badge variant="outline" className="text-xs text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                已验证
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{contact.value}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeContactMethod(contact.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={contact.isPrimary}
                            onCheckedChange={(checked) => checked && setPrimaryContact(contact.id, contact.type)}
                          />
                          <Label className="text-sm">设为主要</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={contact.isPublic}
                            onCheckedChange={(checked) => updateContactMethod(contact.id, { isPublic: checked })}
                          />
                          <Label className="text-sm">公开显示</Label>
                        </div>
                      </div>
                      {contact.isPublic ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                )
              })}

              <Separator />

              {/* 添加新联系方式 */}
              <div className="space-y-3">
                <h4 className="font-medium">添加新联系方式</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={newContactType} onValueChange={setNewContactType}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {contactTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center">
                            <option.icon className="h-4 w-4 mr-2" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="标签名称"
                    value={newContactLabel}
                    onChange={(e) => setNewContactLabel(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="联系方式"
                    value={newContactValue}
                    onChange={(e) => setNewContactValue(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={addContactMethod}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 社交媒体 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                社交媒体
              </CardTitle>
              <CardDescription>管理您的社交媒体链接</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {socialLinks.map((link) => (
                <div key={link.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{link.platform}</span>
                        {link.isPublic && (
                          <Badge variant="outline" className="text-xs">
                            公开
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">@{link.username}</p>
                      <p className="text-xs text-muted-foreground">{link.url}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={link.isPublic}
                      onCheckedChange={(checked) => {
                        setSocialLinks(socialLinks.map((l) => (l.id === link.id ? { ...l, isPublic: checked } : l)))
                      }}
                    />
                    <Label className="text-sm">公开显示</Label>
                  </div>
                </div>
              ))}

              <Separator />

              {/* 添加社交媒体 */}
              <div className="space-y-3">
                <h4 className="font-medium">添加社交媒体</h4>
                <div className="space-y-2">
                  <Input placeholder="平台名称 (如: GitHub, Twitter)" />
                  <Input placeholder="用户名" />
                  <Input placeholder="完整链接" />
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    添加链接
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 隐私设置 */}
          <Card>
            <CardHeader>
              <CardTitle>隐私设置</CardTitle>
              <CardDescription>控制联系信息的可见性</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>允许搜索</Label>
                  <p className="text-sm text-muted-foreground">允许其他用户通过联系方式搜索到您</p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>显示在线状态</Label>
                  <p className="text-sm text-muted-foreground">向其他用户显示您的在线状态</p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>接收联系请求</Label>
                  <p className="text-sm text-muted-foreground">允许其他用户向您发送联系请求</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
