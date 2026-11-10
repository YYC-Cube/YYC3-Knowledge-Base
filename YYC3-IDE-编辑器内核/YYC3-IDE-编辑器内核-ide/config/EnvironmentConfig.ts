/**
 * @file: EnvironmentConfig.ts
 * @description: YYC³ 环境变量配置系统 — 支持多维度认证、本地存储、零数据收集
 *              开源原则：从哪里来回哪里去，用户直面第三方
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-06
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: config,environment,auth,gateway,heartbeat,open-source
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { logger } from "../services/Logger";

// ================================================================
// 类型定义
// ================================================================

/** 认证方式类型 */
export type AuthMethod = 'api_key' | 'oauth2' | 'jwt' | 'token' | 'certificate' | 'none'

/** 认证配置 */
export interface AuthConfig {
  method: AuthMethod
  credentials: Record<string, string>
  expiresAt?: number
  lastVerified?: number
}

/** 网关配置 */
export interface GatewayConfig {
  id: string
  name: string
  url: string
  description?: string
  auth: AuthConfig
  isActive: boolean
  priority: number
  latency?: number
  lastCheck?: number
}

/** 终端/PTY 配置 */
export interface TerminalConfig {
  shell: 'bash' | 'zsh' | 'pwsh' | 'fish' | 'custom'
  customShellPath?: string
  fontSize: number
  fontFamily: string
  cursorBlink: boolean
  scrollback: number
  envVars: Record<string, string>
}

/** 心跳配置 */
export interface HeartbeatConfig {
  enabled: boolean
  interval: number // 毫秒
  endpoint?: string
  payload?: Record<string, unknown>
  lastSync?: number
  hostIp?: string
}

/** 代理配置 */
export interface ProxyConfig {
  enabled: boolean
  protocol: 'http' | 'https' | 'socks5'
  host: string
  port: number
  username?: string
  password?: string
  bypassList?: string[]
}

/** 完整环境配置 */
export interface EnvironmentConfig {
  gateways: GatewayConfig[]
  activeGatewayId: string | null
  terminal: TerminalConfig
  heartbeat: HeartbeatConfig
  proxy: ProxyConfig
  featureFlags: Record<string, boolean>
  customEnvVars: Record<string, string>
}

// ================================================================
// 默认值
// ================================================================

export const DEFAULT_TERMINAL_CONFIG: TerminalConfig = {
  shell: 'zsh',
  fontSize: 14,
  fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Monaco, Consolas, monospace',
  cursorBlink: true,
  scrollback: 5000,
  envVars: {
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    LANG: 'zh_CN.UTF-8',
  },
}

export const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  enabled: false,
  interval: 30000, // 30秒
  endpoint: undefined,
  payload: {},
}

export const DEFAULT_PROXY_CONFIG: ProxyConfig = {
  enabled: false,
  protocol: 'http',
  host: '',
  port: 7890,
  bypassList: ['localhost', '127.0.0.1', '::1'],
}

export const DEFAULT_GATEWAYS: GatewayConfig[] = [
  {
    id: 'yyc3-official',
    name: 'YYC³ 官方网关',
    url: 'https://api.0379.world',
    description: 'YYC³ LLM 统一网关 - 大语言模型统一接入点',
    auth: {
      method: 'api_key',
      credentials: { apiKey: '' },
    },
    isActive: true,
    priority: 100,
  },
]

export const DEFAULT_ENV_CONFIG: EnvironmentConfig = {
  gateways: DEFAULT_GATEWAYS,
  activeGatewayId: 'yyc3-official',
  terminal: DEFAULT_TERMINAL_CONFIG,
  heartbeat: DEFAULT_HEARTBEAT_CONFIG,
  proxy: DEFAULT_PROXY_CONFIG,
  featureFlags: {
    pwa: true,
    performanceMonitor: true,
    debugMode: false,
    aiAutoComplete: true,
    gitIntegration: true,
    dockerSupport: true,
  },
  customEnvVars: {},
}

// ================================================================
// Store 定义
// ================================================================

interface EnvironmentStore extends EnvironmentConfig {
  // Gateway 操作
  addGateway: (gateway: Omit<GatewayConfig, 'id'>) => string
  updateGateway: (id: string, updates: Partial<GatewayConfig>) => void
  removeGateway: (id: string) => void
  setActiveGateway: (id: string) => void
  testGatewayConnection: (id: string) => Promise<{ success: boolean; latency?: number; error?: string }>

