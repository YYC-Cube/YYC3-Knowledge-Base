
// @ts-nocheck — TODO(P0-1): React 19 + lucide-react 类型兼容性问题，待上游修复
/**
 * @file LatencyTrendChart.tsx
 * @description 延迟趋势图表组件 — 使用 recharts 展示模型延迟变化
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 */

import { TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { SK_MODEL_PERF_DATA } from '../constants/storage-keys'
import type { DiagnosticResult } from './types'

export function LatencyTrendChart({ diagnostics }: { diagnostics: Record<string, DiagnosticResult> }) {
  const chartData = useMemo(() => {
    const entries = Object.entries(diagnostics)
      .filter(([, d]) => d.timestamp && d.latency != null)
      .sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0))
      .map(([, d]) => ({
        name: d.modelName.length > 12 ? `${d.modelName.slice(0, 12)}…` : d.modelName,
        latency: d.latency || 0,
        status: d.status,
        time: d.timestamp ? new Date(d.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
      }))
    return entries
  }, [diagnostics])

  const perfData = useMemo(() => {
    try {
      const raw = localStorage.getItem(SK_MODEL_PERF_DATA)
      if (!raw) return []
      const parsed = JSON.parse(raw) as Array<{ modelName: string; latencyMs: number; success: boolean; timestamp: number }>
      return parsed
        .filter(p => p.latencyMs != null && p.latencyMs > 0)
        .slice(-30)
        .map(p => ({
          name: (p.modelName || '').length > 12 ? `${p.modelName.slice(0, 12)}…` : (p.modelName || '?'),
          latency: p.latencyMs,
          status: p.success ? 'success' : 'error',
          time: new Date(p.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        }))
    } catch { return [] }
  }, [diagnostics])

  const data = perfData.length > 0 ? perfData : chartData

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/6 bg-white/2 p-4 flex items-center justify-center h-[160px]">
        <div className="text-center">
          <TrendingUp className="w-5 h-5 text-white/10 mx-auto mb-2" />
          <p className="text-[10px] text-white/20">暂无延迟数据</p>
          <p className="text-[9px] text-white/10 mt-0.5">运行诊断检测或启用心跳后显示趋势图</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/6 bg-white/2 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400/60" />
          <span className="text-[10px] text-white/40">延迟趋势</span>
        </div>
        <span className="text-[9px] text-white/15">{data.length} 条记录</span>
      </div>
      <div className="h-[130px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="time"
              tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 9 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 9 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
              tickLine={false}
              unit="ms"
            />
            <RTooltip
              contentStyle={{
                background: '#0d1117',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.7)',
              }}
              labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px' }}
              formatter={(value: unknown) => [`${value}ms`, '延迟']}
            />
            <Area
              type="monotone"
              dataKey="latency"
              stroke="#06b6d4"
              strokeWidth={1.5}
              fill="url(#latencyGrad)"
              dot={{ fill: '#06b6d4', r: 2, strokeWidth: 0 }}
              activeDot={{ r: 3, fill: '#06b6d4', stroke: '#0d1117', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
