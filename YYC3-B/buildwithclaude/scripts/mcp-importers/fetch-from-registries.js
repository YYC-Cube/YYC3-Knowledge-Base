#!/usr/bin/env node

/**
 * Script to fetch MCP servers from various registries and generate markdown files
 * This is an internal maintenance script, not part of the public BWC CLI
 */

import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import dotenv from 'dotenv'
import { program } from 'commander'
import { DockerMCPFetcher } from './registry-fetchers/docker-mcp.js'
import { generateMarkdown } from './utils/markdown-generator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') })

// Configure CLI
program
  .name('fetch-from-registries')
  .description('Fetch Docker MCP servers from registry and generate markdown files')
  .option('-r, --registry <registry>', 'Registry to fetch from (docker-mcp)', 'docker-mcp')
  .option('-o, --output <path>', 'Output directory', '../../mcp-servers')
  .option('--limit <number>', 'Limit number of servers to fetch', '0')
  .option('--dry-run', 'Preview without writing files')
  .parse()

const options = program.opts()

// Registry fetcher - now only Docker MCP
const fetchers = {
  'docker-mcp': new DockerMCPFetcher()
}

async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch (error) {
    // Directory already exists
  }
}

async function fetchFromRegistry(registryName, fetcher) {
  console.log(`\n📥 Fetching from ${registryName}...`)
  
  try {
    const servers = await fetcher.fetchServers()
    console.log(`✅ Found ${servers.length} servers from ${registryName}`)
    return servers
  } catch (error) {
    console.error(`❌ Failed to fetch from ${registryName}:`, error.message)
    return []
  }
}

async function writeServerFile(server, outputDir) {
  const filePath = path.join(outputDir, server.file)
  const dirPath = path.dirname(filePath)
  
  await ensureDir(dirPath)
  
  const markdown = generateMarkdown(server)
  
  if (options.dryRun) {
    console.log(`\n--- DRY RUN: Would write to ${filePath} ---`)
    console.log(markdown.substring(0, 500) + '...')
    return
  }
  
  await fs.writeFile(filePath, markdown, 'utf-8')
  console.log(`✓ Generated ${filePath}`)
}

async function main() {
  console.log('🚀 Starting MCP server registry fetch...')
  
  const outputDir = path.join(__dirname, options.output)
  let allServers = []
  
  // Determine which registries to fetch from
  const registriesToFetch = options.registry === 'all' 
    ? Object.keys(fetchers)
    : [options.registry]
  
  // Fetch from selected registries
  for (const registryName of registriesToFetch) {
    const fetcher = fetchers[registryName]
    if (!fetcher) {
      console.warn(`⚠️  Registry '${registryName}' is not implemented yet`)
      continue
    }
    
    const servers = await fetchFromRegistry(registryName, fetcher)
    allServers = allServers.concat(servers)
  }
  
  // Apply limit if specified
  if (options.limit && parseInt(options.limit) > 0) {
    allServers = allServers.slice(0, parseInt(options.limit))
    console.log(`\n📊 Limited to ${allServers.length} servers`)
  }
  
  console.log(`\n📝 Processing ${allServers.length} servers total...`)
  
  // Write server files
  for (const server of allServers) {
    await writeServerFile(server, outputDir)
  }
  
  console.log(`\n✨ Done! Generated ${allServers.length} server definitions`)
  
  if (!options.dryRun) {
    console.log('\n📋 Next steps:')
    console.log('1. Run: cd web-ui && npm run generate-registry')
    console.log('2. Commit the changes')
    console.log('3. The servers will be available in the BWC CLI and web UI')
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})