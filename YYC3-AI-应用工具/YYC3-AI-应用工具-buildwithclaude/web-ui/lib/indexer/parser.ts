import { z } from 'zod'

/**
 * Zod schema for marketplace.json structure
 */
const PluginSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    version: z.string().optional(),
    category: z.string().optional(),
    skills: z.array(z.string()).optional(),
  })
  .passthrough() // Allow additional fields

const MarketplaceJsonSchema = z
  .object({
    name: z.string().min(1),
    plugins: z.array(PluginSchema),
  })
  .passthrough()

export type MarketplaceJson = z.infer<typeof MarketplaceJsonSchema>
export type PluginJson = z.infer<typeof PluginSchema>

/**
 * Parse and validate marketplace.json content
 * Handles both standard marketplace format and single plugin format
 */
export function parseMarketplaceJson(jsonString: string, repoFullName?: string): MarketplaceJson | null {
  try {
    const jsonData = JSON.parse(jsonString)

    // Try standard marketplace.json format first
    const result = MarketplaceJsonSchema.safeParse(jsonData)

    if (result.success) {
      return result.data
    }

    // If standard format fails, check if this is a single plugin definition
    if (jsonData.name && !jsonData.plugins) {
      console.log(`Detected single plugin format${repoFullName ? ` in ${repoFullName}` : ''}, wrapping...`)

      const wrapped = {
        name: jsonData.name,
        plugins: [jsonData],
      }

      const wrappedResult = MarketplaceJsonSchema.safeParse(wrapped)
      if (wrappedResult.success) {
        return wrappedResult.data
      }
    }

    // Log validation errors
    console.error(`Invalid marketplace.json${repoFullName ? ` from ${repoFullName}` : ''}:`)
    console.error(`Validation errors: ${JSON.stringify(result.error.issues, null, 2)}`)
    return null
  } catch (error) {
    console.error(
      `Failed to parse marketplace JSON${repoFullName ? ` from ${repoFullName}` : ''}:`,
      error instanceof Error ? error.message : String(error)
    )
    return null
  }
}

/**
 * Extract plugin and skill counts from marketplace.json
 */
export function extractCounts(marketplace: MarketplaceJson): { pluginCount: number; skillCount: number } {
  const pluginCount = marketplace.plugins?.length || 0
  const skillCount = marketplace.plugins?.reduce((sum, plugin) => sum + (plugin.skills?.length || 0), 0) || 0

  return { pluginCount, skillCount }
}

/**
 * Extract categories from marketplace.json plugins
 */
export function extractCategories(marketplace: MarketplaceJson): string[] {
  const categories = new Set<string>()

  for (const plugin of marketplace.plugins || []) {
    if (plugin.category) {
      categories.add(plugin.category)
    }
  }

  return Array.from(categories).slice(0, 5)
}
