export interface Command {
  slug: string
  description: string
  category: string
  argumentHint?: string
  allowedTools?: string
  model?: string
  content: string
}

// Re-export category utilities
export { generateCategoryDisplayName, getCategoryIcon, type CategoryMetadata } from './category-utils'