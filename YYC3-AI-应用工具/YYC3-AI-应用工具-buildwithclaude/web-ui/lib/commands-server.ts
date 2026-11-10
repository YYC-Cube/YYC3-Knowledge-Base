import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { Command } from './commands-types'
import { CategoryMetadata, generateCategoryMetadata } from './category-utils'

export function getAllCommands(): Command[] {
  const commandsDirectory = path.join(process.cwd(), '../plugins/all-commands/commands')
  const fileNames = fs.readdirSync(commandsDirectory)
  
  const commands = fileNames
    .filter(fileName => fileName.endsWith('.md') && fileName !== 'README.md' && fileName !== 'INDEX.md')
    .map(fileName => {
      const filePath = path.join(commandsDirectory, fileName)
      const fileContents = fs.readFileSync(filePath, 'utf8')
      const { data, content } = matter(fileContents)
      
      const slug = fileName.replace(/\.md$/, '')
      const category = data.category || 'miscellaneous'
      
      return {
        slug,
        description: data.description || '',
        category,
        argumentHint: data['argument-hint'] || undefined,
        allowedTools: data['allowed-tools'] || undefined,
        model: data.model || undefined,
        content
      }
    })
  
  return commands.sort((a, b) => a.slug.localeCompare(b.slug))
}

export function getCommandBySlug(slug: string): Command | null {
  const commandsDirectory = path.join(process.cwd(), '../plugins/all-commands/commands')
  const filePath = path.join(commandsDirectory, `${slug}.md`)
  
  if (!fs.existsSync(filePath)) {
    return null
  }
  
  const fileContents = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContents)
  const category = data.category || 'miscellaneous'
  
  return {
    slug,
    description: data.description || '',
    category,
    argumentHint: data['argument-hint'] || undefined,
    allowedTools: data['allowed-tools'] || undefined,
    model: data.model || undefined,
    content
  }
}

export function getCommandsByCategory(category: string): Command[] {
  return getAllCommands().filter(command => command.category === category)
}

export function searchCommands(query: string): Command[] {
  const normalizedQuery = query.toLowerCase()
  return getAllCommands().filter(command => 
    command.slug.toLowerCase().includes(normalizedQuery) ||
    command.description.toLowerCase().includes(normalizedQuery) ||
    command.content.toLowerCase().includes(normalizedQuery)
  )
}

/**
 * Get all unique categories from commands with counts
 */
export function getAllCommandCategories(): CategoryMetadata[] {
  const commands = getAllCommands()
  const categoryCounts: Record<string, number> = {}
  
  // Count commands per category
  commands.forEach(command => {
    const category = command.category
    categoryCounts[category] = (categoryCounts[category] || 0) + 1
  })
  
  return generateCategoryMetadata(categoryCounts)
}

/**
 * Get all unique command category IDs
 */
export function getAllCommandCategoryIds(): string[] {
  const commands = getAllCommands()
  const categories = new Set(commands.map(c => c.category))
  return Array.from(categories).sort()
}