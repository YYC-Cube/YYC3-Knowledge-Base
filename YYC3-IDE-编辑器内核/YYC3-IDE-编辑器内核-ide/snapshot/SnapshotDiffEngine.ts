/**
 * @file: SnapshotDiffEngine.ts
 * @description: 快照对比引擎，提供完整的快照比较API和差异分析功能
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: snapshot,diff,comparison,engine
 */

// ================================================================
// SnapshotDiffEngine — 快照对比引擎
// 提供完整的快照比较和分析功能
// ================================================================

import { MyersDiff, type DiffResult, type DiffBlock } from './MyersDiff';
import type { Snapshot, SnapshotFile } from '../SnapshotManager';

/**
 * 文件差异结果
 */
export interface FileDiffResult {
  /** 文件路径 */
  path: string;
  /** 差异类型 */
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'unchanged';
  /** 差异详情（仅在modified时有） */
  diff?: DiffResult;
  /** 旧文件信息 */
  oldFile?: SnapshotFile;
  /** 新文件信息 */
  newFile?: SnapshotFile;
}

/**
 * 快照差异统计
 */
export interface DiffStats {
  /** 总文件数 */
  totalFiles: number;
  /** 新增文件数 */
  addedFiles: number;
  /** 删除文件数 */
  removedFiles: number;
  /** 修改文件数 */
  modifiedFiles: number;
  /** 未改变文件数 */
  unchangedFiles: number;
  /** 总新增行数 */
  totalAdditions: number;
  /** 总删除行数 */
  totalDeletions: number;
  /** 相似度 (0-1) */
  similarity: number;
}

/**
 * 快照差异结果
 */
export interface SnapshotDiffResult {
  /** 旧快照ID */
  oldSnapshotId: string;
  /** 新快照ID */
  newSnapshotId: string;
  /** 文件差异列表 */
  files: FileDiffResult[];
  /** 统计信息 */
  stats: DiffStats;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 导出格式
 */
export type ExportFormat = 'json' | 'html' | 'markdown' | 'unified';

/**
 * 快照对比引擎
 */
export class SnapshotDiffEngine {
  private static instance: SnapshotDiffEngine | null = null;
  private diffAlgorithm: MyersDiff;

  private constructor() {
    this.diffAlgorithm = new MyersDiff();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): SnapshotDiffEngine {
    if (!SnapshotDiffEngine.instance) {
      SnapshotDiffEngine.instance = new SnapshotDiffEngine();
    }
    return SnapshotDiffEngine.instance;
  }

  /**
   * 重置单例
   */
  public static resetInstance(): void {
    SnapshotDiffEngine.instance = null;
  }

  // ==================== 核心API ====================

  /**
   * 比较两个快照
   */
  public compareSnapshots(oldSnapshot: Snapshot, newSnapshot: Snapshot): SnapshotDiffResult {
    const fileDiffs = this.compareFiles(oldSnapshot.files, newSnapshot.files);
    const stats = this.calculateStats(fileDiffs);

    return {
      oldSnapshotId: oldSnapshot.id,
      newSnapshotId: newSnapshot.id,
      files: fileDiffs,
      stats,
      timestamp: Date.now()
    };
  }

  /**
   * 获取差异统计
   */
  public getDiffStats(diff: SnapshotDiffResult): DiffStats {
    return { ...diff.stats };
  }

  /**
   * 导出差异报告
   */
  public exportDiff(diff: SnapshotDiffResult, format: ExportFormat = 'json'): string {
    switch (format) {
      case 'json':
        return this.exportAsJSON(diff);
      case 'html':
        return this.exportAsHTML(diff);
      case 'markdown':
        return this.exportAsMarkdown(diff);
      case 'unified':
        return this.exportAsUnified(diff);
      default:
        return this.exportAsJSON(diff);
    }
  }

  // ==================== 文件比较 ====================

  /**
   * 比较文件列表
   */
  private compareFiles(oldFiles: SnapshotFile[], newFiles: SnapshotFile[]): FileDiffResult[] {
    const results: FileDiffResult[] = [];

    const oldFileMap = new Map(oldFiles.map(f => [f.path, f]));
    const newFileMap = new Map(newFiles.map(f => [f.path, f]));
    const allPaths = new Set([...oldFileMap.keys(), ...newFileMap.keys()]);

    for (const path of allPaths) {
      const oldFile = oldFileMap.get(path);
      const newFile = newFileMap.get(path);

      if (!oldFile && newFile) {
        // 新增文件
        results.push({
          path,
          status: 'added',
          newFile,
          diff: this.diffAlgorithm.diff('', newFile.content)
        });
      } else if (oldFile && !newFile) {
        // 删除文件
        results.push({
          path,
          status: 'removed',
          oldFile,
          diff: this.diffAlgorithm.diff(oldFile.content, '')
        });
      } else if (oldFile && newFile) {
        // 可能修改
        if (oldFile.hash !== newFile.hash) {
          // 内容不同
          const diff = this.diffAlgorithm.diff(oldFile.content, newFile.content);
          results.push({
            path,
            status: 'modified',
            oldFile,
            newFile,
            diff
          });
        } else {
          // 内容相同
          results.push({
            path,
            status: 'unchanged',
            oldFile,
            newFile
          });
        }
      }
    }

    return results.sort((a, b) => a.path.localeCompare(b.path));
  }

