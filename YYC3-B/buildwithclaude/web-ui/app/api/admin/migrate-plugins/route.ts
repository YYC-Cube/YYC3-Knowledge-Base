import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { plugins, skills, marketplaces } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { promises as fs } from 'fs'
import path from 'path'
import { getAllSkills } from '@/lib/skills-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max

const LOCAL_MARKETPLACE = {
  name: 'buildwithclaude',
  displayName: 'Build with Claude',
  namespace: '@buildwithclaude/registry',
  repository: 'https://github.com/davepoon/buildwithclaude',
  badges: ['official'],
}

interface RegistryData {
  subagents?: Array<{
    name: string
    category: string
    description: string
    version: string
    file: string
    path: string
    tools?: string[]
    tags?: string[]
  }>
  commands?: Array<{
    name: string
    category: string
    description: string
    version: string
    file: string
    path: string
    argumentHint?: string
    model?: string
    prefix?: string
    tags?: string[]
  }>
  hooks?: Array<{
    name: string
    category: string
    description: string
    event: string
    matcher: string
    language: string
    version: string
    file: string
    path: string
    tags?: string[]
  }>
  externalPlugins?: Array<{
    name: string
    namespace: string
    description: string
    repository: string
    stars: number
    installCommand: string
    categories: string[]
    skills: string[]
    version: string
    author: string
    keywords: string[]
    updatedAt?: string
  }>
}

