import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Search,
  Globe,
  Clock,
  Filter,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Brain,
  ChevronRight,
  X,
  Sparkles,
  Zap,
  TrendingUp,
} from 'lucide-react'
import { PanelHeader } from './PanelManager'
import { WebSearchService } from '../../../services/WebSearchService'
import { useI18n } from './i18n'
import type { SearchResult, MindMapNode } from '../../../services/WebSearchService'

interface SearchHistoryItem {
  query: string
  timestamp: number
  resultCount: number
}

interface FreshnessOption {
  value: 'pd' | 'pw' | 'pm' | 'py' | undefined
  label: string
}

const FRESHNESS_OPTIONS: FreshnessOption[] = [
  { value: undefined, label: '全部时间' },
  { value: 'pd', label: '24小时内' },
  { value: 'pw', label: '一周内' },
  { value: 'pm', label: '一月内' },
  { value: 'py', label: '一年内' },
]

export default function SearchPanel({ nodeId }: { nodeId: string }) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFreshness, setSelectedFreshness] = useState<string | undefined>()
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [showMindMap, setShowMindMap] = useState(false)
  const [mindMap, setMindMap] = useState<MindMapNode | null>(null)
  const [summary, setSummary] = useState<string>('')
  const [deepResearchMode, setDeepResearchMode] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set())

  const searchServiceRef = useRef<WebSearchService | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!searchServiceRef.current) {
      searchServiceRef.current = new WebSearchService({
        enableCache: true,
        cacheTTL: 5 * 60 * 1000,
      })
    }

    try {
      const saved = localStorage.getItem('yyc3-search-history')
      if (saved) {
        setSearchHistory(JSON.parse(saved).slice(0, 20))
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = searchQuery || query.trim()
    if (!q) return

    setIsSearching(true)
    setError(null)
    setShowMindMap(false)
    setMindMap(null)
    setSummary('')

    try {
      let searchResults: SearchResult[]
      let generatedMindMap: MindMapNode | null = null
      let generatedSummary = ''

      if (deepResearchMode && searchServiceRef.current) {
        const researchResult = await searchServiceRef.current.deepResearch(q, 2, 8)
        searchResults = researchResult.results
        generatedMindMap = researchResult.mindMap
        generatedSummary = researchResult.summary
        setMindMap(generatedMindMap)
        setSummary(generatedSummary)
        setShowMindMap(true)
      } else if (searchServiceRef.current) {
        searchResults = await searchServiceRef.current.search(q, {
          count: 10,
          freshness: selectedFreshness as any,
        })
      } else {
        searchResults = []
      }

      setResults(searchResults)

      const newHistoryItem: SearchHistoryItem = {
        query: q,
        timestamp: Date.now(),
        resultCount: searchResults.length,
      }

      setSearchHistory(prev => {
        const updated = [newHistoryItem, ...prev.filter(h => h.query !== q)].slice(0, 20)
        try {
          localStorage.setItem('yyc3-search-history', JSON.stringify(updated))
        } catch {
          // Ignore localStorage write errors
        }
        return updated
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('search.searchFailed'))
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [query, selectedFreshness, deepResearchMode])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }, [handleSearch])

  const copyToClipboard = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch {
      // Ignore clipboard errors
    }
  }, [])

  const toggleResultExpand = useCallback((index: number) => {
    setExpandedResults(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const removeFromHistory = useCallback((query: string) => {
    setSearchHistory(prev => {
      const updated = prev.filter(h => h.query !== query)
      try {
        localStorage.setItem('yyc3-search-history', JSON.stringify(updated))
      } catch {
        // Ignore localStorage write errors
      }
      return updated
    })
  }, [])

  const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    return `${days}天前`
  }

  const extractDomain = (url: string): string => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  return (
    <div className="size-full flex flex-col bg-[var(--ide-bg)]">
      <PanelHeader
        nodeId={nodeId}
        panelId="web-search"
        title={t('search.smartSearch')}
        icon={<Globe className="w-3 h-3 text-blue-400/70" />}
      >
        <button
          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
            deepResearchMode ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-white/5 text-slate-600'
          }`}
          onClick={() => setDeepResearchMode(!deepResearchMode)}
          title={deepResearchMode ? '退出深度研究模式' : '深度研究模式（思维导图+摘要）'}
          aria-label={deepResearchMode ? 'Exit deep research mode' : 'Deep research mode'}
          aria-pressed={deepResearchMode}
        >
          <Brain className="w-3 h-3" />
        </button>
      </PanelHeader>

      {/* Search Input */}
      <div className="px-3 pt-3 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={deepResearchMode ? '输入主题进行深度研究...' : '搜索互联网...'}
              className="w-full pl-8 pr-8 py-1.5 bg-white/[0.03] border border-white/10 rounded-md text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.05] transition-colors"
              aria-label="Search query"
              role="searchbox"
            />
            {query && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded hover:bg-white/10 flex items-center justify-center"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <X className="w-3 h-3 text-slate-500" />
              </button>
            )}
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={isSearching || !query.trim()}
            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
            aria-label={t('common.search')}
          >
            {isSearching ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : deepResearchMode ? (
              <Sparkles className="w-3 h-3" />
            ) : (
              <Zap className="w-3 h-3" />
            )}
            {deepResearchMode ? '研究' : '搜索'}
          </button>
        </div>

        {/* Freshness Filter */}
        {!deepResearchMode && (
          <div className="flex items-center gap-1 mt-2">
            <Filter className="w-3 h-3 text-slate-600" />
            {FRESHNESS_OPTIONS.map(opt => (
              <button
                key={opt.value ?? 'all'}
                onClick={() => setSelectedFreshness(opt.value)}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  selectedFreshness === opt.value
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Error State */}
        {error && (
          <div className="mx-3 mt-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-[11px] text-red-400">{error}</p>
          </div>
        )}

        {/* Deep Research Summary */}
        {summary && showMindMap && (
          <div className="m-3 p-3 bg-purple-500/5 border border-purple-500/15 rounded-lg">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[11px] font-medium text-purple-300">深度研究报告</span>
            </div>
            <pre className="text-[10px] text-slate-400 leading-relaxed whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
              {summary}
            </pre>
          </div>
        )}

        {/* Mind Map Visualization */}
        {mindMap && showMindMap && (
          <div className="m-3 p-3 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/15 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] font-medium text-indigo-300">知识图谱</span>
              </div>
              <span className="text-[10px] text-slate-500">{mindMap.children?.length || 0} 个分类</span>
            </div>
            <MindMapView node={mindMap} depth={0} />
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 && !showMindMap && (
          <div className="px-3 pb-3">
            <div className="flex items-center justify-between mb-2 pt-2">
              <span className="text-[10px] text-slate-500">
                找到 {results.length} 条结果
                {selectedFreshness && ` (${FRESHNESS_OPTIONS.find(o => o.value === selectedFreshness)?.label})`}
              </span>
              {deepResearchMode && (
                <button
                  onClick={() => setShowMindMap(true)}
                  className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <Brain className="w-3 h-3" /> 查看报告
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {results.map((result, index) => (
                <div
                  key={`${result.url}-${index}`}
                  className="group p-2.5 rounded-lg hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all cursor-pointer"
                  onClick={() => window.open(result.url, '_blank')}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 w-4 h-4 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold flex items-center justify-center shrink-0">
                      {result.rank ?? index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[12px] font-medium text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                          {result.title}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(result.url)
                          }}
                          className="shrink-0 w-5 h-5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 flex items-center justify-center transition-opacity"
                          title={t('search.copyLink')}
                        >
                          {copiedUrl === result.url ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-500" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] text-emerald-500/70 font-mono truncate max-w-[180px]">
                          {extractDomain(result.url)}
                        </span>
                        {result.date && (
                          <>
                            <span className="text-slate-700">·</span>
                            <span className="text-[9px] text-slate-600">{result.date}</span>
                          </>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {result.description}
                      </p>

                      {(expandedResults.has(index) || result.description.length > 120) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleResultExpand(index)
                          }}
                          className="mt-1 text-[9px] text-blue-400/60 hover:text-blue-400 flex items-center gap-0.5"
                        >
                          {expandedResults.has(index) ? (
                            <><ChevronUp className="w-3 h-3" /> 收起</>
                          ) : (
                            <><ChevronDown className="w-3 h-3" /> 展开详情</>
                          )}
                        </button>
                      )}

                      {expandedResults.has(index) && (
                        <div className="mt-1.5 p-2 bg-white/[0.02] rounded text-[10px] text-slate-400 leading-relaxed">
                          {result.description}
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <ExternalLink className="w-3 h-3 text-slate-600" />
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400/60 hover:text-blue-400 truncate"
                              onClick={e => e.stopPropagation()}
                            >
                              {result.url}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400/50" />
            <p className="text-[11px] text-slate-500">
              {deepResearchMode ? '正在深度研究中，包含子话题分析...' : '正在搜索...'}
            </p>
          </div>
        )}

        {/* Empty State with History */}
        {!isSearching && results.length === 0 && !error && (
          <div className="px-3 pb-3">
            {searchHistory.length > 0 ? (
              <div className="pt-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="w-3 h-3 text-slate-600" />
                  <span className="text-[10px] text-slate-500 font-medium">搜索历史</span>
                </div>
                <div className="space-y-0.5">
                  {searchHistory.slice(0, 10).map((item, idx) => (
                    <div
                      key={`${item.query}-${idx}`}
                      className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.03] cursor-pointer"
                      onClick={() => {
                        setQuery(item.query)
                        handleSearch(item.query)
                      }}
                    >
                      <Clock className="w-3 h-3 text-slate-700 shrink-0" />
                      <span className="flex-1 text-[11px] text-slate-400 truncate group-hover:text-slate-300">
                        {item.query}
                      </span>
                      <span className="text-[9px] text-slate-700 shrink-0">
                        {formatTimeAgo(item.timestamp)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFromHistory(item.query)
                        }}
                        className="w-4 h-4 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 flex items-center justify-center shrink-0"
                      >
                        <X className="w-2.5 h-2.5 text-slate-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/5 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-blue-400/30" />
                </div>
                <div className="text-center">
                  <p className="text-[12px] text-slate-400 font-medium">智能联网搜索</p>
                  <p className="text-[10px] text-slate-600 mt-1">
                    输入关键词搜索互联网，或开启深度研究模式生成思维导图
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MindMapView({ node, depth }: { node: MindMapNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2)

  const hasChildren = node.children && node.children.length > 0

  return (
    <div className={depth > 0 ? 'ml-3 pl-2 border-l border-white/5' : ''}>
      <div
        className="flex items-center gap-1.5 py-1 cursor-pointer hover:bg-white/[0.03] rounded px-1 -ml-1"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="w-3 h-3 text-slate-600 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span className={`text-[11px] ${depth === 0 ? 'font-medium text-indigo-300' : 'text-slate-400'}`}>
          {node.label}
        </span>
        {node.metadata?.source && (
          <span className="text-[9px] text-slate-700 font-mono">{node.metadata.source}</span>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children!.map((child: MindMapNode) => (
            <MindMapView key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function ChevronDown(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || 12} height={props.size || 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
}

function ChevronUp(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || 12} height={props.size || 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
}
