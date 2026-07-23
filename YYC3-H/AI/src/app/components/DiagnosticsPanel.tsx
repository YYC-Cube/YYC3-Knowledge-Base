/**
 * YYC3 AI Diagnostics Panel — Inline code analysis with auto-fix
 * @description Analyzes code for errors, warnings, performance issues,
 *   security vulnerabilities, and provides one-click AI-powered fixes.
 * @version 4.8.0
 */

import { useState, useMemo } from 'react'
import {
  X, AlertTriangle, AlertCircle, Info, CheckCircle,
  Zap, Shield, Bug, Lightbulb, Wrench,
  ChevronRight, FileText, RefreshCw, Filter,
} from 'lucide-react'
import { useI18n } from '../i18n/context'
import { useThemeStore, Z_INDEX, BLUR } from '../store/theme-store'

type DiagSeverity = 'error' | 'warning' | 'info' | 'hint'
type DiagCategory = 'syntax' | 'type' | 'performance' | 'security' | 'style' | 'a11y' | 'best-practice'

interface Diagnostic {
  id: string
  file: string
  line: number
  column: number
  severity: DiagSeverity
  category: DiagCategory
  message: string
  messageZh: string
  rule: string
  fix?: { label: string; labelZh: string }
}

interface DiagnosticsPanelProps {
  visible: boolean
  onClose: () => void
  /** Current file being edited */
  currentFile?: string
  /** Callback to apply an auto-fix */
  onApplyFix?: (diagId: string) => void
}

// Simulated diagnostics
const MOCK_DIAGNOSTICS: Diagnostic[] = [
  {
    id: 'd1', file: 'IDEMode.tsx', line: 42, column: 5, severity: 'error', category: 'type',
    message: "Type 'string | undefined' is not assignable to type 'string'",
    messageZh: "类型 'string | undefined' 不能赋值给类型 'string'",
    rule: 'TS2322',
    fix: { label: 'Add non-null assertion', labelZh: '添加非空断言' },
  },
  {
    id: 'd2', file: 'IDEMode.tsx', line: 156, column: 12, severity: 'warning', category: 'performance',
    message: "useMemo dependency array is missing 'locale'",
    messageZh: "useMemo 依赖数组缺少 'locale'",
    rule: 'react-hooks/exhaustive-deps',
    fix: { label: 'Add missing dependency', labelZh: '添加缺失依赖' },
  },
  {
    id: 'd3', file: 'IDEMode.tsx', line: 89, column: 3, severity: 'warning', category: 'security',
    message: "Avoid using innerHTML — potential XSS vulnerability",
    messageZh: "避免使用 innerHTML — 存在 XSS 安全风险",
    rule: 'security/no-inner-html',
    fix: { label: 'Use textContent instead', labelZh: '使用 textContent 替代' },
  },
  {
    id: 'd4', file: 'App.tsx', line: 23, column: 1, severity: 'info', category: 'best-practice',
    message: "Consider extracting inline styles to CSS modules or Tailwind classes",
    messageZh: "建议将内联样式提取为 CSS 模块或 Tailwind 类",
    rule: 'style/no-inline-style',
  },
  {
    id: 'd5', file: 'model-store.tsx', line: 67, column: 8, severity: 'warning', category: 'performance',
    message: "Large object spread in hot path — consider Immer for immutable updates",
    messageZh: "热路径中大对象展开 — 建议使用 Immer 进行不可变更新",
    rule: 'perf/object-spread',
    fix: { label: 'Refactor with Immer', labelZh: '使用 Immer 重构' },
  },
  {
    id: 'd6', file: 'CyberEditor.tsx', line: 12, column: 1, severity: 'hint', category: 'style',
    message: "Unused import: 'useCallback' from react",
    messageZh: "未使用的导入: react 的 'useCallback'",
    rule: 'no-unused-imports',
    fix: { label: 'Remove unused import', labelZh: '移除未使用导入' },
  },
  {
    id: 'd7', file: 'IDEMode.tsx', line: 201, column: 7, severity: 'info', category: 'a11y',
    message: "Button element has no accessible name — add aria-label",
    messageZh: "按钮元素缺少无障碍名称 — 添加 aria-label",
    rule: 'jsx-a11y/button-has-type',
    fix: { label: 'Add aria-label', labelZh: '添加 aria-label' },
  },
  {
    id: 'd8', file: 'theme-store.ts', line: 45, column: 10, severity: 'hint', category: 'best-practice',
    message: "Consider using 'as const' assertion for better type narrowing",
    messageZh: "建议使用 'as const' 断言以获得更好的类型收窄",
    rule: 'ts/prefer-as-const',
  },
]

