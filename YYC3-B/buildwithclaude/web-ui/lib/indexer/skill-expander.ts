/**
 * Shared skill expansion module.
 * Expands skill collection repos into individual skills for the plugins table.
 */

import { analyzeRepository } from './repo-analyzer'
import { scanSkillContent, getSubmissionStatus } from './content-scanner'

export interface ExpandedSkill {
  name: string
  slug: string
  description: string
  category: string | null
  installCommand: string
  owner: string
  repoUrl: string
  stars: number
  submissionStatus: string
}

/**
 * Expand a skill collection repo into individual skill records.
 *
 * @param repoUrl - The source repo URL (e.g. "https://github.com/kepano/obsidian-skills")
 * @param marketplaceRepoUrl - The marketplace repo URL (to skip self-references)
 * @param expandedRepos - Set of repo URLs already expanded (to avoid re-expansion)
 * @returns Array of expanded skill records, or null if expansion fails/not applicable
 */
export async function expandSkillCollection(
  repoUrl: string,
  marketplaceRepoUrl: string,
  expandedRepos: Set<string>,
): Promise<ExpandedSkill[] | null> {
  // Skip if this is the marketplace repo itself (already handled locally)
  if (normalizeRepoUrl(repoUrl) === normalizeRepoUrl(marketplaceRepoUrl)) {
    return null
  }

  // Skip if already expanded
  const normalized = normalizeRepoUrl(repoUrl)
  if (expandedRepos.has(normalized)) {
    return null
  }

  // Extract owner/repo from URL
  const repoFullName = extractRepoFullName(repoUrl)
  if (!repoFullName) {
    return null
  }

  try {
    expandedRepos.add(normalized)

    const analysis = await analyzeRepository(repoFullName)

    if (analysis.skills.length === 0) {
      return null
    }

    const results: ExpandedSkill[] = []

    for (const skill of analysis.skills) {
      const scanResult = scanSkillContent(skill.content || skill.description, {
        name: skill.name,
        description: skill.description,
        installCommand: skill.installCommand,
      })

      const status = getSubmissionStatus(scanResult)

      results.push({
        name: skill.name,
        slug: skill.slug,
        description: skill.description,
        category: skill.category,
        installCommand: skill.installCommand || `npx skills add ${repoFullName}`,
        owner: analysis.owner,
        repoUrl: `https://github.com/${repoFullName}`,
        stars: analysis.stars,
        submissionStatus: status,
      })
    }

    return results.length > 0 ? results : null
  } catch (error) {
    console.error(`Failed to expand skill collection from ${repoUrl}:`, error)
    return null
  }
}

/**
 * Normalize a GitHub repo URL for comparison (strip trailing slash, .git suffix, protocol).
 */
function normalizeRepoUrl(url: string): string {
  return url
    .replace(/\.git$/, '')
    .replace(/\/+$/, '')
    .toLowerCase()
}

/**
 * Extract owner/repo from a GitHub URL.
 */
function extractRepoFullName(url: string): string | null {
  const match = url.match(/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)/)
  if (!match) return null
  const owner = match[1]
  const repo = match[2].replace(/\.git$/, '')
  return `${owner}/${repo}`
}
