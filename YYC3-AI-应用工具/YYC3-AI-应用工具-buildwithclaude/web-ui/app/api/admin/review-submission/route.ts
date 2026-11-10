import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { plugins, submissionReviews } from '@/lib/db/schema'
import { eq, desc, inArray } from 'drizzle-orm'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

/**
 * Verify admin access via CRON_SECRET header.
 */
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

/**
 * GET /api/admin/review-submission
 *
 * List flagged and pending submissions with scan details.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'flagged'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  const submissions = await db
    .select({
      id: plugins.id,
      name: plugins.name,
      namespace: plugins.namespace,
      description: plugins.description,
      repository: plugins.repository,
      submissionStatus: plugins.submissionStatus,
      createdAt: plugins.createdAt,
      // Latest review
      reviewId: submissionReviews.id,
      scanResult: submissionReviews.scanResult,
      reviewedBy: submissionReviews.reviewedBy,
      decision: submissionReviews.decision,
      reason: submissionReviews.reason,
      reviewedAt: submissionReviews.createdAt,
    })
    .from(plugins)
    .leftJoin(submissionReviews, eq(plugins.id, submissionReviews.pluginId))
    .where(
      status === 'all'
        ? inArray(plugins.submissionStatus, ['pending', 'flagged', 'rejected'])
        : eq(plugins.submissionStatus, status)
    )
    .orderBy(desc(plugins.createdAt))
    .limit(limit)

  // Group reviews by plugin
  const grouped = new Map<string, {
    plugin: {
      id: string
      name: string
      namespace: string
      description: string | null
      repository: string | null
      submissionStatus: string
      createdAt: Date
    }
    reviews: Array<{
      id: string
      scanResult: string | null
      reviewedBy: string
      decision: string
      reason: string | null
      reviewedAt: Date
    }>
  }>()

  for (const row of submissions) {
    if (!grouped.has(row.id)) {
      grouped.set(row.id, {
        plugin: {
          id: row.id,
          name: row.name,
          namespace: row.namespace,
          description: row.description,
          repository: row.repository,
          submissionStatus: row.submissionStatus,
          createdAt: row.createdAt,
        },
        reviews: [],
      })
    }

    if (row.reviewId) {
      grouped.get(row.id)!.reviews.push({
        id: row.reviewId,
        scanResult: row.scanResult,
        reviewedBy: row.reviewedBy!,
        decision: row.decision!,
        reason: row.reason,
        reviewedAt: row.reviewedAt!,
      })
    }
  }

  return NextResponse.json({
    submissions: Array.from(grouped.values()),
    count: grouped.size,
  })
}

// --- POST: Approve or reject a submission ---

const ReviewActionSchema = z.object({
  pluginId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(1000).optional(),
})

/**
 * POST /api/admin/review-submission
 *
 * Approve or reject a flagged submission.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parseResult = ReviewActionSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parseResult.error.issues },
      { status: 400 },
    )
  }

  const { pluginId, action, reason } = parseResult.data
  const newStatus = action === 'approve' ? 'approved' : 'rejected'

  // Update plugin status
  const updated = await db
    .update(plugins)
    .set({
      submissionStatus: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(plugins.id, pluginId))
    .returning({ id: plugins.id, name: plugins.name })

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Plugin not found' }, { status: 404 })
  }

  // Record the review
  await db.insert(submissionReviews).values({
    pluginId,
    scanResult: null,
    reviewedBy: 'admin',
    decision: newStatus,
    reason: reason || `Admin ${action}d`,
  })

  return NextResponse.json({
    success: true,
    plugin: updated[0],
    newStatus,
  })
}
