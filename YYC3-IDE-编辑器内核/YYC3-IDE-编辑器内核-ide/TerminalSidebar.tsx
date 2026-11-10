/**
 * @file: TerminalSidebar.tsx
 * @description: 终端边栏一体化组件，支持拖拽、停靠、调整大小
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-04-05
 * @license: MIT
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Terminal as TerminalIcon,
  X,
  Minus,
  Maximize2,
  GripVertical,
  PanelLeftClose,
  PanelRightClose,
  PanelBottomClose,
  Pin,
  PinOff,
  Move,
} from 'lucide-react'
import Terminal from './Terminal'

type DockPosition = 'float' | 'left' | 'right' | 'bottom'

interface TerminalSidebarProps {
  onClose: () => void
  initialPosition?: DockPosition
}

interface Position {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

const DEFAULT_FLOAT_WIDTH = 600
const DEFAULT_FLOAT_HEIGHT = 400
const DEFAULT_DOCK_WIDTH = 350
const DEFAULT_DOCK_HEIGHT = 250
const MIN_WIDTH = 280
const MIN_HEIGHT = 180
const TOP_BAR_HEIGHT = 56

const DOCK_CONFIGS = {
  float: { width: DEFAULT_FLOAT_WIDTH, height: DEFAULT_FLOAT_HEIGHT },
  left: { width: DEFAULT_DOCK_WIDTH, height: 0 },
  right: { width: DEFAULT_DOCK_WIDTH, height: 0 },
  bottom: { width: 0, height: DEFAULT_DOCK_HEIGHT },
}

export default function TerminalSidebar({
  onClose,
  initialPosition = 'float',
}: TerminalSidebarProps) {
  const [dockPosition, setDockPosition] = useState<DockPosition>(initialPosition)
  const [position, setPosition] = useState<Position>(() => ({
    x: window.innerWidth - DEFAULT_FLOAT_WIDTH - 20,
    y: window.innerHeight - DEFAULT_FLOAT_HEIGHT - 100,
  }))
  const [size, setSize] = useState<Size>(() => DOCK_CONFIGS[initialPosition])
  const [minimized, setMinimized] = useState(false)
  const [zIndex, setZIndex] = useState(1000)
  const [visible, setVisible] = useState(true)
  const [pinned, setPinned] = useState(false)

  const dragRef = useRef<{
    startX: number
    startY: number
    origX: number
    origY: number
  } | null>(null)
  const resizeRef = useRef<{
    startX: number
    startY: number
    origW: number
    origH: number
    direction: 'right' | 'bottom' | 'corner'
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleResize = () => {
      if (dockPosition === 'float') {
        setPosition(prev => ({
          x: Math.min(prev.x, window.innerWidth - size.width),
          y: Math.min(prev.y, window.innerHeight - size.height),
        }))
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [dockPosition, size.width, size.height])

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (dockPosition !== 'float') return
    e.preventDefault()
    if (!pinned) setZIndex(prev => prev + 1)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    }

    const handleMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY
      const newX = Math.max(0, Math.min(window.innerWidth - size.width, dragRef.current.origX + dx))
      const newY = Math.max(0, Math.min(window.innerHeight - 50, dragRef.current.origY + dy))
      setPosition({ x: newX, y: newY })
    }

    const handleUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [dockPosition, position.x, position.y, size.width, pinned])

  const handleResizeStart = useCallback((
    e: React.MouseEvent,
    direction: 'right' | 'bottom' | 'corner'
  ) => {
    e.preventDefault()
    e.stopPropagation()
    if (!pinned) setZIndex(prev => prev + 1)

    const currentSize = dockPosition === 'float'
      ? size
      : dockPosition === 'bottom'
        ? { width: 0, height: size.height }
        : { width: size.width, height: 0 }

    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: currentSize.width || size.width,
      origH: currentSize.height || size.height,
      direction,
    }

    const handleMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return
      const dx = ev.clientX - resizeRef.current.startX
      const dy = ev.clientY - resizeRef.current.startY

      if (dockPosition === 'left') {
        const newW = Math.max(MIN_WIDTH, Math.min(600, resizeRef.current.origW + dx))
        setSize(prev => ({ ...prev, width: newW }))
      } else if (dockPosition === 'right') {
        const newW = Math.max(MIN_WIDTH, Math.min(600, resizeRef.current.origW - dx))
        setSize(prev => ({ ...prev, width: newW }))
      } else if (dockPosition === 'bottom') {
        const newH = Math.max(MIN_HEIGHT, Math.min(400, resizeRef.current.origH - dy))
        setSize(prev => ({ ...prev, height: newH }))
      } else {
        const newW = Math.max(MIN_WIDTH, resizeRef.current.origW + dx)
        const newH = Math.max(MIN_HEIGHT, resizeRef.current.origH + dy)
        setSize({ width: newW, height: newH })
      }
    }

    const handleUp = () => {
      resizeRef.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    const cursor = direction === 'corner' ? 'nwse-resize'
      : direction === 'right' ? 'col-resize'
      : 'row-resize'
    document.body.style.cursor = cursor
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [dockPosition, size, pinned])

  const handleDock = useCallback((pos: DockPosition) => {
    setDockPosition(pos)
    if (pos === 'float') {
      setSize({ width: DEFAULT_FLOAT_WIDTH, height: DEFAULT_FLOAT_HEIGHT })
      setPosition({
        x: window.innerWidth - DEFAULT_FLOAT_WIDTH - 20,
        y: window.innerHeight - DEFAULT_FLOAT_HEIGHT - 100,
      })
    } else if (pos === 'bottom') {
      setSize(prev => ({ width: 0, height: DEFAULT_DOCK_HEIGHT }))
    } else {
      setSize(prev => ({ width: DEFAULT_DOCK_WIDTH, height: 0 }))
    }
    setMinimized(false)
  }, [])

  const handleMouseDown = useCallback(() => {
    if (!pinned) setZIndex(prev => prev + 1)
  }, [pinned])

  const renderDockButton = (pos: DockPosition, Icon: React.ComponentType<{ className?: string }>, title: string) => (
    <button
      onClick={() => handleDock(pos)}
      className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
        dockPosition === pos
          ? 'bg-sky-500/20 text-sky-400'
          : 'hover:bg-white/5 text-gray-500'
      }`}
      title={title}
    >
      <Icon className="w-3 h-3" />
    </button>
  )

  if (minimized) {
    return (
      <div
        style={{
          position: 'fixed',
          left: dockPosition === 'float' ? position.x : undefined,
          right: dockPosition === 'right' ? 0 : undefined,
          bottom: dockPosition === 'bottom' ? 0 : dockPosition === 'float' ? 48 : undefined,
          zIndex,
        }}
        className="bg-[#1a1a2e] border border-gray-700 rounded-lg shadow-2xl overflow-hidden"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-1.5 px-2 py-1">
          <TerminalIcon className="w-3 h-3 text-cyan-400" />
          <span className="text-[0.65rem] text-gray-400">终端</span>
          <button
            onClick={() => setMinimized(false)}
            className="w-4 h-4 rounded flex items-center justify-center hover:bg-white/10 transition-colors"
            title="还原"
          >
            <Maximize2 className="w-3 h-3 text-gray-500" />
          </button>
          <button
            onClick={onClose}
            className="w-4 h-4 rounded flex items-center justify-center hover:bg-red-900/20 transition-colors"
            title="关闭"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        </div>
      </div>
    )
  }

  const containerStyle: React.CSSProperties = dockPosition === 'float'
    ? {
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex,
      }
    : dockPosition === 'left'
      ? {
          position: 'fixed',
          left: 0,
          top: TOP_BAR_HEIGHT,
          width: size.width,
          height: `calc(100vh - ${TOP_BAR_HEIGHT}px)`,
          zIndex,
        }
      : dockPosition === 'right'
        ? {
            position: 'fixed',
            right: 0,
            top: TOP_BAR_HEIGHT,
            width: size.width,
            height: `calc(100vh - ${TOP_BAR_HEIGHT}px)`,
            zIndex,
          }
        : {
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            height: size.height,
            zIndex,
          }

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={`bg-[#1a1a2e] border-gray-700 shadow-2xl overflow-hidden flex flex-col ${
        dockPosition === 'float' 
          ? 'rounded-lg border' 
          : dockPosition === 'bottom'
            ? 'border-t border-l border-r'
            : 'border-t border-b border-r border-l'
      }`}
      onMouseDown={handleMouseDown}
    >
      {/* Title bar */}
      <div
        onMouseDown={dockPosition === 'float' ? handleDragStart : undefined}
        className={`flex items-center gap-1 px-1.5 py-1 bg-[#16162a] border-b border-gray-700 flex-shrink-0 select-none ${
          dockPosition === 'float' ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        {dockPosition === 'float' && (
          <GripVertical className="w-3 h-3 text-gray-600" />
        )}
        <TerminalIcon className="w-3 h-3 text-cyan-400" />
        <span className="text-[0.65rem] text-gray-400 flex-1">终端</span>

        {/* Dock buttons */}
        <div className="flex items-center gap-0.5 mr-1">
          {renderDockButton('float', Move, '浮动')}
          {renderDockButton('left', PanelLeftClose, '左侧停靠')}
          {renderDockButton('right', PanelRightClose, '右侧停靠')}
          {renderDockButton('bottom', PanelBottomClose, '底部停靠')}
        </div>

        {/* Pin */}
        <button
          onClick={() => setPinned(!pinned)}
          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
            pinned ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/5 text-gray-500'
          }`}
          title={pinned ? '取消置顶' : '置顶'}
        >
          {pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
        </button>

        {/* Minimize */}
        <button
          onClick={() => setMinimized(true)}
          className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/5 transition-colors"
          title="最小化"
        >
          <Minus className="w-3 h-3 text-gray-500" />
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-900/20 transition-colors"
          title="关闭"
        >
          <X className="w-3 h-3 text-gray-500 hover:text-red-400" />
        </button>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden">
        <Terminal
          height={dockPosition === 'float' ? size.height - 28 : 9999}
          onHeightChange={() => {}}
          visible={visible}
          onToggle={() => setVisible(!visible)}
        />
      </div>

      {/* Resize handles */}
      {dockPosition === 'left' && (
        <div
          onMouseDown={(e) => handleResizeStart(e, 'right')}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-500/30 transition-colors"
        />
      )}
      {dockPosition === 'right' && (
        <div
          onMouseDown={(e) => handleResizeStart(e, 'right')}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-500/30 transition-colors"
        />
      )}
      {dockPosition === 'bottom' && (
        <div
          onMouseDown={(e) => handleResizeStart(e, 'bottom')}
          className="absolute left-0 right-0 top-0 h-1 cursor-row-resize hover:bg-sky-500/30 transition-colors"
        />
      )}
      {dockPosition === 'float' && (
        <div
          onMouseDown={(e) => handleResizeStart(e, 'corner')}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
          style={{ touchAction: 'none' }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            className="absolute bottom-0.5 right-0.5 text-gray-600 opacity-50"
          >
            <path
              d="M9 1L1 9M9 5L5 9M9 9L9 9"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>
      )}
    </div>
  )
}
