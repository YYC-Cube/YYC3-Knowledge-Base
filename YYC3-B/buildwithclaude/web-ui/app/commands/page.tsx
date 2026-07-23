import { Suspense } from 'react'
import { getAllCommands, getAllCommandCategories } from '@/lib/commands-server'
import CommandsPageClient from './commands-client'

export default function CommandsPage() {
  const allCommands = getAllCommands()
  const categories = getAllCommandCategories()
  
  return (
    <Suspense fallback={null}>
      <CommandsPageClient allCommands={allCommands} categories={categories} />
    </Suspense>
  )
}