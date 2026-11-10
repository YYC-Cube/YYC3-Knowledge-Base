/**
 * @file: Terminal.tsx
 * @description: YYC³ 专业终端组件 V3.0 - 集成 xterm.js + 双模式支持
 *              支持：真实 PTY (WebSocket) / 模拟模式 (CommandRegistry)
 *              特性：多标签页、命令历史、主题适配、交互式程序支持
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v3.0.0
 * @created: 2026-03-06
 * @updated: 2026-04-04
 * @status: production-ready
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: terminal,xterm,shell,pty,websocket,tabs,panel,real-execution
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  Terminal as TerminalIcon,
  Plus,
  X,
  Trash2,
  Maximize2,
  Minimize2,
  Play,
  CornerDownLeft,
  Clipboard,
  Zap,
  GripHorizontal,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Upload,
  Download,
  Search,
  FileDiff,
  ChevronRight,
  ChevronDown,
  Cpu,
  Shield,
  Loader2,
  Monitor,
  Power,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useWorkflowEventBus } from './WorkflowEventBus'
import { useFileStore } from './FileStore'
import { XTerminal, getDefaultTheme, getLightTheme } from './XTerminal'
import { useTerminalSocket } from './hooks/useTerminalSocket'
import { convertIDEToXtermTheme } from './utils/xterm-theme'
import {
  executeCommand as registryExecuteCommand,
  getCompletions as registryGetCompletions,
  type CommandContext,
  type CommandOutput,
} from './ai/CommandRegistry'
import { logger } from "./services/Logger";

interface TerminalProps {
  height: number
  onHeightChange: (h: number) => void
  visible: boolean
  onToggle: () => void
}

interface TerminalEntry {
  type: 'input' | 'output' | 'error' | 'success' | 'info'
  text: string
}

type TerminalMode = 'xterm-real' | 'legacy-sim' | 'legacy-real'

interface TerminalSession {
  id: string // 唯一标识符
  name: string
  mode: TerminalMode // 当前使用的模式
  history: TerminalEntry[] // 模拟模式的输出历史
  commandHistory: string[]
  historyIndex: number
  apiSessionId?: string // 真实终端会话 ID
  isExecuting?: boolean
  xtermConnected?: boolean // xterm WebSocket 连接状态
  createdAt: number
}

const INITIAL_HISTORY: TerminalEntry[] = [
  { type: 'input', text: '$ npm run dev' },
  { type: 'success', text: '  VITE v5.4.0  ready in 342ms' },
  { type: 'output', text: '' },
  { type: 'output', text: '  ➜  Local:   http://localhost:3126/' },
  { type: 'output', text: '  ➜  Network: http://192.168.1.100:3126/' },
  { type: 'output', text: '' },
  { type: 'input', text: '$ npx tsc --noEmit' },
  { type: 'success', text: '✓ 无类型错误' },
  { type: 'output', text: '' },
  { type: 'input', text: '$ git status' },
  { type: 'output', text: '位于分支 main' },
  { type: 'output', text: '已修改: src/app/App.tsx' },
  { type: 'output', text: '新文件: src/app/components/DataTable.tsx' },
]

export default function Terminal({
  height,
  onHeightChange,
  visible,
  onToggle,
}: TerminalProps) {
  const { emit } = useWorkflowEventBus()
  const {
    fileContents,
    updateFile,
    createFile,
    deleteFile,
    renameFile,
    setActiveFile,
  } = useFileStore()

  // ── State Management ──
  const [terminals, setTerminals] = useState<TerminalSession[]>([
    {
      id: `term_${Date.now()}_1`,
      name: '终端 1',
      mode: 'legacy-sim', // 默认使用模拟模式（纯前端项目）
      history: INITIAL_HISTORY,
      commandHistory: ['npm run dev', 'npx tsc --noEmit', 'git status'],
      historyIndex: -1,
      isExecuting: false,
      xtermConnected: false,
      createdAt: Date.now(),
    },
  ])

  const [activeTerminal, setActiveTerminal] = useState(0)
  const [terminalInput, setTerminalInput] = useState('')
  const [showGitBar, setShowGitBar] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [tabSuggestions, setTabSuggestions] = useState<string[]>([])
  const [tabIndex, setTabIndex] = useState(-1)
  const [showHelp, setShowHelp] = useState(false)

  const dragRef = useRef<{ startY: number; startH: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const xtermContainerRef = useRef<HTMLDivElement>(null)

  const session = terminals[activeTerminal] || terminals[0]

  // ── CommandContext for Legacy Mode ──
  const buildCommandContext = useCallback(
    (): CommandContext => ({
      cwd: '/project',
      fileContents,
      createFile: (path: string, content?: string) =>
        createFile(path, content ?? ''),
      deleteFile: (path: string) => deleteFile(path),
      renameFile: (oldPath: string, newPath: string) =>
        renameFile(oldPath, newPath),
      updateFile: (path: string, content: string) => updateFile(path, content),
      openFile: (path: string) => setActiveFile(path),
      env: {
        NODE_ENV: 'development',
        SHELL: '/bin/bash',
        USER: 'yyc3-user',
        HOME: '/home/yyc3-user',
        PWD: '/project',
      },
      gitBranch: 'main',
      gitChanges: [],
    }),
    [fileContents, createFile, deleteFile, renameFile, updateFile, setActiveFile],
  )

  // ── XTerm Mode: WebSocket Connection ──
  const {
    state: wsState,
    write: wsWrite,
    resize: wsResize,
    connect: wsConnect,
    disconnect: wsDisconnect,
    reconnect: wsReconnect,
  } = useTerminalSocket({
    sessionId: session?.id || '',
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,

    onMessage: (data) => {
      // 接收 PTY 输出时自动滚动到底部
      if (scrollRef.current) {
        const scrollElement = scrollRef.current
        setTimeout(() => {
          if (scrollElement) {
            scrollElement.scrollTop = scrollElement.scrollHeight
          }
        }, 10)
      }
    },

    onConnect: () => {
      logger.info('xterm 已连接: ${session?.id}');
      setTerminals(prev => {
        const next = [...prev]
        next[activeTerminal] = {
          ...next[activeTerminal],
          xtermConnected: true,
        }
        return next
      })

      emit({
        type: 'terminal-status',
        detail: `✓ 终端 ${session?.name} 已连接`
      })
    },

    onClose: () => {
      setTerminals(prev => {
        const next = [...prev]
        next[activeTerminal] = {
          ...next[activeTerminal],
          xtermConnected: false,
        }
        return next
      })
    },

    onError: (error) => {
      logger.warn('WebSocket 连接失败，切换到模拟模式');
      // 立即切换到模拟模式
      setTerminals(prev => {
        const next = [...prev]
        next[activeTerminal] = {
          ...next[activeTerminal],
          mode: 'legacy-sim',
          xtermConnected: false,
        }
        return next
      })
    },
  })

  // 自动连接 xterm 会话（优化：减少延迟，快速回退）
  useEffect(() => {
    if (session?.mode === 'xterm-real' && !session.xtermConnected && visible) {
      // 使用 requestAnimationFrame 确保 DOM 已渲染
      const rafId = requestAnimationFrame(() => {
        wsConnect()
        // 设置超时回退：如果500ms内未连接成功，切换到模拟模式
        setTimeout(() => {
          setTerminals(prev => {
            const current = prev[activeTerminal]
            if (current?.mode === 'xterm-real' && !current.xtermConnected) {
              logger.info('xterm连接超时，切换到模拟模式');
              const next = [...prev]
              next[activeTerminal] = { ...next[activeTerminal], mode: 'legacy-sim' }
              return next
            }
            return prev
          })
        }, 1500)
      })

      return () => cancelAnimationFrame(rafId)
    }
  }, [session?.mode, session?.id, visible])

  // ── Legacy Mode: Session Management ──
  useEffect(() => {
    if (
      (session?.mode === 'legacy-real' || session?.mode === 'legacy-sim') &&
      !session?.apiSessionId &&
      session?.mode === 'legacy-real' &&
      visible
    ) {
      createLegacyRealSession()
    }
  }, [activeTerminal, visible, session?.mode])

  const createLegacyRealSession = useCallback(async () => {
    try {
      logger.info('创建 Legacy 真实终端会话...');
      const response = await fetch('/api/terminal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) throw new Error('Failed to create session')

      const data = await response.json()
      logger.info('[Terminal] Legacy 会话已创建:', data.sessionId);

      setTerminals((prev) => {
        const next = [...prev]
        next[activeTerminal] = {
          ...next[activeTerminal],
          apiSessionId: data.sessionId,
        }
        return next
      })

      addOutputEntry({
        type: 'success',
        text: `✓ 真实终端已连接 (会话: ${data.sessionId.substring(0, 12)}...)`,
      })
      addOutputEntry({
        type: 'info',
        text: `工作目录: /Volumes/Development/yyc3-77/YYC3-Family-AI`,
      })
    } catch (error) {
      logger.error('[Terminal] 创建 Legacy 会话失败:', error);
      addOutputEntry({
        type: 'error',
        text: '⚠ 无法连接到真实终端服务，将使用模拟模式',
      })
      setTerminals((prev) => {
        const next = [...prev]
        next[activeTerminal] = {
          ...next[activeTerminal],
          mode: 'legacy-sim',
        }
        return next
      })
    }
  }, [activeTerminal])

  // ── Output Entry Helper ──
  const addOutputEntry = useCallback(
    (entry: TerminalEntry) => {
      setTerminals((prev) => {
        const next = [...prev]
        const s = { ...next[activeTerminal] }
        s.history = [...s.history, entry]
        next[activeTerminal] = s
        return next
      })
    },
    [activeTerminal],
  )

  // ── Legacy Real Mode: Execute Command ──
  const executeLegacyRealCommand = useCallback(
    async (cmd: string) => {
      const currentSession = terminals[activeTerminal]

      if (!currentSession?.apiSessionId) {
        addOutputEntry({ type: 'error', text: '错误: 终端会话未初始化' })
        return
      }

      setTerminals((prev) => {
        const next = [...prev]
        next[activeTerminal] = {
          ...next[activeTerminal],
          isExecuting: true,
        }
        return next
      })

      try {
        logger.info('执行 Legacy 真实命令: ${cmd}');

        const response = await fetch('/api/terminal/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSession.apiSessionId,
            command: cmd,
          }),
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const result = await response.json()

        if (result.special === 'clear') {
          setTerminals((prev) => {
            const next = [...prev]
            next[activeTerminal] = { ...next[activeTerminal], history: [] }
            return next
          })
          return
        }

        if (result.output && result.output !== '(无输出)') {
          const lines = result.output.split('\n').filter((line: string) => line.trim())
          lines.forEach((line: string) => {
            addOutputEntry({
              type: result.exitCode === 0 ? 'output' : 'error',
              text: line,
            })
          })
        } else if (result.exitCode === 0) {
          addOutputEntry({ type: 'success', text: '✓ 命令执行成功' })
        }

        if (result.exitCode !== 0 && result.exitCode !== undefined) {
          addOutputEntry({ type: 'error', text: `(退出码: ${result.exitCode})` })
        }
      } catch (error) {
        logger.error('[Terminal] 执行 Legacy 命令失败:', error);
        addOutputEntry({
          type: 'error',
          text: `执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
        })
      } finally {
        setTerminals((prev) => {
          const next = [...prev]
          next[activeTerminal] = { ...next[activeTerminal], isExecuting: false }
          return next
        })
      }
    },
    [activeTerminal, terminals, addOutputEntry],
  )

  // ── Auto-scroll ──
  useEffect(() => {
    if (scrollRef.current && session?.mode !== 'xterm-real') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [session?.history.length, session?.mode])

  // ── Drag to Resize ──
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragRef.current = { startY: e.clientY, startH: height }

      const handleMove = (ev: MouseEvent) => {
        if (!dragRef.current) return
        const delta = dragRef.current.startY - ev.clientY
        const newH = Math.max(150, Math.min(window.innerHeight * 0.8, dragRef.current.startH + delta))
        onHeightChange(newH)
      }

      const handleUp = () => {
        dragRef.current = null
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
      }

      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    },
    [height, onHeightChange],
  )

  // ── Execute Command (Unified Handler) ──
  const executeCommand = useCallback(
    (cmd: string) => {
      const trimmed = cmd.trim()
      if (!trimmed) return

      emit({ type: 'terminal-command', detail: `$ ${trimmed}` })
      if (trimmed.startsWith('git ')) {
        emit({ type: 'git-operation', detail: trimmed })
      }

      // 仅在非 xterm 模式下添加到历史记录
      if (session?.mode !== 'xterm-real') {
        setTerminals((prev) => {
          const next = [...prev]
          const s = { ...next[activeTerminal] }
          s.commandHistory = [...s.commandHistory, trimmed]
          s.historyIndex = -1

          const inputEntry: TerminalEntry = { type: 'input', text: `$ ${trimmed}` }

          if (trimmed === 'clear') {
            s.history = []
          } else {
            s.history = [...s.history, inputEntry]
          }

          next[activeTerminal] = s
          return next
        })
      }

      // 根据模式分发执行逻辑
      switch (session?.mode) {
        case 'xterm-real':
          // xterm 模式：通过 WebSocket 发送到 PTY
          wsWrite(`${trimmed  }\r`)
          break

        case 'legacy-real':
          // Legacy 真实模式：REST API
          executeLegacyRealCommand(trimmed)
          break

        case 'legacy-sim':
        default:
          // 模拟模式：CommandRegistry
          setTerminals((prev) => {
            const next = [...prev]
            const s = { ...next[activeTerminal] }

            if (trimmed === 'clear') {
              s.history = []
            } else {
              const ctx = buildCommandContext()
              const cmdOutput: CommandOutput[] = registryExecuteCommand(trimmed, ctx)

              const hasClear = cmdOutput.some((o) => o.text === '__CLEAR__')
              if (hasClear) {
                s.history = []
              } else {
                const output: TerminalEntry[] = cmdOutput.map((o) => ({
                  type:
                    o.type === 'warning'
                      ? ('output' as const)
                      : o.type === 'info'
                        ? ('output' as const)
                        : (o.type as TerminalEntry['type']),
                  text: o.text,
                }))
                s.history = [...s.history, ...output]
              }
            }

            next[activeTerminal] = s
            return next
          })
          break
      }

      setTerminalInput('')
    },
    [
      activeTerminal,
      emit,
      buildCommandContext,
      session?.mode,
      wsWrite,
      executeLegacyRealCommand,
    ],
  )

  // ── Keyboard Handlers ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(terminalInput)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const cmdHist = session.commandHistory
      if (cmdHist.length === 0) return
      const newIndex =
        session.historyIndex < 0 ? cmdHist.length - 1 : Math.max(0, session.historyIndex - 1)
      setTerminals((prev) => {
        const next = [...prev]
        next[activeTerminal] = { ...next[activeTerminal], historyIndex: newIndex }
        return next
      })
      setTerminalInput(cmdHist[newIndex] || '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const cmdHist = session.commandHistory
      if (session.historyIndex < 0) return
      const newIndex = session.historyIndex + 1
      if (newIndex >= cmdHist.length) {
        setTerminals((prev) => {
          const next = [...prev]
          next[activeTerminal] = { ...next[activeTerminal], historyIndex: -1 }
          return next
        })
        setTerminalInput('')
      } else {
        setTerminals((prev) => {
          const next = [...prev]
          next[activeTerminal] = { ...next[activeTerminal], historyIndex: newIndex }
          return next
        })
        setTerminalInput(cmdHist[newIndex] || '')
      }
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault()
      if (session?.mode === 'xterm-real') {
        // xterm 清屏
        wsWrite('\u000c') // Form feed character for clear
      } else {
        setTerminals((prev) => {
          const next = [...prev]
          next[activeTerminal] = { ...next[activeTerminal], history: [] }
          return next
        })
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const currentInput = terminalInput.trim()
      const PATH_CMDS = ['ls', 'cat', 'cd', 'vim', 'nano', 'code', 'cp', 'mv', 'rm', 'mkdir', 'touch']
      const parts = currentInput.split(/\s+/)
      const lastToken = parts[parts.length - 1]

      if (PATH_CMDS.includes(parts[0]) || lastToken.startsWith('/') || lastToken.startsWith('.') || lastToken.startsWith('~')) {
        const completions = Object.keys(fileContents).filter((f) => f.toLowerCase().includes(lastToken.toLowerCase()))
        setTabSuggestions(completions)
        setTabIndex(-1)
      } else if (currentInput) {
        const ctx = buildCommandContext()
        const completions = registryGetCompletions(currentInput, ctx)
        setTabSuggestions(completions)
        setTabIndex(-1)
      }
    }
  }

  // ── Tab Completion ──
  useEffect(() => {
    if (tabSuggestions.length > 0 && tabIndex >= 0 && tabIndex < tabSuggestions.length) {
      const parts = terminalInput.trim().split(/\s+/)
      parts[parts.length - 1] = tabSuggestions[tabIndex]
      setTerminalInput(parts.join(' '))
    }
  }, [tabIndex, tabSuggestions, terminalInput])

  // ── Session Management ──
  const addNewTerminal = useCallback(() => {
    const newId = `term_${Date.now()}_${terminals.length}`
    setTerminals((prev) => [
      ...prev,
      {
        id: newId,
        name: `终端 ${prev.length + 1}`,
        mode: 'xterm-real',
        history: [],
        commandHistory: [],
        historyIndex: -1,
        isExecuting: false,
        xtermConnected: false,
        createdAt: Date.now(),
      },
    ])
    setActiveTerminal(terminals.length)
  }, [terminals.length])

  const closeTerminal = useCallback(
    (index: number) => {
      if (terminals.length <= 1) return

      // 断开 WebSocket 连接
      if (terminals[index].mode === 'xterm-real') {
        wsDisconnect()
      }

      setTerminals((prev) => prev.filter((_, i) => i !== index))
      if (activeTerminal === index) {
        setActiveTerminal(Math.max(0, index - 1))
      } else if (activeTerminal > index) {
        setActiveTerminal(activeTerminal - 1)
      }
    },
    [terminals.length, activeTerminal, wsDisconnect],
  )

  // ── Mode Switching ──
  const cycleMode = useCallback(() => {
    const modes: TerminalMode[] = ['xterm-real', 'legacy-real', 'legacy-sim']
    const currentIndex = modes.indexOf(session.mode || 'xterm-real')
    const nextMode = modes[(currentIndex + 1) % modes.length]

    logger.info('切换模式: ${session.mode} → ${nextMode}');

    setTerminals((prev) => {
      const next = [...prev]
      next[activeTerminal] = {
        ...next[activeTerminal],
        mode: nextMode,
        xtermConnected: false,
      }
      return next
    })

    // 如果切换到 xterm-real，重新连接
    if (nextMode === 'xterm-real') {
      setTimeout(() => wsConnect(), 200)
    }

    emit({
      type: 'terminal-status',
      detail: `模式切换: ${getModeLabel(nextMode)}`,
    })
  }, [session.mode, activeTerminal, wsConnect, emit])

  // ── Helpers ──
  function getModeLabel(mode: TerminalMode): string {
    switch (mode) {
      case 'xterm-real': return 'XTerm 实时'
      case 'legacy-real': return 'Legacy 真实'
      case 'legacy-sim': return '模拟模式'
      default: return '未知'
    }
  }

  function getModeIcon(mode: TerminalMode) {
    switch (mode) {
      case 'xterm-real': return session?.xtermConnected ? Wifi : WifiOff
      case 'legacy-real': return Cpu
      case 'legacy-sim': return Shield
      default: return Monitor
    }
  }

  const modeColor = useMemo(() => {
    switch (session?.mode) {
      case 'xterm-real': return session?.xtermConnected ? 'text-green-400' : 'text-yellow-400'
      case 'legacy-real': return 'text-blue-400'
      case 'legacy-sim': return 'text-gray-400'
      default: return 'text-gray-500'
    }
  }, [session?.mode, session?.xtermConnected])

  // ── Render ──
  if (!visible) return null

  return (
    <div
      className="flex flex-col bg-[#1a1a2e] border-t border-gray-700 select-none"
      style={{ height: isMaximized ? 'calc(100vh - 56px)' : height }}
    >
      {/* ════════════ Header Bar ════════════ */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#0d1c2a] border-b border-gray-700">
        {/* Left: Tabs */}
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
          <TerminalIcon size={14} className="text-gray-400 flex-shrink-0" />

          {terminals.map((term, index) => (
            <button
              key={term.id}
              onClick={() => setActiveTerminal(index)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                index === activeTerminal
                  ? 'bg-[#2d2d5e] text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#25254a]'
              }`}
            >
              <span className="truncate max-w-[120px]">{term.name}</span>
              {term.isExecuting && <Loader2 size={10} className="animate-spin" />}
              {terminals.length > 1 && (
                <X
                  size={10}
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTerminal(index)
                  }}
                  className="hover:text-red-400 opacity-60 hover:opacity-100"
                />
              )}
            </button>
          ))}

          <button
            onClick={addNewTerminal}
            className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
            title="新建终端"
          >
            <Plus size={14} />
          </button>

          {/* Mode Indicator */}
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${modeColor}`}>
            {React.createElement(getModeIcon(session.mode), { size: 12 })}
            <span>{getModeLabel(session.mode)}</span>
          </div>

          {/* Status */}
          {session?.mode === 'xterm-real' && (
            <span className="text-xs text-gray-500">
              {wsState.connected ? '●' : '○'} {wsState.error || (wsState.connecting ? '连接中...' : '')}
            </span>
          )}
          {session?.isExecuting && !session?.xtermConnected && (
            <Loader2 size={12} className="animate-spin text-yellow-400" />
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Git Quick Actions */}
          <button
            onClick={() => setShowGitBar(!showGitBar)}
            className={`p-1 rounded hover:bg-[#2d2d5e] transition-colors ${
              showGitBar ? 'text-orange-400' : 'text-gray-400'
            }`}
            title="Git 快捷操作"
          >
            <GitBranch size={14} />
          </button>

          {/* Mode Switcher */}
          <button
            onClick={cycleMode}
            className="p-1 rounded hover:bg-[#2d2d5e] text-gray-400 hover:text-cyan-400 transition-colors"
            title="切换终端模式 (XTerm/Legacy/Sim)"
          >
            <Zap size={14} />
          </button>

          {/* Maximize/Restore */}
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 rounded hover:bg-[#2d2d5e] text-gray-400 hover:text-white transition-colors"
            title={isMaximized ? '还原' : '最大化'}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Close Panel */}
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-red-900/50 text-gray-400 hover:text-red-400 transition-colors"
            title="关闭面板"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ════════════ Git Toolbar ════════════ */}
      {showGitBar && (
        <div className="flex items-center gap-1 px-2 py-1 bg-[#1e1e38] border-b border-gray-700">
          {[
            { icon: GitBranch, label: 'status', action: 'git status' },
            { icon: Download, label: 'pull', action: 'git pull' },
            { icon: Upload, label: 'push', action: 'git push' },
            { icon: FileDiff, label: 'diff', action: 'git diff' },
            { icon: GitCommit, label: 'commit', action: 'git commit -m "update"' },
            { icon: Search, label: 'log', action: 'git log --oneline -5' },
          ].map(({ icon: Icon, label, action }) => (
            <button
              key={label}
              onClick={() => {
                executeCommand(action)
                setShowGitBar(false)
              }}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[#2d2d5e] text-gray-300 hover:bg-[#3d3d7e] hover:text-white transition-colors"
            >
              <Icon size={12} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ════════════ Main Content Area ════════════ */}
      <div className="flex-1 relative overflow-hidden">
        {/* XTerm Mode: Professional Terminal */}
        {session?.mode === 'xterm-real' ? (
          <div
            ref={xtermContainerRef}
            className="absolute inset-0 w-full h-full"
            key={`xterm-${session.id}`}
          >
            <XTerminal
              sessionId={session.id}
              theme={getDefaultTheme()}
              fontFamily='"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Monaco, Consolas, monospace'
              fontSize={13}
              cursorBlink={true}
              onData={(data) => {
                // 用户输入转发到 WebSocket
                wsWrite(data)
              }}
              onResize={({ cols, rows }) => {
                // 尺寸同步到后端 PTY
                wsResize(cols, rows)
              }}
              onTitleChange={(title) => {
                // 更新标签标题（如 vim 改变 title）
                if (title && title !== session.name) {
                  setTerminals((prev) => {
                    const next = [...prev]
                    next[activeTerminal] = {
                      ...next[activeTerminal],
                      name: title.substring(0, 20),
                    }
                    return next
                  })
                }
              }}
            />

            {/* Connection Status Overlay */}
            {!wsState.connected && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 pointer-events-none">
                <div className="text-center space-y-2">
                  <WifiOff size={32} className="mx-auto text-yellow-400 animate-pulse" />
                  <p className="text-sm text-gray-300">正在连接终端服务...</p>
                  <p className="text-xs text-gray-500">{wsState.error || '请确保开发服务器正在运行'}</p>
                  <button
                    onClick={wsReconnect}
                    className="mt-2 px-4 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 pointer-events-auto"
                  >
                    重试连接
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Legacy Mode: Custom UI */
          <div ref={scrollRef} className="h-full overflow-y-auto p-2 font-mono text-xs leading-relaxed">
            {session?.history.map((entry, idx) => (
              <div
                key={`${idx}-${entry.text.slice(0, 20)}`}
                className={`whitespace-pre-wrap break-all ${
                  entry.type === 'input'
                    ? 'text-cyan-300 font-semibold'
                    : entry.type === 'error'
                      ? 'text-red-400'
                      : entry.type === 'success'
                        ? 'text-green-400'
                        : entry.type === 'info'
                          ? 'text-blue-300'
                          : 'text-gray-300'
                }`}
              >
                {entry.text}
              </div>
            ))}

            {/* Input Line */}
            <div className="flex items-center mt-1 sticky bottom-0 bg-[#1a1a2e]">
              <span className="text-green-400 mr-2">$</span>
              <input
                ref={inputRef}
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowHelp(true)}
                onBlur={() => setTimeout(() => setShowHelp(false), 200)}
                placeholder={
                  session?.mode === 'legacy-real' ? '输入命令 (真实 Shell)...' : '输入命令 (模拟模式)...'
                }
                className="flex-1 bg-transparent outline-none text-gray-200 placeholder-gray-600 caret-cyan-400"
                spellCheck={false}
                autoComplete="off"
                disabled={session?.isExecuting}
              />
              {session?.isExecuting && <Loader2 size={12} className="animate-spin text-yellow-400 ml-2" />}
            </div>

            {/* Tab Completions */}
            {tabSuggestions.length > 0 && (
              <div className="mt-1 p-2 bg-[#16162a] rounded border border-gray-700 text-xs">
                <div className="text-gray-500 mb-1">补全建议:</div>
                {tabSuggestions.map((s, i) => (
                  <div
                    key={s}
                    onClick={() => {
                      const parts = terminalInput.trim().split(/\s+/)
                      parts[parts.length - 1] = s
                      setTerminalInput(parts.join(' '))
                      setTabSuggestions([])
                    }}
                    className={`cursor-pointer px-1 py-0.5 rounded ${
                      i === tabIndex ? 'bg-[#2d2d5e] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}

            {/* Help Text */}
            {showHelp && (
              <div className="mt-2 p-2 bg-[#16162a]/80 rounded text-[10px] text-gray-500 space-y-0.5">
                <div>↑↓ 历史 | Ctrl+L 清屏 | Tab 补全 | Enter 执行</div>
                <div>当前模式: {getModeLabel(session?.mode || 'unknown')}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════ Status Bar ════════════ */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-[#16162a] border-t border-gray-700 text-[10px] text-gray-500">
        <div className="flex items-center gap-2">
          <Power size={10} className={wsState.connected ? 'text-green-500' : 'text-gray-600'} />
          <span>{session?.mode === 'xterm-real' ? 'xterm.js' : session?.mode === 'legacy-real' ? 'Shell' : 'Simulated'}</span>
          <span>|</span>
          <span>{session?.mode === 'xterm-real' ? (wsState.connected ? 'REAL' : 'OFFLINE') : session?.mode === 'legacy-real' ? 'REAL' : 'SIM'}</span>
          <span>|</span>
          <span>UTF-8</span>
          {session?.history && <span>|</span>}
          {session?.history && <span>{session.history.length} 条记录</span>}
          {session?.apiSessionId && (
            <>
              <span>|</span>
              <span className="font-mono">SID: {session.apiSessionId.substring(0, 8)}...</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <kbd className="px-1 bg-[#2d2d5e] rounded text-gray-400">⌘K</kbd>
          <span>清屏</span>
          <span className="ml-2 cursor-help" title="YYC³ Terminal v3.0 | Powered by xterm.js">
            🐙 YYC³
          </span>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleDragStart}
        className="h-1 cursor-row-resize bg-transparent hover:bg-cyan-500/30 active:bg-cyan-500/60 transition-colors"
      />
    </div>
  )
}
