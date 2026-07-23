"use client"

import { useState } from "react"
import { Ban, Search, Filter, MoreHorizontal, UserX, UserCheck, Clock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AnimatedContainer } from "../design-system/animation-system"
import { EnhancedCard } from "../design-system/enhanced-card-system"

interface BannedUser {
  id: string
  name: string
  email: string
  avatar?: string
  banReason: string
  banDate: string
  banDuration: string
  status: "banned" | "suspended" | "warning"
  bannedBy: string
}

export function BanManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const bannedUsers: BannedUser[] = [
    {
      id: "1",
      name: "李四",
      email: "lisi@example.com",
      banReason: "违规发布内容",
      banDate: "2024-01-10",
      banDuration: "7天",
      status: "banned",
      bannedBy: "管理员",
    },
    {
      id: "2",
      name: "王五",
      email: "wangwu@example.com",
      banReason: "恶意刷屏",
      banDate: "2024-01-12",
      banDuration: "3天",
      status: "suspended",
      bannedBy: "系统自动",
    },
    {
      id: "3",
      name: "赵六",
      email: "zhaoliu@example.com",
      banReason: "多次违规操作",
      banDate: "2024-01-08",
      banDuration: "永久",
      status: "banned",
      bannedBy: "超级管理员",
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "banned":
        return <Badge variant="destructive">已封禁</Badge>
      case "suspended":
        return <Badge variant="secondary">已暂停</Badge>
      case "warning":
        return <Badge variant="outline">警告</Badge>
      default:
        return <Badge>未知</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "banned":
        return <UserX className="h-4 w-4 text-red-500" />
      case "suspended":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      default:
        return <UserCheck className="h-4 w-4 text-green-500" />
    }
  }

  const filteredUsers = bannedUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <AnimatedContainer animation="fadeIn">
        <EnhancedCard variant="modern" glowEffect>
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Ban className="h-6 w-6 mr-2" />
              封禁管理
            </CardTitle>
            <CardDescription>管理被封禁、暂停或警告的用户账户</CardDescription>
          </CardHeader>
        </EnhancedCard>
      </AnimatedContainer>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AnimatedContainer animation="slideUp" delay={100}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserX className="h-8 w-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">已封禁</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={200}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">已暂停</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={300}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">警告中</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={400}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserCheck className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">本月解封</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>
      </div>

      <AnimatedContainer animation="slideUp" delay={500}>
        <EnhancedCard variant="modern">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <CardTitle>用户列表</CardTitle>
                <CardDescription>查看和管理被处罚的用户</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="搜索用户..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="banned">已封禁</SelectItem>
                    <SelectItem value="suspended">已暂停</SelectItem>
                    <SelectItem value="warning">警告</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>封禁原因</TableHead>
                  <TableHead>封禁时间</TableHead>
                  <TableHead>持续时间</TableHead>
                  <TableHead>操作人</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(user.status)}
                        {getStatusBadge(user.status)}
                      </div>
                    </TableCell>
                    <TableCell>{user.banReason}</TableCell>
                    <TableCell>{user.banDate}</TableCell>
                    <TableCell>{user.banDuration}</TableCell>
                    <TableCell>{user.bannedBy}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <UserCheck className="h-4 w-4 mr-2" />
                            解除封禁
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Clock className="h-4 w-4 mr-2" />
                            修改期限
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <UserX className="h-4 w-4 mr-2" />
                            永久封禁
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </EnhancedCard>
      </AnimatedContainer>
    </div>
  )
}
