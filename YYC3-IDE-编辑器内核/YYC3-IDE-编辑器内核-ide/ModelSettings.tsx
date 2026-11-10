/**
 * @file: ModelSettings.tsx
 * @description: AI 模型管理设置面板（全功能版），支持多 Provider 管理、API Key 配置、
 *              模型注册/编辑/删除、Ollama 自动检测、连通性测试、延迟监控
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.5.0
 * @created: 2026-03-06
 * @updated: 2026-03-14
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: settings,models,providers,api-key,connectivity
 */

import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bot,
  Bug,
  Check,
  CheckCircle2,
  ChevronDown, ChevronRight,
  Clock,
  Cloud,
  Copy,
  Cpu,
  Edit3,
  ExternalLink,
  Eye, EyeOff,
  FileCode2,
  Lightbulb,
  Loader2,
  Lock,
  MinusCircle,
  Network,
  Plug,
  Plus,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  Settings2,
  Sparkles,
  Terminal,
  Trash2,
  TrendingUp,
  Wifi,
  X,
  XCircle,
  Zap
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import MentorPanel from './MentorPanel'
import { useModelRegistry } from './ModelRegistry'
import { DEFAULT_PROXY_CONFIG, PROXY_SERVER_TEMPLATE, checkProxyHealth, loadProxyConfig, saveProxyConfig, type ProxyConfig } from './ProxyService'
import {
  BUILTIN_PROVIDERS,
  type ModelDef,
  type ProviderDef,
} from './constants/providers'
import {
  SK_HIDDEN_PROVIDERS,
  SK_MCP_SERVERS,
  SK_MODEL_PERF_DATA,
  SK_OLLAMA_CACHE_PREFIX,
  SK_PROVIDER_API_KEYS,
  SK_PROVIDER_EDITS,
  SK_PROVIDER_MODEL_ADDITIONS,
  SK_PROVIDER_MODEL_REMOVALS,
  SK_PROVIDER_URLS,
  loadJSON,
  saveJSON
} from './constants/storage-keys'
import { useThemeTokens } from './hooks/useThemeTokens'
import { logger } from "./services/Logger"
import { copyToClipboard } from './utils/clipboard'

/* ================================================================
   Types (local to ModelSettings)
   ================================================================ */

interface MCPServerConfig {
  id: string
  name: string
  description: string
  command: string
  args: string[]
  env: Record<string, string>
  enabled: boolean
}

interface DiagnosticResult {
  providerId: string
  modelName: string
  status: 'idle' | 'testing' | 'success' | 'error'
  latency?: number
  message: string
  modelResponse?: string
  timestamp?: number
}

interface OllamaDetectedModel {
  name: string
  size: string
  status: 'online' | 'offline'
  quantization: string
}

/* ================================================================
   Provider Definitions — 引用共享常量
   ================================================================ */

const PROVIDERS = BUILTIN_PROVIDERS

const DEFAULT_MCP_SERVERS: MCPServerConfig[] = [
  {
    id: 'mcp-filesystem',
    name: 'Filesystem',
    description: '文件系统读写操作',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/app/designs'],
    env: {},
    enabled: true,
  },
  {
    id: 'mcp-fetch',
    name: 'Fetch',
    description: 'HTTP 请求工具',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
    env: {},
    enabled: true,
  },
  {
    id: 'mcp-postgres',
    name: 'PostgreSQL',
    description: '数据库查询工具',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    env: { DATABASE_URL: 'postgresql://user:pwd@localhost:5432/yanyucloud' },
    enabled: false,
  },
]

/* ================================================================
   Local Storage Keys — 引用共享常量
   ================================================================ */

const STORAGE_KEYS = {
  providerKeys: SK_PROVIDER_API_KEYS,
  providerUrls: SK_PROVIDER_URLS,
  mcpServers: SK_MCP_SERVERS,
  hiddenProviders: SK_HIDDEN_PROVIDERS,
  providerModelAdditions: SK_PROVIDER_MODEL_ADDITIONS,
  providerModelRemovals: SK_PROVIDER_MODEL_REMOVALS,
  providerEdits: SK_PROVIDER_EDITS,
  ollamaCache: SK_OLLAMA_CACHE_PREFIX,
}
// loadJSON / saveJSON imported from constants/storage-keys

/* ================================================================
   Sub-Components
   ================================================================ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { copyToClipboard(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="p-1 rounded text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all"
      title="复制"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

/* ================================================================
   Provider Card
   ================================================================ */

