export interface Hook {
  slug: string
  name: string
  description: string
  category: string
  event: string // PostToolUse, PreToolUse, Stop, Notification, etc.
  matcher: string // Tool matcher pattern (e.g., "Edit|MultiEdit|Write" or "*")
  language?: string // bash, python, etc.
  version?: string
  content: string
  script?: string // Extracted executable script from ### Script section
}

// Re-export category utilities
export { generateCategoryDisplayName, getCategoryIcon, type CategoryMetadata } from './category-utils'
