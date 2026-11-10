/**
 * @file: EnvironmentConfigPanel.tsx
 * @description: YYC³ 环境变量配置面板 — UI页面编辑
 *              支持网关管理、认证配置、终端设置、心跳同步
 *              开源原则：本地存储、零数据收集、用户直面第三方
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-06
 * @license: MIT
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Globe,
  Server,
  Terminal as TerminalIcon,
  Heart,
  Shield,
  Network,
  Plus,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Zap,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Upload,
  RotateCcw,
  Wifi,
  WifiOff,
  Key,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  Clock,
  Settings,
  ExternalLink,
  Copy,
  TestTube,
} from 'lucide-react'
import {
  useEnvironmentStore,
  type AuthMethod,
  getActiveGateway,
} from './EnvironmentConfig'
import { toastSuccess, toastError, toastWarning } from '../stores/useToastStore'
import { confirmDialog } from '../stores/useConfirmStore'
import { usePromptStore } from '../stores/usePromptStore'

type TabId = 'gateway' | 'terminal' | 'heartbeat' | 'proxy' | 'features' | 'env-vars'

interface TabDef {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const TABS: TabDef[] = [
  { id: 'gateway', label: '网关与认证', icon: Globe },
  { id: 'terminal', label: '终端配置', icon: TerminalIcon },
  { id: 'heartbeat', label: '心跳同步', icon: Heart },
  { id: 'proxy', label: '网络代理', icon: Network },
  { id: 'features', label: '功能开关', icon: Zap },
  { id: 'env-vars', label: '环境变量', icon: Settings },
]

const AUTH_METHODS: { value: AuthMethod; label: string; description: string }[] = [
  { value: 'api_key', label: 'API Key', description: '标准API密钥认证' },
  { value: 'oauth2', label: 'OAuth 2.0', description: '授权码/客户端凭证流程' },
  { value: 'jwt', label: 'JWT Token', description: 'JSON Web Token' },
  { value: 'token', label: 'Bearer Token', description: '简单令牌认证' },
  { value: 'certificate', label: '客户端证书', description: 'mTLS双向认证' },
  { value: 'none', label: '无认证', description: '公开访问（不推荐）' },
]

const SHELL_OPTIONS = [
  { value: 'bash', label: 'Bash', description: 'GNU Bash' },
  { value: 'zsh', label: 'Zsh (默认)', description: 'Z Shell - macOS默认' },
  { value: 'pwsh', label: 'PowerShell', description: 'PowerShell Core' },
  { value: 'fish', label: 'Fish', description: 'Friendly Interactive Shell' },
  { value: 'custom', label: '自定义', description: '指定自定义Shell路径' },
]

export default function EnvironmentConfigPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('gateway')
  const [showAddGateway, setShowAddGateway] = useState(false)
  const [testingGateway, setTestingGateway] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; latency?: number; error?: string }>>({})
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const [expandedGateways, setExpandedGateways] = useState<Set<string>>(new Set())
  const [newGateway, setNewGateway] = useState({
    name: '',
    url: '',
    method: 'api_key' as AuthMethod,
    apiKey: '',
  })

  const store = useEnvironmentStore()
  const activeGateway = useEnvironmentStore(getActiveGateway)

  // ── 测试连接 ──
  const handleTestConnection = useCallback(async (id: string) => {
    setTestingGateway(id)
    const result = await store.testGatewayConnection(id)
    setTestResult((prev) => ({ ...prev, [id]: result }))
    setTestingGateway(null)
  }, [store])

  // ── 添加网关 ──
  const handleAddGateway = useCallback(() => {
    if (!newGateway.name || !newGateway.url) return

    store.addGateway({
      name: newGateway.name,
      url: newGateway.url.replace(/\/$/, ''),
      auth: {
        method: newGateway.method,
        credentials: newGateway.method === 'none' ? {} : { apiKey: newGateway.apiKey },
      },
      isActive: false,
      priority: store.gateways.length,
    })

    setNewGateway({ name: '', url: '', method: 'api_key', apiKey: '' })
    setShowAddGateway(false)
  }, [newGateway, store])

  // ── 导入导出 ──
  const handleExport = useCallback(() => {
    const json = store.exportConfig()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yyc3-env-config-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [store])

  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      if (store.importConfig(text)) {
        toastSuccess('配置导入成功！')
      } else {
        toastError('导入失败，请检查文件格式')
      }
    }
    input.click()
  }, [store])

  // ── 心跳同步 ──
  useEffect(() => {
    if (store.heartbeat.enabled && !store.heartbeat.hostIp) {
      store.syncHostInfo()
    }
  }, [store.heartbeat.enabled])

  return (
    <div className="flex flex-col bg-[var(--ide-bg)] text-[var(--ide-text-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ide-border)] bg-[var(--ide-bg-elevated)]">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[var(--ide-accent)]" />
          <span className="font-medium">环境配置中心</span>
          <span className="text-xs text-[var(--ide-text-dim)]">本地存储 · 零收集</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleExport}
            className="p-1.5 rounded hover:bg-white/5 transition-colors"
            title="导出配置"
          >
            <Download className="w-4 h-4 text-[var(--ide-text-muted)]" />
          </button>
          <button
            onClick={handleImport}
            className="p-1.5 rounded hover:bg-white/5 transition-colors"
            title="导入配置"
          >
            <Upload className="w-4 h-4 text-[var(--ide-text-muted)]" />
          </button>
          <button
            onClick={async () => {
              if (await confirmDialog('确定要重置所有配置到默认值吗？')) {
                store.resetToDefaults()
              }
            }}
            className="p-1.5 rounded hover:bg-white/5 transition-colors"
            title="重置为默认"
          >
            <RotateCcw className="w-4 h-4 text-[var(--ide-text-muted)]" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-2 py-1 border-b border-[var(--ide-border)] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-t text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[var(--ide-bg)] text-[var(--ide-accent)] border-b-2 border-[var(--ide-accent)]'
                : 'text-[var(--ide-text-muted)] hover:text-[var(--ide-text-secondary)] hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content — 外层 SettingsPage Body 已处理滚动，此处无需嵌套 overflow */}
      <div className="p-4 space-y-6">
        {/* ════════════ 网关与认证 ════════════ */}
        {activeTab === 'gateway' && (
          <section className="space-y-4">
            {/* 当前活跃网关 */}
            {activeGateway && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">当前活跃网关</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[var(--ide-text-muted)]" />
                  <code className="text-sm">{activeGateway.name}</code>
                  <a
                    href={activeGateway.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    {activeGateway.url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {activeGateway.latency !== undefined && (
                    <span className="text-xs text-[var(--ide-text-dim)]">
                      {activeGateway.latency}ms
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 网关列表 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">已配置网关</span>
                <button
                  onClick={() => setShowAddGateway(!showAddGateway)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[var(--ide-accent)]/10 text-[var(--ide-accent)] hover:bg-[var(--ide-accent)]/20 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  添加网关
                </button>
              </div>

              {store.gateways.map((gw) => (
                <div
                  key={gw.id}
                  className={`rounded-lg border transition-colors ${
                    gw.id === store.activeGatewayId
                      ? 'border-[var(--ide-accent)] bg-[var(--ide-accent)]/5'
                      : 'border-[var(--ide-border)] bg-[var(--ide-bg-deep)]'
                  }`}
                >
                  {/* 网关头部 */}
                  <button
                    onClick={() => {
                      setExpandedGateways((prev) => {
                        const next = new Set(prev)
                        if (next.has(gw.id)) {
                          next.delete(gw.id)
                        } else {
                          next.add(gw.id)
                        }
                        return next
                      })
                    }}
                    className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedGateways.has(gw.id) ? (
                        <ChevronDown className="w-4 h-4 text-[var(--ide-text-faint)]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[var(--ide-text-faint)]" />
                      )}
                      <Server className="w-4 h-4 text-[var(--ide-text-muted)]" />
                      <span className="text-sm font-medium">{gw.name}</span>
                      {gw.auth.method !== 'none' && (
                        gw.auth.credentials.apiKey ? (
                          <Lock className="w-3 h-3 text-green-400" />
                        ) : (
                          <Unlock className="w-3 h-3 text-yellow-400" />
                        )
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {gw.id !== store.activeGatewayId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            store.setActiveGateway(gw.id)
                          }}
                          className="px-2 py-0.5 rounded text-xs bg-[var(--ide-accent)]/20 text-[var(--ide-accent)] hover:bg-[var(--ide-accent)]/30"
                        >
                          设为活跃
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTestConnection(gw.id)
                        }}
                        disabled={testingGateway === gw.id}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        title="测试连接"
                      >
                        {testingGateway === gw.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <TestTube className="w-3.5 h-3.5 text-[var(--ide-text-muted)]" />
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          store.removeGateway(gw.id)
                        }}
                        className="p-1 rounded hover:bg-red-500/20 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400/60" />
                      </button>
                    </div>
                  </button>

                  {/* 测试结果 */}
                  {testResult[gw.id] && (
                    <div className={`mx-3 mb-2 p-2 rounded text-xs flex items-center gap-2 ${
                      testResult[gw.id].success
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {testResult[gw.id].success ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {testResult[gw.id].success
                        ? `连接成功 (${testResult[gw.id].latency}ms)`
                        : testResult[gw.id].error || '连接失败'}
                    </div>
                  )}

                  {/* 展开详情 */}
                  {expandedGateways.has(gw.id) && (
                    <div className="px-3 pb-3 space-y-3 border-t border-[var(--ide-border)] pt-3">
                      {/* URL */}
                      <div>
                        <label className="block text-xs text-[var(--ide-text-muted)] mb-1">网关地址</label>
                        <input
                          type="url"
                          value={gw.url}
                          onChange={(e) => store.updateGateway(gw.id, { url: e.target.value })}
                          placeholder="https://api.example.com"
                          className="w-full px-2 py-1.5 rounded bg-[var(--ide-bg)] border border-[var(--ide-border)] text-sm focus:border-[var(--ide-accent)] outline-none"
                        />
                      </div>

                      {/* 认证方式 */}
                      <div>
                        <label className="block text-xs text-[var(--ide-text-muted)] mb-1">认证方式</label>
                        <select
                          value={gw.auth.method}
                          onChange={(e) =>
                            store.updateAuth(gw.id, { method: e.target.value as AuthMethod })
                          }
                          className="w-full px-2 py-1.5 rounded bg-[var(--ide-bg)] border border-[var(--ide-border)] text-sm focus:border-[var(--ide-accent)] outline-none"
                        >
                          {AUTH_METHODS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label} - {m.description}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* API Key */}
                      {gw.auth.method !== 'none' && (
                        <div>
                          <label className="block text-xs text-[var(--ide-text-muted)] mb-1">
                            {gw.auth.method === 'certificate' ? '证书路径' : '密钥/令牌'}
                          </label>
                          <div className="flex gap-1">
                            <input
                              type={showApiKey[gw.id] ? 'text' : 'password'}
                              value={gw.auth.credentials.apiKey || ''}
                              onChange={(e) =>
                                store.updateAuth(gw.id, {
                                  credentials: { ...gw.auth.credentials, apiKey: e.target.value },
                                })
                              }
                              placeholder={
                                gw.auth.method === 'api_key'
                                  ? 'sk-...'
                                  : gw.auth.method === 'jwt'
                                    ? 'eyJ...'
                                    : '输入密钥'
                              }
                              className="flex-1 px-2 py-1.5 rounded bg-[var(--ide-bg)] border border-[var(--ide-border)] text-sm font-mono focus:border-[var(--ide-accent)] outline-none"
                            />
                            <button
                              onClick={() =>
                                setShowApiKey((prev) => ({ ...prev, [gw.id]: !prev[gw.id] }))
                              }
                              className="p-1.5 rounded hover:bg-white/10 transition-colors"
                            >
                              {showApiKey[gw.id] ? (
                                <EyeOff className="w-4 h-4 text-[var(--ide-text-muted)]" />
                              ) : (
                                <Eye className="w-4 h-4 text-[var(--ide-text-muted)]" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 验证按钮 */}
                      {gw.auth.credentials.apiKey && (
                        <button
                          onClick={() => store.verifyAuth(gw.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        >
                          <Shield className="w-3 h-3" />
                          验证认证状态
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 添加网关表单 */}
            {showAddGateway && (
              <div className="p-4 rounded-lg border border-dashed border-[var(--ide-border)] space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  添加新网关
                </h4>

                <div>
                  <label className="block text-xs text-[var(--ide-text-muted)] mb-1">名称</label>
                  <input
                    type="text"
                    value={newGateway.name}
                    onChange={(e) => setNewGateway((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="例如：我的API网关"
                    className="w-full px-2 py-1.5 rounded bg-[var(--ide-bg)] border border-[var(--ide-border)] text-sm focus:border-[var(--ide-accent)] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[var(--ide-text-muted)] mb-1">地址</label>
                  <input
                    type="url"
                    value={newGateway.url}
                    onChange={(e) => setNewGateway((prev) => ({ ...prev, url: e.target.value }))}
                    placeholder="https://api.example.com"
                    className="w-full px-2 py-1.5 rounded bg-[var(--ide-bg)] border border-[var(--ide-border)] text-sm focus:border-[var(--ide-accent)] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[var(--ide-text-muted)] mb-1">认证方式</label>
                  <select
                    value={newGateway.method}
                    onChange={(e) => setNewGateway((prev) => ({ ...prev, method: e.target.value as AuthMethod }))}
                    className="w-full px-2 py-1.5 rounded bg-[var(--ide-bg)] border border-[var(--ide-border)] text-sm focus:border-[var(--ide-accent)] outline-none"
                  >
                    {AUTH_METHODS.filter((m) => m.value !== 'none').map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {newGateway.method !== 'none' && (
                  <div>
                    <label className="block text-xs text-[var(--ide-text-muted)] mb-1">API Key</label>
                    <input
                      type="password"
                      value={newGateway.apiKey}
                      onChange={(e) => setNewGateway((prev) => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="sk-..."
                      className="w-full px-2 py-1.5 rounded bg-[var(--ide-bg)] border border-[var(--ide-border)] text-sm font-mono focus:border-[var(--ide-accent)] outline-none"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleAddGateway}
                    disabled={!newGateway.name || !newGateway.url}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded text-sm bg-[var(--ide-accent)] text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    <Check className="w-3.5 h-3.5" />
                    添加
                  </button>
                  <button
                    onClick={() => setShowAddGateway(false)}
                    className="px-3 py-1.5 rounded text-sm border border-[var(--ide-border)] hover:bg-white/5 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ════════════ 终端配置 ════════════ */}
        {activeTab === 'terminal' && (
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Shell选择 */}
              <div>
                <label className="block text-xs text-[var(--ide-text-muted)] mb-1">默认 Shell</label>
                <select
                  value={store.terminal.shell}
                  onChange={(e) => store.updateTerminal({ shell: e.target.value as any })}
                  className="w-full px-2 py-1.5 rounded bg-[var(--ide-bg-deep)] border border-[var(--ide-border)] text-sm focus:border-[var(--ide-accent)] outline-none"
                >
                  {SHELL_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* 字体大小 */}
              <div>
                <label className="block text-xs text-[var(--ide-text-muted)] mb-1">字体大小</label>
                <input
                  type="number"
                  value={store.terminal.fontSize}
                  onChange={(e) => store.updateTerminal({ fontSize: parseInt(e.target.value) || 14 })}
                  min={10}
                  max={24}
                  className="w-full px-2 py-1.5 rounded bg-[var(--ide-bg-deep)] border border-[var(--ide-border)] text-sm focus:border-[var(--ide-accent)] outline-none"
                />
              </div>
            </div>

            {/* 自定义Shell路径 */}
            {store.terminal.shell === 'custom' && (
              <div>
                <label className="block text-xs text-[var(--ide-text-muted)] mb-1">自定义 Shell 路径</label>
                <input
                  type="text"
                  value={store.terminal.customShellPath || ''}
                  onChange={(e) => store.updateTerminal({ customShellPath: e.target.value })}
                  placeholder="/usr/local/bin/fish"
                  className="w-full px-2 py-1.5 rounded bg-[var(--ide-bg-deep)] border border-[var(--ide-border)] text-sm font-mono focus:border-[var(--ide-accent)] outline-none"
                />
              </div>
            )}

            {/* 开关选项 */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={store.terminal.cursorBlink}
                  onChange={(e) => store.updateTerminal({ cursorBlink: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">光标闪烁</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm">滚动缓冲:</span>
                <input
                  type="number"
                  value={store.terminal.scrollback}
                  onChange={(e) => store.updateTerminal({ scrollback: parseInt(e.target.value) || 5000 })}
                  min={1000}
                  max={50000}
                  step={1000}
                  className="w-20 px-2 py-1 rounded bg-[var(--ide-bg-deep)] border border-[var(--ide-border)] text-sm focus:border-[var(--ide-accent)] outline-none"
                />
                <span className="text-xs text-[var(--ide-text-dim)]">行</span>
              </label>
            </div>

            {/* 环境变量 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">终端环境变量</label>
                <span className="text-xs text-[var(--ide-text-dim)]">传递给子进程的环境变量</span>
              </div>
              <div className="space-y-1">
                {Object.entries(store.terminal.envVars).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <code className="text-xs text-cyan-400 min-w-[100px]">{key}</code>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => store.setTerminalEnvVar(key, e.target.value)}
                      className="flex-1 px-2 py-1 rounded bg-[var(--ide-bg-deep)] border border-[var(--ide-border)] text-sm font-mono focus:border-[var(--ide-accent)] outline-none"
                    />
                    <button
                      onClick={() => store.removeTerminalEnvVar(key)}
                      className="p-1 rounded hover:bg-red-500/20"
                    >
                      <X className="w-3 h-3 text-red-400/60" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={async () => {
                    const key = await usePromptStore.getState().openPrompt({
                      title: '添加环境变量',
                      message: '请输入变量名',
                      placeholder: '变量名',
                    })
                    if (key) store.setTerminalEnvVar(key, '')
                  }}
                  className="flex items-center gap-1 w-full px-2 py-1.5 rounded border border-dashed border-[var(--ide-border)] text-xs text-[var(--ide-text-muted)] hover:border-[var(--ide-accent)] hover:text-[var(--ide-accent)] transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  添加环境变量
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ════════════ 心跳同步 ════════════ */}
        {activeTab === 'heartbeat' && (
          <section className="space-y-4">
            <div className="p-4 rounded-lg bg-[var(--ide-bg-deep)] border border-[var(--ide-border)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {store.heartbeat.enabled ? (
                    <Wifi className="w-5 h-5 text-green-400" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="font-medium">宿主机IP心跳同步</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={store.heartbeat.enabled}
                    onChange={(e) =>
                      e.target.checked ? store.startHeartbeat() : store.stopHeartbeat()
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--ide-accent)]"></div>
                </label>
              </div>

              <p className="text-xs text-[var(--ide-text-dim)] mb-4">
                开启后，系统将定期获取并缓存您的公网IP地址，用于服务端身份验证。
                所有数据仅存储在本地浏览器中，不会上传至任何服务器。
              </p>

              {/* 当前IP信息 */}
              {store.heartbeat.hostIp && (
                <div className="flex items-center gap-2 p-2 rounded bg-blue-500/10 border border-blue-500/20">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">当前IP：</span>
                  <code className="text-sm font-mono text-blue-300">{store.heartbeat.hostIp}</code>
                  {store.heartbeat.lastSync && (
                    <span className="text-xs text-[var(--ide-text-dim)] ml-auto">
                      同步于 {new Date(store.heartbeat.lastSync).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}

              {/* 心跳间隔 */}
              <div className="mt-4">
                <label className="block text-xs text-[var(--ide-text-muted)] mb-1">
                  心跳间隔（毫秒）
                </label>
                <select
                  value={store.heartbeat.interval}
                  onChange={(e) => store.updateHeartbeat({ interval: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded bg-[var(--ide-bg)] border border-[var(--ide-border)] text-sm focus:border-[var(--ide-accent)] outline-none"
                >
                  <option value={10000}>10秒（高频）</option>
                  <option value={30000}>30秒（推荐）</option>
                  <option value={60000}>1分钟</option>
                  <option value={300000}>5分钟（低频）</option>
                </select>
              </div>

              {/* 手动同步 */}
              <button
                onClick={() => store.syncHostInfo()}
                className="mt-3 flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                立即同步IP
              </button>
            </div>

            {/* 安全说明 */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-400 mt-0.5" />
                <div className="text-xs text-amber-200/80 space-y-1">
                  <p className="font-medium">开源安全原则</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[var(--ide-text-dim)]">
                    <li>所有配置存储在 localStorage / IndexedDB 中</li>
                    <li>不向任何YYC³服务器发送用户个人信息</li>
                    <li>API调用直接发往用户配置的第三方服务</li>
                    <li>支持完全离线使用（除AI功能外）</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ════════════ 网络代理 ════════════ */}
        {activeTab === 'proxy' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">启用代理</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={store.proxy.enabled}
                  onChange={(e) => store.updateProxy({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--ide-accent)]"></div>
              </label>
            </div>

            {store.proxy.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[var(--ide-text-muted)] mb-1">协议</label>
                  <select
                    value={store.proxy.protocol}
                    onChange={(e) => store.updateProxy({ protocol: e.target.value as any })}
                    className="w-full px-2 py-1.5 rounded bg-[var(--ide-bg-deep)] border border-[var(--ide-border)] text-sm"
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                    <option value="socks5">SOCKS5</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[var(--ide-text-muted)] mb-1">端口</label>
                  <input
                    type="number"
                    value={store.proxy.port}
                    onChange={(e) => store.updateProxy({ port: parseInt(e.target.value) || 7890 })}
                    min={1}
                    max={65535}
                    className="w-full px-2 py-1.5 rounded bg-[var(--ide-bg-deep)] border border-[var(--ide-border)] text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs text-[var(--ide-text-muted)] mb-1">主机地址</label>
                  <input
                    type="text"
                    value={store.proxy.host}
                    onChange={(e) => store.updateProxy({ host: e.target.value })}
                    placeholder="127.0.0.1 或 proxy.example.com"
                    className="w-full px-2 py-1.5 rounded bg-[var(--ide-bg-deep)] border border-[var(--ide-border)] text-sm"
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {/* ════════════ 功能开关 ════════════ */}
        {activeTab === 'features' && (
          <section className="space-y-2">
            {Object.entries(store.featureFlags).map(([key, value]) => (
              <label
                key={key}
                className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer transition-colors"
              >
                <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    store.toggleFeature(key)
                  }}
                  className={`relative inline-flex items-center cursor-pointer ${
                    value ? 'text-green-400' : 'text-gray-400'
                  }`}
                >
                  {value ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
              </label>
            ))}
          </section>
        )}

        {/* ════════════ 自定义环境变量 ════════════ */}
        {activeTab === 'env-vars' && (
          <section className="space-y-4">
            <p className="text-xs text-[var(--ide-text-dim)]">
              自定义环境变量将注入到应用运行时环境中。可用于覆盖默认配置或传递额外参数。
            </p>

            <div className="space-y-1">
              {Object.entries(store.customEnvVars).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 p-2 rounded bg-[var(--ide-bg-deep)]">
                  <code className="text-xs text-yellow-400 min-w-[120px] font-mono">{key}</code>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => store.setCustomEnvVar(key, e.target.value)}
                    className="flex-1 px-2 py-1 rounded bg-[var(--ide-bg)] border border-[var(--ide-border)] text-sm font-mono focus:border-[var(--ide-accent)] outline-none"
                  />
                  <button
                    onClick={() => store.removeCustomEnvVar(key)}
                    className="p-1 rounded hover:bg-red-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400/60" />
                  </button>
                </div>
              ))}

              {Object.keys(store.customEnvVars).length === 0 && (
                <div className="text-center py-8 text-[var(--ide-text-dim)]">
                  <Settings className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">暂无自定义变量</p>
                </div>
              )}

              <button
                onClick={async () => {
                  const key = await usePromptStore.getState().openPrompt({
                    title: '添加自定义变量',
                    message: '变量名需使用大写字母和下划线',
                    placeholder: 'VARIABLE_NAME',
                    pattern: /^[A-Z_][A-Z0-9_]*$/,
                    patternError: '变量名格式无效，请使用大写字母和下划线',
                  })
                  if (key) {
                    store.setCustomEnvVar(key.toUpperCase(), '')
                  }
                }}
                className="flex items-center justify-center gap-1 w-full p-2 rounded border border-dashed border-[var(--ide-border)] text-sm text-[var(--ide-text-muted)] hover:border-[var(--ide-accent)] hover:text-[var(--ide-accent)] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                添加自定义变量
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
