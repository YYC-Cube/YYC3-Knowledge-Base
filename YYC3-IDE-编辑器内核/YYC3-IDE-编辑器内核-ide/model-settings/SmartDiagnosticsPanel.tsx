
// @ts-nocheck — TODO(P0-1): React 19 + lucide-react 类型兼容性问题，待上游修复
/**
 * @file SmartDiagnosticsPanel.tsx
 * @description 智能连接诊断面板 — 一键检测所有模型连通性，显示延迟趋势与 AI 建议
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 */

import {
  Activity as ActivityIcon,
  ArrowRight,
  Bug,
  CheckCircle2,
  Clock,
  Cpu,
  Lightbulb,
  Loader2,
  RefreshCw,
  Wifi,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ProviderDef } from '../constants/providers'
import { LatencyTrendChart } from './LatencyTrendChart'
import type { DiagnosticResult } from './types'

export function SmartDiagnosticsPanel({
  providers,
  diagnostics,
  onRunDiagnostic,
  onSelectModel,
  activeModelKey,
}: {
  providers: ProviderDef[]
  apiKeys: Record<string, string>
  diagnostics: Record<string, DiagnosticResult>
  onRunDiagnostic: (providerId: string, modelId: string) => void
  onSelectModel: (providerId: string, modelId: string) => void
  activeModelKey: string | null
}) {
  const [running, setRunning] = useState(false)

  const allModels = useMemo(() => {
    const list: { providerId: string; providerName: string; modelId: string; modelName: string }[] = []
    providers.forEach(p => {
      p.models.forEach(m => {
        list.push({ providerId: p.id, providerName: p.shortName, modelId: m.id, modelName: m.name })
      })
    })
    return list
  }, [providers])

  const handleRunAll = async () => {
    setRunning(true)
    for (const m of allModels) {
      onRunDiagnostic(m.providerId, m.modelId)
      await new Promise(r => setTimeout(r, 300))
    }
    setTimeout(() => setRunning(false), 2000)
  }

  const totalModels = allModels.length
  const testedModels = Object.values(diagnostics).filter(d => d.status === 'success' || d.status === 'error').length
  const onlineModels = Object.values(diagnostics).filter(d => d.status === 'success').length
  const errorModels = Object.values(diagnostics).filter(d => d.status === 'error').length
  const avgLatency = (() => {
    const latencies = Object.values(diagnostics).filter(d => d.latency != null).map(d => d.latency!)
    return latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0
  })()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '总模型数', value: String(totalModels), icon: Cpu, color: 'text-white/50' },
          { label: '已检测', value: String(testedModels), icon: ActivityIcon, color: 'text-cyan-400' },
          { label: '在线', value: String(onlineModels), icon: Wifi, color: 'text-emerald-400' },
          { label: '平均延迟', value: avgLatency ? `${avgLatency}ms` : '-', icon: Clock, color: 'text-amber-400' },
        ].map(card => (
          <div key={card.label} className="p-3 rounded-xl border border-white/6 bg-white/2 text-center">
            <card.icon className={`w-4 h-4 ${card.color} mx-auto mb-1`} />
            <div className={`text-[16px] ${card.color}`}>{card.value}</div>
            <div className="text-[9px] text-white/20 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      <LatencyTrendChart diagnostics={diagnostics} />

      <button
        onClick={handleRunAll}
        disabled={running}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/15 text-cyan-400 text-[12px] hover:from-cyan-500/20 hover:to-blue-500/20 transition-all disabled:opacity-50"
      >
        {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ActivityIcon className="w-4 h-4" />}
        {running ? '全面检测中...' : '一键全面诊断'}
      </button>

      {providers.map(provider => {
        const providerDiags = provider.models.map(m => ({ model: m, diag: diagnostics[`${provider.id}:${m.id}`] })).filter(d => d.diag)
        if (providerDiags.length === 0) return null
        return (
          <div key={provider.id} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <provider.icon className={`w-3.5 h-3.5 ${provider.color}`} />
              <span className="text-[11px] text-white/50">{provider.name}</span>
              <span className="text-[9px] text-white/15">
                {providerDiags.filter(d => d.diag.status === 'success').length}/{providerDiags.length} 在线
              </span>
            </div>
            {providerDiags.map(({ model, diag }) => {
              const modelKey = `${provider.id}:${model.id}`
              const isActive = activeModelKey === modelKey
              return (
                <div key={model.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all group ${isActive
                  ? 'bg-indigo-500/[0.06] border border-indigo-500/20'
                  : diag.status === 'success' ? 'bg-emerald-500/[0.03] border border-emerald-500/10 hover:border-emerald-500/20' :
                    diag.status === 'error' ? 'bg-red-500/[0.03] border border-red-500/10' :
                      'bg-white/[0.01] border border-white/[0.04]'
                  }`}>
                  {isActive ? <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> :
                    diag.status === 'success' ? <CheckCircle2 className="w-3 h-3 text-emerald-400/60 shrink-0" /> :
                      diag.status === 'error' ? <XCircle className="w-3 h-3 text-red-400/60 shrink-0" /> :
                        <Loader2 className="w-3 h-3 text-cyan-400/60 animate-spin shrink-0" />}
                  <span className={`text-[10px] flex-1 ${isActive ? 'text-indigo-300' : 'text-white/50'}`}>{model.name}</span>
                  {isActive && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400/80 border border-indigo-500/20 shrink-0">当前使用</span>
                  )}
                  {diag.latency != null && (
                    <span className={`text-[9px] ${isActive ? 'text-indigo-400/50' : diag.status === 'success' ? 'text-emerald-400/40' : 'text-white/20'}`}>{diag.latency}ms</span>
                  )}
                  {diag.status === 'error' && (
                    <span className="text-[9px] text-red-400/50 max-w-[180px] truncate">{diag.message}</span>
                  )}
                  {diag.status === 'success' && !isActive && (
                    <button
                      onClick={() => onSelectModel(provider.id, model.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] text-indigo-400/60 hover:text-indigo-400 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/15 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <ArrowRight className="w-3 h-3" />
                      选择使用
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {errorModels > 0 && (
        <div className="rounded-xl border border-amber-500/15 bg-gradient-to-br from-amber-500/[0.04] to-orange-500/[0.02] p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span className="text-[12px] text-amber-400/80">AI 诊断建议</span>
          </div>
          <div className="space-y-1.5 pl-6">
            {Object.values(diagnostics).filter(d => d.status === 'error').slice(0, 3).map((diag, i) => (
              <div key={i} className="text-[10px] text-white/35 flex items-start gap-1.5">
                <Bug className="w-3 h-3 text-amber-400/40 shrink-0 mt-0.5" />
                <span><strong className="text-amber-400/50">{diag.modelName}</strong>: {
                  diag.message.includes('401') ? '请检查 API Key 是否正确配置且未过期' :
                    diag.message.includes('429') ? '请求频率超限，建议稍后重试或升级配额' :
                      diag.message.includes('网络') || diag.message.includes('fetch') ? '网络连接失败，请确认端点 URL 是否可达' :
                        diag.message.includes('超时') ? '连接超时，可能是网络不稳定或服务暂时不可用' :
                          '请检查配置或查看错误详情'
                }</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
