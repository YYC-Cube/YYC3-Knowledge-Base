/**
 * @file: terminal-api.ts
 * @description: 真实终端命令执行 API 中间件
 *              通过 Vite Dev Server 代理执行真实 shell 命令
 *              支持 HTTP REST API 和 WebSocket 实时通信
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.1.0
 * @created: 2026-04-04
 * @updated: 2026-04-05
 * @license: MIT
 */

import { spawn, type ChildProcess } from 'child_process'
import type { Plugin, ViteDevServer } from 'vite'
import { WebSocketServer, WebSocket } from 'ws'
import { logger } from "../services/Logger";

interface TerminalSession {
  id: string
  process: ChildProcess | null
  buffer: string[]
  startTime: number
  ws: WebSocket | null
  cwd: string
}

const terminalSessions = new Map<string, TerminalSession>()
const MAX_SESSIONS = 10
const COMMAND_TIMEOUT = 30000 // 30秒超时

// 安全命令白名单（允许执行的命令）
const SAFE_COMMANDS = new Set([
  // Node.js/NPM
  'node', 'npm', 'npx', 'yarn', 'pnpm',
  // Git
  'git',
  // Python
  'python', 'python3', 'pip', 'pip3',
  // Ollama
  'ollama',
  // 文件操作
  'ls', 'pwd', 'cd', 'cat', 'echo', 'mkdir', 'touch', 'cp', 'mv', 'rm', 'find', 'grep', 'head', 'tail', 'wc', 'chmod', 'chown',
  // 网络工具
  'curl', 'wget', 'ping', 'nslookup', 'dig',
  // 开发工具
  'tsc', 'vite', 'next', 'webpack', 'eslint', 'prettier',
  // Docker
  'docker', 'docker-compose',
  // 系统
  'which', 'whereis', 'type', 'env', 'export', 'unset', 'alias', 'unalias',
  // 其他
  'clear', 'exit', 'history', 'date', 'whoami', 'uname', 'hostname', 'top', 'ps', 'kill', 'jobs', 'bg', 'fg',
])

// 危险命令黑名单（禁止执行）
const DANGEROUS_COMMANDS = [
  'rm -rf /', 'rm -rf /*', 'mkfs', 'dd if=', ':(){:|:&};:', 'fork bomb',
  'chmod 777 /', 'chown', 'shutdown', 'reboot', 'halt', 'init 0', 'init 6',
  '> /dev/sda', ':() { :|:& };:', 'crontab', 'iptables', 'ufw',
]

function isCommandSafe(cmd: string): { safe: boolean; reason?: string } {
  const trimmed = cmd.trim()

  // 检查危险命令
  for (const dangerous of DANGEROUS_COMMANDS) {
    if (trimmed.includes(dangerous)) {
      return { safe: false, reason: `安全限制: 命令包含危险操作 "${dangerous}"` }
    }
  }

  // 获取主命令
  const mainCommand = trimmed.split(/\s+/)[0]?.toLowerCase() || ''

  // 检查是否为已知安全命令或允许的任意命令
  if (!SAFE_COMMANDS.has(mainCommand)) {
    // 允许以 ./ 或 ../ 开头的脚本
    if (mainCommand.startsWith('./') || mainCommand.startsWith('../')) {
      return { safe: true }
    }
    // 允许 npm run / yarn / pnpm 等包管理器命令
    if (['npm', 'yarn', 'pnpm'].includes(mainCommand)) {
      return { safe: true }
    }
    return { safe: false, reason: `未知命令: ${mainCommand}，出于安全考虑仅允许常用开发命令` }
  }

  return { safe: true }
}

