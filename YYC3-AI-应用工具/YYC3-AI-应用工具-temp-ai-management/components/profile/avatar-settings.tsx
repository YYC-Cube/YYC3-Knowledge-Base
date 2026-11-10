"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Upload,
  Camera,
  Trash2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Download,
  User,
  ImageIcon,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

interface AvatarHistory {
  id: string
  url: string
  uploadDate: string
  size: string
  type: string
}

export function AvatarSettings() {
  const [currentAvatar, setCurrentAvatar] = useState("/placeholder-user.jpg")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const avatarHistory: AvatarHistory[] = [
    {
      id: "1",
      url: "/placeholder-user.jpg",
      uploadDate: "2024-01-15",
      size: "256KB",
      type: "JPG",
    },
    {
      id: "2",
      url: "/placeholder.svg",
      uploadDate: "2024-01-10",
      size: "128KB",
      type: "PNG",
    },
    {
      id: "3",
      url: "/placeholder-logo.png",
      uploadDate: "2024-01-05",
      size: "512KB",
      type: "PNG",
    },
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith("image/")) {
        setUploadStatus("error")
        setTimeout(() => setUploadStatus("idle"), 3000)
        return
      }

      // 验证文件大小 (最大 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadStatus("error")
        setTimeout(() => setUploadStatus("idle"), 3000)
        return
      }

      // 创建预览
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // 模拟上传过程
      simulateUpload(file)
    }
  }

  const simulateUpload = async (file: File) => {
    setIsUploading(true)
    setUploadStatus("uploading")
    setUploadProgress(0)

    // 模拟上传进度
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      setUploadProgress(i)
    }

    try {
      // 模拟上传完成
      await new Promise((resolve) => setTimeout(resolve, 500))

      if (previewImage) {
        setCurrentAvatar(previewImage)
      }

      setUploadStatus("success")
      setTimeout(() => {
        setUploadStatus("idle")
        setPreviewImage(null)
      }, 3000)
    } catch (error) {
      setUploadStatus("error")
      setTimeout(() => setUploadStatus("idle"), 3000)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleDeleteAvatar = () => {
    setCurrentAvatar("/placeholder.svg")
    setPreviewImage(null)
  }

  const handleUseHistoryAvatar = (url: string) => {
    setCurrentAvatar(url)
  }

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case "uploading":
        return <Upload className="h-4 w-4 animate-spin" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Upload className="h-4 w-4" />
    }
  }

  const getStatusText = () => {
    switch (uploadStatus) {
      case "uploading":
        return "上传中..."
      case "success":
        return "上传成功"
      case "error":
        return "上传失败"
      default:
        return "上传头像"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">头像设置</h2>
        <p className="text-muted-foreground">管理您的个人头像和显示图片</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 当前头像 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              当前头像
            </CardTitle>
            <CardDescription>您当前使用的头像图片</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={previewImage || currentAvatar} />
                  <AvatarFallback className="text-2xl">
                    <User className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>
                {previewImage && <Badge className="absolute -top-2 -right-2 bg-blue-600">预览</Badge>}
              </div>

              <div className="text-center">
                <h3 className="font-semibold">系统管理员</h3>
                <p className="text-sm text-muted-foreground">@admin</p>
              </div>

              {/* 上传进度 */}
              {uploadStatus === "uploading" && (
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>上传进度</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex flex-wrap gap-2 justify-center">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

                <Button onClick={handleUploadClick} disabled={isUploading} className="flex items-center">
                  {getStatusIcon()}
                  <span className="ml-2">{getStatusText()}</span>
                </Button>

                <Button variant="outline" size="sm">
                  <Camera className="h-4 w-4 mr-2" />
                  拍照
                </Button>

                <Button variant="outline" size="sm" onClick={handleDeleteAvatar}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </Button>
              </div>
            </div>

            <Separator />

            {/* 头像要求 */}
            <div className="space-y-2">
              <h4 className="font-medium">头像要求</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 支持格式：JPG、PNG、GIF</li>
                <li>• 文件大小：最大 5MB</li>
                <li>• 推荐尺寸：256x256 像素</li>
                <li>• 建议使用正方形图片</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 头像编辑工具 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ImageIcon className="h-5 w-5 mr-2" />
              编辑工具
            </CardTitle>
            <CardDescription>调整和编辑您的头像</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewImage ? (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-muted/50">
                  <img
                    src={previewImage || "/placeholder.svg"}
                    alt="预览"
                    className="w-full h-48 object-cover rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">
                    <RotateCw className="h-4 w-4 mr-2" />
                    旋转
                  </Button>
                  <Button variant="outline" size="sm">
                    <ZoomIn className="h-4 w-4 mr-2" />
                    放大
                  </Button>
                  <Button variant="outline" size="sm">
                    <ZoomOut className="h-4 w-4 mr-2" />
                    缩小
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    下载
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => simulateUpload(new File([], "preview"))}
                    className="flex-1"
                    disabled={isUploading}
                  >
                    确认使用
                  </Button>
                  <Button variant="outline" onClick={() => setPreviewImage(null)} className="flex-1">
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">上传图片后可使用编辑工具</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 头像历史 */}
      <Card>
        <CardHeader>
          <CardTitle>头像历史</CardTitle>
          <CardDescription>您之前使用过的头像，点击可重新使用</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {avatarHistory.map((avatar) => (
              <div key={avatar.id} className="group cursor-pointer" onClick={() => handleUseHistoryAvatar(avatar.url)}>
                <div className="relative">
                  <Avatar className="h-16 w-16 group-hover:ring-2 group-hover:ring-primary transition-all">
                    <AvatarImage src={avatar.url || "/placeholder.svg"} />
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  {currentAvatar === avatar.url && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-green-600">
                      <CheckCircle className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs text-muted-foreground">{avatar.uploadDate}</p>
                  <p className="text-xs text-muted-foreground">{avatar.size}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
