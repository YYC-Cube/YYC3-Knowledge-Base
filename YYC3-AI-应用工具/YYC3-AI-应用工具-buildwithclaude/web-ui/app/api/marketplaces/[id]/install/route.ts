import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { marketplaces, marketplaceInstallStats } from '@/lib/db/schema'
import { eq, sql, or } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// Simple in-memory rate limiting (per IP, per marketplace)
const rateLimit = new Map<string, number>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_INSTALLS_PER_MINUTE = 5

function isRateLimited(ip: string, marketplaceId: string): boolean {
  const key = `${ip}:${marketplaceId}`
  const now = Date.now()
  const lastInstall = rateLimit.get(key)

  // Clean old entries periodically
  if (rateLimit.size > 10000) {
    const cutoff = now - RATE_LIMIT_WINDOW_MS
    for (const [k, v] of rateLimit.entries()) {
      if (v < cutoff) rateLimit.delete(k)
    }
  }

  if (lastInstall && now - lastInstall < RATE_LIMIT_WINDOW_MS / MAX_INSTALLS_PER_MINUTE) {
    return true
  }

  rateLimit.set(key, now)
  return false
}

/**
 * POST /api/marketplaces/[id]/install
 * Record a marketplace installation
 *
 * Called by CLI when user installs a marketplace
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Get client IP for rate limiting (privacy-conscious - not stored)
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

    // Rate limit check
    if (isRateLimited(ip, id)) {
      return NextResponse.json({ error: 'Rate limited', message: 'Too many install requests' }, { status: 429 })
    }

    // Find marketplace by ID, namespace, or name
    const result = await db
      .select({ id: marketplaces.id })
      .from(marketplaces)
      .where(or(eq(marketplaces.id, id), eq(marketplaces.namespace, id), eq(marketplaces.name, id)))
      .limit(1)

    if (result.length === 0) {
      return NextResponse.json({ error: 'Marketplace not found' }, { status: 404 })
    }

    const marketplaceId = result[0].id

    // Increment install count (atomic operation)
    await db
      .update(marketplaces)
      .set({
        installs: sql`${marketplaces.installs} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(marketplaces.id, marketplaceId))

    // Update detailed stats
    await updateInstallStats(marketplaceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording install:', error)
    // Return success even on error - don't block CLI
    return NextResponse.json({ success: true, warning: 'Stats update failed' })
  }
}

async function updateInstallStats(marketplaceId: string) {
  const now = new Date()

  // Check if stats entry exists
  const existing = await db
    .select()
    .from(marketplaceInstallStats)
    .where(eq(marketplaceInstallStats.marketplaceId, marketplaceId))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(marketplaceInstallStats)
      .set({
        installsTotal: sql`${marketplaceInstallStats.installsTotal} + 1`,
        installsWeek: sql`${marketplaceInstallStats.installsWeek} + 1`,
        installsMonth: sql`${marketplaceInstallStats.installsMonth} + 1`,
        lastInstalledAt: now,
      })
      .where(eq(marketplaceInstallStats.marketplaceId, marketplaceId))
  } else {
    await db.insert(marketplaceInstallStats).values({
      marketplaceId,
      installsTotal: 1,
      installsWeek: 1,
      installsMonth: 1,
      lastInstalledAt: now,
    })
  }
}
