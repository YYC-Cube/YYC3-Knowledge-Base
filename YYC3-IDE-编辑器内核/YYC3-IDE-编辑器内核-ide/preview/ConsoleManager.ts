/**
 * @file: ConsoleManager.ts
 * @description: 控制台管理器 - 管理预览窗口的控制台日志
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: console,log,management,preview
 */

import { generateId } from '../utils/generateId';
import { ErrorLevel } from './PreviewErrorCapturer';
import { logger } from "../services/Logger";

/**
 * 日志类型枚举
 */
export enum LogType {
  LOG = 'log',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug',
  TABLE = 'table',
  DIR = 'dir',
  GROUP = 'group',
  GROUP_END = 'group_end',
  TIME = 'time',
  TIME_END = 'time_end',
  TRACE = 'trace',
  ASSERT = 'assert',
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  id: string;
  type: LogType;
  level: ErrorLevel;
  message: string;
  timestamp: number;
  args: any[];
  count?: number;          // 重复计数
  collapsed?: boolean;     // 是否折叠
  groupDepth?: number;     // 分组深度
  timerLabel?: string;     // 计时器标签
  trace?: string;          // 堆栈跟踪
}

/**
 * 控制台配置
 */
export interface ConsoleConfig {
  maxEntries: number;      // 最大日志条目数
  enableGrouping: boolean; // 是否启用分组
  enableTiming: boolean;   // 是否启用计时
  enableTrace: boolean;    // 是否启用跟踪
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ConsoleConfig = {
  maxEntries: 1000,
  enableGrouping: true,
  enableTiming: true,
  enableTrace: false,
};

/**
 * 控制台管理器
 */
export class ConsoleManager {
  private logs: LogEntry[] = [];
  private config: ConsoleConfig;
  private listeners: Set<(log: LogEntry) => void> = new Set();
  private timers: Map<string, number> = new Map();
  private groupStack: string[] = [];

