#!/usr/bin/env node

/**
 * Enhance MCP servers with Docker Hub statistics
 * This module fetches additional metadata from Docker Hub API
 */

const { DockerHubAPI, extractDockerImageName, enhanceServerWithDockerStats } = require('./docker-hub-api.js');

/**
 * Enhance MCP servers with Docker Hub statistics
 * @param {Array} mcpServers - Array of MCP server objects
 * @returns {Promise<Array>} Enhanced MCP servers with stats
 */
async function enhanceMCPServersWithDockerStats(mcpServers) {
  // Skip stats fetching in CI to speed up the process
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  
  if (isCI) {
    console.log('\n📊 Skipping Docker Hub statistics in CI environment...');
    // Return servers with basic stats
    return mcpServers.map(server => ({
      ...server,
      stats: {
        docker_pulls: 0,  // Will be updated in next scheduled run
        github_stars: 0,
        last_updated: new Date().toISOString()
      }
    }));
  }
  
  console.log('\n📊 Fetching Docker Hub statistics...');
  
  const dockerAPI = new DockerHubAPI();
  const enhancedServers = [];
  let successCount = 0;
  let skipCount = 0;

  for (const server of mcpServers) {
    // Extract Docker image name from the server
    const imageName = extractDockerImageName(server);
    
    if (imageName) {
      try {
        // Fetch stats from Docker Hub
        const dockerStats = await dockerAPI.fetchRepositoryMetadata(imageName);
        
        if (dockerStats) {
          // Enhance the server with Docker stats
          const enhancedServer = enhanceServerWithDockerStats({ ...server }, dockerStats);
          enhancedServers.push(enhancedServer);
          successCount++;
        } else {
          // No stats found, keep original
          enhancedServers.push(server);
          skipCount++;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch stats for ${imageName}: ${error.message}`);
        enhancedServers.push(server);
        skipCount++;
      }
    } else {
      // No Docker source, keep original
      enhancedServers.push(server);
    }
  }

  console.log(`✅ Enhanced ${successCount} servers with Docker Hub stats`);
  if (skipCount > 0) {
    console.log(`ℹ️ Skipped ${skipCount} servers (no Docker source or API error)`);
  }

  // Log cache statistics
  const cacheStats = dockerAPI.getCacheStats();
  console.log(`📦 Docker Hub API cache: ${cacheStats.size} entries`);

  return enhancedServers;
}

module.exports = { enhanceMCPServersWithDockerStats };

// Allow running directly for testing
if (require.main === module) {
  const fs = require('fs').promises;
  const path = require('path');

  async function test() {
    try {
      // Read current registry
      const registryPath = path.join(__dirname, '..', 'web-ui', 'public', 'registry.json');
      const registryContent = await fs.readFile(registryPath, 'utf-8');
      const registry = JSON.parse(registryContent);

      // Enhance MCP servers
      const enhancedServers = await enhanceMCPServersWithDockerStats(registry.mcpServers || []);

      // Update registry
      registry.mcpServers = enhancedServers;
      registry.lastUpdated = new Date().toISOString();

      // Write back
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      console.log('✅ Registry updated with Docker Hub stats!');
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  }

  test();
}