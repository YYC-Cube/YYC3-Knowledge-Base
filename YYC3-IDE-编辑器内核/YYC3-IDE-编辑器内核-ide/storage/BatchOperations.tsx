/**
 * @file: BatchOperations.tsx
 * @description: YYC³ 批量操作组件 - 批量编辑、删除、导出
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: batch,operations,edit,delete,export
 */

import React, { useState, useMemo } from 'react'
import {
  CheckSquare,
  Square,
  Trash2,
  Download,
  Edit3,
  X,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { logger } from "../services/Logger";

interface StorageItem {
  key: string
  value: string
  selected?: boolean
}

type OperationType = 'edit' | 'delete' | 'export'
type StorageType = 'localStorage' | 'indexedDB'

export function BatchOperations() {
  const [storageType, setStorageType] = useState<StorageType>('localStorage')
  const [items, setItems] = useState<StorageItem[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [operation, setOperation] = useState<OperationType | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const loadItems = () => {
    if (storageType === 'localStorage') {
      const loadedItems: StorageItem[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          const value = localStorage.getItem(key)
          if (value) {
            loadedItems.push({ key, value })
          }
        }
      }
      setItems(loadedItems)
    }
    setSelectedKeys(new Set())
  }

  React.useEffect(() => {
    loadItems()
  }, [storageType])

  const toggleSelection = (key: string) => {
    const newSelected = new Set(selectedKeys)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedKeys(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedKeys.size === items.length) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(items.map((item) => item.key)))
    }
  }

  const handleBatchDelete = () => {
    setOperation('delete')
    setShowConfirm(true)
  }

  const handleBatchEdit = () => {
    if (selectedKeys.size === 0) return

    const firstItem = items.find((item) => selectedKeys.has(item.key))
    if (firstItem) {
      setEditValue(firstItem.value)
      setOperation('edit')
    }
  }

  const handleBatchExport = async () => {
    if (selectedKeys.size === 0) return

    setOperation('export')
    try {
      const selectedItems = items.filter((item) => selectedKeys.has(item.key))
      const data = {
        exportedAt: new Date().toISOString(),
        source: storageType,
        items: selectedItems,
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `yyc3-batch-export-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)

      setResult({ success: true, message: `成功导出 ${selectedKeys.size} 项数据` })
    } catch (error) {
      setResult({ success: false, message: `导出失败: ${(error as Error).message}` })
    }

    setTimeout(() => setResult(null), 3000)
    setOperation(null)
  }

  const confirmOperation = () => {
    if (operation === 'delete') {
      let deletedCount = 0
      selectedKeys.forEach((key) => {
        try {
          localStorage.removeItem(key)
          deletedCount++
        } catch (error) {
          logger.error(`Failed to delete ${key}:`, error);
        }
      })

      setResult({ success: true, message: `成功删除 ${deletedCount} 项数据` })
      loadItems()
    } else if (operation === 'edit') {
      let editedCount = 0
      selectedKeys.forEach((key) => {
        try {
          localStorage.setItem(key, editValue)
          editedCount++
        } catch (error) {
          logger.error(`Failed to edit ${key}:`, error);
        }
      })

      setResult({ success: true, message: `成功编辑 ${editedCount} 项数据` })
      loadItems()
    }

    setShowConfirm(false)
    setOperation(null)
    setSelectedKeys(new Set())
    setTimeout(() => setResult(null), 3000)
  }

  const cancelOperation = () => {
    setShowConfirm(false)
    setOperation(null)
    setEditValue('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">批量操作</h2>
          <p className="text-sm text-gray-400 mt-1">批量编辑、删除或导出存储数据</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={storageType}
            onChange={(e) => setStorageType(e.target.value as StorageType)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-sm"
          >
            <option value="localStorage">LocalStorage</option>
            <option value="indexedDB">IndexedDB</option>
          </select>
          <button
            onClick={loadItems}
            className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
          >
            <Download className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {result && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            result.success
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm">{result.message}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors text-sm text-gray-300"
        >
          {selectedKeys.size === items.length ? (
            <CheckSquare className="w-4 h-4 text-blue-400" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          <span>{selectedKeys.size === items.length ? '取消全选' : '全选'}</span>
        </button>

        <div className="flex-1" />

        <button
          onClick={handleBatchEdit}
          disabled={selectedKeys.size === 0}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <Edit3 className="w-4 h-4" />
          <span>批量编辑</span>
        </button>

        <button
          onClick={handleBatchDelete}
          disabled={selectedKeys.size === 0}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <Trash2 className="w-4 h-4" />
          <span>批量删除</span>
        </button>

        <button
          onClick={handleBatchExport}
          disabled={selectedKeys.size === 0}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <Download className="w-4 h-4" />
          <span>批量导出</span>
        </button>
      </div>

      {selectedKeys.size > 0 && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <span className="text-sm text-blue-400">已选择 {selectedKeys.size} 项</span>
        </div>
      )}

      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-8 text-center text-gray-400">暂无数据</div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {items.map((item) => (
                <div
                  key={item.key}
                  className={`flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors cursor-pointer ${
                    selectedKeys.has(item.key) ? 'bg-blue-500/5' : ''
                  }`}
                  onClick={() => toggleSelection(item.key)}
                >
                  {selectedKeys.has(item.key) ? (
                    <CheckSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{item.key}</div>
                    <div className="text-xs text-gray-400 truncate mt-0.5">
                      {item.value.length > 100 ? `${item.value.substring(0, 100)}...` : item.value}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">{item.value.length} 字符</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              <h3 className="text-lg font-medium text-white">确认操作</h3>
            </div>

            {operation === 'edit' && (
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">新值</label>
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-sm resize-none"
                  rows={4}
                />
              </div>
            )}

            <p className="text-sm text-gray-400 mb-6">
              {operation === 'delete' && `确定要删除选中的 ${selectedKeys.size} 项数据吗？此操作不可撤销。`}
              {operation === 'edit' && `确定要将选中的 ${selectedKeys.size} 项数据修改为新值吗？`}
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={cancelOperation}
                className="px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-gray-300 hover:border-white/[0.12] transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={confirmOperation}
                className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                  operation === 'delete'
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                }`}
              >
                确认{operation === 'delete' ? '删除' : '编辑'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BatchOperations
