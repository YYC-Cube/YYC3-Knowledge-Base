/**
 * Docker MCP Registry Fetcher
 * Fetches from https://github.com/docker/mcp-registry
 */

export class DockerMCPFetcher {
  constructor() {
    this.registryUrl = 'https://api.github.com/repos/docker/mcp-registry/contents/servers'
    this.rawBaseUrl = 'https://raw.githubusercontent.com/docker/mcp-registry/main/servers'
  }
  
  async fetchServers() {
    console.log('Fetching Docker MCP servers from GitHub registry...')
    
    try {
      // Fetch the list of server directories
      const response = await fetch(this.registryUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'BWC-MCP-Importer'
        }
      })
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }
      
      const directories = await response.json()
      const servers = []
      
      // Process each server directory
      for (const dir of directories) {
        if (dir.type === 'dir') {
          try {
            const server = await this.fetchServerMetadata(dir.name)
            if (server) {
              servers.push(server)
            }
          } catch (error) {
            console.warn(`Failed to fetch ${dir.name}: ${error.message}`)
          }
        }
      }
      
      console.log(`Found ${servers.length} Docker MCP servers`)
      return servers
    } catch (error) {
      console.error('Failed to fetch Docker MCP registry:', error)
      return []
    }
  }
  
  async fetchServerMetadata(serverName) {
    try {
      // Fetch the metadata.yaml file for this server
      const metadataUrl = `${this.rawBaseUrl}/${serverName}/metadata.yaml`
      const response = await fetch(metadataUrl)
      
      if (!response.ok) {
        console.warn(`No metadata for ${serverName}`)
        return null
      }
      
      const yamlContent = await response.text()
      
      // Parse YAML manually (simple parsing for our needs)
      const metadata = this.parseSimpleYaml(yamlContent)
      
      if (!metadata.name) {
        metadata.name = serverName
      }
      
      // Convert to our standard format
      return this.convertToStandardFormat(serverName, metadata)
    } catch (error) {
      console.warn(`Error fetching metadata for ${serverName}:`, error.message)
      return null
    }
  }
  
  parseSimpleYaml(yamlContent) {
    const metadata = {}
    const lines = yamlContent.split('\n')
    
    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) continue
      
      // Simple key: value parsing
      const match = line.match(/^(\w+):\s*(.*)$/)
      if (match) {
        const [, key, value] = match
        // Remove quotes if present
        metadata[key] = value.replace(/^["']|["']$/g, '').trim()
      }
    }
    
    return metadata
  }
  
  convertToStandardFormat(serverName, metadata) {
    // Detect category based on name and description
    const category = this.detectCategory(serverName, metadata.description || '')
    
    return {
      name: serverName,
      display_name: metadata.name || serverName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      category: category,
      description: metadata.description || `Docker MCP server for ${serverName}`,
      server_type: 'docker-mcp',
      protocol_version: '1.0.0',
      execution_type: 'docker',
      docker_image: `mcp/${serverName}`,
      security: {
        auth_type: 'docker-managed',
        permissions: [],
        containerized: true,
        resource_limits: {
          cpu: '1 core',
          memory: '2GB'
        }
      },
      sources: {
        docker_hub: `https://hub.docker.com/r/mcp/${serverName}`,
        github: `https://github.com/docker/mcp-registry/tree/main/servers/${serverName}`
      },
      verification: {
        status: 'docker-verified',
        last_tested: new Date().toISOString().split('T')[0],
        tested_with: ['docker-mcp-toolkit']
      },
      installation_methods: [{
        type: 'docker-mcp',
        recommended: true,
        command: `docker mcp server enable ${serverName}`,
        description: 'Enable via Docker MCP Toolkit'
      }],
      tags: this.extractTags(serverName, metadata),
      badges: ['docker-official', 'containerized', 'secure'],
      file: `docker-mcp/${serverName}.md`,
      source_registry: {
        type: 'docker-mcp',
        url: `https://github.com/docker/mcp-registry/tree/main/servers/${serverName}`,
        last_fetched: new Date().toISOString(),
        auto_update: true,
        verified_by: 'docker'
      }
    }
  }
  
  detectCategory(name, description) {
    const combined = `${name} ${description}`.toLowerCase()
    
    const categoryRules = {
      'ai-ml': ['ai', 'ml', 'llm', 'embedding', 'vector', 'model'],
      'cloud-services': ['aws', 'azure', 'gcp', 'cloud', 'lambda'],
      'databases': ['database', 'sql', 'postgres', 'mysql', 'mongo', 'redis', 'sqlite', 'db'],
      'dev-tools': ['git', 'github', 'gitlab', 'build', 'ci', 'cd', 'test', 'debug'],
      'communication': ['slack', 'discord', 'email', 'chat', 'message'],
      'productivity': ['notion', 'task', 'todo', 'calendar', 'notes'],
      'monitoring': ['monitor', 'log', 'metric', 'alert', 'observability'],
      'security': ['security', 'auth', 'oauth', 'jwt', 'encrypt'],
      'apis': ['api', 'rest', 'graphql', 'webhook'],
      'automation': ['automate', 'workflow', 'pipeline', 'orchestrate'],
      'search': ['search', 'index', 'query', 'find'],
      'documentation': ['docs', 'wiki', 'knowledge', 'reference'],
      'media': ['image', 'video', 'audio', 'media', 'file'],
      'browser': ['browser', 'web', 'scrape', 'playwright', 'puppeteer']
    }
    
    for (const [category, keywords] of Object.entries(categoryRules)) {
      for (const keyword of keywords) {
        if (combined.includes(keyword)) {
          return category
        }
      }
    }
    
    return 'utilities'
  }
  
  extractTags(name, metadata) {
    const tags = []
    
    // Add some automatic tags based on name
    if (name.includes('aws')) tags.push('aws')
    if (name.includes('github')) tags.push('github')
    if (name.includes('api')) tags.push('api')
    if (name.includes('db') || name.includes('database')) tags.push('database')
    
    // Add Docker-specific tags
    tags.push('docker', 'containerized')
    
    return tags
  }
}