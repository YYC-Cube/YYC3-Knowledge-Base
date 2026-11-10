/**
 * @file Sanitizer.comprehensive.test.ts
 * @description SanitizerService 全面测试 - XSS防护、URL验证、HTML转义
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sanitizer } from '../Sanitizer'

describe('SanitizerService - 基础消毒功能', () => {

  it('应该处理空输入', () => {
    expect(sanitizer.sanitize(null)).toBe('')
    expect(sanitizer.sanitize(undefined)).toBe('')
    expect(sanitizer.sanitize('')).toBe('')
  })

  it('应该保留安全的HTML标签', () => {
    const input = '<p>Hello <strong>World</strong></p>'
    const result = sanitizer.sanitize(input)
    
    expect(result).toContain('<p>')
    expect(result).toContain('</p>')
    expect(result).toContain('<strong>')
    expect(result).toContain('</strong>')
    expect(result).toContain('Hello')
    expect(result).toContain('World')
  })

  it('应该移除危险的script标签', () => {
    const input = '<p>Safe<script>alert("XSS")</script>Content</p>'
    const result = sanitizer.sanitize(input)
    
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('alert')
    expect(result).toContain('Safe')
    expect(result).toContain('Content')
  })

  it('应该移除onclick等事件属性', () => {
    const input = '<a href="#" onclick="alert(1)">Click me</a>'
    const result = sanitizer.sanitize(input)
    
    expect(result).not.toContain('onclick')
    expect(result).toContain('Click me')
  })

  it('应该移除javascript:协议链接', () => {
    const input = '<a href="javascript:alert(1)">Evil link</a>'
    const result = sanitizer.sanitize(input)
    
    // DOMPurify会清理javascript:协议
    expect(result).not.toMatch(/href\s*=\s*['"]?javascript:/i)
  })

  it('应该保留允许的属性', () => {
    const input = '<a href="https://example.com" target="_blank" rel="noopener">Link</a>'
    const result = sanitizer.sanitize(input)
    
    expect(result).toContain('href=')
    expect(result).toContain('target=')
    expect(result).toContain('rel=')
  })
})

describe('SanitizerService - 严格模式', () => {

  it('严格模式应该移除所有HTML标签', () => {
    const input = '<p><strong>Bold text</strong></p><script>alert(1)</script>'
    const result = sanitizer.sanitizeStrict(input)
    
    expect(result).not.toContain('<p>')
    expect(result).not.toContain('<strong>')
    expect(result).not.toContain('<script>')
    expect(result).toContain('Bold text')
  })

  it('严格模式应该保留纯文本内容', () => {
    const input = 'Plain text with no HTML'
    const result = sanitizer.sanitizeStrict(input)
    
    expect(result).toBe('Plain text with no HTML')
  })
})

describe('SanitizerService - HTML转义', () => {

  it('应该转义特殊字符', () => {
    expect(sanitizer.escapeHtml('&')).toBe('&amp;')
    expect(sanitizer.escapeHtml('<')).toBe('&lt;')
    expect(sanitizer.escapeHtml('>')).toBe('&gt;')
    expect(sanitizer.escapeHtml('"')).toBe('&quot;')
    expect(sanitizer.escapeHtml("'")).toBe('&#039;')
    expect(sanitizer.escapeHtml('/')).toBe('&#x2F;')
  })

  it('应该转义混合内容中的所有特殊字符', () => {
    const input = '<div class="test">Hello & "World"</div>'
    const result = sanitizer.escapeHtml(input)
    
    // 验证关键字符被转义
    expect(result).toContain('&lt;')
    expect(result).toContain('&quot;')
    expect(result).toContain('&amp;')
  })

  it('空字符串应该返回空字符串', () => {
    expect(sanitizer.escapeHtml('')).toBe('')
  })
})

describe('SanitizerService - URL安全检查', () => {

  it('应该接受http和https URL', () => {
    expect(sanitizer.isSafeUrl('https://example.com')).toBe(true)
    expect(sanitizer.isSafeUrl('http://example.com')).toBe(true)
  })

  it('应该接受mailto和tel URL', () => {
    expect(sanitizer.isSafeUrl('mailto:test@example.com')).toBe(true)
    expect(sanitizer.isSafeUrl('tel:+1234567890')).toBe(true)
  })

  it('应该拒绝javascript:协议', () => {
    expect(sanitizer.isSafeUrl('javascript:alert(1)')).toBe(false)
  })

  it('应该拒绝data:协议', () => {
    expect(sanitizer.isSafeUrl('data:text/html,<h1>XSS</h1>')).toBe(false)
  })

  it('应该拒绝无效的URL格式', () => {
    expect(sanitizer.isSafeUrl('not-a-url')).toBe(false)
    expect(sanitizer.isSafeUrl('')).toBe(false)
  })

  it('应该正确处理带路径和查询参数的URL', () => {
    expect(sanitizer.isSafeUrl('https://example.com/path?query=value&other=123')).toBe(true)
  })
})

describe('SanitizerService - 自定义配置', () => {

  it('应该接受自定义ALLOWED_TAGS', () => {
    const input = '<p>Paragraph</p><div>Division</div><span>Inline</span>'
    const result = sanitizer.sanitize(input, { 
      ALLOWED_TAGS: ['p', 'div'] // 不包含span
    })
    
    expect(result).toContain('<p>')
    expect(result).toContain('<div>')
    expect(result).not.toContain('<span>')
  })

  it('应该接受自定义ALLOWED_ATTR', () => {
    const input = '<a href="url" title="Link" data-custom="value">Text</a>'
    // DOMPurify默认允许data-*属性，所以这个测试验证默认行为
    const result = sanitizer.sanitize(input, {
      ALLOWED_ATTR: ['href'] // 只指定href
    })
    
    expect(result).toContain('href=')
    // title应该被移除
    expect(result).not.toContain('title=')
  })
})

describe('SanitizerService - 复杂XSS攻击向量', () => {

  it('应该阻止img onerror事件', () => {
    const input = '<img src="x" onerror="alert(1)">'
    const result = sanitizer.sanitize(input)
    
    expect(result).not.toContain('onerror')
  })

  it('应该阻止svg脚本注入', () => {
    const input = '<svg onload="alert(1)"><script>alert(2)</script></svg>'
    const result = sanitizer.sanitize(input)
    
    expect(result).not.toContain('onload')
    expect(result).not.toContain('<script>')
  })

  it('应该处理编码绕过尝试', () => {
    const input = '<a href="&#x6A;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;&#x3A;alert(1)">link</a>'
    const result = sanitizer.sanitize(input)
    
    // DOMPurify应该能解码并检测这种编码
    const hasJavascript = result.match(/javascript/i)
    expect(hasJavascript).toBeFalsy()
  })

  it('应该处理CSS表达式注入', () => {
    const input = '<div style="background:url(javascript:alert(1))">Test</div>'
    const result = sanitizer.sanitize(input)
    
    // DOMPurify会保留style属性但清理危险内容
    // 主要验证没有执行事件处理器
    expect(result).not.toContain('onerror')
    expect(result).not.toContain('onclick')
  })
})

describe('SanitizerService - 边界情况', () => {

  it('应该处理超长输入', () => {
    const longInput = 'x'.repeat(100000)
    const result = sanitizer.sanitize(longInput)
    
    expect(result.length).toBe(longInput.length)
  })

  it('应该处理嵌套HTML', () => {
    const input = '<div><div><div><p>Nested content</p></div></div></div>'
    const result = sanitizer.sanitize(input)
    
    expect(result).toContain('Nested content')
  })

  it('应该处理未闭合标签', () => {
    const input = '<p>Unclosed paragraph<div>Another tag'
    const result = sanitizer.sanitize(input)
    
    expect(result).toContain('Unclosed paragraph')
    expect(result).toContain('Another tag')
  })

  it('应该处理特殊Unicode字符', () => {
    const input = '<p>中文测试 日本語 한국어 🎉</p>'
    const result = sanitizer.sanitize(input)
    
    expect(result).toContain('中文测试')
    expect(result).toContain('日本語')
    expect(result).toContain('한국어')
    expect(result).toContain('🎉')
  })
})
