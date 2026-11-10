/**
 * @file: stores/useMemoryStore.ts
 * @description: 持久记忆 Zustand Store — 基于 IndexedDB (idb) 实现跨会话记忆持久化，
 *              支持 CRUD、搜索、分类筛选、置顶、相关度排序、引用计数追踪、
 *              向量嵌入语义搜索（TF-IDF + Cosine Similarity）
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-04-03
 * @updated: 2026-04-03
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: memory,indexeddb,persistence,zustand,multi-agent,vector-embedding,semantic-search
 */

import { create } from 'zustand'
import { openDB, type IDBPDatabase } from 'idb'
import { logger } from "../services/Logger";

// ── Types ──

export type MemoryCategory = 'project' | 'patterns' | 'debug' | 'preferences' | 'conversation'
export type AgentRole = 'planner' | 'coder' | 'tester' | 'reviewer'

export interface MemoryItem {
  id: string
  title: string
  summary: string
  category: MemoryCategory
  agent: AgentRole
  relevance: number
  pinned: boolean
  createdAt: string
  updatedAt: string
  usageCount: number
  tags: string[]
  embedding?: number[] // vector embedding for semantic search
}

// ── Vector Embedding Engine (TF-IDF based) ──

/** Tokenize Chinese + English text into terms */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1)
}

/** Build a simple TF vector from text */
function buildTFVector(text: string): Map<string, number> {
  const terms = tokenize(text)
  const tf = new Map<string, number>()
  for (const t of terms) {
    tf.set(t, (tf.get(t) || 0) + 1)
  }
  // Normalize
  const max = Math.max(...tf.values(), 1)
  for (const [k, v] of tf) {
    tf.set(k, v / max)
  }
  return tf
}

/** Convert TF map to a fixed-dimension vector using a shared vocabulary */
function tfToVector(tf: Map<string, number>, vocab: string[]): number[] {
  return vocab.map(term => tf.get(term) || 0)
}

/** Cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

/** Generate embedding for a MemoryItem's combined text */
export function generateEmbedding(item: Pick<MemoryItem, 'title' | 'summary' | 'tags'>): number[] {
  const text = `${item.title} ${item.summary} ${item.tags.join(' ')}`
  const tf = buildTFVector(text)
  // Use top 128 terms as a fixed vocab for compact embedding
  const vocab = [...tf.keys()].sort((a, b) => (tf.get(b) || 0) - (tf.get(a) || 0)).slice(0, 128)
  return tfToVector(tf, vocab)
}

/** Compute semantic similarity between a query and a memory item */
export function semanticSimilarity(query: string, item: MemoryItem): number {
  const queryTF = buildTFVector(query)
  const itemText = `${item.title} ${item.summary} ${item.tags.join(' ')}`
  const itemTF = buildTFVector(itemText)

  // Build shared vocabulary
  const vocabSet = new Set<string>()
  for (const k of queryTF.keys()) vocabSet.add(k)
  for (const k of itemTF.keys()) vocabSet.add(k)
  const vocab = [...vocabSet]

  const qVec = tfToVector(queryTF, vocab)
  const iVec = tfToVector(itemTF, vocab)
  return cosineSimilarity(qVec, iVec)
}

// ── IndexedDB Setup ──

const DB_NAME = 'yyc3_agent_memory'
const DB_VERSION = 1
const STORE_NAME = 'memories'

let dbInstance: IDBPDatabase | null = null

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('category', 'category', { unique: false })
        store.createIndex('agent', 'agent', { unique: false })
        store.createIndex('pinned', 'pinned', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    },
  })
  return dbInstance
}

// ── Default seed memories ──

