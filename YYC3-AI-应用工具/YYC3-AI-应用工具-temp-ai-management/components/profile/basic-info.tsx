"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Phone, MapPin, Calendar, Briefcase, Globe, Edit, Save, X, Camera, Star, Award } from "lucide-react"

interface UserProfile {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  bio: string
  phone: string
  location: string
  website: string
  company: string
  position: string
  department: string
  joinDate: string
  birthDate: string
  gender: "male" | "female" | "other" | "prefer-not-to-say"
  timezone: string
  language: string
  avatar: string
  coverImage: string
  socialLinks: {
    linkedin?: string
    twitter?: string
    github?: string
    facebook?: string
  }
  skills: string[]
  interests: string[]
  achievements: {
    id: string
    title: string
    description: string
    date: string
    icon: string
  }[]
}

export function BasicInfo() {
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState<UserProfile>({
    id: "1",
    username: "admin",
    email: "admin@example.com",
    firstName: "管理员",
    lastName: "用户",
    displayName: "系统管理员",
    bio: "负责系统管理和维护工作，拥有丰富的技术经验和团队管理能力。致力于提供高质量的技术服务和解决方案。",
    phone: "+86 138-0013-8000",
    location: "北京市朝阳区",
    website: "https://example.com",
    company: "科技有限公司",
    position: "技术总监",
    department: "技术部",
    joinDate: "2022-01-15",
    birthDate: "1990-05-20",
    gender: "prefer-not-to-say",
    timezone: "Asia/Shanghai",
    language: "zh-CN",
    avatar: "/placeholder-user.jpg",
    coverImage: "/placeholder.jpg",
    socialLinks: {
      linkedin: "https://linkedin.com/in/admin",
      github: "https://github.com/admin",
      twitter: "https://twitter.com/admin",
    },
    skills: ["React", "Node.js", "云计算", "系统架构", "团队管理", "DevOps"],
    interests: ["技术创新", "开源项目", "团队建设", "产品设计"],
    achievements: [
      {
        id: "1",
        title: "优秀员工",
        description: "2023年度优秀员工奖",
        date: "2023-12-31",
        icon: "🏆",
      },
      {
        id: "2",
        title: "技术专家",
        description: "获得公司技术专家认证",
        date: "2023-06-15",
        icon: "⭐",
      },
      {
        id: "3",
        title: "项目成功",
        description: "成功交付重要项目",
        date: "2023-03-20",
        icon: "🎯",
      },
    ],
  })

  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile)

  const handleSave = () => {
    setProfile(editedProfile)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedProfile(profile)
    setIsEditing(false)
  }

  const updateField = (field: keyof UserProfile, value: any) => {
    setEditedProfile((prev) => ({ ...prev, [field]: value }))
  }

  const updateSocialLink = (platform: string, url: string) => {
    setEditedProfile((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [platform]: url },
    }))
  }

  const addSkill = (skill: string) => {
    if (skill && !editedProfile.skills.includes(skill)) {
      setEditedProfile((prev) => ({
        ...prev,
        skills: [...prev.skills, skill],
      }))
    }
  }

  const removeSkill = (skill: string) => {
    setEditedProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
  }

  const addInterest = (interest: string) => {
    if (interest && !editedProfile.interests.includes(interest)) {
      setEditedProfile((prev) => ({
        ...prev,
        interests: [...prev.interests, interest],
      }))
    }
  }

  const removeInterest = (interest: string) => {
    setEditedProfile((prev) => ({
      ...prev,
      interests: prev.interests.filter((i) => i !== interest),
    }))
  }

  const currentProfile = isEditing ? editedProfile : profile

  return (
    <div className="space-y-6">
      {/* 个人资料头部 */}
      <Card>
        <CardContent className="p-0">
          <div className="relative">
            {/* 封面图片 */}
            <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-lg relative">
              <img
                src={currentProfile.coverImage || "/placeholder.svg"}
                alt="Cover"
                className="w-full h-full object-cover rounded-t-lg opacity-80"
              />
              {isEditing && (
                <Button variant="secondary" size="sm" className="absolute top-4 right-4">
                  <Camera className="h-4 w-4 mr-2" />
                  更换封面
                </Button>
              )}
            </div>

            {/* 头像和基本信息 */}
            <div className="relative px-6 pb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16">
                <div className="relative">
                  <Avatar className="h-32 w-32 border-4 border-background">
                    <AvatarImage src={currentProfile.avatar || "/placeholder.svg"} alt={currentProfile.displayName} />
                    <AvatarFallback className="text-2xl">{currentProfile.firstName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-0 right-0 rounded-full h-8 w-8 p-0"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h1 className="text-2xl font-bold">{currentProfile.displayName}</h1>
                      <p className="text-muted-foreground">@{currentProfile.username}</p>
                    </div>
                    <div className="flex gap-2">
                      {!isEditing ? (
                        <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          编辑资料
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={handleCancel}>
                            <X className="h-4 w-4 mr-2" />
                            取消
                          </Button>
                          <Button onClick={handleSave}>
                            <Save className="h-4 w-4 mr-2" />
                            保存
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      {currentProfile.position} @ {currentProfile.company}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {currentProfile.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      加入于 {new Date(currentProfile.joinDate).toLocaleDateString()}
                    </div>
                  </div>

                  <p className="text-sm">{currentProfile.bio}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 基本信息 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                基本信息
              </CardTitle>
              <CardDescription>管理您的个人基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>姓</Label>
                  {isEditing ? (
                    <Input value={editedProfile.lastName} onChange={(e) => updateField("lastName", e.target.value)} />
                  ) : (
                    <div className="p-2 bg-muted rounded">{currentProfile.lastName}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>名</Label>
                  {isEditing ? (
                    <Input value={editedProfile.firstName} onChange={(e) => updateField("firstName", e.target.value)} />
                  ) : (
                    <div className="p-2 bg-muted rounded">{currentProfile.firstName}</div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>显示名称</Label>
                {isEditing ? (
                  <Input
                    value={editedProfile.displayName}
                    onChange={(e) => updateField("displayName", e.target.value)}
                  />
                ) : (
                  <div className="p-2 bg-muted rounded">{currentProfile.displayName}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label>个人简介</Label>
                {isEditing ? (
                  <Textarea value={editedProfile.bio} onChange={(e) => updateField("bio", e.target.value)} rows={3} />
                ) : (
                  <div className="p-2 bg-muted rounded min-h-[80px]">{currentProfile.bio}</div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>性别</Label>
                  {isEditing ? (
                    <Select value={editedProfile.gender} onValueChange={(value) => updateField("gender", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">男</SelectItem>
                        <SelectItem value="female">女</SelectItem>
                        <SelectItem value="other">其他</SelectItem>
                        <SelectItem value="prefer-not-to-say">不愿透露</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 bg-muted rounded">
                      {currentProfile.gender === "male"
                        ? "男"
                        : currentProfile.gender === "female"
                          ? "女"
                          : currentProfile.gender === "other"
                            ? "其他"
                            : "不愿透露"}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>生日</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedProfile.birthDate}
                      onChange={(e) => updateField("birthDate", e.target.value)}
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded">
                      {new Date(currentProfile.birthDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 联系信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                联系信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>邮箱地址</Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={editedProfile.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                ) : (
                  <div className="p-2 bg-muted rounded flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {currentProfile.email}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>手机号码</Label>
                {isEditing ? (
                  <Input value={editedProfile.phone} onChange={(e) => updateField("phone", e.target.value)} />
                ) : (
                  <div className="p-2 bg-muted rounded flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {currentProfile.phone}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>所在地区</Label>
                {isEditing ? (
                  <Input value={editedProfile.location} onChange={(e) => updateField("location", e.target.value)} />
                ) : (
                  <div className="p-2 bg-muted rounded flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {currentProfile.location}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>个人网站</Label>
                {isEditing ? (
                  <Input value={editedProfile.website} onChange={(e) => updateField("website", e.target.value)} />
                ) : (
                  <div className="p-2 bg-muted rounded flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <a
                      href={currentProfile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {currentProfile.website}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 工作信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                工作信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>公司名称</Label>
                  {isEditing ? (
                    <Input value={editedProfile.company} onChange={(e) => updateField("company", e.target.value)} />
                  ) : (
                    <div className="p-2 bg-muted rounded">{currentProfile.company}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>职位</Label>
                  {isEditing ? (
                    <Input value={editedProfile.position} onChange={(e) => updateField("position", e.target.value)} />
                  ) : (
                    <div className="p-2 bg-muted rounded">{currentProfile.position}</div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>部门</Label>
                {isEditing ? (
                  <Input value={editedProfile.department} onChange={(e) => updateField("department", e.target.value)} />
                ) : (
                  <div className="p-2 bg-muted rounded">{currentProfile.department}</div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>入职日期</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedProfile.joinDate}
                      onChange={(e) => updateField("joinDate", e.target.value)}
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded">{new Date(currentProfile.joinDate).toLocaleDateString()}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>时区</Label>
                  {isEditing ? (
                    <Select value={editedProfile.timezone} onValueChange={(value) => updateField("timezone", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Shanghai">北京时间 (UTC+8)</SelectItem>
                        <SelectItem value="America/New_York">纽约时间 (UTC-5)</SelectItem>
                        <SelectItem value="Europe/London">伦敦时间 (UTC+0)</SelectItem>
                        <SelectItem value="Asia/Tokyo">东京时间 (UTC+9)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 bg-muted rounded">{currentProfile.timezone}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 侧边栏信息 */}
        <div className="space-y-6">
          {/* 技能标签 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                技能标签
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {currentProfile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                      {skill}
                      {isEditing && (
                        <button onClick={() => removeSkill(skill)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                {isEditing && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="添加技能"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          addSkill(e.currentTarget.value)
                          e.currentTarget.value = ""
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 兴趣爱好 */}
          <Card>
            <CardHeader>
              <CardTitle>兴趣爱好</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {currentProfile.interests.map((interest) => (
                    <Badge key={interest} variant="outline" className="flex items-center gap-1">
                      {interest}
                      {isEditing && (
                        <button onClick={() => removeInterest(interest)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                {isEditing && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="添加兴趣"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          addInterest(e.currentTarget.value)
                          e.currentTarget.value = ""
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 成就徽章 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                成就徽章
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentProfile.achievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium">{achievement.title}</div>
                      <div className="text-sm text-muted-foreground">{achievement.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(achievement.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 社交链接 */}
          <Card>
            <CardHeader>
              <CardTitle>社交链接</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                {isEditing ? (
                  <Input
                    value={editedProfile.socialLinks.linkedin || ""}
                    onChange={(e) => updateSocialLink("linkedin", e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                  />
                ) : (
                  currentProfile.socialLinks.linkedin && (
                    <a
                      href={currentProfile.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {currentProfile.socialLinks.linkedin}
                    </a>
                  )
                )}
              </div>

              <div className="space-y-2">
                <Label>GitHub</Label>
                {isEditing ? (
                  <Input
                    value={editedProfile.socialLinks.github || ""}
                    onChange={(e) => updateSocialLink("github", e.target.value)}
                    placeholder="https://github.com/username"
                  />
                ) : (
                  currentProfile.socialLinks.github && (
                    <a
                      href={currentProfile.socialLinks.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {currentProfile.socialLinks.github}
                    </a>
                  )
                )}
              </div>

              <div className="space-y-2">
                <Label>Twitter</Label>
                {isEditing ? (
                  <Input
                    value={editedProfile.socialLinks.twitter || ""}
                    onChange={(e) => updateSocialLink("twitter", e.target.value)}
                    placeholder="https://twitter.com/username"
                  />
                ) : (
                  currentProfile.socialLinks.twitter && (
                    <a
                      href={currentProfile.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {currentProfile.socialLinks.twitter}
                    </a>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
