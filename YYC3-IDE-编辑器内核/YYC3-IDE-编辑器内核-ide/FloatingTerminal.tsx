/**
 * @file: FloatingTerminal.tsx
 * @description: 浮动终端窗口组件，支持自由拖拽、调整大小、最小化/还原
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-05
 * @license: MIT
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Terminal as TerminalIcon,
  X,
  Minus,
  Maximize2,
  Minimize2,
  GripVertical,
} from 'lucide-react'
import Terminal from './Terminal'

interface FloatingTerminalProps {
  onClose: () => void
}

interface Position {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

const DEFAULT_WIDTH = 600
const DEFAULT_HEIGHT = 400
const MIN_WIDTH = 300
const MIN_HEIGHT = 200

export default function FloatingTerminal({ onClose }: FloatingTerminalProps) {
  const [position, setPosition] = useState<Position>(() => ({
    x: window.innerWidth - DEFAULT_WIDTH - 20,
    y: window.innerHeight - DEFAULT_HEIGHT - 100,
  }))
  const [size, setSize] = useState<Size>({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  })
  const [minimized, setMinimized] = useState(false)
  const [zIndex, setZIndex] = useState(1000)
  const [visible, setVisible] = useState(true)

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
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setZIndex(prev => prev + 1)
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
  }, [position.x, position.y, size.width])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setZIndex(prev => prev + 1)
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: size.width,
      origH: size.height,
    }

    const handleMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return
      const dx = ev.clientX - resizeRef.current.startX
      const dy = ev.clientY - resizeRef.current.startY
      const newW = Math.max(MIN_WIDTH, resizeRef.current.origW + dx)
      const newH = Math.max(MIN_HEIGHT, resizeRef.current.origH + dy)
      setSize({ width: newW, height: newH })
    }

    const handleUp = () => {
      resizeRef.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'nwse-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [size.width, size.height])

  const handleMouseDown = useCallback(() => {
    setZIndex(prev => prev + 1)
  }, [])

  if (minimized) {
    return (
      <div
        style={{
          position: 'fixed',
          left: position.x,
          bottom: 48,
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

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex,
      }}
      className="bg-[#1a1a2e] border border-gray-700 rounded-lg shadow-2xl overflow-hidden flex flex-col"
      onMouseDown={handleMouseDown}
    >
      {/* Title bar */}
      <div
        onMouseDown={handleDragStart}
        className="flex items-center gap-1 px-1.5 py-1 bg-[#16162a] border-b border-gray-700 cursor-grab active:cursor-grabbing flex-shrink-0 select-none"
      >
        <GripVertical className="w-3 h-3 text-gray-600" />
        <TerminalIcon className="w-3 h-3 text-cyan-400" />
        <span className="text-[0.65rem] text-gray-400 flex-1">终端</span>

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
          height={size.height - 28}
          onHeightChange={() => {}}
          visible={visible}
          onToggle={() => setVisible(!visible)}
        />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
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
    </div>
  )
}
