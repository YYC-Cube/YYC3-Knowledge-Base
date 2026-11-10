/**
 * Type definitions for Skills
 */

export interface Skill {
  slug: string           // directory name
  name: string           // from frontmatter
  description: string    // from frontmatter
  category: string       // from frontmatter
  allowedTools?: string  // optional from frontmatter
  model?: string         // optional from frontmatter
  license?: string       // optional from frontmatter
  content: string        // markdown body content
}

// Re-export category utilities for convenience
export { generateCategoryDisplayName, getCategoryIcon, type CategoryMetadata } from './category-utils'
