/**
 * @file: terminal-api-v2.ts
 * @description: YYC³ 终端服务 V2.0 - 专业版
 *              支持 WebSocket 实时通信 + node-PTY + 安全沙箱
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-04-04
 * @updated: 2026-04-09
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: terminal,api,websocket,pty,plugin
 */

import { spawn, type ChildProcess } from 'child_process'
import { createServer as createHttpServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import type { Plugin, ViteDevServer } from 'vite'
import { logger } from "../services/Logger";

// 尝试导入 node-pty (可选依赖)
let pty: any = null
async function loadPty() {
  try {
    // @ts-expect-error node-pty 是可选依赖
    pty = await import('node-pty')
    logger.info('✓ node-pty 已加载');
  } catch {
    logger.warn('⚠ node-pty 未安装，将使用兼容模式 (spawn)');
  }
}
loadPty()

interface PTYSession {
  id: string
  process: ChildProcess | any // any for pty.IPty 类型
  socket: WebSocket | null
  createdAt: number
  lastActivity: number
  cols: number
  rows: number
  cwd: string
  usePTY: boolean // 是否使用真实 PTY
}

const sessions = new Map<string, PTYSession>()
const wss = new WebSocketServer({ noServer: true })
const MAX_SESSIONS = 15
const SESSION_TIMEOUT = 3600000 // 1小时

// 安全配置
const SAFE_COMMANDS = new Set([
  'node', 'npm', 'npx', 'yarn', 'pnpm', 'bun',
  'git', 'svn', 'hg',
  'python', 'python3', 'pip', 'pip3', 'conda',
  'ollama',
  'docker', 'docker-compose', 'kubectl',
  'ls', 'pwd', 'cd', 'cat', 'echo', 'mkdir', 'touch', 'cp', 'mv', 'rm',
  'find', 'grep', 'head', 'tail', 'wc', 'sort', 'uniq', 'tee', 'xargs',
  'curl', 'wget', 'ssh', 'scp', 'rsync', 'nc', 'telnet',
  'tsc', 'vite', 'next', 'webpack', 'esbuild', 'rollup',
  'eslint', 'prettier', 'biome', 'stylelint',
  'make', 'cmake', 'cargo', 'go', 'rustc', 'java', 'javac',
  'which', 'whereis', 'type', 'env', 'export', 'unset', 'alias', 'unalias',
  'clear', 'reset', 'history', 'date', 'whoami', 'uname', 'hostname',
  'top', 'htop', 'ps', 'kill', 'jobs', 'bg', 'fg', 'nohup',
  'vim', 'nano', 'code', 'less', 'more', 'man', 'info',
  'tar', 'gzip', 'gunzip', 'zip', 'unzip', 'bzip2', 'xz',
  'chmod', 'chown', 'chgrp', 'ln', 'df', 'du', 'free',
  'jq', 'yq', 'xmlstarlet', 'sed', 'awk', 'tr', 'cut',
])

const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+[\/\\]/,
  /rm\s+-rf\s+\*/,
  /mkfs\./,
  /dd\s+if=/,
  />\s*\/dev\/sd[a-z]/,
  /:\(\)\s*\{/,
  /shutdown|reboot|halt|init\s+[06]/,
  /chmod\s+777\s+[\/\\]/,
  /crontab|iptables|ufw|firewall-cmd/,
]

function isCommandSafe(input: string): boolean {
  const trimmed = input.trim()

  if (DANGEROUS_PATTERNS.some(pattern => pattern.test(trimmed))) {
    return false
  }

  return true
}

function generateId(): string {
  return `pty_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// JSON 响应辅助
function json(res: any, status: number, data: object) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

export function createTerminalAPIv2(): Plugin {
  let viteServer: ViteDevServer | null = null

  // WebSocket 连接处理
  wss.on('connection', (ws: WebSocket, req: any) => {
    const url = new URL(req.url || '', 'http://localhost')
    const sessionId = url.searchParams.get('sid')

    if (!sessionId) {
      ws.close(4000, 'Missing session ID')
      return
    }

    let session = sessions.get(sessionId)

    if (!session) {
      // 创建新会话
      session = createNewSession(sessionId)
      sessions.set(sessionId, session)
      logger.info('新 WS 会话: ${sessionId}');
    }

    session.socket = ws
    session.lastActivity = Date.now()

    logger.info('WS 已连接: ${sessionId} (PTY: ${session.usePTY})');

    // 发送初始化消息
    ws.send(JSON.stringify({
      type: 'ready',
      sessionId,
      usePTY: session.usePTY,
      pid: session.process.pid || undefined,
    }))

    // 接收客户端数据 → 发送到 PTY/进程
    ws.on('message', (data: Buffer) => {
      try {
        const message = data.toString()

        // 尝试解析为 JSON (resize 等控制命令)
        try {
          const parsed = JSON.parse(message)

          if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
            handleResize(session!, parsed.cols, parsed.rows)
            return
          }

          if (parsed.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
            return
          }
        } catch {
          // 不是 JSON，作为普通输入处理
        }

        // 安全检查
        if (!isCommandSafe(message)) {
          ws.send(`\r\n⚠️  [安全限制] 命令被阻止: ${message}\r\n`)
          return
        }

        // 转发到进程
        if (session!.usePTY && session!.process.write) {
          session!.process.write(message)
        } else if (session!.process.stdin) {
          session!.process.stdin.write(message)
        }

        session!.lastActivity = Date.now()

      } catch (error) {
        logger.error('[Terminal API v2] 处理消息错误:', error);
      }
    })

    // WebSocket 关闭
    ws.on('close', () => {
      logger.info('WS 断开: ${sessionId}');

      if (session) {
        session.socket = null

        // 延迟清理（允许重连）
        setTimeout(() => {
          if (!session?.socket && sessions.has(sessionId)) {
            cleanupSession(sessionId)
          }
        }, 30000) // 30秒后清理无连接的会话
      }
    })

    ws.on('error', (error: Error) => {
      logger.error('[Terminal API v2] WebSocket 错误:', error.message);
    })
  })

  // 创建新的 PTY 会话
  function createNewSession(id: string): PTYSession {
    const usePTY = !!pty // 如果 node-pty 可用则使用

    let process: ChildProcess | any
    const cwd = process.cwd() || '/tmp'

    if (usePTY) {
      // 使用真实的伪终端
      process = pty.spawn(process.env.SHELL || '/bin/zsh', [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          LANG: 'en_US.UTF-8',
          LC_ALL: 'en_US.UTF-8',
        },
      })

      // PTY 输出 → WebSocket
      process.onData((data: string) => {
        if (sessions.get(id)?.socket?.readyState === WebSocket.OPEN) {
          sessions.get(id)?.socket?.send(data)
        }
      })

      process.onExit(({ exitCode }: { exitCode: number }) => {
        logger.info('PTY 退出 (${id}): code=${exitCode}');
        if (sessions.get(id)?.socket?.readyState === WebSocket.OPEN) {
          sessions.get(id)?.socket?.send(JSON.stringify({
            type: 'exit',
            exitCode,
            message: `\r\n[进程已退出，退出码: ${exitCode}]\r\n`,
          }))
        }
      })

    } else {
      // 兼容模式：使用 child_process.spawn
      process = spawn(process.env.SHELL || '/bin/bash', ['--login'], {
        cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          FORCE_COLOR: '1',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
        shell: false,
      })

      // stdout → WebSocket
      process.stdout?.on('data', (data: Buffer) => {
        if (sessions.get(id)?.socket?.readyState === WebSocket.OPEN) {
          sessions.get(id)?.socket?.send(data.toString())
        }
      })

      // stderr → WebSocket
      process.stderr?.on('data', (data: Buffer) => {
        if (sessions.get(id)?.socket?.readyState === WebSocket.OPEN) {
          sessions.get(id)?.socket?.send(data.toString())
        }
      })

      // 进程退出
      process.on('close', (code: number | null) => {
        logger.info('进程退出 (${id}): code=${code}');
        if (sessions.get(id)?.socket?.readyState === WebSocket.OPEN) {
          sessions.get(id)?.socket?.send(JSON.stringify({
            type: 'exit',
            exitCode: code,
            message: `[进程已退出，退出码: ${code}]\n`,
          }))
        }
      })

      // 初始提示符
      setTimeout(() => {
        if (sessions.get(id)?.socket?.readyState === WebSocket.OPEN) {
          sessions.get(id)?.socket?.send('\r\n✓ 终端就绪 (兼容模式)\r\n$ ')
        }
      }, 100)
    }

    return {
      id,
      process,
      socket: null,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      cols: 80,
      rows: 24,
      cwd,
      usePTY,
    }
  }

  // 处理终端尺寸调整
  function handleResize(session: PTYSession, cols: number, rows: number) {
    session.cols = cols
    session.rows = rows

    if (session.usePTY && session.process.resize) {
      try {
        session.process.resize(cols, rows)
        logger.info('尺寸调整: ${cols}x${rows}');
      } catch (e) {
        logger.warn('[Terminal API v2] PTY resize 失败:', e);
      }
    }
    // 兼容模式无法动态调整
  }

  // 清理会话
  function cleanupSession(id: string) {
    const session = sessions.get(id)
    if (!session) return

    logger.info('清理会话: ${id}');

    try {
      if (session.usePTY) {
        session.process.kill()
      } else {
        session.process.kill('SIGTERM')
      }
    } catch (e) {
      // 忽略已终止的进程错误
    }

    if (session.socket && session.socket.readyState === WebSocket.OPEN) {
      session.socket.close(4001, 'Session cleaned up')
    }

    sessions.delete(id)
  }

  // 定期清理过期会话
  setInterval(() => {
    const now = Date.now()
    for (const [id, session] of sessions.entries()) {
      if (now - session.lastActivity > SESSION_TIMEOUT) {
        cleanupSession(id)
      }
    }
  }, 60000) // 每分钟检查一次

  function cleanupExpiredSessions() {
    const now = Date.now()
    for (const [id, session] of sessions.entries()) {
      if (now - session.createdAt > SESSION_TIMEOUT) {
        cleanupSession(id)
      }
    }
  }

  return {
    name: 'yyc3-terminal-api-v2',
    configureServer(server: ViteDevServer) {
      viteServer = server

      // HTTP 升级为 WebSocket
      server.httpServer?.on('upgrade', (req, socket, head) => {
        const url = new URL(req.url || '', 'http://localhost')

        if (url.pathname === '/api/terminal/ws') {
          wss.handleUpgrade(req, socket as any, head, (ws: any) => {
            wss.emit('connection', ws, req)
          })
        }
      })

      // RESTful API: 创建会话
      server.middlewares.use('/api/terminal/create', (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'text/plain' })
          res.end('Method Not Allowed')
          return
        }

        cleanupExpiredSessions()

        if (sessions.size >= MAX_SESSIONS) {
          json(res, 429, { error: '达到最大会话数限制' })
          return
        }

        const id = generateId()
        const session = createNewSession(id)
        sessions.set(id, session)

        logger.info('会话创建: ${id} (PTY: ${session.usePTY})');

        json(res, 201, {
          sessionId: id,
          usePTY: session.usePTY,
          pid: session.process.pid,
        })
      })

      // RESTful API: 执行单条命令（兼容模式）
      server.middlewares.use('/api/terminal/exec', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'text/plain' })
          res.end('Method Not Allowed')
          return
        }

        let body = ''
        req.on('data', chunk => { body += chunk })

        req.on('end', () => {
          try {
            const { command, cwd } = JSON.parse(body)

            if (!command || !isCommandSafe(command)) {
              json(res, 403, { error: '命令被安全策略阻止' })
              return
            }

            logger.info('执行命令: ${command}');

            const proc = spawn(command.split(/\s+/)[0], command.split(/\s+/).slice(1), {
              cwd: cwd || process.cwd(),
              env: { ...process.env, FORCE_COLOR: '1' },
              stdio: ['pipe', 'pipe', 'pipe'],
              shell: true,
              timeout: 30000,
            })

            let stdout = ''
            let stderr = ''

            proc.stdout?.on('data', (d: Buffer) => stdout += d.toString())
            proc.stderr?.on('data', (d: Buffer) => stderr += d.toString())

            proc.on('close', (code) => {
              json(res, 200, {
                output: stderr ? `${stdout}\n${stderr}` : stdout,
                exitCode: code || 0,
              })
            })

            proc.on('error', (err) => {
              json(res, 200, {
                output: err.message,
                exitCode: 1,
              })
            })

          } catch (e) {
            json(res, 400, { error: '无效请求格式' })
          }
        })
      })

      // RESTful API: 终止会话
      server.middlewares.use('/api/terminal/kill', (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405)
          res.end('Method Not Allowed')
          return
        }

        let body = ''
        req.on('data', chunk => { body += chunk })

        req.on('end', () => {
          try {
            const { sessionId } = JSON.parse(body)
            cleanupSession(sessionId)
            json(res, 200, { success: true })
          } catch {
            json(res, 400, { error: '无效请求格式' })
          }
        })
      })

      // RESTful API: 会话状态
      server.middlewares.use('/api/terminal/status', (req, res) => {
        if (req.method !== 'GET') {
          res.writeHead(405)
          res.end('Method Not Allowed')
          return
        }

        const activeSessions = Array.from(sessions.values()).map(s => ({
          id: s.id,
          connected: s.socket?.readyState === WebSocket.OPEN,
          usePTY: s.usePTY,
          uptime: Date.now() - s.createdAt,
          size: `${s.cols}x${s.rows}`,
          pid: s.process.pid,
        }))

        json(res, 200, {
          sessions: activeSessions,
          count: activeSessions.length,
          hasPTYSupport: !!pty,
        })
      })
    },
  }
}
