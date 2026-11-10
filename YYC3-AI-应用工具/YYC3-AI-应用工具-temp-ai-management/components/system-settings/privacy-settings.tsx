"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Shield,
  Eye,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Database,
  FileText,
  Users,
  Bell,
} from "lucide-react"

interface PrivacySetting {
  id: string
  category: string
  name: string
  description: string
  isEnabled: boolean
  level: "basic" | "standard" | "strict"
}

interface DataRetentionPolicy {
  id: string
  dataType: string
  retentionPeriod: number
  unit: "days" | "months" | "years"
  autoDelete: boolean
  description: string
}

interface ConsentRecord {
  id: string
  purpose: string
  dataTypes: string[]
  consentDate: string
  expiryDate?: string
  status: "active" | "expired" | "withdrawn"
  source: string
}

export function PrivacySettings() {
  const [privacySettings, setPrivacySettings] = useState<PrivacySetting[]>([
    {
      id: "1",
      category: "数据收集",
      name: "使用情况分析",
      description: "收集应用使用数据以改善用户体验",
      isEnabled: true,
      level: "standard",
    },
    {
      id: "2",
      category: "数据收集",
      name: "错误报告",
      description: "自动发送错误报告帮助修复问题",
      isEnabled: true,
      level: "basic",
    },
    {
      id: "3",
      category: "数据收集",
      name: "位置信息",
      description: "收集位置信息以提供本地化服务",
      isEnabled: false,
      level: "strict",
    },
    {
      id: "4",
      category: "数据共享",
      name: "第三方分析",
      description: "与第三方分析服务共享匿名数据",
      isEnabled: false,
      level: "standard",
    },
    {
      id: "5",
      category: "数据共享",
      name: "营销合作伙伴",
      description: "与营销合作伙伴共享数据用于个性化广告",
      isEnabled: false,
      level: "strict",
    },
    {
      id: "6",
      category: "个人资料",
      name: "公开个人资料",
      description: "允许其他用户查看您的基本信息",
      isEnabled: true,
      level: "basic",
    },
    {
      id: "7",
      category: "个人资料",
      name: "搜索引擎索引",
      description: "允许搜索引擎索引您的公开资料",
      isEnabled: false,
      level: "standard",
    },
    {
      id: "8",
      category: "通信",
      name: "营销邮件",
      description: "接收产品更新和营销信息",
      isEnabled: true,
      level: "basic",
    },
  ])

  const [dataRetentionPolicies, setDataRetentionPolicies] = useState<DataRetentionPolicy[]>([
    {
      id: "1",
      dataType: "用户活动日志",
      retentionPeriod: 90,
      unit: "days",
      autoDelete: true,
      description: "用户在系统中的操作记录",
    },
    {
      id: "2",
      dataType: "聊天记录",
      retentionPeriod: 1,
      unit: "years",
      autoDelete: false,
      description: "用户之间的聊天消息记录",
    },
    {
      id: "3",
      dataType: "文件上传记录",
      retentionPeriod: 2,
      unit: "years",
      autoDelete: true,
      description: "用户上传的文件和相关元数据",
    },
    {
      id: "4",
      dataType: "登录历史",
      retentionPeriod: 6,
      unit: "months",
      autoDelete: true,
      description: "用户登录和会话信息",
    },
  ])

  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([
    {
      id: "1",
      purpose: "服务提供",
      dataTypes: ["基本信息", "使用数据"],
      consentDate: "2024-01-15",
      status: "active",
      source: "注册时同意",
    },
    {
      id: "2",
      purpose: "营销推广",
      dataTypes: ["联系信息", "偏好数据"],
      consentDate: "2024-01-15",
      expiryDate: "2025-01-15",
      status: "active",
      source: "用户主动选择",
    },
    {
      id: "3",
      purpose: "数据分析",
      dataTypes: ["使用行为", "设备信息"],
      consentDate: "2024-01-10",
      status: "withdrawn",
      source: "设置页面撤回",
    },
  ])

  const [globalPrivacyLevel, setGlobalPrivacyLevel] = useState<"basic" | "standard" | "strict">("standard")

  const privacyCategories = [
    { id: "数据收集", name: "数据收集", icon: Database },
    { id: "数据共享", name: "数据共享", icon: Users },
    { id: "个人资料", name: "个人资料", icon: Eye },
    { id: "通信", name: "通信", icon: Bell },
  ]

  const togglePrivacySetting = (settingId: string) => {
    setPrivacySettings((settings) =>
      settings.map((setting) => (setting.id === settingId ? { ...setting, isEnabled: !setting.isEnabled } : setting)),
    )
  }

  const updateRetentionPolicy = (policyId: string, field: string, value: any) => {
    setDataRetentionPolicies((policies) =>
      policies.map((policy) => (policy.id === policyId ? { ...policy, [field]: value } : policy)),
    )
  }

  const withdrawConsent = (consentId: string) => {
    setConsentRecords((records) =>
      records.map((record) => (record.id === consentId ? { ...record, status: "withdrawn" as const } : record)),
    )
  }

  const applyGlobalPrivacyLevel = (level: "basic" | "standard" | "strict") => {
    setGlobalPrivacyLevel(level)
    setPrivacySettings((settings) =>
      settings.map((setting) => ({
        ...setting,
        isEnabled:
          setting.level === "basic" ||
          (level === "standard" && setting.level !== "strict") ||
          (level === "strict" && false),
      })),
    )
  }

  const getPrivacyScore = () => {
    const enabledCount = privacySettings.filter((s) => s.isEnabled).length
    const totalCount = privacySettings.length
    return Math.round((1 - enabledCount / totalCount) * 100)
  }

  const getConsentStatusColor = (status: ConsentRecord["status"]) => {
    switch (status) {
      case "active":
        return "text-green-600"
      case "expired":
        return "text-orange-600"
      case "withdrawn":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getConsentStatusText = (status: ConsentRecord["status"]) => {
    switch (status) {
      case "active":
        return "有效"
      case "expired":
        return "已过期"
      case "withdrawn":
        return "已撤回"
      default:
        return "未知"
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">隐私设置</h1>
        <p className="text-muted-foreground">管理您的数据隐私和个人信息保护设置</p>
      </div>

      {/* 隐私概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            隐私概览
          </CardTitle>
          <CardDescription>您当前的隐私保护状态</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{getPrivacyScore()}%</div>
              <div className="text-sm text-muted-foreground">隐私保护评分</div>
            </div>
            <div className="w-32">
              <Progress value={getPrivacyScore()} className="h-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-lg font-semibold text-green-600">
                {privacySettings.filter((s) => !s.isEnabled && s.level === "strict").length}
              </div>
              <div className="text-sm text-muted-foreground">严格保护项</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-lg font-semibold text-blue-600">
                {consentRecords.filter((c) => c.status === "active").length}
              </div>
              <div className="text-sm text-muted-foreground">有效授权</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-lg font-semibold text-orange-600">
                {dataRetentionPolicies.filter((p) => p.autoDelete).length}
              </div>
              <div className="text-sm text-muted-foreground">自动清理策略</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 快速隐私设置 */}
      <Card>
        <CardHeader>
          <CardTitle>快速隐私设置</CardTitle>
          <CardDescription>选择适合您的隐私保护级别</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant={globalPrivacyLevel === "basic" ? "default" : "outline"}
              className="h-auto p-4 flex flex-col items-start gap-2"
              onClick={() => applyGlobalPrivacyLevel("basic")}
            >
              <div className="font-medium">基础保护</div>
              <div className="text-sm text-left">启用基本隐私保护，允许必要的数据收集以提供服务</div>
            </Button>
            <Button
              variant={globalPrivacyLevel === "standard" ? "default" : "outline"}
              className="h-auto p-4 flex flex-col items-start gap-2"
              onClick={() => applyGlobalPrivacyLevel("standard")}
            >
              <div className="font-medium">标准保护</div>
              <div className="text-sm text-left">平衡隐私保护和功能体验，推荐大多数用户使用</div>
            </Button>
            <Button
              variant={globalPrivacyLevel === "strict" ? "default" : "outline"}
              className="h-auto p-4 flex flex-col items-start gap-2"
              onClick={() => applyGlobalPrivacyLevel("strict")}
            >
              <div className="font-medium">严格保护</div>
              <div className="text-sm text-left">最大化隐私保护，可能影响部分功能的使用体验</div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 详细设置 */}
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">隐私设置</TabsTrigger>
          <TabsTrigger value="retention">数据保留</TabsTrigger>
          <TabsTrigger value="consent">授权管理</TabsTrigger>
          <TabsTrigger value="compliance">合规监控</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <div className="space-y-6">
            {privacyCategories.map((category) => {
              const categorySettings = privacySettings.filter((s) => s.category === category.id)
              return (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <category.icon className="h-5 w-5" />
                      {category.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {categorySettings.map((setting) => (
                      <div key={setting.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{setting.name}</span>
                            <Badge
                              variant={
                                setting.level === "strict"
                                  ? "destructive"
                                  : setting.level === "standard"
                                    ? "default"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {setting.level === "strict" ? "严格" : setting.level === "standard" ? "标准" : "基础"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        </div>
                        <Switch checked={setting.isEnabled} onCheckedChange={() => togglePrivacySetting(setting.id)} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="retention">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                数据保留策略
              </CardTitle>
              <CardDescription>管理不同类型数据的保留期限</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dataRetentionPolicies.map((policy) => (
                <div key={policy.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{policy.dataType}</h4>
                      <p className="text-sm text-muted-foreground">{policy.description}</p>
                    </div>
                    <Switch
                      checked={policy.autoDelete}
                      onCheckedChange={(checked) => updateRetentionPolicy(policy.id, "autoDelete", checked)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>保留期限</Label>
                      <div className="flex gap-2">
                        <Select
                          value={policy.retentionPeriod.toString()}
                          onValueChange={(value) =>
                            updateRetentionPolicy(policy.id, "retentionPeriod", Number.parseInt(value))
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={policy.unit}
                          onValueChange={(value) => updateRetentionPolicy(policy.id, "unit", value)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="days">天</SelectItem>
                            <SelectItem value="months">月</SelectItem>
                            <SelectItem value="years">年</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>自动删除</Label>
                      <div className="flex items-center gap-2 text-sm">
                        {policy.autoDelete ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        <span>{policy.autoDelete ? "启用自动删除" : "需要手动删除"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consent">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                授权管理
              </CardTitle>
              <CardDescription>查看和管理您的数据使用授权</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {consentRecords.map((consent) => (
                <div key={consent.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{consent.purpose}</h4>
                      <p className="text-sm text-muted-foreground">授权来源: {consent.source}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          consent.status === "active"
                            ? "default"
                            : consent.status === "expired"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {getConsentStatusText(consent.status)}
                      </Badge>
                      {consent.status === "active" && (
                        <Button variant="outline" size="sm" onClick={() => withdrawConsent(consent.id)}>
                          撤回授权
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">数据类型: </span>
                      <span>{consent.dataTypes.join(", ")}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">授权日期: </span>
                      <span>{consent.consentDate}</span>
                    </div>
                    {consent.expiryDate && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">到期日期: </span>
                        <span>{consent.expiryDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                合规监控
              </CardTitle>
              <CardDescription>确保符合各地区的隐私法规要求</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* GDPR 合规 */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">GDPR (欧盟通用数据保护条例)</h4>
                    <p className="text-sm text-muted-foreground">适用于欧盟用户的数据保护要求</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>数据处理合法性</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>用户同意机制</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>数据可携带权</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>被遗忘权</span>
                  </div>
                </div>
              </div>

              {/* CCPA 合规 */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">CCPA (加州消费者隐私法)</h4>
                    <p className="text-sm text-muted-foreground">适用于加州用户的隐私权保护</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>知情权</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>删除权</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>选择退出权</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>非歧视权</span>
                  </div>
                </div>
              </div>

              {/* 中国网络安全法 */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">中国网络安全法</h4>
                    <p className="text-sm text-muted-foreground">适用于中国境内的网络安全和数据保护</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>数据本地化</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>用户信息保护</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>安全评估</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>事件报告</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 数据导出和删除 */}
      <Card>
        <CardHeader>
          <CardTitle>数据管理</CardTitle>
          <CardDescription>导出或删除您的个人数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2 bg-transparent">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span className="font-medium">导出我的数据</span>
              </div>
              <p className="text-sm text-muted-foreground text-left">下载您在系统中的所有个人数据副本</p>
            </Button>

            <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2 bg-transparent">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                <span className="font-medium">删除我的账户</span>
              </div>
              <p className="text-sm text-muted-foreground text-left">永久删除您的账户和所有相关数据</p>
            </Button>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">重要提醒</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  删除账户是不可逆的操作。删除后，您将无法恢复任何数据。请在操作前确保已备份重要信息。
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
