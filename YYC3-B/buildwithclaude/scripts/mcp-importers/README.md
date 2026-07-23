# MCP Registry Importers

Internal maintenance scripts for fetching MCP servers from various registries and generating markdown files for the Claude Code Subagents Collection.

## Overview

These scripts are used to automatically import MCP server definitions from:
- Docker Hub (Official MCP Docker images)
- GitHub (ModelContextProtocol official servers) - Coming soon
- MCPMarket - Coming soon

The fetched servers are converted to our markdown format and stored in `/mcp-servers/auto-imported/`.

## Setup

1. Install dependencies:
```bash
cd scripts/mcp-importers
npm install
```

2. Configure API keys (if needed):
```bash
cp .env.example .env
# Edit .env if you need to add API keys
```

## Usage

### Fetch from all registries:
```bash
npm run fetch:all
```

### Fetch from specific registry:
```bash
npm run fetch:docker
# npm run fetch:github (coming soon)
```

### Advanced options:
```bash
# Limit number of servers
node fetch-from-registries.js --registry docker --limit 10

# Dry run (preview without writing)
node fetch-from-registries.js --registry docker --dry-run

# Custom output directory
node fetch-from-registries.js --output ../../custom-output
```

## GitHub Actions

The fetch process runs automatically via GitHub Actions:
- **Schedule**: Daily at 2 AM UTC
- **Manual trigger**: Via Actions tab in GitHub
- **Output**: Creates PR with updates

The workflow runs automatically and fetches Docker MCP servers.

## Directory Structure

Generated files are organized by source:
```
/mcp-servers/auto-imported/
├── docker/       # Docker Hub MCP images
├── github/       # Future: Official MCP servers from GitHub
└── mcpmarket/    # Future: MCPMarket servers
```

## After Fetching

After fetching new servers:

1. **Generate registry**:
```bash
cd ../../web-ui
npm run generate-registry
```

2. **Commit changes**:
```bash
git add mcp-servers/auto-imported
git commit -m "chore: update auto-imported MCP servers"
```

3. **Servers are now available**:
- In Web UI: https://buildwithclaude.com/mcp-servers

## Adding New Registry Fetchers

To add support for a new registry:

1. Create fetcher in `registry-fetchers/new-registry.js`
2. Implement the fetcher class with `fetchServers()` method
3. Import and add to `fetchers` object in `fetch-from-registries.js`
4. Add npm script in `package.json`

## Notes

- These are internal maintenance scripts
- API keys are only needed for these maintenance scripts, not for end users