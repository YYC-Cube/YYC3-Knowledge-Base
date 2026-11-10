/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — TODO(P0-1): React 19 + lucide-react 类型兼容性问题，待上游修复
/**
 * @file ProviderCard.tsx
 * @description AI 模型服务商卡片组件 — 支持 API Key 配置、模型管理、连通性检测
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 */

import { useState } from 'react'
import {
  CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronRight,
  Edit3, Check, ExternalLink, Eye, EyeOff, ArrowRight,
  Zap, MinusCircle, PlusCircle, Activity, Trash2, X,
} from 'lucide-react'
import type { ProviderDef, ModelDef } from '../constants/providers'
import type { DiagnosticResult } from './types'
import { CopyButton } from './CopyButton'

export function ProviderCard({
  provider,
  apiKey,
  customUrl,
  onApiKeyChange,
  onUrlChange,
  onAddModel,
  onRemoveModel,
  onTestConnection,
  onSelectModel,
  activeModelKey,
  diagnostics,
  expanded,
  onToggle,
  onRemoveProvider,
  isCustom,
  importedModels,
}: {
  provider: ProviderDef
  apiKey: string
  customUrl: string
  onApiKeyChange: (key: string) => void
  onUrlChange: (url: string) => void
  onAddModel: (model: ModelDef) => void
  onRemoveModel: (modelId: string) => void
  onTestConnection: (modelId: string) => void
  onSelectModel: (modelId: string) => void
  activeModelKey: string | null
  diagnostics: Record<string, DiagnosticResult>
  expanded: boolean
  onToggle: () => void
  onRemoveProvider?: () => void
  isCustom?: boolean
  importedModels?: Array<{ id: string; name: string; endpoint: string; isActive: boolean }>
}) {
  const [showKey, setShowKey] = useState(false)
  const [addingModel, setAddingModel] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [newModelId, setNewModelId] = useState('')
  const [editingUrl, setEditingUrl] = useState(false)
  const [urlDraft, setUrlDraft] = useState(customUrl || provider.baseURL)
  const Icon = provider.icon

  const activeUrl = customUrl || provider.baseURL

  const hasAnyOnline = Object.values(diagnostics).some(d => d.status === 'success')
  const hasAnyError = Object.values(diagnostics).some(d => d.status === 'error')
  const isTesting = Object.values(diagnostics).some(d => d.status === 'testing')
  const hasActiveModel = activeModelKey ? activeModelKey.startsWith(`${provider.id}:`) : false

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      hasActiveModel
        ? 'border-indigo-500/25 bg-indigo-500/[0.02]'
        : 'border-white/[0.06] bg-white/[0.02]'
    }`}
      style={{
        boxShadow: hasActiveModel
          ? '0 0 20px -6px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.04)'
          : 'inset 0 1px 0 rgba(255,255,255,0.02)',
      }}
    >
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-all">
        <div className={`w-8 h-8 rounded-lg ${provider.colorBg} border ${provider.colorBorder} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${provider.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-white/85">{provider.name}</span>
            {provider.openaiCompatible && (
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400/50 border border-indigo-500/10">OpenAI 兼容</span>
            )}
          </div>
          <div className="text-[10px] text-white/25 mt-0.5">{provider.description}</div>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveModel && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400/70 border border-indigo-500/15 shrink-0">使用中</span>
          )}
          {apiKey && <div className="w-2 h-2 rounded-full bg-emerald-400/60" title="API Key 已配置" />}
          {hasAnyOnline && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/60" />}
          {hasAnyError && !hasAnyOnline && <AlertCircle className="w-3.5 h-3.5 text-red-400/60" />}
          {isTesting && <Loader2 className="w-3.5 h-3.5 text-cyan-400/60 animate-spin" />}
          <span className="text-[10px] text-white/20">{provider.models.length} 模型</span>
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-white/20" /> : <ChevronRight className="w-3.5 h-3.5 text-white/20" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04]">
          <div className="pt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-white/30 uppercase tracking-wider">API 端点</label>
              <div className="flex items-center gap-1">
                {!editingUrl ? (
                  <button onClick={() => { setEditingUrl(true); setUrlDraft(activeUrl) }}
                    className="text-[9px] text-white/20 hover:text-white/50 px-1.5 py-0.5 rounded hover:bg-white/[0.04] transition-all">
                    <Edit3 className="w-3 h-3 inline mr-1" />编辑
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button onClick={() => { onUrlChange(urlDraft); setEditingUrl(false) }}
                      className="text-[9px] text-emerald-400/70 hover:text-emerald-400 px-1.5 py-0.5 rounded hover:bg-emerald-500/10 transition-all">
                      <Check className="w-3 h-3 inline mr-0.5" />保存
                    </button>
                    <button onClick={() => setEditingUrl(false)}
                      className="text-[9px] text-white/20 hover:text-white/50 px-1.5 py-0.5 rounded hover:bg-white/[0.04] transition-all">
                      取消
                    </button>
                  </div>
                )}
                <CopyButton text={activeUrl} />
              </div>
            </div>
            {editingUrl ? (
              <input value={urlDraft} onChange={e => setUrlDraft(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-white/70 font-mono focus:outline-none focus:border-indigo-500/40" />
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[11px] text-white/40 font-mono truncate flex-1">{activeUrl}</span>
              </div>
            )}
          </div>

          {provider.id !== 'ollama' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-white/30 uppercase tracking-wider">API Key</label>
                {provider.apiKeyUrl && (
                  <a href={provider.apiKeyUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[9px] text-indigo-400/60 hover:text-indigo-400 transition-all">
                    <ExternalLink className="w-3 h-3" />获取 API Key
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => onApiKeyChange(e.target.value)}
                    placeholder={provider.apiKeyPlaceholder}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 pr-8 text-[11px] text-white/70 font-mono focus:outline-none focus:border-indigo-500/40 placeholder:text-white/10" />
                  <button onClick={() => setShowKey(p => !p)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/15 hover:text-white/40 transition-all">
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              {!apiKey && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400/50">
                  <AlertCircle className="w-3 h-3" /><span>尚未配置 API Key，部分功能不可用</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-white/30 uppercase tracking-wider">模型列表</label>
              <button onClick={() => setAddingModel(true)}
                className="flex items-center gap-1 text-[9px] text-white/25 hover:text-white/50 px-1.5 py-0.5 rounded hover:bg-white/[0.04] transition-all">
                <PlusCircle className="w-3 h-3" /> 添加模型
              </button>
            </div>
            <div className="space-y-1">
              {provider.models.map(model => {
                const diag = diagnostics[model.id]
                const modelKey = `${provider.id}:${model.id}`
                const isActive = activeModelKey === modelKey
                return (
                  <div key={model.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all group ${
                    isActive ? 'bg-indigo-500/[0.08] border border-indigo-500/25' : 'bg-white/[0.01] hover:bg-white/[0.03] border border-transparent'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isActive ? 'bg-indigo-400' :
                      diag?.status === 'success' ? 'bg-emerald-400' :
                      diag?.status === 'error' ? 'bg-red-400' :
                      diag?.status === 'testing' ? 'bg-cyan-400 animate-pulse' : 'bg-white/10'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] ${isActive ? 'text-indigo-300' : 'text-white/60'}`}>{model.name}</span>
                        {isActive && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400/80 border border-indigo-500/20">当前使用</span>}
                        {model.contextWindow && <span className="text-[8px] text-white/15 bg-white/[0.03] px-1 py-0.5 rounded">{model.contextWindow}</span>}
                      </div>
                      <div className="text-[9px] text-white/20 truncate">{model.description}</div>
                    </div>
                    {model.pricing && <span className="text-[8px] text-white/15">{model.pricing}</span>}
                    {diag?.status === 'success' && diag.latency != null && <span className="text-[9px] text-emerald-400/50">{diag.latency}ms</span>}
                    <div className="flex items-center gap-0.5">
                      {!isActive && (
                        <button onClick={() => onSelectModel(model.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] text-indigo-400/60 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-indigo-500/15">
                          <ArrowRight className="w-3 h-3" /><span>使用</span>
                        </button>
                      )}
                      <button onClick={() => onTestConnection(model.id)} disabled={diag?.status === 'testing'}
                        className="p-1 rounded text-white/15 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all opacity-0 group-hover:opacity-100" title="测试连接">
                        {diag?.status === 'testing' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      </button>
                      <button onClick={() => onRemoveModel(model.id)}
                        className="p-1 rounded text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100" title="移除模型">
                        <MinusCircle className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {(importedModels || []).map(model => {
                const modelKey = `${provider.id}:${model.name}`
                const isActive = activeModelKey === modelKey
                return (
                  <div key={`imported-${model.name}`} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all group ${
                    isActive ? 'bg-indigo-500/[0.08] border border-indigo-500/25' : 'bg-amber-500/[0.02] hover:bg-amber-500/[0.05] border border-transparent'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-indigo-400' : 'bg-amber-400/60'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] ${isActive ? 'text-indigo-300' : 'text-amber-300/70'}`}>{model.name}</span>
                        {isActive && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400/80 border border-indigo-500/20">当前使用</span>}
                        <span className="text-[8px] text-amber-400/30 bg-amber-500/[0.06] px-1 py-0.5 rounded border border-amber-500/10">已导入</span>
                      </div>
                      <div className="text-[9px] text-white/15 truncate font-mono">{model.endpoint}</div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {!isActive && (
                        <button onClick={() => onSelectModel(model.name)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] text-amber-400/50 hover:text-amber-400 hover:bg-amber-500/10 transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-amber-500/15">
                          <ArrowRight className="w-3 h-3" /><span>使用</span>
                        </button>
                      )}
                      <button onClick={() => onRemoveModel(model.name)}
                        className="p-1 rounded text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100" title="移除模型">
                        <MinusCircle className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {provider.models.length === 0 && (!importedModels || importedModels.length === 0) && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="text-[11px] text-white/20">暂无模型</div>
                </div>
              )}
            </div>

            {addingModel && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-indigo-500/20 bg-indigo-500/[0.03]">
                <input value={newModelId} onChange={e => setNewModelId(e.target.value)}
                  placeholder="模型 ID (如 gpt-4o)"
                  className="flex-1 bg-transparent text-[11px] text-white/70 font-mono placeholder:text-white/15 focus:outline-none" />
                <input value={newModelName} onChange={e => setNewModelName(e.target.value)}
                  placeholder="显示名称"
                  className="flex-1 bg-transparent text-[11px] text-white/70 placeholder:text-white/15 focus:outline-none" />
                <button onClick={() => { if (newModelId && newModelName) { onAddModel({ id: newModelId, name: newModelName, description: '自定义模型' }); setNewModelId(''); setNewModelName(''); setAddingModel(false) } }}
                  disabled={!newModelId || !newModelName}
                  className="p-1 text-emerald-400/60 hover:text-emerald-400 disabled:opacity-30 transition-all">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setAddingModel(false); setNewModelId(''); setNewModelName('') }}
                  className="p-1 text-white/20 hover:text-white/50 transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => provider.models.forEach(m => onTestConnection(m.id))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] transition-all border ${provider.colorBg} ${provider.colorBorder} ${provider.color}`}>
              <Activity className="w-3 h-3" /> 全部检测
            </button>
            {isCustom && onRemoveProvider && (
              <button onClick={onRemoveProvider}
                className="flex items-center gap-1 ml-auto px-3 py-1.5 rounded-lg text-[10px] text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all border border-red-500/10">
                <Trash2 className="w-3 h-3" /> 移除服务商
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
