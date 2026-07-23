export interface Subagent {
  slug: string
  name: string
  description: string
  tools?: string
  content: string
  category: string
}

// Re-export category utilities for backward compatibility
export { generateCategoryDisplayName, getCategoryIcon, type CategoryMetadata } from './category-utils'