const SEVERITY_ORDER: Record<DiagSeverity, number> = { error: 0, warning: 1, info: 2, hint: 3 }

export function DiagnosticsPanel({ visible, onClose, currentFile, onApplyFix }: DiagnosticsPanelProps) {
  const { t, locale } = useI18n()
  const { tokens: tk, isCyberpunk } = useThemeStore()
  const isZh = locale === 'zh'
  const [filter, setFilter] = useState<DiagSeverity | 'all'>('all')
  const [catFilter, setCatFilter] = useState<DiagCategory | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [fixedIds, setFixedIds] = useState<Set<string>>(new Set())

  const diagnostics = useMemo(() => {
    let list = MOCK_DIAGNOSTICS.filter(d => !fixedIds.has(d.id))
    if (filter !== 'all') list = list.filter(d => d.severity === filter)
    if (catFilter !== 'all') list = list.filter(d => d.category === catFilter)
    return list.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  }, [filter, catFilter, fixedIds])

  const counts = useMemo(() => {
    const all = MOCK_DIAGNOSTICS.filter(d => !fixedIds.has(d.id))
    return {
      error: all.filter(d => d.severity === 'error').length,
      warning: all.filter(d => d.severity === 'warning').length,
      info: all.filter(d => d.severity === 'info').length,
      hint: all.filter(d => d.severity === 'hint').length,
      total: all.length,
    }
  }, [fixedIds])

  const sevIcon = (sev: DiagSeverity, size = 12) => {
    switch (sev) {
      case 'error': return <AlertCircle size={size} color={tk.error} />
      case 'warning': return <AlertTriangle size={size} color={tk.warning} />
      case 'info': return <Info size={size} color={tk.primary} />
      case 'hint': return <Lightbulb size={size} color={tk.success} />
    }
  }

  const catIcon = (cat: DiagCategory, size = 11) => {
    switch (cat) {
      case 'syntax': case 'type': return <Bug size={size} />
      case 'performance': return <Zap size={size} />
      case 'security': return <Shield size={size} />
      case 'style': case 'best-practice': return <Lightbulb size={size} />
      case 'a11y': return <Info size={size} />
    }
  }

  const sevColor = (sev: DiagSeverity) => {
    switch (sev) { case 'error': return tk.error; case 'warning': return tk.warning; case 'info': return tk.primary; case 'hint': return tk.success }
  }

  const handleFix = (id: string) => {
    setFixedIds(prev => new Set(prev).add(id))
    onApplyFix?.(id)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 flex items-stretch justify-end"
      style={{ zIndex: Z_INDEX.assistPanel, background: tk.overlayBg, backdropFilter: BLUR.sm }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col h-full"
        style={{
          width: 440, background: tk.panelBg, borderLeft: `1px solid ${tk.cardBorder}`,
          backdropFilter: BLUR.lg, animation: 'slideInRight 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: tk.border }}>
          <div className="flex items-center gap-2">
            <Bug size={16} color={tk.primary} />
            <span style={{ fontFamily: tk.fontDisplay, fontSize: '13px', color: tk.primary, letterSpacing: '1.5px' }}>
              {t('diagnostics', 'title')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1 rounded hover:opacity-70" style={{ color: tk.foregroundMuted }}>
              <RefreshCw size={12} />
            </button>
            <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: tk.foregroundMuted }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b shrink-0" style={{ borderColor: tk.borderDim }}>
          {([
            { sev: 'error' as const, count: counts.error, color: tk.error },
            { sev: 'warning' as const, count: counts.warning, color: tk.warning },
            { sev: 'info' as const, count: counts.info, color: tk.primary },
            { sev: 'hint' as const, count: counts.hint, color: tk.success },
          ]).map(s => (
            <button
              key={s.sev}
              onClick={() => setFilter(filter === s.sev ? 'all' : s.sev)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded transition-all"
              style={{
                background: filter === s.sev ? `${s.color}15` : 'transparent',
                border: filter === s.sev ? `1px solid ${s.color}30` : '1px solid transparent',
              }}
            >
              {sevIcon(s.sev, 10)}
              <span style={{ fontFamily: tk.fontMono, fontSize: '10px', color: s.color }}>{s.count}</span>
            </button>
          ))}
          <div className="flex-1" />
          <span style={{ fontFamily: tk.fontMono, fontSize: '8px', color: tk.foregroundMuted }}>
            {counts.total} {isZh ? '个问题' : 'issues'}
          </span>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1 px-4 py-1.5 overflow-x-auto border-b shrink-0" style={{ borderColor: tk.borderDim }}>
          {(['all', 'type', 'performance', 'security', 'style', 'a11y', 'best-practice'] as const).map(c => (
            <button
              key={c}
              onClick={() => setCatFilter(catFilter === c ? 'all' : c)}
              className="px-2 py-0.5 rounded-full whitespace-nowrap transition-all"
              style={{
                fontFamily: tk.fontMono, fontSize: '8px', letterSpacing: '0.5px',
                color: catFilter === c ? tk.primary : tk.foregroundMuted,
                background: catFilter === c ? tk.primaryGlow : 'transparent',
                border: `1px solid ${catFilter === c ? tk.border : 'transparent'}`,
              }}
            >
              {c === 'all' ? (isZh ? '全部' : 'ALL') : c.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Diagnostic list */}
        <div className="flex-1 overflow-y-auto neon-scrollbar">
          {diagnostics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <CheckCircle size={32} color={tk.success} style={{ opacity: 0.3 }} />
              <p style={{ fontFamily: tk.fontMono, fontSize: '12px', color: tk.success }}>{t('diagnostics', 'allClear')}</p>
              <p style={{ fontFamily: tk.fontMono, fontSize: '9px', color: tk.foregroundMuted }}>{t('diagnostics', 'allClearDesc')}</p>
            </div>
          ) : (
            diagnostics.map(d => {
              const isExpanded = expandedId === d.id
              return (
                <div
                  key={d.id}
                  className="border-b transition-all"
                  style={{ borderColor: tk.borderDim, background: isExpanded ? `${sevColor(d.severity)}06` : 'transparent' }}
                >
                  {/* Main row */}
                  <button
                    className="w-full flex items-start gap-2.5 px-4 py-2.5 text-left transition-all hover:opacity-80"
                    onClick={() => setExpandedId(isExpanded ? null : d.id)}
                  >
                    <div className="shrink-0 mt-0.5">{sevIcon(d.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="break-words" style={{ fontFamily: tk.fontBody, fontSize: '11px', color: tk.foreground, lineHeight: '16px' }}>
                        {isZh ? d.messageZh : d.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span style={{ fontFamily: tk.fontMono, fontSize: '9px', color: tk.primary }}>{d.file}:{d.line}:{d.column}</span>
                        <span className="px-1 py-0.5 rounded" style={{
                          fontFamily: tk.fontMono, fontSize: '7px', color: tk.foregroundMuted,
                          background: tk.primaryGlow, border: `1px solid ${tk.borderDim}`,
                        }}>
                          {d.rule}
                        </span>
                        <span className="px-1 py-0.5 rounded" style={{
                          fontFamily: tk.fontMono, fontSize: '7px', color: sevColor(d.severity),
                          background: `${sevColor(d.severity)}10`,
                        }}>
                          {d.category}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={12} color={tk.foregroundMuted}
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-3 pl-10">
                      {d.fix && (
                        <button
                          onClick={() => handleFix(d.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                          style={{
                            fontFamily: tk.fontMono, fontSize: '10px', color: tk.background,
                            background: tk.primary, letterSpacing: '0.5px',
                            boxShadow: isCyberpunk ? `0 0 8px ${tk.primaryGlow}` : 'none',
                          }}
                        >
                          <Wrench size={10} />
                          {isZh ? d.fix.labelZh : d.fix.label}
                        </button>
                      )}
                      {!d.fix && (
                        <p style={{ fontFamily: tk.fontMono, fontSize: '9px', color: tk.foregroundMuted, fontStyle: 'italic' }}>
                          {isZh ? '暂无自动修复方案' : 'No auto-fix available'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer summary */}
        <div className="flex items-center justify-between px-4 py-2 border-t shrink-0" style={{ borderColor: tk.border, background: tk.primaryGlow }}>
          <span style={{ fontFamily: tk.fontMono, fontSize: '9px', color: tk.foregroundMuted }}>
            {isZh ? 'AI 实时分析 · 点击展开修复建议' : 'AI real-time analysis · Click to expand fix suggestions'}
          </span>
          <span style={{ fontFamily: tk.fontMono, fontSize: '8px', color: tk.foregroundMuted, opacity: 0.5 }}>
            v4.8.0
          </span>
        </div>
      </div>
    </div>
  )
}
