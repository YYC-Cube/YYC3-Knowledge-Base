"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle,
  AlertTriangle,
  Star,
  TrendingUp,
  Users,
  BarChart3,
  Brain,
  Briefcase,
  Settings,
  Target,
  User,
} from "lucide-react"

interface MenuAnalysis {
  menuTitle: string
  icon: any
  subMenus: string[]
  functionalityScore: number
  uiConsistencyScore: number
  implementationStatus: "完整" | "部分" | "缺失"
  issues: string[]
  recommendations: string[]
}

const navigationAnalysis: MenuAnalysis[] = [
  {
    menuTitle: "数据中心",
    icon: BarChart3,
    subMenus: ["数据中心", "实时协作", "微信集成"],
    functionalityScore: 85,
    uiConsistencyScore: 90,
    implementationStatus: "完整",
    issues: ["缺少数据导出功能", "实时协作功能需要完善"],
    recommendations: ["添加数据导出和导入功能", "完善实时协作的WebSocket连接", "增加数据可视化图表类型"],
  },
  {
    menuTitle: "用户管理",
    icon: Users,
    subMenus: ["用户列表", "用户详情", "新增用户", "角色权限", "用户配置", "封禁管理"],
    functionalityScore: 92,
    uiConsistencyScore: 88,
    implementationStatus: "完整",
    issues: ["用户详情页面缺少操作日志", "批量操作功能不完善"],
    recommendations: ["添加用户操作历史记录", "实现批量用户导入/导出", "增加用户行为分析功能"],
  },
  {
    menuTitle: "数据分析",
    icon: TrendingUp,
    subMenus: ["数据概览", "用户分析", "业务分析", "报表中心", "实时监控", "数据预警"],
    functionalityScore: 78,
    uiConsistencyScore: 85,
    implementationStatus: "部分",
    issues: ["报表中心功能未完全实现", "数据预警规则配置缺失", "图表交互性不足"],
    recommendations: ["完善报表生成和自定义功能", "实现智能数据预警系统", "增加更多图表类型和交互功能"],
  },
  {
    menuTitle: "智能引擎",
    icon: Brain,
    subMenus: ["AI 智能", "机器学习", "数据挖掘", "存储管理", "开发环境", "知识智库"],
    functionalityScore: 70,
    uiConsistencyScore: 82,
    implementationStatus: "部分",
    issues: ["AI功能主要为展示界面", "机器学习模型训练功能缺失", "知识库搜索功能不完善"],
    recommendations: ["集成真实的AI模型和API", "实现模型训练和部署流程", "完善知识库的全文搜索功能"],
  },
  {
    menuTitle: "商务功能",
    icon: Briefcase,
    subMenus: ["商务管理", "财务管理", "订单管理", "ERP系统", "CRM客户", "供应链"],
    functionalityScore: 88,
    uiConsistencyScore: 90,
    implementationStatus: "完整",
    issues: ["财务报表生成功能需要完善", "ERP系统集成度有待提高"],
    recommendations: ["增加更多财务分析维度", "完善ERP各模块间的数据流转", "添加业务流程自动化功能"],
  },
  {
    menuTitle: "系统设置",
    icon: Settings,
    subMenus: ["常规设置", "安全设置", "权限管理", "隐私设置", "通知设置", "外观设置"],
    functionalityScore: 75,
    uiConsistencyScore: 88,
    implementationStatus: "部分",
    issues: ["权限管理粒度不够细", "通知设置缺少实时推送", "外观设置选项有限"],
    recommendations: ["实现细粒度权限控制", "集成实时通知推送服务", "增加更多主题和自定义选项"],
  },
  {
    menuTitle: "项目管理",
    icon: Target,
    subMenus: ["项目概览", "任务管理", "开发执行", "敏捷工作流", "CI/CD流水线", "开发路线图"],
    functionalityScore: 82,
    uiConsistencyScore: 85,
    implementationStatus: "完整",
    issues: ["任务依赖关系展示不清晰", "CI/CD集成需要完善"],
    recommendations: ["添加甘特图和任务依赖可视化", "完善CI/CD流水线监控", "增加项目风险评估功能"],
  },
  {
    menuTitle: "个人资料",
    icon: User,
    subMenus: ["基本信息", "编辑资料", "头像设置", "联系方式", "地址信息", "账户安全"],
    functionalityScore: 90,
    uiConsistencyScore: 92,
    implementationStatus: "完整",
    issues: ["头像上传功能需要优化", "账户安全设置选项可以更丰富"],
    recommendations: ["支持多种头像上传方式", "增加两步验证等安全功能", "添加个人偏好设置"],
  },
]