  // ==================== 统计计算 ====================

  /**
   * 计算差异统计
   */
  private calculateStats(fileDiffs: FileDiffResult[]): DiffStats {
    let addedFiles = 0;
    let removedFiles = 0;
    let modifiedFiles = 0;
    let unchangedFiles = 0;
    let totalAdditions = 0;
    let totalDeletions = 0;

    for (const file of fileDiffs) {
      switch (file.status) {
        case 'added':
          addedFiles++;
          if (file.diff) {
            totalAdditions += file.diff.additions;
          }
          break;
        case 'removed':
          removedFiles++;
          if (file.diff) {
            totalDeletions += file.diff.deletions;
          }
          break;
        case 'modified':
          modifiedFiles++;
          if (file.diff) {
            totalAdditions += file.diff.additions;
            totalDeletions += file.diff.deletions;
          }
          break;
        case 'unchanged':
          unchangedFiles++;
          break;
      }
    }

    const totalFiles = fileDiffs.length;
    const similarity = totalFiles > 0
      ? unchangedFiles / totalFiles
      : 1;

    return {
      totalFiles,
      addedFiles,
      removedFiles,
      modifiedFiles,
      unchangedFiles,
      totalAdditions,
      totalDeletions,
      similarity
    };
  }

  // ==================== 导出功能 ====================

  /**
   * 导出为JSON格式
   */
  private exportAsJSON(diff: SnapshotDiffResult): string {
    return JSON.stringify(diff, null, 2);
  }

  /**
   * 导出为HTML格式
   */
  private exportAsHTML(diff: SnapshotDiffResult): string {
    const lines: string[] = [
      '<!DOCTYPE html>',
      '<html lang="zh-CN">',
      '<head>',
      '  <meta charset="UTF-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '  <title>快照差异报告</title>',
      '  <style>',
      '    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }',
      '    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }',
      '    .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }',
      '    .stats { background: #f0f0f0; padding: 15px; border-radius: 4px; margin-bottom: 20px; }',
      '    .stat-item { display: inline-block; margin-right: 20px; }',
      '    .stat-value { font-weight: bold; color: #0066cc; }',
      '    .file-list { list-style: none; padding: 0; }',
      '    .file-item { border: 1px solid #ddd; margin-bottom: 10px; border-radius: 4px; }',
      '    .file-header { padding: 10px; background: #f8f8f8; cursor: pointer; }',
      '    .file-path { font-family: monospace; }',
      '    .status-added { color: #28a745; }',
      '    .status-removed { color: #dc3545; }',
      '    .status-modified { color: #ffc107; }',
      '    .diff-content { padding: 10px; background: #fafafa; font-family: monospace; font-size: 12px; }',
      '    .line-added { background: #e6ffed; }',
      '    .line-removed { background: #ffeef0; }',
      '    .line-number { color: #999; padding: 0 10px; user-select: none; }',
      '  </style>',
      '</head>',
      '<body>',
      '  <div class="container">',
      '    <div class="header">',
      '      <h1>快照差异报告</h1>',
      `      <p>对比时间: ${  new Date(diff.timestamp).toLocaleString('zh-CN')  }</p>`,
      '    </div>',
      '    <div class="stats">',
      `      <div class="stat-item">总文件数: <span class="stat-value">${  diff.stats.totalFiles  }</span></div>`,
      `      <div class="stat-item">新增: <span class="stat-value status-added">${  diff.stats.addedFiles  }</span></div>`,
      `      <div class="stat-item">删除: <span class="stat-value status-removed">${  diff.stats.removedFiles  }</span></div>`,
      `      <div class="stat-item">修改: <span class="stat-value status-modified">${  diff.stats.modifiedFiles  }</span></div>`,
      `      <div class="stat-item">相似度: <span class="stat-value">${  (diff.stats.similarity * 100).toFixed(1)  }%</span></div>`,
      '    </div>',
      '    <ul class="file-list">'
    ];

    for (const file of diff.files) {
      if (file.status === 'unchanged') continue;

      const statusClass = `status-${  file.status}`;
      const statusText = {
        added: '新增',
        removed: '删除',
        modified: '修改',
        renamed: '重命名',
        unchanged: '未改变'
      }[file.status];

      lines.push('      <li class="file-item">');
      lines.push('        <div class="file-header">');
      lines.push(`          <span class="file-path">${  this.escapeHtml(file.path)  }</span>`);
      lines.push(`          <span class="${  statusClass  }" style="margin-left: 10px;">[${  statusText  }]</span>`);
      lines.push('        </div>');

      if (file.diff && file.diff.blocks.length > 0) {
        lines.push('        <div class="diff-content">');
        for (const block of file.diff.blocks) {
          const lineClass = block.type === 'add' ? 'line-added' :
                           block.type === 'delete' ? 'line-removed' : '';
          const prefix = block.type === 'add' ? '+' :
                        block.type === 'delete' ? '-' : ' ';

          const lineNum = block.oldLineNumber || block.newLineNumber || '';
          lines.push(`          <div class="${  lineClass  }">`);
          lines.push(`            <span class="line-number">${  lineNum  }</span>${  prefix  } ${  this.escapeHtml(block.content)}`);
          lines.push('          </div>');
        }
        lines.push('        </div>');
      }

      lines.push('      </li>');
    }

    lines.push('    </ul>');
    lines.push('  </div>');
    lines.push('</body>');
    lines.push('</html>');

    return lines.join('\n');
  }

