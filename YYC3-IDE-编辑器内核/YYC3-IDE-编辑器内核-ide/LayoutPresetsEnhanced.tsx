/**
 * @file: LayoutPresetsEnhanced.tsx
 * @description: 增强版布局预设管理，支持自定义预设添加、宽度比例编辑、内置预设模板
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-04-05
 * @license: MIT
 */

import { useState, useCallback, useMemo } from 'react'
import {
  Save,
  FolderOpen,
  Trash2,
  ChevronDown,
  Layout,
  Columns3,
  Rows3,
  Monitor,
  Code2,
  Bot,
  X,
  Check,
  Pencil,
  Plus,
  Settings2,
  GripVertical,
  Terminal,
  Shield,
  TestTube,
  FileSearch,
  Zap,
} from 'lucide-react'
import {
  usePanelManager,
  type LayoutNode,
  LAYOUT_PRESETS,
} from './PanelManager'
import { loadJSON, saveJSON } from './constants/storage-keys'

const SK_SAVED_PRESETS = 'yyc3_layout_presets_v2'

interface SavedPreset {
  id: string
  name: string
  layout: LayoutNode
  columnRatios?: number[]
  createdAt: number
}

function loadSavedPresets(): SavedPreset[] {
  return loadJSON<SavedPreset[]>(SK_SAVED_PRESETS, [])
}

function saveSavedPresets(presets: SavedPreset[]): void {
  saveJSON(SK_SAVED_PRESETS, presets)
}

interface BuiltInPreset {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  layout: LayoutNode
  columnRatios: number[]
}

const STANDARD_THREE_COLUMN: LayoutNode = {
  id: 'root',
  type: 'split',
  direction: 'horizontal',
  children: [
    { id: 'left', type: 'leaf', panelId: 'ai', size: 33 },
    { id: 'center', type: 'leaf', panelId: 'files', size: 34 },
    { id: 'right', type: 'leaf', panelId: 'code', size: 33 },
  ],
}

const AI_WORKSPACE: LayoutNode = {
  id: 'root',
  type: 'split',
  direction: 'horizontal',
  children: [
    { id: 'left', type: 'leaf', panelId: 'ai', size: 40 },
    {
      id: 'right-split',
      type: 'split',
      direction: 'vertical',
      size: 60,
      children: [
        { id: 'top-right', type: 'leaf', panelId: 'code', size: 60 },
        { id: 'bottom-right', type: 'leaf', panelId: 'preview', size: 40 },
      ],
    },
  ],
}

const FOUR_PANEL: LayoutNode = {
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
        { id: 'br', type: 'leaf', panelId: 'preview', size: 50 },
      ],
    },
  ],
}

const QUALITY_REVIEW: LayoutNode = {
  id: 'root',
  type: 'split',
  direction: 'horizontal',
  children: [
    { id: 'left', type: 'leaf', panelId: 'quality', size: 30 },
    {
      id: 'right-col',
      type: 'split',
      direction: 'vertical',
      size: 70,
      children: [
        { id: 'tr', type: 'leaf', panelId: 'code', size: 50 },
        {
          id: 'br-split',
          type: 'split',
          direction: 'horizontal',
          size: 50,
          children: [
            { id: 'br-l', type: 'leaf', panelId: 'diagnostics', size: 33 },
            { id: 'br-m', type: 'leaf', panelId: 'security', size: 33 },
            { id: 'br-r', type: 'leaf', panelId: 'test-gen', size: 34 },
          ],
        },
      ],
    },
  ],
}

const BUILTIN_PRESETS: BuiltInPreset[] = [
  {
    id: 'standard-3col',
    name: '标准三栏',
    icon: Columns3,
    description: 'AI对话 | 文件管理 | 代码编辑',
    layout: STANDARD_THREE_COLUMN,
    columnRatios: [33, 34, 33],
  },
  {
    id: 'ai-workspace',
    name: 'AI 工作台',
    icon: Bot,
    description: 'AI对话 + 代码/预览上下分栏',
    layout: AI_WORKSPACE,
    columnRatios: [40, 60],
  },
  {
    id: 'four-panel',
    name: '四分屏',
    icon: Layout,
    description: 'AI | 终端 | 代码 | 预览',
    layout: FOUR_PANEL,
    columnRatios: [50, 50],
  },
  {
    id: 'quality-review',
    name: '质量审查',
    icon: Shield,
    description: '代码质量 + 诊断 + 安全 + 测试',
    layout: QUALITY_REVIEW,
    columnRatios: [30, 70],
  },
]

interface ColumnRatioEditorProps {
  ratios: number[]
  onChange: (ratios: number[]) => void
}

