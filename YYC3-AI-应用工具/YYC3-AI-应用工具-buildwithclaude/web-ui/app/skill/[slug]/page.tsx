import { notFound } from 'next/navigation'
import { getSkillBySlug, getAllSkills } from '@/lib/skills-server'
import { Metadata } from 'next'
import { SkillPageClient } from './page-client'

interface SkillPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: SkillPageProps): Promise<Metadata> {
  const { slug } = await params
  const skill = getSkillBySlug(slug)

  if (!skill) {
    return {
      title: 'Skill Not Found',
    }
  }

  return {
    title: `${skill.name} - Claude Code Skills`,
    description: skill.description,
  }
}

export async function generateStaticParams() {
  const skills = getAllSkills()
  return skills.map((skill) => ({
    slug: skill.slug,
  }))
}

export default async function SkillPage({ params }: SkillPageProps) {
  const { slug } = await params
  const skill = getSkillBySlug(slug)

  if (!skill) {
    notFound()
  }

  return <SkillPageClient skill={skill} />
}
