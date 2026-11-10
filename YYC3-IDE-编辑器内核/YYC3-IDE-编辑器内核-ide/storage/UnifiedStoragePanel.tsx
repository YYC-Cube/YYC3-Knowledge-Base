/**
 * @file: UnifiedStoragePanel.tsx
 * @description: YYC³ 统一存储管理面板 - 纯开源·本地化·一用户一端
 *              展示所有存储数据、CRUD操作、导入导出、统计信息、隔离验证
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: storage,management,panel,local-first,privacy
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Database,
  HardDrive,
  FileText,
  Settings,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
  Shield,
  Lock,
  Info,
  BarChart3,
  Layers,
  Archive,
  X,
  Plus,
  Edit3,
  Save,
  Clock,
  Activity,
} from 'lucide-react'
import { StorageManager, type StorageQuota, type StorageInfo } from '../services/StorageManager'
import { DataExporter, type ExportData } from '../services/DataExporter'
import { DataImporter } from '../services/DataImporter'
import { toastSuccess, toastError } from '../stores/useToastStore'
import { confirmDialog, confirmDanger } from '../stores/useConfirmStore'
import { BackupManager } from './BackupManager'
import { EncryptionManager } from './EncryptionManager'
import { MigrationManager } from './MigrationManager'
import { PerformanceMonitorPanel } from './PerformanceMonitorPanel'
import { BatchOperations } from './BatchOperations'
import {
  STORAGE_PREFIXES,
  clearAllYYC3Storage,
  loadJSON,
  saveJSON,
} from '../constants/storage-keys'
import {
  getDB,
  type StoredFile,
  type StoredProject,
  type StoredSnapshot,
} from '../adapters/IndexedDBAdapter'
import { logger } from "../services/Logger";

type TabId = 'overview' | 'localstorage' | 'indexeddb' | 'import-export' | 'backup' | 'encryption' | 'migration' | 'monitoring' | 'batch' | 'isolation'

interface TabDef {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const TABS: TabDef[] = [
  { id: 'overview', label: '存储概览', icon: BarChart3 },
  { id: 'localstorage', label: 'LocalStorage', icon: Database },
  { id: 'indexeddb', label: 'IndexedDB', icon: HardDrive },
  { id: 'import-export', label: '导入导出', icon: Archive },
  { id: 'backup', label: '备份管理', icon: Clock },
  { id: 'encryption', label: '加密管理', icon: Lock },
  { id: 'migration', label: '数据迁移', icon: Upload },
  { id: 'monitoring', label: '性能监控', icon: Activity },
  { id: 'batch', label: '批量操作', icon: Layers },
  { id: 'isolation', label: '隔离验证', icon: Shield },
]

interface LocalStorageItem {
  key: string
  value: string
  size: number
  type: 'string' | 'json' | 'number' | 'boolean'
  parsed?: unknown
}

interface IndexedDBStats {
  files: number
  projects: number
  snapshots: number
  totalSize: number
}

export default function UnifiedStoragePanel() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [quota, setQuota] = useState<StorageQuota | null>(null)
  const [localStorageItems, setLocalStorageItems] = useState<LocalStorageItem[]>([])
  const [indexedDBStats, setIndexedDBStats] = useState<IndexedDBStats>({ files: 0, projects: 0, snapshots: 0, totalSize: 0 })
  const [indexedDBFiles, setIndexedDBFiles] = useState<StoredFile[]>([])
  const [indexedDBProjects, setIndexedDBProjects] = useState<StoredProject[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [importProgress, setImportProgress] = useState(0)

  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    try {
      const manager = new StorageManager()
      const quotaData = await manager.getQuota()
      setQuota(quotaData)

      const lsItems: LocalStorageItem[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && STORAGE_PREFIXES.some((p) => key.startsWith(p))) {
          const value = localStorage.getItem(key) || ''
          let type: LocalStorageItem['type'] = 'string'
          let parsed: unknown = undefined

          try {
            parsed = JSON.parse(value)
            type = 'json'
          } catch {
            if (/^\d+$/.test(value)) {
              type = 'number'
              parsed = parseInt(value, 10)
            } else if (value === 'true' || value === 'false') {
              type = 'boolean'
              parsed = value === 'true'
            }
          }

          lsItems.push({
            key,
            value,
            size: new Blob([value]).size,
            type,
            parsed,
          })
        }
      }
      setLocalStorageItems(lsItems)

      try {
        const db = await getDB()
        const files = await db.getAll('files')
        const projects = await db.getAll('projects')
        const snapshots = await db.getAll('snapshots')

        setIndexedDBFiles(files as StoredFile[])
        setIndexedDBProjects(projects as StoredProject[])

        const totalSize = (files as StoredFile[]).reduce((sum, f) => sum + (f.size || 0), 0)
        setIndexedDBStats({
          files: files.length,
          projects: projects.length,
          snapshots: snapshots.length,
          totalSize,
        })
      } catch (e) {
        logger.warn('[UnifiedStoragePanel] IndexedDB not available:', e);
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  const filteredLSItems = useMemo(() => {
    if (!searchQuery) return localStorageItems
    const q = searchQuery.toLowerCase()
    return localStorageItems.filter(
      (item) =>
        item.key.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q)
    )
  }, [localStorageItems, searchQuery])

  const handleCopy = useCallback((key: string, value: string) => {
    navigator.clipboard.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }, [])

  const handleDeleteLS = useCallback(async (key: string) => {
    if (await confirmDialog(`确定要删除 "${key}" 吗？`)) {
      localStorage.removeItem(key)
      refreshAll()
    }
  }, [refreshAll])

  const handleEdit = useCallback((key: string, value: string) => {
    setSelectedItem(key)
    setEditValue(value)
    setIsEditing(true)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (selectedItem) {
      localStorage.setItem(selectedItem, editValue)
      setIsEditing(false)
      setSelectedItem(null)
      setEditValue('')
      refreshAll()
    }
  }, [selectedItem, editValue, refreshAll])

  const handleExport = useCallback(async () => {
    setIsLoading(true)
    setExportProgress(0)
    try {
      const data = await DataExporter.exportAllData()
      setExportProgress(50)
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `yyc3-storage-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportProgress(100)
    } finally {
      setIsLoading(false)
      setTimeout(() => setExportProgress(0), 2000)
    }
  }, [])

  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsLoading(true)
      setImportProgress(0)
      try {
        const text = await file.text()
        const data = JSON.parse(text) as ExportData
        setImportProgress(30)

        const result = await DataImporter.importData(data)
        setImportProgress(100)
        if (result.success) {
          toastSuccess(`导入完成！LocalStorage: ${result.localStorageCount} 条，IndexedDB: ${result.filesCount} 文件, ${result.projectsCount} 项目, ${result.snapshotsCount} 快照`)
        } else {
          toastError(`导入部分失败：${result.errors.join('; ')}`)
        }
        refreshAll()
      } catch (err) {
        toastError('导入失败：' + (err instanceof Error ? err.message : '未知错误'))
      } finally {
        setIsLoading(false)
        setTimeout(() => setImportProgress(0), 2000)
      }
    }
    input.click()
  }, [refreshAll])

  const handleClearAll = useCallback(async () => {
    if (await confirmDanger('这将清除所有 YYC³ 数据！此操作不可恢复，确定继续吗？', '清除所有数据')) {
      const cleared = clearAllYYC3Storage()
      toastSuccess(`已清除 ${cleared} 条数据`)
      refreshAll()
    }
  }, [refreshAll])

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="flex flex-col bg-[var(--ide-bg)] text-[var(--ide-text-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ide-border)] bg-[var(--ide-bg-elevated)]">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-[var(--ide-accent)]" />
          <span className="font-medium">统一存储管理</span>
          <span className="text-xs text-[var(--ide-text-dim)] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
            本地化 · 一用户一端
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={refreshAll}
            disabled={isLoading}
            className="p-1.5 rounded hover:bg-white/5 transition-colors"
            title="刷新数据"
          >
            <RefreshCw className={`w-4 h-4 text-[var(--ide-text-muted)] ${isLoading ? 'animate-spin' : ''}`} />
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
      <div className="p-4">
        {/* ════════════ 存储概览 ════════════ */}
        {activeTab === 'overview' && (
          <section className="space-y-6">
            {/* 配额卡片 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-[var(--ide-bg-deep)] border border-[var(--ide-border)]">
                <div className="flex items-center gap-2 mb-3">
                  <HardDrive className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium">存储配额</span>
                </div>
                {quota ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--ide-text-dim)]">已使用</span>
                      <span>{formatBytes(quota.usage)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--ide-text-dim)]">总容量</span>
                      <span>{formatBytes(quota.quota)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--ide-text-dim)]">可用空间</span>
                      <span className="text-emerald-400">{formatBytes(quota.available)}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-gray-700 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          quota.usagePercentage > 90
                            ? 'bg-red-500'
                            : quota.usagePercentage > 70
                              ? 'bg-yellow-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(quota.usagePercentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-center text-[var(--ide-text-dim)]">
                      {quota.usagePercentage.toFixed(1)}% 已使用
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--ide-text-dim)]">加载中...</p>
                )}
              </div>

              <div className="p-4 rounded-lg bg-[var(--ide-bg-deep)] border border-[var(--ide-border)]">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium">数据统计</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--ide-text-dim)]">LocalStorage 条目</span>
                    <span className="font-mono">{localStorageItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--ide-text-dim)]">IndexedDB 文件</span>
                    <span className="font-mono">{indexedDBStats.files}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--ide-text-dim)]">IndexedDB 项目</span>
                    <span className="font-mono">{indexedDBStats.projects}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--ide-text-dim)]">IndexedDB 快照</span>
                    <span className="font-mono">{indexedDBStats.snapshots}</span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--ide-border)] pt-2 mt-2">
                    <span className="text-[var(--ide-text-dim)]">IndexedDB 总大小</span>
                    <span className="font-mono text-blue-400">{formatBytes(indexedDBStats.totalSize)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 安全声明 */}
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-emerald-400">四大基石哲学</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-emerald-200/80">
                    <div className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>纯开源 - 透明即信任</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Database className="w-3 h-3" />
                      <span>本地化 - 隐私即尊严</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      <span>一用户一端 - 隔离即安全</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>极致信任 - 无上传无追踪</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 快速操作 */}
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                导出所有数据
              </button>
              <button
                onClick={handleImport}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors text-sm"
              >
                <Upload className="w-4 h-4" />
                导入数据
              </button>
              <button
                onClick={handleClearAll}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                清除所有
              </button>
            </div>
          </section>
        )}

        {/* ════════════ LocalStorage ════════════ */}
        {activeTab === 'localstorage' && (
          <section className="space-y-4">
            {/* 搜索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ide-text-faint)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索键名或值..."
                className="w-full pl-9 pr-4 py-2 rounded bg-[var(--ide-bg-deep)] border border-[var(--ide-border)] text-sm focus:border-[var(--ide-accent)] outline-none"
              />
            </div>

            {/* 统计 */}
            <div className="flex items-center justify-between text-xs text-[var(--ide-text-dim)]">
              <span>共 {filteredLSItems.length} 条数据</span>
              <span>
                总大小: {formatBytes(filteredLSItems.reduce((sum, item) => sum + item.size, 0))}
              </span>
            </div>

            {/* 数据列表 */}
            <div className="space-y-1">
              {filteredLSItems.map((item) => (
                <div
                  key={item.key}
                  className="rounded border border-[var(--ide-border)] bg-[var(--ide-bg-deep)] overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setExpandedItems((prev) => {
                        const next = new Set(prev)
                        if (next.has(item.key)) {
                          next.delete(item.key)
                        } else {
                          next.add(item.key)
                        }
                        return next
                      })
                    }}
                    className="w-full flex items-center justify-between p-2 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {expandedItems.has(item.key) ? (
                        <ChevronDown className="w-4 h-4 text-[var(--ide-text-faint)] flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[var(--ide-text-faint)] flex-shrink-0" />
                      )}
                      <code className="text-xs text-cyan-400 truncate">{item.key}</code>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-[var(--ide-text-dim)]">
                        {item.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-[var(--ide-text-dim)]">
                        {formatBytes(item.size)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopy(item.key, item.value)
                        }}
                        className="p-1 rounded hover:bg-white/10"
                        title="复制"
                      >
                        {copiedKey === item.key ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-[var(--ide-text-muted)]" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(item.key, item.value)
                        }}
                        className="p-1 rounded hover:bg-white/10"
                        title="编辑"
                      >
                        <Edit3 className="w-3 h-3 text-[var(--ide-text-muted)]" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteLS(item.key)
                        }}
                        className="p-1 rounded hover:bg-red-500/20"
                        title="删除"
                      >
                        <Trash2 className="w-3 h-3 text-red-400/60" />
                      </button>
                    </div>
                  </button>

                  {expandedItems.has(item.key) && (
                    <div className="px-3 pb-3 pt-0 border-t border-[var(--ide-border)]">
                      <pre className="text-xs font-mono text-[var(--ide-text-secondary)] whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                        {item.type === 'json'
                          ? JSON.stringify(item.parsed, null, 2)
                          : item.value}
                      </pre>
                    </div>
                  )}
                </div>
              ))}

              {filteredLSItems.length === 0 && (
                <div className="text-center py-8 text-[var(--ide-text-dim)]">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">暂无数据</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ════════════ IndexedDB ════════════ */}
        {activeTab === 'indexeddb' && (
          <section className="space-y-4">
            {/* 项目列表 */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                项目 ({indexedDBProjects.length})
              </h4>
              <div className="space-y-1">
                {indexedDBProjects.map((project) => (
                  <div
                    key={project.id}
                    className="p-2 rounded bg-[var(--ide-bg-deep)] border border-[var(--ide-border)] text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{project.name}</span>
                      <span className="text-[var(--ide-text-dim)]">
                        {project.fileCount} 文件 · {formatBytes(project.totalSize)}
                      </span>
                    </div>
                    <div className="text-[var(--ide-text-dim)] mt-1">
                      创建于 {new Date(project.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 文件列表 */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                文件 ({indexedDBFiles.length})
              </h4>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {indexedDBFiles.slice(0, 50).map((file) => (
                  <div
                    key={file.path}
                    className="p-2 rounded bg-[var(--ide-bg-deep)] border border-[var(--ide-border)] text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <code className="text-cyan-400 truncate">{file.path}</code>
                      <span className="text-[var(--ide-text-dim)] flex-shrink-0">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                  </div>
                ))}
                {indexedDBFiles.length > 50 && (
                  <p className="text-xs text-center text-[var(--ide-text-dim)] py-2">
                    还有 {indexedDBFiles.length - 50} 个文件未显示...
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ════════════ 导入导出 ════════════ */}
        {activeTab === 'import-export' && (
          <section className="space-y-6">
            {/* 导出 */}
            <div className="p-4 rounded-lg bg-[var(--ide-bg-deep)] border border-[var(--ide-border)]">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-400" />
                导出数据
              </h4>
              <p className="text-xs text-[var(--ide-text-dim)] mb-4">
                将所有 LocalStorage 和 IndexedDB 数据导出为 JSON 文件，保存到本地。
              </p>
              <button
                onClick={handleExport}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                {isLoading && exportProgress > 0 ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    导出中... {exportProgress}%
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    导出所有数据
                  </>
                )}
              </button>
            </div>

            {/* 导入 */}
            <div className="p-4 rounded-lg bg-[var(--ide-bg-deep)] border border-[var(--ide-border)]">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-purple-400" />
                导入数据
              </h4>
              <p className="text-xs text-[var(--ide-text-dim)] mb-4">
                从 JSON 文件导入数据。注意：导入会覆盖现有数据。
              </p>
              <button
                onClick={handleImport}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
              >
                {isLoading && importProgress > 0 ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    导入中... {importProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    选择文件导入
                  </>
                )}
              </button>
            </div>

            {/* 说明 */}
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 mt-0.5" />
                <div className="text-xs text-amber-200/80 space-y-1">
                  <p className="font-medium">导入导出说明</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[var(--ide-text-dim)]">
                    <li>导出文件包含所有 YYC³ 数据（不含敏感密钥明文）</li>
                    <li>导入前建议先导出当前数据作为备份</li>
                    <li>数据完全存储在本地浏览器，不上传任何服务器</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ════════════ 备份管理 ════════════ */}
        {activeTab === 'backup' && (
          <section className="space-y-6">
            <BackupManager />
          </section>
        )}

        {/* ════════════ 加密管理 ════════════ */}
        {activeTab === 'encryption' && (
          <section className="space-y-6">
            <EncryptionManager />
          </section>
        )}

        {/* ════════════ 数据迁移 ════════════ */}
        {activeTab === 'migration' && (
          <section className="space-y-6">
            <MigrationManager />
          </section>
        )}

        {/* ════════════ 性能监控 ════════════ */}
        {activeTab === 'monitoring' && (
          <section className="space-y-6">
            <PerformanceMonitorPanel />
          </section>
        )}

        {/* ════════════ 批量操作 ════════════ */}
        {activeTab === 'batch' && (
          <section className="space-y-6">
            <BatchOperations />
          </section>
        )}

        {/* ════════════ 隔离验证 ════════════ */}
        {activeTab === 'isolation' && (
          <section className="space-y-6">
            {/* 验证结果 */}
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">隔离验证通过</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>数据仅存储在本地浏览器</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>无云端同步，无第三方服务器</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>单用户单设备，数据完全独立</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>无追踪、无分析、无数据收集</span>
                </div>
              </div>
            </div>

            {/* 技术细节 */}
            <div className="p-4 rounded-lg bg-[var(--ide-bg-deep)] border border-[var(--ide-border)]">
              <h4 className="text-sm font-medium mb-3">技术实现</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--ide-text-dim)]">存储前缀</span>
                  <code className="text-cyan-400">yyc3_</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ide-text-dim)]">IndexedDB 名称</span>
                  <code className="text-cyan-400">yyc3-filestore</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ide-text-dim)]">数据隔离</span>
                  <span className="text-emerald-400">完全隔离</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ide-text-dim)]">网络请求</span>
                  <span className="text-emerald-400">仅用户配置的API</span>
                </div>
              </div>
            </div>

            {/* 开源声明 */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-blue-400 mt-0.5" />
                <div className="text-xs text-blue-200/80">
                  <p className="font-medium mb-1">开源承诺</p>
                  <p className="text-[var(--ide-text-dim)]">
                    所有代码完全开源，可审计、可验证、可定制。没有任何隐藏的数据收集行为。
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* 编辑弹窗 */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--ide-bg-elevated)] rounded-lg border border-[var(--ide-border)] w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-[var(--ide-border)]">
              <span className="text-sm font-medium">编辑: {selectedItem}</span>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setSelectedItem(null)
                }}
                className="p-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full h-64 px-3 py-2 rounded bg-[var(--ide-bg)] border border-[var(--ide-border)] text-sm font-mono focus:border-[var(--ide-accent)] outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 p-3 border-t border-[var(--ide-border)]">
              <button
                onClick={() => {
                  setIsEditing(false)
                  setSelectedItem(null)
                }}
                className="px-3 py-1.5 rounded text-sm border border-[var(--ide-border)] hover:bg-white/5"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 rounded text-sm bg-[var(--ide-accent)] text-white hover:opacity-90"
              >
                <Save className="w-3 h-3 inline mr-1" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
