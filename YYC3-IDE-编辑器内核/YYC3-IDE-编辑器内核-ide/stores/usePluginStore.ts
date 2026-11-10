/**
 * @file: stores/usePluginStore.ts
 * @description: 插件管理 Zustand Store — 基于 persist 中间件实现跨页面插件配置持久化，
 *              支持启用/禁用、安装/卸载、分类管理、批量操作
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-03
 * @updated: 2026-04-03
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: plugins,zustand,persist,settings
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Types ──

export type PluginCategory = 'code-quality' | 'ai-tools' | 'git' | 'themes' | 'productivity'

export interface PluginConfig {
  id: string
  name: string
  description: string
  version: string
  author: string
  category: PluginCategory
  enabled: boolean
  isBuiltIn: boolean
  configurable: boolean
  repository?: string
  installedAt: string
  lastUpdated: string
  dependencies?: string[]
  settings?: Record<string, unknown>
}

// ── Default Plugins ──

const DEFAULT_PLUGINS: PluginConfig[] = [
  {
    id: 'plugin-eslint', name: 'ESLint 代码检查',
    description: '实时 JavaScript/TypeScript 代码检查，支持自动修复',
    version: '3.2.1', author: 'YYC³ Core', category: 'code-quality',
    enabled: true, isBuiltIn: true, configurable: true,
    repository: 'https://github.com/eslint/eslint',
    installedAt: '2026-03-01', lastUpdated: '2026-03-28',
  },
  {
    id: 'plugin-prettier', name: 'Prettier 格式化',
    description: '多语言代码格式化工具，统一代码风格',
    version: '4.0.0', author: 'YYC³ Core', category: 'code-quality',
    enabled: true, isBuiltIn: true, configurable: true,
    installedAt: '2026-03-01', lastUpdated: '2026-03-25',
  },
  {
    id: 'plugin-ai-complete', name: 'AI 智能补全',
    description: '基于 LLM 的上下文感知代码补全引擎',
    version: '2.1.0', author: 'YYC³ AI Lab', category: 'ai-tools',
    enabled: true, isBuiltIn: true, configurable: true,
    installedAt: '2026-03-01', lastUpdated: '2026-04-01',
  },
  {
    id: 'plugin-ai-review', name: 'AI 代码审查',
    description: '自动化代码审查，检测潜在问题和优化建议',
    version: '1.5.0', author: 'YYC³ AI Lab', category: 'ai-tools',
    enabled: true, isBuiltIn: false, configurable: true,
    installedAt: '2026-03-10', lastUpdated: '2026-03-30',
  },
  {
    id: 'plugin-git-lens', name: 'Git 可视化增强',
    description: 'Git blame、历史对比、分支可视化',
    version: '1.8.3', author: 'GitPlus', category: 'git',
    enabled: true, isBuiltIn: false, configurable: false,
    installedAt: '2026-03-05', lastUpdated: '2026-03-20',
  },
  {
    id: 'plugin-cyberpunk-theme', name: '赛博朋克主题',
    description: '霓虹风格编辑器主题，支持自定义配色',
    version: '2.0.0', author: 'YYC³ Design', category: 'themes',
    enabled: false, isBuiltIn: false, configurable: true,
    installedAt: '2026-03-12', lastUpdated: '2026-03-29',
  },
  {
    id: 'plugin-snippets', name: '代码片段管理',
    description: '自定义代码片段库，支持变量和制表位',
    version: '1.3.0', author: 'YYC³ Core', category: 'productivity',
    enabled: true, isBuiltIn: true, configurable: true,
    installedAt: '2026-03-01', lastUpdated: '2026-03-22',
  },
  {
    id: 'plugin-perf-monitor', name: '性能分析器',
    description: '实时运行时性能监控和瓶颈分析',
    version: '3.0.1', author: 'PerfLab', category: 'productivity',
    enabled: false, isBuiltIn: false, configurable: false,
    installedAt: '2026-03-18', lastUpdated: '2026-03-27',
  },
  {
    id: 'plugin-i18n', name: '国际化助手',
    description: '自动化多语言翻译、键值管理和本地化',
    version: '1.2.0', author: 'i18nKit', category: 'productivity',
    enabled: false, isBuiltIn: false, configurable: true,
    installedAt: '2026-03-20', lastUpdated: '2026-03-26',
  },
]

// ── Store ──

interface PluginState {
  plugins: PluginConfig[]
}

interface PluginActions {
  togglePlugin: (id: string) => void
  installPlugin: (plugin: Omit<PluginConfig, 'id' | 'installedAt' | 'lastUpdated'>) => void
  uninstallPlugin: (id: string) => void
  updatePluginSettings: (id: string, settings: Record<string, unknown>) => void
  enableAll: () => void
  disableAll: () => void
  getByCategory: (category: PluginCategory) => PluginConfig[]
  getEnabled: () => PluginConfig[]
}

export const usePluginStore = create<PluginState & PluginActions>()(
  persist(
    (set, get) => ({
      plugins: DEFAULT_PLUGINS,

      togglePlugin: (id) => {
        set(state => ({
          plugins: state.plugins.map(p =>
            p.id === id ? { ...p, enabled: !p.enabled } : p
          ),
        }))
      },

      installPlugin: (plugin) => {
        const now = new Date().toISOString().slice(0, 10)
        const newPlugin: PluginConfig = {
          ...plugin,
          id: `plugin-${Date.now()}`,
          installedAt: now,
          lastUpdated: now,
        }
        set(state => ({ plugins: [...state.plugins, newPlugin] }))
      },

      uninstallPlugin: (id) => {
        const plugin = get().plugins.find(p => p.id === id)
        if (plugin?.isBuiltIn) return // Cannot uninstall built-in
        set(state => ({ plugins: state.plugins.filter(p => p.id !== id) }))
      },

      updatePluginSettings: (id, settings) => {
        set(state => ({
          plugins: state.plugins.map(p =>
            p.id === id ? { ...p, settings: { ...p.settings, ...settings } } : p
          ),
        }))
      },

      enableAll: () => {
        set(state => ({
          plugins: state.plugins.map(p => ({ ...p, enabled: true })),
        }))
      },

      disableAll: () => {
        set(state => ({
          plugins: state.plugins.map(p => ({ ...p, enabled: false })),
        }))
      },

      getByCategory: (category) => {
        return get().plugins.filter(p => p.category === category)
      },

      getEnabled: () => {
        return get().plugins.filter(p => p.enabled)
      },
    }),
    {
      name: 'yyc3-plugin-settings',
      version: 1,
    }
  )
)
