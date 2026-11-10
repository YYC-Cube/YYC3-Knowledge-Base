/**
 * YYC3 Notification Center — System events, activity log & operation history
 * @description Slide-in panel with categorized notifications, time-relative
 *   display, read/unread states, and theme-aware tk token styling.
 * @version 4.8.0
 */

import { useState, useMemo, useCallback } from 'react'
import {
  X, Bell, BellOff, Check, CheckCheck, Trash2,
  Bot, Cpu, FolderOpen, Shield, Zap, AlertTriangle,
  Info, Activity, GitMerge,
} from 'lucide-react'
import { useI18n } from '../i18n/context'
import { useThemeStore, Z_INDEX, BLUR } from '../store/theme-store'

// ===== Notification Types =====
export type NotifCategory = 'system' | 'ai' | 'project'
export type NotifLevel = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id: string
  category: NotifCategory
  level: NotifLevel
  title: { zh: string; en: string }
  message: { zh: string; en: string }
  timestamp: number
  read: boolean
}

// ===== Mock notifications =====
function generateMockNotifications(): Notification[] {
  const now = Date.now()
  return [
    {
      id: 'n1', category: 'system', level: 'success',
      title: { zh: '系统就绪', en: 'System Ready' },
      message: { zh: '所有子系统初始化完成，神经网络连接正常', en: 'All subsystems initialized, neural network connections nominal' },
      timestamp: now - 30000, read: false,
    },
    {
      id: 'n2', category: 'ai', level: 'info',
      title: { zh: 'AI 模型已加载', en: 'AI Model Loaded' },
      message: { zh: 'GPT-4 Turbo 模型已激活，延迟 145ms', en: 'GPT-4 Turbo model activated, latency 145ms' },
      timestamp: now - 120000, read: false,
    },
    {
      id: 'n3', category: 'project', level: 'info',
      title: { zh: '项目自动保存', en: 'Project Auto-saved' },
      message: { zh: '项目 "YYC3 Dashboard" 已自动保存至本地', en: 'Project "YYC3 Dashboard" auto-saved locally' },
      timestamp: now - 300000, read: true,
    },
    {
      id: 'n4', category: 'ai', level: 'warning',
      title: { zh: 'Ollama 连接异常', en: 'Ollama Connection Issue' },
      message: { zh: '本地 Ollama 实例未响应，请检查服务状态', en: 'Local Ollama instance not responding, check service status' },
      timestamp: now - 600000, read: true,
    },
    {
      id: 'n5', category: 'system', level: 'success',
      title: { zh: '主题切换完成', en: 'Theme Switched' },
      message: { zh: '已切换至赛博朋克主题，所有组件已更新', en: 'Switched to Cyberpunk theme, all components updated' },
      timestamp: now - 1800000, read: true,
    },
    {
      id: 'n6', category: 'project', level: 'success',
      title: { zh: '代码生成完成', en: 'Code Generation Complete' },
      message: { zh: '已为 3 个组件生成 TypeScript + CSS 代码', en: 'Generated TypeScript + CSS code for 3 components' },
      timestamp: now - 3600000, read: true,
    },
    {
      id: 'n7', category: 'system', level: 'error',
      title: { zh: '网络中断', en: 'Network Disrupted' },
      message: { zh: '外部 API 连接中断 2.3s，已自动恢复', en: 'External API connection dropped for 2.3s, auto-recovered' },
      timestamp: now - 7200000, read: true,
    },
  ]
}

type TabFilter = 'all' | NotifCategory

interface NotificationCenterProps {
  visible: boolean
  onClose: () => void
}

