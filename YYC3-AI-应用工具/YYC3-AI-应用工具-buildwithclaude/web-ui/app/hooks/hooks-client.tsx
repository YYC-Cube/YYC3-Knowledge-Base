'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { HookCard } from '@/components/hook-card'
import { Input } from '@/components/ui/input'
import { Webhook, Loader2 } from 'lucide-react'
import { type Hook, type CategoryMetadata, generateCategoryDisplayName } from '@/lib/hooks-types'

const ITEMS_PER_PAGE = 24

interface HooksPageClientProps {
  allHooks: Hook[]
  categories: CategoryMetadata[]
  eventTypes: string[]
}

export default function HooksPageClient({ allHooks, categories, eventTypes }: HooksPageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all')
  const [selectedEvent, setSelectedEvent] = useState<string | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const categoryParam = searchParams.get('category')
    const eventParam = searchParams.get('event')
    if (categoryParam && categories.some(cat => cat.id === categoryParam)) {
      setSelectedCategory(categoryParam)
    }
    if (eventParam && eventTypes.includes(eventParam)) {
      setSelectedEvent(eventParam)
    }
  }, [searchParams, categories, eventTypes])

  const handleCategoryChange = (category: string | 'all') => {
    setSelectedCategory(category)
    updateURL(category, selectedEvent)
  }

  const handleEventChange = (event: string | 'all') => {
    setSelectedEvent(event)
    updateURL(selectedCategory, event)
  }

  const updateURL = (category: string | 'all', event: string | 'all') => {
    const params = new URLSearchParams(searchParams.toString())
    if (category === 'all') {
      params.delete('category')
    } else {
      params.set('category', category)
    }
    if (event === 'all') {
      params.delete('event')
    } else {
      params.set('event', event)
    }
    const newUrl = params.toString() ? `/hooks?${params.toString()}` : '/hooks'
    router.replace(newUrl)
  }

  const filteredHooks = useMemo(() => {
    let filtered = allHooks

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(hook => hook.category === selectedCategory)
    }

    if (selectedEvent !== 'all') {
      filtered = filtered.filter(hook => hook.event === selectedEvent)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(hook =>
        hook.name.toLowerCase().includes(q) ||
        hook.description.toLowerCase().includes(q) ||
        hook.event.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [allHooks, selectedCategory, selectedEvent, searchQuery])

  // Items to display (sliced for infinite scroll)
  const displayedHooks = filteredHooks.slice(0, displayCount)
  const hasMore = displayCount < filteredHooks.length

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE)
  }, [selectedCategory, selectedEvent, searchQuery])

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
          <h1 className="text-display-2 mb-2 flex items-center gap-3">
            <Webhook className="h-8 w-8 text-orange-500" />
            Hooks
          </h1>
          <p className="text-muted-foreground">
            {allHooks.length} automation hooks for Claude Code
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder="Search hooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

        {/* Event type filters */}
        <div className="flex gap-2 flex-wrap mb-8">
          <span className="text-sm text-muted-foreground py-1.5">Event:</span>
          <button
            onClick={() => handleEventChange('all')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              selectedEvent === 'all'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            All
          </button>
          {eventTypes.map((event) => (
            <button
              key={event}
              onClick={() => handleEventChange(event)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectedEvent === event
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {event}
            </button>
          ))}
        </div>

        {/* Results count */}
        {(selectedCategory !== 'all' || selectedEvent !== 'all' || searchQuery) && (
          <p className="text-sm text-muted-foreground mb-6">
            {filteredHooks.length} result{filteredHooks.length !== 1 ? 's' : ''}
            {selectedCategory !== 'all' && ` in ${generateCategoryDisplayName(selectedCategory)}`}
            {selectedEvent !== 'all' && ` for ${selectedEvent}`}
          </p>
        )}

        {/* Grid */}
        {filteredHooks.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedHooks.map((hook) => (
              <HookCard key={hook.slug} hook={hook} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No hooks found</p>
          </div>
        )}

        {/* Load more trigger / Loading indicator */}
        <div ref={loadMoreRef} className="py-8 flex justify-center">
          {hasMore && (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
          {!hasMore && displayedHooks.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing all {filteredHooks.length} hooks
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
