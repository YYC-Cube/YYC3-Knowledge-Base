import { NextRequest, NextResponse } from 'next/server'
import { indexMarketplaces } from '@/lib/indexer/marketplace-indexer'

export const dynamic = 'force-dynamic'

/**
 * Cron endpoint for marketplace indexing
 * Scheduled to run daily at 6 AM UTC
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Marketplace indexer CRON started')
    const result = await indexMarketplaces()

    console.log(`Indexer completed: ${result.indexed} indexed, ${result.failed} failed in ${result.durationMs}ms`)

    return NextResponse.json({
      success: true,
      indexed: result.indexed,
      failed: result.failed,
      durationMs: result.durationMs,
    })
  } catch (error) {
    console.error('CRON indexer failed:', error)
    return NextResponse.json(
      { error: 'Indexing failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
