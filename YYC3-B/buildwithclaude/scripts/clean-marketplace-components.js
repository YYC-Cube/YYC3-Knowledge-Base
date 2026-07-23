#!/usr/bin/env node
/**
 * Remove component arrays (agents, commands, hooks, mcpServers) from marketplace.json
 * when a plugin has a source field (components are auto-discovered from plugin directory)
 */

const fs = require('fs');
const path = require('path');

const MARKETPLACE_FILE = path.join(__dirname, '..', '.claude-plugin', 'marketplace.json');

const marketplace = JSON.parse(fs.readFileSync(MARKETPLACE_FILE, 'utf8'));

let cleanedCount = 0;

for (const plugin of marketplace.plugins) {
  // Only clean plugins that have a source field (auto-discovery)
  if (plugin.source) {
    const componentsRemoved = [];

    if (plugin.agents) {
      componentsRemoved.push(`agents: ${plugin.agents.length}`);
      delete plugin.agents;
    }
    if (plugin.commands) {
      componentsRemoved.push(`commands: ${plugin.commands.length}`);
      delete plugin.commands;
    }
    if (plugin.hooks) {
      componentsRemoved.push(`hooks: ${Array.isArray(plugin.hooks) ? plugin.hooks.length : 1}`);
      delete plugin.hooks;
    }
    if (plugin.mcpServers) {
      componentsRemoved.push(`mcpServers: ${plugin.mcpServers.length}`);
      delete plugin.mcpServers;
    }

    // Also remove strict field as it's not needed with source
    if (plugin.strict !== undefined) {
      delete plugin.strict;
    }

    if (componentsRemoved.length > 0) {
      console.log(`Cleaned ${plugin.name}: ${componentsRemoved.join(', ')}`);
      cleanedCount++;
    }
  }
}

fs.writeFileSync(MARKETPLACE_FILE, JSON.stringify(marketplace, null, 2));
console.log(`\nCleaned ${cleanedCount} plugins with source fields`);
