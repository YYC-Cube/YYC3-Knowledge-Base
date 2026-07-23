import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { Skill } from './skills-types'
import { CategoryMetadata, generateCategoryMetadata } from './category-utils'

export function getAllSkills(): Skill[] {
  const skillsDirectory = path.join(process.cwd(), '../plugins/all-skills/skills')

  if (!fs.existsSync(skillsDirectory)) {
    console.warn('Skills directory not found:', skillsDirectory)
    return []
  }

  const dirNames = fs.readdirSync(skillsDirectory)

  const skills = dirNames
    .filter(dirName => {
      const skillPath = path.join(skillsDirectory, dirName, 'SKILL.md')
      return fs.existsSync(skillPath)
    })
    .map(dirName => {
      const filePath = path.join(skillsDirectory, dirName, 'SKILL.md')
      const fileContents = fs.readFileSync(filePath, 'utf8')
      const { data, content } = matter(fileContents)

      const category = data.category || 'uncategorized'

      return {
        slug: dirName,
        name: data.name || dirName,
        description: data.description || '',
        category,
        allowedTools: data['allowed-tools'],
        model: data.model,
        license: data.license,
        content
      }
    })

  return skills.sort((a, b) => a.name.localeCompare(b.name))
}

export function getSkillBySlug(slug: string): Skill | null {
  const skillsDirectory = path.join(process.cwd(), '../plugins/all-skills/skills')
  const filePath = path.join(skillsDirectory, slug, 'SKILL.md')

  if (!fs.existsSync(filePath)) {
    return null
  }

  const fileContents = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContents)
  const category = data.category || 'uncategorized'

  return {
    slug,
    name: data.name || slug,
    description: data.description || '',
    category,
    allowedTools: data['allowed-tools'],
    model: data.model,
    license: data.license,
    content
  }
}

export function getSkillsByCategory(category: string): Skill[] {
  return getAllSkills().filter(skill => skill.category === category)
}

export function searchSkills(query: string): Skill[] {
  const normalizedQuery = query.toLowerCase()
  return getAllSkills().filter(skill =>
    skill.name.toLowerCase().includes(normalizedQuery) ||
    skill.description.toLowerCase().includes(normalizedQuery) ||
    skill.content.toLowerCase().includes(normalizedQuery)
  )
}

/**
 * Get all unique categories from skills with counts
 */
export function getAllSkillCategories(): CategoryMetadata[] {
  const skills = getAllSkills()
  const categoryCounts: Record<string, number> = {}

  // Count skills per category
  skills.forEach(skill => {
    const category = skill.category
    categoryCounts[category] = (categoryCounts[category] || 0) + 1
  })

  return generateCategoryMetadata(categoryCounts)
}

/**
 * Get all unique category IDs
 */
export function getAllSkillCategoryIds(): string[] {
  const skills = getAllSkills()
  const categories = new Set(skills.map(s => s.category))
  return Array.from(categories).sort()
}
