'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { MCPCard } from '@/components/mcp-card'
import { Input } from '@/components/ui/input'
import { ArrowUpDown, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  type MCPServer,
  SOURCE_INDICATORS
} from '@/lib/mcp-types'
import { type MCPCategoryMetadata } from '@/lib/mcp-server'

const ITEMS_PER_PAGE = 24

interface MCPPageClientProps {
  allServers: MCPServer[]
  categories: MCPCategoryMetadata[]
  popularServers?: MCPServer[]
  featuredServers?: MCPServer[]
  trendingServers?: MCPServer[]
}

export default function MCPPageClient({
  allServers,
  categories,
  popularServers = [],
  featuredServers = [],
  trendingServers = []
}: MCPPageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE)
  const [sortBy, setSortBy] = useState<'stars' | 'newest' | 'oldest' | 'name' | 'name-desc'>('stars')
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const categoryParam = searchParams.get('category')
    const sourceParam = searchParams.get('source')
    const sortParam = searchParams.get('sort')

    if (categoryParam && categories.some(cat => cat.id === categoryParam)) {
      setSelectedCategory(categoryParam)
    }

    if (sourceParam && ['official-mcp', 'docker'].includes(sourceParam)) {
      setSelectedSource(sourceParam)
    }

    if (sortParam && ['stars', 'newest', 'oldest', 'name', 'name-desc'].includes(sortParam)) {
      setSortBy(sortParam as typeof sortBy)
    }
  }, [searchParams, categories])

  const handleCategoryChange = (category: string | 'all') => {
    setSelectedCategory(category)
    updateURL({ category })
  }

  const handleSourceChange = (source: string) => {
    setSelectedSource(source)
    updateURL({ source })
  }

  const updateURL = (newParams: { category?: string | 'all', source?: string, sort?: string }) => {
    const params = new URLSearchParams(searchParams.toString())

    if (newParams.category !== undefined) {
      if (newParams.category === 'all') {
        params.delete('category')
      } else {
        params.set('category', newParams.category)
      }
    }

    if (newParams.source !== undefined) {
      if (newParams.source === 'all') {
        params.delete('source')
      } else {
        params.set('source', newParams.source)
      }
    }

    if (newParams.sort !== undefined) {
      if (newParams.sort === 'stars') {
        params.delete('sort')
      } else {
        params.set('sort', newParams.sort)
      }
    }

    const newUrl = params.toString() ? `/mcp-servers?${params.toString()}` : '/mcp-servers'
    router.replace(newUrl)
  }

  const filteredServers = useMemo(() => {
    let filtered = allServers

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(server => server.category === selectedCategory)
    }

    if (selectedSource !== 'all') {
      if (selectedSource === 'docker') {
        filtered = filtered.filter(server =>
          server.source_registry?.type === 'docker' || server.docker_mcp_available
        )
      } else {
        filtered = filtered.filter(server => server.source_registry?.type === selectedSource)
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(server =>
        server.name.toLowerCase().includes(q) ||
        server.display_name.toLowerCase().includes(q) ||
        server.description.toLowerCase().includes(q) ||
        server.tags.some(tag => tag.toLowerCase().includes(q))
      )
    }

    const sorted = [...filtered].sort((a, b) => {
      switch(sortBy) {
        case 'stars':
          return (b.stats?.github_stars || 0) - (a.stats?.github_stars || 0)
        case 'newest':
          return new Date(b.stats?.last_updated || 0).getTime() - new Date(a.stats?.last_updated || 0).getTime()
        case 'oldest':
          return new Date(a.stats?.last_updated || 0).getTime() - new Date(b.stats?.last_updated || 0).getTime()
        case 'name':
          return a.display_name.localeCompare(b.display_name)
        case 'name-desc':
          return b.display_name.localeCompare(a.display_name)
        default:
          return 0
      }
    })

    return sorted
  }, [allServers, selectedCategory, selectedSource, searchQuery, sortBy])

  const sourceCounts = useMemo(() => {
    const officialMcp = allServers.filter(server => server.source_registry?.type === 'official-mcp').length
    const docker = allServers.filter(server =>
      server.source_registry?.type === 'docker' || server.docker_mcp_available
    ).length
    return { 'official-mcp': officialMcp, docker }
  }, [allServers])

  const hasActiveFilters = useMemo(() => {
    return searchQuery !== '' || selectedCategory !== 'all' || selectedSource !== 'all'
  }, [searchQuery, selectedCategory, selectedSource])

  // Items to display (sliced for infinite scroll)
  const displayedServers = filteredServers.slice(0, displayCount)
  const hasMore = displayCount < filteredServers.length

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE)
  }, [searchQuery, selectedCategory, selectedSource, sortBy])

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setDisplayCount(prev => prev + ITEMS_PER_PAGE)
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore])

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-display-2 mb-2">MCP Servers</h1>
          <p className="text-muted-foreground">
            {allServers.length} Model Context Protocol servers
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search MCP servers..."
            className="max-w-md bg-card border-border"
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => handleCategoryChange('all')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {cat.displayName}
            </button>
          ))}
        </div>

        {/* Source and Sort controls */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          {/* Source filters */}
          <div className="flex gap-2">
            <span className="text-sm text-muted-foreground py-1.5">Source:</span>
            <button
              onClick={() => handleSourceChange('all')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectedSource === 'all'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              All ({allServers.length})
            </button>
            <button
              onClick={() => handleSourceChange('official-mcp')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectedSource === 'official-mcp'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {SOURCE_INDICATORS['official-mcp'].icon} Official ({sourceCounts['official-mcp']})
            </button>
            <button
              onClick={() => handleSourceChange('docker')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectedSource === 'docker'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {SOURCE_INDICATORS.docker.icon} Docker ({sourceCounts.docker})
            </button>
          </div>

          {/* Sort Dropdown */}
          <Select
            value={sortBy}
            onValueChange={(value) => {
              setSortBy(value as typeof sortBy)
              updateURL({ sort: value })
            }}
          >
            <SelectTrigger className="w-[150px] bg-card border-border">
              <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stars">Most Stars</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="name">A to Z</SelectItem>
              <SelectItem value="name-desc">Z to A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Featured Sections - Only show when no filters active */}
        {!hasActiveFilters && (popularServers.length > 0 || featuredServers.length > 0) && (
          <div className="mb-12">
            {popularServers.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xl font-medium mb-4">Popular</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {popularServers.map((server) => (
                    <MCPCard key={server.path} server={server} />
                  ))}
                </div>
              </div>
            )}

            {featuredServers.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xl font-medium mb-4">Featured</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredServers.map((server) => (
                    <MCPCard key={server.path} server={server} />
                  ))}
                </div>
              </div>
            )}

            <hr className="border-border/50" />
          </div>
        )}

        {/* All Servers header when featured visible */}
        {(!hasActiveFilters && (popularServers.length > 0 || featuredServers.length > 0)) && (
          <h2 className="text-xl font-medium mb-4 mt-8">All Servers</h2>
        )}

        {/* Results count */}
        {hasActiveFilters && (
          <p className="text-sm text-muted-foreground mb-6">
            {filteredServers.length} result{filteredServers.length !== 1 ? 's' : ''}
            {selectedCategory !== 'all' && ` in ${categories.find(c => c.id === selectedCategory)?.displayName || selectedCategory}`}
          </p>
        )}

        {/* Grid */}
        {filteredServers.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedServers.map((server) => (
              <MCPCard key={server.path} server={server} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No MCP servers found</p>
          </div>
        )}

        {/* Load more trigger / Loading indicator */}
        <div ref={loadMoreRef} className="py-8 flex justify-center">
          {hasMore && (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
          {!hasMore && displayedServers.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing all {filteredServers.length} MCP servers
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
