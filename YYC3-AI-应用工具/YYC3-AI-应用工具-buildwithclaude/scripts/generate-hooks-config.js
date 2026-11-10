#!/usr/bin/env node

/**
 * Generate hooks configuration files for Claude Code Plugin Marketplace
 *
 * This script reads hooks from the registry and generates proper hooks.json
 * files that follow the Claude Code hooks configuration format.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '../web-ui/public/registry.json');
const HOOKS_DIR = path.join(__dirname, '../hooks');

// Read registry
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

if (!registry.hooks || registry.hooks.length === 0) {
  console.log('No hooks found in registry');
  process.exit(0);
}

// Ensure hooks directory exists
if (!fs.existsSync(HOOKS_DIR)) {
  fs.mkdirSync(HOOKS_DIR, { recursive: true });
}

// Convert hook event names to Claude Code format
function formatEvent(event) {
  // Map to Claude Code hook event types
  const eventMap = {
    'SessionStart': 'SessionStart',
    'SessionEnd': 'SessionEnd',
    'PreToolUse': 'PreToolUse',
    'PostToolUse': 'PostToolUse',
    'Notification': 'Notification',
    'Stop': 'Stop',
    'SubagentStop': 'SubagentStop',
    'PreCompact': 'PreCompact',
    'UserPromptSubmit': 'UserPromptSubmit',
  };
  return eventMap[event] || event;
}

// Group hooks by category
const hooksByCategory = {};
registry.hooks.forEach(hook => {
  const cat = hook.category || 'general';
  if (!hooksByCategory[cat]) hooksByCategory[cat] = [];
  hooksByCategory[cat].push(hook);
});

// Generate all-hooks.json with all hooks combined
const allHooksConfig = {};

registry.hooks.forEach(hook => {
  const event = formatEvent(hook.event);
  if (!allHooksConfig[event]) {
    allHooksConfig[event] = [];
  }

  const hookEntry = {
    matcher: hook.matcher || '',
    hooks: [
      {
        type: 'command',
        command: generateHookCommand(hook),
      }
    ]
  };

  // Add description as comment
  hookEntry._comment = `${hook.name}: ${hook.description}`;

  allHooksConfig[event].push(hookEntry);
});

fs.writeFileSync(
  path.join(HOOKS_DIR, 'all-hooks.json'),
  JSON.stringify(allHooksConfig, null, 2)
);
console.log('Generated hooks/all-hooks.json');

// Generate category-specific hooks files
Object.keys(hooksByCategory).forEach(category => {
  const hooks = hooksByCategory[category];
  const categoryConfig = {};

  hooks.forEach(hook => {
    const event = formatEvent(hook.event);
    if (!categoryConfig[event]) {
      categoryConfig[event] = [];
    }

    const hookEntry = {
      matcher: hook.matcher || '',
      hooks: [
        {
          type: 'command',
          command: generateHookCommand(hook),
        }
      ]
    };

    // Add description as comment
    hookEntry._comment = `${hook.name}: ${hook.description}`;

    categoryConfig[event].push(hookEntry);
  });

  const filename = `${category}-hooks.json`;
  fs.writeFileSync(
    path.join(HOOKS_DIR, filename),
    JSON.stringify(categoryConfig, null, 2)
  );
  console.log(`Generated hooks/${filename}`);
});

// Generate individual hook files as markdown (for reference/documentation)
registry.hooks.forEach(hook => {
  const content = `---
name: ${hook.name}
description: ${hook.description}
category: ${hook.category || 'general'}
event: ${hook.event}
matcher: ${hook.matcher || '*'}
language: ${hook.language || 'bash'}
version: ${hook.version || '1.0.0'}
---

# ${hook.name}

${hook.description}

## Event Configuration

- **Event Type**: \`${hook.event}\`
- **Tool Matcher**: \`${hook.matcher || '*'}\`
- **Category**: ${hook.category || 'general'}

## Environment Variables

${hook.envVars && hook.envVars.length > 0 ? hook.envVars.map(v => `- \`${v}\``).join('\n') : 'None required'}

## Requirements

${hook.requirements && hook.requirements.length > 0 ? hook.requirements.map(r => `- ${r}`).join('\n') : 'None'}

`;

  fs.writeFileSync(
    path.join(HOOKS_DIR, `${hook.name}.md`),
    content
  );
});
console.log(`Generated ${registry.hooks.length} individual hook markdown files`);

// Helper function to generate hook command
function generateHookCommand(hook) {
  // Generate a shell command that would be executed for this hook
  // This is a placeholder - actual implementation would depend on hook type
  const envSetup = hook.envVars && hook.envVars.length > 0
    ? hook.envVars.map(v => `export ${v}="$${v}"`).join(' && ') + ' && '
    : '';


  // Default: run a script from hooks directory
  return `${envSetup}./hooks/scripts/${hook.name}.sh`;
}

console.log('\nHook configuration files generated successfully!');
console.log(`Total hooks: ${registry.hooks.length}`);
console.log(`Categories: ${Object.keys(hooksByCategory).join(', ')}`);
