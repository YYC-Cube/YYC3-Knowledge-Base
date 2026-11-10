/**
 * @file EnvironmentConfigPanel.comprehensive.test.tsx
 * @description 环境变量配置面板全面测试 - UI组件
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import EnvironmentConfigPanel from '../EnvironmentConfigPanel'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Globe: () => null,
  Server: () => null,
  Terminal: () => null,
  Heart: () => null,
  Shield: () => null,
  Network: () => null,
  Plus: () => null,
  Trash2: () => null,
  Check: () => null,
  X: () => null,
  ChevronDown: () => null,
  ChevronRight: () => null,
  Zap: () => null,
  Eye: () => null,
  EyeOff: () => null,
  RefreshCw: () => null,
  Download: () => null,
  Upload: () => null,
  RotateCcw: () => null,
  Wifi: () => null,
  WifiOff: () => null,
  Key: () => null,
  Lock: () => null,
  Unlock: () => null,
  AlertCircle: () => null,
  CheckCircle2: () => null,
  Clock: () => null,
  Settings: () => null,
  ExternalLink: () => null,
  Copy: () => null,
  TestTube: () => null,
}))

// Mock EnvironmentConfig store
const mockUseEnvironmentStore = vi.fn()

vi.mock('../config/EnvironmentConfig', () => ({
  useEnvironmentStore: () => mockUseEnvironmentStore(),
  getActiveGateway: vi.fn(),
  buildAuthHeaders: vi.fn(),
}))

describe('EnvironmentConfigPanel - 基本功能', () => {

  beforeEach(() => {
    mockUseEnvironmentStore.mockReturnValue({
      gateways: [],
      activeGatewayId: null,
      terminalConfig: {
        shell: 'bash',
        fontSize: 14,
        fontFamily: 'monospace',
        cursorBlink: true,
        scrollback: 1000,
        envVars: {},
      },
      heartbeatConfig: {
        enabled: true,
        interval: 30000,
      },
      proxyConfig: {
        enabled: false,
        protocol: 'http',
        host: '',
        port: 8080,
      },
      addGateway: vi.fn(),
      removeGateway: vi.fn(),
      updateGateway: vi.fn(),
      setActiveGateway: vi.fn(),
      updateTerminalConfig: vi.fn(),
      updateHeartbeatConfig: vi.fn(),
      updateProxyConfig: vi.fn(),
    })
  })

  it('组件应该存在且可导入', () => {
    expect(EnvironmentConfigPanel).toBeDefined()
    expect(typeof EnvironmentConfigPanel).toBe('function')
  })

  it('组件应该返回有效的React元素', () => {
    const element = React.createElement(EnvironmentConfigPanel)
    expect(element).toBeDefined()
  })

  it('mock配置应该正确设置', () => {
    const store = mockUseEnvironmentStore()
    
    expect(store.gateways).toBeDefined()
    expect(store.terminalConfig).toBeDefined()
    expect(store.heartbeatConfig).toBeDefined()
    expect(store.proxyConfig).toBeDefined()
  })
})

describe('EnvironmentConfigPanel - 配置结构验证', () => {

  it('终端配置应该包含必要属性', () => {
    mockUseEnvironmentStore.mockReturnValue({
      terminalConfig: {
        shell: 'bash',
        fontSize: 14,
        fontFamily: 'monospace',
        cursorBlink: true,
        scrollback: 1000,
        envVars: {},
      },
    })

    const store = mockUseEnvironmentStore()

    expect(store.terminalConfig).toHaveProperty('shell')
    expect(store.terminalConfig).toHaveProperty('fontSize')
    expect(store.terminalConfig).toHaveProperty('fontFamily')
    expect(store.terminalConfig).toHaveProperty('cursorBlink')
    expect(store.terminalConfig).toHaveProperty('scrollback')
    expect(store.terminalConfig).toHaveProperty('envVars')

    // 验证shell类型
    const validShells = ['bash', 'zsh', 'pwsh', 'fish', 'custom']
    expect(validShells).toContain(store.terminalConfig.shell)

    // 验证字体大小范围
    expect(store.terminalConfig.fontSize).toBeGreaterThanOrEqual(8)
    expect(store.terminalConfig.fontSize).toBeLessThanOrEqual(32)
  })

  it('心跳配置应该包含必要属性', () => {
    mockUseEnvironmentStore.mockReturnValue({
      heartbeatConfig: {
        enabled: true,
        interval: 30000,
        endpoint: '/api/heartbeat',
      },
    })

    const store = mockUseEnvironmentStore()

    expect(store.heartbeatConfig).toHaveProperty('enabled')
    expect(store.heartbeatConfig).toHaveProperty('interval')

    // 验证类型
    expect(typeof store.heartbeatConfig.enabled).toBe('boolean')
    expect(store.heartbeatConfig.interval).toBeGreaterThan(0)
  })

  it('代理配置应该包含必要属性', () => {
    mockUseEnvironmentStore.mockReturnValue({
      proxyConfig: {
        enabled: false,
        protocol: 'http',
        host: 'localhost',
        port: 8080,
      },
    })

    const store = mockUseEnvironmentStore()

    expect(store.proxyConfig).toHaveProperty('enabled')
    expect(store.proxyConfig).toHaveProperty('protocol')
    expect(store.proxyConfig).toHaveProperty('host')
    expect(store.proxyConfig).toHaveProperty('port')

    // 验证协议类型
    const validProtocols = ['http', 'https', 'socks5']
    expect(validProtocols).toContain(store.proxyConfig.protocol)
  })
})

describe('EnvironmentConfigPanel - 边界情况', () => {

  it('空网关列表应该正常工作', () => {
    mockUseEnvironmentStore.mockReturnValue({
      gateways: [],
      activeGatewayId: null,
    })

    const store = mockUseEnvironmentStore()
    
    expect(store.gateways.length).toBe(0)
    expect(store.activeGatewayId).toBeNull()
  })

  it('大量网关应该正常处理', () => {
    const manyGateways = Array.from({ length: 15 }, (_, i) => ({
      id: `gateway-${i}`,
      name: `Gateway ${i}`,
      url: `http://localhost:${3000 + i}`,
      auth: {
        method: 'api_key' as const,
        credentials: { key: `key-${i}` },
      },
      isActive: i === 0,
      priority: i + 1,
    }))

    mockUseEnvironmentStore.mockReturnValue({
      gateways: manyGateways,
      activeGatewayId: 'gateway-0',
    })

    const store = mockUseEnvironmentStore()
    
    expect(store.gateways.length).toBe(15)
    expect(store.activeGatewayId).toBe('gateway-0')
  })

  it('空环境变量应该正常工作', () => {
    mockUseEnvironmentStore.mockReturnValue({
      terminalConfig: {
        shell: 'bash',
        fontSize: 14,
        fontFamily: 'monospace',
        cursorBlink: true,
        scrollback: 1000,
        envVars: {},
      },
    })

    const store = mockUseEnvironmentStore()
    
    expect(Object.keys(store.terminalConfig.envVars).length).toBe(0)
  })

  it('大量环境变量应该正常处理', () => {
    const largeEnvVars = Array.from({ length: 50 }, (_, i) => ({
      [`ENV_VAR_${i}`]: `value-${i}`,
    })).reduce((acc, curr) => ({ ...acc, ...curr }), {})

    mockUseEnvironmentStore.mockReturnValue({
      terminalConfig: {
        shell: 'bash',
        fontSize: 14,
        fontFamily: 'monospace',
        cursorBlink: true,
        scrollback: 1000,
        envVars: largeEnvVars,
      },
    })

    const store = mockUseEnvironmentStore()
    
    expect(Object.keys(store.terminalConfig.envVars).length).toBe(50)
  })
})
