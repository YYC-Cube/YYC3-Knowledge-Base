#!/usr/bin/env node
/**
 * Migration script to restructure marketplace for Claude Code Plugin Marketplace
 *
 * Current structure:
 *   .claude-plugin/marketplace.json (with agents/commands/hooks arrays)
 *   subagents/*.md
 *   commands/*.md
 *   hooks/*.md
 *
 * Target structure:
 *   .claude-plugin/marketplace.json (with source fields)
 *   plugins/{plugin-name}/.claude-plugin/plugin.json
 *   plugins/{plugin-name}/agents/*.md (or commands/hooks)
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const PLUGINS_DIR = path.join(ROOT_DIR, 'plugins');
const MARKETPLACE_FILE = path.join(ROOT_DIR, '.claude-plugin', 'marketplace.json');

// Read current marketplace.json
const marketplace = JSON.parse(fs.readFileSync(MARKETPLACE_FILE, 'utf8'));

console.log(`Found ${marketplace.plugins.length} plugins to migrate\n`);

// Create plugins directory
if (!fs.existsSync(PLUGINS_DIR)) {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });
  console.log('Created plugins/ directory\n');
}

// Process each plugin
for (const plugin of marketplace.plugins) {
  console.log(`Processing: ${plugin.name}`);

  const pluginDir = path.join(PLUGINS_DIR, plugin.name);
  const pluginConfigDir = path.join(pluginDir, '.claude-plugin');

  // Create plugin directory structure
  fs.mkdirSync(pluginConfigDir, { recursive: true });

  // Determine which component types this plugin has
  const hasAgents = plugin.agents && Array.isArray(plugin.agents) && plugin.agents.length > 0;
  const hasCommands = plugin.commands && Array.isArray(plugin.commands) && plugin.commands.length > 0;
  const hasHooks = plugin.hooks && (Array.isArray(plugin.hooks) ? plugin.hooks.length > 0 : typeof plugin.hooks === 'string');
  const hasMcp = plugin.mcpServers && Array.isArray(plugin.mcpServers) && plugin.mcpServers.length > 0;

  // Create plugin.json
  const pluginJson = {
    name: plugin.name,
    version: plugin.version || '1.0.0',
    description: plugin.description,
    author: plugin.author,
    repository: plugin.repository,
    license: plugin.license || 'MIT',
    keywords: plugin.keywords
  };

  fs.writeFileSync(
    path.join(pluginConfigDir, 'plugin.json'),
    JSON.stringify(pluginJson, null, 2)
  );

  // Copy agent files
  if (hasAgents) {
    const agentsDir = path.join(pluginDir, 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });

    for (const agentPath of plugin.agents) {
      // agentPath is like "./subagents/blockchain-developer.md"
      const srcPath = path.join(ROOT_DIR, agentPath.replace('./', ''));
      const fileName = path.basename(agentPath);
      const destPath = path.join(agentsDir, fileName);

      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
      } else {
        console.log(`  Warning: ${srcPath} not found`);
      }
    }
    console.log(`  Copied ${plugin.agents.length} agents`);
  }

  // Copy command files
  if (hasCommands) {
    const commandsDir = path.join(pluginDir, 'commands');
    fs.mkdirSync(commandsDir, { recursive: true });

    for (const cmdPath of plugin.commands) {
      const srcPath = path.join(ROOT_DIR, cmdPath.replace('./', ''));
      const fileName = path.basename(cmdPath);
      const destPath = path.join(commandsDir, fileName);

      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
      } else {
        console.log(`  Warning: ${srcPath} not found`);
      }
    }
    console.log(`  Copied ${plugin.commands.length} commands`);
  }

  // Copy hook files
  if (hasHooks) {
    const hooksDir = path.join(pluginDir, 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });

    // Handle both array and string formats
    const hooksList = Array.isArray(plugin.hooks) ? plugin.hooks : [];

    // If hooks is a string (JSON file reference), skip copying files
    if (typeof plugin.hooks === 'string') {
      console.log(`  Skipping hooks (JSON reference: ${plugin.hooks})`);
    } else {
      for (const hookPath of hooksList) {
        const srcPath = path.join(ROOT_DIR, hookPath.replace('./', ''));
        const fileName = path.basename(hookPath);
        const destPath = path.join(hooksDir, fileName);

        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
        } else {
          console.log(`  Warning: ${srcPath} not found`);
        }
      }
      console.log(`  Copied ${hooksList.length} hooks`);
    }
  }

  // Handle MCP servers (just reference them, don't copy)
  if (hasMcp) {
    console.log(`  Has ${plugin.mcpServers.length} MCP server references`);
  }

  // Add source field to plugin
  plugin.source = `./plugins/${plugin.name}`;
}

// Write updated marketplace.json
fs.writeFileSync(MARKETPLACE_FILE, JSON.stringify(marketplace, null, 2));
console.log('\nUpdated marketplace.json with source fields');

console.log('\n=== Migration Complete ===');
console.log(`Plugins created: ${marketplace.plugins.length}`);
console.log(`Location: ${PLUGINS_DIR}`);
console.log('\nTest with: /plugin marketplace add ./');
