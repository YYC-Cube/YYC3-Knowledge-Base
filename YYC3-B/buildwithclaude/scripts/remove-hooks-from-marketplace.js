#!/usr/bin/env node
/**
 * Remove hooks arrays from marketplace.json
 * Hooks are auto-discovered from plugin directories, not defined in marketplace.json
 */

const fs = require('fs');
const path = require('path');

const MARKETPLACE_FILE = path.join(__dirname, '..', '.claude-plugin', 'marketplace.json');

const marketplace = JSON.parse(fs.readFileSync(MARKETPLACE_FILE, 'utf8'));

let removedCount = 0;

for (const plugin of marketplace.plugins) {
  if (plugin.hooks) {
    console.log(`Removing hooks from ${plugin.name}`);
    delete plugin.hooks;
    removedCount++;
  }
}

fs.writeFileSync(MARKETPLACE_FILE, JSON.stringify(marketplace, null, 2));
console.log(`\nRemoved hooks from ${removedCount} plugins`);
