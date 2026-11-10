import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { type Subagent } from "./subagents-types"
import { type Command } from "./commands-types"
import { type Hook } from "./hooks-types"
import { type Skill } from "./skills-types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSubagentMarkdown(subagent: Subagent): string {
  const frontmatter = [
    '---',
    `name: ${subagent.name}`,
    `description: ${subagent.description}`
  ]
  
  if (subagent.tools) {
    frontmatter.push(`tools: ${subagent.tools}`)
  }
  
  if (subagent.category) {
    frontmatter.push(`category: ${subagent.category}`)
  }
  
  frontmatter.push('---', '')
  
  return frontmatter.join('\n') + subagent.content
}

export function generateCommandMarkdown(command: Command): string {
  const frontmatter = [
    '---',
    `description: ${command.description}`,
    `category: ${command.category}`
  ]
  
  if (command.argumentHint) {
    frontmatter.push(`argument-hint: ${command.argumentHint}`)
  }
  
  if (command.allowedTools) {
    frontmatter.push(`allowed-tools: ${command.allowedTools}`)
  }
  
  if (command.model) {
    frontmatter.push(`model: ${command.model}`)
  }
  
  frontmatter.push('---', '')

  return frontmatter.join('\n') + command.content
}

export function generateHookMarkdown(hook: Hook): string {
  const frontmatter = [
    '---',
    `name: ${hook.name}`,
    `description: ${hook.description}`,
    `category: ${hook.category}`,
    `event: ${hook.event}`,
    `matcher: ${hook.matcher}`
  ]

  if (hook.language) {
    frontmatter.push(`language: ${hook.language}`)
  }

  if (hook.version) {
    frontmatter.push(`version: ${hook.version}`)
  }

  frontmatter.push('---', '')

  return frontmatter.join('\n') + hook.content
}

export function generateSkillMarkdown(skill: Skill): string {
  const frontmatter = [
    '---',
    `name: ${skill.name}`,
    `description: ${skill.description}`
  ]

  if (skill.allowedTools) {
    frontmatter.push(`allowed-tools: ${skill.allowedTools}`)
  }

  if (skill.model) {
    frontmatter.push(`model: ${skill.model}`)
  }

  frontmatter.push('---', '')

  return frontmatter.join('\n') + skill.content
}