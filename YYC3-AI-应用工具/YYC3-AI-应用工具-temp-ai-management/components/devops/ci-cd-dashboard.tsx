"use client"

import { useState, useEffect } from "react"
import {
  Play,
  Square,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  GitBranch,
  Users,
  Calendar,
  Activity,
  TrendingUp,
  AlertTriangle,
  Download,
  Upload,
  Server,
  Database,
  Target,
  Settings,
  Eye,
  Code,
  Rocket,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { EnhancedCard } from "../design-system/enhanced-card-system"
import { EnhancedButton } from "../design-system/enhanced-button-system"
import { AnimatedContainer } from "../design-system/animation-system"
import { useSound } from "../design-system/sound-system"

// 数据类型定义
interface Pipeline {
  id: string
  name: string
  branch: string
  status: "running" | "success" | "failed" | "pending" | "cancelled"
  progress: number
  duration: string
  startTime: string
  stages: PipelineStage[]
  author: string
  commit: string
  commitMessage: string
}

interface PipelineStage {
  id: string
  name: string
  status: "running" | "success" | "failed" | "pending" | "skipped"
  duration: string
  logs?: string[]
}

interface DeploymentEnvironment {
  name: string
  status: "healthy" | "unhealthy" | "deploying" | "offline"
  version: string
  lastDeploy: string
  healthCheck: boolean
  url: string
  metrics: {
    cpu: number
    memory: number
    requests: number
    errors: number
  }
}

interface TestResult {
  type: "unit" | "integration" | "e2e" | "security"
  total: number
  passed: number
  failed: number
  coverage: number
  duration: string
}

export function CICDDashboard() {
  const [activeTab, setActiveTab] = useState("pipelines")
  const [pipelines, setPipelines] = useState<Pipeline[]>([
    {
      id: "1",
      name: "YanYu Cloud³ Main Pipeline",
      branch: "main",
      status: "running",
      progress: 65,
      duration: "20分钟",
      startTime: "2024-01-15 14:30:00",
      author: "张开发",
      commit: "a1b2c3d",
      commitMessage: "feat: 添加用户管理功能",
      stages: [
        { id: "1", name: "代码检查", status: "success", duration: "2分钟" },
        { id: "2", name: "单元测试", status: "success", duration: "5分钟" },
        { id: "3", name: "集成测试", status: "running", duration: "8分钟" },
        { id: "4", name: "安全扫描", status: "pending", duration: "-" },
        { id: "5", name: "构建镜像", status: "pending", duration: "-" },
        { id: "6", name: "部署测试", status: "pending", duration: "-" },
      ],
    },
    {
      id: "2",
      name: "Feature Branch Pipeline",
      branch: "feature/user-auth",
      status: "success",
      progress: 100,
      duration: "15分钟",
      startTime: "2024-01-15 13:45:00",
      author: "李前端",
      commit: "x9y8z7w",
      commitMessage: "fix: 修复登录验证问题",
      stages: [
        { id: "1", name: "代码检查", status: "success", duration: "2分钟" },
        { id: "2", name: "单元测试", status: "success", duration: "4分钟" },
        { id: "3", name: "集成测试", status: "success", duration: "6分钟" },
        { id: "4", name: "安全扫描", status: "success", duration: "3分钟" },
      ],
    },
    {
      id: "3",
      name: "Hotfix Pipeline",
      branch: "hotfix/critical-bug",
      status: "failed",
      progress: 45,
      duration: "8分钟",
      startTime: "2024-01-15 12:20:00",
      author: "王后端",
      commit: "m5n4o3p",
      commitMessage: "hotfix: 紧急修复数据库连接问题",
      stages: [
        { id: "1", name: "代码检查", status: "success", duration: "1分钟" },
        { id: "2", name: "单元测试", status: "failed", duration: "7分钟" },
        { id: "3", name: "集成测试", status: "skipped", duration: "-" },
        { id: "4", name: "安全扫描", status: "skipped", duration: "-" },
      ],
    },
  ])

  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>([
    {
      name: "生产环境",
      status: "healthy",
      version: "v1.2.3",
      lastDeploy: "6小时前",
      healthCheck: true,
      url: "https://yanyu.cloud",
      metrics: { cpu: 68, memory: 72, requests: 1247, errors: 3 },
    },
    {
      name: "预发布环境",
      status: "deploying",
      version: "v1.2.4-rc.1",
      lastDeploy: "进行中",
      healthCheck: false,
      url: "https://staging.yanyu.cloud",
      metrics: { cpu: 45, memory: 58, requests: 234, errors: 0 },
    },
    {
      name: "开发环境",
      status: "healthy",
      version: "v1.2.4-dev.5",
      lastDeploy: "30分钟前",
      healthCheck: true,
      url: "https://dev.yanyu.cloud",
      metrics: { cpu: 32, memory: 41, requests: 89, errors: 1 },
    },
  ])

  const [testResults, setTestResults] = useState<TestResult[]>([
    { type: "unit", total: 245, passed: 238, failed: 7, coverage: 87.5, duration: "5分钟" },
    { type: "integration", total: 56, passed: 54, failed: 2, coverage: 78.2, duration: "8分钟" },
    { type: "e2e", total: 28, passed: 26, failed: 2, coverage: 65.8, duration: "12分钟" },
    { type: "security", total: 15, passed: 13, failed: 2, coverage: 92.1, duration: "3分钟" },
  ])

  const { playSound } = useSound()

  // 模拟实时更新
  useEffect(() => {
    const interval = setInterval(() => {
      setPipelines((prev) =>
        prev.map((pipeline) => {
          if (pipeline.status === "running" && pipeline.progress < 100) {
            return { ...pipeline, progress: Math.min(pipeline.progress + 5, 100) }
          }
          return pipeline
        }),
      )
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const handlePipelineAction = (pipelineId: string, action: "start" | "stop" | "restart") => {
    playSound("click")
    console.log(`Pipeline ${pipelineId} action: ${action}`)
  }

  const handleDeploy = (environment: string) => {
    playSound("success")
    console.log(`Deploying to ${environment}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
      case "healthy":
        return "text-traditional-jade"
      case "running":
      case "deploying":
        return "text-primary-500"
      case "failed":
      case "unhealthy":
        return "text-traditional-crimson"
      case "pending":
        return "text-secondary-500"
      default:
        return "text-secondary-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
      case "healthy":
        return <CheckCircle className="w-4 h-4 text-traditional-jade" />
      case "running":
      case "deploying":
        return <RefreshCw className="w-4 h-4 text-primary-500 animate-spin" />
      case "failed":
      case "unhealthy":
        return <XCircle className="w-4 h-4 text-traditional-crimson" />
      case "pending":
        return <Clock className="w-4 h-4 text-secondary-500" />
      default:
        return <Clock className="w-4 h-4 text-secondary-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* CI/CD概览 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnimatedContainer animation="slideUp" delay={0}>
          <EnhancedCard variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Activity className="w-4 h-4 text-traditional-jade" />
                <span>活跃流水线</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-traditional-jade">
                {pipelines.filter((p) => p.status === "running").length}
              </div>
              <p className="text-xs text-secondary-500">
                <span className="text-traditional-jade">+2</span> 比昨日
              </p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={150}>
          <EnhancedCard variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-primary-500" />
                <span>成功率</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary-500">87%</div>
              <p className="text-xs text-secondary-500">
                <span className="text-primary-500">↑5%</span> 比上周
              </p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={300}>
          <EnhancedCard variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Clock className="w-4 h-4 text-accent-500" />
                <span>平均构建时间</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent-500">15分钟</div>
              <p className="text-xs text-secondary-500">
                <span className="text-accent-500">↓2分钟</span> 比上周
              </p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>

        <AnimatedContainer animation="slideUp" delay={450}>
          <EnhancedCard variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Target className="w-4 h-4 text-traditional-azure" />
                <span>测试通过率</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-traditional-azure">94%</div>
              <p className="text-xs text-secondary-500">
                <span className="text-traditional-azure">344/366</span> 测试用例
              </p>
            </CardContent>
          </EnhancedCard>
        </AnimatedContainer>
      </div>

      {/* 主要功能区域 */}
      <EnhancedCard variant="traditional" size="lg">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pipelines">流水线</TabsTrigger>
            <TabsTrigger value="deployments">部署环境</TabsTrigger>
            <TabsTrigger value="testing">测试报告</TabsTrigger>
            <TabsTrigger value="monitoring">监控告警</TabsTrigger>
          </TabsList>

          {/* 流水线管理 */}
          <TabsContent value="pipelines" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">CI/CD流水线</h3>
              <div className="flex space-x-2">
                <EnhancedButton variant="secondary" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新状态
                </EnhancedButton>
                <EnhancedButton variant="primary" size="sm">
                  <Play className="w-4 h-4 mr-2" />
                  新建流水线
                </EnhancedButton>
              </div>
            </div>

            <div className="space-y-4">
              {pipelines.map((pipeline, index) => (
                <AnimatedContainer key={pipeline.id} animation="slideRight" delay={index * 100}>
                  <EnhancedCard variant="glass" className="p-4">
                    <div className="space-y-4">
                      {/* 流水线头部信息 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(pipeline.status)}
                            <h4 className="font-medium">{pipeline.name}</h4>
                          </div>
                          <Badge variant="outline" className="bg-secondary-50">
                            <GitBranch className="w-3 h-3 mr-1" />
                            {pipeline.branch}
                          </Badge>
                          <Badge variant={pipeline.status === "success" ? "default" : "secondary"}>
                            {pipeline.status}
                          </Badge>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-secondary-500">{pipeline.duration}</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Settings className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handlePipelineAction(pipeline.id, "restart")}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                重新运行
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePipelineAction(pipeline.id, "stop")}>
                                <Square className="w-4 h-4 mr-2" />
                                停止运行
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                查看日志
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="w-4 h-4 mr-2" />
                                下载报告
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* 提交信息 */}
                      <div className="flex items-center space-x-4 text-sm text-secondary-600">
                        <span>
                          <Code className="w-3 h-3 inline mr-1" />
                          {pipeline.commit}
                        </span>
                        <span>
                          <Users className="w-3 h-3 inline mr-1" />
                          {pipeline.author}
                        </span>
                        <span>
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {pipeline.startTime}
                        </span>
                      </div>

                      <div className="text-sm text-secondary-700">{pipeline.commitMessage}</div>

                      {/* 进度条 */}
                      {pipeline.status === "running" && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>构建进度</span>
                            <span>{pipeline.progress}%</span>
                          </div>
                          <Progress value={pipeline.progress} className="h-2" />
                        </div>
                      )}

                      {/* 阶段状态 */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                        {pipeline.stages.map((stage) => (
                          <div
                            key={stage.id}
                            className="flex items-center space-x-2 p-2 bg-white/50 rounded border border-secondary-200/50"
                          >
                            {getStatusIcon(stage.status)}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">{stage.name}</div>
                              <div className="text-xs text-secondary-500">{stage.duration}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 部署环境 */}
          <TabsContent value="deployments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">部署环境管理</h3>
              <EnhancedButton variant="primary" size="sm">
                <Rocket className="w-4 h-4 mr-2" />
                新建部署
              </EnhancedButton>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {environments.map((env, index) => (
                <AnimatedContainer key={env.name} animation="slideUp" delay={index * 100}>
                  <EnhancedCard variant="glass" className="p-4">
                    <div className="space-y-4">
                      {/* 环境头部 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Server className="w-5 h-5 text-primary-500" />
                          <h4 className="font-medium">{env.name}</h4>
                        </div>
                        <Badge variant={env.status === "healthy" ? "default" : "secondary"}>{env.status}</Badge>
                      </div>

                      {/* 版本信息 */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>当前版本</span>
                          <span className="font-mono">{env.version}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>最后部署</span>
                          <span>{env.lastDeploy}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>健康检查</span>
                          <span className={env.healthCheck ? "text-traditional-jade" : "text-traditional-crimson"}>
                            {env.healthCheck ? "正常" : "异常"}
                          </span>
                        </div>
                      </div>

                      {/* 性能指标 */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">CPU使用率</span>
                          <span className="text-sm font-medium">{env.metrics.cpu}%</span>
                        </div>
                        <Progress value={env.metrics.cpu} className="h-2" />

                        <div className="flex justify-between items-center">
                          <span className="text-sm">内存使用率</span>
                          <span className="text-sm font-medium">{env.metrics.memory}%</span>
                        </div>
                        <Progress value={env.metrics.memory} className="h-2" />

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-secondary-500">请求数</span>
                            <div className="font-medium">{env.metrics.requests}</div>
                          </div>
                          <div>
                            <span className="text-secondary-500">错误数</span>
                            <div className="font-medium text-traditional-crimson">{env.metrics.errors}</div>
                          </div>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex space-x-2">
                        <EnhancedButton
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => window.open(env.url, "_blank")}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          访问
                        </EnhancedButton>
                        <EnhancedButton
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDeploy(env.name)}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          部署
                        </EnhancedButton>
                      </div>
                    </div>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 测试报告 */}
          <TabsContent value="testing" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">自动化测试报告</h3>
              <EnhancedButton variant="secondary" size="sm">
                <Download className="w-4 h-4 mr-2" />
                导出报告
              </EnhancedButton>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {testResults.map((test, index) => (
                <AnimatedContainer key={test.type} animation="slideRight" delay={index * 100}>
                  <EnhancedCard variant="glass" className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium capitalize">
                          {test.type === "unit"
                            ? "单元测试"
                            : test.type === "integration"
                              ? "集成测试"
                              : test.type === "e2e"
                                ? "端到端测试"
                                : "安全测试"}
                        </h4>
                        <Badge variant={test.failed === 0 ? "default" : "destructive"}>
                          {test.passed}/{test.total}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>通过率</span>
                          <span className="font-medium">{((test.passed / test.total) * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={(test.passed / test.total) * 100} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>代码覆盖率</span>
                          <span className="font-medium">{test.coverage}%</span>
                        </div>
                        <Progress value={test.coverage} className="h-2" />
                      </div>

                      <div className="flex justify-between text-sm text-secondary-600">
                        <span>执行时间: {test.duration}</span>
                        <span>
                          {test.failed > 0 && <span className="text-traditional-crimson">{test.failed} 失败</span>}
                        </span>
                      </div>
                    </div>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>

            {/* 失败测试详情 */}
            <EnhancedCard variant="glass" className="p-4">
              <h4 className="font-medium mb-4 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-accent-500" />
                <span>失败测试分析</span>
              </h4>
              <div className="space-y-3">
                <div className="p-3 bg-accent-50 rounded border border-accent-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm">用户认证API测试</span>
                    <Badge variant="destructive">失败</Badge>
                  </div>
                  <div className="text-sm text-secondary-600 mb-2">Expected status 200 but received 401</div>
                  <div className="text-xs text-secondary-500">tests/auth.test.ts:45</div>
                </div>

                <div className="p-3 bg-accent-50 rounded border border-accent-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm">数据库连接测试</span>
                    <Badge variant="destructive">失败</Badge>
                  </div>
                  <div className="text-sm text-secondary-600 mb-2">Connection timeout after 5000ms</div>
                  <div className="text-xs text-secondary-500">tests/database.test.ts:23</div>
                </div>
              </div>
            </EnhancedCard>
          </TabsContent>

          {/* 监控告警 */}
          <TabsContent value="monitoring" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">系统监控与告警</h3>
              <EnhancedButton variant="secondary" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                告警设置
              </EnhancedButton>
            </div>

            {/* 实时指标 */}
            <div className="grid gap-4 md:grid-cols-3">
              <EnhancedCard variant="glass" className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">应用性能</span>
                  <Activity className="w-4 h-4 text-traditional-jade" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>响应时间</span>
                    <span className="font-medium">245ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>吞吐量</span>
                    <span className="font-medium">1.2k req/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>错误率</span>
                    <span className="font-medium text-traditional-jade">0.1%</span>
                  </div>
                </div>
              </EnhancedCard>

              <EnhancedCard variant="glass" className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">数据库状态</span>
                  <Database className="w-4 h-4 text-primary-500" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>连接数</span>
                    <span className="font-medium">45/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>查询时间</span>
                    <span className="font-medium">12ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>缓存命中</span>
                    <span className="font-medium text-primary-500">89%</span>
                  </div>
                </div>
              </EnhancedCard>

              <EnhancedCard variant="glass" className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">服务器资源</span>
                  <Server className="w-4 h-4 text-accent-500" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>CPU</span>
                    <span className="font-medium">68%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>内存</span>
                    <span className="font-medium">4.2GB/8GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>磁盘</span>
                    <span className="font-medium">156GB/500GB</span>
                  </div>
                </div>
              </EnhancedCard>
            </div>

            {/* 告警列表 */}
            <EnhancedCard variant="glass" className="p-4">
              <h4 className="font-medium mb-4">最近告警</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">生产环境CPU使用率持续超过70%</div>
                    <div className="text-xs text-secondary-500">5分钟前</div>
                  </div>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                    警告
                  </Badge>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded border border-green-200">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">开发环境部署完成</div>
                    <div className="text-xs text-secondary-500">15分钟前</div>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-700">
                    信息
                  </Badge>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-red-50 rounded border border-red-200">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">数据库连接池耗尽</div>
                    <div className="text-xs text-secondary-500">已解决，1小时前</div>
                  </div>
                  <Badge variant="outline" className="bg-red-100 text-red-700">
                    错误
                  </Badge>
                </div>
              </div>
            </EnhancedCard>
          </TabsContent>
        </Tabs>
      </EnhancedCard>
    </div>
  )
}