  /**
   * 导出为Markdown格式
   */
  private exportAsMarkdown(diff: SnapshotDiffResult): string {
    const lines: string[] = [
      '# 快照差异报告',
      '',
      `**对比时间**: ${  new Date(diff.timestamp).toLocaleString('zh-CN')}`,
      '',
      '## 统计信息',
      '',
      '| 指标 | 数量 |',
      '|------|------|',
      `| 总文件数 | ${  diff.stats.totalFiles  } |`,
      `| 新增文件 | ${  diff.stats.addedFiles  } |`,
      `| 删除文件 | ${  diff.stats.removedFiles  } |`,
      `| 修改文件 | ${  diff.stats.modifiedFiles  } |`,
      `| 总新增行数 | ${  diff.stats.totalAdditions  } |`,
      `| 总删除行数 | ${  diff.stats.totalDeletions  } |`,
      `| 相似度 | ${  (diff.stats.similarity * 100).toFixed(1)  }% |`,
      '',
      '## 文件差异',
      ''
    ];

    for (const file of diff.files) {
      if (file.status === 'unchanged') continue;

      const statusText = {
        added: '✅ 新增',
        removed: '❌ 删除',
        modified: '📝 修改',
        renamed: '🔄 重命名',
        unchanged: '➖ 未改变'
      }[file.status];

      lines.push(`### ${  statusText  }: \`${  file.path  }\``);

      if (file.diff) {
        lines.push('');
        lines.push('```diff');

        for (const block of file.diff.blocks) {
          const prefix = block.type === 'add' ? '+' :
                        block.type === 'delete' ? '-' : ' ';
          lines.push(`${prefix  } ${  block.content}`);
        }

        lines.push('```');
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 导出为统一diff格式
   */
  private exportAsUnified(diff: SnapshotDiffResult): string {
    const lines: string[] = [];

    lines.push(`--- Snapshot: ${  diff.oldSnapshotId}`);
    lines.push(`+++ Snapshot: ${  diff.newSnapshotId}`);
    lines.push('');

    for (const file of diff.files) {
      if (file.status === 'unchanged') continue;

      lines.push(`diff --git a/${  file.path  } b/${  file.path}`);

      if (file.status === 'added') {
        lines.push('new file mode 100644');
      } else if (file.status === 'removed') {
        lines.push('deleted file mode 100644');
      }

      lines.push(`index ${  file.oldFile?.hash || '0000000'  }..${  file.newFile?.hash || '0000000'}`);
      lines.push(`--- a/${  file.status === 'added' ? '/dev/null' : file.path}`);
      lines.push(`+++ b/${  file.status === 'removed' ? '/dev/null' : file.path}`);

      if (file.diff) {
        for (const block of file.diff.blocks) {
          const prefix = block.type === 'add' ? '+' :
                        block.type === 'delete' ? '-' : ' ';
          lines.push(prefix + block.content);
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * HTML转义
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

/**
 * 导出便捷函数
 */
export function createSnapshotDiffEngine(): SnapshotDiffEngine {
  return SnapshotDiffEngine.getInstance();
}

export function getSnapshotDiffEngine(): SnapshotDiffEngine {
  return SnapshotDiffEngine.getInstance();
}
