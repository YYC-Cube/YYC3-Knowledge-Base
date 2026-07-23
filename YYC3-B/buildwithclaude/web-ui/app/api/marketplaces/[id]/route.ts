import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { marketplaces, marketplaceStats } from '@/lib/db/schema'
import { eq, or, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Try to find by ID, namespace, or name
    const result = await db
      .select()
      .from(marketplaces)
      .where(or(eq(marketplaces.id, id), eq(marketplaces.namespace, id), eq(marketplaces.name, id)))
      .limit(1)

    if (result.length === 0) {
      return NextResponse.json({ error: 'Marketplace not found' }, { status: 404 })
    }

    const marketplace = result[0]

    // Get recent stats history (last 30 days)
    const stats = await db
      .select()
      .from(marketplaceStats)
      .where(eq(marketplaceStats.marketplaceId, marketplace.id))
      .orderBy(desc(marketplaceStats.recordedAt))
      .limit(30)

    // Transform to API response
    const response = {
      id: marketplace.id,
      name: marketplace.name,
      displayName: marketplace.displayName,
      namespace: marketplace.namespace,
      description: marketplace.description || '',
      url: marketplace.url || marketplace.repository,
      repository: marketplace.repository,
      installCommand:
        marketplace.installCommand || `/plugin marketplace add ${marketplace.namespace?.replace('@', '')}`,
      pluginCount: marketplace.pluginCount,
      skillCount: marketplace.skillCount,
      categories: marketplace.categories || [],
      badges: marketplace.badges || [],
      maintainer: {
        name: marketplace.maintainerName || marketplace.maintainerGithub || 'Unknown',
        github: marketplace.maintainerGithub || '',
      },
      stars: marketplace.stars,
      installs: marketplace.installs,
      verified: marketplace.verified,
      lastIndexedAt: marketplace.lastIndexedAt?.toISOString(),
      createdAt: marketplace.createdAt?.toISOString(),
      updatedAt: marketplace.updatedAt?.toISOString(),
      stats: stats.map((s) => ({
        pluginCount: s.pluginCount,
        skillCount: s.skillCount,
        stars: s.stars,
        recordedAt: s.recordedAt?.toISOString(),
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching marketplace:', error)
    return NextResponse.json({ error: 'Failed to fetch marketplace' }, { status: 500 })
  }
}
