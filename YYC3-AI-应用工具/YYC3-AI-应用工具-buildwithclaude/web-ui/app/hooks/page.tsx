import { Suspense } from 'react'
import { getAllHooks, getAllHookCategories, getAllEventTypes } from '@/lib/hooks-server'
import HooksPageClient from './hooks-client'

export default function HooksPage() {
  const allHooks = getAllHooks()
  const categories = getAllHookCategories()
  const eventTypes = getAllEventTypes()

  return (
    <Suspense fallback={null}>
      <HooksPageClient allHooks={allHooks} categories={categories} eventTypes={eventTypes} />
    </Suspense>
  )
}
