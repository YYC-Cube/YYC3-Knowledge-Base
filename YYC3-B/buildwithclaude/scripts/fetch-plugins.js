#!/usr/bin/env node

/**
 * Plugin & Marketplace Discovery Script
 *
 * Discovers Claude Code plugins and marketplaces from GitHub using:
 * 1. GitHub Code Search (marketplace.json, plugin.json)
 * 2. GitHub Topics Search (claude-code-plugins, claude-code-plugin)
 *
 * Results are cached for 24 hours to avoid rate limits.
 * Use GITHUB_TOKEN env var for higher rate limits (5,000 req/hour vs 60 req/hour).
 */

const fs = require('fs').promises;
const path = require('path');

const GITHUB_API = 'https://api.github.com';
const CACHE_FILE = path.join(__dirname, '.plugin-cache.json');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Known marketplaces to seed discovery
const KNOWN_MARKETPLACES = [
  {
    repo: 'Kamalnrf/claude-plugins',
    url: 'https://claude-plugins.dev',
    displayName: 'Claude Plugins',
    description: 'Community registry with CLI for discovering and installing Claude Code plugins quickly. Automatically handles marketplace setup and plugin installation in one command.',
    categories: ['plugins', 'skills'],
    badges: ['popular', 'featured'],
  },
  {
    repo: 'ananddtyagi/claude-code-marketplace',
    url: 'https://claudecodecommands.directory',
    displayName: 'Claude Code Marketplace',
    description: 'Community-driven marketplace for Claude Code commands and plugins with a browsable web directory.',
    categories: ['commands', 'agents'],
    badges: [],
  },
  {
    repo: 'jeremylongshore/claude-code-plugins-plus-skills',
    url: 'https://github.com/jeremylongshore/claude-code-plugins-plus-skills',
    displayName: 'Plugins Plus Skills',
    description: '239 production-ready Agent Skills that activate automatically based on your conversations. Includes interactive Jupyter tutorials for learning.',
    categories: ['skills', 'tutorials'],
    badges: [],
  },
  {
    repo: 'anthropics/claude-code-plugins',
    url: 'https://github.com/anthropics/claude-code-plugins',
    displayName: 'Official Claude Plugins',
    description: 'Official Claude Code plugins from Anthropic including frontend-design, interview, and more.',
    categories: ['official', 'plugins'],
    badges: ['official'],
  },
];

// GitHub search queries for discovering plugins
const CODE_QUERIES = [
  'filename:marketplace.json path:claude-plugin',
  'filename:plugin.json path:.claude-plugin',
];

const TOPIC_QUERIES = [
  'claude-code-plugins',
  'claude-code-plugin',
];

/**
 * Make a GitHub API request with optional authentication
 */
async function githubFetch(url, options = {}) {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'buildwithclaude-discovery',
    ...options.headers,
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${error}`);
  }

  return response.json();
}

/**
 * Search GitHub code for plugin files
 */
async function searchGitHubCode(query) {
  const repos = new Set();

  try {
    const url = `${GITHUB_API}/search/code?q=${encodeURIComponent(query)}&per_page=100`;
    const data = await githubFetch(url);

    for (const item of data.items || []) {
      if (item.repository?.full_name) {
        repos.add(item.repository.full_name);
      }
    }

    console.log(`  Found ${repos.size} repos for query: ${query}`);
  } catch (error) {
    console.warn(`  Warning: Code search failed for "${query}": ${error.message}`);
  }

  return Array.from(repos);
}

/**
 * Search GitHub repositories by topic
 */
async function searchGitHubTopics(topic) {
  const repos = [];

  try {
    const url = `${GITHUB_API}/search/repositories?q=topic:${topic}&per_page=100&sort=stars&order=desc`;
    const data = await githubFetch(url);

    for (const item of data.items || []) {
      repos.push(item.full_name);
    }

    console.log(`  Found ${repos.length} repos for topic: ${topic}`);
  } catch (error) {
    console.warn(`  Warning: Topic search failed for "${topic}": ${error.message}`);
  }

  return repos;
}

/**
 * Fetch repository metadata from GitHub
 */
async function fetchRepoMetadata(repoFullName) {
  try {
    const url = `${GITHUB_API}/repos/${repoFullName}`;
    const data = await githubFetch(url);

    return {
      fullName: data.full_name,
      name: data.name,
      owner: data.owner.login,
      description: data.description || '',
      stars: data.stargazers_count,
      topics: data.topics || [],
      url: data.html_url,
      homepage: data.homepage,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.warn(`  Warning: Failed to fetch metadata for ${repoFullName}: ${error.message}`);
    return null;
  }
}

/**
 * Fetch plugin.json or marketplace.json content from a repo
 */
async function fetchPluginConfig(repoFullName) {
  const paths = [
    '.claude-plugin/plugin.json',
    'marketplace.json',
    'plugin.json',
  ];

  for (const filePath of paths) {
    try {
      const url = `https://raw.githubusercontent.com/${repoFullName}/main/${filePath}`;
      const response = await fetch(url);

      if (response.ok) {
        const content = await response.json();
        return { path: filePath, content };
      }
    } catch {
      // Try next path
    }

    // Also try master branch
    try {
      const url = `https://raw.githubusercontent.com/${repoFullName}/master/${filePath}`;
      const response = await fetch(url);

      if (response.ok) {
        const content = await response.json();
        return { path: filePath, content };
      }
    } catch {
      // Try next path
    }
  }

  return null;
}

