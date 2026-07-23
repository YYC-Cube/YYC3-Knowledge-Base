import { notFound } from 'next/navigation'
import { getSubagentBySlug, getAllSubagents } from '@/lib/subagents-server'
import { Metadata } from 'next'
import { SubagentPageClient } from './page-client'

interface SubagentPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: SubagentPageProps): Promise<Metadata> {
  const { slug } = await params
  const subagent = getSubagentBySlug(slug)
  
  if (!subagent) {
    return {
      title: 'Subagent Not Found',
    }
  }
  
  return {
    title: `${subagent.name} - Claude Code Subagents`,
    description: subagent.description,
  }
}

export async function generateStaticParams() {
  const subagents = getAllSubagents()
  return subagents.map((subagent) => ({
    slug: subagent.slug,
  }))
}

export default async function SubagentPage({ params }: SubagentPageProps) {
  const { slug } = await params
  const subagent = getSubagentBySlug(slug)
  
  if (!subagent) {
    notFound()
  }
  
  return <SubagentPageClient subagent={subagent} />
}