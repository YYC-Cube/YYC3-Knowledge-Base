/**
 * @file: BackupManager.tsx
 * @description: YYC³ 备份管理组件 - 备份列表、创建、恢复、设置
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: backup,manager,ui,restore
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Save,
  Clock,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle,
  Info,
  Archive,
  Calendar,
  HardDrive,
} from 'lucide-react'
import backupService, {
  type BackupInfo,
  type BackupConfig,
  type BackupData,
} from '../services/BackupService'
import { toastSuccess, toastError } from '../stores/useToastStore'
import { confirmDialog, confirmWarning } from '../stores/useConfirmStore'
import { usePromptStore } from '../stores/usePromptStore'
import { logger } from "../services/Logger";

type TabId = 'backups' | 'settings' | 'stats'

interface TabDef {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const TABS: TabDef[] = [
  { id: 'backups', label: '备份列表', icon: Archive },
  { id: 'settings', label: '备份设置', icon: Settings },
  { id: 'stats', label: '备份统计', icon: HardDrive },
]

export function BackupManager() {
  const [activeTab, setActiveTab] = useState<TabId>('backups')
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [config, setConfig] = useState<BackupConfig>({
    enabled: true,
    interval: 3600000,
    maxBackups: 10,
    autoBackupOnExit: true,
    compressBackups: false,
  })
  const [stats, setStats] = useState({
    total: 0,
    autoCount: 0,
    manualCount: 0,
    totalSize: 0,
    oldestBackup: null as number | null,
    newestBackup: null as number | null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null)
  const [backupDetail, setBackupDetail] = useState<BackupData | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [backupList, currentConfig, backupStats] = await Promise.all([
        backupService.listBackups(),
        backupService.getConfig(),
        backupService.getBackupStats(),
      ])
      setBackups(backupList)
      setConfig(currentConfig)
      setStats(backupStats as unknown as typeof stats)
    } catch (e) {
      logger.error('[BackupManager] Failed to load data:', e);
    } finally {
      setIsLoading(false)
    }
  }, [backupService])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateBackup = async () => {
    if (!(await confirmDialog('确定要创建新备份吗？'))) return

    setIsLoading(true)
    try {
      const description = await usePromptStore.getState().openPrompt({
        title: '创建备份',
        message: '请输入备份描述（可选）',
        placeholder: '备份描述...',
        confirmLabel: '创建',
      })
      await backupService.createBackup('manual', description || undefined)
      await loadData()
      toastSuccess('备份创建成功！')
    } catch (e) {
      toastError(`创建备份失败: ${(e as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestoreBackup = async (id: string) => {
    if (!(await confirmWarning('恢复备份将覆盖当前所有数据！\n\n确定要继续吗？'))) return

    setIsLoading(true)
    try {
      const result = await backupService.restoreBackup(id)
      if (result.success) {
        toastSuccess(`${result.message}，建议刷新页面以加载恢复的数据。`)
        window.location.reload()
      } else {
        toastError(result.message)
      }
    } catch (e) {
      toastError(`恢复失败: ${(e as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteBackup = async (id: string) => {
    if (!(await confirmDialog('确定要删除此备份吗？'))) return

    setIsLoading(true)
    try {
      await backupService.deleteBackup(id)
      await loadData()
      if (selectedBackup === id) {
        setSelectedBackup(null)
        setBackupDetail(null)
      }
    } catch (e) {
      toastError(`删除失败: ${(e as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportBackup = async (id: string) => {
    setIsLoading(true)
    try {
      await backupService.exportBackup(id)
    } catch (e) {
      toastError(`导出失败: ${(e as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImportBackup = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsLoading(true)
      try {
        const id = await backupService.importBackup(file)
        await loadData()
        toastSuccess(`备份导入成功！ID: ${id}`)
      } catch (e) {
        toastError(`导入失败: ${(e as Error).message}`)
      } finally {
        setIsLoading(false)
      }
    }
    input.click()
  }

  const handleViewBackup = async (id: string) => {
    setIsLoading(true)
    try {
      const detail = await backupService.getBackup(id)
      setBackupDetail(detail)
      setSelectedBackup(id)
    } catch (e) {
      toastError(`获取备份详情失败: ${(e as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfigChange = (key: keyof BackupConfig, value: number | boolean) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    backupService.updateConfig({ [key]: value })
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN')
  }

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    if (hours > 0) return `${hours}小时${minutes}分钟`
    return `${minutes}分钟`
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">备份管理</h2>
          <p className="text-sm text-gray-400 mt-1">
            管理数据备份，支持自动备份和手动备份
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm text-gray-300">刷新</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-lg border border-white/[0.06]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-500/20 text-blue-400 shadow-sm'
                : 'text-gray-400 hover:bg-white/[0.04]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'backups' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateBackup}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-400">创建备份</span>
              </button>
              <button
                onClick={handleImportBackup}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">导入备份</span>
              </button>
            </div>
            <div className="text-sm text-gray-400">
              共 {backups.length} 个备份
            </div>
          </div>

          {backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Archive className="w-12 h-12 text-gray-600 mb-4" />
              <p className="text-gray-400">暂无备份</p>
              <p className="text-sm text-gray-500 mt-1">点击"创建备份"开始备份您的数据</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className={`p-4 rounded-xl border transition-all ${
                    selectedBackup === backup.id
                      ? 'bg-blue-500/10 border-blue-500/50'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            backup.type === 'auto'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {backup.type === 'auto' ? '自动' : '手动'}
                        </span>
                        <span className="text-sm text-gray-300">
                          {formatTime(backup.createdAt)}
                        </span>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-400">{backup.size}</span>
                      </div>
                      {backup.description && (
                        <p className="text-sm text-gray-400 mb-2">{backup.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewBackup(backup.id)}
                        disabled={isLoading}
                        className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                        title="查看详情"
                      >
                        <Info className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleExportBackup(backup.id)}
                        disabled={isLoading}
                        className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                        title="导出备份"
                      >
                        <Download className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleRestoreBackup(backup.id)}
                        disabled={isLoading}
                        className="p-2 rounded-lg hover:bg-emerald-500/20 transition-colors"
                        title="恢复备份"
                      >
                        <RefreshCw className="w-4 h-4 text-emerald-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(backup.id)}
                        disabled={isLoading}
                        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                        title="删除备份"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>

                  {selectedBackup === backup.id && backupDetail && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06]">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">LocalStorage 项:</span>
                          <span className="ml-2 text-gray-300">
                            {backupDetail.metadata.metadata.localStorageCount}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">IndexedDB 文件:</span>
                          <span className="ml-2 text-gray-300">
                            {backupDetail.metadata.metadata.indexedDBFiles}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">项目数量:</span>
                          <span className="ml-2 text-gray-300">
                            {backupDetail.metadata.metadata.indexedDBProjects}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">快照数量:</span>
                          <span className="ml-2 text-gray-300">
                            {backupDetail.metadata.metadata.indexedDBSnapshots}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-medium text-white mb-4">自动备份设置</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-300">启用自动备份</div>
                  <div className="text-xs text-gray-500 mt-1">定期自动创建数据备份</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-300">备份间隔</div>
                  <div className="text-xs text-gray-500 mt-1">自动备份的时间间隔</div>
                </div>
                <select
                  value={config.interval}
                  onChange={(e) => handleConfigChange('interval', parseInt(e.target.value))}
                  disabled={!config.enabled}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-gray-300 disabled:opacity-50"
                >
                  <option value={1800000}>30分钟</option>
                  <option value={3600000}>1小时</option>
                  <option value={7200000}>2小时</option>
                  <option value={14400000}>4小时</option>
                  <option value={28800000}>8小时</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-300">最大备份数量</div>
                  <div className="text-xs text-gray-500 mt-1">保留的备份数量上限</div>
                </div>
                <select
                  value={config.maxBackups}
                  onChange={(e) => handleConfigChange('maxBackups', parseInt(e.target.value))}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-gray-300"
                >
                  <option value={5}>5个</option>
                  <option value={10}>10个</option>
                  <option value={20}>20个</option>
                  <option value={50}>50个</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-300">退出时自动备份</div>
                  <div className="text-xs text-gray-500 mt-1">关闭应用时自动创建备份</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoBackupOnExit}
                    onChange={(e) => handleConfigChange('autoBackupOnExit', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-400 mb-1">注意事项</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• 备份存储在本地浏览器中，清除浏览器数据会删除备份</li>
                  <li>• 建议定期导出重要备份到本地文件系统</li>
                  <li>• 恢复备份会覆盖当前所有数据，请谨慎操作</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <Archive className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-400">总备份数</span>
              </div>
              <div className="text-2xl font-semibold text-white">{stats.total}</div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-gray-400">总大小</span>
              </div>
              <div className="text-2xl font-semibold text-white">{formatSize(stats.totalSize)}</div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-400">自动备份</span>
              </div>
              <div className="text-2xl font-semibold text-white">{stats.autoCount}</div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <Save className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-gray-400">手动备份</span>
              </div>
              <div className="text-2xl font-semibold text-white">{stats.manualCount}</div>
            </div>
          </div>

          {stats.newestBackup && stats.oldestBackup && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <h3 className="text-sm font-medium text-white mb-3">备份时间范围</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">最新备份:</span>
                  <span className="text-gray-300">{formatTime(stats.newestBackup)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">最早备份:</span>
                  <span className="text-gray-300">{formatTime(stats.oldestBackup)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">时间跨度:</span>
                  <span className="text-gray-300">
                    {formatDuration(stats.newestBackup - stats.oldestBackup)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-400 mb-1">备份状态</h4>
                <p className="text-xs text-gray-400">
                  {config.enabled
                    ? `自动备份已启用，每 ${formatDuration(config.interval)} 自动备份一次`
                    : '自动备份已禁用，请手动创建备份'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BackupManager
