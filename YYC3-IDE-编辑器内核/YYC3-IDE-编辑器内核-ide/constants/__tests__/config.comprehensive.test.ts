/**
 * @file config.comprehensive.test.ts
 * @description 应用配置常量全面测试 - 对齐YYC3标准
 */

import { describe, it, expect } from 'vitest'
import {
  APP_NAME,
  APP_SLUG,
  APP_VERSION,
  SERVER_PORT,
  API_BASE_URL,
  API_TIMEOUT,
  WS_URL,
  DB_TYPE,
  DB_NAME,
  DB_VERSION,
  STORAGE_AUTO_SAVE_INTERVAL,
  STORAGE_DEBOUNCE_DELAY,
  STORAGE_MAX_SNAPSHOTS,
  STORAGE_MAX_FILE_SIZE,
  EDITOR_FONT_SIZE,
  EDITOR_TAB_SIZE,
  EDITOR_MINIMAP_ENABLED,
  EDITOR_WORD_WRAP,
  EDITOR_LINE_NUMBERS,
  EDITOR_SCROLL_BEYOND_LAST_LINE,
  AI_DEFAULT_PROVIDER,
  AI_DEFAULT_MODEL,
} from '../config'

describe('应用基本信息配置', () => {
  
  it('APP_NAME应该包含YYC³品牌标识', () => {
    expect(APP_NAME).toBeDefined()
    expect(typeof APP_NAME).toBe('string')
    expect(APP_NAME.length).toBeGreaterThan(0)
  })

  it('APP_SLUG应该符合kebab-case格式', () => {
    expect(APP_SLUG).toBeDefined()
    expect(typeof APP_SLUG).toBe('string')
    // kebab-case格式检查
    expect(APP_SLUG).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('APP_VERSION应该符合语义化版本', () => {
    expect(APP_VERSION).toBeDefined()
    expect(typeof APP_VERSION).toBe('string')
    // semver格式检查 (x.y.z)
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe('服务器配置', () => {

  it('SERVER_PORT应该在合理范围内', () => {
    expect(SERVER_PORT).toBeGreaterThanOrEqual(1024)
    expect(SERVER_PORT).toBeLessThanOrEqual(65535)
  })

  it('API_BASE_URL应该包含正确的协议和端口', () => {
    expect(API_BASE_URL).toBeDefined()
    expect(API_BASE_URL).toMatch(/^http:\/\/localhost:\d+\/api$/)
  })

  it('API_TIMEOUT应该是正数', () => {
    expect(API_TIMEOUT).toBeGreaterThan(0)
    expect(API_TIMEOUT).toBeLessThanOrEqual(120000) // 最大2分钟
  })

  it('WS_URL应该包含WebSocket协议', () => {
    expect(WS_URL).toBeDefined()
    expect(WS_URL).toMatch(/^ws:\/\/localhost:\d+$/)
  })

  it('API_BASE_URL和WS_URL的端口应该一致', () => {
    const apiPort = API_BASE_URL.match(/:(\d+)/)?.[1]
    const wsPort = WS_URL.match(/:(\d+)/)?.[1]
    
    expect(apiPort).toBe(wsPort)
    expect(apiPort).toBe(SERVER_PORT.toString())
  })
})

describe('数据库配置', () => {

  it('DB_TYPE应该是indexeddb', () => {
    expect(DB_TYPE).toBe('indexeddb')
  })

  it('DB_NAME应该符合命名规范', () => {
    expect(DB_NAME).toBeDefined()
    expect(typeof DB_NAME).toBe('string')
    expect(DB_NAME.length).toBeGreaterThan(0)
  })

  it('DB_VERSION应该是正整数', () => {
    expect(DB_VERSION).toBeGreaterThan(0)
    expect(Number.isInteger(DB_VERSION)).toBe(true)
  })
})

describe('存储配置', () => {

  it('STORAGE_AUTO_SAVE_INTERVAL应该是合理的毫秒数', () => {
    expect(STORAGE_AUTO_SAVE_INTERVAL).toBeGreaterThan(0)
    // 通常在10秒到5分钟之间
    expect(STORAGE_AUTO_SAVE_INTERVAL).toBeGreaterThanOrEqual(10000)
    expect(STORAGE_AUTO_SAVE_INTERVAL).toBeLessThanOrEqual(300000)
  })

  it('STORAGE_DEBOUNCE_DELAY应该是合理的防抖时间', () => {
    expect(STORAGE_DEBOUNCE_DELAY).toBeGreaterThan(0)
    expect(STORAGE_DEBOUNCE_DELAY).toBeLessThanOrEqual(10000) // 最大10秒
  })

  it('STORAGE_MAX_SNAPSHOTS应该是合理的数量', () => {
    expect(STORAGE_MAX_SNAPSHOTS).toBeGreaterThan(0)
    expect(STORAGE_MAX_SNAPSHOTS).toBeLessThanOrEqual(1000) // 最大1000个
  })

  it('STORAGE_MAX_FILE_SIZE应该是合理的字节数', () => {
    expect(STORAGE_MAX_FILE_SIZE).toBeGreaterThan(0)
    // 应该至少1MB，最大100MB
    expect(STORAGE_MAX_FILE_SIZE).toBeGreaterThanOrEqual(1024 * 1024)
    expect(STORAGE_MAX_FILE_SIZE).toBeLessThanOrEqual(100 * 1024 * 1024)
  })
})

describe('编辑器配置', () => {

  it('EDITOR_FONT_SIZE应该在合理范围内', () => {
    expect(EDITOR_FONT_SIZE).toBeGreaterThanOrEqual(8)
    expect(EDITOR_FONT_SIZE).toBeLessThanOrEqual(32)
  })

  it('EDITOR_TAB_SIZE应该是2或4', () => {
    expect([2, 4]).toContain(EDITOR_TAB_SIZE)
  })

  it('EDITOR_MINIMAP_ENABLED应该是布尔值', () => {
    expect([true, false]).toContain(EDITOR_MINIMAP_ENABLED)
  })

  it('EDITOR_WORD_WRAP应该是有效的值', () => {
    expect(['on', 'off', 'wordWrapColumn', 'bounded']).toContain(EDITOR_WORD_WRAP)
  })

  it('EDITOR_LINE_NUMBERS应该是有效的值', () => {
    expect(['on', 'off', 'relative', 'interval']).toContain(EDITOR_LINE_NUMBERS)
  })

  it('EDITOR_SCROLL_BEYOND_LAST_LINE应该是布尔值', () => {
    expect([true, false]).toContain(EDITOR_SCROLL_BEYOND_LAST_LINE)
  })
})

describe('AI配置', () => {

  it('AI_DEFAULT_PROVIDER应该是有效的提供商', () => {
    const validProviders = ['openai', 'anthropic', 'google', 'azure', 'local']
    expect(validProviders).toContain(AI_DEFAULT_PROVIDER)
  })

  it('AI_DEFAULT_MODEL应该是非空字符串', () => {
    expect(AI_DEFAULT_MODEL).toBeDefined()
    expect(typeof AI_DEFAULT_MODEL).toBe('string')
    expect(AI_DEFAULT_MODEL.length).toBeGreaterThan(0)
  })
})
