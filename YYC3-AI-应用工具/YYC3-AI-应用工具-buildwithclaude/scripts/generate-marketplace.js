#!/usr/bin/env node

/**
 * Generate marketplace.json for Claude Code Plugin Marketplace
 *
 * This script reads the existing registry.json and generates a
 * marketplace.json file following the Claude Code plugin marketplace format.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '../web-ui/public/registry.json');
const MARKETPLACE_PATH = path.join(__dirname, '../.claude-plugin/marketplace.json');

// Read registry
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

// Category display names
const categoryDisplayNames = {
  // Subagent categories
  'blockchain-web3': 'Blockchain & Web3 Agents',
  'business-finance': 'Business & Finance Agents',
  'crypto-trading': 'Crypto Trading Agents',
  'data-ai': 'Data & AI Agents',
  'design-experience': 'Design & Experience Agents',
  'development-architecture': 'Development & Architecture Agents',
  'infrastructure-operations': 'Infrastructure & Operations Agents',
  'language-specialists': 'Language Specialist Agents',
  'quality-security': 'Quality & Security Agents',
  'sales-marketing': 'Sales & Marketing Agents',
  'specialized-domains': 'Specialized Domain Agents',
  // Command categories
  'api-development': 'API Development Commands',
  'automation-workflow': 'Automation & Workflow Commands',
  'ci-deployment': 'CI/CD & Deployment Commands',
  'code-analysis-testing': 'Code Analysis & Testing Commands',
  'context-loading-priming': 'Context & Priming Commands',
  'database-operations': 'Database Operations Commands',
  'documentation-changelogs': 'Documentation & Changelog Commands',
  'framework-svelte': 'Svelte Framework Commands',
  'game-development': 'Game Development Commands',
  'integration-sync': 'Integration & Sync Commands',
  'miscellaneous': 'Miscellaneous Commands',
  'monitoring-observability': 'Monitoring & Observability Commands',
  'performance-optimization': 'Performance Optimization Commands',
  'project-setup': 'Project Setup Commands',
  'project-task-management': 'Project & Task Management Commands',
  'security-audit': 'Security Audit Commands',
  'simulation-modeling': 'Simulation & Modeling Commands',
  'team-collaboration': 'Team Collaboration Commands',
  'typescript-migration': 'TypeScript Migration Commands',
  'utilities-debugging': 'Utilities & Debugging Commands',
  'version-control-git': 'Version Control & Git Commands',
  'workflow-orchestration': 'Workflow Orchestration Commands',
  // Hook categories
  'git': 'Git Hooks',
  'automation': 'Automation Hooks',
  'development': 'Development Hooks',
  'notifications': 'Notification Hooks',
  'security': 'Security Hooks',
  'formatting': 'Formatting Hooks',
  'testing': 'Testing Hooks',
  'performance': 'Performance Hooks',
};

// Category descriptions
const categoryDescriptions = {
  // Subagent categories
  'blockchain-web3': 'Specialized agents for blockchain development, smart contracts, and Web3 applications',
  'business-finance': 'Agents for business analysis, financial modeling, and KPI tracking',
  'crypto-trading': 'Expert agents for cryptocurrency trading, DeFi strategies, and market analysis',
  'data-ai': 'Agents for data engineering, machine learning, and AI development',
  'design-experience': 'Agents for UI/UX design, accessibility, and user experience optimization',
  'development-architecture': 'Expert agents for software architecture, backend development, and system design',
  'infrastructure-operations': 'Agents for cloud infrastructure, DevOps, and database operations',
  'language-specialists': 'Expert agents for specific programming languages (Python, Go, Rust, etc.)',
  'quality-security': 'Agents for code review, security audits, debugging, and quality assurance',
  'sales-marketing': 'Agents for content marketing, customer support, and sales automation',
  'specialized-domains': 'Domain-specific expert agents for research, documentation, and specialized tasks',
  // Command categories
  'api-development': 'Commands for designing and documenting REST and GraphQL APIs',
  'automation-workflow': 'Commands for automating repetitive tasks and workflows',
  'ci-deployment': 'Commands for CI/CD setup, containerization, and deployment automation',
  'code-analysis-testing': 'Commands for code review, testing, and analysis',
  'context-loading-priming': 'Commands for loading context and priming Claude for specific tasks',
  'database-operations': 'Commands for database schema design, migrations, and optimization',
  'documentation-changelogs': 'Commands for generating documentation and managing changelogs',
  'framework-svelte': 'Specialized commands for Svelte and SvelteKit development',
  'game-development': 'Commands for game development workflows',
  'integration-sync': 'Commands for integrating with external services and syncing data',
  'miscellaneous': 'General-purpose utility commands',
  'monitoring-observability': 'Commands for setting up monitoring and observability',
  'performance-optimization': 'Commands for optimizing build, bundle size, and performance',
  'project-setup': 'Commands for initializing and setting up new projects',
  'project-task-management': 'Commands for task management and project tracking',
  'security-audit': 'Commands for security auditing and vulnerability scanning',
  'simulation-modeling': 'Commands for scenario simulation and decision modeling',
  'team-collaboration': 'Commands for team workflows, PR reviews, and collaboration',
  'typescript-migration': 'Commands for migrating JavaScript projects to TypeScript',
  'utilities-debugging': 'General debugging and utility commands',
  'version-control-git': 'Commands for Git operations, commits, and PRs',
  'workflow-orchestration': 'Commands for orchestrating complex workflows',
};

// Group items by category
function groupByCategory(items) {
  const groups = {};
  items.forEach(item => {
    const cat = item.category || 'miscellaneous';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });
  return groups;
}

// Generate plugin entries
const plugins = [];

// 1. Agent plugins (grouped by category)
const agentsByCategory = groupByCategory(registry.subagents);
Object.keys(agentsByCategory).sort().forEach(category => {
  const agents = agentsByCategory[category];
  plugins.push({
    name: `agents-${category}`,
    description: categoryDescriptions[category] || `${categoryDisplayNames[category] || category} - Specialized AI agents`,
    version: '1.0.0',
    author: {
      name: 'BuildWithClaude Community',
      url: 'https://github.com/davepoon/claude-code-subagents-collection'
    },
    repository: 'https://github.com/davepoon/claude-code-subagents-collection',
    license: 'MIT',
    keywords: ['agents', 'subagents', category, ...agents.map(a => a.name)],
    category: 'agents',
    strict: false,
    agents: agents.map(a => `./subagents/${a.name}.md`)
  });
});

// 2. Command plugins (grouped by category)
const commandsByCategory = groupByCategory(registry.commands);
Object.keys(commandsByCategory).sort().forEach(category => {
  const commands = commandsByCategory[category];
  plugins.push({
    name: `commands-${category}`,
    description: categoryDescriptions[category] || `${categoryDisplayNames[category] || category} - Slash commands for automation`,
    version: '1.0.0',
    author: {
      name: 'BuildWithClaude Community',
      url: 'https://github.com/davepoon/claude-code-subagents-collection'
    },
    repository: 'https://github.com/davepoon/claude-code-subagents-collection',
    license: 'MIT',
    keywords: ['commands', 'slash-commands', category, ...commands.map(c => c.name)],
    category: 'commands',
    strict: false,
    commands: commands.map(c => `./commands/${c.name}.md`)
  });
});

// 3. Hook plugins (grouped by category)
if (registry.hooks && registry.hooks.length > 0) {
  const hooksByCategory = groupByCategory(registry.hooks);
  Object.keys(hooksByCategory).sort().forEach(category => {
    const hooks = hooksByCategory[category];
    plugins.push({
      name: `hooks-${category}`,
      description: `${categoryDisplayNames[category] || category} - Event-driven automation hooks`,
      version: '1.0.0',
      author: {
        name: 'BuildWithClaude Community',
        url: 'https://github.com/davepoon/claude-code-subagents-collection'
      },
      repository: 'https://github.com/davepoon/claude-code-subagents-collection',
      license: 'MIT',
      keywords: ['hooks', 'automation', category, ...hooks.map(h => h.name)],
      category: 'hooks',
      strict: false,
      hooks: `./hooks/${category}-hooks.json`
    });
  });
}

// 4. MCP Server plugins (grouped by category)
if (registry.mcpServers && registry.mcpServers.length > 0) {
  // Group MCP servers by category
  const mcpByCategory = {};
  registry.mcpServers.forEach(mcp => {
    const cat = mcp.category || 'general';
    if (!mcpByCategory[cat]) mcpByCategory[cat] = [];
    mcpByCategory[cat].push(mcp);
  });

  // Create a comprehensive MCP plugin
  plugins.push({
    name: 'mcp-servers-docker',
    description: 'Docker-based MCP servers from the official Docker MCP registry - includes 199+ verified servers',
    version: '1.0.0',
    author: {
      name: 'Docker Inc. & BuildWithClaude Community',
      url: 'https://github.com/davepoon/claude-code-subagents-collection'
    },
    homepage: 'https://hub.docker.com/u/mcp',
    repository: 'https://github.com/davepoon/claude-code-subagents-collection',
    license: 'MIT',
    keywords: ['mcp', 'docker', 'servers', 'integrations', ...Object.keys(mcpByCategory)],
    category: 'mcp-servers',
    strict: false,
    mcpServers: './mcp-servers.json'
  });
}

// 5. Create "all-in-one" bundle plugins
plugins.push({
  name: 'all-agents',
  description: 'Complete collection of 117 specialized AI agents across 11 categories',
  version: '1.0.0',
  author: {
    name: 'BuildWithClaude Community',
    url: 'https://github.com/davepoon/claude-code-subagents-collection'
  },
  repository: 'https://github.com/davepoon/claude-code-subagents-collection',
  license: 'MIT',
  keywords: ['agents', 'subagents', 'all', 'bundle'],
  category: 'agents',
  strict: false,
  agents: registry.subagents.map(a => `./subagents/${a.name}.md`)
});

plugins.push({
  name: 'all-commands',
  description: 'Complete collection of 174 slash commands across 22 categories',
  version: '1.0.0',
  author: {
    name: 'BuildWithClaude Community',
    url: 'https://github.com/davepoon/claude-code-subagents-collection'
  },
  repository: 'https://github.com/davepoon/claude-code-subagents-collection',
  license: 'MIT',
  keywords: ['commands', 'slash-commands', 'all', 'bundle'],
  category: 'commands',
  strict: false,
  commands: registry.commands.map(c => `./commands/${c.name}.md`)
});

plugins.push({
  name: 'all-hooks',
  description: 'Complete collection of 28 automation hooks for event-driven workflows',
  version: '1.0.0',
  author: {
    name: 'BuildWithClaude Community',
    url: 'https://github.com/davepoon/claude-code-subagents-collection'
  },
  repository: 'https://github.com/davepoon/claude-code-subagents-collection',
  license: 'MIT',
  keywords: ['hooks', 'automation', 'all', 'bundle'],
  category: 'hooks',
  strict: false,
  hooks: './hooks/all-hooks.json'
});

// Create marketplace object
const marketplace = {
  $schema: 'https://anthropic.com/claude-code/marketplace.schema.json',
  name: 'buildwithclaude',
  version: '1.0.0',
  owner: {
    name: 'BuildWithClaude Community',
    email: 'community@buildwithclaude.com',
    url: 'https://github.com/davepoon/claude-code-subagents-collection'
  },
  metadata: {
    description: 'A comprehensive community-driven collection of 117 AI agents, 174 slash commands, 28 hooks, and 199 MCP servers for Claude Code',
    version: '1.0.0',
    homepage: 'https://buildwithclaude.com',
    repository: 'https://github.com/davepoon/claude-code-subagents-collection',
    license: 'MIT',
    keywords: [
      'claude-code',
      'agents',
      'commands',
      'hooks',
      'mcp-servers',
      'automation',
      'ai-tools'
    ]
  },
  plugins
};

// Write marketplace.json
fs.writeFileSync(MARKETPLACE_PATH, JSON.stringify(marketplace, null, 2));
console.log(`Generated marketplace.json with ${plugins.length} plugin entries`);
console.log(`  - ${Object.keys(agentsByCategory).length} agent category plugins`);
console.log(`  - ${Object.keys(commandsByCategory).length} command category plugins`);
console.log(`  - Hook plugins included`);
console.log(`  - MCP servers plugin included`);
console.log(`  - 3 "all-in-one" bundle plugins included`);
