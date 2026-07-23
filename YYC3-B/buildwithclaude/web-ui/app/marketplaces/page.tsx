import { Suspense } from 'react'
import { getMarketplacesPaginated, getMarketplaceTotals } from '@/lib/marketplace-server'
import MarketplacesPageClient from './marketplaces-client'

export const metadata = {
  title: 'Plugin Marketplaces | Build with Claude',
  description: 'Discover community-maintained Claude Code plugin marketplaces. Browse registries with thousands of plugins, skills, and commands.',
}

export const dynamic = 'force-dynamic'

export default async function MarketplacesPage() {
  const [{ marketplaces, hasMore }, totals] = await Promise.all([
    getMarketplacesPaginated({ limit: 20, offset: 0 }),
    getMarketplaceTotals(),
  ])

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <MarketplacesPageClient
        initialMarketplaces={marketplaces}
        initialHasMore={hasMore}
        totals={totals}
      />
    </Suspense>
  )
}
