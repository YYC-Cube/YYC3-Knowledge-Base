import { NextRequest, NextResponse } from 'next/server'
import { indexPlugins } from '@/lib/indexer/plugin-indexer'

export const dynamic = 'force-dynamic'

/**
 * Cron endpoint for plugin indexing
 * Scheduled to run daily at 7 AM UTC (after marketplace indexing)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Plugin indexer CRON started')
    const result = await indexPlugins()

    console.log(`Plugin indexer completed: ${result.indexed} indexed, ${result.failed} failed in ${result.durationMs}ms`)

    return NextResponse.json({
      success: true,
      indexed: result.indexed,
      failed: result.failed,
      skipped: result.skipped,
      durationMs: result.durationMs,
    })
  } catch (error) {
    console.error('Plugin CRON indexer failed:', error)
    return NextResponse.json(
      { error: 'Plugin indexing failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
