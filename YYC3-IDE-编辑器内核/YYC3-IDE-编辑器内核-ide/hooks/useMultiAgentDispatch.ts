/**
 * @file: hooks/useMultiAgentDispatch.ts
 * @description: Multi-Agent LLM 真实调度链路 — Planner→Coder→Tester→Reviewer 四阶段流水线，
 *              支持 SSE 流式调用、阶段状态追踪、错误恢复、记忆写入
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-03
 * @updated: 2026-04-03
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: multi-agent,llm,dispatch,planner,coder,tester,reviewer,pipeline
 */

import { useState, useCallback, useRef } from 'react'
import {
  getProviderConfigs,
  chatCompletion,
  chatCompletionStream,
  getApiKey,
  type ChatMessage,
  type ProviderConfig,
  type StreamCallbacks,
} from '../LLMService'
import { useMemoryStore } from '../stores/useMemoryStore'
import { logger } from "../services/Logger";

// ── Types ──

export type AgentRole = 'planner' | 'coder' | 'tester' | 'reviewer'
export type PipelineStage = 'idle' | 'planning' | 'coding' | 'testing' | 'reviewing' | 'completed' | 'error'

export interface AgentResult {
  role: AgentRole
  output: string
  durationMs: number
  success: boolean
  error?: string
}

export interface PipelineState {
  stage: PipelineStage
  results: AgentResult[]
  currentOutput: string
  isStreaming: boolean
  error: string | null
  userRequest: string
}

// ── System Prompts ──

const SYSTEM_PROMPTS: Record<AgentRole, string> = {
  planner: `你是 YYC³ Family AI 的规划智能体（Planner Agent）。
你的职责是：
1. 分析用户需求，提取关键技术要点
2. 将复杂任务分解为可执行的子任务列表
3. 评估技术风险和依赖关系
4. 生成结构化的实施计划

输出格式要求：
- 使用 Markdown 格式
- 每个子任务包含：编号、描述、预估复杂度(低/中/高)、负责角色
- 最后附上风险评估和建议`,

  coder: `你是 YYC³ Family AI 的编码智能体（Coder Agent）。
你的职责是：
1. 根据规划方案生成高质量的 TypeScript/React 代码
2. 遵循项目规范：2空格缩进、单引号、无分号
3. 使用 Tailwind CSS 进行样式定义
4. 确保类型安全，提供完整的 TypeScript 类型定义
5. 添加 JSDoc 注释和必要的行内注释

代码规范要求：
- 组件文件 PascalCase，工具文件 camelCase
- 使用函数组件 + hooks 模式
- Props 接口命名为 {ComponentName}Props
- 自定义 hooks 以 use 开头`,

  tester: `你是 YYC³ Family AI 的测试智能体（Tester Agent）。
你的职责是：
1. 审查代码并识别潜在的测试场景
2. 生成 Vitest + React Testing Library 单元测试
3. 设计 Playwright E2E 测试用例
4. 验证边界条件、错误处理、无障碍性
5. 评估测试覆盖率并建议补充测试

输出格式：
- 列出测试策略概述
- 提供可运行的测试代码
- 标注优先级：P0(必测)/P1(推荐)/P2(增强)`,

  reviewer: `你是 YYC³ Family AI 的评审智能体（Reviewer Agent）。
你的职责是：
1. 代码质量审查：命名规范、类型安全、错误处理
2. 架构合理性评估：组件拆分、状态管理、性能优化
3. 安全性检查：XSS 防护、敏感数据处理
4. 可维护性评审：代码复杂度、文档完整性
5. 最终综合评分和改进建议

评审格式：
- 评分(0-100)：代码质量/架构/安全性/可维护性
- 问题列表：严重/警告/建议 三级
- 改进建议：具体的代码修改方案`,
}

// ── Provider Resolution ──

