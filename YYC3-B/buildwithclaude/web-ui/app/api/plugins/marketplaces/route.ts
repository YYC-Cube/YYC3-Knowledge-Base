import { NextRequest, NextResponse } from 'next/server'
import { getPluginMarketplaces } from '@/lib/plugin-db-server'
import type { PluginType } from '@/lib/plugin-types'

export const dynamic = 'force-dynamic'

const validTypes: PluginType[] = ['subagent', 'command', 'hook', 'skill', 'plugin']

/**
 * GET /api/plugins/marketplaces
 * Get list of marketplaces for filter dropdown
 */
export async function GET(request: NextRequest) {
  try {
    const typeParam = request.nextUrl.searchParams.get('type') as PluginType | null
    const type = typeParam && validTypes.includes(typeParam) ? typeParam : undefined
    const marketplaces = await getPluginMarketplaces(type)

    return NextResponse.json({ marketplaces })
  } catch (error) {
    console.error('Error fetching plugin marketplaces:', error)
    return NextResponse.json(
      { error: 'Failed to fetch marketplaces' },
      { status: 500 }
    )
  }
}
