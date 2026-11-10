/**
 * @file: PerformanceMonitorPanel.tsx
 * @description: YYC³ 性能监控面板 - 实时监控、趋势图表、预警管理
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: performance,monitor,ui,panel
 */

import React, { useState, useEffect } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  HardDrive,
  RefreshCw,
  Settings,
  TrendingUp,
  X,
} from 'lucide-react'
import PerformanceMonitor, {
  type StorageStats,
  type PerformanceReport,
  type PerformanceAlert,
  type MonitorConfig,
} from '../services/PerformanceMonitor'

type Period = 'hour' | 'day' | 'week' | 'month'
type TabId = 'overview' | 'trends' | 'alerts' | 'settings'

export function PerformanceMonitorPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null)
  const [performanceReport, setPerformanceReport] = useState<PerformanceReport | null>(null)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [config, setConfig] = useState<MonitorConfig | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('day')
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const monitor = PerformanceMonitor.getInstance()

  useEffect(() => {
    loadData()
  }, [selectedPeriod])

  const loadData = () => {
    setIsLoading(true)
    try {
      setStorageStats(monitor.getStorageStats())
      setPerformanceReport(monitor.getPerformanceReport(selectedPeriod))
      setAlerts(monitor.getAlerts())
      setConfig(monitor.getConfig())
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleMonitoring = () => {
    if (isMonitoring) {
      monitor.stopMonitoring()
    } else {
      monitor.startMonitoring()
    }
    setIsMonitoring(!isMonitoring)
  }

  const handleClearAlerts = () => {
    monitor.clearAlerts()
    setAlerts([])
  }

  const handleUpdateConfig = (newConfig: Partial<MonitorConfig>) => {
    monitor.updateConfig(newConfig)
    setConfig(monitor.getConfig())
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  const getSeverityColor = (severity: PerformanceAlert['severity']): string => {
    switch (severity) {
      case 'critical':
        return 'text-red-400 bg-red-500/10 border-red-500/30'
      case 'warning':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
    }
  }

  const tabs = [
    { id: 'overview' as TabId, label: '概览', icon: Activity },
    { id: 'trends' as TabId, label: '趋势', icon: TrendingUp },
    { id: 'alerts' as TabId, label: '预警', icon: AlertTriangle },
    { id: 'settings' as TabId, label: '设置', icon: Settings },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">性能监控</h2>
          <p className="text-sm text-gray-400 mt-1">实时监控存储性能和系统健康状态</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleToggleMonitoring}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isMonitoring
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {isMonitoring ? '监控中' : '开始监控'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{tab.label}</span>
            {tab.id === 'alerts' && alerts.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
                {alerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && storageStats && performanceReport && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium text-white">LocalStorage</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">使用量</span>
                  <span className="text-sm text-white">
                    {formatBytes(storageStats.localStorage.used)} / {formatBytes(storageStats.localStorage.total)}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-700 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      storageStats.localStorage.percentage > 90
                        ? 'bg-red-500'
                        : storageStats.localStorage.percentage > 70
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(storageStats.localStorage.percentage, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">数据项</span>
                  <span className="text-sm text-white">{storageStats.localStorage.itemCount}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-medium text-white">IndexedDB</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">使用量</span>
                  <span className="text-sm text-white">
                    {formatBytes(storageStats.indexedDB.used)} / {formatBytes(storageStats.indexedDB.total)}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-700 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      storageStats.indexedDB.percentage > 90
                        ? 'bg-red-500'
                        : storageStats.indexedDB.percentage > 70
                        ? 'bg-amber-500'
                        : 'bg-purple-500'
                    }`}
                    style={{ width: `${Math.min(storageStats.indexedDB.percentage, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">数据库</span>
                  <span className="text-sm text-white">{storageStats.indexedDB.databaseCount}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <span className="text-xs text-gray-400">总操作数</span>
              <div className="text-lg font-semibold text-white mt-1">
                {performanceReport.metrics.totalOperations}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <span className="text-xs text-gray-400">平均耗时</span>
              <div className="text-lg font-semibold text-white mt-1">
                {formatDuration(performanceReport.metrics.averageDuration)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <span className="text-xs text-gray-400">成功率</span>
              <div className="text-lg font-semibold text-emerald-400 mt-1">
                {performanceReport.metrics.successRate.toFixed(1)}%
              </div>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <span className="text-xs text-gray-400">错误数</span>
              <div className="text-lg font-semibold text-red-400 mt-1">
                {performanceReport.metrics.errorCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trends' && performanceReport && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {(['hour', 'day', 'week', 'month'] as Period[]).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedPeriod === period
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'
                }`}
              >
                {period === 'hour' && '最近1小时'}
                {period === 'day' && '最近24小时'}
                {period === 'week' && '最近7天'}
                {period === 'month' && '最近30天'}
              </button>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-medium text-white mb-4">操作趋势</h3>
            <div className="flex items-end gap-1 h-32">
              {performanceReport.trends.operations.map((count, index) => {
                const maxCount = Math.max(...performanceReport.trends.operations, 1)
                const height = (count / maxCount) * 100
                return (
                  <div
                    key={index}
                    className="flex-1 bg-blue-500/30 rounded-t transition-all hover:bg-blue-500/50"
                    style={{ height: `${height}%` }}
                    title={`${count} 次操作`}
                  />
                )
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>开始</span>
              <span>结束</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-medium text-white mb-4">性能趋势</h3>
            <div className="flex items-end gap-1 h-32">
              {performanceReport.trends.duration.map((duration, index) => {
                const maxDuration = Math.max(...performanceReport.trends.duration, 1)
                const height = (duration / maxDuration) * 100
                return (
                  <div
                    key={index}
                    className="flex-1 bg-purple-500/30 rounded-t transition-all hover:bg-purple-500/50"
                    style={{ height: `${height}%` }}
                    title={`${formatDuration(duration)}`}
                  />
                )
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>开始</span>
              <span>结束</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">共 {alerts.length} 条预警</span>
            {alerts.length > 0 && (
              <button
                onClick={handleClearAlerts}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm"
              >
                清除所有
              </button>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="p-8 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
              <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">暂无预警信息</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">{alert.message}</span>
                      </div>
                      <div className="text-xs opacity-75">{formatDate(alert.timestamp)}</div>
                      {alert.details && (
                        <div className="mt-2 text-xs opacity-75">
                          {Object.entries(alert.details).map(([key, value]) => (
                            <div key={key}>
                              {key}: {String(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && config && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-medium text-white mb-4">监控配置</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-white">启用监控</span>
                  <p className="text-xs text-gray-400 mt-1">自动收集性能指标</p>
                </div>
                <button
                  onClick={() => handleUpdateConfig({ enabled: !config.enabled })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    config.enabled ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      config.enabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-white">采样间隔</span>
                  <p className="text-xs text-gray-400 mt-1">定期检查存储状态</p>
                </div>
                <select
                  value={config.sampleInterval}
                  onChange={(e) => handleUpdateConfig({ sampleInterval: Number(e.target.value) })}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-sm"
                >
                  <option value={30000}>30秒</option>
                  <option value={60000}>1分钟</option>
                  <option value={300000}>5分钟</option>
                  <option value={600000}>10分钟</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-white">数据保留天数</span>
                  <p className="text-xs text-gray-400 mt-1">历史指标保留时间</p>
                </div>
                <select
                  value={config.retentionDays}
                  onChange={(e) => handleUpdateConfig({ retentionDays: Number(e.target.value) })}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-sm"
                >
                  <option value={7}>7天</option>
                  <option value={14}>14天</option>
                  <option value={30}>30天</option>
                  <option value={90}>90天</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-medium text-white mb-4">预警阈值</h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">容量警告阈值</span>
                  <span className="text-xs text-white">{config.alertThresholds.capacityWarning}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={config.alertThresholds.capacityWarning}
                  onChange={(e) =>
                    handleUpdateConfig({
                      alertThresholds: {
                        ...config.alertThresholds,
                        capacityWarning: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">性能警告阈值</span>
                  <span className="text-xs text-white">{config.alertThresholds.performanceWarning}ms</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="100"
                  value={config.alertThresholds.performanceWarning}
                  onChange={(e) =>
                    handleUpdateConfig({
                      alertThresholds: {
                        ...config.alertThresholds,
                        performanceWarning: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PerformanceMonitorPanel