  constructor(config: Partial<ConsoleConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 添加日志
   */
  addLog(type: LogType, ...args: any[]): LogEntry {
    const entry = this.createLogEntry(type, args);

    // 合并重复日志
    const lastLog = this.logs[this.logs.length - 1];
    if (lastLog && lastLog.message === entry.message && lastLog.type === type) {
      lastLog.count = (lastLog.count || 1) + 1;
      return lastLog;
    }

    this.logs.push(entry);
    this.trimLogs();
    this.notifyListeners(entry);

    return entry;
  }

  /**
   * 创建日志条目
   */
  private createLogEntry(type: LogType, args: any[]): LogEntry {
    const message = this.formatMessage(args);
    const level = this.mapTypeToLevel(type);

    const entry: LogEntry = {
      id: generateId(),
      type,
      level,
      message,
      timestamp: Date.now(),
      args,
      groupDepth: this.groupStack.length,
    };

    // 特殊处理
    switch (type) {
      case LogType.TRACE:
        entry.trace = new Error().stack;
        break;
      case LogType.TIME:
        this.timers.set(args[0], Date.now());
        entry.timerLabel = args[0];
        break;
      case LogType.TIME_END: {
        const startTime = this.timers.get(args[0]);
        if (startTime) {
          const duration = Date.now() - startTime;
          entry.message = `${args[0]}: ${duration}ms`;
          entry.timerLabel = args[0];
          this.timers.delete(args[0]);
        }
        break;
      }
      case LogType.GROUP:
        this.groupStack.push(args[0]);
        entry.collapsed = false;
        break;
      case LogType.GROUP_END:
        this.groupStack.pop();
        break;
    }

    return entry;
  }

  /**
   * 格式化消息
   */
  private formatMessage(args: any[]): string {
    return args.map(arg => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}`;
      }
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }).join(' ');
  }

  /**
   * 映射日志类型到错误级别
   */
  private mapTypeToLevel(type: LogType): ErrorLevel {
    switch (type) {
      case LogType.ERROR:
      case LogType.ASSERT:
        return ErrorLevel.ERROR;
      case LogType.WARN:
        return ErrorLevel.WARN;
      case LogType.INFO:
        return ErrorLevel.INFO;
      case LogType.DEBUG:
      case LogType.TRACE:
        return ErrorLevel.DEBUG;
      default:
        return ErrorLevel.INFO;
    }
  }

  /**
   * 限制日志数量
   */
  private trimLogs(): void {
    if (this.logs.length > this.config.maxEntries) {
      const removed = this.logs.length - this.config.maxEntries;
      this.logs.splice(0, removed);
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(log: LogEntry): void {
    this.listeners.forEach(listener => {
      try {
        listener(log);
      } catch (e) {
        logger.error('Error in listener:', e);
      }
    });
  }

  // ── 公共API ────────────────────────────────────────────────

  /**
   * 获取所有日志
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 获取日志数量
   */
  getLogCount(): number {
    return this.logs.length;
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = [];
    this.timers.clear();
    this.groupStack = [];
  }

  /**
   * 按级别过滤日志
   */
  filterByLevel(level: ErrorLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * 按类型过滤日志
   */
  filterByType(type: LogType): LogEntry[] {
    return this.logs.filter(log => log.type === type);
  }

  /**
   * 搜索日志
   */
  search(keyword: string): LogEntry[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.logs.filter(log =>
      log.message.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * 导出日志（JSON格式）
   */
  exportJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 导出日志（文本格式）
   */
  exportText(): string {
    return this.logs.map(log => {
      const timestamp = new Date(log.timestamp).toISOString();
      const level = log.level.toUpperCase().padEnd(5);
      const count = log.count ? ` (${log.count})` : '';
      return `[${timestamp}] ${level} ${log.message}${count}`;
    }).join('\n');
  }

  /**
   * 导出日志（HTML格式）
   */
  exportHTML(): string {
    const entries = this.logs.map(log => {
      const color = this.getLogColor(log.level);
      const timestamp = new Date(log.timestamp).toLocaleTimeString();
      const count = log.count ? ` <span class="count">(${log.count})</span>` : '';

      return `
        <div class="log-entry ${log.level}">
          <span class="timestamp">${timestamp}</span>
          <span class="type" style="color: ${color}">[${log.type.toUpperCase()}]</span>
          <span class="message">${this.escapeHtml(log.message)}${count}</span>
        </div>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Console Logs Export</title>
  <style>
    body {
      font-family: 'JetBrains Mono', 'Consolas', monospace;
      background: #1e1e1e;
      color: #d4d4d4;
      margin: 0;
      padding: 16px;
    }
    .log-entry {
      padding: 4px 8px;
      margin: 2px 0;
      border-radius: 3px;
      font-size: 12px;
    }
    .log-entry.error { background: #3a1d1d; }
    .log-entry.warn { background: #3a351d; }
    .log-entry.info { background: #1d2a3a; }
    .log-entry.debug { background: #2a2a2a; }
    .timestamp { color: #808080; margin-right: 8px; }
    .type { margin-right: 8px; font-weight: bold; }
    .message { white-space: pre-wrap; }
    .count { color: #808080; }
  </style>
</head>
<body>
  <h1>Console Logs</h1>
  <div class="logs">${entries}</div>
</body>
</html>
    `;
  }

  /**
   * 获取日志颜色
   */
  private getLogColor(level: ErrorLevel): string {
    switch (level) {
      case ErrorLevel.ERROR: return '#f48771';
      case ErrorLevel.WARN: return '#cca700';
      case ErrorLevel.INFO: return '#3794ff';
      case ErrorLevel.DEBUG: return '#808080';
      default: return '#d4d4d4';
    }
  }

  /**
   * HTML转义
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 添加监听器
   */
  addListener(listener: (log: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    byLevel: Record<ErrorLevel, number>;
    byType: Record<LogType, number>;
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {} as Record<ErrorLevel, number>,
      byType: {} as Record<LogType, number>,
    };

    // 初始化统计对象
    Object.values(ErrorLevel).forEach(level => {
      stats.byLevel[level] = 0;
    });
    Object.values(LogType).forEach(type => {
      stats.byType[type] = 0;
    });

    // 统计
    this.logs.forEach(log => {
      stats.byLevel[log.level]++;
      stats.byType[log.type]++;
    });

    return stats;
  }
}

/**
 * 单例实例
 */
let instance: ConsoleManager | null = null;

/**
 * 获取单例实例
 */
export function getConsoleManager(config?: Partial<ConsoleConfig>): ConsoleManager {
  if (!instance) {
    instance = new ConsoleManager(config);
  }
  return instance;
}
