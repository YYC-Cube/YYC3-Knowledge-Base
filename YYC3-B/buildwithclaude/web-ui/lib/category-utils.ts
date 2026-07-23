/**
 * Utility functions for dynamic category management
 */

// Special case mappings for better display names
const SPECIAL_CASES: Record<string, string> = {
  'ai': 'AI',
  'api': 'API',
  'ui': 'UI',
  'ux': 'UX',
  'defi': 'DeFi',
  'ml': 'ML',
  'ci': 'CI',
  'cd': 'CD'
};

// Icon mappings for categories
export const CATEGORY_ICONS: Record<string, string> = {
  // Plugin categories
  'utilities': '🔧',
  'agents': '🤖',
  'commands': '⌨️',
  'hooks': '🪝',
  'mcp-servers': '🔌',
  // Subagent categories
  'development-architecture': '🏗️',
  'language-specialists': '💻',
  'infrastructure-operations': '🚀',
  'quality-security': '🛡️',
  'data-ai': '📊',
  'specialized-domains': '🎯',
  'crypto-trading': '💰',
  'business-finance': '💼',
  'design-experience': '🎨',
  'blockchain-web3': '🔗',
  'sales-marketing': '📣',
  // Command categories
  'api-development': '🔌',
  'automation-workflow': '⚙️',
  'ci-deployment': '🔄',
  'code-analysis-testing': '🧪',
  'context-loading-priming': '📥',
  'database-operations': '🗄️',
  'documentation-changelogs': '📝',
  'framework-svelte': '🔥',
  'game-development': '🎮',
  'integration-sync': '🔗',
  'miscellaneous': '🔧',
  'monitoring-observability': '📊',
  'performance-optimization': '⚡',
  'project-setup': '🏁',
  'project-task-management': '📋',
  'security-audit': '🔒',
  'simulation-modeling': '🔮',
  'team-collaboration': '👥',
  'typescript-migration': '📘',
  'utilities-debugging': '🐛',
  'version-control-git': '🌿',
  'workflow-orchestration': '🎭',
  // Hook categories
  'git': '🌿',
  'automation': '⚙️',
  'notifications': '🔔',
  'formatting': '✨',
  'security': '🔒',
  'testing': '🧪',
  'development': '💻',
  'performance': '⚡',
  // Skill categories
  'document-processing': '📄',
  'development-code': '💻',
  'business-productivity': '📊',
  'creative-collaboration': '🎨',
  'analytics': '📈',
  'communication': '💬',
  'crm': '🤝',
  'design': '🎨',
  'devops': '🚀',
  'ecommerce': '🛍️',
  'email': '📧',
  'ai-ml': '🤖',
  'project-management': '📋',
  'social-media': '📱',
  'storage-docs': '☁️',
  'customer-support': '🎧',
  'uncategorized': '📦',
  // Default icon for unknown categories
  'default': '📦'
};

/**
 * Generate a user-friendly display name from a category ID
 * @param categoryId - The category ID from frontmatter (e.g., 'development-architecture')
 * @returns User-friendly display name (e.g., 'Development & Architecture')
 */
