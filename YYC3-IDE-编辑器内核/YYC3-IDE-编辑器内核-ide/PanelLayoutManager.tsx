/**
 * @file: PanelLayoutManager.tsx
 * @description: 面板布局管理器 - 有寓意、有预设、有自组
 *              支持分栏、分屏、分组、一键恢复
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.1.0
 * @created: 2026-04-05
 * @license: MIT
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  Layout,
  Columns2,
  Columns3,
  Columns4,
  Grid2X2,
  Grid3X3,
  RotateCcw,
  Check,
  ChevronDown,
  Monitor,
  Code2,
  Bot,
  Terminal,
  FileSearch,
  Shield,
  TestTube,
  Zap,
  FolderOpen,
  Save,
  X,
  MessageSquare,
  Users,
  Sparkles,
  Settings,
} from 'lucide-react'
import {
  usePanelManager,
  type LayoutNode,
} from './PanelManager'
import { loadJSON, saveJSON } from './constants/storage-keys'
import type { PanelId } from './types/index'

const SK_PANEL_PRESETS = 'yyc3_panel_presets_v3'

type ColumnCount = 1 | 2 | 3 | 4
type ScreenCount = 4 | 6 | 8

interface PanelGroup {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  panels: PanelId[]
}

interface LayoutPreset {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  type: 'column' | 'screen'
  layout: LayoutNode
  semantic: string
}

const PANEL_GROUPS: PanelGroup[] = [
  {
    id: 'ai',
    name: 'AI 智能组',
    icon: Bot,
    description: 'AI对话、Agent编排、智能体',
    panels: ['ai', 'agents', 'market', 'multi-agent'],
  },
  {
    id: 'code',
    name: '代码开发组',
    icon: Code2,
    description: '代码编辑、文件管理、预览',
    panels: ['code', 'files', 'preview', 'document-editor'],
  },
  {
    id: 'terminal',
    name: '终端工具组',
    icon: Terminal,
    description: '终端、Git、运维、工作流',
    panels: ['terminal', 'git', 'ops', 'workflow'],
  },
  {
    id: 'quality',
    name: '质量审查组',
    icon: Shield,
    description: '代码质量、诊断、安全、测试',
    panels: ['quality', 'diagnostics', 'security', 'test-gen', 'performance'],
  },
  {
    id: 'data',
    name: '数据管理组',
    icon: FolderOpen,
    description: '知识库、RAG、协作、任务',
    panels: ['knowledge', 'rag', 'collab', 'taskboard'],
  },
]

const SEMANTIC_PRESETS: LayoutPreset[] = [
  {
    id: 'home-chat',
    name: '首页会话',
    description: '智能进入的自有会话页面',
    icon: MessageSquare,
    type: 'column',
    semantic: '一分栏：首页交互逻辑语义智能进入',
    layout: {
      id: 'root',
      type: 'leaf',
      panelId: 'ai',
    },
  },
  {
    id: 'demand-comm',
    name: '需求沟通',
    description: '需求分析、沟通交互',
    icon: MessageSquare,
    type: 'column',
    semantic: '二分栏：需求沟通交互必带',
    layout: {
      id: 'root',
      type: 'split',
      direction: 'horizontal',
      children: [
        { id: 'left', type: 'leaf', panelId: 'ai', size: 50 },
        { id: 'right', type: 'leaf', panelId: 'code', size: 50 },
      ],
    },
  },
  {
    id: 'demand-screen',
    name: '需求四分屏',
    description: '需求分析四分屏布局',
    icon: Grid2X2,
    type: 'screen',
    semantic: '四分屏：需求沟通交互必带',
    layout: {
      id: 'root',
      type: 'split',
      direction: 'horizontal',
      children: [
        {
          id: 'left-col',
          type: 'split',
          direction: 'vertical',
          size: 50,
          children: [
            { id: 'tl', type: 'leaf', panelId: 'ai', size: 50 },
            { id: 'bl', type: 'leaf', panelId: 'terminal', size: 50 },
          ],
        },
        {
          id: 'right-col',
          type: 'split',
          direction: 'vertical',
          size: 50,
          children: [
            { id: 'tr', type: 'leaf', panelId: 'code', size: 50 },
            { id: 'br', type: 'leaf', panelId: 'files', size: 50 },
          ],
        },
      ],
    },
  },
  {
    id: 'smart-dev',
    name: '智能开发',
    description: '智能编程标准布局',
    icon: Sparkles,
    type: 'column',
    semantic: '三分栏：智能编程，拒绝随机预分配',
    layout: {
      id: 'root',
      type: 'split',
      direction: 'horizontal',
      children: [
        { id: 'left', type: 'leaf', panelId: 'ai', size: 30 },
        { id: 'center', type: 'leaf', panelId: 'code', size: 45 },
        { id: 'right', type: 'leaf', panelId: 'terminal', size: 25 },
      ],
    },
  },
  {
    id: 'smart-screen',
    name: '智能六分屏',
    description: '智能编程六分屏',
    icon: Grid3X3,
    type: 'screen',
    semantic: '六分屏：智能编程多任务并行',
    layout: {
      id: 'root',
      type: 'split',
      direction: 'horizontal',
      children: [
        {
          id: 'col-1',
          type: 'split',
          direction: 'vertical',
          size: 33,
          children: [
            { id: 'c1-1', type: 'leaf', panelId: 'ai', size: 50 },
            { id: 'c1-2', type: 'leaf', panelId: 'terminal', size: 50 },
          ],
        },
        {
          id: 'col-2',
          type: 'split',
          direction: 'vertical',
          size: 34,
          children: [
            { id: 'c2-1', type: 'leaf', panelId: 'code', size: 50 },
            { id: 'c2-2', type: 'leaf', panelId: 'preview', size: 50 },
          ],
        },
        {
          id: 'col-3',
          type: 'split',
          direction: 'vertical',
          size: 33,
          children: [
            { id: 'c3-1', type: 'leaf', panelId: 'files', size: 50 },
            { id: 'c3-2', type: 'leaf', panelId: 'git', size: 50 },
          ],
        },
      ],
    },
  },
  {
    id: 'collab-dev',
    name: '协同开发',
    description: '团队协作开发布局',
    icon: Users,
    type: 'column',
    semantic: '四分栏：协同开发多面板',
    layout: {
      id: 'root',
      type: 'split',
      direction: 'horizontal',
      children: [
        { id: 'col-1', type: 'leaf', panelId: 'ai', size: 25 },
        { id: 'col-2', type: 'leaf', panelId: 'code', size: 30 },
        { id: 'col-3', type: 'leaf', panelId: 'terminal', size: 25 },
        { id: 'col-4', type: 'leaf', panelId: 'collab', size: 20 },
      ],
    },
  },
  {
    id: 'collab-screen',
    name: '协同八分屏',
    description: '团队协作八分屏',
    icon: Layout,
    type: 'screen',
    semantic: '八分屏：协同开发全功能',
    layout: {
      id: 'root',
      type: 'split',
      direction: 'horizontal',
      children: [
        {
          id: 'col-1',
          type: 'split',
          direction: 'vertical',
          size: 25,
          children: [
            { id: 'c1-1', type: 'leaf', panelId: 'ai', size: 50 },
            { id: 'c1-2', type: 'leaf', panelId: 'terminal', size: 50 },
          ],
        },
        {
          id: 'col-2',
          type: 'split',
          direction: 'vertical',
          size: 25,
          children: [
            { id: 'c2-1', type: 'leaf', panelId: 'code', size: 50 },
            { id: 'c2-2', type: 'leaf', panelId: 'preview', size: 50 },
          ],
        },
        {
          id: 'col-3',
          type: 'split',
          direction: 'vertical',
          size: 25,
          children: [
            { id: 'c3-1', type: 'leaf', panelId: 'files', size: 50 },
            { id: 'c3-2', type: 'leaf', panelId: 'git', size: 50 },
          ],
        },
        {
          id: 'col-4',
          type: 'split',
          direction: 'vertical',
          size: 25,
          children: [
            { id: 'c4-1', type: 'leaf', panelId: 'collab', size: 50 },
            { id: 'c4-2', type: 'leaf', panelId: 'quality', size: 50 },
          ],
        },
      ],
    },
  },
]

const DEFAULT_LAYOUT: LayoutNode = {
  id: 'root',
  type: 'split',
  direction: 'horizontal',
  children: [
    { id: 'left', type: 'leaf', panelId: 'ai', size: 30 },
    { id: 'center', type: 'leaf', panelId: 'code', size: 45 },
    { id: 'right', type: 'leaf', panelId: 'terminal', size: 25 },
  ],
}

function loadPresets(): LayoutPreset[] {
  return loadJSON<LayoutPreset[]>(SK_PANEL_PRESETS, [])
}

function savePresets(presets: LayoutPreset[]): void {
  saveJSON(SK_PANEL_PRESETS, presets)
}

export default function PanelLayoutManager() {
  const ctx = usePanelManager()
  const [menuOpen, setMenuOpen] = useState(false)
  const [savedPresets, setSavedPresets] = useState<LayoutPreset[]>(loadPresets)
  const [saveMode, setSaveMode] = useState(false)
  const [saveName, setSaveName] = useState('')

  const handleApplyPreset = useCallback((preset: LayoutPreset) => {
    if (!ctx) return
    ctx.setLayout(JSON.parse(JSON.stringify(preset.layout)))
    setMenuOpen(false)
  }, [ctx])

  const handleReset = useCallback(() => {
    if (!ctx) return
    ctx.setLayout(JSON.parse(JSON.stringify(DEFAULT_LAYOUT)))
    setMenuOpen(false)
  }, [ctx])

  const handleSavePreset = useCallback(() => {
    if (!saveName.trim() || !ctx) return
    const newPreset: LayoutPreset = {
      id: `preset_${Date.now()}`,
      name: saveName.trim(),
      description: '自定义预设',
      icon: Save,
      type: 'column',
      layout: JSON.parse(JSON.stringify(ctx.layout)),
      semantic: '自定义布局',
    }
    const next = [...savedPresets, newPreset]
    setSavedPresets(next)
    savePresets(next)
    setSaveMode(false)
    setSaveName('')
  }, [saveName, ctx, savedPresets])

  const handleDeletePreset = useCallback((id: string) => {
    const next = savedPresets.filter(p => p.id !== id)
    setSavedPresets(next)
    savePresets(next)
  }, [savedPresets])

  if (!ctx) return null

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.62rem] text-slate-600 hover:text-sky-400 hover:bg-white/5 transition-colors"
        title="面板布局"
      >
        <Layout className="w-3 h-3" />
        <span>布局</span>
        <ChevronDown className="w-2.5 h-2.5" />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />

          <div className="absolute right-0 top-full mt-1 bg-[var(--ide-bg-elevated)] border border-[var(--ide-border)] rounded-lg shadow-xl z-50 w-[360px] overflow-hidden">
            <div className="px-3 py-1.5 border-b border-[var(--ide-border-faint)] flex items-center justify-between">
              <span className="text-[0.62rem] text-[var(--ide-text-muted)]">Family AI 布局管理</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="w-4 h-4 rounded flex items-center justify-center hover:bg-white/5"
              >
                <X className="w-3 h-3 text-[var(--ide-text-dim)]" />
              </button>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              <div className="p-2 space-y-2">
                <div className="text-[0.52rem] text-[var(--ide-text-dim)] px-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  智能预设 · 有寓意有预设
                </div>

                {SEMANTIC_PRESETS.map(preset => {
                  const Icon = preset.icon
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className="w-full flex items-start gap-2 p-2 rounded border border-[var(--ide-border-dim)] hover:border-sky-500/50 hover:bg-sky-500/5 transition-colors text-left"
                    >
                      <Icon className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[0.6rem] text-[var(--ide-text-primary)] font-medium">{preset.name}</span>
                          <span className="text-[0.5rem] text-[var(--ide-text-dim)] px-1 py-0.5 rounded bg-[var(--ide-bg-inset)]">
                            {preset.type === 'column' ? '分栏' : '分屏'}
                          </span>
                        </div>
                        <div className="text-[0.52rem] text-[var(--ide-text-dim)] mt-0.5">{preset.description}</div>
                        <div className="text-[0.5rem] text-amber-400/70 mt-0.5 italic">{preset.semantic}</div>
                      </div>
                    </button>
                  )
                })}

                <div className="text-[0.52rem] text-[var(--ide-text-dim)] px-1 pt-2 border-t border-[var(--ide-border-faint)] flex items-center gap-1">
                  <FolderOpen className="w-3 h-3 text-emerald-400" />
                  面板分组 · 有自组
                </div>

                <div className="grid grid-cols-2 gap-1">
                  {PANEL_GROUPS.map(group => {
                    const Icon = group.icon
                    return (
                      <div
                        key={group.id}
                        className="p-1.5 rounded border border-[var(--ide-border-dim)] bg-[var(--ide-bg)]"
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <Icon className="w-3 h-3 text-amber-400" />
                          <span className="text-[0.55rem] text-[var(--ide-text-secondary)]">{group.name}</span>
                        </div>
                        <div className="text-[0.5rem] text-[var(--ide-text-dim)]">{group.description}</div>
                      </div>
                    )
                  })}
                </div>

                {savedPresets.length > 0 && (
                  <>
                    <div className="text-[0.52rem] text-[var(--ide-text-dim)] px-1 pt-2 border-t border-[var(--ide-border-faint)]">
                      我的预设 ({savedPresets.length})
                    </div>
                    <div className="space-y-1">
                      {savedPresets.map(preset => (
                        <div
                          key={preset.id}
                          className="flex items-center gap-1 p-1.5 rounded border border-[var(--ide-border-dim)] hover:bg-white/[0.02] transition-colors"
                        >
                          <button
                            onClick={() => handleApplyPreset(preset)}
                            className="flex-1 flex items-center gap-1.5 text-left"
                          >
                            <FolderOpen className="w-3 h-3 text-emerald-400" />
                            <span className="text-[0.55rem] text-[var(--ide-text-secondary)]">{preset.name}</span>
                          </button>
                          <button
                            onClick={() => handleDeletePreset(preset.id)}
                            className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/10 transition-colors"
                          >
                            <X className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-[var(--ide-border-faint)] p-2 space-y-1.5">
              {saveMode ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
                    placeholder="预设名称..."
                    autoFocus
                    className="w-full bg-[var(--ide-bg-inset)] border border-[var(--ide-border-dim)] rounded px-2 py-1 text-[0.6rem] text-[var(--ide-text-primary)] placeholder:text-[var(--ide-text-dim)] outline-none focus:border-[var(--ide-accent)]"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleSavePreset}
                      disabled={!saveName.trim()}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded bg-sky-500/10 text-sky-400 text-[0.55rem] hover:bg-sky-500/20 disabled:opacity-30 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      保存
                    </button>
                    <button
                      onClick={() => { setSaveMode(false); setSaveName('') }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded bg-white/5 text-[var(--ide-text-dim)] text-[0.55rem] hover:bg-white/10 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setSaveMode(true)}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-sky-500/5 text-sky-400 text-[0.55rem] hover:bg-sky-500/10 transition-colors"
                  >
                    <Save className="w-3 h-3" />
                    保存当前布局
                  </button>
                  <button
                    onClick={handleReset}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-amber-500/5 text-amber-400 text-[0.55rem] hover:bg-amber-500/10 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    一键恢复（智能开发三分栏）
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
