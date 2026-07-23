import { Suspense } from 'react'
import { getAllSubagents, getAllCategories } from '@/lib/subagents-server'
import SubagentsPageClient from './subagents-client'

export default function SubagentsPage() {
  const allSubagents = getAllSubagents()
  const categories = getAllCategories()

  return (
    <Suspense fallback={null}>
      <SubagentsPageClient allSubagents={allSubagents} categories={categories} />
    </Suspense>
  )
}