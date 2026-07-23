import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { Hook } from './hooks-types'
import { CategoryMetadata, generateCategoryMetadata } from './category-utils'
import { extractScriptFromContent } from './hook-utils'

export function getAllHooks(): Hook[] {
  const hooksDirectory = path.join(process.cwd(), '../plugins/all-hooks/hooks')

  if (!fs.existsSync(hooksDirectory)) {
    return []
  }

  const fileNames = fs.readdirSync(hooksDirectory)

  const hooks = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      const filePath = path.join(hooksDirectory, fileName)
      const fileContents = fs.readFileSync(filePath, 'utf8')
      const { data, content } = matter(fileContents)

      const slug = fileName.replace(/\.md$/, '')
      const category = data.category || 'automation'

      return {
        slug,
        name: data.name || slug,
        description: data.description || '',
        category,
        event: data.event || 'PostToolUse',
        matcher: data.matcher || '*',
        language: data.language,
        version: data.version,
        content,
        script: extractScriptFromContent(content) || undefined
      }
    })

  return hooks.sort((a, b) => a.name.localeCompare(b.name))
}

export function getHookBySlug(slug: string): Hook | null {
  const hooksDirectory = path.join(process.cwd(), '../plugins/all-hooks/hooks')
  const filePath = path.join(hooksDirectory, `${slug}.md`)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const fileContents = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContents)
  const category = data.category || 'automation'

  return {
    slug,
    name: data.name || slug,
    description: data.description || '',
    category,
    event: data.event || 'PostToolUse',
    matcher: data.matcher || '*',
    language: data.language,
    version: data.version,
    content,
    script: extractScriptFromContent(content) || undefined
  }
}

export function getHooksByCategory(category: string): Hook[] {
  return getAllHooks().filter(hook => hook.category === category)
}

export function getHooksByEvent(event: string): Hook[] {
  return getAllHooks().filter(hook => hook.event === event)
}

export function searchHooks(query: string): Hook[] {
  const normalizedQuery = query.toLowerCase()
  return getAllHooks().filter(hook =>
    hook.name.toLowerCase().includes(normalizedQuery) ||
    hook.description.toLowerCase().includes(normalizedQuery) ||
    hook.event.toLowerCase().includes(normalizedQuery) ||
    hook.content.toLowerCase().includes(normalizedQuery)
  )
}

/**
 * Get all unique categories from hooks with counts
 */
export function getAllHookCategories(): CategoryMetadata[] {
  const hooks = getAllHooks()
  const categoryCounts: Record<string, number> = {}

  // Count hooks per category
  hooks.forEach(hook => {
    const category = hook.category
    categoryCounts[category] = (categoryCounts[category] || 0) + 1
  })

  return generateCategoryMetadata(categoryCounts)
}

/**
 * Get all unique event types from hooks
 */
export function getAllEventTypes(): string[] {
  const hooks = getAllHooks()
  const events = new Set(hooks.map(h => h.event))
  return Array.from(events).sort()
}

/**
 * Get all unique category IDs
 */
export function getAllHookCategoryIds(): string[] {
  const hooks = getAllHooks()
  const categories = new Set(hooks.map(h => h.category))
  return Array.from(categories).sort()
}