function resolveProvider(): { provider: ProviderConfig; modelId: string } | null {
  // Priority: Ollama(local) > DeepSeek > Zhipu > OpenAI > DashScope > Custom
  const priority: Array<{ providerId: string; defaultModel: string }> = [
    { providerId: 'ollama', defaultModel: 'llama3' },
    { providerId: 'deepseek', defaultModel: 'deepseek-chat' },
    { providerId: 'zhipu', defaultModel: 'glm-4-flash' },
    { providerId: 'openai', defaultModel: 'gpt-4o-mini' },
    { providerId: 'dashscope', defaultModel: 'qwen-plus' },
  ]

  for (const { providerId, defaultModel } of priority) {
    const provider = getProviderConfigs().find(p => p.id === providerId)
    if (!provider) continue

    // Ollama doesn't need API key
    if (provider.id === 'ollama') {
      return { provider, modelId: defaultModel }
    }

    if (getApiKey(provider.id)) {
      return { provider, modelId: defaultModel }
    }
  }

  return null
}

// ── Hook ──

export function useMultiAgentDispatch() {
  const [state, setState] = useState<PipelineState>({
    stage: 'idle',
    results: [],
    currentOutput: '',
    isStreaming: false,
    error: null,
    userRequest: '',
  })

  const abortRef = useRef<AbortController | null>(null)
  const { addMemory } = useMemoryStore()

  const runAgent = useCallback(async (
    role: AgentRole,
    messages: ChatMessage[],
    provider: ProviderConfig,
    modelId: string,
  ): Promise<AgentResult> => {
    const start = Date.now()

    const stageMap: Record<AgentRole, PipelineStage> = {
      planner: 'planning',
      coder: 'coding',
      tester: 'testing',
      reviewer: 'reviewing',
    }
    setState(prev => ({ ...prev, stage: stageMap[role], currentOutput: '', isStreaming: true }))

    try {
      let output = ''

      // Try streaming first
      const controller = new AbortController()
      abortRef.current = controller

      await new Promise<void>((resolve, reject) => {
        const callbacks: StreamCallbacks = {
          onToken: (token) => {
            output += token
            setState(prev => ({ ...prev, currentOutput: output }))
          },
          onDone: (fullText) => {
            output = fullText
            resolve()
          },
          onError: (error) => {
            reject(new Error(error))
          },
        }

        chatCompletionStream(provider, modelId, messages, callbacks, {
          temperature: role === 'planner' ? 0.3 : role === 'reviewer' ? 0.2 : 0.7,
          maxTokens: role === 'coder' ? 4096 : 2048,
          signal: controller.signal,
        }).catch(reject)
      })

      const result: AgentResult = {
        role,
        output,
        durationMs: Date.now() - start,
        success: true,
      }

      setState(prev => ({
        ...prev,
        results: [...prev.results, result],
        isStreaming: false,
      }))

      return result
    } catch (err: any) {
      // Fallback to non-streaming
      if (err.name === 'AbortError') {
        const result: AgentResult = { role, output: '', durationMs: Date.now() - start, success: false, error: '用户取消' }
        setState(prev => ({ ...prev, results: [...prev.results, result], isStreaming: false }))
        return result
      }

      try {
        const output = await chatCompletion(provider, modelId, messages, {
          temperature: role === 'planner' ? 0.3 : role === 'reviewer' ? 0.2 : 0.7,
          maxTokens: role === 'coder' ? 4096 : 2048,
        })

        const result: AgentResult = { role, output, durationMs: Date.now() - start, success: true }
        setState(prev => ({
          ...prev,
          results: [...prev.results, result],
          currentOutput: output,
          isStreaming: false,
        }))
        return result
      } catch (fallbackErr: any) {
        const result: AgentResult = {
          role,
          output: '',
          durationMs: Date.now() - start,
          success: false,
          error: fallbackErr.message || '调用失败',
        }
        setState(prev => ({ ...prev, results: [...prev.results, result], isStreaming: false }))
        return result
      }
    }
  }, [])

  /**
   * Execute the full Planner → Coder → Tester → Reviewer pipeline
   */
  const executePipeline = useCallback(async (userRequest: string) => {
    const resolved = resolveProvider()
    if (!resolved) {
      setState(prev => ({
        ...prev,
        stage: 'error',
        error: '未找到可用的 LLM Provider。请在设置中配置 API Key（DeepSeek / 智谱 / OpenAI / 通义千问 / Ollama）。',
      }))
      return
    }

    const { provider, modelId } = resolved

    setState({
      stage: 'planning',
      results: [],
      currentOutput: '',
      isStreaming: false,
      error: null,
      userRequest,
    })

    // ── Stage 1: Planner ──
    const plannerMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPTS.planner },
      { role: 'user', content: `请分析并规划以下需求：\n\n${userRequest}` },
    ]

    const planResult = await runAgent('planner', plannerMessages, provider, modelId)
    if (!planResult.success) {
      setState(prev => ({ ...prev, stage: 'error', error: `规划阶段失败: ${planResult.error}` }))
      return
    }

    // Save plan to memory
    addMemory({
      title: `任务规划: ${userRequest.slice(0, 50)}`,
      summary: planResult.output.slice(0, 200),
      category: 'project',
      agent: 'planner',
      relevance: 85,
      pinned: false,
      tags: ['plan', 'task'],
    })

    // ── Stage 2: Coder ──
    const coderMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPTS.coder },
      { role: 'user', content: `基于以下规划方案实现代码：\n\n## 用户需求\n${userRequest}\n\n## 规划方案\n${planResult.output}` },
    ]

    const codeResult = await runAgent('coder', coderMessages, provider, modelId)
    if (!codeResult.success) {
      setState(prev => ({ ...prev, stage: 'error', error: `编码阶段失败: ${codeResult.error}` }))
      return
    }

    // ── Stage 3: Tester ──
    const testerMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPTS.tester },
      { role: 'user', content: `请为以下代码生成测试：\n\n## 用户需求\n${userRequest}\n\n## 实现代码\n${codeResult.output.slice(0, 3000)}` },
    ]

    const testResult = await runAgent('tester', testerMessages, provider, modelId)
    if (!testResult.success) {
      // Tester failure is non-blocking
      logger.warn('[MultiAgent] Tester failed:', testResult.error);
    }

    // ── Stage 4: Reviewer ──
    const reviewerMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPTS.reviewer },
      {
        role: 'user',
        content: `请审查以下代码实现：\n\n## 用户需求\n${userRequest}\n\n## 规划方案\n${planResult.output.slice(0, 1000)}\n\n## 实现代码\n${codeResult.output.slice(0, 3000)}\n\n## 测试结果\n${testResult.success ? testResult.output.slice(0, 1000) : '测试未完成'}`,
      },
    ]

    const reviewResult = await runAgent('reviewer', reviewerMessages, provider, modelId)

    // Save review to memory
    if (reviewResult.success) {
      addMemory({
        title: `代码审查: ${userRequest.slice(0, 50)}`,
        summary: reviewResult.output.slice(0, 200),
        category: 'patterns',
        agent: 'reviewer',
        relevance: 80,
        pinned: false,
        tags: ['review', 'quality'],
      })
    }

    setState(prev => ({ ...prev, stage: 'completed' }))
  }, [runAgent, addMemory])

  /**
   * Execute a single agent with custom prompt
   */
  const executeSingleAgent = useCallback(async (role: AgentRole, prompt: string) => {
    const resolved = resolveProvider()
    if (!resolved) {
      setState(prev => ({
        ...prev,
        stage: 'error',
        error: '未找到可用的 LLM Provider。',
      }))
      return null
    }

    const { provider, modelId } = resolved
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPTS[role] },
      { role: 'user', content: prompt },
    ]

    return runAgent(role, messages, provider, modelId)
  }, [runAgent])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setState(prev => ({ ...prev, stage: 'idle', isStreaming: false }))
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState({
      stage: 'idle',
      results: [],
      currentOutput: '',
      isStreaming: false,
      error: null,
      userRequest: '',
    })
  }, [])

  return {
    state,
    executePipeline,
    executeSingleAgent,
    cancel,
    reset,
    hasProvider: resolveProvider() !== null,
  }
}
