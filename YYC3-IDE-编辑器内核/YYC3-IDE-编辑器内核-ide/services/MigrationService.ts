/**
 * @file: MigrationService.ts
 * @description: YYC³ 数据迁移服务 - 导入数据、格式转换、迁移向导
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: migration,import,convert,wizard
 */

import { getDB } from '../adapters/IndexedDBAdapter'
import { logger } from "./Logger";

export type DataSource = 'yyc3' | 'vscode' | 'cursor' | 'generic'

export interface MigrationResult {
  success: boolean
  source: DataSource
  imported: {
    localStorage: number
    files: number
    projects: number
    snapshots: number
  }
  errors: string[]
  warnings: string[]
}

export interface DataFormat {
  type: 'json' | 'csv' | 'markdown' | 'text'
  version: string
  source: DataSource
}

export class MigrationService {
  private static instance: MigrationService

  private constructor() {}

  static getInstance(): MigrationService {
    if (!MigrationService.instance) {
      MigrationService.instance = new MigrationService()
    }
    return MigrationService.instance
  }

  async detectFormat(file: File): Promise<DataFormat | null> {
    try {
      const text = await file.text()

      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        const json = JSON.parse(text)
        if (json.version && json.localStorage && json.indexedDB) {
          return { type: 'json', version: json.version || '1.0', source: 'yyc3' }
        }
        return { type: 'json', version: '1.0', source: 'generic' }
      }

      if (text.includes(',') && text.includes('\n')) {
        return { type: 'csv', version: '1.0', source: 'generic' }
      }

      if (text.startsWith('#') || text.includes('##')) {
        return { type: 'markdown', version: '1.0', source: 'generic' }
      }

      return { type: 'text', version: '1.0', source: 'generic' }
    } catch (e) {
      logger.error('[MigrationService] Failed to detect format:', e);
      return null
    }
  }

  async migrate(file: File, source: DataSource): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      source,
      imported: {
        localStorage: 0,
        files: 0,
        projects: 0,
        snapshots: 0,
      },
      errors: [],
      warnings: [],
    }

    try {
      switch (source) {
        case 'yyc3':
          await this.migrateFromYYC3(file, result)
          break
        case 'vscode':
          await this.migrateFromVSCode(file, result)
          break
        case 'cursor':
          await this.migrateFromCursor(file, result)
          break
        case 'generic':
          await this.migrateFromGeneric(file, result)
          break
        default:
          result.errors.push(`不支持的导入源: ${source}`)
          result.success = false
      }
    } catch (e) {
      result.errors.push(`迁移失败: ${(e as Error).message}`)
      result.success = false
    }

    return result
  }

  private async migrateFromYYC3(file: File, result: MigrationResult): Promise<void> {
    const text = await file.text()
    const data = JSON.parse(text)

    if (data.localStorage) {
      Object.entries(data.localStorage).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, String(value))
          result.imported.localStorage++
        } catch (e) {
          result.warnings.push(`导入 localStorage 键失败: ${key}`)
        }
      })
    }

    if (data.indexedDB) {
      const db = await getDB()

      if (data.indexedDB.files && Array.isArray(data.indexedDB.files)) {
        for (const file of data.indexedDB.files) {
          try {
            await db.put('files', file)
            result.imported.files++
          } catch (e) {
            result.warnings.push(`导入文件失败: ${file.path}`)
          }
        }
      }

      if (data.indexedDB.projects && Array.isArray(data.indexedDB.projects)) {
        for (const project of data.indexedDB.projects) {
          try {
            await db.put('projects', project)
            result.imported.projects++
          } catch (e) {
            result.warnings.push(`导入项目失败: ${project.id}`)
          }
        }
      }

      if (data.indexedDB.snapshots && Array.isArray(data.indexedDB.snapshots)) {
        for (const snapshot of data.indexedDB.snapshots) {
          try {
            await db.put('snapshots', snapshot)
            result.imported.snapshots++
          } catch (e) {
            result.warnings.push(`导入快照失败: ${snapshot.id}`)
          }
        }
      }
    }
  }

  private async migrateFromVSCode(file: File, result: MigrationResult): Promise<void> {
    const text = await file.text()
    const data = JSON.parse(text)

    if (data.settings) {
      const yyc3Settings: Record<string, unknown> = {}

      if (data.settings['editor.fontSize']) {
        yyc3Settings['yyc3-editor-fontSize'] = data.settings['editor.fontSize']
      }
      if (data.settings['editor.tabSize']) {
        yyc3Settings['yyc3-editor-tabSize'] = data.settings['editor.tabSize']
      }
      if (data.settings['editor.theme']) {
        yyc3Settings['yyc3-theme'] = data.settings['editor.theme']
      }

      Object.entries(yyc3Settings).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, JSON.stringify(value))
          result.imported.localStorage++
        } catch (e) {
          result.warnings.push(`导入 VSCode 设置失败: ${key}`)
        }
      })

      result.warnings.push('VSCode 设置已转换为 YYC³ 格式')
    }

    if (data.keybindings && Array.isArray(data.keybindings)) {
      const yyc3Keybindings = data.keybindings.map((kb: { key: string; command: string; when?: string }) => ({
        key: kb.key,
        command: kb.command,
        when: kb.when,
      }))

      try {
        localStorage.setItem('yyc3-keybindings', JSON.stringify(yyc3Keybindings))
        result.imported.localStorage++
        result.warnings.push('VSCode 快捷键已转换为 YYC³ 格式')
      } catch (e) {
        result.warnings.push('导入 VSCode 快捷键失败')
      }
    }

    if (data.extensions && Array.isArray(data.extensions)) {
      result.warnings.push(`检测到 ${data.extensions.length} 个 VSCode 扩展，请手动安装对应的 YYC³ 插件`)
    }
  }

  private async migrateFromCursor(file: File, result: MigrationResult): Promise<void> {
    await this.migrateFromVSCode(file, result)
    result.warnings.push('Cursor 数据已按 VSCode 格式导入')
  }

  private async migrateFromGeneric(file: File, result: MigrationResult): Promise<void> {
    const text = await file.text()

    try {
      const data = JSON.parse(text)

      if (typeof data === 'object' && data !== null) {
        const yyc3Data: Record<string, string> = {}

        Object.entries(data).forEach(([key, value]) => {
          if (typeof value === 'object') {
            yyc3Data[`yyc3-${key}`] = JSON.stringify(value)
          } else {
            yyc3Data[`yyc3-${key}`] = String(value)
          }
        })

        Object.entries(yyc3Data).forEach(([key, value]) => {
          try {
            localStorage.setItem(key, value)
            result.imported.localStorage++
          } catch (e) {
            result.warnings.push(`导入数据失败: ${key}`)
          }
        })

        result.warnings.push('通用数据已转换为 YYC³ 格式')
      }
    } catch (e) {
      result.errors.push('无法解析通用数据格式')
      result.success = false
    }
  }

  async exportToFormat(format: 'json' | 'csv', data: unknown): Promise<Blob> {
    if (format === 'json') {
      return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    }

    if (format === 'csv') {
      const csv = this.convertToCSV(data)
      return new Blob([csv], { type: 'text/csv' })
    }

    throw new Error(`不支持的导出格式: ${format}`)
  }

  private convertToCSV(data: unknown): string {
    if (!data || typeof data !== 'object') {
      return ''
    }

    const rows: string[] = []

    if (Array.isArray(data)) {
      if (data.length === 0) return ''

      const headers = Object.keys(data[0])
      rows.push(headers.join(','))

      data.forEach((item) => {
        const values = headers.map((h) => {
          const value = item[h]
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`
          }
          return String(value)
        })
        rows.push(values.join(','))
      })
    } else {
      rows.push('key,value')
      Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
        const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
        const escapedValue = strValue.includes(',') ? `"${strValue}"` : strValue
        rows.push(`${key},${escapedValue}`)
      })
    }

    return rows.join('\n')
  }

  getSupportedSources(): Array<{ id: DataSource; name: string; description: string; icon: string }> {
    return [
      { id: 'yyc3', name: 'YYC³ 备份', description: '从 YYC³ 导出的备份文件导入', icon: '📦' },
      { id: 'vscode', name: 'VSCode', description: '从 VSCode 导出的设置文件导入', icon: '💻' },
      { id: 'cursor', name: 'Cursor', description: '从 Cursor 导出的设置文件导入', icon: '🎯' },
      { id: 'generic', name: '通用格式', description: '从通用 JSON/CSV 文件导入', icon: '📄' },
    ]
  }
}

export default MigrationService
