/**
 * @file Sanitizer.test.ts
 * @description Sanitizer 服务单元测试
 */

import { describe, it, expect } from 'vitest'
import { sanitizer } from '../Sanitizer'

describe('Sanitizer', () => {
  describe('sanitize', () => {
    it('should sanitize HTML and remove XSS attacks', () => {
      const dirty = '<script>alert("xss")</script><p>Hello</p>'
      const result = sanitizer.sanitize(dirty)
      expect(result).not.toContain('<script>')
      expect(result).toContain('<p>Hello</p>')
    })

    it('should return empty string for null input', () => {
      expect(sanitizer.sanitize(null)).toBe('')
    })

    it('should return empty string for undefined input', () => {
      expect(sanitizer.sanitize(undefined)).toBe('')
    })

    it('should return empty string for empty string', () => {
      expect(sanitizer.sanitize('')).toBe('')
    })

    it('should allow safe tags by default', () => {
      const html = '<h1>Title</h1><p>Paragraph</p><strong>Bold</strong>'
      const result = sanitizer.sanitize(html)
      expect(result).toContain('<h1>Title</h1>')
      expect(result).toContain('<p>Paragraph</p>')
      expect(result).toContain('<strong>Bold</strong>')
    })

    it('should handle custom options', () => {
      const html = '<div class="test">Content</div>'
      const result = sanitizer.sanitize(html, { ALLOWED_TAGS: ['p'] })
      expect(result).toContain('Content')
      expect(result).not.toContain('<div>')
    })
  })

  describe('sanitizeStrict', () => {
    it('should strip all HTML tags', () => {
      const html = '<script>alert("xss")</script><p>Hello <strong>World</strong></p>'
      const result = sanitizer.sanitizeStrict(html)
      expect(result).toBe('Hello World')
    })

    it('should return empty string for empty string', () => {
      expect(sanitizer.sanitizeStrict('')).toBe('')
    })
  })

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(sanitizer.escapeHtml('&')).toBe('&amp;')
      expect(sanitizer.escapeHtml('<')).toBe('&lt;')
      expect(sanitizer.escapeHtml('>')).toBe('&gt;')
      expect(sanitizer.escapeHtml('"')).toBe('&quot;')
      expect(sanitizer.escapeHtml("'")).toBe('&#039;')
      expect(sanitizer.escapeHtml('/')).toBe('&#x2F;')
    })

    it('should escape mixed content correctly', () => {
      const input = '<script>alert("xss")</script>'
      const result = sanitizer.escapeHtml(input)
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;')
    })
  })

  describe('isSafeUrl', () => {
    it('should return true for http URLs', () => {
      expect(sanitizer.isSafeUrl('http://example.com')).toBe(true)
    })

    it('should return true for https URLs', () => {
      expect(sanitizer.isSafeUrl('https://example.com')).toBe(true)
    })

    it('should return true for mailto URLs', () => {
      expect(sanitizer.isSafeUrl('mailto:test@example.com')).toBe(true)
    })

    it('should return true for tel URLs', () => {
      expect(sanitizer.isSafeUrl('tel:+1234567890')).toBe(true)
    })

    it('should return false for javascript protocol', () => {
      expect(sanitizer.isSafeUrl('javascript:alert(1)')).toBe(false)
    })

    it('should return false for invalid URLs', () => {
      expect(sanitizer.isSafeUrl('not-a-url')).toBe(false)
    })
  })
})
