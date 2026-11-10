#!/usr/bin/env npx tsx
/**
 * One-time migration script to import existing MCP servers from registry.json to database
 *
 * Usage:
 *   npx tsx scripts/migrate-mcp-to-db.ts
 *
 * Environment:
 *   POSTGRES_URL - Required: PostgreSQL connection string
 */

import fs from 'fs'
import path from 'path'
import { db } from '../lib/db/client'
import { mcpServers } from '../lib/db/schema'
import { sql } from 'drizzle-orm'

interface MCPServerFromRegistry {
  name: string
  display_name: string
  full_name?: string
  category: string
  description: string
  version?: string
  server_type?: string
  vendor?: string
  logo_url?: string
  path?: string
  verification?: {
    status: string
    maintainer?: string
  }
  sources?: {
    github?: string
    docker?: string
    npm?: string
    official?: string
    documentation?: string
  }
  stats?: {
    github_stars?: number
    docker_pulls?: number
    npm_downloads?: number
    last_updated?: string
  }
  source_registry?: {
    type: string
    url?: string
  }
  packages?: unknown[]
  remotes?: unknown[]
  environment_variables?: unknown[]
  installation_methods?: unknown[]
  tags?: string[]
  badges?: string[]
}

function generateSlug(name: string, sourceRegistry: string): string {
  const baseName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
  return `${sourceRegistry}-${baseName}`
}

async function migrateMCPServersToDatabase() {
  console.log('Starting MCP server migration to database...')

  // Read registry.json
  const registryPath = path.join(process.cwd(), 'public', 'registry.json')

  if (!fs.existsSync(registryPath)) {
    console.error(`Registry file not found: ${registryPath}`)
    process.exit(1)
  }

  const registryContent = fs.readFileSync(registryPath, 'utf8')
  const registry = JSON.parse(registryContent)

  const servers: MCPServerFromRegistry[] = registry.mcpServers || []

  if (servers.length === 0) {
    console.log('No MCP servers found in registry.json')
    return
  }

  console.log(`Found ${servers.length} MCP servers in registry.json`)

  let migrated = 0
  let failed = 0

  for (const server of servers) {
    try {
      const sourceRegistry = server.source_registry?.type || 'community'
      const slug = generateSlug(server.name, sourceRegistry)

      await db
        .insert(mcpServers)
        .values({
          name: server.name,
          displayName: server.display_name,
          slug,
          description: server.description || null,
          version: server.version || null,
          category: server.category || 'utilities',
          tags: server.tags || [],
          serverType: server.server_type || 'stdio',
          vendor: server.vendor || null,
          logoUrl: server.logo_url || null,
          sourceRegistry,
          sourceUrl: server.source_registry?.url || null,
          githubUrl: server.sources?.github || null,
          dockerUrl: server.sources?.docker || null,
          npmUrl: server.sources?.npm || null,
          documentationUrl: server.sources?.documentation || server.sources?.official || null,
          githubStars: server.stats?.github_stars || 0,
          dockerPulls: server.stats?.docker_pulls || 0,
          npmDownloads: server.stats?.npm_downloads || 0,
          packages: server.packages ? JSON.stringify(server.packages) : null,
          remotes: server.remotes ? JSON.stringify(server.remotes) : null,
          environmentVariables: server.environment_variables
            ? JSON.stringify(server.environment_variables)
            : null,
          installationMethods: server.installation_methods
            ? JSON.stringify(server.installation_methods)
            : null,
          verificationStatus: server.verification?.status || 'community',
          active: true,
          lastIndexedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: mcpServers.slug,
          set: {
            displayName: sql`EXCLUDED.display_name`,
            description: sql`EXCLUDED.description`,
            version: sql`EXCLUDED.version`,
            category: sql`EXCLUDED.category`,
            tags: sql`EXCLUDED.tags`,
            serverType: sql`EXCLUDED.server_type`,
            vendor: sql`EXCLUDED.vendor`,
            logoUrl: sql`EXCLUDED.logo_url`,
            sourceUrl: sql`EXCLUDED.source_url`,
            githubUrl: sql`EXCLUDED.github_url`,
            dockerUrl: sql`EXCLUDED.docker_url`,
            npmUrl: sql`EXCLUDED.npm_url`,
            documentationUrl: sql`EXCLUDED.documentation_url`,
            githubStars: sql`EXCLUDED.github_stars`,
            dockerPulls: sql`EXCLUDED.docker_pulls`,
            npmDownloads: sql`EXCLUDED.npm_downloads`,
            packages: sql`EXCLUDED.packages`,
            remotes: sql`EXCLUDED.remotes`,
            environmentVariables: sql`EXCLUDED.environment_variables`,
            installationMethods: sql`EXCLUDED.installation_methods`,
            verificationStatus: sql`EXCLUDED.verification_status`,
            lastIndexedAt: sql`EXCLUDED.last_indexed_at`,
            updatedAt: sql`NOW()`,
          },
        })

      migrated++
      console.log(`  Migrated: ${server.name}`)
    } catch (error) {
      console.error(`  Failed to migrate ${server.name}:`, error)
      failed++
    }
  }

  console.log(`\nMigration complete:`)
  console.log(`  Migrated: ${migrated}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Total: ${servers.length}`)
}

// Run migration
migrateMCPServersToDatabase()
  .then(() => {
    console.log('\nMigration finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\nMigration failed:', error)
    process.exit(1)
  })
