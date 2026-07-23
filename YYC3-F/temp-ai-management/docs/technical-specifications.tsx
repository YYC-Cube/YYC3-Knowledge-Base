"use client"

import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Server, Shield, Zap, Code, GitBranch, Package, Monitor, Cloud, Lock, Activity, Settings } from "lucide-react"

import { EnhancedCard } from "../components/design-system/enhanced-card-system"
import { AnimatedContainer } from "../components/design-system/animation-system"

export function TechnicalSpecifications() {
  const architectureComponents = [
    {
      name: "API Gateway",
      description: "统一API入口，负载均衡和路由",
      technology: "Kong / Nginx",
      status: "planning",
      priority: "high",
    },
    {
      name: "微服务架构",
      description: "模块化服务设计，独立部署和扩展",
      technology: "Node.js / Docker",
      status: "in-progress",
      priority: "high",
    },
    {
      name: "实时通信",
      description: "WebSocket集群，支持大规模并发",
      technology: "Socket.io / Redis",
      status: "planning",
      priority: "high",
    },
    {
      name: "数据存储",
      description: "分布式数据库，读写分离",
      technology: "PostgreSQL / MongoDB",
      status: "in-progress",
      priority: "high",
    },
    {
      name: "缓存系统",
      description: "多级缓存，提升响应速度",
      technology: "Redis Cluster",
      status: "planning",
      priority: "medium",
    },
    {
      name: "消息队列",
      description: "异步任务处理，系统解耦",
      technology: "RabbitMQ / Kafka",
      status: "planning",
      priority: "medium",
    },
  ]

  const securityFeatures = [
    {
      name: "身份认证",
      description: "多因子认证，SSO集成",
      implementation: "JWT + OAuth 2.0",
      compliance: "ISO 27001",
    },
    {
      name: "数据加密",
      description: "端到端加密，传输和存储安全",
      implementation: "AES-256 + TLS 1.3",
      compliance: "GDPR",
    },
    {
      name: "访问控制",
      description: "细粒度权限管理，RBAC模型",
      implementation: "RBAC + ABAC",
      compliance: "SOC 2",
    },
    {
      name: "审计日志",
      description: "完整操作记录，合规追踪",
      implementation: "ELK Stack",
      compliance: "SOX",
    },
  ]

  const performanceTargets = [
    {
      metric: "响应时间",
      target: "< 200ms",
      current: "350ms",
      status: "improving",
    },
    {
      metric: "并发用户",
      target: "10,000+",
      current: "1,000",
      status: "scaling",
    },
    {
      metric: "系统可用性",
      target: "99.9%",
      current: "99.5%",
      status: "optimizing",
    },
    {
      metric: "数据同步延迟",
      target: "< 100ms",
      current: "250ms",
      status: "improving",
    },
  ]

  return (
    <div className="space-y-6">
      <EnhancedCard variant="traditional" size="lg">
        <Tabs defaultValue="architecture" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="architecture">系统架构</TabsTrigger>
            <TabsTrigger value="security">安全规范</TabsTrigger>
            <TabsTrigger value="performance">性能指标</TabsTrigger>
            <TabsTrigger value="deployment">部署方案</TabsTrigger>
          </TabsList>

          {/* 系统架构 */}
          <TabsContent value="architecture" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {architectureComponents.map((component, index) => (
                <AnimatedContainer key={component.name} animation="slideUp" delay={index * 100}>
                  <EnhancedCard variant="glass" className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Server className="w-5 h-5 text-primary-500" />
                        <h4 className="font-medium">{component.name}</h4>
                      </div>
                      <div className="flex space-x-1">
                        <Badge variant={component.priority === "high" ? "default" : "secondary"} className="text-xs">
                          {component.priority}
                        </Badge>
                        <Badge variant={component.status === "in-progress" ? "default" : "outline"} className="text-xs">
                          {component.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-secondary-600 mb-2">{component.description}</p>
                    <div className="flex items-center space-x-2">
                      <Code className="w-4 h-4 text-accent-500" />
                      <span className="text-sm font-mono text-accent-600">{component.technology}</span>
                    </div>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>

            {/* 架构图 */}
            <EnhancedCard variant="glass" className="p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center space-x-2">
                  <GitBranch className="w-5 h-5" />
                  <span>系统架构图</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <div className="bg-gradient-to-br from-primary-50 to-accent-50 p-6 rounded-lg">
                  <div className="text-center text-secondary-500">
                    <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>架构图将在技术设计阶段完成</p>
                    <p className="text-sm mt-2">包含微服务拓扑、数据流向、部署架构等</p>
                  </div>
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>

          {/* 安全规范 */}
          <TabsContent value="security" className="space-y-4">
            <div className="grid gap-4">
              {securityFeatures.map((feature, index) => (
                <AnimatedContainer key={feature.name} animation="slideRight" delay={index * 100}>
                  <EnhancedCard variant="glass" className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="p-2 bg-traditional-crimson/10 rounded-lg">
                        <Shield className="w-5 h-5 text-traditional-crimson" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{feature.name}</h4>
                          <Badge variant="outline" className="text-xs text-traditional-jade">
                            {feature.compliance}
                          </Badge>
                        </div>
                        <p className="text-sm text-secondary-600 mb-2">{feature.description}</p>
                        <div className="flex items-center space-x-2">
                          <Lock className="w-4 h-4 text-accent-500" />
                          <span className="text-sm font-mono text-accent-600">{feature.implementation}</span>
                        </div>
                      </div>
                    </div>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>

            {/* 安全检查清单 */}
            <EnhancedCard variant="glass" className="p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>安全检查清单</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <div className="grid gap-2 md:grid-cols-2">
                  {[
                    "SQL注入防护",
                    "XSS攻击防护",
                    "CSRF令牌验证",
                    "API速率限制",
                    "数据脱敏处理",
                    "安全头部配置",
                    "依赖漏洞扫描",
                    "代码安全审计",
                  ].map((item) => (
                    <div key={item} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-traditional-jade rounded-full" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>

          {/* 性能指标 */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {performanceTargets.map((target, index) => (
                <AnimatedContainer key={target.metric} animation="slideLeft" delay={index * 100}>
                  <EnhancedCard variant="glass" className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-5 h-5 text-primary-500" />
                        <h4 className="font-medium">{target.metric}</h4>
                      </div>
                      <Badge variant={target.status === "improving" ? "default" : "outline"} className="text-xs">
                        {target.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary-600">当前值</span>
                        <span className="font-medium">{target.current}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary-600">目标值</span>
                        <span className="font-medium text-traditional-jade">{target.target}</span>
                      </div>
                    </div>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>

            {/* 性能优化策略 */}
            <EnhancedCard variant="glass" className="p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>性能优化策略</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">前端优化</h4>
                    <div className="flex flex-wrap gap-1">
                      {["代码分割", "懒加载", "CDN加速", "图片优化", "缓存策略"].map((item) => (
                        <Badge key={item} variant="outline" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">后端优化</h4>
                    <div className="flex flex-wrap gap-1">
                      {["数据库索引", "查询优化", "连接池", "异步处理", "负载均衡"].map((item) => (
                        <Badge key={item} variant="outline" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">基础设施</h4>
                    <div className="flex flex-wrap gap-1">
                      {["容器化", "自动扩缩容", "监控告警", "日志分析", "性能调优"].map((item) => (
                        <Badge key={item} variant="outline" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>

          {/* 部署方案 */}
          <TabsContent value="deployment" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  env: "开发环境",
                  description: "本地开发和功能测试",
                  specs: "2 Core / 4GB RAM",
                  status: "active",
                },
                {
                  env: "测试环境",
                  description: "集成测试和性能测试",
                  specs: "4 Core / 8GB RAM",
                  status: "active",
                },
                {
                  env: "生产环境",
                  description: "正式服务和用户访问",
                  specs: "8 Core / 16GB RAM",
                  status: "planning",
                },
              ].map((env, index) => (
                <AnimatedContainer key={env.env} animation="slideUp" delay={index * 100}>
                  <EnhancedCard variant="glass" className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Cloud className="w-5 h-5 text-primary-500" />
                        <h4 className="font-medium">{env.env}</h4>
                      </div>
                      <Badge variant={env.status === "active" ? "default" : "outline"} className="text-xs">
                        {env.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-secondary-600 mb-2">{env.description}</p>
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4 text-accent-500" />
                      <span className="text-sm font-mono text-accent-600">{env.specs}</span>
                    </div>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>

            {/* CI/CD流程 */}
            <EnhancedCard variant="glass" className="p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center space-x-2">
                  <GitBranch className="w-5 h-5" />
                  <span>CI/CD流程</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <div className="space-y-4">
                  {[
                    { stage: "代码提交", description: "Git提交触发构建", status: "completed" },
                    { stage: "自动测试", description: "单元测试和集成测试", status: "completed" },
                    { stage: "代码审查", description: "自动化代码质量检查", status: "in-progress" },
                    { stage: "构建镜像", description: "Docker镜像构建和推送", status: "planning" },
                    { stage: "部署发布", description: "自动化部署到目标环境", status: "planning" },
                  ].map((stage, index) => (
                    <div key={stage.stage} className="flex items-center space-x-4">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          stage.status === "completed"
                            ? "bg-traditional-jade"
                            : stage.status === "in-progress"
                              ? "bg-primary-500"
                              : "bg-secondary-300"
                        }`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-sm">{stage.stage}</h5>
                          <Badge variant={stage.status === "completed" ? "default" : "outline"} className="text-xs">
                            {stage.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-secondary-600">{stage.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </EnhancedCard>
          </TabsContent>
        </Tabs>
      </EnhancedCard>
    </div>
  )
}
