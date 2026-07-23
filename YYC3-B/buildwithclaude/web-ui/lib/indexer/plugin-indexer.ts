import { db } from '@/lib/db/client'
import { plugins, skills, marketplaces } from '@/lib/db/schema'
import { getGitHubClient } from '@/lib/github/client'
import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { expandSkillCollection } from './skill-expander'

// Plugin schema for GitHub marketplace data
const PluginSchema = z.object({
  id: z.string(),
  name: z.string(),
  namespace: z.string(),
  version: z.string().optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  keywords: z.array(z.string()).optional().nullable(),
  skills: z.array(z.string()).optional().nullable(),
  author: z.string().optional().nullable(),
  gitUrl: z.string().optional().nullable(),
  stars: z.number().optional().default(0),
  downloads: z.number().optional().default(0),
  verified: z.boolean().optional().default(false),
  metadata: z.object({
    homepage: z.string().optional().nullable(),
    repository: z.string().optional().nullable(),
    license: z.string().optional().nullable(),
    commands: z.union([z.array(z.string()), z.record(z.string(), z.unknown())]).optional().nullable(),
    agents: z.union([z.array(z.string()), z.record(z.string(), z.unknown())]).optional().nullable(),
    mcpServers: z.union([z.array(z.string()), z.record(z.string(), z.unknown())]).optional().nullable(),
  }).passthrough().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

type Plugin = z.infer<typeof PluginSchema>

export interface PluginIndexResult {
  indexed: number
  failed: number
  skipped: number
  durationMs: number
}

/**
 * Fetch plugins from GitHub repository marketplace.json
 */
async function fetchGitHubMarketplacePlugins(repoFullName: string): Promise<Plugin[]> {
  const github = getGitHubClient()
  const plugins: Plugin[] = []

  // Try standard paths for marketplace.json
  const paths = [
    '.claude-plugin/marketplace.json',
    'marketplace.json',
    'plugins.json',
    'registry.json',
  ]

  for (const path of paths) {
    try {
      const content = await github.fetchFileContent(repoFullName, path)
      const data = JSON.parse(content)

      // Handle different formats
      if (data.plugins && Array.isArray(data.plugins)) {
        // Standard marketplace.json format
        for (const plugin of data.plugins) {
          plugins.push({
            id: `${repoFullName}/${plugin.name || plugin.slug}`,
            name: plugin.name || plugin.slug,
            namespace: repoFullName.split('/')[0],
            version: plugin.version,
            description: plugin.description,
            category: plugin.category,
            keywords: plugin.keywords || plugin.tags,
            skills: plugin.skills,
            author: plugin.author || repoFullName.split('/')[0],
            gitUrl: plugin.repository || `https://github.com/${repoFullName}`,
            stars: 0,
            downloads: 0,
            verified: false,
          })
        }
        break
      } else if (data.subagents || data.commands || data.hooks) {
        // buildwithclaude registry.json format
        for (const subagent of data.subagents || []) {
          if (!subagent.name) {
            console.warn(`Skipping subagent without name in ${repoFullName}`)
            continue
          }
          plugins.push({
            id: `${repoFullName}/subagent/${subagent.name}`,
            name: subagent.name,
            namespace: repoFullName.split('/')[0],
            version: subagent.version,
            description: subagent.description,
            category: subagent.category || 'subagent',
            keywords: subagent.tags,
            skills: [],
            author: repoFullName.split('/')[0],
            gitUrl: `https://github.com/${repoFullName}`,
            stars: 0,
            downloads: 0,
            verified: false,
            metadata: {
              agents: [subagent.name],
            },
          })
        }
        for (const command of data.commands || []) {
          if (!command.name) {
            console.warn(`Skipping command without name in ${repoFullName}`)
            continue
          }
          plugins.push({
            id: `${repoFullName}/command/${command.name}`,
            name: command.name,
            namespace: repoFullName.split('/')[0],
            version: command.version,
            description: command.description,
            category: command.category || 'command',
            keywords: command.tags,
            skills: [],
            author: repoFullName.split('/')[0],
            gitUrl: `https://github.com/${repoFullName}`,
            stars: 0,
            downloads: 0,
            verified: false,
            metadata: {
              commands: [command.name],
            },
          })
        }
        for (const hook of data.hooks || []) {
          if (!hook.name) {
            console.warn(`Skipping hook without name in ${repoFullName}`)
            continue
          }
          plugins.push({
            id: `${repoFullName}/hook/${hook.name}`,
            name: hook.name,
            namespace: repoFullName.split('/')[0],
            version: hook.version,
            description: hook.description,
            category: hook.category || 'hook',
            keywords: hook.tags,
            skills: [],
            author: repoFullName.split('/')[0],
            gitUrl: `https://github.com/${repoFullName}`,
            stars: 0,
            downloads: 0,
            verified: false,
          })
        }
        for (const skill of data.skills || []) {
          if (!skill.name) {
            console.warn(`Skipping skill without name in ${repoFullName}`)
            continue
          }
          plugins.push({
            id: `${repoFullName}/skill/${skill.name}`,
            name: skill.name,
            namespace: repoFullName.split('/')[0],
            version: skill.version,
            description: skill.description,
            category: skill.category || 'skill',
            keywords: skill.tags,
            skills: [],
            author: repoFullName.split('/')[0],
            gitUrl: `https://github.com/${repoFullName}`,
            stars: 0,
            downloads: 0,
            verified: false,
          })
        }
        // Process actual Claude Code plugins (directories with .claude-plugin/plugin.json)
        for (const plugin of data.plugins || []) {
          if (!plugin.name) {
            console.warn(`Skipping plugin without name in ${repoFullName}`)
            continue
          }
          plugins.push({
            id: `${repoFullName}/plugin/${plugin.name}`,
            name: plugin.name,
            namespace: repoFullName.split('/')[0],
            version: plugin.version,
            description: plugin.description,
            category: 'plugin',
            keywords: plugin.keywords || [],
            skills: [],
            author: typeof plugin.author === 'object' ? plugin.author?.name : plugin.author || repoFullName.split('/')[0],
            gitUrl: plugin.repository || `https://github.com/${repoFullName}`,
            stars: 0,
            downloads: 0,
            verified: false,
            metadata: {
              installCommand: plugin.installCommand,
              file: plugin.file,
            },
          })
        }
        break
      }
    } catch {
      // Try next path
      continue
    }
  }

  return plugins
}

/**
 * Index plugins from all active marketplaces
 */
export async function indexPlugins(): Promise<PluginIndexResult> {
  const startTime = Date.now()
  let indexed = 0
  let failed = 0
  let skipped = 0

  // Get all active marketplaces
  const activeMarketplaces = await db
    .select({
      id: marketplaces.id,
      name: marketplaces.name,
      displayName: marketplaces.displayName,
      repository: marketplaces.repository,
      namespace: marketplaces.namespace,
    })
    .from(marketplaces)
    .where(eq(marketplaces.active, true))

  console.log(`Indexing plugins from ${activeMarketplaces.length} marketplaces...`)

  const MAX_SKILL_EXPANSIONS = 10
  const expandedRepos = new Set<string>()
  let expansionCount = 0

  for (const marketplace of activeMarketplaces) {
    // Skip Build with Claude - loaded from local files in hybrid approach
    if (marketplace.name === 'davepoon/buildwithclaude' ||
        marketplace.displayName === 'Build with Claude') {
      console.log(`Skipping ${marketplace.displayName} - plugins loaded from local files`)
      skipped++
      continue
    }

    try {
      // Fetch plugins from GitHub repository
      const repoPath = marketplace.repository.replace('https://github.com/', '')
      const fetchedPlugins = await fetchGitHubMarketplacePlugins(repoPath)

      console.log(`Fetched ${fetchedPlugins.length} plugins from ${marketplace.displayName}`)

      // Expand skill collections into individual skills
      const expandedPlugins: Plugin[] = []
      const collectionNamespaces: Set<string> = new Set()

      for (const plugin of fetchedPlugins) {
        const pluginType = determinePluginType(plugin)
        const isExternalSkillRepo = pluginType === 'skill'
          && plugin.gitUrl
          && plugin.gitUrl !== marketplace.repository
          && expansionCount < MAX_SKILL_EXPANSIONS

        if (isExternalSkillRepo) {
          try {
            const expanded = await expandSkillCollection(
              plugin.gitUrl!,
              marketplace.repository,
              expandedRepos,
            )
            if (expanded && expanded.length > 0) {
              expansionCount++
              // Track the collection namespace so we can deactivate it
              collectionNamespaces.add(`@${plugin.namespace}/${plugin.name}`)

              // Replace single collection entry with individual skill entries
              for (const skill of expanded) {
                expandedPlugins.push({
                  id: `${plugin.namespace}/${skill.slug}`,
                  name: skill.name,
                  namespace: plugin.namespace,
                  description: skill.description,
                  category: skill.category || plugin.category,
                  keywords: plugin.keywords,
                  skills: [],
                  author: skill.owner || plugin.author,
                  gitUrl: skill.repoUrl,
                  stars: skill.stars,
                  downloads: 0,
                  verified: false,
                })
              }
              console.log(`Expanded ${plugin.name} into ${expanded.length} individual skills`)
              continue
            }
          } catch (error) {
            console.error(`Failed to expand skill collection ${plugin.name}:`, error)
          }
        }

        // Keep non-skill or non-expandable plugins as-is
        expandedPlugins.push(plugin)
      }

      // Deactivate parent collection entries that were expanded
      for (const ns of collectionNamespaces) {
        try {
          await db
            .update(plugins)
            .set({ active: false, updatedAt: new Date() })
            .where(and(eq(plugins.namespace, ns), eq(plugins.type, 'skill')))
        } catch (error) {
          console.error(`Failed to deactivate collection entry ${ns}:`, error)
        }
      }

      // Upsert plugins into database
      for (const plugin of expandedPlugins) {
        try {
          const slug = createSlug(plugin.name)
          const pluginType = determinePluginType(plugin)

          await db
            .insert(plugins)
            .values({
              name: plugin.name,
              namespace: `@${plugin.namespace}/${plugin.name}`,
              slug,
              marketplaceId: marketplace.id,
              marketplaceName: marketplace.displayName,
              repository: plugin.gitUrl || marketplace.repository,
              description: plugin.description || '',
              version: plugin.version,
              author: plugin.author || plugin.namespace,
              type: pluginType,
              categories: plugin.category ? [plugin.category] : [],
              keywords: plugin.keywords || [],
              installCommand: `bwc add --plugin ${plugin.namespace}/${plugin.name}`,
              stars: plugin.stars,
              lastIndexedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: plugins.namespace,
              set: {
                description: sql`EXCLUDED.description`,
                version: sql`EXCLUDED.version`,
                author: sql`EXCLUDED.author`,
                type: sql`EXCLUDED.type`,
                categories: sql`EXCLUDED.categories`,
                keywords: sql`EXCLUDED.keywords`,
                stars: sql`EXCLUDED.stars`,
                lastIndexedAt: sql`EXCLUDED.last_indexed_at`,
                updatedAt: sql`NOW()`,
              },
            })

          // Index skills if present
          if (plugin.skills && plugin.skills.length > 0) {
            for (const skillName of plugin.skills) {
              try {
                const skillSlug = createSlug(skillName)

                await db
                  .insert(skills)
                  .values({
                    name: skillName,
                    slug: skillSlug,
                    marketplaceId: marketplace.id,
                    marketplaceName: marketplace.displayName,
                    repository: plugin.gitUrl || marketplace.repository,
                    description: `Skill from ${plugin.name}`,
                    category: plugin.category,
                    lastIndexedAt: new Date(),
                  })
                  .onConflictDoNothing()
              } catch (skillError) {
                console.error(`Failed to index skill ${skillName}:`, skillError)
              }
            }
          }

          indexed++
        } catch (pluginError) {
          console.error(`Failed to index plugin ${plugin.name}:`, pluginError)
          failed++
        }
      }

      // Update marketplace plugin count
      await db
        .update(marketplaces)
        .set({
          pluginCount: expandedPlugins.length,
          lastIndexedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(marketplaces.id, marketplace.id))

    } catch (marketplaceError) {
      console.error(`Failed to index marketplace ${marketplace.displayName}:`, marketplaceError)
      failed++
    }
  }

  return {
    indexed,
    failed,
    skipped,
    durationMs: Date.now() - startTime,
  }
}

/**
 * Create URL-safe slug from name
 */
function createSlug(name: string): string {
  if (!name) {
    throw new Error('createSlug called with undefined or empty name')
  }
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Determine plugin type from metadata
 */
function determinePluginType(plugin: Plugin): string {
  // Check metadata for type indicators (handle both array and object formats)
  const hasAgents = Array.isArray(plugin.metadata?.agents) ? plugin.metadata.agents.length > 0 : !!plugin.metadata?.agents
  const hasCommands = Array.isArray(plugin.metadata?.commands) ? plugin.metadata.commands.length > 0 : !!plugin.metadata?.commands
  const hasMcpServers = Array.isArray(plugin.metadata?.mcpServers) ? plugin.metadata.mcpServers.length > 0 : !!plugin.metadata?.mcpServers

  if (hasAgents) return 'subagent'
  if (hasCommands) return 'command'
  if (hasMcpServers) return 'mcp'

  // Check category
  const category = plugin.category?.toLowerCase() || ''
  if (category === 'plugin') return 'plugin'
  if (category.includes('agent') || category.includes('subagent')) return 'subagent'
  if (category.includes('command')) return 'command'
  if (category.includes('hook')) return 'hook'
  if (category.includes('skill')) return 'skill'

  // Default to plugin
  return 'plugin'
}

/**
 * Index a single marketplace by ID
 */
export async function indexMarketplacePlugins(marketplaceId: string): Promise<PluginIndexResult> {
  const marketplace = await db
    .select({
      id: marketplaces.id,
      name: marketplaces.name,
      displayName: marketplaces.displayName,
      repository: marketplaces.repository,
    })
    .from(marketplaces)
    .where(eq(marketplaces.id, marketplaceId))
    .limit(1)

  if (!marketplace.length) {
    return { indexed: 0, failed: 1, skipped: 0, durationMs: 0 }
  }

  // Temporarily set only this marketplace as active to use indexPlugins
  const startTime = Date.now()
  let indexed = 0
  let failed = 0

  const mp = marketplace[0]

  try {
    // Fetch plugins from GitHub repository
    const repoPath = mp.repository.replace('https://github.com/', '')
    const fetchedPlugins = await fetchGitHubMarketplacePlugins(repoPath)

    for (const plugin of fetchedPlugins) {
      try {
        const slug = createSlug(plugin.name)
        const pluginType = determinePluginType(plugin)

        await db
          .insert(plugins)
          .values({
            name: plugin.name,
            namespace: `@${plugin.namespace}/${plugin.name}`,
            slug,
            marketplaceId: mp.id,
            marketplaceName: mp.displayName,
            repository: plugin.gitUrl || mp.repository,
            description: plugin.description || '',
            version: plugin.version,
            author: plugin.author || plugin.namespace,
            type: pluginType,
            categories: plugin.category ? [plugin.category] : [],
            keywords: plugin.keywords || [],
            installCommand: `bwc add --plugin ${plugin.namespace}/${plugin.name}`,
            stars: plugin.stars,
            lastIndexedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: plugins.namespace,
            set: {
              description: sql`EXCLUDED.description`,
              version: sql`EXCLUDED.version`,
              author: sql`EXCLUDED.author`,
              type: sql`EXCLUDED.type`,
              categories: sql`EXCLUDED.categories`,
              keywords: sql`EXCLUDED.keywords`,
              stars: sql`EXCLUDED.stars`,
              lastIndexedAt: sql`EXCLUDED.last_indexed_at`,
              updatedAt: sql`NOW()`,
            },
          })

        indexed++
      } catch {
        failed++
      }
    }

    await db
      .update(marketplaces)
      .set({
        pluginCount: fetchedPlugins.length,
        lastIndexedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(marketplaces.id, mp.id))
  } catch (error) {
    console.error(`Failed to index marketplace ${mp.displayName}:`, error)
    failed = 1
  }

  return {
    indexed,
    failed,
    skipped: 0,
    durationMs: Date.now() - startTime,
  }
}
