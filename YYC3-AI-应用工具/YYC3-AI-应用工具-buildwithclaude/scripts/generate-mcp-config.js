#!/usr/bin/env node

/**
 * Generate MCP servers configuration file for Claude Code Plugin Marketplace
 *
 * This script reads MCP servers from the registry and generates a
 * mcp-servers.json file that follows the Claude Code MCP configuration format.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '../web-ui/public/registry.json');
const MCP_CONFIG_PATH = path.join(__dirname, '../mcp-servers.json');

// Read registry
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

if (!registry.mcpServers || registry.mcpServers.length === 0) {
  console.log('No MCP servers found in registry');
  process.exit(0);
}

// Generate MCP servers configuration
const mcpServers = {};

registry.mcpServers.forEach(server => {
  // Create configuration for each MCP server
  const serverConfig = {
    command: 'docker',
    args: [
      'run',
      '-i',
      '--rm',
      `mcp/${server.name}`
    ]
  };

  // Add environment variables if needed based on security requirements
  if (server.security && server.security.auth_type !== 'none') {
    serverConfig.env = {};
    // Add placeholder for common auth env vars
    if (server.name.includes('aws')) {
      serverConfig.env.AWS_ACCESS_KEY_ID = '${AWS_ACCESS_KEY_ID}';
      serverConfig.env.AWS_SECRET_ACCESS_KEY = '${AWS_SECRET_ACCESS_KEY}';
    }
    if (server.name.includes('github')) {
      serverConfig.env.GITHUB_TOKEN = '${GITHUB_TOKEN}';
    }
  }

  // Add metadata as comments
  serverConfig._metadata = {
    displayName: server.display_name,
    category: server.category,
    description: server.description,
    vendor: server.vendor,
    dockerHub: server.sources?.docker,
    repository: server.sources?.repository
  };

  mcpServers[server.name] = serverConfig;
});

// Create the full MCP configuration object
const mcpConfig = {
  $schema: 'https://anthropic.com/claude-code/mcp-servers.schema.json',
  _comment: 'Docker MCP servers from the official Docker MCP registry. Install with: docker mcp server enable <server-name>',
  mcpServers
};

// Write configuration file
fs.writeFileSync(MCP_CONFIG_PATH, JSON.stringify(mcpConfig, null, 2));

// Group by category for summary
const serversByCategory = {};
registry.mcpServers.forEach(server => {
  const cat = server.category || 'general';
  if (!serversByCategory[cat]) serversByCategory[cat] = 0;
  serversByCategory[cat]++;
});

console.log(`Generated mcp-servers.json with ${registry.mcpServers.length} servers`);
console.log('\nServers by category:');
Object.keys(serversByCategory).sort().forEach(cat => {
  console.log(`  ${cat}: ${serversByCategory[cat]}`);
});
