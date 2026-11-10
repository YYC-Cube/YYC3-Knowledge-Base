"use client"

import { useState } from "react"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MessageSquare,
  Share2,
  QrCode,
  Users,
  Lock,
  Eye,
  Edit3,
  Calendar,
  Smartphone,
  Copy,
  Download,
} from "lucide-react"

import { EnhancedCard } from "../design-system/enhanced-card-system"
import { EnhancedButton } from "../design-system/enhanced-button-system"
import { AnimatedContainer } from "../design-system/animation-system"
import { useSound } from "../design-system/sound-system"

interface WeChatShareConfig {
  title: string
  description: string
  permissions: "view" | "edit" | "admin"
  expireTime: string
  allowForward: boolean
  requireAuth: boolean
  maxUsers: number
  watermark: boolean
}

export function WeChatIntegration() {
  const [shareConfig, setShareConfig] = useState<WeChatShareConfig>({
    title: "Q4销售数据表",
    description: "2024年第四季度销售业绩统计",
    permissions: "edit",
    expireTime: "7d",
    allowForward: true,
    requireAuth: false,
    maxUsers: 50,
    watermark: true,
  })

  const [generatedLink, setGeneratedLink] = useState<string>("")
  const [qrCode, setQrCode] = useState<string>("")
  const { playSound } = useSound()

  const handleGenerateShare = () => {
    playSound("success")
    // 模拟生成分享链接
    const mockLink = `https://yanyu.cloud/wechat/share/${Date.now()}`
    setGeneratedLink(mockLink)
    setQrCode(
      `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="100" y="100" textAnchor="middle" fill="black">QR Code</text></svg>`,
    )
  }

  const handleCopyLink = () => {
    playSound("click")
    navigator.clipboard.writeText(generatedLink)
  }

  return (
    <div className="space-y-6">
      {/* 微信集成概览 */}
      <div className="grid gap-4 md:grid-cols-3">
        <AnimatedContainer animation="slideUp" delay={0}>
          <EnhancedCard variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-traditional-jade" />
                <span>微信分享</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-traditional-jade">24</div>
              <p className="text-xs text-secondary-500">活跃链接</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={150}>
          <EnhancedCard variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Users className="w-4 h-4 text-primary-500" />
                <span>小程序用户</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary-500">1,247</div>
              <p className="text-xs text-secondary-500">总访问用户</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={300}>
          <EnhancedCard variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-accent-500" />
                <span>移动端占比</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent-500">68%</div>
              <p className="text-xs text-secondary-500">微信访问</p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>
      </div>

      {/* 分享配置 */}
      <EnhancedCard variant="traditional">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Share2 className="w-5 h-5" />
            <span>微信分享配置</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">分享标题</Label>
                <Input
                  id="title"
                  value={shareConfig.title}
                  onChange={(e) => setShareConfig({ ...shareConfig, title: e.target.value })}
                  placeholder="输入分享标题"
                />
              </div>

              <div>
                <Label htmlFor="description">分享描述</Label>
                <Textarea
                  id="description"
                  value={shareConfig.description}
                  onChange={(e) => setShareConfig({ ...shareConfig, description: e.target.value })}
                  placeholder="输入分享描述"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="permissions">访问权限</Label>
                <Select
                  value={shareConfig.permissions}
                  onValueChange={(value: "view" | "edit" | "admin") =>
                    setShareConfig({ ...shareConfig, permissions: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">
                      <div className="flex items-center space-x-2">
                        <Eye className="w-4 h-4" />
                        <span>仅查看</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="edit">
                      <div className="flex items-center space-x-2">
                        <Edit3 className="w-4 h-4" />
                        <span>可编辑</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center space-x-2">
                        <Lock className="w-4 h-4" />
                        <span>管理员</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expireTime">过期时间</Label>
                <Select
                  value={shareConfig.expireTime}
                  onValueChange={(value) => setShareConfig({ ...shareConfig, expireTime: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">1天</SelectItem>
                    <SelectItem value="3d">3天</SelectItem>
                    <SelectItem value="7d">7天</SelectItem>
                    <SelectItem value="30d">30天</SelectItem>
                    <SelectItem value="never">永不过期</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="maxUsers">最大用户数</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={shareConfig.maxUsers}
                  onChange={(e) => setShareConfig({ ...shareConfig, maxUsers: Number.parseInt(e.target.value) || 0 })}
                  placeholder="输入最大用户数"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="allowForward">允许转发</Label>
                  <Switch
                    id="allowForward"
                    checked={shareConfig.allowForward}
                    onCheckedChange={(checked) => setShareConfig({ ...shareConfig, allowForward: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="requireAuth">需要身份验证</Label>
                  <Switch
                    id="requireAuth"
                    checked={shareConfig.requireAuth}
                    onCheckedChange={(checked) => setShareConfig({ ...shareConfig, requireAuth: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="watermark">添加水印</Label>
                  <Switch
                    id="watermark"
                    checked={shareConfig.watermark}
                    onCheckedChange={(checked) => setShareConfig({ ...shareConfig, watermark: checked })}
                  />
                </div>
              </div>

              <EnhancedButton variant="primary" className="w-full" onClick={handleGenerateShare}>
                <Share2 className="w-4 h-4 mr-2" />
                生成微信分享链接
              </EnhancedButton>
            </div>
          </div>
        </CardContent>
      </EnhancedCard>

      {/* 生成的分享链接 */}
      {generatedLink && (
        <AnimatedContainer animation="slideUp">
          <EnhancedCard variant="glass" className="border-traditional-jade/30">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-traditional-jade">
                <QrCode className="w-5 h-5" />
                <span>分享链接已生成</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label>分享链接</Label>
                    <div className="flex space-x-2">
                      <Input value={generatedLink} readOnly className="font-mono text-sm" />
                      <Button variant="outline" size="icon" onClick={handleCopyLink}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-traditional-jade/10 text-traditional-jade">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      微信小程序
                    </Badge>
                    <Badge variant="outline" className="bg-primary-50 text-primary-600">
                      <Eye className="w-3 h-3 mr-1" />
                      {shareConfig.permissions}
                    </Badge>
                    <Badge variant="outline" className="bg-accent-50 text-accent-600">
                      <Calendar className="w-3 h-3 mr-1" />
                      {shareConfig.expireTime}
                    </Badge>
                  </div>

                  <div className="flex space-x-2">
                    <EnhancedButton variant="secondary" size="sm">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      发送到微信
                    </EnhancedButton>
                    <EnhancedButton variant="secondary" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      下载二维码
                    </EnhancedButton>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg border border-secondary-200">
                    <img src={qrCode || "/placeholder.svg"} alt="分享二维码" className="w-32 h-32" />
                    <p className="text-xs text-center text-secondary-500 mt-2">微信扫码访问</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>
      )}
    </div>
  )
}
