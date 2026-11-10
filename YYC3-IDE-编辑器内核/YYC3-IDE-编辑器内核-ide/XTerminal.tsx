/**
 * @file: XTerminal.tsx
 * @description: 基于 xterm.js 的专业终端组件封装
 *              支持真实 PTY、WebSocket 实时通信、IDE 主题适配
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-04
 * @updated: 2026-04-09
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: xterm,terminal,websocket,pty,theme
 */

import { useRef, useEffect, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { SearchAddon } from '@xterm/addon-search'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import type { ITheme } from '@xterm/xterm'
import type { FitAddon as FitAddonType } from '@xterm/addon-fit'
import { logger } from "./services/Logger";

interface XTerminalProps {
  sessionId: string
  theme?: ITheme
  fontFamily?: string
  fontSize?: number
  cursorBlink?: boolean
  onData?: (data: string) => void
  onResize?: ({ cols, rows }: { cols: number; rows: number }) => void
  onTitleChange?: (title: string) => void
  className?: string
  style?: React.CSSProperties
}

export function XTerminal({
  sessionId,
  theme,
  fontFamily = '"JetBrains Mono", "Fira Code", "SF Mono", "Menlo", "Monaco", "Consolas", monospace',
  fontSize = 14,
  cursorBlink = true,
  onData,
  onResize,
  onTitleChange,
  className = '',
  style,
}: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddonType | null>(null)
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // 初始化 Terminal 实例
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return

    logger.info('初始化实例 (Session: ${sessionId})');

    // 创建 Terminal 实例
    const term = new Terminal({
      theme: theme || getDefaultTheme(),
      fontFamily,
      fontSize,
      cursorBlink,
      allowProposedApi: true,
      scrollback: 5000,
      tabStopWidth: 4,
      convertEol: true,
      lineHeight: 1.2,
      letterSpacing: 0,
      macOptionIsMeta: false,
      rightClickSelectsWord: true,
    } as any)

    // 加载插件
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    fitAddonRef.current = fitAddon

    term.loadAddon(new WebLinksAddon())

    const searchAddon = new SearchAddon()
    term.loadAddon(searchAddon)

    const unicode11Addon = new Unicode11Addon()
    term.loadAddon(unicode11Addon)
    term.unicode.activeVersion = '11'

    // 挂载到 DOM
    term.open(containerRef.current)

    // 自动适配容器大小
    setTimeout(() => {
      try {
        fitAddon.fit()
        logger.info('尺寸适配完成: ${term.cols}x${term.rows}');
      } catch (e) {
        logger.warn('[XTerminal] 尺寸适配失败:', e);
      }
    }, 100)

    // 用户输入事件
    term.onData((data) => {
      if (onData) {
        onData(data)
      }
    })

    // 终端尺寸变化事件
    term.onResize(({ cols, rows }) => {
      if (onResize) {
        onResize({ cols, rows })
      }
    })

    // 标题变化事件
    term.onTitleChange((title) => {
      if (onTitleChange) {
        onTitleChange(title)
      }
    })

    // 焦点处理
    term.focus()

    terminalRef.current = term
    setIsInitialized(true)

    // 清理函数
    return () => {
      if (terminalRef.current) {
        logger.info('销毁实例 (Session: ${sessionId})');
        terminalRef.current.dispose()
        terminalRef.current = null
        fitAddonRef.current = null
        setIsInitialized(false)
      }
    }
  }, [sessionId]) // 仅在 sessionId 变化时重新初始化

  // 响应式尺寸调整（带防抖）
  useEffect(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      resizeTimeoutRef.current = setTimeout(() => {
        if (fitAddonRef.current && terminalRef.current) {
          try {
            fitAddonRef.current.fit()
          } catch (e) {
            // 忽略容器不可见时的错误
          }
        }
      }, 50)
    }

    // 使用 ResizeObserver 监听容器变化
    let resizeObserver: ResizeObserver | null = null

    if (containerRef.current && isInitialized) {
      resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(containerRef.current)
    }

    // 窗口变化监听
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [isInitialized])

  // 主题更新
  useEffect(() => {
    if (terminalRef.current && theme) {
      terminalRef.current.options.theme = theme
    }
  }, [theme])

  // 暴露方法供外部调用
  useEffect(() => {
    if (containerRef.current && terminalRef.current) {
      const container = containerRef.current as any
      container.terminal = terminalRef.current
      container.fit = () => fitAddonRef.current?.fit()
      container.write = (data: string) => terminalRef.current?.write(data)
      container.clearTerminal = () => terminalRef.current?.clear()
      container.focusTerminal = () => terminalRef.current?.focus()
    }
  }, [isInitialized])

  return (
    <div
      ref={containerRef}
      className={`xterm-wrapper ${className}`}
      style={{
        width: '100%',
        height: '100%',
        ...style,
      }}
      data-session-id={sessionId}
    />
  )
}

// 默认深色主题（VS Code Dark+ 风格）
export function getDefaultTheme(): ITheme {
  return {
    background: '#0d1c2a',
    foreground: '#e2e8ee',
    cursor: '#ffffff',
    cursorAccent: '#000000',
    selectionBackground: '#264f78',
    selectionForeground: '#ffffff',
    selectionInactiveBackground: '#3a3d41',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#ffffff',
  }
}

// 默认浅色主题
export function getLightTheme(): ITheme {
  return {
    background: '#ffffff',
    foreground: '#383838',
    cursor: '#000000',
    cursorAccent: '#ffffff',
    selectionBackground: '#add6ff',
    selectionForeground: '#000000',
    selectionInactiveBackground: '#e5e5e5',
    black: '#000000',
    red: '#c72e2e',
    green: '#008000',
    yellow: '#795e26',
    blue: '#0451a5',
    magenta: '#a626a4',
    cyan: '#0598bc',
    white: '#555555',
    brightBlack: '#666666',
    brightRed: '#c72e2e',
    brightGreen: '#008000',
    brightYellow: '#795e26',
    brightBlue: '#0451a5',
    brightMagenta: '#a626a4',
    brightCyan: '#0598bc',
    brightWhite: '#383838',
  }
}

export default XTerminal
