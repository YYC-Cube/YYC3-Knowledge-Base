"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Target,
  Zap,
  Shield,
  Cog,
} from "lucide-react"

interface Feature {
  id: string
  name: string
  description: string
  estimatedHours: number
  priority: "Critical" | "High" | "Medium" | "Low"
  status: "Not Started" | "In Progress" | "Completed" | "Blocked"
  dependencies: string[]
  businessImpact: string
  technicalRecommendations: string[]
  module: string
  assignedTeam: string
}

interface Quarter {
  id: string
  name: string
  period: string
  totalHours: number
  completionRate: number
  features: Feature[]
  objectives: string[]
  keyMilestones: string[]
}

const developmentRoadmap: Quarter[] = [
  {
    id: "q1",
    name: "Q1 2024 - 基础架构强化",
    period: "2024年1月 - 2024年3月",
    totalHours: 1280,
    completionRate: 85,
    objectives: ["完善核心系统架构", "提升系统安全性", "优化用户体验", "建立监控体系"],
    keyMilestones: ["用户管理系统2.0发布", "安全认证体系上线", "移动端适配完成", "性能监控系统部署"],
    features: [
      {
        id: "f1-1",
        name: "角色权限管理系统",
        description: "实现细粒度的角色权限控制，支持自定义角色和权限分配",
        estimatedHours: 120,
        priority: "Critical",
        status: "In Progress",
        dependencies: ["用户管理基础模块"],
        businessImpact: "提升系统安全性，支持企业级权限管控，预计提升客户满意度15%",
        technicalRecommendations: ["使用RBAC权限模型", "实现权限缓存机制", "集成JWT令牌验证", "添加权限变更审计日志"],
        module: "用户管理",
        assignedTeam: "后端开发团队",
      },
      {
        id: "f1-2",
        name: "移动端响应式优化",
        description: "全面优化移动端用户界面，提升移动设备使用体验",
        estimatedHours: 160,
        priority: "High",
        status: "In Progress",
        dependencies: ["UI组件库"],
        businessImpact: "扩大移动端用户群体，预计移动端访问量提升40%",
        technicalRecommendations: ["采用CSS Grid和Flexbox布局", "实现触摸手势支持", "优化移动端性能", "添加PWA支持"],
        module: "设计系统",
        assignedTeam: "前端开发团队",
      },
      {
        id: "f1-3",
        name: "实时监控告警系统",
        description: "建立全面的系统监控和智能告警机制",
        estimatedHours: 200,
        priority: "High",
        status: "Not Started",
        dependencies: ["数据采集模块", "通知系统"],
        businessImpact: "提升系统稳定性，减少故障响应时间60%，降低运维成本",
        technicalRecommendations: ["集成Prometheus监控", "使用Grafana可视化", "实现智能告警规则", "支持多渠道通知"],
        module: "数据分析",
        assignedTeam: "DevOps团队",
      },
      {
        id: "f1-4",
        name: "多租户架构升级",
        description: "实现完整的多租户隔离和管理功能",
        estimatedHours: 240,
        priority: "Critical",
        status: "In Progress",
        dependencies: ["数据库架构", "权限系统"],
        businessImpact: "支持SaaS模式运营，预计可服务租户数量提升10倍",
        technicalRecommendations: [
          "实现数据库级别隔离",
          "优化租户切换性能",
          "添加租户资源配额管理",
          "实现租户级别的配置管理",
        ],
        module: "多租户管理",
        assignedTeam: "架构团队",
      },
      {
        id: "f1-5",
        name: "API网关安全增强",
        description: "强化API安全防护，实现统一的API管理",
        estimatedHours: 180,
        priority: "High",
        status: "Not Started",
        dependencies: ["认证系统"],
        businessImpact: "提升API安全性，支持第三方集成，预计集成效率提升50%",
        technicalRecommendations: ["实现API限流和熔断", "添加API版本管理", "集成OAuth2.0认证", "实现API使用分析"],
        module: "集成管理",
        assignedTeam: "后端开发团队",
      },
      {
        id: "f1-6",
        name: "数据备份恢复系统",
        description: "建立自动化的数据备份和灾难恢复机制",
        estimatedHours: 140,
        priority: "High",
        status: "Not Started",
        dependencies: ["存储管理"],
        businessImpact: "保障数据安全，满足企业级可靠性要求，提升客户信任度",
        technicalRecommendations: ["实现增量备份策略", "支持跨区域备份", "添加备份完整性校验", "实现一键恢复功能"],
        module: "AI引擎",
        assignedTeam: "DevOps团队",
      },
      {
        id: "f1-7",
        name: "国际化多语言支持",
        description: "实现完整的多语言界面和内容管理",
        estimatedHours: 120,
        priority: "Medium",
        status: "Not Started",
        dependencies: ["UI组件库"],
        businessImpact: "扩展国际市场，预计海外用户增长30%",
        technicalRecommendations: ["使用i18next框架", "实现动态语言切换", "支持RTL布局", "添加翻译管理工具"],
        module: "系统设置",
        assignedTeam: "前端开发团队",
      },
      {
        id: "f1-8",
        name: "性能优化专项",
        description: "全面优化系统性能，提升响应速度",
        estimatedHours: 100,
        priority: "High",
        status: "In Progress",
        dependencies: ["监控系统"],
        businessImpact: "提升用户体验，预计页面加载速度提升40%",
        technicalRecommendations: ["实现代码分割和懒加载", "优化数据库查询", "添加Redis缓存", "使用CDN加速静态资源"],
        module: "设计系统",
        assignedTeam: "全栈开发团队",
      },
    ],
  },
  {
    id: "q2",
    name: "Q2 2024 - 智能化升级",
    period: "2024年4月 - 2024年6月",
    totalHours: 1520,
    completionRate: 0,
    objectives: ["集成AI智能功能", "完善数据分析能力", "提升自动化水平", "优化业务流程"],
    keyMilestones: ["AI助手正式上线", "智能推荐系统发布", "自动化工作流完成", "高级数据分析功能交付"],
    features: [
      {
        id: "f2-1",
        name: "AI智能助手",
        description: "集成大语言模型，提供智能对话和任务辅助功能",
        estimatedHours: 280,
        priority: "Critical",
        status: "Not Started",
        dependencies: ["用户权限系统", "API网关"],
        businessImpact: "提升用户工作效率50%，增强产品竞争力，预计用户活跃度提升35%",
        technicalRecommendations: [
          "集成OpenAI GPT-4 API",
          "实现上下文记忆机制",
          "添加多模态输入支持",
          "实现智能任务分解",
        ],
        module: "AI引擎",
        assignedTeam: "AI开发团队",
      },
      {
        id: "f2-2",
        name: "智能数据挖掘",
        description: "基于机器学习的数据模式识别和预测分析",
        estimatedHours: 320,
        priority: "High",
        status: "Not Started",
        dependencies: ["数据存储", "计算资源"],
        businessImpact: "提供深度业务洞察，帮助客户做出数据驱动决策，预计决策准确率提升25%",
        technicalRecommendations: [
          "使用Python机器学习栈",
          "集成Apache Spark处理",
          "实现模型版本管理",
          "添加AutoML功能",
        ],
        module: "AI引擎",
        assignedTeam: "数据科学团队",
      },
      {
        id: "f2-3",
        name: "智能推荐引擎",
        description: "基于用户行为和偏好的个性化推荐系统",
        estimatedHours: 200,
        priority: "High",
        status: "Not Started",
        dependencies: ["用户行为分析", "AI助手"],
        businessImpact: "提升用户参与度，个性化体验，预计用户留存率提升20%",
        technicalRecommendations: ["实现协同过滤算法", "使用深度学习推荐模型", "添加实时推荐更新", "支持A/B测试框架"],
        module: "AI引擎",
        assignedTeam: "算法团队",
      },
      {
        id: "f2-4",
        name: "高级数据可视化",
        description: "提供丰富的图表类型和交互式数据展示",
        estimatedHours: 160,
        priority: "Medium",
        status: "Not Started",
        dependencies: ["数据分析模块"],
        businessImpact: "提升数据理解效率，支持复杂业务分析，预计分析效率提升60%",
        technicalRecommendations: ["集成D3.js可视化库", "支持自定义图表配置", "实现数据钻取功能", "添加图表导出功能"],
        module: "数据分析",
        assignedTeam: "前端开发团队",
      },
      {
        id: "f2-5",
        name: "自动化工作流引擎",
        description: "可视化工作流设计和自动化执行系统",
        estimatedHours: 240,
        priority: "High",
        status: "Not Started",
        dependencies: ["业务流程管理"],
        businessImpact: "减少重复性工作，提升业务流程效率70%，降低人工成本",
        technicalRecommendations: [
          "使用BPMN工作流标准",
          "实现可视化流程设计器",
          "支持条件分支和循环",
          "集成外部系统API调用",
        ],
        module: "项目管理",
        assignedTeam: "后端开发团队",
      },
      {
        id: "f2-6",
        name: "智能报表生成",
        description: "基于模板和AI的自动化报表生成系统",
        estimatedHours: 180,
        priority: "Medium",
        status: "Not Started",
        dependencies: ["数据分析", "AI引擎"],
        businessImpact: "减少报表制作时间80%，提升报表质量和一致性",
        technicalRecommendations: ["支持多种报表格式导出", "实现报表模板管理", "添加定时报表生成", "集成邮件自动发送"],
        module: "数据分析",
        assignedTeam: "全栈开发团队",
      },
      {
        id: "f2-7",
        name: "预测性维护系统",
        description: "基于历史数据的系统健康预测和维护建议",
        estimatedHours: 140,
        priority: "Medium",
        status: "Not Started",
        dependencies: ["监控系统", "机器学习模块"],
        businessImpact: "减少系统故障50%，提升系统可用性至99.9%",
        technicalRecommendations: ["使用时间序列分析", "实现异常检测算法", "添加维护建议生成", "支持维护计划管理"],
        module: "AI引擎",
        assignedTeam: "DevOps团队",
      },
    ],
  },
  {
    id: "q3",
    name: "Q3 2024 - 业务扩展",
    period: "2024年7月 - 2024年9月",
    totalHours: 1680,
    completionRate: 0,
    objectives: ["完善业务管理功能", "扩展第三方集成", "提升协作能力", "优化客户体验"],
    keyMilestones: ["ERP系统模块上线", "CRM客户管理完成", "供应链管理发布", "第三方集成平台交付"],
    features: [
      {
        id: "f3-1",
        name: "完整ERP系统",
        description: "企业资源规划系统，包含财务、人力、采购等模块",
        estimatedHours: 400,
        priority: "Critical",
        status: "Not Started",
        dependencies: ["权限系统", "数据库优化"],
        businessImpact: "提供企业级管理能力，预计企业客户转化率提升45%",
        technicalRecommendations: ["采用微服务架构", "实现模块化设计", "支持自定义字段配置", "集成财务合规检查"],
        module: "业务管理",
        assignedTeam: "业务开发团队",
      },
      {
        id: "f3-2",
        name: "CRM客户关系管理",
        description: "全生命周期客户管理和销售流程自动化",
        estimatedHours: 320,
        priority: "High",
        status: "Not Started",
        dependencies: ["联系人管理", "工作流引擎"],
        businessImpact: "提升销售效率40%，改善客户满意度，预计销售转化率提升30%",
        technicalRecommendations: ["实现客户360度视图", "集成邮件营销功能", "支持销售漏斗分析", "添加客户行为追踪"],
        module: "业务管理",
        assignedTeam: "业务开发团队",
      },
      {
        id: "f3-3",
        name: "供应链管理系统",
        description: "供应商管理、采购流程和库存优化",
        estimatedHours: 280,
        priority: "High",
        status: "Not Started",
        dependencies: ["ERP系统", "数据分析"],
        businessImpact: "优化供应链效率，降低采购成本15%，提升库存周转率",
        technicalRecommendations: ["实现供应商评估体系", "支持采购审批流程", "集成库存预警功能", "添加供应链可视化"],
        module: "业务管理",
        assignedTeam: "业务开发团队",
      },
      {
        id: "f3-4",
        name: "高级财务管理",
        description: "财务报表、成本分析和预算管理",
        estimatedHours: 240,
        priority: "High",
        status: "Not Started",
        dependencies: ["ERP系统", "报表系统"],
        businessImpact: "提升财务管理精度，支持财务合规，预计财务效率提升50%",
        technicalRecommendations: ["支持多币种处理", "实现自动对账功能", "集成税务计算", "添加财务风险预警"],
        module: "业务管理",
        assignedTeam: "财务开发团队",
      },
      {
        id: "f3-5",
        name: "第三方集成平台",
        description: "统一的第三方系统集成和API管理平台",
        estimatedHours: 200,
        priority: "Medium",
        status: "Not Started",
        dependencies: ["API网关", "Webhook系统"],
        businessImpact: "扩展系统生态，支持更多业务场景，预计集成效率提升80%",
        technicalRecommendations: ["支持常见SaaS集成", "实现数据同步机制", "添加集成监控", "提供集成模板库"],
        module: "集成管理",
        assignedTeam: "集成开发团队",
      },
      {
        id: "f3-6",
        name: "协作沟通平台",
        description: "团队协作、即时通讯和文档共享",
        estimatedHours: 160,
        priority: "Medium",
        status: "Not Started",
        dependencies: ["用户管理", "文件存储"],
        businessImpact: "提升团队协作效率，减少沟通成本，预计协作效率提升35%",
        technicalRecommendations: ["实现实时消息推送", "支持文件在线预览", "集成视频会议功能", "添加协作历史记录"],
        module: "数据中心",
        assignedTeam: "前端开发团队",
      },
      {
        id: "f3-7",
        name: "客户服务系统",
        description: "工单管理、知识库和客户支持",
        estimatedHours: 180,
        priority: "Medium",
        status: "Not Started",
        dependencies: ["CRM系统", "AI助手"],
        businessImpact: "提升客户服务质量，减少响应时间60%，提升客户满意度",
        technicalRecommendations: ["实现智能工单分配", "集成知识库搜索", "支持多渠道接入", "添加服务质量评估"],
        module: "业务管理",
        assignedTeam: "客服开发团队",
      },
    ],
  },
  {
    id: "q4",
    name: "Q4 2024 - 平台完善",
    period: "2024年10月 - 2024年12月",
    totalHours: 1440,
    completionRate: 0,
    objectives: ["完善插件生态", "提升系统稳定性", "优化用户体验", "准备商业化运营"],
    keyMilestones: ["插件商店正式开放", "企业级部署方案完成", "性能优化达标", "商业化运营准备就绪"],
    features: [
      {
        id: "f4-1",
        name: "插件开发平台",
        description: "完整的插件开发、测试和发布平台",
        estimatedHours: 320,
        priority: "High",
        status: "Not Started",
        dependencies: ["API框架", "权限系统"],
        businessImpact: "建立生态系统，吸引第三方开发者，预计插件数量达到100+",
        technicalRecommendations: ["提供插件开发SDK", "实现插件沙箱环境", "支持插件版本管理", "添加插件性能监控"],
        module: "插件系统",
        assignedTeam: "平台开发团队",
      },
      {
        id: "f4-2",
        name: "插件商店",
        description: "插件展示、安装和管理的统一平台",
        estimatedHours: 200,
        priority: "High",
        status: "Not Started",
        dependencies: ["插件开发平台", "支付系统"],
        businessImpact: "创造新的收入来源，预计年收入增长20%",
        technicalRecommendations: ["实现插件评价系统", "支持付费插件管理", "添加插件推荐算法", "集成安全扫描机制"],
        module: "插件系统",
        assignedTeam: "商业开发团队",
      },
      {
        id: "f4-3",
        name: "企业级部署方案",
        description: "私有化部署和混合云部署解决方案",
        estimatedHours: 280,
        priority: "Critical",
        status: "Not Started",
        dependencies: ["容器化", "配置管理"],
        businessImpact: "满足大企业需求，预计企业级客户增长100%",
        technicalRecommendations: ["使用Docker容器化", "支持Kubernetes编排", "实现自动化部署脚本", "添加部署健康检查"],
        module: "DevOps",
        assignedTeam: "DevOps团队",
      },
      {
        id: "f4-4",
        name: "高可用架构升级",
        description: "实现系统高可用和灾难恢复能力",
        estimatedHours: 240,
        priority: "Critical",
        status: "Not Started",
        dependencies: ["负载均衡", "数据备份"],
        businessImpact: "提升系统可用性至99.99%，增强客户信任度",
        technicalRecommendations: ["实现多区域部署", "配置自动故障转移", "添加实时健康监控", "建立灾难恢复流程"],
        module: "DevOps",
        assignedTeam: "架构团队",
      },
      {
        id: "f4-5",
        name: "用户体验优化",
        description: "基于用户反馈的界面和交互优化",
        estimatedHours: 160,
        priority: "Medium",
        status: "Not Started",
        dependencies: ["用户行为分析"],
        businessImpact: "提升用户满意度，减少用户流失率25%",
        technicalRecommendations: ["实现用户行为热力图", "优化页面加载性能", "改进移动端体验", "添加无障碍访问支持"],
        module: "设计系统",
        assignedTeam: "UX设计团队",
      },
      {
        id: "f4-6",
        name: "安全合规增强",
        description: "满足行业安全标准和合规要求",
        estimatedHours: 140,
        priority: "High",
        status: "Not Started",
        dependencies: ["安全审计", "数据加密"],
        businessImpact: "满足企业合规需求，通过安全认证，提升市场竞争力",
        technicalRecommendations: ["实现数据脱敏功能", "添加安全审计日志", "支持GDPR合规", "集成安全扫描工具"],
        module: "系统设置",
        assignedTeam: "安全团队",
      },
      {
        id: "f4-7",
        name: "商业化运营支持",
        description: "计费系统、订阅管理和商业分析",
        estimatedHours: 180,
        priority: "High",
        status: "Not Started",
        dependencies: ["用户管理", "支付集成"],
        businessImpact: "支持商业化运营，建立可持续收入模式",
        technicalRecommendations: ["实现灵活计费模型", "支持多种支付方式", "添加订阅生命周期管理", "集成商业智能分析"],
        module: "业务管理",
        assignedTeam: "商业开发团队",
      },
    ],
  },
]