export function NavigationAnalysisReport() {
  const overallScore = Math.round(
    navigationAnalysis.reduce((sum, item) => sum + (item.functionalityScore + item.uiConsistencyScore) / 2, 0) /
      navigationAnalysis.length,
  )

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 80) return "text-blue-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "完整":
        return "bg-green-100 text-green-800"
      case "部分":
        return "bg-yellow-100 text-yellow-800"
      case "缺失":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">导航系统分析报告</h1>
        <p className="text-muted-foreground mb-4">YanYu Cloud³ 智能商务中心导航体验评估</p>
        <div className="flex items-center justify-center space-x-4">
          <div className="text-center">
            <div className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>{overallScore}</div>
            <div className="text-sm text-muted-foreground">综合评分</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">总体概览</TabsTrigger>
          <TabsTrigger value="functionality">功能匹配度</TabsTrigger>
          <TabsTrigger value="ui-consistency">UI一致性</TabsTrigger>
          <TabsTrigger value="recommendations">优化建议</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold">5</div>
                  <div className="text-sm text-muted-foreground">完整实现模块</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                  <div className="text-2xl font-bold">3</div>
                  <div className="text-sm text-muted-foreground">部分实现模块</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Star className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold">42</div>
                  <div className="text-sm text-muted-foreground">子功能模块</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>模块实现状态概览</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {navigationAnalysis.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <item.icon className="h-5 w-5" />
                      <div>
                        <div className="font-medium">{item.menuTitle}</div>
                        <div className="text-sm text-muted-foreground">{item.subMenus.length} 个子模块</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge className={getStatusColor(item.implementationStatus)}>{item.implementationStatus}</Badge>
                      <div className="text-right">
                        <div
                          className={`font-medium ${getScoreColor((item.functionalityScore + item.uiConsistencyScore) / 2)}`}
                        >
                          {Math.round((item.functionalityScore + item.uiConsistencyScore) / 2)}分
                        </div>
                        <div className="text-xs text-muted-foreground">综合评分</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="functionality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>功能匹配度分析</CardTitle>
              <CardDescription>评估主菜单项与子页面功能的对应关系</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {navigationAnalysis.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <item.icon className="h-5 w-5" />
                        <h3 className="font-medium">{item.menuTitle}</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${getScoreColor(item.functionalityScore)}`}>
                          {item.functionalityScore}分
                        </span>
                        <Progress value={item.functionalityScore} className="w-20" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">子功能模块</h4>
                        <div className="flex flex-wrap gap-1">
                          {item.subMenus.map((subMenu, subIndex) => (
                            <Badge key={subIndex} variant="outline" className="text-xs">
                              {subMenu}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">发现问题</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {item.issues.map((issue, issueIndex) => (
                            <li key={issueIndex} className="flex items-start">
                              <span className="text-red-500 mr-1">•</span>
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ui-consistency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>UI一致性分析</CardTitle>
              <CardDescription>评估各子页面在布局、配色、组件风格上的一致性</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {navigationAnalysis.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <item.icon className="h-5 w-5" />
                        <h3 className="font-medium">{item.menuTitle}</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${getScoreColor(item.uiConsistencyScore)}`}>
                          {item.uiConsistencyScore}分
                        </span>
                        <Progress value={item.uiConsistencyScore} className="w-20" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium mb-2">布局一致性</h4>
                        <div className="flex items-center space-x-2">
                          {item.uiConsistencyScore >= 85 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          <span>{item.uiConsistencyScore >= 85 ? "良好" : "需优化"}</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">组件复用</h4>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>统一使用设计系统</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">交互体验</h4>
                        <div className="flex items-center space-x-2">
                          {item.uiConsistencyScore >= 90 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          <span>{item.uiConsistencyScore >= 90 ? "优秀" : "良好"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>优化建议</CardTitle>
              <CardDescription>基于分析结果提出的改进建议</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-medium mb-3 flex items-center">
                    <Star className="h-5 w-5 mr-2 text-blue-600" />
                    高优先级优化项
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">1.</span>
                      <span>
                        <strong>导航状态保持：</strong>实现面包屑导航和当前菜单高亮，避免页面跳转后状态重置
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">2.</span>
                      <span>
                        <strong>数据分析模块完善：</strong>实现报表中心和数据预警的完整功能
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">3.</span>
                      <span>
                        <strong>AI功能集成：</strong>集成真实的AI模型和API，提供实用的智能功能
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4 bg-yellow-50">
                  <h3 className="font-medium mb-3 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
                    中优先级优化项
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-yellow-600 mr-2">1.</span>
                      <span>
                        <strong>权限管理细化：</strong>实现更细粒度的权限控制和角色管理
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-600 mr-2">2.</span>
                      <span>
                        <strong>批量操作功能：</strong>在用户管理等模块中增加批量操作能力
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-600 mr-2">3.</span>
                      <span>
                        <strong>实时通知系统：</strong>集成WebSocket实现实时消息推送
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4 bg-green-50">
                  <h3 className="font-medium mb-3 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    低优先级优化项
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">1.</span>
                      <span>
                        <strong>主题定制：</strong>增加更多外观主题和个性化选项
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">2.</span>
                      <span>
                        <strong>数据可视化：</strong>增加更多图表类型和交互功能
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">3.</span>
                      <span>
                        <strong>移动端适配：</strong>优化移动设备上的使用体验
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
