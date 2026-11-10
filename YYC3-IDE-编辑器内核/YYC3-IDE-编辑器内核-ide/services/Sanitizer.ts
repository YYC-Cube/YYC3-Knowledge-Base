/**
 * @file Sanitizer.ts
 * @description YYC³ DOM安全消毒服务 - 基于DOMPurify的XSS防护层
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-04-14
 * @license MIT
 */

import DOMPurify from 'dompurify'
import { logger } from './Logger'

interface SanitizeOptions {
  ALLOWED_TAGS?: string[]
  ALLOWED_ATTR?: string[]
}

const DEFAULT_CONFIG: SanitizeOptions = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'a', 'strong', 'em', 'b', 'i', 'u', 's', 'code', 'pre',
    'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img', 'div', 'span'
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel',
    'src', 'alt', 'width', 'height',
    'class', 'id', 'style',
    'title'
  ]
}

class SanitizerService {
  private config: SanitizeOptions = DEFAULT_CONFIG

  sanitize(dirty: string | null | undefined, options?: Partial<SanitizeOptions>): string {
    if (!dirty) return ''

    const mergedConfig = { ...this.config, ...options }

    try {
      return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: mergedConfig.ALLOWED_TAGS,
        ALLOWED_ATTR: mergedConfig.ALLOWED_ATTR,
        ADD_ATTR: ['target'],
        FORCE_BODY: true,
      })
    } catch (error) {
      logger.warn('DOMPurify sanitize failed:', error, 'Sanitizer')
      return this.escapeHtml(dirty)
    }
  }

  sanitizeStrict(dirty: string): string {
    if (!dirty) return ''

    try {
      return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['#text'],
        ALLOWED_ATTR: [],
      })
    } catch (error) {
      logger.warn('DOMPurify sanitizeStrict failed:', error, 'Sanitizer')
      return this.escapeHtml(dirty)
    }
  }

  escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
      '/': '&#x2F;',
    }

    return text.replace(/[&<>"'\/]/g, (char) => map[char])
  }

  isSafeUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:']

      if (!allowedProtocols.includes(parsed.protocol)) {
        return false
      }

      if (parsed.protocol === 'javascript:') {
        return false
      }

      return true
    } catch {
      return false
    }
  }
}

export const sanitizer = new SanitizerService()
export default sanitizer