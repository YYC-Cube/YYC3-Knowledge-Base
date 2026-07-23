import { promises as fs } from 'fs'
import path from 'path'
import type { Subagent, Command, Hook, ExternalPlugin, UnifiedPlugin } from './plugin-types'
import { getAllSkills } from './skills-server'

interface RegistryData {
  subagents: Subagent[]
  commands: Command[]
  hooks: Hook[]
  externalPlugins?: ExternalPlugin[]
}

export async function getPlugins(): Promise<UnifiedPlugin[]> {
  try {
    const registryPath = path.join(process.cwd(), 'public', 'registry.json')
    const data = await fs.readFile(registryPath, 'utf-8')
    const registry: RegistryData = JSON.parse(data)

    const plugins: UnifiedPlugin[] = []

    const LOCAL_MARKETPLACE_NAME = 'Build with Claude'

    // Add subagents
    for (const subagent of registry.subagents || []) {
      plugins.push({
        type: 'subagent',
        name: subagent.name,
        description: subagent.description,
        category: subagent.category,
        tags: subagent.tags || [],
        marketplaceName: LOCAL_MARKETPLACE_NAME,
        file: subagent.file,
        path: subagent.path,
      })
    }

    // Add commands
    for (const command of registry.commands || []) {
      plugins.push({
        type: 'command',
        name: command.name,
        description: command.description,
        category: command.category,
        tags: command.tags || [],
        marketplaceName: LOCAL_MARKETPLACE_NAME,
        file: command.file,
        path: command.path,
      })
    }

    // Add hooks
    for (const hook of registry.hooks || []) {
      plugins.push({
        type: 'hook',
        name: hook.name,
        description: hook.description,
        category: hook.category,
        tags: hook.tags || [],
        marketplaceName: LOCAL_MARKETPLACE_NAME,
        file: hook.file,
        path: hook.path,
      })
    }

    // Add skills
    const skills = getAllSkills()
    for (const skill of skills) {
      plugins.push({
        type: 'skill',
        name: skill.slug,
        description: skill.description,
        category: skill.category,
        tags: [],
        marketplaceName: LOCAL_MARKETPLACE_NAME,
        file: `all-skills/skills/${skill.slug}`,
        path: `plugins/all-skills/skills/${skill.slug}/SKILL.md`,
      })
    }

    // Add external plugins (from community registries)
    for (const external of registry.externalPlugins || []) {
      plugins.push({
        type: 'plugin',
        name: external.name,
        description: external.description,
        category: external.categories?.[0] || 'uncategorized',
        tags: external.keywords || [],
        marketplaceName: 'Community', // TODO: Track actual marketplace source
        repository: external.repository,
        stars: external.stars,
        installCommand: external.installCommand,
        namespace: external.namespace,
        author: external.author,
        version: external.version,
      })
    }

    return plugins
  } catch (error) {
    console.error('Error reading plugins from registry:', error)
    return []
  }
}

export async function getPluginStats(): Promise<{
  total: number
  subagents: number
  commands: number
  hooks: number
  skills: number
  plugins: number
}> {
  try {
    const registryPath = path.join(process.cwd(), 'public', 'registry.json')
    const data = await fs.readFile(registryPath, 'utf-8')
    const registry: RegistryData = JSON.parse(data)
    const skills = getAllSkills()

    return {
      total:
        (registry.subagents?.length || 0) +
        (registry.commands?.length || 0) +
        (registry.hooks?.length || 0) +
        skills.length +
        (registry.externalPlugins?.length || 0),
      subagents: registry.subagents?.length || 0,
      commands: registry.commands?.length || 0,
      hooks: registry.hooks?.length || 0,
      skills: skills.length,
      plugins: registry.externalPlugins?.length || 0,
    }
  } catch (error) {
    console.error('Error reading plugin stats:', error)
    return { total: 0, subagents: 0, commands: 0, hooks: 0, skills: 0, plugins: 0 }
  }
}
