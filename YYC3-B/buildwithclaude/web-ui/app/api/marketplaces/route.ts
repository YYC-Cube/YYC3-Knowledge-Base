import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { marketplaces } from '@/lib/db/schema'
import { and, eq, ilike, or, desc, asc, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Query parameters
    const query = searchParams.get('q') || ''
    const category = searchParams.get('category')
    const badge = searchParams.get('badge')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const orderBy = searchParams.get('orderBy') || 'stars'
    const order = searchParams.get('order') || 'desc'

    // Build conditions
    const conditions = [eq(marketplaces.active, true)]

    if (query) {
      const searchTerm = `%${query.toLowerCase()}%`
      conditions.push(
        or(
          ilike(marketplaces.name, searchTerm),
          ilike(marketplaces.displayName, searchTerm),
          ilike(marketplaces.description, searchTerm),
          ilike(marketplaces.maintainerName, searchTerm)
        )!
      )
    }

    if (category) {
      conditions.push(sql`${category} = ANY(${marketplaces.categories})`)
    }

    if (badge) {
      conditions.push(sql`${badge} = ANY(${marketplaces.badges})`)
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(marketplaces)
      .where(and(...conditions))

    const total = Number(countResult[0]?.count || 0)

    // Get results
    const sortColumn = orderBy === 'name' ? marketplaces.displayName : marketplaces.stars
    const sortDir = order === 'asc' ? asc : desc

    const results = await db
      .select()
      .from(marketplaces)
      .where(and(...conditions))
      .orderBy(sortDir(sortColumn))
      .limit(limit)
      .offset(offset)

    // Transform to API response format (matching MarketplaceRegistry interface)
    const formattedMarketplaces = results.map((m) => ({
      id: m.id,
      name: m.name,
      displayName: m.displayName,
      description: m.description || '',
      url: m.url || m.repository,
      repository: m.repository,
      installCommand: m.installCommand || `/plugin marketplace add ${m.namespace?.replace('@', '')}`,
      pluginCount: m.pluginCount,
      skillCount: m.skillCount,
      categories: m.categories || [],
      badges: m.badges || [],
      maintainer: {
        name: m.maintainerName || m.maintainerGithub || 'Unknown',
        github: m.maintainerGithub || '',
      },
      stars: m.stars,
      installs: m.installs,
      verified: m.verified,
      lastIndexedAt: m.lastIndexedAt?.toISOString(),
      updatedAt: m.updatedAt?.toISOString(),
    }))

    return NextResponse.json({
      marketplaces: formattedMarketplaces,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching marketplaces:', error)
    return NextResponse.json({ error: 'Failed to fetch marketplaces' }, { status: 500 })
  }
}
