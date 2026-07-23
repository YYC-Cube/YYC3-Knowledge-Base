"use client"

import { Bell, Brain, Settings, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FloatingElement } from "./animation-system"
import { SoundControls, SoundButton, useSound } from "./sound-system"
import { cn } from "@/lib/utils"

interface HeaderActionsProps {
  onMenuClick: (menu: string) => void
  activeMenu: string
}

export function HeaderActions({ onMenuClick, activeMenu }: HeaderActionsProps) {
  const { playSound } = useSound()

  const handleAIClick = () => {
    playSound("success")
    onMenuClick("AI 智能") // 跳转到AI智能页面
  }

  const handleSettingsClick = () => {
    playSound("click")
    onMenuClick("常规设置") // 跳转到系统设置的常规设置页面
  }

  const handleNotificationClick = () => {
    playSound("notification")
    onMenuClick("通知设置") // 跳转到通知设置页面
  }

  return (
    <div className="flex items-center space-x-3">
      {/* AI智能快捷入口 */}
      <FloatingElement>
        <SoundButton
          variant="ghost"
          size="icon"
          className={cn(
            "relative group transition-all duration-300",
            activeMenu === "AI 智能" ? "bg-primary-100 text-primary-700 hover:bg-primary-200" : "hover:bg-primary-50",
          )}
          onClick={handleAIClick}
          soundType="success"
          aria-label="AI智能助手 - 快速访问人工智能功能"
        >
          <Brain
            className={cn(
              "w-5 h-5 transition-colors duration-300",
              activeMenu === "AI 智能" ? "text-primary-700" : "text-secondary-600 group-hover:text-primary-600",
            )}
          />
          {/* AI状态指示器 */}
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-accent-400 to-accent-500 rounded-full animate-pulse" />
          {/* 悬停提示光环 */}
          <div className="absolute inset-0 rounded-full bg-primary-500/0 group-hover:bg-primary-500/10 transition-colors duration-300" />
        </SoundButton>
      </FloatingElement>

      {/* 系统设置快捷入口 */}
      <SoundButton
        variant="ghost"
        size="icon"
        className={cn(
          "group transition-all duration-300 relative",
          activeMenu === "常规设置" || activeMenu === "系统设置"
            ? "bg-primary-100 text-primary-700 hover:bg-primary-200"
            : "hover:bg-primary-50",
        )}
        onClick={handleSettingsClick}
        soundType="click"
        aria-label="系统设置 - 快速访问系统配置"
      >
        <Settings
          className={cn(
            "w-5 h-5 transition-all duration-300",
            activeMenu === "常规设置" || activeMenu === "系统设置"
              ? "text-primary-700 rotate-90"
              : "text-secondary-600 group-hover:text-primary-600 group-hover:rotate-90",
          )}
        />
        {/* 悬停提示光环 */}
        <div className="absolute inset-0 rounded-full bg-primary-500/0 group-hover:bg-primary-500/10 transition-colors duration-300" />
      </SoundButton>

      {/* 音效控制 */}
      <SoundControls />

      {/* 通知中心 */}
      <FloatingElement>
        <SoundButton
          variant="ghost"
          size="icon"
          className={cn(
            "relative group transition-all duration-300",
            activeMenu === "通知设置" ? "bg-primary-100 text-primary-700 hover:bg-primary-200" : "hover:bg-primary-50",
          )}
          onClick={handleNotificationClick}
          soundType="notification"
          aria-label="通知中心 - 当前有3条未读通知"
        >
          <Bell
            className={cn(
              "w-5 h-5 transition-colors duration-300",
              activeMenu === "通知设置" ? "text-primary-700" : "text-secondary-600 group-hover:text-primary-600",
            )}
          />
          <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs bg-gradient-to-r from-primary-500 to-accent-500 animate-pulse">
            3
          </Badge>
          {/* 悬停提示光环 */}
          <div className="absolute inset-0 rounded-full bg-primary-500/0 group-hover:bg-primary-500/10 transition-colors duration-300" />
        </SoundButton>
      </FloatingElement>

      {/* 用户菜单 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-full hover:bg-primary-50 transition-all duration-300 group"
            aria-label="用户菜单 - 当前用户：云端管理员"
          >
            <Avatar className="h-8 w-8 ring-2 ring-primary-200 group-hover:ring-primary-300 transition-all duration-300">
              <AvatarImage src="/placeholder.svg?height=32&width=32" alt="用户头像" />
              <AvatarFallback className="bg-gradient-to-r from-primary-500 to-accent-500 text-white text-xs font-bold">
                云³
              </AvatarFallback>
            </Avatar>
            {/* 在线状态指示器 */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-traditional-jade border-2 border-white rounded-full" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">云端管理员</p>
              <p className="text-xs leading-none text-secondary-500">admin@yanyu.cloud</p>
              <div className="flex items-center space-x-2 mt-2">
                <div className="w-2 h-2 bg-traditional-jade rounded-full" />
                <span className="text-xs text-traditional-jade">在线</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="hover:bg-primary-50 cursor-pointer" onClick={() => onMenuClick("个人资料")}>
            <User className="mr-2 h-4 w-4 text-primary-500" />
            <span>个人资料</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="hover:bg-primary-50 cursor-pointer" onClick={() => onMenuClick("常规设置")}>
            <Settings className="mr-2 h-4 w-4 text-primary-500" />
            <span>账户设置</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-traditional-crimson hover:bg-red-50 cursor-pointer">
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