  // 认证操作
  updateAuth: (gatewayId: string, auth: Partial<AuthConfig>) => void
  verifyAuth: (gatewayId: string) => Promise<{ valid: boolean; message: string }>

  // 终端配置
  updateTerminal: (config: Partial<TerminalConfig>) => void
  setTerminalEnvVar: (key: string, value: string) => void
  removeTerminalEnvVar: (key: string) => void

  // 心跳操作
  updateHeartbeat: (config: Partial<HeartbeatConfig>) => void
  startHeartbeat: () => void
  stopHeartbeat: () => void
  syncHostInfo: () => Promise<void>

  // 代理配置
  updateProxy: (config: Partial<ProxyConfig>) => void

  // 功能开关
  toggleFeature: (key: string) => void

  // 自定义环境变量
  setCustomEnvVar: (key: string, value: string) => void
  removeCustomEnvVar: (key: string) => void

  // 重置
  resetToDefaults: () => void
  exportConfig: () => string
  importConfig: (json: string) => boolean
}

export const useEnvironmentStore = create<EnvironmentStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_ENV_CONFIG,

      // ── Gateway 操作 ──
      addGateway: (gateway) => {
        const id = `gw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        set((state) => ({
          gateways: [...state.gateways, { ...gateway, id }],
        }))
        return id
      },

      updateGateway: (id, updates) => {
        set((state) => ({
          gateways: state.gateways.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        }))
      },

      removeGateway: (id) => {
        set((state) => ({
          gateways: state.gateways.filter((g) => g.id !== id),
          activeGatewayId:
            state.activeGatewayId === id
              ? state.gateways[0]?.id || null
              : state.activeGatewayId,
        }))
      },

      setActiveGateway: (id) => {
        set({ activeGatewayId: id })
        // 更新所有网关的激活状态
        set((state) => ({
          gateways: state.gateways.map((g) => ({
            ...g,
            isActive: g.id === id,
          })),
        }))
      },

      testGatewayConnection: async (id) => {
        const gateway = get().gateways.find((g) => g.id === id)
        if (!gateway) return { success: false, error: '网关不存在' }

        const startTime = Date.now()
        try {
          const response = await fetch(`${gateway.url}/`, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Accept': 'application/json',
              ...(gateway.auth.method === 'api_key' && gateway.auth.credentials.apiKey
                ? { 'Authorization': `Bearer ${gateway.auth.credentials.apiKey}` }
                : {}),
            },
            signal: AbortSignal.timeout(10000),
          })

          const latency = Date.now() - startTime

          if (response.ok) {
            get().updateGateway(id, {
              latency,
              lastCheck: Date.now(),
            })
            return { success: true, latency }
          }

          return {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
            latency,
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : '连接失败',
            latency: Date.now() - startTime,
          }
        }
      },

      // ── 认证操作 ──
      updateAuth: (gatewayId, auth) => {
        set((state) => ({
          gateways: state.gateways.map((g) =>
            g.id === gatewayId
              ? { ...g, auth: { ...g.auth, ...auth } }
              : g
          ),
        }))
      },

      verifyAuth: async (gatewayId) => {
        const gateway = get().gateways.find((g) => g.id === gatewayId)
        if (!gateway) return { valid: false, message: '网关不存在' }

        try {
          const response = await fetch(`${gateway.url}/api/auth/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(gateway.auth.method === 'api_key' && gateway.auth.credentials.apiKey
                ? { 'Authorization': `Bearer ${gateway.auth.credentials.apiKey}` }
                : {}),
            },
            body: JSON.stringify({
              method: gateway.auth.method,
              timestamp: Date.now(),
            }),
          })

          if (response.ok) {
            const data = await response.json()
            get().updateAuth(gatewayId, {
              lastVerified: Date.now(),
            })
            return { valid: true, message: data.message || '认证有效' }
          }

          return { valid: false, message: '认证无效或已过期' }
        } catch (error) {
          return { valid: false, message: '无法验证认证状态' }
        }
      },

      // ── 终端配置 ──
      updateTerminal: (config) => {
        set((state) => ({
          terminal: { ...state.terminal, ...config },
        }))
      },

      setTerminalEnvVar: (key, value) => {
        set((state) => ({
          terminal: {
            ...state.terminal,
            envVars: { ...state.terminal.envVars, [key]: value },
          },
        }))
      },

      removeTerminalEnvVar: (key) => {
        set((state) => {
          const { [key]: _, ...rest } = state.terminal.envVars
          return {
            terminal: { ...state.terminal, envVars: rest },
          }
        })
      },

      // ── 心跳操作 ──
      updateHeartbeat: (config) => {
        set((state) => ({
          heartbeat: { ...state.heartbeat, ...config },
        }))
      },

      startHeartbeat: () => {
        set((state) => ({ heartbeat: { ...state.heartbeat, enabled: true } }))
      },

      stopHeartbeat: () => {
        set((state) => ({ heartbeat: { ...state.heartbeat, enabled: false } }))
      },

      syncHostInfo: async () => {
        try {
          // 获取宿主机信息（纯本地，不上传）
          const response = await fetch('https://api.ipify.org?format=json')
          const data = await response.json()

          set((state) => ({
            heartbeat: {
              ...state.heartbeat,
              hostIp: data.ip,
              lastSync: Date.now(),
            },
          }))

          logger.info('宿主机IP同步完成: ${data.ip}');
        } catch (error) {
          logger.warn('[Environment] 获取宿主机IP失败:', error);
        }
      },

      // ── 代理配置 ──
      updateProxy: (config) => {
        set((state) => ({
          proxy: { ...state.proxy, ...config },
        }))
      },

      // ── 功能开关 ──
      toggleFeature: (key) => {
        set((state) => ({
          featureFlags: {
            ...state.featureFlags,
            [key]: !state.featureFlags[key],
          },
        }))
      },

      // ── 自定义环境变量 ──
      setCustomEnvVar: (key, value) => {
        set((state) => ({
          customEnvVars: { ...state.customEnvVars, [key]: value },
        }))
      },

      removeCustomEnvVar: (key) => {
        set((state) => {
          const { [key]: _, ...rest } = state.customEnvVars
          return { customEnvVars: rest }
        })
      },

      // ── 重置与导入导出 ──
      resetToDefaults: () => {
        set(DEFAULT_ENV_CONFIG)
      },

      exportConfig: () => {
        const state = get()
        // 导出时移除敏感信息（API Key等）
        const safeExport = {
          ...state,
          gateways: state.gateways.map((g) => ({
            ...g,
            auth: {
              ...g.auth,
              credentials: Object.fromEntries(
                Object.entries(g.auth.credentials).map(([k, v]) => [
                  k,
                  k.toLowerCase().includes('key') || k.toLowerCase().includes('secret')
                    ? '***REDACTED***'
                    : v,
                ])
              ),
            },
          })),
        }
        return JSON.stringify(safeExport, null, 2)
      },

      importConfig: (json) => {
        try {
          const config = JSON.parse(json) as Partial<EnvironmentConfig>
          set((state) => ({
            ...state,
            ...config,
          }))
          return true
        } catch {
          return false
        }
      },
    }),
    {
      name: 'yyc3-environment-config',
      version: 1,
    }
  )
)

// ================================================================
// 辅助函数
// ================================================================

/** 获取当前活跃网关 */
export function getActiveGateway(): GatewayConfig | undefined {
  const state = useEnvironmentStore.getState()
  return state.gateways.find((g) => g.id === state.activeGatewayId)
}

/** 构建带认证的请求头 */
export function buildAuthHeaders(gatewayId?: string): Record<string, string> {
  const state = useEnvironmentStore.getState()
  const gateway = gatewayId
    ? state.gateways.find((g) => g.id === gatewayId)
    : state.gateways.find((g) => g.id === state.activeGatewayId)

  if (!gateway?.auth.credentials.apiKey) return {}

  switch (gateway.auth.method) {
    case 'api_key':
      return { Authorization: `Bearer ${gateway.auth.credentials.apiKey}` }
    case 'jwt':
      return { Authorization: `Bearer ${gateway.auth.credentials.token}` }
    case 'token':
      return { 'X-API-Token': gateway.auth.credentials.token }
    default:
      return {}
  }
}
