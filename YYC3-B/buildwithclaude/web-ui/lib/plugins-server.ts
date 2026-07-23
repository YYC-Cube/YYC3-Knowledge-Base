import fs from 'fs'
import path from 'path'
import { Plugin, PluginCategory } from './plugins-types'
import { generateCategoryDisplayName, getCategoryIcon } from './category-utils'

interface MarketplaceData {
  plugins: Plugin[]
}

let cachedPlugins: Plugin[] | null = null

function loadMarketplaceData(): Plugin[] {
  if (cachedPlugins) {
    return cachedPlugins
  }

  const marketplacePath = path.join(process.cwd(), '../.claude-plugin/marketplace.json')

  if (!fs.existsSync(marketplacePath)) {
    console.warn('marketplace.json not found at', marketplacePath)
    return []
  }

  const content = fs.readFileSync(marketplacePath, 'utf8')
  const data: MarketplaceData = JSON.parse(content)

  cachedPlugins = data.plugins || []
  return cachedPlugins
}

export function getAllPlugins(): Plugin[] {
  const plugins = loadMarketplaceData()
  return plugins.sort((a, b) => a.name.localeCompare(b.name))
}

export function getPluginByName(name: string): Plugin | null {
  const plugins = loadMarketplaceData()
  return plugins.find(p => p.name === name) || null
}

export function getPluginBySlug(slug: string): Plugin | null {
  return getPluginByName(slug)
}

export function getPluginsByCategory(category: string): Plugin[] {
  const plugins = loadMarketplaceData()
  return plugins
    .filter(p => p.category === category)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function searchPlugins(query: string): Plugin[] {
  const normalizedQuery = query.toLowerCase()
  const plugins = loadMarketplaceData()

  return plugins.filter(plugin =>
    plugin.name.toLowerCase().includes(normalizedQuery) ||
    plugin.description.toLowerCase().includes(normalizedQuery) ||
    plugin.keywords.some(k => k.toLowerCase().includes(normalizedQuery))
  ).sort((a, b) => a.name.localeCompare(b.name))
}

export function getAllPluginCategories(): PluginCategory[] {
  const plugins = loadMarketplaceData()
  const categoryCounts: Record<string, number> = {}

  plugins.forEach(plugin => {
    const category = plugin.category
    categoryCounts[category] = (categoryCounts[category] || 0) + 1
  })

  return Object.entries(categoryCounts)
    .map(([id, count]) => ({
      id,
      displayName: generateCategoryDisplayName(id),
      icon: getCategoryIcon(id),
      count
    }))
    .sort((a, b) => b.count - a.count) // Sort by count descending
}

export function getPluginStats() {
  const plugins = loadMarketplaceData()
  const categories = getAllPluginCategories()

  return {
    total: plugins.length,
    categories: categories.length,
    byCategory: categories
  }
}
