/**
 * @file: ErrorFilter.ts
 * @description: 错误分级与过滤系统 - 提供错误分级、过滤和搜索功能
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: error,filter,search,classification
 */

import {
  ErrorEntry,
  ErrorType,
  ErrorLevel,
  ErrorSource
} from './PreviewErrorCapturer';

/**
 * 过滤条件接口
 */
export interface ErrorFilterCriteria {
  types?: ErrorType[];          // 按类型过滤
  levels?: ErrorLevel[];        // 按级别过滤
  sources?: ErrorSource[];      // 按来源过滤
  keyword?: string;             // 关键词搜索
  startTime?: number;           // 开始时间
  endTime?: number;             // 结束时间
  filename?: string;            // 文件名过滤
  excludeTypes?: ErrorType[];   // 排除的类型
  excludeLevels?: ErrorLevel[]; // 排除的级别
}

/**
 * 分组选项接口
 */
export interface ErrorGroupOptions {
  groupBy: 'type' | 'level' | 'source' | 'filename';
  sortBy?: 'count' | 'latest' | 'severity';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分组结果接口
 */
export interface ErrorGroupResult {
  key: string;
  count: number;
  errors: ErrorEntry[];
  latestTimestamp: number;
}

/**
 * 错误过滤器
 */
export class ErrorFilter {
  /**
   * 过滤错误
   */
  static filter(errors: ErrorEntry[], criteria: ErrorFilterCriteria): ErrorEntry[] {
    let filtered = [...errors];

    // 按类型过滤
    if (criteria.types && criteria.types.length > 0) {
      filtered = filtered.filter(error =>
        (criteria.types as any).includes(error.type)
      );
    }

    // 排除类型
    if (criteria.excludeTypes && criteria.excludeTypes.length > 0) {
      filtered = filtered.filter(error =>
        !(criteria.excludeTypes as any).includes(error.type)
      );
    }

    // 按级别过滤
    if (criteria.levels && criteria.levels.length > 0) {
      filtered = filtered.filter(error =>
        (criteria.levels as any).includes(error.level)
      );
    }

    // 排除级别
    if (criteria.excludeLevels && criteria.excludeLevels.length > 0) {
      filtered = filtered.filter(error =>
        !(criteria.excludeLevels as any).includes(error.level)
      );
    }

    // 按来源过滤
    if (criteria.sources && criteria.sources.length > 0) {
      filtered = filtered.filter(error =>
        (criteria.sources as any).includes(error.source)
      );
    }

    // 关键词搜索
    if (criteria.keyword) {
      const lowerKeyword = criteria.keyword.toLowerCase();
      filtered = filtered.filter(error =>
        error.message.toLowerCase().includes(lowerKeyword) ||
        (error.stack && error.stack.toLowerCase().includes(lowerKeyword)) ||
        (error.filename && error.filename.toLowerCase().includes(lowerKeyword))
      );
    }

    // 时间范围过滤
    if (criteria.startTime !== undefined) {
      filtered = filtered.filter(error =>
        error.timestamp >= (criteria.startTime as any));
    }
    if (criteria.endTime !== undefined) {
      filtered = filtered.filter(error =>
        error.timestamp <= (criteria.endTime as any));
    }

    // 文件名过滤
    if (criteria.filename) {
      const lowerFilename = criteria.filename.toLowerCase();
      filtered = filtered.filter(error =>
        error.filename && error.filename.toLowerCase().includes(lowerFilename)
      );
    }

    return filtered;
  }