const SEED_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-seed-1', title: '项目架构：React + TypeScript + Zustand',
    summary: '前端采用 React 18 + TypeScript 5.x，状态管理用 Zustand，布局系统使用 react-dnd 实现多联式面板拖拽',
    category: 'project', agent: 'planner', relevance: 95, pinned: true,
    createdAt: '2026-04-01', updatedAt: '2026-04-03', usageCount: 23, tags: ['architecture', 'react', 'zustand'],
  },
  {
    id: 'mem-seed-2', title: 'PanelHeader 组件接口规范',
    summary: '所有面板组件必须接受 nodeId: string 参数，通过 PanelHeader 注册拖拽和操作按钮',
    category: 'patterns', agent: 'coder', relevance: 88, pinned: true,
    createdAt: '2026-04-01', updatedAt: '2026-04-02', usageCount: 15, tags: ['panel', 'component', 'interface'],
  },
  {
    id: 'mem-seed-3', title: 'CSS 变量命名约定',
    summary: 'IDE 相关 CSS 变量使用 --ide- 前缀，如 --ide-bg, --ide-border-dim, --ide-text-muted',
    category: 'patterns', agent: 'coder', relevance: 82, pinned: false,
    createdAt: '2026-03-30', updatedAt: '2026-03-30', usageCount: 31, tags: ['css', 'variables', 'naming'],
  },
  {
    id: 'mem-seed-4', title: '修复 Monaco 编辑器闪烁问题',
    summary: '通过设置 automaticLayout: true 和 debounce resize observer 解决面板拖拽时编辑器闪烁',
    category: 'debug', agent: 'tester', relevance: 76, pinned: false,
    createdAt: '2026-03-28', updatedAt: '2026-03-28', usageCount: 5, tags: ['monaco', 'bug', 'layout'],
  },
  {
    id: 'mem-seed-5', title: 'LLM 调用需使用 LLMService.streamChat',
    summary: '所有 AI 对话请求应通过 LLMService 统一发送，支持 SSE 流式和非流式两种模式',
    category: 'patterns', agent: 'reviewer', relevance: 91, pinned: true,
    createdAt: '2026-04-02', updatedAt: '2026-04-03', usageCount: 12, tags: ['llm', 'api', 'streaming'],
  },
  {
    id: 'mem-seed-6', title: '用户偏好：暗色主题 + JetBrains Mono',
    summary: '用户偏好深色 Navy 主题，代码字体 JetBrains Mono 14px，开启自动换行',
    category: 'preferences', agent: 'planner', relevance: 70, pinned: false,
    createdAt: '2026-03-25', updatedAt: '2026-03-25', usageCount: 8, tags: ['theme', 'font', 'preferences'],
  },
]

// ── Store Interface ──

interface MemoryState {
  memories: MemoryItem[]
  initialized: boolean
  loading: boolean
}

