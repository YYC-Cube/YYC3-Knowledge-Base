#!/usr/bin/env node

/**
 * Fetch MCP servers from the Official MCP Registry
 * API: https://registry.modelcontextprotocol.io/v0.1/servers
 */

/**
 * Format server name for display
 */
function formatServerName(name) {
  if (!name) return 'Unknown Server';
  // Handle namespaced names like "domdomegg/filesystem-mcp"
  const baseName = name.includes('/') ? name.split('/').pop() : name;
  return (baseName || 'unknown')
    .replace(/-mcp$/, '')
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get short name from full server name
 */
function getShortName(name) {
  if (!name) return 'unknown';
  // Handle namespaced names like "domdomegg/filesystem-mcp"
  const baseName = name.includes('/') ? name.split('/').pop() : name;
  return (baseName || 'unknown').toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

/**
 * Categorize server based on name, description, and tags
 */
function categorizeServer(name, description = '', tags = []) {
  const text = `${name} ${description} ${tags.join(' ')}`.toLowerCase();

  // AI & ML
  if (text.match(/\b(ai|llm|gpt|claude|model|machine learning|ml|neural|embedding|vector|chatbot|assistant)\b/)) {
    return 'ai-task-management';
  }

  // Database
  if (text.match(/\b(database|db|sql|sqlite|mysql|postgres|postgresql|mongo|mongodb|redis|supabase|prisma)\b/)) {
    return 'database';
  }

  // Cloud
  if (text.match(/\b(aws|amazon|azure|gcp|google cloud|cloud|kubernetes|k8s|docker|serverless)\b/)) {
    return 'cloud-infrastructure';
  }

  // DevOps & Git
  if (text.match(/\b(github|gitlab|git|ci|cd|devops|deploy|pipeline)\b/)) {
    return 'developer-tools';
  }

  // Search
  if (text.match(/\b(search|brave|google|bing|query|find|discover)\b/)) {
    return 'web-search';
  }

  // Browser
  if (text.match(/\b(browser|chrome|puppeteer|playwright|selenium|web|scrape|crawl)\b/)) {
    return 'browser-automation';
  }

  // File system
  if (text.match(/\b(file|filesystem|fs|directory|folder|storage)\b/)) {
    return 'file-system';
  }

  // Productivity
  if (text.match(/\b(notion|slack|discord|email|calendar|todo|task|project)\b/)) {
    return 'productivity';
  }

  // Communication
  if (text.match(/\b(slack|discord|teams|telegram|email|mail|sms|message)\b/)) {
    return 'email-integration';
  }

  // Finance
  if (text.match(/\b(finance|trading|stock|crypto|blockchain|bitcoin|payment)\b/)) {
    return 'blockchain-crypto';
  }

  // Media
  if (text.match(/\b(image|video|audio|media|youtube|spotify|music|photo)\b/)) {
    return 'media-generation';
  }

  return 'utilities';
}

/**
 * Generate claude mcp add command from server packages/remotes
 */
function generateClaudeMcpCommand(server) {
  if (!server || !server.name) return null;

  const shortName = getShortName(server.name);

  // Prefer NPM package with stdio transport
  const npmPkg = server.packages?.find(p =>
    p && p.registryType === 'npm' && p.transport === 'stdio'
  );
  if (npmPkg && npmPkg.identifier) {
    let cmd = `claude mcp add --transport stdio ${shortName}`;
    if (npmPkg.environmentVariables?.length) {
      for (const env of npmPkg.environmentVariables) {
        if (env && env.name) {
          cmd += ` -e ${env.name}=YOUR_VALUE`;
        }
      }
    }
    cmd += ` -- npx ${npmPkg.identifier}`;
    return cmd;
  }

  // Fall back to Docker/OCI package
  const ociPkg = server.packages?.find(p => p && p.registryType === 'oci');
  if (ociPkg && ociPkg.identifier) {
    let cmd = `claude mcp add --transport stdio ${shortName}`;
    if (ociPkg.environmentVariables?.length) {
      for (const env of ociPkg.environmentVariables) {
        if (env && env.name) {
          cmd += ` -e ${env.name}=YOUR_VALUE`;
        }
      }
    }
    cmd += ` -- docker run -i ${ociPkg.identifier}`;
    return cmd;
  }

  // Fall back to HTTP remote
  const remote = server.remotes?.find(r =>
    r && (r.type === 'streamable-http' || r.type === 'http' || r.type === 'sse')
  );
  if (remote && remote.url) {
    const transport = remote.type === 'sse' ? 'sse' : 'http';
    return `claude mcp add --transport ${transport} ${shortName} ${remote.url}`;
  }

  return null;
}

/**
 * Extract required environment variables from packages
 */
function extractEnvVars(packages) {
  const envVars = [];
  for (const pkg of (packages || [])) {
    for (const env of (pkg.environmentVariables || [])) {
      if (!envVars.find(e => e.name === env.name)) {
        envVars.push({
          name: env.name,
          description: env.description || `Required for ${pkg.registryType} package`,
          required: env.required !== false
        });
      }
    }
  }
  return envVars;
}

/**
 * Fetch all MCP servers from the Official MCP Registry
 */
async function fetchOfficialMCPServers() {
  const servers = [];
  let cursor = null;
  let pageCount = 0;
  const maxPages = 20; // Safety limit

  console.log('Fetching MCP servers from Official MCP Registry...');

  try {
    do {
      const url = new URL('https://registry.modelcontextprotocol.io/v0.1/servers');
      url.searchParams.set('limit', '100');
      url.searchParams.set('version', 'latest');
      if (cursor) {
        url.searchParams.set('cursor', cursor);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Registry API returned ${response.status}`);
      }

      const data = await response.json();
      pageCount++;

      for (const entry of data.servers) {
        // The API returns nested structure: { server: {...}, _meta: {...} }
        const server = entry.server;
        const meta = entry._meta?.['io.modelcontextprotocol.registry/official'] || entry._meta || {};

        // Skip invalid servers
        if (!server || !server.name) {
          console.log('  Skipping invalid server entry');
          continue;
        }

        const shortName = getShortName(server.name);
        const category = categorizeServer(
          server.name,
          server.description || '',
          []
        );

        // Determine installation method type
        const npmPkg = server.packages?.find(p => p && p.registryType === 'npm');
        const ociPkg = server.packages?.find(p => p && p.registryType === 'oci');
        const httpRemote = server.remotes?.find(r => r && (r.type === 'streamable-http' || r.type === 'http'));

        let serverType = 'stdio';
        let executionType = 'local';

        if (httpRemote && !npmPkg && !ociPkg) {
          serverType = 'http';
          executionType = 'remote';
        }

        const envVars = extractEnvVars(server.packages);

        // Build a server object that generateClaudeMcpCommand can use
        const serverForCommand = {
          name: server.name,
          packages: server.packages?.map(p => ({
            registryType: p.registryType,
            identifier: p.identifier,
            runtimeHint: p.runtimeHint,
            transport: p.transport?.type || p.transport, // Handle nested transport
            environmentVariables: p.environmentVariables
          })),
          remotes: server.remotes
        };

        servers.push({
          name: shortName,
          display_name: server.title || formatServerName(server.name),
          full_name: server.name,
          category,
          description: server.description || `MCP server: ${server.name}`,
          version: server.version,
          server_type: serverType,
          protocol_version: '1.0.0',
          execution_type: executionType,
          vendor: server.name.includes('/') ? server.name.split('/')[0] : 'Community',
          verification: {
            status: 'verified',
            maintainer: server.name.includes('/') ? server.name.split('/')[0] : 'Community',
            last_tested: meta.publishedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
            tested_with: ['claude-code']
          },
          sources: {
            github: server.repository?.url,
            official: server.website || server.repository?.url
          },
          stats: {
            last_updated: meta.updatedAt || meta.publishedAt
          },
          source_registry: {
            type: 'official-mcp',
            url: `https://registry.modelcontextprotocol.io/servers/${encodeURIComponent(server.name)}`,
            last_fetched: new Date().toISOString()
          },
          // New fields for installation
          claude_mcp_add_command: generateClaudeMcpCommand(serverForCommand),
          packages: server.packages?.map(p => ({
            registryType: p.registryType,
            identifier: p.identifier,
            runtimeHint: p.runtimeHint,
            transport: p.transport?.type || p.transport,
            environmentVariables: p.environmentVariables
          })) || [],
          remotes: server.remotes?.map(r => ({
            type: r.type,
            url: r.url
          })) || [],
          environment_variables: envVars,
          installation_methods: [
            ...(npmPkg ? [{
              type: 'npm',
              recommended: true,
              command: `npx ${npmPkg.identifier}`,
              requirements: ['Node.js']
            }] : []),
            ...(ociPkg ? [{
              type: 'docker',
              recommended: !npmPkg,
              command: `docker run -i ${ociPkg.identifier}`,
              requirements: ['Docker']
            }] : []),
            ...(httpRemote ? [{
              type: 'remote',
              recommended: !npmPkg && !ociPkg,
              command: httpRemote.url,
              requirements: []
            }] : [])
          ],
          tags: [],
          icons: server.icons || [],
          file: `official-mcp/${shortName}.md`,
          path: `official-mcp/${shortName}`
        });
      }

      cursor = data.metadata?.nextCursor;
      console.log(`  Fetched page ${pageCount}: ${data.servers.length} servers (total: ${servers.length})`);

    } while (cursor && pageCount < maxPages);

    console.log(`Successfully fetched ${servers.length} MCP servers from Official Registry`);
    return servers;
  } catch (error) {
    console.error('Failed to fetch from Official MCP Registry:', error.message);
    // Return empty array on error, don't fail completely
    return [];
  }
}

// Export for use in other scripts
module.exports = {
  fetchOfficialMCPServers,
  generateClaudeMcpCommand,
  formatServerName,
  getShortName
};

// If run directly, output the servers as JSON
if (require.main === module) {
  fetchOfficialMCPServers().then(servers => {
    console.log(JSON.stringify(servers, null, 2));
  }).catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
