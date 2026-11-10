"use client"

import type React from "react"

import { useState } from "react"
import { UserPlus, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AnimatedContainer } from "../design-system/animation-system"
import { EnhancedCard } from "../design-system/enhanced-card-system"

export function AddUser() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    password: "",
    confirmPassword: "",
    notes: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // 这里添加用户创建逻辑
    console.log("创建用户:", formData)
  }

  const handleReset = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "",
      department: "",
      password: "",
      confirmPassword: "",
      notes: "",
    })
  }

  return (
    <AnimatedContainer animation="fadeIn">
      <EnhancedCard variant="modern" size="lg" glowEffect>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <UserPlus className="h-6 w-6 mr-2" />
            新增用户
          </CardTitle>
          <CardDescription>填写用户基本信息，创建新的系统账户</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">姓名 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入用户姓名"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">邮箱 *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="请输入邮箱地址"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">手机号</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="请输入手机号码"
                  />
                </div>

                <div>
                  <Label htmlFor="role">角色 *</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择用户角色" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">管理员</SelectItem>
                      <SelectItem value="manager">经理</SelectItem>
                      <SelectItem value="employee">员工</SelectItem>
                      <SelectItem value="guest">访客</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="department">部门</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择所属部门" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tech">技术部</SelectItem>
                      <SelectItem value="sales">销售部</SelectItem>
                      <SelectItem value="marketing">市场部</SelectItem>
                      <SelectItem value="hr">人事部</SelectItem>
                      <SelectItem value="finance">财务部</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="password">密码 *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="请输入密码"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">确认密码 *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="请再次输入密码"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="notes">备注</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="添加用户备注信息..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button type="button" variant="outline" onClick={handleReset}>
                <X className="h-4 w-4 mr-2" />
                重置
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                创建用户
              </Button>
            </div>
          </form>
        </CardContent>
      </EnhancedCard>
    </AnimatedContainer>
  )
}
