/**
 * @file: MultiAgentPanel.tsx
 * @description: Multi-Agent 状态面板，展示 4 类智能体（规划/编码/测试/评审）的状态、
 *              任务进度、协作关系图、任务流程可视化和调度队列
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-02
 * @updated: 2026-04-02
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: multi-agent,orchestrator,planner,coder,tester,reviewer,task-flow
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import {
  Users,
  Brain,
  Code2,
  TestTube2,
  Eye,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  ChevronRight,
  ChevronDown,
  Zap,
  ArrowRight,
  GitBranch,
  Activity,
  BarChart3,
  MessageSquare,
  Sparkles,
  Target,
  CircleDot,
  Timer,
  X,
  Database,
  FileCode2,
  Search,
  Pin,
  Trash2,
  Plus,
  BookOpen,
  History,
  Tag,
  Diff,
  Check,
  XCircle,
  Send,
} from "lucide-react"
import { PanelHeader } from "./PanelManager"
import { type ProviderId, getProviderConfigs } from "./LLMService"
import { useMemoryStore } from "./stores/useMemoryStore"
import { useMultiAgentDispatch, type PipelineStage, type AgentRole as PipelineAgentRole, type AgentResult } from "./hooks/useMultiAgentDispatch"
import { useI18n } from "./i18n"

// ── Types ──

type AgentRole = "planner" | "coder" | "tester" | "reviewer"
type AgentStatus = "idle" | "running" | "waiting" | "completed" | "error"
type TaskStage = "analysis" | "planning" | "coding" | "testing" | "review" | "complete"

interface Agent {
  id: string
  role: AgentRole
  name: string
  status: AgentStatus
  currentTask: string
  progress: number
  tasksCompleted: number
  avgTime: string
  successRate: number
  messages: AgentMessage[]
}

interface AgentMessage {
  id: string
  from: AgentRole
  to: AgentRole | "orchestrator"
  content: string
  timestamp: number
}

interface TaskFlowNode {
  stage: TaskStage
  status: "pending" | "active" | "completed" | "error"
  agent?: AgentRole
  startTime?: number
  duration?: string
}

interface ScheduledTask {
  id: string
  name: string
  type: "feature" | "bugfix" | "refactor" | "test"
  priority: "high" | "medium" | "low"
  status: "active" | "pending" | "completed" | "failed"
  assignedAgent: AgentRole
  progress: number
  estimatedTime: string
}

// ── Constants ──

const ROLE_CONFIG: Record<AgentRole, { label: string; color: string; bgColor: string; borderColor: string; icon: typeof Brain }> = {
  planner: { label: "agent.planner", color: "text-blue-400", bgColor: "bg-blue-500/15", borderColor: "border-blue-500/25", icon: Brain },
  coder: { label: "agent.coder", color: "text-emerald-400", bgColor: "bg-emerald-500/15", borderColor: "border-emerald-500/25", icon: Code2 },
  tester: { label: "agent.tester", color: "text-amber-400", bgColor: "bg-amber-500/15", borderColor: "border-amber-500/25", icon: TestTube2 },
  reviewer: { label: "agent.reviewer", color: "text-violet-400", bgColor: "bg-violet-500/15", borderColor: "border-violet-500/25", icon: Eye },
}

const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; bgColor: string }> = {
  idle: { label: "agent.idle", color: "text-slate-500", bgColor: "bg-slate-500/20" },
  running: { label: "agent.running", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  waiting: { label: "agent.waiting", color: "text-amber-400", bgColor: "bg-amber-500/20" },
  completed: { label: "agent.completed", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
  error: { label: "agent.errorStatus", color: "text-red-400", bgColor: "bg-red-500/20" },
}

const STAGE_LABELS: Record<TaskStage, string> = {
  analysis: "agent.analysis", planning: "agent.planning", coding: "agent.coding", testing: "agent.testing", review: "agent.review", complete: "agent.complete",
}

// ── Mock Data ──

const INITIAL_TASKS: ScheduledTask[] = [
  { id: "t1", name: "实现 Agent 状态面板", type: "feature", priority: "high", status: "active", assignedAgent: "coder", progress: 67, estimatedTime: "~12s" },
  { id: "t2", name: "编写单元测试", type: "test", priority: "medium", status: "pending", assignedAgent: "tester", progress: 0, estimatedTime: "~8s" },
  { id: "t3", name: "代码安全审查", type: "refactor", priority: "medium", status: "pending", assignedAgent: "reviewer", progress: 0, estimatedTime: "~5s" },
  { id: "t4", name: "修复类型推断问题", type: "bugfix", priority: "high", status: "pending", assignedAgent: "coder", progress: 0, estimatedTime: "~3s" },
  { id: "t5", name: "API 集成优化", type: "refactor", priority: "low", status: "completed", assignedAgent: "coder", progress: 100, estimatedTime: "6.2s" },
]

const MOCK_MESSAGES: AgentMessage[] = [
  { id: "m1", from: "planner", to: "coder", content: "任务分解完成，共 3 个子任务", timestamp: Date.now() - 10000 },
  { id: "m2", from: "coder", to: "orchestrator", content: "开始实现 MultiAgentPanel 组件", timestamp: Date.now() - 8000 },
  { id: "m3", from: "coder", to: "tester", content: "第一模块编码完成，可开始编写测试", timestamp: Date.now() - 3000 },
  { id: "m4", from: "planner", to: "reviewer", content: "请准备审查编码产物", timestamp: Date.now() - 1000 },
]

// ── Sub Components ──

type TabId = "status" | "flow" | "graph" | "queue" | "memory" | "preview"

function AgentCard({ agent, selected, onClick }: { agent: Agent; selected: boolean; onClick: () => void }) {
  const { t } = useI18n()
  const cfg = ROLE_CONFIG[agent.role]
  const st = STATUS_CONFIG[agent.status]
  const Icon = cfg.icon

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-2.5 transition-all ${
        selected
          ? `${cfg.borderColor} ${cfg.bgColor}`
          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1]"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg ${cfg.bgColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[0.68rem] text-white/80 truncate">{t(cfg.label)}</span>
            <span className={`text-[0.5rem] px-1 py-0.5 rounded ${st.bgColor} ${st.color}`}>
              {t(st.label)}
            </span>
          </div>
          <p className="text-[0.58rem] text-white/30 truncate mt-0.5">{agent.currentTask}</p>
        </div>
        {agent.status === "running" && (
          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        )}
        {agent.status === "completed" && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
        {agent.status === "error" && <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />}
      </div>
      {/* Progress bar */}
      {agent.status === "running" && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[0.5rem] text-white/20">进度</span>
            <span className="text-[0.5rem] text-white/40">{agent.progress}%</span>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                agent.role === "planner" ? "bg-blue-400" :
                agent.role === "coder" ? "bg-emerald-400" :
                agent.role === "tester" ? "bg-amber-400" : "bg-violet-400"
              }`}
              style={{ width: `${agent.progress}%` }}
            />
          </div>
        </div>
      )}
    </button>
  )
}

function AgentDetail({ agent }: { agent: Agent }) {
  const { t } = useI18n()
  const cfg = ROLE_CONFIG[agent.role]

  return (
    <div className="space-y-3 px-3 py-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2">
          <div className="text-[0.5rem] text-white/25 mb-0.5">已完成任务</div>
          <div className="text-[0.82rem] text-white/80">{agent.tasksCompleted}</div>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2">
          <div className="text-[0.5rem] text-white/25 mb-0.5">平均耗时</div>
          <div className="text-[0.82rem] text-white/80">{agent.avgTime}</div>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2">
          <div className="text-[0.5rem] text-white/25 mb-0.5">成功率</div>
          <div className={`text-[0.82rem] ${agent.successRate >= 90 ? "text-emerald-400" : "text-amber-400"}`}>
            {agent.successRate}%
          </div>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2">
          <div className="text-[0.5rem] text-white/25 mb-0.5">当前状态</div>
          <div className={`text-[0.82rem] ${STATUS_CONFIG[agent.status].color}`}>
            {t(STATUS_CONFIG[agent.status].label)}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1">
        <button className={`flex items-center gap-1 px-2 py-1 rounded text-[0.58rem] ${cfg.bgColor} ${cfg.color} border ${cfg.borderColor} hover:brightness-110 transition-all`}>
          {agent.status === "running" ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
          {agent.status === "running" ? t('agent.pause') : t('agent.start')}
        </button>
        <button className="flex items-center gap-1 px-2 py-1 rounded text-[0.58rem] text-white/30 hover:text-white/50 hover:bg-white/[0.04] transition-all">
          <RotateCcw className="w-2.5 h-2.5" /> {t('common.restart')}
        </button>
        <button className="flex items-center gap-1 px-2 py-1 rounded text-[0.58rem] text-white/30 hover:text-white/50 hover:bg-white/[0.04] transition-all">
          <MessageSquare className="w-2.5 h-2.5" /> {t('common.messages')}
        </button>
      </div>
    </div>
  )
}

function TaskFlowView({ flow }: { flow: TaskFlowNode[] }) {
  const { t } = useI18n()
  return (
    <div className="px-3 py-3">
      {/* Overall progress */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[0.62rem] text-white/40">任务流程</span>
        <span className="text-[0.55rem] text-white/25">
          {flow.filter(f => f.status === "completed").length}/{flow.length} 阶段完成
        </span>
      </div>

      {/* Flow nodes */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {flow.map((node, i) => {
          const isActive = node.status === "active"
          const isCompleted = node.status === "completed"
          const isError = node.status === "error"
          const agentCfg = node.agent ? ROLE_CONFIG[node.agent] : null

          return (
            <div key={node.stage} className="flex items-center gap-1 flex-shrink-0">
              {/* Node */}
              <div className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                isActive
                  ? "border-blue-500/40 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                  : isCompleted
                  ? "border-emerald-500/20 bg-emerald-500/[0.05]"
                  : isError
                  ? "border-red-500/20 bg-red-500/[0.05]"
                  : "border-white/[0.06] bg-white/[0.02]"
              }`}>
                {/* Status icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isActive ? "bg-blue-500/20" :
                  isCompleted ? "bg-emerald-500/20" :
                  isError ? "bg-red-500/20" : "bg-white/[0.04]"
                }`}>
                  {isActive && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                  {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {isError && <AlertCircle className="w-4 h-4 text-red-400" />}
                  {node.status === "pending" && <CircleDot className="w-4 h-4 text-white/15" />}
                </div>
                <span className={`text-[0.55rem] ${
                  isActive ? "text-blue-400" :
                  isCompleted ? "text-emerald-400" :
                  isError ? "text-red-400" : "text-white/25"
                }`}>
                  {t(STAGE_LABELS[node.stage])}
                </span>
                {agentCfg && (
                  <span className={`text-[0.45rem] px-1 py-0.5 rounded ${agentCfg.bgColor} ${agentCfg.color}`}>
                    {t(agentCfg.label).replace(t('agent.planner').replace('Agent', ''), '')}
                  </span>
                )}
                {node.duration && (
                  <span className="text-[0.45rem] text-white/15">{node.duration}</span>
                )}
                {/* Active pulse */}
                {isActive && (
                  <div className="absolute -inset-0.5 rounded-lg border border-blue-400/30 animate-pulse pointer-events-none" />
                )}
              </div>
              {/* Arrow */}
              {i < flow.length - 1 && (
                <ArrowRight className={`w-3 h-3 flex-shrink-0 ${
                  isCompleted ? "text-emerald-400/40" : "text-white/10"
                }`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CollaborationGraph({ agents, messages }: { agents: Agent[]; messages: AgentMessage[] }) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLDivElement>(null)

  // Simple circular layout for 4 agents + orchestrator
  const positions = [
    { x: 50, y: 30, label: "Orchestrator", color: "#FBBF24" }, // center top
    { x: 15, y: 30, label: "Planner", color: "#3B82F6" },
    { x: 85, y: 30, label: "Coder", color: "#10B981" },
    { x: 15, y: 75, label: "Tester", color: "#F59E0B" },
    { x: 85, y: 75, label: "Reviewer", color: "#8B5CF6" },
  ]

  return (
    <div ref={canvasRef} className="px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[0.62rem] text-white/40">协作关系图</span>
        <span className="text-[0.55rem] text-white/25">{messages.length} 条消息</span>
      </div>

      {/* SVG Graph */}
      <div className="relative w-full h-44 rounded-lg bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        {/* Grid background */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.2" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Edges */}
        <svg className="absolute inset-0 w-full h-full">
          {/* Orchestrator to all agents */}
          {[1, 2, 3, 4].map(i => (
            <line
              key={`edge-${i}`}
              x1={`${positions[0].x}%`} y1={`${positions[0].y}%`}
              x2={`${positions[i].x}%`} y2={`${positions[i].y}%`}
              stroke="white" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.1"
            />
          ))}
          {/* Planner -> Coder */}
          <line x1={`${positions[1].x}%`} y1={`${positions[1].y}%`} x2={`${positions[2].x}%`} y2={`${positions[2].y}%`} stroke="#3B82F6" strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
          {/* Coder -> Tester */}
          <line x1={`${positions[2].x}%`} y1={`${positions[2].y}%`} x2={`${positions[3].x}%`} y2={`${positions[3].y}%`} stroke="#10B981" strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
          {/* Tester -> Reviewer */}
          <line x1={`${positions[3].x}%`} y1={`${positions[3].y}%`} x2={`${positions[4].x}%`} y2={`${positions[4].y}%`} stroke="#F59E0B" strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
        </svg>

        {/* Nodes */}
        {positions.map((pos, i) => {
          const isOrch = i === 0
          const agent = i > 0 ? agents[i - 1] : null
          const status = agent?.status || "running"
          return (
            <div
              key={i}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <div
                className={`${isOrch ? "w-10 h-10" : "w-8 h-8"} rounded-full flex items-center justify-center border-2 transition-all`}
                style={{
                  backgroundColor: `${pos.color}15`,
                  borderColor: `${pos.color}40`,
                  boxShadow: `0 0 12px ${pos.color}20`,
                }}
              >
                {isOrch ? <Sparkles className="w-4 h-4" style={{ color: pos.color }} /> :
                 i === 1 ? <Brain className="w-3.5 h-3.5" style={{ color: pos.color }} /> :
                 i === 2 ? <Code2 className="w-3.5 h-3.5" style={{ color: pos.color }} /> :
                 i === 3 ? <TestTube2 className="w-3.5 h-3.5" style={{ color: pos.color }} /> :
                 <Eye className="w-3.5 h-3.5" style={{ color: pos.color }} />}
              </div>
              <span className="text-[0.5rem] text-white/40">{pos.label}</span>
              {agent && (
                <span className={`text-[0.42rem] px-1 py-0.5 rounded ${STATUS_CONFIG[status].bgColor} ${STATUS_CONFIG[status].color}`}>
                  {STATUS_CONFIG[status].label}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Recent messages */}
      <div className="mt-3 space-y-1">
        <span className="text-[0.55rem] text-white/25">最近消息</span>
        {messages.slice(-4).map(msg => {
          const fromCfg = ROLE_CONFIG[msg.from]
          return (
            <div key={msg.id} className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.02]">
              <span className={`text-[0.48rem] px-1 py-0.5 rounded ${fromCfg.bgColor} ${fromCfg.color}`}>
                {t(fromCfg.label).replace(/Agent$/i, '').trim()}
              </span>
              <ArrowRight className="w-2.5 h-2.5 text-white/15 flex-shrink-0" />
              <span className="text-[0.52rem] text-white/30 truncate flex-1">{msg.content}</span>
              <span className="text-[0.42rem] text-white/15 flex-shrink-0">
                {Math.round((Date.now() - msg.timestamp) / 1000)}s前
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TaskQueue({ tasks }: { tasks: ScheduledTask[] }) {
  const { t } = useI18n()
  const priorityColors: Record<string, string> = {
    high: "bg-red-500/20 text-red-400 border-red-500/20",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/20",
    low: "bg-slate-500/20 text-slate-400 border-slate-500/20",
  }
  const typeIcons: Record<string, typeof Zap> = {
    feature: Sparkles,
    bugfix: AlertCircle,
    refactor: GitBranch,
    test: TestTube2,
  }

  const active = tasks.filter(t => t.status === "active")
  const pending = tasks.filter(t => t.status === "pending")
  const completed = tasks.filter(t => t.status === "completed" || t.status === "failed")

  const renderTask = (task: ScheduledTask) => {
    const Icon = typeIcons[task.type] || Zap
    const agentCfg = ROLE_CONFIG[task.assignedAgent]
    return (
      <div key={task.id} className={`rounded-lg border p-2 transition-all ${
        task.status === "active"
          ? "border-blue-500/20 bg-blue-500/[0.04]"
          : task.status === "completed"
          ? "border-emerald-500/10 bg-emerald-500/[0.02] opacity-60"
          : task.status === "failed"
          ? "border-red-500/15 bg-red-500/[0.03]"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-3 h-3 flex-shrink-0 ${
            task.status === "active" ? "text-blue-400" :
            task.status === "completed" ? "text-emerald-400" :
            task.status === "failed" ? "text-red-400" : "text-white/25"
          }`} />
          <span className="text-[0.62rem] text-white/70 flex-1 truncate">{task.name}</span>
          <span className={`text-[0.45rem] px-1 py-0.5 rounded border ${priorityColors[task.priority]}`}>
            {task.priority === "high" ? "高" : task.priority === "medium" ? "中" : "低"}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-[0.48rem] px-1 py-0.5 rounded ${agentCfg.bgColor} ${agentCfg.color}`}>
            {t(agentCfg.label).replace(/Agent$/i, '').trim()}
          </span>
          <div className="flex-1 h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                task.status === "completed" ? "bg-emerald-400" :
                task.status === "active" ? "bg-blue-400" : "bg-white/10"
              }`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="text-[0.48rem] text-white/20 flex-shrink-0">
            <Timer className="w-2.5 h-2.5 inline mr-0.5" />{task.estimatedTime}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 py-3 space-y-3">
      {active.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Activity className="w-3 h-3 text-blue-400" />
            <span className="text-[0.58rem] text-blue-400">运行中 ({active.length})</span>
          </div>
          <div className="space-y-1.5">{active.map(renderTask)}</div>
        </div>
      )}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3 h-3 text-amber-400" />
            <span className="text-[0.58rem] text-amber-400">等待中 ({pending.length})</span>
          </div>
          <div className="space-y-1.5">{pending.map(renderTask)}</div>
        </div>
      )}
      {completed.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400/50" />
            <span className="text-[0.58rem] text-emerald-400/50">已完成 ({completed.length})</span>
          </div>
          <div className="space-y-1.5">{completed.map(renderTask)}</div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ──

export default function MultiAgentPanel({ nodeId }: { nodeId: string }) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabId>("status")
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [tasks] = useState(INITIAL_TASKS)

  // ── Real Multi-Agent Pipeline ──
  const { state: pipelineState, executePipeline, cancel: cancelPipeline, reset: resetPipeline, hasProvider } = useMultiAgentDispatch()
  const [pipelineInput, setPipelineInput] = useState("")
  const [showPipelineInput, setShowPipelineInput] = useState(false)

  // ── Derive Agent States from Pipeline ──
  const agents = useMemo<Agent[]>(() => {
    const baseAgents: Agent[] = [
      { id: "a1", role: "planner", name: "Planner Agent", status: "idle", currentTask: t('agent.pendingAssignment'), progress: 0, tasksCompleted: 12, avgTime: "2.3s", successRate: 95, messages: [] },
      { id: "a2", role: "coder", name: "Coder Agent", status: "idle", currentTask: t('agent.pendingAssignment'), progress: 0, tasksCompleted: 28, avgTime: "8.5s", successRate: 91, messages: [] },
      { id: "a3", role: "tester", name: "Tester Agent", status: "idle", currentTask: t('agent.pendingAssignment'), progress: 0, tasksCompleted: 15, avgTime: "4.1s", successRate: 88, messages: [] },
      { id: "a4", role: "reviewer", name: "Reviewer Agent", status: "idle", currentTask: t('agent.pendingAssignment'), progress: 0, tasksCompleted: 9, avgTime: "3.7s", successRate: 97, messages: [] },
    ]

    const stageAgentMap: Record<PipelineStage, { role: AgentRole; idx: number }> = {
      idle: { role: 'planner', idx: 0 },
      planning: { role: 'planner', idx: 0 },
      coding: { role: 'coder', idx: 1 },
      testing: { role: 'tester', idx: 2 },
      reviewing: { role: 'reviewer', idx: 3 },
      completed: { role: 'reviewer', idx: 3 },
      error: { role: 'planner', idx: 0 },
    }

    const stage = pipelineState.stage
    const currentIdx = stageAgentMap[stage]?.idx ?? -1

    baseAgents.forEach((agent, idx) => {
      const result = pipelineState.results.find(r => r.role === agent.role)
      if (result?.success) {
        agent.status = "completed"
        agent.progress = 100
        agent.currentTask = t('agent.taskComplete')
      } else if (idx === currentIdx) {
        agent.status = pipelineState.isStreaming ? "running" : "waiting"
        agent.progress = pipelineState.isStreaming ? 50 : 25
        agent.currentTask = pipelineState.isStreaming
          ? `${t(STAGE_LABELS[stage === 'planning' ? 'planning' : stage === 'coding' ? 'coding' : stage === 'testing' ? 'testing' : 'review'])}...`
          : t('agent.waitingExecution')
      } else if (idx > currentIdx && stage !== 'idle' && stage !== 'completed' && stage !== 'error') {
        agent.status = "waiting"
        agent.progress = 0
        agent.currentTask = t('agent.waitingUpstream')
      }
    })

    if (stage === 'error') {
      const failedResult = pipelineState.results.find(r => !r.success)
      if (failedResult) {
        const idx = baseAgents.findIndex(a => a.role === failedResult.role)
        if (idx >= 0) {
          baseAgents[idx].status = "error"
          baseAgents[idx].currentTask = pipelineState.error || t('agent.executionFailed')
        }
      }
    }

    return baseAgents
  }, [pipelineState])

  // ── Derive Flow from Pipeline ──
  const flow = useMemo<TaskFlowNode[]>(() => {
    const stages: TaskStage[] = ['analysis', 'planning', 'coding', 'testing', 'review', 'complete']
    const stageToPipeline: Record<TaskStage, PipelineStage | null> = {
      analysis: null, planning: 'planning', coding: 'coding', testing: 'testing', review: 'reviewing', complete: 'completed'
    }
    const stageToAgent: Record<TaskStage, AgentRole | undefined> = {
      analysis: undefined, planning: 'planner', coding: 'coder', testing: 'tester', review: 'reviewer', complete: undefined
    }

    const currentPipelineStage = pipelineState.stage

    return stages.map((stage): TaskFlowNode => {
      const pipelineStage = stageToPipeline[stage]
      const agent = stageToAgent[stage]
      const result = agent ? pipelineState.results.find(r => r.role === agent) : null

      let status: "pending" | "active" | "completed" | "error" = "pending"

      if (stage === 'analysis') {
        status = currentPipelineStage !== 'idle' ? 'completed' : 'pending'
      } else if (stage === 'complete') {
        status = currentPipelineStage === 'completed' ? 'completed' : 'pending'
      } else if (pipelineStage) {
        if (result?.success) {
          status = 'completed'
        } else if (currentPipelineStage === pipelineStage) {
          status = pipelineState.isStreaming ? 'active' : 'pending'
        } else if (currentPipelineStage === 'error' && !result) {
          status = 'error'
        }
      }

      return {
        stage,
        status,
        agent,
        duration: result ? `${(result.durationMs / 1000).toFixed(1)}s` : undefined,
        startTime: status === 'active' ? Date.now() : undefined,
      }
    })
  }, [pipelineState])

  const isRunning = pipelineState.stage !== 'idle' && pipelineState.stage !== 'completed' && pipelineState.stage !== 'error'

  const selected = agents.find(a => a.id === selectedAgent)
  const tabs: { id: TabId; label: string; icon: typeof Users }[] = [
    { id: "status", label: t('agent.status'), icon: Users },
    { id: "flow", label: t('agent.flow'), icon: GitBranch },
    { id: "graph", label: t('agent.collaboration'), icon: Activity },
    { id: "queue", label: t('agent.queue'), icon: BarChart3 },
    { id: "memory", label: t('agent.memory'), icon: Database },
    { id: "preview", label: t('agent.preview'), icon: FileCode2 },
  ]

  const handleToggleRun = useCallback(() => {
    if (isRunning) {
      cancelPipeline()
    }
  }, [isRunning, cancelPipeline])

  return (
    <div className="size-full flex flex-col bg-[var(--ide-bg)]">
      <PanelHeader
        nodeId={nodeId}
        panelId="multi-agent"
        title="Multi-Agent"
        icon={<Users className="w-3 h-3 text-amber-400/70" />}
      >
        <div className="flex items-center gap-0.5 ml-2">
          <button
            onClick={handleToggleRun}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/5"
            title={isRunning ? t('agent.pause') : t('agent.start')}
          >
            {isRunning ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
          </button>
          <button
            onClick={resetPipeline}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/5"
            title={t('common.reset')}
          >
            <RotateCcw className="w-3 h-3 text-slate-600" />
          </button>
        </div>
      </PanelHeader>

      {/* Tab bar */}
      <div className="flex-shrink-0 flex border-b border-[var(--ide-border-dim)]">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 text-[0.62rem] flex items-center justify-center gap-1 transition-colors ${
                activeTab === tab.id
                  ? "text-amber-400 border-b border-amber-500"
                  : "text-slate-600 hover:text-slate-400"
              }`}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "status" && (
          <div className="p-2 space-y-2">
            {/* Summary bar */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[0.52rem] text-white/30">
                  {agents.filter(a => a.status === "running").length} 运行
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[0.52rem] text-white/30">
                  {agents.filter(a => a.status === "waiting").length} 等待
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-[0.52rem] text-white/30">
                  {agents.filter(a => a.status === "idle").length} 空闲
                </span>
              </div>
              <div className="flex-1" />
              <span className="text-[0.52rem] text-white/20">
                共 {agents.reduce((s, a) => s + a.tasksCompleted, 0)} 任务完成
              </span>
            </div>

            {/* Agent cards */}
            {agents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                selected={selectedAgent === agent.id}
                onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
              />
            ))}

            {/* Selected agent detail */}
            {selected && (
              <div className="border-t border-white/[0.06] mt-2 pt-2">
                <AgentDetail agent={selected} />
              </div>
            )}

            {/* ── Pipeline Execution Trigger ── */}
            <div className="border-t border-white/[0.06] mt-2 pt-2 space-y-2">
              <div className="flex items-center gap-1.5 px-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="text-[0.58rem] text-white/40">LLM 流水线调度</span>
                {!hasProvider && (
                  <span className="text-[0.45rem] text-red-400/60 ml-auto">未配置 Provider</span>
                )}
              </div>

              {/* Pipeline status indicator */}
              {pipelineState.stage !== 'idle' && (
                <div className={`rounded-lg border p-2 ${
                  pipelineState.stage === 'error' ? 'border-red-500/20 bg-red-500/[0.04]' :
                  pipelineState.stage === 'completed' ? 'border-emerald-500/20 bg-emerald-500/[0.04]' :
                  'border-blue-500/20 bg-blue-500/[0.04]'
                }`}>
                  <div className="flex items-center gap-1.5">
                    {pipelineState.isStreaming && <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />}
                    {pipelineState.stage === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    {pipelineState.stage === 'error' && <AlertCircle className="w-3 h-3 text-red-400" />}
                    <span className="text-[0.55rem] text-white/50">
                      {pipelineState.stage === 'planning' ? '🧠 规划中...' :
                       pipelineState.stage === 'coding' ? '💻 编码中...' :
                       pipelineState.stage === 'testing' ? '🧪 测试中...' :
                       pipelineState.stage === 'reviewing' ? '👁 评审中...' :
                       pipelineState.stage === 'completed' ? '✅ 流水线完成' :
                       pipelineState.stage === 'error' ? '❌ 执行出错' : ''}
                    </span>
                    <span className="text-[0.45rem] text-white/20 ml-auto">
                      {pipelineState.results.length}/4 阶段
                    </span>
                  </div>
                  {pipelineState.currentOutput && (
                    <pre className="text-[0.48rem] text-white/30 mt-1 max-h-16 overflow-y-auto font-mono whitespace-pre-wrap line-clamp-4">
                      {pipelineState.currentOutput.slice(-200)}
                    </pre>
                  )}
                  {pipelineState.error && (
                    <p className="text-[0.48rem] text-red-400/70 mt-1">{pipelineState.error}</p>
                  )}
                </div>
              )}

              {/* Input + trigger */}
              {showPipelineInput ? (
                <div className="space-y-1.5">
                  <textarea
                    value={pipelineInput}
                    onChange={e => setPipelineInput(e.target.value)}
                    placeholder="输入需求描述，启动 Planner→Coder→Tester→Reviewer 四阶段调度..."
                    rows={2}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[0.58rem] text-white/60 placeholder:text-white/15 focus:outline-none focus:border-amber-500/30 resize-none"
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        if (pipelineInput.trim()) {
                          executePipeline(pipelineInput.trim())
                          setPipelineInput("")
                          setShowPipelineInput(false)
                        }
                      }}
                      disabled={!pipelineInput.trim() || !hasProvider || pipelineState.isStreaming}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[0.55rem] bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:bg-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <Play className="w-2.5 h-2.5" /> 执行流水线
                    </button>
                    {pipelineState.isStreaming && (
                      <button
                        onClick={cancelPipeline}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[0.55rem] text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <X className="w-2.5 h-2.5" /> 取消
                      </button>
                    )}
                    <button
                      onClick={() => setShowPipelineInput(false)}
                      className="text-[0.52rem] text-white/25 hover:text-white/40 ml-auto"
                    >
                      收起
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowPipelineInput(true)}
                    disabled={!hasProvider}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-[0.55rem] bg-amber-500/15 text-amber-400/80 border border-amber-500/15 hover:bg-amber-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <Zap className="w-2.5 h-2.5" /> 启动 Pipeline
                  </button>
                  {pipelineState.stage !== 'idle' && (
                    <button
                      onClick={resetPipeline}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[0.52rem] text-white/25 hover:text-white/40 hover:bg-white/[0.04] transition-all"
                    >
                      <RotateCcw className="w-2.5 h-2.5" /> 重置
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "flow" && <TaskFlowView flow={flow} />}
        {activeTab === "graph" && <CollaborationGraph agents={agents} messages={MOCK_MESSAGES} />}
        {activeTab === "queue" && <TaskQueue tasks={tasks} />}
        {activeTab === "memory" && <PersistentMemoryView />}
        {activeTab === "preview" && <CodePreviewView />}
      </div>
    </div>
  )
}

// ── Persistent Memory View (交付物 5 → P9: useMemoryStore 实时数据 + 语义搜索) ──

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  project: { label: "项目知识", color: "text-blue-400" },
  patterns: { label: "代码模式", color: "text-emerald-400" },
  debug: { label: "调试记录", color: "text-red-400" },
  preferences: { label: "偏好设置", color: "text-violet-400" },
  conversation: { label: "对话历史", color: "text-amber-400" },
}

function PersistentMemoryView() {
  const { t } = useI18n()
  const {
    memories, initialized, loading, initialize,
    search, semanticSearch, togglePin, removeMemory, addMemory,
  } = useMemoryStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchMode, setSearchMode] = useState<"keyword" | "semantic">("keyword")
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMemory, setNewMemory] = useState({ title: "", summary: "", category: "project" as const, agent: "planner" as const, relevance: 80, tags: "" })

  // Initialize store on mount
  useEffect(() => {
    if (!initialized) initialize()
  }, [initialized, initialize])

  // Filtered/searched results
  const filtered = searchMode === "semantic" && searchQuery.trim()
    ? semanticSearch(searchQuery, 20).map(m => ({ ...m, _similarity: m.similarity }))
    : (selectedCategory === "all"
        ? search(searchQuery)
        : search(searchQuery, selectedCategory as any)
      ).map(m => ({ ...m, _similarity: undefined as number | undefined }))

  if (loading) {
    return (
      <div className="px-3 py-8 flex flex-col items-center gap-2">
        <Loader2 className="w-5 h-5 text-amber-400/50 animate-spin" />
        <span className="text-[0.55rem] text-white/25">初始化记忆系统...</span>
      </div>
    )
  }

  return (
    <div className="px-3 py-3 space-y-3">
      {/* Stats */}
      <div className="flex items-center gap-3 text-[0.52rem] text-white/25">
        <span><Database className="w-3 h-3 inline mr-0.5" />{memories.length} 条记忆</span>
        <span><Pin className="w-3 h-3 inline mr-0.5" />{memories.filter(m => m.pinned).length} 已置顶</span>
        <span className="ml-auto">{memories.reduce((s, m) => s + m.usageCount, 0)} 次引用</span>
      </div>

      {/* Search with mode toggle */}
      <div className="flex items-center gap-1.5">
        <div className="flex-1 flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-1">
          <Search className="w-3 h-3 text-white/20" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchMode === "semantic" ? "语义搜索..." : "关键词搜索..."}
            className="flex-1 bg-transparent border-0 outline-none text-[0.62rem] text-white/60 placeholder:text-white/15"
          />
        </div>
        <button
          onClick={() => setSearchMode(searchMode === "keyword" ? "semantic" : "keyword")}
          className={`flex-shrink-0 px-1.5 py-1 rounded text-[0.48rem] border transition-all ${
            searchMode === "semantic"
              ? "bg-violet-500/20 text-violet-400 border-violet-500/20"
              : "text-white/25 border-white/[0.06] hover:text-white/40"
          }`}
          title={searchMode === "semantic" ? "当前：语义搜索（TF-IDF + Cosine）" : "当前：关键词搜索"}
        >
          {searchMode === "semantic" ? "语义" : "关键词"}
        </button>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-white/25 hover:text-amber-400 hover:bg-white/[0.04] transition-all"
          title="新增记忆"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-2.5 space-y-2">
          <input
            value={newMemory.title}
            onChange={e => setNewMemory(p => ({ ...p, title: e.target.value }))}
            placeholder="记忆标题"
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1 text-[0.58rem] text-white/60 placeholder:text-white/15 focus:outline-none"
          />
          <textarea
            value={newMemory.summary}
            onChange={e => setNewMemory(p => ({ ...p, summary: e.target.value }))}
            placeholder="记忆摘要"
            rows={2}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1 text-[0.58rem] text-white/60 placeholder:text-white/15 focus:outline-none resize-none"
          />
          <div className="flex items-center gap-1.5">
            <select
              value={newMemory.category}
              onChange={e => setNewMemory(p => ({ ...p, category: e.target.value as any }))}
              className="bg-white/[0.03] border border-white/[0.06] rounded px-1.5 py-0.5 text-[0.52rem] text-white/50 focus:outline-none"
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select
              value={newMemory.agent}
              onChange={e => setNewMemory(p => ({ ...p, agent: e.target.value as any }))}
              className="bg-white/[0.03] border border-white/[0.06] rounded px-1.5 py-0.5 text-[0.52rem] text-white/50 focus:outline-none"
            >
              {Object.entries(ROLE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input
              value={newMemory.tags}
              onChange={e => setNewMemory(p => ({ ...p, tags: e.target.value }))}
              placeholder="标签(逗号分隔)"
              className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded px-1.5 py-0.5 text-[0.52rem] text-white/50 placeholder:text-white/15 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                if (newMemory.title.trim() && newMemory.summary.trim()) {
                  addMemory({
                    title: newMemory.title,
                    summary: newMemory.summary,
                    category: newMemory.category,
                    agent: newMemory.agent,
                    relevance: newMemory.relevance,
                    pinned: false,
                    tags: newMemory.tags.split(",").map(t => t.trim()).filter(Boolean),
                  })
                  setNewMemory({ title: "", summary: "", category: "project", agent: "planner", relevance: 80, tags: "" })
                  setShowAddForm(false)
                }
              }}
              className="flex items-center gap-1 px-2 py-1 rounded text-[0.52rem] bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all"
            >
              <Plus className="w-2.5 h-2.5" /> 添加
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-[0.52rem] text-white/25 hover:text-white/40"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex items-center gap-1 overflow-x-auto">
        <button onClick={() => setSelectedCategory("all")} className={`flex-shrink-0 px-2 py-0.5 rounded text-[0.52rem] ${selectedCategory === "all" ? "bg-amber-500/20 text-amber-400" : "text-white/25 hover:text-white/40"}`}>全部</button>
        {Object.entries(CATEGORY_LABELS).map(([key, cfg]) => (
          <button key={key} onClick={() => setSelectedCategory(key)} className={`flex-shrink-0 px-2 py-0.5 rounded text-[0.52rem] ${selectedCategory === key ? "bg-amber-500/20 text-amber-400" : "text-white/25 hover:text-white/40"}`}>{cfg.label}</button>
        ))}
      </div>

      {/* Memory items */}
      <div className="space-y-1.5">
        {filtered.length === 0 && (
          <div className="py-4 text-center text-[0.55rem] text-white/20">
            {searchQuery ? "无匹配记忆" : "暂无记忆数据"}
          </div>
        )}
        {filtered.map(mem => {
          const catCfg = CATEGORY_LABELS[mem.category] || { label: mem.category, color: "text-white/40" }
          const agentCfg = ROLE_CONFIG[mem.agent as AgentRole] || ROLE_CONFIG.planner
          return (
            <div key={mem.id} className={`group rounded-lg border p-2 transition-all ${mem.pinned ? "border-amber-500/20 bg-amber-500/[0.03]" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"}`}>
              <div className="flex items-center gap-1.5 mb-1">
                {mem.pinned && <Pin className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />}
                <span className="text-[0.62rem] text-white/70 flex-1 truncate">{mem.title}</span>
                {mem._similarity !== undefined && (
                  <span className="text-[0.42rem] px-1 py-0.5 rounded bg-violet-500/15 text-violet-400">
                    {mem._similarity}% 匹配
                  </span>
                )}
                <span className={`text-[0.42rem] px-1 py-0.5 rounded bg-white/[0.04] ${catCfg.color}`}>{catCfg.label}</span>
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button onClick={() => togglePin(mem.id)} className="w-4 h-4 rounded flex items-center justify-center hover:bg-white/[0.06]" title={mem.pinned ? "取消置顶" : "置顶"}>
                    <Pin className={`w-2.5 h-2.5 ${mem.pinned ? "text-amber-400" : "text-white/20"}`} />
                  </button>
                  <button onClick={() => removeMemory(mem.id)} className="w-4 h-4 rounded flex items-center justify-center hover:bg-red-500/10" title="删除">
                    <Trash2 className="w-2.5 h-2.5 text-white/20 hover:text-red-400" />
                  </button>
                </div>
              </div>
              <p className="text-[0.52rem] text-white/30 line-clamp-2 mb-1.5">{mem.summary}</p>
              <div className="flex items-center gap-2 text-[0.45rem] text-white/15">
                <span className={`px-1 py-0.5 rounded ${agentCfg.bgColor} ${agentCfg.color}`}>{t(agentCfg.label).replace(/Agent$/i, '').trim()}</span>
                <span>相关度 {mem.relevance}%</span>
                <span>引用 {mem.usageCount} 次</span>
                {mem.tags && mem.tags.length > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Tag className="w-2 h-2" />
                    {mem.tags.slice(0, 3).join(", ")}
                  </span>
                )}
                <span className="ml-auto">{mem.createdAt}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Code Application Preview (交付物 4) ──

interface CodeChange {
  id: string
  file: string
  language: string
  added: number
  removed: number
  agent: AgentRole
  confidence: number
  explanation: string
  original: string
  modified: string
  status: "pending" | "accepted" | "rejected"
}

const MOCK_CHANGES: CodeChange[] = [
  {
    id: "ch1", file: "src/components/ide/MultiAgentPanel.tsx", language: "TypeScript",
    added: 24, removed: 3, agent: "coder", confidence: 92,
    explanation: "新增 PersistentMemoryView 组件，实现智能体记忆持久化面板，支持搜索、分类筛选和置顶功能",
    original: "// TODO: 实现持久记忆面板\nfunction PersistentMemoryView() {\n  return <div>待实现</div>\n}",
    modified: "function PersistentMemoryView() {\n  const [memories, setMemories] = useState(MOCK_MEMORIES)\n  const [searchQuery, setSearchQuery] = useState(\"\")\n  // ... 完整实现（24行新增）\n  return (\n    <div className=\"px-3 py-3 space-y-3\">\n      {/* Memory search and filter UI */}\n    </div>\n  )\n}",
    status: "accepted",
  },
  {
    id: "ch2", file: "src/components/settings/PluginSection.tsx", language: "TypeScript",
    added: 180, removed: 0, agent: "coder", confidence: 88,
    explanation: "创建 PluginSection 组件，实现插件管理设置模块，支持分类、搜索、启用/禁用、批量操作",
    original: "// 新建文件",
    modified: "export function PluginSection() {\n  // 插件管理完整实现\n  // 支持 9 个预置插件\n  // 5 个分类筛选\n  // 批量启用/禁用\n}",
    status: "pending",
  },
  {
    id: "ch3", file: "src/app/components/ide/PanelManager.tsx", language: "TypeScript",
    added: 2, removed: 1, agent: "reviewer", confidence: 97,
    explanation: "在 PanelId 类型和 PANEL_TITLES 中注册 multi-agent 面板，添加 multi-agent 布局预设",
    original: "export type PanelId = \"ai\" | ... | \"multi-instance\"",
    modified: "export type PanelId = \"ai\" | ... | \"multi-instance\" | \"multi-agent\"",
    status: "accepted",
  },
]

function CodePreviewView() {
  const { t } = useI18n()
  const [changes, setChanges] = useState(MOCK_CHANGES)
  const [selectedId, setSelectedId] = useState<string | null>("ch1")

  const handleAccept = (id: string) => setChanges(prev => prev.map(c => c.id === id ? { ...c, status: "accepted" as const } : c))
  const handleReject = (id: string) => setChanges(prev => prev.map(c => c.id === id ? { ...c, status: "rejected" as const } : c))
  const handleAcceptAll = () => setChanges(prev => prev.map(c => ({ ...c, status: "accepted" as const })))

  const selected = changes.find(c => c.id === selectedId)

  return (
    <div className="px-3 py-3 space-y-3">
      {/* Action bar */}
      <div className="flex items-center gap-2">
        <span className="text-[0.62rem] text-white/40">
          {changes.length} 个变更 · +{changes.reduce((s, c) => s + c.added, 0)} -{changes.reduce((s, c) => s + c.removed, 0)}
        </span>
        <div className="flex-1" />
        <button onClick={handleAcceptAll} className="flex items-center gap-1 px-2 py-1 rounded text-[0.55rem] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/30 transition-all">
          <Check className="w-2.5 h-2.5" /> 全部接受
        </button>
      </div>

      {/* Change list */}
      <div className="space-y-1.5">
        {changes.map(change => {
          const agentCfg = ROLE_CONFIG[change.agent]
          const isSelected = selectedId === change.id
          return (
            <div key={change.id}>
              <button
                onClick={() => setSelectedId(isSelected ? null : change.id)}
                className={`w-full text-left rounded-lg border p-2 transition-all ${
                  isSelected ? "border-blue-500/25 bg-blue-500/[0.04]" :
                  change.status === "accepted" ? "border-emerald-500/15 bg-emerald-500/[0.02]" :
                  change.status === "rejected" ? "border-red-500/15 bg-red-500/[0.02] opacity-50" :
                  "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FileCode2 className={`w-3 h-3 flex-shrink-0 ${
                    change.status === "accepted" ? "text-emerald-400" :
                    change.status === "rejected" ? "text-red-400" : "text-white/30"
                  }`} />
                  <span className="text-[0.58rem] text-white/60 flex-1 truncate font-mono">{change.file.split("/").pop()}</span>
                  <span className="text-[0.45rem] text-emerald-400">+{change.added}</span>
                  <span className="text-[0.45rem] text-red-400">-{change.removed}</span>
                  {change.status === "accepted" && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                  {change.status === "rejected" && <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-[0.42rem] px-1 py-0.5 rounded ${agentCfg.bgColor} ${agentCfg.color}`}>{t(agentCfg.label).replace(/Agent$/i, '').trim()}</span>
                  <span className="text-[0.42rem] text-white/15">{change.language}</span>
                  <span className="text-[0.42rem] text-white/15">置信度 {change.confidence}%</span>
                </div>
              </button>

              {/* Expanded detail */}
              {isSelected && selected && (
                <div className="mt-1 rounded-lg border border-white/[0.06] bg-white/[0.01] overflow-hidden">
                  {/* AI explanation */}
                  <div className="px-3 py-2 border-b border-white/[0.04] bg-white/[0.02]">
                    <div className="flex items-center gap-1 mb-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span className="text-[0.52rem] text-white/40">AI 变更说明</span>
                    </div>
                    <p className="text-[0.55rem] text-white/50">{selected.explanation}</p>
                  </div>
                  {/* Diff view */}
                  <div className="grid grid-cols-2 divide-x divide-white/[0.04]">
                    <div className="p-2">
                      <div className="text-[0.45rem] text-red-400/50 mb-1">原始代码</div>
                      <pre className="text-[0.5rem] text-white/30 font-mono whitespace-pre-wrap">{selected.original}</pre>
                    </div>
                    <div className="p-2">
                      <div className="text-[0.45rem] text-emerald-400/50 mb-1">修改后</div>
                      <pre className="text-[0.5rem] text-white/40 font-mono whitespace-pre-wrap">{selected.modified}</pre>
                    </div>
                  </div>
                  {/* Actions */}
                  {selected.status === "pending" && (
                    <div className="flex items-center gap-2 px-3 py-2 border-t border-white/[0.04]">
                      <button onClick={() => handleAccept(selected.id)} className="flex items-center gap-1 px-2 py-1 rounded text-[0.52rem] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all">
                        <Check className="w-2.5 h-2.5" /> 接受
                      </button>
                      <button onClick={() => handleReject(selected.id)} className="flex items-center gap-1 px-2 py-1 rounded text-[0.52rem] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all">
                        <X className="w-2.5 h-2.5" /> 拒绝
                      </button>
                      <button className="flex items-center gap-1 px-2 py-1 rounded text-[0.52rem] text-white/25 hover:text-white/40 hover:bg-white/[0.04] transition-all">
                        <Send className="w-2.5 h-2.5" /> 请求修改
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