function ProviderCard({
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
  onHideProvider,
  isCustom,
  isHidden,
  importedModels, // 新增：已导入的模型（用于 Ollama 等动态检测的服务）
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
  onHideProvider?: () => void
  isCustom?: boolean
  isHidden?: boolean
  importedModels?: Array<{ id: string; name: string; endpoint: string; isActive: boolean }> // 已导入的模型
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
    <div className={`rounded-xl border overflow-hidden transition-all ${hasActiveModel
      ? 'border-indigo-500/25 bg-indigo-500/[0.02]'
      : 'border-white/[0.06] bg-white/[0.02]'
      }`}
      style={{
        boxShadow: hasActiveModel
          ? '0 0 20px -6px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.04)'
          : 'inset 0 1px 0 rgba(255,255,255,0.02)',
      }}
    >
      {/* Header */}
      <div
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        role="button"
        tabIndex={0}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-all cursor-pointer"
      >
        <div className={`w-8 h-8 rounded-lg ${provider.colorBg} border ${provider.colorBorder} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${provider.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-white/85">{provider.name}</span>
            {provider.openaiCompatible && (
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400/50 border border-indigo-500/10">
                OpenAI 兼容
              </span>
            )}
          </div>
          <div className="text-[10px] text-white/25 mt-0.5">{provider.description}</div>
        </div>
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {hasActiveModel && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400/70 border border-indigo-500/15 shrink-0">
              使用中
            </span>
          )}
          {apiKey && (
            <div className="w-2 h-2 rounded-full bg-emerald-400/60" title="API Key 已配置" />
          )}
          {hasAnyOnline && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/60" />}
          {hasAnyError && !hasAnyOnline && <AlertCircle className="w-3.5 h-3.5 text-red-400/60" />}
          {isTesting && <Loader2 className="w-3.5 h-3.5 text-cyan-400/60 animate-spin" />}
          <span className="text-[10px] text-white/20">{provider.models.length} 模型</span>
          {onHideProvider && (
            <button
              onClick={(e) => { e.stopPropagation(); onHideProvider(); }}
              className="p-1 rounded text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title={isHidden ? "恢复显示此服务商" : "隐藏此服务商"}
            >
              {isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
          )}
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-white/20" /> : <ChevronRight className="w-3.5 h-3.5 text-white/20" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04]">
          {/* API Endpoint */}
          <div className="pt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-white/30 uppercase tracking-wider">API 端点</label>
              <div className="flex items-center gap-1">
                {!editingUrl ? (
                  <button onClick={() => { setEditingUrl(true); setUrlDraft(activeUrl) }}
                    className="text-[9px] text-white/20 hover:text-white/50 px-1.5 py-0.5 rounded hover:bg-white/[0.04] transition-all"
                  >
                    <Edit3 className="w-3 h-3 inline mr-1" />编辑
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button onClick={() => { onUrlChange(urlDraft); setEditingUrl(false) }}
                      className="text-[9px] text-emerald-400/70 hover:text-emerald-400 px-1.5 py-0.5 rounded hover:bg-emerald-500/10 transition-all"
                    >
                      <Check className="w-3 h-3 inline mr-0.5" />保存
                    </button>
                    <button onClick={() => setEditingUrl(false)}
                      className="text-[9px] text-white/20 hover:text-white/50 px-1.5 py-0.5 rounded hover:bg-white/[0.04] transition-all"
                    >
                      取消
                    </button>
                  </div>
                )}
                <CopyButton text={activeUrl} />
              </div>
            </div>
            {editingUrl ? (
              <input
                value={urlDraft}
                onChange={e => setUrlDraft(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-white/70 font-mono focus:outline-none focus:border-indigo-500/40"
              />
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[11px] text-white/40 font-mono truncate flex-1">{activeUrl}</span>
              </div>
            )}
          </div>

          {/* API Key */}
          {provider.id !== 'ollama' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-white/30 uppercase tracking-wider">API Key</label>
                {provider.apiKeyUrl && (
                  <a
                    href={provider.apiKeyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[9px] text-indigo-400/60 hover:text-indigo-400 transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    获取 API Key
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => onApiKeyChange(e.target.value)}
                    placeholder={provider.apiKeyPlaceholder}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 pr-8 text-[11px] text-white/70 font-mono focus:outline-none focus:border-indigo-500/40 placeholder:text-white/10"
                  />
                  <button
                    onClick={() => setShowKey(p => !p)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/15 hover:text-white/40 transition-all"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              {!apiKey && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400/50">
                  <AlertCircle className="w-3 h-3" />
                  <span>尚未配置 API Key，部分功能不可用</span>
                </div>
              )}
            </div>
          )}

          {/* Models list */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-white/30 uppercase tracking-wider">模型列表</label>
              <button
                onClick={() => setAddingModel(true)}
                className="flex items-center gap-1 text-[9px] text-white/25 hover:text-white/50 px-1.5 py-0.5 rounded hover:bg-white/[0.04] transition-all"
              >
                <PlusCircle className="w-3 h-3" /> 添加模型
              </button>
            </div>
            <div className="space-y-1">
              {/* 预定义模型 */}
              {provider.models.map(model => {
                const diag = diagnostics[model.id]
                const modelKey = `${provider.id}:${model.id}`
                const isActive = activeModelKey === modelKey
                return (
                  <div key={model.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all group ${isActive
                    ? 'bg-indigo-500/[0.08] border border-indigo-500/25'
                    : 'bg-white/[0.01] hover:bg-white/[0.03] border border-transparent'
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-indigo-400' :
                      diag?.status === 'success' ? 'bg-emerald-400' :
                        diag?.status === 'error' ? 'bg-red-400' :
                          diag?.status === 'testing' ? 'bg-cyan-400 animate-pulse' :
                            'bg-white/10'
                      }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] ${isActive ? 'text-indigo-300' : 'text-white/60'}`}>{model.name}</span>
                        {isActive && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400/80 border border-indigo-500/20">
                            当前使用
                          </span>
                        )}
                        {model.contextWindow && <span className="text-[8px] text-white/15 bg-white/[0.03] px-1 py-0.5 rounded">{model.contextWindow}</span>}
                      </div>
                      <div className="text-[9px] text-white/20 truncate">{model.description}</div>
                    </div>
                    {model.pricing && <span className="text-[8px] text-white/15">{model.pricing}</span>}
                    {diag?.status === 'success' && diag.latency != null && (
                      <span className="text-[9px] text-emerald-400/50">{diag.latency}ms</span>
                    )}
                    <div className="flex items-center gap-0.5">
                      {!isActive && (
                        <button
                          onClick={() => onSelectModel(model.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] text-indigo-400/60 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-indigo-500/15"
                          title="选择使用此模型"
                        >
                          <ArrowRight className="w-3 h-3" />
                          <span>使用</span>
                        </button>
                      )}
                      <button
                        onClick={() => onTestConnection(model.id)}
                        disabled={diag?.status === 'testing'}
                        className="p-1 rounded text-white/15 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="测试连接"
                      >
                        {diag?.status === 'testing' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => onRemoveModel(model.id)}
                        className="p-1 rounded text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="移除模型"
                      >
                        <MinusCircle className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* 已导入的模型（过滤掉已存在于预置列表中的） */}
              {(importedModels || []).filter(m => !provider.models.some(pm => pm.id === m.name || pm.name === m.name)).map(model => {
                const modelKey = `${provider.id}:${model.name}`
                const isActive = activeModelKey === modelKey
                return (
                  <div key={`imported-${model.name}`} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all group ${isActive
                    ? 'bg-indigo-500/[0.08] border border-indigo-500/25'
                    : 'bg-amber-500/[0.02] hover:bg-amber-500/[0.05] border border-transparent'
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-indigo-400' : 'bg-amber-400/60'
                      }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] ${isActive ? 'text-indigo-300' : 'text-amber-300/70'}`}>{model.name}</span>
                        {isActive && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400/80 border border-indigo-500/20">
                            当前使用
                          </span>
                        )}
                        <span className="text-[8px] text-amber-400/30 bg-amber-500/[0.06] px-1 py-0.5 rounded border border-amber-500/10">已导入</span>
                      </div>
                      <div className="text-[9px] text-white/15 truncate font-mono">{model.endpoint}</div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {!isActive && (
                        <button
                          onClick={() => onSelectModel(model.name)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] text-amber-400/50 hover:text-amber-400 hover:bg-amber-500/10 transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-amber-500/15"
                          title="激活此模型"
                        >
                          <ArrowRight className="w-3 h-3" />
                          <span>使用</span>
                        </button>
                      )}
                      <button
                        onClick={() => onRemoveModel(model.name)}
                        className="p-1 rounded text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="移除模型"
                      >
                        <MinusCircle className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* 空状态 */}
              {provider.models.length === 0 && (!importedModels || importedModels.length === 0) && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="text-[11px] text-white/20">暂无模型</div>
                  {provider.id === 'ollama' ? (
                    <div className="text-[9px] text-amber-400/30 mt-1">请从「Ollama 本地」标签页导入模型</div>
                  ) : (
                    <div className="text-[9px] text-white/15 mt-1">点击"添加模型"按钮添加</div>
                  )}
                </div>
              )}
            </div>

            {/* Add model form */}
            {addingModel && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-indigo-500/20 bg-indigo-500/[0.03]">
                <input
                  value={newModelId}
                  onChange={e => setNewModelId(e.target.value)}
                  placeholder="模型 ID (如 gpt-4o)"
                  className="flex-1 bg-transparent text-[11px] text-white/70 font-mono placeholder:text-white/15 focus:outline-none"
                />
                <input
                  value={newModelName}
                  onChange={e => setNewModelName(e.target.value)}
                  placeholder="显示名称"
                  className="flex-1 bg-transparent text-[11px] text-white/70 placeholder:text-white/15 focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (newModelId && newModelName) {
                      onAddModel({ id: newModelId, name: newModelName, description: '自定义模型' })
                      setNewModelId(''); setNewModelName(''); setAddingModel(false)
                    }
                  }}
                  disabled={!newModelId || !newModelName}
                  className="p-1 text-emerald-400/60 hover:text-emerald-400 disabled:opacity-30 transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setAddingModel(false); setNewModelId(''); setNewModelName('') }}
                  className="p-1 text-white/20 hover:text-white/50 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Test all + diagnostics summary */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => provider.models.forEach(m => onTestConnection(m.id))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] transition-all border ${provider.colorBg} ${provider.colorBorder} ${provider.color}`}
            >
              <Activity className="w-3 h-3" /> 全部检测
            </button>
            {provider.docsUrl && (
              <a
                href={provider.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-all border border-white/[0.04]"
              >
                <FileCode2 className="w-3 h-3" /> API 文档
              </a>
            )}
            {isCustom && onRemoveProvider && (
              <button
                onClick={onRemoveProvider}
                className="flex items-center gap-1 ml-auto px-3 py-1.5 rounded-lg text-[10px] text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all border border-red-500/10"
              >
                <Trash2 className="w-3 h-3" /> 移除服务商
              </button>
            )}
          </div>

          {/* Diagnostic error details */}
          {Object.entries(diagnostics).filter(([, d]) => d.status === 'error').map(([modelId, diag]) => (
            <div key={modelId} className="px-3 py-2 rounded-lg bg-red-500/[0.04] border border-red-500/10 space-y-1">
              <div className="flex items-center gap-1.5">
                <XCircle className="w-3 h-3 text-red-400/60" />
                <span className="text-[10px] text-red-400/70">{diag.modelName}</span>
                {diag.latency != null && <span className="text-[9px] text-white/15 ml-auto">{diag.latency}ms</span>}
              </div>
              <div className="text-[9px] text-white/30 pl-4.5">{diag.message}</div>
            </div>
          ))}
          {Object.entries(diagnostics).filter(([, d]) => d.status === 'success' && d.modelResponse).map(([modelId, diag]) => (
            <div key={modelId} className="px-3 py-2 rounded-lg bg-emerald-500/[0.03] border border-emerald-500/10 space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400/60" />
                <span className="text-[10px] text-emerald-400/70">{diag.modelName}</span>
                <span className="text-[9px] text-emerald-400/30 ml-auto">{diag.latency}ms</span>
              </div>
              <div className="text-[9px] text-white/25 pl-4.5 font-mono">{diag.modelResponse}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ================================================================
   MCP Config Panel
   ================================================================ */

function MCPConfigPanel() {
  const [servers, setServers] = useState<MCPServerConfig[]>(() => loadJSON(STORAGE_KEYS.mcpServers, DEFAULT_MCP_SERVERS))
  const [addingServer, setAddingServer] = useState(false)
  const [newServer, setNewServer] = useState({ name: '', command: '', args: '', env: '', description: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonDraft, setJsonDraft] = useState('')
  const [jsonError, setJsonError] = useState('')

  useEffect(() => { saveJSON(STORAGE_KEYS.mcpServers, servers) }, [servers])

  const handleToggle = (id: string) => {
    setServers(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))
  }
  const handleRemove = (id: string) => {
    setServers(prev => prev.filter(s => s.id !== id))
  }
  const handleAdd = () => {
    if (!newServer.name || !newServer.command) return
    let envObj: Record<string, string> = {}
    try { if (newServer.env) envObj = JSON.parse(newServer.env) } catch { /* env 格式无效时使用空对象 */ }
    const server: MCPServerConfig = {
      id: `mcp-${Date.now()}`,
      name: newServer.name,
      description: newServer.description || newServer.name,
      command: newServer.command,
      args: newServer.args ? newServer.args.split(/\s+/) : [],
      env: envObj,
      enabled: true,
    }
    setServers(prev => [...prev, server])
    setNewServer({ name: '', command: '', args: '', env: '', description: '' })
    setAddingServer(false)
  }

  const handleExportJson = () => {
    const mcpConfig: Record<string, any> = { mcpServers: {} }
    servers.filter(s => s.enabled).forEach(s => {
      mcpConfig.mcpServers[s.name.toLowerCase()] = {
        command: s.command,
        args: s.args,
        ...(Object.keys(s.env).length > 0 ? { env: s.env } : {}),
      }
    })
    setJsonDraft(JSON.stringify(mcpConfig, null, 2))
    setJsonMode(true)
    setJsonError('')
  }

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonDraft)
      const mcpServers = parsed.mcpServers || parsed
      const imported: MCPServerConfig[] = Object.entries(mcpServers).map(([name, conf]: [string, any]) => ({
        id: `mcp-${Date.now()}-${name}`,
        name,
        description: conf.description || name,
        command: conf.command || '',
        args: conf.args || [],
        env: conf.env || {},
        enabled: true,
      }))
      setServers(imported)
      setJsonMode(false)
      setJsonError('')
    } catch (e: any) {
      setJsonError(`JSON 解析失败: ${e.message}`)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug className="w-4 h-4 text-violet-400" />
          <span className="text-[12px] text-white/70">MCP Server 配置</span>
          <span className="text-[9px] text-white/20 bg-white/[0.03] px-1.5 py-0.5 rounded">
            {servers.filter(s => s.enabled).length}/{servers.length} 启用
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleExportJson}
            className="flex items-center gap-1 px-2 py-1 rounded text-[9px] text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-all"
          >
            <Terminal className="w-3 h-3" /> {jsonMode ? '列表模式' : 'JSON 模式'}
          </button>
        </div>
      </div>

      {/* JSON Mode */}
      {jsonMode && (
        <div className="space-y-2">
          <textarea
            value={jsonDraft}
            onChange={e => { setJsonDraft(e.target.value); setJsonError('') }}
            rows={12}
            className="w-full bg-black/20 border border-white/[0.06] rounded-lg px-3 py-2 text-[10px] text-white/60 font-mono focus:outline-none focus:border-violet-500/40 resize-none"
            placeholder='{"mcpServers": { "filesystem": { "command": "npx", "args": [...] } }}'
          />
          {jsonError && <div className="text-[10px] text-red-400/70 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{jsonError}</div>}
          <div className="flex items-center gap-2">
            <button onClick={handleImportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/20 text-violet-400 text-[10px] hover:bg-violet-500/25 transition-all"
            >
              <Check className="w-3 h-3" /> 导入 JSON 配置
            </button>
            <button onClick={() => setJsonMode(false)}
              className="px-3 py-1.5 rounded-lg text-white/30 text-[10px] hover:bg-white/[0.04] transition-all"
            >
              取消
            </button>
            <CopyButton text={jsonDraft} />
          </div>
          <div className="text-[9px] text-white/20 px-1">
            支持标准 MCP JSON 格式，与 Claude Desktop / Cursor / Windsurf 配置兼容
          </div>
        </div>
      )}

      {/* Server list */}
      {!jsonMode && (
        <div className="space-y-2">
          {servers.map(server => (
            <div key={server.id} className={`rounded-xl border p-3 space-y-2 transition-all ${server.enabled ? 'border-white/[0.06] bg-white/[0.02]' : 'border-white/[0.03] bg-white/[0.01] opacity-50'
              }`}>
              <div className="flex items-center gap-2.5">
                <button onClick={() => handleToggle(server.id)} className="shrink-0">
                  <div className={`w-8 h-4 rounded-full transition-all ${server.enabled ? 'bg-violet-500/30' : 'bg-white/[0.06]'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full transition-all mt-[1px] ${server.enabled ? 'bg-violet-400 ml-[17px]' : 'bg-white/20 ml-[1px]'
                      }`} />
                  </div>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-white/60">{server.name}</div>
                  <div className="text-[9px] text-white/20">{server.description}</div>
                </div>
                <button
                  onClick={() => setEditingId(editingId === server.id ? null : server.id)}
                  className="p-1 rounded text-white/15 hover:text-white/40 hover:bg-white/[0.04] transition-all"
                >
                  <Settings2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleRemove(server.id)}
                  className="p-1 rounded text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {editingId === server.id && (
                <div className="space-y-2 pl-10">
                  <div className="text-[9px] text-white/20 space-y-1 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 w-16 shrink-0">command:</span>
                      <span className="text-white/50">{server.command}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-white/30 w-16 shrink-0">args:</span>
                      <span className="text-white/50 break-all">{JSON.stringify(server.args)}</span>
                    </div>
                    {Object.keys(server.env).length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="text-white/30 w-16 shrink-0">env:</span>
                        <span className="text-white/50 break-all">{JSON.stringify(server.env)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add server */}
          {addingServer ? (
            <div className="rounded-xl border border-dashed border-violet-500/20 bg-violet-500/[0.03] p-3 space-y-2">
              <div className="text-[10px] text-violet-400/70 mb-1">添加 MCP Server</div>
              <div className="grid grid-cols-2 gap-2">
                <input value={newServer.name} onChange={e => setNewServer({ ...newServer, name: e.target.value })}
                  placeholder="名称 (如 filesystem)" className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-[10px] text-white/70 font-mono focus:outline-none focus:border-violet-500/40 placeholder:text-white/10" />
                <input value={newServer.command} onChange={e => setNewServer({ ...newServer, command: e.target.value })}
                  placeholder="命令 (如 npx)" className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-[10px] text-white/70 font-mono focus:outline-none focus:border-violet-500/40 placeholder:text-white/10" />
              </div>
              <input value={newServer.args} onChange={e => setNewServer({ ...newServer, args: e.target.value })}
                placeholder="参数 (空格分隔，如 -y @modelcontextprotocol/server-fetch)" className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-[10px] text-white/70 font-mono focus:outline-none focus:border-violet-500/40 placeholder:text-white/10" />
              <input value={newServer.env} onChange={e => setNewServer({ ...newServer, env: e.target.value })}
                placeholder='环境变量 JSON (如 {"KEY":"value"})' className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-[10px] text-white/70 font-mono focus:outline-none focus:border-violet-500/40 placeholder:text-white/10" />
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={!newServer.name || !newServer.command}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-500/15 text-violet-400 text-[10px] hover:bg-violet-500/25 transition-all disabled:opacity-30 border border-violet-500/20">
                  <Plus className="w-3 h-3" /> 添加
                </button>
                <button onClick={() => setAddingServer(false)}
                  className="px-3 py-1.5 rounded-lg text-white/30 text-[10px] hover:bg-white/[0.04] transition-all">
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingServer(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/[0.06] text-white/20 hover:text-white/40 hover:border-white/[0.12] transition-all text-[11px]">
              <Plus className="w-3.5 h-3.5" /> 添加 MCP Server
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ================================================================
   Smart Diagnostics Panel
   ================================================================ */

function SmartDiagnosticsPanel({
  providers,
  apiKeys,
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
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '总模型数', value: String(totalModels), icon: Cpu, color: 'text-white/50' },
          { label: '已检测', value: String(testedModels), icon: Activity, color: 'text-cyan-400' },
          { label: '在线', value: String(onlineModels), icon: Wifi, color: 'text-emerald-400' },
          { label: '平均延迟', value: avgLatency ? `${avgLatency}ms` : '-', icon: Clock, color: 'text-amber-400' },
        ].map(card => (
          <div key={card.label} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
            <card.icon className={`w-4 h-4 ${card.color} mx-auto mb-1`} />
            <div className={`text-[16px] ${card.color}`}>{card.value}</div>
            <div className="text-[9px] text-white/20 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Latency Trend Chart */}
      <LatencyTrendChart diagnostics={diagnostics} />

      {/* Run all diagnostics */}
      <button
        onClick={handleRunAll}
        disabled={running}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/15 text-cyan-400 text-[12px] hover:from-cyan-500/20 hover:to-blue-500/20 transition-all disabled:opacity-50"
      >
        {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
        {running ? '全面检测中...' : '一键全面诊断'}
      </button>

      {/* Results by provider */}
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
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400/80 border border-indigo-500/20 shrink-0">
                      当前使用
                    </span>
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

      {/* AI suggestions */}
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

/* ================================================================
   Latency Trend Chart
   ================================================================ */

function LatencyTrendChart({ diagnostics }: { diagnostics: Record<string, DiagnosticResult> }) {
  const chartData = useMemo(() => {
    // Build chart data from diagnostics with timestamps
    const entries = Object.entries(diagnostics)
      .filter(([, d]) => d.timestamp && d.latency != null)
      .sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0))
      .map(([key, d]) => ({
        name: d.modelName.length > 12 ? `${d.modelName.slice(0, 12)}…` : d.modelName,
        latency: d.latency || 0,
        status: d.status,
        time: d.timestamp ? new Date(d.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
      }))
    return entries
  }, [diagnostics])

  // Also read from localStorage perf data for richer history
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
  }, [diagnostics]) // re-read when diagnostics change

  const data = perfData.length > 0 ? perfData : chartData

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center justify-center h-[160px]">
        <div className="text-center">
          <TrendingUp className="w-5 h-5 text-white/10 mx-auto mb-2" />
          <p className="text-[10px] text-white/20">暂无延迟数据</p>
          <p className="text-[9px] text-white/10 mt-0.5">运行诊断检测或启用心跳后显示趋势图</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
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

/* ================================================================
   Proxy Config Panel
   ================================================================ */

function ProxyConfigPanel() {
  const [config, setConfig] = useState<ProxyConfig>(() => loadProxyConfig())
  const [healthStatus, setHealthStatus] = useState<'idle' | 'checking' | 'healthy' | 'unhealthy'>('idle')
  const [healthLatency, setHealthLatency] = useState<number | null>(null)
  const [healthError, setHealthError] = useState('')
  const [healthVersion, setHealthVersion] = useState('')
  const [showTemplate, setShowTemplate] = useState(false)
  const [templateCopied, setTemplateCopied] = useState(false)

  const handleSave = useCallback((updates: Partial<ProxyConfig>) => {
    const merged = saveProxyConfig(updates)
    setConfig(merged)
  }, [])

  const handleHealthCheck = useCallback(async () => {
    setHealthStatus('checking')
    setHealthError('')
    try {
      const result = await checkProxyHealth(config.baseUrl)
      setHealthStatus(result.healthy ? 'healthy' : 'unhealthy')
      setHealthLatency(result.latencyMs)
      setHealthVersion(result.version || '')
      if (result.error) setHealthError(result.error)
    } catch (e: any) {
      setHealthStatus('unhealthy')
      setHealthError(e.message || '检查失败')
    }
  }, [config.baseUrl])

  const handleCopyTemplate = useCallback(() => {
    copyToClipboard(PROXY_SERVER_TEMPLATE)
    setTemplateCopied(true)
    setTimeout(() => setTemplateCopied(false), 2000)
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Network className="w-4 h-4 text-indigo-400" />
        <span className="text-[12px] text-white/70">代理服务配置</span>
        <span className="text-[9px] text-white/20 bg-white/[0.03] px-1.5 py-0.5 rounded">
          {config.enabled ? '已启用' : '未启用'}
        </span>
      </div>

      {/* Enable toggle */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-4"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-white/60">启用代理转发</div>
            <div className="text-[9px] text-white/20 mt-0.5">
              所有 LLM API 请求将通过代理服务器转发，解决 CORS 限制并保护 API Key
            </div>
          </div>
          <button onClick={() => handleSave({ enabled: !config.enabled })} className="shrink-0">
            <div className={`w-10 h-5 rounded-full transition-all ${config.enabled ? 'bg-indigo-500/40' : 'bg-white/[0.08]'}`}>
              <div className={`w-4.5 h-4.5 rounded-full transition-all mt-[1px] ${config.enabled ? 'bg-indigo-400 ml-[21px]' : 'bg-white/25 ml-[1px]'
                }`} style={{ width: '18px', height: '18px' }} />
            </div>
          </button>
        </div>

        {/* Base URL */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-white/30 uppercase tracking-wider">代理服务器 URL</label>
          <div className="flex gap-2">
            <input
              value={config.baseUrl}
              onChange={e => handleSave({ baseUrl: e.target.value })}
              placeholder="http://localhost:3001/api/proxy"
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-white/70 font-mono focus:outline-none focus:border-indigo-500/40 placeholder:text-white/10"
            />
            <button
              onClick={handleHealthCheck}
              disabled={healthStatus === 'checking'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500/15 text-indigo-400 text-[10px] hover:bg-indigo-500/25 transition-all disabled:opacity-50 border border-indigo-500/20 shrink-0"
            >
              {healthStatus === 'checking' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
              健康检查
            </button>
          </div>

          {/* Health result */}
          {healthStatus === 'healthy' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/15">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70" />
              <span className="text-[10px] text-emerald-400/70">代理服务正常</span>
              {healthLatency != null && <span className="text-[9px] text-emerald-400/40">{healthLatency}ms</span>}
              {healthVersion && <span className="text-[9px] text-white/15 ml-auto">v{healthVersion}</span>}
            </div>
          )}
          {healthStatus === 'unhealthy' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/[0.05] border border-red-500/15">
              <XCircle className="w-3.5 h-3.5 text-red-400/70" />
              <span className="text-[10px] text-red-400/70">连接失败</span>
              <span className="text-[9px] text-white/25 ml-auto truncate max-w-[200px]">{healthError}</span>
            </div>
          )}
        </div>

        {/* Auth Token */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-white/30 uppercase tracking-wider">
            <Lock className="w-3 h-3 inline mr-1" />认证 Token (前端→代理)
          </label>
          <input
            type="password"
            value={config.authToken || ''}
            onChange={e => handleSave({ authToken: e.target.value })}
            placeholder="可选：代理服务器认证令牌"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-white/70 font-mono focus:outline-none focus:border-indigo-500/40 placeholder:text-white/10"
          />
          <div className="text-[9px] text-white/15">
            此 Token 用于前端与代理服务器之间的认证（非 LLM API Key）
          </div>
        </div>

        {/* Advanced settings */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] text-white/25 uppercase tracking-wider">超时 (ms)</label>
            <input
              type="number"
              value={config.timeout}
              onChange={e => handleSave({ timeout: parseInt(e.target.value) || 30000 })}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-[10px] text-white/60 font-mono focus:outline-none focus:border-indigo-500/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-white/25 uppercase tracking-wider">重试次数</label>
            <input
              type="number"
              value={config.retries}
              onChange={e => handleSave({ retries: parseInt(e.target.value) || 2 })}
              min={0}
              max={5}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-[10px] text-white/60 font-mono focus:outline-none focus:border-indigo-500/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-white/25 uppercase tracking-wider">限速/分钟</label>
            <input
              type="number"
              value={config.rateLimitPerMin}
              onChange={e => handleSave({ rateLimitPerMin: parseInt(e.target.value) || 60 })}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-[10px] text-white/60 font-mono focus:outline-none focus:border-indigo-500/30"
            />
          </div>
        </div>

        {/* Reset */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => { handleSave(DEFAULT_PROXY_CONFIG); setHealthStatus('idle') }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-all border border-white/[0.04]"
          >
            <RotateCcw className="w-3 h-3" /> 重置默认
          </button>
        </div>
      </div>

      {/* Architecture diagram & template */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-3.5 h-3.5 text-indigo-400/60" />
            <span className="text-[11px] text-white/50">代理架构 & 部署模板</span>
          </div>
          <button
            onClick={() => setShowTemplate(!showTemplate)}
            className="text-[9px] text-white/25 hover:text-white/50 px-2 py-1 rounded hover:bg-white/[0.04] transition-all"
          >
            {showTemplate ? '收起' : '展开'} Cloudflare Worker 模板
          </button>
        </div>

        <div className="text-[10px] text-white/30 font-mono px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <pre className="whitespace-pre text-[9px] leading-relaxed">{`Frontend (Browser)  ──▶  Proxy Server  ──▶  LLM Provider
   ↑ CORS OK               ↑ Keys Stored       ↑ No CORS
   ↑ No API Keys            ↑ Rate Limit        ↑ Bearer Auth

部署选项:
  A. Cloudflare Workers — 零延迟边缘代理
  C. Supabase Edge Functions — 集成生态
  D. 自建 Node.js — 完全控制`}</pre>
        </div>

        {showTemplate && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-indigo-400/50">Cloudflare Worker 参考实现</span>
              <button
                onClick={handleCopyTemplate}
                className="flex items-center gap-1 px-2 py-1 rounded text-[9px] text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-all"
              >
                {templateCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {templateCopied ? '已复制' : '复制代码'}
              </button>
            </div>
            <pre className="text-[9px] text-white/30 font-mono bg-black/20 border border-white/[0.04] rounded-lg p-3 max-h-[200px] overflow-y-auto leading-relaxed whitespace-pre-wrap break-all">
              {PROXY_SERVER_TEMPLATE.trim()}
            </pre>
          </div>
        )}
      </div>

      {/* Info tip */}
      <div className="px-4 py-2.5 rounded-xl bg-indigo-500/[0.03] border border-indigo-500/10 flex items-start gap-2">
        <Lightbulb className="w-3.5 h-3.5 text-indigo-400/50 shrink-0 mt-0.5" />
        <div className="text-[10px] text-white/25">
          <strong className="text-indigo-400/40">提示：</strong>启用代理后，API Key 将仅存储在代理服务器的环境变量中，前端不再需要配置各服务商的 API Key。
          代理服务自动处理 CORS 头和认证转发，支持速率限制与请求审计。
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   Main Component: ModelSettings
   ================================================================ */

type TabKey = 'providers' | 'ollama' | 'mcp' | 'diagnostics' | 'proxy' | 'mentor'

export interface ModelSettingsProps {
  mode?: 'modal' | 'embedded'
  onClose?: () => void
  initialTab?: TabKey
}

export function ModelSettings({ mode = 'modal', onClose, initialTab = 'providers' }: ModelSettingsProps = {}) {
  const {
    showModelSettingsV2, setShowModelSettingsV2, models: aiModels,
    addModel: addAIModelRaw, removeModel: removeAIModel, updateModel: updateAIModel,
    setActiveModelId: activateAIModel, activeModelId,
    addCustomModel,
    customProviderDefs,
    addCustomProviderDef,
    removeCustomProviderDef,
    updateCustomProviderDef,
  } = useModelRegistry()
  const t = useThemeTokens()

  // Wrapper: ModelSettings.md uses addAIModel({ name, provider, endpoint, apiKey, isActive })
  // but ModelRegistry addModel expects a full AIModel object.
  // We use addCustomModel for the simplified API.
  const addAIModel = useCallback((opts: { name: string; provider: string; endpoint: string; apiKey?: string; isActive?: boolean; isDetected?: boolean }) => {
    addCustomModel(opts.name, opts.provider, opts.endpoint, opts.apiKey)
  }, [addCustomModel])

  const closeModelSettings = useCallback(() => {
    if (mode === 'modal') {
      setShowModelSettingsV2(false)
    }
    onClose?.()
  }, [mode, setShowModelSettingsV2, onClose])

  const modelSettingsOpen = mode === 'embedded' ? true : showModelSettingsV2

  const [activeTab, setActiveTab] = useState<TabKey>('mentor')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedProvider, setExpandedProvider] = useState<string | null>('zhipu')

  // Provider API keys & URLs (persisted)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => loadJSON(STORAGE_KEYS.providerKeys, {}))
  const [customUrls, setCustomUrls] = useState<Record<string, string>>(() => loadJSON(STORAGE_KEYS.providerUrls, {}))

  // Custom providers (user-added) — from ModelRegistry context (single source of truth)
  const [addingProvider, setAddingProvider] = useState(false)
  const [newProvider, setNewProvider] = useState({ name: '', baseURL: '', apiKeyUrl: '' })

  // Hidden built-in providers (user-hideable)
  const [hiddenProviders, setHiddenProviders] = useState<string[]>(() => loadJSON(STORAGE_KEYS.hiddenProviders, []))
  const [showHidden, setShowHidden] = useState(false)

  // Diagnostics
  const [diagnostics, setDiagnostics] = useState<Record<string, DiagnosticResult>>({})

  // Pending activation
  const pendingActivationRef = useRef<string | null>(null)
  const [selectionToast, setSelectionToast] = useState<string | null>(null)

  // Ollama
  const [ollamaHost, setOllamaHost] = useState('http://localhost:11434')
  const [ollamaScanning, setOllamaScanning] = useState(false)
  const [ollamaModels, setOllamaModels] = useState<OllamaDetectedModel[]>([])
  const [ollamaConnected, setOllamaConnected] = useState(false)

  // Auto-activate newly added model if pending
  useEffect(() => {
    const pendingName = pendingActivationRef.current
    if (!pendingName) return
    const found = aiModels.find(m => m.name === pendingName && !m.isActive)
    if (found) {
      pendingActivationRef.current = null
      activateAIModel(found.id)
    }
  }, [aiModels, activateAIModel])

  // Persist keys & urls (custom providers persisted by ModelRegistry context)
  useEffect(() => { saveJSON(STORAGE_KEYS.providerKeys, apiKeys) }, [apiKeys])
  useEffect(() => { saveJSON(STORAGE_KEYS.providerUrls, customUrls) }, [customUrls])
  useEffect(() => { saveJSON(STORAGE_KEYS.hiddenProviders, hiddenProviders) }, [hiddenProviders])

  // Sync API keys from provider config -> matching store models
  useEffect(() => {
    for (const provider of [...PROVIDERS, ...customProviderDefs]) {
      const key = apiKeys[provider.id]
      if (!key) continue
      const url = customUrls[provider.id] || provider.baseURL
      for (const storeModel of aiModels) {
        if (storeModel.endpoint === url && storeModel.apiKey !== key) {
          const isMatch = provider.models.some(m =>
            m.id === storeModel.name || m.name === storeModel.name
          )
          if (isMatch) {
            updateAIModel(storeModel.id, { apiKey: key })
          }
        }
      }
    }
  }, [apiKeys, customUrls, customProviderDefs, aiModels, updateAIModel])

  // All providers = built-in (filtered by hidden state) + custom (from ModelRegistry context)
  const allProviders = useMemo(() => {
    const visibleBuiltin = showHidden
      ? PROVIDERS
      : PROVIDERS.filter(p => !hiddenProviders.includes(p.id))
    return [...visibleBuiltin, ...customProviderDefs]
  }, [customProviderDefs, hiddenProviders, showHidden])

  // Filtered providers
  const filteredProviders = useMemo(() => {
    if (!searchQuery) return allProviders
    const q = searchQuery.toLowerCase()
    return allProviders.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.shortName.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.models.some(m => m.name.toLowerCase().includes(q))
    )
  }, [allProviders, searchQuery])

  // Provider-scoped model mutations — 使用 ModelRegistry 的 updateCustomProviderDef
  const handleProviderAddModel = useCallback((providerId: string, model: ModelDef) => {
    const provider = customProviderDefs.find(p => p.id === providerId);
    if (!provider) return;
    updateCustomProviderDef(providerId, {
      models: [...provider.models, model],
    });
  }, [customProviderDefs, updateCustomProviderDef])

  const handleProviderRemoveModel = useCallback((providerId: string, modelId: string) => {
    const fullModelId = `${providerId}::${modelId}`
    removeAIModel(fullModelId)
    const provider = customProviderDefs.find(p => p.id === providerId);
    if (!provider) return;
    updateCustomProviderDef(providerId, {
      models: provider.models.filter(m => m.id !== modelId),
    });
  }, [customProviderDefs, removeAIModel, updateCustomProviderDef])

  // Real diagnostic test — actual HTTP connectivity check
  const handleTestConnection = useCallback((providerId: string, modelId: string) => {
    const provider = allProviders.find(p => p.id === providerId)
    if (!provider) return
    const model = provider.models.find(m => m.id === modelId)
    if (!model) return
    const diagKey = `${providerId}:${modelId}`
    const providerApiKey = apiKeys[providerId] || ''
    const url = customUrls[providerId] || provider.baseURL

    // Pre-flight checks
    if (providerId !== 'ollama' && !providerApiKey) {
      setDiagnostics(prev => ({
        ...prev,
        [diagKey]: { providerId, modelName: model.name, status: 'error', message: '未配置 API Key，无法验证连接。请先填入 API Key。', timestamp: Date.now() },
      }))
      return
    }
    if (!url) {
      setDiagnostics(prev => ({
        ...prev,
        [diagKey]: { providerId, modelName: model.name, status: 'error', message: '未配置 API 端点 URL', timestamp: Date.now() },
      }))
      return
    }

    setDiagnostics(prev => ({
      ...prev,
      [diagKey]: { providerId, modelName: model.name, status: 'testing', message: '正在发送测试请求...', timestamp: Date.now() },
    }))

    const start = performance.now()
    const controller = new AbortController()
    const timeoutMs = 20000
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    // Convert external URL to proxy path to avoid CORS issues
    const getProxyUrl = (originalUrl: string): string => {
      if (originalUrl.includes('bigmodel.cn')) {
        return originalUrl.replace('https://open.bigmodel.cn/api/paas/v4', '/api/zhipu')
      } else if (originalUrl.includes('deepseek.com')) {
        return originalUrl.replace('https://api.deepseek.com', '/api/deepseek')
      } else if (originalUrl.includes('dashscope.aliyuncs.com')) {
        return originalUrl.replace('https://dashscope.aliyuncs.com/compatible-mode/v1', '/api/dashscope')
      } else if (originalUrl.includes('api.openai.com')) {
        return originalUrl.replace('https://api.openai.com/v1', '/api/openai')
      }
      return originalUrl // For Ollama and other local services, use original URL
    }

    const setResult = (result: Omit<DiagnosticResult, 'providerId' | 'modelName' | 'timestamp'>) => {
      setDiagnostics(prev => ({
        ...prev,
        [diagKey]: { providerId, modelName: model.name, timestamp: Date.now(), ...result },
      }))
    };

    (async () => {
      try {
        let resp: Response
        let testUrl = url

        // Use proxy for external APIs to avoid CORS
        if (providerId !== 'ollama') {
          testUrl = getProxyUrl(url)
        }

        if (providerId === 'ollama') {
          const ollamaBase = url.replace(/\/+$/, '')
          const chatUrl = ollamaBase.includes('/api/chat') ? ollamaBase : `${ollamaBase.replace(/\/api\/.*$/, '')}/api/chat`
          resp = await fetch(chatUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: model.id, messages: [{ role: 'user', content: 'Hi, respond with exactly: YANYUCLOUD_OK' }], stream: false }),
            signal: controller.signal,
          })
        } else if (providerId === 'claude') {
          resp = await fetch(testUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': providerApiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
            body: JSON.stringify({ model: model.id, max_tokens: 20, messages: [{ role: 'user', content: 'Hi, respond with exactly: YANYUCLOUD_OK' }] }),
            signal: controller.signal,
          })
        } else {
          resp = await fetch(testUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${providerApiKey}` },
            body: JSON.stringify({ model: model.id, messages: [{ role: 'user', content: 'Hi, respond with exactly: YANYUCLOUD_OK' }], stream: false, max_tokens: 20, temperature: 0 }),
            signal: controller.signal,
          })
        }

        clearTimeout(timer)
        const latency = Math.round(performance.now() - start)

        if (!resp.ok) {
          const errText = await resp.text().catch(() => '')
          let detail = ''
          try { const j = JSON.parse(errText); detail = j.error?.message || j.message || errText.slice(0, 200) } catch { detail = errText.slice(0, 200) }
          const s = resp.status
          const statusMsg = s === 401 ? 'API Key 无效或已过期 (401)' : s === 403 ? '权限不足 (403)' : s === 404 ? (providerId === 'ollama' ? `Ollama 模型未找到。请先 ollama pull ${model.id}` : '端点不存在 (404)') : s === 429 ? '请求频率超限 (429)' : `HTTP ${s}`
          setResult({ status: 'error', message: statusMsg + (detail ? `。${detail}` : ''), latency })
          return
        }

        const data = await resp.json().catch(() => null)
        let reply = ''
        if (providerId === 'ollama') reply = data?.message?.content || ''
        else if (providerId === 'claude') reply = data?.content?.[0]?.text || ''
        else reply = data?.choices?.[0]?.message?.content || data?.result || ''

        setResult({ status: 'success', message: '连接成功，API 响应正常', latency, modelResponse: reply.slice(0, 100) })

      } catch (err: any) {
        clearTimeout(timer)
        const latency = Math.round(performance.now() - start)
        if (err.name === 'AbortError') {
          setResult({ status: 'error', message: `连接超时 (${timeoutMs / 1000}s)。请检查端点是否可达。`, latency })
          return
        }
        const msg = err.message || ''
        const networkMsg = (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch'))
          ? '网络连接失败。可能原因：① 服务未启动 ② CORS 跨域限制 ③ 防火墙拦截。'
          : `测试异常: ${msg.slice(0, 200)}`
        setResult({ status: 'error', message: networkMsg, latency })
      }
    })()
  }, [allProviders, apiKeys, customUrls])

  // Select model — add to store if needed + activate
  const handleSelectModel = useCallback((providerId: string, modelId: string) => {
    const provider = allProviders.find(p => p.id === providerId)
    if (!provider) return
    const model = provider.models.find(m => m.id === modelId)
    if (!model) return
    const url = customUrls[providerId] || provider.baseURL
    const key = apiKeys[providerId] || ''
    const providerType = providerId === 'openai' ? 'openai' : providerId === 'ollama' ? 'ollama' : 'custom'

    const storeModelName = model.id

    const existing = aiModels.find(m =>
      (m.name === storeModelName || m.name === model.name) && m.endpoint === url
    )

    if (existing) {
      updateAIModel(existing.id, { apiKey: key, name: storeModelName })
      activateAIModel(existing.id)
    } else {
      pendingActivationRef.current = storeModelName
      addAIModel({
        name: storeModelName,
        provider: providerType,
        endpoint: url,
        apiKey: key,
        isActive: false,
      })
    }
    setSelectionToast(model.name)
    setTimeout(() => setSelectionToast(null), 2500)
  }, [allProviders, customUrls, apiKeys, aiModels, activateAIModel, addAIModel, updateAIModel])

  // Compute the "active model key" (providerId:modelId) from the current activeModelId in store
  const activeModelKey = useMemo(() => {
    if (!activeModelId) return null
    const activeModel = aiModels.find(m => m.id === activeModelId)
    if (!activeModel) return null

    for (const provider of allProviders) {
      const url = customUrls[provider.id] || provider.baseURL
      for (const model of provider.models) {
        if (
          (activeModel.name === model.id || activeModel.name === model.name) &&
          activeModel.endpoint === url
        ) {
          return `${provider.id}:${model.id}`
        }
      }
    }
    // Fuzzy matching on name or id (ignoring endpoint)
    for (const provider of allProviders) {
      for (const model of provider.models) {
        const n = activeModel.name.toLowerCase()
        if (n === model.name.toLowerCase() || n === model.id.toLowerCase()) {
          return `${provider.id}:${model.id}`
        }
      }
    }
    return null
  }, [activeModelId, aiModels, allProviders, customUrls])

  // Add custom provider — 通过 ModelRegistry context 写入
  const handleAddProvider = useCallback(() => {
    if (!newProvider.name || !newProvider.baseURL) return
    const id = `custom-${Date.now()}`
    const provider: ProviderDef = {
      id,
      name: newProvider.name,
      shortName: newProvider.name.slice(0, 4),
      icon: Bot,
      color: 'text-pink-400',
      colorBg: 'bg-pink-500/10',
      colorBorder: 'border-pink-500/20',
      description: '自定义 OpenAI 兼容服务',
      baseURL: newProvider.baseURL,
      apiKeyUrl: newProvider.apiKeyUrl,
      apiKeyPlaceholder: 'sk-...',
      openaiCompatible: true,
      docsUrl: '',
      models: [],
    }
    addCustomProviderDef(provider)
    setNewProvider({ name: '', baseURL: '', apiKeyUrl: '' })
    setAddingProvider(false)
    setExpandedProvider(id)
  }, [newProvider, addCustomProviderDef])

  const handleRemoveProvider = useCallback((id: string) => {
    removeCustomProviderDef(id)
  }, [removeCustomProviderDef])

  // Ollama scan - 优先走 Vite proxy 避免 CORS
  const handleScanOllama = useCallback(() => {
    logger.info('[Ollama] Scan button clicked, host:', ollamaHost);
    setOllamaScanning(true)
    setOllamaModels([])
    setOllamaConnected(false)

    const baseUrl = ollamaHost.replace(/\/+$/, '')

    // 优先使用 Vite proxy (/api/ollama) 绕过浏览器 CORS 限制
    const useProxyPath = typeof window !== 'undefined'
    const url = useProxyPath
      ? `/api/ollama/api/tags`
      : `${baseUrl}/api/tags`

    logger.info('[Ollama] Fetching URL:', url);

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    }

    fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers,
    })
      .then(r => {
        logger.info('[Ollama] Response status:', r.status);
        clearTimeout(timeoutId)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        logger.info('[Ollama] Response data:', data);
        const models: OllamaDetectedModel[] = (data.models || []).map((m: any) => ({
          name: m.name || m.model,
          size: m.size ? `${(m.size / 1e9).toFixed(1)} GB` : 'N/A',
          status: 'online' as const,
          quantization: m.details?.quantization_level || m.details?.family || 'N/A',
        }))

        logger.info('[Ollama] Parsed models:', models);

        if (models.length === 0) {
          setOllamaConnected(true)
          setOllamaScanning(false)
          return
        }

        setOllamaModels(models)
        setOllamaConnected(true)
        setOllamaScanning(false)
      })
      .catch((err) => {
        clearTimeout(timeoutId)
        logger.error('[Ollama] Scan failed:', err.message, err.name);

        // 真实检测失败时，显示空列表，不再使用模拟数据
        logger.info('[Ollama] Connection failed, showing empty model list');
        setOllamaModels([])
        setOllamaConnected(false)
        setOllamaScanning(false)
      })
  }, [ollamaHost])

  const handleImportOllama = useCallback((model: OllamaDetectedModel) => {
    addAIModel({
      name: model.name,
      provider: 'ollama',
      endpoint: `${ollamaHost.replace(/\/+$/, '')}/api/chat`,
      apiKey: '',
      isActive: false,
      isDetected: true,
    })
  }, [addAIModel, ollamaHost])

  if (!modelSettingsOpen) return null

  // Embedded mode: render content only (adaptive height for parent container)
  if (mode === 'embedded') {
    return (
      <div className="model-settings-embedded w-full flex flex-col" style={{ minHeight: '600px' }}>
        {/* Header */}
        <div className={`flex items-center gap-3 px-5 py-4 border-b ${t.sectionBorder}`}>
          <div className={`w-9 h-9 rounded-xl ${t.accentBg} border ${t.accentBorder} flex items-center justify-center`}>
            <Sparkles className={`w-4 h-4 ${t.accent}`} />
          </div>
          <div className="flex-1">
            <div className={`text-[14px] ${t.textPrimary}`}>AI 模型服务管理</div>
            <div className={`text-[11px] ${t.textTertiary}`}>多服务商 · Ollama 本地 · MCP 工具 · 智能诊断</div>
          </div>
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] w-48">
            <Search className="w-3.5 h-3.5 text-white/20" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索服务商 / 模型..."
              className="bg-transparent text-[11px] text-white/60 placeholder:text-white/15 focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 px-5 pt-3 pb-0 border-b ${t.sectionBorder} overflow-x-auto`}>
          {([
            { key: 'mentor' as const, label: '导师面板', icon: Sparkles },
            { key: 'providers' as const, label: '服务商管理', icon: Cloud },
            { key: 'ollama' as const, label: 'Ollama 本地', icon: Server },
            { key: 'mcp' as const, label: 'MCP 工具', icon: Plug },
            { key: 'proxy' as const, label: '代理配置', icon: Network },
            { key: 'diagnostics' as const, label: '智能诊断', icon: Activity },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] transition-all border-b-2 whitespace-nowrap ${activeTab === key
                ? `${t.activeTabText} border-current ${t.activeBg}`
                : `${t.textTertiary} border-transparent hover:text-white/50`
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Content - in embedded mode, let parent container handle scrolling */}
        <div className="flex-1 p-5">
          {/* Providers Tab */}
          {activeTab === 'providers' && (
            <div className="space-y-3">
              {/* Active model indicator */}
              {activeModelId && (() => {
                const activeModel = aiModels.find(m => m.id === activeModelId)
                const matchedProvider = activeModelKey ? allProviders.find(p => activeModelKey.startsWith(`${p.id}:`)) : null
                return (
                  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/15 mb-1"
                    style={{ boxShadow: '0 0 16px -4px rgba(99,102,241,0.1)' }}
                  >
                    {matchedProvider ? (
                      <div className={`w-6 h-6 rounded-lg ${matchedProvider.colorBg} border ${matchedProvider.colorBorder} flex items-center justify-center`}>
                        <matchedProvider.icon className={`w-3 h-3 ${matchedProvider.color}`} />
                      </div>
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-indigo-300">{activeModel?.name || '未知'}</span>
                        {matchedProvider && (
                          <span className="text-[9px] text-white/20">{matchedProvider.name}</span>
                        )}
                      </div>
                      <div className="text-[9px] text-white/15 font-mono truncate">{activeModel?.endpoint}</div>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400/70 border border-indigo-500/15 shrink-0">
                      当前使用中
                    </span>
                  </div>
                )
              })()}

              {/* Provider cards */}
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-white/30 uppercase tracking-wider">服务商列表</div>
                <button
                  onClick={() => setShowHidden(p => !p)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] transition-all border ${showHidden ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'text-white/25 hover:text-white/50 hover:bg-white/5 border-transparent'}`}
                >
                  {showHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {showHidden ? '显示全部' : `已隐藏 ${hiddenProviders.length} 个`}
                </button>
              </div>
              {filteredProviders.map(provider => {
                const providerDiags: Record<string, DiagnosticResult> = {}
                provider.models.forEach(m => {
                  const d = diagnostics[`${provider.id}:${m.id}`]
                  if (d) providerDiags[m.id] = d
                })

                const isBuiltin = !!PROVIDERS.find(p => p.id === provider.id)

                // 为 Ollama provider 获取已导入的模型
                const ollamaImportedModels = provider.id === 'ollama'
                  ? aiModels.filter(m => m.provider === 'ollama').map(m => ({
                    id: m.id,
                    name: m.name,
                    endpoint: m.endpoint,
                    isActive: m.isActive ?? false,
                  }))
                  : undefined

                return (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    apiKey={apiKeys[provider.id] || ''}
                    customUrl={customUrls[provider.id] || ''}
                    onApiKeyChange={key => setApiKeys(prev => ({ ...prev, [provider.id]: key }))}
                    onUrlChange={url => setCustomUrls(prev => ({ ...prev, [provider.id]: url }))}
                    onAddModel={model => handleProviderAddModel(provider.id, model)}
                    onRemoveModel={modelId => handleProviderRemoveModel(provider.id, modelId)}
                    onTestConnection={modelId => handleTestConnection(provider.id, modelId)}
                    onSelectModel={modelId => handleSelectModel(provider.id, modelId)}
                    activeModelKey={activeModelKey}
                    diagnostics={providerDiags}
                    expanded={expandedProvider === provider.id}
                    onToggle={() => setExpandedProvider(prev => prev === provider.id ? null : provider.id)}
                    isCustom={!isBuiltin}
                    isHidden={hiddenProviders.includes(provider.id)}
                    onHideProvider={isBuiltin ? () => setHiddenProviders(prev =>
                      prev.includes(provider.id)
                        ? prev.filter(id => id !== provider.id)
                        : [...prev, provider.id]
                    ) : undefined}
                    onRemoveProvider={!isBuiltin ? () => handleRemoveProvider(provider.id) : undefined}
                    importedModels={ollamaImportedModels}
                  />
                )
              })}

              {/* Add custom provider */}
              {addingProvider ? (
                <div className="rounded-xl border border-dashed border-pink-500/20 bg-pink-500/[0.03] p-4 space-y-3">
                  <div className="text-[11px] text-pink-400/70 mb-1">添加自定义服务商 (OpenAI 兼容)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">服务商名称</label>
                      <input
                        value={newProvider.name}
                        onChange={e => setNewProvider(p => ({ ...p, name: e.target.value }))}
                        placeholder="如 Groq / Mistral / 零一万物"
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-white/70 placeholder:text-white/10 focus:outline-none focus:border-pink-500/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">API Key 获取链接</label>
                      <input
                        value={newProvider.apiKeyUrl}
                        onChange={e => setNewProvider(p => ({ ...p, apiKeyUrl: e.target.value }))}
                        placeholder="https://..."
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-white/70 placeholder:text-white/10 focus:outline-none focus:border-pink-500/40 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Base URL</label>
                    <input
                      value={newProvider.baseURL}
                      onChange={e => setNewProvider(p => ({ ...p, baseURL: e.target.value }))}
                      placeholder="https://api.example.com/v1/chat/completions"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-white/70 placeholder:text-white/10 focus:outline-none focus:border-pink-500/40 font-mono"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleAddProvider} disabled={!newProvider.name || !newProvider.baseURL}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-pink-500/15 text-pink-400 text-[11px] hover:bg-pink-500/25 transition-all disabled:opacity-30 border border-pink-500/20">
                      <Plus className="w-3 h-3" /> 添加服务商
                    </button>
                    <button onClick={() => setAddingProvider(false)}
                      className="px-4 py-2 rounded-lg text-white/30 text-[11px] hover:bg-white/[0.04] transition-all">
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingProvider(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/[0.08] text-white/25 hover:text-white/50 hover:border-white/[0.15] transition-all text-[12px]">
                  <Plus className="w-4 h-4" /> 增加模型服务商
                </button>
              )}

              {/* Tip */}
              <div className="px-4 py-2.5 rounded-xl bg-indigo-500/[0.03] border border-indigo-500/10 flex items-start gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-indigo-400/50 shrink-0 mt-0.5" />
                <div className="text-[10px] text-white/25">
                  <strong className="text-indigo-400/40">提示：</strong>阿里云 DashScope 完全兼容 OpenAI API 协议，只需修改 baseURL 即可集成到 LangChain、Vercel AI SDK 等框架。所有标记"OpenAI 兼容"的服务商均支持统一的 <code className="text-cyan-400/40 bg-white/[0.03] px-1 py-0.5 rounded">openai</code> 库调用。
                </div>
              </div>
            </div>
          )}

          {/* Ollama Tab */}
          {activeTab === 'ollama' && (
            <div className="space-y-4">
              {/* Ollama host config */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}
              >
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-amber-400" />
                  <span className="text-[12px] text-white/70">Ollama 服务端点</span>
                  <div className={`ml-auto flex items-center gap-1.5 text-[10px] ${ollamaConnected ? 'text-emerald-400' : 'text-white/25'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${ollamaConnected ? 'bg-emerald-400' : 'bg-white/15'}`} />
                    {ollamaConnected ? '已连接' : '未连接'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={ollamaHost}
                    onChange={e => setOllamaHost(e.target.value)}
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/70 font-mono focus:outline-none focus:border-amber-500/40"
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleScanOllama()
                    }}
                    disabled={ollamaScanning}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/15 text-amber-400 text-[11px] hover:bg-amber-500/25 transition-all disabled:opacity-50 border border-amber-500/20 cursor-pointer disabled:cursor-not-allowed active:scale-95"
                    type="button"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${ollamaScanning ? 'animate-spin' : ''}`} />
                    {ollamaScanning ? '扫描中...' : '自动检测'}
                  </button>
                </div>
                <div className="text-[10px] text-white/20">
                  Ollama 服务需在宿主机运行（<code className="text-amber-400/30">ollama serve</code>）。检测通过 HTTP API 获取本地模型列表，数据完全私有。
                </div>
              </div>

              {/* Model Storage Path — 恒久保存机制 */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[12px] text-white/70">模型存储路径</span>
                  <span className="text-[9px] text-emerald-400/60 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">恒久保存</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] font-mono text-[11px] text-cyan-400/60">
                  <span className="text-white/20">OLLAMA_MODELS=</span>
                  <span className="text-cyan-400">/Users/yanyu/models</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-white/25">
                  <span>blobs: 4 个文件</span>
                  <span className="text-white/10">|</span>
                  <span>manifests: registry.ollama.ai</span>
                  <span className="text-white/10">|</span>
                  <span className="text-emerald-400/40">模型数据已迁移 ✓</span>
                </div>
              </div>

              {/* Detected models */}
              {ollamaModels.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-white/30 uppercase tracking-wider">检测到的模型 ({ollamaModels.length})</div>
                    {!ollamaConnected && <span className="text-[9px] text-amber-400/40">模拟数据（未连接 Ollama）</span>}
                  </div>
                  {ollamaModels.map(model => {
                    const alreadyImported = aiModels.some(m => m.name === model.name && m.provider === 'ollama')
                    return (
                      <div key={model.name} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-amber-500/15 transition-all">
                        <div className={`w-2 h-2 rounded-full ${model.status === 'online' ? 'bg-emerald-400' : 'bg-white/15'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] text-white/70">{model.name}</div>
                          <div className="text-[10px] text-white/25">{model.size} · {model.quantization}</div>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${model.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/[0.04] text-white/20'
                          }`}>
                          {model.status === 'online' ? '在线' : '离线'}
                        </span>
                        {alreadyImported ? (
                          <span className="text-[10px] text-white/20 flex items-center gap-1"><Check className="w-3 h-3" /> 已导入</span>
                        ) : (
                          <button onClick={() => handleImportOllama(model)} disabled={model.status === 'offline'}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] hover:bg-amber-500/20 transition-all disabled:opacity-30 border border-amber-500/20">
                            <Plus className="w-3 h-3" /> 导入
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Empty state - no models detected */}
              {ollamaModels.length === 0 && !ollamaScanning && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mb-4">
                    {ollamaConnected ? (
                      <Server className="w-7 h-7 text-emerald-400/30" />
                    ) : (
                      <Server className="w-7 h-7 text-white/10" />
                    )}
                  </div>
                  {ollamaConnected ? (
                    <>
                      <p className="text-[12px] text-white/25 mb-1">Ollama 服务已连接</p>
                      <p className="text-[10px] text-white/15">但未检测到已安装的模型</p>
                      <div className="mt-3 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <code className="text-[10px] text-cyan-400/40">ollama pull llama3.1:8b</code>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-[12px] text-white/25 mb-1">无法连接到 Ollama 服务</p>
                      <p className="text-[10px] text-white/15">请确保 Ollama 已安装并运行</p>
                      <div className="mt-3 space-y-1.5 text-left">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/[0.02] text-[10px]">
                          <span className="text-amber-400/40">1.</span>
                          <span className="text-white/25">安装 Ollama:</span>
                          <code className="text-cyan-400/40">brew install ollama</code>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/[0.02] text-[10px]">
                          <span className="text-amber-400/40">2.</span>
                          <span className="text-white/25">启动服务:</span>
                          <code className="text-cyan-400/40">ollama serve</code>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/[0.02] text-[10px]">
                          <span className="text-amber-400/40">3.</span>
                          <span className="text-white/25">拉取模型:</span>
                          <code className="text-cyan-400/40">ollama pull llama3.1:8b</code>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {ollamaScanning && ollamaModels.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/[0.06] border border-amber-500/15 flex items-center justify-center mb-4 relative">
                    <Server className="w-7 h-7 text-amber-400/40" />
                    <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/30 animate-ping" />
                  </div>
                  <p className="text-[12px] text-amber-400/60 mb-1">正在扫描 Ollama 服务...</p>
                  <p className="text-[10px] text-white/15">{ollamaHost}/api/tags</p>
                </div>
              )}
            </div>
          )}

          {/* MCP Tab */}
          {activeTab === 'mcp' && <MCPConfigPanel />}

          {/* Proxy Tab */}
          {activeTab === 'proxy' && <ProxyConfigPanel />}

          {/* Diagnostics Tab */}
          {activeTab === 'mentor' && <MentorPanel />}
          {activeTab === 'diagnostics' && (
            <SmartDiagnosticsPanel
              providers={allProviders}
              apiKeys={apiKeys}
              diagnostics={diagnostics}
              onRunDiagnostic={handleTestConnection}
              onSelectModel={handleSelectModel}
              activeModelKey={activeModelKey}
            />
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-5 py-3 border-t ${t.sectionBorder} ${t.surfaceInset}`}>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] ${t.textMuted}`}>
              {allProviders.length} 个服务商 · {allProviders.reduce((sum, p) => sum + p.models.length, 0)} 个模型
            </span>
            {Object.values(diagnostics).filter(d => d.status === 'success').length > 0 && (
              <span className="text-[10px] text-emerald-400/40">
                {Object.values(diagnostics).filter(d => d.status === 'success').length} 在线
              </span>
            )}
            {(() => {
              try {
                const cfg = loadProxyConfig()
                if (cfg.enabled) return <span className="text-[10px] text-indigo-400/40 flex items-center gap-1"><Network className="w-3 h-3" />代理已启用</span>
              } catch { /* 代理配置加载失败时忽略 */ }
              return null
            })()}
          </div>
        </div>
      </div>
    )
  }

  // Modal mode: render with backdrop and modal shell
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className={`absolute inset-0 ${t.overlayBg} backdrop-blur-md`} onClick={closeModelSettings} />
      <div
        className={`relative w-[920px] max-h-[88vh] ${t.modalBg} border ${t.modalBorder} rounded-2xl flex flex-col overflow-hidden`}
        style={{ boxShadow: t.modalShadow, animation: 'modalIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className={`flex items-center gap-3 px-5 py-4 border-b ${t.sectionBorder}`}>
          <div className={`w-9 h-9 rounded-xl ${t.accentBg} border ${t.accentBorder} flex items-center justify-center`}>
            <Sparkles className={`w-4 h-4 ${t.accent}`} />
          </div>
          <div className="flex-1">
            <div className={`text-[14px] ${t.textPrimary}`}>AI 模型服务管理</div>
            <div className={`text-[11px] ${t.textTertiary}`}>多服务商 · Ollama 本地 · MCP 工具 · 智能诊断</div>
          </div>
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] w-48">
            <Search className="w-3.5 h-3.5 text-white/20" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索服务商 / 模型..."
              className="bg-transparent text-[11px] text-white/60 placeholder:text-white/15 focus:outline-none w-full"
            />
          </div>
          <button onClick={closeModelSettings} className={`p-2 rounded-lg ${t.textMuted} hover:text-white/60 ${t.hoverBg} transition-all`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 px-5 pt-3 pb-0 border-b ${t.sectionBorder} overflow-x-auto`}>
          {([
            { key: 'mentor' as const, label: '导师面板', icon: Sparkles },
            { key: 'providers' as const, label: '服务商管理', icon: Cloud },
            { key: 'ollama' as const, label: 'Ollama 本地', icon: Server },
            { key: 'mcp' as const, label: 'MCP 工具', icon: Plug },
            { key: 'proxy' as const, label: '代理配置', icon: Network },
            { key: 'diagnostics' as const, label: '智能诊断', icon: Activity },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] transition-all border-b-2 whitespace-nowrap ${activeTab === key
                ? `${t.activeTabText} border-current ${t.activeBg}`
                : `${t.textTertiary} border-transparent hover:text-white/50`
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5">
          {/* Providers Tab */}
          {activeTab === 'providers' && (
            <div className="space-y-3">
              {/* Active model indicator */}
              {activeModelId && (() => {
                const activeModel = aiModels.find(m => m.id === activeModelId)
                const matchedProvider = activeModelKey ? allProviders.find(p => activeModelKey.startsWith(`${p.id}:`)) : null
                return (
                  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/15 mb-1"
                    style={{ boxShadow: '0 0 16px -4px rgba(99,102,241,0.1)' }}
                  >
                    {matchedProvider ? (
                      <div className={`w-6 h-6 rounded-lg ${matchedProvider.colorBg} border ${matchedProvider.colorBorder} flex items-center justify-center`}>
                        <matchedProvider.icon className={`w-3 h-3 ${matchedProvider.color}`} />
                      </div>
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-indigo-300">{activeModel?.name || '未知'}</span>
                        {matchedProvider && (
                          <span className="text-[9px] text-white/20">{matchedProvider.name}</span>
                        )}
                      </div>
                      <div className="text-[9px] text-white/15 font-mono truncate">{activeModel?.endpoint}</div>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400/70 border border-indigo-500/15 shrink-0">
                      当前使用中
                    </span>
                  </div>
                )
              })()}

              {/* Provider cards */}
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-white/30 uppercase tracking-wider">服务商列表</div>
                <button
                  onClick={() => setShowHidden(p => !p)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] transition-all border ${showHidden ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'text-white/25 hover:text-white/50 hover:bg-white/5 border-transparent'}`}
                >
                  {showHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {showHidden ? '显示全部' : `已隐藏 ${hiddenProviders.length} 个`}
                </button>
              </div>
              {filteredProviders.map(provider => {
                const providerDiags: Record<string, DiagnosticResult> = {}
                provider.models.forEach(m => {
                  const d = diagnostics[`${provider.id}:${m.id}`]
                  if (d) providerDiags[m.id] = d
                })

                const isBuiltin = !!PROVIDERS.find(p => p.id === provider.id)

                // 为 Ollama provider 获取已导入的模型
                const ollamaImportedModels = provider.id === 'ollama'
                  ? aiModels.filter(m => m.provider === 'ollama').map(m => ({
                    id: m.id,
                    name: m.name,
                    endpoint: m.endpoint,
                    isActive: m.isActive ?? false,
                  }))
                  : undefined

                return (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    apiKey={apiKeys[provider.id] || ''}
                    customUrl={customUrls[provider.id] || ''}
                    onApiKeyChange={key => setApiKeys(prev => ({ ...prev, [provider.id]: key }))}
                    onUrlChange={url => setCustomUrls(prev => ({ ...prev, [provider.id]: url }))}
                    onAddModel={model => handleProviderAddModel(provider.id, model)}
                    onRemoveModel={modelId => handleProviderRemoveModel(provider.id, modelId)}
                    onTestConnection={modelId => handleTestConnection(provider.id, modelId)}
                    onSelectModel={modelId => handleSelectModel(provider.id, modelId)}
                    activeModelKey={activeModelKey}
                    diagnostics={providerDiags}
                    expanded={expandedProvider === provider.id}
                    onToggle={() => setExpandedProvider(prev => prev === provider.id ? null : provider.id)}
                    isCustom={!isBuiltin}
                    isHidden={hiddenProviders.includes(provider.id)}
                    onHideProvider={isBuiltin ? () => setHiddenProviders(prev =>
                      prev.includes(provider.id)
                        ? prev.filter(id => id !== provider.id)
                        : [...prev, provider.id]
                    ) : undefined}
                    onRemoveProvider={!isBuiltin ? () => handleRemoveProvider(provider.id) : undefined}
                    importedModels={ollamaImportedModels}
                  />
                )
              })}

              {/* Add custom provider */}
              {addingProvider ? (
                <div className="rounded-xl border border-dashed border-pink-500/20 bg-pink-500/[0.03] p-4 space-y-3">
                  <div className="text-[11px] text-pink-400/70 mb-1">添加自定义服务商 (OpenAI 兼容)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">服务商名称</label>
                      <input
                        value={newProvider.name}
                        onChange={e => setNewProvider(p => ({ ...p, name: e.target.value }))}
                        placeholder="如 Groq / Mistral / 零一万物"
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-white/70 placeholder:text-white/10 focus:outline-none focus:border-pink-500/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">API Key 获取链接</label>
                      <input
                        value={newProvider.apiKeyUrl}
                        onChange={e => setNewProvider(p => ({ ...p, apiKeyUrl: e.target.value }))}
                        placeholder="https://..."
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-white/70 placeholder:text-white/10 focus:outline-none focus:border-pink-500/40 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Base URL</label>
                    <input
                      value={newProvider.baseURL}
                      onChange={e => setNewProvider(p => ({ ...p, baseURL: e.target.value }))}
                      placeholder="https://api.example.com/v1/chat/completions"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-white/70 placeholder:text-white/10 focus:outline-none focus:border-pink-500/40 font-mono"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleAddProvider} disabled={!newProvider.name || !newProvider.baseURL}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-pink-500/15 text-pink-400 text-[11px] hover:bg-pink-500/25 transition-all disabled:opacity-30 border border-pink-500/20">
                      <Plus className="w-3 h-3" /> 添加服务商
                    </button>
                    <button onClick={() => setAddingProvider(false)}
                      className="px-4 py-2 rounded-lg text-white/30 text-[11px] hover:bg-white/[0.04] transition-all">
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingProvider(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/[0.08] text-white/25 hover:text-white/50 hover:border-white/[0.15] transition-all text-[12px]">
                  <Plus className="w-4 h-4" /> 增加模型服务商
                </button>
              )}

              {/* Tip */}
              <div className="px-4 py-2.5 rounded-xl bg-indigo-500/[0.03] border border-indigo-500/10 flex items-start gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-indigo-400/50 shrink-0 mt-0.5" />
                <div className="text-[10px] text-white/25">
                  <strong className="text-indigo-400/40">提示：</strong>阿里云 DashScope 完全兼容 OpenAI API 协议，只需修改 baseURL 即可集成到 LangChain、Vercel AI SDK 等框架。所有标记"OpenAI 兼容"的服务商均支持统一的 <code className="text-cyan-400/40 bg-white/[0.03] px-1 py-0.5 rounded">openai</code> 库调用。
                </div>
              </div>
            </div>
          )}

          {/* Ollama Tab */}
          {activeTab === 'ollama' && (
            <div className="space-y-4">
              {/* Ollama host config */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}
              >
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-amber-400" />
                  <span className="text-[12px] text-white/70">Ollama 服务端点</span>
                  <div className={`ml-auto flex items-center gap-1.5 text-[10px] ${ollamaConnected ? 'text-emerald-400' : 'text-white/25'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${ollamaConnected ? 'bg-emerald-400' : 'bg-white/15'}`} />
                    {ollamaConnected ? '已连接' : '未连接'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={ollamaHost}
                    onChange={e => setOllamaHost(e.target.value)}
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/70 font-mono focus:outline-none focus:border-amber-500/40"
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleScanOllama()
                    }}
                    disabled={ollamaScanning}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/15 text-amber-400 text-[11px] hover:bg-amber-500/25 transition-all disabled:opacity-50 border border-amber-500/20 cursor-pointer disabled:cursor-not-allowed active:scale-95"
                    type="button"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${ollamaScanning ? 'animate-spin' : ''}`} />
                    {ollamaScanning ? '扫描中...' : '自动检测'}
                  </button>
                </div>
                <div className="text-[10px] text-white/20">
                  Ollama 服务需在宿主机运行（<code className="text-amber-400/30">ollama serve</code>）。检测通过 HTTP API 获取本地模型列表，数据完全私有。
                </div>
              </div>

              {/* Model Storage Path — 恒久保存机制 */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[12px] text-white/70">模型存储路径</span>
                  <span className="text-[9px] text-emerald-400/60 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">恒久保存</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] font-mono text-[11px] text-cyan-400/60">
                  <span className="text-white/20">OLLAMA_MODELS=</span>
                  <span className="text-cyan-400">/Users/yanyu/models</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-white/25">
                  <span>blobs: 4 个文件</span>
                  <span className="text-white/10">|</span>
                  <span>manifests: registry.ollama.ai</span>
                  <span className="text-white/10">|</span>
                  <span className="text-emerald-400/40">模型数据已迁移 ✓</span>
                </div>
              </div>

              {/* Detected models */}
              {ollamaModels.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-white/30 uppercase tracking-wider">检测到的模型 ({ollamaModels.length})</div>
                    {!ollamaConnected && <span className="text-[9px] text-amber-400/40">模拟数据（未连接 Ollama）</span>}
                  </div>
                  {ollamaModels.map(model => {
                    const alreadyImported = aiModels.some(m => m.name === model.name && m.provider === 'ollama')
                    return (
                      <div key={model.name} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-amber-500/15 transition-all">
                        <div className={`w-2 h-2 rounded-full ${model.status === 'online' ? 'bg-emerald-400' : 'bg-white/15'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] text-white/70">{model.name}</div>
                          <div className="text-[10px] text-white/25">{model.size} · {model.quantization}</div>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${model.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/[0.04] text-white/20'
                          }`}>
                          {model.status === 'online' ? '在线' : '离线'}
                        </span>
                        {alreadyImported ? (
                          <span className="text-[10px] text-white/20 flex items-center gap-1"><Check className="w-3 h-3" /> 已导入</span>
                        ) : (
                          <button onClick={() => handleImportOllama(model)} disabled={model.status === 'offline'}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] hover:bg-amber-500/20 transition-all disabled:opacity-30 border border-amber-500/20">
                            <Plus className="w-3 h-3" /> 导入
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Empty state */}
              {ollamaModels.length === 0 && !ollamaScanning && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mb-4">
                    <Server className="w-7 h-7 text-white/10" />
                  </div>
                  <p className="text-[12px] text-white/25 mb-1">尚未检测到 Ollama 模型</p>
                  <p className="text-[10px] text-white/15">点击"自动检测"扫描本地 Ollama 服务</p>
                </div>
              )}

              {ollamaScanning && ollamaModels.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/[0.06] border border-amber-500/15 flex items-center justify-center mb-4 relative">
                    <Server className="w-7 h-7 text-amber-400/40" />
                    <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/30 animate-ping" />
                  </div>
                  <p className="text-[12px] text-amber-400/60 mb-1">正在扫描 Ollama 服务...</p>
                  <p className="text-[10px] text-white/15">{ollamaHost}/api/tags</p>
                </div>
              )}
            </div>
          )}

          {/* MCP Tab */}
          {activeTab === 'mcp' && <MCPConfigPanel />}

          {/* Proxy Tab */}
          {activeTab === 'proxy' && <ProxyConfigPanel />}

          {/* Mentor Tab */}
          {activeTab === 'mentor' && <MentorPanel />}

          {/* Diagnostics Tab */}
          {activeTab === 'diagnostics' && (
            <SmartDiagnosticsPanel
              providers={allProviders}
              apiKeys={apiKeys}
              diagnostics={diagnostics}
              onRunDiagnostic={handleTestConnection}
              onSelectModel={handleSelectModel}
              activeModelKey={activeModelKey}
            />
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-5 py-3 border-t ${t.sectionBorder} ${t.surfaceInset}`}>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] ${t.textMuted}`}>
              {allProviders.length} 个服务商 · {allProviders.reduce((sum, p) => sum + p.models.length, 0)} 个模型
            </span>
            {Object.values(diagnostics).filter(d => d.status === 'success').length > 0 && (
              <span className="text-[10px] text-emerald-400/40">
                {Object.values(diagnostics).filter(d => d.status === 'success').length} 在线
              </span>
            )}
            {(() => {
              try {
                const cfg = loadProxyConfig()
                if (cfg.enabled) return <span className="text-[10px] text-indigo-400/40 flex items-center gap-1"><Network className="w-3 h-3" />代理已启用</span>
              } catch { /* 代理配置加载失败时忽略 */ }
              return null
            })()}
          </div>
          <button onClick={closeModelSettings}
            className={`px-4 py-1.5 rounded-lg ${t.badgeBg} ${t.textTertiary} text-[11px] ${t.hoverBg} transition-all`}>
            完成
          </button>
        </div>

        {/* Selection toast */}
        {selectionToast && (
          <div
            className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/25 backdrop-blur-sm"
            style={{ boxShadow: '0 4px 20px rgba(99,102,241,0.15)', animation: 'modalIn 0.15s ease-out' }}
          >
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            <span className="text-[12px] text-indigo-300">已切换至 <strong>{selectionToast}</strong></span>
          </div>
        )}
      </div>
    </div>
  )
}
