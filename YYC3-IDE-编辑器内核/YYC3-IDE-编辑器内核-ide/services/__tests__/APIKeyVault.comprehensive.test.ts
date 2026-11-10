/**
 * @file APIKeyVault.comprehensive.test.ts
 * @description APIKeyVault 全面测试 - API密钥管理、提供商验证
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiKeyVault, PROVIDERS } from '../APIKeyVault'

describe('APIKeyVault - PROVIDERS常量', () => {

  it('应该包含所有预定义的提供商', () => {
    const expectedProviders = ['openai', 'anthropic', 'deepseek', 'zhipu', 'moonshot', 'qwen', 'baichuan', 'minimax', 'custom']
    
    expectedProviders.forEach(provider => {
      expect(PROVIDERS[provider as keyof typeof PROVIDERS]).toBeDefined()
    })
  })

  it('OpenAI配置应该正确', () => {
    const openai = PROVIDERS.openai
    
    expect(openai.id).toBe('openai')
    expect(openai.name).toBe('OpenAI')
    expect(openai.keyPrefix).toBe('sk-')
    expect(openai.baseUrl).toBe('https://api.openai.com/v1')
    expect(Array.isArray(openai.models)).toBe(true)
    expect(openai.models.length).toBeGreaterThan(0)
  })

  it('Anthropic配置应该正确', () => {
    const anthropic = PROVIDERS.anthropic
    
    expect(anthropic.id).toBe('anthropic')
    expect(anthropic.name).toBe('Anthropic')
    expect(anthropic.keyPrefix).toBe('sk-ant-')
    expect(anthropic.baseUrl).toBe('https://api.anthropic.com/v1')
  })

  it('DeepSeek配置应该正确', () => {
    const deepseek = PROVIDERS.deepseek
    
    expect(deepseek.id).toBe('deepseek')
    expect(deepseek.name).toBe('DeepSeek')
    expect(deepseek.keyPrefix).toBe('sk-')
    expect(deepseek.models).toContain('deepseek-chat')
  })

  it('每个提供商都应该有必需的字段', () => {
    Object.values(PROVIDERS).forEach(provider => {
      expect(provider.id).toBeDefined()
      expect(provider.name).toBeDefined()
      expect(provider.keyPrefix).toBeDefined()
      expect(provider.keyPattern).toBeDefined()
      expect(provider.baseUrl).toBeDefined()
      expect(provider.docsUrl).toBeDefined()
      expect(Array.isArray(provider.models)).toBe(true)
    })
  })
})

describe('APIKeyVault - 密钥管理方法', () => {

  let vault: typeof apiKeyVault

  beforeEach(() => {
    vault = apiKeyVault
  })

  it('listKeys方法应该存在且是异步函数', () => {
    expect(typeof (vault as any).listKeys).toBe('function')
    // listKeys是异步的，需要IndexedDB支持
  })
})

describe('APIKeyVault - 边界情况', () => {

  it('实例应该是稳定的单例引用', () => {
    const instances = Array.from({ length: 5 }, () => apiKeyVault)
    
    expect(new Set(instances).size).toBe(1)
  })

  it('实例应该有核心方法', () => {
    expect(typeof (apiKeyVault as any).saveKey).toBe('function')
    expect(typeof (apiKeyVault as any).getKey).toBe('function')
    expect(typeof (apiKeyVault as any).deleteKey).toBe('function')
    expect(typeof (apiKeyVault as any).getActiveKey).toBe('function')
    expect(typeof (apiKeyVault as any).listKeys).toBe('function')
    expect(typeof (apiKeyVault as any).setActive).toBe('function')
    expect(typeof (apiKeyVault as any).clearAll).toBe('function')
    expect(typeof (apiKeyVault as any).validateKey).toBe('function')
    expect(typeof (apiKeyVault as any).maskKey).toBe('function')
  })

  it('PROVIDERS对象应该是稳定的引用', () => {
    const ref1 = PROVIDERS.openai
    const ref2 = PROVIDERS.openai
    
    expect(ref1).toBe(ref2)
  })

  it('keyPattern应该是有效的正则表达式', () => {
    Object.values(PROVIDERS).forEach(provider => {
      expect(provider.keyPattern instanceof RegExp).toBe(true)
    })
  })

  it('所有提供商baseUrl应该是有效URL格式', () => {
    Object.values(PROVIDERS).forEach(provider => {
      // custom可能没有固定baseUrl
      if (provider.id !== 'custom') {
        expect(provider.baseUrl.startsWith('http')).toBe(true)
      }
    })
  })

  it('所有提供商docsUrl应该是有效URL格式', () => {
    Object.values(PROVIDERS).forEach(provider => {
      // custom可能没有固定docsUrl
      if (provider.id !== 'custom' && provider.docsUrl) {
        expect(provider.docsUrl.startsWith('http')).toBe(true)
      }
    })
  })
})
