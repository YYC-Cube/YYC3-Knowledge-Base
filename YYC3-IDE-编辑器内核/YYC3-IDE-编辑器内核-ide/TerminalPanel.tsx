/**
 * @file: TerminalPanel.tsx
 * @description: 终端面板组件 - 与其他面板统一风格，支持拖拽分栏
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-04-05
 * @license: MIT
 */

import React, { useState, useCallback } from 'react'
import { TerminalSquare, Plus, X, ChevronDown, Maximize2 } from 'lucide-react'
import Terminal from './Terminal'
import { PanelHeader } from './PanelManager'
import { logger } from "./services/Logger";

interface TerminalSession {
  id: string
  name: string
}

interface TerminalPanelProps {
  nodeId?: string
}

const DEFAULT_SESSIONS: TerminalSession[] = [
  { id: 'terminal-1', name: '终端 1' }
]

export default function TerminalPanel({ nodeId }: TerminalPanelProps) {
  const [sessions] = useState<TerminalSession[]>(DEFAULT_SESSIONS)
  const [activeSessionId, setActiveSessionId] = useState('terminal-1')
  const [showSessionMenu, setShowSessionMenu] = useState(false)

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0]

  const handleAddSession = useCallback(() => {
    logger.info('添加新终端会话');
  }, [])

  const handleCloseSession = useCallback((sessionId: string) => {
    logger.info('[TerminalPanel] 关闭终端会话:', sessionId);
  }, [])

  return (
    <div className="size-full flex flex-col bg-[var(--ide-bg)] border border-[var(--ide-border-dim)]">
      {/* Panel Header - 统一标题栏 */}
      <PanelHeader
        nodeId={nodeId || 'terminal-panel'}
        panelId="terminal"
        title="终端"
        icon={<TerminalSquare className="w-3 h-3 text-emerald-400/70" />}
      >
        {/* 终端会话标签栏 */}
        <div className="flex items-center gap-0.5 ml-2">
          {/* 会话标签 */}
          <div className="flex items-center gap-1 bg-[var(--ide-bg-deep)] rounded px-2 py-0.5 min-w-[100px]">
            <button
              onClick={() => setShowSessionMenu(!showSessionMenu)}
              className="flex items-center gap-1 text-[0.65rem] text-[var(--ide-text-muted)] hover:text-[var(--ide-text-primary)] transition-colors"
            >
              <span>{activeSession.name}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* 操作按钮 */}
          <button
            onClick={handleAddSession}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/5 transition-colors"
            title="新建终端"
          >
            <Plus className="w-3 h-3 text-[var(--ide-text-faint)]" />
          </button>

          <button
            onClick={() => handleCloseSession(activeSessionId)}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/5 transition-colors"
            title="关闭终端"
          >
            <X className="w-3 h-3 text-[var(--ide-text-faint)]" />
          </button>
        </div>
      </PanelHeader>

      {/* 终端内容区域 */}
      <div className="flex-1 overflow-hidden bg-[var(--ide-bg-deep)]">
        <Terminal
          height={9999}
          onHeightChange={() => {}}
          visible={true}
          onToggle={() => {}}
        />
      </div>
    </div>
  )
}
