/**
 * Docker Hub API Client
 * Fetches additional metadata from Docker Hub v2 API
 */

class DockerHubAPI {
  constructor() {
    this.baseUrl = 'https://hub.docker.com/v2'
    this.cache = new Map()
    this.rateLimitDelay = 1000 // 1 second between requests
    this.lastRequestTime = 0
  }

  /**
   * Fetch repository metadata from Docker Hub
   * @param {string} imageName - Full image name (e.g., "mcp/duckduckgo")
   * @returns {Promise<Object|null>} Repository metadata or null if not found
   */
  async fetchRepositoryMetadata(imageName) {
    // Check cache first
    if (this.cache.has(imageName)) {
      console.log(`📦 Using cached data for ${imageName}`)
      return this.cache.get(imageName)
    }

    // Rate limiting
    await this.enforceRateLimit()

    try {
      // Parse namespace and name from image name
      const [namespace, name] = imageName.split('/')
      if (!namespace || !name) {
        console.warn(`Invalid image name format: ${imageName}`)
        return null
      }

      const url = `${this.baseUrl}/repositories/${namespace}/${name}/`
      console.log(`🔍 Fetching Docker Hub metadata for ${imageName}...`)

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BWC-MCP-Registry-Fetcher/1.0'
        }
      })

      if (response.status === 404) {
        console.warn(`❌ Repository not found on Docker Hub: ${imageName}`)
        return null
      }

      if (!response.ok) {
        console.warn(`⚠️ Docker Hub API error for ${imageName}: ${response.status}`)
        return null
      }

      const data = await response.json()
      
      // Transform to our stats format
      const stats = {
        docker_pulls: data.pull_count || 0,
        star_count: data.star_count || 0,
        last_updated: data.last_updated || null,
        description: data.description || null,
        full_description: data.full_description || null,
        user: data.user || null,
        namespace: data.namespace || namespace,
        repository_url: this.extractRepositoryUrl(data),
        is_official: data.is_official || false,
        is_automated: data.is_automated || false
      }

      // Cache the result
      this.cache.set(imageName, stats)
      console.log(`✅ Fetched stats for ${imageName}: ${stats.docker_pulls} pulls, ${stats.star_count} stars`)

      return stats
    } catch (error) {
      console.error(`❌ Error fetching Docker Hub data for ${imageName}:`, error.message)
      return null
    }
  }

  /**
   * Fetch stats for multiple Docker images
   * @param {string[]} imageNames - Array of Docker image names
   * @returns {Promise<Map<string, Object>>} Map of image names to stats
   */
  async fetchMultipleRepositories(imageNames) {
    const results = new Map()

    for (const imageName of imageNames) {
      const stats = await this.fetchRepositoryMetadata(imageName)
      if (stats) {
        results.set(imageName, stats)
      }
    }

    return results
  }

  /**
   * Extract repository URL from Docker Hub metadata
   */
  extractRepositoryUrl(data) {
    // Check for GitHub URL in various fields
    if (data.repository_url) return data.repository_url
    
    // Try to extract from full_description
    if (data.full_description) {
      const githubMatch = data.full_description.match(/https:\/\/github\.com\/[^\s\)]+/i)
      if (githubMatch) return githubMatch[0]
    }

    return null
  }

  /**
   * Enforce rate limiting between API calls
   */
  async enforceRateLimit() {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    this.lastRequestTime = Date.now()
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear()
    console.log('🗑️ Docker Hub API cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    }
  }
}

/**
 * Helper function to extract Docker image name from various source formats
 * @param {Object} server - MCP server object
 * @returns {string|null} Docker image name or null
 */
function extractDockerImageName(server) {
  // Check for Docker source
  if (server.sources?.docker) {
    // Extract from Docker Hub URL
    const match = server.sources.docker.match(/hub\.docker\.com\/r\/([^\/]+\/[^\/\?]+)/i)
    if (match) return match[1]
    
    // Check if it's already an image name
    if (!server.sources.docker.includes('http')) {
      return server.sources.docker
    }
  }

  // Check for Docker installation method
  const dockerMethod = server.installation_methods?.find(m => m.type === 'docker')
  if (dockerMethod?.command) {
    // Extract from docker run command
    const match = dockerMethod.command.match(/docker\s+run\s+.*?([a-z0-9\-_]+\/[a-z0-9\-_]+)/i)
    if (match) return match[1]
  }

  // Check for docker_image field (if it exists)
  if (server.docker_image) {
    return server.docker_image
  }

  return null
}

/**
 * Enhance MCP server with Docker Hub stats
 * @param {Object} server - MCP server object
 * @param {Object} dockerStats - Stats from Docker Hub API
 * @returns {Object} Enhanced server object
 */
function enhanceServerWithDockerStats(server, dockerStats) {
  // Initialize stats object if it doesn't exist
  if (!server.stats) {
    server.stats = {}
  }

  // Add Docker Hub stats
  if (dockerStats.docker_pulls) {
    server.stats.docker_pulls = dockerStats.docker_pulls
  }

  // Use star_count for github_stars if we don't have a GitHub source
  if (dockerStats.star_count && !server.stats.github_stars) {
    server.stats.docker_stars = dockerStats.star_count
  }

  if (dockerStats.last_updated) {
    server.stats.last_updated = dockerStats.last_updated
  }

  // Enhance description if we have a better one from Docker Hub
  if (dockerStats.full_description && (!server.long_description || server.long_description.length < dockerStats.full_description.length)) {
    server.long_description = dockerStats.full_description
  }

  // Add repository URL if we found one and don't have a GitHub source
  if (dockerStats.repository_url && !server.sources?.github) {
    if (!server.sources) server.sources = {}
    server.sources.repository = dockerStats.repository_url
  }

  // Add Docker Hub metadata
  if (dockerStats.user || dockerStats.namespace) {
    server.docker_metadata = {
      user: dockerStats.user,
      namespace: dockerStats.namespace,
      is_official: dockerStats.is_official,
      is_automated: dockerStats.is_automated
    }
  }

  return server
}

// Export for CommonJS
module.exports = {
  DockerHubAPI,
  extractDockerImageName,
  enhanceServerWithDockerStats
};