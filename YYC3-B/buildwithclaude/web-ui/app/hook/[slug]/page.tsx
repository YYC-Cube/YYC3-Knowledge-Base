import { notFound } from 'next/navigation'
import { getHookBySlug, getAllHooks } from '@/lib/hooks-server'
import { HookPageClient } from './page-client'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateStaticParams() {
  const hooks = getAllHooks()
  return hooks.map((hook) => ({
    slug: hook.slug,
  }))
}

export default async function HookPage({ params }: PageProps) {
  const { slug } = await params
  const hook = getHookBySlug(slug)

  if (!hook) {
    notFound()
  }

  return <HookPageClient hook={hook} />
}
