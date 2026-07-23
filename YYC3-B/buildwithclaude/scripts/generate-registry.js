#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const { fetchDockerMCPServers } = require('./fetch-docker-mcp');
const { fetchOfficialMCPServers } = require('./fetch-official-mcp');
const { enhanceMCPServersWithDockerStats } = require('./enhance-docker-stats');
const { KNOWN_MARKETPLACES } = require('./fetch-plugins');

const REPO_ROOT = path.join(__dirname, '..');
const SUBAGENTS_DIR = path.join(REPO_ROOT, 'plugins/all-agents/agents');
const COMMANDS_DIR = path.join(REPO_ROOT, 'plugins/all-commands/commands');
const HOOKS_DIR = path.join(REPO_ROOT, 'plugins/all-hooks/hooks');
const PLUGINS_DIR = path.join(REPO_ROOT, 'plugins');
const MCP_SERVERS_DIR = path.join(REPO_ROOT, 'mcp-servers');
const OUTPUT_PATH = path.join(REPO_ROOT, 'web-ui', 'public', 'registry.json');
const DISCOVERED_PLUGINS_PATH = path.join(__dirname, '.discovered-plugins.json');

async function getSubagents() {
  const files = await fs.readdir(SUBAGENTS_DIR);
  const subagents = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const filePath = path.join(SUBAGENTS_DIR, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const { data } = matter(content);
    
    subagents.push({
      name: data.name || file.replace('.md', ''),
      category: data.category || 'uncategorized',
      description: data.description || '',
      version: '1.0.0',
      file: `subagents/${file}`,
      path: file.replace('.md', ''),
      tools: data.tools || [],
      tags: data.tags || []
    });
  }

  return subagents.sort((a, b) => a.name.localeCompare(b.name));
}

async function getCommands() {
  const files = await fs.readdir(COMMANDS_DIR);
  const commands = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const filePath = path.join(COMMANDS_DIR, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const { data } = matter(content);
    
    commands.push({
      name: data.name || file.replace('.md', ''),
      category: data.category || 'uncategorized',
      description: data.description || '',
      version: '1.0.0',
      file: `commands/${file}`,
      path: file.replace('.md', ''),
      argumentHint: data.argumentHint || '<args>',
      model: data.model || 'claude-3.5',
      prefix: data.prefix || '/',
      tags: data.tags || []
    });
  }

  return commands.sort((a, b) => a.name.localeCompare(b.name));
}

