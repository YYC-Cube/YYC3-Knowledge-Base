"use client"

import { useState, useEffect, useCallback } from "react"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, MessageSquare, Edit3, Eye, RefreshCw, Smartphone, Monitor, Wifi, WifiOff } from "lucide-react"

import { EnhancedCard } from "../design-system/enhanced-card-system"
import { AnimatedContainer } from "../design-system/animation-system"
import { useSound } from "../design-system/sound-system"

interface CollaboratorStatus {
  id: string
  name: string
  avatar: string
  role: string
  status: "online" | "editing" | "viewing" | "offline"
  platform: "web" | "mobile" | "wechat"
  lastAction: string
  timestamp: string
  cursor?: {
    x: number
    y: number
    cell?: string
  }
}

interface ConflictResolution {
  id: string
  type: "cell_conflict" | "formula_conflict" | "format_conflict"
  description: string
  users: string[]
  timestamp: string
  status: "pending" | "resolved" | "auto_resolved"
}

export function CollaborationEngine() {
  const [collaborators, setCollaborators] = useState<CollaboratorStatus[]>([
    {
      id: "1",
      name: "张小明",
      avatar: "",
      role: "数据分析师",
      status: "editing",
      platform: "wechat",
      lastAction: "正在编辑 A1:C10 区域",
      timestamp: "刚刚",
      cursor: { x: 120, y: 80, cell: "B5" },
    },
    {
      id: "2",
      name: "李小红",
      avatar: "",
      role: "产品经理",
      status: "viewing",
      platform: "web",
      lastAction: "查看销售数据",
      timestamp: "2分钟前",
    },
    {
      id: "3",
      name: "王小华",
      avatar: "",
      role: "运营专员",
      status: "online",
      platform: "mobile",
      lastAction: "刚刚加入协作",
      timestamp: "5分钟前",
    },
  ])

  const [conflicts, setConflicts] = useState<ConflictResolution[]>([
    {
      id: "1",
      type: "cell_conflict",
      description: "单元格 D15 存在编辑冲突",
      users: ["张小明", "李小红"],
      timestamp: "1分钟前",
      status: "pending",
    },
  ])

  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "conflict" | "offline">("synced")
  const { playSound } = useSound()

  // 模拟实时协作状态更新
  useEffect(() => {
    const interval = setInterval(() => {
      setCollaborators((prev) =>
        prev.map((collaborator) => ({
          ...collaborator,
          cursor:
            collaborator.status === "editing"
              ? {
                  x: Math.random() * 300 + 50,
                  y: Math.random() * 200 + 50,
                  cell: `${String.fromCharCode(65 + Math.floor(Math.random() * 5))}${Math.floor(Math.random() * 20) + 1}`,
                }
              : undefined,
        })),
      )
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleConflictResolve = useCallback(
    (conflictId: string, resolution: "accept" | "reject" | "merge") => {
      playSound("success")
      setConflicts((prev) =>
        prev.map((conflict) => (conflict.id === conflictId ? { ...conflict, status: "resolved" as const } : conflict)),
      )
    },
    [playSound],
  )

  const getStatusColor = (status: CollaboratorStatus["status"]) => {
    switch (status) {
      case "online":
        return "bg-traditional-jade"
      case "editing":
        return "bg-primary-500 animate-pulse"
      case "viewing":
        return "bg-accent-500"
      case "offline":
        return "bg-secondary-400"
      default:
        return "bg-secondary-400"
    }
  }

  const getPlatformIcon = (platform: CollaboratorStatus["platform"]) => {
    switch (platform) {
      case "wechat":
        return <MessageSquare className="w-3 h-3 text-traditional-jade" />
      case "mobile":
        return <Smartphone className="w-3 h-3 text-primary-500" />
      case "web":
        return <Monitor className="w-3 h-3 text-accent-500" />
      default:
        return <Monitor className="w-3 h-3 text-secondary-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* 协作状态概览 */}
      <div className="grid gap-4 md:grid-cols-4">
        <EnhancedCard variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>在线协作者</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-500">
              {collaborators.filter((c) => c.status !== "offline").length}
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Edit3 className="w-4 h-4" />
              <span>正在编辑</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-traditional-jade">
              {collaborators.filter((c) => c.status === "editing").length}
            </div>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center space-x-2">
              {syncStatus === "synced" ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span>同步状态</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={syncStatus === "synced" ? "default" : "destructive"}>
              {syncStatus === "synced" ? "已同步" : "同步中"}
            </Badge>
          </CardContent>
        </EnhancedCard>

        <EnhancedCard variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>冲突处理</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent-500">
              {conflicts.filter((c) => c.status === "pending").length}
            </div>
          </CardContent>
        </EnhancedCard>
      </div>

      {/* 协作者列表 */}
      <EnhancedCard variant="traditional">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>实时协作状态</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {collaborators.map((collaborator, index) => (
              <AnimatedContainer key={collaborator.id} animation="slideRight" delay={index * 100}>
                <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-secondary-200/50">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gradient-to-r from-primary-500 to-accent-500 text-white text-xs">
                          {collaborator.name.slice(-2)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(collaborator.status)}`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{collaborator.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {collaborator.role}
                        </Badge>
                        {getPlatformIcon(collaborator.platform)}
                      </div>
                      <div className="text-xs text-secondary-500">
                        {collaborator.lastAction}
                        {collaborator.cursor && (
                          <span className="ml-2 text-primary-500">@ {collaborator.cursor.cell}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant={collaborator.status === "editing" ? "default" : "secondary"}>
                      {collaborator.status === "editing" ? (
                        <Edit3 className="w-3 h-3 mr-1" />
                      ) : (
                        <Eye className="w-3 h-3 mr-1" />
                      )}
                      {collaborator.status}
                    </Badge>
                    <span className="text-xs text-secondary-500">{collaborator.timestamp}</span>
                  </div>
                </div>
              </AnimatedContainer>
            ))}
          </div>
        </CardContent>
      </EnhancedCard>

      {/* 冲突解决 */}
      {conflicts.filter((c) => c.status === "pending").length > 0 && (
        <EnhancedCard variant="glass" className="border-accent-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-accent-600">
              <RefreshCw className="w-5 h-5" />
              <span>冲突解决</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conflicts
                .filter((c) => c.status === "pending")
                .map((conflict, index) => (
                  <AnimatedContainer key={conflict.id} animation="slideUp" delay={index * 100}>
                    <div className="p-4 bg-accent-50 rounded-lg border border-accent-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="destructive">{conflict.type}</Badge>
                          <span className="text-sm font-medium">{conflict.description}</span>
                        </div>
                        <span className="text-xs text-secondary-500">{conflict.timestamp}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-secondary-600">涉及用户: {conflict.users.join(", ")}</div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConflictResolve(conflict.id, "reject")}
                          >
                            拒绝
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConflictResolve(conflict.id, "merge")}
                          >
                            合并
                          </Button>
                          <Button size="sm" onClick={() => handleConflictResolve(conflict.id, "accept")}>
                            接受
                          </Button>
                        </div>
                      </div>
                    </div>
                  </AnimatedContainer>
                ))}
            </div>
          </CardContent>
        </EnhancedCard>
      )}
    </div>
  )
}