function generateSessionId(): string {
  return `term_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// JSON 响应辅助函数
function jsonResponse(res: any, statusCode: number, data: any) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

export function createTerminalAPI(): Plugin {
  let server: ViteDevServer | null = null
  let wss: WebSocketServer | null = null
  let upgradeHandler: ((request: any, socket: any, head: any) => void) | null = null

  return {
    name: 'yyc3-terminal-api',
    configureServer(viteServer) {
      server = viteServer

      // 创建 WebSocket 服务器
      wss = new WebSocketServer({ noServer: true })

      // 处理 WebSocket 升级请求
      upgradeHandler = (request: any, socket: any, head: any) => {
        try {
          const url = new URL(request.url || '', `http://${request.headers.host}`)

          if (url.pathname === '/api/terminal/ws') {
            logger.info('收到 WebSocket 升级请求: ${url.pathname}');
            wss!.handleUpgrade(request, socket, head, (ws) => {
              wss!.emit('connection', ws, request)
            })
          }
        } catch (err) {
          logger.error('[Terminal API] WebSocket 升级处理错误:', err);
        }
      }

      // 设置 WebSocket 连接处理
      wss.on('connection', (ws, request) => {
        const url = new URL(request.url || '', `http://${request.headers.host}`)
        const sessionId = url.searchParams.get('sid') || generateSessionId()

        logger.info('WebSocket 连接成功: ${sessionId}');

        // 创建或获取会话
        let session = terminalSessions.get(sessionId)
        if (!session) {
          session = {
            id: sessionId,
            process: null,
            buffer: [],
            startTime: Date.now(),
            ws,
            cwd: process.cwd(),
          }
          terminalSessions.set(sessionId, session)
        } else {
          session.ws = ws
        }

        // 发送连接成功消息
        ws.send(JSON.stringify({ type: 'connected', sessionId }))

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString())

            if (message.type === 'exec') {
              handleWebSocketExec(ws, session!, message.command, message.cwd)
            } else if (message.type === 'resize') {
              logger.info('终端尺寸变更: ${message.cols}x${message.rows}');
            } else if (message.type === 'input') {
              if (session?.process && session.process.stdin?.writable) {
                session.process.stdin.write(message.data)
              }
            }
          } catch (err) {
            logger.error('[Terminal API] WebSocket 消息解析错误:', err);
          }
        })

        ws.on('close', () => {
          logger.info('WebSocket 断开: ${sessionId}');
          if (session) {
            session.ws = null
          }
        })

        ws.on('error', (error) => {
          logger.error(`[Terminal API] WebSocket 错误 [${sessionId}]:`, error.message);
        })
      })

      // 创建新会话
      viteServer.middlewares.use('/api/terminal/create', (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'text/plain' })
          res.end('Method Not Allowed')
          return
        }

        // 清理过期会话
        cleanupExpiredSessions()

        // 检查会话数量限制
        if (terminalSessions.size >= MAX_SESSIONS) {
          jsonResponse(res, 429, { error: '达到最大会话数限制' })
          return
        }

        const sessionId = generateSessionId()
        terminalSessions.set(sessionId, {
          id: sessionId,
          process: null,
          buffer: [],
          startTime: Date.now(),
          ws: null,
          cwd: process.cwd(),
        })

        logger.info('会话创建: ${sessionId}');

        jsonResponse(res, 200, { sessionId })
      })

      // 执行命令
      viteServer.middlewares.use('/api/terminal/exec', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'text/plain' })
          res.end('Method Not Allowed')
          return
        }

        let body = ''
        req.on('data', chunk => { body += chunk })

        req.on('end', () => {
          try {
            const { sessionId, command, cwd } = JSON.parse(body)

            // 验证会话
            const session = terminalSessions.get(sessionId)
            if (!session) {
              jsonResponse(res, 404, { error: '会话不存在' })
              return
            }

            // 安全检查
            const safetyCheck = isCommandSafe(command)
            if (!safetyCheck.safe) {
              jsonResponse(res, 403, {
                error: safetyCheck.reason || '命令被安全策略阻止',
                output: '',
                exitCode: 1
              })
              return
            }

            // 终止之前的进程
            if (session.process && !session.process.killed) {
              session.process.kill('SIGTERM')
            }

            logger.info('执行命令 [${sessionId}]: ${command}');

            // 解析命令和参数
            const parts = command.trim().split(/\s+/)
            const cmd = parts[0]
            const args = parts.slice(1)

            // 特殊处理 cd 命令
            if (cmd === 'cd') {
              const targetDir = args[0] || process.env.HOME || '/'
              try {
                process.chdir(targetDir)
                jsonResponse(res, 200, {
                  output: ``,
                  exitCode: 0,
                  cwd: process.cwd()
                })
              } catch (err) {
                jsonResponse(res, 200, {
                  output: `cd: ${targetDir}: No such file or directory`,
                  exitCode: 1,
                  cwd: process.cwd()
                })
              }
              return
            }

            // 特殊处理 clear 命令
            if (cmd === 'clear') {
              session.buffer = []
              jsonResponse(res, 200, {
                output: '__CLEAR__',
                exitCode: 0,
                special: 'clear'
              })
              return
            }

            // 执行命令
            const proc = spawn(cmd, args, {
              cwd: cwd || process.cwd(),
              env: { ...process.env },
              stdio: ['pipe', 'pipe', 'pipe'],
              detached: false,
              shell: true, // 使用 shell 以支持管道、重定向等
            })

            session.process = proc
            let stdout = ''
            let stderr = ''

            // 设置超时
            const timeoutId = setTimeout(() => {
              if (!proc.killed) {
                proc.kill('SIGKILL')
                logger.info('命令超时终止: ${command}');
              }
            }, COMMAND_TIMEOUT)

            proc.stdout?.on('data', (data: Buffer) => {
              stdout += data.toString()
              // 实时输出到缓冲区
              session.buffer.push(data.toString())
            })

            proc.stderr?.on('data', (data: Buffer) => {
              stderr += data.toString()
              session.buffer.push(`[ERROR] ${data.toString()}`)
            })

            proc.on('close', (code) => {
              clearTimeout(timeoutId)

              const output = stderr ? `${stdout}\n${stderr}` : stdout

              logger.info('命令完成 [${sessionId}]: ${command} (exit code: ${code})');

              jsonResponse(res, 200, {
                output: output || `(无输出)`,
                exitCode: code || 0,
                cwd: process.cwd()
              })
            })

            proc.on('error', (err) => {
              clearTimeout(timeoutId)
              logger.error(`[Terminal API] 命令错误 [${sessionId}]:`, err.message);

              jsonResponse(res, 200, {
                output: `错误: ${err.message}`,
                exitCode: 1,
                cwd: process.cwd()
              })
            })

          } catch (err) {
            logger.error('[Terminal API] 解析请求失败:', err);
            jsonResponse(res, 400, { error: '无效的请求格式' })
          }
        })
      })

      // 终止会话
      viteServer.middlewares.use('/api/terminal/kill', (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'text/plain' })
          res.end('Method Not Allowed')
          return
        }

        let body = ''
        req.on('data', chunk => { body += chunk })

        req.on('end', () => {
          try {
            const { sessionId } = JSON.parse(body)
            const session = terminalSessions.get(sessionId)

            if (session?.process && !session.process.killed) {
              session.process.kill('SIGTERM')
            }

            terminalSessions.delete(sessionId)

            logger.info('会话终止: ${sessionId}');

            jsonResponse(res, 200, { success: true })
          } catch (err) {
            jsonResponse(res, 400, { error: '无效的请求格式' })
          }
        })
      })

      // 获取会话状态
      viteServer.middlewares.use('/api/terminal/status', (req, res) => {
        if (req.method !== 'GET') {
          res.writeHead(405, { 'Content-Type': 'text/plain' })
          res.end('Method Not Allowed')
          return
        }

        const sessions = Array.from(terminalSessions.entries()).map(([id, sess]) => ({
          id,
          active: sess.process !== null && !sess.process?.killed,
          uptime: Date.now() - sess.startTime,
          bufferSize: sess.buffer.length,
        }))

        jsonResponse(res, 200, { sessions, count: sessions.length })
      })

      // WebSocket 命令执行处理
      function handleWebSocketExec(
        ws: WebSocket,
        session: TerminalSession,
        command: string,
        cwd?: string
      ) {
        const safetyCheck = isCommandSafe(command)
        if (!safetyCheck.safe) {
          ws.send(JSON.stringify({
            type: 'error',
            message: safetyCheck.reason || '命令被安全策略阻止',
          }))
          return
        }

        // 终止之前的进程
        if (session.process && !session.process.killed) {
          session.process.kill('SIGTERM')
        }

        logger.info('WebSocket 执行: ${command}');

        const parts = command.trim().split(/\s+/)
        const cmd = parts[0]
        const args = parts.slice(1)

        // 特殊处理 cd 命令
        if (cmd === 'cd') {
          const targetDir = args[0] || process.env.HOME || '/'
          try {
            process.chdir(targetDir)
            session.cwd = process.cwd()
            ws.send(JSON.stringify({
              type: 'output',
              data: '',
              cwd: session.cwd,
            }))
            ws.send(JSON.stringify({ type: 'exit', code: 0 }))
          } catch (err) {
            ws.send(JSON.stringify({
              type: 'output',
              data: `cd: ${targetDir}: No such file or directory\n`,
            }))
            ws.send(JSON.stringify({ type: 'exit', code: 1 }))
          }
          return
        }

        // 特殊处理 clear 命令
        if (cmd === 'clear') {
          ws.send(JSON.stringify({ type: 'clear' }))
          ws.send(JSON.stringify({ type: 'exit', code: 0 }))
          return
        }

        // 执行命令
        const proc = spawn(cmd, args, {
          cwd: cwd || session.cwd || process.cwd(),
          env: { ...process.env },
          stdio: ['pipe', 'pipe', 'pipe'],
          detached: false,
          shell: true,
        })

        session.process = proc

        proc.stdout?.on('data', (data: Buffer) => {
          ws.send(JSON.stringify({
            type: 'output',
            data: data.toString(),
          }))
        })

        proc.stderr?.on('data', (data: Buffer) => {
          ws.send(JSON.stringify({
            type: 'output',
            data: `\x1b[31m${data.toString()}\x1b[0m`,
          }))
        })

        proc.on('close', (code) => {
          ws.send(JSON.stringify({ type: 'exit', code: code || 0 }))
          if (session.process === proc) {
            session.process = null
          }
        })

        proc.on('error', (err) => {
          ws.send(JSON.stringify({
            type: 'error',
            message: `错误: ${err.message}`,
          }))
        })
      }

      // 返回 post hook，在 Vite 内部中间件之后执行
      return () => {
        // 在 post hook 中注册 WebSocket 升级处理器
        if (viteServer.httpServer && upgradeHandler) {
          viteServer.httpServer.on('upgrade', upgradeHandler)
          logger.info('WebSocket 升级处理器已注册');
        }
      }
    },
  }
}

function cleanupExpiredSessions() {
  const now = Date.now()
  const MAX_AGE = 3600000 // 1小时过期

  for (const [id, session] of terminalSessions.entries()) {
    if (now - session.startTime > MAX_AGE) {
      if (session.process && !session.process.killed) {
        session.process.kill('SIGTERM')
      }
      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.close(1000, 'Session expired')
      }
      terminalSessions.delete(id)
      logger.info('清理过期会话: ${id}');
    }
  }
}