async function getHooks() {
  try {
    const files = await fs.readdir(HOOKS_DIR);
    const hooks = [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = path.join(HOOKS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const { data } = matter(content);

      hooks.push({
        name: data.name || file.replace('.md', ''),
        category: data.category || 'automation',
        description: data.description || '',
        event: data.event || 'PostToolUse',
        matcher: data.matcher || '*',
        language: data.language || 'bash',
        version: data.version || '1.0.0',
        file: `hooks/${file}`,
        path: file.replace('.md', ''),
        tags: data.tags || []
      });
    }

    return hooks.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn('Warning: Could not read hooks directory:', error.message);
    return [];
  }
}

/**
 * Get actual Claude Code plugins by scanning for .claude-plugin/plugin.json files
 */
async function getPlugins() {
  try {
    const dirs = await fs.readdir(PLUGINS_DIR);
    const plugins = [];

    for (const dir of dirs) {
      const pluginJsonPath = path.join(PLUGINS_DIR, dir, '.claude-plugin', 'plugin.json');

      try {
        const content = await fs.readFile(pluginJsonPath, 'utf-8');
        const data = JSON.parse(content);

        plugins.push({
          name: data.name,
          description: data.description || '',
          version: data.version || '1.0.0',
          file: `plugins/${dir}/.claude-plugin/plugin.json`,
          path: dir,
          repository: data.repository || '',
          license: data.license || '',
          keywords: data.keywords || [],
          author: data.author || {},
          installCommand: `/plugin install ${data.name}@buildwithclaude`
        });
      } catch {
        // Skip directories without .claude-plugin/plugin.json
        continue;
      }
    }

    return plugins.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn('Warning: Could not read plugins directory:', error.message);
    return [];
  }
}

async function getMCPServers() {
  // We only use Docker MCP servers now, no markdown files
  // All MCP servers come from fetchDockerMCPServers()
  return [];
}

/**
 * Get discovered plugins data from cache file (created by fetch-plugins.js)
 */
async function getDiscoveredPlugins() {
  try {
    const content = await fs.readFile(DISCOVERED_PLUGINS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    // No discovered plugins file - use defaults
    return { marketplaces: [], plugins: [] };
  }
}

/**
 * Get marketplaces from discovered data or fallback to known marketplaces
 */
async function getMarketplaces() {
  const discovered = await getDiscoveredPlugins();

  // If we have discovered marketplaces, use them
  if (discovered.marketplaces && discovered.marketplaces.length > 0) {
    console.log(`  Using ${discovered.marketplaces.length} discovered marketplaces`);
    return discovered.marketplaces;
  }

  // Fallback to known marketplaces (static list)
  console.log('  Using fallback known marketplaces');
  return KNOWN_MARKETPLACES.map(m => ({
    name: m.repo.split('/')[1],
    displayName: m.displayName,
    description: m.description,
    url: m.url || `https://github.com/${m.repo}`,
    repository: `https://github.com/${m.repo}`,
    installCommand: `/plugin marketplace add ${m.repo}`,
    pluginCount: 100, // Estimate
    skillCount: 50,   // Estimate
    stars: 0,
    categories: m.categories || [],
    badges: m.badges || [],
    maintainer: {
      name: m.repo.split('/')[0],
      github: m.repo.split('/')[0]
    }
  }));
}

/**
 * Get external plugins from discovered data
 */
async function getExternalPlugins() {
  const discovered = await getDiscoveredPlugins();
  return discovered.plugins || [];
}

async function generateRegistry() {
  try {
    console.log('Generating registry.json...');

    const [subagents, commands, hooks, plugins, mcpServers, dockerMCPServers, officialMCPServers, marketplaces, externalPlugins] = await Promise.all([
      getSubagents(),
      getCommands(),
      getHooks(),
      getPlugins(),
      getMCPServers(),
      fetchDockerMCPServers(),
      fetchOfficialMCPServers(),
      getMarketplaces(),
      getExternalPlugins()
    ]);

    // Merge all MCP servers: Official MCP > Docker MCP > Local
    // Official MCP servers take priority (have correct installation commands)
    const allMCPServers = [...mcpServers, ...dockerMCPServers, ...officialMCPServers];

    // Remove duplicates based on server name, preferring official-mcp source
    const serversByName = new Map();
    for (const server of allMCPServers) {
      const existing = serversByName.get(server.name);
      if (!existing) {
        serversByName.set(server.name, server);
      } else {
        // Prefer official-mcp over docker over others
        const existingPriority = existing.source_registry?.type === 'official-mcp' ? 2 :
                                  existing.source_registry?.type === 'docker' ? 1 : 0;
        const newPriority = server.source_registry?.type === 'official-mcp' ? 2 :
                            server.source_registry?.type === 'docker' ? 1 : 0;

        if (newPriority > existingPriority) {
          // Merge: keep new server but add docker_mcp_available flag if docker exists
          if (existingPriority === 1 || existing.source_registry?.type === 'docker') {
            server.docker_mcp_available = true;
            server.docker_mcp_command = `docker mcp server enable mcp/${server.name}`;
          }
          serversByName.set(server.name, server);
        } else if (newPriority < existingPriority && server.source_registry?.type === 'docker') {
          // Mark existing server as having docker available
          existing.docker_mcp_available = true;
          existing.docker_mcp_command = `docker mcp server enable mcp/${server.name}`;
        }
      }
    }

    const uniqueServers = Array.from(serversByName.values());

    // Enhance MCP servers with Docker Hub stats
    const enhancedServers = await enhanceMCPServersWithDockerStats(uniqueServers);

    const registry = {
      $schema: 'https://buildwithclaude.com/schema/registry.json',
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      subagents,
      commands,
      hooks,
      plugins,
      mcpServers: enhancedServers.sort((a, b) => a.name.localeCompare(b.name)),
      marketplaces,
      externalPlugins: externalPlugins.sort((a, b) => (b.stars || 0) - (a.stars || 0))
    };

    // Ensure the public directory exists
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });

    // Write the registry file
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(registry, null, 2));

    console.log(`✓ Registry generated successfully!`);
    console.log(`  - ${subagents.length} subagents`);
    console.log(`  - ${commands.length} commands`);
    console.log(`  - ${hooks.length} hooks`);
    console.log(`  - ${plugins.length} plugins`);
    console.log(`  - ${uniqueServers.length} MCP servers`);
    console.log(`    - ${officialMCPServers.length} from Official MCP Registry`);
    console.log(`    - ${dockerMCPServers.length} from Docker MCP`);
    console.log(`  - ${marketplaces.length} marketplaces`);
    console.log(`  - ${externalPlugins.length} external plugins`);
    console.log(`  - Output: ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('Error generating registry:', error);
    process.exit(1);
  }
}

// Run the script
generateRegistry();