  /**
   * 搜索错误
   */
  static search(errors: ErrorEntry[], query: string): ErrorEntry[] {
    const lowerQuery = query.toLowerCase();

    return errors.filter(error =>
      error.message.toLowerCase().includes(lowerQuery) ||
      (error.stack && error.stack.toLowerCase().includes(lowerQuery)) ||
      (error.filename && error.filename.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 分组错误
   */
  static group(
    errors: ErrorEntry[],
    options: ErrorGroupOptions
  ): ErrorGroupResult[] {
    const groups = new Map<string, ErrorEntry[]>();

    // 分组
    errors.forEach(error => {
      let key: string;

      switch (options.groupBy) {
        case 'type':
          key = error.type;
          break;
        case 'level':
          key = error.level;
          break;
        case 'source':
          key = error.source;
          break;
        case 'filename':
          key = error.filename || 'unknown';
          break;
        default:
          key = 'all';
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(error);
    });

    // 转换为结果数组
    const results: ErrorGroupResult[] = Array.from(groups.entries()).map(([key, groupErrors]) => ({
      key,
      count: groupErrors.length,
      errors: groupErrors,
      latestTimestamp: Math.max(...groupErrors.map(e => e.timestamp)),
    }));

    // 排序
    if (options.sortBy) {
      const sortOrder = options.sortOrder || 'desc';

      results.sort((a, b) => {
        let comparison = 0;

        switch (options.sortBy) {
          case 'count':
            comparison = a.count - b.count;
            break;
          case 'latest':
            comparison = a.latestTimestamp - b.latestTimestamp;
            break;
          case 'severity':
            comparison = this.getSeverityScore(b.key) - this.getSeverityScore(a.key);
            break;
        }

        return sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return results;
  }

  /**
   * 获取严重性分数
   */
  private static getSeverityScore(key: string): number {
    // 级别优先级
    if (key === ErrorLevel.ERROR || key === ErrorType.RUNTIME) return 4;
    if (key === ErrorLevel.WARN) return 3;
    if (key === ErrorLevel.INFO) return 2;
    if (key === ErrorLevel.DEBUG) return 1;
    return 0;
  }

  /**
   * 获取错误统计
   */
  static getStatistics(errors: ErrorEntry[]): {
    total: number;
    byType: Record<string, number>;
    byLevel: Record<string, number>;
    bySource: Record<string, number>;
    byHour: Record<number, number>;
    topFilenames: Array<{ filename: string; count: number }>;
    topMessages: Array<{ message: string; count: number }>;
  } {
    const stats = {
      total: errors.length,
      byType: {} as Record<string, number>,
      byLevel: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      byHour: {} as Record<number, number>,
      topFilenames: [] as Array<{ filename: string; count: number }>,
      topMessages: [] as Array<{ message: string; count: number }>,
    };

    // 统计
    const filenameMap = new Map<string, number>();
    const messageMap = new Map<string, number>();

    errors.forEach(error => {
      // 按类型统计
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;

      // 按级别统计
      stats.byLevel[error.level] = (stats.byLevel[error.level] || 0) + 1;

      // 按来源统计
      stats.bySource[error.source] = (stats.bySource[error.source] || 0) + 1;

      // 按小时统计
      const hour = new Date(error.timestamp).getHours();
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;

      // 文件名统计
      if (error.filename) {
        filenameMap.set(error.filename, (filenameMap.get(error.filename) || 0) + 1);
      }

      // 消息统计
      messageMap.set(error.message, (messageMap.get(error.message) || 0) + 1);
    });

    // Top文件名
    stats.topFilenames = Array.from(filenameMap.entries())
      .map(([filename, count]) => ({ filename, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top消息
    stats.topMessages = Array.from(messageMap.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * 去重错误
   */
  static deduplicate(errors: ErrorEntry[]): ErrorEntry[] {
    const seen = new Map<string, ErrorEntry>();

    errors.forEach(error => {
      // 基于消息和类型生成指纹
      const fingerprint = `${error.type}:${error.message}:${error.filename || ''}`;

      if (!seen.has(fingerprint)) {
        seen.set(fingerprint, error);
      }
    });

    return Array.from(seen.values());
  }

  /**
   * 排序错误
   */
  static sort(
    errors: ErrorEntry[],
    sortBy: 'timestamp' | 'level' | 'type' = 'timestamp',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): ErrorEntry[] {
    const sorted = [...errors];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'level':
          comparison = this.getSeverityScore(b.level) - this.getSeverityScore(a.level);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }

  /**
   * 分页错误
   */
  static paginate(
    errors: ErrorEntry[],
    page: number,
    pageSize: number
  ): {
    data: ErrorEntry[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } {
    const total = errors.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const data = errors.slice(startIndex, startIndex + pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * 导出过滤结果
   */
  static exportFiltered(
    errors: ErrorEntry[],
    format: 'json' | 'csv' | 'markdown' = 'json'
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify(errors, null, 2);

      case 'csv': {
        const headers = ['ID', 'Type', 'Level', 'Source', 'Message', 'Timestamp', 'Filename', 'Line', 'Column'];
        const rows = errors.map(e => [
          e.id,
          e.type,
          e.level,
          e.source,
          `"${e.message.replace(/"/g, '""')}"`,
          new Date(e.timestamp).toISOString(),
          e.filename || '',
          e.lineno?.toString() || '',
          e.colno?.toString() || '',
        ].join(','));
        return [headers.join(','), ...rows].join('\n');
      }

      case 'markdown': {
        const md = `# Error Report\n\n` +
          `**Total Errors**: ${errors.length}\n\n` +
          `## Errors\n\n${
          errors.map(e =>
            `### ${e.type.toUpperCase()} - ${e.level.toUpperCase()}\n\n` +
            `- **Message**: ${e.message}\n` +
            `- **Source**: ${e.source}\n` +
            `- **Time**: ${new Date(e.timestamp).toLocaleString()}\n${
            e.filename ? `- **File**: ${e.filename}:${e.lineno}:${e.colno}\n` : ''
            }${e.stack ? `\n**Stack**:\n\`\`\`\n${e.stack}\n\`\`\`\n` : ''}`
          ).join('\n---\n\n')}`;
        return md;
      }

      default:
        return JSON.stringify(errors, null, 2);
    }
  }
}
