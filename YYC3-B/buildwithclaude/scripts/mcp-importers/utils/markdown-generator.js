/**
 * Markdown generator for MCP server definitions
 */

export function generateMarkdown(server) {
  const frontmatter = generateFrontmatter(server)
  const content = generateContent(server)
  
  return `${frontmatter}\n${content}`
}

function generateFrontmatter(server) {
  const yaml = [`---`]
  yaml.push(`name: ${server.name}`)
  yaml.push(`display_name: ${server.display_name}`)
  yaml.push(`description: ${server.description}`)
  yaml.push(`category: ${server.category}`)
  yaml.push(`server_type: ${server.server_type}`)
  yaml.push(`protocol_version: "${server.protocol_version}"`)
  
  if (server.execution_type) {
    yaml.push(`execution_type: ${server.execution_type}`)
  }
  
  // Security section
  yaml.push(`security:`)
  yaml.push(`  auth_type: ${server.security.auth_type}`)
  yaml.push(`  permissions: ${server.security.permissions.length > 0 ? '' : '[]'}`)
  if (server.security.permissions.length > 0) {
    server.security.permissions.forEach(perm => {
      yaml.push(`    - "${perm}"`)
    })
  }
  
  // Sources section
  yaml.push(`sources:`)
  if (server.sources.official) {
    yaml.push(`  official: ${server.sources.official}`)
  }
  if (server.sources.docker) {
    yaml.push(`  docker: "${server.sources.docker}"`)
  }
  if (server.sources.npm) {
    yaml.push(`  npm: "${server.sources.npm}"`)
  }
  if (server.sources.marketplace) {
    yaml.push(`  marketplace:`)
    if (server.sources.marketplace.smithery) {
      yaml.push(`    smithery: "${server.sources.marketplace.smithery}"`)
    }
    if (server.sources.marketplace.mcpmarket) {
      yaml.push(`    mcpmarket: "${server.sources.marketplace.mcpmarket}"`)
    }
  }
  
  // Verification section
  yaml.push(`verification:`)
  yaml.push(`  status: ${server.verification.status}`)
  yaml.push(`  last_tested: "${server.verification.last_tested}"`)
  yaml.push(`  tested_with: [${server.verification.tested_with.map(t => `"${t}"`).join(', ')}]`)
  
  // Stats section (optional)
  if (server.stats) {
    yaml.push(`stats:`)
    if (server.stats.github_stars !== undefined) {
      yaml.push(`  github_stars: ${server.stats.github_stars}`)
    }
    if (server.stats.docker_pulls !== undefined) {
      yaml.push(`  docker_pulls: ${server.stats.docker_pulls}`)
    }
    if (server.stats.npm_downloads !== undefined) {
      yaml.push(`  npm_downloads: ${server.stats.npm_downloads}`)
    }
    if (server.stats.use_count !== undefined) {
      yaml.push(`  use_count: ${server.stats.use_count}`)
    }
    if (server.stats.last_updated) {
      yaml.push(`  last_updated: "${server.stats.last_updated}"`)
    }
  }
  
  // Installation methods
  yaml.push(`installation_methods:`)
  server.installation_methods.forEach(method => {
    yaml.push(`  - type: ${method.type}`)
    if (method.recommended) {
      yaml.push(`    recommended: true`)
    }
    if (method.command) {
      yaml.push(`    command: ${method.command}`)
    }
    if (method.config_example) {
      yaml.push(`    config_example: |`)
      method.config_example.split('\n').forEach(line => {
        yaml.push(`      ${line}`)
      })
    }
    if (method.steps) {
      yaml.push(`    steps:`)
      method.steps.forEach(step => {
        yaml.push(`      - ${step}`)
      })
    }
  })
  
  // User inputs (optional)
  if (server.user_inputs && server.user_inputs.length > 0) {
    yaml.push(`user_inputs:`)
    server.user_inputs.forEach(input => {
      yaml.push(`  - name: ${input.name}`)
      yaml.push(`    display_name: "${input.display_name}"`)
      yaml.push(`    type: ${input.type}`)
      yaml.push(`    description: "${input.description}"`)
      yaml.push(`    required: ${input.required}`)
      if (input.placeholder) {
        yaml.push(`    placeholder: "${input.placeholder}"`)
      }
    })
  }
  
  // Badges (optional)
  if (server.badges && server.badges.length > 0) {
    yaml.push(`badges:`)
    server.badges.forEach(badge => {
      yaml.push(`  - ${badge}`)
    })
  }
  
  // Source registry
  if (server.source_registry) {
    yaml.push(`source_registry:`)
    yaml.push(`  type: ${server.source_registry.type}`)
    if (server.source_registry.url) {
      yaml.push(`  url: "${server.source_registry.url}"`)
    }
    if (server.source_registry.id) {
      yaml.push(`  id: "${server.source_registry.id}"`)
    }
    yaml.push(`  last_fetched: "${server.source_registry.last_fetched}"`)
    yaml.push(`  auto_update: ${server.source_registry.auto_update}`)
    if (server.source_registry.verified_by) {
      yaml.push(`  verified_by: "${server.source_registry.verified_by}"`)
    }
  }
  
  yaml.push(`tags: [${server.tags.map(t => `"${t}"`).join(', ')}]`)
  yaml.push(`---`)
  
  return yaml.join('\n')
}

function generateContent(server) {
  const lines = []
  
  lines.push(`# ${server.display_name}`)
  lines.push('')
  lines.push('## Overview')
  lines.push('')
  lines.push(server.description)
  lines.push('')
  lines.push('## Features')
  lines.push('')
  lines.push('*Features to be documented*')
  lines.push('')
  lines.push('## Requirements')
  lines.push('')
  lines.push('*Requirements to be documented*')
  lines.push('')
  lines.push('## Configuration')
  lines.push('')
  
  // Add installation methods
  server.installation_methods.forEach(method => {
    lines.push(`### ${method.type.toUpperCase()} Installation`)
    lines.push('')
    
    if (method.command) {
      lines.push('```bash')
      lines.push(method.command)
      lines.push('```')
      lines.push('')
    }
    
    if (method.config_example) {
      lines.push('Configuration:')
      lines.push('```json')
      lines.push(method.config_example)
      lines.push('```')
      lines.push('')
    }
    
    if (method.steps) {
      method.steps.forEach(step => {
        lines.push(`- ${step}`)
      })
      lines.push('')
    }
  })
  
  lines.push('')
  lines.push('## Available Tools')
  lines.push('')
  lines.push('*Tools to be documented*')
  lines.push('')
  lines.push('## Security Considerations')
  lines.push('')
  lines.push(`- **Authentication**: ${server.security.auth_type}`)
  lines.push(`- **Permissions**: ${server.security.permissions.join(', ') || 'None specified'}`)
  lines.push('')
  lines.push('## Resources')
  lines.push('')
  
  if (server.sources.official) {
    lines.push(`- [Official Repository](https://github.com/${server.sources.official})`)
  }
  if (server.sources.docker) {
    lines.push(`- [Docker Hub](https://hub.docker.com/r/${server.sources.docker.replace(':latest', '')})`)
  }
  if (server.sources.npm) {
    lines.push(`- [NPM Package](https://www.npmjs.com/package/${server.sources.npm})`)
  }
  if (server.sources.marketplace?.smithery) {
    lines.push(`- [Smithery](${server.sources.marketplace.smithery})`)
  }
  
  lines.push('')
  lines.push('## License')
  lines.push('')
  lines.push('*License information to be added*')
  lines.push('')
  
  return lines.join('\n')
}