/**
 * YYC3 Performance Dashboard — Real-time system monitoring with recharts
 * @description Visualizes CPU, memory, network, API latency, and build metrics
 *   in a theme-aware overlay with animated charts.
 * @version 4.8.0
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  X, Activity, Cpu, HardDrive, Wifi, Zap,
  BarChart3, TrendingUp, Clock, Server,
} from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useI18n } from '../i18n/context'
import { useThemeStore, Z_INDEX, BLUR } from '../store/theme-store'

interface PerformanceDashboardProps {
  visible: boolean
  onClose: () => void
}

/** Generate fake time-series data */
function generateTimeSeries(points: number, min: number, max: number, trend: 'up' | 'down' | 'flat' = 'flat') {
  const data: { time: string; value: number }[] = []
  let v = (min + max) / 2
  for (let i = 0; i < points; i++) {
    const t = trend === 'up' ? 0.02 : trend === 'down' ? -0.02 : 0
    v = Math.max(min, Math.min(max, v + (Math.random() - 0.5 + t) * (max - min) * 0.15))
    data.push({ time: `${i}s`, value: Math.round(v * 10) / 10 })
  }
  return data
}

export function PerformanceDashboard({ visible, onClose }: PerformanceDashboardProps) {
  const { t } = useI18n()
  const { tokens: tk, isCyberpunk } = useThemeStore()
  const [cpuData, setCpuData] = useState(() => generateTimeSeries(30, 10, 65))
  const [memData, setMemData] = useState(() => generateTimeSeries(30, 40, 80))
  const [netData, setNetData] = useState(() => generateTimeSeries(30, 5, 50))
  const [latencyData, setLatencyData] = useState(() => generateTimeSeries(30, 50, 300, 'flat'))
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Live update every 2s
  useEffect(() => {
    if (!visible) return
    timerRef.current = setInterval(() => {
      const push = (prev: { time: string; value: number }[], min: number, max: number) => {
        const last = prev[prev.length - 1]?.value ?? (min + max) / 2
        const v = Math.max(min, Math.min(max, last + (Math.random() - 0.5) * (max - min) * 0.15))
        return [...prev.slice(1), { time: `${Date.now() % 100}s`, value: Math.round(v * 10) / 10 }]
      }
      setCpuData(p => push(p, 10, 65))
      setMemData(p => push(p, 40, 80))
      setNetData(p => push(p, 5, 50))
      setLatencyData(p => push(p, 50, 300))
    }, 2000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [visible])

  // Build metrics (static mock)
  const buildMetrics = useMemo(() => [
    { name: 'TypeScript', time: 1.2, size: 340 },
    { name: 'Vite HMR', time: 0.3, size: 0 },
    { name: 'Tailwind', time: 0.8, size: 52 },
    { name: 'Bundle', time: 2.1, size: 1280 },
    { name: 'Assets', time: 0.5, size: 180 },
  ], [])

  // API response metrics
  const apiMetrics = useMemo(() => [
    { endpoint: 'OpenAI /chat', avg: 1250, p95: 2100, p99: 3400, calls: 142 },
    { endpoint: 'Anthropic /msg', avg: 980, p95: 1800, p99: 2600, calls: 87 },
    { endpoint: '智谱 /chat', avg: 650, p95: 1200, p99: 1800, calls: 56 },
    { endpoint: 'Ollama /gen', avg: 2800, p95: 4200, p99: 5500, calls: 34 },
  ], [])

  if (!visible) return null

  const currentCpu = cpuData[cpuData.length - 1]?.value ?? 0
  const currentMem = memData[memData.length - 1]?.value ?? 0
  const currentNet = netData[netData.length - 1]?.value ?? 0
  const currentLat = latencyData[latencyData.length - 1]?.value ?? 0

  const chartColors = {
    cpu: isCyberpunk ? '#00f0ff' : '#3b82f6',
    mem: isCyberpunk ? '#ff79c6' : '#8b5cf6',
    net: isCyberpunk ? '#00ff88' : '#10b981',
    lat: isCyberpunk ? '#ffaa00' : '#f59e0b',
    grid: isCyberpunk ? 'rgba(0,240,255,0.06)' : 'rgba(0,0,0,0.04)',
    axis: isCyberpunk ? 'rgba(0,240,255,0.3)' : 'rgba(0,0,0,0.2)',
  }

  /** Stat card helper */
  function StatCard({ icon: Icon, label, value, unit, color, sparkData, sparkColor }: {
    icon: React.ElementType; label: string; value: number; unit: string; color: string
    sparkData?: { time: string; value: number }[]; sparkColor?: string
  }) {
    return (
      <div className="flex flex-col gap-1 p-3 rounded-xl" style={{
        background: tk.cardBg, border: `1px solid ${tk.cardBorder}`,
        boxShadow: isCyberpunk ? `0 0 8px ${color}15` : tk.shadow,
      }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon size={12} color={color} />
            <span style={{ fontFamily: tk.fontMono, fontSize: '9px', color: tk.foregroundMuted, letterSpacing: '0.5px' }}>{label}</span>
          </div>
          <span style={{ fontFamily: tk.fontMono, fontSize: '16px', color, lineHeight: 1 }}>
            {value.toFixed(1)}<span style={{ fontSize: '9px', opacity: 0.6 }}>{unit}</span>
          </span>
        </div>
        {sparkData && (
          <div style={{ height: 32 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparkColor || color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={sparkColor || color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke={sparkColor || color} strokeWidth={1.5}
                  fill={`url(#grad-${label})`} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-[5vh]"
      style={{ zIndex: Z_INDEX.topModal + 30, background: tk.overlayBg, backdropFilter: BLUR.md }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: 820, maxHeight: '88vh',
          background: tk.panelBg, border: `1px solid ${tk.cardBorder}`,
          borderRadius: tk.borderRadius,
          boxShadow: isCyberpunk ? `0 0 40px ${tk.primaryGlow}, 0 0 80px ${tk.primaryGlow}` : tk.shadowHover,
          animation: 'modalIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{ borderColor: tk.border }}>
          <div className="flex items-center gap-2.5">
            <Activity size={16} color={tk.primary} />
            <span style={{ fontFamily: tk.fontDisplay, fontSize: '13px', color: tk.primary, letterSpacing: '2px' }}>
              {t('perf', 'title')}
            </span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: `${tk.success}15` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: tk.success, animation: 'neon-pulse 2s ease-in-out infinite' }} />
              <span style={{ fontFamily: tk.fontMono, fontSize: '8px', color: tk.success }}>LIVE</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded transition-all hover:opacity-70" style={{ color: tk.foregroundMuted }}>
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto neon-scrollbar p-5 space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard icon={Cpu} label="CPU" value={currentCpu} unit="%" color={chartColors.cpu} sparkData={cpuData} sparkColor={chartColors.cpu} />
            <StatCard icon={HardDrive} label="MEM" value={currentMem} unit="%" color={chartColors.mem} sparkData={memData} sparkColor={chartColors.mem} />
            <StatCard icon={Wifi} label="NET" value={currentNet} unit="MB/s" color={chartColors.net} sparkData={netData} sparkColor={chartColors.net} />
            <StatCard icon={Clock} label="LAT" value={currentLat} unit="ms" color={chartColors.lat} sparkData={latencyData} sparkColor={chartColors.lat} />
          </div>

          {/* Main CPU/Memory chart */}
          <div className="rounded-xl p-4" style={{ background: tk.cardBg, border: `1px solid ${tk.cardBorder}` }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={12} color={tk.primary} />
              <span style={{ fontFamily: tk.fontMono, fontSize: '10px', color: tk.primary, letterSpacing: '1px' }}>
                {t('perf', 'systemResources')}
              </span>
            </div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cpuData.map((d, i) => ({ ...d, mem: memData[i]?.value ?? 0, net: netData[i]?.value ?? 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: chartColors.axis }} />
                  <YAxis tick={{ fontSize: 9, fill: chartColors.axis }} />
                  <Tooltip
                    contentStyle={{
                      background: tk.panelBg, border: `1px solid ${tk.cardBorder}`,
                      borderRadius: 6, fontFamily: tk.fontMono, fontSize: 10,
                    }}
                  />
                  <Line type="monotone" dataKey="value" name="CPU" stroke={chartColors.cpu} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="mem" name="Memory" stroke={chartColors.mem} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="net" name="Network" stroke={chartColors.net} strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* API Metrics table */}
          <div className="rounded-xl p-4" style={{ background: tk.cardBg, border: `1px solid ${tk.cardBorder}` }}>
            <div className="flex items-center gap-2 mb-3">
              <Server size={12} color={tk.primary} />
              <span style={{ fontFamily: tk.fontMono, fontSize: '10px', color: tk.primary, letterSpacing: '1px' }}>
                {t('perf', 'apiMetrics')}
              </span>
            </div>
            <table className="w-full" style={{ fontFamily: tk.fontMono, fontSize: '10px' }}>
              <thead>
                <tr style={{ color: tk.foregroundMuted }}>
                  <th className="text-left py-1.5 px-2">{t('perf', 'endpoint')}</th>
                  <th className="text-right py-1.5 px-2">{t('perf', 'avgLatency')}</th>
                  <th className="text-right py-1.5 px-2">P95</th>
                  <th className="text-right py-1.5 px-2">P99</th>
                  <th className="text-right py-1.5 px-2">{t('perf', 'calls')}</th>
                </tr>
              </thead>
              <tbody>
                {apiMetrics.map((m, i) => (
                  <tr key={m.endpoint} style={{ borderBottom: `1px solid ${tk.borderDim}`, background: i % 2 === 0 ? 'transparent' : tk.primaryGlow }}>
                    <td className="py-1.5 px-2" style={{ color: tk.foreground }}>{m.endpoint}</td>
                    <td className="text-right py-1.5 px-2" style={{ color: m.avg < 1000 ? tk.success : m.avg < 2000 ? tk.warning : tk.error }}>{m.avg}ms</td>
                    <td className="text-right py-1.5 px-2" style={{ color: tk.foregroundMuted }}>{m.p95}ms</td>
                    <td className="text-right py-1.5 px-2" style={{ color: tk.foregroundMuted }}>{m.p99}ms</td>
                    <td className="text-right py-1.5 px-2" style={{ color: tk.primary }}>{m.calls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Build metrics bar chart */}
          <div className="rounded-xl p-4" style={{ background: tk.cardBg, border: `1px solid ${tk.cardBorder}` }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={12} color={tk.primary} />
              <span style={{ fontFamily: tk.fontMono, fontSize: '10px', color: tk.primary, letterSpacing: '1px' }}>
                {t('perf', 'buildMetrics')}
              </span>
            </div>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buildMetrics} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: chartColors.axis }} unit="s" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: chartColors.axis }} />
                  <Tooltip
                    contentStyle={{
                      background: tk.panelBg, border: `1px solid ${tk.cardBorder}`,
                      borderRadius: 6, fontFamily: tk.fontMono, fontSize: 10,
                    }}
                    formatter={(val: number) => [`${val}s`, 'Build Time']}
                  />
                  <Bar dataKey="time" fill={chartColors.cpu} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