/**
 * POST /api/admin/migrate-plugins
 * Migrate existing registry.json plugins to the database
 */
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
    console.log('Starting plugin migration...')
    const startTime = Date.now()

    // Step 1: Create or get the local marketplace
    let localMarketplaceId: string

    const existingMarketplace = await db
      .select({ id: marketplaces.id })
      .from(marketplaces)
      .where(eq(marketplaces.namespace, LOCAL_MARKETPLACE.namespace))
      .limit(1)

    if (existingMarketplace.length > 0) {
      localMarketplaceId = existingMarketplace[0].id
      console.log('Using existing Build with Claude marketplace:', localMarketplaceId)
    } else {
      const inserted = await db
        .insert(marketplaces)
        .values({
          name: LOCAL_MARKETPLACE.name,
          displayName: LOCAL_MARKETPLACE.displayName,
          namespace: LOCAL_MARKETPLACE.namespace,
          repository: LOCAL_MARKETPLACE.repository,
          badges: LOCAL_MARKETPLACE.badges,
          verified: true,
          active: true,
          pluginCount: 0,
          skillCount: 0,
          stars: 0,
        })
        .returning({ id: marketplaces.id })

      localMarketplaceId = inserted[0].id
      console.log('Created Build with Claude marketplace:', localMarketplaceId)
    }

    // Step 2: Read registry.json
    const registryPath = path.join(process.cwd(), 'public', 'registry.json')
    const registryData = await fs.readFile(registryPath, 'utf-8')
    const registry: RegistryData = JSON.parse(registryData)

    let migratedCount = 0
    let failedCount = 0
    let skillsCount = 0

    // Step 3: Migrate subagents
    for (const subagent of registry.subagents || []) {
      try {
        await db
          .insert(plugins)
          .values({
            name: subagent.name,
            namespace: `@buildwithclaude/${subagent.name}`,
            slug: createSlug(subagent.name),
            marketplaceId: localMarketplaceId,
            marketplaceName: LOCAL_MARKETPLACE.displayName,
            repository: `${LOCAL_MARKETPLACE.repository}/tree/main/plugins/${subagent.file}`,
            description: subagent.description,
            version: subagent.version,
            author: 'buildwithclaude',
            type: 'subagent',
            categories: subagent.category ? [subagent.category] : [],
            keywords: subagent.tags || [],
            installCommand: `bwc add --subagent ${subagent.name}`,
            stars: 0,
            lastIndexedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: plugins.namespace,
            set: {
              description: sql`EXCLUDED.description`,
              version: sql`EXCLUDED.version`,
              categories: sql`EXCLUDED.categories`,
              keywords: sql`EXCLUDED.keywords`,
              lastIndexedAt: sql`EXCLUDED.last_indexed_at`,
              updatedAt: sql`NOW()`,
            },
          })
        migratedCount++
      } catch (error) {
        console.error(`Failed to migrate subagent ${subagent.name}:`, error)
        failedCount++
      }
    }

    // Step 4: Migrate commands
    for (const command of registry.commands || []) {
      try {
        await db
          .insert(plugins)
          .values({
            name: command.name,
            namespace: `@buildwithclaude/${command.name}`,
            slug: createSlug(command.name),
            marketplaceId: localMarketplaceId,
            marketplaceName: LOCAL_MARKETPLACE.displayName,
            repository: `${LOCAL_MARKETPLACE.repository}/tree/main/plugins/${command.file}`,
            description: command.description,
            version: command.version,
            author: 'buildwithclaude',
            type: 'command',
            categories: command.category ? [command.category] : [],
            keywords: command.tags || [],
            installCommand: `bwc add --command ${command.name}`,
            stars: 0,
            lastIndexedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: plugins.namespace,
            set: {
              description: sql`EXCLUDED.description`,
              version: sql`EXCLUDED.version`,
              categories: sql`EXCLUDED.categories`,
              keywords: sql`EXCLUDED.keywords`,
              lastIndexedAt: sql`EXCLUDED.last_indexed_at`,
              updatedAt: sql`NOW()`,
            },
          })
        migratedCount++
      } catch (error) {
        console.error(`Failed to migrate command ${command.name}:`, error)
        failedCount++
      }
    }

    // Step 5: Migrate hooks
    for (const hook of registry.hooks || []) {
      try {
        await db
          .insert(plugins)
          .values({
            name: hook.name,
            namespace: `@buildwithclaude/${hook.name}`,
            slug: createSlug(hook.name),
            marketplaceId: localMarketplaceId,
            marketplaceName: LOCAL_MARKETPLACE.displayName,
            repository: `${LOCAL_MARKETPLACE.repository}/tree/main/plugins/${hook.file}`,
            description: hook.description,
            version: hook.version,
            author: 'buildwithclaude',
            type: 'hook',
            categories: hook.category ? [hook.category] : [],
            keywords: hook.tags || [],
            installCommand: `bwc add --hook ${hook.name}`,
            stars: 0,
            lastIndexedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: plugins.namespace,
            set: {
              description: sql`EXCLUDED.description`,
              version: sql`EXCLUDED.version`,
              categories: sql`EXCLUDED.categories`,
              keywords: sql`EXCLUDED.keywords`,
              lastIndexedAt: sql`EXCLUDED.last_indexed_at`,
              updatedAt: sql`NOW()`,
            },
          })
        migratedCount++
      } catch (error) {
        console.error(`Failed to migrate hook ${hook.name}:`, error)
        failedCount++
      }
    }

    // Step 6: Migrate skills from file system
    try {
      const allSkills = getAllSkills()
      for (const skill of allSkills) {
        try {
          await db
            .insert(skills)
            .values({
              name: skill.name,
              slug: skill.slug,
              marketplaceId: localMarketplaceId,
              marketplaceName: LOCAL_MARKETPLACE.displayName,
              repository: `${LOCAL_MARKETPLACE.repository}/tree/main/plugins/all-skills/skills/${skill.slug}`,
              description: skill.description,
              category: skill.category,
              lastIndexedAt: new Date(),
            })
            .onConflictDoNothing()
          skillsCount++
        } catch (error) {
          console.error(`Failed to migrate skill ${skill.name}:`, error)
        }
      }
    } catch (error) {
      console.error('Failed to get skills:', error)
    }

    // Step 7: Migrate external plugins (if any)
    for (const external of registry.externalPlugins || []) {
      try {
        // Create or get the "Community" marketplace for external plugins
        let communityMarketplaceId: string

        const existingCommunity = await db
          .select({ id: marketplaces.id })
          .from(marketplaces)
          .where(eq(marketplaces.namespace, '@community/plugins'))
          .limit(1)

        if (existingCommunity.length > 0) {
          communityMarketplaceId = existingCommunity[0].id
        } else {
          const inserted = await db
            .insert(marketplaces)
            .values({
              name: 'community',
              displayName: 'Community',
              namespace: '@community/plugins',
              repository: 'https://github.com',
              badges: [],
              verified: false,
              active: true,
              pluginCount: 0,
              skillCount: 0,
              stars: 0,
            })
            .returning({ id: marketplaces.id })

          communityMarketplaceId = inserted[0].id
        }

        await db
          .insert(plugins)
          .values({
            name: external.name,
            namespace: `@${external.namespace}/${external.name}`,
            slug: createSlug(external.name),
            marketplaceId: communityMarketplaceId,
            marketplaceName: 'Community',
            repository: external.repository,
            description: external.description,
            version: external.version,
            author: external.author,
            type: 'plugin',
            categories: external.categories || [],
            keywords: external.keywords || [],
            installCommand: external.installCommand,
            stars: external.stars || 0,
            lastIndexedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: plugins.namespace,
            set: {
              description: sql`EXCLUDED.description`,
              version: sql`EXCLUDED.version`,
              author: sql`EXCLUDED.author`,
              categories: sql`EXCLUDED.categories`,
              keywords: sql`EXCLUDED.keywords`,
              stars: sql`EXCLUDED.stars`,
              lastIndexedAt: sql`EXCLUDED.last_indexed_at`,
              updatedAt: sql`NOW()`,
            },
          })
        migratedCount++
      } catch (error) {
        console.error(`Failed to migrate external plugin ${external.name}:`, error)
        failedCount++
      }
    }

    // Step 8: Update marketplace plugin counts
    const pluginCounts = await db
      .select({
        marketplaceId: plugins.marketplaceId,
        count: sql<number>`count(*)`,
      })
      .from(plugins)
      .where(eq(plugins.active, true))
      .groupBy(plugins.marketplaceId)

    for (const pc of pluginCounts) {
      if (pc.marketplaceId) {
        await db
          .update(marketplaces)
          .set({ pluginCount: Number(pc.count) })
          .where(eq(marketplaces.id, pc.marketplaceId))
      }
    }

    const durationMs = Date.now() - startTime

    console.log(`Migration complete: ${migratedCount} plugins, ${skillsCount} skills, ${failedCount} failed in ${durationMs}ms`)

    return NextResponse.json({
      success: true,
      migratedPlugins: migratedCount,
      migratedSkills: skillsCount,
      failed: failedCount,
      durationMs,
    })
  } catch (error) {
    console.error('Migration failed:', error)
    return NextResponse.json(
      { error: 'Migration failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