interface MemoryActions {
  initialize: () => Promise<void>
  addMemory: (item: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => Promise<void>
  updateMemory: (id: string, updates: Partial<MemoryItem>) => Promise<void>
  removeMemory: (id: string) => Promise<void>
  togglePin: (id: string) => Promise<void>
  incrementUsage: (id: string) => Promise<void>
  clearAll: () => Promise<void>
  search: (query: string, category?: MemoryCategory) => MemoryItem[]
  getByAgent: (agent: AgentRole) => MemoryItem[]
  getRelevant: (context: string, limit?: number) => MemoryItem[]
  semanticSearch: (query: string, limit?: number) => Array<MemoryItem & { similarity: number }>
  recomputeEmbeddings: () => Promise<void>
}

export const useMemoryStore = create<MemoryState & MemoryActions>((set, get) => ({
  memories: [],
  initialized: false,
  loading: false,

  initialize: async () => {
    if (get().initialized) return
    set({ loading: true })
    try {
      const db = await getDB()
      let items = await db.getAll(STORE_NAME) as MemoryItem[]

      // Seed on first run
      if (items.length === 0) {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        for (const seed of SEED_MEMORIES) {
          await tx.store.put(seed)
        }
        await tx.done
        items = SEED_MEMORIES
      }

      set({ memories: items, initialized: true, loading: false })
    } catch (err) {
      logger.error('[MemoryStore] IndexedDB init failed:', err);
      // Fallback to in-memory seeds
      set({ memories: [...SEED_MEMORIES], initialized: true, loading: false })
    }
  },

  addMemory: async (item) => {
    const now = new Date().toISOString().slice(0, 10)
    const embedding = generateEmbedding(item)
    const newItem: MemoryItem = {
      ...item,
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
      embedding,
    }
    try {
      const db = await getDB()
      await db.put(STORE_NAME, newItem)
    } catch (err) {
      logger.error('[MemoryStore] add failed:', err);
    }
    set(state => ({ memories: [...state.memories, newItem] }))
  },

  updateMemory: async (id, updates) => {
    const state = get()
    const existing = state.memories.find(m => m.id === id)
    if (!existing) return

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString().slice(0, 10),
    }
    try {
      const db = await getDB()
      await db.put(STORE_NAME, updated)
    } catch (err) {
      logger.error('[MemoryStore] update failed:', err);
    }
    set(state => ({
      memories: state.memories.map(m => m.id === id ? updated : m),
    }))
  },

  removeMemory: async (id) => {
    try {
      const db = await getDB()
      await db.delete(STORE_NAME, id)
    } catch (err) {
      logger.error('[MemoryStore] remove failed:', err);
    }
    set(state => ({ memories: state.memories.filter(m => m.id !== id) }))
  },

  togglePin: async (id) => {
    const item = get().memories.find(m => m.id === id)
    if (item) {
      await get().updateMemory(id, { pinned: !item.pinned })
    }
  },

  incrementUsage: async (id) => {
    const item = get().memories.find(m => m.id === id)
    if (item) {
      await get().updateMemory(id, { usageCount: item.usageCount + 1 })
    }
  },

  clearAll: async () => {
    try {
      const db = await getDB()
      await db.clear(STORE_NAME)
    } catch (err) {
      logger.error('[MemoryStore] clear failed:', err);
    }
    set({ memories: [] })
  },

  search: (query, category) => {
    const q = query.toLowerCase()
    return get().memories
      .filter(m => {
        const matchCat = !category || m.category === category
        const matchQ = !q ||
          m.title.toLowerCase().includes(q) ||
          m.summary.toLowerCase().includes(q) ||
          m.tags.some(t => t.toLowerCase().includes(q))
        return matchCat && matchQ
      })
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.relevance - a.relevance)
  },

  getByAgent: (agent) => {
    return get().memories.filter(m => m.agent === agent)
  },

  getRelevant: (context, limit = 5) => {
    // Use semantic similarity for better relevance scoring
    const items = get().memories
    return items
      .map(m => {
        const sim = semanticSimilarity(context, m)
        const score = sim * 60 + m.relevance * 0.3 + (m.pinned ? 20 : 0) + Math.min(m.usageCount, 10)
        return { ...m, _score: score }
      })
      .filter(m => (m as any)._score > 5)
      .sort((a, b) => (b as any)._score - (a as any)._score)
      .slice(0, limit)
  },

  semanticSearch: (query, limit = 10) => {
    if (!query.trim()) return []
    const items = get().memories
    return items
      .map(m => ({
        ...m,
        similarity: Math.round(semanticSimilarity(query, m) * 100),
      }))
      .filter(m => m.similarity > 5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  },

  recomputeEmbeddings: async () => {
    const { memories } = get()
    const updated = memories.map(m => ({
      ...m,
      embedding: generateEmbedding(m),
      updatedAt: new Date().toISOString().slice(0, 10),
    }))
    try {
      const db = await getDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      for (const item of updated) {
        await tx.store.put(item)
      }
      await tx.done
    } catch (err) {
      logger.error('[MemoryStore] recomputeEmbeddings failed:', err);
    }
    set({ memories: updated })
  },
}))
