import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { plugins, submissionReviews } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { analyzeRepository } from '@/lib/indexer/repo-analyzer'
import { scanSkillContent, getSubmissionStatus } from '@/lib/indexer/content-scanner'
import { normalizeSkillCategory, smartCategorizeSkill } from '@/lib/category-utils'

export const dynamic = 'force-dynamic'

// --- Rate limiting ---

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_SUBMISSIONS_PER_HOUR = 3

// Map<ip, timestamp[]>
const rateLimitMap = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()

  // Periodic cleanup
  if (rateLimitMap.size > 10000) {
    const cutoff = now - RATE_LIMIT_WINDOW_MS
    for (const [k, timestamps] of rateLimitMap.entries()) {
      const recent = timestamps.filter(t => t > cutoff)
      if (recent.length === 0) rateLimitMap.delete(k)
      else rateLimitMap.set(k, recent)
    }
  }

  const timestamps = rateLimitMap.get(ip) || []
  const cutoff = now - RATE_LIMIT_WINDOW_MS
  const recent = timestamps.filter(t => t > cutoff)

  if (recent.length >= MAX_SUBMISSIONS_PER_HOUR) {
    return true
  }

  recent.push(now)
  rateLimitMap.set(ip, recent)
  return false
}

// --- Validation ---

const GITHUB_URL_REGEX = /^https?:\/\/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)/

const SubmitBodySchema = z.object({
  url: z.string().url().max(500),
  mode: z.enum(['analyze', 'confirm']).optional().default('confirm'),
  skills: z.array(z.object({
    name: z.string(),
    category: z.string(),
  })).optional(),
})

/**
 * Extract owner/repo from a GitHub URL.
 * Handles .git suffix, trailing slashes, /tree/... paths.
 */
function extractRepoFullName(url: string): string | null {
  const match = url.match(GITHUB_URL_REGEX)
  if (!match) return null

  const owner = match[1]
  let repo = match[2]

  // Strip .git suffix
  repo = repo.replace(/\.git$/, '')

  return `${owner}/${repo}`
}

// --- Constants ---

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours
const MAX_SKILLS_PER_REPO = 50