export function generateCategoryDisplayName(categoryId: string): string {
  return categoryId
    .split('-')
    .map(word => {
      // Check for special cases first
      const lowerWord = word.toLowerCase();
      if (SPECIAL_CASES[lowerWord]) {
        return SPECIAL_CASES[lowerWord];
      }
      
      // Otherwise, capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' & ');
}

/**
 * Get icon for a category
 * @param categoryId - The category ID
 * @returns Icon emoji for the category
 */
export function getCategoryIcon(categoryId: string): string {
  return CATEGORY_ICONS[categoryId] || CATEGORY_ICONS.default;
}

/**
 * Category metadata interface
 */
export interface CategoryMetadata {
  id: string;
  displayName: string;
  icon: string;
  count: number;
}

/**
 * Generate category metadata from a list of categories with counts
 */
export function generateCategoryMetadata(
  categoryCounts: Record<string, number>
): CategoryMetadata[] {
  return Object.entries(categoryCounts)
    .map(([id, count]) => ({
      id,
      displayName: generateCategoryDisplayName(id),
      icon: getCategoryIcon(id),
      count
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Valid skill categories (ordered for display)
 */
export const VALID_SKILL_CATEGORIES = [
  'ai-ml',
  'analytics',
  'automation',
  'business-productivity',
  'communication',
  'creative-collaboration',
  'crm',
  'customer-support',
  'design',
  'development-code',
  'devops',
  'document-processing',
  'ecommerce',
  'email',
  'project-management',
  'security',
  'social-media',
  'storage-docs',
  'uncategorized',
] as const;

const SKILL_CATEGORY_SET = new Set<string>(VALID_SKILL_CATEGORIES);

const SKILL_CATEGORY_ALIASES: Record<string, string> = {
  'ai': 'ai-ml',
  'machine-learning': 'ai-ml',
  'ml': 'ai-ml',
  'development': 'development-code',
  'coding': 'development-code',
  'frontend': 'development-code',
  'backend': 'development-code',
  'testing': 'development-code',
  'database': 'development-code',
  'mobile': 'development-code',
  'documentation': 'document-processing',
  'data': 'analytics',
  'workflow': 'automation',
  'commerce': 'ecommerce',
  'marketing': 'social-media',
  'support': 'customer-support',
  'productivity': 'business-productivity',
  'collaboration': 'creative-collaboration',
  'storage': 'storage-docs',
  // Useless source categories — trigger inference
  'skills': 'uncategorized',
  'skill': 'uncategorized',
  'skill-enhancers': 'uncategorized',
  'skills-library': 'uncategorized',
};

/**
 * Normalize a skill category string to a valid skill category.
 * Returns 'uncategorized' if the category is not recognized.
 */
export function normalizeSkillCategory(category: string | null): string {
  if (!category) return 'uncategorized';
  const lower = category.toLowerCase().trim();
  if (SKILL_CATEGORY_SET.has(lower)) return lower;
  return SKILL_CATEGORY_ALIASES[lower] || 'uncategorized';
}

/**
 * Keyword map for inferring skill categories from name + description.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'security': ['security', 'vulnerability', 'pentest', 'encryption', 'defense in depth'],
  'ai-ml': ['hallucination', 'prompt engineering', 'llm', 'ai model', 'ai agent', 'confidence', 'uncertainty', 'citation', 'grounding', 'output-audit', 'source-verif', 'cross-check', 'opencode', 'truncation', 'foresight', 'anti-hallucination'],
  'design': ['design', 'ui/ux', 'visual', 'redesign', 'figma', 'high end visual', 'typography', 'fonts', 'spacing', 'animation', 'color scheme', 'premium quality', 'aesthetic', 'pixel perfect', 'agency'],
  'devops': ['ci-cd', 'ci cd', 'deployment', 'deploy', 'docker', 'kubernetes', 'infrastructure', 'port killer', 'smithery'],
  'project-management': ['writing plans', 'executing plans', 'task manage', 'kanban', 'project manage'],
  'automation': ['workflow', 'automat', 'pipeline', 'scripting', 'calendar'],
  'communication': ['slack', 'discord', 'messaging', 'notification'],
  'creative-collaboration': ['brainstorm', 'creative', 'whiteboard', 'ideation'],
  'business-productivity': ['venture capital', 'finance', 'sales', 'prospect', 'productivity', 'spreadsheet'],
  'analytics': ['analytics', 'data science', 'metrics', 'dashboard'],
  'document-processing': ['document', 'pdf', 'markdown process'],
  'development-code': ['code review', 'debug', 'testing', 'tdd', 'test writer', 'refactor', 'github', 'git', 'commit', 'api doc', 'frontend', 'backend', 'typescript', 'javascript', 'php', 'elixir', 'swift', 'nest', 'astro', 'vitest', 'linting', 'web fetch', 'error explain', 'pr analy', 'codebase', 'full-stack', 'full stack', 'coding', 'programmer'],
};

/**
 * Infer a skill category from name and description using keyword matching.
 * Returns a valid category or 'uncategorized'.
 */
export function inferSkillCategory(name: string, description: string): string {
  const text = `${name} ${description}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }

  return 'uncategorized';
}

/**
 * Smart categorization: normalize source category, then infer from name/description if uncategorized.
 */
export function smartCategorizeSkill(
  sourceCategory: string | null | undefined,
  name: string,
  description: string,
): string {
  const normalized = normalizeSkillCategory(sourceCategory ?? null);
  if (normalized !== 'uncategorized') return normalized;
  return inferSkillCategory(name, description);
}