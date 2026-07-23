import { notFound } from 'next/navigation'
import { getCommandBySlug, getAllCommands } from '@/lib/commands-server'
import { CommandPageClient } from './page-client'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateStaticParams() {
  const commands = getAllCommands()
  return commands.map((command) => ({
    slug: command.slug,
  }))
}

export default async function CommandPage({ params }: PageProps) {
  const { slug } = await params
  const command = getCommandBySlug(slug)
  
  if (!command) {
    notFound()
  }
  
  return <CommandPageClient command={command} />
}