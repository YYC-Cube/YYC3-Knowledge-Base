export interface MCPServer {
  name: string
  display_name: string
  full_name?: string
  category: string
  description: string
  version?: string
  server_type: 'stdio' | 'http' | 'websocket' | 'sse' | 'streaming-http'
  protocol_version: string
  execution_type?: 'local' | 'remote'
  verification: MCPVerification
  sources: MCPSources
  security?: MCPSecurity
  stats?: MCPStats
  installation_methods: MCPInstallationMethod[]
  tags: string[]
  badges?: string[]
  source_registry?: SourceRegistry
  user_inputs?: UserInput[]
  file: string
  path: string
  vendor?: string
  logo_url?: string
  icons?: string[]
  // New fields for installation commands
  claude_mcp_add_command?: string
  docker_mcp_available?: boolean
  docker_mcp_command?: string
  packages?: MCPPackage[]
  remotes?: MCPRemote[]
  environment_variables?: MCPEnvironmentVariable[]
}

export interface MCPPackage {
  registryType: 'npm' | 'oci'
  identifier: string
  runtimeHint?: string
  transport: 'stdio' | 'streamable-http' | 'http' | 'sse'
  environmentVariables?: { name: string; description?: string; required?: boolean }[]
}

export interface MCPRemote {
  type: 'streamable-http' | 'http' | 'sse'
  url: string
}

export interface MCPEnvironmentVariable {
  name: string
  description?: string
  required?: boolean
}

export interface MCPVerification {
  status: 'verified' | 'community' | 'experimental'
  last_tested?: string
  tested_with?: string[]
  maintainer?: string
}

export interface MCPSources {
  official?: string
  github?: string
  docker?: string
  npm?: string
  documentation?: string
}

export interface MCPSecurity {
  auth_type: string
  permissions: string[]
  data_handling?: string
  audit_log?: boolean
}

export interface MCPStats {
  github_stars?: number
  docker_pulls?: number
  npm_downloads?: number
  last_updated?: string
}

export interface MCPInstallationMethod {
  type: 'docker' | 'npm' | 'manual' | 'binary' | 'claude-cli' | 'docker-mcp' | 'remote'
  recommended?: boolean
  command?: string
  claudeCode?: string | null // Claude Code CLI command for installation
  config_example?: string
  steps?: string[]
  requirements?: string[]
}

// Verification status display
export const VERIFICATION_STATUS = {
  verified: {
    label: 'Verified',
    icon: '✅',
    className: 'text-green-600 bg-green-100 border-green-200',
    description: 'Officially tested and verified by the community'
  },
  community: {
    label: 'Community',
    icon: '🤝',
    className: 'text-blue-600 bg-blue-100 border-blue-200',
    description: 'Community contributed and maintained'
  },
  experimental: {
    label: 'Experimental',
    icon: '🧪',
    className: 'text-amber-600 bg-amber-100 border-amber-200',
    description: 'Experimental - use with caution'
  }
} as const

