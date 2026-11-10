import { notFound } from 'next/navigation'
import { getPluginBySlug, getAllPlugins } from '@/lib/plugins-server'
import { Metadata } from 'next'
import { PluginPageClient } from './page-client'

interface PluginPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: PluginPageProps): Promise<Metadata> {
  const { slug } = await params
  const plugin = getPluginBySlug(slug)

  if (!plugin) {
    return {
      title: 'Plugin Not Found',
    }
  }

  return {
    title: `${plugin.name} | BuildWithClaude`,
    description: plugin.description,
  }
}

export async function generateStaticParams() {
  const plugins = getAllPlugins()
  return plugins.map((plugin) => ({
    slug: plugin.name,
  }))
}

export default async function PluginPage({ params }: PluginPageProps) {
  const { slug } = await params
  const plugin = getPluginBySlug(slug)

  if (!plugin) {
    notFound()
  }

  return <PluginPageClient plugin={plugin} />
}
