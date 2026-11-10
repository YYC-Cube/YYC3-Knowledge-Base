import { notFound } from 'next/navigation'
import { getMCPServerBySlug, getAllMCPServers } from '@/lib/mcp-server'
import MCPServerPageClient from './page-client'

export const revalidate = 3600  // 1 hour — individual pages change less often

export async function generateStaticParams() {
  if (!process.env.POSTGRES_URL) return []

  const servers = await getAllMCPServers()

  return servers.map((server) => ({
    slug: server.path.replace(/\//g, '-')
  }))
}

export default async function MCPServerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const server = await getMCPServerBySlug(slug)

  if (!server) {
    notFound()
  }

  return <MCPServerPageClient server={server} />
}
