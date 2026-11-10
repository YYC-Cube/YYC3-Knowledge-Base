/**
 * YYC3 Git Integration Panel — Source control management
 * @description Branch management, file staging, commit history, and diff view.
 *   Uses simulated Git state with full theme-token styling.
 * @version 4.8.0
 */

import { useState, useMemo } from 'react'
import {
  X, GitBranch, GitCommit, GitMerge, GitPullRequest,
  Plus, Minus, Check, RefreshCw, Upload, Download,
  ChevronDown, ChevronRight, FileText, FilePlus, FileMinus,
  Edit3, Eye, RotateCcw, Copy,
} from 'lucide-react'
import { useI18n } from '../i18n/context'
import { useThemeStore, Z_INDEX, BLUR } from '../store/theme-store'

type GitTab = 'changes' | 'branches' | 'history' | 'stash'

interface GitFile {
  name: string
  status: 'modified' | 'added' | 'deleted' | 'renamed'
  staged: boolean
  diff?: string
}

interface GitCommitEntry {
  hash: string
  message: string
  author: string
  date: string
  branch: string
}

interface GitPanelProps {
  visible: boolean
  onClose: () => void
}

// Simulated Git state
const MOCK_BRANCHES = ['main', 'feature/ai-diagnostics', 'feature/perf-dashboard', 'hotfix/theme-fix', 'develop']

const MOCK_FILES: GitFile[] = [
  { name: 'src/app/components/IDEMode.tsx', status: 'modified', staged: false, diff: '@@ -340,6 +340,8 @@\n  const [aiAssistVisible, setAiAssistVisible] = useState(false);\n+ const [gitPanelVisible, setGitPanelVisible] = useState(false);\n+ const [perfDashVisible, setPerfDashVisible] = useState(false);' },
  { name: 'src/app/components/GitPanel.tsx', status: 'added', staged: true },
  { name: 'src/app/components/PerformanceDashboard.tsx', status: 'added', staged: true },
  { name: 'src/app/store/task-store.ts', status: 'added', staged: false },
  { name: 'src/app/i18n/translations.ts', status: 'modified', staged: false },
  { name: 'src/styles/old-theme.css', status: 'deleted', staged: false },
]

const MOCK_COMMITS: GitCommitEntry[] = [
  { hash: 'a3f7c2d', message: 'feat: add Git integration panel', author: 'YYC3 Team', date: '2026-03-14 10:30', branch: 'main' },
  { hash: 'b8e1f4a', message: 'feat: performance dashboard with recharts', author: 'YYC3 Team', date: '2026-03-14 09:15', branch: 'main' },
  { hash: 'c2d5a9e', message: 'feat: AI code diagnostics panel', author: 'YYC3 Team', date: '2026-03-13 22:45', branch: 'main' },
  { hash: 'd1a8b3c', message: 'fix: shortcut rebinding edge case', author: 'YYC3 Team', date: '2026-03-13 20:30', branch: 'main' },
  { hash: 'e4f2c7d', message: 'feat: global search overlay', author: 'YYC3 Team', date: '2026-03-13 18:00', branch: 'main' },
  { hash: 'f6b9d1e', message: 'feat: auto-save with editor prefs', author: 'YYC3 Team', date: '2026-03-13 15:20', branch: 'main' },
  { hash: 'g7c3e5f', message: 'refactor: dual-theme token system', author: 'YYC3 Team', date: '2026-03-13 12:00', branch: 'main' },
  { hash: 'h8d4f6a', message: 'feat: command palette with i18n', author: 'YYC3 Team', date: '2026-03-12 23:10', branch: 'main' },
]