/**
 * Determine if a repo is a marketplace/registry vs individual plugin
 */
function isMarketplace(repo, pluginConfig) {
  // Check known marketplaces first
  if (KNOWN_MARKETPLACES.some(m => m.repo === repo.fullName)) {
    return true;
  }

  // High content count indicates collection
  const config = pluginConfig?.content || {};
  const hasManyComanands = (config.commands?.length || 0) > 10;
  const hasManyAgents = (config.agents?.length || 0) > 10;
  const hasManySkills = (config.skills?.length || 0) > 10;

  // Topic/keyword indicators
  const hasMarketplaceTopic = repo.topics?.some(t =>
    ['marketplace', 'registry', 'collection', 'awesome'].includes(t.toLowerCase())
  );
  const hasMarketplaceKeyword =
    repo.description?.toLowerCase().includes('marketplace') ||
    repo.description?.toLowerCase().includes('registry') ||
    repo.description?.toLowerCase().includes('collection') ||
    repo.name?.toLowerCase().includes('marketplace');

  return hasManyComanands || hasManyAgents || hasManySkills ||
         hasMarketplaceTopic || hasMarketplaceKeyword;
}

/**
 * Count plugins/skills in a repo
 */
function countPluginContents(pluginConfig) {
  const config = pluginConfig?.content || {};

  return {
    commands: config.commands?.length || 0,
    agents: config.agents?.length || 0,
    skills: normalizeSkills(config.skills).length,
    hooks: config.hooks?.length || 0,
  };
}

/**
 * Format a marketplace for the registry
 */
function formatMarketplace(repo, pluginConfig) {
  // Check if this is a known marketplace with predefined data
  const known = KNOWN_MARKETPLACES.find(m => m.repo === repo.fullName);
  const counts = countPluginContents(pluginConfig);
  const totalPlugins = counts.commands + counts.agents + counts.hooks;

  return {
    name: repo.name,
    displayName: known?.displayName || repo.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    description: known?.description || repo.description,
    url: known?.url || repo.homepage || repo.url,
    repository: repo.url,
    installCommand: `/plugin marketplace add ${repo.fullName}`,
    pluginCount: totalPlugins || (known ? 100 : 0), // Estimate if not in config
    skillCount: counts.skills || (known ? 50 : 0),
    stars: repo.stars,
    categories: known?.categories || extractCategories(repo, pluginConfig),
    badges: known?.badges || [],
    maintainer: {
      name: repo.owner,
      github: repo.owner,
    },
    updatedAt: repo.updatedAt,
  };
}

/**
 * Normalize skills from various formats to an array of names
 */
function normalizeSkills(skills) {
  if (!skills) return [];
  if (Array.isArray(skills)) {
    return skills.map(s => s.name || s);
  }
  if (typeof skills === 'object') {
    // Handle object format: { "skill-name": { ... } }
    return Object.keys(skills);
  }
  if (typeof skills === 'string') {
    return [skills];
  }
  return [];
}

/**
 * Format a plugin for the registry
 */
