import { NextRequest, NextResponse } from 'next/server'
import { syncMCPServerStats } from '@/lib/indexer/mcp-server-indexer'

export const dynamic = 'force-dynamic'

/**
 * Cron endpoint for MCP server stats syncing
 * Scheduled to run daily at 8 AM UTC (after all indexing)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('MCP server stats sync CRON started')
    const result = await syncMCPServerStats()

    console.log(
      `MCP server stats sync completed: ${result.updated} updated, ${result.failed} failed in ${result.durationMs}ms`
    )

    return NextResponse.json({
      success: true,
      updated: result.updated,
      failed: result.failed,
      durationMs: result.durationMs,
    })
  } catch (error) {
    console.error('MCP server stats sync CRON failed:', error)
    return NextResponse.json(
      { error: 'MCP server stats sync failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
