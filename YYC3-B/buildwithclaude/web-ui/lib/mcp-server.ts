import { MCPServer, MCP_CATEGORIES } from './mcp-types'
import {
  getMCPServersPaginated,
  getMCPServerBySlug as getMCPServerBySlugFromDB,
  getMCPCategoriesFromDB,
  getMCPServerStatsFromDB,
  getFeaturedMCPServersFromDB,
  type MCPServerWithParsedJSON,
} from './mcp-server-db'

/**
 * Transform database MCP server to MCPServer type for UI compatibility
 */
function transformDBToMCPServer(server: MCPServerWithParsedJSON): MCPServer {
  const installationMethods = (server.installationMethods as MCPServer['installation_methods']) || []

  // Extract claude_mcp_add_command from installation methods
  // Find the first method with a claudeCode command (prefer recommended)
  const methodWithClaudeCode = installationMethods.find(
    (m) => m.recommended && m.claudeCode
  ) || installationMethods.find((m) => m.claudeCode)

  const claudeMcpAddCommand = methodWithClaudeCode?.claudeCode || undefined

  // Check if docker MCP is available
  const dockerMcpAvailable = server.sourceRegistry === 'docker' ||
    installationMethods.some((m) => m.type === 'docker' || m.type === 'docker-mcp')

  return {
    name: server.name,
    display_name: server.displayName,
    category: server.category,
    description: server.description || '',
    server_type: (server.serverType as 'stdio' | 'http' | 'websocket' | 'sse' | 'streaming-http') || 'stdio',
    protocol_version: '1.0.0',
    verification: {
      status: (server.verificationStatus as 'verified' | 'community' | 'experimental') || 'community',
      maintainer: server.vendor || 'Community',
      last_tested: server.lastIndexedAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      tested_with: ['claude-code'],
    },
    sources: {
      github: server.githubUrl || undefined,
      docker: server.dockerUrl || undefined,
      npm: server.npmUrl || undefined,
      official: server.documentationUrl || undefined,
    },
    stats: {
      github_stars: server.githubStars || undefined,
      docker_pulls: server.dockerPulls || undefined,
      npm_downloads: server.npmDownloads || undefined,
      last_updated: server.updatedAt?.toISOString(),
    },
    badges: [],
    source_registry: {
      type: server.sourceRegistry as 'official-mcp' | 'docker' | 'mcpmarket' | 'manual' | 'community',
      url: server.sourceUrl || undefined,
      last_fetched: server.lastIndexedAt?.toISOString(),
    },
    tags: server.tags || [],
    installation_methods: installationMethods,
    user_inputs: [],
    packages: (server.packages as MCPServer['packages']) || [],
    remotes: (server.remotes as MCPServer['remotes']) || [],
    environment_variables: (server.environmentVariables as MCPServer['environment_variables']) || [],
    claude_mcp_add_command: claudeMcpAddCommand,
    docker_mcp_available: dockerMcpAvailable,
    file: `${server.sourceRegistry}/${server.name}.md`,
    path: server.slug,
  }
}

export async function getAllMCPServers(): Promise<MCPServer[]> {
  const result = await getMCPServersPaginated({ limit: 10000 })
  return result.servers.map(transformDBToMCPServer)
}

export async function getMCPServerBySlug(slug: string): Promise<MCPServer | null> {
  const server = await getMCPServerBySlugFromDB(slug)
  if (server) {
    return transformDBToMCPServer(server)
  }
  return null
}

export interface MCPCategoryMetadata {
  id: string
  displayName: string
  icon: string
  count: number
  description?: string
}

export async function getAllMCPCategories(): Promise<MCPCategoryMetadata[]> {
  return await getMCPCategoriesFromDB()
}

export interface MCPServerStats {
  total: number
  verified: number
  community: number
  experimental: number
  byCategory: Record<string, number>
}

export async function getMCPServerStats(): Promise<MCPServerStats> {
  const dbStats = await getMCPServerStatsFromDB()
  return {
    total: dbStats.total,
    verified: dbStats.byVerification['verified'] || 0,
    community: dbStats.byVerification['community'] || 0,
    experimental: dbStats.byVerification['experimental'] || 0,
    byCategory: dbStats.byCategory,
  }
}

// Get featured servers (verified servers with high stats)
export async function getFeaturedMCPServers(limit: number = 6): Promise<MCPServer[]> {
  const servers = await getFeaturedMCPServersFromDB(limit)
  return servers.map(transformDBToMCPServer)
}