export function NotificationCenter({ visible, onClose }: NotificationCenterProps) {
  const { t, locale } = useI18n()
  const { tokens: tk, isCyberpunk } = useThemeStore()
  const [notifications, setNotifications] = useState<Notification[]>(generateMockNotifications)
  const [activeTab, setActiveTab] = useState<TabFilter>('all')

  const filtered = useMemo(() => {
    if (activeTab === 'all') return notifications
    return notifications.filter((n) => n.category === activeTab)
  }, [notifications, activeTab])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }, [])

  const removeNotif = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  // Relative time
  function relativeTime(ts: number): string {
    const diff = Date.now() - ts
    if (diff < 60000) return t('notifications', 'justNow')
    if (diff < 3600000) return `${Math.floor(diff / 60000)} ${t('notifications', 'minutesAgo')}`
    return `${Math.floor(diff / 3600000)} ${t('notifications', 'hoursAgo')}`
  }

  // Level color
  function levelColor(level: NotifLevel): string {
    return { info: tk.primary, success: tk.success, warning: tk.warning, error: tk.error }[level]
  }

  // Category icon
  function catIcon(cat: NotifCategory): React.ElementType {
    return { system: Cpu, ai: Bot, project: FolderOpen }[cat]
  }

  if (!visible) return null

  const tabFilters: { key: TabFilter; labelKey: string }[] = [
    { key: 'all', labelKey: 'tabAll' },
    { key: 'system', labelKey: 'tabSystem' },
    { key: 'ai', labelKey: 'tabAI' },
    { key: 'project', labelKey: 'tabProject' },
  ]

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: Z_INDEX.assistPanel, background: tk.overlayBg, backdropFilter: BLUR.sm }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: 480,
          maxHeight: '75vh',
          background: tk.panelBg,
          border: `1px solid ${tk.cardBorder}`,
          borderRadius: tk.borderRadius,
          boxShadow: isCyberpunk ? `0 0 30px ${tk.primaryGlow}` : tk.shadowHover,
          animation: 'modalIn 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{ borderColor: tk.border }}>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Bell size={16} color={tk.primary} />
              {unreadCount > 0 && (
                <div
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{
                    background: tk.error,
                    boxShadow: isCyberpunk ? `0 0 6px ${tk.error}` : 'none',
                  }}
                >
                  <span style={{ fontFamily: tk.fontMono, fontSize: '7px', color: '#fff' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h2 style={{ fontFamily: tk.fontDisplay, fontSize: '13px', color: tk.primary, letterSpacing: '1px', margin: 0 }}>
                {t('notifications', 'title')}
              </h2>
              <p style={{ fontFamily: tk.fontMono, fontSize: '8px', color: tk.foregroundMuted, letterSpacing: '1px', margin: 0 }}>
                {t('notifications', 'subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={markAllRead} className="p-1.5 rounded transition-all hover:opacity-80" title={t('notifications', 'markAllRead')}>
              <CheckCheck size={13} color={tk.foregroundMuted} />
            </button>
            <button onClick={clearAll} className="p-1.5 rounded transition-all hover:opacity-80" title={t('notifications', 'clearAll')}>
              <Trash2 size={13} color={tk.foregroundMuted} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded transition-all hover:opacity-80">
              <X size={14} color={tk.foregroundMuted} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b" style={{ borderColor: tk.border }}>
          {tabFilters.map(({ key, labelKey }) => {
            const isActive = activeTab === key
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className="px-3 py-1 rounded-full transition-all"
                style={{
                  background: isActive ? tk.primaryGlow : 'transparent',
                  border: `1px solid ${isActive ? tk.primary : 'transparent'}`,
                  fontFamily: tk.fontMono,
                  fontSize: '9px',
                  color: isActive ? tk.primary : tk.foregroundMuted,
                  letterSpacing: '0.5px',
                }}
              >
                {t('notifications', labelKey)}
              </button>
            )
          })}
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto neon-scrollbar">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <BellOff size={28} color={tk.foregroundMuted} style={{ opacity: 0.2 }} />
              <p style={{ fontFamily: tk.fontMono, fontSize: '11px', color: tk.foregroundMuted }}>
                {t('notifications', 'empty')}
              </p>
            </div>
          ) : (
            filtered.map((notif) => {
              const CatIcon = catIcon(notif.category)
              const color = levelColor(notif.level)
              return (
                <div
                  key={notif.id}
                  className="flex gap-3 px-5 py-3 border-b transition-all cursor-pointer"
                  style={{
                    borderColor: tk.borderDim,
                    background: notif.read ? 'transparent' : tk.primaryGlow,
                    opacity: notif.read ? 0.7 : 1,
                  }}
                  onClick={() => markRead(notif.id)}
                >
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: `${color}12`,
                      border: `1px solid ${color}30`,
                    }}
                  >
                    <CatIcon size={14} color={color} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p style={{
                        fontFamily: tk.fontBody,
                        fontSize: '12px',
                        color: tk.foreground,
                        margin: 0,
                      }}>
                        {notif.title[locale]}
                      </p>
                      {!notif.read && (
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tk.primary, boxShadow: isCyberpunk ? `0 0 4px ${tk.primary}` : 'none' }} />
                      )}
                    </div>
                    <p style={{
                      fontFamily: tk.fontMono,
                      fontSize: '10px',
                      color: tk.foregroundMuted,
                      margin: '2px 0 0 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {notif.message[locale]}
                    </p>
                    <p style={{
                      fontFamily: tk.fontMono,
                      fontSize: '8px',
                      color: tk.foregroundMuted,
                      margin: '4px 0 0 0',
                      opacity: 0.6,
                    }}>
                      {relativeTime(notif.timestamp)}
                    </p>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeNotif(notif.id) }}
                    className="p-1 rounded opacity-0 hover:opacity-100 transition-all shrink-0 self-start"
                    style={{ opacity: 0.3 }}
                  >
                    <X size={10} color={tk.foregroundMuted} />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}