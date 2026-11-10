/**
 * @file Logger.ts
 * @description YYC³ 统一日志服务 - 替代原生console，支持环境感知和结构化日志
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-04-14
 * @license MIT
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: unknown
  timestamp: string
  source?: string
}

class Logger {
  private isDevelopment = import.meta.env?.DEV ?? process.env.NODE_ENV === 'development'

  private formatMessage(level: LogLevel, message: string, source?: string): string {
    const timestamp = new Date().toISOString()
    const prefix = `[YYC3][${level.toUpperCase()}]`
    const sourceTag = source ? `[${source}]` : ''
    return `${timestamp} ${prefix}${sourceTag} ${message}`
  }

  debug(message: string, data?: unknown, source?: string): void {
    if (this.isDevelopment) {
      const formatted = this.formatMessage('debug', message, source)
      console.debug(formatted, data);
    }
  }

  info(message: string, data?: unknown, source?: string): void {
    if (this.isDevelopment) {
      const formatted = this.formatMessage('info', message, source)
      console.info(formatted, data);
    }
  }

  warn(message: string, data?: unknown, source?: string): void {
    const formatted = this.formatMessage('warn', message, source)
    console.warn(formatted, data);
  }

  error(message: string, error?: Error | unknown, source?: string): void {
    const formatted = this.formatMessage('error', message, source)
    console.error(formatted, error);
    
    if (import.meta.env?.PROD) {
      // 生产环境可选：发送到Sentry或其他错误追踪服务
      // import { captureException } from '@sentry/react'
      // captureException(error instanceof Error ? error : new Error(String(error)))
    }
  }

  createChild(source: string) {
    return {
      debug: (msg: string, data?: unknown) => this.debug(msg, data, source),
      info: (msg: string, data?: unknown) => this.info(msg, data, source),
      warn: (msg: string, data?: unknown) => this.warn(msg, data, source),
      error: (msg: string, err?: Error | unknown) => this.error(msg, err, source),
    }
  }
}

export const logger = new Logger()

export default logger