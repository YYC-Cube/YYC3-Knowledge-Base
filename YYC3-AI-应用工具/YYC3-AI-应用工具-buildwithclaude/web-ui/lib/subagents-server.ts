import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { Subagent } from './subagents-types'
import { CategoryMetadata, generateCategoryMetadata } from './category-utils'

export function getAllSubagents(): Subagent[] {
  const subagentsDirectory = path.join(process.cwd(), '../plugins/all-agents/agents')
  const fileNames = fs.readdirSync(subagentsDirectory)
  
  const subagents = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      const filePath = path.join(subagentsDirectory, fileName)
      const fileContents = fs.readFileSync(filePath, 'utf8')
      const { data, content } = matter(fileContents)
      
      const slug = fileName.replace(/\.md$/, '')
      const category = data.category || 'specialized-domains'
      
      return {
        slug,
        name: data.name || slug,
        description: data.description || '',
        tools: data.tools,
        content,
        category
      }
    })
  
  return subagents.sort((a, b) => a.name.localeCompare(b.name))
}

export function getSubagentBySlug(slug: string): Subagent | null {
  const subagentsDirectory = path.join(process.cwd(), '../plugins/all-agents/agents')
  const filePath = path.join(subagentsDirectory, `${slug}.md`)
  
  if (!fs.existsSync(filePath)) {
    return null
  }
  
  const fileContents = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContents)
  const category = data.category || 'specialized-domains'
  
  return {
    slug,
    name: data.name || slug,
    description: data.description || '',
    tools: data.tools,
    content,
    category
  }
}

export function getSubagentsByCategory(category: string): Subagent[] {
  return getAllSubagents().filter(subagent => subagent.category === category)
}

export function searchSubagents(query: string): Subagent[] {
  const normalizedQuery = query.toLowerCase()
  return getAllSubagents().filter(subagent => 
    subagent.name.toLowerCase().includes(normalizedQuery) ||
    subagent.description.toLowerCase().includes(normalizedQuery) ||
    subagent.content.toLowerCase().includes(normalizedQuery)
  )
}

/**
 * Get all unique categories from subagents with counts
 */
export function getAllCategories(): CategoryMetadata[] {
  const subagents = getAllSubagents()
  const categoryCounts: Record<string, number> = {}
  
  // Count subagents per category
  subagents.forEach(subagent => {
    const category = subagent.category
    categoryCounts[category] = (categoryCounts[category] || 0) + 1
  })
  
  return generateCategoryMetadata(categoryCounts)
}

/**
 * Get all unique category IDs
 */
export function getAllCategoryIds(): string[] {
  const subagents = getAllSubagents()
  const categories = new Set(subagents.map(s => s.category))
  return Array.from(categories).sort()
}