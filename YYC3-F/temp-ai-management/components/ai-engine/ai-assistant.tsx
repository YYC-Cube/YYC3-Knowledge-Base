"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, Send, Mic, MicOff, Volume2, VolumeX, Sparkles, Brain, Lightbulb, TrendingUp, FileText, Users, BarChart3, Settings, Zap, MessageSquare, Copy, ThumbsUp, ThumbsDown, RefreshCw, Download, Share2 } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

import { EnhancedCard } from "../design-system/enhanced-card-system"
import { EnhancedButton } from "../design-system/enhanced-button-system"
import { AnimatedContainer, FloatingElement } from "../design-system/animation-system"
import { useSound } from "../design-system/sound-system"

// AI消息类型定义
interface AIMessage {
  id: string
  type: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  metadata?: {
    model?: string
    tokens?: number
    confidence?: number
    suggestions?: string[]
    actions?: AIAction[]
  }
}

interface AIAction {
  id: string
  title: string
  description: string
  icon: any
  action: () => void
}

interface AICapability {
  id: string
  name: string
  description: string
  icon: any
  category: "analysis" | "automation" | "generation" | "optimization"
  enabled: boolean
}

export function AIAssistant() {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: "welcome",
      type: "system",
      content: "欢迎使用YanYu Cloud³ AI智能助手！我可以帮助您进行数据分析、业务优化、内容生成等任务。请告诉我您需要什么帮助？",
      timestamp: new Date(),
      metadata: {
        suggestions: ["分析用户数据", "生成营销内容", "优化业务流程", "查看系统状态"],
      },
    },
  ])

  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [activeTab, setActiveTab] = useState("chat")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { playSound } = useSound()

  // AI能力配置
  const [aiCapabilities] = useState<AICapability[]>([
    {
      id: "data-analysis",
      name: "智能数据分析",
      description: "自动分析业务数据，生成洞察报告",
      icon: BarChart3,
      category: "analysis",
      enabled: true,
    },
    {
      id: "content-generation",
      name: "内容智能生成",
      description: "AI驱动的文章、营销内容生成",
      icon: FileText,
      category: "generation",
      enabled: true,
    },
    {
      id: "user-insights",
      name: "用户行为洞察",
      description: "分析用户行为模式，提供个性化建议",
      icon: Users,
      category: "analysis",
      enabled: true,
    },
    {
      id: "process-optimization",
      name: "流程智能优化",
      description: "识别并优化业务流程瓶颈",
      icon: Zap,
      category: "optimization",
      enabled: false,
    },
    {
      id: "predictive-analytics",
      name: "预测性分析",
      description: "基于历史数据预测未来趋势",
      icon: TrendingUp,
      category: "analysis",
      enabled: true,
    },
    {
      id: "automated-responses",
      name: "智能自动回复",
      description: "客服场景的智能自动回复系统",
      icon: MessageSquare,
      category: "automation",
      enabled: false,
    },
  ])

  // 模拟AI响应
  const generateAIResponse = async (userMessage: string): Promise<AIMessage> => {
    // 这里应该集成真实的AI API，比如OpenAI、Claude等
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000))

    const responses = {
      "分析用户数据": {
        content: `基于当前用户数据分析：

📊 **用户概览**
- 总用户数：1,247 (+12% 较上月)
- 活跃用户：892 (71.5% 活跃率)
- 新增用户：156 (本月)

🎯 **用户行为洞察**
- 平均会话时长：8.5分钟 (+15%)
- 页面浏览深度：4.2页/会话
- 转化率：3.8% (+0.5%)

💡 **AI建议**
1. 优化用户引导流程，提升新用户留存
2. 针对高价值用户推送个性化内容
3. 改进移动端体验，提升移动用户活跃度`,
        suggestions: ["查看详细报告", "导出分析数据", "设置监控告警", "生成用户画像"],
        actions: [
          {
            id: "detailed-report",
            title: "查看详细报告",
            description: "生成完整的用户分析报告",
            icon: FileText,
            action: () => console.log("生成详细报告"),
          },
          {
            id: "export-data",
            title: "导出数据",
            description: "导出用户分析数据",
            icon: Download,
            action: () => console.log("导出数据"),
          },
        ],
      },
      "生成营销内容": {
        content: `🎨 **AI营销内容生成完成**

**标题建议：**
1. "YanYu Cloud³：重新定义企业数字化转型"
2. "智能商务，云端未来 - YanYu Cloud³全新体验"
3. "一站式智能商务平台，让业务管理更简单"

**内容摘要：**
YanYu Cloud³作为新一代智能商务平台，融合了AI技术与云计算优势，为企业提供数据分析、用户管理、内容创作等一体化解决方案。通过智能化的业务流程优化，帮助企业提升运营效率，实现数字化转型升级。

**关键词标签：**
#智能商务 #云计算 #数字化转型 #AI助手 #数据分析

**适用场景：**
- 官网首页展示
- 社交媒体推广
- 产品介绍文档
- 营销邮件内容`,
        suggestions: ["生成更多变体", "优化SEO关键词", "创建社媒版本", "生成视频脚本"],
        actions: [
          {
            id: "generate-variants",
            title: "生成更多变体",
            description: "生成不同风格的营销内容",
            icon: RefreshCw,
            action: () => console.log("生成变体"),
          },
          {
            id: "seo-optimize",
            title: "SEO优化",
            description: "优化内容的搜索引擎表现",
            icon: TrendingUp,
            action: () => console.log("SEO优化"),
          },
        ],
      },
      default: {
        content: `我理解您的需求。作为YanYu Cloud³的AI助手，我可以帮助您：

🔍 **数据分析与洞察**
- 用户行为分析
- 业务数据挖掘
- 趋势预测分析

📝 **内容创作与优化**
- 营销文案生成
- SEO内容优化
- 多媒体内容策划

⚡ **业务流程优化**
- 工作流程分析
- 效率提升建议
- 自动化方案设计

🎯 **个性化推荐**
- 用户偏好分析
- 产品推荐策略
- 精准营销方案

请告诉我您具体想要了解哪个方面，我会为您提供详细的分析和建议。`,
        suggestions: ["数据分析", "内容生成", "流程优化", "用户洞察"],
      },
    }

    const responseKey = Object.keys(responses).find((key) => userMessage.includes(key)) || "default"
    const response = responses[responseKey as keyof typeof responses]

    return {
      id: Date.now().toString(),
      type: "assistant",
      content: response.content,
      timestamp: new Date(),
      metadata: {
        model: "YanYu-AI-v3.0",
        tokens: Math.floor(Math.random() * 500) + 100,
        confidence: 0.85 + Math.random() * 0.1,
        suggestions: response.suggestions,
        actions: response.actions,
      },
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    playSound("click")
    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      const aiResponse = await generateAIResponse(inputMessage)
      setMessages((prev) => [...prev, aiResponse])
      playSound("success")
    } catch (error) {
      console.error("AI响应错误:", error)
      const errorMessage: AIMessage = {
        id: Date.now().toString(),
        type: "system",
        content: "抱歉，AI助手暂时无法响应。请稍后再试。",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      playSound("error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion)
    playSound("click")
  }

  const handleVoiceToggle = () => {
    setIsListening(!isListening)
    playSound(isListening ? "click" : "success")
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    playSound("success")
  }

  const handleMessageFeedback = (messageId: string, feedback: "positive" | "negative") => {
    playSound("click")
    console.log(`消息 ${messageId} 反馈: ${feedback}`)
  }

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="space-y-6">
      {/* AI能力概览 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {aiCapabilities.slice(0, 3).map((capability, index) => (
          <AnimatedContainer key={capability.id} animation="slideUp" delay={index * 100}>
            <EnhancedCard variant="glass" interactive>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{capability.name}</CardTitle>
                <capability.icon className="h-4 w-4 text-primary-500" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-secondary-500 mb-2">{capability.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant={capability.enabled ? "default" : "secondary"}>
                    {capability.enabled ? "已启用" : "未启用"}
                  </Badge>
                  <Switch checked={capability.enabled} size="sm" />
                </div>
              </CardContent>
            </EnhancedCard>
          </AnimatedContainer>
        ))}
      </div>

      {/* 主要AI助手界面 */}
      <EnhancedCard variant="traditional" size="lg">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat">智能对话</TabsTrigger>
            <TabsTrigger value="capabilities">AI能力</TabsTrigger>
            <TabsTrigger value="settings">设置</TabsTrigger>
          </TabsList>

          {/* 智能对话 */}
          <TabsContent value="chat" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-traditional-jade rounded-full animate-pulse" />
                <span className="text-sm font-medium">AI助手在线</span>
                <Badge variant="outline" className="bg-traditional-jade/10 text-traditional-jade">
                  YanYu-AI v3.0
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className="text-secondary-500 hover:text-primary-500"
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      清空对话
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="w-4 h-4 mr-2" />
                      导出对话
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Settings className="w-4 h-4 mr-2" />
                      AI设置
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* 消息列表 */}
            <ScrollArea className="h-96 w-full border rounded-lg p-4 bg-secondary-50/30">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] ${
                        message.type === "user"
                          ? "bg-primary-500 text-white"
                          : message.type === "system"
                            ? "bg-accent-100 text-accent-800 border border-accent-200"
                            : "bg-white border border-secondary-200"
                      } rounded-lg p-3 shadow-sm`}
                    >
                      {message.type !== "user" && (
                        <div className="flex items-center space-x-2 mb-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="bg-gradient-to-r from-primary-500 to-accent-500 text-white text-xs">
                              <Bot className="w-3 h-3" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">
                            {message.type === "system" ? "系统" : "AI助手"}
                          </span>
                          {message.metadata?.confidence && (
                            <Badge variant="outline" className="text-xs">
                              {Math.round(message.metadata.confidence * 100)}%
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>

                      {/* 消息元数据 */}
                      {message.metadata && (
                        <div className="mt-3 space-y-2">
                          {/* 建议操作 */}
                          {message.metadata.suggestions && (
                            <div className="flex flex-wrap gap-1">
                              {message.metadata.suggestions.map((suggestion, index) => (
                                <Button
                                  key={index}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-6"
                                  onClick={() => handleSuggestionClick(suggestion)}
                                >
                                  {suggestion}
                                </Button>
                              ))}
                            </div>
                          )}

                          {/* 快捷操作 */}
                          {message.metadata.actions && (
                            <div className="flex flex-wrap gap-1">
                              {message.metadata.actions.map((action) => (
                                <Button
                                  key={action.id}
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-6"
                                  onClick={action.action}
                                >
                                  <action.icon className="w-3 h-3 mr-1" />
                                  {action.title}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 消息操作 */}
                      {message.type === "assistant" && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-secondary-200">
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleCopyMessage(message.content)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleMessageFeedback(message.id, "positive")}
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleMessageFeedback(message.id, "negative")}
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </Button>
                          </div>
                          <span className="text-xs text-secondary-400">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-secondary-200 rounded-lg p-3 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce delay-100" />
                          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce delay-200" />
                        </div>
                        <span className="text-sm text-secondary-500">AI正在思考...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* 输入区域 */}
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="请输入您的问题或需求..."
                  className="min-h-[40px] max-h-32 resize-none pr-20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleVoiceToggle}
                    disabled={isLoading}
                  >
                    {isListening ? <MicOff className="w-3 h-3 text-red-500" /> : <Mic className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
              <EnhancedButton
                variant="primary"
                size="sm"
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                glowEffect
              >
                <Send className="w-4 h-4" />
              </EnhancedButton>
            </div>
          </TabsContent>

          {/* AI能力管理 */}
          <TabsContent value="capabilities" className="space-y-4">
            <div className="grid gap-4">
              {aiCapabilities.map((capability, index) => (
                <AnimatedContainer key={capability.id} animation="slideRight" delay={index * 50}>
                  <EnhancedCard variant="glass" className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                          <capability.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium">{capability.name}</h4>
                          <p className="text-sm text-secondary-500">{capability.description}</p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {capability.category}
                          </Badge>
                        </div>
                      </div>
                      <Switch checked={capability.enabled} />
                    </div>
                  </EnhancedCard>
                </AnimatedContainer>
              ))}
            </div>
          </TabsContent>

          {/* 设置 */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid gap-4">
              <EnhancedCard variant="glass" className="p-4">
                <h4 className="font-medium mb-3">AI模型设置</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">响应速度优先</span>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">启用语音交互</span>
                    <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">自动保存对话</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">智能建议</span>
                    <Switch defaultChecked />
                  </div>
                </div>
              </EnhancedCard>

              <EnhancedCard variant="glass" className="p-4">
                <h4 className="font-medium mb-3">隐私设置</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">数据本地化处理</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">匿名化用户数据</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">定期清理对话记录</span>
                    <Switch />
                  </div>
                </div>
              </EnhancedCard>
            </div>
          </TabsContent>
        </Tabs>
      </EnhancedCard>
    </div>
  )
}
