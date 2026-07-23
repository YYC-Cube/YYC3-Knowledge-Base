/**
 * Utility functions for generating plugin install commands
 */

export type ResourceType = 'subagent' | 'command' | 'mcp' | 'hook'

export interface PluginCommands {
  marketplaceAdd: string
  install: string
  installBundle: string
}

const MARKETPLACE_NAME = 'buildwithclaude'
const MARKETPLACE_REPO = 'davepoon/buildwithclaude'

/**
 * Generate plugin commands for a given resource
 */
export function generatePluginCommands(type: ResourceType, category: string): PluginCommands {
  // Map resource type to plugin prefix
  const prefix = getPluginPrefix(type)

  return {
    marketplaceAdd: `/plugin marketplace add ${MARKETPLACE_REPO}`,
    install: `/plugin install ${prefix}-${category}@${MARKETPLACE_NAME}`,
    installBundle: `/plugin install all-${prefix}@${MARKETPLACE_NAME}`
  }
}

/**
 * Get the plugin prefix for a resource type
 */
function getPluginPrefix(type: ResourceType): string {
  switch (type) {
    case 'subagent':
      return 'agents'
    case 'command':
      return 'commands'
    case 'hook':
      return 'hooks'
    case 'mcp':
      return 'mcp-servers'
    default:
      return type
  }
}

/**
 * Generate a complete plugin installation script
 */
export function generatePluginInstallScript(type: ResourceType, category: string): string {
  const commands = generatePluginCommands(type, category)
  const resourceName = getResourceTypeDisplayName(type)

  return `# First, add the marketplace (one-time setup)
${commands.marketplaceAdd}

# Install ${category} ${resourceName}s
${commands.install}

# Or install all ${resourceName}s
# ${commands.installBundle}`
}

/**
 * Format command name for display (commands use underscore format)
 */
export function formatCommandName(slug: string): string {
  return `/${slug.replace(/-/g, '_')}`
}

/**
 * Get display name for resource type
 */
export function getResourceTypeDisplayName(type: ResourceType): string {
  switch (type) {
    case 'subagent':
      return 'Agent'
    case 'command':
      return 'Command'
    case 'mcp':
      return 'MCP Server'
    case 'hook':
      return 'Hook'
    default:
      return type
  }
}

/**
 * Get the marketplace add command
 */
export function getMarketplaceAddCommand(): string {
  return `/plugin marketplace add ${MARKETPLACE_REPO}`
}

/**
 * Get install command for MCP servers bundle
 */
export function getMCPInstallCommand(): string {
  return `/plugin install mcp-servers-docker@${MARKETPLACE_NAME}`
}

/**
 * Get Claude CLI command to add an individual MCP server
 */
export function getClaudeMCPAddCommand(serverName: string): string {
  return `claude mcp add ${serverName}`
}

/**
 * Get Docker MCP command to enable a server
 */
export function getDockerMCPEnableCommand(serverName: string): string {
  return `docker mcp server enable ${serverName}`
}