// MCP Categories
export const MCP_CATEGORIES = {
  // Primary Categories (from Smithery)
  'web-search': {
    name: 'Web Search',
    icon: '🔍',
    description: 'Search engines and web discovery'
  },
  'browser-automation': {
    name: 'Browser Automation',
    icon: '🌐',
    description: 'Browser control and web automation'
  },
  'memory-management': {
    name: 'Memory Management',
    icon: '🧠',
    description: 'Context and memory persistence'
  },
  'email-integration': {
    name: 'Email Integration',
    icon: '📧',
    description: 'Email clients and communication'
  },
  'blockchain-crypto': {
    name: 'Blockchain & Crypto',
    icon: '₿',
    description: 'Cryptocurrency and blockchain data'
  },
  'ai-task-management': {
    name: 'AI Task Management',
    icon: '🤖',
    description: 'AI reasoning and task orchestration'
  },
  
  // Development Categories
  'developer-tools': {
    name: 'Developer Tools',
    icon: '🛠️',
    description: 'IDEs, terminals, and dev utilities'
  },
  'api-development': {
    name: 'API Development',
    icon: '🔌',
    description: 'API integration and testing'
  },
  'version-control': {
    name: 'Version Control',
    icon: '📝',
    description: 'Git and source control'
  },
  
  // Data & Infrastructure
  database: {
    name: 'Database',
    icon: '🗄️',
    description: 'Database management and queries'
  },
  'file-system': {
    name: 'File System',
    icon: '📁',
    description: 'File and document management'
  },
  'cloud-infrastructure': {
    name: 'Cloud Infrastructure',
    icon: '☁️',
    description: 'Cloud platforms and services'
  },
  
  // Productivity & Content
  productivity: {
    name: 'Productivity',
    icon: '📈',
    description: 'Task and project management'
  },
  'content-management': {
    name: 'Content Management',
    icon: '📝',
    description: 'Documents and content tools'
  },
  'social-media': {
    name: 'Social Media',
    icon: '💬',
    description: 'Social platforms integration'
  },
  
  // Specialized
  'research-education': {
    name: 'Research & Education',
    icon: '📚',
    description: 'Academic and learning resources'
  },
  'media-generation': {
    name: 'Media Generation',
    icon: '🎨',
    description: 'Image, video, and content creation'
  },
  'data-extraction': {
    name: 'Data Extraction',
    icon: '📊',
    description: 'Scraping and data processing'
  },
  'finance-trading': {
    name: 'Finance & Trading',
    icon: '💰',
    description: 'Financial data and trading'
  },
  
  // Analytics and monitoring (keeping for compatibility)
  analytics: {
    name: 'Analytics',
    icon: '📊',
    description: 'Analytics and monitoring tools'
  },
  
  // Special
  official: {
    name: 'Official',
    icon: '✅',
    description: 'Official MCP servers'
  },
  utilities: {
    name: 'Utilities',
    icon: '🔧',
    description: 'General tools and utilities'
  }
} as const

export type MCPCategoryKey = keyof typeof MCP_CATEGORIES
export type VerificationStatus = keyof typeof VERIFICATION_STATUS

// Helper functions
export function getMCPCategoryDisplayName(category: string): string {
  const cat = MCP_CATEGORIES[category as MCPCategoryKey]
  return cat?.name || category.charAt(0).toUpperCase() + category.slice(1)
}

export function getMCPCategoryIcon(category: string): string {
  const cat = MCP_CATEGORIES[category as MCPCategoryKey]
  return cat?.icon || '📦'
}

export function getVerificationBadge(status: VerificationStatus) {
  return VERIFICATION_STATUS[status] || VERIFICATION_STATUS.experimental
}

// Source registry metadata
export interface SourceRegistry {
  type: 'official-mcp' | 'docker' | 'mcpmarket' | 'manual' | 'community'
  url?: string
  id?: string
  last_fetched?: string
  auto_update?: boolean
  verified_by?: string
}

// User input configuration
export interface UserInput {
  name: string
  display_name: string
  type: 'string' | 'number' | 'boolean' | 'path' | 'url' | 'select'
  description: string
  required: boolean
  placeholder?: string
  default?: any
  validation?: {
    pattern?: string
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
    options?: string[]
  }
  env_var?: string
  arg_position?: number
  config_path?: string
}

// Source registry indicators
export const SOURCE_INDICATORS = {
  'official-mcp': {
    icon: '✨',
    label: 'Official MCP',
    color: '#8b5cf6',
    description: 'Official MCP Registry',
  },
  docker: {
    icon: '🐳',
    label: 'Docker',
    color: '#2496ed',
    description: 'Docker Hub',
  },
  mcpmarket: {
    icon: '🛒',
    label: 'MCPMarket',
    color: '#10b981',
    description: 'MCP Market',
  },
  manual: {
    icon: '🛠️',
    label: 'Manual',
    color: '#6b7280',
    description: 'Manually Added',
  },
  community: {
    icon: '👥',
    label: 'Community',
    color: '#f59e0b',
    description: 'Community Contribution',
  },
} as const

// Execution type indicators
export const EXECUTION_INDICATORS = {
  local: {
    icon: '🖥️',
    label: 'Local',
    color: '#22c55e',
    description: 'Runs on your machine',
  },
  remote: {
    icon: '☁️',
    label: 'Remote',
    color: '#3b82f6',
    description: 'Runs on external server',
  },
} as const

export type SourceRegistryType = keyof typeof SOURCE_INDICATORS
export type ExecutionType = keyof typeof EXECUTION_INDICATORS

// Docker MCP Category type
export interface DockerMCPCategory {
  id: string
  name: string
  icon: string
  description: string
}