/**
 * @file Logger.comprehensive.test.ts
 * @description LoggerService 全面测试 - 日志级别、格式化、子日志器
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logger } from '../Logger'

describe('LoggerService - 基础功能', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  })

  it('应该存在logger实例', () => {
    expect(logger).toBeDefined()
    expect(logger.debug).toBeInstanceOf(Function)
    expect(logger.info).toBeInstanceOf(Function)
    expect(logger.warn).toBeInstanceOf(Function)
    expect(logger.error).toBeInstanceOf(Function)
  })
})

describe('LoggerService - debug级别', () => {
  
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleDebugSpy.mockRestore()
  })

  it('应该在开发环境输出debug日志', () => {
    logger.debug('Test debug message')
    
    // 在测试环境中（DEV=true），debug应该被调用
    if (import.meta.env?.DEV ?? process.env.NODE_ENV === 'development') {
      expect(consoleDebugSpy).toHaveBeenCalled()
      const callArgs = consoleDebugSpy.mock.calls[0][0] as string
      expect(callArgs).toContain('[DEBUG]')
      expect(callArgs).toContain('Test debug message')
    }
  })

  it('debug应该支持额外数据', () => {
    logger.debug('With data', { key: 'value' })
    
    if (import.meta.env?.DEV ?? process.env.NODE_ENV === 'development') {
      expect(consoleDebugSpy).toHaveBeenCalled()
      const dataArg = consoleDebugSpy.mock.calls[0][1]
      expect(dataArg).toEqual({ key: 'value' })
    }
  })

  it('debug应该支持source参数', () => {
    logger.debug('From source', undefined, 'TestModule')
    
    if (import.meta.env?.DEV ?? process.env.NODE_ENV === 'development') {
      const callArgs = consoleDebugSpy.mock.calls[0][0] as string
      expect(callArgs).toContain('[TestModule]')
    }
  })
})

describe('LoggerService - info级别', () => {
  
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleInfoSpy.mockRestore()
  })

  it('应该输出info日志', () => {
    logger.info('Test info message')
    
    if (import.meta.env?.DEV ?? process.env.NODE_ENV === 'development') {
      expect(consoleInfoSpy).toHaveBeenCalled()
      const callArgs = consoleInfoSpy.mock.calls[0][0] as string
      expect(callArgs).toContain('[INFO]')
      expect(callArgs).toContain('Test info message')
    }
  })

  it('info应该包含时间戳', () => {
    logger.info('Timestamp test')
    
    if (import.meta.env?.DEV ?? process.env.NODE_ENV === 'development') {
      const callArgs = consoleInfoSpy.mock.calls[0][0] as string
      // ISO格式时间戳示例: 2024-01-15T10:30:00.000Z
      expect(callArgs).toMatch(/\d{4}-\d{2}-\d{2}T/)
    }
  })
})

describe('LoggerService - warn级别', () => {
  
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
  })

  it('应该输出warn日志（无论环境）', () => {
    logger.warn('Warning message')
    
    expect(consoleWarnSpy).toHaveBeenCalled()
    const callArgs = consoleWarnSpy.mock.calls[0][0] as string
    expect(callArgs).toContain('[WARN]')
    expect(callArgs).toContain('Warning message')
  })

  it('warn应该支持数据对象', () => {
    logger.warn('With details', { code: 500, error: 'Internal' })
    
    expect(consoleWarnSpy).toHaveBeenCalled()
    const dataArg = consoleWarnSpy.mock.calls[0][1]
    expect(dataArg).toEqual({ code: 500, error: 'Internal' })
  })
})

describe('LoggerService - error级别', () => {
  
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('应该输出error日志（无论环境）', () => {
    logger.error('Error occurred')
    
    expect(consoleErrorSpy).toHaveBeenCalled()
    const callArgs = consoleErrorSpy.mock.calls[0][0] as string
    expect(callArgs).toContain('[ERROR]')
    expect(callArgs).toContain('Error occurred')
  })

  it('error应该接受Error对象', () => {
    const testError = new Error('Test error with stack')
    logger.error('Failed operation', testError)
    
    expect(consoleErrorSpy).toHaveBeenCalled()
    const errorArg = consoleErrorSpy.mock.calls[0][1]
    expect(errorArg).toBe(testError)
  })

  it('error应该接受非Error对象', () => {
    logger.error('String error', 'Some error string')
    
    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(consoleErrorSpy.mock.calls[0][1]).toBe('Some error string')
  })

  it('error应该支持source参数', () => {
    logger.error('Module error', new Error('test'), 'DatabaseService')
    
    const callArgs = consoleErrorSpy.mock.calls[0][0] as string
    expect(callArgs).toContain('[DatabaseService]')
  })
})

describe('LoggerService - createChild子日志器', () => {

  it('应该创建带有source前缀的子日志器', () => {
    const childLogger = logger.createChild('MyComponent')
    
    expect(childLogger.debug).toBeInstanceOf(Function)
    expect(childLogger.info).toBeInstanceOf(Function)
    expect(childLogger.warn).toBeInstanceOf(Function)
    expect(childLogger.error).toBeInstanceOf(Function)
  })

  it('子日志器的debug应该自动添加source', () => {
    const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    
    const childLogger = logger.createChild('AuthService')
    childLogger.debug('User logged in')
    
    if (import.meta.env?.DEV ?? process.env.NODE_ENV === 'development') {
      const callArgs = consoleDebugSpy.mock.calls[0][0] as string
      expect(callArgs).toContain('[AuthService]')
      expect(callArgs).toContain('User logged in')
    }
    
    consoleDebugSpy.mockRestore()
  })

  it('子日志器的error应该自动添加source', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const childLogger = logger.createChild('APIService')
    childLogger.error('Request failed', new Error('Timeout'))
    
    const callArgs = consoleErrorSpy.mock.calls[0][0] as string
    expect(callArgs).toContain('[APIService]')
    
    consoleErrorSpy.mockRestore()
  })

  it('多个子日志器应该独立工作', () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    
    const loggerA = logger.createChild('ModuleA')
    const loggerB = logger.createChild('ModuleB')
    
    loggerA.info('Message from A')
    loggerB.info('Message from B')
    
    if (import.meta.env?.DEV ?? process.env.NODE_ENV === 'development') {
      const call1 = consoleInfoSpy.mock.calls[0][0] as string
      const call2 = consoleInfoSpy.mock.calls[1][0] as string
      
      expect(call1).toContain('[ModuleA]')
      expect(call2).toContain('[ModuleB]')
    }
    
    consoleInfoSpy.mockRestore()
  })
})

describe('LoggerService - 日志格式验证', () => {

  it('所有级别的日志都应该包含YYC3前缀', () => {
    const spies = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }

    logger.debug('debug test')
    logger.info('info test')
    logger.warn('warn test')
    logger.error('error test')

    // 检查每个调用都包含YYC3前缀
    Object.values(spies).forEach(spy => {
      if (spy.mock.calls.length > 0) {
        const msg = spy.mock.calls[0][0] as string
        expect(msg).toContain('[YYC3]')
      }
    })

    Object.values(spies).forEach(spy => spy.mockRestore())
  })

  it('日志消息应该包含ISO格式的时间戳', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    logger.warn('timestamp check')

    const msg = consoleWarnSpy.mock.calls[0][0] as string
    // 验证ISO 8601格式: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(msg).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)

    consoleWarnSpy.mockRestore()
  })
})

describe('LoggerService - 边界情况', () => {

  it('应该处理空字符串消息', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    logger.warn('')
    
    expect(consoleWarnSpy).toHaveBeenCalled()

    consoleWarnSpy.mockRestore()
  })

  it('应该处理特殊字符消息', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    logger.warn('Special chars: <>&"\'/\\n\\t')
    
    expect(consoleWarnSpy).toHaveBeenCalled()

    consoleWarnSpy.mockRestore()
  })

  it('应该处理超长消息', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const longMsg = 'x'.repeat(10000)
    logger.warn(longMsg)
    
    expect(consoleWarnSpy).toHaveBeenCalled()

    consoleWarnSpy.mockRestore()
  })

  it('应该处理undefined和null数据', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    logger.warn('undefined data', undefined)
    logger.warn('null data', null)
    
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2)

    consoleWarnSpy.mockRestore()
  })
})