function ColumnRatioEditor({ ratios, onChange }: ColumnRatioEditorProps) {
  const total = ratios.reduce((a, b) => a + b, 0)

  const handleRatioChange = (index: number, value: number) => {
    const newRatios = [...ratios]
    newRatios[index] = Math.max(10, Math.min(80, value))
    const remaining = 100 - newRatios[index]
    const othersTotal = ratios.reduce((a, b, i) => (i === index ? 0 : a + b), 0)
    
    if (othersTotal > 0) {
      for (let i = 0; i < newRatios.length; i++) {
        if (i !== index) {
          newRatios[i] = Math.round((ratios[i] / othersTotal) * remaining)
        }
      }
    }
    
    onChange(newRatios)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-[0.52rem] text-[var(--ide-text-dim)]">
        <Settings2 className="w-3 h-3" />
        栏宽比例
      </div>
      <div className="flex items-center gap-1">
        {ratios.map((ratio, index) => (
          <div key={index} className="flex items-center gap-0.5 flex-1">
            <input
              type="number"
              min={10}
              max={80}
              value={ratio}
              onChange={(e) => handleRatioChange(index, parseInt(e.target.value) || 10)}
              className="w-10 bg-[var(--ide-bg-inset)] border border-[var(--ide-border-dim)] rounded px-1 py-0.5 text-[0.6rem] text-center text-[var(--ide-text-primary)] outline-none focus:border-[var(--ide-accent)]"
            />
            {index < ratios.length - 1 && (
              <span className="text-[0.5rem] text-[var(--ide-text-dim)]">:</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 h-2 rounded overflow-hidden bg-[var(--ide-bg-inset)]">
        {ratios.map((ratio, index) => (
          <div
            key={index}
            className="h-full transition-all"
            style={{
              width: `${ratio}%`,
              backgroundColor: `hsl(${200 + index * 30}, 70%, 50%)`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function LayoutPresetsEnhanced() {
  const ctx = usePanelManager()
  const [menuOpen, setMenuOpen] = useState(false)
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(loadSavedPresets)
  const [saveMode, setSaveMode] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [editMode, setEditMode] = useState<string | null>(null)
  const [editRatios, setEditRatios] = useState<number[]>([])

  const currentColumnCount = useMemo(() => {
    if (!ctx?.layout.children) return 0
    return ctx.layout.children.length
  }, [ctx?.layout.children])

  const currentRatios = useMemo(() => {
    if (!ctx?.layout.children) return []
    return ctx.layout.children.map((c) => c.size || 100 / ctx.layout.children!.length)
  }, [ctx?.layout])

  if (!ctx) return null

  const handleLoadBuiltin = (preset: BuiltInPreset) => {
    ctx.setLayout(JSON.parse(JSON.stringify(preset.layout)))
    setMenuOpen(false)
  }

  const handleLoadSaved = (preset: SavedPreset) => {
    ctx.setLayout(JSON.parse(JSON.stringify(preset.layout)))
    setMenuOpen(false)
  }

  const handleSave = () => {
    if (!saveName.trim()) return
    const newPreset: SavedPreset = {
      id: `preset_${Date.now()}`,
      name: saveName.trim(),
      layout: JSON.parse(JSON.stringify(ctx.layout)),
      columnRatios: currentRatios,
      createdAt: Date.now(),
    }
    const next = [...savedPresets, newPreset]
    setSavedPresets(next)
    saveSavedPresets(next)
    setSaveMode(false)
    setSaveName('')
  }

  const handleDelete = (id: string) => {
    const next = savedPresets.filter((p) => p.id !== id)
    setSavedPresets(next)
    saveSavedPresets(next)
  }

  const handleApplyRatios = (ratios: number[]) => {
    const newLayout = JSON.parse(JSON.stringify(ctx.layout))
    if (newLayout.children) {
      newLayout.children.forEach((child: LayoutNode, index: number) => {
        child.size = ratios[index] || 100 / ratios.length
      })
      ctx.setLayout(newLayout)
    }
  }

  const startEditRatios = (presetId: string, ratios: number[]) => {
    setEditMode(presetId)
    setEditRatios([...ratios])
  }

  const saveEditedRatios = (presetId: string) => {
    if (presetId.startsWith('preset_')) {
      const next = savedPresets.map((p) =>
        p.id === presetId ? { ...p, columnRatios: editRatios } : p
      )
      setSavedPresets(next)
      saveSavedPresets(next)
    }
    setEditMode(null)
    setEditRatios([])
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.62rem] text-slate-600 hover:text-sky-400 hover:bg-white/5 transition-colors"
        title="布局预设"
      >
        <Layout className="w-3 h-3" />
        <span>布局</span>
        <ChevronDown className="w-2.5 h-2.5" />
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setMenuOpen(false)
              setSaveMode(false)
              setEditMode(null)
            }}
          />

          <div className="absolute right-0 top-full mt-1 bg-[var(--ide-bg-elevated)] border border-[var(--ide-border)] rounded-lg shadow-xl z-50 w-[280px] overflow-hidden">
            <div className="px-3 py-1.5 border-b border-[var(--ide-border-faint)] flex items-center justify-between">
              <span className="text-[0.62rem] text-[var(--ide-text-muted)]">
                布局预设
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                className="w-4 h-4 rounded flex items-center justify-center hover:bg-white/5"
              >
                <X className="w-3 h-3 text-[var(--ide-text-dim)]" />
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              <div className="px-2 py-1 text-[0.52rem] text-[var(--ide-text-dim)]">
                内置预设
              </div>
              {BUILTIN_PRESETS.map((preset) => {
                const Icon = preset.icon
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleLoadBuiltin(preset)}
                    className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors"
                  >
                    <Icon className="w-4 h-4 text-sky-400/60 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.65rem] text-[var(--ide-text-secondary)]">
                        {preset.name}
                      </div>
                      <div className="text-[0.52rem] text-[var(--ide-text-dim)] truncate">
                        {preset.description}
                      </div>
                      <div className="flex items-center gap-0.5 mt-1">
                        {preset.columnRatios.map((r, i) => (
                          <div
                            key={i}
                            className="h-1 rounded-sm"
                            style={{
                              width: `${r * 0.8}px`,
                              backgroundColor: `hsl(${200 + i * 30}, 60%, 50%)`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </button>
                )
              })}

              {savedPresets.length > 0 && (
                <>
                  <div className="px-2 py-1 text-[0.52rem] text-[var(--ide-text-dim)] border-t border-[var(--ide-border-faint)] mt-1 pt-1.5">
                    我的预设 ({savedPresets.length})
                  </div>
                  {savedPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="px-3 py-2 hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLoadSaved(preset)}
                          className="flex-1 flex items-center gap-2 text-left"
                        >
                          <FolderOpen className="w-4 h-4 text-emerald-400/60 flex-shrink-0" />
                          <span className="text-[0.65rem] text-[var(--ide-text-secondary)] truncate">
                            {preset.name}
                          </span>
                        </button>
                        <button
                          onClick={() => startEditRatios(preset.id, preset.columnRatios || [])}
                          className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/5 transition-colors"
                          title="编辑比例"
                        >
                          <Pencil className="w-3 h-3 text-[var(--ide-text-dim)]" />
                        </button>
                        <button
                          onClick={() => handleDelete(preset.id)}
                          className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/10 transition-colors"
                          title="删除预设"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                      {editMode === preset.id && preset.columnRatios && (
                        <div className="mt-2 pl-6">
                          <ColumnRatioEditor
                            ratios={editRatios}
                            onChange={setEditRatios}
                          />
                          <div className="flex items-center gap-1 mt-2">
                            <button
                              onClick={() => {
                                handleApplyRatios(editRatios)
                                saveEditedRatios(preset.id)
                              }}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded bg-sky-500/10 text-sky-400 text-[0.55rem] hover:bg-sky-500/20 transition-colors"
                            >
                              <Check className="w-3 h-3" />
                              应用
                            </button>
                            <button
                              onClick={() => setEditMode(null)}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded bg-white/5 text-[var(--ide-text-dim)] text-[0.55rem] hover:bg-white/10 transition-colors"
                            >
                              <X className="w-3 h-3" />
                              取消
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="border-t border-[var(--ide-border-faint)]">
              {saveMode ? (
                <div className="p-3 space-y-2">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    placeholder="预设名称..."
                    autoFocus
                    className="w-full bg-[var(--ide-bg-inset)] border border-[var(--ide-border-dim)] rounded px-2 py-1.5 text-[0.62rem] text-[var(--ide-text-primary)] placeholder:text-[var(--ide-text-dim)] outline-none focus:border-[var(--ide-accent)]"
                  />
                  <ColumnRatioEditor
                    ratios={currentRatios}
                    onChange={(ratios) => handleApplyRatios(ratios)}
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleSave}
                      disabled={!saveName.trim()}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-sky-500/10 text-sky-400 text-[0.6rem] hover:bg-sky-500/20 disabled:opacity-30 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setSaveMode(false)
                        setSaveName('')
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-white/5 text-[var(--ide-text-dim)] text-[0.6rem] hover:bg-white/10 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setSaveMode(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[0.65rem] text-sky-400 hover:bg-sky-500/5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加自定义预设
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
