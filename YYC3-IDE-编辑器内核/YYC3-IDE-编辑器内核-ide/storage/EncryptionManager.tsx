/**
 * @file: EncryptionManager.tsx
 * @description: YYC³ 加密管理组件 - 密钥管理、加密设置、加密状态
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: encryption,manager,ui,security
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Lock,
  Unlock,
  Key,
  Plus,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Shield,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react'
import EncryptionService, {
  type EncryptionStrength,
  type EncryptionConfig,
} from '../services/EncryptionService'
import { toastSuccess, toastError, toastWarning } from '../stores/useToastStore'
import { confirmWarning, confirmDanger } from '../stores/useConfirmStore'
import { logger } from "../services/Logger";

type TabId = 'overview' | 'keys' | 'settings'

interface TabDef {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const TABS: TabDef[] = [
  { id: 'overview', label: '加密状态', icon: Shield },
  { id: 'keys', label: '密钥管理', icon: Key },
  { id: 'settings', label: '加密设置', icon: Settings },
]

interface KeyInfo {
  id: string
  name: string
  createdAt: number
}

export function EncryptionManager() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [config, setConfig] = useState<EncryptionConfig>({
    enabled: false,
    strength: 'standard',
    keyId: '',
  })
  const [keys, setKeys] = useState<KeyInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')

  const encryptionService = EncryptionService.getInstance()

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const currentConfig = encryptionService.getConfig()
      const keyList = encryptionService.listKeys()
      setConfig(currentConfig)
      setKeys(keyList)
    } catch (e) {
      logger.error('[EncryptionManager] Failed to load data:', e);
    } finally {
      setIsLoading(false)
    }
  }, [encryptionService])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleToggleEncryption = async () => {
    setIsLoading(true)
    try {
      if (config.enabled) {
        if (!(await confirmWarning('禁用后，新数据将不再加密，但已加密的数据仍需要密钥才能解密。', '确定要禁用加密吗？'))) {
          return
        }
        await encryptionService.setEnabled(false)
      } else {
        if (!config.keyId) {
          toastWarning('请先创建或选择一个加密密钥')
          return
        }
        await encryptionService.setEnabled(true)
      }
      await loadData()
    } catch (e) {
      toastError(`操作失败: ${(e as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toastWarning('请输入密钥名称')
      return
    }

    setIsLoading(true)
    try {
      const keyId = await encryptionService.generateKey(newKeyName.trim())
      await loadData()
      setShowNewKeyDialog(false)
      setNewKeyName('')
      toastSuccess(`密钥创建成功！密钥ID: ${keyId}，请妥善保管此密钥，丢失将无法恢复加密数据。`)
    } catch (e) {
      toastError(`创建密钥失败: ${(e as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    if (!(await confirmDanger('删除密钥后，使用该密钥加密的数据将无法解密！', '删除密钥'))) {
      return
    }

    setIsLoading(true)
    try {
      await encryptionService.deleteKey(keyId)
      await loadData()
    } catch (e) {
      toastError(`删除密钥失败: ${(e as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetActiveKey = async (keyId: string) => {
    setIsLoading(true)
    try {
      await encryptionService.setActiveKey(keyId)
      await loadData()
      toastSuccess('已切换到选定的密钥')
    } catch (e) {
      toastError(`切换密钥失败: ${(e as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportKey = async (keyId: string) => {
    setIsLoading(true)
    try {
      await encryptionService.exportKey(keyId)
    } catch (e) {
      toastError(`导出密钥失败: ${(e as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImportKey = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsLoading(true)
      try {
        const keyId = await encryptionService.importKey(file)
        await loadData()
        toastSuccess(`密钥导入成功！密钥ID: ${keyId}`)
      } catch (e) {
        toastError(`导入密钥失败: ${(e as Error).message}`)
      } finally {
        setIsLoading(false)
      }
    }
    input.click()
  }

  const handleStrengthChange = async (strength: EncryptionStrength) => {
    setIsLoading(true)
    try {
      await encryptionService.setStrength(strength)
      await loadData()
    } catch (e) {
      toastError(`设置加密强度失败: ${(e as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN')
  }

  const getStrengthLabel = (strength: EncryptionStrength) => {
    switch (strength) {
      case 'maximum':
        return '最高'
      case 'high':
        return '高'
      default:
        return '标准'
    }
  }

  const getStrengthDescription = (strength: EncryptionStrength) => {
    switch (strength) {
      case 'maximum':
        return 'AES-256-GCM + 100万次迭代（最安全，性能较慢）'
      case 'high':
        return 'AES-256-GCM + 50万次迭代（安全，性能适中）'
      default:
        return 'AES-256-GCM + 10万次迭代（标准，性能最佳）'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">加密管理</h2>
          <p className="text-sm text-gray-400 mt-1">
            管理数据加密密钥和加密设置
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

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className={`p-6 rounded-xl border ${
            config.enabled
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-gray-500/10 border-gray-500/30'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {config.enabled ? (
                  <Lock className="w-8 h-8 text-emerald-400" />
                ) : (
                  <Unlock className="w-8 h-8 text-gray-400" />
                )}
                <div>
                  <h3 className="text-lg font-medium text-white">
                    {config.enabled ? '加密已启用' : '加密未启用'}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {config.enabled
                      ? '您的数据正在使用加密保护'
                      : '启用加密以保护您的敏感数据'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleEncryption}
                disabled={isLoading || (!config.enabled && !config.keyId)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  config.enabled
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                }`}
              >
                {config.enabled ? '禁用加密' : '启用加密'}
              </button>
            </div>

            {config.enabled && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.06]">
                <div>
                  <span className="text-sm text-gray-400">加密强度</span>
                  <div className="text-sm text-white mt-1">
                    {getStrengthLabel(config.strength)}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-400">活跃密钥</span>
                  <div className="text-sm text-white mt-1">
                    {keys.find((k) => k.id === config.keyId)?.name || '未设置'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-400 mb-1">加密说明</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• 使用 AES-256-GCM 算法进行数据加密</li>
                  <li>• 加密密钥存储在本地浏览器中</li>
                  <li>• 请妥善保管密钥，丢失将无法恢复加密数据</li>
                  <li>• 建议定期导出密钥备份</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'keys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewKeyDialog(true)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-400">创建密钥</span>
              </button>
              <button
                onClick={handleImportKey}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">导入密钥</span>
              </button>
            </div>
            <div className="text-sm text-gray-400">
              共 {keys.length} 个密钥
            </div>
          </div>

          {keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="w-12 h-12 text-gray-600 mb-4" />
              <p className="text-gray-400">暂无密钥</p>
              <p className="text-sm text-gray-500 mt-1">点击"创建密钥"开始加密您的数据</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className={`p-4 rounded-xl border transition-all ${
                    config.keyId === key.id
                      ? 'bg-emerald-500/10 border-emerald-500/50'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Key className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-white">{key.name}</span>
                        {config.keyId === key.id && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">
                            活跃
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        创建于 {formatTime(key.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.keyId !== key.id && (
                        <button
                          onClick={() => handleSetActiveKey(key.id)}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors disabled:opacity-50"
                          title="设为活跃密钥"
                        >
                          <span className="text-xs text-gray-300">激活</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleExportKey(key.id)}
                        disabled={isLoading}
                        className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                        title="导出密钥"
                      >
                        <Download className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        disabled={isLoading}
                        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                        title="删除密钥"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showNewKeyDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-gray-900 rounded-xl border border-white/[0.06] p-6 w-96">
                <h3 className="text-lg font-medium text-white mb-4">创建新密钥</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">密钥名称</label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="例如：主密钥"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowNewKeyDialog(false)
                        setNewKeyName('')
                      }}
                      className="px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-gray-300 hover:border-white/[0.12] transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleCreateKey}
                      disabled={isLoading || !newKeyName.trim()}
                      className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                    >
                      创建
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-medium text-white mb-4">加密强度</h3>

            <div className="space-y-3">
              {(['standard', 'high', 'maximum'] as EncryptionStrength[]).map((strength) => (
                <div
                  key={strength}
                  onClick={() => handleStrengthChange(strength)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    config.strength === strength
                      ? 'bg-blue-500/10 border-blue-500/50'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">
                      {getStrengthLabel(strength)}
                    </span>
                    {config.strength === strength && (
                      <CheckCircle className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {getStrengthDescription(strength)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-400 mb-1">重要提示</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• 更改加密强度只影响新加密的数据</li>
                  <li>• 已加密的数据仍使用原强度解密</li>
                  <li>• 更高强度会降低性能，但提供更好的安全性</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EncryptionManager