function formatPlugin(repo, pluginConfig) {
  const config = pluginConfig?.content || {};

  return {
    name: config.name || repo.name,
    namespace: repo.fullName,
    description: config.description || repo.description,
    repository: repo.url,
    stars: repo.stars,
    installCommand: `npx claude-plugins install ${repo.fullName}`,
    categories: extractCategories(repo, pluginConfig),
    skills: normalizeSkills(config.skills),
    version: config.version || '1.0.0',
    author: config.author?.name || repo.owner,
    keywords: config.keywords || [],
    updatedAt: repo.updatedAt,
  };
}

/**
 * Extract categories from repo topics and plugin config
 */
function extractCategories(repo, pluginConfig) {
  const categories = new Set();
  const config = pluginConfig?.content || {};

  // From topics
  for (const topic of repo.topics || []) {
    if (!topic.includes('claude') && !topic.includes('plugin')) {
      categories.add(topic);
    }
  }

  // From keywords
  for (const keyword of config.keywords || []) {
    categories.add(keyword);
  }

  // From category field
  if (config.category) {
    categories.add(config.category);
  }

  return Array.from(categories).slice(0, 5);
}

/**
 * Read cached data if valid
 */
async function readCache() {
  try {
    const content = await fs.readFile(CACHE_FILE, 'utf-8');
    const cache = JSON.parse(content);

    if (Date.now() - cache.timestamp < CACHE_TTL) {
      return cache.data;
    }
  } catch {
    // No cache or invalid
  }

  return null;
}

/**
 * Write data to cache
 */
async function writeCache(data) {
  const cache = {
    timestamp: Date.now(),
    data,
  };

  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Main discovery function
 */
async function discoverPlugins() {
  console.log('Discovering Claude Code plugins from GitHub...\n');

  // Check cache first
  const cached = await readCache();
  if (cached) {
    console.log('Using cached plugin data (less than 24 hours old)\n');
    return cached;
  }

  console.log('Fetching fresh data from GitHub...\n');

  // Collect all unique repos
  const repoSet = new Set();

  // Add known marketplaces first
  for (const known of KNOWN_MARKETPLACES) {
    repoSet.add(known.repo);
  }

  // Search by code (requires auth for best results)
  console.log('Searching GitHub code...');
  for (const query of CODE_QUERIES) {
    const repos = await searchGitHubCode(query);
    repos.forEach(r => repoSet.add(r));
    await sleep(1000); // Rate limit delay
  }

  // Search by topics
  console.log('\nSearching GitHub topics...');
  for (const topic of TOPIC_QUERIES) {
    const repos = await searchGitHubTopics(topic);
    repos.forEach(r => repoSet.add(r));
    await sleep(1000); // Rate limit delay
  }

  console.log(`\nFound ${repoSet.size} unique repositories\n`);

  // Fetch metadata and categorize
  const marketplaces = [];
  const plugins = [];

  let processed = 0;
  for (const repoFullName of repoSet) {
    processed++;
    console.log(`Processing ${processed}/${repoSet.size}: ${repoFullName}`);

    const repo = await fetchRepoMetadata(repoFullName);
    if (!repo) continue;

    const pluginConfig = await fetchPluginConfig(repoFullName);

    if (isMarketplace(repo, pluginConfig)) {
      marketplaces.push(formatMarketplace(repo, pluginConfig));
    } else if (pluginConfig) {
      plugins.push(formatPlugin(repo, pluginConfig));
    }

    await sleep(500); // Rate limit delay
  }

  // Sort by stars
  marketplaces.sort((a, b) => b.stars - a.stars);
  plugins.sort((a, b) => b.stars - a.stars);

  const result = { marketplaces, plugins };

  // Cache results
  await writeCache(result);

  console.log(`\nDiscovery complete!`);
  console.log(`  - ${marketplaces.length} marketplaces`);
  console.log(`  - ${plugins.length} plugins`);

  return result;
}

/**
 * Sleep helper for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main entry point
 */
async function main() {
  try {
    const result = await discoverPlugins();

    // Output to stdout for piping
    console.log('\n--- JSON Output ---\n');
    console.log(JSON.stringify(result, null, 2));

    // Also write to a file for generate-registry.js to import
    const outputPath = path.join(__dirname, '.discovered-plugins.json');
    await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
    console.log(`\nWritten to: ${outputPath}`);
  } catch (error) {
    console.error('Discovery failed:', error);
    process.exit(1);
  }
}

// Export for use by generate-registry.js
module.exports = { discoverPlugins, KNOWN_MARKETPLACES };

// Run if called directly
if (require.main === module) {
  main();
}
