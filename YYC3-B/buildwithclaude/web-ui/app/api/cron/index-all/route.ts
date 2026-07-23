import { NextRequest, NextResponse } from 'next/server'
import { indexMCPServers, syncMCPServerStats } from '@/lib/indexer/mcp-server-indexer'
import { indexMarketplaces } from '@/lib/indexer/marketplace-indexer'
import { indexPlugins } from '@/lib/indexer/plugin-indexer'
import { tasks } from '@trigger.dev/sdk/v3'
import type { indexPluginsTask } from '@/trigger/index-plugins'

export const dynamic = 'force-dynamic'

// Whether to use trigger.dev for plugin indexing (background processing)
const USE_TRIGGER_DEV = process.env.TRIGGER_SECRET_KEY ? true : false

/**
 * Task names for logging and API responses
 */
const TASK_NAMES = {
  mcp: 'MCP servers',
  marketplaces: 'Marketplaces',
  plugins: 'Plugins',
  stats: 'MCP server stats',
} as const

type TaskType = keyof typeof TASK_NAMES

/**
 * Day-of-week to task mapping
 * 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
 */
const DAY_TO_TASK: Record<number, TaskType | null> = {
  0: 'stats',       // Sunday: MCP stats
  1: 'mcp',         // Monday: MCP servers
  2: 'marketplaces', // Tuesday: Marketplaces
  3: 'plugins',     // Wednesday: Plugins
  4: 'stats',       // Thursday: MCP stats
  5: 'marketplaces', // Friday: Marketplaces
  6: 'plugins',     // Saturday: Plugins
}

/**
 * Unified cron endpoint for all indexing tasks
 * Scheduled to run daily at 5 AM UTC
 *
 * Tasks rotate by day of week:
 * - Sunday: Sync MCP server stats
 * - Monday: Index MCP servers (Official Registry + Docker Hub)
 * - Tuesday: Index plugin marketplaces
 * - Wednesday: Index plugins from marketplaces
 * - Thursday: Sync MCP server stats
 * - Friday: Index plugin marketplaces
 * - Saturday: Index plugins from marketplaces
 *
 * Manual override: Add ?task=mcp|marketplaces|plugins|stats to run specific task
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()

  // Check for manual task override via query parameter
  const taskOverride = request.nextUrl.searchParams.get('task') as TaskType | null
  const dayOfWeek = new Date().getUTCDay()
  const scheduledTask = DAY_TO_TASK[dayOfWeek]

  // Use override if provided, otherwise use scheduled task
  const taskToRun = taskOverride || scheduledTask

  console.log(`Cron started - Day: ${dayOfWeek}, Scheduled: ${scheduledTask || 'none'}, Override: ${taskOverride || 'none'}`)

  // No task scheduled for today and no override
  if (!taskToRun) {
    console.log(`Day ${dayOfWeek}: No indexing scheduled`)
    return NextResponse.json({
      success: true,
      skipped: true,
      day: dayOfWeek,
      message: 'No indexing scheduled for today',
    })
  }

  const results: Record<string, unknown> = {}
  const errors: string[] = []

  try {
    console.log(`Running task: ${TASK_NAMES[taskToRun]}`)

    switch (taskToRun) {
      case 'mcp':
        results.mcpServers = await indexMCPServers()
        break
      case 'marketplaces':
        results.marketplaces = await indexMarketplaces()
        break
      case 'plugins':
        if (USE_TRIGGER_DEV) {
          // Trigger background task via trigger.dev - returns immediately
          const handle = await tasks.trigger<typeof indexPluginsTask>('index-plugins', {})
          console.log(`Triggered plugin indexing task: ${handle.id}`)
          results.plugins = {
            triggered: true,
            taskId: handle.id,
            message: 'Plugin indexing started as background task',
          }
        } else {
          // Fallback to inline execution
          results.plugins = await indexPlugins()
        }
        break
      case 'stats':
        results.mcpStats = await syncMCPServerStats()
        break
      default:
        // TypeScript exhaustiveness check
        const _exhaustive: never = taskToRun
        throw new Error(`Unknown task: ${_exhaustive}`)
    }
  } catch (error) {
    console.error(`${TASK_NAMES[taskToRun]} indexing failed:`, error)
    errors.push(`${taskToRun}: ${error instanceof Error ? error.message : String(error)}`)
  }

  const durationMs = Date.now() - startTime
  console.log(`Cron completed in ${durationMs}ms - Task: ${TASK_NAMES[taskToRun]}`)

  return NextResponse.json({
    success: errors.length === 0,
    task: taskToRun,
    taskName: TASK_NAMES[taskToRun],
    day: dayOfWeek,
    isOverride: !!taskOverride,
    durationMs,
    results,
    errors: errors.length > 0 ? errors : undefined,
  })
}