export function GitPanel({ visible, onClose }: GitPanelProps) {
  const { t } = useI18n()
  const { tokens: tk, isCyberpunk } = useThemeStore()
  const [tab, setTab] = useState<GitTab>('changes')
  const [currentBranch, setCurrentBranch] = useState('main')
  const [files, setFiles] = useState<GitFile[]>(MOCK_FILES)
  const [commitMsg, setCommitMsg] = useState('')
  const [showDiff, setShowDiff] = useState<string | null>(null)
  const [branchDropdown, setBranchDropdown] = useState(false)

  const stagedFiles = useMemo(() => files.filter(f => f.staged), [files])
  const unstagedFiles = useMemo(() => files.filter(f => !f.staged), [files])

  const toggleStage = (name: string) => {
    setFiles(prev => prev.map(f => f.name === name ? { ...f, staged: !f.staged } : f))
  }

  const stageAll = () => setFiles(prev => prev.map(f => ({ ...f, staged: true })))
  const unstageAll = () => setFiles(prev => prev.map(f => ({ ...f, staged: false })))

  const statusIcon = (status: GitFile['status']) => {
    switch (status) {
      case 'modified': return <Edit3 size={10} color={tk.warning} />
      case 'added': return <FilePlus size={10} color={tk.success} />
      case 'deleted': return <FileMinus size={10} color={tk.error} />
      case 'renamed': return <RefreshCw size={10} color={tk.primary} />
    }
  }

  const statusColor = (status: GitFile['status']) => {
    switch (status) {
      case 'modified': return tk.warning
      case 'added': return tk.success
      case 'deleted': return tk.error
      case 'renamed': return tk.primary
    }
  }

  if (!visible) return null

  const tabs: { key: GitTab; label: string; count?: number }[] = [
    { key: 'changes', label: t('git', 'changes'), count: files.length },
    { key: 'branches', label: t('git', 'branches'), count: MOCK_BRANCHES.length },
    { key: 'history', label: t('git', 'history'), count: MOCK_COMMITS.length },
    { key: 'stash', label: t('git', 'stash') },
  ]

  return (
    <div
      className="fixed inset-0 flex items-stretch justify-end"
      style={{ zIndex: Z_INDEX.assistPanel, background: tk.overlayBg, backdropFilter: BLUR.sm }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col h-full"
        style={{
          width: 420, background: tk.panelBg, borderLeft: `1px solid ${tk.cardBorder}`,
          backdropFilter: BLUR.lg,
          animation: 'slideInRight 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: tk.border }}>
          <div className="flex items-center gap-2">
            <GitBranch size={16} color={tk.primary} />
            <span style={{ fontFamily: tk.fontDisplay, fontSize: '13px', color: tk.primary, letterSpacing: '1.5px' }}>
              {t('git', 'title')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Branch selector */}
            <div className="relative">
              <button
                onClick={() => setBranchDropdown(!branchDropdown)}
                className="flex items-center gap-1 px-2 py-1 rounded transition-all"
                style={{
                  fontFamily: tk.fontMono, fontSize: '10px', color: tk.success,
                  background: `${tk.success}15`, border: `1px solid ${tk.success}30`,
                }}
              >
                <GitBranch size={10} />
                {currentBranch}
                <ChevronDown size={10} />
              </button>
              {branchDropdown && (
                <div
                  className="absolute right-0 top-full mt-1 py-1 rounded-lg overflow-hidden"
                  style={{ width: 200, background: tk.panelBg, border: `1px solid ${tk.cardBorder}`, boxShadow: tk.shadowHover, zIndex: 10 }}
                >
                  {MOCK_BRANCHES.map(b => (
                    <button
                      key={b}
                      onClick={() => { setCurrentBranch(b); setBranchDropdown(false) }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-all hover:opacity-80"
                      style={{
                        fontFamily: tk.fontMono, fontSize: '10px',
                        color: b === currentBranch ? tk.primary : tk.foreground,
                        background: b === currentBranch ? tk.primaryGlow : 'transparent',
                      }}
                    >
                      <GitBranch size={10} />
                      {b}
                      {b === currentBranch && <Check size={10} color={tk.primary} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-1 rounded transition-all hover:opacity-70" style={{ color: tk.foregroundMuted }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0" style={{ borderColor: tk.border }}>
          {tabs.map(tabItem => (
            <button
              key={tabItem.key}
              onClick={() => setTab(tabItem.key)}
              className="flex-1 flex items-center justify-center gap-1 py-2 transition-all"
              style={{
                fontFamily: tk.fontMono, fontSize: '9px', letterSpacing: '0.5px',
                color: tab === tabItem.key ? tk.primary : tk.foregroundMuted,
                borderBottom: tab === tabItem.key ? `2px solid ${tk.primary}` : '2px solid transparent',
                background: tab === tabItem.key ? tk.primaryGlow : 'transparent',
              }}
            >
              {tabItem.label}
              {tabItem.count != null && (
                <span className="px-1 rounded" style={{ fontSize: '8px', background: `${tk.primary}20`, color: tk.primary }}>
                  {tabItem.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto neon-scrollbar">
          {tab === 'changes' && (
            <div className="p-3 space-y-3">
              {/* Staged */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontFamily: tk.fontMono, fontSize: '9px', color: tk.success, letterSpacing: '1px' }}>
                    {t('git', 'staged')} ({stagedFiles.length})
                  </span>
                  {stagedFiles.length > 0 && (
                    <button onClick={unstageAll} className="px-1.5 py-0.5 rounded transition-all hover:opacity-70"
                      style={{ fontFamily: tk.fontMono, fontSize: '8px', color: tk.foregroundMuted, border: `1px solid ${tk.borderDim}` }}>
                      {t('git', 'unstageAll')}
                    </button>
                  )}
                </div>
                {stagedFiles.map(f => (
                  <div key={f.name} className="flex items-center gap-2 px-2 py-1.5 rounded transition-all hover:opacity-80"
                    style={{ background: `${tk.success}08`, borderBottom: `1px solid ${tk.borderDim}` }}>
                    {statusIcon(f.status)}
                    <span className="flex-1 truncate" style={{ fontFamily: tk.fontMono, fontSize: '10px', color: tk.foreground }}>
                      {f.name.split('/').pop()}
                    </span>
                    <span style={{ fontFamily: tk.fontMono, fontSize: '8px', color: statusColor(f.status) }}>{f.status[0].toUpperCase()}</span>
                    <button onClick={() => toggleStage(f.name)} className="p-0.5 rounded hover:opacity-70" style={{ color: tk.foregroundMuted }}>
                      <Minus size={10} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Unstaged */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontFamily: tk.fontMono, fontSize: '9px', color: tk.warning, letterSpacing: '1px' }}>
                    {t('git', 'unstaged')} ({unstagedFiles.length})
                  </span>
                  {unstagedFiles.length > 0 && (
                    <button onClick={stageAll} className="px-1.5 py-0.5 rounded transition-all hover:opacity-70"
                      style={{ fontFamily: tk.fontMono, fontSize: '8px', color: tk.foregroundMuted, border: `1px solid ${tk.borderDim}` }}>
                      {t('git', 'stageAll')}
                    </button>
                  )}
                </div>
                {unstagedFiles.map(f => (
                  <div key={f.name}
                    className="flex items-center gap-2 px-2 py-1.5 rounded transition-all hover:opacity-80 cursor-pointer"
                    style={{ borderBottom: `1px solid ${tk.borderDim}` }}
                    onClick={() => f.diff && setShowDiff(showDiff === f.name ? null : f.name)}
                  >
                    {statusIcon(f.status)}
                    <span className="flex-1 truncate" style={{ fontFamily: tk.fontMono, fontSize: '10px', color: tk.foreground }}>
                      {f.name.split('/').pop()}
                    </span>
                    <span style={{ fontFamily: tk.fontMono, fontSize: '8px', color: statusColor(f.status) }}>{f.status[0].toUpperCase()}</span>
                    <button onClick={(e) => { e.stopPropagation(); toggleStage(f.name) }} className="p-0.5 rounded hover:opacity-70" style={{ color: tk.success }}>
                      <Plus size={10} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Diff view */}
              {showDiff && (() => {
                const file = files.find(f => f.name === showDiff)
                if (!file?.diff) return null
                return (
                  <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${tk.borderDim}` }}>
                    <div className="px-3 py-1.5" style={{ background: tk.primaryGlow }}>
                      <span style={{ fontFamily: tk.fontMono, fontSize: '9px', color: tk.primary }}>{file.name}</span>
                    </div>
                    <pre className="px-3 py-2 overflow-x-auto" style={{ fontFamily: tk.fontMono, fontSize: '10px', color: tk.foreground, background: tk.codeBg, margin: 0 }}>
                      {file.diff.split('\n').map((line, i) => (
                        <div key={i} style={{
                          color: line.startsWith('+') ? tk.success : line.startsWith('-') ? tk.error : line.startsWith('@') ? tk.primary : tk.foregroundMuted,
                          background: line.startsWith('+') ? `${tk.success}10` : line.startsWith('-') ? `${tk.error}10` : 'transparent',
                        }}>
                          {line}
                        </div>
                      ))}
                    </pre>
                  </div>
                )
              })()}

              {/* Commit message */}
              <div className="space-y-2">
                <textarea
                  value={commitMsg}
                  onChange={e => setCommitMsg(e.target.value)}
                  placeholder={t('git', 'commitPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg resize-none outline-none"
                  style={{
                    fontFamily: tk.fontMono, fontSize: '11px', color: tk.foreground,
                    background: tk.inputBg, border: `1px solid ${tk.inputBorder}`,
                  }}
                />
                <button
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-all hover:opacity-90"
                  style={{
                    fontFamily: tk.fontMono, fontSize: '11px', color: tk.background,
                    background: tk.primary, letterSpacing: '1px',
                    opacity: stagedFiles.length === 0 || !commitMsg.trim() ? 0.4 : 1,
                    boxShadow: isCyberpunk ? `0 0 12px ${tk.primaryGlow}` : 'none',
                  }}
                  disabled={stagedFiles.length === 0 || !commitMsg.trim()}
                >
                  <GitCommit size={12} />
                  {t('git', 'commit')} ({stagedFiles.length})
                </button>
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all hover:opacity-80"
                    style={{ fontFamily: tk.fontMono, fontSize: '9px', color: tk.primary, border: `1px solid ${tk.border}` }}>
                    <Upload size={10} /> {t('git', 'push')}
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all hover:opacity-80"
                    style={{ fontFamily: tk.fontMono, fontSize: '9px', color: tk.primary, border: `1px solid ${tk.border}` }}>
                    <Download size={10} /> {t('git', 'pull')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'branches' && (
            <div className="p-3 space-y-1">
              {MOCK_BRANCHES.map(b => (
                <div
                  key={b}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all cursor-pointer hover:opacity-80"
                  style={{
                    background: b === currentBranch ? tk.primaryGlow : 'transparent',
                    border: `1px solid ${b === currentBranch ? tk.border : 'transparent'}`,
                  }}
                  onClick={() => setCurrentBranch(b)}
                >
                  <GitBranch size={12} color={b === currentBranch ? tk.primary : tk.foregroundMuted} />
                  <span className="flex-1" style={{ fontFamily: tk.fontMono, fontSize: '11px', color: b === currentBranch ? tk.primary : tk.foreground }}>
                    {b}
                  </span>
                  {b === currentBranch && (
                    <span className="px-1.5 py-0.5 rounded" style={{ fontFamily: tk.fontMono, fontSize: '8px', color: tk.success, background: `${tk.success}15` }}>
                      {t('git', 'current')}
                    </span>
                  )}
                </div>
              ))}
              <button className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 rounded-lg transition-all hover:opacity-80"
                style={{ fontFamily: tk.fontMono, fontSize: '10px', color: tk.primary, border: `1px dashed ${tk.border}` }}>
                <Plus size={12} /> {t('git', 'newBranch')}
              </button>
            </div>
          )}

          {tab === 'history' && (
            <div className="p-3 space-y-1">
              {MOCK_COMMITS.map((c, i) => (
                <div key={c.hash} className="flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all hover:opacity-80"
                  style={{ background: i === 0 ? tk.primaryGlow : 'transparent', borderBottom: `1px solid ${tk.borderDim}` }}>
                  <div className="flex flex-col items-center shrink-0" style={{ paddingTop: 2 }}>
                    <GitCommit size={12} color={i === 0 ? tk.primary : tk.foregroundMuted} />
                    {i < MOCK_COMMITS.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: tk.borderDim, minHeight: 16 }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontFamily: tk.fontBody, fontSize: '11px', color: tk.foreground }}>{c.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span style={{ fontFamily: tk.fontMono, fontSize: '9px', color: tk.primary }}>{c.hash}</span>
                      <span style={{ fontFamily: tk.fontMono, fontSize: '8px', color: tk.foregroundMuted }}>{c.date}</span>
                    </div>
                  </div>
                  <button className="p-1 rounded hover:opacity-70 shrink-0" style={{ color: tk.foregroundMuted }}>
                    <Copy size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'stash' && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <RotateCcw size={24} color={tk.foregroundMuted} style={{ opacity: 0.3 }} />
              <p style={{ fontFamily: tk.fontMono, fontSize: '11px', color: tk.foregroundMuted }}>{t('git', 'noStash')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
