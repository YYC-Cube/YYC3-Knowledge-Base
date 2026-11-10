/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — TODO(P0-1): React 19 + lucide-react 类型兼容性问题，待上游修复
/**
 * @file ProxyConfigPanel.tsx
 * @description 代理服务配置面板 — 支持健康检查、架构模板、高级设置
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 */

import { useState, useCallback } from 'react'
import {
  CheckCircle2, XCircle, RefreshCw, Wifi, Network, Lock,
  FileCode2, Copy, Check, Lightbulb, RotateCcw,
} from 'lucide-react'
import {
  loadProxyConfig, saveProxyConfig, checkProxyHealth,
  type ProxyConfig, DEFAULT_PROXY_CONFIG, PROXY_SERVER_TEMPLATE,
} from '../ProxyService'
import { copyToClipboard } from '../utils/clipboard'

export function ProxyConfigPanel() {
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
      <div className="flex items-center gap-2">
        <Network className="w-4 h-4 text-indigo-400" />
        <span className="text-[12px] text-white/70">代理服务配置</span>
        <span className="text-[9px] text-white/20 bg-white/[0.03] px-1.5 py-0.5 rounded">
          {config.enabled ? '已启用' : '未启用'}
        </span>
      </div>

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
              <div className={`w-4.5 h-4.5 rounded-full transition-all mt-[1px] ${
                config.enabled ? 'bg-indigo-400 ml-[21px]' : 'bg-white/25 ml-[1px]'
              }`} style={{ width: '18px', height: '18px' }} />
            </div>
          </button>
        </div>

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
          <div className="text-[9px] text-white/15">此 Token 用于前端与代理服务器之间的认证（非 LLM API Key）</div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] text-white/25 uppercase tracking-wider">超时 (ms)</label>
            <input type="number" value={config.timeout} onChange={e => handleSave({ timeout: parseInt(e.target.value) || 30000 })}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-[10px] text-white/60 font-mono focus:outline-none focus:border-indigo-500/30" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-white/25 uppercase tracking-wider">重试次数</label>
            <input type="number" value={config.retries} onChange={e => handleSave({ retries: parseInt(e.target.value) || 2 })} min={0} max={5}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-[10px] text-white/60 font-mono focus:outline-none focus:border-indigo-500/30" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-white/25 uppercase tracking-wider">限速/分钟</label>
            <input type="number" value={config.rateLimitPerMin} onChange={e => handleSave({ rateLimitPerMin: parseInt(e.target.value) || 60 })}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-[10px] text-white/60 font-mono focus:outline-none focus:border-indigo-500/30" />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button onClick={() => { handleSave(DEFAULT_PROXY_CONFIG); setHealthStatus('idle') }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-all border border-white/[0.04]">
            <RotateCcw className="w-3 h-3" /> 重置默认
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-3.5 h-3.5 text-indigo-400/60" />
            <span className="text-[11px] text-white/50">代理架构 & 部署模板</span>
          </div>
          <button onClick={() => setShowTemplate(!showTemplate)}
            className="text-[9px] text-white/25 hover:text-white/50 px-2 py-1 rounded hover:bg-white/[0.04] transition-all">
            {showTemplate ? '收起' : '展开'} Cloudflare Worker 模板
          </button>
        </div>

        <div className="text-[10px] text-white/30 font-mono px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <pre className="whitespace-pre text-[9px] leading-relaxed">{`Frontend (Browser)  ──▶  Proxy Server  ──▶  LLM Provider
   ↑ CORS OK               ↑ Keys Stored       ↑ No CORS
   ↑ No API Keys            ↑ Rate Limit        ↑ Bearer Auth`}</pre>
        </div>

        {showTemplate && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-indigo-400/50">Cloudflare Worker 参考实现</span>
              <button onClick={handleCopyTemplate}
                className="flex items-center gap-1 px-2 py-1 rounded text-[9px] text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-all">
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

      <div className="px-4 py-2.5 rounded-xl bg-indigo-500/[0.03] border border-indigo-500/10 flex items-start gap-2">
        <Lightbulb className="w-3.5 h-3.5 text-indigo-400/50 shrink-0 mt-0.5" />
        <div className="text-[10px] text-white/25">
          <strong className="text-indigo-400/40">提示：</strong>启用代理后，API Key 将仅存储在代理服务器的环境变量中，前端不再需要配置各服务商的 API Key。
        </div>
      </div>
    </div>
  )
}
