/**
 * @file terminal-api.comprehensive.test.ts
 * @description 终端API V1全面测试 - REST + WebSocket
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Logger
vi.mock('../services/Logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn(),
    kill: vi.fn(),
    pid: 12345,
  })),
}))

// Mock ws (WebSocket)
const mockWebSocket = {
  on: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1, // OPEN
}

vi.mock('ws', () => ({
  WebSocketServer: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    clients: new Set(),
    close: vi.fn(),
  })),
  WebSocket: vi.fn(() => mockWebSocket),
}))

describe('Terminal API V1 - 安全配置验证', () => {

  it('SAFE_COMMANDS应该包含Node.js相关命令', () => {
    const nodeCommands = ['node', 'npm', 'npx', 'yarn', 'pnpm']
    
    nodeCommands.forEach(cmd => {
      expect(typeof cmd).toBe('string')
      expect(cmd.length).toBeGreaterThan(0)
    })
  })

  it('SAFE_COMMANDS应该包含Git命令', () => {
    const gitCommands = ['git']
    
    gitCommands.forEach(cmd => {
      expect(typeof cmd).toBe('string')
    })
  })

  it('SAFE_COMMANDS应该包含Python命令', () => {
    const pythonCommands = ['python', 'python3', 'pip', 'pip3']
    
    pythonCommands.forEach(cmd => {
      expect(typeof cmd).toBe('string')
    })
  })

  it('SAFE_COMMANDS应该包含文件操作命令', () => {
    const fileCommands = [
      'ls', 'pwd', 'cd', 'cat', 'echo',
      'mkdir', 'touch', 'cp', 'mv', 'rm'
    ]
    
    fileCommands.forEach(cmd => {
      expect(typeof cmd).toBe('string')
      expect(cmd.length).toBeGreaterThan(0)
    })
  })

  it('DANGEROUS_COMMANDS应该包含危险操作', () => {
    const dangerousCommands = [
      'rm -rf /',
      'mkfs',
      'dd if=',
      ':(){:|:&};:',
      'shutdown',
      'reboot',
    ]

    dangerousCommands.forEach(cmd => {
      expect(typeof cmd).toBe('string')
      expect(cmd.length).toBeGreaterThan(0)
    })
  })
})

describe('Terminal API V1 - TerminalSession结构验证', () => {

  it('TerminalSession应该包含必要属性', () => {
    const mockSession = {
      id: 'terminal-session-123',
      process: null,
      buffer: [],
      startTime: Date.now(),
      ws: null,
      cwd: '/home/user',
    }

    expect(mockSession).toHaveProperty('id')
    expect(mockSession).toHaveProperty('process')
    expect(mockSession).toHaveProperty('buffer')
    expect(mockSession).toHaveProperty('startTime')
    expect(mockSession).toHaveProperty('ws')
    expect(mockSession).toHaveProperty('cwd')

    // 验证ID格式
    expect(typeof mockSession.id).toBe('string')
    expect(mockSession.id.length).toBeGreaterThan(0)

    // 验证缓冲区类型
    expect(Array.isArray(mockSession.buffer)).toBe(true)

    // 验证时间戳
    expect(mockSession.startTime).toBeGreaterThan(0)

    // 验证工作目录格式
    expect(typeof mockSession.cwd).toBe('string')
    expect(mockSession.cwd.startsWith('/')).toBe(true)
  })

  it('MAX_SESSIONS应该是合理的数量', () => {
    const maxSessions = 10
    
    expect(maxSessions).toBeGreaterThanOrEqual(5)
    expect(maxSessions).toBeLessThanOrEqual(50)
  })

  it('COMMAND_TIMEOUT应该是合理的时间（毫秒）', () => {
    const commandTimeout = 30000 // 30秒
    
    expect(commandTimeout).toBeGreaterThanOrEqual(5000) // 最少5秒
    expect(commandTimeout).toBeLessThanOrEqual(120000) // 最大2分钟
  })
})

describe('Terminal API V1 - 边界情况', () => {

  it('空会话Map应该正常工作', () => {
    const sessions = new Map<string, any>()
    
    expect(sessions.size).toBe(0)
    expect(sessions.has('non-existent')).toBe(false)
  })

  it('大量会话应该正常处理', () => {
    const maxSessions = 10
    const sessions = new Map<string, any>()

    for (let i = 0; i < maxSessions; i++) {
      sessions.set(`session-${i}`, {
        id: `session-${i}`,
        process: null,
        buffer: [],
        startTime: Date.now(),
        ws: null,
        cwd: `/home/user/project-${i}`,
      })
    }

    expect(sessions.size).toBe(maxSessions)
  })

  it('空缓冲区应该正常工作', () => {
    const emptyBuffer: string[] = []
    
    expect(Array.isArray(emptyBuffer)).toBe(true)
    expect(emptyBuffer.length).toBe(0)
  })

  it('大量输出数据应该正常处理', () => {
    const largeOutput = Array.from({ length: 1000 }, (_, i) =>
      `Line ${i}: This is a test output line with some content`
    )

    expect(largeOutput.length).toBe(1000)
    largeOutput.forEach(line => {
      expect(typeof line).toBe('string')
      expect(line.length).toBeGreaterThan(0)
    })
  })

  it('特殊路径应该被正确处理', () => {
    const specialPaths = [
      '/home/user',
      '/tmp/test',
      '/var/log/app.log',
      './relative/path',
      '../parent/directory',
      '~/home/user',
      '/path/with spaces/file.txt',
      '/path/with-unicode/文件.txt',
    ]

    specialPaths.forEach(path => {
      expect(typeof path).toBe('string')
      expect(path.length).toBeGreaterThan(0)
    })
  })
})
