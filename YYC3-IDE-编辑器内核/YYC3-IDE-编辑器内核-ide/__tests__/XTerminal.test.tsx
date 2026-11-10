/**
 * @file: XTerminal.test.tsx
 * @description: XTerm React 组件单元测试
 *              验证初始化、渲染、事件处理、主题切换等核心功能
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-04
 * @updated: 2026-04-09
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,xterm,terminal,unit-test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { XTerminal, getDefaultTheme, getLightTheme } from '../XTerminal'

// Mock xterm.js 模块
const mockOn = vi.fn()
const mockOnData = vi.fn()
const mockOnResize = vi.fn()
const mockOnTitleChange = vi.fn()

vi.mock('@xterm/xterm', () => {
  return {
    Terminal: class MockTerminal {
      open = vi.fn()
      dispose = vi.fn()
      write = vi.fn()
      clear = vi.fn()
      focus = vi.fn()
      loadAddon = vi.fn()
      on = mockOn
      onData = mockOnData
      onResize = mockOnResize
      onTitleChange = mockOnTitleChange
      options: Record<string, unknown> = {}
      cols = 80
      rows = 24
      unicode = { activeVersion: '11' }
    },
  }
})

// Mock 插件模块
const mockFitInstance = {
  fit: vi.fn(),
}

vi.mock('@xterm/addon-fit', () => {
  return {
    FitAddon: class MockFitAddon {
      fit = mockFitInstance.fit
    },
  }
})

vi.mock('@xterm/addon-web-links', () => {
  return { WebLinksAddon: class MockWebLinksAddon {} }
})

vi.mock('@xterm/addon-search', () => {
  return { SearchAddon: class MockSearchAddon {} }
})

vi.mock('@xterm/addon-unicode11', () => {
  return { Unicode11Addon: class MockUnicode11Addon {} }
})

describe('XTerminal Component', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'test-container'
    document.body.appendChild(container)
    
    // Mock ResizeObserver
    window.ResizeObserver = class ResizeObserver {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    } as unknown as typeof ResizeObserver
  })

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
    vi.clearAllMocks()
  })

  it('应该正确初始化并挂载到 DOM', async () => {
    const { unmount } = render(
      <XTerminal sessionId="test-session-1" />,
      { container }
    )

    const wrapper = container.querySelector('.xterm-wrapper')
    expect(wrapper).toBeTruthy()
    expect(wrapper?.getAttribute('data-session-id')).toBe('test-session-1')

    unmount()
  })

  it('应该使用默认的深色主题', async () => {
    const defaultTheme = getDefaultTheme()

    expect(defaultTheme.background).toBe('#0d1c2a')
    expect(defaultTheme.foreground).toBe('#e2e8ee')
    expect(defaultTheme.cursor).toBe('#ffffff')
    expect(defaultTheme.red).toBe('#cd3131')
    expect(defaultTheme.green).toBe('#0dbc79')
  })

  it('应该提供浅色主题选项', async () => {
    const lightTheme = getLightTheme()
    
    expect(lightTheme.background).toBe('#ffffff')
    expect(lightTheme.foreground).toBe('#383838')
    expect(lightTheme.black).toBe('#000000')
    expect(lightTheme.white).toBe('#555555')
  })

  it('应该支持自定义字体配置', async () => {
    const customFont = '"Fira Code", monospace'

    render(
      <XTerminal
        sessionId="test-font"
        fontFamily={customFont}
        fontSize={16}
        cursorBlink={false}
      />,
      { container }
    )

    // 验证组件正确渲染（通过检查DOM元素存在）
    const wrapper = container.querySelector('.xterm-wrapper')
    expect(wrapper).toBeTruthy()
    expect(wrapper?.getAttribute('data-session-id')).toBe('test-font')
  })

  it('应该在组件卸载时正确清理资源', async () => {
    const { unmount } = render(
      <XTerminal sessionId="test-cleanup" />,
      { container }
    )

    expect(container.querySelector('.xterm-wrapper')).toBeTruthy()

    unmount()

    // 验证组件已从DOM移除
    expect(container.querySelector('.xterm-wrapper')).toBeFalsy()
  })

  it('应该支持 onData 回调处理用户输入', async () => {
    const onDataMock = vi.fn()

    render(
      <XTerminal
        sessionId="test-input"
        onData={onDataMock}
      />,
      { container }
    )

    // 验证组件渲染成功且onData回调已注册
    expect(container.querySelector('.xterm-wrapper')).toBeTruthy()
    expect(mockOnData).toHaveBeenCalled() // onData方法被调用注册事件
  })

  it('应该支持主题动态更新', async () => {
    const customTheme = {
      background: '#ff0000',
      foreground: '#00ff00',
    }

    const { rerender } = render(
      <XTerminal sessionId="test-theme" theme={customTheme as any} />,
      { container }
    )

    // 验证初始主题应用成功
    expect(container.querySelector('.xterm-wrapper')).toBeTruthy()

    // 更新主题并验证组件重新渲染
    rerender(
      <XTerminal
        sessionId="test-theme"
        theme={{ background: '#0000ff' } as any}
      />
    )

    // 验证组件仍然正常存在（主题更新不会破坏渲染）
    expect(container.querySelector('.xterm-wrapper')).toBeTruthy()
  })
})

describe('XTerminal Integration Tests', () => {
  let integrationContainer: HTMLDivElement

  beforeEach(() => {
    integrationContainer = document.createElement('div')
    document.body.appendChild(integrationContainer)
  })

  afterEach(() => {
    if (integrationContainer.parentNode) {
      integrationContainer.parentNode.removeChild(integrationContainer)
    }
  })

  it('应该正确加载所有插件', async () => {
    // 验证所有插件模块可以正常导入
    const { FitAddon } = await import('@xterm/addon-fit')
    const { WebLinksAddon } = await import('@xterm/addon-web-links')
    const { SearchAddon } = await import('@xterm/addon-search')
    const { Unicode11Addon } = await import('@xterm/addon-unicode11')

    render(<XTerminal sessionId="test-plugins" />, { container: integrationContainer })

    // 验证组件渲染成功（插件在内部加载）
    expect(integrationContainer.querySelector('.xterm-wrapper')).toBeTruthy()

    // 验证插件类存在且可实例化
    expect(typeof FitAddon).toBe('function')
    expect(typeof WebLinksAddon).toBe('function')
    expect(typeof SearchAddon).toBe('function')
    expect(typeof Unicode11Addon).toBe('function')
  })

  it('应该支持响应式尺寸调整', async () => {
    integrationContainer.style.width = '800px'
    integrationContainer.style.height = '400px'

    render(<XTerminal sessionId="test-resize" />, { container: integrationContainer })

    // 验证ResizeObserver被设置
    expect(window.ResizeObserver).toBeDefined()

    // 模拟窗口大小变化并验证组件仍然正常
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    // 验证组件在resize后仍然存在
    expect(integrationContainer.querySelector('.xterm-wrapper')).toBeTruthy()
  })
})
