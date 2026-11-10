/**
 * @file: MentorPanel.tsx
 * @description: AI 导师面板 — 模型资源总览、学习记录、AI Family 成员状态
 *               链接 qwen3-coder-30b 本地模型，显示导师当前可用状态
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-06-04
 * @status: dev
 * @license: MIT
 */

import {
  BookOpen,
  Brain,
  Cpu,
  Loader2,
  MessageSquare,
  Server,
  Sparkles,
  Wifi,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { detectOllama, type ProviderModel } from './LLMService'

// ── AI Family 成员快速参考 ──

const AI_FAMILY_MEMBERS = [
  { id: 'tianshu', name: '元启·天枢', emoji: '🧠', role: '总指挥', color: 'text-violet-400' },
  { id: 'navigator', name: '言启·千行', emoji: '🧭', role: '导航员', color: 'text-sky-400' },
  { id: 'thinker', name: '语枢·万物', emoji: '🤔', role: '思考者', color: 'text-emerald-400' },
  { id: 'master', name: '格物·宗师', emoji: '📚', role: '质量官', color: 'text-amber-400' },
  { id: 'sentinel', name: '智云·守护', emoji: '🛡️', role: '安全官', color: 'text-rose-400' },
  { id: 'prophet', name: '预见·先知', emoji: '🔮', role: '预言家', color: 'text-cyan-400' },
  { id: 'creative', name: '创想·灵韵', emoji: '🎨', role: '创意官', color: 'text-pink-400' },
  { id: 'bolero', name: '知遇·伯乐', emoji: '🎯', role: '推荐官', color: 'text-orange-400' },
]

// ── 提示建议 ──

const MENTOR_TIPS = [
  { trigger: '重构', tip: '试试说"帮我重构这个组件"→ 📚格物·宗师 会自动执行代码重构工作流' },
  { trigger: '安全', tip: '有安全顾虑？说"审查这段代码"→ 🛡️智云·守护 会全面扫描漏洞' },
  { trigger: '架构', tip: '架构设计不决？说"帮我设计这个模块"→ 🧠元启·天枢 会出方案' },
  { trigger: '解释', tip: '不懂的代码说"解释一下"→ 🤔语枢·万物 会逐行分析' },
  { trigger: '测试', tip: '需要加测试？说"生成测试"→ 📚格物·宗师 会自动生成 Vitest 用例' },
  { trigger: '性能', tip: '代码卡顿？说"优化性能"→ 🤔语枢·万物 会诊断瓶颈' },
  { trigger: '文档', tip: '写文档麻烦？说"生成文档"→ 📝 自动生成 API 文档和组件文档' },
  { trigger: '学习', tip: '想学新技术？说"推荐学习路径"→ 🎯知遇·伯乐 会推荐最适合的方向' },
]

export default function MentorPanel() {
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'available' | 'unavailable'>('checking')
  const [ollamaModel, setOllamaModel] = useState<ProviderModel | null>(null)
  const [currentTip, setCurrentTip] = useState(MENTOR_TIPS[Math.floor(Math.random() * MENTOR_TIPS.length)])
  const [sessionCount, setSessionCount] = useState(0)

  // 检测 Ollama 状态
  useEffect(() => {
    let mounted = true
    const check = async () => {
      const result = await detectOllama()
      if (!mounted) return
      if (result.available && result.models.length > 0) {
        setOllamaStatus('available')
        const codeModel = result.models.find(m => m.id.includes('coder') || m.id.includes('qwen3'))
        setOllamaModel(codeModel || result.models[0])
      } else {
        setOllamaStatus('unavailable')
      }
    }
    check()

    // 轮询保持状态更新
    const interval = setInterval(check, 30000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  // 读取会话数 (本地存储)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('yyc3-chat-sessions')
      if (raw) {
        const sessions = JSON.parse(raw)
        setSessionCount(Array.isArray(sessions) ? sessions.length : 0)
      }
    } catch { /* ignore */ }
  }, [])

  // 轮播提示
  useEffect(() => {
    const interval = setInterval(() => {
      const next = MENTOR_TIPS[Math.floor(Math.random() * MENTOR_TIPS.length)]
      setCurrentTip(next)
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  const modelInfo = ollamaModel

  return (
    <div className="space-y-5">
      {/* ── 模型状态横幅 ── */}
      <div className={`rounded-2xl border p-5 transition-all ${ollamaStatus === 'available'
        ? 'bg-gradient-to-br from-emerald-500/[0.06] to-emerald-500/[0.02] border-emerald-500/15'
        : ollamaStatus === 'checking'
          ? 'bg-amber-500/[0.03] border-amber-500/10'
          : 'bg-rose-500/[0.03] border-rose-500/10'
        }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${ollamaStatus === 'available'
              ? 'bg-emerald-500/15 border border-emerald-500/20'
              : 'bg-white/[0.04] border border-white/[0.06]'
              }`}>
              {ollamaStatus === 'available' ? (
                <Brain className="w-6 h-6 text-emerald-400" />
              ) : ollamaStatus === 'checking' ? (
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
              ) : (
                <Cpu className="w-5 h-5 text-rose-400" />
              )}
            </div>
            <div>
              <div className="text-[15px] text-white/80 font-medium">
                {ollamaStatus === 'available'
                  ? 'AI 导师已就绪'
                  : ollamaStatus === 'checking'
                    ? '正在连接本地模型...'
                    : '本地模型未连接'}
              </div>
              <div className="text-[11px] text-white/35 mt-0.5">
                {ollamaStatus === 'available' && modelInfo
                  ? `${modelInfo.name} · ${modelInfo.description || '30.5B'} · 本地推理 · 零上传`
                  : ollamaStatus === 'unavailable'
                    ? '请确保 Ollama 服务运行中: ollama serve'
                    : '检测中...'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ollamaStatus === 'available' ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400/80 text-[10px] border border-emerald-500/15">
                <Wifi className="w-3 h-3" /> 在线
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-400/60 text-[10px] border border-rose-500/15">
                <Server className="w-3 h-3" /> 离线
              </span>
            )}
          </div>
        </div>

        {ollamaStatus === 'available' && modelInfo && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            {[
              { label: '模型', value: 'Qwen3-Coder-30B' },
              { label: '参数量', value: '30.5B' },
              { label: '量化', value: 'Q4_K_M' },
              { label: '推理', value: '本地 · 零上传' },
            ].map(item => (
              <div key={item.label} className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[9px] text-white/20">{item.label}</div>
                <div className="text-[12px] text-white/60 mt-0.5 font-medium">{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 快速统计 ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: MessageSquare, label: '总会话', value: String(sessionCount), color: 'text-sky-400' },
          { icon: Brain, label: '可用家人', value: '8 位', color: 'text-violet-400' },
          { icon: Zap, label: '推荐模型', value: 'qwen3-coder-30b', color: 'text-emerald-400' },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
            <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1.5`} />
            <div className={`text-[18px] ${stat.color} font-medium`}>{stat.value}</div>
            <div className="text-[9px] text-white/20 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── AI Family 成员一览 ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-[12px] text-white/50">AI 家人 · 8 位已就绪</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {AI_FAMILY_MEMBERS.map(member => (
            <div key={member.id}
              className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center hover:border-white/[0.12] transition-all group cursor-default">
              <div className="text-[22px] mb-1">{member.emoji}</div>
              <div className="text-[10px] text-white/60 font-medium">{member.name}</div>
              <div className="text-[8px] text-white/20 mt-0.5">{member.role}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 导师提示 (轮播) ── */}
      <div className="rounded-xl border border-amber-500/10 bg-gradient-to-br from-amber-500/[0.03] to-transparent p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-amber-400/70 font-medium mb-1">导师建议</div>
            <div className="text-[12px] text-white/60 leading-relaxed animate-fadeIn">
              {currentTip.tip}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex gap-1">
                {MENTOR_TIPS.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${currentTip === MENTOR_TIPS[i] ? 'bg-amber-400/60 w-3' : 'bg-white/10'
                    }`} />
                ))}
              </div>
            </div>
          </div>
          <div className="text-[18px] shrink-0 mt-1">
            {['💡', '🌟', '💪', '🎯', '🔥', '✨', '📖', '🚀'][MENTOR_TIPS.indexOf(currentTip)]}
          </div>
        </div>
      </div>
    </div>
  )
}
