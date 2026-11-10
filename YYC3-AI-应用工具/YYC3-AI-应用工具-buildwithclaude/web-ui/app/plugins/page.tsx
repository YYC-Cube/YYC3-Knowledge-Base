import { Suspense } from 'react'
import { getPluginsPaginated, getPluginMarketplaces, getPluginCategories, getPluginOnlyCount } from '@/lib/plugin-db-server'
import PluginsPageClient from './plugins-client'

export const metadata = {
  title: 'Plugins | Build with Claude',
  description: 'Browse Claude Code plugins for development, AI-powered workflows, productivity, and more.',
}

export const dynamic = 'force-dynamic'

const ITEMS_PER_PAGE = 24 // 8 rows of 3 columns

export default async function PluginsPage() {
  const [{ plugins, hasMore }, marketplaces, categories, totalPlugins] = await Promise.all([
    getPluginsPaginated({ limit: ITEMS_PER_PAGE, offset: 0, sort: 'relevance', type: 'plugin' }),
    getPluginMarketplaces('plugin'),
    getPluginCategories(),
    getPluginOnlyCount(),
  ])

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <PluginsPageClient
        initialPlugins={plugins}
        initialHasMore={hasMore}
        categories={categories}
        totalPlugins={totalPlugins}
        marketplaces={marketplaces}
      />
    </Suspense>
  )
}