/**
 * POST /api/skills/submit
 *
 * Submit a GitHub URL to analyze and index skills from the repository.
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

    // Rate limit check
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Rate limited', message: 'Please wait before submitting again (max 3 per hour)' },
        { status: 429 },
      )
    }

    // Parse and validate body
    const body = await request.json()
    const parseResult = SubmitBodySchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Please provide a valid URL' },
        { status: 400 },
      )
    }

    const { url, mode, skills: userSkills } = parseResult.data

    // Validate GitHub URL
    const repoFullName = extractRepoFullName(url)
    if (!repoFullName) {
      return NextResponse.json(
        { error: 'Invalid URL', message: 'URL must be a GitHub repository (https://github.com/owner/repo)' },
        { status: 400 },
      )
    }

    // Check deduplication — if recently indexed, return existing data
    const repoUrl = `https://github.com/${repoFullName}`

    const existing = await db
      .select({
        name: plugins.name,
        namespace: plugins.namespace,
        lastIndexedAt: plugins.lastIndexedAt,
        submissionStatus: plugins.submissionStatus,
      })
      .from(plugins)
      .where(and(eq(plugins.repository, repoUrl), eq(plugins.type, 'skill')))

    if (existing.length > 0 && existing[0].lastIndexedAt) {
      const timeSinceIndex = Date.now() - existing[0].lastIndexedAt.getTime()
      if (timeSinceIndex < DEDUP_WINDOW_MS) {
        return NextResponse.json({
          success: true,
          message: 'Repository was recently indexed',
          deduplicated: true,
          skills: existing.map(s => ({ name: s.name, status: s.submissionStatus })),
        })
      }
    }

    // Analyze repository
    let analysis
    try {
      analysis = await analyzeRepository(repoFullName)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('404')) {
        return NextResponse.json(
          { error: 'Not found', message: 'Repository not found on GitHub' },
          { status: 404 },
        )
      }
      if (/rate limit/i.test(message)) {
        return NextResponse.json(
          { error: 'Rate limited', message: 'GitHub API rate limit reached. Please try again in a few minutes.' },
          { status: 503 },
        )
      }
      if (/circuit breaker/i.test(message)) {
        return NextResponse.json(
          { error: 'Service unavailable', message: 'Service temporarily unavailable. Please try again in a few minutes.' },
          { status: 503 },
        )
      }
      if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(message)) {
        return NextResponse.json(
          { error: 'Network error', message: 'Unable to reach GitHub. Please check the URL and try again.' },
          { status: 502 },
        )
      }
      throw error
    }

    if (analysis.skills.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No skills found in this repository. Make sure the repo contains SKILL.md files, a skills/ directory, or a marketplace.json.',
        detectionMethod: analysis.detectionMethod,
      })
    }

    // Analyze mode: return discovered skills without saving
    if (mode === 'analyze') {
      return NextResponse.json({
        success: true,
        message: `Found ${analysis.skills.length} skill${analysis.skills.length !== 1 ? 's' : ''}`,
        skills: analysis.skills.slice(0, MAX_SKILLS_PER_REPO).map(s => ({
          name: s.name,
          slug: s.slug,
          description: s.description,
          category: s.category || 'uncategorized',
        })),
        detectionMethod: analysis.detectionMethod,
      })
    }

    // Confirm mode: apply user-provided categories if present
    if (userSkills && userSkills.length > 0) {
      const categoryOverrides = new Map(userSkills.map(s => [s.name, s.category]))
      for (const skill of analysis.skills) {
        const override = categoryOverrides.get(skill.name)
        if (override) {
          skill.category = normalizeSkillCategory(override)
        }
      }
    }

    // Process each discovered skill: scan, upsert, record review
    const results: Array<{
      name: string
      status: string
      reason?: string
    }> = []

    for (const skill of analysis.skills.slice(0, MAX_SKILLS_PER_REPO)) {
      // Scan content
      const scanResult = scanSkillContent(skill.content || skill.description, {
        name: skill.name,
        description: skill.description,
        installCommand: skill.installCommand,
      })

      const status = getSubmissionStatus(scanResult)
      const skillNamespace = `@${analysis.owner}/${skill.slug}`

      // Upsert into plugins table
      const upserted = await db
        .insert(plugins)
        .values({
          name: skill.name,
          namespace: skillNamespace,
          slug: skill.slug,
          marketplaceName: analysis.owner,
          repository: repoUrl,
          description: skill.description,
          author: analysis.owner,
          type: 'skill',
          categories: [smartCategorizeSkill(skill.category, skill.name, skill.description)],
          keywords: [],
          installCommand: skill.installCommand || `npx skills add ${repoFullName}`,
          stars: analysis.stars,
          submissionStatus: status,
          lastIndexedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: plugins.namespace,
          set: {
            name: sql`EXCLUDED.name`,
            marketplaceName: sql`EXCLUDED.marketplace_name`,
            description: sql`EXCLUDED.description`,
            author: sql`EXCLUDED.author`,
            categories: sql`EXCLUDED.categories`,
            installCommand: sql`EXCLUDED.install_command`,
            stars: sql`EXCLUDED.stars`,
            submissionStatus: sql`EXCLUDED.submission_status`,
            lastIndexedAt: sql`EXCLUDED.last_indexed_at`,
            updatedAt: sql`NOW()`,
          },
        })
        .returning({ id: plugins.id })

      // Insert scan review record
      if (upserted.length > 0) {
        const reason = status === 'rejected'
          ? `Rejected: ${scanResult.flags.filter(f => f.severity === 'critical').map(f => f.detail).join('; ')}`
          : status === 'flagged'
            ? `Flagged: ${scanResult.flags.map(f => f.detail).join('; ')}`
            : undefined

        await db.insert(submissionReviews).values({
          pluginId: upserted[0].id,
          scanResult: JSON.stringify(scanResult),
          reviewedBy: 'auto-scanner',
          decision: status,
          reason,
        })

        results.push({ name: skill.name, status, reason })
      }
    }

    // Build response message
    const approved = results.filter(r => r.status === 'approved')
    const flagged = results.filter(r => r.status === 'flagged')
    const rejected = results.filter(r => r.status === 'rejected')

    let message: string
    if (rejected.length > 0 && approved.length === 0 && flagged.length === 0) {
      message = `Skill rejected: ${rejected[0].reason || 'Security concerns detected'}`
    } else if (flagged.length > 0 && approved.length === 0) {
      message = 'Skill submitted for review'
    } else {
      message = `Successfully added ${approved.length} skill${approved.length !== 1 ? 's' : ''}`
      if (flagged.length > 0) message += `, ${flagged.length} pending review`
      if (rejected.length > 0) message += `, ${rejected.length} rejected`
    }

    return NextResponse.json({
      success: approved.length > 0 || flagged.length > 0,
      message,
      skills: results,
      detectionMethod: analysis.detectionMethod,
    })
  } catch (error) {
    console.error('Error processing skill submission:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parse error', message: 'Received unexpected data from GitHub. This is usually temporary — please try again.' },
        { status: 502 },
      )
    }

    const message = error instanceof Error ? error.message : ''

    if (/rate limit/i.test(message)) {
      return NextResponse.json(
        { error: 'Rate limited', message: 'GitHub API rate limit reached. Please try again in a few minutes.' },
        { status: 503 },
      )
    }

    if (/circuit breaker/i.test(message)) {
      return NextResponse.json(
        { error: 'Service unavailable', message: 'Service temporarily unavailable. Please try again in a few minutes.' },
        { status: 503 },
      )
    }

    if (/connection|ECONNREFUSED|relation|duplicate key|violates|timeout/i.test(message)) {
      return NextResponse.json(
        { error: 'Database error', message: 'A database error occurred. Please try again later.' },
        { status: 500 },
      )
    }

    return NextResponse.json(
      { error: 'Internal error', message: 'An unexpected error occurred. Please try again later.' },
      { status: 500 },
    )
  }
}
