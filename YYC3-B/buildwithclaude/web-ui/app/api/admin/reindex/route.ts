import { NextRequest, NextResponse } from 'next/server'
import { indexMarketplaces } from '@/lib/indexer/marketplace-indexer'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max

export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.ADMIN_API_TOKEN

  if (!expectedToken) {
    return NextResponse.json({ error: 'Admin API not configured' }, { status: 503 })
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Manual reindex triggered')
    const result = await indexMarketplaces()

    return NextResponse.json({
      success: true,
      indexed: result.indexed,
      failed: result.failed,
      durationMs: result.durationMs,
    })
  } catch (error) {
    console.error('Reindex failed:', error)
    return NextResponse.json(
      { error: 'Indexing failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
