#!/usr/bin/env node
/**
 * Fix hooks in marketplace.json to reference actual MD files by category
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const ROOT_DIR = path.join(__dirname, '..');
const HOOKS_DIR = path.join(ROOT_DIR, 'hooks');
const MARKETPLACE_FILE = path.join(ROOT_DIR, '.claude-plugin', 'marketplace.json');

// Read all hook files and group by category
const hooksByCategory = {};
const allHooks = [];

const hookFiles = fs.readdirSync(HOOKS_DIR).filter(f => f.endsWith('.md'));

for (const file of hookFiles) {
  const content = fs.readFileSync(path.join(HOOKS_DIR, file), 'utf8');
  const { data } = matter(content);

  const category = data.category || 'miscellaneous';
  const hookPath = `./hooks/${file}`;

  if (!hooksByCategory[category]) {
    hooksByCategory[category] = [];
  }
  hooksByCategory[category].push(hookPath);
  allHooks.push(hookPath);
}

console.log('Hooks by category:');
for (const [cat, hooks] of Object.entries(hooksByCategory)) {
  console.log(`  ${cat}: ${hooks.length} hooks`);
}
console.log(`  Total: ${allHooks.length} hooks\n`);

// Read and update marketplace.json
const marketplace = JSON.parse(fs.readFileSync(MARKETPLACE_FILE, 'utf8'));

for (const plugin of marketplace.plugins) {
  // Fix hook bundles
  if (plugin.name.startsWith('hooks-')) {
    const category = plugin.name.replace('hooks-', '');
    const hooks = hooksByCategory[category] || [];
    plugin.hooks = hooks;
    console.log(`Updated ${plugin.name}: ${hooks.length} hooks`);
  }

  // Fix all-hooks bundle
  if (plugin.name === 'all-hooks') {
    plugin.hooks = allHooks;
    console.log(`Updated all-hooks: ${allHooks.length} hooks`);
  }
}

// Write updated marketplace.json
fs.writeFileSync(MARKETPLACE_FILE, JSON.stringify(marketplace, null, 2));
console.log('\nmarketplace.json updated!');
