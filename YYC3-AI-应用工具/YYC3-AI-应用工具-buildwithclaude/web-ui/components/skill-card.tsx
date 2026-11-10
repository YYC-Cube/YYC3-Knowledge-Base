'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Check, Copy, Download, ExternalLink } from 'lucide-react'
import { generateCategoryDisplayName } from '@/lib/category-utils'
import { generateSkillMarkdown } from '@/lib/utils'
import type { Skill } from '@/lib/skills-types'

interface SkillCardProps {
  skill: Skill
}

export function SkillCard({ skill }: SkillCardProps) {
  const [copied, setCopied] = useState(false)

  const categoryName = generateCategoryDisplayName(skill.category)

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const markdown = generateSkillMarkdown(skill)
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const markdown = generateSkillMarkdown(skill)
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `SKILL.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleOpenRepo = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const skillUrl = `https://github.com/davepoon/buildwithclaude/tree/main/plugins/all-skills/skills/${skill.slug}`
    window.open(skillUrl, '_blank')
  }

  return (
    <Link href={`/skill/${skill.slug}`}>
      <div className="p-5 rounded-lg border border-border hover:border-primary/40 transition-colors h-full flex flex-col bg-card">
        <div className="mb-3">
          <h3 className="font-medium mb-1">{skill.name}</h3>
          <span className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">{categoryName}</span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 flex-1 mb-3">
          {skill.description}
        </p>

        {skill.allowedTools && (
          <p className="text-xs text-muted-foreground/70 font-mono mb-4 truncate">
            {skill.allowedTools}
          </p>
        )}

        <TooltipProvider>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy markdown</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleDownload}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download SKILL.md</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleOpenRepo}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  GitHub
                </Button>
              </TooltipTrigger>
              <TooltipContent>View on GitHub</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </Link>
  )
}
