/**
 * @file: MigrationManager.tsx
 * @description: YYC³ 数据迁移管理组件 - 迁移向导、数据预览、格式转换
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: migration,manager,ui,wizard
 */

import React, { useState, useCallback } from 'react'
import {
  Upload,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
} from 'lucide-react'
import MigrationService, {
  type DataSource,
  type DataFormat,
  type MigrationResult,
} from '../services/MigrationService'
import { logger } from "../services/Logger";

type StepId = 'select' | 'preview' | 'migrate' | 'complete'

interface StepDef {
  id: StepId
  title: string
}

const STEPS: StepDef[] = [
  { id: 'select', title: '选择数据' },
  { id: 'preview', title: '预览数据' },
  { id: 'migrate', title: '执行迁移' },
  { id: 'complete', title: '完成' },
]

export function MigrationManager() {
  const [currentStep, setCurrentStep] = useState<StepId>('select')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [detectedFormat, setDetectedFormat] = useState<DataFormat | null>(null)
  const [selectedSource, setSelectedSource] = useState<DataSource>('yyc3')
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const migrationService = MigrationService.getInstance()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setIsLoading(true)

    try {
      const format = await migrationService.detectFormat(file)
      setDetectedFormat(format)
      if (format) {
        setSelectedSource(format.source)
      }
    } catch (error) {
      logger.error('[MigrationManager] Failed to detect format:', error);
    } finally {
      setIsLoading(false)
    }
  }

  const handleNext = () => {
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep)
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id)
    }
  }

  const handlePrev = () => {
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep)
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id)
    }
  }

  const handleMigrate = async () => {
    if (!selectedFile) return

    setIsLoading(true)
    setCurrentStep('migrate')

    try {
      const result = await migrationService.migrate(selectedFile, selectedSource)
      setMigrationResult(result)
      setCurrentStep('complete')
    } catch (error) {
      setMigrationResult({
        success: false,
        source: selectedSource,
        imported: { localStorage: 0, files: 0, projects: 0, snapshots: 0 },
        errors: [`迁移失败: ${(error as Error).message}`],
        warnings: [],
      })
      setCurrentStep('complete')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setCurrentStep('select')
    setSelectedFile(null)
    setDetectedFormat(null)
    setSelectedSource('yyc3')
    setMigrationResult(null)
  }

  const supportedSources = migrationService.getSupportedSources()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">数据迁移</h2>
          <p className="text-sm text-gray-400 mt-1">
            从其他应用导入数据到 YYC³
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                currentStep === step.id
                  ? 'bg-blue-500/20 text-blue-400'
                  : STEPS.findIndex((s) => s.id === currentStep) > index
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-white/[0.03] text-gray-500'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  currentStep === step.id
                    ? 'bg-blue-500 text-white'
                    : STEPS.findIndex((s) => s.id === currentStep) > index
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {index + 1}
              </div>
              <span className="text-sm font-medium">{step.title}</span>
            </div>
            {index < STEPS.length - 1 && (
              <ArrowRight className="w-4 h-4 text-gray-600" />
            )}
          </React.Fragment>
        ))}
      </div>

      {currentStep === 'select' && (
        <div className="space-y-4">
          <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-medium text-white mb-4">选择数据来源</h3>
            <div className="grid grid-cols-2 gap-3">
              {supportedSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => setSelectedSource(source.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    selectedSource === source.id
                      ? 'bg-blue-500/10 border-blue-500/50'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{source.icon}</span>
                    <span className="text-sm font-medium text-white">{source.name}</span>
                  </div>
                  <p className="text-xs text-gray-400">{source.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-medium text-white mb-4">选择文件</h3>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-white/[0.02] border-white/[0.06] hover:border-blue-500/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-400">
                    {selectedFile ? selectedFile.name : '点击选择文件或拖拽到此处'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">支持 JSON、CSV 格式</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".json,.csv"
                  onChange={handleFileSelect}
                />
              </label>
            </div>

            {detectedFormat && (
              <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-400">
                    检测到格式: {detectedFormat.type.toUpperCase()} ({detectedFormat.source})
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleNext}
              disabled={!selectedFile || isLoading}
              className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
            >
              下一步
            </button>
          </div>
        </div>
      )}

      {currentStep === 'preview' && (
        <div className="space-y-4">
          <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-medium text-white mb-4">数据预览</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                <span className="text-sm text-gray-400">文件名</span>
                <span className="text-sm text-white">{selectedFile?.name}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                <span className="text-sm text-gray-400">文件大小</span>
                <span className="text-sm text-white">
                  {selectedFile ? (selectedFile.size / 1024).toFixed(2) : 0} KB
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                <span className="text-sm text-gray-400">数据格式</span>
                <span className="text-sm text-white">
                  {detectedFormat?.type.toUpperCase() || '未知'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                <span className="text-sm text-gray-400">数据来源</span>
                <span className="text-sm text-white">
                  {supportedSources.find((s) => s.id === selectedSource)?.name || '未知'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-400 mb-1">注意事项</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• 迁移将覆盖同名的现有数据</li>
                  <li>• 建议在迁移前先备份当前数据</li>
                  <li>• 部分数据可能需要手动调整格式</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handlePrev}
              className="px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-gray-300 hover:border-white/[0.12] transition-colors"
            >
              上一步
            </button>
            <button
              onClick={handleMigrate}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
            >
              {isLoading ? '迁移中...' : '开始迁移'}
            </button>
          </div>
        </div>
      )}

      {currentStep === 'migrate' && (
        <div className="flex flex-col items-center justify-center py-12">
          <RefreshCw className="w-12 h-12 text-blue-400 animate-spin mb-4" />
          <p className="text-gray-400">正在迁移数据...</p>
        </div>
      )}

      {currentStep === 'complete' && migrationResult && (
        <div className="space-y-4">
          <div
            className={`p-6 rounded-xl border ${
              migrationResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              {migrationResult.success ? (
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-red-400" />
              )}
              <div>
                <h3 className="text-lg font-medium text-white">
                  {migrationResult.success ? '迁移成功' : '迁移失败'}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {migrationResult.success
                    ? '数据已成功导入到 YYC³'
                    : '部分数据导入失败，请查看错误信息'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.06]">
              <div>
                <span className="text-sm text-gray-400">LocalStorage 项</span>
                <div className="text-lg font-medium text-white mt-1">
                  {migrationResult.imported.localStorage}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-400">IndexedDB 文件</span>
                <div className="text-lg font-medium text-white mt-1">
                  {migrationResult.imported.files}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-400">项目数量</span>
                <div className="text-lg font-medium text-white mt-1">
                  {migrationResult.imported.projects}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-400">快照数量</span>
                <div className="text-lg font-medium text-white mt-1">
                  {migrationResult.imported.snapshots}
                </div>
              </div>
            </div>
          </div>

          {migrationResult.warnings.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <h4 className="text-sm font-medium text-amber-400 mb-2">警告信息</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                {migrationResult.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {migrationResult.errors.length > 0 && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <h4 className="text-sm font-medium text-red-400 mb-2">错误信息</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                {migrationResult.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
            >
              开始新的迁移
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MigrationManager