const priorityColors = {
  Critical: "bg-red-100 text-red-800 border-red-200",
  High: "bg-orange-100 text-orange-800 border-orange-200",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Low: "bg-green-100 text-green-800 border-green-200",
}

const statusColors = {
  "Not Started": "bg-gray-100 text-gray-800 border-gray-200",
  "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
  Completed: "bg-green-100 text-green-800 border-green-200",
  Blocked: "bg-red-100 text-red-800 border-red-200",
}

export function DevelopmentPriorityRoadmap() {
  const [selectedQuarter, setSelectedQuarter] = useState("q1")
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)

  const totalHours = developmentRoadmap.reduce((sum, quarter) => sum + quarter.totalHours, 0)
  const completedHours = developmentRoadmap.reduce(
    (sum, quarter) => sum + (quarter.totalHours * quarter.completionRate) / 100,
    0,
  )

  return (
    <div className="space-y-6">
      {/* 总览统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">总开发工时</p>
                <p className="text-2xl font-bold text-gray-900">{totalHours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">已完成工时</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(completedHours)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">剩余工时</p>
                <p className="text-2xl font-bold text-gray-900">{totalHours - Math.round(completedHours)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">整体进度</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round((completedHours / totalHours) * 100)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 季度标签页 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>YanYu Cloud³ 开发优先级路线图</span>
          </CardTitle>
          <CardDescription>基于功能完成度与业务价值的季度开发计划</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedQuarter} onValueChange={setSelectedQuarter}>
            <TabsList className="grid w-full grid-cols-4">
              {developmentRoadmap.map((quarter) => (
                <TabsTrigger key={quarter.id} value={quarter.id}>
                  {quarter.name.split(" - ")[0]}
                </TabsTrigger>
              ))}
            </TabsList>

            {developmentRoadmap.map((quarter) => (
              <TabsContent key={quarter.id} value={quarter.id} className="space-y-6">
                {/* 季度概览 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{quarter.name}</CardTitle>
                      <CardDescription>{quarter.period}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">总工时</span>
                          <span className="font-semibold">{quarter.totalHours}h</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">完成进度</span>
                            <span className="font-semibold">{quarter.completionRate}%</span>
                          </div>
                          <Progress value={quarter.completionRate} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">季度目标</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {quarter.objectives.map((objective, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">关键里程碑</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {quarter.keyMilestones.map((milestone, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{milestone}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* 功能列表 */}
                <Card>
                  <CardHeader>
                    <CardTitle>功能开发计划</CardTitle>
                    <CardDescription>按优先级排序的功能开发列表，包含工时估算和技术建议</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {quarter.features
                        .sort((a, b) => {
                          const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }
                          return priorityOrder[a.priority] - priorityOrder[b.priority]
                        })
                        .map((feature) => (
                          <Card key={feature.id} className="border-l-4 border-l-blue-500">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                {/* 功能基本信息 */}
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-2 lg:space-y-0">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <h4 className="font-semibold text-lg">{feature.name}</h4>
                                      <Badge className={priorityColors[feature.priority]}>{feature.priority}</Badge>
                                      <Badge className={statusColors[feature.status]}>{feature.status}</Badge>
                                    </div>
                                    <p className="text-gray-600 mb-2">{feature.description}</p>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                      <span className="flex items-center space-x-1">
                                        <Clock className="h-4 w-4" />
                                        <span>{feature.estimatedHours}h</span>
                                      </span>
                                      <span className="flex items-center space-x-1">
                                        <Cog className="h-4 w-4" />
                                        <span>{feature.module}</span>
                                      </span>
                                      <span className="flex items-center space-x-1">
                                        <Users className="h-4 w-4" />
                                        <span>{feature.assignedTeam}</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <Separator />

                                {/* 依赖关系 */}
                                {feature.dependencies.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-sm text-gray-700 mb-2 flex items-center">
                                      <AlertTriangle className="h-4 w-4 mr-1 text-orange-500" />
                                      依赖关系
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                      {feature.dependencies.map((dep, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                          {dep}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* 业务影响 */}
                                <div>
                                  <h5 className="font-medium text-sm text-gray-700 mb-2 flex items-center">
                                    <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                                    业务影响
                                  </h5>
                                  <p className="text-sm text-gray-600">{feature.businessImpact}</p>
                                </div>

                                {/* 技术建议 */}
                                <div>
                                  <h5 className="font-medium text-sm text-gray-700 mb-2 flex items-center">
                                    <Zap className="h-4 w-4 mr-1 text-blue-500" />
                                    技术建议
                                  </h5>
                                  <ul className="space-y-1">
                                    {feature.technicalRecommendations.map((rec, index) => (
                                      <li key={index} className="text-sm text-gray-600 flex items-start">
                                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                        {rec}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* 开发建议和注意事项 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span>开发最佳实践</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">采用敏捷开发方法，每两周进行一次迭代评审</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">建立完善的代码审查机制，确保代码质量</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">实施自动化测试，覆盖率不低于80%</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">使用容器化部署，确保环境一致性</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">建立监控和告警体系，及时发现问题</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>风险控制要点</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">关注依赖关系，避免阻塞性问题影响整体进度</span>
              </li>
              <li className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">预留20%的缓冲时间应对突发需求变更</span>
              </li>
              <li className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">定期进行技术债务评估和清理</span>
              </li>
              <li className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">建立应急响应机制，快速处理生产环境问题</span>
              </li>
              <li className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">确保团队技能匹配，必要时进行培训</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
